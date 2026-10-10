# daggerfall-unity (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemySenses.cs` (with `EnemyMotor.cs`, `GameManager.cs`, `Formulas/FormulaHelper.cs`) | Licence: MIT License, "Copyright (c) 2009-2023 Daggerfall Workshop" (LICENSE line 3; permissive: code may be adapted) | C# (Unity) | symbols `EnemySenses.GetTargets`, `EnemySenses.CanSeeTarget`, `EnemySenses.CanHearTarget`, `EnemySenses.StealthCheck`, `EnemySenses.FixedUpdate`, `EnemyMotor.MakeEnemyHostileToAttacker`, `GameManager.FixedUpdate`

Checked: Read in full the target selection (`GetTargets`, EnemySenses.cs 751-875), sight and hearing (`CanSeeTarget` 876-925, `CanHearTarget` 929-965), the per-frame target and detection block (`FixedUpdate` 244-480, the parts from 306 to 480 read in full), the stealth roll (`StealthCheck` 618-657), the attacked path (`MakeEnemyHostileToAttacker`, EnemyMotor.cs 183-201), the give-up timer (EnemyMotor.cs 355-366 and 405-425), and the classic-update flag (GameManager.cs 42, 490-508). Also `FormulaHelper.CalculateStealthChance` (Formulas/FormulaHelper.cs 282-290) and `ProjectSettings/TimeManager.asset` (fixed timestep 0.02). Other candidates opened: `EnemyAttack.cs`, `EnemyHealth.cs`, `Entities/EnemyEntity.cs` (grep only; not read). Not read: EnemyMotor's chase steering and pursuit movement (the code that walks to the last known position), `PredictNextTargetPos` (EnemySenses 541-600), the classic spawn-area computation (EnemySenses ~262-305), `Dice100.FailedRoll`, `GetActiveTargetEntityBehaviours`, `BlockedByIllusionEffect` (659-685), and the callers of `MakeEnemyHostileToAttacker` beyond its own body. Confidence: high on target selection, detection, and the give-up timer as written; medium on the chase side (not read). camera_scope: n/a (ai-aggro).

Best transferable idea: a monster re-picks its target every fixed number of fixed steps by scoring each candidate (+10 if seen, 30 minus distance, clamped at 0, +5 for a free monster), keeps a give-up countdown that refreshes on detection, and drops to idle when it reaches zero.
Decision (proposed): adapt - take the scoring and the refresh-on-detect give-up timer for Frankendom's aggro, but the donor's +5 free-target bonus only applies to monster candidates, not the player, so the many-on-one spread rule for MAX_ATTACKERS = 3 must be written new and not assumed from this donor.
Acceptance: server test: with hero A seen at 8 units and hero B unseen at 4 units, the monster targets A (score 32 against 26); after B hits the monster the monster retargets to B; after 200 undetected give-up ticks the monster returns to idle, and any detection resets the count to 200.

## 1. Mechanism

- Drive: `EnemySenses.FixedUpdate` (244-480) runs on Unity's fixed step; the project fixed timestep is 0.02 s (TimeManager.asset line 6). Two accumulators drive the AI, both reset to zero rather than carrying the remainder:
  - Target re-check: `classicTargetUpdateTimer += Time.deltaTime / systemTimerUpdatesDivisor` (314), divisor `.0549254` (75). When the timer is above 5 (388) it is zeroed (390), and `GetTargets()` runs only if the monster is in the classic area or can see the player (393-395). At a 0.02 s step this is every 14 steps (0.28 s), since each step adds about 0.364 units and 14 steps is the first count above 5.
  - Classic update flag (GameManager.cs 499-506): accumulates `Time.deltaTime` against `classicUpdateInterval` 0.0625 s (42) and zeroes the accumulator when it fires (502). At the 0.02 s step this fires every 4th step (0.08 s), not every 0.0625 s, because the accumulator is reset rather than carried. The give-up countdown uses this flag, so the donor's effective give-up time is 200 flag ticks at 0.08 s, about 16 s, not 12.5 s.
- Candidate scoring (`GetTargets`, 751-875). Candidates come from `GetActiveTargetEntityBehaviours` (not read). Rejections, in order: self; the player when NoTargetMode or the monster is not hostile or the monster is a player ally (776); a pacified monster and a player ally (ally rules); a player ally that would hit a non-hostile monster; the player when the monster is a player ally; team mates when infighting is on (`EnemyInfighting` and not `SuppressInfighting`); and, when infighting is off, any non-player candidate unless the monster is a player ally; quest AI that is not attackable. Then the monster-only rejection at 824: `if (targetSenses && !targetSenses.WouldBeSpawnedInClassic && !see)` continue. So an unseen monster outside the classic spawn area is dropped; an unseen player is not.
- Score (830-842): +5 if the candidate is a monster with no target (`targetSenses` is set only for EnemyMonster or EnemyClass, 809-811, so the player never gets this bonus); +10 if seen; plus `30 - distanceToTarget` clamped at 0 (837). The best is replaced only on a strictly higher score (842), so ties keep the earlier candidate. The second-best is kept for the enhanced combat AI.
- Detection (`FixedUpdate` 388-480): with a target chosen, it measures the target (sight and hearing), then:
  - Sight (`CanSeeTarget`, 876-925): within `SightRadius + SightModifier` (881), with the target inside a cone of half the field of view (885), and a raycast from the monster's eye (centre plus height/3) to the target's eye that hits the target first (905). `SightRadius` is `4096 * GlobalScale` (30), `FieldOfView` is 180 (32).
  - Hearing (`CanHearTarget`, 929-965): only when the target was detected and is not in sight (434; sight is checked first). Within `HearingRadius` 25 plus HearingModifier (937); blocked by any static geometry on the ray (954). Hearing is not scaled by GlobalScale (31).
  - If sight or hearing succeeds and no illusion blocks it (451): detected, last known position set, and `lastHadLOSTimer = 200` (453-455).
  - Otherwise a stealth roll (457; `StealthCheck` 618-657): only within `1024 * GlobalScale` (626), at most once per in-game classic minute (630), and the chance from `FormulaHelper.CalculateStealthChance` (654; formula `2 * ((int)(dist / GlobalScale) * stealthSkill >> 10)`, FormulaHelper.cs 288), rolled with `Dice100.FailedRoll` (656; roll not read). The stealth result sets detection without updating the last known position while `lastHadLOSTimer > 0` (the timer is decremented only on classic updates).
- Give-up (`EnemyMotor`): `EnemyMotor.FixedUpdate` (155) calls `HandleNoAction` (168) and `UpdateTimers` (170). `GiveUpTimer` is set to 200 when the monster is attacked (201) and while `senses.DetectedTarget` is true (419-420). It counts down only on classic flag ticks while not detected (423-424), so once per 4 fixed steps. When it reaches zero, or there is no target, `HandleNoAction` clears `CanAct` and starts the change-state timer (359-366).
- Attacked path (`MakeEnemyHostileToAttacker`, 183-201): the attacker becomes the target if the monster has no target, or its target is not in sight, or its target is more than 2 units away (194). Then the target's last known position is set to the attacker's position, and the give-up timer is set to 200 (196-201).
- Target death: the target is cleared when its health is zero or below (316-317). When the target has no target itself, the monster sets that target's `Target` to itself (406), so monsters pair up.

## 2. Key functions

- `GetTargets`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemySenses.cs` 751-875 (target selection, priorities, second target).
- `CanSeeTarget`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemySenses.cs` 876-925 (sight cone, eye-to-eye raycast).
- `CanHearTarget`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemySenses.cs` 929-965 (hearing radius, static-geometry block).
- `FixedUpdate` (detection): `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemySenses.cs` 244-480 (re-check accumulator, sight, hearing, stealth fallback, last known position).
- `StealthCheck`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemySenses.cs` 618-657.
- Give-up and attacked path: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyMotor.cs` 183-201, 355-366, 405-425.
- Classic flag: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/GameManager.cs` 42, 490-508.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Re-check the target on a fixed cadence (accumulator, reset to zero) | divisor 0.0549254 (75); threshold 5 (388); 0.28 s at a 0.02 s fixed step (derived) |
| Score: visible candidate beats unseen | +10 seen (834) |
| Score: nearer is better, zero beyond 30 units | 30 minus distance, clamped at 0 (837) |
| Score: free monster candidate | +5 when the candidate has no target (830-831); monsters only, not the player (809-811) |
| Strict tie-break: earlier candidate wins | `priority > highestPriority` (842) |
| Sight range and cone | 4096 * GlobalScale plus SightModifier (30, 881); half of FieldOfView 180 (885) |
| Hearing range | 25 plus HearingModifier (31, 937); blocked by static geometry (954) |
| Stealth range | 1024 * GlobalScale (626) |
| Stealth chance | 2 * ((dist / GlobalScale) * skill >> 10) (FormulaHelper.cs 288) |
| Give-up countdown | 200 flag ticks (420, 201); flag fires every 0.0625 s interval, effectively every 4th 0.02 s step (42, 500-503) |
| Attacked retarget distance | 2 units (194) |

## 4. TypeScript sketch

simplified: the sketch keeps target scoring (priority, strict best and second), the monster-only unseen rejection, the give-up countdown with refresh on detection, and the stealth chance formula. It omits the player-ally and pacified rules, the infighting setting, quest AI, the classic spawn-area computation (passed in as `inClassicArea`), the sight cone and raycast (passed in as `seen`), hearing, the stealth roll (`Dice100.FailedRoll` is not read), the once-per-minute stealth gate, the last-known-position updates, the attacked retarget, and the reciprocal target assignment. The donor's accumulator reset is noted here but not modelled.

```ts
// Licence of donor: MIT (Daggerfall Workshop, 2009-2023). Adaptable; this sketch is shape-only.
interface Cand {
  isPlayer: boolean;
  alive: boolean;
  seen: boolean;          // line of sight from the monster to the candidate
  inClassicArea: boolean; // monsters only: in the area around the player
  dist: number;
  hasTarget: boolean;     // monsters only: already targeting someone
  hostile: boolean;       // false when pacified or in no-target mode
}

// Donor priority: +5 free monster, +10 seen, distance term 30 - dist (clamped at 0).
function priority(c: Cand): number {
  let p = 0;
  if (!c.isPlayer && !c.hasTarget) p += 5;
  if (c.seen) p += 10;
  p += Math.max(0, 30 - c.dist);
  return p;
}

// Best and second-best candidates. Ties keep the earlier candidate (strict comparison).
function pickTargets(cands: Cand[]): { best: Cand | null; second: Cand | null } {
  let best: Cand | null = null;
  let second: Cand | null = null;
  let bp = -1;
  let sp = -1;
  for (const c of cands) {
    if (!c.alive) continue;
    if (c.isPlayer && !c.hostile) continue;
    if (!c.isPlayer && !c.inClassicArea && !c.seen) continue; // unseen monsters outside the area are rejected
    const p = priority(c);
    if (p > bp) { second = best; sp = bp; best = c; bp = p; }
    else if (p > sp) { second = c; sp = p; }
  }
  return { best, second };
}

const GIVE_UP_START = 200;  // give-up timer, classic flag ticks

// Refresh on detection; otherwise count down on classic flag ticks only.
function giveUpStep(timer: number, detected: boolean, classicUpdate: boolean): number {
  if (detected) return GIVE_UP_START;
  if (classicUpdate && timer > 0) return timer - 1;
  return timer;
}

// Stealth chance as in the donor: 2 * ((dist in game units) * skill >> 10). The roll itself is a parameter (Dice100.FailedRoll not read).
function stealthChance(distUnits: number, skill: number): number {
  return 2 * ((Math.trunc(distUnits) * skill) >> 10);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/q027-daggerfall.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module: the engine's target choice, detection and give-up for a monster; server side). Parity-checklist row 4 (fight loop: aggro, chase, leash).
- Reuse tag: adapt (MIT: code may be adapted; shape only in this note)
- Brief rule served: 1 (one engine: aggro and target choice in the engine, not a client); zones as data (sight, hearing, and give-up numbers are data); rules 7-9 n/a

## 6. Gaps and risks

- The +5 free-target bonus applies only to monster candidates (809-811, 830). Against players, the donor does not spread attackers, so the MAX_ATTACKERS = 3 spread rule is new work, not a port. The 30-units distance term is also per donor scale; Frankendom's duel ranges must set their own.
- Sight and hearing run against Unity physics raycasts with eye heights. Frankendom's duel has no physics world per ruling; the transferable part is the rule (seen beats unseen, distance term), with seen supplied by the engine's own line-of-sight test (not designed here).
- The stealth roll is a classic-game mechanic tied to in-game minutes. Do not port it unless Frankendom wants stealth; if it does, it must be a zone data field and the roll must be server-side.
- Time: the donor's effective give-up is 200 flag ticks at 0.08 s (16 s) at the 0.02 s fixed step, because the flag accumulator resets rather than carries (GameManager.cs 500-503). Frankendom's server tick should state its own give-up length in ticks and test it, not copy the donor's 12.5 s reading.
- Retarget on hit (194): the attacker replaces the target when the current target is not in sight or is more than 2 units away. This is a hate rule; Frankendom's ledger needs one hate value per attacker, which the donor does not keep.
- The donor's chase movement (EnemyMotor steering) is not read; Frankendom's leash rule (row 4) is not covered by this note.

Reuse tag: adapt (MIT; code may be adapted; shape only here)
Brief rule served: 1 (one engine); zones as data; rules 7-9 n/a
