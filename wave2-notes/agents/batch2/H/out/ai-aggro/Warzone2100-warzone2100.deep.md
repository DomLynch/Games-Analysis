# Warzone2100-warzone2100 (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/ai.cpp` | Licence: GPL-2.0-or-later (ai.cpp header, line 8 "version 2 of the License, or (at your option) any later version"; root COPYING is GPL v2) | C++ | symbol `targetAttackWeightIfGreaterThan` / `aiBestNearestTarget` / `aiChooseTarget`

Checked: The list's hint file (`data/mp/multiplay/skirmish/bonecrusher/functions.js`) is a scripted skirmish AI and was NOT used; the engine's own target selection is in `src/ai.cpp`. Read in full: `targetAttackWeightIfGreaterThan` (281-563), `aiBestNearestTarget` (576-778), the doomed/expected-damage helpers (781-850), `aiChooseTarget` (876-1025, both the droid and structure branches), `updateAttackTarget` (1105-1139) and `aiUpdateDroid` (1142-1276). Also read: `setProjectileDestination` and the launch site in `projectile.cpp` (144-157, 528-531), `objGuessFutureDamage` (`combat.cpp` 617-657), the throttle macros (`action.h` 108-118) and the game-time step (`gtime.h`/`gtime.cpp` 283-284). Callers: `aiChooseTarget` is called by `aiUpdateDroid` (1265) and `updateAttackTarget` (1110), both with `bUpdateTarget = true`; `aiBestNearestTarget` is also called from `order.cpp` and `action.cpp` (call sites listed by grep, bodies not read), so the "switch only if clearly better" rule is confirmed for the two ai.cpp callers only. Not read: `aiSearchSensorTargets`, `validTarget`, `lineOfFire`, the commander/group code, and the structure targeting beyond its branch in `aiChooseTarget`. Confidence: high.

Best transferable idea: score every candidate with one additive formula (range bonus minus distance, plus missing-health, plus role bonus, then divide for "cannot see", "too close" and "already doomed"), and only switch off the current target when the new score beats the old by a fixed margin.

## 1. Mechanism

- Where it runs: `droidUpdate` calls `aiUpdateDroid` each game update (`droid.cpp` 943). Game time advances in fixed steps: `gameTime += GAME_TICKS_PER_UPDATE` (`gtime.cpp` 283-284), with 10 updates per second and 1000 ticks per second (`gtime.h`), so one step is 100 ms of game time. `deltaGameTime` is 0 on frames with no step (note in `action.h` 114).
- When a unit looks: `aiUpdateDroid` sets `lookForTarget` if the unit is idle, guarding or holding (1161-1166), and clears it if it is already busy while guarding, sulking, has queued orders, has a commander, or the attack-level setting is not "always" (1169-1233). It sets `updateTarget` if it is already attacking or moving to attack (1180-1186). Re-evaluation of an existing target is staggered: a unit calls `updateAttackTarget` for each weapon only when `(id + gameTime) / 1000` changed since the previous step (1236-1243), i.e. once per 1000 ticks (1 s) at a per-unit offset. Looking for a brand-new target is throttled the same way with 200-tick buckets (`action.h` 111-117, `aiUpdateDroid` 1264), i.e. every 200 ms, again offset by unit id so units do not all search on the same step.
- Candidate gathering (`aiBestNearestTarget`): search radius = min(weapon range + extra, sensor range + 6 tiles) (620). It walks every object in that grid radius (622). A friendly neighbour that can be seen and has a target contributes THAT target as a candidate, unless the friend was explicitly ordered to attack it (633-675). An enemy candidate must be visible to this player, not allied, pass `validTarget`, and be inside the radius (677-683); walls are excluded for human players unless armed (721-725). Each candidate is scored by the weight function with the best-so-far passed in; the highest score wins (741-749). If a blocking enemy wall sits between attacker and the winner and the weapon is good against walls, the wall becomes the target (754-770). A failed search stamps `lastCheckNearestTargetFailed` (776).
- The weight (droid targets): `weapon-vs-propulsion modifier + weapon-vs-body-size modifier + 13 x sensorRange/tile - 13 x distance/tile + 130 x damageRatio/100 + typeBonus` (431-436), where `damageRatio = 100 - 100 x body / originalBody` (396). Type bonus: weapon droids 13x4, service (repair/construct) droids 13x5, command droids 13x6, others 0 (401-428, defines at 46-58). Then divisors: unbuilt structure /8 (482-485), EMP rules, not visible /10 (499-502), too close to fire /20 and the distance is treated as maximum range (368-373, 504-507), "doomed" /10 (509-520). Direct-fire weapons are line-of-fire checked only if the score already beats the best, and a blocked line divides by 4 (549-560). The result is floored at 1 (562). A target that the attacker cannot see is a weak candidate but not excluded.
- Doomed target rule (overkill avoidance): every projectile in flight adds its guessed damage to the target's `expectedDamageDirect` or `expectedDamageIndirect` when it is launched (`projectile.cpp` 530-531, 156), moves it if the projectile retargets (151), and drops it on impact or miss (1003, 1027). A droid is "doomed" when expected direct damage exceeds its body points by more than one fifth of its body points, i.e. 120% (785-786). A structure uses one fifteenth (798-799). A doomed target gets its weight divided by 10, except that an attacker whose rate of fire is below 21 per minute gets no target at all (514-518), so slow indirect shooters leave a dying target alone and another unit can take over.
- Stickiness (`aiChooseTarget`, droid branch): it gets the best new target, then re-scores the CURRENT target with the same function (897-903). It switches only if a new target was found and, when updating, either the current weight is <= 0 or the new weight exceeds the current by `OLD_TARGET_THRESHOLD`, 4 tiles of distance weight = 52 points (906-909, define 65). It also requires `validTarget` and `aiDroidHasRange` (910-911).
- Expected damage guess: `objGuessFutureDamage` applies the weapon damage, difficulty, experience-level reduction, armour, a minimum-damage percentage and a floor (`combat.cpp` 617-657).
- Tick: fixed 100 ms game step, per-unit time-bucket staggering as above; also a counter of searches per game time (565-605) exists for profiling (use not read).

## 2. Key functions

- `targetAttackWeightIfGreaterThan`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/ai.cpp` 281-563.
- `aiBestNearestTarget`: same file 576-778.
- `aiObjectIsProbablyDoomed` / `aiDroidIsProbablyDoomed` / `aiObjectAddExpectedDamage`: same file 781-850. Callers of the add/subtract: `projectile.cpp` 151, 156 (inside `setProjectileDestination`), and `gamestate_serialize.cpp` 3131 (restore after load).
- `aiChooseTarget`: same file 876-1025. `updateAttackTarget`: 1105-1139. `aiUpdateDroid`: 1142-1276.
- Throttle: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/action.h` 108-118.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Additive score: range bonus - distance + missing-health + role bonus, then divisors | 13 per tile, health 130, bonuses 52/65/78 (theirs, ai.cpp 46-58) |
| Divide for cannot-see, too-close, not-built | /10, /20, /8 (theirs, 53, 70, 63) |
| Stay on the current target unless the new one beats it by a margin | Margin 52 points (4 tiles x 13, theirs, 65) |
| Doomed = incoming damage exceeds remaining health by a margin; slow shooters drop it entirely | 120% droid, 106.7% structure, ROF threshold 21 per minute, /10 (theirs, 72-73, 786, 799) |
| Staggered re-evaluation by (id + time) bucket | 1000 ticks re-check, 200 ticks new-target check (theirs, action.h 111-112) |
| Friendly units lend their target as a candidate | None |

## 4. TypeScript sketch

simplified: shows the additive score with the visible, too-close and doomed divisors, the "doomed" test, the switch-margin rule, and the staggered re-check. It omits weapon-effect modifier tables, structure targets, EMP, commanders, line of fire, walls, the friendly-target borrowing, and the cheap-first early return. `choose` returns null for "keep the current target". The donor adds a sensor-range term; the sketch reuses the search range for that term. Tuning values are parameters, not the donor's.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Unit {
  id: number;
  x: number; z: number;
  hp: number; maxHp: number;
  incoming: number;            // damage already in flight at this unit
  role: 'fighter' | 'support' | 'other';
  visible: boolean;
}

interface Tuning {
  distWeightPerUnit: number;   // points lost per world unit of distance
  healthWeight: number;        // points gained for 100% missing health
  roleBonus: Record<Unit['role'], number>;
  notVisibleDiv: number;
  tooCloseDiv: number;
  doomedDiv: number;
  doomedOverkillPct: number;   // doomed when incoming > hp * (1 + pct/100)
  switchMargin: number;        // new target must beat current by this many points
}

const isDoomed = (t: Unit, tune: Tuning): boolean =>
  t.incoming > t.hp && t.incoming - t.hp > (t.hp * tune.doomedOverkillPct) / 100;

// Score one candidate. Returns -1 for "never", otherwise at least 1.
function score(me: Unit, t: Unit, rangeBonusUnits: number, tooClose: boolean, canWaitOnDoomed: boolean, tune: Tuning): number {
  const dist = Math.hypot(me.x - t.x, me.z - t.z);
  const damagePct = 100 - (100 * t.hp) / t.maxHp;
  let w = tune.distWeightPerUnit * rangeBonusUnits
        - tune.distWeightPerUnit * dist
        + (tune.healthWeight * damagePct) / 100
        + tune.roleBonus[t.role];
  if (!t.visible) w /= tune.notVisibleDiv;
  if (tooClose) w /= tune.tooCloseDiv;
  if (isDoomed(t, tune)) {
    if (canWaitOnDoomed) return -1;          // slow shooters leave a doomed target alone
    w /= tune.doomedDiv;
  }
  return Math.max(1, Math.floor(w));
}

// Pick the best candidate; keep the current target unless the new one clearly wins.
function choose(me: Unit, current: Unit | null, candidates: Unit[], tune: Tuning,
                range: number): Unit | null {
  let best: Unit | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    if (Math.hypot(me.x - c.x, me.z - c.z) >= range) continue;
    const s = score(me, c, range, false, false, tune);
    if (s >= 0 && (best === null || s > bestScore)) { best = c; bestScore = s; }
  }
  if (best === null) return null;
  const curScore = current ? score(me, current, range, false, false, tune) : -1;
  return curScore <= 0 || bestScore > curScore + tune.switchMargin ? best : null;
}

// Stagger: each unit re-evaluates when its (id + time) crosses a bucket boundary.
const timeToCheck = (id: number, now: number, delta: number, bucket: number): boolean =>
  Math.floor((id + now) / bucket) !== Math.floor((id + now - delta) / bucket);
export { choose, isDoomed, timeToCheck }
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module: target selection and re-target stickiness in the engine). Parity-checklist row 4 (fight loop: aggro, chase, leash); the AI brain itself is row 2.
- today: not checked in this pass.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: many-on-one logic (target selection) lives in the engine; one engine

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism and uses parameters, not the donor numbers.
- The donor picks a target from many candidates for ONE attacker; Frankendom's many-on-one problem is the reverse (one hero, many creatures, MAX_ATTACKERS = 3). The scorer is useful for a creature choosing among hero and allies, but the cap on attackers must be a separate engine rule, not a score.
- The donor deliberately rewards piling on: friendly units lend their target as a candidate, and (via the commander code, bonus WEIGHT_CMD_SAME_TARGET, lines 533-546) a group favours a target already being shot. That is the opposite of MAX_ATTACKERS = 3 and must not be ported.
- "Doomed" needs an in-flight damage ledger (expected damage added at launch, removed at impact/miss/retarget). Frankendom duels resolve in the engine step with no projectile delay for most hits, so this only matters for ranged or delayed specials; it must live in the one ledger and be server-verified.
- The staggered buckets use game time from a fixed 10 Hz step. Frankendom's fight loop is faster; bucket sizes must be zone/catalogue data, not constants.
- The weight tables depend on weapon-vs-armour modifier tables that Frankendom does not have (catalogue fields would be needed, rows 20-21).
- Switching hysteresis is per attacker; with a hate list the hate value would play that role. Do not run both.
