# angband-angband (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/angband-angband/src/store.c` | Licence: dual, GPL version 2 or the "Angband licence" (non-profit, educational/research only), per the header at lines 11-18 | C | symbol `price_item` (with `do_cmd_buy` and `do_cmd_sell`)

Checked: `price_item` is at store.c 579-674 (read in full). `do_cmd_buy` (1650-1782) and `do_cmd_sell` (1869 onward, price and credit lines read) read for the transaction order. `store_update` (1422-1465) read in full. `store_maint` read only at its start (1294-1330), so the restock contents are not described. Callers of `price_item`: ui-store.c (display and the purchase prompt, read at 595-665), store.c 1695 and 1920 (the two transaction commands), ui-object.c:204 (not read). Confidence high on prices and transaction order; medium on the restock detail. camera_scope: n/a (economy topic, no camera).

## 1. Mechanism

- One function prices every shop trade: `price_item(store, obj, store_buying, qty)` at store.c:579. `store_buying` true means the shop buys from the player; false means the shop sells to the player.
- Order of steps inside `price_item`:
  (a) Base value. Buying from the player uses the lower of the real and the apparent value (603-604 for ordinary items). Selling to the player starts from the higher of the two for the worthless test (606-607).
  (b) Worthless test: a base of 0 or less returns 0 gold to the player when the shop is buying, and qty when the shop is selling (612-614).
  (c) Black market sets `adjust = 150` (617-618).
  (d) Shop buying (620-639): `adjust = 100 + (100 - adjust)`, so a normal shop pays 100 percent and the black market 50 percent (623); base x 2/3 (629); the black market halves the base again (632-634); with the birth option no_selling on, the function returns 0 here (637-638).
  (e) Shop selling (640-651): the base is re-read as the real value (643-645); the black market doubles it (649-650).
  (f) Rounding and the adjust factor: `price = (price * adjust + 50) / 100` (655). Non-wand stacks are then multiplied by qty (658-659).
  (g) Purse cap, shop buying only: if the price exceeds the owner's max_cost times qty, it is clamped to that (662-664).
  (h) Never free: a price of 0 or less returns qty (667-669).
- Resulting factors for one unit with real = apparent = V (computed from the code above, not from the comments):
  - normal shop buys from the player: about 2/3 V, capped by the purse;
  - black market buys from the player: about 1/6 V (2/3, halved, then 50 percent);
  - normal shop sells to the player: V;
  - black market sells to the player: 3V (doubled, then 150 percent).
- Buy command (`do_cmd_buy`, 1650): the price is recomputed on the command side (1695). If it exceeds the player's gold, the command refuses (1697-1700). Otherwise gold is spent (1704), the item is given to the player, and unless the item is a staple, the stock is reduced. If the stock is then empty, the shop either shuffles its owner with chance one_in_(store_shuffle) (1761-1764) or restocks (the restock loop after 1765 was read but its body is not described here).
- Sell command (`do_cmd_sell`, 1869): the price is computed with `price_item(..., true, amt)` (1920) and credited to the player's gold (1923). With no_selling on, the sale message omits the price (1966-1967).
- Restock clock: while in the dungeon, `daycount` increments once per `10 * store:turns` game turns (game-world.c:497; store:turns = 1000 per constants.txt:158). Returning to town runs `store_update`, which runs `store_maint` once per shop per day and shuffles one non-home owner with chance one_in_(store:shuffle), where store:shuffle = 25 (constants.txt:161; store.c:1438-1456).
- Gold source under no_selling: below town, gold drops are multiplied by 5 (obj-make.c:1310-1311). So the mode turns the sell faucet off and raises the drop faucet.
- Ledger: the owner record has only a `max_cost` field (store.h:34-39; read, no gold balance). The shop has no balance. Gold leaves the player when buying and enters the player when selling, and nothing records where it goes. The purse is a per-unit cap on what a shop pays, not a wallet.

## 2. Key functions

- `price_item`: `/mnt/frankendom-donors/angband-angband/src/store.c` 579-674. Whole pricing rule: base value, worthless test, black-market factor, shop-buying branch (2/3, no_selling), shop-selling branch, rounding, qty, purse cap, never free.
- `do_cmd_buy`: `/mnt/frankendom-donors/angband-angband/src/store.c` 1650-1782. Price recompute (1695), afford check (1697), spend (1704), stock reduction and empty-stock handling (partly read; only 1761-1764 is receipted).
- `do_cmd_sell`: `/mnt/frankendom-donors/angband-angband/src/store.c` 1869 onward. Price (1920) and credit (1923).
- `store_update`: `/mnt/frankendom-donors/angband-angband/src/store.c` 1422-1465. Day-count restock and owner shuffle.
- `store_purchase` (UI side): `/mnt/frankendom-donors/angband-angband/src/ui-store.c` 595-665. Uses `price_item` to compute how many the player can afford (621-649) and the price shown (708). The UI and the command call the same function.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Shop buys from a player at a fraction of the lower of two value estimates | 2/3 (theirs, store.c 629) |
| Black market: a further halving on buy, a 50 percent adjust (net about 1/6 V) | /2 (theirs, store.c 633); adjust 50 derived from 150 (store.c 618, 623) |
| Black market sells at a markup: base doubled, then 150 percent (about 3V) | x2 (theirs, store.c 650); 150 (store.c 618) |
| Price is rounded with +50 before /100 | +50 and /100 (theirs, store.c 655) |
| Per-unit cap on what a shop pays (the purse) | 5000, 10000, 20000, 30000 (owner purses, lib/gamedata/store.txt lines 22-25; store.c 663-664) |
| Zero or worthless: buying gives 0, selling gives qty (never free) | (mechanism) |
| Sell faucet off and drop faucet up (no_selling) | gold drops x5 below town (theirs, obj-make.c 1311) |
| Restock on day count; owner shuffle with chance 1/25 | store:turns 1000 (constants.txt 158), 10000 game turns per day count (game-world.c 497), store:shuffle 25 (constants.txt 161) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the price (base, worthless test, black-market factor, shop-side branch, rounding, qty, purse cap, never free) and for the transaction (stock check, afford check, spend, stock reduction and restock). It uses the lower value for buying and the real value for selling only, so it omits the donor's MAX pre-check for the selling worthless test, the wand (charged item) branch, the UI affordability maths, the item grant, the owner shuffle and the random stock creation. Integer division is written with Math.trunc, as in the donor's C division.

```ts
// Licence: dual, GPL version 2 or the "Angband licence" (non-profit). clean-room sketch from the described mechanism, not a translation of the donor.
// clean-room
type ShopKind = 'normal' | 'black';
type Side = 'shopBuys' | 'shopSells'; // shopBuys = the player sells to the shop

interface ShopTerms {
  kind: ShopKind;
  purseMaxCost: number; // per-unit cap on what the shop will pay (owner purse, data)
  noSelling: boolean;   // birth option: the shop pays nothing
}

interface Quote {
  realValue: number;     // true value of one unit
  apparentValue: number; // value the shop estimates (lower of the two when buying)
  qty: number;
}

// Price of qty units. Integer arithmetic, truncating like the donor's C division.
function price(t: ShopTerms, side: Side, q: Quote): number {
  let base = side === 'shopBuys' ? Math.min(q.realValue, q.apparentValue) : q.realValue;
  if (base <= 0) return side === 'shopBuys' ? 0 : q.qty; // worthless

  let adjust = t.kind === 'black' ? 150 : 100;
  if (side === 'shopBuys') {
    adjust = 100 + (100 - adjust);          // normal shop 100%, black market 50%
    base = Math.trunc((base * 2) / 3);      // shops pay two-thirds of value
    if (t.kind === 'black') base = Math.trunc(base / 2);
    if (t.noSelling) return 0;
  } else if (t.kind === 'black') {
    base = base * 2;                         // black market doubles the base before its 150%
  }

  let p = Math.trunc((base * adjust + 50) / 100);
  p *= q.qty;
  if (side === 'shopBuys' && p > t.purseMaxCost * q.qty) p = t.purseMaxCost * q.qty;
  if (p <= 0) return q.qty;                  // never free
  return p;
}

interface Ledger { gold: number; }          // the only gold balance touched by a shop trade
interface Stock { units: number; staple: boolean; }

// Buy: the price is recomputed here, not taken from the screen. Order: stock check, afford check, spend, then stock reduction and restock on empty.
function buy(t: ShopTerms, q: Quote, ledger: Ledger, stock: Stock, restock: () => void): 'ok' | 'stock' | 'afford' {
  if (q.qty > stock.units && !stock.staple) return 'stock';
  const p = price(t, 'shopSells', q);
  if (p > ledger.gold) return 'afford';
  ledger.gold -= p;
  if (!stock.staple) {
    stock.units -= q.qty;
    if (stock.units <= 0) restock();
  }
  return 'ok';
}

// Sell to the shop: the shop's purse cap applies, and the gold is added to the same ledger.
function sell(t: ShopTerms, q: Quote, ledger: Ledger): number {
  const p = price(t, 'shopBuys', q);
  ledger.gold += p;
  return p;
}
```

The donor's `do_cmd_buy` also checks carry room before it prices the purchase; the sketch omits that check.

## 5. Lands in

- TARGET `origins/server/shop-price.ts` (proposed new module, server side; the Frankendom economy files were not read, so this path is a proposal). One pricing function, called by the buy and sell commands on the server, and by the client only for display.
- Parity-checklist row 21 (catalogue fields): item values and shop terms (purse cap, black-market factors, no_selling flag) are catalogue or zone data. The gold credit and debit belong with row 18 (loot roll and XP award), the one ledger side.
- Reuse tag: rewrite-from-idea (dual GPL-2 or Angband licence: clean-room, shape only)
- Brief rule served: one ledger (gold moves only in the server buy and sell commands); zones as data (purse caps, black-market factors and the sell faucet per shop or zone); server-verified (the server recomputes the price, the client price is not trusted)

## 6. Gaps and risks

- Licence: dual. The Angband licence option is non-profit only, and GPL-2 is the other option. Clean-room, shape only, in either case.
- No shop balance. Gold paid to a shop disappears, and gold paid by a shop has no source record: the purse is only a cap per unit. Frankendom's one ledger needs an explicit sink and a source for every shop trade. The donor does not give one.
- Sell faucet off and drop faucet up (no_selling, obj-make.c 1311) is a whole-game mode, not a per-zone rule. Frankendom would need it as a zone or season flag, and the drop side must be tuned with it.
- The donor's buy price is recomputed server-side in the command (store.c 1695), but the UI uses the same function for display (ui-store.c 621-649, 708). Frankendom must make the client show the server's quote, or accept that the displayed and charged price can differ.
- The donor's check and spend are one function call in a single-player game; there is no atomicity across players. Frankendom must do the afford check and the spend in one server transaction.
- Stock on sale is per shop and changes on a day count set in the dungeon clock (game-world.c 497). For zones as data, the restock clock must be the server clock, not the player's time in the dungeon.
- Integer truncation: C division rounds toward zero; the sketch matches that with Math.trunc. A port that uses floats will charge different amounts at small values.
- Not read: store_maint beyond line 1330, store_create_random, purchase_analyze, store_will_buy beyond line 548 (the donor's buy-list filter), and the borg copies (bot code, not a player economy).

Best transferable idea: Price every shop trade with one pure function that the buy and sell commands call on the server, so the client's displayed price is never the one charged, and bound shop payouts with a per-unit purse cap.
Decision (proposed): adapt — adopt the server-recomputed price and the single spend-or-refuse transaction; adapt the spreads and the sell switch to zone data, because Frankendom has no shop balance and the donor's purse is only a per-unit cap.
Acceptance: a buy command sent with a client price of 1 for an item priced 40 charges 40, and a value-30 sale pays 20 to a normal shop and 5 to a black-market shop; with no_selling set in the zone the sale pays 0 and the item still leaves the pack.
