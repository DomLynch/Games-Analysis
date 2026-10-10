# gemrb-gemrb (loot-drops, cell 3)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Interface.cpp` (`ResolveRandomItem` 3409-3477; `UpgradeRandomItem` 3359-3399; `ReadRandomItems` 3188-3221; `Roll` 2252-2267) with `RNG.h` 56 | Licence: GPL-2.0-or-later (SPDX header, `Interface.cpp` line 3; the `COPYING` file is the GPL version 2 text) | C++ | symbol `Interface::ResolveRandomItem`

Checked: read end to end: `Interface.cpp` 2252-2267 (`Roll`), 3155-3262 (`ReadItemTable`, `ReadRandomItems`, `ReadItem`), 3355-3480 (`UpgradeRandomItem`, `ResolveRandomItem`); `Interface.h` 120-141 (`ItemList`); `RNG.h` 55-90; `Scriptable/Actor.cpp` 5785-5806 (death drop). Callers read in context: `AREImporter.cpp` 790, `CREImporter.cpp` 1128, `GSUtils.cpp` 1478-1500 (`CreateItemCore`). Grep only: `STOImporter.cpp` 156 (store caller) and `Interface.cpp` 611-614 (startup call of `ReadRandomItems`). Not read: the save-game item path (so I cannot say whether a re-entered area re-rolls), the `ResRefMap` type behind `RtRows`, the contents of the `randitem` table, and where the "Nightmare Mode" variable is set. Confidence: high on the order of operations and the odds (`Roll` and `RAND` both read); high that the `newItem == pickedItem` guard cannot fire (a length argument); medium on the claim that a missing upgraded table throws (`RtRows.at()` throws on std containers; `ResRefMap` not read). Camera: not applicable.

## 1. Mechanism

- Two stages. At startup, `ReadRandomItems` (3188-3221) loads the `randitem` table. The "Nightmare Mode" variable (3191) picks a difficulty column, clamped to the last column (3198-3200). The gold item is column 0, row 0 (3203). The cell at row 1 of that column is either a number `n` or a table name (3207-3209). A table name is read as one table with no prefix (3209-3212). A number loads up to five sub-tables (clamped at 3213-3215): one per row 2 to n+1, each keyed by its row name as a prefix (3216-3218). `ReadItemTable` (3160-3186) stores each row of a table as a candidate list, with its keys built as prefix plus a two-digit row number (`(j + 1) % 100`).
- At roll time, `ResolveRandomItem` (3409-3477) runs one entry through up to ten passes (loop 3425). A "pass" either validates an item (the ref is not a table) or picks a row from a table.
- Row pick (`pickFromRow`, 3413-3421). If the table is `WeightOdds`, the index is `Roll(2, (n + 1) / 2, -2)` (3418). Otherwise it is `Roll(1, n, -1)` (3420). `WeightOdds` is set only when the row count is odd and the column header is "2" (`Interface.h` 135). The `Roll` helper is `add` plus `dice` draws of `RAND(1, size)` (2252-2264). `RAND` is `uniform_int_distribution(min, max)`, so both bounds are inclusive (`RNG.h` 56).
- Tier upgrade. If the pick is exactly "UP" (3439) and the table name ends in "_X" (the check on the character before the last), `UpgradeRandomItem` moves tier letter X one step along "lmrvvvvv" (3361, 3393). The tier is found with `find_first_of`, so V counts as index 3 and stays V. The table is then picked again (3442).
- Pick parse (3446 and after). Split on `*`. If there is a stack suffix, the item is the first part and its count is `RAND(1, N)` (3471), set only when the entry is stacked. If the whole pick is digits, it is gold, and the gold amount is the number itself (3463-3465). The text "no_drop" creates nothing (3466). Anything else becomes the next ref, and if that ref is a table the next pass picks from it.
- Gold second charge: `ReadItem` (3247-3249) adds `Roll(1, Usages[1], -1)`, which is uniform over 0 to `Usages[1] - 1`, to a gold item's first charge. The condition is not gated by game; the comment at 3247 says IWD used the second charge for "extra loot randomisation".
- Ten passes is the cap. If the loop ends without an item, it logs "Loop detected while generating random item" and returns false (3475).
- Dead guard (3441): `if (newItem == pickedItem) return false;` compares the upgraded table name with the two-character "UP". The table name is longer than two characters (the check at 3439 requires `nameLength > 2`), so the guard cannot fire.
- When it runs. `ResolveRandomItem` is called from `ReadItem` (3253) and from `CreateItemCore` (`GSUtils` 1488). `CreateItemCore` has several callers, all seen by grep only: script actions (`Actions.cpp` 4238, 4277, 4347, 4767) and `Inventory.cpp` (884, 1635, 1657). `ReadItem`'s callers include the area container reader (`AREImporter` 790) and the creature inventory reader (`CREImporter` 1128); the store reader (`STOImporter` 156) was seen by grep only. So the roll happens when a record is read or a script creates the item, not when the creature dies.
- Death (`Actor.cpp` 5785-5806): on the death frame, the actor's remaining inventory is dropped (5802), with one exception in the condition above that line (a protagonist-mode check on the first party member). At difficulty above Core, disintegration first destroys normal items (5797-5798). The death block does not call the resolver.
- Tick: none. Reads are synchronous at load and script time.

## 2. Key functions

- `ResolveRandomItem`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Interface.cpp` 3409-3477 (3413-3421 pick, 3425 loop, 3439-3442 UP, 3446 parse, 3463-3466 gold and no_drop, 3471 stack, 3475 loop error).
- `UpgradeRandomItem`: same file, 3359-3399 (3361 progression string, 3393 tier step).
- `ReadRandomItems` and `ReadItemTable`: same file, 3188-3221 and 3160-3186 (difficulty column 3207, sub-table loop 3218).
- `ReadItem`: same file, 3247-3253 (gold second charge 3249, resolver call 3253).
- `Roll`: same file, 2252-2267 (2264 `add += RAND(1, size);`).
- `RAND` range: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/RNG.h` 56.
- `ItemList` weight rule: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Interface.h` 126-141 (135).
- Death drop: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 5785-5806 (5792 comment, 5802 `DropItem`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Uniform pick from n rows | `Roll(1, n, -1)`: 0 to n-1, each equal (3420) |
| Peaked pick for odd-sized tables with header "2" | `Roll(2, (n + 1) / 2, -2)`: 0 to n-1, peaked in the middle (3418, 135). For n = 3 the weights are 1 : 2 : 1 (derived from the two-dice sum; not run) |
| Tier upgrade on a table name | "lmrvvvvv", one step per UP; V stays V (3361, 3393) |
| Nested tables per entry | 10 passes (3425); gives up with a logged error (3475) |
| Stack count | `RAND(1, N)`, inclusive, from the "item*N" suffix (3446, 3471) |
| Gold entry | the number in the entry is the amount (3465); the second-charge roll adds 0 to U-1 (3249; comment says IWD) |
| Treasure difficulty | "Nightmare Mode" selects a column, clamped to the last (3191-3200); sub-table count up to 5 (3213-3215) |

## 4. TypeScript sketch

simplified: this sketch resolves one entry in the donor's order: table pick, the UP tier step (then a second pick), then gold, no_drop, stack, or a nested table, up to ten passes. It omits: the "randitem" difficulty table and the sub-table loading (`ReadRandomItems`), the row-name prefixes built in `ReadItemTable`, item validation and the placeholder check (the sketch takes a set of valid item ids), the IWD second gold charge (3249), charges and expiry on the created item, the lowercasing of table names, and the header rule that sets `WeightOdds` (the sketch takes it as an input). It does not copy the donor's dead guard at 3441. Where the donor's `RtRows.at()` would throw on a missing upgraded table, the sketch returns null instead (not run).

```ts
// Donor licence: GPL-2.0-or-later (SPDX header in Interface.cpp). Clean-room sketch of the mechanism, not a translation.
// clean-room
export type Rng = (min: number, max: number) => number; // inclusive integers, like RAND(min, max)

export interface Table { name: string; rows: string[]; weightOdds: boolean; }

export interface Drop { item: string; count: number; }

const TIERS = "lmrvvvvv"; // tier letters: L -> M -> R -> V, V stays V

// donor Roll(dice, size, add): add plus the sum of `dice` draws of rng(1, size)
function roll(rng: Rng, dice: number, size: number, add: number): number {
  let total = add;
  for (let i = 0; i < dice; i++) total += rng(1, size);
  return total;
}

// weightOdds rows: 2d((n+1)/2) - 2 (a peaked index); otherwise uniform 0..n-1
function pickIndex(t: Table, rng: Rng): number {
  const n = t.rows.length;
  return t.weightOdds ? roll(rng, 2, Math.floor((n + 1) / 2), -2) : roll(rng, 1, n, -1);
}

// "table_X" with a tier letter X advances one tier; returns null when the name has no tier suffix
function upgradeName(name: string): string | null {
  if (name.length < 3 || name[name.length - 2] !== "_") return null;
  const i = TIERS.indexOf(name[name.length - 1]);
  if (i < 0) return null;
  return name.slice(0, -1) + TIERS[Math.min(i + 1, TIERS.length - 1)];
}

// Resolves one entry. A ref is a table name, an item id, "N" (gold), "item*N" (stack), "no_drop" or "UP".
export function resolveEntry(start: string, tables: Map<string, Table>, items: Set<string>,
                             rng: Rng): Drop | null {
  const MAX_PASSES = 10;
  let ref = start;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const t = tables.get(ref);
    if (t === undefined) {
      return items.has(ref) ? { item: ref, count: 1 } : null;
    }
    let picked = t.rows[pickIndex(t, rng)];
    const up = upgradeName(ref);
    if (picked === "UP" && up !== null) {
      const next = tables.get(up);
      if (next === undefined) return null; // donor: RtRows.at() would throw here
      ref = up;
      picked = next.rows[pickIndex(next, rng)];
    }
    const star = picked.indexOf("*");
    if (star >= 0) {
      const sides = Number(picked.slice(star + 1));
      ref = picked.slice(0, star);
      const count = rng(1, sides); // stack count, inclusive
      const t2 = tables.get(ref);
      if (t2 === undefined && items.has(ref)) return { item: ref, count };
      continue;
    }
    if (/^[0-9]+$/.test(picked)) return { item: "gold", count: Number(picked) };
    if (picked === "no_drop") return null;
    ref = picked;
  }
  return null; // donor logs "Loop detected" and gives up
}
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (server side): the resolver runs once per kill, when the kill is verified, and returns the drops for the ledger. It is never called from the tick, the client or at spawn.
- Parity-checklist row 18 (loot roll and XP award). The server tick has no row of its own: this sits under row 18 / post-K item 3.
- Reuse tag: adapt (GPL-2.0-or-later; shape taken, the sketch is clean-room, no donor line copied)
- Brief rule served: 1 (one engine: the resolver is engine code, not a client); zones as data (the tables are zone data); server-verified kills (the roll happens on the server at the verified kill)

## 6. Gaps and risks

- When the roll happens. GemRB rolls when an item record is read (area, creature, store, script), not at death. Frankendom's kills are server-verified, so the roll belongs at the verified kill. Resolving at spawn would fix the loot before the fight, which must not happen on the server or the client. Use the donor's resolver shape at kill time only.
- One engine and zones as data. The donor picks its table from a global difficulty variable through a global "randitem" table. For Frankendom the table reference is zone or encounter data. Do not copy the global difficulty column.
- Typed failures at load, not throws at roll. `RtRows.at()` throws on a missing upgraded table at roll time. Frankendom should validate every table reference and every "UP" target when the zone loads, and fail the load, not the kill.
- Do not copy the dead guard. The 3441 check cannot fire. The test must assert the UP path returns the upgraded table's pick (see Acceptance).
- Odds are explicit data. The donor infers peaked odds from "row count is odd and header is 2". Frankendom's table needs an explicit odds field (uniform or triangular).
- Stacks and gold are data objects, not strings. The donor's "item*N", "UP", "no_drop" and numeric grammar is parsed from text. Frankendom uses typed rows: `{kind: "item" | "table" | "gold" | "upgrade" | "none", ...}` with count ranges.
- Ten passes is a cap, and the cap matters. Keep a cap; make the cap a data field or a constant with a test.
- Randomness. The donor uses a global singleton RNG (`RNG::getInstance()`). Frankendom injects a seeded RNG for the fight record and replay (row 19) and for tests.
- One ledger. The donor's gold second-charge trick stores a roll in the item's charge field. Frankendom must not store loot state in an item's charges; the drop is a ledger entry.
- Not used: IWD second gold charge, the "randitem" difficulty column, stacked charges on creature items (iwd2 detail, comment at 3470).

Best transferable idea: give a loot row an "upgrade" that moves a chest to the next tier table (L to M to R to V), and resolve the whole nested table on the server in one pass capped at ten hops.
Decision (proposed): adapt. Keep the row table with an explicit odds field, the tier-upgrade step for chest tiers, a ten-pass cap on nested tables, and a stack count range. Resolve on the server at the verified kill. Reject resolution at record read or spawn time, the string grammar, the gold second-charge trick, and the global difficulty column (zones as data instead).
Acceptance: a server test with a seeded RNG: a three-row table with triangular odds gives about 25 / 50 / 25 over 100k kills (within 1 point); a chest row "UP" on table chest_l yields chest_m's pick, and on chest_v yields chest_v's pick; a nested table resolves to an item within ten hops; a zone with a missing table fails at load, not at the kill.

Reuse tag: adapt (GPL-2.0-or-later; shape taken, no donor line copied)
