# TurningWheel-Barony (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/items.cpp` (`Item::buyValue` 5957-6015, `Item::sellValue` 6025-6068), with `src/shops.cpp` 195-350 and 620-690, `src/net.cpp` 7913-7985 and 8088-8135 | Licence: BSD-2-Clause (`LICENSE.txt` line 3: "This open source release of Barony is licensed under the BSD 2-Clause License:"; the header of each file says "See LICENSE for details") | C++ | symbol `Item::buyValue` / `Item::sellValue`

Checked: The hint file (`monster_shopkeeper.cpp`) is not where the price rule lives; I read the real pricing in `items.cpp` and the transfer in `shops.cpp` and the server handlers in `net.cpp`. Read in full: `buyValue`, `sellValue`, `buyItemFromShop` (buy branch), the server buy handler `SHPB`, and the lines around the multiplayer guards. The server sell handler `SHPS` was read to line 8135 only (its end, after the gold credit, was not read). Read in part: `getGoldValue` (tome and jewel tiers; the end of the function was not checked), `getModifiedProficiency` (base clamp and golden mask only, not the full equipment stack), `itemCompare` (the four fields that matter). Callers: `buyValue` is called from `shops.cpp` 209, 231-232, 257, 270 (read), `net.cpp` 7979 (read), `interface/shopgui.cpp` 888 (grep, display only, not read in full), `monster_shopkeeper.cpp` 1074 and `entity.cpp` 25131 (grep only, sorting lists, not read). `sellValue` is called from `shops.cpp` 626-689 (read), `net.cpp` 8119 (read), `interface/interface.cpp` 5473-5506 (grep, not read), and `interface/interface.cpp` 24215-24290 with `sellValue(-1)` for crafting and service costs (read in part). Not read: the monster body in `monster_shopkeeper.cpp`, the shop GUI drawing, the catalogue loader that sets `gold_value`, the beatitude range, the trading proficiency cap. Confidence: high on the price formulas and the transfer order; medium on whether the client-side item pickup is the only item grant (the server handler does not add the item, read in full). Scope: economy, not camera. Camera scope: not applicable.

Best transferable idea: Price every trade as catalogue value times one shared modifier stack, then clamp buys to at least the catalogue value and sells to at most it, so no trade can be arbitraged against the shop, and let trading skill narrow the spread.
Decision (proposed): adapt — take the modifier stack and the two clamps for shop prices and reuse the neutral sell value for crafting costs; reject the donor's client-supplied price fields, the zero floor on overdraft, and the unbounded shop pool, because they break the server-verified, one-ledger rulings.
Acceptance: A server test sends a buy whose packet beatitude or count differs from the stock item and asserts the price is taken from the stock item (or the buy is rejected); a buy with gold below the price is rejected and no gold moves on either side; for any item, buy price is at least the catalogue value and sell price at most it; a trading-0 buyer's price for an unidentified EXCELLENT catalogue-100 item is about 336 and a trading-100 buyer's is 112 (worked by hand, the test pins them).

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
- Server sell `SHPS` (`net.cpp` 8088-8135, read to 8135 only): price from the packet item (8119).

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

simplified: the sketch keeps the donor's pricing order and the clamps. It uses plain numbers where the donor uses int-with-float steps (each step is truncated with Math.trunc, as the donor's int does). It omits the tome and jewel overrides (the caller passes baseGold), the Mages Guild and value-1 skill rules, the mysterious shopkeeper, quiver stacking limits, the equipment part of proficiency, and the server's stock match (the sketch takes the stock item as given). It keeps the donor's order of price steps. It differs on purpose in the server functions: the donor charges the packet item and floors the buyer's gold at 0 with no affordability check (net.cpp 7979-7982), while the sketch checks first and rejects; the donor does not check the shop's balance on a sale (shops.cpp 674), while the sketch refuses a sale the shop cannot pay. Both are Frankendom choices, not donor behaviour.

```ts
// Licence: BSD-2-Clause (donor, LICENSE.txt). Adapted shape, written from the mechanism as read.
type Status = 0 | 1 | 2 | 3 | 4; // BROKEN, DECREPIT, WORN, SERVICABLE, EXCELLENT (donor enum order)

interface Priced {
  baseGold: number;        // catalogue gold value (tome and jewel overrides already applied)
  glassGold: number;       // catalogue value of the plain glass gem, used for unidentified gems on sale
  identified: boolean;
  isGem: boolean;
  isGlassGem: boolean;     // unidentified glass gem buys at a flat price in the donor
  beatitude: number;       // curse/bless scale; the range is not read
  status: Status;
  quiver: boolean;         // stackable ammo: price scales with count
  qty: number;             // stack count (1 for non-quivers)
  shopConsumable: boolean; // shop-stock consumable, buy price has its own multiplier
}

const trunc = (x: number): number => Math.trunc(x); // the donor keeps an int and truncates on every step

// Player buys from a shop. trading = the buyer's trading proficiency (0..100 base, plus equipment bonus).
function buyPrice(it: Priced, trading: number, consumableMultPct = 100): number {
  let v = it.baseGold;
  if (it.identified) v = trunc(v * 0.8);                 // identified: cheaper
  else v = it.isGlassGem ? 1400 : trunc(v * 1.25);       // unidentified: dearer, glass gems flat
  v = it.beatitude > 0
    ? trunc(v * it.beatitude * 3)                         // blessed: steep multiplier
    : trunc(v * (1 + it.beatitude / 2));                  // cursed: linear discount
  v = trunc(v * ((it.status + 5) / 10));                  // worn items cost less
  v = trunc(v / ((50 + trading) / 150));                  // skilled buyers pay less
  v = Math.max(1, v);
  if (it.shopConsumable) v = trunc(Math.max(1, consumableMultPct / 100) * v);
  const unit = Math.max(v, it.baseGold);                  // never below the catalogue price
  return it.quiver ? unit * it.qty : unit;
}

// Player sells to a shop. chr and trading apply to player sales only (the donor passes no player for crafting costs).
function sellPrice(it: Priced, trading: number | null, chr: number): number {
  let v = it.baseGold;
  if (it.identified) v = trunc(v * 1.2);
  else v = it.isGem ? it.glassGold : trunc(v * 0.75);     // unidentified: lower offer
  v = trunc(v * (1 + it.beatitude / 20));
  v = trunc(v * ((it.status + 5) / 10));
  if (trading !== null) {
    v = trunc(v * ((50 + trading) / 150));                // skilled sellers get more
    v = trunc(v * (1 + chr / 20));                        // charisma adds to the offer
  }
  v = Math.max(1, v);
  const unit = Math.min(v, it.baseGold);                  // never above the catalogue price
  return it.quiver ? unit * it.qty : unit;
}

// Trading skill gain on a player buy: certain at 100 gold or more, else rand()%100 <= max(10, price).
function tradeSkillGainChance(price: number): number {
  if (price >= 100) return 1;
  return (Math.max(10, price) + 1) / 100;
}

interface Ledger { playerGold: number; shopGold: number; }

// Server-side buy. Simplified: the donor's server path charges the packet's item fields and floors the
// player's gold at 0 (net.cpp 7979-7982) with no affordability check; this sketch checks first and rejects.
function serverBuy(l: Ledger, stockItem: Priced, trading: number): { ok: true; paid: number } | { ok: false; reason: string } {
  const paid = buyPrice(stockItem, trading);
  if (l.playerGold < paid) return { ok: false, reason: "insufficient gold" };
  l.playerGold -= paid;
  l.shopGold += paid;                                     // the shop pool is credited with the same amount
  return { ok: true, paid };
}

// Server-side sell. Simplified: the donor debits the shop pool with no check (shops.cpp 674); this sketch refuses
// a sale the shop pool cannot pay.
function serverSell(l: Ledger, item: Priced, trading: number, chr: number): { ok: true; paid: number } | { ok: false; reason: string } {
  const paid = sellPrice(item, trading, chr);
  if (l.shopGold < paid) return { ok: false, reason: "shop cannot pay" };
  l.playerGold += paid;
  l.shopGold -= paid;
  return { ok: true, paid };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/barony-shop-prices.ts`) passed with no output (run in this session).

## 5. Lands in

- TARGET `origins/economy/prices.ts` (new; no `src/fight` module owns shop pricing). The server side of a trade belongs in the same module, so the one ledger writes once.
- Parity-checklist row 21 (catalogue fields). The base price is the catalogue `gold_value`, and the modifiers read runtime state. No row 1-23 covers shop pricing or the trade ledger; row 21 is the closest fit, and it is a partial fit. The monster gold faucet would sit under row 18 (loot roll); it is not claimed here.
- Reuse tag: rewrite-from-idea (BSD-2-Clause, adaptation allowed; the sketch is written from the described mechanism)
- Brief rule served: one ledger (price and transfer in one place; the server is the only ledger write); server-verified trades (client price fields rejected)

## 6. Gaps and risks

- Server prices from client packet fields. `SHPB` builds the priced item from the client's packet (type, status, beatitude, appearance, count, identified; net.cpp 7929-7934). The stock match checks type, status, beatitude, model and identified (items.cpp 1479, 1500) but not count, and quivers are priced as the packet count times the price (items.cpp 6011), while the matched stock is consumed whole (net.cpp 7972). Frankendom: price from the stock item on the server only, and ignore client price fields.
- No return after a failed stock match. The loop at net.cpp 7955-7977 has no return, and the price and the gold move follow it (7979-7982), so a buy that matches no stock still charges the buyer and credits the shop. Frankendom: reject with no ledger movement.
- No server affordability check, and an overdraft is hidden. The buyer's gold is floored at 0 (net.cpp 7982). Frankendom: check the balance first and reject.
- The shop's pool is unbounded. `shopstats->GOLD` is debited on sale with no check (shops.cpp 674) and is never read to limit a buy (grep of shops.cpp finds only lines 264 and 674). Frankendom must decide per shop whether the pool is infinite (say so in data) or capped, and enforce it.
- Client-side writes before the server answers. The client debits its own gold and picks up the item (shops.cpp 229, 232) before the server handler runs. The server then corrects the buyer's gold (net.cpp 7981-7982). Frankendom's one-ledger ruling means only the server result writes the balance; the client may predict the price for display.
- Item grant. The buyer gets the item by a local pickup (shops.cpp 229). The server handler (read in full) consumes the stock and moves gold; it does not create the item for the buyer. Not verified whether another server path grants it. Frankendom must grant on the server.
- The beatitude curve has a step. Blessed 1 is multiplied by 3 (items.cpp 5981) and cursed -1 by 0.5 (5985), so 0 to 1 is a threefold jump. Do not copy the step; use a data curve.
- Int truncation and float maths (items.cpp 5959-5990). Client and server must agree to the unit, so Frankendom should use integer basis points for each factor.
- The trading proficiency range is 0-100 at base (stat.cpp 73) plus a golden-mask bonus (104-108) that can exceed 100; the cap was not read. Frankendom needs an explicit cap as data.
- The monster gold faucet is scaled by a per-mode percent (actmonster.cpp 3915). That is a designer knob, and it would need to be zone data if used.
- Not read: the catalogue loader that sets `gold_value`, shop stock generation (`monster_shopkeeper.cpp`), the mysterious shopkeeper, the consumable JSON contents, the Mages Guild limits. Their behaviour is unknown here.
- Licence: BSD-2-Clause permits adaptation. The sketch is still written from the described mechanism, not translated line by line.
