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
