# Open-RSC-Core-Framework (trading-barter-vendors, cell 3)

Donor: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/Shop.java` | Licence: AGPL-3.0 (repo LICENSE file: GNU AFFERO GENERAL PUBLIC LICENSE Version 3) | Java | symbol `calcItemBuyPrice`

Checked: the note's mechanism is the shop stock-price loop. Read: `Shop.java` 25, 60-100 and 262-382 in full (the restock body, the sell price and the stock offsets), and 177-223 (the buy price, read from grep output and sed excerpts); `InterfaceShopHandler.java` 60-232 and 240-330 (buy and sell paths, validity checks); `ShopRestockEvent.java` (whole, 22 lines); `GameTickEvent.java` 41-100 (repeat rule); `DelayedEvent.java` 11-16; `PluginHandler.java` 100-120 (where the restock event is created). Not read: `Shop.java` 105-176 and 224-261 (add-stock and the retro path bodies beyond the grep lines), `InterfaceShopHandler.java` 1-59 and 330-end, the shop data files (so no per-shop modifier values are claimed). Also read in full, not written up here (one note per cell): `PlayerTradeHandler.java` (474 lines) and `Trade.java` (112 lines); one trade risk is listed in section 6. Confidence: high on the price formulas and the restock loop (read in code and checked by arithmetic); medium on the restock period in real time (ms converted to ticks by the event base; the config GAME_TICK value was not read). camera_scope: not applicable (trade and shop topic).

## 1. Mechanism

- Each shop holds a stock table: a base list (each item with a base amount) and player-added "custom" lines. The price of one unit moves with the shop's stock, so a scarce item costs more to buy and a surplus item pays less when sold. This is a supply-and-demand price loop with no designer editing prices.
- Price per unit (`calcItemBuyPrice`, 213-223; `calcItemSellPrice`, 262-272): `priceMod = modifier + offset`; the offset is `priceModifier x (base - stock)` clamped to +/-100 (`getStockBuyOffset` 344-357 and `getStockOffset` 329-342); `priceMod` is floored at 10 (221-222); the coin price is `(priceMod x defaultPrice) / 100` in integer division.
- Buy (`buyShopItem`, handler 80-194). The amount is capped at the current stock (84-85). Stackable path (about 106-130): for each unit i, validity is checked (stock left, coins left after earlier units, room in the inventory; 203, 210, 217), the unit price is computed with i units already bought (the `totalBought` ladder), the unit is added to the inventory, then `totalBought` steps (118). After the loop the stock is removed once (122) and the coins are removed once (123). Non-stackable path (about 139-170): the same ladder with the stock and coins removed once at 164 and 166.
- Sell (`sellShopItem`, handler 225-330). Refused when the item is untradeable (unless the world allows it) or not in the shop's list (227; general shops accept all, `shouldStock` 275-285). The amount is capped so total stock stays under 65535 (243). Stackable path: the price for unit i is computed with i units counted (268), then the stock is added once (280) and the coins are paid. Non-stackable path: one unit at a time, priced with count 1 (312), added to stock per unit (326).
- Restock (`ShopRestockEvent` and `Shop.restock`, 72-103). Each shop gets one repeating event at plugin load (`PluginHandler` 112). The period is the shop's respawn rate in ms, converted to ticks with ceil(ms / GAME_TICK) (`DelayedEvent` 16). `GameTickEvent.doRun` runs `run()` and resets the countdown (`GameTickEvent` 41-50, 86), and the restock event never calls `stop()`, so it repeats. Each run: a base-listed line that is below its base gains one unit (82-83), a base-listed line above its base loses one (85-86), and a custom line loses one unit and is removed at zero (89-94). The players are told only if something changed (99-101).
- Tick: the restock timer is the only time-based step; the trade and buy calls are synchronous per click.

## 2. Key functions

- `Shop.restock`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/Shop.java` 72-103. One restock tick.
- `Shop.calcItemBuyPrice`: same file 213-223. Buy-side coin price from the stock offset.
- `Shop.calcItemSellPrice`: same file 262-273. Sell-side coin price.
- `Shop.getStockBuyOffset` and `Shop.getStockOffset`: same file 344-357 and 329-342. The two stock offsets (base sides differ, section 3).
- `Shop.getItemBuyPrice` and `getItemSellPrice`: same file 177-211 and 226-260 (retro or modern pricing with a mismatch exception; body partly read, not in full).
- `InterfaceShopHandler.buyShopItem` and `sellShopItem`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/net/rsc/handlers/InterfaceShopHandler.java`, from lines 80 and 225. Per-unit ladder, one stock write, one coin write per transaction.
- `ShopRestockEvent`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/event/custom/ShopRestockEvent.java` 7-21. The repeating restock call.

## 3. Numbers vs mechanism

| Item | Donor formula or value | Range or default | file:line |
|---|---|---|---|
| Buy coin price | `(max(10, buyModifier + offB) x default) / 100` | integer division; floor 10 percent | Shop.java:220-223 |
| Sell coin price | `(max(10, sellModifier + offS) x default) / 100` | integer division; floor 10 percent | Shop.java:269-272 |
| Buy offset | `offB = priceModifier x (base - (stock - unitsBoughtSoFar))`, clamp -100..100 | base is the listed amount, 0 if not listed | Shop.java:344-357, 351 (base 0 default at 345) |
| Sell offset | `offS = priceModifier x ((listed amount + 1, or 1 if not listed) - (stock + unitsIncludingThis))`, clamp -100..100 | sell side base is one higher than buy side | Shop.java:329-342, 330, 333, 336 |
| Clamp | offset bounded to -100 and +100 | +/-100 | Shop.java:337-340, 352 |
| Retro offset (other price mode) | `clamp(base - stock, -127, 127)`, no priceModifier | -127..127 | Shop.java:359-362 |
| Restock period | ceil(respawnRate_ms / GAME_TICK) ticks, repeating | per-shop data (respawn rate) | DelayedEvent.java:16; GameTickEvent.java:49, 86; ShopRestockEvent.java:13 |
| Base stock step | +1 or -1 unit per restock toward base | 1 unit per period | Shop.java:82-88 |
| Custom stock decay | -1 unit per restock, removed at 0 | 1 unit per period | Shop.java:90-94 |
| Stock cap | total stock capped at 65535 on sell | Short.MAX - Short.MIN | InterfaceShopHandler.java:243 |
| Ironman overstock block | no buy when shop count > base stock | flag | InterfaceShopHandler.java:199-200 |
| Coins check | coins - spent so far >= this unit's price | coin units | InterfaceShopHandler.java:210 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's price loop (floor 10 percent, clamp of the offset to +/-100, the buy side comparing stock before each unit and the sell side comparing stock with the unit counted), the per-unit ladder inside one purchase, the single stock and coin settle, and the restock step (base lines move one unit toward base per tick, custom lines lose one and are removed at zero). It omits: the retro price mode and the client-version switch, the mismatch receipt, the inventory room check, the untradeable and shop-list refusals, the stock cap, the Ironman rule, the add-stock call body, and the player messages. It reorders and fixes two things: the donor's price is integer-truncated (a low-priced item at the floor can cost 0 coins), so the sketch floors at 1 coin; and the donor removes custom lines inside a forward loop, which skips the entry that shifts into a removed slot, so the sketch walks the lines in reverse.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface StockLine { itemId: string; base: number; stock: number; defaultPrice: number; }
interface Vendor {
  buyModifier: number;   // percent the vendor charges the player (donor: buyModifier)
  sellModifier: number;  // percent the vendor pays the player (donor: sellModifier)
  priceModifier: number; // percent of price moved per unit of stock gap (donor: priceModifier)
  lines: Map<string, StockLine>;
}
type Outcome = { ok: true; coins: number } | { ok: false; reason: string };

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Donor getStockBuyOffset: the stock that is left before this unit is compared with the base stock.
function buyOffset(line: StockLine, priceModifier: number, stockBeforeThisUnit: number): number {
  return clamp(priceModifier * (line.base - stockBeforeThisUnit), -100, 100);
}

// Donor getStockOffset (sell side): base is one higher on this side than on the buy side, and the
// stock counted includes the unit being sold (1-based count of units, including this one).
function sellOffset(line: StockLine, priceModifier: number, stockWithThisUnit: number): number {
  return clamp(priceModifier * (line.base + 1 - stockWithThisUnit), -100, 100);
}

// Donor calcItemBuyPrice: priceMod floored at 10 percent, then default x priceMod / 100.
// fix: the donor truncates with integer division (a 1-coin item at the floor costs 0); clamp to at least 1 coin.
function unitBuyPrice(v: Vendor, line: StockLine, boughtSoFar: number): number {
  const priceMod = Math.max(10, v.buyModifier + buyOffset(line, v.priceModifier, line.stock - boughtSoFar));
  return Math.max(1, Math.floor((priceMod * line.defaultPrice) / 100));
}

// unitsIncludingThis: 1 for the first unit sold in a batch, 2 for the second, and so on.
function unitSellPrice(v: Vendor, line: StockLine, unitsIncludingThis: number): number {
  const priceMod = Math.max(10, v.sellModifier + sellOffset(line, v.priceModifier, line.stock + unitsIncludingThis));
  return Math.max(1, Math.floor((priceMod * line.defaultPrice) / 100));
}

// One purchase of n units: the price ladder runs per unit, then stock and coins settle once.
function buy(v: Vendor, itemId: string, n: number, playerCoins: number): Outcome {
  const line = v.lines.get(itemId);
  if (!line) return { ok: false, reason: "not sold here" };
  if (n > line.stock) return { ok: false, reason: "ran out of stock" };
  let total = 0;
  for (let i = 0; i < n; i++) {        // i = units already bought in this batch
    const price = unitBuyPrice(v, line, i);
    if (playerCoins - total < price) return { ok: false, reason: "not enough coins" };
    total += price;
  }
  line.stock -= n;            // one settle: stock down, coins down, items up, all or nothing
  return { ok: true, coins: total };
}

// Restock tick (donor ShopRestockEvent): base stock moves one step toward its base each tick;
// lines that are not in the base list (added by players) lose one unit per tick and are dropped at 0.
// fix: iterate backwards when removing (the donor's forward loop skips the entry that shifts into a removed slot).
function restockTick(v: Vendor): void {
  for (const line of [...v.lines.values()].reverse()) {
    if (line.base > 0 && line.stock < line.base) line.stock += 1;
    else if (line.stock > line.base) {
      line.stock -= 1;
      if (line.base === 0 && line.stock <= 0) v.lines.delete(line.itemId);
    }
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (typescript 7.0.2): exit 0.

## 5. Lands in

- TARGET `origins/server/vendors.ts` (proposed new module; the Frankendom path was not checked from this box). Buy and sell are one purchase each, settled with the one-ledger door; the restock is a server tick row.
- Parity-checklist row 18 (loot roll and economy: ownership and coin moves). Sub-line: one ledger, vendor coins and stock moves are settle rows; stock refresh is a server tick row. Not row 23 (zone spawns).
- Reuse tag: rewrite-from-idea (AGPL-3.0, copyleft: clean-room only)
- Brief rule served: one ledger (every coin and stock move is a settle row); server-verified prices (the server computes every price, the client only shows it); zones as data (the three modifiers and the base stock are per-vendor data).

Best transferable idea: a vendor's price moves with its own stock (scarce goods cost more, surplus pays less) and the stock drifts back to its base one unit per server tick, so the economy corrects itself with no designer editing prices.
Decision (proposed): adapt — adopt the stock-sensitive price with a 10 percent floor and a +/-100 clamp, and the one-tick restock; fix the integer truncation to 0 coins and the forward removal loop; the per-vendor modifiers and base stock are zone data. Reject the retro price branch: Frankendom has one client and one price rule, so the client-version switch and the mismatch exception do not apply.
Acceptance: a server test where a vendor with base 10 potions sells 3, the next unit costs more than the default by priceModifier x 3 percent (before the clamp), and after three restock ticks the stock is back to 10 and the price is back to default; a 1-coin item at the 10 percent floor sells for 1 coin, not 0.

## 6. Gaps and risks

- Integer truncation to 0 coins (donor defect; Shop.java:220-223): `(priceMod x defaultPrice) / 100` truncates, so at the 10 percent floor any item with default price 9 or less buys for 0 coins (arithmetic on the formula; whether the live shop data has such items was not checked). Fix: floor at 1 coin (the sketch does this).
- Forward removal loop (donor defect; Shop.java:72-97): the custom line is removed inside `for (i < shopItems.size())` with `i++` after it, so the next line skips one tick of decay. The original-versus-custom test also uses the index, so the order of the list matters. Fix: walk backwards (the sketch does).
- Two sides, two bases (Shop.java:330, 333, 345): the sell side counts the listed amount plus one (and 1 when unlisted), the buy side counts the listed amount (0 when unlisted). This may be deliberate; the sketch keeps the asymmetry. Frankendom should choose one rule and test it on the boundary.
- Restock timer: the code's own comment says the timers are not yet verified against authentic timing (ShopRestockEvent.java:12). Frankendom sets the period as zone data; do not copy the donor value without a check.
- Retro and modern price modes with a mismatch exception and a player receipt (InterfaceShopHandler.java:167, Shop.java:177-260): this is a client-compatibility path. Reject for Frankendom; keep only the idea that a receipt names the price the player paid.
- Stock cap 65535 (InterfaceShopHandler.java:243) and the Ironman overstock block (200): both are data-like rules; keep as per-vendor and per-character flags, not constants.
- Sell refusal for items the shop does not list (InterfaceShopHandler.java:227; `shouldStock` 275-285): general stores take everything, specialist shops only their list. This maps to a vendor flag for Frankendom.
- Trade risk (read in `PlayerTradeHandler.java`, not the note's mechanism): `performTrade` removes `min(held, offered)` from the sender (line 389) but gives the partner the offered amount (lines 450-451). The offer amount is checked against the inventory only when the item is offered (line 298), not at perform time (lines 375-381 check only that the item exists). If the sender held fewer than offered at perform time, the partner gains more than the sender loses. Whether drops, shop sales or eating are blocked while a trade is open was not read. Treat as a risk to test; fix: re-check the held amount at perform and settle one ledger. The same file also hard-codes a 30-slot inventory (350) and a 12-item offer cap (248), both to be data in Frankendom.
- Not read: the body of the add-stock method (Shop.java 105-176), the retro path body (Shop.java 224-261), and the per-shop modifier values in the shop data.
- AGPL-3.0: clean-room only. The sketch is written from the described mechanism.
