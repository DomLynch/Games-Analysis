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
