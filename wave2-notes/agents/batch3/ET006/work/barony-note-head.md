# TurningWheel-Barony (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` (`Item::buyValue` 5957-6015, `Item::sellValue` 6025-6068), with `src/shops.cpp` 195-350 and 620-690, `src/net.cpp` 7913-7985 and 8088-8135 | Licence: BSD-2-Clause (`LICENSE.txt` line 3: "This open source release of Barony is licensed under the BSD 2-Clause License:"; the header of each file says "See LICENSE for details") | C++ | symbol `Item::buyValue` / `Item::sellValue`

Checked: The hint file (`monster_shopkeeper.cpp`) is not where the price rule lives; I read the real pricing in `items.cpp` and the transfer in `shops.cpp` and the server handlers in `net.cpp`. Read in full: `buyValue`, `sellValue`, `buyItemFromShop` (buy branch), the server buy handler `SHPB`, the server sell handler `SHPS`, and the lines around the multiplayer guards. Read in part: `getGoldValue` (tome and jewel tiers; the end of the function was not checked), `getModifiedProficiency` (base clamp and golden mask only, not the full equipment stack), `itemCompare` (the four fields that matter). Callers: `buyValue` is called from `shops.cpp` 209, 231-232, 257, 270 (read), `net.cpp` 7979 (read), `interface/shopgui.cpp` 888 (grep, display only, not read in full), `monster_shopkeeper.cpp` 1074 and `entity.cpp` 25131 (grep only, sorting lists, not read). `sellValue` is called from `shops.cpp` 626-689 (read), `net.cpp` 8119 (read), `interface/interface.cpp` 5473-5506 (grep, not read), and `interface/interface.cpp` 24215-24290 with `sellValue(-1)` for crafting and service costs (read in part). Not read: the monster body in `monster_shopkeeper.cpp`, the shop GUI drawing, the catalogue loader that sets `gold_value`, the beatitude range, the trading proficiency cap. Confidence: high on the price formulas and the transfer order; medium on whether the client-side item pickup is the only item grant (the server handler does not add the item, read in full). Scope: economy, not camera. Camera scope: not applicable.

## 1. Mechanism

Buy price (what a player pays a shop), in the order the code runs (`items.cpp` 5957-6015). The value is an `int`, so every step truncates.

- (a) Start at the catalogue value `getGoldValue()` (5959). Tomes add a tier by spell difficulty (+50, +150, +350, +550, +950 at difficulty 20, 40, 60, 80, 100; 5366-5397). Jewels take a value keyed to status (5402-5421).
- (b) Identified: x0.8 (5961-5965). Unidentified: x1.25, except an unidentified glass gem is fixed at 1400 (5966-5976).
- (c) Beatitude: a blessed item (beatitude > 0) is multiplied by 3 x beatitude (5979-5982). Zero or cursed is multiplied by (1 + beatitude/2) (5983-5986).
- (d) Status: multiplied by (status + 5)/10, with status BROKEN=0 to EXCELLENT=4, so 0.5 to 0.9 (5987; enum at `items.hpp` 572-579).
- (e) Trading: divided by (50 + trading proficiency)/150 (5989-5990). Proficiency 0 gives x3, 100 gives x1. Proficiency is clamped to 0-100 at the base (`stat.cpp` 73), and a golden mask adds a bonus up to a cap (`stat.cpp` 104-108), so it can exceed 100. CHR is commented out on the buy side (5992-5993).
- (f) Floor at 1 (5996). A shop consumable is multiplied by max(1, `consumable_buy_value_multiplier`/100), read from the data file (6002-6006; default 100 at `mod_tools.cpp` 9313, JSON key 9349-9351).
- (g) Result: max(value, catalogue value) (6014), times the count for quivers (6009-6012). So a buy price is never below the catalogue price.

Sell price (what a shop pays a player), in the order the code runs (`items.cpp` 6025-6068):

- (a) Identified: x1.20. Unidentified: x0.75, except an unidentified gem uses the glass gem's catalogue value (6029-6044).
- (b) Beatitude: multiplied by (1 + beatitude/20) (6047). Status: the same (status+5)/10 factor as buy (6048).
- (c) Players only (`player >= 0`): multiplied by (50 + trading)/150 (6053) and by (1 + CHR/20) (6056). Calls with -1 skip both (6050). Crafting and service costs call `sellValue(-1)` (interface.cpp 24215), so a skilled or charismatic player cannot discount a service through the sell side.
- (d) Floor at 1 (6060). Result: min(value, catalogue value) (6067), times the count for quivers (6062-6065). So a sell price is never above the catalogue price.

The spread this creates. Hand-worked from the formulas (not run). Base 100, unidentified, beatitude 0, status EXCELLENT (0.9):
- Buy at trading 0: 100 x1.25 = 125, x0.9 = 112, divided by (50/150) = about 336. Buy at trading 100: 112.
- Sell at trading 0, CHR 0: 100 x0.75 = 75, x0.9 = 67, x(50/150) = 22. Sell at trading 100, CHR 0: 67.
So a low-trading buyer pays about 3.4 times the catalogue value, and a low-trading seller gets about 0.22 times it. Trading skill narrows the spread about threefold. The spread is never crossed in the shop's favour, because of the two clamps (6014, 6067).

Transfer. The shop's own gold is a ledger (`Stat.GOLD` on the shop entity), and each trade moves the same amount in both directions.

- Buy (client branch, `shops.cpp` 195-): refuse if the buyer's gold is below the buy price (209). Give the item by a local pickup (229). Debit the buyer (232). On a non-client host, credit the shop's gold with the same amount (259-264). On a client, send `SHPB` with type, status, beatitude, appearance, count and identified (351-372).
- Trading skill gain on a buy (269-317, same guard as the credit): a buy of 100 gold or more always gains a point (271-273). A cheaper buy gains with chance (max(10, price)+1)/100 (275-277). The Mages Guild limit and the 'buy value 1 or less' branch are not covered here (not read in detail).
- Server buy `SHPB` (`net.cpp` 7913-7985): find the shop entity by uid. Rebuild the item from the packet fields: type, status, beatitude, appearance, count, identified (7929-7934). Scan the shop's stock for an item at the same position that `itemCompare` says is the same (7955-7963). Consume that stock item (7972-7974; quivers are set to count 1 first, with the comment "so we consume it all up"). Then price from the packet item (7979), credit the shop (7980), debit the buyer (7981), and floor the buyer's gold at 0 (7982). There is no return after the stock scan and no affordability check.
- Sell `shops.cpp` 620-690: credit the player (657-658) and debit the shop's gold (672-674). There is no check of the shop's balance before the debit; a sale can take the shop's gold below zero.
- Server sell `SHPS` (`net.cpp` 8088-8135): price from the packet item (8119).

Faucet on death (read in part). A monster's gold is multiplied by `globalGoldPercent`/100 when the custom gameplay is in use (`actmonster.cpp` 3914-3916), then dropped as a gold bag with that amount (3917-3925, partly read). This is a designer-tunable faucet.

Crafting costs (read in part). `interface/interface.cpp` 24205-24296: service costs take `sellValue(-1)` (neutral, no CHR or trading) and scale it by a ratio from the spell's damage or duration. Restore sets gold to at least 1 (24215-24218). Metallurgy and Geomancy return gold as a negative cost, capped at a ratio of 1, and charge mana at least the spell minimum or one twentieth of the value (24271-24290, read in part).

Identification. `itemCompare` (`items.cpp` 1442-1503) treats two items as the same only if type, status, beatitude, model, and identified all match (1479, 1500 are two of these checks). It does not compare count.

## 2. Key functions

- `Item::buyValue`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 5957-6015. The buy price pipeline.
- `Item::sellValue`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 6025-6068. The sell price pipeline, with the player-only factors.
- `Item::getGoldValue`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 5366 on. Catalogue value, with tome and jewel overrides.
- `buyItemFromShop`: `/mnt/frankendom-donors/TurningWheel-Barony/src/shops.cpp` 195-350. Affordability, pickup, debit, shop credit, skill gain, client packet.
- Sell path: `/mnt/frankendom-donors/TurningWheel-Barony/src/shops.cpp` 620-690.
- Server buy handler `'SHPB'`: `/mnt/frankendom-donors/TurningWheel-Barony/src/net.cpp` 7913-7985.
- Server sell handler `'SHPS'`: `/mnt/frankendom-donors/TurningWheel-Barony/src/net.cpp` 8088-8135.
- `itemCompare`: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` 1442-1503.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Price = catalogue value x a stack of modifiers, truncated to an integer at each step | Factors 0.8 / 1.25 (identified / unidentified buy), 1.2 / 0.75 (sell); glass gem flat buy 1400 (`items.cpp` 5961-5976 and 6029-6044; the value lines are too short for receipts, so the receipts are the branch comments) |
| Beatitude: steep multiplier for blessed, linear for cursed (buy); linear for both (sell) | Blessed buy x3 per point (5981); cursed buy (1 + b/2) (5985); sell (1 + b/20) (6047) |
| Status as a 0.5 to 0.9 factor | (status+5)/10 (5987, 6048); enum `items.hpp` 572 |
| Skilled buyer pays less, skilled seller gets more | Trading divisor/factor (50 + p)/150 (5990, 6053); proficiency base clamp 0-100 (`stat.cpp` 73) |
| Charisma helps sell only | (1 + CHR/20) (6056) |
| Clamp: buy never below base, sell never above base | Clamp to catalogue value (6014, 6067) |
| Per-buy trading skill gain by price | Always at 100 gold or more (271); chance (max(10, price)+1)/100 below (277) |
| Gold faucet on death, scaled by a mode percent | `globalGoldPercent`/100 (`actmonster.cpp` 3915) |
| Consumable price multiplier from data, floor 1.0 | Default 100 (`mod_tools.cpp` 9313); JSON key 9349 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's pricing order and the clamps. It writes the factors as plain numbers, not the donor's float maths with int truncation after each step (the truncation is kept with `Math.trunc`). It omits: the tome and jewel overrides (the caller passes `baseGold`); the donor's Mages Guild and "value 1 or less" skill rules; the mysterious shopkeeper; quiver stacking limits; the equipment part of proficiency; the server's `SHPB` stock match (the sketch takes the stock item as given). It reorders nothing in the price. It differs on purpose in the server functions: the donor charges the packet item and floors the buyer's gold at 0 with no affordability check (net.cpp 7979-7982); the sketch checks first and rejects. The donor does not check the shop's balance on sale; the sketch refuses a sale the shop cannot pay. Both are Frankendom choices, not donor behaviour.

