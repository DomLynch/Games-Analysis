// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Online = "offline" | "suppressed" | "online";

export interface Ref {
  id: string;
  threat: number;      // base plus temporary modifiers, floored at 0
  online: Online;
  taunted: 0 | 1 | 2;  // 0 detaunted, 1 none, 2 taunting
  inMelee: boolean;    // attacker is in melee range of the creature
}

const ONLINE_RANK: Record<Online, number> = { offline: 0, suppressed: 1, online: 2 };
export const SWITCH_LOW = 1.1;   // a challenger must beat the current victim by this factor to be considered
export const SWITCH_HIGH = 1.3;  // beating the current victim by this factor switches at once, at any range

// True when b beats a by more than the weight w. Online state first, then taunt, then threat.
export function beats(a: Ref, b: Ref, w: number): boolean {
  if (a.online !== b.online) return ONLINE_RANK[a.online] < ONLINE_RANK[b.online];
  if (a.taunted !== b.taunted) return a.taunted < b.taunted;
  return a.threat * w < b.threat;
}

// Hysteresis: keep the current victim unless a challenger clears the bands.
// sorted is the threat list, highest first, in the same order as beats(..., 1).
export function reselectVictim(current: Ref | null, sorted: Ref[]): Ref | null {
  const alive = sorted.filter((r) => r.online !== "offline");
  if (alive.length === 0) return null;
  const highest = alive[0];
  if (current === null || current.online === "offline") return highest;
  if (highest === current) return current;
  if (!beats(current, highest, SWITCH_LOW)) return current;
  if (beats(current, highest, SWITCH_HIGH)) return highest;
  if (highest.inMelee) return highest;
  for (const next of alive.slice(1)) {
    if (next === current) return next;
    if (!beats(current, next, SWITCH_LOW)) return current;
    if (next.inMelee) return next;
  }
  return current;
}

export {};
