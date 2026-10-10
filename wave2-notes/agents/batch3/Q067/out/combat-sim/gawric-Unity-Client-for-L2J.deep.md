# gawric-Unity-Client-for-L2J (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Controller/StateMachine/State/Helpers/AttackTimingHelper.cs` | Licence: Apache-2.0 (repo root `LICENSE`, Apache License 2.0 text; no per-file licence header in the files read) | C# (Unity) | symbol `ResolveAttackCycleMs` (hit path: `SwordCollisionService.EmitHitFromAttackShot`)

Checked: The hint file (`L2WeaponPrefabBuilder.cs`) is an editor prefab tool and is not the mechanism. Damage, crit, miss and knockback are NOT computed in this client: the server sends the numbers and `Formulas.calc` is a stub that returns 0 (`Database/Formulas.cs` 78-83). What IS real and read is the melee swing timing and the once-per-swing hit latch: `AttackTimingHelper.cs` 1-128, `CalcBaseParam.cs` 1-34, `SwordCollisionManager.cs` 1-30, 55-127, 128-200, 236-262, 291-300; `PlayerStateJAtk.cs` 60-135, 160-200, 236-250, 412-422; `NewAttackState.cs` 1-92; `AbstractAttackEvents.cs` 270-330 (method header at 244 from grep); `WorldCombat.cs` 1-199; `NewAttackIntention.cs`; `Status.cs`; `Hit.cs` 1-40; `AttackDto.cs` 1-60; `Formulas.cs` 1-84; `AnimationManager.cs` 665-695; `World.cs` 624-633. Not read: `SwordCollisionManager.cs` 31-54, 201-235, 263-290, 301-344; `PlayerStateJAtk.cs` 1-59, 136-159, 201-235, 251-431; `ProjectileFlightTimeCalculator.cs`; `HitManager.cs`; the server (not in this repo). Confidence: high on the timing path; the cell topic (damage resolution) is thin here, so depth is thin. Camera: not applicable.

## 1. Mechanism

- Damage numbers come from the server. `AttackDto.ReadFrom` reads the damage and a flag byte per hit (crit, miss, shield, soulshot). `Hit.cs` 7-10 define the flag bits. The client does not add, subtract or scale them.
- Swing cycle: `CalcBaseParam.CalculateTimeL2j` returns max(100, 500000 / attackSpeed) ms (`CalcBaseParam.cs` 10). The attack speed comes from `ResolvePAtkSpd`: a null entity or null stats gives 333 (`AttackTimingHelper.cs` 55-56); otherwise it takes BasePAtkSpeed for a player if above 1, then PAtkSpd if above 1, then BasePAtkSpeed if above 1, else 333 (lines 58-67).
- Bow only, and only when the target distance is known (above 0.01): the cycle has the arrow flight time subtracted and clamped to 0-1000 ms (`ResolveAttackCycleMs` 84-98 and `CalcBaseParam.cs` 21-26). Not traced further (flight time not read).
- Animation pacing: `ComputeLinearPAtkSpeed` returns clip seconds x 1000 / cycle ms (`AttackTimingHelper.cs` 106). `PlayerStateJAtk.cs` 72 applies it at swing enter through `AnimationManager.ApplyLinearMeleePAtkSpeed` (`AnimationManager.cs` 665-685, read). So the whole swing clip plays across one server cycle.
- Melee hit trigger (order of operations): when the attack packet arrives (READY_TO_ACT), `NewAttackState` calls `SwordCollisionService.BeginAttack` (`NewAttackState.cs` 57), which stores an attack context with a new epoch = previous + 1 (`SwordCollisionManager.cs` 67). The swing's `AttackShot` animation event calls `CallBackAttackShot` (`AbstractAttackEvents.cs` 244), which calls `EmitHitFromAttackShot` (301). The first call per attacker is latched: if `AttackShotFired` is already true the call is skipped with "already fired" (154-160), otherwise it is set (162) and the hit is emitted. If no context exists the hit still emits (173-177).
- Swing end: `PlayerStateJAtk` ends the swing when elapsed wall time reaches `_endTime`, the full cycle in seconds (`PlayerStateJAtk.cs` 66, 170-177). It then calls `EndAttack(entityId, _attackEpoch)` (246). `EndAttack` skips the removal when the stored epoch differs from the live one, for a non-zero epoch (`SwordCollisionManager.cs` 117-122).
- Dead path, disabled: a wall-clock melee hit at cycle x hit fraction, fired from `LateUpdate`, is commented out (`SwordCollisionManager.cs` 246-263). The hit fraction is 0.5 for melee (`AttackTimingHelper.cs` 6, 113-122) and 0.82 for bow (119). In the lines read, `hitAtMs` is used only in log lines (`PlayerStateJAtk.cs` 95, 122, 133), and the context field `HitFraction` is written at line 78 and never read again (grep of the file).
- Tick: none. The hit is driven by a Unity animation event; the swing end uses `Time.time`, so it is variable-step wall-clock.
- Damage application, for context: `NewAttackIntention` sets only a preview (`SetDamage`: remaining = hp - damage, `Status.cs` 35). HP is reduced by `Entity.ApplyDamage` (`Entity.cs` declared at 171, HP write at 177), reached through `WorldCombat.InflictAttack` only when `World.InflictDamageTo` finds a null sender (`World.cs` 626-630; the visible-sender branch is commented out at 627). Which packet lowers HP for a visible attacker was not traced (not read).

## 2. Key functions

- `AttackTimingHelper.ResolveAttackCycleMs` (`/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Controller/StateMachine/State/Helpers/AttackTimingHelper.cs` 73-99): base cycle from attack speed; bow adds flight-time subtraction. Callers seen by grep: `PlayerStateJAtk.cs` 419, `PlayerStateJatkBow.cs` 34, `PlayerStateSpAtkBow.cs` 37, `PlayerStateSpAtk.cs` 136, `EntityActionVisual.cs` 289 and 341, `AnimationManager.cs` 676. Only the caller lines in that grep were read.
- `CalcBaseParam.CalculateTimeL2j` (`/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Utils/CalcBaseParam.cs` 8-11): the cycle floor and constant.
- `SwordCollisionService.BeginAttack` / `EmitHitFromAttackShot` / `EndAttack` (`/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/SwordCollision/SwordCollisionManager.cs` 58-92, 133-188, 113-126): context, one-hit latch, stale-epoch guard.
- `PlayerStateJAtk` swing enter (`.../Animation/Player/PlayerStateJAtk.cs` 60-135) and exit (236-250): applies the rate, reads the AttackShot event time, ends the swing at the cycle.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cycle = max(floor, K / speed) | K = 500000, floor = 100 ms (theirs, `CalcBaseParam.cs` 10) |
| Fallback speed when stats are missing | 333 (theirs, `AttackTimingHelper.cs` 55-56, 67) |
| Clip rate = clip length / cycle | None (mechanism) |
| One hit per swing, from the swing's own event | None (mechanism); `AttackShotFired` latch (`SwordCollisionManager.cs` 154, 162) |
| Stale-swing guard by epoch | None (mechanism); `EndAttack` guard (117) |
| Melee hit fraction | 0.5 (theirs, `AttackTimingHelper.cs` 6); used in logs only in lines read |
| Bow hit fraction | 0.82 (theirs, `AttackTimingHelper.cs` 119); used in logs only in lines read |
| Bow flight clamp | 0 to 1000 ms (theirs, `CalcBaseParam.cs` 6, 26) |
| Fallbacks when BeginAttack gets no duration or fraction | 1000 ms and 0.88 (theirs, `SwordCollisionManager.cs` 11-12, 62-63) |

## 4. TypeScript sketch

simplified: the sketch keeps the cycle formula (with the 100 ms floor), the clip-rate formula, the one-hit latch and the epoch check. It omits: the NO_CONTEXT path (the donor still emits a hit when no live swing exists; the sketch returns null), the animation clip lookup and the AttackShot event time, the bow flight subtraction, the sword and hit registries, the disabled wall-clock fallback, the 333 default, and the hit fraction (the donor uses it only for logs). The stale-epoch guard keeps the donor's rule that epoch 0 is a wildcard (`epoch > 0 &&`, `SwordCollisionManager.cs` 117). It runs on wall-clock ms; Frankendom must count server ticks instead.

```ts
// Licence: Apache-2.0 (donor repo LICENSE). Clean-room sketch of the mechanism; not a translation.

const MIN_CYCLE_MS = 100;          // floor on one swing's full cycle
const CYCLE_CONSTANT = 500000;     // cycle ms = 500000 / attack speed

// Full swing cycle in ms from attack speed (higher speed = shorter swing).
function swingCycleMs(attackSpeed: number): number {
  return Math.max(MIN_CYCLE_MS, CYCLE_CONSTANT / attackSpeed);
}

// Playback rate so the whole swing clip fills the cycle exactly once.
function clipPlaybackRate(clipSec: number, cycleMs: number): number {
  return (clipSec * 1000) / Math.max(1, cycleMs);
}

interface LiveSwing {
  epoch: number;
  hitFired: boolean;
}

// One live swing per attacker. The hit fires from a frame event, at most once per swing.
class SwingBook {
  private live = new Map<number, LiveSwing>();

  begin(attackerId: number): number {
    const prev = this.live.get(attackerId);
    const epoch = prev === undefined ? 1 : prev.epoch + 1;
    this.live.set(attackerId, { epoch, hitFired: false });
    return epoch;
  }

  // Called from the hit frame of the swing clip. Returns the epoch that owns the hit, or null.
  onHitFrame(attackerId: number): number | null {
    const s = this.live.get(attackerId);
    if (s === undefined || s.hitFired) return null;
    s.hitFired = true;
    return s.epoch;
  }

  // An older swing cannot clear a newer one. Epoch 0 is a wildcard (clears whatever is live), as in the donor.
  end(attackerId: number, epoch = 0): void {
    const s = this.live.get(attackerId);
    if (s === undefined) return;
    if (epoch > 0 && s.epoch !== epoch) return;
    this.live.delete(attackerId);
  }
}

const cyc = swingCycleMs(333);            // about 1501.5 ms at speed 333
const rate = clipPlaybackRate(0.9, cyc);  // clip of 0.9 s plays slower to fill the cycle
const book = new SwingBook();
const e1 = book.begin(7);
const hit1 = book.onHitFrame(7);          // e1
const hit2 = book.onHitFrame(7);          // null: already fired this swing
book.end(7, e1 + 1);                      // non-zero epoch that is not the live one: no effect
export { cyc, rate, hit1, hit2 };
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (duel step: swing cycle from attack speed, one hit per swing, stale swing dropped). Parity-checklist row 1 (duel step / sim). The tick side of the hit (hit lands on a server tick, not an animation event) sits under row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget", and is not taken from this donor.
- Reuse tag: adapt-from-idea (Apache-2.0: code may be adapted; the sketch is clean-room anyway)
- Brief rule served: 1 (one combat core, two clients)

## 6. Gaps and risks

- The donor is a client. It does not compute damage, crit, miss or knockback; the server does and is not in this repo. This donor cannot inform the damage formula, only the swing timing and the hit latch.
- The donor's hit waits for an animation event. Frankendom's hit must land on a server tick (fixed step). Ticks, not the clip, decide when the hit lands; the clip is cosmetic.
- Frankendom rule (server-verified kills, one ledger): the donor still emits a hit when no live swing exists (`SwordCollisionManager.cs` 173-177). Frankendom must reject a hit with no live swing.
- `EndAttack` ignores the epoch when it is 0 (line 117 guards `epoch > 0`). Frankendom should always pass the swing epoch.
- Attack speed of 333 is a silent default (`AttackTimingHelper.cs` 55-56, 67). Frankendom should fail loudly on a missing stat, not default.
- If a swing clip has no `AttackShot` event, the donor shows no hit: `attackShotSec` defaults to -1 (`PlayerStateJAtk.cs` 97-104) and the wall-clock fallback is commented out (`SwordCollisionManager.cs` 246-263). I did not read the rest of `PlayerStateJAtk.cs` to confirm there is no other hit path.
- The visible-attacker HP path is not traced (`World.cs` 627 commented out). Frankendom's server-verified kills cannot be checked against this client.
- Cycle constants (500000, 100 ms floor, 333 default, 0.5 and 0.82 fractions) are L2 data. For Frankendom, the shape is an engine rule; the attack-speed value per weapon or hero is data.

Best transferable idea: a swing's one hit is latched per swing and tied to the swing's epoch, so a stale or repeated hit cannot land, with the swing length derived from attack speed.
Decision (proposed): adapt - the once-per-swing latch and epoch guard fit the duel step, but the hit must land on a server tick, not an animation event, and the cycle must be counted in ticks.
Acceptance: a server test at attack speed 333 shows a swing cycle of about 1501.5 ms (about 90 ticks at 60 ticks/s, to be confirmed with the real tick rate); a second hit in the same swing deals no damage; a hit arriving after the swing has ended is dropped.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) TS demo `book.end(7, e1-1)` is labelled 'stale epoch: no effect' but e1-1 = 0, and epoch 0 is the wildcard in the donor (SwordCollisionManager.cs:117 `epoch > 0 &&`), so the donor would REMOVE the context; sketch and donor diverge on this exact example. (2) Hit.cs flag bits are lines 7-10 (USESS 0x10 at 7), note says 8-10. (3) Entity.cs ApplyDamage is declared at 171, HP write at 177; note cites 177 as ApplyDamage. All numbers (500000, floor 100, 333, 0.5, 0.82, 1000, 0.88, 0-1000 clamp) and line ranges otherwise verified.

**Missed:** Nothing important; the donor's per-swing hit only comes from the AttackShot animation event (confirmed), `UpdateAttackProgress` is dead state.
