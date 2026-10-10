// Licence: GPL-3.0-or-later (donor, ref/gl/gl_decals.c and engine/client/cl_tent.c headers). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface DecalTune {
  poolCap: number;     // effective pool size (donor: min of compile-time cap and r_decals)
  maxOverlap: number;  // donor 6: at this many heavy overlaps, steal instead of taking the next slot
  coverMin: number;    // donor 0.6: an existing decal counts as overlapping when more than this share is covered
}

export interface Surface { decals: Slot[]; }   // insertion order; donor appends at the tail

export interface Slot {
  surface: Surface | null;   // null when unlinked
  permanent: boolean;
}

export function unlink(s: Slot): void {
  if (s.surface) {
    const i = s.surface.decals.indexOf(s);
    if (i >= 0) s.surface.decals.splice(i, 1);
  }
  s.surface = null;
}

export class DecalPool {
  private slots: Slot[];
  private next = 0;

  constructor(private tune: DecalTune) {
    this.slots = Array.from({ length: tune.poolCap }, () => ({ surface: null, permanent: false }));
  }

  // coverOf(existing) = share of the existing decal's area that the incoming decal covers (0..1).
  // Returns the slot used, or null when the pool is empty.
  paste(surf: Surface, coverOf: (d: Slot) => number, permanent: boolean, hitsGeometry: boolean): Slot | null {
    let count = 0;
    let steal: Slot | null = null;
    let stealCover = 2;
    for (const d of surf.decals) {
      if (d.permanent) continue;                 // permanent decals are never candidates
      const c = coverOf(d);
      if (c > this.tune.coverMin) {
        count++;
        if (!steal || c <= stealCover) { steal = d; stealCover = c; }
      }
    }
    const reuse = count >= this.tune.maxOverlap ? steal : null;
    const slot = this.alloc(reuse);
    if (!slot) return null;

    slot.permanent = permanent;
    if (!hitsGeometry) return null;              // clipped to nothing: drop it again (donor unlinks)
    slot.surface = surf;
    surf.decals.push(slot);
    return slot;
  }

  private alloc(reuse: Slot | null): Slot | null {
    if (this.slots.length === 0) return null;
    if (reuse) { unlink(reuse); return reuse; }
    let tries = 0;
    let s: Slot;
    do {
      if (this.next >= this.slots.length) this.next = 0;
      s = this.slots[this.next++];
      tries++;
    } while (s.permanent && tries < this.slots.length);  // gives up after one full loop
    unlink(s);
    return s;
  }
}

// Blood splatter drips from one TE: size plus two inclusive rolls of 1..8 (donor cl_tent.c 910).
export function splatterCount(size: number, roll: (lo: number, hi: number) => number): number {
  return Math.floor(size + roll(1, 8) + roll(1, 8));
}

// Drip lifetime in seconds (donor cl_tent.c 932).
export function dripLifeSec(roll: (lo: number, hi: number) => number): number {
  return roll(1, 3);
}
export {};
