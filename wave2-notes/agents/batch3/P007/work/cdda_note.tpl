# CleverRaven-Cataclysm-DDA (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/item_group.cpp` (symbols `Item_group::create`, `Item_group::create_single`, `Item_group::pick_distribution_entry`, `Single_item_creator::create`, `item_group::items_from`), with the death-drop call site in `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/monster.cpp` (`monster::drop_items_on_death`) | Licence: Creative Commons Attribution-ShareAlike 3.0 Unported for the whole project (`/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/LICENSE.txt`, line 1); clean-room, shape only | C++ | symbol `Item_group::create`

Checked: the hint was INFERRED (no file given). I searched item_group.cpp and the death path and found the real implementation in `item_group.cpp`. Read in full: `Item_group::Item_group` (834-851), `add_entry` (873-892), `create` (894-915), `create_single` (917-932), `pick_distribution_entry` (934-960), `get_probability` (975-994), `Single_item_creator::create` (281-330), `Item_spawn_data` wrappers (44-56), `items_from` (1081-1092). Death path: `monster::die` call site (3284), `drop_items_on_death` (3409-3440). Also read: `rng` (rng.cpp 20-26, rng.h 35) and the ITEM_SPAWNRATE add() call (options.cpp 2882). Confidence high on the roll order, the weights and the leaf spawn-rate gate. Not read: `Single_item_creator` constructor and `create_single_without_container` (186-280), `put_into_container`, `potential_items` (1060), the holiday function behind EVENT_SPAWNS, the add() signature (so the meaning of the 0.01 / 10.0 / 1.0 arguments is by position only), the corpse placement after 3440, ownership of dropped loot, `mondeath.cpp`, and the map-spawn path in mapgen.cpp (it scales counts by the same option, not receipted). Searches: grep for item_group, items_from, drop, death_drops, spawn_rate, rng across src.

## 1. Mechanism

- A loot table is an `Item_group` with a type. Two types matter here. `G_COLLECTION`: every entry is a separate roll. `G_DISTRIBUTION`: one entry is picked by weight. Entries are added in `add_entry` (873): an entry with probability 0 or less is dropped (876); in a collection each probability is capped at 100 (879-880); the entry's probability is added to `sum_prob` (882).
- Collection roll (`create`, 894-916): for each entry, unless the call is "maximized", draw `rng(0,99)` and skip the entry when the draw is greater than or equal to its percent (900). So a p percent entry passes when the draw is below p. Passing entries are created in order; nothing stops a second entry from passing too.
- Distribution pick (`pick_distribution_entry`, 934-960): build a cumulative table of weights (lazily, cached, 941-947), draw `rng(1, sum_prob)` (949, inclusive), and take the first entry whose cumulative weight is at least the draw (lower_bound). If that entry is event-based and its event is inactive, the pick yields nothing (957): the slot is reserved, the spawn is lost, nothing falls through to another entry.
- Count and leaf (`Single_item_creator::create`, 281-330): each entry may have a count range; the count is `rng(first, second)` (291) or the top of the range when maximized. For each count: if the entry is an item, it is built (`create_single_without_container`), and then, when the call has the `use_spawn_rate` flag and the item is not a mission item, a float is drawn and the item is skipped when the draw is above the global `ITEM_SPAWNRATE` (299-300, read in the donor's order: build first, then roll). If the entry is a nested group, the group is checked against the recursion stack (308) and then created with the same flags (318).
- The global density knob: `ITEM_SPAWNRATE` is a float option with range 0.01 to 10.0 and default 1.0 (options.cpp 2882; the default is by argument position, the add() signature was not read). It is read once per entry in `Single_item_creator::create` (295) and only scales leaf items, not the group rolls.
- Entry points: `item_group::items_from` (1081-1092) creates a whole group. Monster death drops call it with `use_spawn_rate` (monster.cpp 3418-3420). Those drops are placed on the map or on the corpse after that point (not read past 3440).
- Death path: `monster::die` calls `drop_items_on_death` (monster.cpp 3284) when the monster has death drops and the no-extra-drops flag is off (3283). A second call to the same table is in `generate_inventory` (3381-3392), which runs from `monster::poly` (374) and is not the death path.
- Tick: none. Loot is rolled once, at the moment of the call (death, deconstruction, bash, or map spawn).

## 2. Key functions

- `Item_group::create`: `item_group.cpp` 894-915. Collection branch (898-903) and distribution branch (905-909), then container placement.
- `Item_group::create_single`: 917-932. Same two branches, but a collection returns only the first passing entry (921-925), where `create` returns all passing entries. The two paths disagree (see section 6).
- `Item_group::pick_distribution_entry`: 934-960. The weighted pick.
- `Single_item_creator::create`: 281-330. Count range, leaf spawn-rate gate, nested group with recursion guard.
- `item_group::items_from`: 1081-1092. Entry point used by callers (recipes, construction, companion missions, NPC worn items, monsters).
- `monster::drop_items_on_death`: `monster.cpp` 3409-3420. The death roll with `use_spawn_rate`.
- Callers of `items_from` other than monster death were seen in grep only (recipe.cpp 1297, construction.cpp 1540-2001, npc.cpp 961); their use was not read.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Independent percent roll per entry: pass when draw < p, draw is rng(0,99) | p is 0..100 per entry; the 0..99 range is the donor's percent (theirs, item_group.cpp 900) |
| Weighted pick: draw 1..sum, first entry at or above the draw | Weights are the entry numbers themselves; no fixed total (theirs, item_group.cpp 949) |
| Count range per entry, rolled inclusive | Count range comes from the entry's modifier (theirs, 291) |
| Global density multiplier on leaf items only | ITEM_SPAWNRATE 0.01 to 10.0, default 1.0 (theirs, options.cpp 2882; leaf gate at item_group.cpp 299-300) |
| Recursion guard by stack of group ids | Guard in the nested-group branch (theirs, item_group.cpp 308) |
| Event-gated slot that yields nothing when inactive | Event check at item_group.cpp 957 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for each entry: the collection gate (or the weighted pick), then the count, then the leaf spawn-rate gate, and the nested group check. It differs in four ways. (1) The sketch returns item ids, not built items, and it does not build an item before the spawn-rate draw (the donor builds the item first, then draws). (2) It omits event-gated entries, the mission-item exemption from the spawn rate, artifacts, count modifiers beyond the range, containers, ammo and magazine chances, birthdays and rot, and the consistency check. (3) It returns every passing collection entry, as `create` does, and does not reproduce `create_single`, which returns only the first. (4) The probability cap at 100 is assumed (the sketch does not clamp), so a collection entry must already be 0..100.

```ts
// Licence: CC-BY-SA 3.0 (donor, whole project). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type IntRng = (lo: number, hi: number) => number; // inclusive, like the donor's rng(lo, hi)
type FloatRng = () => number;                      // 0..1

interface Entry {
  kind: "item" | "group";
  id: string;
  prob: number;              // collection: percent 0..100; distribution: a weight
  count?: [number, number];  // how many to make, rolled per entry
}
interface Table { type: "collection" | "distribution"; entries: Entry[] }

interface Ctx {
  int: IntRng;
  float: FloatRng;
  spawnRate: number;         // global density knob, applied at leaf items only
  maximized: boolean;        // skip the rolls, take the top of each count range
  applySpawnRate: boolean;   // per call, like the donor's use_spawn_rate flag
}

export function roll(tables: Map<string, Table>, id: string, ctx: Ctx, stack: string[] = []): string[] {
  const t = tables.get(id);
  if (!t || stack.includes(id)) return [];   // unknown table, or a loop back into the stack
  const out: string[] = [];
  stack.push(id);
  if (t.type === "collection") {
    for (const e of t.entries) {
      // a p percent entry passes when the roll is below p
      if (!ctx.maximized && ctx.int(0, 99) >= e.prob) continue;
      out.push(...emit(tables, e, ctx, stack));
    }
  } else {
    const total = t.entries.reduce((s, e) => s + e.prob, 0);
    if (total > 0) {
      const pick = ctx.int(1, total);
      let acc = 0;
      for (const e of t.entries) {
        acc += e.prob;
        if (pick <= acc) { out.push(...emit(tables, e, ctx, stack)); break; }
      }
    }
  }
  stack.pop();
  return out;
}

function emit(tables: Map<string, Table>, e: Entry, ctx: Ctx, stack: string[]): string[] {
  const n = e.count ? (ctx.maximized ? e.count[1] : ctx.int(e.count[0], e.count[1])) : 1;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    if (e.kind === "group") { out.push(...roll(tables, e.id, ctx, stack)); continue; }
    if (ctx.applySpawnRate && ctx.float() > ctx.spawnRate) continue;
    out.push(e.id);
  }
  return out;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file copied to /tmp/cdda-loot.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module: the loot roll, one function on the server, called at the moment of a kill). Parity-checklist row 18 (loot roll and XP award). The table entries and the density multiplier are zone data (zones as data), the roll itself is server-side.
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0 project; clean-room only)
- Brief rule served: server-verified kills (the roll happens on the server after a verified kill, not on the client); one ledger (the drops and the award are written once, from the server's roll result)

Best transferable idea: a loot table is data with two modes, an independent percent roll per entry or one weighted pick, with a per-zone density knob on the leaf items only, and every nested table guarded against loops.

## 6. Gaps and risks

- CC-BY-SA 3.0 project: clean-room only. The sketch is written from the mechanism.
- Two paths disagree. `create` returns every passing collection entry, but `create_single` returns only the first (item_group.cpp 921-925). Frankendom must have one function that returns the full list, and test it.
- The roll is not seeded in the donor's sketch: it uses the global `rng` (rng.cpp 20-26) with a process-wide engine. Frankendom needs a seeded server RNG so a kill's drops can be replayed and audited in the one ledger.
- Death can roll the table twice in the donor: once at death (monster.cpp 3284 to 3420) and once at polymorph (374 to 3392, which fills inventory). Frankendom must have one roll point per kill.
- The density knob is a global option. Frankendom should make it per-zone data with a default of 1.0, and must decide whether quest and mission items are exempt (the donor exempts mission items, item_group.cpp 299).
- A weighted pick can yield nothing (inactive event slot, item_group.cpp 957). That is a deliberate donor choice; Frankendom should only allow it if the design wants empty drops, and record it.
- Loot ownership (who may take the drop, how long it lasts) was not read. Frankendom's ledger needs it; the donor's answer is unknown from this pass.
- Probability is a percent with a 0..99 draw, so p = 100 always passes and p = 0 never does. Frankendom should state this rule in the zone data format so content authors do not assume a 0..1 scale.
