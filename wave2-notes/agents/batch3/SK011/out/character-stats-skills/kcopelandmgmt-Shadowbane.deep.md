# kcopelandmgmt-Shadowbane (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/PlayerCharacter.java` | Licence: MIT (`/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/LICENSE`, "MIT License", Magicbane Emulator Project 2013-2022; code may be adapted) | Java | symbols `calculateMaxHealthManaStamina`, `getDexPenalty`, `calculateModifiedStats`, `updateRegen`, `CharacterSkill.calculateModifiedAmount`, `CharacterSkill.train`, `CombatManager` swing stamina gate

Checked: read `PlayerCharacter.java` 3670-3760 (calculateModifiedStats, getDexPenalty), 4278-4390 (calculateMaxHealthManaStamina), 4987-5176 (updateRegen; the flight and walk branches 5060-5100 were read by grep only); `updateStamRegen` 5183-5200 and 5255-5275 (disabled; middle not read). `CharacterSkill.java` 28-36 and 68-80 (table starts), 150-166 and 192 (table middle and end, by grep for the end), 706-830 (getMaxTrains, train, getTrainingCost), 970-1210 (base and modified amounts, train curves, display percent). `CombatManager.java` 414-432 and 560-600. `MBServerStatics.java` 296-335. `Enum.java` 754-760 and 806-900 (DamageType, SourceType). Confidence: high on the formulas as written; medium on how the derived pools are used by callers (not read). Not read: class, race and item values (they come from the database, not the donor); the numbers inside `getTrainingCost` (the formula was read, not evaluated); the driver of `PlayerCharacter.update()`; `Mob.calculateMaxHealthManaStamina` (1472); magic schools and resistances beyond the enum names.

Best transferable idea: Derive every pool (health, stamina, mana) from one level-banded curve times a Constitution or Spirit multiplier, and make each melee swing cost weapon weight divided by three with a refusal below that weight.
Decision (proposed): adapt — take the stamina economy and the one-curve pool shape, but express the level curve and every multiplier as catalogue data, and move the armour dex penalty into the same data table, because the donor hard-codes the bands and the Frankendom ruling needs a data curve for power per level.
Acceptance: A server test swings a 9-weight weapon at stamina 8 and asserts the swing is refused with no stamina spent; at stamina 9 it asserts a swing deducts exactly 3 and stamina regenerates at 0.2 per second while idle (a 10-second idle gap from 0 gives 2.0, clamped to max).

## 1. Mechanism

Four linked mechanisms, all in the player object, all computed on the server:

(a) Pool sizes. `calculateMaxHealthManaStamina` sets a level-equivalent `f` and a promotion-equivalent `g` from six level bands (4322-4340). Below level 10, or with no promotion, `f = level` and `g = 0`. Then:
- health = ((f x classHealth + g x promoHealth) x (0.3 + 0.005 x Con) + (Con + raceHealth)) x (1 + trunc(Toughness) / 400)
- stamina = the same shape with Stamina mods, Con, and trunc(Athletics) / 300 (4354)
- mana = (f x classMana + g x promoMana) x (0.3 + 0.005 x Spi) + (Spi + raceMana). Mana has no skill term (4353).
Effect and rune bonuses (HealthFull, ManaFull, StaminaFull) are added and then multiplied by their percent bonus, in the same method after the base formula. Health is floored at 1; mana and stamina below -1 are set to 0. Current values are clamped down to the new maximum (4387 onward).

(b) Armour dex penalty. `getDexPenalty()` sums the item `dexPenalty` column over six equipment slots (helmet, chest, arms, gloves, leggings, feet) (3734-3740) and returns `1 - sum / 100` (3741). Dex is multiplied by that factor before effect percent bonuses (3698, 3709), then each current stat is floored at 1 (3713).

(c) Stamina spend and gate. A melee swing is refused when stamina is below 1 for bare hands, or below the weapon's weight otherwise (CombatManager 424-426). On a swing the stamina cost is 0.5 bare-handed, or weapon weight / 3 with a minimum of 1 (579, 581-583). Stamina-cost powers deduct their cost in `PowersManager` (479).

(d) Regeneration by movement state. `updateRegen` (4987) picks a per-second rate by state: idle +0.2 stamina/s when not casting (MBServerStatics 320), sitting +2/s (319), combat run -0.65/s (322), out-of-combat run -0.4/s (323), swimming -1/s (324). Health regen when idle is `HEALTH_REGEN_IDLE` x max plus a flat `HEALTH_REGEN_IDLE_STATIC` (5005; 298, the comment says 100 percent in 25 minutes). Mana idle is 0.00166667 x max per second (316, comment 100 percent in 10 minutes). Each rate is multiplied by the seconds since the last update: health and mana by `getDeltaTime()` (5130-5131), stamina by `getStamDeltaTime()` (5132; defined 4730-4732 as elapsed milliseconds x 0.001). Results are clamped to [0, max] inside a compare-and-set loop that follows the three multiplications at 5130-5132. Timestamps reset at 5178-5179.

(e) Skills. `calculateModifiedAmount` (1069-1124) computes a stat-weighted index: `statMod = 0.5 + sum(skillMod x currentStat / 100)`, clamped to 1-600 (1087-1100). The amount is `7 + baseSkillValues[trunc(statMod)]` (1102) plus rune and effect bonuses, then `+ calculateAmountAfterTrains()` (1117), then a percent bonus (1121). The train bonus (1131-1148) is piecewise: 2 per train below 10 trains, 1 per train from 10 to 89, 0.5 per train from 90 to 133, and 1/3 per train from 134 (integer division). A skill's train count cannot exceed a cap that depends on the character's base Intelligence: `maxTrains[intt]` for 1-190 (724-727), and `33 + 1.25 x Int - 0.005 x Int^2` beyond that (710). Each train spends one available train point (752) and recalculates the skill, the skill list and the bonuses.

Tick: `PlayerCharacter.update()` calls `updateRegen()` (4801), and calls it again after `GroundPlayer` when stamina is below 10 and the character is airborne (4806). The loop that calls `update()` was not read.

## 2. Key functions

- `calculateMaxHealthManaStamina`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/PlayerCharacter.java` 4278-4390. Level bands at 4322-4340, pools at 4352-4354, clamp at 4374-4387.
- `calculateModifiedStats` and `getDexPenalty`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/PlayerCharacter.java` 3684-3741. Callers of `calculateModifiedStats` were not all read; the one place it is called from update paths is not checked here.
- `updateRegen`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/PlayerCharacter.java` 4987-5180. Early exit at 4994-4998; state switch from 5000; delta multipliers at 5130-5132; CAS loop 5133-5165; timestamp reset 5178-5179.
- `updateStamRegen`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/PlayerCharacter.java` 5183-5275 (middle not read), returns at once because `disable = true` (5185-5187). Not live; not ported.
- `calculateModifiedAmount`, `calculateAmountAfterTrains`, `train`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/CharacterSkill.java` 1069-1124, 1131-1148, 717-760.
- Swing stamina gate and cost: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/gameManager/CombatManager.java` 414-430 and 560-590.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Pool = level curve x (0.3 + k x stat) + stat + race | 0.3 and 0.005 (4352-4354); fallback base mods 15 / 5 / 1 used only if no class (4282-4284). Real class and race values are database data, not read. |
| Skill-based multiplier on pools | Toughness / 400 (4352); Athletics / 300 (4354); both truncated to integers first (4352, 4354) |
| Six-band level curve | Breakpoints 10, 20, 30, 40, 50, 60; slopes 0.8, 0.6, 0.4, 0.2, 0.1 per level (4322-4340) |
| Dex loss from armour | Per-item column, summed over six slots, then 1 - sum/100 (3741) |
| Swing cost | 0.5 bare; weight / 3, minimum 1 (579-583) |
| Swing refusal | Below 1 bare; below weapon weight (424-426) |
| Regen per second | Idle +0.2; sit +2; combat run -0.65; out-of-combat run -0.4; swim -1 (320, 319, 322, 323, 324) |
| Health regen | 0.000666667 x max + 0.0666667 per second when idle (298, 5005) |
| Skill base | 7 + table[0.5 + sum(mod x stat / 100)], 601-entry table (994-995, 1010, 192) |
| Train bonus curve | 2 / 1 / 0.5 / 1/3 per train at 10, 90, 134 (1140-1146) |
| Train cap | Intelligence-indexed table, 1-190 (30, 724-727); formula beyond (710) |

### 3b. Catalogue rows (SK-FOCUS table format)

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| Strength, Dexterity, Constitution, Intelligence, Spirit (base) | core attributes, set at creation and changed on advancement | `statXBase` fields; creation sets Str, Dex, Con (not read: values are data) | creation values not read | current floored at 1 | PlayerCharacter.java 3588-3590 (creation), 3684-3717 |
| Attribute current | base + flat effect bonus, then percent bonus; Dex also x armour factor | `round(base + flat) x (1 + pct)`; Dex x `dexPenalty` before pct | not read | floor 1 | PlayerCharacter.java 3689-3713 |
| Armour dex penalty | Dex lost to worn armour, six slots | `1 - sum(item dexPenalty) / 100` | per-item values in database (not read) | none on the sum (risk, section 6) | PlayerCharacter.java 3734-3741; ItemBase.java 111, 837 |
| Health max | max hit points | `((f x classHP + g x promoHP) x (0.3 + 0.005 x Con) + (Con + raceHP)) x (1 + trunc(Toughness)/400)` | level bands per section 1(a); class default 15 (4282) | floor 1 | PlayerCharacter.java 4282, 4322-4352, 4374 |
| Stamina max | max stamina | `((f x classSTA + g x promoSTA) x (0.3 + 0.005 x Con) + (Con + raceSTA)) x (1 + trunc(Athletics)/300)` | class default 1 (4284) | floor 0 | PlayerCharacter.java 4284, 4354 |
| Mana max | max mana | `(f x classMP + g x promoMP) x (0.3 + 0.005 x Spi) + (Spi + raceMP)` | class default 5 (4283) | floor 0 | PlayerCharacter.java 4283, 4353 |
| Level band weights | level-equivalent f and promotion-equivalent g | six bands, breakpoints 10/20/30/40/50/60 | f = 39 + 0.1 per level above 59 (no cap read) | none in code | PlayerCharacter.java 4322-4340 |
| Swing stamina cost | stamina taken per melee swing | bare 0.5; weapon `max(1, weight/3)` | weight units not read | refused when stamina below weapon weight | CombatManager.java 424-426, 579-583 |
| Stamina regen by state | per-second stamina rate | idle +0.2; sit +2; run combat -0.65; run out of combat -0.4; swim -1 | as listed | clamped to [0, max] | MBServerStatics.java 319-324; PlayerCharacter.java 5005-5165 |
| Health regen (idle) | per-second health rate | `max x 0.000666667 + 0.0666667` | comment: full in about 25 min | clamped to max | MBServerStatics.java 298-306; PlayerCharacter.java 5005 |
| Mana regen (idle) | per-second mana rate | `max x 0.00166667` (not while casting, except walk mode) | comment: full in about 10 min | clamped to max | MBServerStatics.java 316; PlayerCharacter.java 5011-5013 |
| Skill base | base amount of any skill from stats | `7 + table[trunc(clamp(0.5 + sum(mod x stat/100), 1, 600))]` | table 0.0 at index 0 up to 247.0 at 600 | index clamped 1-600 | CharacterSkill.java 994-1010, 192 |
| Train bonus | added by trained points | 2/train below 10; 1/train 10-89; 1/2 per train 90-133; 1/3 per train from 134 | 0 to 122 at 134 trains | none beyond the curve | CharacterSkill.java 1139-1146 |
| Train cap | maximum trains per skill | table by base Int for 1-190; `33 + 1.25 Int - 0.005 Int^2` beyond | table 29 (index 0) to 168 (index 190) | cap = f(Int) | CharacterSkill.java 30-69, 706-727 |
| Toughness (skill) | scales max health | `x (1 + trunc(T)/400)` | skill amount (no range read) | none in code | PlayerCharacter.java 4346-4352 |
| Athletics (skill) | scales max stamina | `x (1 + trunc(A)/300)` | skill amount (no range read) | none in code | PlayerCharacter.java 4348-4354 |
| Skill percent (display) | percent shown for a skill | 2 per train to 10; +1 per train to 90; slope 0.5 to 130; slope 0.33 beyond | 0 to about 120 | none | CharacterSkill.java 1196-1205 |
| Luck | none | no Luck attribute in the enum (Enum.java 806-900 read: Constitution, Dexterity, Intelligence, Spirit, Strength) | none | none | Enum.java 806-900 |

Not read in this pass, so no rows: poise, stagger and crowd control; block, parry and riposte windows; damage types against armour; hit location and wounds; armour per slot; weapon attributes beyond weight; level-50 and rank power budget; magic schools and resistances; social skills; coach or stat-sheet view.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's formula order (level weights, pools, clamps, swing gate and cost, per-second regen, skill base, train bonus, train cap). It omits the rune and effect percent bonuses, the armour dex penalty, the donor's own display-percent code (its `skillPercentShown` is a stand-in that reuses `trainBonus`), the timestamp reset and the early exits, the drowning state, and the 190-entry and 601-entry tables (they are passed in as data). Class, race and promotion values are parameters, not donor numbers. Two donor defects are fixed in the sketch, as section 6 describes: regen caps the delta at 1 s (`regenStamina`), and the displayed skill percent uses the amount's curve (`skillPercentShown`). The sketch is clean-room in shape: the formulas are the donor's, the code is written fresh.

```ts
// Licence: MIT (donor LICENSE). Written from the formulas read in PlayerCharacter.java, CombatManager.java and CharacterSkill.java; not a line-by-line translation.
// Frankendom target: src/fight/stats.ts (pools, swing cost, regen, skill amount). Values come from catalogue data, not constants.

export interface Mods { hp: number; mana: number; stam: number; }

export interface PoolInput {
  level: number;
  promoted: boolean;
  con: number;          // current Constitution
  spi: number;          // current Spirit
  toughness: number;    // skill amount
  athletics: number;    // skill amount
  classBase: Mods;      // per class (catalogue data)
  classPromo: Mods;     // per promotion (catalogue data)
  race: Mods;           // per race (catalogue data)
}

export interface Pools { hp: number; mana: number; stam: number; }

// Level weights f (level-equivalent) and g (promotion-equivalent), six bands.
export function levelWeights(level: number, promoted: boolean): { f: number; g: number } {
  if (level < 10 || !promoted) return { f: level, g: 0 };
  if (level < 20) return { f: level, g: level - 9 };
  if (level < 30) return { f: 19 + (level - 19) * 0.8, g: 10 + (level - 19) * 0.8 };
  if (level < 40) return { f: 27 + (level - 29) * 0.6, g: 18 + (level - 29) * 0.6 };
  if (level < 50) return { f: 33 + (level - 39) * 0.4, g: 24 + (level - 39) * 0.4 };
  if (level < 60) return { f: 37 + (level - 49) * 0.2, g: 28 + (level - 49) * 0.2 };
  return { f: 39 + (level - 59) * 0.1, g: 30 + (level - 59) * 0.1 };
}

export function pools(p: PoolInput): Pools {
  const { f, g } = levelWeights(p.level, p.promoted);
  const conMul = 0.3 + 0.005 * p.con;
  const spiMul = 0.3 + 0.005 * p.spi;
  const tough = Math.trunc(p.toughness);
  const ath = Math.trunc(p.athletics);
  const hp = ((f * p.classBase.hp + g * p.classPromo.hp) * conMul + (p.con + p.race.hp)) * (1 + tough / 400);
  const mana = (f * p.classBase.mana + g * p.classPromo.mana) * spiMul + (p.spi + p.race.mana);
  const stam = ((f * p.classBase.stam + g * p.classPromo.stam) * conMul + (p.con + p.race.stam)) * (1 + ath / 300);
  return { hp: hp > 0 ? hp : 1, mana: mana > -1 ? mana : 0, stam: stam > -1 ? stam : 0 };
}

// Swing gate and cost. weaponWeight null = bare hands.
export function canSwing(stamina: number, weaponWeight: number | null): boolean {
  return weaponWeight === null ? stamina >= 1 : stamina >= weaponWeight;
}

export function swingCost(weaponWeight: number | null): number {
  if (weaponWeight === null) return 0.5;
  const c = weaponWeight / 3;
  return c < 1 ? 1 : c;
}

// Regen: rate per second times seconds since the last stamina update, clamped to [0, max].
// Fix (donor defect): the delta is capped at 1 s, so a long gap cannot apply all at once.
export function regenStamina(stam: number, max: number, ratePerSec: number, dtSec: number): number {
  const dt = dtSec > 1 ? 1 : dtSec;
  const next = stam + ratePerSec * dt;
  return next > max ? max : next < 0 ? 0 : next;
}

// Skill amount: base 7 + table at a stat-weighted index, plus a train bonus curve.
export function skillBase(weightedStat: number, table: readonly number[]): number {
  let idx = weightedStat;
  if (idx < 1) idx = 1;
  else if (idx > 600) idx = 600;
  return 7 + table[Math.trunc(idx)];
}

export function trainBonus(trains: number): number {
  if (trains < 10) return trains * 2;
  if (trains < 90) return 10 + trains;
  if (trains < 134) return 100 + Math.trunc((trains - 90) / 2);
  return 122 + Math.trunc((trains - 134) / 3);
}

// Fix (donor defect): the displayed percent comes from the same curve as the amount, so the two cannot drift.
export function skillPercentShown(trains: number): number {
  return trainBonus(trains);
}

// Train cap by base Intelligence: table for 1..190, donor formula beyond.
export function trainCap(intelligence: number, table: readonly number[]): number {
  if (intelligence > 0 && intelligence < 191) return table[intelligence];
  return Math.trunc(33 + 1.25 * intelligence - 0.005 * intelligence * intelligence);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/stats.ts` (new): pool formula, swing cost and gate, per-second regen, skill amount and train cap as pure functions the server calls. Pool and cost values are catalogue data (class, race, weapon weight, skill tables).
- Parity-checklist row 21 (catalogue fields): the per-class and per-race pool mods, the level-band breakpoints, the skill tables and the regen rates all become catalogue fields. The stamina gate itself belongs to row 3 (guard, parry, stamina); this note does not claim row 3.
- today: not checked in this pass (the Frankendom repo was not opened).
- Reuse tag: rewrite-from-idea (MIT: adaptable; the sketch is written from the formulas).
- Brief rule served: Frankendom rulings: one engine, server-verified state (pools and swing cost computed on the server), data-driven values (row 21); rules 7-9 n/a.

## 6. Gaps and risks

- Defect, skill display vs amount: above 130 trains the display percent uses its own slope and truncation (1204: `120 - ((trains - 130) x -0.33000001)`), while the amount uses 1146: `122 + ((trains - 134) / 3)`. At 134 trains the display gives 121 (120 + 1.32, truncated), the amount gives 122. Fix: compute the display from the same function as the amount. Keep the idea.
- Defect, unbounded regen delta: `updateRegen` returns early when the character is dead, inactive or at the origin (4997), before the timestamp reset at 5178-5179. The first update after such a gap applies the whole elapsed time (clamped only at max or zero). Fix: cap the delta (for example at 1 s) and reset the timestamps on every path.
- Dead code: `updateStamRegen` (5183-5260) is a time-scaled stamina regen that returns at once (`disable = true`, 5185). It duplicates the live path. Do not port it.
- Armour penalty can exceed 100. The sum of item penalties is not capped (3741); a sum over 100 gives a factor at or below zero, and the floor of 1 (3713) hides it. Fix: cap the total penalty as a data field and report it.
- Two sets of stats: skill base uses the `...Base` stats (994-1010), the modified amount uses the `...Current` stats (1087-1102). Frankendom must pick one. Pools use `Current` (4352-4354).
- The level curve is hard-coded in six bands (4322-4340). Frankendom needs the power budget per level as a data curve, not as these constants.
- Stamina is a melee economy: the swing cost is weight / 3, so a heavy weapon costs more per swing, not more per second. Whether this suits a fast mobile fight depends on the weapon weight units in item data, which were not read. At 0.2 stamina per second idle, a 3-weight weapon's swing costs 1 stamina, five seconds of idle regen.
- Magic and mental stats: mana has no skill term (4353), and spell power, schools and resistances were not read. The enum names (Enum.java 806-900: Necromancy, Sorcery, Theurgy, Thaumaturgy, Mental and others) show that schools exist. Not claimed.
- `getTrainingCost` (776-826) uses a log, pow and scalb chain; its values were not checked.

Reuse tag: rewrite-from-idea (MIT)
Brief rule served: Frankendom rulings (one engine, server-verified state, data-driven values); parity row 21
