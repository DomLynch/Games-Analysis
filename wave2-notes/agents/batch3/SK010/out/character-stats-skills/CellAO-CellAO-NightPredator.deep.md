# CellAO-CellAO-NightPredator (character-stats-skills, cell 21)

Donor: `/mnt/frankendom-donors/CellAO-CellAO-NightPredator/CellAO/Libraries/Source/CellAO.Stats/SpecialStats/StatSkill.cs` (with `SkillTrickleTable.cs`, `Stat.cs`, `SkillUpdate.cs`, `Stats.cs`, `SpecialStats/StatHitPoints.cs`) | Licence: BSD-3-Clause, "Copyright (c) 2005-2014, CellAO Team" (the three-clause text appears in the CellAO.Stats headers: SkillTrickleTable.cs:9-14, Stat.cs:9-14). Caveat: other folders are not BSD: `Libraries/Source/Cell.Core/CellDef.cs:11-12` is GNU GPL "version 2 ... (at your option) any later version", and there is no top-level LICENSE file | C# | symbol `StatSkill.Trickle`

Checked: Read in full: `SkillTrickleTable.cs` table (all 72 rows, weight sums counted with awk on the VPS), `StatSkill.cs` Trickle getter (79-99), `Stat.cs` value stack (GetValue 202-209, Modifier, PercentageModifier, BaseValue setters), `SkillUpdate.cs` CalculateHitPoints (54-94), CalculateIP (102-226, the attribute and skill loops; the professionMatrix at 181), CalculateNanoPoints (228-268), `SpecialStats/StatHitPoints.cs` (GetMaxValue, 85), `Stats.cs` dependency wiring (SetAbilityTricklers 11797-11830; constructor call 4321), `CellAO.Enums/StatIds.cs` ids 16-21. Confidence: high for the trickle formula, the value stack and the HP and nano formulas. Data read: `Server/ZoneEngine/XML Data/Stats.xml` (708 stat entries; ability ids 16-21 have default 0; sampled skill ids 100-103 and 135 have default 5; no trickle weights in it, so the weights come only from SkillTrickleTable.cs). Not read: `Stats.cs` as a whole (only the wiring), `StatLife.cs`, `XPTable.cs`, `Perks.xml`, `Datafiles/*.dat`, and the ZoneEngine skill and combat code. No CellAO combat code (damage, hit chance, dodge) was read, so this note covers stats and skills only. Units and caps: no sheet data for profession or breed tables beyond the arrays in code. camera: not a camera topic.

Best transferable idea: Make each skill a row of six ability weights that sum to 1, so a skill's trickle is floor((weighted ability sum) / 4) and recomputed live from the current abilities on every read, which turns build choices into data rows instead of code.
Decision (proposed): adapt — keep the weighted-ability-to-skill row and the live recomputation; drop the separate dependency lists (never read in this donor); enforce the weights-sum-to-1 rule in a test (the donor's row 135 breaks it); fix the cost-table lookup for profession index 12.
Acceptance: A server test asserts every skill row sums to 1 (it fails on the donor's row 135) and that a 40-point strength rise on a skill with strength weight 0.2 adds exactly 2 to that skill's trickle (floor(0.2 x 40 / 4)).

## 1. Mechanism

The stat value is a stack, then a skill's trickle is a weighted read of the abilities, then the derived pools read the stack. Order in the donor:

(a) Value stack (`Stat.GetValue`, Stat.cs 206-208): Value = floor((BaseValue + Modifier + Trickle) x PercentageModifier / 100). PercentageModifier starts at 100 and is commented "From Items/Perks/Nanos" (Stat.cs:122). Modifier is one additive bucket. The Modifier and PercentageModifier setters set ReCalculate and read Value again when the value changes (Stat.cs, those two setters).

(b) Trickle for a skill (`StatSkill.Trickle` getter, StatSkill.cs 79-99): pick the row for the skill (row index = skill id - 100, SkillTrickleTable.cs 42-80); take the six weights for strength, agility, stamina, intelligence, sense, psychic (columns 1-6, StatSkill.cs 83-88); sum weight x current ability Value; divide by 4 and floor (98). The getter reads the ability Values live on every call, so nothing is cached and nothing can go stale.

(c) Table rules. Each row is a skill id then six weights. Sixty-seven of the 68 rows for ids 100-167 sum to exactly 1.0. Row 135 (SkillTrickleTable.cs:61) sums to 1.1. Four extra rows at the end (ids 1, 221, 343, 364; lines 78-79) carry weights of 1e-8. Those four are never read by the getter (they sit past index 67), but the comment at line 80 says they were commented out and still "mess up other parts".

(d) Derived pools. HP max = breed base + level x (profession-by-title table cell + breed modifier) + body development x breed multiplier (SkillUpdate.cs 77-93); the table is declared at line 56 and indexed by title level and profession. The result is capped by the life stat (StatHitPoints.cs:85). The nano pool has the same shape with the nano-energy pool as its third term (SkillUpdate.cs 251-266).

(e) Spend cost (`CalculateIP`, SkillUpdate.cs 102-226). Abilities: for each of the six abilities, cost = attribute factor x c2, summed for c2 from the breed's base value to the current value minus 1 (206). Skills: for each of 69 rows, cost = floor(factor x c2) summed for c2 from 5 to the current value minus 1 (215). The skill factor column is picked by professionMatrix (181). A profession whose matrix entry is -1 reads column 0 (the skill id) as its factor (defect, section 6).

(f) Dependency wiring (`Stats.SetAbilityTricklers`, Stats.cs 11797-11829; called from the constructor at 4321). It appends each skill id to the `Affects` list of the abilities whose weight column is positive. Nothing in the CellAO tree reads `Affects` (the only uses are the definition at Stat.cs:174 and the Add calls). The live getter makes this wiring unnecessary today, but its column order is wrong (section 6).

## 2. Key functions

- `StatSkill.Trickle` (get): StatSkill.cs 79-99. The weighted read and the /4 floor.
- `Stat.GetValue` (Stat.cs 202-208): the stack.
- `SkillUpdate.CalculateHitPoints` (SkillUpdate.cs 54-93): HP max.
- `SkillUpdate.CalculateIP` (SkillUpdate.cs 102; loops at 206 and 215): ability and skill spend cost.
- `SkillUpdate.CalculateNanoPoints` (SkillUpdate.cs 228; formula 251-266): nano pool.
- `Stats.SetAbilityTricklers` (Stats.cs 11797-11829): dependency lists.
- `StatHitPoints.GetMaxValue` (SpecialStats/StatHitPoints.cs 85): HP capped by life.

## 3. Numbers vs mechanism

Stat table (name | what it does | formula | number ranges | caps | file:line). Values marked data are in the donor's arrays; sheet values are not present.

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| strength (id 16) | ability; weight on skills in column 1 | raw Value (base + modifiers); feeds trickle | ability values as stored (data) | none in this library | StatIds.cs:104; StatSkill.cs:83 |
| agility (id 17) | ability; weight on skills in column 2 (getter) | raw Value | as stored | none | StatSkill.cs:84 |
| stamina (id 18) | ability; weight in column 3 (getter) | raw Value | as stored | none | StatSkill.cs:85 |
| intelligence (id 19) | ability; weight in column 4 (getter) | raw Value | as stored | none | StatSkill.cs:86 |
| sense (id 20) | ability; weight in column 5 (getter) | raw Value | as stored | none | StatSkill.cs:87 |
| psychic (id 21) | ability; weight in column 6 (getter) | raw Value | as stored | none | StatIds.cs:124; StatSkill.cs:88 |
| skill trickle | ability-derived skill part | floor(sum of w_i x ability_i / 4) | 0 to about a quarter of the highest ability (rows sum to 1) | none (row 135 sums to 1.1) | StatSkill.cs:79-98; SkillTrickleTable.cs:42-61 |
| skill value | final skill | floor((Base + Modifier + Trickle) x Percentage / 100) | Percentage 100 by default | none | Stat.cs:122, 206-208 |
| HP max | derived pool | breed base + level x (title-table cell + breed mod) + body x breed mult, then min with life | breed base 10/15/10/25; breed mod 0/-1/-1/0; breed mult 3/3/2/4 (SkillUpdate.cs 77-79, 89-93); title-table cells data (56) | capped by life (StatHitPoints.cs:85) | SkillUpdate.cs:54-94; StatHitPoints.cs:85 |
| nano pool | derived pool | breed base + level x (title-table cell + breed mod) + nano-energy pool x breed mult | breed base 10/10/15/8; breed mult 3/3/4/2; breed mod 0/-1/1/-2 (SkillUpdate.cs 251-266) | none read | SkillUpdate.cs:228-268 |
| ability spend cost | cost to raise an ability | sum of attributeCost[breed] x c2 for c2 from breed base to value - 1 | factor per breed (data, declared at SkillUpdate.cs:182) | none | SkillUpdate.cs:206 |
| skill spend cost | cost to raise a skill | sum of floor(factor x c2) for c2 from 5 to value - 1 | factors for 69 skills (data) | none read | SkillUpdate.cs:215 |
| profession matrix | picks the skill cost column | index per profession, -1 for profession 13 | 15 entries | none | SkillUpdate.cs:181 |
| level | scales HP and nano pools | stat value; title level indexes the table | title levels 1-7 (table rows, SkillUpdate.cs:56) | none | SkillUpdate.cs:90 |
| breed base abilities | starting abilities per breed | array of seven rows | breed 1 all 6; other rows use 3, 6, 10 and 15 | none | SkillUpdate.cs:189 |
| luck | none | no luck stat in CellAO.Stats (not searched further than the library) | n/a | n/a | not found |
| magic / mental pools | nano pool and psychic ability | nano pool above; psychic is the ability | as above | none | SkillUpdate.cs:228-268; StatIds.cs:124 |

Notes on the numbers: the abilities have no caps in this library; the HP and nano formulas are integer-valued with a floor of the stack in Value; the trickle divisor of 4 is a fixed constant in the getter, not a data field.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: check the weights, read the live abilities, floor the trickle, apply the stat stack, and compute HP capped by life. It omits the dependency wiring (no reader in the donor), the spend-cost tables, the nano pool, the modifier change events and the playfield announcements, and it puts the table cells in as parameters instead of arrays. It adds the sum-to-1 check that the donor lacks.

```ts
// Licence: BSD-3-Clause (CellAO Team, donor CellAO.Stats headers). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Ability = 'strength' | 'agility' | 'stamina' | 'intelligence' | 'sense' | 'psychic';
const ABILITIES: Ability[] = ['strength', 'agility', 'stamina', 'intelligence', 'sense', 'psychic'];

type Weights = Record<Ability, number>;
type Abilities = Record<Ability, number>;

const TRICKLE_DIVISOR = 4; // fixed in the donor getter (StatSkill.cs:98)

// One skill's trickle row. The donor keeps these as a numeric table (SkillTrickleTable.cs); every row it
// uses sums to 1 except row 135 (sums to 1.1), so the check below fails for that row.
function checkWeights(skillId: number, w: Weights): void {
  const sum = ABILITIES.reduce((acc, k) => acc + w[k], 0);
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`skill ${skillId}: weights sum to ${sum}, expected 1`);
  }
}

// Trickle is recomputed live from the current ability values on every read, so no cache can go stale.
function skillTrickle(w: Weights, a: Abilities): number {
  let s = 0;
  for (const k of ABILITIES) s += w[k] * a[k];
  return Math.floor(s / TRICKLE_DIVISOR);
}

// Stat value stack: base, then one additive modifier and the trickle, then the percentage (100 by default).
function statValue(base: number, modifier: number, trickle: number, percent: number = 100): number {
  return Math.floor((base + modifier + trickle) * percent / 100);
}

interface HpInputs {
  breedBase: number;      // breedBaseHitPoints (SkillUpdate.cs:77)
  breedMod: number;       // breedModificatorHitPoints (79)
  breedMult: number;      // breedMultiplicatorHitPoints (78)
  level: number;          // level Value
  titleTableCell: number; // tableProfessionHitPoints[titlelevel-1, profession-1] (data, SkillUpdate.cs:56)
  bodyDevelopment: number;
  life: number;           // cap from StatHitPoints.cs:85
}

// HP max = breed base + level x (title-table cell + breed modifier) + body development x breed multiplier,
// then capped by the life stat.
function hpMax(i: HpInputs): number {
  const raw = i.breedBase + i.level * (i.titleTableCell + i.breedMod) + i.bodyDevelopment * i.breedMult;
  return Math.min(i.life, raw);
}

// Example weights for one skill (illustrative, not a donor row): 0.2 strength, 0.5 agility, 0.3 psychic.
const exampleWeights: Weights = { strength: 0.2, agility: 0.5, stamina: 0, intelligence: 0, sense: 0, psychic: 0.3 };
checkWeights(100, exampleWeights);
const a: Abilities = { strength: 40, agility: 0, stamina: 0, intelligence: 0, sense: 0, psychic: 0 };
const t = skillTrickle(exampleWeights, a);      // floor(0.2 x 40 / 4) = 2
const v = statValue(10, 0, t, 100);             // 12
const hp = hpMax({ breedBase: 10, breedMod: 0, breedMult: 3, level: 5, titleTableCell: 6, bodyDevelopment: 4, life: 1000 });
export { t, v, hp };
```

Typecheck: `tsc --noEmit --strict --target es2020` run on the VPS (`/tmp/SK010-cellao-trickle.ts`, the same block): exit 0.

## 5. Lands in

TARGET `src/fight/skills.ts` (new module: skill rows of ability weights, live trickle, the stat stack, HP capped by life). It is the one place a skill value is computed, so the duel step and the catalogue read the same number. Parity-checklist row 21 (catalogue fields): each skill row, its weights and the pool formulas become catalogue fields with a data source, not hard-coded numbers.

## 6. Gaps and risks

- Licence: BSD-3-Clause for the CellAO.Stats files read (the clause is in the headers). Code may be adapted, but this sketch is written from the mechanism. Other folders in the donor are GPL-2.0-or-later (Cell.Core), so the licence must be checked per file.
- Data defect, row 135: its weights sum to 1.1 (SkillTrickleTable.cs:61), so skill 135 gets about 10% more trickle than its neighbours for the same abilities. Fix: a sum-to-1 test on every row, as in the sketch.
- Wiring defect, column order: `SetAbilityTricklers` maps column 2 to stamina, column 3 to sense, column 4 to agility and column 5 to intelligence (Stats.cs 11804-11829). The getter maps column 2 to agility, column 3 to stamina, column 4 to intelligence and column 5 to sense (StatSkill.cs 84-87). The stat ids (StatIds.cs 104-124) follow the getter's order. So four of six dependency lists are wrong. Harmless today because nothing reads `Affects` and the getter is live; it would become stale state the day someone caches the trickle. Fix: one named column map used by both, or drop the lists.
- Table hygiene: rows for ids 1, 221, 343 and 364 carry weights of 1e-8 (SkillTrickleTable.cs:78 and the rows beside it). Id 1 is the life stat (Stats.md), so the wiring would add life as a dependent of strength. Fix: remove the rows; they are not read by the getter.
- Defect, profession index 12: `professionMatrix` maps profession 13 to -1 (SkillUpdate.cs:181). The skill-cost lookup adds 1 to the matrix value, so for that profession it reads column 0 (the skill id) as the cost factor (line 215). The cost becomes the skill id times each point, not a price. Fix: a validated profession table with no -1 entries, and a test per profession.
- Risk, monster breeds: the breed arrays have four entries (SkillUpdate.cs:77, 79) and the baseAttributes table has seven rows with a TODO for monster breeds (line 188). `attributeCost[counter, breed]` has five columns, so a breed index of 5 or more would read out of range in `CalculateIP`. Not triggered by the player path (not checked). Frankendom's monsters must not use these arrays without bounds.
- Caps: the library has no skill cap or ability cap. The ability and skill caps, if any, are in the zone server or the sheet data (not read).
- Frankendom ruling: the skill value is a server value (kills are server-verified). Keep the live computation on the server; the client reads the stack.
- Not read: XP tables (XPTable.cs), StatLife.cs, combat formulas (damage, dodge, hit chance) in the ZoneEngine, and the trade-skill code. A later pass should read the combat side before it is used for the fight rows.

Reuse tag: adapt-idea (BSD-3-Clause, CellAO Team; code may be adapted, sketch clean-room)
Brief rule served: 1 (one engine computes the stat stack and the skill value; the client only reads it); the parity row is 21 (catalogue fields), and the table above is the catalogue input (SK-FOCUS items 1, 2, 9 and 12 partly).
