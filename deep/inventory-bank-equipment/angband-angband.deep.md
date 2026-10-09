# angband-angband (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/angband-angband/src/ui-equip-cmp.c | Licence: GPL-2 or the Angband licence (dual, per the source header; the Angband licence allows copying for educational, research and non-profit purposes only) | C | symbol display_object_comparison / sel_better_than

Licence note: GPL-2 or the Angband licence (dual, per the source header; the Angband licence allows copying for educational, research and non-profit purposes only). CLEAN-ROOM sketch only.

Symbol check: `sel_better_than` (input line 265 does not land on it; the definition is at 1635-1639) is inside `#if 0` (1634) ... `#endif` (1640) (the two directive lines are too short to receipt; the definition at 1635-1639 is receipted). It is not compiled in this tree, so it is dead code and is not the mechanism. The live logic is the equipment-comparison view: the quality classification (in add_obj_to_summary, 2038-2109), the side-by-side comparison display (`display_object_comparison`, 1440-1471), and the sort and filter path (`sort_items` 1922-1929, `cmp_by_quality` 1876-1881, `filter_items` 1836-1865). These are described below.

## 1. Mechanism

- Equipment comparison is a read-only view over the player's gear, the pack and the floor items (the "summary"). Each candidate is turned into an `equippable` record with: value columns (`vals`/`auxvals`, computed per property by `compute_ui_entry_values_for_object`, 2057-2068), a short name, the source (enum `equippable_source`, 45-51: worn, pack, floor, home, store), a wield slot (`wield_slot`, 2106), a colour and character (2107-2108), and a quality class (enum `equippable_quality`, 53-59, ordered artifact, ego, good, average, bad, so an ascending sort puts the best first).
- Quality class (2080-2104, a `switch` on `ignore_level_of(obj)`): ignore level good, average or bad maps straight to that class. In the default case: artifact if `obj->known->artifact`, ego if `obj->known->ego`, else average; items with no known data fall to average (2100).
- Filtering (`filter_items`, 1836-1865): picks the config filter if `config_filt_is_on` (1838-1843), else the easy filter, else no filter (all indices, 1848-1860). A filter is simple (`apply_simple_filter`, 1715-1771: AND or OR over selector functions, e.g. `sel_only_src` 1708, `sel_exclude_src` 1701, `sel_at_least_resists` 1643) or complex (`apply_complex_filter`, 1774-1833, an expression evaluated with a boolean stack). It rebuilds `sorted_indices`, then resets the first-shown item and page count (1862-1864).
- Sorting (`sort_items`, 1922-1929): the key list is `config_sort` if `config_sort_is_on`, else `default_sort`. Comparators (1868-1897): location (source), quality, short name (`strcmp`), slot. `cmp_for_sort_items` (1900-1919) walks the key list until one comparator is nonzero. Sort is on the `sorted_indices` array, so the records are not moved.
- Comparison: two items can be selected (`isel0`, `isel1`; set in the select-accept action around 1193-1200). `display_object_comparison` (1440-1471) shows the first item's description and info, then the second's, in one text block titled "Object comparison". With one item (or the same index twice) it shows that item alone.
- Output: a view. Nothing is changed in the player's inventory; the view only reads.
- Runs when the player opens the comparison screen or changes a filter or sort.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| add_obj_to_summary (quality block 2080-2104) | /mnt/frankendom-donors/angband-angband/src/ui-equip-cmp.c | 2038-2109 | Sets qual, slot, source, colour from the object and the ignore level |
| display_object_comparison | /mnt/frankendom-donors/angband-angband/src/ui-equip-cmp.c | 1440-1471 | Shows one item or two side by side |
| filter_items | /mnt/frankendom-donors/angband-angband/src/ui-equip-cmp.c | 1836-1865 | Builds the visible index list from a simple or complex filter |
| apply_simple_filter | /mnt/frankendom-donors/angband-angband/src/ui-equip-cmp.c | 1715-1771 | AND or OR over selector functions |
| sort_items | /mnt/frankendom-donors/angband-angband/src/ui-equip-cmp.c | 1922-1929 | Sorts the index array with the chosen key list |
| cmp_by_location / cmp_by_quality / cmp_by_short_name / cmp_by_slot | /mnt/frankendom-donors/angband-angband/src/ui-equip-cmp.c | 1868-1897 | Comparators for sort keys |
| cmp_for_sort_items | /mnt/frankendom-donors/angband-angband/src/ui-equip-cmp.c | 1900-1919 | Walks the key list until a comparator returns nonzero |
| apply_complex_filter | /mnt/frankendom-donors/angband-angband/src/ui-equip-cmp.c | 1774-1833 | Expression filter with a boolean stack (not detailed here) |
| sel_better_than | /mnt/frankendom-donors/angband-angband/src/ui-equip-cmp.c | 1635-1639 | Dead code inside `#if 0`; not used |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A view record per candidate item: columns, source, slot, quality class | Quality classes artifact, ego, good, average, bad (theirs, enum at 53-59) |
| Sort an index array, not the records; config sort key list with a default | Key list from config or default (theirs, 1925-1926) |
| Simple filter as AND or OR over selectors; complex filter as an expression | Selector set (theirs, e.g. 1643-1712) |
| Side-by-side compare of two selected items | Two-item compare (theirs) |

## 4. TypeScript sketch

Licence: GPL-2 or Angband licence. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: only the simple AND/OR filter is sketched (no complex expression stack, no config-vs-easy filter choice, no page reset); sources omit floor and home; the donor's quality order (artifact lowest, so an ascending sort puts the best first) and source order (worn, pack, floor, home, store) are kept as explicit rank tables; pack/ignore-level lookup is passed in as arguments; no value columns, short names or two-item compare.

```ts
// clean-room sketch of a read-only comparison view: classify, filter, sort by index.
// Licence line: GPL-2 / Angband licence donor; this sketch is clean-room, written from mechanism only.
type Quality = 'bad' | 'average' | 'good' | 'ego' | 'artifact';
type Source = 'worn' | 'pack' | 'floor' | 'home' | 'store';
interface Candidate { id: string; name: string; slot: string; source: Source; quality: Quality; values: number[]; }
// Lowest rank sorts first, so artifacts lead an ascending sort.
const QUALITY_ORDER: Record<Quality, number> = { artifact: 0, ego: 1, good: 2, average: 3, bad: 4 };
const SOURCE_ORDER: Record<Source, number> = { worn: 0, pack: 1, floor: 2, home: 3, store: 4 };
function classify(ignoreLevel: 'good' | 'average' | 'bad' | undefined, isArtifact: boolean, hasEgo: boolean): Quality {
  if (ignoreLevel) return ignoreLevel;
  if (isArtifact) return 'artifact';
  if (hasEgo) return 'ego';
  return 'average';
}
// Simple filter: AND or OR over predicates. Returns indices into the list.
function filterIndices(list: Candidate[], preds: ((c: Candidate) => boolean)[], mode: 'and' | 'or'): number[] {
  const out: number[] = [];
  list.forEach((c, i) => {
    const ok = mode === 'and' ? preds.every((p) => p(c)) : preds.some((p) => p(c));
    if (ok) out.push(i);
  });
  return out;
}
// Sort the index array only; records do not move.
function sortIndices(list: Candidate[], idx: number[], keys: ((a: Candidate, b: Candidate) => number)[]): number[] {
  return [...idx].sort((i, j) => {
    for (const k of keys) {
      const r = k(list[i], list[j]);
      if (r !== 0) return r;
    }
    return 0;
  });
}
const byQuality = (a: Candidate, b: Candidate) => QUALITY_ORDER[a.quality] - QUALITY_ORDER[b.quality];
const bySource = (a: Candidate, b: Candidate) => SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
const byName = (a: Candidate, b: Candidate) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
```

## 5. Lands in

- Frankendom: src/gear-stats.ts (the per-item values and the compare of two items) and src/fight/gear-room.ts (today: src/gear-room.ts, moving) (the filtered and sorted list). The compare view is a display and would sit in the gear room UI.
- Parity checklist row 14 (HUD bars and numbers, src/hud.ts) only if the compare numbers are shown in the HUD. Row 20 (catalogue as runtime source) and row 21 (catalogue fields) for the quality class.
- Beyond checklist: none (gear room UI is not a checklist row; nearest is row 15, gear dressing, for the equipped set).

Reuse tag: rewrite-from-idea
Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks

- The donor's quality class depends on identification state and on an "ignore" setting. Frankendom gear is catalogue data, always known; the unknown-as-average rule is not needed.
- The filter and sort engine is large (complex expression trees). Frankendom's gear room needs only a few sorts; do not port the expression engine.
- Licence is GPL-2 or the non-profit Angband licence, so no lines may be lifted. Only the mechanism is used, written clean-room.
- Conflict check: a compare view is read-only, so it fits any one-engine layout. It must not write gear state.
- The `sel_better_than` symbol in the input is dead code. Do not cite it as the mechanism.
