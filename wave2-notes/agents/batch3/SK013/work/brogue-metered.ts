// Licence: GNU AGPL-3.0 (donor LICENSE.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface MeteredRow {
  initialFrequency: number;   // starting weight (memory is set to this at run start)
  incrementFrequency: number; // added once per generated level; 0 = not biased
  decrementFrequency: number; // removed each time one is generated
  genMultiplier: number;      // threshold: spawned x multiplier + increment must stay below depth x scale + offset
  genIncrement: number;
  levelScaling: number;       // 0 = no threshold forcing
  levelGuarantee: number;     // 0 = off; otherwise force this kind on exactly this depth
  itemNumberGuarantee: number; // ... while fewer than this many have spawned
}
interface MeteredState { frequency: number; spawned: number; }

// Roll helper: roll(a, b) returns an integer in [a, b] from the engine's seeded stream (not Math.random).
type Roll = (a: number, b: number) => number;

// Once per generated level, before any item is placed.
function addLevelIncrement(state: MeteredState[], rows: MeteredRow[]): void {
  rows.forEach((r, j) => {
    if (r.incrementFrequency !== 0) state[j].frequency += r.incrementFrequency;
  });
}

// Depth offset: zero on depths 1 and 2; otherwise the sum of two rolls of -1..1 (so -2..2).
function depthOffset(depth: number, roll: Roll): number {
  if (depth <= 2) return 0;
  return roll(-1, 1) + roll(-1, 1);
}

// Forcing: ONE loop over the rows, both tests inside it, so row order interleaves them (the earlier row wins whichever test fires).
// Per row: the depth-schedule threshold first, then the by-level guarantee.
function forcedMetered(rows: MeteredRow[], state: MeteredState[], depth: number, offset: number): number | null {
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    if (r.levelScaling !== 0 && state[j].spawned * r.genMultiplier + r.genIncrement < depth * r.levelScaling + offset) {
      return j;
    }
    if (depth === r.levelGuarantee && state[j].spawned < r.itemNumberGuarantee) {
      return j;
    }
  }
  return null;
}

// Weighted pick. Non-positive weights count as 0. Returns the chosen index.
function pickWeighted(weights: number[], roll: Roll): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  let r = roll(1, total);
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i]);
    if (r <= w) return i;
    r -= w;
  }
  return weights.length - 1;
}

// When a metered kind is generated: its weight drops and its count rises.
function onGenerated(state: MeteredState[], rows: MeteredRow[], j: number): void {
  state[j].frequency -= rows[j].decrementFrequency;
  state[j].spawned += 1;
}

// One item: metered rows take their weight from memory; a threshold or guarantee forces a kind; otherwise a weighted pick.
// allowForce is false when the food guarantee fired for this item or the level is past the amulet depth: the donor only forces metered kinds in the branch where neither applies (food wins first).
// simplified: metered rows are assumed to occupy the first rows.length kind indices; the donor keeps separate tables and does not model the food guarantee itself, heat-map placement or categories.
function generateKind(rows: MeteredRow[], state: MeteredState[], baseWeights: number[], depth: number, offset: number, roll: Roll, allowForce: boolean): number {
  const weights = baseWeights.slice();
  for (let j = 0; j < rows.length; j++) weights[j] = state[j].frequency;
  let kind = allowForce ? forcedMetered(rows, state, depth, offset) : null;
  if (kind === null) kind = pickWeighted(weights, roll);
  if (kind < rows.length) onGenerated(state, rows, kind);
  return kind;
}

// Strength: a surplus adds 0.25 enchant per point; a deficiency removes 2.5 per point. Weakness lowers strength first.
function strengthModifier(strength: number, weakness: number, required: number): number {
  const diff = strength - weakness - required;
  return diff > 0 ? diff * 0.25 : diff * 2.5;
}

// Net enchant is clamped to [-20, 50].
function netEnchant(enchant: number, strength: number, weakness: number, required: number): number {
  return Math.min(50, Math.max(-20, enchant + strengthModifier(strength, weakness, required)));
}

// Damage and accuracy scale by 1.065 per net enchant point; armour scales hit chance by 0.877 per displayed armour point.
// simplified: floats here; the donor uses 16-bit fixed-point lookup tables at 0.25-point steps.
function damageFactor(net: number): number {
  return Math.pow(1.065, net);
}
function hitChance(accuracy: number, armourDisplayed: number): number {
  return Math.min(100, Math.max(0, accuracy * Math.pow(0.877, armourDisplayed)));
}

// Staff damage range by enchant (donor integer formulas); the clump is the width of the clumped roll inside the range.
function staffDamageRange(enchant: number): { low: number; high: number; clump: number } {
  return {
    low: Math.trunc((2 + enchant) * 3 / 4),
    high: Math.trunc(4 + 5 * enchant / 2),
    clump: 1 + Math.trunc(enchant / 3),
  };
}

export {};
