# jynew-jynew (spawns-encounters, cell 1)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Mods/xiastart_roguelike/Lua/wumingshangu.lua` | Licence: unclear (see Checked) | Lua (XLua, Unity client) with C# battle loader | symbol `GenerateEnemies`

Checked: Symbols `GenerateEnemies` (75-89), `GenerateRole` (93-138) and `NextBattle` (142-189) read in full; `GenerateRandomTeammate` (191-200) read; the C# path read: `LevelLoader.LoadBattle` (LevelLoader.cs 51-53), `TryBattleWithConfig` (Jyx2LuaBridge.cs 2005-2020), `BattleLoader.LoadJyx2BattleStep2` (BattleLoader.cs 159-205), `AddRole`/`AddDynamicRole` (212-245), `FindSpawnPosition` (316-325). Confidence high on the arithmetic (checked against Lua 5.3/5.4 numeric-for semantics: the upper limit is inclusive and floored), not run in Unity. Not read: `Dead()`, the tail of `GenerateRandomTeammate` (201-219), `LearnMagic`'s starting skill level, the value of `CS.GameConst.MAX_ROLE_LEVEL`, the contents of the `Jyx2Battle_0..25` scenes, and whether `math.random` is seeded anywhere. The line-79 comment ("max 8 enemies") is not receipted: the line is under 15 characters.

## 1. Mechanism

- Entry is `NextBattle` (142). It reads the floor counter from scene flags (145), builds a battle config with `Id = 9999` (150), a random scene `Jyx2Battle_0..25` (151), `Exp = 400 * (floor+1)` (152), and `AutoTeamMates = {-1}` (156, so the player picks party members), then calls `GenerateEnemies(level, battleConfig)` (157). The config is generated, not designer-authored.
- `GenerateEnemies` (75): `InitForDynamicData()` (77). Then a numeric for loop from 0 to `math.min(level/4, 8)` (80). Each pass calls `GenerateRole(level)` (81) and appends the result to `DynamicEnemies` (82). If floor < 5 the enemy's items are cleared (85-86). Because Lua's for loop includes its upper limit, a floor-0 fight gets 1 enemy and a floor-32 fight gets 9 (see Gaps).
- `GenerateRole` (93), in order: (a) base role id uniform in 1..76 (94); (b) re-roll while the base role's level is above floor+3 (98-99); (c) clone and reset items (103-104); (d) level up while the enemy level is below `min(floor, MAX_ROLE_LEVEL)` (107-108), so the enemy is never lowered; (e) skill learning: `max(floor/10 - 1, 0)` inclusive loop (112), so `max(floor/10, 1)` rolls; each roll that finds fewer than 10 skills (113) draws an id in 0..92 (114); ids 75 and 76 are consumed without learning (115-117); (f) skill upgrade (125-132): for each skill below `floor*25`, level = `min(random(level, floor*25), 900)`; (g) `Recover()` (136).
- Back in `NextBattle`: `TryBattleWithConfig` (159). A loss calls `Dead()` (160). A win: floor +1 (163), party rest, a reward roll (teammate 191-200, potions 181), then `AutoSave()` (186; body 225-229 saves into slot 0 and shows a toast).
- The C# side runs the roster. `TryBattleWithConfig` (Jyx2LuaBridge.cs 2005) calls `LevelLoader.LoadBattle(battle, ...)` (2020). `BattleLoader` adds the base-game enemies from the designer's fixed `battle.Enemies` list (179-184), then the generated `DynamicEnemies` as team 1 (198-202, `AddDynamicRole(r, 1)`). Each dynamic enemy gets position key `battle{id}/1_{index}` (233-241). `FindSpawnPosition` (316-323) looks up `Level/BattlePos/<key>` first and falls back to the team point `Level/BattlePos/1`.
- Tick, camera and timing: not applicable (turn-based battle, set up once per fight).

## 2. Key functions

- `GenerateEnemies`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Mods/xiastart_roguelike/Lua/wumingshangu.lua` 75-89. Roster size, the per-enemy loop, the no-items rule under floor 5.
- `GenerateRole`: same file, 93-138. Base pick with the level band, levelling, skill rolls, skill upgrade.
- `NextBattle`: same file, 142-189. Builds the config, runs the fight, branches on win and loss, grants rewards.
- Battle roster placement: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameBattle/BattleLoader.cs` 159-205 (`LoadJyx2BattleStep2`), 233-245 (`AddDynamicRole`), 316-325 (`FindSpawnPosition`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Roster grows with the floor, one enemy per fixed number of floors, with a cap | One enemy per 4 floors (`level/4`), cap 8 in the code's intent; the Lua loop actually yields up to 9 (theirs, 80) |
| Base pick restricted to a level band above the floor, then levelled up to the floor | Band +3 (theirs, 98); level-up target `min(floor, MAX_ROLE_LEVEL)` (theirs, 107); `MAX_ROLE_LEVEL` value (not read) |
| Skill rolls that scale every N floors, excluded ids skipped | One roll per 10 floors, at least one (theirs, 112); ids 0..92 with 75 and 76 excluded (theirs, 114-115); cap of 10 skills (theirs, 113) |
| Skill levels climb toward a floor-scaled target with a hard cap | Target `floor * 25`, cap 900 (theirs, 129-132) |
| Items withheld below a floor | Under floor 5 (theirs, 85) |
| Reward scales with the floor | EXP `400 * (floor+1)` (theirs, 152) |
| Floor counter advances only on a win | +1 on win (theirs, 163); loss calls `Dead()` (theirs, 160) |

## 4. TypeScript sketch

simplified: the sketch uses the intended roster cap of 8 (and at least 1 enemy), not the donor's inclusive loop, which gives up to 9. It replaces the donor's re-roll loop with one filter (the same uniform pick over eligible roles, with no unbounded loop). It starts learned skills at level 0 because the donor's `LearnMagic` starting level was not read. It omits the reward branch (potions, teammate, `RestTeam`), the loss branch `Dead()`, the random map-scene pick, the save call, and the per-index spawn-point fallback. Typechecked on the VPS: `tsc --noEmit --strict --target es2020` exit 0.

```ts
// Licence: unclear (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface RolePick { level: number; skills: Skill[] }
export interface Skill { id: number; level: number }
export interface Enemy { level: number; skills: Skill[]; hasItems: boolean }

export interface EncounterParams {
  enemiesFloorDivisor: number;   // 4: one more enemy every 4 floors
  maxEnemies: number;            // 8: intended cap
  levelBand: number;             // 3: enemy base level may exceed the floor by at most this
  maxRoleLevel: number;          // donor MAX_ROLE_LEVEL (value not read)
  noItemsBelowFloor: number;     // 5
  skillRollEveryFloors: number;  // 10: one skill roll per 10 floors (at least one)
  maxSkills: number;             // 10
  skillIdCount: number;          // 93: ids 0..92
  skippedSkillIds: number[];     // [75, 76]: roll consumed, nothing learned
  skillLevelPerFloor: number;    // 25
  skillLevelCap: number;         // 900
  expPerFloor: number;           // 400
}

export type Rng = () => number; // uniform in [0, 1)

// Inclusive integer range, like Lua math.random(lo, hi).
function randInt(lo: number, hi: number, rng: Rng): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function makeEncounter(
  floor: number,
  roles: RolePick[],
  p: EncounterParams,
  rng: Rng,
): { enemies: Enemy[]; exp: number } {
  // Roster size: one enemy per divisor floors, at least 1, capped.
  const count = Math.max(1, Math.min(Math.floor(floor / p.enemiesFloorDivisor), p.maxEnemies));

  // Eligible base roles: the donor re-rolls until the level fits; one filter gives the same uniform pick.
  const pool = roles.filter((r) => r.level <= floor + p.levelBand);
  if (pool.length === 0) throw new Error("no role within level band");

  const enemies: Enemy[] = [];
  for (let i = 0; i < count; i++) {
    const base = pool[randInt(0, pool.length - 1, rng)];
    const enemy: Enemy = {
      // Levelled up to the floor (capped), never lowered below the base level.
      level: Math.max(base.level, Math.min(floor, p.maxRoleLevel)),
      skills: base.skills.map((s) => ({ ...s })),
      hasItems: floor >= p.noItemsBelowFloor,
    };

    // Skill rolls: max(floor(floor / 10), 1) rolls, each may learn one skill.
    const rolls = Math.max(Math.floor(floor / p.skillRollEveryFloors), 1);
    for (let r = 0; r < rolls; r++) {
      if (enemy.skills.length >= p.maxSkills) continue;
      const id = randInt(0, p.skillIdCount - 1, rng);
      if (!p.skippedSkillIds.includes(id)) enemy.skills.push({ id, level: 0 });
    }

    // Skill levels rise toward floor * 25, capped at 900.
    const target = floor * p.skillLevelPerFloor;
    for (const s of enemy.skills) {
      if (s.level < target) s.level = Math.min(randInt(s.level, target, rng), p.skillLevelCap);
    }

    enemies.push(enemy);
  }

  return { enemies, exp: p.expPerFloor * (floor + 1) };
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (new function: a gauntlet or tower zone builds its next roster from the floor number and zone data; the roster is produced in the engine, the zone supplies only the numbers).
- Parity-checklist row 23 (zone population: spawn caps, with the roster cap as a zone field). Do not use row 18 here: this is the encounter roster, not loot or XP.
- Reuse tag: rewrite-from-idea (licence unclear; clean-room only)
- Brief rule served: zones as data (every per-floor number is a zone field); one engine (the roster generator lives in the engine, not in a mod script)

## 6. Gaps and risks

- Licence unclear, so clean-room only. Root `LICENSE` says the project's resources and code are not permitted for use "unless authorized" (lines 5 and 8). `README.md` line 291 says the project follows MIT, overridden in places by the community asset licence. The C# file headers (`BattleLoader.cs` line 5) say all code is MIT. Frankendom takes the shape only and writes its own code.
- Count bug in the donor: the loop `for i=0,math.min(level/4,8)` (80) includes its upper limit, so it yields up to 9 enemies (1 at floor 0, 9 at floor 32 and above), while the comment on line 79 says "max 8". Frankendom takes one roster cap as zone data (8 in the sketch) and keeps the fight's simultaneous-attacker limit separate: MAX_ATTACKERS = 3 is the engine rule for how many attack at once, and a roster of up to 8 still fights three at a time.
- Unbounded loop: the re-roll at 98-99 never ends if no role lies within the level band. Whether the data prevents that was not checked. The sketch filters once and throws on an empty pool.
- One engine: the donor generates the roster in Lua inside the Unity client, which also runs the fight. Nothing is verified by a server. Frankendom's rule is server-verified kills, so the roster must come from the engine and the kill must be checked on the server, not in a mod script.
- One ledger: the floor counter lives in scene flags (`scene_api.SetInt("Level", ...)`, 163) and is auto-saved (186). Frankendom needs this counter in the one character ledger, not in scene state.
- Determinism: the donor draws from `math.random` directly. Whether it is seeded elsewhere was not read. Frankendom's fight record and replay (checklist row 19) need a seeded draw for the roster.
- Spawn fallback: if a per-index spawn point is missing, `FindSpawnPosition` falls back to the team point (323), so extra enemies can stack on one spot. Frankendom's zone data must declare every slot.
- The donor's skill-learn roll (112) runs before the skill upgrade (125). Frankendom should keep that order and test it.

Best transferable idea: a gauntlet or tower zone can build each encounter from one floor number alone, with roster size, level band, skill rolls and reward all taken from a few per-floor zone fields.
Decision (proposed): adapt — take the floor-driven roster, the level band and the per-floor skill rolls, but cap the roster with zone data (8) and keep simultaneous attackers at MAX_ATTACKERS = 3 in the engine; do not copy the inclusive Lua loop (yields 9) or the unbounded re-roll.
Acceptance: a server test starts floor 8 of a gauntlet zone and asserts exactly 2 enemies (8/4), each with base level at most 11 (floor + 3), and never more than 3 attacking at once.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** GenerateEnemies loop 0..min(level/4,8) inclusive (9 max), GenerateRole steps (76 roles, +3 band re-roll, level-up to min(floor,MAX), skill rolls 0..92 skipping 75/76, cap 10, upgrade floor*25 cap 900), NextBattle Exp 400*(level+1), win +1, AutoSave, C# BattleLoader 179-204, AddDynamicRole posKey, FindSpawnPosition fallback, licence lines all verified. Note: acceptance 'floor 8 -> exactly 2' is a deliberate Frankendom rule (donor would give 3).

**Missed:** GenerateRandomTeammate has a maxLoop > 100 guard (wumingshangu.lua 205-209), a contrast to the unbounded GenerateRole re-roll; note listed 201-219 as unread. Potion reward loop 0..min(level/10,2) at 181.
