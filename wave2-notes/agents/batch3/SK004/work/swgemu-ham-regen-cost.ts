// Licence: AGPL-3.0 (donor COPYING). clean-room sketch written from the described mechanism, not a translation.
// Fixes applied: float damage is kept as float and rounded once (donor casts to int before subtracting, CreatureObjectImplementation.cpp:1203).

type Slot = number; // 0..8; slot % 3 === 0 is a primary (HEALTH/ACTION/MIND), others are secondaries

const REGEN_PER_POINT_PER_SEC = 13 / 2100; // donor rate, per point of current secondary stat per second
const KNEEL_MULT = 1.25;
const SIT_MULT = 1.75;

// Regen tick for one pool, from the current value of the stat that feeds it (CON, STA or WIL).
function regenTick(currentStat: number, seconds: number, posture: "stand" | "kneel" | "sit"): number {
  const mult = posture === "sit" ? SIT_MULT : posture === "kneel" ? KNEEL_MULT : 1;
  const raw = Math.ceil(Math.max(0, currentStat) * REGEN_PER_POINT_PER_SEC * seconds * mult);
  return Math.max(1, raw); // donor: at least 1 per tick
}

// Action cost scaled by the stat that pays it. Neutral at 300; 0 at 1500 and above.
function scaledCost(baseCost: number, stat: number): number {
  const cost = baseCost - ((stat - 300) / 1200) * baseCost;
  return Math.max(0, cost);
}

interface HamState {
  cur: Record<Slot, number>;
  max: Record<Slot, number>;
  base: Record<Slot, number>;
  wounds: Record<Slot, number>;
  shock: number; // 0..1000
}

// One hit on one slot. Primaries floor at 1 unless destroy; secondaries floor at 0.
function applyHit(s: HamState, slot: Slot, dmg: number, destroy: boolean, avoidIncap: boolean): number {
  let v = s.cur[slot] - Math.round(dmg); // single rounding at the end
  if (!destroy && v <= 0) v = 1;
  if (avoidIncap && v <= 0) v = 1;
  if (slot % 3 !== 0 && v < 0) v = 0;
  s.cur[slot] = v;
  return v;
}

// Max of a secondary = base + modifiers - encumbrance of its group (group = floor(slot / 3)).
function secondaryMax(s: HamState, slot: Slot, modifiers: number, encumbrance: Record<number, number>): number {
  const group = Math.floor(slot / 3);
  return s.base[slot] + modifiers - (encumbrance[group] ?? 0);
}

// Disease-style damage over time: absorption cut (capped at 50 percent) and battle-fatigue amplification.
function dotDamage(strength: number, absorptionPct: number, shock: number, headroom: number): number {
  const absorb = Math.min(50, Math.max(0, absorptionPct));
  const raw = strength * (1 - absorb / 100) * (1 + shock / 100);
  return Math.min(Math.round(raw), headroom);
}

// Skill-point ledger: recount from the start pool minus each learned skill's cost; a mismatch resets the stored value.
function recountSkillPoints(stored: number, learnedCosts: number[], start = 250): { value: number; fixed: boolean } {
  const expected = learnedCosts.reduce((acc, c) => acc - c, start);
  return { value: expected, fixed: stored !== expected };
}

export {};
