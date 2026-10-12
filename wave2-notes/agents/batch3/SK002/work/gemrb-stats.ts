// Licence: GPL-2.0-or-later (donor). clean-room sketch from the described rules, not a translation of the donor lines.
export type Ability = "str" | "dex" | "con" | "int" | "wis" | "chr";
export type Rng = (size: number) => number; // returns an integer 1..size

// Ability modifier, the 3E-style rule: value / 2 - 5 (C integer division; scores are >= 0).
export function abilityMod(value: number): number {
  return Math.trunc(value / 2) - 5;
}

// Skill value: derived points plus the ability modifier, but only once trained (base points > 0) or when the
// skill is free-use. An untrained, non-free skill is 0. DEX (modAbility null) is added by a separate table.
export function skillValue(basePoints: number, derivedPoints: number, modAbility: number | null, freeUse: boolean): number {
  let ret = derivedPoints;
  if (basePoints > 0 || freeUse) {
    if (modAbility !== null) ret += modAbility;
  } else {
    ret = 0;
  }
  return Math.max(0, ret);
}

// Luck-weighted roll. Defender luck counts against the roller; each die is shifted by luck and clamped to 1..size.
// Natural 1s and natural maxima are counted first, so a critical can still come out as 1 or the maximum.
export function luckyRoll(
  rng: Rng, luck: number, oppLuck: number, dice: number, size: number, add: number,
  opts: { negative?: boolean; critical?: boolean } = {},
): number {
  let l = luck - oppLuck;
  if (opts.negative) l = -l;
  if (dice < 1 || size < 1) return Math.max(1, add + l);
  let result = 0;
  let misses = 0;
  let hits = 0;
  for (let i = 0; i < dice; i++) {
    const natural = rng(size);
    if (natural === 1) misses++;
    else if (natural === size) hits++;
    result += Math.min(size, Math.max(1, natural + l));
  }
  if (opts.critical && dice === misses) return 1;
  if (opts.critical && dice === hits) return size * dice;
  if (opts.critical && result + add >= size * dice) return size * dice - 1; // luck alone cannot make a crit
  return result + add;
}

// Fatigue: one point per 4 game hours since the last rest, counted by bucket boundaries.
export function fatigueGained(elapsedNow: number, elapsedAtLastCheck: number, hourTicks: number): number {
  const period = 4 * hourTicks;
  return Math.floor(elapsedNow / period) - Math.floor(elapsedAtLastCheck / period);
}

// Weight tiers: 1 = full speed, 2 = half speed, a huge divisor = cannot move. Hostile side (2E) ignores weight.
export function encumbranceFactor(carried: number, maxCarry: number, hostile: boolean, threeE: boolean): number {
  if (carried <= maxCarry || (hostile && !threeE)) return 1;
  if (carried <= maxCarry * 2) return 2;
  return 123456789;
}

export function movementRate(rate: number, factor: number, hostile: boolean, threeE: boolean): number {
  if (hostile && !threeE) return rate;
  return Math.trunc(rate / factor);
}

// Percent resistance (2E style): resisted = trunc(damage * pct / 100). Out-of-range values count as 0.
export function percentResist(damage: number, resistPct: number, maxAbs: number): number {
  const r = Math.abs(resistPct) > maxAbs ? 0 : resistPct;
  return damage - Math.trunc((damage * r) / 100);
}

// Ability set to zero or less: death if the rule is on and the actor has no minimum-stat effect, else held at 1.
export function clampAbility(value: number, deathOnZero: boolean, minimumEffect: boolean): { value: number; dead: boolean } {
  if (value > 0) return { value, dead: false };
  if (deathOnZero && !minimumEffect) return { value, dead: true };
  return { value: 1, dead: false };
}

// Wild-surge level offset: rolled once per cast and reused on every later call in that cast.
// fix: the donor returns 0 on the repeat call (its TODO says so); this sketch returns the cached value.
export interface CastState { wildMod: number | null; }
export function wildMod(st: CastState, rng: Rng, table: number[][], level: number): number {
  if (st.wildMod !== null) return st.wildMod;
  const lvl = Math.min(Math.max(level, 1), table[0].length);
  const row = rng(table.length) - 1;
  st.wildMod = table[row][lvl - 1];
  return st.wildMod;
}

export {};
