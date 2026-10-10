# endless-sky-endless-sky (economy-trade, cell 2)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Depreciation.cpp` | Licence: GPL-3.0-or-later (per file headers: "either version 3 of the License, or (at your option) any later version"; license.txt is GPL v3) | C++ | symbol `Depreciation::Value` / `Depreciation::Depreciate`

Checked: the hint file `source/Shop.h` (171 lines) was opened: it is the per-planet stock list (`Shop<Item>`, `Sale<Item> stock`, condition sets), not a price rule. The price mechanism is in `source/Depreciation.h` (88 lines, read in full) and `source/Depreciation.cpp` (384 lines, read in full: `Min`, `GracePeriod`, `Daily`, `MaxAge`, `Save`, `Init`, both `Buy` overloads, `Value` (fleet, ship, ship-with-outfits, outfit), `Sell`, both `Depreciate`, `DefaultDepreciation`, `Full`). Gamerules defaults read at `source/Gamerules.h` 160-166 and clamps at `source/Gamerules.cpp` 60-69. Callers read: `source/PlayerInfo.cpp` 1331-1412 (`BuyShip`, `SellShip`), 2050-2072 (planet outfit sales), 3612-3631 (outfit stock change), 5670 (net worth). Not read: `Ship::ChassisCost()`; callers in `ShipInfoDisplay.cpp`, `CargoHold.cpp`, `BoardingPanel.cpp` (grep only). Confidence: high for the valuation and transfer rules (every function read end to end); medium for the callers (listed in section 6). Camera: not applicable.

## 1. Mechanism

- Every item model keeps a record: purchase day to count (`std::map<int, int>`, Depreciation.h 86-87). A planet's stock keeps one record and the player's fleet keeps another (`isStock`, Depreciation.h 82). An item's age is "today minus its purchase day".
- Value of one age (`Depreciate(int age)`, Depreciation.cpp 363-375): age up to the grace period is full value (365-366). At or past `MaxAge` it is the floor (368-369). In between, with `eff = age - grace`: `value = min + (1 - min) x daily^eff x (MaxAge - eff) / MaxAge` (371-374). `MaxAge` = max age + grace (49). Decay is per day; the taper is linear over the whole life, so the curve is smooth, not stepped.
- Value of a record for `count` items (`Depreciate(record, day, count)`, 320-358): the stock walks its bins oldest first, the fleet walks newest first (327). Each bin contributes `used x Depreciate(age of bin)` (335-337). Items without a record count at the default (357). The default is full value for the stock and the floor for the fleet (381-383). A ship's value is that times `ChassisCost()` (278); an outfit's is times `Cost()` (295). Outfits with `installable < 0` are always full value (286-287) and are not recorded (204-205).
- Selling (`Sell`, 302-315): the stock gives up its oldest bin (305, `record.begin()`) and the fleet its newest (305, `--record.end()`). The removed item's purchase day is returned and then used for the receiving record.
- Buying from stock (`PlayerInfo::BuyShip`, 1331-1353): the price is read first (1337), refused if credits are short (1338), charged (1343), and only then the record moves (1346). The receiving fleet record takes the old purchase day, so the item keeps its age.
- Selling to stock (`PlayerInfo::SellShip`, 1377-1412): the price is read from the fleet record first (1388), the record moves to the stock (1393), and credits are paid (1406). An item with no fleet record enters the stock as fully depreciated (Depreciation.cpp 189-191: `day -= MaxAge()` when the receiver is stock and the source has no record).
- Saving (`Save`, 95-136): fleet records older than `MaxAge` are not saved (114, 129), because they are at the floor anyway. Stock records are always saved.
- Tick: none. Valuation is a pure function of `(record, today)`; `today` is the game day (`date.DaysSinceEpoch()`, PlayerInfo.cpp 1336, 1382).

## 2. Key functions

- `Depreciation::Depreciate(int age)`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Depreciation.cpp` 363-375. The curve: grace, floor, decay times taper.
- `Depreciation::Depreciate(const map<int,int>&, int, int)`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Depreciation.cpp` 320-358. Walks the bins in stock or fleet order.
- `Depreciation::Sell`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Depreciation.cpp` 302-315. Oldest for stock, newest for fleet.
- `Depreciation::Buy(const Ship&, ...)`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Depreciation.cpp` 167-197. Moves the record; a receiving stock with no source record becomes fully depreciated.
- `Depreciation::Value(const Ship*, ...)`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Depreciation.cpp` 269-279.
- `PlayerInfo::BuyShip` / `SellShip`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/PlayerInfo.cpp` 1331-1412.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Value falls from full to a floor with a grace period, a per-day decay and a linear taper over life | Floor 0.25 (theirs, Gamerules.h 162) |
| Per-day decay factor after grace | 0.997 per day (theirs, Gamerules.h 163) |
| Full value for the first N days | Grace 7 days (theirs, Gamerules.h 164) |
| Life after grace; floor reached at grace + this | Max age 1000 days, so the floor is reached at 1007 days (theirs, Gamerules.h 165; Depreciation.cpp 49) |
| Stock and fleet use opposite ends of their records | None (structure) |
| Items with no record: full for stock, floor for fleet | 1.0 and floor (theirs, Depreciation.cpp 383) |
| Data override clamped to 0..1 for floor and daily | clamp (theirs, Gamerules.cpp 62, 64) |

Values from the sketch run on the VPS with node (the sketch, not the donor; the formula is the donor's, checked by hand for ages 30 and 365): fraction at age 0 and 7 = 1.00000; age 8 = 0.99701; age 30 = 0.93394; age 100 = 0.76479; age 365 = 0.41487; age 1007 = 0.25000. Round trip: a stock item bought 100 days old for 1000 cost 764, and sold back on the same day for 764. A fleet item of age 10 is worth 991 and one of age 400 is worth 390 (both at cost 1000).

## 4. TypeScript sketch

simplified: one item model (the donor keeps a record per model and per ship or outfit). It omits `Save`/`Load` and the pruning of old fleet records, `Init` from a fleet, the `chassisOnly` option, the outfit-level `Buy` and `installable < 0` rule, `ChassisCost()` (the cost is passed in as one number), and the donor's `Ship` and `Outfit` lookups. The buy and sell paths keep the donor order: price read before the record moves. `Math.floor` stands in for the donor's conversion of the double to an integer price (truncation for positive values). Bins are a `Map` and are sorted at each call, which is slower than the donor's ordered map but gives the same order.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Gamerules {
  min: number;        // floor: fraction of cost a fully depreciated item keeps
  daily: number;      // per-day decay factor applied after the grace period
  grace: number;      // days at full value
  maxAge: number;     // days after the grace period at which the floor is reached
}

export const DEFAULTS: Gamerules = { min: 0.25, daily: 0.997, grace: 7, maxAge: 1000 };

// Purchase day -> number of items bought that day, for one item model.
export type Bins = Map<number, number>;

// Fraction of cost left for an item of the given age in days.
export function fraction(age: number, g: Gamerules): number {
  const maxAge = g.maxAge + g.grace;
  if (age <= g.grace) return 1;
  if (age >= maxAge) return g.min;
  const eff = age - g.grace;
  const decay = Math.pow(g.daily, eff);
  const linear = (maxAge - eff) / maxAge;
  return g.min + (1 - g.min) * decay * linear;
}

// Fraction used for items with no record: a planet's stock is full price, a player's fleet is at the floor.
function noRecord(isStock: boolean, g: Gamerules): number {
  return isStock ? 1 : g.min;
}

// Value of `count` items of one model. The stock uses its oldest bins first; the fleet uses its newest first.
export function bunchValue(bins: Bins, today: number, count: number, isStock: boolean, cost: number, g: Gamerules): number {
  const days = [...bins.keys()].sort((a, b) => a - b);
  if (days.length === 0) return Math.floor(count * noRecord(isStock, g) * cost);
  const order = isStock ? days : [...days].reverse();
  let left = count;
  let sum = 0;
  for (const d of order) {
    const used = Math.min(bins.get(d) ?? 0, left);
    left -= used;
    sum += used * fraction(today - d, g);
    if (left === 0) break;
  }
  return Math.floor((sum + left * noRecord(isStock, g)) * cost);
}

// Remove one item from a record and return its purchase day (stock: oldest first; fleet: newest first).
export function takeOne(bins: Bins, isStock: boolean): number {
  const days = [...bins.keys()].sort((a, b) => a - b);
  const d = isStock ? days[0] : days[days.length - 1];
  const n = (bins.get(d) ?? 0) - 1;
  if (n === 0) bins.delete(d); else bins.set(d, n);
  return d;
}

// Player buys one item from the stock. The price is read before the record moves; the item keeps its purchase day.
export function buyFromStock(stock: Bins, fleet: Bins, today: number, cost: number, g: Gamerules): number {
  const price = bunchValue(stock, today, 1, true, cost, g);
  const day = stock.size > 0 ? takeOne(stock, true) : today;
  fleet.set(day, (fleet.get(day) ?? 0) + 1);
  return price;
}

// Player sells one item to the stock. An item with no fleet record enters the stock as fully depreciated.
export function sellToStock(fleet: Bins, stock: Bins, today: number, cost: number, g: Gamerules): number {
  const price = bunchValue(fleet, today, 1, false, cost, g);
  const day = fleet.size > 0 ? takeOne(fleet, false) : today - (g.maxAge + g.grace);
  stock.set(day, (stock.get(day) ?? 0) + 1);
  return price;
}
```

## 5. Lands in

- TARGET `origins/economy/depreciation.ts` (new, proposed path; the Frankendom repo was not read): one place that prices a used item from its purchase day, shared by the vendor and the player trade. Parity-checklist row 21 (catalogue fields): the floor, decay, grace and max age are catalogue or gamerules fields. Row 21 is the closest fit, not an exact one: no checklist row covers resale pricing, so this is named plainly rather than forced onto row 18 (loot and XP), which does not fit.
- today: none (no used-item or resale price code in Frankendom was read for this note).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape not text)
- Brief rule served: one ledger (buy and sell prices read through one rule and move money through one spend and refund path); server-verified (the purchase day is stored server-side, so the price is computed on the server)

Best transferable idea: keep each item's purchase day through a trade and price it on the server with one decay curve (full, then a per-day decay, then a floor).
Decision (proposed): adapt - the age-based resale curve and the rule that an item keeps its purchase day suit Frankendom's one ledger; the separate planet-stock record and the oldest-first sale are rejected unless Dom wants used vendor stock, because they create the price spread in section 6.
Acceptance: a server test: a 1000-cost piece bought 100 days old and resold the same day returns 764 (no profit on a round trip); the same piece at age 400 is valued at 390; no value falls below 250; buy and sell prices are computed by the same function, so a mixed-age pair cannot be cycled for profit.

## 6. Gaps and risks

- Licence: GPL-3.0-or-later. Clean-room only: the sketch is written from the described mechanism. The constants are the donor's default tuning and are re-tuned in Frankendom as data, not copied as text.
- The spread (gap found by reading both sides): the stock sells its oldest bin at the lowest price (`stock` walks from the oldest, Depreciation.cpp 327), and the player's fleet sells its newest bin at the highest price (327, `--record.end()`). Buying from one side and selling to the other can therefore pay 390 for an old piece and receive 991 for a new one (sketch run, both numbers at cost 1000). The donor allows this; it was not played or run as a repeated loop. Frankendom must either price both sides from one rule or accept the spread on purpose.
- Stock with no record is full price (383), but an item bought from a stock with no record comes out with the current day (the receiving fleet adds no age). A player can therefore buy a brand-new copy at full price. The sketch does the same; Frankendom should decide whether that is intended.
- Selling to a stock with no fleet record gives a fully depreciated item (191, mirrored at the sell path). The item is then at the floor for the rest of its life. Intended in the donor; Frankendom should test it.
- Price is a float converted to an integer (1337, 1388 use `int64_t`; the truncation is the donor's). Frankendom should round in one place on the server, not per call.
- Save pruning (114, 129) drops fleet records at or past `MaxAge`. It is harmless in the donor because those items are at the floor anyway; Frankendom must keep the same constants in one data source so saving and valuing agree.
- Callers not all read: `ShipInfoDisplay.cpp` (175, 536-537), `CargoHold.cpp` (596), `BoardingPanel.cpp` (605) use `Value` or `Full()` for display or cargo worth (grep only, not read in full). `Full()` (59-62) is used only for display-side estimates, not for sale price.
- Units: the day count is the game's calendar day (`DaysSinceEpoch`). Frankendom has no calendar day today; a server day counter would be a new rule.
- The donor's `Depreciation` also depends on `Outfit::Cost()` and `Ship::ChassisCost()`, which were not read; their values are the donor's catalogue, which Frankendom replaces with its own catalogue fields (row 21).

- SellShip with storeOutfits passes chassisOnly to stockDepreciation.Buy and prices the hull only (PlayerInfo.cpp ~1384-1393): a second, hull-only sale price rule.

## Checker findings

- Verdict: CLEAN. No errors found; cited lines and numbers verified against the donor.
- Corrected: nothing.
- Missed (not in the note):
  - SellShip with storeOutfits passes chassisOnly to stockDepreciation.Buy and prices the hull only (PlayerInfo.cpp ~1384-1393): a second, hull-only sale price rule.
