// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Weighted<T> { weight: number; value: T; }

// Built once per table. Each entry stores the running total before it (its range start).
export class WeightedTable<T> {
  readonly starts: number[] = [];
  readonly values: T[] = [];
  readonly total: number;

  constructor(entries: ReadonlyArray<Weighted<T>>) {
    if (entries.length === 0) throw new Error("empty table");
    let running = 0;
    for (const e of entries) {
      this.starts.push(running);
      this.values.push(e.value);
      running += e.weight;
    }
    this.total = running;
  }

  // seed: non-negative integer; only its low 16 bits are used.
  pick(seed: number): T {
    const x = ((seed % 65536) / 65536) * this.total;
    // last entry whose start is <= x: each entry owns [start, start + weight)
    let lo = 0;
    let hi = this.starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.starts[mid] <= x) lo = mid; else hi = mid - 1;
    }
    return this.values[lo];
  }
}

export type LootSpec<T> =
  | { kind: "item"; id: T }
  | { kind: "nothing" }
  | { kind: "table"; table: WeightedTable<LootSpec<T>> }
  | { kind: "multi"; inner: LootSpec<T>; lo: number; hi: number }
  | { kind: "all"; parts: ReadonlyArray<LootSpec<T>> };

// Adds drops into `out` (id -> count). `rng` returns a uint32.
export function roll<T>(spec: LootSpec<T>, amount: number, rng: () => number, out: Map<T, number>): void {
  switch (spec.kind) {
    case "item":
      out.set(spec.id, (out.get(spec.id) ?? 0) + amount);
      return;
    case "nothing":
      return;
    case "table":
      for (let i = 0; i < amount; i++) roll(spec.table.pick(rng()), 1, rng, out);
      return;
    case "multi": {
      const n = spec.lo + (rng() % (spec.hi - spec.lo + 1));
      roll(spec.inner, n * amount, rng, out);
      return;
    }
    case "all":
      for (const p of spec.parts) roll(p, amount, rng, out);
      return;
  }
}

export {};
