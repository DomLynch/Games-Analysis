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
- `do_cmd_buy`: `/mnt/frankendom-donors/angband-angband/src/store.c` 1650-1782. Price recompute (1695), afford check (1697), spend (1704), stock reduction and empty-stock handling (1733-1770, partly read).
- `do_cmd_sell`: `/mnt/frankendom-donors/angband-angband/src/store.c` 1869 onward. Price (1920) and credit (1923).
- `store_update`: `/mnt/frankendom-donors/angband-angband/src/store.c` 1422-1465. Day-count restock and owner shuffle.
- `store_purchase` (UI side): `/mnt/frankendom-donors/angband-angband/src/ui-store.c` 595-665. Uses `price_item` to compute how many the player can afford (621-649) and the price shown (706-708). The UI and the command call the same function.

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
