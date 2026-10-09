# ihhub-fheroes2 (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/dialog/dialog_marketplace.cpp | Licence: GPL-2 | C++ | symbol Dialog::Marketplace / GetTradeCosts

## 1. Mechanism
- fheroes2 marketplace (a player with markets or a trading post exchanges one resource for another). The rate is a table lookup, not a market.
- Table: getTradeCost (kingdom/resource_trading.cpp 61-141) returns the cost multiplier for a pair of resources, indexed by the number of markets the player owns (0 markets asserts and returns 0; more than 9 are capped at 9; lines 63-78). Same resource or an unselected resource returns 0 (68-72). GetTradeCosts (dialog_marketplace.cpp 57-60) passes a fixed 3 when the dialog was opened from a trading post, instead of the kingdom's market count (not "counts as 3 on top").
- Resources are three categories: common (wood, ore), rare (mercury, sulfur, crystal, gems) and gold. Same-category trades share one table, resourceToResource (50, 102, 130). The tables are at resource_trading.cpp 50-56; each is 9 entries (1 market to 9). The "rate" is units of the source per unit of the target, or gold per unit of source when the target is gold, so a bigger number is worse for a non-gold target and better when the target is gold.
- Dialog::Marketplace (344-633) is a modal event loop. Clicking a source (487-513) sets max_sell to the funds held and, when a target is chosen, max_buy = max_sell x rate for a gold target or max_sell / rate (integer division) otherwise (494); clicking a target does the same (523-545).
- The amount is changed by the scrollbar (549-559), the max button (565-574), the min button, which sets one step (577-586), the left and right buttons and the mouse wheel (607-631). One step is: gold target, sell 1 and buy rate; other target, sell rate and buy 1 (611-613, 624-626). The scrollbar's maxIndex is set in ShowTradeArea (not read).
- Trade button (589-605), enabled only when count_sell and count_buy are non-zero: subtract count_sell of the source from the kingdom and add count_buy of the target, then clear the selection. The stock was never reserved before this point.
- Also in the dialog and not read: the gift button (467-481, Dialog::MakeGiftResource), the firstExchange flag, and the right-click income view (514-516).
- Runs on player input in the dialog. No tick.

## 2. Key functions
- getTradeCost | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/kingdom/resource_trading.cpp | 61-141 | the rate table lookup by market count and category pair.
- GetTradeCosts (dialog helper) | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/dialog/dialog_marketplace.cpp | 57-60 | counts markets (trading post = 3) and calls getTradeCost.
- Dialog::Marketplace | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/dialog/dialog_marketplace.cpp | 344-633 | the trade screen: source and target clicks, the max buy and sell, amount steps, the confirm path.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Rate from a table keyed by owned-facility count (more facilities, better rate), capped | Seven tables of nine entries per category pair (theirs, resource_trading.cpp 50-56) |
| Three-category exchange: same-category rate, cross-category rates | Categories wood/ore, rare, gold (theirs) |
| Max buy = sell x rate (gold target) or sell / rate (integer); amount moves in whole steps | Trading post uses 3 markets whatever the kingdom owns (theirs, 59) |
| Fixed amount steps (1, seek, max, min) | Step sizes (theirs, UI, 549-631) |

## 4. TypeScript sketch
simplified: the caller supplies the facility count (the donor passes a fixed 3 for a trading post, and 0 markets returns 0 there; the sketch treats 0 as 1). Step-by-step amount changes, scrollbar, gift and UI are omitted; only the maximum is computed.
```ts
// Licence: GPL-2 | clean-room: written from the mechanism, no donor lines.
// Exchange rate from a table indexed by owned facilities (capped at nine) and a category pair.
// Buying gold multiplies the sold amount by the rate; buying anything else divides by it.
type Cat = "common" | "rare" | "gold";
const RATE: Record<string, number[]> = {                 // nine rows, index = facilities - 1 (theirs)
  "common>common": [10, 7, 5, 4, 4, 3, 3, 3, 2],
  "common>rare":   [20, 14, 10, 8, 7, 6, 5, 5, 4],
  "common>gold":   [25, 37, 50, 62, 74, 87, 100, 112, 124],
  "rare>common":   [5, 4, 3, 2, 2, 2, 2, 2, 1],
  "rare>rare":     [10, 7, 5, 4, 4, 3, 3, 3, 2],
  "rare>gold":     [50, 74, 100, 124, 149, 175, 200, 224, 249],
  "gold>common":   [2500, 1667, 1250, 1000, 834, 715, 625, 556, 500],
  "gold>rare":     [5000, 3334, 2500, 2000, 1667, 1429, 1250, 1112, 1000],
};

type Res = "wood" | "ore" | "mercury" | "sulfur" | "crystal" | "gems" | "gold";
function cat(r: Res): Cat { return r === "gold" ? "gold" : (r === "wood" || r === "ore") ? "common" : "rare"; }

function rate(facilities: number, from: Res, to: Res): number {
  if (from === to) return 0;                              // same resource: no exchange
  const row = RATE[`${cat(from)}>${cat(to)}`];
  const i = Math.min(Math.max(facilities, 1), 9) - 1;    // cap at nine
  return row[i];
}

function maxBuy(sold: number, from: Res, to: Res, facilities: number): number {
  const r = rate(facilities, from, to);
  if (r === 0) return 0;
  return to === "gold" ? sold * r : Math.floor(sold / r);
}
```
Note on the sketch: "rare>rare" and "common>common" both use the donor's one resourceToResource table (resource_trading.cpp 102 and 130), verified.

## 5. Lands in
- Frankendom file: origins/contracts/economy.ts (exchange rate as data; its settleTrade, 212-, is the existing item-for-item trade at region:concord-exchange) and origins/shops/shop.ts (shop list rows; a resource exchange would be a new row kind). Named from reading these files in the world worktree.
- Parity-checklist row: row 21 (catalogue fields as data: a rate table is per-zone data) and row 18 (one server-verified ledger).
- Usable rule: one-character/one-ledger rule (the server applies the trade; the screen is a view).
- Reuse tag: rewrite-from-idea (GPL-2; mechanism only).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- The donor's rate depends on owned facilities (markets). Frankendom has no such building; the nearest analogue is a zone-level market, which is a Lead decision.
- The rate table is fixed and symmetric by category. A Frankendom rate must be data per zone (rule 4), not a constant in code.
- The trade is a direct exchange with no spread. Any fee is a new rule.
- The dialog computes the buy and sell counts on the client. Frankendom (server-verified) recomputes them from the rate table at confirm, as shop-buy.ts does for prices.
- The trade deducts and credits on the client in two calls (590-591); the server must apply both in one ledger batch or neither.
- The rate improves with markets owned; the 9-entry cap and trading-post fixed 3 are donor design, not Frankendom rules.
- GPL-2: mechanism only.
