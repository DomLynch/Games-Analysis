# ValveSoftware-source-sdk-2013 (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/shared/econ/econ_store.cpp` (`GetCurrentPrice` 293-308, `IsOnSale` 217-221, `GetDiscountedPrice` 774-831, `CalculateSalePrice` 840-883), with `shared/econ/econ_store.h` 533-540, `client/econ/store/store_panel.cpp` 1802-1832, `client/tf/vgui/store/v2/tf_store_preview_item2.cpp` 972-985, `client/econ/client_community_market.cpp` 14-106 | Licence: Valve Source 1 SDK licence (`LICENSE` lines 3-5; restricted, so clean-room, shape only; no line-by-line translation) | C++ | symbol `econ_store_entry_t::GetCurrentPrice`

Checked: The hint file (`client/econ/econ_trading.cpp`) is the trade-request handshake with the Game Coordinator and the Steam overlay; the trade itself is not in the donor and it has no price rule. I read it in full and set it aside; its request gate is noted under Gaps. The price rules are in `shared/econ/econ_store.cpp`. Read in full: `GetCurrentPrice`, `IsOnSale`, `GetDiscountedPrice`, `CalculateSalePrice`, `InitCategoryTags`, `IsRentable`, `client_community_market.cpp` (all 106 lines), and `CStoreCart` line pricing (`store_panel.cpp` 1802-1832). Read in part: `HasDiscount` (client bundle check, 230-278, read in full), the price-sheet loader (470-505, sale and rental keys), `BInitializeStoreEntryPricePoints` (608-642, sale branch only), the rounding table (788-808, read in part). Candidates opened (at least three): `econ_trading.cpp` (full), `shared/econ/econ_dynamic_recipe.cpp` (full; a recipe-slot matcher, see Gaps), `econ_store.h` (528-545), `client_community_market.cpp` (full), `store_panel.cpp` (1800-1832), `tf_store_preview_item2.cpp` (972-985). Not read: where the price sheet KeyValues come from (GC or file), the caller that supplies `nSalePercent`, the bundle's `IsBundle` definition, the purchase path after the cart total, the GC side of the market. Build flags: `ENABLE_STORE_RENTAL_BACKEND` is tested in several files (`econ_store.cpp` 495, `tf_store_preview_item2.cpp` 373, 734, 739 and 974, `econ_item_constants.cpp`) but is never defined under `src/` (grep -rn; build files not searched), so the rental KeyValues load is compiled out in this tree. Confidence: high on the sale, bundle and rounding rules; high on the cart and detail-view rental conflict as written; the conflict is latent in this tree (see Gaps). Scope: economy, not camera. Camera scope: not applicable.

Best transferable idea: Show a discount only when the price really is lower: a sale must be positive and below base, and a bundle shows a discount only when it costs less than its parts, with the struck-out base set to the sum of the parts.
Decision (proposed): adapt — take the two discount-truth rules and the round-to-granularity rule (never to zero) for shop prices; take the timed refresh of market data as stale-while-revalidate, but make the server the owner; reject the client-side market lowest price as a value anyone can display as truth, and reject a rental number that has no unit name, because the donor reads the same number two ways.
Acceptance: A bundle priced 900 with parts summing to 1000 shows a strike-through base of 1000 and a discount; a bundle priced 1000 shows no strike-through; a 1% sale on a 100-gold item that rounds back to 100 shows no sale; a rental line reads the same charge in the detail view and in the cart (test asserts charge = price x share, one unit name).

## 1. Mechanism

Price a buyer sees for one item (`GetCurrentPrice`, 293-308), in the order the code runs:
- (a) Market item: take the lowest live listing from the client market cache (296, 302). If the cache has no row for this item, the price is 0 (298-300).
- (b) Otherwise, if the item is on sale, the sale price (305-306). On sale means the sale price is above 0 and strictly below base (217-221).
- (c) Otherwise the base price (307).

Bundle discount (`HasDiscount`, client only, 230-278): sum the current prices of the parts (252-262). The bundle shows a discount only when its own current price is strictly below that sum (265-266). The struck-out base shown is the sum (270). Otherwise no discount is shown (276-277). A single item on sale always reports a discount (233-239).

Sale price (`BInitializeStoreEntryPricePoints` 634-637, `CalculateSalePrice` 840-883, `GetDiscountedPrice` 774-831):
- (a) A sale percent is applied only when it is strictly between 0 and 100 (634). The sale price is computed from the base (636).
- (b) Zero base stays zero (780-781).
- (c) The kept share is clamp(100 - discount, 0, 100) percent (783). The result is truncated to an integer by the cast to the integer price type.
- (d) Rounding to a currency granularity (788-824): granularity is 1 for most currencies, 100 for several, 1000 for KRW, 50000 for VND, 500 for CRC (table 788-808, read in part). With granularity above 1: let r = value mod granularity. If r >= granularity/2, or the value is below one granularity, round up (value += granularity - r). Otherwise round down (value -= r) (815-824). The result is never zero, so the sanity assert (827) says it is a multiple of the granularity and above 0.
- (e) For non-USD currencies the stored sale percent is recomputed from the rounded sale price (872-876). For USD it is the sheet percent.

Rental scale (per category, 131-179; 223-227; `GetRentalPriceScale` 533-540):
- (a) Each category tag gives a scale from the price sheet; the default for a missing category is 100 (533-537).
- (b) An entry takes the largest scale across its tags (159-170). A scale at or below 0, or at or above 100, becomes 100 (173-175).
- (c) An entry is rentable only when its scale is strictly between 0 and 100 (225-226).
- (d) The detail view, when the rental backend macro is defined, shows the rental charge as scale x 0.01 of the total price (979-980).
- (e) The cart passes the rental scale to the same sale-percent function as a discount percent (1804-1807, 1813-1815). The charge in the cart is therefore price x (100 - scale) percent. Scale 25 reads as "pay 25%" in the detail view and as "pay 75%" in the cart. Both readings use the same number. The conflict is latent: the macro is never defined under `src/`, so the scale stays at 100 and nothing is rentable in this tree.

Cart total (`store_panel.cpp` 1818-1829): each line uses the current price (1811), applies a cart-type discount only when it is strictly between 0 and 100 (1813-1816) (try-out upgrades use the price sheet's preview-period discount, 1804-1805), multiplies by the quantity (1818), and the total sums the lines (1829).

Market cache (`client_community_market.cpp` 14-103):
- (a) The data is refreshed when it is 15 minutes old (14; 44-46). A read does not wait: "We'll still use whatever data if any we have for this call" (40-43).
- (b) No rows at all returns no data (51-52); a row is looked up by definition index, after a remap, and quality (55-62).
- (c) A response replaces the whole map (85-86) and stores the lowest price and the listings count per row (97-100).

## 2. Key functions

- `econ_store_entry_t::GetCurrentPrice`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/shared/econ/econ_store.cpp` 293-308.
- `econ_store_entry_t::IsOnSale`: same file, 217-221.
- `econ_store_entry_t::HasDiscount` (client, bundle): same file, 230-278.
- `econ_store_entry_t::GetDiscountedPrice`: same file, 774-831.
- `econ_store_entry_t::CalculateSalePrice`: same file, 840-883.
- `InitCategoryTags` (rental scale from tags): same file, 131-179.
- `CStoreCart` line and total: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/econ/store/store_panel.cpp` 1802-1832.
- `GetClientMarketData` and the response job: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/econ/client_community_market.cpp` 38-103.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A discount is shown only if the price is truly lower: sale strictly between 0 and base | Sale test (`econ_store.cpp` 219-220) |
| A bundle shows a discount only if below the sum of its parts; the struck base is the sum | Sum of current part prices (260), comparison (266), display base (270) |
| Discount on integer price: keep clamp(100 - d) percent, floor, then round to a granularity; never to zero | Keep-share clamp 0..100 (783); granularity per currency (788-808); half rule (815) |
| Rental charge as a share of price, clamped to "not rentable" outside 0..100 | Default 100 (`econ_store.h` 537); clamp (173-175); rentable test (225-226) |
| Lowest live listing is a price, with a 15-minute refresh | `s_fUpdateTimeInSeconds = 60.0f * 15.0f` (14) |
| Preview-period discount for try-out upgrades | `preview_period_discount` from the price sheet (493) |

Worked by hand from the formulas (not run):
- Sale 15% on 1234 with granularity 100: floor(1234 x 0.85) = 1048; remainder 48 is below 50, so round down to 1000.
- Sale 1% on 100 with granularity 100: 99; remainder 99 is at least 50, so round up to 100. The sale price equals the base, so `IsOnSale` is false (219-220): the sale disappears.
- Bundle with parts 300 + 400 + 500 = 1200: a bundle at 1000 shows a discount with base 1200; a bundle at 1200 shows none.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for one entry (market branch, then sale test, then base) and the rounding order (floor, round to granularity, never zero). It omits: the currency table and the USD, NXP and RMB branch; the sale-percent recompute for non-USD; the preview and bonus discount periods; the price-sheet loader; the asserts; the GC and the market remap by definition index; the request-in-flight guard, which the sketch replaces with a plain callback. The sketch takes the rental share as a plain number and fixes one meaning (the price share), which the donor does not do in its cart; that is a Frankendom choice. The rental rule is shown as a proposal, because the donor's rental path is latent in this tree.

```ts
// Licence: Valve Source 1 SDK licence (restricted). Clean-room: shape only, written from the described mechanism.
type Minor = number; // integer minor units, like the donor's item_price_t

interface StoreEntry {
  base: Minor;
  sale: Minor | null;        // null when the price sheet has no sale price for this currency
  isMarket: boolean;         // market items show the lowest live listing instead of a sheet price
  marketLowest: Minor | null; // null when the market cache has no row for this item
  rentalPct: number;         // rental scale from the category tags; 100 = not rentable
}

// Sale only counts when it is positive and strictly below base.
function isOnSale(e: StoreEntry): boolean {
  return e.sale !== null && e.sale > 0 && e.sale < e.base;
}

// Price a buyer sees for the item itself. A market item with no cached row shows 0.
function currentPrice(e: StoreEntry): Minor {
  if (e.isMarket) return e.marketLowest ?? 0;
  return isOnSale(e) && e.sale !== null ? e.sale : e.base;
}

// Discounted price: floor to an integer, then round to a currency granularity, never to zero.
function discounted(base: Minor, discountPct: number, granularity: number): Minor {
  if (base === 0) return 0;
  const pct = Math.min(100, Math.max(0, 100 - discountPct)); // clamp the kept share to 0..100
  let v = Math.floor((base * pct) / 100);
  if (granularity > 1) {
    const rem = v % granularity;
    if (rem >= granularity / 2 || v < granularity) v += granularity - rem; // round up
    else v -= rem;                                                          // round down
  }
  return v;
}

// A bundle only shows a discount when its own price is below the sum of its parts.
function bundleDiscount(bundleCurrent: Minor, partsCurrent: Minor[]): { discounted: boolean; displayBase: Minor } {
  const sum = partsCurrent.reduce((a, b) => a + b, 0);
  return bundleCurrent < sum
    ? { discounted: true, displayBase: sum }
    : { discounted: false, displayBase: bundleCurrent };
}

// Rental scale: the largest scale among the item's category tags. Missing or out-of-range means not rentable.
function rentalScale(categoryScales: Array<number | undefined>): number {
  let max = 0;
  for (const s of categoryScales) if (s !== undefined && s > max) max = s;
  return max <= 0 || max >= 100 ? 100 : max;
}
function isRentable(scale: number): boolean {
  return scale > 0 && scale < 100;
}

// Rental charge, read as a share of the price (scale 25 = pay 25% of the price).
// The donor's cart applies the same number as a discount percent instead (see note); this sketch fixes one meaning.
function rentalCharge(price: Minor, scale: number): Minor {
  return Math.floor((price * scale) / 100);
}

// Market cache: rows are replaced as a whole on each response; a read after the TTL asks for a refresh and
// still answers from the old rows (stale-while-revalidate).
class MarketCache {
  private rows = new Map<string, { lowest: Minor; quantity: number }>();
  private lastRefreshMs = Number.NEGATIVE_INFINITY;
  constructor(private ttlMs: number, private requestRefresh: () => void) {}

  get(key: string, nowMs: number): { lowest: Minor; quantity: number } | undefined {
    if (nowMs - this.lastRefreshMs >= this.ttlMs) {
      this.lastRefreshMs = nowMs;
      this.requestRefresh();
    }
    return this.rows.get(key);
  }

  replaceAll(entries: Array<[string, { lowest: Minor; quantity: number }]>): void {
    this.rows = new Map(entries);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/valve-store-prices.ts`) passed with no output (run in this session).

## 5. Lands in

- TARGET `origins/economy/prices.ts` (new; the same module as the Barony note; no `src/fight` module owns shop pricing).
- Parity-checklist row 21 (catalogue fields). Store entries are catalogue fields (price points, category tags, sale percent, rental scale); the rules above read them. No row 1-23 covers shop pricing or the market feed; row 21 is the closest fit, and a partial one.
- Reuse tag: rewrite-from-idea (Valve SDK licence, restricted; clean-room shape only)
- Brief rule served: one ledger (the displayed price and the charged price come from one function); server-verified (the market price is owned by the server, not the client cache)

## 6. Gaps and risks

- Discount truth: the donor's rules (sale strictly below base; bundle below the sum of parts) are the strongest part. Adopt them for Frankendom shops.
- Rounding erases a sale. A small sale rounds back to base and then the sale turns off (inferred from 219-220 and 815-824; the worked example above; not run).
- The rental number has two meanings in one donor. Detail view: charge = scale%. Cart: discount = scale%, so charge = (100 - scale)%. The code is latent here because `ENABLE_STORE_RENTAL_BACKEND` is never defined under `src/`. Frankendom must name the unit in the data field (charge share), and test that the detail and cart agree.
- Market price shows 0 when the cache has no row (298-300; 51-52). A market item with an empty cache displays as free. Frankendom must show "no price yet", not 0.
- Market data is a client cache with a 15-minute TTL (14). The client never shows a stale price as fresh. The donor does not show the age. Frankendom: the server returns the price and its age, and the client shows the age.
- The response replaces the whole map (85), so one partial response clears every row. Frankendom: merge by key, with a version.
- Price sheet origin and the sale percent source are not read. Frankendom's price data should be zone or shop data, with a version and a check at load.
- The bundle check is client-only (`HasDiscount` is inside `#ifdef CLIENT_DLL`, 229 and 279). The server must apply the same rule before it charges; the donor's server side is not read.
- Trade (`client/econ/econ_trading.cpp`, the hint file): a request gate with a 30-second lifetime (`kTradeRequestLifetime`, `econ_trading.cpp` 88), auto-decline for blocked or ignored users, a four-level visibility setting, and a reason code per response. Not a price rule and not a trade ledger; the trade runs on the Game Coordinator. Possible use for Frankendom's invite flow, not for pricing. Not written up as a note.
- Crafting (`shared/econ/econ_dynamic_recipe.cpp`): a recipe is a set of slots, each with a required count, a fulfilled count, and optional definition, quality and attribute filters; a slot stops matching once fulfilled equals required (137-141), and non-craftable items are skipped. The completion and consumption logic is not in this file (not read). A possible shape for a crafting cost table, not a price.
- Licence: restricted. Clean-room only; the sketch is written from the described mechanism and contains no donor text.
