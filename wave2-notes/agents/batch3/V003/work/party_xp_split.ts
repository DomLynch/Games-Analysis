// Licence: AGPL-3.0 (donor). Clean-room sketch of the described mechanism (party XP split: size table, distance falloff, level-gap band), not a translation.
// clean-room
export interface Member {
  id: string;
  level: number;
  xpToNext: number;   // XP still needed to the next level (weight for the proportional mode)
  x: number;
  y: number;
}

const MAX_FELLOWS = 9;                  // party size cap (engine constant)
const EVEN_SHARE_LEVEL = 50;            // all members at or above this level share evenly (zone-independent property)
const EVEN_GAP = 5;                     // max level gap for even share
const PROP_GAP = 10;                    // max level gap for proportional share
const FULL_RADIUS = 600;                // full share within this distance (world units)
const SHARE_TABLE = [1, 0.75, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3]; // index = members - 1

export type Mode = "even" | "proportional" | "off";

export function shareMode(leaderLevel: number, members: Member[]): Mode {
  if (members.every(m => m.level >= EVEN_SHARE_LEVEL)) return "even";
  const gap = Math.max(...members.map(m => Math.abs(leaderLevel - m.level)));
  if (gap <= EVEN_GAP) return "even";
  if (gap <= PROP_GAP) return "proportional";
  return "off";
}

// 1.0 inside FULL_RADIUS, linear to 0 at 2 x FULL_RADIUS, 0 beyond.
export function distanceScalar(a: Member, b: Member): number {
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  if (d <= FULL_RADIUS) return 1;
  if (d >= FULL_RADIUS * 2) return 0;
  return Math.max(0, 1 - (d - FULL_RADIUS) / FULL_RADIUS);
}

// Splits one kill's XP. The earner must be one of the members.
export function splitXp(amount: number, earner: Member, members: Member[], mode: Mode): Map<string, number> {
  const out = new Map<string, number>();
  if (mode === "off") {
    out.set(earner.id, amount);
    return out;
  }
  if (mode === "even") {
    const total = amount * SHARE_TABLE[Math.min(members.length, MAX_FELLOWS) - 1];
    for (const m of members) out.set(m.id, Math.round(total * distanceScalar(earner, m)));
    return out;
  }
  // proportional: weight = member's XP to next level over ALL members (out-of-range shares are lost, as in the donor)
  const sum = members.reduce((s, m) => s + m.xpToNext, 0);
  for (const m of members) {
    out.set(m.id, Math.round(amount * (m.xpToNext / sum) * distanceScalar(earner, m)));
  }
  return out;
}

// Example: three members, two in range, one at 900 units.
const a: Member = { id: "a", level: 60, xpToNext: 100, x: 0, y: 0 };
const b: Member = { id: "b", level: 60, xpToNext: 100, x: 100, y: 0 };
const c: Member = { id: "c", level: 60, xpToNext: 100, x: 900, y: 0 };
const grants = splitXp(1000, a, [a, b, c], shareMode(60, [a, b, c]));
void grants;
export {};
