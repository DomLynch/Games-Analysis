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
