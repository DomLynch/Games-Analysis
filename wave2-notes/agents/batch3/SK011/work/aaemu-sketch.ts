// Licence: unclear as read (README names LGPL-3.0; LICENSE.GPL is GPL-3.0 text; LICENSE.MIT is MIT, Rain0Ash 2019). Clean-room, shape only: written from the order of operations in Unit.cs, Character.cs and DynamicBonus.cs.
// Frankendom target: src/fight/stats.ts (stat stack and regen step).

export interface Bonus {
  pct: boolean;   // true = percent (value / 100), false = flat
  value: number;
}

// Order: static flat -> dynamic flat -> static percent -> dynamic percent.
// A percent adds value * p / 100 to the running value, so percent bonuses compound.
export function statStack(base: number, statics: readonly Bonus[], dynamics: readonly Bonus[]): number {
  let v = base;
  for (const b of statics) if (!b.pct) v += b.value;
  for (const d of dynamics) if (!d.pct) v += d.value;
  for (const b of statics) if (b.pct) v += (v * b.value) / 100;
  for (const d of dynamics) if (d.pct) v += (v * d.value) / 100;
  return v;
}

// Dynamic bonus ratio: elapsed over duration, clamped to 0..1 (donor DynamicBonus.cs 46-47).
export function elapsedRatio(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  const r = elapsedMs / durationMs;
  return r < 0 ? 0 : r > 1 ? 1 : r;
}

export interface RegenState {
  hp: number;
  maxHp: number;
  carry: number;   // fraction of a point carried between steps
}

// Regen step: rate per second, scaled by the real elapsed time, whole points applied, the fraction carried.
// Fix (donor defect): the donor adds an integer per call and ignores the delta, and its int cast drops rates under 1.
export function regenStep(s: RegenState, ratePerSec: number, dtSec: number): void {
  if (s.hp <= 0 || s.hp >= s.maxHp) return;
  const dt = dtSec > 1 ? 1 : dtSec;   // cap the step at one second
  s.carry += ratePerSec * dt;
  const whole = Math.trunc(s.carry);
  s.carry -= whole;
  s.hp = Math.min(s.maxHp, s.hp + whole);
}

// Battle selects the persistent rate (donor Character.cs 2981-2987).
export function regenRate(inBattle: boolean, outOfBattleRate: number, inBattleRate: number): number {
  return inBattle ? inBattleRate : outOfBattleRate;
}

export {};
