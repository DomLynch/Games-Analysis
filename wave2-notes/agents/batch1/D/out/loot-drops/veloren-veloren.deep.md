# veloren-veloren (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/veloren-veloren/common/src/lottery.rs` | Licence: GPL-3.0 (root `LICENSE`, "Version 3, 29 June 2007"; `lottery.rs` has no per-file header) | Rust | symbol `Lottery::choose_seeded` (with `Lottery::from`, `LootSpec::to_items_inner`, `LootSpec::to_items`)

Checked: `lottery.rs` read in full (548 lines, VPS, `cat -n`), including the doc comment, `Lottery` struct, `From<Vec<(f32, T)>>`, `choose`/`choose_seeded`, `distribute_many` (84-210, read, not written up), the `LootSpec` enum and `to_items_inner` (298-422), `to_items` (424-435), and the test module. A repo grep shows `choose_seeded` has no caller other than `choose`. Not read: the `rand` crate, the asset loader (`load_expect`), `Item::new_from_asset`, `item_hash`, the modular-weapon generators, and the kill/chest call sites that roll the loot. Not run: no test or benchmark was executed. Confidence: high on the lottery roll; medium on the `LootSpec` recursion because the asset cache behaviour was not read.

## 1. Mechanism

- A loot table is a list of `(weight, entry)`. `Lottery::from` runs once. It walks the list with a running total and overwrites each weight with the total BEFORE that entry, so each entry stores its range start. The table's `total` is the sum of all weights (lines 55-62).
- A roll takes a 32-bit seed (from the thread RNG in `choose`, line 76; passed in by `choose_seeded`). Only the low 16 bits are used: `x = (seed % 65536) / 65536 * total` (line 68). A binary search over the starts finds x; if x is not an exact start, the entry before the insertion point is taken (lines 71-72). So each entry owns the half-open range `[start, start + weight)`.
- Probability of an entry is `weight / total`, quantised to a 1/65536 grid (see section 3).
- A `LootSpec` is a recursive tree. The kinds this note covers: `Item` (one item), `LootTable` (a named table, rolled again on each use), `Nothing`, `MultiDrop(inner, lower, upper)` (a count drawn uniformly from lower to upper inclusive, then recursed with `amount x count`), `All` (every child evaluated with the same amount), and `Lottery` (an inline table). The `ModularWeapon` kinds are generated per call and are not described here.
- `to_items_inner(amount)`. `Item` adds `count = item's own stack amount x requested amount` (line 315). `LootTable` and `Lottery` roll `amount` times, each roll recursing with amount 1, so rolls are independent and with replacement (lines 351-352, 363-364). `MultiDrop` multiplies its drawn count into `amount` (line 414). Duplicate items merge by item hash and equality, and counts add with saturation (lines 318, 334).
- `to_items` starts with amount 1 and the thread RNG, sorts the result by count ascending, and returns `None` if nothing dropped (lines 426-434).
- Tick: a roll happens once per loot event, synchronously. Not a per-frame loop. (The event sites were not read.)

## 2. Key functions

- `Lottery::from`: `/mnt/frankendom-donors/veloren-veloren/common/src/lottery.rs` 53-64. Running total converts weights into range starts; `total` is the full sum.
- `Lottery::choose_seeded`: `/mnt/frankendom-donors/veloren-veloren/common/src/lottery.rs` 66-74. Scales the seed to `[0, total)`, binary-searches the starts, returns the entry.
- `Lottery::choose`: `/mnt/frankendom-donors/veloren-veloren/common/src/lottery.rs` 76. One line: seeds from the thread RNG.
- `LootSpec::to_items_inner`: `/mnt/frankendom-donors/veloren-veloren/common/src/lottery.rs` 298-422. The recursion, the per-kind amount rules, and the `push_item` merge (314-341).
- `LootSpec::to_items`: `/mnt/frankendom-donors/veloren-veloren/common/src/lottery.rs` 424-435. Top-level entry: amount 1, sort, `None` if empty.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Running-total range starts, built once; one integer roll; one binary search per roll | None (the algorithm) |
| Seed resolution: 16 bits (`% 65536`) | 65536 (theirs, line 68). Probabilities are multiples of 1/65536 of total. An entry narrower than total/65536 can contain no grid point and never drop. Here that is about 0.00016 (computed from total 10.25, not run). |
| Probability = weight / total | Doc example: `Cheese drop rate = 3/X = 29.6%` (theirs, line 26) with `X = 10.15` (theirs, line 18). The doc's own table ends at 10.25 (theirs, line 15). 3/10.25 is 29.3%, 1/10.25 is 9.8%. The doc's numbers are stale; the code uses the summed total. (Arithmetic by hand, not run.) |
| `MultiDrop` count uniform in [lower, upper] | Doc example `MultiDrop(..., 100, 250)` (theirs, line 240) is an example, not game data. |
| Creature loot tables use weight 1.0 per entry in the printed sample | Sample: the first 40 lines of `assets/common/loot_tables/creature/*.ron` concatenated (file names not recorded), so those tables are uniform picks. Not read in full. |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (build starts once, roll one 16-bit value, search, then recurse per amount). It omits the item-hash merge (it uses a `Map` keyed by item id), the final sort by count, the `ModularWeapon` kinds, the item's own stack amount (line 315), the asset loading by name, and the per-call rebuild of inline tables (the donor rebuilds `Lottery` on every call, line 356). Two differences: the donor draws a `MultiDrop` count with an unbiased range (line 411), the sketch uses `rng() % n` (small modulo bias). For zero-weight entries that share a start, the donor's `binary_search_by` may land on any of them; the sketch returns the last one.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module): the drop roll and the merge of drops into one list per kill. Parity-checklist row 18 (loot roll and XP award). The sketch covers the roll and the tree; XP is not in this cell.
- today: none located in this pass (the Frankendom repo was not opened).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (drops are written once, server-side); zones as data (each zone's tables are data files, not code); server-verified kills (the roll happens on the server). The numbered brief rules were not in the files read.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- Server roll: the donor's `choose()` seeds from the thread RNG of whichever process calls it. Frankendom must draw the seed on the server and store it in the fight record (parity row 19), so a drop can be replayed and audited. The donor has no such record (the call sites were not read).
- One ledger: `push_item` merges into an in-memory `Vec`. The donor writes to no ledger. Frankendom must commit the merged result once, to the one ledger.
- Many-vs-one ownership: `distribute_many` (lines 84-210) splits a stack among weighted participants, so several attackers share one drop. This matters for MAX_ATTACKERS = 3. It was read but not written up; its binary search over `sorted_weight` and its "remove when satisfied" branch were not tested. Candidate for a separate note.
- Resolution: the 16-bit seed makes an entry narrower than total/65536 unreachable. Frankendom should use integer weights and a 32-bit roll for rare drops.
- The donor's doc numbers (X = 10.15, 29.6%) do not match its own table total (10.25). Do not copy the doc's percentages into Frankendom data.
- Zero-weight entries share starts; `binary_search_by` may return any of them. Frankendom should reject zero or negative weights when a table loads.
- `LootTable` loads the named table on every roll (line 350). Whether the asset cache makes that cheap was not read. Frankendom tables should be loaded once per zone.
- Brief conflict RESOLVED (Lead Dev, 2026-10-10): row 18 is loot roll / XP award; the server tick is NOT a separate row, it is the named sub-line "server tick: fixed step, input intake, per-tick NPC budget" under row 18 / post-K item 3. This note's row 18 is correct.

Best transferable idea: store each drop entry as the running total before it, then roll one integer and binary-search, so any weights in data give a one-roll, data-driven drop.
