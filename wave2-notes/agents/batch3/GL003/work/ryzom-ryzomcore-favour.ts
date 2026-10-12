// Licence: AGPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface FavourTuning {
  min: number;          // absolute floor (donor FameAbsoluteMin = -100 * 6000)
  max: number;          // absolute ceiling (donor FameAbsoluteMax = 100 * 6000)
  warn: number;         // warning band edge (donor FameWarningLevel = 5 * 6000)
  minToRemain: number;  // below this a declared patron is dropped (donor FameMinToRemain = 0)
  minToDeclare: number; // gate to declare a patron (donor FameMinToDeclare = 30 * 6000)
}

export interface FavourLedger { value: number; declared: boolean; }

// Donor: FAME_GAIN_FACTOR = max/25 + max. The factor it applies is (1.04*max - |value|) / max.
export function favourStep(cur: number, delta: number, t: FavourTuning, directional = false): number {
  let factor: number;
  if (!directional) {
    // donor shape: damped by distance from zero, for gains AND losses
    factor = (1.04 * t.max - Math.abs(cur)) / t.max;
  } else {
    // proposed fix: damp by room to the bound in the direction of travel, scaled so 0 gives 1.0
    const room = delta >= 0 ? t.max - cur : cur - t.min;
    factor = (2 * room) / (t.max - t.min);
  }
  const next = cur + delta * factor;       // float store: no sint32 truncation
  return Math.min(t.max, Math.max(t.min, next));
}

// Donor divides the guild share as an integer (deltaFame / memberCount). Fix: carry the remainder.
export function guildShare(delta: number, members: number, carry: { rem: number }): number {
  const total = delta / members + carry.rem;
  const whole = Math.trunc(total);
  carry.rem = total - whole;
  return whole;
}

// Donor declares by adding (minToDeclare - cur) through the damped step, which can land short.
// Fix: set the gate value directly, as the donor's setEntityFame(..., setDirectValue=true) allows.
export function declarePatron(l: FavourLedger, t: FavourTuning): boolean {
  if (l.value < t.minToDeclare) l.value = t.minToDeclare;
  l.declared = true;
  return true;
}

export type PatronStanding = 'ok' | 'warn' | 'boot';

// Donor: below minToRemain the declared patron is cleared; between minToRemain and warn only a message.
export function checkPatron(l: FavourLedger, t: FavourTuning): PatronStanding {
  if (!l.declared) return 'ok';
  if (l.value < t.minToRemain) { l.declared = false; return 'boot'; }
  if (l.value < t.warn) return 'warn';
  return 'ok';
}

export {};
