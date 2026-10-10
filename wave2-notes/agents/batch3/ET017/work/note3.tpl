# pmbstyle-L2Solo (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/MarketListingPolicy.js` | Licence: Apache-2.0 (LICENSE file: "Apache License, Version 2.0, January 2004"; package.json licence field and file headers not read) | JavaScript | symbols `evaluate`, `classify`, `listingPrice`, `listingFloor` (the hint file `BotMarketPricing.js` only holds the reference price and the 0.60 floor)

Checked: Read in full: `MarketListingPolicy.js` (254 lines), `BotMarketPricing.js` (56), `BotEconomyPricing.js` (15), `MarketDemandIndex.js` (208), `MarketLotPolicy.js` (37). Read in part: `ItemDisposition.js` 12, 37-58, 403-498 (sale candidates, NPC liquidation; `basePrice()` at line 65 not read), `ColdMarketListingService.js` 19-22, 746-790 (review constants, the learned multiplier, the store close), `ColdMarketBuyStoreService.js` 30-58 (buy side only). Callers: `evaluate` is called from `ColdMarketListingService.js` at 525, 613 and 619, none of which I read in full; the contract below is read from the function bodies. Not read: `MarketSnapshot.js` (440 lines), `MarketBuyerActivity.js` (only its `count` call sites), `ItemDisposition.basePrice` (65), the `ProgressionRates.profile()` values per preset (so the adena rate is a name, not a number), and how open listings react when the adena rate changes. Confidence: high on the listing decision and every number quoted (each read in place, 100 receipts verified). Medium on the full caller set (see above). Camera scope: not a camera cell. Cell N = 11 (the cells file category_no).

Best transferable idea: a seller lists no more units than funded demand can absorb, at a price that undercuts the cheapest rival by 2 percent but never drops below 60 percent of the reference, and surplus goes to a fixed NPC sink at half of base price.
Decision (proposed): adapt — take the listing gate (funded demand minus supply as the unit cap, the undercut-versus-floor test, the NPC sink at half base) for AI merchants and surplus-loot clearing; reject the learned multiplier that only steps down (5 points per unsold expiry, floor 50, never raised) and the per-seller seeded 70-90 percent spread, because both make the price depend on history or on the character id, which one ledger and a single posted price do not allow.
Acceptance: a server test with 6 funded units of demand and no supply lets a seller holding 10 units list exactly 6; with a rival ask of 90 and 5 units already listed, the same seller lists exactly 1 unit at no more than floor(90 x 0.98) = 88, and lists nothing (stock goes to the warehouse or NPC) when its 60 percent floor is above 88.

## 1. Mechanism

- A seller-side listing decision, run for each item a bot holds. It is a sequence of gates, then a price. Order as the code runs (`classify`, 53-173, then `listingPrice`, 181-200):
  1. Basic gates: invalid item, small material lot (`LotPolicy.viable`, MarketLotPolicy.js 21-35), NPC-only items, starter kit, low-grade gear when the server preset does not allow it, and low-value gear. Each sends the stock to NPC or warehouse (`surplusGearDecision`, 42-51).
  2. Supply and demand. `supplyFor` gives the other sellers' units and their cheapest ask (`minimumPrice`). `unitPrice` is the seller's price against that supply (79), then demand is computed at that price (82). `fundedUnits` is the units that ready buyers can pay for at `unitPrice`: each ready signal contributes `min(amount, floor(budget / unitPrice))` (MarketDemandIndex.js 143-147, total 156).
  3. Cap. `availableUnits = fundedUnits - supplyUnits` (137). If none is left, the decision is "saturated" and the stock goes to NPC or warehouse (138). Otherwise `listCount = min(stock, availableUnits)` (142).
  4. Price (`listingPrice`, 181-200). `floor = listingFloor = max(1, floor(reference x 0.60))`, from `BotMarketPricing.js` 44-53. `competition = min(rival minimumPrice, NPC buy price)` (184). `competitivePrice = floor(competition x 0.98)` (186). If the floor is above the competitive price the listing is refused (187), and the stock goes to NPC or warehouse. Otherwise the price is `max(floor, min(preferred, competitivePrice))` (199).
- `preferred` is the seller's ask (`ItemDisposition.priceFor`, 46-57): `reference x (70 + |seed| mod 21) x adjustment`, with `seed = characterId x 31 + selfId x 17` (53-54) and `adjustment` clamped to 50 to 100 percent (55), then divided by 10000 (56).
- Learned multiplier (`pricingAfterReview`, ColdMarketListingService.js 746-762). When a listing expires unsold, or a speculative listing fails, its per-item percent drops by 5 (756), floored at 50. Nothing raises it.
- NPC sink. `npcPrice = max(1, floor(base x 0.5))` (MarketListingPolicy.js 236; ItemDisposition.js 492; the NPC sale price floor in 451). NPC liquidation takes items with base price at most 1000 (`NPC_LIQUIDATION_MAX_UNIT_PRICE`, ItemDisposition.js 12, 489), low-grade gear, or NPC-only items.
- Reference price: `min(scalePrice(base), cheapest NPC buy price)` (BotMarketPricing.js 45). `scalePrice` multiplies the base by the economy rate (`adena` profile value, floored at 0.01, BotEconomyPricing.js 7 and 11).
- Timing. Listings last 20 minutes, speculative listings 5 (ColdMarketListingService.js 19-20). The seller reviews every 2 minutes (21). A seller whose stock is unsold waits 30 minutes before retrying (22). A buyer's "wanted" signal lives 30 minutes (MarketDemandIndex.js 3). Event-driven apart from these timers.

## 2. Key functions

- `classify`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/MarketListingPolicy.js` 53-173. Gates, then supply, demand and cap; the order matters because the cap uses demand computed at the seller's own price.
- `listingPrice`: same file, 181-200. Floor, competition, undercut, and the refusal rule.
- `listingFloor`: same file, 175-179. Returns 1 when base is zero, else `BotMarketPricing.listingFloor`.
- `demandFor`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/MarketDemandIndex.js` 114-161. Ready buyers and AFK offers, with funded units.
- `supplyFor`: same file, 163-198. Other sellers' units and cheapest ask.
- `priceFor` and `saleCandidates`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/ItemDisposition.js` 46-57 and 403-473.
- `pricingAfterReview`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/ColdMarketListingService.js` 746-762.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cap the listed units at funded demand minus supply | none (the subtraction, MarketListingPolicy.js 137) |
| Undercut the cheapest rival by a share, but not below a floor | Undercut 0.98 (186); floor 0.60 of reference (BotMarketPricing.js 53) |
| Refuse to list when the floor cannot undercut | Rule at 187 (no constant) |
| Surplus to an NPC at a fixed share of base | Half of base (MarketListingPolicy.js 236; ItemDisposition.js 492) |
| Seller ask spread | 70 to 90 percent of reference, from `seed mod 21` (ItemDisposition.js 54) |
| Learned multiplier | Clamp 50 to 100 (55); step 5 down per unsold expiry (ColdMarketListingService.js 756) |
| Competitive band for counting rivals | Within 5 percent of the unit price (MarketListingPolicy.js 89) |
| Speculative listing | Base at least 10000 (11); one unit of supply at most (12) |
| Material shelf | 200 units total (123); sellers between 2 and 4 (122) |
| Lifetimes and cadence | Listing 20 min (19); speculative 5 min (20); review 2 min (21); retry 30 min (22); wanted signal 30 min (MarketDemandIndex.js 3) |
| Inflation knob | Adena rate multiplies every base price (BotEconomyPricing.js 7, 11); profile values not read |

## 4. TypeScript sketch

simplified: keeps the donor's gate order for the core rule (cap, then undercut, then floor, then price) and the same 0.98 undercut, 0.60 floor and half-base NPC sink. It omits: the basic gates (small lots, NPC-only, starter kit, low-grade and low-value gear), the speculative listing path, the seller limit and the 200-unit material shelf, the AFK offers, the 5 percent competitive band, and the seeded spread's use of a character id (the caller passes the seed). It takes the caller's `rivalAsk` already as the donor's `competition`, the cheaper of the rival's cheapest ask and the NPC buy price. It also takes `fundedUnits` as already computed at the ask; the donor computes it at the seller's own unit price first (line 82), which is the one circular step the sketch does not reproduce. Where the donor returns a surplus route (NPC or warehouse) the sketch returns `hold`.

```ts
@@SKETCH@@
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS at `/tmp/pmbstyle-L2Solo-listing.ts`: passed. The file ends with `export {}`.

## 5. Lands in

- TARGET `origins/server/market-listing.ts` (proposed new module; not read in the Frankendom tree). The gate, the undercut and the NPC sink are server functions; the client shows the posted price only.
- Parity-checklist row 21 (catalogue fields), as a stretch. The floor ratio, undercut ratio, NPC ratio, unit caps and lifetimes are per-item or per-zone catalogue data. None of rows 1-23 covers a player or AI market directly, so say so if Lead wants a new row.
- Reuse tag: adapt-allowed (Apache-2.0: code may be adapted, keep the notice if any code is copied; this note copies no line)
- Brief rule served: zones as data (floor, undercut, NPC ratio and lifetimes are data fields per zone); one ledger (one currency, adena, through one multiplier); server-verified (the decision runs on the server and the client shows the result only)

## 6. Gaps and risks

- The learned multiplier only goes down. A listing that expires unsold drops the item's percent by 5, down to 50 (ColdMarketListingService.js 756). Nothing in the donor raises it, so a shortage never brings prices back. Frankendom must either add a recovery rule or choose the one-way discount on purpose.
- The floor is in two places. `MIN_LISTING_BASE_PERCENT = 60` is defined and exported (MarketListingPolicy.js 13, 244) but not used by the listing floor, which hard-codes `0.60` (BotMarketPricing.js 53). One number, two sources: Frankendom has one constant.
- The cap and the price are circular. `unitPrice` is set from supply first (79), then demand is computed at that price (82), then the cap uses it (95, 137). A price change changes the cap. Frankendom should compute demand at one posted price in one step.
- Per-seller spread. Two characters pay different prices for the same item because the spread comes from `characterId x 31 + selfId x 17` (ItemDisposition.js 53-54). That is arbitrary and it hides the price from the player. Frankendom should post one price per item and zone.
- Surplus goes to a warehouse with no clock. When the floor cannot undercut or there is no room, the stock is held (`surplusGearDecision`, 42-51), and nothing in the policy sends it to the NPC after a time. Only the NPC route has a fixed price. Frankendom needs a timer on held stock.
- Fixed asks, no matching. Buyers and sellers post prices; the cheapest rival is the only competition signal (184). Frankendom's market rules (one engine) need the same: a posted ask, not an order book.
- The adena rate (`economyRate`, BotEconomyPricing.js 7) is the only inflation knob. It multiplies every base price, with a floor of 0.01. The donor does not show whether open listings re-price when the rate changes (not read). Frankendom would need that answer before it uses one multiplier.
- Donor is a bot simulation of players. Its AI sellers and buyers are the transferable part. The player-facing market rules (cell 2 covers the escrow lifecycle of a real server market) are a different layer.
- Licence: Apache-2.0 allows adaptation. This note copies no line; the sketch is written from the described rules.
