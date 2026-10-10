// clean-room: shape of the rule only, written from the described mechanism, not a translation.
// Saturating experience bonus: rises quickly at first, approaches a per-unit cap, never reaches it.
const CURVE_K = 3;      // donor constant in 3x / (1 + 3x)
const XP_GRADE = 0.01;  // donor sets the engine experience step to 0.01

function xpBonus(xp: number, cap: number): number {
  const k = CURVE_K * xp;
  return cap * (k / (1 + k));
}

// Named-source multiply stack: each source owns one factor; passing null clears that source only.
type Factors = Map<string, number>;

function setSourceMultiplier(factors: Factors, source: string, mult: number | null): void {
  if (mult === null) factors.delete(source);
  else factors.set(source, mult);
}

function composeMultiplier(factors: Factors): number {
  let m = 1;
  for (const v of factors.values()) m *= v;
  return m;
}

interface Hero {
  xp: number;
  cap: number;           // per-unit cap (donor: customParams.rangexpscale)
  rangeFactors: Factors; // range multipliers, keyed by source name
}

// Each experience step re-derives the bonus from the total, under one source name.
// Repeat calls replace the source's factor rather than stacking another one.
function onExperience(hero: Hero, newXp: number): void {
  hero.xp = Math.floor(newXp / XP_GRADE) * XP_GRADE;
  setSourceMultiplier(hero.rangeFactors, "xp_range_bonus", 1 + xpBonus(hero.xp, hero.cap));
}

export {};
