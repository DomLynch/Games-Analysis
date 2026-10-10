# ACEmulator-ACE (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/DamageEvent.cs` | Licence: AGPL-3.0 (LICENSE file: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3") | C# | symbol `DamageEvent.DoCalculateDamage`

Checked: Read in full: `DamageEvent.cs` 149-370 (CalculateDamage and DoCalculateDamage), 372-398 (GetQuadrant, GetEvadeChance), 403-450 (both GetBaseDamage overloads); `SkillCheck.cs` 1-24; `SkillFormula.cs` 1-39; `Creature_Rating.cs` 8-60 and 172-200; `Creature_BodyPart.cs` 25-60; `Creature_Combat.cs` 464-500 and 680-719; `Monster_Combat.cs` 375-398; `Player_Combat.cs` 464-500. Not read: `UpdateVitalDelta`, `GetWeaponCriticalChance`, `GetWeaponCritDamageMod`, `GetOverpower` body (1201-1209), the monster-side call that feeds `TakeDamage` from a DamageEvent, `OnDeath`/`Die`, `GetShieldMod` header (around 670-680). Callers of `CalculateDamage` were found by grep (three sites: `Monster_Melee.cs` 99, `Player_Combat.cs` 134, `ProjectileCollisionHelper.cs` 52); I saw those lines only in grep output, and did not open the surrounding caller code. Confidence: high on the order of the pipeline and the formulas; medium on the monster TakeDamage path, which I did not follow from the caller. Scope: the whole pipeline is shared by players and monsters, so this is not a camera cell. Camera scope: not applicable.

Best transferable idea: Use one armour curve K/(AL+K) and one additive combiner for damage multipliers (sum as ratings, convert back) so stacked buffs cannot multiply past what a designer tuned.
Decision (proposed): adapt - the armour curve and additive combine give a diminishing, auditable stack that fits one damage step in src/fight; the 20-factor product and the per-hit cloak and lifestone branches do not fit, so take the shape only.
Acceptance: A server test asserts that a 100-damage hit against armour level 66.67 deals 50 health, and that two +50 damage-rating buffs give x2.0 (not x2.25).

## 1. Mechanism

- One entry point builds every physical or missile hit. `CalculateDamage` (149-162) runs `DoCalculateDamage` and then logs. The result is a `DamageEvent` that holds the damage number and the flags (evaded, crit, lifestone, overpower).
- Order of steps, as the code runs:
  (a) Gates first: a player defender under lifestone protection returns 0 and triggers the protection handler (184-189). An invincible defender returns 0 (191-192).
  (b) Overpower: if the attacker has an overpower flag, `GetOverpower` decides it (195-196); an overpower hit skips the evade roll (199). (`GetOverpower` body not read.)
  (c) Evade: `GetEvadeChance` (386-398) returns `1 - SkillCheck.GetSkillChance(attackSkill, defenceSkill)`. The hit is evaded if that chance beats a random number (201-206). The evade chance is a logistic in the skill gap, so equal skills give 50 percent.
  (d) Base roll: for a monster attacker, the attack part is picked from the motion and a random integer in [min, max) is drawn (437-447). For a player attacker, the player overload (403-432) sets the damage type and mods, and the roll is again a random integer between the min and max (431). The min and max come from `GetBaseDamageMod` (not read).
  (e) Ratings and mods: attribute, power and slayer mods (227-229). The damage rating, recklessness, sneak attack and heritage are converted to multipliers and combined with `AdditiveCombine` (232-237). Player-vs-player adds a PK damage rating (239-243).
  (f) Pre-mitigation damage = base x attribute x power x slayer x rating mod (246).
  (g) Critical: the crit roll is a second random draw against crit chance (259). A defending player with the critical-defence augment can cancel it (261-268). A logging-out or PK-logging-out player defender gets CriticalChance = 1 (256-257); the donor's comment at 252-254 says this is for physical attacks. On a crit, recklessness is set to 1 (281), the damage rating is recombined with the crit damage rating (282), and pre-mitigation damage uses the weapon's maximum damage instead of the roll, times the crit multiplier (276, 287).
  (h) Armour: armour-rending and cleaving reduce the ignore factor (292-298). Players: body part by attack height, armour layers, armour mod (301-310). Creatures: quadrant from relative direction, body part, creature armour (315-325). Ignore-all-armour sets the armour mod to 1 (328-329).
  (i) Resistance: weapon resistance mod (332), then the defender's resistance mod for the damage type (336 or 340-341).
  (j) Damage resistance rating: the defender's DRR mod (345); on a crit, combined with the crit DRR (349-351); PK DRR for player-vs-player (354-358).
  (k) Shield: the defender's shield mod (362). The shield's effective level is its SL times its RL, with RL clamped to [-2, 2] (691, 697; where SL comes from, 670-680, not read). That level is capped at the shield skill, halved unless the skill is specialised (703-708), multiplied by an ignore-shield factor (710-713), then passed to `CalcArmorMod` (716).
  (l) Final: `Damage = before x ArmorMod x ShieldMod x ResistanceMod x DamageResistanceRatingMod` (365). Mitigated amount = before - Damage (367).
- Health step: a monster target's `TakeDamage` rounds the amount to whole points (377), applies it through `UpdateVitalDelta` (378, body not read), records damage history (383-389), and calls `OnDeath` then `Die` when `Health.Current <= 0` (391-396). A player's `TakeDamage` returns 0 when invincible or dead (474), handles lifestone protection (480-484), then the rest (not read past 500).
- Tick: not a loop. One call per hit, synchronous, from the melee motion (`Monster_Melee.cs` 99), the player attack (`Player_Combat.cs` 134) or a projectile hit (`ProjectileCollisionHelper.cs` 52). The three call sites were seen in grep output only; their bodies were not read.

## 2. Key functions

- `DamageEvent.CalculateDamage`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/DamageEvent.cs` 149-162. Wraps `DoCalculateDamage`, then logs.
- `DamageEvent.DoCalculateDamage`: same file, 164-370. The whole pipeline in order (a)-(l) above.
- `DamageEvent.GetEvadeChance`: same file, 386-398. Logistic skill chance, then `1 -`.
- `SkillCheck.GetSkillChance`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/SkillCheck.cs` 7-12. Logistic on (skill - difficulty), factor 0.03, clamped to [0, 1].
- `SkillFormula.CalcArmorMod`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/SkillFormula.cs` 29-37. Armour level to damage multiplier: K/(AL+K) above zero, 1 - AL/K below zero.
- `Creature.AdditiveCombine`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Creature_Rating.cs` 192-200. Converts each multiplier to a rating (`ModToRating`, 172-178), sums, converts back (`GetRatingMod`, 15-23).
- `Creature.GetArmorMod` / `GetEffectiveArmorVsType`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Creature_BodyPart.cs` 29-59. Effective armour = base armour x armour-vs-type + enchantment + layers, times rending if above zero, then `CalcArmorMod`.
- `Creature.GetEffectiveDefenseSkill`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Creature_Combat.cs` 481-500.
- `Monster.TakeDamage` (float overload): `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Monster_Combat.cs` 375-398.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Armour soaks as K/(AL+K): diminishing returns, half damage at AL = K | K = 200/3 (theirs, SkillFormula.cs 16) |
| Evade = 1 - logistic(attack - defence); equal skills give 0.5 | factor 0.03 (theirs, SkillCheck.cs 7, 9) |
| Rating r gives (100+r)/100 above zero, 100/(100-r) below; sum ratings then convert back | rating scale 100 (theirs, Creature_Rating.cs 34, 59) |
| Crit: swap recklessness for crit rating; crit uses the max roll, not the random one | Uses MaxDamage (theirs, DamageEvent.cs 287); recklessness set to 1 (theirs, 281) |
| Critical defence chance = augment level x factor, factor set by the attacker type | 0.25 when the attacker is not a player, 0.05 when it is (theirs, DamageEvent.cs 263) |
| Logging-out player: physical hits auto-crit | Rule, no number (theirs, DamageEvent.cs 256-257) |
| Round at the health step only, then death at <= 0 | Round to whole points (theirs, Monster_Combat.cs 377); death threshold 0 (theirs, 391) |

Worked numbers (computed from the formulas above, not from running the code): a 100-damage hit against AL = 66.67 deals 50 after armour; a 33-point skill gap moves evade chance between 0.27 (attacker ahead by 33) and 0.73 (defender ahead by 33), with 0.50 at equal skill; two +50 damage ratings stack to x2.0 with `AdditiveCombine` (1.5 x 1.5 would give 2.25).

## 4. TypeScript sketch

simplified: the sketch rolls the crit before the base damage roll. The donor rolls the base first (DamageEvent.cs 447) and, on a crit, replaces it with the max (287). It omits the overpower bypass, the critical-defence augment, the logging-out auto-crit, PK mods, armour rending and cleaving, body part and quadrant selection, armour layers, the crit DRR combine, and the resistance and shield steps (both passed in as numbers). The base roll is continuous, where the donor uses an integer random. The monster and player health paths are reduced to the one rounding and death check.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
const ARMOUR_K = 200 / 3;      // armour curve constant (engine constant)
const SKILL_FACTOR = 0.03;     // logistic steepness for attack-vs-defence checks (engine constant)

// Chance that attack beats defence: a logistic on (attack - defence).
function skillChance(skill: number, difficulty: number): number {
  const c = 1 - 1 / (1 + Math.exp(SKILL_FACTOR * (skill - difficulty)));
  return Math.min(1, Math.max(0, c));
}

// Rating r to multiplier: positive r gives (100+r)/100; negative r gives 100/(100-r).
function ratingMod(r: number): number {
  if (r === 0) return 1;
  return r > 0 ? (100 + r) / 100 : 100 / (100 - r);
}
// Multiplier back to a rating, so several multipliers can be summed as ratings.
function modToRating(m: number): number {
  return m >= 1 ? Math.round(m * 100 - 100) : Math.round(-100 / m + 100);
}
function additiveCombine(...mods: number[]): number {
  return ratingMod(mods.reduce((sum, m) => sum + modToRating(m), 0));
}

// Armour level to damage-taken multiplier: diminishing returns above zero, linear penalty below.
function armourMod(al: number): number {
  if (al > 0) return ARMOUR_K / (al + ARMOUR_K);
  if (al < 0) return 1 - al / ARMOUR_K;
  return 1;
}

interface Hit {
  minDmg: number; maxDmg: number;
  attackSkill: number; defenseSkill: number;
  preMod: number;                 // attribute x power x slayer, as one product
  attackerDamageRating: number;   // rating, converted with ratingMod
  recklessness: number; critDamageRating: number; sneak: number; heritage: number; // multipliers
  critChance: number; critMult: number;
  armourLevel: number; defenderDamageResistRating: number; shieldMod: number; resistMod: number;
}

// One hit, in the donor's order: evade roll, then base roll, crit, rating mods, armour, shield, resist.
function resolveHit(h: Hit, rand: () => number): { evaded: boolean; damage: number } {
  if (1 - skillChance(h.attackSkill, h.defenseSkill) > rand()) return { evaded: true, damage: 0 };

  const crit = h.critChance > rand();
  const base = crit ? h.maxDmg : h.minDmg + (h.maxDmg - h.minDmg) * rand();
  // A crit swaps recklessness for the crit damage rating; the crit multiplier applies to the whole hit.
  const ratingMul = crit
    ? additiveCombine(ratingMod(h.attackerDamageRating), h.critDamageRating, h.sneak, h.heritage)
    : additiveCombine(ratingMod(h.attackerDamageRating), h.recklessness, h.sneak, h.heritage);
  const before = base * h.preMod * (crit ? h.critMult : 1) * ratingMul;

  const taken = ratingMod(-h.defenderDamageResistRating);
  const damage = before * armourMod(h.armourLevel) * h.shieldMod * h.resistMod * taken;
  return { evaded: false, damage };
}

// Health step: round the mitigated damage, subtract it, and report death at zero or below.
function applyToHealth(health: number, damage: number): { health: number; dead: boolean } {
  const next = health - Math.round(damage);
  return { health: next, dead: next <= 0 };
}
```

Typecheck: the sketch file with `export {};` appended was run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `src/fight/damage.ts` (engine damage step, one place health changes). Parity-checklist row 1 (duel step / sim).
- Shape to take: the armour curve K/(AL+K) and the additive combine of multipliers. Not the 20-factor product.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- AGPL-3.0: clean-room, shape only. The sketch is written from the mechanism. Any copy of the donor's lines would bring the AGPL network clause into a server Frankendom runs.
- Rulings: one engine. The donor splits the work across `DamageEvent` (calculation) and two `TakeDamage` overloads (player and monster), with separate lifestone, cloak and invincibility branches. Frankendom needs one `applyHit` in `src/fight`, with the Pit and zones as clients.
- Server-verified kills: the donor's random rolls run in the server code (it is an emulator). Frankendom's rolls must run server-side too, with a seeded RNG a test can replay.
- MAX_ATTACKERS = 3: the damage step has no attacker cap. Many-on-one comes from the target-selection side (AI and hate list, see the ai-aggro cell), not from this function. Do not let the damage step grow a crowd rule.
- Donor order matters for one ledger. Here the crit roll comes after the base roll, the armour is applied after the crit, and the health step rounds last. Frankendom must pick one order and test it. The sketch changes the base/crit order; the note says so.
- Too many multipliers. About 20 factors (attribute, power, slayer, damage rating, recklessness, sneak, heritage, PK, crit DR, armour, resistance, DRR, shield) make the result hard to tune. Frankendom should keep a short list as data with defaults.
- Logging-out auto-crit (DamageEvent.cs 256-257): a logout rule for open-world PvP. Frankendom has no logout-state rule in the duel. Reject that part.
- Not read: `GetWeaponCriticalChance`, `GetOverpower`, `UpdateVitalDelta`, the monster-side call from a DamageEvent, and the player TakeDamage after line 500. Any number that comes from them is not claimed here.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a
