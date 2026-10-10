# pmbstyle-L2Solo (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/MarketListingPolicy.js` | Licence: Apache-2.0 (LICENSE file: "Apache License, Version 2.0, January 2004"; package.json licence field and file headers not read) | JavaScript | symbols `evaluate`, `classify`, `listingPrice`, `listingFloor` (the hint file `BotMarketPricing.js` only holds the reference price and the 0.60 floor)

Checked: Read in full: `MarketListingPolicy.js` (254 lines), `BotMarketPricing.js` (56), `BotEconomyPricing.js` (15), `MarketDemandIndex.js` (208), `MarketLotPolicy.js` (37). Read in part: `ItemDisposition.js` 12, 37-58, 403-498 (sale candidates, NPC liquidation; `basePrice()` at line 65 not read), `ColdMarketListingService.js` 19-22, 746-790 (review constants, the learned multiplier, the store close), `ColdMarketBuyStoreService.js` 30-58 (buy side only). Callers: `evaluate` is called from `ColdMarketListingService.js` at 525, 613 and 619, none of which I read in full; the contract below is read from the function bodies. Not read: `MarketSnapshot.js` (440 lines), `MarketBuyerActivity.js` (only its `count` call sites), `ItemDisposition.basePrice` (65), the `ProgressionRates.profile()` values per preset (so the adena rate is a name, not a number), and how open listings react when the adena rate changes. Confidence: high on the listing decision and every number quoted (each read in place; the 40 receipts for this cell pass the verifier). Medium on the full caller set (see above). Camera scope: not a camera cell. Cell N = 11 (the cells file category_no).

Best transferable idea: a seller lists no more units than funded demand can absorb, at a price that undercuts the cheapest rival by 2 percent but never drops below 60 percent of the reference, and surplus goes to a fixed NPC sink at half of base price.
Decision (proposed): adapt — take the listing gate (funded demand minus supply as the unit cap, the undercut-versus-floor test, the NPC sink at half base) for AI merchants and surplus-loot clearing; reject the learned multiplier that only steps down (5 points per unsold expiry, floor 50, never raised) and the per-seller seeded 70-90 percent spread, because both make the price depend on history or on the character id, which one ledger and a single posted price do not allow.
Acceptance: a server test with 6 funded units of demand and no supply lets a seller holding 10 units list exactly 6; with a rival ask of 90 and 5 units already listed, the same seller lists exactly 1 unit at no more than floor(90 x 0.98) = 88, and lists nothing (stock goes to the warehouse or NPC) when its 60 percent floor is above 88.

## 1. Mechanism

- A seller-side listing decision, run for each item a bot holds. It is a sequence of gates, then a price. Order as the code runs (`classify`, 53-173, then `listingPrice`, 181-200):
  1. Basic gates: an invalid item is ignored (54-56); a small material lot (`LotPolicy.viable`, MarketLotPolicy.js 21-35) goes to the warehouse (57); NPC-only items, the starter kit, low-grade gear when the server preset does not allow it, and low-value gear go to NPC or warehouse through `surplusGearDecision` (42-51).
  2. Supply and demand. `supplyFor` gives the other sellers' units and their cheapest ask (`minimumPrice`). `unitPrice` is the seller's price against that supply (79), then demand is computed at that price (82). `fundedUnits` is the units that ready buyers can pay for at `unitPrice`: each ready signal contributes `min(amount, floor(budget / unitPrice))` (MarketDemandIndex.js 143-147; when `unitPrice` is 0 the full amount counts if the budget is positive; total at 156).
  3. Cap. `availableUnits = fundedUnits - supplyUnits` (137). If none is left, the decision is "saturated" and the stock goes to NPC or warehouse (138). Otherwise `listCount = min(stock, availableUnits)` (142).
  4. Price (`listingPrice`, 181-200). `floor = listingFloor = max(1, floor(reference x 0.60))`, from `BotMarketPricing.js` 44-53. `competition = min(rival minimumPrice, NPC buy price)` (184). `competitivePrice = floor(competition x 0.98)` (186). If the floor is above the competitive price the listing is refused (187), and the stock goes to NPC or warehouse. Otherwise the price is `max(floor, min(preferred, competitivePrice))` (199).
- `preferred` is the seller's ask (`ItemDisposition.priceFor`, 46-57): `reference x (70 + |seed| mod 21) x adjustment`, with `seed = characterId x 31 + selfId x 17` (53-54) and `adjustment` clamped to 50 to 100 percent (55), then divided by 10000 (56).
- Learned multiplier (`pricingAfterReview`, ColdMarketListingService.js 746-762). When a store closes with reason `expired` (the callers at 774 and 847 pass it), or a speculative listing has expired unsold (750), the item's percent drops by 5 (756), floored at 50. The donor has no code that raises it.
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
| Ordinary surplus gear (base at or under the limit) to an NPC at a fixed share of base; other surplus to the warehouse | Half of base (MarketListingPolicy.js 236; ItemDisposition.js 492) |
| Seller ask spread | 70 to 90 percent of reference, from `seed mod 21` (ItemDisposition.js 54) |
| Learned multiplier | Clamp 50 to 100 (55); step 5 down per unsold expiry (ColdMarketListingService.js 756) |
| Competitive band for counting rivals | Within 5 percent of the unit price (MarketListingPolicy.js 89) |
| Speculative listing | Base at least 10000 (11); one unit of supply at most (12) |
| Material shelf | 200 units total (123); sellers between 2 and 4 (122) |
| Lifetimes and cadence | Listing 20 min (19); speculative 5 min (20); review 2 min (21); retry 30 min (22); wanted signal 30 min (MarketDemandIndex.js 3) |
| Inflation knob | Adena rate multiplies every base price (BotEconomyPricing.js 7, 11); profile values not read |

## 4. TypeScript sketch

simplified: keeps the donor's gate order for the core rule (cap, then undercut, then floor, then price) and the same 0.98 undercut, 0.60 floor and half-base NPC sink. It omits: the basic gates (small lots, NPC-only, starter kit, low-grade and low-value gear), the speculative listing path, the seller limit and the 200-unit material shelf, the AFK offers, the 5 percent competitive band, and the seeded spread's use of a character id (the caller passes the seed). It takes the caller's `rivalAsk` already as the donor's `competition`, the cheaper of the rival's cheapest ask and the NPC buy price. It also takes `fundedUnits` as already computed at the ask; the donor counts it at the seller's own unit price (line 82), so the cap depends on the price, and the sketch takes that count as an input instead of reproducing the step. Where the donor returns a surplus route (NPC or warehouse) the sketch returns `hold`.

```ts
// Licence: Apache-2.0 (donor). Clean-room shape written from the described mechanism; no donor lines are translated.
export interface Rules {
  floorRatio: number;     // listing floor, share of the reference price
  undercutRatio: number;  // ask must undercut the cheapest rival ask by this share
  npcSellRatio: number;   // NPC liquidation price, share of base price
  adjustMin: number;      // lowest learned price multiplier, percent
  adjustStep: number;     // drop per unsold expiry, percent points
}

export interface Market {
  referencePrice: number; // min(scaled base price, cheapest NPC buy price)
  rivalAsk: number;       // cheapest ask from other sellers (Infinity if none)
  supplyUnits: number;    // units already offered by everyone else
  fundedUnits: number;    // demand that can pay the ask, in units
}

export type Decision =
  | { action: 'list'; count: number; price: number }
  | { action: 'hold' };   // keep in the warehouse: floor above the undercut price, or no room

// Ask ladder: a seller's fixed spread (70..90 percent of reference) times a learned multiplier.
export function preferredAsk(referencePrice: number, sellerSeed: number, adjustPercent: number, r: Rules): number {
  const spread = 70 + (Math.abs(sellerSeed) % 21);
  const adjust = Math.max(r.adjustMin, Math.min(100, adjustPercent));
  return Math.max(1, Math.floor(referencePrice * (spread * adjust) / 10000));
}

// Listing decision: list only what funded demand can absorb, at or below the undercut price, never below the floor.
export function decide(stock: number, preferred: number, m: Market, r: Rules): Decision {
  const floor = Math.max(1, Math.floor(m.referencePrice * r.floorRatio));
  const undercut = Number.isFinite(m.rivalAsk) ? Math.floor(m.rivalAsk * r.undercutRatio) : Infinity;
  if (floor > undercut) return { action: 'hold' };
  const available = Math.max(0, m.fundedUnits - m.supplyUnits);
  if (available <= 0) return { action: 'hold' };
  return { action: 'list', count: Math.min(stock, available), price: Math.max(floor, Math.min(preferred, undercut)) };
}

// Surplus goes to the NPC at a fixed share of base price: a sink, not a market.
export function npcSellPrice(basePrice: number, r: Rules): number {
  return Math.max(1, Math.floor(basePrice * r.npcSellRatio));
}

// Each unsold expiry lowers the learned multiplier; there is no step back up in the donor.
export function afterUnsoldExpiry(adjustPercent: number, r: Rules): number {
  return Math.max(r.adjustMin, adjustPercent - r.adjustStep);
}

export {};
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
- The cap depends on the price. `unitPrice` comes from supply (79), demand is counted at that price (82), and the cap uses that count (137). A different price gives a different cap, so a seller who asks more is offered to fewer buyers without any rule saying so. Frankendom should count demand at one posted price, and say so in the rule.
- Per-seller spread. Two characters pay different prices for the same item because the spread comes from `characterId x 31 + selfId x 17` (ItemDisposition.js 53-54). That is arbitrary and it hides the price from the player. Frankendom should post one price per item and zone.
- Held stock has no timer of its own in this policy. When the floor cannot undercut or there is no room, the stock is held (`surplusGearDecision`, 42-51). When a store closes with stock, the donor deposits it in the warehouse and then runs NPC liquidation over the market-aware candidates (ColdMarketListingService.js 764-790; `marketAwareNpcCandidates` not read). So the close is the clock. Frankendom needs one explicit timer for held stock rather than one set by store closure.
- Fixed asks, no matching. Buyers and sellers post prices; the cheapest rival is the only competition signal (184). Frankendom's market rules (one engine) need the same: a posted ask, not an order book.
- The adena rate (`economyRate`, BotEconomyPricing.js 7) is the only inflation knob. It multiplies every base price, with a floor of 0.01. The donor does not show whether open listings re-price when the rate changes (not read). Frankendom would need that answer before it uses one multiplier.
- Donor is a bot simulation of players. Its AI sellers and buyers are the transferable part. The player-facing market rules (cell 2 covers the escrow lifecycle of a real server market) are a different layer.
- Licence: Apache-2.0 allows adaptation. This note copies no line; the sketch is written from the described rules.

- The classify decision tree (84-130) that the note did not cover: recipe active_demand and scarce_recipe (96-107), gear recent_buyer_activity (109-116, count = recentBuyers - competitiveUnits) and material_liquidity (117-130). Now summarised in section 1 step 2b; the sketch omits them.
- Shot exception in listingPrice (191-196): a finite cheap-shot remainder lists at the floor instead of being refused (now in section 1).
- One-shot speculative rule (158-161): an item with `speculativeFailedAt` set is sent to the warehouse as `speculative_already_tried` and never listed speculatively again.
- Licence: package.json says 'SEE LICENSE IN LICENSE' (the note says that field was not read; the licence text still needs reading before any reuse).

## Checker findings

- Verdict: MINOR
- Corrected:
  - Funded-demand cap: section 1 and the section 3 table presented it as the one listing rule; added step 2b listing the earlier branches (recipe, recent-buyer gear, material) that list without it.
  - Refusal at 187: documented the Other.Shot active_demand exception (191-196) and the no-competition result max(floor, preferred) (185).
  - NPC sink: corrected to say NPC-only and non-gear starter items go to NPC directly (58-63) and only ordinary gear at or under the surplus limit goes to NPC via surplusGearDecision, otherwise warehouse (47-50). Sketch unchanged (it already omits these gates).
- Missed (also added to section 6):
  - The classify decision tree (84-130) that the note did not cover: recipe active_demand and scarce_recipe (96-107), gear recent_buyer_activity (109-116, count = recentBuyers - competitiveUnits) and material_liquidity (117-130). Now summarised in section 1 step 2b; the sketch omits them.
  - Shot exception in listingPrice (191-196): a finite cheap-shot remainder lists at the floor instead of being refused (now in section 1).
  - One-shot speculative rule (158-161): an item with `speculativeFailedAt` set is sent to the warehouse as `speculative_already_tried` and never listed speculatively again.
  - Licence: package.json says 'SEE LICENSE IN LICENSE' (the note says that field was not read; the licence text still needs reading before any reuse).
