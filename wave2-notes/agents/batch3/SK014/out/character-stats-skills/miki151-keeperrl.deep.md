# miki151-keeperrl (character-stats-skills, cell 3)

Donor: `/mnt/frankendom-donors/miki151-keeperrl/` (creature.cpp, body.cpp, creature_attributes.cpp, collective.cpp, lasting_effect.cpp, spell_map.cpp, attack.h, attr_info.h; data_free/game_config/attributes.txt, furniture.txt, promotions.txt, spell_schools.txt, spells.txt) | Licence: GPL-2.0-or-later (creature_attributes.h header lines 5-7: "either version 2 ... or (at your option) any later version"; LICENSE file is GPL version 2, June 1991) | C++ + data text | symbol `Creature::takeDamage` / `getDamage` / `Body::takeDamage`

Checked: opened and read these parts end to end: the damage curve and the defence path (creature.cpp 1708-1721, 1745-1758, 1761-1803); the attack damage (creature.cpp 1620-1668, the damage line at 1646); the combat XP and cap (creature.cpp 1210-1260); attribute reads (creature.cpp 1153-1213; creature_attributes.cpp 145-185); the body hit model (body.cpp 218-232, 294-307, 781-806, 843-893); training (collective.cpp 1570-1600 partly, 1650-1670 partly; lasting_effect.cpp 1163-1170); spells (spell_map.cpp 85-105; creature.cpp 246-249; util.cpp 740-750); the data tables (attributes.txt 1-120, furniture.txt 1-32, promotions.txt 1-40, spell_schools.txt 1-30, spells.txt 1-45). Confidence high for the damage curve, flank rule, combat XP and cooldown formula (read in full). Medium for the body-part model (read in full but the weapon-share `weapon.second` meaning, from getRandomWeapons, was not read). Not read: lasting_effect.cpp defence modifiers (modifyCreatureDefense), getAttrBonus (lasting_effect.cpp 540), the spell effect bodies, buffs.txt (76 rows counted, not read), and body_materials.txt beyond grep. camera_scope: n/a.

## 1. Mechanism

- Hit resolution (creature.cpp 1761-1803). (a) Defence = getAttr(DEFENSE) (1766), plus the attacker-specific special DEFENSE (1772). (b) Defence x flank modifier (1774). (c) Defence x buff multipliers (buffs, lasting effects). (d) Ratio = attack strength / defence, mapped through a piecewise curve getDamage (1788; curve 1708-1721): 0 up to ratio 0.3; linear to 0.12 at ratio 1; linear to 1.0 at ratio 2.2; 1.0 above that. (e) If the fraction is above 0, the body takes it (1803).
- Attack strength (creature.cpp 1646): `max(1, int(weapon.second x (getAttr(damageAttr) + specialAttr + weapon modifier)))`. The minimum is 1, so a hit cannot be zero.
- Flank modifier (creature.cpp 1745-1758): cnt starts at 1 + PARRY (1749). Each adjacent enemy that moves takes one away; each adjacent non-enemy adds one (the loop, 1750-1757). The result is 1.07^min(0, cnt) (1758). So with no PARRY, two moving enemies adjacent give cnt = -1, a 7 percent defence loss. Three give cnt = -2 and about 13 percent.
- Body (body.cpp 781-806): the fraction is taken from health first (bleed, 783 and 893). A part is picked (getBodyPart, 294-307): legs, arms and wings always; the head when health is below 40 percent or the material does not die from losing its head (297); the torso when health is below 40 percent (299 is the donor's empty-list test, see Section 6). A part is injured when damage reaches its strength (isPartDamaged 218-234): WING 0.3, ARM 0.6, LEG and HEAD 0.8, TORSO and BACK 1.5 (222 shows the arm value). A body with no health pool uses a random chance damage/strength (230). An injury gives a 50-tick BLEEDING buff (794) and health is lifted to 0.1 if it would hit 0 (796). Death at health 0 or below (800). Below half health is 'critical' (806).
- Combat experience (creature.cpp 1250-1260): only a creature with a brain, killing a victim that grants experience (1251). expIncrease = max(0.02, min(3.0, (3.0 - 0.5) x attackDiff / 10 + 0.5)) (1253-1257), where attackDiff = victim's peak attack minus own peak attack. The stored counter increases (1260). The counted value is capped at 5 x maxPromotion (1213, 1240).
- Attribute read (creature.cpp 1155, 1168, 1203): raw attribute = base + exp level (creature_attributes.cpp 149); combat XP is added for trained attributes, DEFENSE, and any positive non-fixed attribute (1203-1205); kill titles add min(count, raw) (1155); buffs and equipment add bonuses (getAttrBonus, not read).
- Training (collective.cpp 1585-1589): at a training or study furniture, each usage step adds 0.012 x efficiency x training speed (the caller that runs the usage step was not read) (1.3 faster or slower with FAST/SLOW_TRAINING, lasting_effect.cpp 1163-1170). The gain is capped by the dummy's max for that attribute (1587) and by the attribute max inside increaseExpLevel (creature_attributes.cpp 177).
- Promotions (promotions.txt): effect rows such as IncreaseMaxLevel DAMAGE 3 (line 5) and IncreaseAttr RANGED_DAMAGE 14 (line 13).
- Spells (spell_map.cpp 94, 99): a spell is available when its level is at or below the caster's exp level in its school attribute. An upgrade row hides its base spell (the upgrade set, 94-97).
- Spell cooldown (creature.cpp 246-249): start + (end - start - 1) x (100 - min(100, SPELL_SPEED)) / 100, integer arithmetic. `healing` has cooldown {10 31} (spells.txt 5), so the cooldown runs from 10 to 30; SPELL_SPEED 100 gives 10. Range length is finish minus start (util.cpp 749).

## 2. Key functions

- `getDamage` (ratio to fraction): `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1708-1721.
- `Creature::getFlankedMod`: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1745-1758.
- `Creature::takeDamage`: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1761-1803.
- `Creature::attack` (attack strength): `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1620-1668 (damage line 1646).
- `Creature::updateCombatExperience`: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1250-1262 (curve 1253-1260); cap `getCombatExperienceCap` 1240.
- `Creature::getRawAttr` / `getAttrBonus` / `getAttrWithExp`: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1153-1213.
- `Body::isPartDamaged`, `Body::getBodyPart`, `Body::takeDamage`, `Body::bleed`: `/mnt/frankendom-donors/miki151-keeperrl/body.cpp` 218-234, 294-307, 781-806, 893.
- `CreatureAttributes::getRawAttr` / `increaseExpLevel` / `isTrainingMaxedOut`: `/mnt/frankendom-donors/miki151-keeperrl/creature_attributes.cpp` 148-182.
- Training: `/mnt/frankendom-donors/miki151-keeperrl/collective.cpp` 1585-1589.
- Spell gating: `/mnt/frankendom-donors/miki151-keeperrl/spell_map.cpp` 94-99.
- Spell cooldown: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 246-249.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Damage as a piecewise curve of attack over defence: nothing below 0.3, a small hit at parity, full damage at 2.2 | 0.3, 0.12 at ratio 1, 2.2 (creature.cpp 1710-1717) |
| Defence falls per extra adjacent attacker, geometrically | 1.07 per point below zero, zero point at PARRY + 1 (creature.cpp 1749, 1758) |
| Part injury threshold scales with part size | WING 0.3, ARM 0.6, LEG/HEAD 0.8, TORSO/BACK 1.5 (body.cpp 222 and nearby) |
| Combat XP scales with the attack gap, bounded | 0.02 floor, 3.0 ceiling, 0.5 at equal attack, 10-point gap (creature.cpp 1253-1257) |
| Cap on counted combat XP by promotion count | 5 x maxPromotion (creature.cpp 1240) |
| Use-based training with a per-step rate and two caps | 0.012 per usage step (collective.cpp 1585); FAST/SLOW x1.3 and /1.3 (lasting_effect.cpp 1165-1168) |
| Spell cooldown shrinks with a speed stat | start 10, end 31, SPELL_SPEED up to 100 (spells.txt 5; creature.cpp 249) |

### Stat and skill rows (SK table, donor numbers)

Skills are TABLE-DRIVEN: yes. Attributes are rows in attributes.txt (18 rows, grep count), spells are rows in spells.txt (117 rows), spell schools are rows in spell_schools.txt (12 school headers by grep), training dummies are furniture rows with a maxTraining map (6 TRAINING_ rows), and promotions are effect blocks (6 groups by grep). Stats are base values per creature type (creature_factory.cpp).

| name | what it does | formula | number ranges (donor) | caps | file:line |
|---|---|---|---|---|---|
| DAMAGE (melee) | per-hit strength | max(1, int(weapon share x (getAttr(DAMAGE) + special + weapon modifier))) | base per creature (not read per row); training max 3 wood, 7 iron | exp level max via promotion (IncreaseMaxLevel) | creature.cpp 1646; furniture.txt 10-12, 25-27; promotions.txt 5 |
| SPELL_DAMAGE, RANGED_DAMAGE | attack strength for spells and ranged | same pattern as DAMAGE | study furniture (STUDY usage, bookcase rows) maxTraining SPELL_DAMAGE 3 (furniture.txt 303) and 7 (line 320) | promotion max | attributes.txt rows; promotions.txt 13, 27 |
| DEFENSE | defence against hits | defence = DEFENSE + special, x flank, x buffs | base 250 for some creature types (creature_factory.cpp 130); lasting effects +/-2..10 (lasting_effect.cpp 103) | none | creature.cpp 1766, 1772, 1774 |
| PARRY | extra attackers before the flank penalty | cnt = 1 + PARRY - moving enemies + non-enemies | absorptionCap 3 (display) | none | creature.cpp 1749; attributes.txt 72-79 (76) |
| flank modifier | defence multiplier when surrounded | 1.07^min(0, cnt) | 1.0 down; 0.87 at cnt -2 | none | creature.cpp 1745-1758 |
| damage fraction | share of health lost per hit | piecewise getDamage(strength / defence) | 0 to 1 | 0 at ratio 0.3 or less; 1 at 2.2 or more | creature.cpp 1708-1721, 1788 |
| body part hit | which part is hit | random among allowed parts | legs, arms, wings always; head when health < 40 percent or no death on head loss; torso when health < 40 percent | none | body.cpp 294-299 |
| part strength | injury threshold | damage >= strength (pool) or chance damage/strength (no pool) | WING 0.3, ARM 0.6, LEG 0.8, HEAD 0.8, TORSO 1.5 | none | body.cpp 218-232 |
| health pool | body health | 1 at full, minus fractions; death at 0 or below | critical below 0.5; injury floor 0.1 | none | body.cpp 781-806, 893 |
| bleeding | damage over time after an injury | BLEEDING buff | 50 visible turns | none | body.cpp 794 |
| combat XP per kill | counter for trained attributes | clamp(0.02, 3.0, 2.5 x (victim peak - own peak) / 10 + 0.5) | 0.02..3.0 per kill | cap 5 x maxPromotion | creature.cpp 1253-1260, 1240 |
| kill titles | bonus per kill title | min(count, raw attribute) | 0..raw | capped by the raw attribute | creature.cpp 1155 |
| exp level (skill) | per-attribute training level | raw = base + expLevel (+ combat XP where it applies) | 0..max (promotion or dummy) | IncreaseMaxLevel; drops to max if max is lowered | creature_attributes.cpp 149, 172-182 |
| training gain | exp level per tick at a dummy | 0.012 x efficiency x speed, capped by dummy max and attribute max | 0.012 per tick; speed 1.0, 1.3 (fast), 0.77 (slow) | dummy max; attribute max | collective.cpp 1585-1589; lasting_effect.cpp 1165-1168 |
| spell level gate | spell available | spell level <= school exp level | levels 1..12 in the mage school (spell_schools.txt 1-16) | upgrade hides base | spell_map.cpp 94-99 |
| spell cooldown | turns between casts | start + trunc((end - start - 1) x (100 - min(100, SPELL_SPEED)) / 100) | healing 10..30 | SPELL_SPEED 100 gives start | creature.cpp 246-249; spells.txt 5 |
| SPELL_SPEED | cooldown reduction | used above | 0..100 | 100 | creature.cpp 249; attributes.txt 82-88 |
| stat sheet readout | values the client shows for each attribute | getAttr for each attribute row, sent in the view object | all rows | none | creature.cpp 1853 |
| mana / focus pool | none; spells are gated by school level and cooldown only | n/a (the only 'mana' string hit is a player message, player_control.cpp 3665) | n/a | n/a | not present |
| luck | none (18 attribute rows, no luck) | n/a | n/a | n/a | not present |
| strength, dexterity, endurance, intelligence | none; no base character attributes | n/a | n/a | n/a | not present |
| stamina, fatigue, roll, dodge | none | n/a | n/a | n/a | not present |
| elemental damage | FIRE, ACID, COLD damage attributes with body-part injury text and an on-attack effect | attack attr; effect on hit | 25 absorptionCap display | none | attributes.txt 30-62 |
| resistances | none as numbers; body materials carry immunities (body_materials.txt, read by grep only) | n/a | n/a | n/a | body_materials.txt (not read in full) |
| social skills | none | n/a | n/a | n/a | not present |

As-data shape: attribute row fields (attr_info.h, SERIALIZE_ALL): name (string key), viewId (string), adjective (text), absorptionCap (int, 25 typical, 3 for PARRY; display only, creature_attributes.cpp 333), modifierVariation (int, default 1; 0 for PARRY), wishedItemIncrease (int, default 5), isAttackAttr (bool), meleeFX (optional), help (text), bodyPartInjury (optional text), onAttackedEffect (optional effect). Spell row fields (spell.cpp 24): upgrade (string), symbol, effect (effect expression), range (int), targetSelf (bool), cooldown (range {start end}), sound, fx, endOnly, blockedByWall, maxHits, type, message. Spell school rows: a header with id, name key and exp attribute, then `"spell" level` pairs (spell_schools.txt 1-16). Training dummy row: maxTraining map (attribute to max), usageType, strength, fire, blockMovement, requiresLight. Promotion groups: effect lines (IncreaseMaxLevel, IncreaseAttr, AddSpellSchool, SetCreatureFlag, SetViewId, Filter).

A new attribute is one row: yes (attributes.txt), but it does nothing until a weapon, spell or promotion uses it. A new spell is one row in spells.txt plus one line in its school in spell_schools.txt (two files, not one row). A new training dummy is one row with a maxTraining entry: yes.

Provenance per claim: repo `miki151-keeperrl`, licence GPL-2.0-or-later. Every claim above cites file and line in receipts.tsv (70 KeeperRL rows; the file-wide verifier run on all 173 rows passed with 0 failures).

What they patched later: no history available (no .git, no changelog in the repo root). Comments read: creature.cpp 806 "hack to avoid weird endless equip-unequip loop", creature.cpp 2052 "a bit of a hack" (a death sound), collective.cpp 1306 "workaround" (bridge gate), collective.cpp 1456 "workaround some bug where it contains bogus creatures". None is a stat or damage rule.

Donor defects and fixes (keep the idea):
- The part list has an empty test that never fires: legs, arms and wings are always pushed (body.cpp 295), so `allowed.empty()` (299) is dead. Fix: drop it (the sketch does).
- A hit-penalty constant is declared and never used in takeDamage (creature.cpp 1765). Fix: remove, or name the hit penalty in the table if it is wanted.
- The flank count is by grid neighbours (creature.cpp 1750). Frankendom has no grid in the duel. Fix: count engaged attackers (MAX_ATTACKERS = 3) instead of neighbour cells.
- Combat XP uses the peak attack ever (creature.cpp 1252-1253 via highestAttackValueEver). A creature that once had a high attack keeps the lower gain forever. Fix: pick the current attack (ruling 3).

Best transferable idea: one piecewise damage curve over the attacker-to-defender strength ratio (no damage below 0.3, 12 percent of health at parity, full at 2.2), with a defence penalty per extra attacker, so every number in a fight is a ratio that one table can tune.
Decision (proposed): adapt - take the damage curve and the flank penalty into src/fight, with engaged attackers in place of grid neighbours and a seeded roll; leave the body-part injury model and the training furniture out of the duel for now (they feed row 8 wounds and a later progression pass).
Acceptance: a server test asserts getDamage at ratio 0.3 gives 0, at 1.0 gives 0.12, at 2.2 gives 1.0, and that a defender with three engaged attackers and no PARRY takes the 1.07^-2 defence multiplier; a player sees the hit line with the damage percent on the fight record.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: defence x flank x buffs, then ratio through the damage curve, then bleed the health pool, then the per-part injury check (random part, per-part strength, no-pool chance), then the death test; the injury floor of 0.1 is kept. It omits the lasting effects and buffs (passed as multipliers), the special attacker-specific DEFENSE, the weapon share and attribute bonuses (attack strength is a parameter), the steed chance, the capture path, the BLEEDING buff timer (stored only), the messages, the material checks beyond a flag, the body-part drop on cut and bite, the combat XP's team and leadership parts, and the training furniture's efficiency input (a parameter). Fix in the sketch: the empty-list test is gone, and the injury check takes the random source as a parameter (seeded in Frankendom). Integer division in the spell cooldown is kept as Math.trunc on the same expression.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Target: src/fight/stats.ts (proposed). Parity row 21 (catalogue fields).

export {};

// 1) Damage curve: strength / defence -> fraction of the victim's health taken.
// Donor getDamage: 0 up to 0.3, linear to 0.12 at ratio 1, linear to 1.0 at 2.2, then 1.0.
const MIN_RATIO = 0.3;
const MAX_RATIO = 2.2;
const DAMAGE_AT_ONE = 0.12;

function damageFraction(ratio: number): number {
  if (ratio <= MIN_RATIO) {
    return 0;
  }
  if (ratio <= 1) {
    return DAMAGE_AT_ONE * (ratio - MIN_RATIO) / (1 - MIN_RATIO);
  }
  if (ratio <= MAX_RATIO) {
    return DAMAGE_AT_ONE + (1 - DAMAGE_AT_ONE) * (ratio - 1) / (MAX_RATIO - 1);
  }
  return 1;
}

// 2) Flanking: the defence multiplier falls 7 percent per point of deficit below zero.
// cnt starts at 1 + PARRY; each adjacent enemy that moves takes one away, each adjacent non-enemy adds one.
function flankMod(parry: number, adjacentMovingEnemies: number, adjacentNonEnemies: number): number {
  const cnt = 1 + parry - adjacentMovingEnemies + adjacentNonEnemies;
  return Math.pow(1.07, Math.min(0, cnt));
}

// 3) Body: damage bleeds the health pool first; a random allowed part is checked against a per-part strength.
type Part = "WING" | "ARM" | "LEG" | "HEAD" | "TORSO";

const PART_STRENGTH: Record<Part, number> = { WING: 0.3, ARM: 0.6, LEG: 0.8, HEAD: 0.8, TORSO: 1.5 };

interface Body {
  health: number;          // 1 = full, 0 = dead (health pool model)
  hasPool: boolean;        // false = the part-only model (no pool)
  losesParts: boolean;     // material can lose body parts
  losingHeadsMeansDeath: boolean;
  partsLeft: Partial<Record<Part, number>>;
  bleeding: number;        // ticks of bleeding after an injury (donor: 50 visible turns)
}

type Outcome = "KILLED" | "HURT" | "NOT_HURT";

// Donor getBodyPart: legs, arms and wings are always allowed; the head is allowed below 40 percent health or
// when the material does not die from losing its head; the torso is allowed below 40 percent health.
// Fix: the donor's "allowed.empty()" test can never fire (legs, arms and wings are always pushed); the sketch drops it.
// The donor then falls back to any part that is left; this sketch does the same.
function pickPart(b: Body, rng: () => number): Part | null {
  const allowed: Part[] = ["LEG", "ARM", "WING"];
  if (b.health < 0.4 || !b.losingHeadsMeansDeath) {
    allowed.push("HEAD");
  }
  if (b.health < 0.4) {
    allowed.push("TORSO");
  }
  let pool = allowed.filter((p) => (b.partsLeft[p] ?? 0) > 0);
  if (pool.length === 0) {
    pool = (["LEG", "ARM", "WING", "HEAD", "TORSO"] as Part[]).filter((p) => (b.partsLeft[p] ?? 0) > 0);
  }
  if (pool.length === 0) {
    return null;
  }
  return pool[Math.floor(rng() * pool.length)];
}

function partInjured(part: Part, damage: number, b: Body, rng: () => number): boolean {
  const strength = PART_STRENGTH[part];
  if (!b.hasPool) {
    return rng() < damage / strength;
  }
  return b.losesParts ? damage >= strength : false;
}

// One hit that has already been reduced to a fraction of health.
// An injury never kills by itself: health is lifted to 0.1 (donor body.cpp 796).
function bodyTakeDamage(b: Body, damage: number, rng: () => number): Outcome {
  b.health -= damage;                                       // bleed first (donor)
  const part = pickPart(b, rng);
  if (part !== null && partInjured(part, damage, b, rng)) {
    b.partsLeft[part] = (b.partsLeft[part] ?? 1) - 1;
    b.bleeding = 50;
    if (b.health <= 0) {
      b.health = 0.1;
    }
    return "HURT";
  }
  if (b.health <= 0) {
    return "KILLED";
  }
  return "HURT";                                            // below 0.5 is critical (a message in the donor), not a state change here
}

// Full hit: defence from the DEFENSE attribute x flank x buffs; ratio = strength / defence.
function resolveHit(strength: number, defence: number, flank: number, buffMults: number[],
                    b: Body, rng: () => number): Outcome {
  const d = defence * flank * buffMults.reduce((a, m) => a * m, 1);
  const frac = damageFraction(strength / d);                // d = 0 gives Infinity, which maps to 1
  if (frac <= 0) {
    return "NOT_HURT";
  }
  return bodyTakeDamage(b, frac, rng);
}

// 4) Combat experience: the gain depends on the attack difference with the victim (peak attack, donor 'highestAttackValueEver').
const MAX_LEVEL_GAIN = 3.0;
const MIN_LEVEL_GAIN = 0.02;
const EQUAL_LEVEL_GAIN = 0.5;
const MAX_LEVEL_DIFF = 10;

function combatXpGain(victimPeakAttack: number, selfPeakAttack: number): number {
  const attackDiff = victimPeakAttack - selfPeakAttack;
  const raw = (MAX_LEVEL_GAIN - EQUAL_LEVEL_GAIN) * attackDiff / MAX_LEVEL_DIFF + EQUAL_LEVEL_GAIN;
  return Math.max(MIN_LEVEL_GAIN, Math.min(MAX_LEVEL_GAIN, raw));
}

// Cap on counted combat XP: five times the max promotion count (donor creature.cpp 1240).
function combatXpCap(maxPromotion: number): number {
  return 5 * maxPromotion;
}

// 5) Training: use-based, per attribute. Per tick at a training dummy; capped by the dummy and by the attribute max.
function trainStep(expLevel: number, attrMax: number, dummyMax: number | undefined,
                   efficiency: number, trainingSpeed: number): number {
  let inc = 0.012 * efficiency * trainingSpeed;
  if (dummyMax !== undefined) {
    inc = Math.min(inc, dummyMax - expLevel);
  }
  inc = Math.min(inc, attrMax - expLevel);
  return Math.max(0, inc);
}

// 6) Spell cooldown: start + (length - 1) x (100 - SPELL_SPEED) / 100, integer division as in the donor.
function spellCooldown(start: number, end: number, spellSpeed: number): number {
  const length = end - start;
  return start + Math.trunc((length - 1) * (100 - Math.min(100, spellSpeed)) / 100);
}

// 7) Spell gating: a spell is available when the school's exp level reaches its level; an upgrade hides its base.
interface SpellRow {
  name: string;
  school: string;
  level: number;
  upgrade?: string;        // the base spell this row upgrades
}

function availableSpells(rows: SpellRow[], expLevel: (school: string) => number): SpellRow[] {
  const reached = rows.filter((r) => r.level <= expLevel(r.school));
  const upgraded = new Set<string>();
  for (const r of reached) {
    if (r.upgrade !== undefined) {
      upgraded.add(r.upgrade);
    }
  }
  return reached.filter((r) => !upgraded.has(r.name));
}

// Usage check (not a test).
const rng = Math.random;
const body: Body = { health: 1, hasPool: true, losesParts: true, losingHeadsMeansDeath: true, partsLeft: { ARM: 2, LEG: 2 }, bleeding: 0 };
const outcome = resolveHit(120, 100, flankMod(0, 2, 0), [], body, rng);
void outcome;
void combatXpGain(40, 30);
void combatXpCap(2);
void trainStep(2, 3, 3, 1, 1);
void spellCooldown(10, 31, 50);
void availableSpells(
  [{ name: "healing", school: "healer", level: 1 }, { name: "advanced healing", school: "healer", level: 2, upgrade: "healing" }],
  () => 2,
);
```

## 5. Lands in

- TARGET `src/fight/stats.ts` (proposed new module). The damage curve, the flank penalty and the combat XP curve are engine logic (one engine, rule 1); the constants (0.3, 2.2, 0.12, 1.07, 0.02, 3.0, 0.5, 10) are catalogue data. Parity-checklist row 21 (catalogue fields). The combat XP award is row 18 (loot roll and XP award), so the XP curve also touches row 18.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape only)
- Brief rule served: 1 (one engine: the curve and the flank rule live in src/fight, the numbers are data); parity row 21.

## 6. Gaps and risks

- Ratio curve: Frankendom's HP is not the donor's health fraction. The curve is applied to strength over defence in the donor; Frankendom must define one HP scale before any number is copied, or the curve will move every fight.
- Flank: the donor counts grid neighbours (creature.cpp 1750). Frankendom has no grid in a duel. Map it to engaged attackers, MAX_ATTACKERS = 3; then the penalty caps at two extra attackers (1.07^-2, about 0.87).
- Random: the donor's rolls (part pick, injury chance, no-pool chance) use a global random source. Frankendom must seed them and write the result into the fight record (row 19) so a replay gives the same wound.
- One ledger: the health change and any injury must go through the server's single ledger; the client never applies the part model.
- Wounds: the part model (legs, arms, wings, head, torso, bleeding) is row 8 (blood, wounds, decals) and is not part of the duel stats. Keep it out of src/fight until a wound row exists.
- Combat XP: the donor uses the peak attack ever (creature.cpp 1252-1253). Frankendom's ruling should choose current attack or peak attack explicitly.
- Cap: the 5 x promotion cap (creature.cpp 1240) is a rule of the donor's promotion system. Frankendom's rank ladder is in the OpenRA and Freeciv notes; do not stack two ladders.
- Not read: lasting_effect.cpp defence modifiers, getAttrBonus, getRandomWeapons (the weapon share in 1646), body_materials.txt immunities (grep only), buffs.txt (count only).

## Reuse tag and rulings for Dom (max 3)

1. Should hit damage in duels use the attack-over-defence curve (nothing under 0.3, 12 percent at parity, full at 2.2) instead of flat damage? Recommendation: yes, with Frankendom's HP scale fixed first.
2. Should a defender lose 7 percent defence per extra engaged attacker beyond its PARRY count? Recommendation: yes, with MAX_ATTACKERS = 3 so it caps at two extra attackers.
3. Should combat XP use the current attack difference or the peak attack ever? Recommendation: current attack, so an old peak does not lock the gain.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine); parity row 21 (catalogue fields)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: CLEAN.
- All checked claims hold. Trivial: 'DEFENSE base 250 for some creature types' is a boulder (creature_factory.cpp 128-130).
- Small miss: Body::takeDamage can kill on a part injury (injureBodyPart returns true for CUT/BITE drops, body.cpp 785-792); an injury never kills by itself only holds for the health floor. simulAttackPen (creature.cpp 1149) not used here.
