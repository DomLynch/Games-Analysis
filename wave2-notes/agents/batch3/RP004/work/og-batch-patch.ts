// Licence: MIT (donor, OpenGothic). Adapted shape; the donor defects (best fit, lost clear) are fixed here.
// adapt
export interface Range { begin: number; end: number; }   // [begin, end)

// Batch key = mesh + material. Lookup is a Map, not the donor's linear scan.
export class BucketTable<T> {
  private index = new Map<string, number>();
  readonly items: T[] = [];
  dirty = false;

  alloc(key: string, make: () => T): number {
    const hit = this.index.get(key);
    if (hit !== undefined) return hit;
    this.items.push(make());
    const id = this.items.length - 1;
    this.index.set(key, id);
    this.dirty = true;
    return id;
  }
}

// Conservative radius about the model origin (max absolute extent per axis), plus the wave amplitude
// so that waving water and foliage stay inside the sphere.
export function conservativeRadius(lo: [number, number, number], hi: [number, number, number], waveAmp: number): number {
  const x = Math.max(Math.abs(lo[0]), Math.abs(hi[0]));
  const y = Math.max(Math.abs(lo[1]), Math.abs(hi[1]));
  const z = Math.max(Math.abs(lo[2]), Math.abs(hi[2]));
  return Math.sqrt(x * x + y * y + z * z) + waveAmp;
}

// Dirty bits, 32 slots per word. Marking is atomic; taking the patch exchanges each word to zero,
// so a mark that lands during the take is kept for the next patch instead of being erased.
export class DirtySlots {
  private words: Uint32Array;

  constructor(capacity: number) {
    this.words = new Uint32Array(Math.ceil(capacity / 32));
  }

  mark(id: number): void {
    Atomics.or(this.words, id >>> 5, 1 << (id & 31));
  }

  takePatch(): number[] {
    const out: number[] = [];
    for (let w = 0; w < this.words.length; w++) {
      const mask = Atomics.exchange(this.words, w, 0);
      if (mask === 0) continue;
      for (let b = 0; b < 32; b++) {
        if ((mask & (1 << b)) !== 0) out.push(w * 32 + b);
      }
    }
    return out;
  }
}

// Best fit: the smallest free range that holds count. The donor never updates its best-diff value,
// so it keeps the last range that fits; this version compares the slack.
export function takeBestFit(free: Range[], count: number, grow: () => number): number {
  let best = -1;
  let bestSlack = Infinity;
  for (let i = 0; i < free.length; i++) {
    const size = free[i].end - free[i].begin;
    if (size < count) continue;
    if (size - count < bestSlack) {
      best = i;
      bestSlack = size - count;
    }
  }
  if (best < 0) return grow();
  const r = free[best];
  if (r.end - r.begin === count) {
    free.splice(best, 1);
    return r.begin;
  }
  r.end -= count;
  return r.end;    // takes the tail of the range, as the donor does
}

// Return a range and merge it with neighbours that touch it.
export function release(free: Range[], r: Range): void {
  free.push(r);
  free.sort((a, b) => a.begin - b.begin);
  for (let i = 0; i + 1 < free.length; ) {
    if (free[i].end === free[i + 1].begin) {
      free[i].end = free[i + 1].end;
      free.splice(i + 1, 1);
    } else {
      i += 1;
    }
  }
}

// Round a size up to a multiple (the donor uses 1024 for descriptor arrays and 256 for payload).
export function padTo(n: number, step: number): number {
  return Math.ceil(n / step) * step;
}

export {};
