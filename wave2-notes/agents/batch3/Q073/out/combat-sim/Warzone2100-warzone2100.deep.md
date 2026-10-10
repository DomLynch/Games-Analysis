# Warzone2100-warzone2100 (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/combat.cpp` | Licence: GPL-2.0-or-later (per the combat.cpp header: "either version 2 of the License, or (at your option) any later version"; the repo COPYING is GPL v2) | C++ | symbols `combFire`, `objDamage`

Checked: Read in full `combFire` (combat.cpp 84-369), `objArmour` (419-439), `objDamage` (449-608) and `objGuessFutureDamage` (617-658). Read the impact path in `proj_ImpactFunc` (projectile.cpp 1154-1370), `calcDamage` (1694-1717), `droidDamage` (droid.cpp 302-330), `modifyForDifficultyLevel` and the difficulty table (difficulty.cpp 44-93), the hit-chance and armour getters (stats.cpp 1755-1834), `gameRand` (random.cpp 120-150), `getDroidEffectiveLevel` (droid.cpp 2536-2554), `getStructureDamageBaseExperienceLevel` (structure.cpp 426-440). Candidate files opened: combat.cpp, projectile.cpp, droid.cpp, difficulty.cpp, stats.cpp, random.cpp, structure.cpp, plus the constant headers droid.h, weapondef.h, action.h. camera_scope: not applicable (combat cell). Confidence: high for combFire and objDamage; medium-high for the impact path. Not read: the splash/radius code after projectile.cpp 1370; the `objectDamage` wrapper at projectile.cpp 1347 (only its callee dispatch was seen at 1734-1739); `establishTargetShape` (target radius); `weaponFirePause`; `projCalcIndirectVelocities`; `gameTimeAdjustedAverage`; the bodies of the call sites (combFire is called from action.cpp 1004, 1186, 1299, 1425, 1430 and structure.cpp 3264, seen by grep only); `objDamage` callers feature.cpp 165 and structure.cpp 887 (grep only); `GAME_TICKS_PER_SEC` (its value was not located). No crit or knockback found in this path (grep for "critical", "crit_", "knockback" in the cpp files had no combat hits; objDamage has no push).

## 1. Mechanism

- Two phases. Phase A runs at fire time in `combFire`: it decides whether the weapon fires and rolls whether the shot hits. Phase B runs at impact in `proj_ImpactFunc`: a hit applies damage through `calcDamage` into `objDamage`. A miss does not reach `objDamage`.
- Phase A, in order (combat.cpp 84-265). (a) A VTOL with no attack runs left refuses (97-102). (b) Reload and ammo (118-135). (c) Rate of fire: `firePause` from the weapon stats, doubled when `objectBelowHealthLevel(psAttacker, 25)` holds (the function at combat.cpp 57 was not read; the 25 comes from HEAVY_DAMAGE_LEVEL) in single player with the camtweak option (138-144). The earliest fire time is the start of the current tick (115), and not before `lastFired + firePause` (144). (d) The target must be fully visible to the attacker, `visible == UBYTE_MAX` (153). (e) Direct fire needs a line of fire (163). (f) A fixed turret must be aligned (174-181). (g) Range bands: inside `shortRange` and above `min_range` uses the short-range hit chance; otherwise inside `longRange` uses the long-range chance; otherwise refuse (185-226). (h) Experience: the hit chance gains 5% of the base per attacker level and loses 5% of the base per defender level (236-254). (i) A moving droid refuses to fire unless the weapon has `fireOnMove` (256-259).
- After (i) the shot is committed: `lastFired = fireTime`, one ammo spent for reloadable weapons (268-271), `shotsFired++` (274).
- Target lead (277-314): if the target is a droid whose `bumpTime` is 0, its aim point is its position plus `moveDir x speed x flightTime`. Flight time is `dist x TICKS / flightSpeed` for direct fire, or the indirect solution otherwise. If the target was last hit by EMP, the flight time is set to 0 when at least 90% of `EMP_DISABLE_TIME` remains, and otherwise reduced by `empTime`, the remaining disable time (297-307). A ground unit's aim point is snapped to map height (311-313).
- The roll (321): `hit = gameRand(100) <= resultHitChance`. The `gameRand` result is a seeded PRNG value modulo the limit, so it is in [0, 100). A hit keeps the target pointer and aims at the predicted point.
- A miss (328-361): the target pointer is cleared (357), so the projectile has no destination. The aim point is pushed off the target. Distance = `2 x target shape radius` + `worstShot x n^3 / 10^6`, where n = gameRand(100) + 1 (1..100) (347-350). `worstShot` = `(dist x 100 / chance) / 5` when chance > 0, else `2 x dist` (338-342). The direction is the bearing from the predicted point to the attacker, plus a random offset in [-135, +135) degrees (354). So a miss lands on the attacker's side of the target, and most misses land close because n^3 is small for most n.
- Aim point is clipped to the map (364-365) and the projectile is sent with `psTarget` (null on a miss) (367).
- Phase B (projectile.cpp): if `psDest` is null (a miss), only the explosion effects run (1228-1255) and the splash code follows (not read). Otherwise damage = `calcDamage(base, weaponEffect, target)` (1322). `calcDamage` (1694-1717): `base x 100`, plus `base x (propulsion modifier - 100)` and `base x (body-size modifier - 100)` for droids, or the structure strength modifier for structures; then `/100`; at least 1 (1711-1716). The result goes to `objectDamage` (1347; the wrapper itself was not read), which reaches the dispatch at 1734 and its droid case at 1739, a call to `droidDamage` (droid.cpp 302). That calls `objDamage` (droid.cpp 314).
- Grounded VTOL, and transporters in multiplayer, that are not moving take damage x3 (droid.cpp 308-311).
- `objDamage` order (combat.cpp 449-608):
  1. Armour (452; `objArmour` 419-439): a droid uses its body armour for the weapon class (kinetic or thermal); a built structure uses its kinetic or thermal upgrade armour (428); a feature uses kinetic armour.
  2. Record the hit time and weapon subclass, but do not overwrite a live EMP shock unless the new hit is also EMP (458-462).
  3. EMP radius hit (weapon EMP and `empRadiusHit`): no damage, droid shields are zeroed, return 0 (465-477).
  4. Difficulty (480): `modifyForDifficultyLevel(damage, victim != selectedPlayer)`. The argument is named IsPlayer, but for a victim owned by the local player it selects the enemy modifier. See section 3.
  5. Level: a droid uses its effective level, which takes the higher of its own and its commander's (511; droid.cpp 2536-2554); a structure uses the base level, 1 by default (515; structure.cpp 439).
  6. Experience reduction: `damage x (100 - 6 x level) / 100` (519).
  7. Floor: `max(damage - armour, damage x minimumDamage% / 100)` (522).
  8. At least `MIN_WEAPON_DAMAGE` (525).
  9. Damage over time (flag set): only the increase over `periodicalDamage` already dealt counts; the amount is then passed through `gameTimeAdjustedAverage`, which was not read (529-538).
  10. Kill check (550-554): if damage >= body, return a negative fraction (`-65536 x body / originalhp`). This happens before shields are touched, so a lethal blow ignores shields.
  11. Shields (556-600): shield absorbs min(shield, damage). When shields reach 0, the regen-interrupt time is recorded (574-578). Shield particles and a sound play while shield is above 25% of max and the impact is within one tile (580-598).
  12. Body loses the remaining damage (603). Return `65536 x dealt / originalhp` (607).

## 2. Key functions

- `combFire`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/combat.cpp` 84-369. The fire gates, the hit roll, the target lead and the miss scatter.
- `objDamage`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/combat.cpp` 449-608. The whole damage pipeline, steps 1-12 above.
- `objGuessFutureDamage`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/combat.cpp` 617-658. A copy of the level, armour and floor steps used to predict damage (called only from projectile.cpp 530, which stores it as `expectedDamageCaused`; what that field is used for was not read). Its comment at 649 says "at least a third", but the code uses `minimumDamage` percent (650).
- `proj_ImpactFunc`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/projectile.cpp` 1154-1370. Miss branch 1228-1255; hit branch 1257-1354 (calcDamage at 1322, objectDamage at 1347).
- `calcDamage`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/projectile.cpp` 1694-1717.
- `droidDamage`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/droid.cpp` 302-330 (VTOL x3 at 308-311; objDamage call at 314).
- `modifyForDifficultyLevel`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/difficulty.cpp` 82-91; table `setDifficultyLevel` 53-70.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit roll: one uniform draw in [0, 100) compared with a chance; hit if draw <= chance | Chance = weapon stat for the range band (short band `shortHitChance` at 214, long band `hitChance` at 219); values are in the weapon catalogue (not read) |
| Experience moves the chance by a percent of the base, up for attacker and down for defender | 5 percent per level (theirs, droid.h:53) |
| Miss lands off the target, on the attacker's side, at 2 x target radius plus a spread that grows with distance and falls with chance | 2 x radius (348); spread cube n^3/10^6 with n in 1..100 (350); worst shot = dist x 100 / chance / 5 (338); arc +/-135 deg (354) |
| Experience reduces incoming damage by a percent per level | 6 percent per level (theirs, droid.h:52) |
| Armour subtracts flat, but cannot take the hit below a percent floor | Floor = weapon stat `minimumDamage` percent (theirs, applied at combat.cpp 522; the field is documented at statsdef.h:422, values not read) |
| Every hit does at least 1 | `MIN_WEAPON_DAMAGE` 1 (theirs, droid.h:427) |
| Kill check before shields, then shields, then body | No constant; the order is the rule (551 before 556) |
| Doubled fire pause when below 25% body (by constant and call; the check function was not read) | `HEAVY_DAMAGE_LEVEL` 25 (theirs, weapondef.h:31), doubling at 142 (single player and camtweak option only) |
| Stun window after EMP; target lead uses the remaining stun | `EMP_DISABLE_TIME` 10000 (theirs, action.h:44, comment "10 secs"); 90% threshold at 299 |
| Grounded flyer or transporter takes x3 | 3 (theirs, droid.cpp 308-311) |
| Structures count as level 1 by default | 1 (theirs, structure.cpp 439) |
| Difficulty scales damage separately for the two sides | Modifiers (theirs, difficulty.cpp 57-69): super easy 150/70, easy 125/85, normal 100/100, hard 90/110, insane 80/120; the first value applies to damage on enemy-owned victims and the second to damage on the local player's units (the code at 480 selects it that way) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order for the hit chance (base plus attacker level bonus minus defender level bonus) and the damage path (level reduction, armour with a percent floor, minimum 1, kill check before shields, then shields, then body). It omits: the armour lookup by weapon class and by structure or feature, the EMP radius branch and its last-hit rule, the difficulty multiplier, the damage-over-time delta, the VTOL and transporter x3, shield particles and sound, the events, the miss scatter and target lead (section 1 only), and the return of the fraction of original body. It does not set body to 0 on a kill, matching the donor (the caller handles death).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Unit {
  body: number;   // hit points left
  shield: number; // shield points, drained before body
  armour: number; // flat armour for this damage class
  level: number;  // effective experience level (0 = none)
}

export interface Shot {
  raw: number;          // damage after the weapon and target multipliers
  minDamagePct: number; // floor as a percent of the post-level damage
}

// Experience accuracy: attacker level raises the chance, defender level lowers it, both in steps of bonusPct.
export function hitChance(base: number, attackerLevel: number, targetLevel: number, bonusPct = 5): number {
  return base
    + Math.trunc(bonusPct * attackerLevel * base / 100)
    - Math.trunc(bonusPct * targetLevel * base / 100);
}

// rng() returns an integer in [0, 100). A shot hits when the roll is at or below the chance.
export function isHit(chance: number, rng: () => number): boolean {
  return rng() <= chance;
}

// Damage pipeline in the donor's order. A killing blow is decided before shields are touched.
export function applyDamage(u: Unit, shot: Shot, levelReducePct = 6): { dead: boolean; dealt: number } {
  let dmg = Math.trunc(shot.raw * (100 - levelReducePct * u.level) / 100);
  dmg = Math.max(dmg - u.armour, Math.trunc(dmg * shot.minDamagePct / 100));
  dmg = Math.max(dmg, 1);

  if (dmg >= u.body) {
    return { dead: true, dealt: dmg }; // body is left for the caller's death handler, as in the donor
  }
  if (u.shield > 0) {
    const absorbed = Math.min(u.shield, dmg);
    u.shield -= absorbed;
    dmg -= absorbed;
  }
  u.body -= dmg;
  return { dead: false, dealt: dmg };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/q073/wz-damage.ts (with `export {}` appended), exit 0.

## 5. Lands in

- TARGET `src/fight/damage.ts` (engine damage step, one function that every hit goes through). Parity-checklist row 1 (duel step / sim). The hit roll belongs in the same engine step, using the seeded engine RNG, so that the server decides the hit and the kill.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core: one damage function for every hit); rules 7-9 n/a

Best transferable idea: Keep one damage function that applies level reduction, then armour with a percent floor, then a minimum of one, and decide the kill before shields, so every hit goes through one ledger.

Decision (proposed): adapt. The damage order (level reduction, armour with a percent floor, minimum 1, one kill check) is a small pure function that fits one engine and one ledger if it lives in src/fight; we do not take the projectile miss scatter, and we do not copy the shield-before-kill ordering without a test that pins it.
Acceptance: a server test asserts that a raw 40 hit into armour 10 with a 25% floor deals 30, a raw 40 hit into armour 35 deals 10, every hit deals at least 1, and the lethal-blow rule (shields or no shields) is pinned by one test.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Two-stage resolution: the hit roll happens at fire time (combat.cpp 321) and the damage at impact later (projectile.cpp 1322). For melee duels in Frankendom this split does not apply. For ranged shots it creates an in-flight window, and the one ledger must be written at one point. Pick the point (we would pick the server's resolve step).
- Killing blow ignores shields (551 before 556). Frankendom has to pick the order and test it; the donor's order is a choice, not a rule anyone can rely on.
- Duplicated pipeline: `objGuessFutureDamage` (617-658) repeats the level, armour and floor steps for prediction, and its comment (649) does not match its code (650). Frankendom must use one function for both predict and apply, or the two will drift.
- Level reduction is not clamped: `100 - 6 x level` goes negative for a level of 17 or more. In C++ the expression is unsigned because `damage` is unsigned (519), so a negative factor would wrap. Whether such a level is reachable was not checked. Frankendom should clamp in the engine.
- Miss scatter is a visible projectile that lands near the target. In Frankendom a miss is a state (no hit), and the miss point is a client effect only. Reject the spatial scatter for melee and duels; keep the idea only if we add ranged fire later.
- Hit roll is gameRand (seeded PRNG, `syncDebug` on each use, random.cpp). Frankendom's server-verified kills need the seed in server state. Determinism across clients was not checked (not read).
- Units: `flightTime` is computed with GAME_TICKS_PER_SEC (287) and then subtracted by `empTime`, which is built from `gameTime` and `EMP_DISABLE_TIME` (297-305). The value of GAME_TICKS_PER_SEC was not located and the time unit of `gameTime` was not checked, so whether the two are in the same unit was not verified.
- Difficulty: the parameter is named IsPlayer but selects the opposite modifier for the local player's units. Express the difficulty as explicit "damage to player" and "damage to enemy" fields in data, not as a flag.
- Per-weapon numbers (hit chances, minimumDamage) are catalogue values, not zone data. The values were not read.
- Shields are a second damage layer. Reject unless Frankendom needs a shield concept.
