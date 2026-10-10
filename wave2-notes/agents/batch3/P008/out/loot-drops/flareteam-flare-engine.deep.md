# flareteam-flare-engine (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/LootManager.cpp` | Licence: GPL-3.0-or-later (LootManager.h header: "version 3 of the License, or (at your option) any later version"; COPYING is GPL version 3) | C++ | symbol `LootManager::checkLoot`

Checked: Read in full: `checkEnemiesForLoot` (256-294), `checkMapForLoot` (299-316), `addEnemyLoot` (318-320), `checkLoot` (322-389), `addLoot` (391-434), `getLootTable` (790-804), `checkLootComponent` (806-860), `parseLoot` (616-695), `loadLootTables` (697-788), `logic` (103-146). Death hook read at `StatBlock.cpp` 880-932; math helpers read at `UtilsMath.h` 30-66; `ITEM_FIND` definition read at `Stats.cpp` 114-119. Callers of `checkLoot` enumerated by grep: three in this file, plus `EventManager.cpp:1178` and `NPC.cpp:447,458` (which pass an item vector instead). Callers of `addEnemyLoot`: `StatBlock.cpp:927` only. Not read: `checkPickup`, `checkAutoPickup`, `checkNearestPickup`, `renderTooltips`, `addRenders`, `ItemManager::getExtendedStacks` (how a quantity is split into stacks), the `dropped_by_hero` ownership rule, `Loot.cpp`, and the loop that calls `GameStatePlay::logic` (fixed or variable step not read). Confidence: high on the selection rule. I checked its order dependence with a local replica of lines 346-388 (`work/flare_pick_replica.py`), which copies the loop; I did not run the donor binary. Depth: full for the roll and the drop path.

Best transferable idea: one weighted roll per death where each entry's chance (scaled by a find stat) must reach the roll and the tightest qualifying chance wins, with fixed drops handled first and removed from the table.

## 1. Mechanism

- Trigger. An enemy death reaches `loot->addEnemyLoot(this)` at `StatBlock.cpp` 927, and only when the enemy is not a hero ally or was converted (893). That call only queues the enemy in `enemiesDroppingLoot` (`LootManager.cpp` 319). Nothing is rolled at the kill.
- Tick. `LootManager::logic()` runs once per call of `GameStatePlay::logic()` (`GameStatePlay.cpp` 857 is the function; 896 is the call). It calls `checkEnemiesForLoot()` (138) and then `checkMapForLoot()` (139). So a death's loot is rolled on a later logic call, not in the kill call. Whether that loop is fixed or variable step was not read.
- Per queued enemy (256-294). (a) Quest loot: if `quest_loot_id != 0`, one fixed entry (chance 0, quantity 1) is rolled from a local table (265-274). (b) If the enemy's own loot table is non-empty, the drop count is `randBetween(loot_count.x, loot_count.y)` when `loot_count.y != 0`, else `randBetween(1, drop_max)` (279-284). `checkLoot` then runs that many times on the same table (286-288), and the table is cleared (290).
- One `checkLoot` call (322-389). Let r = uniform in [0, 100] (328).
  - Pass 1, fixed entries (331-343). Walking the table backwards, every entry with chance 0 (table-reference markers excepted, 334-335) is erased. It drops only if its campaign flag passes (337-340); the erase at 341 happens either way. So a fixed entry drops once per enemy, on the first of the repeated calls.
  - Pass 2, one random pick (345-388). `threshold` = 100 + ITEM_FIND (346). For each entry that is not a table marker (334-335): `real` = chance, multiplied by (100 + ITEM_FIND)/100 when the entry's id is not 0 (353-357). The entry qualifies if real >= r, its level range passes (only when both bounds are set, 360-362), and its flag passes (364). For a qualifying entry: if real <= threshold, the candidate list is cleared when real is strictly below threshold (366-367), and threshold = real (370). The entry is then added to candidates if chance <= threshold and MAX_DROPS != 0 (373-375). After the loop, one candidate is picked with `rand() % n` (381-382) and its MAX_DROPS is decremented if it is positive (385-387).
  - As written, the chosen entry is the one with the smallest qualifying real chance, but the code is order dependent (section 3). The `chance <= threshold` test at 373 is always true for a qualifying entry, because threshold is never below the roll.
- Quantity (838-841). Min = QTY_MIN + (level - 1) x QTY_PER_LEVEL_MIN, max likewise; quantity = randBetween(min, max), inclusive. For currency (id 0 or the currency id), quantity x (100 + CURRENCY_FIND) / 100 (844-847). Items go through `items->getExtendedStacks` (851, not read).
- Placement (818-834). Drop at the tile centre (source + 0.5). If that tile is not valid, try a random neighbour within `drop_radius`; if that is not valid either, drop at the hero's position. The chosen tile is blocked for this tick and released at the end of `logic()` (145). This stops two drops landing on one tile within one tick, nothing more.
- addLoot (391-434). The same item at the same float position merges its quantity into one pile (402-411). Otherwise a new Loot is added. If the item has a loot animation, the band is chosen by quantity (414-426); otherwise it is on the ground at once (429).

## 2. Key functions

- `LootManager::checkLoot`: `/mnt/frankendom-donors/flareteam-flare-engine/src/LootManager.cpp` 322-389. Two passes: fixed drops, then one threshold-narrowed pick.
- `LootManager::checkEnemiesForLoot`: `/mnt/frankendom-donors/flareteam-flare-engine/src/LootManager.cpp` 256-294. The per-death driver: quest loot, drop count, repeated `checkLoot`.
- `LootManager::checkLootComponent`: `/mnt/frankendom-donors/flareteam-flare-engine/src/LootManager.cpp` 806-860. Position, quantity, currency scale, handover to `addLoot`.
- `LootManager::addLoot`: `/mnt/frankendom-donors/flareteam-flare-engine/src/LootManager.cpp` 391-434. Merge rule and animation choice.
- `LootManager::parseLoot` and `loadLootTables`: `/mnt/frankendom-donors/flareteam-flare-engine/src/LootManager.cpp` 616-788. Table files. A table reference is expanded into the list at load time (634, 674); `checkLoot` then skips the reference marker (334-335).
- Death hook: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 893 and 927.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One uniform roll per death-table pass; entries are percent chances; the qualifying entry with the lowest chance wins | Roll range 0-100 (theirs, `LootManager.cpp` 328); threshold starts at 100 + ITEM_FIND (346) |
| Stat-scaled chance: chance x (100 + ITEM_FIND)/100, item entries only | ITEM_FIND is a percent stat (theirs, `Stats.cpp` 118); scaling only where id != 0 (355-357) |
| Fixed entries drop once and leave the table | Chance exactly 0 means fixed (theirs, 337; set by the parser at 645 and 682) |
| Level gate applies only when both bounds are above 0 | Gate only in the random pass (theirs, 360) |
| Drop count per death: randBetween(loot_count) else randBetween(1, drop_max) | `drop_max` clamped to at least 1 (theirs, `EngineSettings.cpp` 1084). Default `drop_max = 1` at `EngineSettings.cpp` 1041 (no receipt: the line is under 15 characters) |
| Quantity: an inclusive band that grows with level | `randBetween` inclusive of both ends (theirs, `UtilsMath.h` 48) |
| Currency scaled by a separate find stat | CURRENCY_FIND x (100 + ...) / 100 (theirs, 846) |
| Max drops per item | `loot_drops_max` defaults to -1 (theirs, `ItemManager.cpp` 346); the counter is decremented only when positive (385-387), so -1 means unlimited |

Quirks, found by reading the loop (`checkLoot` 364-388) and confirmed with a local replica of the same loop (`work/flare_pick_replica.py`, which copies the loop, not the donor binary):

- Order dependence. Entries A=50, B=30, C=80 with roll 20: the candidate list comes out as [B, C], so C (80) can win although B (30) is the tighter band. List C before B and the result is [B]. Every qualifying entry listed after the current minimum is kept.
- Exhausted entries block the roll. A=50 and B=30 with B at 0 drops left, roll 20: the candidate list is empty. The threshold update (364-371) runs before the MAX_DROPS check (373), so an exhausted entry still narrows the threshold and clears A.

## 4. TypeScript sketch

simplified: keeps the two-pass shape (fixed drops, then at most one random pick), the chance scaling by item find, the level and flag gates, and the quantity roll. It differs from the donor on purpose: (1) the pick is the qualifying entry with the smallest chance, equal chances split uniformly, so the result does not depend on list order (the donor keeps entries listed after the minimum, section 3); (2) exhausted entries are excluded before the comparison (the donor lets them narrow the threshold and block the roll). It omits: currency scaling by CURRENCY_FIND, splitting into stacks (`getExtendedStacks`, not read), tile placement and blocking, the stack merge in `addLoot`, loot animation, quest loot, and the drop count per death (the caller loops).

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface DropEntry {
  itemId: number;                       // 0 = not an item (chance not scaled by item find)
  chance: number;                       // percent; 0 = fixed drop, once per kill
  qtyMin: number; qtyMax: number;
  qtyPerLevelMin: number; qtyPerLevelMax: number;
  levelMin: number; levelMax: number;   // 0 on either side = no level gate
  flag: string | null;                  // required campaign flag, null = none
  maxDropsLeft: number;                 // -1 = unlimited
}

interface Rng { next(): number; }       // uniform in [0, 1)
interface Drop { itemId: number; qty: number; }

function rollInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng.next() * (hi - lo + 1));
}

function flagOk(e: DropEntry, flags: Set<string>): boolean {
  return e.flag === null || flags.has(e.flag);
}

function levelOk(e: DropEntry, level: number): boolean {
  if (e.levelMin > 0 && e.levelMax > 0) return level >= e.levelMin && level <= e.levelMax;
  return true;
}

function quantity(e: DropEntry, level: number, rng: Rng): number {
  const lo = e.qtyMin + (level - 1) * e.qtyPerLevelMin;
  const hi = e.qtyMax + (level - 1) * e.qtyPerLevelMax;
  return rollInt(rng, lo, hi);
}

// One drop roll over a table. Fixed entries drop and leave the table; then at most one random entry is picked.
// Sketch rule: among entries whose (scaled) chance is at or above the roll, the smallest chance wins, equal chances split uniformly.
function rollTable(table: DropEntry[], rng: Rng, itemFind: number, level: number, flags: Set<string>): Drop[] {
  const out: Drop[] = [];

  for (let i = table.length - 1; i >= 0; i--) {
    const e = table[i];
    if (e.chance !== 0) continue;
    if (flagOk(e, flags)) out.push({ itemId: e.itemId, qty: quantity(e, level, rng) });
    table.splice(i, 1);                 // removed whether or not it dropped
  }

  const roll = rng.next() * 100;
  const scale = (100 + itemFind) / 100;
  let best = Infinity;
  const pool: DropEntry[] = [];
  for (const e of table) {
    if (e.maxDropsLeft === 0) continue; // exhausted entries are excluded before comparison
    const real = e.itemId !== 0 ? e.chance * scale : e.chance;
    if (real < roll) continue;
    if (!flagOk(e, flags) || !levelOk(e, level)) continue;
    if (real < best) { best = real; pool.length = 0; }
    if (real === best) pool.push(e);
  }

  if (pool.length > 0) {
    const pick = pool[Math.floor(rng.next() * pool.length)];
    if (pick.maxDropsLeft > 0) pick.maxDropsLeft -= 1;
    out.push({ itemId: pick.itemId, qty: quantity(pick, level, rng) });
  }
  return out;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `work/flare-loot-drop.ts`, with `export {}`).

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed new module, not checked against the Frankendom repo): a pure roll function over a table and an rng, called by the server after a verified kill. Parity-checklist row 18 (loot roll and XP award). The server tick sub-line (post-K item 3: fixed step, input intake, per-tick NPC budget) is not what this cell adds; the one-tick deferral is discussed in section 6.
- today: none read in Frankendom.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape only)
- Brief rule served: one ledger and server-verified kills (Frankendom rulings); licence rule 7 (GPL, clean-room)

## 6. Gaps and risks

- Licence: GPL-3.0-or-later. Clean-room only; the sketch is written from the mechanism, not from the donor lines.
- Client-side in the donor: the roll runs in `GameStatePlay::logic` on the player's machine. Frankendom must roll on the server after a verified kill; the client only shows the drop.
- One ledger: the donor puts the drop on the ground as a Loot pile and picks it up later. Ownership (`dropped_by_hero`) was not read. Under Frankendom's one-ledger rule, the drop becomes a ledger entry when the hero takes it; the ground pile is a view only.
- Order dependence and exhaustion: do not port the list-order rule. Frankendom needs one written rule (smallest qualifying chance, equal chances split uniformly) with a test that pins it. It must also decide whether an exhausted entry blocks the roll; the donor says yes and the sketch says no.
- Timing: the donor queues the death and rolls on a later logic call. Frankendom should roll in the same server step as the verified kill, or define the queue explicitly.
- Zones as data: drop tables, `loot_count`, `drop_max` and `drop_radius` are file data in the donor, and table references are flattened at load time (634, 674). Frankendom should keep the table as zone or catalogue data, flattened at build time.
- MAX_ATTACKERS = 3: this donor has one hero, and the credit rule for multi-attacker kills was not read (not read). The only ally rule seen is `hero_ally` at `StatBlock.cpp` 893.
- Level scaling: quantity grows with the hero's level (838-839). Frankendom must decide whether that number is server-side; this note does not decide it.
- Pit as client: placement and the loot animation are client-only. The roll and the ledger write are server-side.
- Per-enemy table state: `MAX_DROPS` is decremented on the entry in the enemy's `loot_table`. Whether that table is per enemy instance or per enemy type was not read.
