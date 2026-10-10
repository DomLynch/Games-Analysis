// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = "building" | "unit";

interface BuyQuote {
  kind: Kind;
  buildCost: number;    // full shield cost of the current item (after the percent modifiers)
  stock: number;        // shields already in the city
  buyPctBonus: number;  // extra percent on the price (data: e.g. +100 for a great wonder)
  isConvert: boolean;   // coinage-like item: never buyable
}

// Price in gold for the missing shields. Pure: the same inputs always give the same price.
function buyPriceGold(q: BuyQuote): number {
  if (q.isConvert) return 0;
  const missing = q.buildCost - q.stock;
  let cost = 0;
  if (missing > 0) {
    cost = q.kind === "building"
      ? 2 * missing
      : 2 * missing + Math.floor((missing * missing) / 20); // units rise faster than linear
  }
  if (q.stock === 0) cost *= 2;                     // nothing in stock: double price
  return Math.floor((cost * (100 + q.buyPctBonus)) / 100);
}

interface CityState {
  turnFounded: number;
  turn: number;
  didBuy: boolean;      // at most one purchase per city per turn
  inDisorder: boolean;
  kind: Kind;
  isConvert: boolean;
  buildCost: number;
  stock: number;
  buyPctBonus: number;
}

interface PlayerLedger { gold: number; }

type BuyOutcome = { ok: true; paid: number } | { ok: false; reason: string };

// Server-side purchase. The price is recomputed here from server state; the client's number is only a display.
function handleBuy(p: PlayerLedger, c: CityState): BuyOutcome {
  if (c.turnFounded === c.turn) return { ok: false, reason: "founded this turn" };
  if (c.didBuy) return { ok: false, reason: "already bought this turn" };
  if (c.isConvert) return { ok: false, reason: "not buyable" };
  if (c.kind === "unit" && c.inDisorder) return { ok: false, reason: "disorder" };

  const cost = buyPriceGold({
    kind: c.kind, buildCost: c.buildCost, stock: c.stock,
    buyPctBonus: c.buyPctBonus, isConvert: c.isConvert,
  });
  if (cost <= 0) return { ok: false, reason: "nothing to buy" };
  if (cost > p.gold) return { ok: false, reason: "not enough gold" };

  p.gold -= cost;                                   // debit before the item is completed
  if (c.stock < c.buildCost) {
    c.stock = c.buildCost;                          // complete the item this turn
    c.didBuy = true;
  }
  return { ok: true, paid: cost };
}

export {};
