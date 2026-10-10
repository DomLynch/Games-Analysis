# flareteam-flare-engine (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` | Licence: GPL-3.0-or-later (Entity.cpp line 10: version 3 or any later version; COPYING is the v3 text) | C++ | symbol `Entity::takeHit`

Checked: Read in full: `Entity::takeHit` (src/Entity.cpp 319-540, gates through `takeDamage` call), `EngineSettings::Combat::load` defaults (EngineSettings.cpp 348-368), `resourceRound` (450-462), `StatBlock::applyResistToDamage` (StatBlock.cpp 1644-1657), `StatBlock::takeDamage` (879-900 only), `Math::randBetweenF` and `percentChanceF` (UtilsMath.h 51-65), `HazardManager::logic` collision loop (HazardManager.cpp 47-150). Callers of `takeHit`: two, both in HazardManager.cpp (129, 146), checked by grep over src. Not read: the post-damage section of `takeHit` beyond the grep hits at 550, 589-605 and 611 (after-effects, lifesteal in full, return damage in full), `StatBlock::damageShields`, `HazardManager::hitEntity`, `Hazard::hasEntity`, the Power modifier enums, the caller of `HazardManager::logic`. Confidence high on the resolution order (read end to end); medium on the after-effects. camera_scope: not a camera note.

## 1. Mechanism

- One hit = one call to `Entity::takeHit(Hazard &h)` (319). The hazard collision loop calls it once per hazard per entity inside the hazard's radius, and never twice for the same entity from the same hazard (HazardManager.cpp 125-129, 126 `hasEntity` guard; `Hazard::hasEntity` body not read). Enemies are skipped by enemy hazards (119-121); the hero is hit by non-hero sources (140-146).
- Gates, in order (319-386): target category must match if the power lists categories (321-331); the power filter (334-336); a dead target cannot be hit (339-340); movement type must be allowed (343-348); walls block area hazards (351-352); invincibility requirements (355-357); a non-hero target that is not in combat joins combat (361-363, `join_combat`); beacon powers stop here (366); missiles can reflect with `REFLECT` chance (368-386).
- Accuracy and miss (390-410): accuracy is the hazard's accuracy with its power modifier (390-396); avoidance is the target's `AVOIDANCE` unless the power ignores it (398-401). `true_avoidance = 100 - (accuracy - avoidance)` (403), which is the miss chance. If that is negative (accuracy beat avoidance by more than 100) and the attacker is not perfect-accuracy, an overhit roll with chance `|true_avoidance|` is made (404). The miss chance is then clamped to the configured avoidance range (405) and rolled unless the attacker is perfect-accuracy (407-410).
- Base damage (413-429): for each damage type i, a random value in [min, max] (416), with a power modifier on the base damage index (418-426), then the target's resist for that type (428).
- Armour (431-472, skipped for armour-penetration powers at 432): absorb = random in [ABS_MIN, ABS_MAX] (434). If absorb and damage are both above 0, the absorb is clamped as a percent of the damage: to the block range while the target is blocking (438-443), otherwise to the armour range (445-449). An absorb of 0 becomes 1 (454). `dmg -= absorb` (457). If damage is now 0 or below, it becomes 0, and becomes 1 only when the matching max is below 100 (458-465; this is the only place the floor applies). A block that lands resets the block animation (466-469).
- Crit (474-487): crit chance is the hazard's `crit_chance`, modified by the power (multiply, add or absolute, 475-482), plus `trait_crits_impaired` when stunned or with speed below 100 (484-485). Crit is a percent roll (487).
- Multipliers (488-504): a crit multiplies damage by a random percent in the crit range (490; default 200). Otherwise an overhit multiplies by a random percent in the overhit range (496-499; default 100). Then, separately from crit or overhit, a miss multiplies by a random percent in the miss range (502-504; default 0, so a missed strike deals nothing by default).
- Rounding (506): `resourceRound` (default ROUND, `roundf`, EngineSettings.cpp 452).
- Zero damage (508-523): if the power does not ignore zero damage and the result is 0, a "miss" text is shown and the function returns without applying damage (509-511). Otherwise the combat text type is chosen: take-damage for the hero, crit or overhit text, miss text when missed, give-damage text.
- Apply (526-532): `prev_hp` is saved for steal; `stats.takeDamage(dmg, crit, source)` (532). The rest of the hit (stun removal, power effects, lifesteal from the damage dealt at 550, return damage at 589-590 with a reflect roll at 593, and the death path) runs after this call; see Checked for what was read.
- Tick: the hit happens during the hazard logic step (HazardManager::logic, 47). Hits are instantaneous per collision; there is no timer inside the resolution. The caller of `HazardManager::logic` and the frame rate were not read.
- Randomness: `Math::randBetweenF` is `rand()` scaled to [min, max] (UtilsMath.h 51-54), and `percentChanceF` is `randBetweenF(0, 100) < percent` (63-65). No per-fight seed is visible in the code read.

## 2. Key functions

- `Entity::takeHit`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` 319-540. Gates, accuracy and miss, damage per type with resist, armour, crit, overhit, miss, rounding, zero-damage, apply.
- `StatBlock::applyResistToDamage`: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 1644-1657. Clamps non-negative resist to [min_resist, max_resist]; negative (weakness) is not clamped; result is `damage x (100 - resist) / 100`.
- `StatBlock::takeDamage`: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 879-900 (read only to the death setup). Shields first (880), then hp is clamped at 0 and death handling starts.
- `HazardManager::logic` collision loop: `/mnt/frankendom-donors/flareteam-flare-engine/src/HazardManager.cpp` 106-150. Radius test, once-per-hazard guard, calls to `takeHit`.
- `EngineSettings::Combat::load` and `resourceRound`: `/mnt/frankendom-donors/flareteam-flare-engine/src/EngineSettings.cpp` 348-368 and 450-462. Defaults and rounding.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Miss chance = 100 - (accuracy - avoidance), clamped | Avoidance clamp 0..100 (theirs, EngineSettings.cpp 356-357) |
| Overhit chance = accuracy beyond avoidance by more than 100 (the excess over 100) | Overhit damage 100 percent (theirs, EngineSettings.cpp 362-363) |
| Armour absorb is a random range, clamped to a percent of the hit; an absorb of 0 is raised to 1 (454) | Armour range 0..100 (theirs, EngineSettings.cpp 350-351); block range 0..100 (354-355) |
| Resist is a percent, clamped to a configured range; weakness unclamped | Resist range 0..100 (theirs, EngineSettings.cpp 352-353) |
| Crit = a percent multiplier on the post-armour damage | Crit damage 200 percent (theirs, EngineSettings.cpp 360-361) |
| Miss = a separate percent multiplier, applied after crit or overhit | Miss damage 0 percent (theirs, EngineSettings.cpp 358-359) |
| Final rounding by a configured method | Method ROUND (theirs, EngineSettings.cpp 364; roundf at 452) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: accuracy and the overhit roll (before the clamp), miss roll, per-type damage with resist, armour absorb with the block or armour clamp and the floor rule, then crit or overhit, then miss, then rounding. It omits: the power modifiers on base damage and crit (multiply, add, absolute), the impaired-crit trait, the zero-damage message and combat text, screen shake and rumble, the reflect and return-damage steps, lifesteal, shields (`damageShields`), stun removal, the death path, the hazard radius and once-per-hazard guard, and the category, movement and invincibility gates. Math.round stands in for `roundf`, which agrees for non-negative values. The roll is a uniform number in [0, 1) passed in, not C `rand()`.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface CombatCfg {
  minResist: number; maxResist: number;        // resist clamp, percent
  minAbsorb: number; maxAbsorb: number;        // armour absorb, percent of the hit
  minBlock: number; maxBlock: number;          // absorb while blocking, percent of the hit
  minAvoidance: number; maxAvoidance: number;  // miss chance clamp, percent
  minCrit: number; maxCrit: number;            // crit damage, percent of the hit
  minOverhit: number; maxOverhit: number;      // overhit damage, percent of the hit
  minMiss: number; maxMiss: number;            // miss damage, percent of the hit
}

// Defaults as the donor's Combat::load() sets them in code before any mod file is read.
export const DEFAULT_CFG: CombatCfg = {
  minResist: 0, maxResist: 100, minAbsorb: 0, maxAbsorb: 100, minBlock: 0, maxBlock: 100,
  minAvoidance: 0, maxAvoidance: 100, minCrit: 200, maxCrit: 200, minOverhit: 100, maxOverhit: 100,
  minMiss: 0, maxMiss: 0,
};

export interface Strike {
  parts: { min: number; max: number }[];   // damage by type, before resist
  accuracy: number;                        // percent
  critChance: number;                      // percent
  perfectAccuracy: boolean;
  armourPenetration: boolean;
  ignoreZeroDamage: boolean;
}

export interface Target {
  avoidance: number;                       // percent
  resist: number[];                        // per damage type; negative = weakness
  absMin: number; absMax: number;          // armour range
  blocking: boolean;
}

export interface HitOutcome { damage: number; crit: boolean; missed: boolean; overhit: boolean; }

// roll() returns a uniform number in [0, 1). percentChance(p) is true when roll*100 < p.
function between(roll: () => number, min: number, max: number): number {
  return min === max ? min : min + roll() * (max - min);
}
function percentChance(roll: () => number, pct: number): boolean {
  return roll() * 100 < pct;
}

// Resist: clamp non-negative resist to the configured range; weakness is not clamped. Result is damage * (100 - resist) / 100.
function applyResist(dmg: number, resist: number, c: CombatCfg): number {
  let r = resist;
  if (r >= 0) r = Math.min(Math.max(r, c.minResist), c.maxResist);
  return (dmg * (100 - r)) / 100;
}

export function resolveHit(s: Strike, t: Target, c: CombatCfg, roll: () => number): HitOutcome {
  // Accuracy against avoidance. The overhit roll happens before the clamp, as in the donor.
  let trueAvoid = 100 - (s.accuracy - t.avoidance);
  const overhit = trueAvoid < 0 && !s.perfectAccuracy ? percentChance(roll, Math.abs(trueAvoid)) : false;
  trueAvoid = Math.min(Math.max(trueAvoid, c.minAvoidance), c.maxAvoidance);
  const missed = !s.perfectAccuracy && percentChance(roll, trueAvoid);

  // Base damage, then resist per type.
  let dmg = 0;
  s.parts.forEach((p, i) => {
    dmg += applyResist(between(roll, p.min, p.max), t.resist[i] ?? 0, c);
  });

  // Armour: absorb is clamped to a percent of the hit (block range while blocking); armour penetration skips it.
  if (!s.armourPenetration) {
    let absorb = between(roll, t.absMin, t.absMax);
    if (absorb > 0 && dmg > 0) {
      const pct = (absorb * 100) / dmg;
      const lo = t.blocking ? c.minBlock : c.minAbsorb;
      const hi = t.blocking ? c.maxBlock : c.maxAbsorb;
      if (pct < lo) absorb = (dmg * lo) / 100;
      if (pct > hi) absorb = (dmg * hi) / 100;
      if (absorb === 0) absorb = 1;
    }
    dmg -= absorb;
    if (dmg <= 0) {
      dmg = 0;
      if (!s.ignoreZeroDamage) {
        if (t.blocking && c.maxBlock < 100) dmg = 1;
        else if (!t.blocking && c.maxAbsorb < 100) dmg = 1;
      }
    }
  }

  // Crit beats overhit; a miss multiplies on top, after the crit or overhit step.
  const crit = percentChance(roll, s.critChance);
  if (crit) dmg = (dmg * between(roll, c.minCrit, c.maxCrit)) / 100;
  else if (overhit) dmg = (dmg * between(roll, c.minOverhit, c.maxOverhit)) / 100;
  if (missed) dmg = (dmg * between(roll, c.minMiss, c.maxMiss)) / 100;

  return { damage: Math.round(dmg), crit, missed, overhit };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/flare-hit.ts`; copy kept at `Q068/work/flare-hit.ts`).

## 5. Lands in

- TARGET `src/fight/hit.ts` (new module, the damage step for one strike): accuracy and miss, overhit, resist, armour, crit and rounding, returning the outcome; the caller applies the hp change once. Parity-checklist row 1 (duel step / sim).
- Engine rules (not zone data): the clamps, the armour floor, the rounding method and the default crit, overhit and miss percentages, all read from engine/combat.txt with code defaults.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); server-verified kills (the server resolves the strike; the Pit client shows the result)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Randomness: the donor uses C `rand()` (UtilsMath.h 51-54, 63-65) and no per-fight seed is visible in the code read. Frankendom needs a seeded server roll per strike; the client must not roll.
- One ledger: the donor applies damage through `takeDamage` (532) and the death path runs inside it (`StatBlock::takeDamage`, 879 onward; death and reward handling read only to 900). Frankendom must write hp in one place. The shield step (`damageShields`, 880) was not read.
- Zero-damage floor: the floor to 1 (463-465) is reached only when the armour bump to 1 (454) exceeds the hit, i.e. hits below 1 point. A hit that leaves 0.1 after armour is not floored and rounds to 0 at 506 (`roundf(0.1)` is 0). Frankendom should decide the minimum damage explicitly rather than rely on this path.
- Miss damage default 0 (EngineSettings.cpp 358-359) means a missed strike deals nothing. Frankendom's guard and parry (row 3) already decide misses; this step should not add a second miss rule.
- Overhit: accuracy beyond avoidance by more than 100 gives an overhit chance. With the default 100 percent multiplier (496-499) it changes only the combat-text type (516-517), not the damage. Adopt only if Frankendom wants a visible "overhit" tag, with no damage effect unless the config changes the multiplier.
- Crit is a percent multiplier on the post-armour damage (490), not on the raw hit. Keep that order.
- Multiple damage types: resist is per type and summed (428). Frankendom has one damage type in the duel; keep the per-type array as data only if weapons need it.
- Many-on-one: this is one hazard against one entity. Frankendom's MAX_ATTACKERS = 3 needs the engine to call the step per attacker, in hate-list order (row 4). Not in this donor.
- Power modifiers (multiply, add, absolute) on damage and crit are catalogue data in the donor (418-426, 475-482). They belong in the attack catalogue, not in this function.

## Data fields

- `crit_damage_percent`: 200 (min and max); unit ratio; where engine constant; donor_ref EngineSettings.cpp:360-361.
- `overhit_damage_percent`: 100 (min and max); unit ratio; where engine constant; donor_ref EngineSettings.cpp:362-363.
- `miss_damage_percent`: 0 (min and max); unit ratio; where engine constant; donor_ref EngineSettings.cpp:358-359.
- `armour_absorb_percent_clamp`: 0..100 (absorb and block); unit ratio; where engine constant; donor_ref EngineSettings.cpp:350-351, 354-355.
- `avoidance_percent_clamp`: 0..100; unit ratio; where engine constant; donor_ref EngineSettings.cpp:356-357.
- `resist_percent_clamp`: 0..100; unit ratio; where engine constant; donor_ref EngineSettings.cpp:352-353.
- `resource_round_method`: ROUND; unit none; where engine constant; donor_ref EngineSettings.cpp:364.
- `crit_chance_percent`: per attack (power field, not read as a number); unit ratio; where engine constant (the rule); donor_ref Entity.cpp:487.

Best transferable idea: Resolve one hit as: accuracy against avoidance with a clamped miss chance, per-type resist, a percent-clamped armour absorb, then one crit or overhit multiplier and a rounding step, and apply the hp change in one place.
Decision (proposed): adapt - The clamps and the crit-as-percent-of-post-armour step fit duel step row 1 and give designers clear data fields, but the donor's rand() rolls, its default-zero miss damage and its shields and death path inside takeDamage do not fit server-verified kills with one ledger.
Acceptance: A server test asserts that armour never removes more than its configured max percent of a hit (except the 1-point minimum), that a crit on a post-armour 10-point hit deals 20, and that the same seed gives the same damage on server and client.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one combat core, two clients); server-verified kills
