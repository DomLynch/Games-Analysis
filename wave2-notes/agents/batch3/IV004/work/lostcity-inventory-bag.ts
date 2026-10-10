// Licence: MIT (LostCityRS-Engine-TS LICENSE, "MIT License"). Shape adapted and rewritten here; not a line-by-line copy.
export const STACK_LIMIT = 0x7fffffff;
export type StackMode = 'normal' | 'always' | 'never';
export interface Stack { id: number; count: number; }

export class Bag {
  readonly slots: (Stack | null)[];
  readonly dirty = new Set<number>();

  constructor(size: number, readonly mode: StackMode, private readonly stackableIds: ReadonlySet<number>) {
    this.slots = new Array<Stack | null>(size).fill(null);
  }

  private stacks(id: number): boolean {
    return this.mode !== 'never' && (this.mode === 'always' || this.stackableIds.has(id));
  }

  private set(i: number, s: Stack | null): void {
    this.slots[i] = s;
    this.dirty.add(i);
  }

  total(id: number): number {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    return Math.min(STACK_LIMIT, n);
  }

  // How many of `count` would fit right now. Pure: changes nothing.
  canAdd(id: number, count: number): number {
    if (count <= 0) return 0;
    if (!this.stacks(id)) {
      const free = this.slots.filter(s => s === null).length;
      return Math.min(count, free);
    }
    const i = this.slots.findIndex(s => s !== null && s.id === id);
    if (i !== -1) return Math.min(count, STACK_LIMIT - (this.slots[i]?.count ?? 0));
    return this.slots.includes(null) ? Math.min(count, STACK_LIMIT) : 0;
  }

  // Places up to `count`; returns how many were placed.
  add(id: number, count: number): number {
    const fit = this.canAdd(id, count);
    if (fit === 0) return 0;
    if (!this.stacks(id)) {
      let placed = 0;
      for (let i = 0; i < this.slots.length && placed < fit; i++) {
        if (this.slots[i] === null) {
          this.set(i, { id, count: 1 });
          placed++;
        }
      }
      return placed;
    }
    let i = this.slots.findIndex(s => s !== null && s.id === id);
    if (i === -1) i = this.slots.indexOf(null);
    const before = this.slots[i]?.count ?? 0;
    this.set(i, { id, count: before + fit });
    return fit;
  }

  // Takes up to `count` from the first matching slots; returns how many were taken.
  remove(id: number, count: number): number {
    let removed = 0;
    for (let i = 0; i < this.slots.length && removed < count; i++) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const take = Math.min(s.count, count - removed);
      removed += take;
      if (s.count - take === 0) {
        this.set(i, null);
      } else {
        s.count -= take;
        this.dirty.add(i);
      }
    }
    return removed;
  }
}

// One step: check the target first, remove only what it can take, then add.
// Items are never created: placed <= moved <= want <= held.
export function moveItems(from: Bag, to: Bag, id: number, count: number): { moved: number; overflow: number; missing: number } {
  const want = Math.min(count, from.total(id));
  const fits = to.canAdd(id, want);
  const moved = from.remove(id, fits);
  const placed = to.add(id, moved);
  return { moved: placed, overflow: want - placed, missing: count - want };
}

export {};
