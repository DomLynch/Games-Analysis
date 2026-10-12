# TrinityCore-TrinityCore (reputation-factions-crime-justice, cell 2)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` (UpdatePvPFlag 21976-21991, UpdateContestedPvP 21958-21974, UpdatePvPState 24013-24047, UpdatePvP 24056-24068), with `Unit.cpp` 9283-9299 and `Spells/Spell.cpp` 3146-3151 | Licence: GPL-2.0-or-later (GuardAI.cpp header lines 4-7: "either version 2 of the License, or (at your option) any later version"; COPYING is version 2) | C++ | symbol `Player::UpdatePvPFlag`

Checked: Read in full: Player::SetContestedPvP (21933-21956), UpdateContestedPvP (21958-21967), ResetContestedPvP (21969-21974), UpdatePvPFlag (21976-21991), UpdatePvPState (24013-24047), UpdatePvP (24056-24068), the per-tick calls (Player.cpp 920-922), Unit::AtTargetAttacked (9283-9299), the assist branch in Spell.cpp (3138-3156), Creature::AtDisengage (3852-3858), GuardAI.cpp (all 69 lines). Partly read: Player::RewardHonor (6673-6730 and 6755-6800; the level table `hk_honor_at_level_f` not read; the groupsize argument not traced), the area function that sets IsHostile (Player.cpp 7596-7642, middle part not read). Callers: SetContestedPvP has three callers (Unit.cpp 9296, Spell.cpp 3150 read; CharacterHandler.cpp 1393 not read). UpdatePvP(true) also called from Spell.cpp 3051 and MiscHandler.cpp 309/327 (not read). Not read: the trigger name for MovementHandler.cpp 370-376 (which clears PvP in a friendly area and casts an honourless-target aura, spell 2479, when IsHostile), and the generic AI aggro path that would decide whether a guard attacks a contested player. Confidence: high on the three timers and the flag (read in full); medium on the full caller set. camera_scope: not a camera cell.

## 1. Mechanism

One hostile (PvP) flag, two timers, and a kill counter. All of it lives on the player and is advanced in `Player::Update` each tick.

(a) Contact sets state. `Unit::AtTargetAttacked` (Unit.cpp 9283) handles player-on-player contact (its callers were not read). Duel opponents are excluded (9293). For the rest it calls `UpdatePvP(true)` (9295) and `SetContestedPvP(target)` (9296). `SetContestedPvP` sets the contest timer to 30000 ms (Player.cpp 21938). On first contact it also sets the attack-state bit and the contested player flag (21939-21942). A helping spell on a player who is in attack state (Spell.cpp 3146) flags the helper the same way: `SetContestedPvP()` and `UpdatePvP(true)` (3150-3151). Helping a contested player makes you contested.

(b) Contest timer. `UpdateContestedPvP(p_time)` runs every tick (Player.cpp 922). While the player is in combat it does nothing (21960). Otherwise it subtracts the elapsed milliseconds (21963-21966). At zero, `ResetContestedPvP` clears the attack-state bit and the contested flag (21969-21974). Net effect: "contested" means 30 s of out-of-combat time since the last contact; a long fight keeps it on.

(c) PvP flag decay. `UpdatePvP(true)` without override stamps `EndTimer` with the current time (24065). So every attack restarts the decay clock. Each tick `UpdatePvPFlag(now)` runs (920, 21976). It returns unless the flag is on, `EndTimer` is set, the player is not in a hostile state, and `now >= EndTimer + 300` (21981). Then it clears the PvP timer flag and calls `UpdatePvP(false)` (21987-21990). Net effect: in a friendly area the flag drops 300 s after the last contact.

(d) Hostile areas override. `UpdatePvPState` (24013) runs on area changes. In a hostile state (`IsHostile`, set at 7642 from the hostile-area flag, a forcing quest, or war mode) the flag is forced on and `EndTimer` cleared (24037-24040). On leaving to friendly ground, the decay starts (`EndTimer = now`, 24044-24045) only if the flag is on and the player did not toggle it on by hand (`PLAYER_FLAGS_IN_PVP`).

(e) Kill credit and honour. A kill's honour comes from `KillRewarder`, which calls `RewardHonor(victim, count, -1, Kill)` (KillRewarder.cpp 137). The -1 sends `RewardHonor` down the level-formula branch (Player.cpp 6704). Same-team kills give nothing (6713-6714). A victim at or below the killer's grey level gives nothing (6717-6721). Otherwise honour is `ceil(hk_honor_at_level_f(killer level) * (victim level - grey) / (killer level - grey))` (6725; the table function is not read). Each honourable kill increments the daily and lifetime counters (6728, 6730). So the kill count is a daily and lifetime tally that scales the reward, not a gate.

Guards. `GuardAI` applies to guard creatures (GuardAI.cpp 26-27). When a guard dies, the killer's zone gets a message (68). The contest code wants nearby guards to re-check (Player.cpp 21943, comment "call MoveInLineOfSight for nearby contested guards"). But in the game code of this tree, nothing reads the contest state to decide a guard's aggro: `isAttackingPlayer()` (Unit.cpp 6067-6069) has no game callers. Its only caller is a Broken Isles script (`zone_mardum.cpp` 558). So the guard's attack rule is not in the donor's game code (the generic aggro path was not read). No bounty, jail or karma system was found.

Tick: the timers are driven by `Player::Update(uint32 p_time)` (Player.cpp 886; the world-loop call that drives it was not read). The contest timer uses elapsed milliseconds (`p_time`). The PvP decay uses wall-clock seconds (`GameTime::GetGameTime()`). Two clocks, one per timer.

## 2. Key functions

- `Player::SetContestedPvP`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 21933-21956. Contact sets the 30 s contest timer and the attack-state bit.
- `Player::UpdateContestedPvP` and `ResetContestedPvP`: same file, 21958-21974. Countdown, paused in combat.
- `Player::UpdatePvPFlag`: same file, 21976-21991. Decay of the flag, 300 s after the stamp, never in a hostile state.
- `Player::UpdatePvPState`: same file, 24013-24047. Hostile-state override and the toggle-off start.
- `Player::UpdatePvP`: same file, 24056-24068. The stamp (`EndTimer = now`) on every PvP-on without override.
- `Unit::AtTargetAttacked`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp` 9283-9299. The attack entry point.
- Assist branch: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Spells/Spell.cpp` 3146-3151.
- `Player::RewardHonor` (partial): `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 6673-6730. The level formula and the counters.
- `GuardAI` (thin): `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/AI/CoreAI/GuardAI.cpp` 24-69.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A hostile act restarts a flag's idle timer (stamp = now on each PvP-on) | Stamp on every attack (Player.cpp 24065); decay check at 21981 |
| Flag decays after a quiet period; forced on while in a hostile state; never decays there | 300 s, hard-coded in the condition (21981) |
| Contest window that counts down only out of combat | 30000 ms (21938); paused in combat (21960) |
| Helper taint: helping a contested player makes the helper contested | Rule, no constant (Spell.cpp 3146-3151) |
| Anti-farming honour gate: nothing for same team or for victims at or below grey | Grey level from `GetGrayLevel(k_level)` (6717); gate at 6720 |
| Daily and lifetime kill tallies | Counters at 6728 and 6730 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: a contact refreshes both timers, the helper taint runs on assist, an area change sets or starts the decay, the contest countdown is skipped in combat, the flag decay runs after 300 s and never in a hostile area, and the honour gate runs same-team then grey. It leaves out the explicit toggle (`PLAYER_FLAGS_IN_PVP`), the attack-state bit (the sketch uses `contestedMs > 0` in its place), the FFA-realm exception in the same-team check, the duel-opponent exclusion, the groupsize argument, the honourless-target aura, and the contested display flag. `baseHonour` stands in for the donor's level table `hk_honor_at_level_f`, which was not read.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch of the shape only: hostile (PvP) flag, contest timer, helper taint, honour gate.
interface HostileState {
  flagged: boolean;          // hostile (PvP) flag is on
  decayStartS: number | null; // seconds timestamp the flag decay started; null = not running
  contestedMs: number;       // ms left on the contest timer (0 = not contested)
  inCombat: boolean;
  hostileArea: boolean;      // hostile zone, forcing quest or war mode
}

const CONTEST_MS = 30_000;   // donor: contest timer length (set on each contact)
const FLAG_DECAY_S = 300;    // donor: flag drops this long after the decay start (hard-coded in donor)

// A hostile act (attacking a player, or helping a contested player) refreshes both timers.
function onHostileAct(s: HostileState, nowS: number): void {
  s.flagged = true;
  s.decayStartS = nowS;      // donor restamps the end timer with now on every PvP-on
  s.contestedMs = CONTEST_MS;
}

// Helping a player who is contested flags the helper too (donor: spell path, assist case).
function onAssist(helper: HostileState, target: HostileState, nowS: number): void {
  if (target.contestedMs > 0) onHostileAct(helper, nowS);
}

// Area change: a hostile area keeps the flag on; leaving it starts the decay.
function onAreaChanged(s: HostileState, nowS: number, hostile: boolean): void {
  s.hostileArea = hostile;
  if (hostile) {
    s.flagged = true;
    s.decayStartS = null;
    return;
  }
  if (s.flagged && s.decayStartS === null) s.decayStartS = nowS;
}

// Per tick: the contest timer counts down only out of combat.
function tickContest(s: HostileState, diffMs: number): void {
  if (s.contestedMs <= 0 || s.inCombat) return;
  s.contestedMs = Math.max(0, s.contestedMs - diffMs);
}

// Per tick: the flag drops FLAG_DECAY_S after the decay start, never in a hostile area.
function tickFlag(s: HostileState, nowS: number): void {
  if (!s.flagged || s.decayStartS === null || s.hostileArea) return;
  if (nowS < s.decayStartS + FLAG_DECAY_S) return;
  s.flagged = false;
  s.decayStartS = null;
}

// Honour for a player kill (donor shape). baseHonour stands in for the donor's level table (not read).
function killHonour(killerLevel: number, victimLevel: number, grayLevel: number, sameTeam: boolean, baseHonour: number): number {
  if (sameTeam) return 0;
  if (victimLevel <= grayLevel) return 0;
  return Math.ceil(baseHonour * (victimLevel - grayLevel) / (killerLevel - grayLevel));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/rf002-trinity-pvp-flag.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/hostility.ts` (new): the hostile flag, the contest window and the kill tallies, owned by the engine. The contact and the decay run in the engine's duel step.
- Parity-checklist row 1 (duel step / sim): contact refreshes, the contest countdown and the flag decay are steps of the sim tick.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape from the described mechanism)
- Brief rule served: 1 (one engine: the flag and the timers are decided in the engine, not the client); rules 7-9 n/a

Best transferable idea: Make the hostile flag a timer that each hostile act restarts, paused in combat for the contest window and forced on in hostile zones, so the flag ends by itself after a quiet period.
Decision (proposed): adapt — keep the three-timer shape (contact refresh, in-combat-paused contest window, idle decay with a hostile-zone override) and the anti-farming honour gate; fix the hard-coded 300 s and the single shared end-timer field; take no guard rule from this donor.
Acceptance: a server test: an attack on a player marks both as contested for 30 s out of combat; a second attack restarts the decay; the flag clears 300 s after the last attack in a friendly zone and never in a hostile zone; a kill of a same-team player, or of a victim at or below grey, awards no honour.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no line is translated.
- Defect (keep the idea, fix the constant): the 300 s decay is written into the condition at 21981. fix: name it and make it zone data, so a hostile zone or a zone with no decay is a data row.
- Risk (keep the idea, split the field): `EndTimer` carries two meanings. An attack restamps it (24065), and the toggle-off logic reads it as "decay started" (24039, 24044). fix: separate "last hostile act" from "decay started".
- Risk: two clocks. The contest window counts elapsed milliseconds from the tick; the decay uses wall-clock seconds. A fix: one clock in the engine tick, in ms.
- Guards: this donor's game code does not give guards a rule that reads the contest state (see Mechanism). Frankendom guard aggro must be designed separately (parity row 2 for the AI brain; guard spawns are row 23). Do not port a guard rule from here.
- Kill and honour: honour is granted inside the server kill path (KillRewarder). Frankendom kills are server-verified; attach the honour and tally to the same server kill event, and write one ledger entry per kill.
- Anti-farming: the grey gate (6717-6721) is the part that transfers well: nothing for victims at or below the killer's grey level.
- Many-on-one: the donor has no cap on how many players a single player can contest or be contested by. MAX_ATTACKERS = 3 is not in this donor and must come from our rulings.
- Not in this donor: bounties, jail, karma and fame as a separate track. Honour tallies are the nearest thing.
- The level table `hk_honor_at_level_f` and the groupsize use (6673, 137) were not read. Do not port the honour curve until read.
