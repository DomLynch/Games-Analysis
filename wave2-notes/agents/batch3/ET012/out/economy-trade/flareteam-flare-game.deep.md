# flareteam-flare-game (economy-trade, cell 3)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/LootManager.cpp` (mechanism, engine) with the game data at `/mnt/frankendom-donors/flareteam-flare-game/mods/empyrean_campaign/npcs/martigan.txt` and `.../loot/trader_martigan.txt` (data) | Licence: engine GPL-3.0-or-later (per file headers: "either version 3 of the License, or (at your option) any later version"); game data CC-BY-SA 3.0 Unported (`/mnt/frankendom-donors/flareteam-flare-game/LICENSE.txt`) | C++ and data files | symbol `LootManager::checkLoot`

Checked: The cell's hint file (`art_src/characters/trader/wandering_trader.blend`) is an art model and was not used. The economy is data in the game repo (NPC stock lines, trader loot tables, `engine/loot.txt`) run by the engine. Read in full: `LootManager::checkLoot` LootManager.cpp 322-389. Read: `NPCManager::handleNewMap` NPCManager.cpp 65-110; `NPC::load` stock parse NPC.cpp 248-292 and roll 443-452. Data read: martigan.txt 12-14; trader_martigan.txt (chance order by script, all six trader tables); trader_loren.txt chance runs; engine/loot.txt (empyrean). Confidence: high on the per-visit rebuild and one-pick-per-roll; high on the band weights for these tables (worked by hand and checked by simulation of the sketch); medium on the order quirk in section 6 (traced by hand, not run). Not read: `Math::randBetween` and `Math::randBetweenF` (assumed uniform; inclusive range assumed), `checkLootComponent` (quantity rules), the stock merge in `ItemStorage`, the call sites of `handleNewMap` (so when a map is entered is not confirmed here), and the campaign status checks. Camera: not applicable.

## 1. Mechanism

- Rebuild per map load. `NPCManager::handleNewMap` deletes the NPCs from the last map except living hero allies (NPCManager.cpp 77; the ally exception is at 73-74 and the skip at 90-92). For each NPC queued in the new map it constructs the NPC (98) and calls `load` (105). Stock is therefore rebuilt whenever the map is built (call sites not read).
- Parse. In `NPC::load`, `constant_stock` items go straight into stock (248). `random_stock` parses a loot table into `random_table` (276). `random_stock_count` sets a minimum and maximum number of rolls (286); if either is non-zero, the minimum is at least 1 and the maximum at least the minimum (NPC.cpp 288-292).
- Roll count. At load, the number of rolls is drawn between the minimum and maximum (443). `checkLoot` is called once per roll (446-448). The rolled stacks are sorted and added to the vendor stock (449-451).
- One roll (`checkLoot`, LootManager.cpp 322-389). Draw one number `chance` from 0 to 100 (328). Fixed entries (chance 0) are dropped at once and erased from the table (337-341); they are therefore added on the first call only. For each remaining entry (not a sub-table): `real_chance` is its chance (353); item entries are scaled by (item find + 100) / 100 (355-356); the level gate applies when both min and max are set (360-361). An entry is a candidate when `real_chance >= chance`, the level gate passes, and the status gate passes (364). The threshold starts at item find + 100 (346). A candidate whose chance is at or below the threshold becomes the new threshold, and if it is strictly lower the candidate list is cleared (365-370). The entry is pushed when the roll is at or below the threshold and its max drops is not 0 (373). One candidate is then picked by `rand() %` the count (381), dropped (383), and its max drops decremented if positive (385-386).
- Max drops. Each entry's max drops is copied from the item's `loot_drops_max` (LootManager.cpp 654), which defaults to -1 (ItemManager.cpp 346): -1 is unlimited. The table is the NPC's own copy, so the count resets on every rebuild.

## 2. Key functions

- `LootManager::checkLoot`: `/mnt/frankendom-donors/flareteam-flare-engine/src/LootManager.cpp` 322-389. One roll: fixed drops, band-edge candidates, one pick, max-drop decrement.
- `NPCManager::handleNewMap`: `/mnt/frankendom-donors/flareteam-flare-engine/src/NPCManager.cpp` 65-110. Rebuild of queued NPCs on a map.
- `NPC::load` stock block: `/mnt/frankendom-donors/flareteam-flare-engine/src/NPC.cpp` 248-292 (parse) and 443-452 (roll and add).
- Data: `/mnt/frankendom-donors/flareteam-flare-game/mods/empyrean_campaign/npcs/martigan.txt` 12-14 (constant stock, table file, roll count 15-20); `.../loot/trader_martigan.txt` (tiers at lines 2, 22, 57, 92).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per visit: fixed items once, then N rolls between a min and max | Martigan rolls 15 to 20 (theirs, martigan.txt 14) |
| One roll gives at most one entry | Band edges 100, 75, 50, 25 (theirs, trader_martigan.txt 2, 22, 57, 92) |
| Band weight is the gap below an edge: rolls at or below an edge that no tighter edge beats fall in that edge's band | Martigan: each band 25% of rolls. Loren (edges 100, 75, 25, 5): 25%, 50%, 20%, 5% (trader_loren.txt 92 has the 5 edge) |
| Rolls above the top edge yield nothing | None (mechanism) |
| Item find shifts item edges upward | Threshold start 100 (LootManager.cpp 346); scale (find + 100) / 100 (356) |
| Per-visit cap per item | Default -1 unlimited (ItemManager.cpp 346); copied at 654 |
| Level gate on an entry | min and max level, both must be above 0 (360-361) |

Worked band weights (by hand, from the candidate rule above). Martigan edges 100, 75, 50, 25: a roll in (75, 100] can only be beaten by the 100 edge, so the 100 band has weight 25%; (50, 75] gives the 75 band; (25, 50] the 50 band; [0, 25] the 25 band. Each is 25%. Loren edges 100, 75, 25, 5: (75, 100] gives the 100 band 25%; (25, 75] gives the 75 band 50%; (5, 25] gives the 25 band 20%; [0, 5] gives the 5 band 5%.

## 4. TypeScript sketch

simplified: the sketch uses the intended candidate rule (the tightest edge that beats the roll, so the result does not depend on table order); the donor's push test compares the roll with the threshold and so depends on order (see section 6). It adds fixed entries once per visit before the rolls, even when the count is zero (the donor adds them on the first roll only). It copies the table per visit as the donor does. It omits the campaign status gate, the currency entries, the quantity rules of the loot component, the stack merge, and the sort of rolled stacks.

```ts
// Licence: GPL-3.0-or-later (donor engine) and CC-BY-SA 3.0 (donor game data). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Entry = {
  item: string;
  qty: number;          // quantity per drop
  chance: number;       // a band edge, 0-100; 0 = fixed (always added once)
  isItem: boolean;      // item entries are scaled by item find; currency is not
  levelMin: number;     // 0 = no level gate
  levelMax: number;
  maxDrops: number;     // per visit; -1 = unlimited, 0 = spent
};

// One roll: draw a number 0-100, then take the entry set whose edges beat it, keep the tightest edge, and pick one of those.
// Result is at most one entry per roll.
function pickOne(table: Entry[], itemFind: number, level: number, rng: () => number): Entry | null {
  const roll = rng() * 100;
  let best = Infinity;
  let hits: Entry[] = [];
  for (const e of table) {
    if (e.chance === 0 || e.maxDrops === 0) continue; // fixed entries are handled separately
    if (e.levelMin > 0 && e.levelMax > 0 && (level < e.levelMin || level > e.levelMax)) continue;
    const real = e.isItem ? e.chance * (itemFind + 100) / 100 : e.chance;
    if (real < roll) continue; // only edges that beat the roll
    if (real < best) {
      best = real;
      hits = [];
    }
    if (real === best) hits.push(e);
  }
  if (hits.length === 0) return null;
  const pick = hits[Math.floor(rng() * hits.length)];
  if (pick.maxDrops > 0) pick.maxDrops -= 1;
  return pick;
}

// Restock on a visit: the fixed entries are added once, then a count of rolls is drawn between min and max.
// The table is a fresh copy for this visit, so maxDrops resets on every visit.
function restock(table: Entry[], countMin: number, countMax: number, itemFind: number, level: number, rng: () => number): Map<string, number> {
  const visit = table.map((e) => ({ ...e }));
  const out = new Map<string, number>();
  const add = (item: string, qty: number) => out.set(item, (out.get(item) ?? 0) + qty);
  for (const e of visit) if (e.chance === 0) add(e.item, e.qty);
  const rolls = countMin + Math.floor(rng() * (countMax - countMin + 1));
  for (let i = 0; i < rolls; i++) {
    const got = pickOne(visit, itemFind, level, rng);
    if (got) add(got.item, got.qty);
  }
  return out;
}

export {};
```

Test on the VPS (not part of the note): the sketch typechecks (`tsc --noEmit --strict --target es2020`, exit 0). A simulation of 100,000 rolls gave martigan-style equal bands of 0.250, 0.253, 0.249, 0.249; edges 100, 25, 5 gave 0.750, 0.201, 0.049; a maximum of 2 drops per visit held (got 2 out of 50 rolls); a fixed entry was added once per visit. These are the sketch's results, not a run of the donor.

## 5. Lands in

- TARGET `origins/server/vendor-stock.ts` (proposed new module; not checked in the repo). Zone vendor stock built on the server at zone entry from data: constant lines, a band table, a roll count range, and per-visit caps. The seeded RNG lives on the server.
- Parity-checklist row 18 (loot roll and XP award): this is a loot roll with bands and per-visit caps. Row 18 is the closest of rows 1-23 for a roll that picks one entry.
- Reuse tag: adapt-shape (GPL-3.0-or-later engine, CC-BY-SA 3.0 data; clean-room only, the sketch is written from the mechanism and no data table is copied)
- Brief rule served: zones as data (stock is data per vendor); server-verified (the roll runs on the server, the client shows the result); rules 7-9 n/a

Best transferable idea: Make a vendor's stock a fixed list plus a band table rolled a range of times per visit, where each roll picks at most one entry by the tightest band edge that beats it, with a per-visit cap per item.

Decision (proposed): adapt. The band table is a clean data shape for scarce stock, and it fits zones as data. Adapt it: the roll runs on the server with a seeded RNG, the candidate rule is order-independent, each entry's band weight is shown to the designer (gap below its edge), and restock is a server-side policy (a timer or zone state), not a re-roll on every entry.

Acceptance: a test that enters the trader zone 10,000 times with edges 100/75/50/25 and sees each band within 2% of 25% of picks; a rare item capped at 2 per visit never appears a third time; and a restock policy test where leaving and re-entering the zone within the restock timer does not refill the rare stock.

## 6. Gaps and risks

- Order quirk (traced by hand, not run): the push test at LootManager.cpp 373 compares the roll with the threshold, not the entry's own edge. With edges listed as 50 then 80 and a roll of 30, both are pushed, so the 80 entry is a candidate; listed as 80 then 50, only the 50 entry is pushed. The result depends on table order. All six shipped trader tables list edges in descending order (checked by script: no rises), where the intended result holds, so this is latent. Frankendom must sort the table or use the order-independent rule in the sketch, and test it.
- Re-roll on entry: the donor rebuilds a vendor's stock each time its map is built, with no saved state in this code path (handleNewMap, 65-110). If Frankendom rebuilt on every zone entry, a player could refill rare stock by changing zone. Frankendom needs a server restock policy (a timer or zone state), per zone, with a test.
- Band weights are implicit. A designer who writes an edge of 5 gets 5% only when the next edge up is 25 or more; a lone edge of 25 with nothing above it gives nothing on 75% of rolls, with no error. Frankendom's data should show each entry's weight, and the loader should reject a table whose top edge is below 100 unless that is meant.
- Fixed entries are added only when at least one roll runs (NPC.cpp 443-447 and LootManager.cpp 337-341). A count range of 0 to 0 would drop them not at all. Frankendom adds fixed entries once per visit regardless (see sketch).
- Item find is a player stat read at the time of the roll (LootManager.cpp 346, 356). A vendor's stock therefore depends on who enters the zone. Frankendom: vendor stock should not depend on the entering player's stats unless that is a designed rule.
- The roll runs in the client (NPC load, NPC.cpp 443-451) and uses C `rand()` (LootManager.cpp 381). Frankendom: the roll is server-side with the server's seeded stream; the client only displays the result.
- Prices of the rolled items come from the price rules in the cell-2 note (flareteam-flare-engine), not here. The empyrean data sets the old sell ratio to 1.0 (engine/loot.txt 3), so a sold item rebought after a visit costs the full buy-side price; that is a sink rule, and it belongs in the vendor-price design, not in the stock roll.
