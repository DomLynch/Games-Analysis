# TurningWheel-Barony (combat-sim, cell 3)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` (`Entity::attack` 10097-13145, `Entity::getACEffectiveness` 8151-8205, `Entity::getAttack` 8220-8366, `AC` 16915-16985; constants in `src/game.hpp` 375-380, `Stat::getMaxAttackCharge` in `src/stat.cpp` 2176) | Licence: BSD 2-Clause (`LICENSE.txt`, "Barony Open Source License", Copyright (c) 2013-2020 Turning Wheel LLC). Code may be adapted | C++ | symbols `Entity::attack`, `Entity::getACEffectiveness`, `Entity::getAttack`, `AC`

Checked: The hint file `actgeneral.cpp` is the wrong file (furniture and collider helpers). The melee resolver is `Entity::attack`. Read in full: `entity.cpp` 8151-8220, 8220-8366, 8504-8530, 11334-11491 (miss gate, evasion, backstab, flank), 12655-12760 (pre-hit and parry state), 12757-12860 (base damage and armour), 12860-13050 (stealth bonus, skill band, charge, Parashu, dummy caps), 13050-13145 (apply; thorns partly). Partly read: `entity.cpp` 15600-15636 and 15662-15675 (riposte; the middle 15637-15661 not read), 16915-16985 (AC; the rest after 16985 not read), 20992-21020 (skill setup; the sword branch not read). Not read: `attack()` 10097-11333 (swing setup and the hit list that gives `hit.entity`), 12400-12655 (weapon multipliers), 13071-13099 (thorns and blade vines in detail), `yawDifferenceFromEntity` (the arc direction convention), `mistFormDodge`, `rollRngProc`, `shouldInvertEquipmentBeatitude`, `weaponGetAttack`, and the client/server authority model for the hit. Confidence: high on the order and the formulas in the base damage path (read end to end); medium on the evasion block scope and on the 120-degree arc direction (read as written, not checked against the convention). The camera is not part of this cell.

## 1. Mechanism

Melee damage is one function, `Entity::attack`. It runs once for each target in the swing's hit list (`hit.entity`, a monster or a player). Per target, the order is:

- (a) Fixed misses and hits (11334-11382). An untargetable small bat is a miss (11338-11341). A bat at rest is always hit (11379-11382). The magician's armour branch (11342-11378) was not read in full.
- (b) Evasion block (11383-11491). It runs only if the target has bat, agility, mist-form dodge, grease (gremlin), dryad (female, vs a player) or lute effects, or if the attacker is blind (11383-11388). Inside it:
  - In the 120-degree arc (11393-11394): a player target is flanked 50% of the time (11396-11401). A monster target is backstabbed if it is unaware (state wait, path or hunt, not rooted; 11405-11412), otherwise flanked 50% of the time (11413-11418).
  - Mist-form dodge is a miss (11422-11425). A backstab always hits (11426-11428; an artifact spear also always hits, 11436-11441).
  - Otherwise `baseChance` is the largest of: bat 60 (11449), agility 30 (11453), attacker blind 75 (11468-11470); grease, dryad and lute can also raise it (11455-11467). Flanking takes 20 off, minimum 1 (11478-11481). A player target rolls `rollRngProc(EVASION, baseChance)` (11482-11485); a monster rolls `rand % 100 < baseChance` (11488).
- (c) Parry state (12717-12754). A parrying defender with a weapon gets `parriedDamage` of at least 1 (12745). This does not cancel the hit: the main damage is still applied at 13137. Only a rapier then deals riposte damage back to the attacker (15617, 15666-15669).
- (d) Base damage (12770-12831). `myAttack = max(0, getAttack(attacker) x preMultiplier + bonus vs target)` (12770); golem smash doubles the pre-multiplier (12760-12768). The defender's armour: `enemyAC = AC(defender)` (12775), where AC is CON plus worn armour, and the shield does not count while the defender parries with a weapon (16936, 16972-16978). Armour effectiveness `e = getACEffectiveness(defender)` (12805): 1.0 if the defender is defending with a shield or parrying with a weapon (8158-8161); otherwise `clamp(0.75 + 0.025 x net blessings, 0, 1)` (8203-8204). Then `attackAfterReductions = int(max(0, myAttack x e - enemyAC) + (1 - e) x myAttack)` (12806). This algebra gives `max(myAttack - AC, (1 - e) x myAttack)`. `damage = attackAfterReductions x weaponMultipliers` when the attacker has a weapon skill (`weaponskill >= 0`), otherwise the raw value (12807-12822). The floor is `max(1, damage)` when `e < 0.99`, else `max(0, damage)` (12824-12831).
- (e) Flat additions (12833-12864). Gremlin +1; axe +1 (bugbear +1 more); zeal smite +3 (variable `zealSmite`, 12850-12852); a lich-fire attacker raises a hit of 8 or less to 8-16, only if the target is not defending and not parried (12854-12859); a monster attacker with the vampiric aura adds +5 after reductions (12861-12863).
- (f) Player stealth (12866-12959). Only for a player attacker, against a target that is not an immobile turret, in stasis or a mimic. The arc test (12871-12872) decides: an unaware monster (wait, path or hunt, not rooted) gives a backstab bonus of `(stealth/20 + 2) x 2 x capstone` (12897, with the capstone at 1 or 2; a monster hunting another target gets a smaller bonus, 12899-12904), added at 12917. Otherwise there is a 50% flank bonus of `(stealth/20 + 1) x capstone` (12944-12949). The bonus is added before the skill band and the charge, so both scale it.
- (g) Skill band (12963-12994). It applies when the weapon skill is between sword and shield, for an unarmed player, or for ranged. Base 50 and variance 20 (12982-12983; unarmed 45 and 30, setup at 21014-21015). `skillModifier = base - variance/2 + proficiency/2 + rand % (variance + 1)`, divided by 100 and capped at 1.0 (12985-12988). `damage = damage - int((1 - skillModifier) x damage)` (12989). At zero proficiency that is 40-60 percent of the hit; at full proficiency it is 90-100 percent.
- (h) Charge (13004-13015). `chargeMult = min(2, int(max(charge, 15) / 15))`, where `MAXCHARGE` is 30 (game.hpp:375). So 1 below full charge and 2 at full charge. A rapier adds 0.25 at full charge (13008-13013). `damage *= chargeMult` (13015).
- (i) Axe artifact proc multiplies the damage (13016-13033). Dummy bots are capped at 15 from level 10 and at 30 from level 5 (13035-13049).
- (j) Apply (13136-13145). `oldHP`, then `modHP(-damage)`, then the damage taken is `oldHP - HP`, and defy-flesh can trigger.

`getAttack` (8220-8366). The base is 8 (`BASE_MELEE_DAMAGE`, game.hpp:377). Bare-handed players add `unarmed skill / 20` (0-5) on top of their base 8 (8236-8237). Gloves and rings add flats when bare-handed (8258-8278). With a weapon the base is 8 plus `weaponGetAttack` (8280-8282). Strength: a player's attack is multiplied by `1 + STR x 0.055` (8207, 8337); a monster's attack gets `+STR` (8341). Rapier uses DEX (8290-8305); whip uses (STR + DEX) / 2 (8306-8318); scepter uses STR / 2 (8319-8331). Weakness multiplies the attack by `1 - min(0.9, 0.2 + 0.1 x (strength - 1))` (8359-8362).

## 2. Key functions

- `Entity::attack`: `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` 10097 onward. Read: miss gate 11334-11491; parry 12717-12754; base damage 12757-12831; stealth 12866-12959; skill band 12963-12994; charge and apply 13004-13145.
- `Entity::getACEffectiveness`: same file, 8151-8205. The defender's armour effectiveness.
- `Entity::getAttack`: same file, 8220-8366. The attacker's attack value.
- `Entity::getBonusAttackOnTarget`: same file, 8510-8530. Blessed weapon vs vampiric aura.
- `AC`: same file, 16915-16985 (partly). The defender's armour value.
- `Entity::setMeleeDamageSkillModifiers`: same file, 20992-21020 (partly). The skill band base and variance.
- `Stat::getMaxAttackCharge`: `/mnt/frankendom-donors/TurningWheel-Barony/src/stat.cpp` 2176 (not read to the end).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Armour can remove a share `e` of the attack: `max(A - AC, (1 - e) x A)` | `e` is 1.0 while defending or parrying with a weapon (theirs, 8158-8161); otherwise 0.75 + 0.025 per net blessing, clamped (theirs, 8204) |
| Hit floor: 1 damage when armour is not full, else 0 | Threshold 0.99 (theirs, 12824-12831) |
| Attack value from base plus stat factor | Base 8 (theirs, game.hpp:377); player `1 + STR x 0.055` (theirs, 8207, 8337); monster `+STR` (theirs, 8341) |
| Skill band scales a hit between about 40 and 100 percent | Base 50, variance 20 (theirs, 12982-12983); unarmed 45 and 30 (theirs, 21014-21015); cap 1.0 (theirs, 12988) |
| Full-charge multiplier | `MAXCHARGE` 30 (theirs, game.hpp:375); multiplier 2 at full (theirs, 13005-13015); rapier +0.25 (theirs, 13012) |
| Unaware target: always hit, flat bonus | Backstab bonus `(stealth/20 + 2) x 2 x capstone` (theirs, 12897); evasion-block backstab always hits (theirs, 11426-11428) |
| Evasion chance | Bat 60 (theirs, 11449), agility 30 (theirs, 11453), attacker blind 75 (theirs, 11470); flank minus 20 (theirs, 11480) |
| Dummy bot damage cap | 15 from level 10, 30 from level 5 (theirs, 13042, 13046) |

## 4. TypeScript sketch

simplified: keeps the donor order (armour, floor, flat bonus, skill band, charge) and the armour formula. It takes the attack value, the armour value, the guard flag and the net blessing count as plain inputs, so the caller does the stat and gear maths. It omits the attack build (`getAttack`, the STR factor, the unarmed skill term, weapon attack and weakness), the evasion gate and the backstab and flank decisions, the stealth bonus itself (the caller passes it as `flatBonus`), the parry state and riposte, the armour-piercing procs (gugnir, whip, ensemble drum), the Parashu proc, the gremlin, axe, zeal, lich and vampiric flats, the dummy caps, the thorns and blade vines, and the apply step. The blessing count is taken as given (`shouldInvertEquipmentBeatitude` not read). Its random roll for the skill band uses `floor(rng x (variance + 1))` in place of `rand % (1 + variance)`.

I ran the compiled sketch on the VPS with a fixed roll of 0.5 (so the skill band is 50 at zero skill, which is 0.5 scale): attack 20 against armour 18 gives 1 when guarding and 3 when not guarding (5 before the skill band); attack 20 against armour 8 gives 6 either way (12 before the skill band); full charge doubles a guarded hit (armour 8 gives 12); with full skill and armour 0 an unguarded hit does 20; charge 29 of 30 gives 1 and 30 gives 2.

```ts
// Clean-room sketch: guarded and unguarded armour, skill damage band, full-charge multiplier.
// Shape only, written from the described mechanism; donor licence BSD-2-Clause (Turning Wheel LLC). Not a line-by-line translation.

export type Rng = () => number; // uniform in [0, 1)

// Share of the attack that armour may remove: 1.0 while guarding, else 0.75 + 0.025 per net blessing, clamped to 0..1.
export function armourEffectiveness(guarding: boolean, blessings: number): number {
  if (guarding) return 1.0;
  return Math.max(0, Math.min(1, 0.75 + 0.025 * blessings));
}

// Damage after armour: max(attack - armour, (1 - e) * attack), truncated.
// Same result as max(0, attack*e - armour) + (1 - e)*attack.
export function afterArmour(attack: number, armour: number, e: number): number {
  return Math.trunc(Math.max(attack - armour, (1 - e) * attack));
}

// A hit that is not fully blocked does at least 1 damage; a fully blocked hit can do 0.
export function floorDamage(dmg: number, e: number): number {
  return e < 0.99 ? Math.max(1, dmg) : Math.max(0, dmg);
}

// Skill band: base - variance/2 + skill/2 + a roll in 0..variance, as a percent, capped at 100.
export function skillScale(skill: number, base: number, variance: number, rnd: Rng): number {
  const roll = base - variance / 2 + skill / 2 + Math.floor(rnd() * (variance + 1));
  return Math.min(roll / 100, 1.0);
}

// Full charge (at or above max) doubles the swing; charge is capped at 2x.
export function chargeMultiplier(charge: number, maxCharge: number): number {
  const half = Math.trunc(maxCharge / 2);
  return Math.min(2, Math.trunc(Math.max(charge, half) / half));
}

export interface HitInput {
  attack: number;          // attack value before armour
  armour: number;          // defender's armour value
  guarding: boolean;
  blessings: number;       // net blessing count from worn gear
  flatBonus: number;       // added after the armour floor (e.g. a backstab bonus); 0 if none
  skill: number;           // attacker's skill with this weapon class, 0..100
  skillBase: number;       // 50 for weapons, 45 for unarmed
  skillVariance: number;   // 20 for weapons, 30 for unarmed
  charge: number;
  maxCharge: number;
}

export function resolveHit(h: HitInput, rnd: Rng): number {
  const e = armourEffectiveness(h.guarding, h.blessings);
  let dmg = afterArmour(h.attack, h.armour, e);   // armour first
  dmg = floorDamage(dmg, e);                       // minimum for unguarded hits
  dmg += h.flatBonus;                              // flat bonuses after the floor
  const s = skillScale(h.skill, h.skillBase, h.skillVariance, rnd);
  dmg = dmg - Math.trunc((1 - s) * dmg);           // skill band scales the whole hit
  dmg = Math.trunc(dmg * chargeMultiplier(h.charge, h.maxCharge)); // charge last
  return Math.max(0, dmg);
}
```

## 5. Lands in

- TARGET `src/fight/guard.ts` (new module, or the guard step inside `src/fight/damage.ts`): the guard and armour rule for one hit. Parity-checklist row 3 (guard / parry / stamina). The damage step calls it; the client only shows the result.
- today: `src/combat.ts` (moving, per the Quake note). There is no guard floor there yet (not checked in this pass).
- Reuse tag: adapt-allowed (BSD-2-Clause, Turning Wheel LLC; attribution if any code is copied; this sketch is clean-room)
- Brief rule served: 1 (one combat core, two clients) and rule 3 of the parity list: the guard decision is state the engine owns.

Best transferable idea: the armour step as `max(attack - armour, (1 - e) x attack)`, with `e` set to 1.0 while guarding and to a lower share while not, so guarding can absorb a hit fully and an unguarded hit always lets a fixed share through.
Decision (proposed): adapt - the guard floor gives guard a clear meaning in a fast duel (full absorb versus a guaranteed share) and is one formula; adapt because the donor's 0.75 base and blessing steps should become catalogue data, and the random skill band and the parry-as-riposte should not be ported as they are.
Acceptance: duel test with the skill band off: armour 25 against attack 20 takes 0 when guarding and 5 when not guarding; armour 18 against attack 20 takes 2 when guarding and 5 when not guarding; a full-charge heavy swing doubles the result.

## 6. Gaps and risks

- A guarded hit can do 0 damage and still be a hit. The player needs a block read (row 10 hit feedback or row 14 HUD), not a "0" number, or the feel is lost.
- The donor's skill band rolls 40-100 percent of every hit, using a random value per hit. A fast duel needs a readable outcome. Reject the per-hit random band; if skill is wanted, use a fixed proficiency multiplier, and roll only on a seeded server RNG (row 19 replay) if at all.
- Parry in the donor does not cancel the hit; only a rapier riposte hits back (15666-15669). Frankendom's parry (row 3) must pick one rule before it is built: parry cancels the hit, or parry grants a riposte, not both by accident.
- Full-charge doubling is a large risk-reward swing. Frankendom's heavy attack timing belongs to row 1 (duel step); if the charge is kept, it needs a telegraph, a data field, and a server test.
- Backstab and flank depend on the target's facing and a 120-degree arc. Frankendom must define the arc in engine state (facing as server state, not the camera). The donor's arc direction convention was not read, so do not copy its sign.
- Evasion here is a per-swing roll on a status (bat, agility, blind). Frankendom's one ledger and server-verified kills need the roll on the server, seeded, or replaced by a state rule.
- Armour in the donor is CON plus worn armour, and blessings are a separate multiplier of the armour effect. Frankendom should keep armour as one catalogue number; the blessing step is a second axis that adds rules without a clear player signal.
- Licence BSD-2-Clause: code may be adapted with attribution. The sketch has no donor lines.
- Not read: the hit list (`attack()` 10097-11333), weapon multipliers (12400-12655), the riposte middle (15637-15661), `yawDifferenceFromEntity`, `mistFormDodge`, `rollRngProc`, the server or client authority for the hit, and the thorns detail (13071-13099).

Reuse tag: adapt-allowed (BSD-2-Clause)
Brief rule served: 1 (one combat core, two clients) and parity row 3 (guard / parry / stamina)
