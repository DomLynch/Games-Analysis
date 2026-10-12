// Licence: MIT (donor, 2004Scape-Server LICENSE). Adapted shape, rewritten for this sketch.
type StockRow = { itemId: string; baseline: number; restockTicks: number };
interface ShopParams { buyPerMille: number; sellPerMille: number; haggle: number; } // shop buy and sell multipliers, per-unit haggle

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Unit price. stock and baseline are counts. Result is whole gp.
// minValue: donor uses 1 for shop buy; the sell side has no floor in the donor (fix: floor at 1).
function unitPrice(baseCost: number, perMille: number, haggle: number,
                   stock: number, baseline: number, minValue: number): number {
  const deviation = clamp((stock - baseline) * haggle, -5000, 1000);
  const mult = Math.max(100, perMille - deviation);      // per mille, floor 10 percent
  const value = Math.trunc((mult * baseCost) / 1000);
  return Math.max(minValue, value);
}

// Player buys from the shop: the shop's sell multiplier applies.
function buyPrice(p: ShopParams, baseCost: number, stock: number, baseline: number): number {
  return unitPrice(baseCost, p.sellPerMille, p.haggle, stock, baseline, 1);
}

// Player sells to the shop: the shop's buy multiplier applies.
function sellPrice(p: ShopParams, baseCost: number, stock: number, baseline: number): number {
  return unitPrice(baseCost, p.buyPerMille, p.haggle, stock, baseline, 1);
}

// One world tick. Restock is keyed by item id (fix: the donor indexes by slot).
// stockRate 0 is rejected at load (fix: the donor's modulo by zero never restocks).
function restockStep(tick: number, row: StockRow, stock: number): number {
  if (row.restockTicks < 1) throw new Error("restockTicks must be at least 1");
  if (tick % row.restockTicks !== 0) return stock;
  if (stock < row.baseline) return stock + 1;
  if (stock > row.baseline) return stock - 1;
  return stock;
}

// Unlisted items in a general store lose one unit every decayTicks (donor: 100).
function decayStep(tick: number, decayTicks: number, stock: number): number {
  return tick % decayTicks === 0 && stock > 0 ? stock - 1 : stock;
}

export {}
