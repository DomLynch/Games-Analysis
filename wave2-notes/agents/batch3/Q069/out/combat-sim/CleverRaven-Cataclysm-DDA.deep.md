# CleverRaven-Cataclysm-DDA (combat-sim, cell 3)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/creature.cpp` (with `melee.cpp`, `game_constants.h`) | Licence: repository `LICENSE.txt` says "Creative Commons Attribution-ShareAlike 3.0 Unported" (copyleft, clean-room); the `creature.cpp` source has no licence header | C++ | symbol `Creature::select_body_part_projectile_attack`

Checked: read end to end: `creature.cpp` 1026-1036 (`accuracy_projectile_attack`), 1193-1259 (`select_body_part_projectile_attack`, all five tiers), 1396-1440 (start of the projectile hit path that derives `goodhit`); `melee.cpp` 1264-1278 (`Character::dodge_roll`); `game_constants.h` 93-100; `projectile.h` 35 (field only). Read for context only: `character_armor.cpp` 139-300 (armour absorb, not part of this note). Hint: "INFERRED" (no file given); found by grep for dodge, hit roll and damage terms. Not read: the enclosing function header above line 1396; `anatomy::select_body_part_projectile_attack` (`anatomy.cpp` 343); `get_crit_factor`; the `rng_float` definition (assumed uniform on [a, b] from its name and use); where `missed_by` is produced (`ranged.cpp`, grep only); the damage application after line 1440 (only the 1440 flow and 1476 read); the monster weakpoint code beyond lines 1207-1210; the initial value of `damage_mult`. Confidence: high on the tier order and the multiplier formulas; medium on the crit probability reading (depends on the uniform assumption). camera_scope: not a camera cell.

## 1. Mechanism

- A projectile reaches a creature and is resolved in this order (`creature.cpp` 1396-1440):
  (a) Range dodge enchantment: `x_in_y(range_dodge_chance, 1)` avoids the attack outright (1398-1405).
  (b) Dodge is tried only if `!magic`, `speed < 20`, and `can_try_dodge()` succeeds (1407-1408). If so, `goodhit = missed_by + clamp(avoid_roll / diff_roll, 0, 1)` with `avoid_roll = dodge_roll()` and `diff_roll = dice(10, speed)` (1409-1411; 1026-1035). Otherwise `goodhit = missed_by`.
  (c) `dodge_roll()` for a character (`melee.cpp` 1264-1278): an enchantment evasion chance returns a very large value (1267-1271); a HARDTOHIT flag takes the better of two dodge rolls (1273-1276); otherwise `dodge * 5` (1277).
  (d) If `goodhit >= 1.0` the attack is avoided and the function returns (1417-1423).
  (e) Tier selection (`select_body_part_projectile_attack`, 1193-1259). `hit_roll = rng_float(goodhit, 1.0)` (1202). `crit_roll = hit_roll * 0.5 < accuracy_critical` (1204), i.e. `hit_roll < 0.4`.
  (f) For a monster, `fatal_hit = max_damage * crit_multiplier > max HP` (1207), the weakpoint is selected (1208), crit_roll is ANDed with the weakpoint being "good" (1209), and headshot means the weakpoint is a head (1210). For a character, `hit_value = missed_by + rng(-0.5, 0.5)` (1212), or `rng(-0.5, 1.5)` for magic (1216), the body part is chosen from `hit_value` (1220), `crit_mod` comes from the body part (1221), and `fatal_hit` is judged against that part's max HP (1222).
  (g) Magic hits get no damage multiplier at all (1226-1227).
  (h) The tiers are checked in this order, each multiplying `damage_mult`:
     - headshot if `goodhit < 0.1` and (head or fatal) (1228): `(0.6 + 0.45*crit_mod - 0.1*hit_roll) * (std + (cm - std)*crit_mod)`, where `std = sqrt(2*cm)` (1199) and `cm` is the projectile's critical multiplier.
     - critical if `goodhit < 0.2` and (crit_roll or fatal) (1235): `(0.75 + 0.25*crit_mod - 0.25*hit_roll) * (std + (cm - std)*crit_mod)` (1239-1240).
     - good hit if `goodhit < 0.5` (1242): `(1 - 0.5*hit_roll) * std` (1246-1247).
     - standard if `goodhit < 0.8` (1248): `1.5 - hit_roll`, with no `std` factor (1250).
     - graze if `goodhit < 1.0` (1251): `1.05 - hit_roll` (1255).
  (i) The result carries `is_crit` (true for headshot and critical), which is passed on at 1476 as `goodhit < accuracy_critical`.
- Tick: called once per projectile impact, synchronous. Not a per-frame loop.

## 2. Key functions

- `Creature::accuracy_projectile_attack`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/creature.cpp` 1026-1036.
- `Creature::select_body_part_projectile_attack`: same file, 1193-1259.
- Projectile hit path start (goodhit, dodge gates, avoid): same file, 1396-1440. Caller at 1410 and 1433 (read).
- `Character::dodge_roll`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/melee.cpp` 1264-1278.
- Constants: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/game_constants.h` 95-99.

Callers of `accuracy_projectile_attack`: `creature.cpp` 1410 (read); other callers not read. Callers of `select_body_part_projectile_attack`: `creature.cpp` 1433 (read) only.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Quality of a hit on a 0..1 scale (0 = dead centre, 1 = miss) | cut-offs 0.1 headshot, 0.2 critical, 0.5 good, 0.8 standard, 1.0 graze (`game_constants.h` 95-99) |
| Dodge share of the aim error | `avoid_roll / dice(10, speed)`, clamped to 0..1 (1029-1035); speed gate < 20 (1407) |
| Crit roll favours close shots | `hit_roll * 0.5 < 0.2`, i.e. `hit_roll < 0.4` (1204) |
| Headshot multiplier | `0.6 + 0.45*crit_mod - 0.1*hit_roll`, times the crit scale (1232-1233) |
| Critical multiplier | `0.75 + 0.25*crit_mod - 0.25*hit_roll`, times the crit scale (1239-1240) |
| Crit scale | `sqrt(2*cm) + (cm - sqrt(2*cm))*crit_mod` (1199, 1233) |
| Good hit multiplier | `(1 - 0.5*hit_roll) * sqrt(2*cm)` (1246-1247) |
| Standard multiplier | `1.5 - hit_roll` (1250) |
| Graze multiplier | `1.05 - hit_roll` (1255) |
| Crit flag for effects | `goodhit < 0.2` (1476) |

Donor comments, checked against the arithmetic:
- Line 1203 says "40% true when goodhit = 0, 20% true when goodhit = 0.2". At goodhit 0 the arithmetic gives 40% (hit_roll < 0.4 over [0, 1]). At goodhit 0.2 it gives (0.4 - 0.2) / (1 - 0.2) = 25%, not 20%. This assumes `rng_float` is uniform on [goodhit, 1]. The comment is off; the code is the rule.
- Line 1254 says "( 0.05, 0.25 ) when goodhit = 0.8". The arithmetic agrees: hit_roll in [0.8, 1] gives 1.05 - hit_roll in [0.05, 0.25].

## 4. TypeScript sketch

simplified: the sketch keeps the tier ladder, the crit roll, the multipliers and the goodhit formula, in donor order (miss, headshot, critical, good, standard, graze). It omits the range-dodge enchantment, the speed and can-dodge gates, the magic path (no multipliers in the donor), body-part and weakpoint selection (fatal and head are passed in), the monster weakpoint "is good" gate on crit, the damage application and armour, and the messages. It draws one `hit_roll` only; the donor also draws the body-part noise, which is not modelled.

```ts
// Licence: copyleft (CC-BY-SA 3.0 Unported, donor LICENSE.txt). Clean-room sketch of the described shape, not a translation.
// clean-room
export type HitTier = "miss" | "headshot" | "critical" | "good" | "standard" | "graze";

export interface HitResult { tier: HitTier; damageMult: number; isCrit: boolean; }

// Tier cut-offs on the goodhit scale: 0 = dead centre, 1 = miss.
const CUT = { headshot: 0.1, critical: 0.2, good: 0.5, standard: 0.8, graze: 1.0 };

// Goodhit = aim error plus the dodge share. avoidRoll and diffRoll are whole numbers from the attacker and defender.
export function goodhitFor(missedBy: number, avoidRoll: number, diffRoll: number): number {
  const dodgeShare = Math.max(0, Math.min(1, avoidRoll / diffRoll));
  return missedBy + dodgeShare;
}

// Classify one projectile hit. rnd() returns a uniform number in [0, 1).
// Checks run in donor order: miss, headshot, critical, good, standard, graze.
export function classifyHit(
  goodhit: number,
  critMult: number,   // projectile critical multiplier
  fatal: boolean,     // one hit would kill this body part or target
  isHead: boolean,
  critMod: number,    // body-part crit factor (1 for monsters)
  rnd: () => number,
): HitResult {
  if (goodhit >= CUT.graze) return { tier: "miss", damageMult: 0, isCrit: false };

  const stdHit = Math.sqrt(2 * critMult);
  const hitRoll = goodhit + rnd() * (1 - goodhit);   // uniform in [goodhit, 1)
  const critRoll = hitRoll * 0.5 < CUT.critical;     // more likely the closer the shot

  if (goodhit < CUT.headshot && (isHead || fatal)) {
    const m = (0.6 + 0.45 * critMod - 0.1 * hitRoll) * (stdHit + (critMult - stdHit) * critMod);
    return { tier: "headshot", damageMult: m, isCrit: true };
  }
  if (goodhit < CUT.critical && (critRoll || fatal)) {
    const m = (0.75 + 0.25 * critMod - 0.25 * hitRoll) * (stdHit + (critMult - stdHit) * critMod);
    return { tier: "critical", damageMult: m, isCrit: true };
  }
  if (goodhit < CUT.good) {
    return { tier: "good", damageMult: (1 - 0.5 * hitRoll) * stdHit, isCrit: false };
  }
  if (goodhit < CUT.standard) {
    return { tier: "standard", damageMult: 1.5 - hitRoll, isCrit: false };
  }
  return { tier: "graze", damageMult: 1.05 - hitRoll, isCrit: false };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/q069-cdda-tiers.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/damage.ts` (engine damage step; the hit-quality ladder sits in front of the damage roll). Parity-checklist row 1 (duel step / sim).
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0; clean-room shape only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- CC-BY-SA 3.0 is copyleft: clean-room only. The sketch is written from the mechanism.
- The donor's aim error (`missed_by`) is a ranged concept. For Frankendom's timed melee the equivalent is timing error, which is client input. The server must compute it from the received input tick (row 5 intake), never trust a client-sent quality tier. Hit quality is then server-verified like kills.
- Tier rolls use RNG. The server needs a seeded RNG and the roll must go into the fight record (row 19) so a replay gives the same tier.
- The dodge share is a per-shot roll against `dice(10, speed)`. Frankendom's guard and parry (row 3) are separate rolls and should stay separate; do not merge them into goodhit.
- Many-on-one: the ladder takes one attacker and one defender. With MAX_ATTACKERS = 3, each attacker needs its own goodhit; this note does not solve the target-selection side.
- Asymmetry in the donor: the standard tier has no `sqrt(2*cm)` factor while good, critical and headshot do. Frankendom should pick one rule and test it, not copy the asymmetry by accident.
- The crit multiplier is per projectile content (`projectile.h` 35, default 0). In Frankendom it becomes a per-weapon data field, not a constant.
- The donor's comment on the crit probability is off (see section 3). Tests should use the code's arithmetic, not the comment.

Best transferable idea: a single 0..1 hit-quality scale with ascending cut-offs (headshot, critical, good, standard, graze), where each tier has its own multiplier, gives a readable tier ladder for a duel's strike quality.
Decision (proposed): adapt - use the quality ladder for duel strikes, with quality from server-computed timing error and the tier multipliers as data; reject the dodge share and the body-part crit factor for now (they belong to ranged shots and anatomy).
Acceptance: a server test with crit multiplier 2, goodhit 0, a forced roll of 0.1 and no head asserts a critical with multiplier 1.95; goodhit 0.9 asserts a graze with multiplier in (0.05, 0.15]; goodhit 1.0 asserts a miss.
