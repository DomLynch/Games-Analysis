# gawric-Unity-Client-for-L2J (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Controller/StateMachine/State/Helpers/AttackTimingHelper.cs` (with `Utils/CalcBaseParam.cs`, `Animation/BaseAnimationController.cs`, `Animation/Player/PlayerStateJAtk.cs`, `Controller/StateMachine/AnimationSystem/AnimationManager.cs`) | Licence: Apache-2.0 (repo-root `LICENSE`, "Version 2.0, January 2004"; permissive, code may be adapted, keep the licence notice) | C# (Unity) | symbol `AttackTimingHelper.ComputeLinearPAtkSpeed`

Checked: Read in full: `AttackTimingHelper.cs` (1-128), `CalcBaseParam.cs` (8-16, 18-34), `BaseAnimationController.cs` (1-127, 190-195, the attack-speed setters), `PlayerStateJAtk.cs` (84-100, 150-170), `AnimationManager.cs` (656-680), `NewAttackState.cs` (36-66), `AbstractAttackEvents.cs` (280-307), `MonsterStateAtk.cs` (1-93), `PlayerStateAtk.cs` (1-46), `Entity.cs` 225-231 and `PlayerEntity.cs` 118-130 (callers of the setters). Callers checked by grep: `ComputeLinearPAtkSpeed` is called from `AnimationManager.cs` 677 and from at least one more attack state (the grep output did not pin all of them; not all read), `ResolveHitFractionByWeapon` from `PlayerStateJAtk.cs` 93 and `NewAttackState.cs` 48, `UpdateAnimatorAtkSpdMultiplier` (callers: PlayerStateAtk, NpcStateAtk, UserStateAtk), `SetPAtkSpd` (callers: PlayerEntity 127, Entity 230, MonsterStateAtk 49), `_lastAtkClipLength` (declared 12, read 98, assigned nowhere). Not read: `SwordCollisionService.BeginAttack` and `EmitHitFromAttackShot` (where the hit is delivered), `ProjectileFlightTimeCalculator` (bow flight), the `StatsConverter` used by `base.UpdatePAtkSpeed`, the Animator controller graph wiring of `patkspd` (the name appears in `Resources/Data/Animations/Animator/_Template/*.controller`; the state wiring was not read), `AnimatorEventAdder.cs` (the editor tool that adds the events). Confidence: high on the cycle formula, the clip-rate formula and the hit-fraction numbers (read and receipted); moderate on the end-to-end hit path, because the hit delivery is not read. Depth: thin. camera_scope: n/a.

Best transferable idea: Make the attack's full cycle an engine value (cycle = 500000 / attack speed, floored at 100 ms), play the swing clip at the rate that fits exactly one cycle, and place the hit at a fixed fraction of the cycle (0.5 melee, 0.82 bow).
Decision (proposed): adapt - the cycle and hit-moment numbers belong in the engine so the swing and the server-verified hit cannot drift apart; the donor's choice to fire the hit from a client animation event is rejected.
Acceptance: A hero swing clip of length L plays at rate L / cycle so it ends when the next attack is ready; its hit event fires at cycle x fraction (0.5 melee, 0.82 bow) within one 60 Hz frame for attack speeds 200 to 1000 (cycles 2500 to 500 ms), and a server test asserts the hit time equals the engine's hit moment.

## 1. Mechanism

- Cycle. The full attack time is `CalculateTimeL2j(patkSpeed) = Math.Max(100, 500000 / patkSpeed)` (CalcBaseParam.cs 8-10), in ms. `ResolveAttackCycleMs` uses it for non-bow attacks and returns it unchanged (AttackTimingHelper.cs 73-81). Attack speed falls back to 333 when the entity or stats are missing (55-56) or both stat fields are 1 or less (61-67).
- Bow variant. For bow animations with a known target distance (over 0.01), the draw window is the base cycle minus the arrow flight time, clamped at a maximum (AttackTimingHelper.cs 84-98; CalcBaseParam.cs 21-32). Flight time comes from `ProjectileFlightTimeCalculator` (not read).
- Clip rate. `ComputeLinearPAtkSpeed(clipLengthSec, cycleMs) = clipLengthSec * 1000 / max(1, cycleMs)` (AttackTimingHelper.cs 104-107). Its comment says it plays "the whole clip over server timeAtk (not timeAtk/2)" (102). The rate is the animator speed; a clip of 1.0 s over a 1000 ms cycle runs at rate 1.0. Real duration of the clip = L / rate = cycle, by construction.
- Who applies it (melee). `AnimationManager.ApplyLinearMeleePAtkSpeed` reads the clip length if the caller gave none, takes the cycle for the entity and animation name (676), computes the linear rate (677) and writes it to the controller (678). `PlayerStateJAtk` calls it once when the swing clip's length is known (160-161) and then writes the stored rate on each update once `_startTime >= 0` and the rate is set (164-165). `_rateFromSwingClip` ensures it is taken once (160-162).
- Hit fraction. `ResolveHitFractionByWeapon` returns 0.5 for melee (SIMPLE_MELEE_HIT_OVER_FULL, line 6; default at 121) and 0.82 for bow names containing "bow" (119). `ResolveServerLikeHitMs = cycle x fraction` (124-127). `PlayerStateJAtk` computes `hitAtMs = _fullCycleMs * hitFraction` (92-95; the fraction falls back to 0.5 with no player, line 94).
- Order of events for one melee attack (as read): the attack packet starts the attack state (`NewAttackState.cs` 46-63): it computes the cycle (47) and the fraction (48), logs them, and calls `SwordCollisionService.BeginAttack` with both (57-63; body not read). The swing clip plays at the linear rate (above). The hit is an animation event in the clip: "AttackShot on jatk*_1HS/_2HS/_dual/_pole (not wall-clock)" (NewAttackState.cs 65). When the AttackShot event fires, `AbstractAttackEvents` logs the server's cycle and hit ms and asks for a comparison with the wall-clock times (293-298) and calls `EmitHitFromAttackShot` (301). So the hit time is set by the clip's event, and the server-like hit ms is only compared with it in the log.
- Older path (not consistent). `UpdateAnimatorAtkSpdMultiplier(clipLength)` sets the animator rate to `clipLength * 1000 / _pAtkSpd` (BaseAnimationController.cs 104-111), where `_pAtkSpd` is whatever `SetPAtkSpd` stored last (94-102). `PlayerStateAtk` calls it on enter (20); `NpcStateAtk` (16) and `UserStateAtk` (19) call it too (which callback was not read). The stored value comes from different sources: the player entity's converted pAtk (PlayerEntity.cs 126-127; the converter is not read), the NPC path's `pAtkSpd / timeAtck` where timeAtck = 500000 / pAtkSpd (Entity.cs 228-230; CalcBaseParam.cs 15), and the monster's curve (MonsterStateAtk.cs 47-49). These are different units, so this older path does not give one consistent rate.
- Monster. On enter, the monster sets the rate to `clip ms / L2 attack ms` (MonsterStateAtk.cs 27-34, BaseAnimationController.cs 113-119). Each frame it evaluates a curve and passes the value to `SetPAtkSpd` (47-49). `SetPAtkSpd` only stores the value (97), and the animator is updated only `if (_lastAtkClipLength != 0)` (98). That field is never assigned (grep), so in this code the per-frame curve never reaches the animator. The curve's keys (MonsterStateAtk.cs 85, 87) are in seconds on the x axis (the end key is the attack time in s), but the curve is read with a 0..1 normalized time (47-48), so the scale is also wrong.

## 2. Key functions

- `AttackTimingHelper.ComputeLinearPAtkSpeed`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Controller/StateMachine/State/Helpers/AttackTimingHelper.cs` 104-107 (clip rate = clip ms / cycle ms).
- `AttackTimingHelper.ResolveAttackCycleMs`: same file 73-99 (base cycle, bow draw window).
- `CalcBaseParam.CalculateTimeL2j`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Utils/CalcBaseParam.cs` 8-11 (cycle = max(100, 500000 / speed)).
- `AnimationManager.ApplyLinearMeleePAtkSpeed`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Controller/StateMachine/AnimationSystem/AnimationManager.cs` 665-680 (cycle lookup, rate, write).
- `PlayerStateJAtk` swing rate and hit fraction: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Animation/Player/PlayerStateJAtk.cs` 84-100 and 150-170.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Attack cycle from attack speed: K / speed, with a floor | K = 500000 (CalcBaseParam.cs 10), floor 100 ms (same line) |
| Fallback speed when the stat is missing | 333 (AttackTimingHelper.cs 56, 67) |
| Clip rate = clip length over cycle: the whole clip fits one cycle | rate = clip s x 1000 / cycle ms (106); no constant |
| Hit moment = cycle x fraction | melee 0.5 (line 6), bow 0.82 (line 119) |
| Bow draw window = cycle - flight, clamped | flight from ProjectileFlightTimeCalculator (not read); clamp MAX_ATTACK_TIME (CalcBaseParam.cs 26, value not read) |

Worked example (arithmetic from the formulas, not run): attack speed 333 gives cycle = 500000 / 333 = 1501.5 ms. A 1.0 s swing clip then runs at rate 1.0 x 1000 / 1501.5 = 0.666, and a melee hit at 0.5 x 1501.5 = 750.8 ms, i.e. the clip's event must sit at 0.5 of its own length (0.5 s into the clip) to land on time.

## 4. TypeScript sketch

simplified: keeps the L2-style cycle with its floor, the clip rate that fits one cycle, the clip-time and event-time functions, and the hit-moment rule. It drops the bow flight split and draw window, the stat converter, the fallback speed, the Animator controller and the event wiring, and the donor's older `patkspd` divisor path and monster curve (the sketch does not reproduce the donor's unit mismatch). The hit is computed from the engine's cycle here, not from a clip event, which is the change from the donor.

```ts
// Licence: Apache-2.0 (donor LICENSE, root of the repo). Adapted shape, written from the mechanism.
const L2_CYCLE_NUMERATOR = 500000; // donor: attack cycle ms = 500000 / pAtkSpd, floored at 100 ms
const MIN_CYCLE_MS = 100;

// Full attack cycle in ms for an attack-speed stat.
function attackCycleMs(attackSpeed: number): number {
  return Math.max(MIN_CYCLE_MS, L2_CYCLE_NUMERATOR / Math.max(1, attackSpeed));
}

// Animator speed multiplier that plays the whole swing clip over exactly one cycle.
// Donor: ComputeLinearPAtkSpeed(clipLengthSec, cycleMs) = clipLengthSec * 1000 / max(1, cycleMs).
function clipRate(clipLengthS: number, cycleMs: number): number {
  return (clipLengthS * 1000) / Math.max(1, cycleMs);
}

// Real time (ms after the attack starts) at which a clip event at clipEventS fires.
function eventRealMs(clipEventS: number, clipLengthS: number, cycleMs: number): number {
  return (clipEventS / clipRate(clipLengthS, cycleMs)) * 1000;
}

// Where the clip is at elapsed attack time, in clip seconds, capped at the clip end.
function clipTimeAt(elapsedMs: number, clipLengthS: number, cycleMs: number): number {
  return Math.min(clipLengthS, (elapsedMs / 1000) * clipRate(clipLengthS, cycleMs));
}

// Hit moment in ms: the cycle times the weapon fraction (donor: melee 0.5, bow 0.82).
function hitMomentMs(cycleMs: number, hitFraction: number): number {
  return cycleMs * hitFraction;
}

// A clip whose hit event sits at hitFraction of its own length fires at hitMomentMs.
// This is the rule the sketch checks: the hit lands at the engine's time, not the clip's.
function hitEventRealMs(clipLengthS: number, cycleMs: number, hitFraction: number): number {
  return eventRealMs(clipLengthS * hitFraction, clipLengthS, cycleMs);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/attack-timing.ts` (new, engine): owns the attack cycle (from the attack-speed stat) and the hit moment (fraction per weapon class), so the duel step and the server-verified hit use one number; the client only derives the clip rate from it. Parity-checklist row 6 (hero actor/animation).
- today: the Frankendom swing clip and hit timing were not read in this pass.
- Reuse tag: adapt (Apache-2.0: code may be adapted; the sketch is a rewrite of the mechanism)
- Brief rule served: 1 (one engine; the Pit is a client that draws the engine's timing) and the server-verified kill ruling (the hit time is the engine's, not the clip's)

## 6. Gaps and risks

- The donor fires the hit from the client's AttackShot animation event (NewAttackState.cs 65; AbstractAttackEvents.cs 301). Frankendom's hit must come from the engine's hit moment, with the server verifying it. Reject the client-event hit. The clip event can illustrate the moment, not decide it.
- The donor's own log compares the event time with the server's hit ms (AbstractAttackEvents.cs 293-298), which is the right check. Keep that check as a test (acceptance above), not a log line.
- Two rate paths with different units (BaseAnimationController.cs 104-111 against 113-127) and a monster curve that never reaches the animator and reads its keys on the wrong scale (MonsterStateAtk.cs 47-49, 85-87). Do not copy the older path. One rate function, one unit, tested.
- The constants are an L2 rule (500000 / speed, floor 100 ms). Frankendom's attack-speed stat and cycle should be catalogue data (row 21), not an imported formula, and the numerator and floor are design choices to set in data.
- Bow draw window subtracts a flight time that depends on distance (CalcBaseParam.cs 21-25). Frankendom's ranged rules are not read here; the flight term is not transferred until read.
- Not read: `SwordCollisionService.BeginAttack` and `EmitHitFromAttackShot`, `ProjectileFlightTimeCalculator`, `StatsConverter`, the Animator controller state wiring of `patkspd`, `AnimatorEventAdder.cs`, the clip's own event times.
