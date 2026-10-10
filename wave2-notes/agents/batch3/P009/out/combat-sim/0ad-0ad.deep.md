# 0ad-0ad (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/helpers/Attack.js` | Licence: GPL-2.0-or-later (binaries/data/ is "GPL version 2 (or later)" per /mnt/frankendom-donors/0ad-0ad/LICENSE.txt line 18) | JavaScript (SpiderMonkey, 0 A.D. simulation scripts) | symbol `HandleAttackEffects`

Checked: Symbol `HandleAttackEffects` is defined at helpers/Attack.js 303 and closes at 347 (read in full). Also read in full: `GetTotalAttackEffects` 164-210, `CauseDamageOverArea` 239-289, `GetAttackBonus` 357-378, `GetPlayersToDamage` 218-224; `Health.TakeDamage` 188-203 and `Health.Reduce` 239-274 (components/Health.js); `DelayedDamage.Hit` 36-93 (components/DelayedDamage.js); the projectile path in components/Attack.js 620-733; `PositionHelper` 49-134 in helpers/Position.js; the effect registry globalscripts/AttackEffects.js 4-47 and simulation/data/attack_effects/damage.json. Not read: `PerformAttack` entry (components/Attack.js about 470-620; only 485-500 read), the `lateness` argument the timer passes to `Hit`, `Health.HandleDeath` and `Health.KilledBy` bodies beyond the call sites, the callers' full bodies in components/StatusEffectsReceiver.js (line 148 seen by grep only) and components/DeathDamage.js (line 44 seen by grep only). Grep found `HandleAttackEffects` callers at DelayedDamage.js 65, 74, 87, StatusEffectsReceiver.js 148, and `CauseDamageOverArea` callers at DelayedDamage.js 45 and DeathDamage.js 44; I did not check other callers of `IID_DelayedDamage.Hit`. Confidence: high on order of steps and numbers in the hit path; medium on the full timing of a projectile hit, because the timer's lateness value was not read.

## 1. Mechanism

Two phases. The fire-time phase (components/Attack.js) decides when and where a hit lands. The resolve-time phase (components/DelayedDamage.js and helpers/Attack.js) applies it.

Fire-time, for a projectile (components/Attack.js 626-725):
- Base delay is `EffectDelay` from the template, default 0 (626).
- The target's velocity is its displacement over the last turn divided by the latest turn length (631, 643). A linear prediction of the time to meet is solved with `PositionHelper.PredictTimeToTarget` (645; Position.js 115-134).
- With probability `max(0, 0.75 - t / 1.333)` (656), the aim uses the unit-motion estimate `EstimateFuturePosition(t)` (663), unless the target is a formation member (661). Otherwise the aim is a straight extrapolation along the target velocity (668, 671).
- A gaussian spread offset is added, scaled by the predicted horizontal distance divided by 100 (677-682).
- The real flight time is the horizontal distance to the impact point divided by projectile speed (687), converted to milliseconds and added to the delay (688).
- The projectile is launched (714). If the delay is non-zero, `Hit` is scheduled on the timer (726-729). Otherwise `Hit(data, 0)` runs at once (731-732).

Resolve-time, `DelayedDamage.Hit` (components/DelayedDamage.js 36-93):
1. If there is a splash spec, `CauseDamageOverArea` runs first (44-55).
2. A mirage target is swapped for its real parent (57-61).
3. With no projectile id, `HandleAttackEffects` runs on the target and returns (63-67).
4. With a projectile, the main target is tested with `TestCollision` at the given lateness. If the test passes and `HandleAttackEffects` returns true, the projectile is removed and the function returns (73-77).
5. Otherwise, entities within `MISSILE_HIT_RADIUS` = 2 of the impact point (81-82) are tested in order. The first one that collides and takes the effects removes the projectile and stops the loop (84-92).

`HandleAttackEffects` (helpers/Attack.js 303-347), in order:
1. If the target is invulnerable, return false (306-307). The projectile then keeps searching in step 5 above.
2. Multiply the bonus multiplier by the attack bonus for the target's classes and civ (309; `GetAttackBonus` 357-378).
3. For each effect receiver in registry order (312), if the attack data has that effect type, call the receiver's method on the target with `GetTotalAttackEffects` as input (321). The damage receiver is `Health.TakeDamage` (simulation/data/attack_effects/damage.json lines 4-5).
4. If no receiver produced a state change, return false (324-325).
5. Post `MT_Attacked` with the health change (327-336).
6. If the effect is not a status effect, award the attacker XP from the target's loot value (342-344).

`GetTotalAttackEffects` (164-210) for Damage: each damage type's value is multiplied by `0.9 ^ resistance points` for that type (172-174) and the results are summed. The sum is then multiplied by the bonus multiplier (184-185). For Capture, the value is scaled by `0.9 ^ resistance` (177) and divided by `0.1 + 0.9 * hp / maxhp` (182), so a damaged target is easier to capture. Status effects roll `blockChance` (199).

`Health.TakeDamage` (components/Health.js 188-203): zero amount or zero hitpoints returns no change (190-191). Otherwise `Reduce` runs (193). XP from the target's loot is proportional to the fraction of max hitpoints lost (195-197). If hitpoints reach 0, `KilledBy` runs (199-200).

`Health.Reduce` (239-274): if the amount is at least the current hitpoints, hitpoints go to 0, the change is registered, `HandleDeath` runs, and the returned change is minus the old hitpoints (255-260). Otherwise the entity is flagged injured if it was not already (263-269), hitpoints drop by the amount (271), and the actual change is returned (273).

`CauseDamageOverArea` (helpers/Attack.js 239-289) for splash: entities within the radius of the origin (241-242) each get a multiplier. Circular shape: `1 - d^2 / r^2` where `d` is the obstruction-corrected distance (252-255). Linear shape: a strip of width `r / 5` along the shot direction (268), with the product of two quadratic falloffs when the entity is ahead of the origin and inside the strip (272-274), otherwise 0 (276). The multiplier is clamped at 0 (284). Then `data.type += ".Splash"` (286), which runs inside the per-entity loop, and `HandleAttackEffects` is called with the multiplier (287). Because the same `data` object is reused across the loop, the type string grows by one `.Splash` each time it is processed for a further entity (the code reads this way; I did not run it).

## 2. Key functions

- `HandleAttackEffects`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/helpers/Attack.js` 303-347. Gate, bonus, receivers, message, XP.
- `GetTotalAttackEffects`: same file, 164-210. Per-type resistance scaling and the capture health factor.
- `CauseDamageOverArea`: same file, 239-289. Splash shapes and falloff.
- `Health.TakeDamage` and `Health.Reduce`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Health.js` 188-203 and 239-274.
- `DelayedDamage.Hit`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/DelayedDamage.js` 36-93. Splash, direct hit, fallback search, projectile removal.
- Projectile fire-time: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Attack.js` 620-733. Lead, spread, flight time, scheduling.
- Interpolation and collision: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/helpers/Position.js` 49-100 (`InterpolatedLocation`, `TestCollision`) and 115-134 (`PredictTimeToTarget`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Each damage type scaled by 0.9 per resistance point, then summed (helpers/Attack.js 172-174) | Base 0.9 (theirs, 174) |
| Bonus multiplier is a product over matching class entries (helpers/Attack.js 374) | Civ filter (371); bonus values come from templates (374, not read further) |
| Capture scaled by hitpoint fraction: divide by `0.1 + 0.9 * hp / maxhp` (182) | 0.1 and 0.9 (theirs, 182) |
| Circular splash: `1 - (d/r)^2`, clamped at 0 (255, 284) | None beyond the shape |
| Linear splash strip width = radius / 5 (268) | The divisor 5 (theirs, 268) |
| Projectile lead: solve the quadratic for meeting time (Position.js 129-131) | None |
| Flight time = distance / speed, added to delay in ms (687-688) | Factor 1000 (theirs, 688) |
| Spread = spread x distance / 100 (678) | Divisor 100 (theirs, 678) |
| Unit-motion prediction chance = `max(0, 0.75 - t / 1.333)` (656) | 0.75 and 1.333 (theirs, 656) |
| Fallback search radius for a missed projectile | 2 (theirs, DelayedDamage.js 15) |
| Health: kill when amount >= hitpoints, return the old hitpoints as the loss (255-260) | Threshold is equality-or-over (mechanism) |
| Projectile delay default | 0 (theirs, components/Attack.js 626) |

## 4. TypeScript sketch

simplified: keeps the donor order for a hit: invulnerable check first, then the resisted damage sum times the bonus, then the health step with kill-at-or-over-hitpoints. Omits the attack-bonus lookup (`GetAttackBonus`), the capture and status-effect receivers, the `MT_Attacked` message, the XP award and loot XP, the injured flag and fogging, the linear splash shape, the mirage redirect, the unit-motion branch and the spread of the projectile aim, the lateness-based footprint test, and the 2 m fallback search. The sketch contains the circular splash falloff and the predicted-time solver as separate functions; they are not wired together. It reorders nothing the donor does on the paths it covers.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Target {
  hp: number;
  invulnerable: boolean;
  resistance: Record<string, number>; // resistance points per damage type (0 = none)
}

interface HitOutcome { healthChange: number; blocked: boolean; killed: boolean; }

// Each damage type is scaled by 0.9 per resistance point, then the types are summed.
function effectiveDamage(raw: Record<string, number>, target: Target): number {
  let total = 0;
  for (const type in raw) total += raw[type] * Math.pow(0.9, target.resistance[type] ?? 0);
  return total;
}

// One hit on one target. Invulnerable targets refuse the hit; the caller decides whether a projectile keeps flying.
function applyHit(target: Target, raw: Record<string, number>, bonus: number): HitOutcome {
  if (target.invulnerable) return { healthChange: 0, blocked: true, killed: false };
  const amount = effectiveDamage(raw, target) * bonus;
  if (!amount || target.hp <= 0) return { healthChange: 0, blocked: false, killed: false };
  if (amount >= target.hp) {
    const lost = target.hp;
    target.hp = 0;
    return { healthChange: -lost, blocked: false, killed: true };
  }
  target.hp -= amount;
  return { healthChange: -amount, blocked: false, killed: false };
}

// Circular splash: quadratic falloff from 1 at the centre to 0 at the radius, clamped at 0.
function circularSplash(distance: number, radius: number): number {
  return Math.max(0, 1 - (distance * distance) / (radius * radius));
}

// Time for a projectile of horizontal speed s to meet a target moving at constant velocity.
// Solves a t^2 + 2 b t + c = 0 with a = |v|^2 - s^2, b = rel.v, c = |rel|^2; false when no meeting.
function predictTimeToTarget(rel: { x: number; z: number }, v: { x: number; z: number }, s: number): number | false {
  const a = v.x * v.x + v.z * v.z - s * s;
  const b = rel.x * v.x + rel.z * v.z;
  const c = rel.x * rel.x + rel.z * rel.z;
  if (c === 0) return 0;
  const disc = b * b - a * c;
  if (a < 0 || (b < 0 && disc >= 0)) return c / (Math.sqrt(disc) - b);
  return false;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/damage.ts` (engine hit step: resistance, bonus, health, kill, splash). Parity-checklist row 1 (duel step / sim). The donor shows the order: invulnerable gate, bonus, resisted sum, health. Frankendom should keep the one health write in this step.
- Projectile aim and flight-time prediction (components/Attack.js 643-688) are a separate idea and are not claimed for this note.
- Best transferable idea: a hit is one pure function (gate, bonus, per-type resistance sum, one health write, kill when the hit reaches hitpoints), and a projectile miss hands off to a fixed-radius nearby search instead of hitting the wrong unit.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the hit step is in the engine, the client only shows it); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor lines are translated.
- Server-verified kills: nothing on the path read checks authority or verifies a kill on a server. `HandleAttackEffects` applies a hit wherever it is called. Frankendom must run this step on the server and must not trust a client report of a kill.
- MAX_ATTACKERS = 3: this path does not cap the number of attackers. Each attack resolves on its own call, and `HandleAttackEffects` does not count attackers. The cap has to sit in the engine before this step.
- One ledger: on the path read, health is written only by `Health.Reduce` (components/Health.js 271). Other health writers (`SetHitpoints`, `Increase`) exist in the file but were not read.
- Randomness: the projectile aim uses `randBool` (components/Attack.js 656) and `randomNormal2D` (680), and the status block roll uses `randBool` (helpers/Attack.js 199). How the RNG is seeded was not read. A server-verified outcome needs one seeded RNG owned by the engine.
- Immune target and the projectile: `HandleAttackEffects` returns false for an invulnerable target, so the projectile goes on to the fallback search (DelayedDamage.js 73-92). Frankendom has to decide whether an immune target lets the hit pass to a neighbour, and test that choice.
- Splash type string: `data.type` is mutated inside the per-entity loop (helpers/Attack.js 286). Do not port that. Frankendom should build a fresh effect object per entity.
- Missile fallback radius 2 (DelayedDamage.js 15) is a fixed constant. In Frankendom it would be zone data, not a constant in the function.
- Timing: the collision test interpolates the target with the timer's `lateness` (Position.js 59). The timer's lateness value is not read, so the exact timing guarantee is not checked.
- The donor's per-turn sim runs at turn-length steps (Position.js 57, components/Attack.js 631). Frankendom's fixed-step server tick is a different scheme. Map to the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (addendum row 18 / post-K item 3), not to this note.
