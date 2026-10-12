// Licence: GNU GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type CcKind = "amnesia" | "frozen" | "winded" | "rooted";

export interface CcHit {
  kind: CcKind;
  strength: number;          // the hit's strength (donor data.strength)
  durationS: number | null;  // null = no duration (infinite)
  massRatio: number;         // attacker mass / target mass, used by roots only
}

export interface Resilience {
  gain: number;              // crowd-control resistance this entry adds while active
  untilS: number;            // absolute time the entry expires
}

export interface Target {
  resilience: Resilience[];  // one list shared by every crowd-control kind
  immune: boolean;           // a BuffImmunity effect for this kind is active
}

export const WINDOW_MULT = 5;       // resilience lasts 5x the crowd-control duration
export const DEFAULT_WINDOW_S = 30; // used when the crowd-control hit has no duration
export const SUM_CAP = 0.9;         // proposed cap: the donor has no cap, so the sum can reach 1.0 and zero the duration

const clamp01 = (x: number): number => Math.min(Math.max(x, 0), 1);

// Resilience gained from one hit, by kind.
export function resilienceGain(kind: CcKind, strength: number, durationS: number | null): number {
  switch (kind) {
    case "amnesia": return 0.3;
    case "frozen": return strength;
    case "winded": return strength / 3;
    case "rooted": return durationS === null ? 0.1 : durationS / 10;
  }
}

export function activeSum(t: Target, now: number): number {
  return t.resilience.filter((r) => r.untilS > now).reduce((acc, r) => acc + r.gain, 0);
}

// Applies one crowd-control hit. Returns the duration in seconds the hit lasts (null = infinite), or 0 if immune.
// Order: roots scale by mass first, then the resilience sum shortens the duration, then the hit adds its own resilience.
// The hit's own resilience is added after its duration is set, so the first hit is never shortened by itself.
export function applyCc(t: Target, hit: CcHit, now: number): number | null {
  if (t.immune) return 0;
  let dur = hit.durationS;
  if (hit.kind === "rooted" && dur !== null) {
    const low = clamp01(0.25 + hit.strength * 0.25);
    const high = Math.max(1, 1 + hit.strength * 0.5);
    dur = dur * Math.min(Math.max(hit.massRatio, low), high);
  }
  const sum = Math.min(activeSum(t, now), SUM_CAP);
  if (dur !== null) dur = dur * Math.max(0, 1 - sum);
  t.resilience.push({
    gain: resilienceGain(hit.kind, hit.strength, dur),
    untilS: now + (dur === null ? DEFAULT_WINDOW_S : dur * WINDOW_MULT),
  });
  return dur;
}

export {};
