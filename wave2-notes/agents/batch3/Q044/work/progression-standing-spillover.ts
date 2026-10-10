// Licence: GPL-3.0 (donor, Endless Sky license.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const DESTROY = 1 << 0, BOARD = 1 << 1, ATROCITY = 1 << 2, PROVOKE = 1 << 3; // event bits (ATROCITY and PROVOKE are special)

interface Faction {
  id: string;
  min: number;                          // standing floor (zone data)
  max: number;                          // standing ceiling (zone data)
  attitude: Record<string, number>;     // -1..1 toward other factions; missing = default
  penalty: Record<number, number>;      // standing change per unit of count, per event bit
  special: Record<number, boolean>;     // event bits that carry the atrocity flag
}
type Sheet = Map<string, number>;       // the player's standing with each faction

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// Offense against a victim faction. Every faction, the victim included, moves the player's standing by count x weight x penalty.
export function offend(factions: Faction[], sheet: Sheet, victim: string, events: number, count: number, defaultAttitude: number): void {
  for (const f of factions) {
    const weight = f.id === victim ? 1 : (f.attitude[victim] ?? defaultAttitude);
    if (count === 0 || Math.abs(weight) < 0.05) continue;   // weights under 5 percent never move standing
    let change = 0, atrocity = false;
    for (const bit of [DESTROY, BOARD, ATROCITY]) {
      if (events & bit) { change += f.penalty[bit] ?? 0; atrocity = atrocity || f.special[bit] === true; }
    }
    let rep = sheet.get(f.id) ?? 0;
    if (atrocity && weight > 0) rep = clamp(Math.min(0, rep), f.min, f.max); // allies: positive standing is wiped
    sheet.set(f.id, clamp(rep - count * weight * change, f.min, f.max));
  }
}

// The AI reports only event bits not yet charged for this ship. PROVOKE always repeats.
export function freshEvents(seen: { bits: number }, events: number): number {
  let fresh = events & ~seen.bits;
  seen.bits |= events;
  if (events & PROVOKE) fresh |= PROVOKE;
  return fresh;
}

// Landing and services need standing at or above the planet's value, unless it is provoked.
export function canLand(sheet: Sheet, faction: string, required: number, provoked: boolean): boolean {
  if (provoked) return false;
  return (sheet.get(faction) ?? 0) >= required;
}
export {};
