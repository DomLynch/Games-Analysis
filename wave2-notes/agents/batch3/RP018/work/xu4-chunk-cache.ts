// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.

// 1. Chunk cache: a few slots, one per chunk the view can touch. A corner that hits reuses its slot;
//    a miss takes a free slot, else the first slot this view does not use (the "bump" pass).
interface Slot { chunkId: number; usedThisFrame: boolean; }   // chunkId -1 = empty

export function chunkIdOf(col: number, row: number): number {
  return col * 256 + row;   // donor packs (c << 8 | r); fix: a wider id so 255,255 is not a sentinel
}

export function obtainChunks(slots: Slot[], corners: number[]): { slot: number; build: boolean }[] {
  for (const s of slots) s.usedThisFrame = false;
  const out: { slot: number; build: boolean }[] = corners.map(() => ({ slot: -1, build: false }));

  // Pass 1: hits, then free slots. No eviction yet.
  corners.forEach((id, k) => {
    let i = slots.findIndex((s) => s.chunkId === id);
    if (i >= 0) { slots[i].usedThisFrame = true; out[k] = { slot: i, build: false }; return; }
    i = slots.findIndex((s) => s.chunkId === -1);
    if (i >= 0) { slots[i].chunkId = id; slots[i].usedThisFrame = true; out[k] = { slot: i, build: true }; }
  });

  // Pass 2: misses that found no free slot take the first slot no corner of this view uses.
  corners.forEach((id, k) => {
    if (out[k].slot >= 0) return;
    const i = slots.findIndex((s) => !s.usedThisFrame);
    if (i < 0) throw new Error("no slot for chunk; view wider than the cache");
    slots[i].chunkId = id;
    slots[i].usedThisFrame = true;
    out[k] = { slot: i, build: true };
  });
  return out;
}

// 2. Dirty regions: one upload covering first dirty region to end of last; clean regions are skipped by copy.
export function dirtySpan(regions: { start: number; used: number }[], dirtyMask: number): { offset: number; end: number } | null {
  let offset = -1;
  let end = 0;
  for (let r = 0; r < regions.length; r++) {
    if (dirtyMask & (1 << r)) {
      if (offset < 0) offset = regions[r].start;
      end = regions[r].start + regions[r].used;
    }
  }
  return offset < 0 ? null : { offset, end };
}

// 3. Frame pacer: measured frame time over the last N frames; the sleep moves at most 2 ms per frame toward the target.
export class Pacer {
  private samples: number[];
  private idx = 0;
  private sum: number;
  private sleepMs: number;
  private last: number | null = null;

  constructor(private interval: number, private n = 8) {
    this.samples = new Array<number>(n).fill(interval);
    this.sum = interval * n;
    this.sleepMs = interval - 6;   // donor starts 6 ms short of the interval
  }

  // now in ms; returns the ms to sleep before the next frame.
  tick(now: number): number {
    const raw = this.last === null ? this.interval : now - this.last;
    this.last = now;
    const elapsed = Math.min(raw, this.interval * 8);   // hitch clamp, as in the donor
    this.sum += elapsed - this.samples[this.idx];
    this.samples[this.idx] = elapsed;
    this.idx = (this.idx + 1) % this.n;
    const adjust = Math.max(-2, Math.min(2, this.interval - this.sum / this.n));   // float average (fix)
    this.sleepMs = Math.max(0, Math.min(this.interval - 1, this.sleepMs + adjust));
    return this.sleepMs;
  }
}

export {};
