// clean-room sketch: per-tile burn timeline, neighbour spread, suppression, size-normalised event rate.
// Licence of donor: GPL-2.0-or-later. Written from the described mechanism, not a line-by-line translation.
// Units: one tick = one in-game day (simulation step), never a frame.

export type Dir = "N" | "S" | "E" | "W";
const DIRS: readonly Dir[] = ["N", "S", "E", "W"];

export interface BurnParams {
  burnDays: number;            // donor FIRE_LENGTH = 6000 ticks
  smokeDays: number;           // donor AFTER_FIRE_LENGTH = 12000 ticks
  spreadEvery: number;         // donor FIRE_DAYS_PER_SPREAD = 150 ticks
  suppressBonus: number;       // extra progress per tick while suppressed (donor: +4)
  coverIgnitionFactor: number; // FIX: multiplier on ignition chance under cover (donor blocks it: 0). No donor default.
}

export type BurnStage = "burning" | "smoking" | "gone";

export interface BurnState {
  stage: BurnStage;
  burned: number;
  smoked: number;
  untilSpread: number;
}

export function startBurn(p: BurnParams, rnd: () => number): BurnState {
  return {
    stage: "burning",
    burned: Math.floor(rnd() * (p.burnDays / 5)), // donor: rand() % (FIRE_LENGTH / 5)
    smoked: 0,
    untilSpread: p.spreadEvery,
  };
}

// One daily step. Order mirrors the donor: stage check first, then progress, then spread.
export function dayTick(
  s: BurnState,
  p: BurnParams,
  suppressed: boolean,
  rnd: () => number,
  spread: () => void,
): BurnState {
  const n: BurnState = { ...s };
  if (n.stage === "gone") return n;
  const step = 1 + (suppressed ? p.suppressBonus : 0);
  if (n.stage === "burning" && n.burned > p.burnDays) {
    n.stage = "smoking";
    n.smoked = Math.floor(rnd() * (p.smokeDays / 6));
  }
  if (n.stage === "smoking") {
    n.smoked += step;
    if (n.smoked > p.smokeDays) n.stage = "gone";
    return n; // no spread while smouldering
  }
  n.burned += step;
  n.untilSpread -= 1;
  if (n.untilSpread === 0) {
    n.untilSpread = p.spreadEvery;
    spread();
  }
  return n;
}

export interface Target {
  burnable: boolean;   // a building that can still catch fire
  ignitionPct: number; // donor fire_chance, 0-100
  suppressed: boolean; // under fire-station cover
}

// Donor: rand() % 80 picks N/S/E/W on 4 of 80 rolls; otherwise nothing happens.
export function trySpread(
  rnd: () => number,
  neighbour: (d: Dir) => Target | null,
  p: BurnParams,
): Dir | null {
  const roll = Math.floor(rnd() * 80);
  if (roll >= DIRS.length) return null;
  const d = DIRS[roll];
  const t = neighbour(d);
  if (t === null || !t.burnable) return null;
  const pct = t.suppressed ? t.ignitionPct * p.coverIgnitionFactor : t.ignitionPct;
  if (Math.floor(rnd() * 100) >= pct) return null;
  return d;
}

// Donor simulate.cpp: DAYS_BETWEEN_FIRES*100/len*100/len in integer maths, which is 0 for large maps.
// FIX: float maths, clamped to at least 1 so the modulo below is always defined.
export function strikeEvery(baseDays: number, sideLen: number): number {
  return Math.max(1, Math.floor(((baseDays * 100) / sideLen) * 100 / sideLen));
}

export function strikeDue(tick: number, every: number): boolean {
  return tick % every === 9; // donor offset 9
}

// Donor fire.cpp:144-145: smoke frame = smoking_days * 4 / AFTER_FIRE_LENGTH, capped at 4.
export function smokeFrame(s: BurnState, p: BurnParams): number {
  return Math.min(4, Math.floor((s.smoked * 4) / p.smokeDays));
}

export {};
