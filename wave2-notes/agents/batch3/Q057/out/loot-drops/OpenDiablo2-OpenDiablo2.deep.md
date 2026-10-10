# OpenDiablo2-OpenDiablo2 (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2item/diablo2item/item_factory.go` | Licence: GPL-3.0 (LICENSE lines 1-2 "GNU GENERAL PUBLIC LICENSE" / "Version 3, 29 June 2007"; clean-room, shape only, never a line-by-line translation) | Go | symbol `ItemFactory.ItemsFromTreasureClass`

Checked: read in full: `ItemsFromTreasureClass` (item_factory.go 226-283), `rollTreasurePick` (199-223), `rollDropModifier` (163-197), `ItemFromTreasure` (286-321), `NewItemFactory` (46-62), `SetSeed` (74-81); `Item.applyDropModifier` (item.go 256-287), `sanitizeDropModifier` (289-310), `pickUniqueRecord` (312-318), `pickSetRecords` (320-329), `pickMagicAffixes` (331-361), `pickRandomAffixes` (363-385), `SetSeed` (388-395), `init` (397-400); `TreasureClassRecord` (treasure_class_record.go 1-25) and its loader (treasure_class_loader.go 41-80). Partly read: `FindMatchingAffixes` (item_factory.go 324-354, level and type filter after 354 not read), `affixRecords` (item.go 223-239). Not read: `findMatchingUniqueRecords` (item.go 708), `findMatchingSetItemRecords` (726), `generateAllProperties` (408), the property code. Callers: `rollDropModifier` and `rollTreasurePick` are called only from `ItemsFromTreasureClass`. `ItemsFromTreasureClass` is called only from itself (recursion, item_factory.go 265). A grep over d2game, d2core and d2common for `ItemsFromTreasureClass`, `Treasure.Normal` and `NumPicks` found no monster-death or chest caller in this repo. Confidence: high on the roll order and the numbers; the table logic exists but is not wired to a game event here. Test-only item codes in `d2game/d2player/inventory.go` (lines 157, 181) are the only game-side use of the item factory. Not run: nothing executed.

Best transferable idea: model a drop table as data, with a no-drop weight, weighted entries (or guaranteed counts when picks are negative), entries that name other tables, and one quality roll per item over a fixed base weight.
Decision (proposed): adapt - take the table shape as zone data for loot (row 18), but roll all of it from the one server stream, and do not copy the per-item reseed or the double roll on nested items.
Acceptance: a server test rolls a seeded zone table 10,000 times and each quality share matches its weight within 1 point; a guaranteed-count entry yields exactly its count every time; a nested table reference yields only items, never a nested drop.

## 1. Mechanism

- Entry point (the top-level table resolver is `ItemsFromTreasureClass`, item_factory.go 226). It first chooses the picks, then turns each pick into items.
- Picks, two modes:
  - Guaranteed (`NumPicks` < 0, 233-244): each entry's `Probability` field is read as a count. Entries are taken in table order until `-NumPicks` picks are made. No roll.
  - Random (`NumPicks` > 0, 247-255): `NumPicks` rolls, each through `rollTreasurePick`. A roll that lands in the no-drop bucket returns nil and the pick is skipped (250-251).
- `rollTreasurePick` (199-223): the total is `FreqNoDrop` plus the sum of entry probabilities (202-206). One `Intn(total)` roll (210). A roll below `FreqNoDrop` returns nothing (212-216). Otherwise the cumulative bucket picks the entry (212-219).
- Each picked name is then checked (263):
  - If it is another table name (`Treasure.Normal`), that table is resolved recursively (265), and every item it returns gets a second quality roll from the outer table (267).
  - Otherwise it is an item: `ItemFromTreasure` (273) turns the code into an item, using either an exact item code, an equivalence class (`armo` style), or a dynamic level code (`armo23` style) (286-320). A quality roll from this table is applied (275).
- Quality roll (`rollDropModifier`, 163-197): the list is [base 1024, FreqUnique, FreqSet, FreqRare, FreqMagic], summed cumulatively (180-186). One `Intn(total)` roll (188). The first bucket above the roll gives none, unique, set, rare or magic (190-196). `FreqNoDrop` is not in this total.
- Applying a quality (`applyDropModifier`, item.go 260-287):
  - Sanitize first (289-310): a Normal-type item is forced to none (295-296); a Magic-only type is forced to magic (300-301); rare on a type that does not allow rare becomes magic (305-306).
  - Unique: pick uniformly among matching unique records (312-318, the pick is at 315). If none matches, fall back to rare (267-270).
  - Set: pick uniformly among matching set items (320-329, the pick is at 322). If none matches, fall back to rare (274-277).
  - Rare or magic: `pickMagicAffixes` (331-361). Caps: rare non-jewel 3 prefixes and 3 suffixes (348); magic 1 prefix and 1 suffix (352). Each affix slot is a coin toss, `Intn(2) > 0` (371), then a uniform pick from the matching affixes (378). A cap check breaks the loop (373-374).

## 2. Key functions

- `ItemsFromTreasureClass`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2item/diablo2item/item_factory.go` 226-283 (picks, recursion, quality per item).
- `rollTreasurePick`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2item/diablo2item/item_factory.go` 199-223 (no-drop bucket, one roll).
- `rollDropModifier`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2item/diablo2item/item_factory.go` 163-197 (base 1024 plus the four quality frequencies).
- `applyDropModifier` and `pickMagicAffixes`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2item/diablo2item/item.go` 256-287 and 331-361.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Quality weights: none base plus table weights, one roll | base 1024 (item_factory.go 21); FreqUnique, FreqSet, FreqRare, FreqMagic per table (treasure_class_record.go 12-15) |
| No-drop bucket in each pick | FreqNoDrop (treasure_class_record.go 16; loader line 54) |
| Entry weights; guaranteed counts when picks are negative | NumPicks (treasure_class_record.go 11; loader line 49); entry Probability (treasure_class_record.go 24) |
| Rare caps | prefix 3, suffix 3 (item.go 40-41) |
| Magic caps | prefix 1, suffix 1 (item.go 38-39) |
| Affix coin toss | 1 in 2 (item.go 49, 371) |
| Unique and set picks | uniform among matches; no weight (item.go 315, 322) |

## 4. TypeScript sketch

simplified: keeps the no-drop bucket, weighted picks, guaranteed-count mode, nested tables and one quality roll per item over the 1024 base, in the donor's order (picks first, then quality). It omits: the item-name resolution (equivalence and level codes), the unique, set and affix pick details, the sanitize rules, the affix caps and coin toss, and the level and type filters. It also changes the donor's behaviour in two places: it guards a zero total instead of calling Intn(0), and it does not roll quality a second time at the outer table for nested items, so each item gets one quality roll from the table that picked it.

```ts
// Licence: GPL-3.0 (donor, OpenDiablo2). clean-room
// Sketch of a weighted loot table with a no-drop bucket, guaranteed-count mode, nested table references
// and one quality roll per item. Written from the described mechanism, not a translation of the donor.
export {};

const BASE_NONE_WEIGHT = 1024;   // quality weight for "no modifier"; engine constant

type Quality = 'none' | 'unique' | 'set' | 'rare' | 'magic';

interface Entry { code: string; weight: number; }   // weight = the entry's probability (or a count in guaranteed mode)

interface Table {
  numPicks: number;              // negative = guaranteed counts from the entry weights
  noDrop: number;                // weight of the "drop nothing" bucket
  entries: Entry[];              // a code is an item, or the name of another table
  qualityWeights: { unique: number; set: number; rare: number; magic: number };
}

type Rnd = (n: number) => number;   // integer in [0, n)

// One weighted pick. The no-drop bucket comes first; a roll inside it returns null.
function pickEntry(t: Table, rnd: Rnd): Entry | null {
  const total = t.noDrop + t.entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;   // donor would call Intn(0) here; the sketch guards it
  const roll = rnd(total);
  if (roll < t.noDrop) return null;
  let acc = t.noDrop;
  for (const e of t.entries) {
    acc += e.weight;
    if (roll < acc) return e;
  }
  return null;
}

// Guaranteed-count mode: each entry weight is a count, taken in table order until -numPicks is reached.
function guaranteedPicks(t: Table): Entry[] {
  let left = -t.numPicks;
  const picks: Entry[] = [];
  for (const e of t.entries) {
    for (let c = 0; c < e.weight && left > 0; c++) {
      picks.push(e);
      left--;
    }
  }
  return picks;
}

// One quality roll for one item, out of the base none weight plus the table's quality weights.
function rollQuality(t: Table, rnd: Rnd): Quality {
  const order: Array<[Quality, number]> = [
    ['none', BASE_NONE_WEIGHT],
    ['unique', t.qualityWeights.unique],
    ['set', t.qualityWeights.set],
    ['rare', t.qualityWeights.rare],
    ['magic', t.qualityWeights.magic],
  ];
  const total = order.reduce((s, [, w]) => s + w, 0);
  const roll = rnd(total);
  let acc = 0;
  for (const [q, w] of order) {
    acc += w;
    if (roll < acc) return q;
  }
  return 'none';
}

// Resolve a table into items. Nested table names are resolved recursively.
// Simplified: each item gets one quality roll from the table that picked it (no second roll at the outer level).
function resolveTable(name: string, tables: Record<string, Table>, rnd: Rnd,
                      out: Array<{ code: string; quality: Quality }>): void {
  const t = tables[name];
  if (t === undefined) return;

  const picks: Entry[] = [];
  if (t.numPicks < 0) {
    picks.push(...guaranteedPicks(t));
  } else {
    for (let left = t.numPicks; left > 0; left--) {
      const e = pickEntry(t, rnd);
      if (e !== null) picks.push(e);
    }
  }

  for (const p of picks) {
    if (tables[p.code] !== undefined) {
      resolveTable(p.code, tables, rnd, out);
    } else {
      out.push({ code: p.code, quality: rollQuality(t, rnd) });
    }
  }
}
```

## 5. Lands in

- TARGET `src/fight/loot-table.ts` (new module: zone loot tables as data, resolved by the engine's one roll stream). Parity-checklist row 18 (loot roll and XP award). Ground piles are in a separate note (`src/fight/loot.ts`, cell 8 LostCityRS).
- Reuse tag: rewrite-from-idea (GPL-3.0 is copyleft; clean-room only, shape taken, no code)
- Brief rule served: one ledger and server-verified loot (the roll runs on the server in the one engine; zones as data); rules 7-9 n/a

## 6. Gaps and risks

- The table logic is not wired to a game event in this repo (no caller outside its own recursion). Monster-death and chest drops are not in the donor here; the note describes the table logic only.
- Per-item randomness is reseeded: `ItemFromTreasure` gives each item its own random source seeded with the factory seed (item_factory.go 289), and the factory seed is 0 in this repo (49, 52, 80). Items made from the same seed start from the same random stream, so their unique, set and affix picks use the same first numbers (item.go 315, 322, 371, 378). I did not run this to measure the effect. Frankendom must roll from its one server stream, not reseed per item. Reject this part.
- A nested table's items are rolled again at the outer table (item_factory.go 267). A unique or set code set by the inner roll is not cleared before a second roll (item.go 312-329 set codes only when matches exist). The result can mix codes; the donor's display of that case was not read.
- Suffix pool is read from the prefix table: `suffixes := ...Magic.Prefix` (item.go 357) while suffix records are looked up in the suffix table (item.go 220). This looks like a copy-paste bug. The effect: a suffix pick is drawn from prefixes, and `affixRecords` returns nil for a code missing from the table (item.go 233-235). Do not copy this line; Frankendom must test its suffix pool separately.
- The rare cap check (item.go 373-374) compares the prefix count to the max in the same loop that picks suffixes. Not traced further.
- Unique and set picks are uniform among matches; there is no per-record weight. A Frankendom drop rule would need its own weights.
- Quality weights are cumulative integers over 1024; Frankendom's zone data should state a base weight on purpose, not inherit 1024 silently.
- Not read: the level and type filters in `FindMatchingAffixes` after line 354; `findMatchingUniqueRecords` and `findMatchingSetItemRecords`; property generation.
