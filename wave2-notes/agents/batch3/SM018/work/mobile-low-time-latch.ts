// Licence: GPL-3.0 (donor). clean-room sketch of the rules, written from the described mechanism.
// clean-room
export const DEFAULT_EMERGENCY_FRACTION = 0.1; // share of the initial time that counts as an emergency

export interface Latch {
  warned: boolean;
}

// Threshold for one side: a fraction of its initial time (the donor uses 10 percent).
export function emergencyThresholdMs(initialMs: number, fraction: number = DEFAULT_EMERGENCY_FRACTION): number {
  return Math.round(initialMs * fraction);
}

// Warn once: only the running side can warn; the latch is set in the same step as the cue.
export function warnIfLow(
  latch: Latch,
  remainingMs: number,
  thresholdMs: number,
  active: boolean,
  play: () => void,
): boolean {
  if (!active || latch.warned) return false;
  if (remainingMs > thresholdMs) return false;
  latch.warned = true;
  play();
  return true;
}

// Re-arm points: a new time control, a new budget, or a reset.
export function rearm(latch: Latch): void {
  latch.warned = false;
}

// Fixed-step expiry: the warning is decided in the tick, never inside a render.
export interface Expiry {
  timeLeftMs: number;
  budgetMs: number;
  latch: Latch;
}

export function setBudget(e: Expiry, budgetMs: number): void {
  e.budgetMs = budgetMs;
  e.timeLeftMs = budgetMs;
  rearm(e.latch); // the fix: a new budget re-arms the warning
}

export function tick(
  e: Expiry,
  periodMs: number,
  warnAtMs: number,
  mePlaying: boolean,
  play: () => void,
): void {
  e.timeLeftMs -= periodMs;
  warnIfLow(e.latch, e.timeLeftMs, warnAtMs, mePlaying, play);
}

export {};
