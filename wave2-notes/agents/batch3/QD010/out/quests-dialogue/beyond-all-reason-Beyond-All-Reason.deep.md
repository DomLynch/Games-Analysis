# beyond-all-reason-Beyond-All-Reason (quests-dialogue, cell 12)
Donor: /mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/singleplayer/scenarios/scenarioscripts/Begin06.lua (with the loader luarules/gadgets/unit_scenario_script.lua) | Licence: GNU GPL v2 for the game code (LICENSE.md lines 2-3: "BAR game code is released under the GPL v2 licence"); Begin06.lua shows no per-file licence in lines 1-12 (read); unit_scenario_script.lua GetInfo also says "GNU GPL, v2 or later" (read) | Lua (Recoil synced gadget) | symbol gadget:GameFrame, gadget:UnitDestroyed, Fail, ObjectiveLoadout, unit_scenario_script GetScenarioID
Checked: opened Begin06.lua lines 1-1 (synced guard), 1673-1818 (objectives, fail, GameFrame; whole), table starts at 30, 1071, 1341, 1522 (entries counted with awk: loadout 88, backupOne 11, backupTwo 43, timed 18, special 24; rows not read one by one); unit_scenario_script.lua 1-45 (whole); scenario022.lua 1-80 (descriptor) and grep of victorycondition/losscondition (58-59), difficulty rows 51-55; game_end.lua 1-12 and grep for GameOver/scenario (lines 71, 238, 394, 426-428, 469, 523, 548-576); unit_scenario_loadout.lua grep only; gui_mission_info.lua grep only (not read). NOT FOUND: how "Kill all enemy builders" is enforced; it is text in the descriptor and the generic team-death path in game_end.lua was not read in full. Confidence: high on the loader and the defend-objective fail rule; medium on the wave counts (awk, not read row by row). Camera scope: not applicable. Note: this donor has no dialogue or quest reward; the mechanism is a mission objective plus a parked-script loader.

## 1. Mechanism
Parked scripts: each mission is a script file on disk, named by its mission id. The loader gadget (unit_scenario_script.lua) reads the mission id from the mod options (GetScenarioID, line 23; read at line 35). If there is no id, it returns (line 36). If the file singleplayer/scenarios/scenarioscripts/<id>.lua does not exist, it returns (line 40). Otherwise it includes that file (line 45). So a script runs only when its mission is chosen and costs nothing otherwise.
Defend objective: Begin06.lua spawns one tagged unit (the mission command tower, objectiveUnits table at line 1673) at frame 0 or 1 through ObjectiveLoadout (line 1804) and marks it alive (line 1715). When any tracked unit dies (gadget:UnitDestroyed, line 1728; alive check line 1729), the code walks the group table and checks the static objectiveUnitID == 2 (line 1733). If it matches, it wipes ally team 0 (Fail, line 1692), ends the game for ally team 2 (line 1693), prints a loss message (line 1735) and returns.
Reinforcement waves: gadget:GameFrame(frameNum) (line 1800) fires one-shot tables at exact frames 16200 (BackupOne, lines 1806-1807) and 32400 (BackupTwo, lines 1809-1810). Looped tables fire on frame multiples: Timed every 14400 frames (lines 1812-1813) and Special every 36000 frames (lines 1815-1816). The loops have no end and no count. Each wave spawns its table's units with their queued orders (the wave helpers at lines 1744-1800 use the same loop).
Victory: the descriptor says "Kill all enemy builders" as plain text (scenario022.lua:58). It is not enforced in Begin06.lua.

## 2. Key functions
- unit_scenario_script.lua GetScenarioID (line 23) and the include guard (lines 35-45): the parked-script loader.
- Begin06.lua Fail (line 1691): wipe team 0 and call Spring.GameOver({ 2 }) (line 1693).
- Begin06.lua gadget:UnitDestroyed (line 1728): the defend check; it returns after the first match (line 1737).
- Begin06.lua gadget:GameFrame (line 1800): the frame schedule; line 1802 runs the start calls when n <= 1, which call Loadout (1803) and ObjectiveLoadout (1804).
- Begin06.lua Timed (line 1772) and the table starts 1071, 1341, 1522: the waves as data.

## 3. Numbers vs mechanism
- Frame rate: the donor comments assume 30 frames per second (line 1812 comment, "30frame/s *60sec"). So 16200 frames is 540 s (9 min, line 1806 comment), 32400 is 18 min (line 1809), the loop 14400 is 8 min (line 1812), and the loop 36000 is 20 min (line 1815). Frame to second: divide by 30; the frame rate is an assumption, not read from the engine.
- Entries per table (counted by name line, not read row by row): loadout 88 (line 30), backupOne 11 (line 1071), backupTwo 43 (line 1195 region; table start not receipted), timed 18 (line 1341), special 24 (line 1522).
- Frame 72000 is a multiple of both 14400 and 36000 (14400 x 5 = 72000 and 36000 x 2 = 72000), so Timed and Special both fire on that frame (arithmetic from the constants; not observed in a run).
- Difficulty handicap as data (scenario022.lua:51-55): Beginner player +50 / enemy -20; Normal 0 / 0; Brutal player -20 / enemy +50. Score is keyed by (scenarioid, version, difficulty) (scenario022.lua:4 comment), so editing the version resets scores.

## 4. TypeScript sketch
simplified: omits the Spring/Recoil unit API, the loadout and queued orders, the message text, the ally-team wipe, the victory check (not in the donor either), and the difficulty handicap. It reorders the wave check into one pass over the wave list. It fixes four donor defects: the death check reads the dead entity's role from a keyed map (not the static table), the one-shot wave fires on >= with a fired count (not exact equality), every repeating wave has a fire cap (the donor has none), and the parked-script loader returns null for an unknown id instead of including a missing file.
```ts
// Parked script loader: the mission id picks a script; no script means no-op, not an error.
interface MissionScript { onFrame(frame: number): void; onEntityDead(entityId: number): void; }
type ScriptFactory = () => MissionScript;

function loadMissionScript(missionId: string | undefined, registry: Map<string, ScriptFactory>): MissionScript | null {
  if (missionId === undefined) return null;
  const make = registry.get(missionId);
  return make ? make() : null;
}

// Defend objective: each tracked entity carries its role; only a must-survive death fails the mission.
type Role = "must-survive";
interface Wave {
  atFrame: number;           // one-shot frame (fired once, >= so a skipped frame still fires)
  every: number | null;      // repeat period in frames, or null for one-shot
  maxFires: number;          // cap on total fires; donor has no cap (added here)
  units: string[];
}
interface MissionState {
  frame: number;
  roles: Map<number, Role>;  // keyed map from entity id to role (donor mixes these into the group list)
  fired: Map<number, number>; // wave index -> times fired
  failed: boolean;
}

function onEntityDead(m: MissionState, entityId: number): void {
  if (m.roles.get(entityId) === "must-survive") {
    m.roles.delete(entityId);
    m.failed = true;
  }
}

function tickWaves(m: MissionState, waves: Wave[], spawn: (units: string[]) => void): void {
  waves.forEach((w, idx) => {
    const count = m.fired.get(idx) ?? 0;
    if (w.every === null) {
      if (count === 0 && m.frame >= w.atFrame) {
        m.fired.set(idx, 1);
        spawn(w.units);
      }
      return;
    }
    if (m.frame > 0 && m.frame % w.every === 0 && count < w.maxFires) {
      m.fired.set(idx, count + 1);
      spawn(w.units);
    }
  });
  m.frame += 1;
}
export {};
```
Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 bar-mission-objective.ts` on the VPS (/tmp): passed with no output (TSC_OK).

## 5. Lands in
Target: origins/zones/mission-script.ts (proposed): the parked-script loader keyed by zone id, the defend objective, and the wave schedule as zone data. Parity row 23 (zone population: spawn caps, respawn, despawn). The wave schedule is the row 23 part; the defend objective is quest state and has no separate parity row, so it rides on row 23's zone data.

## 6. Gaps and risks
- Zones as data: the loader pattern fits, since a zone's script is found by id. But the donor's scripts are free-form Lua with direct engine calls; Frankendom's rulings want zone data plus engine rules. Only the schedule (frame, period, units, cap) should be data; the fail rule stays in the engine.
- Server-verified kills: the objective death is decided in synced code, which is the server side, so the defend rule can be server-verified. The donor does not say so explicitly.
- One ledger: the donor keeps objective roles in a separate table (objectiveUnits, line 1717), outside any ledger. Frankendom needs the objective state in the one ledger.
- MAX_ATTACKERS = 3 and many-on-one: the donor has no cap on the number of waves or units alive, so the wave schedule alone can overwhelm a 3-attacker fight. The fire cap in the sketch is the fix.
- Victory: "Kill all enemy builders" is only text. Frankendom needs an explicit server-side win check for every zone objective, not a description.
- Dialogue: none in this file. The only player-facing text is one Spring.Echo line (1735). No dialogue tree is in this donor.
- Defect (keep the idea, fix it): UnitDestroyed checks the static table value (line 1733), not the dead unit's own role. fix: a keyed role map (sketch onEntityDead).
- Defect: objective roles are written into the group table by unit id (line 1717); that table is the list ipairs walks. fix: a separate map (sketch roles).
- Defect: the looped waves have no end (lines 1812, 1815). fix: maxFires cap (sketch tickWaves).
- Defect: one-shot waves use exact equality (lines 1806, 1809), so a skipped frame misses the wave. fix: >= with a fired count (sketch).
- Risk (not verified): the initial loadout runs for n <= 1 (line 1802). If the engine calls GameFrame for both frame 0 and frame 1, the loadout and objective units are created twice. Not checked against the engine.
- Risk: the timing comments assume 30 frames per second (line 1812). fix: express waves in seconds and convert with one constant.

Reuse tag: adapt (parked scripts selected by id, a defend objective that fails on its one must-survive entity, and frame-scheduled waves as zone data with a fire cap). No donor code is reused.
Brief rule served: Rule 1 (the hint file Begin06.lua is the mission script; the loader was found with grep on the scenario id); Rule 4 (the missing victory check and dialogue are stated as not found); Rule 6 (the frame loop is described, with its constants); Rule 8 (target file and row 23 given); Rule 10 (receipts verified).

Decision (proposed): adapt. Why: take the parked-script loader and the defend-objective fail rule for zones; keep the waves as zone data with a cap; reject the text-only victory and the single-id role check, which conflict with the server-verified-kills and one-ledger rulings.
Best transferable idea: a zone's script is a file loaded by its id only when the zone is chosen (silent when absent), and a defend objective fails the zone only on the death of its tagged entity, with waves as frame-scheduled zone data.
Acceptance: a server test asserts an unknown zone id loads no script and raises no error; the death of a tracked objective entity fails the zone while the death of an untracked unit does not; a looped wave with maxFires 3 spawns exactly 3 times over 4 periods.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- All claims verified (loader, Begin06.lua timers and one-shots, UnitDestroyed static objectiveUnitID defect, table counts, difficulty rows).
- Missed: waves are split by side in the scenario022 briefing: backupOne/backupTwo (9 and 18 min) are player and ally contingency, Timed/Special (8 and 20 min loops) are enemy reinforcements; the note treats all four as one reinforcement-wave kind.
- Missed: the defended tower is the ally (teamID 1) Cortex Command Tower, not the player's.
