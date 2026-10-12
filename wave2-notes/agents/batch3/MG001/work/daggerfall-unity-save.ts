// Licence: MIT (donor LICENSE: Copyright (c) 2009-2023 Daggerfall Workshop). Shape adapted from the donor SavingThrow chain.
export type Tolerance = "normal" | "resistant" | "lowTolerance" | "criticalWeakness" | "immune";

export interface SaveInput {
  base: number;          // donor: 50
  tolerance: Tolerance;  // donor: race/career tolerance steps
  bioMod: number;        // donor: biography modifier (player only)
  modifier: number;      // donor: per-effect resistance modifier from the caller
  willpower: number;     // donor: MagicResist = floor(willpower / 10)
  hardImmune: boolean;   // FIX: immunity as a final override (donor sets 100, later steps can lower it)
}

const TOLERANCE_STEP: Record<Tolerance, number> = {
  normal: 0,
  resistant: 25,
  lowTolerance: -25,
  criticalWeakness: -50,
  immune: 50,
};

// Returns the save chance clamped to 5..95, or "immune" (full save) before MagicResist is added.
export function saveChance(i: SaveInput): number | "immune" {
  if (i.hardImmune) return "immune";
  let s = i.base + TOLERANCE_STEP[i.tolerance] + i.bioMod + i.modifier;
  if (s >= 100) return "immune";              // donor: returns 0 here, before MagicResist
  s += Math.floor(i.willpower / 10);          // donor: MagicResist
  return Math.min(95, Math.max(5, s));        // donor: clamp 5..95
}

// roll is 1..100. Returns percent of damage or duration kept (0..100).
export function keptPercent(save: number | "immune", roll: number): number {
  if (save === "immune") return 0;
  if (roll > save) return 100;                           // failed save: full effect
  if (save - 20 <= roll) return 100 - 5 * (save - roll); // prorated band: 0% at save-20, 100% at save
  return 0;                                              // deep save: no effect
}

// Per-element pre-roll (donor FormulaHelper: Dice100.SuccessRoll(chance)); roll is 1..100.
export function precheckResists(chance: number, roll: number): boolean {
  return roll <= chance;
}

// One magnitude after the save. amount is the rolled magnitude before the save.
export function scaledMagnitude(amount: number, i: SaveInput, roll: number, precheck: { chance: number; roll: number }): number {
  if (precheck.chance > 0 && precheckResists(precheck.chance, precheck.roll)) return 0;
  return Math.trunc((amount * keptPercent(saveChance(i), roll)) / 100);
}

export interface EffectCostParams {
  offsetGold: number;
  costA: number;
  costB: number;
  base: number;      // donor: DurationBase / ChanceBase / average of magnitude min and max
  plus: number;      // donor: DurationPlus / ChancePlus / average of magnitude plus min and max
  perLevel: number;
}

// Gold cost of one effect component set. FIX: perLevel floored at 1 (donor divides with no guard).
export function effectGold(p: EffectCostParams): number {
  const perLevel = Math.max(1, p.perLevel);
  return Math.trunc(p.offsetGold + p.costA * p.base + p.costB * Math.trunc(p.plus / perLevel));
}

// Spell points from gold and caster skill (donor: gold * (110 - skill) / 400).
export function effectSpellPoints(gold: number, skill: number): number {
  return Math.trunc((gold * (110 - skill)) / 400);
}

const TARGET_MULT = { self: 1.0, touch: 1.0, singleAtRange: 1.5, areaAroundCaster: 2.0, areaAtRange: 2.5 } as const;

// Whole-spell cost: sum of effect points, times the target multiplier, floor 5.
export function spellCost(effectPoints: number[], target: keyof typeof TARGET_MULT): number {
  const sum = effectPoints.reduce((a, b) => a + b, 0);
  return Math.max(5, Math.trunc(sum * TARGET_MULT[target]));
}

export {};
