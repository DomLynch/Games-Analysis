# azerothcore-azerothcore-wotlk (loot-drops, cell 2)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Loot/LootMgr.cpp` | Licence: GPL-2.0 (LICENSE file, line 2 "Version 2, June 1991"; clean-room, shape only) | C++ | symbol `LootTemplate::Process`

Checked: Read in part, with line ranges: `src/server/game/Loot/LootMgr.cpp` (30-92 quality table and the group-entry filter; 300-332 `LootStoreItem::Roll`; 540-562 `Loot::FillLoot`; 1255-1330 group add and `LootGroup::Roll`; 1407-1444 `LootGroup::Process`; 1664-1736 `LootTemplate::Process` and group amounts), `src/common/Utilities/Random.h` (45-70), `src/common/Utilities/Random.cpp` (85-100). The hint `e2e/suites/social/loot/loot_e2e_test.go` was opened (1-60 and a grep of test names). It tests the Need vs Greed roll UI, not the drop table, so it is a poor locator for this topic. Candidates opened: LootMgr.cpp, LootMgr.h (enum region only), Random.h, Random.cpp, loot_e2e_test.go. Callers: `LootStoreItem::Roll` has one caller (LootMgr.cpp 1697); `LootGroup::Roll` has one caller (`LootGroup::Process`, 1411); `LootGroup::Process` is called from `LootTemplate::Process` (1682, 1686, 1729, 1733) and itself (1438); `Loot::FillLoot` has many callers (grep only: Unit.cpp 13676, GameObject.cpp 1014, Player.cpp 8064, Mail.cpp 118, Group.cpp 1789), of which only the line Unit.cpp:13676 was read (by grep). Not read: `SelectRandomContainerElement` (the uniform pick is assumed from its name only), `LootItem` constructor (its comment is at 392; only line 487 was read by grep), gold rolls (around 815), roll-vote states (1000-1220), the loader (151, a query only), and the rate config values. Confidence: high on the order of steps, the group chain and the caps; medium on the random engine (not read).

## 1. Mechanism

- What it is: the drop roll for one loot bag. `Loot::FillLoot` (540-561) calls `LootTemplate::Process` once with `groupId = 0` and `isTopLevel = true` (561). Each template holds independent entries (each its own yes/no roll) and groups (one roll per group, with an amount chain).
- Order of steps (`LootTemplate::Process`, 1667-1736):
  (a) Independent entries, in list order (1692-1718). Skip the entry if its loot mode does not match (1695-1696). Roll with `LootStoreItem::Roll` (1697): a chance of 100 or more always hits (318-319). Otherwise the chance is multiplied by the quality rate (326-327; only when the store allows rates and the item quality is below heirloom) and the entry hits if that value is above `rand_chance()` (329; Random.h 59). `rand_chance()` is uniform over [0, 100) (Random.cpp 91-95). On a hit the item is added (1716). A reference entry instead processes the referenced template `maxcount` times (1706-1710), where `maxcount` is the item's maxcount times the referenced-amount rate (1706). No duplicate cap applies to these entries: the cap filter is only in the group path (1265, 1292).
  (b) Groups, in group order (1721-1735). A top-level template passes `groupAmount` from the group-amount rate (1727-1729). Nested templates pass 0 (1733).
  (c) `LootGroup::Process` (1409-1442). It calls `Roll` once (1411), even when the amount is 0. If an entry comes back: a reference is expanded as in (a) (1415-1425); a plain entry is added (1431). The chain (1436-1438) runs only if the amount left is above 1 and the entry is not a quest item; it calls itself with the amount minus one. A miss ends the chain.
  (d) `LootGroup::Roll` (1262-1297). The explicit list (entries with a non-zero chance) is filtered first (1264-1265). If it is not empty, one value `r = rand_chance()` is drawn (1269) and the list is walked in order: a chance of 100 or more returns at once (1279-1280); otherwise `r -= chance` and the entry returns when `r < 0` (1282-1284). The chance is used raw, with no quality rate and no group rate (1274). If no explicit entry takes the roll, the equal-chance pool (chance 0) is filtered (1291-1292) and one entry is picked uniformly (1294). If that pool is empty, nothing drops (1296).
  (e) Filter, `LootGroupInvalidSelector` (59-92). It removes an entry whose loot mode does not match (65-66), whose item template is missing (68-72), or whose item is already in the bag with the same group id at its cap (74-84). The cap is 3 for a non-equippable item (`InventoryType == 0`, 79) and 1 for an equippable item (81-82). Item 47242 (Trophy of the Crusade) is exempt from the 3 cap (79).
- Count: a dropped item's stack size is `urand(mincount, maxcount)` (487). The constructor it sits in was not read.
- Tick: none. The roll runs once each time a loot bag is filled (for example a creature's loot, Unit.cpp 13676; the enclosing function was not read), not per frame.

## 2. Key functions

- `LootTemplate::Process`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Loot/LootMgr.cpp` 1667-1736 (independent entries 1691-1718, groups 1720-1735).
- `LootGroup::Roll`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Loot/LootMgr.cpp` 1262-1297 (explicit cumulative roll, then equal-chance pool).
- `LootGroup::Process`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Loot/LootMgr.cpp` 1409-1442 (one roll, then the amount chain).
- `LootStoreItem::Roll`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Loot/LootMgr.cpp` 311-330 (independent chance with quality rate).
- `LootGroupInvalidSelector`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Loot/LootMgr.cpp` 59-92 (filter and caps).
- `rand_chance` / `roll_chance_f`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/common/Utilities/Random.h` 50-60 and `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/common/Utilities/Random.cpp` 91-95.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Independent entries: each a yes/no roll with a percent chance; 100 or more is guaranteed | Chance is a percent (`roll_chance_f(chance)` hits when `chance > rand_chance()`, Random.h 59); the range is [0, 100) (Random.cpp 93) |
| Group: one roll; explicit chances are cumulative slices of that roll; the leftover goes to an equal-chance pool, picked uniformly; an empty pool drops nothing | Explicit vs equal split by chance != 0 (theirs, 1255-1258); the leftover rule is theirs (1291-1296) |
| Per-loot cap by item type: 1 for equippable, 3 for others; one trophy exemption | 3 and 1 (theirs, 79 and 81); exempt item 47242 (theirs, 79) |
| Quality multiplier on independent chances only | Seven quality rates, one per quality tier (theirs, `qualityToRate` 33-42); applied at 326-327 only, not on the group path (1274) |
| Group amount: up to N hits in a chain; a miss stops it; quest items do not chain | `RATE_DROP_ITEM_GROUP_AMOUNT` (theirs, 1727; value not read); chain at 1436-1438 |
| Item stack size: uniform between min and max | `urand(mincount, maxcount)` (theirs, 487) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the group path (one explicit cumulative roll, then the equal-chance pool, then the amount chain that stops at the first miss), and the independent roll with its quality scale. It omits reference entries and their multiplier, the loot-mode filter, the script hooks (`OnItemRoll`, `OnBeforeLootEqualChanced`), the trophy exemption (item 47242), the stack-size roll, the gold rolls and the roll-vote states. The caps apply inside the group roll only, as in the donor. The sketch always draws the group's roll, where the donor draws it only when the explicit list is not empty. The uniform pick uses the same generator (the donor's helper, `SelectRandomContainerElement`, was not read).

```ts
// Licence: GPL-2.0 (donor, LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface DropEntry {
  id: string;
  chance: number;        // percent, 0-100. 0 = equal-chance pool. >= 100 = always drops.
  equippable: boolean;
  quest: boolean;        // quest entries never chain into a second group roll
}

interface DropGroup { explicit: DropEntry[]; equal: DropEntry[]; }

type Rng = () => number; // returns a value in [0, 100)

// Per-loot cap: an equippable item drops once, any other item up to 3 times.
function underCap(e: DropEntry, have: Map<string, number>): boolean {
  return (have.get(e.id) ?? 0) < (e.equippable ? 1 : 3);
}

// One roll for a group. Explicit chances share one 0-100 roll, cumulative in list order.
// If that roll misses them all, one equal-chance entry is picked uniformly. No equal entries: nothing drops.
function rollGroupOnce(group: DropGroup, have: Map<string, number>, rng: Rng): DropEntry | null {
  let r = rng();
  for (const e of group.explicit.filter((x) => underCap(x, have))) { // filtered entries are removed, the roll is not rescaled
    if (e.chance >= 100) return e;
    r -= e.chance;
    if (r < 0) return e;
  }
  const equal = group.equal.filter((x) => underCap(x, have));
  if (equal.length === 0) return null;
  return equal[Math.floor((rng() / 100) * equal.length)];
}

// Non-group entry: its own roll. The quality rate scales the chance; guaranteed (>= 100) entries skip it.
function rollIndependent(e: DropEntry, qualityRate: number, rng: Rng): boolean {
  if (e.chance >= 100) return true;
  return e.chance * qualityRate > rng();
}

// Top-level group with an amount: roll, and on each hit roll again until `amount` hits.
// A miss ends the chain. The first roll always runs, even when amount is 0.
function processGroup(group: DropGroup, have: Map<string, number>, amount: number, rng: Rng): string[] {
  const drops: string[] = [];
  let left = amount;
  for (;;) {
    const e = rollGroupOnce(group, have, rng);
    if (e === null) break;
    drops.push(e.id);
    have.set(e.id, (have.get(e.id) ?? 0) + 1);
    if (left <= 1 || e.quest) break;
    left -= 1;
  }
  return drops;
}
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed new module: the one server-side drop roll, called when a kill creates a loot bag; the drop tables become zone or creature data). Parity-checklist row 18 (loot roll and XP award). Frankendom's current loot code was not read.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 8 (named target file and parity row); server-verified kills and one ledger

## 6. Gaps and risks

- GPL-2.0 (LICENSE file, line 2 read): clean-room only. The sketch is written from the steps above, not a line-by-line translation.
- A group with at least one valid equal-chance entry always drops something, because a miss falls through to the equal pool (1291-1294). A group with only explicit entries can drop nothing. Frankendom must choose one of these rules on purpose; the donor's choice is not a rule to copy by default.
- Two multiplier rules: the quality rate scales independent entries (326-327) but not group entries (1274); the group amount repeats groups (1727). Frankendom should keep all rate multipliers in one place and test which entries they touch.
- Caps are on group members only. Independent entries have no cap (1692-1718). Frankendom must pick one rule and test it. The trophy exemption (79) is a hard-coded item id and should not be ported; if a cap exemption is needed it should be a data field on the drop entry.
- Fractional group rates: `groupAmount` is stored as `uint32` (1727), so a fractional rate is cut to a whole number. The return type of `getRate` was not read, so the exact truncation is not confirmed. Frankendom should keep rates as floats and round in one place.
- Server-verified: the roll runs in the server's loot object (`Loot::FillLoot`, called from server code such as Unit.cpp 13676). The client only displays. Frankendom's kill must produce the drop on the server and write it to the one ledger, not in the client.
- Script hooks (`OnItemRoll`, `OnBeforeLootEqualChanced`) can veto or change any roll. Frankendom has no such hook. Do not port the hook shape; use data and a single rule.
- Randomness: `rand_chance` uses a `std::uniform_real_distribution` over an engine (Random.cpp 93-94; the engine itself was not read). Frankendom should draw loot from the seeded server RNG and log each roll for the fight record (parity row 19), so a dispute can be replayed.
- Ownership and roll votes (Need vs Greed, roll slots at 1013, 1147, 1211) were not read. The e2e test only covers the roll UI. Party loot ownership is outside this cell.

Best transferable idea: keep an explicit drop table as data where each entry is either a chance on one shared roll or an equal-chance pool that takes the leftover, with per-item caps and a one-line grant to the ledger.
