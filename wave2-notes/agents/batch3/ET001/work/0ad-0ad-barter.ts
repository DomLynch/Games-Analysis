// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Resource = "food" | "wood" | "stone" | "metal";
const RESOURCES: Resource[] = ["food", "wood", "stone", "metal"];

interface Market {
  index: Record<Resource, number>;  // price difference in points; one index per market, not per player
  restoring: boolean;               // true while any index is away from zero
}

interface Catalogue {
  truePrice: Record<Resource, number>;
}

interface Wallet {
  canTrade: boolean;
  balance: Record<Resource, number>;
  mult: { buy: Record<Resource, number>; sell: Record<Resource, number> };
}

const LOT = 100;            // a trade is one lot or a batch of five
const BATCH = 5;
const SPREAD = 10;          // buy price sits 10 points above true price, sell 10 below
const PER_LOT = 2;          // each lot moves the sold index down 2 and the bought index up 2
const RESTORE_STEP = 0.5;   // each restore tick moves an index 0.5 toward zero
const CAP = 99 - SPREAD;    // indexes are held within +-89

const clamp = (x: number): number => Math.min(CAP, Math.max(-CAP, x));

function buyPrice(m: Market, c: Catalogue, w: Wallet, r: Resource): number {
  return c.truePrice[r] * (LOT + SPREAD + m.index[r]) * w.mult.buy[r] / LOT;
}

function sellPrice(m: Market, c: Catalogue, w: Wallet, r: Resource): number {
  return c.truePrice[r] * (LOT - SPREAD + m.index[r]) * w.mult.sell[r] / LOT;
}

// Checks first, then the payment, then the payout from prices read before the index moves.
export function trade(m: Market, c: Catalogue, w: Wallet, from: Resource, to: Resource, amount: number): number | "refused" {
  if (amount !== LOT && amount !== BATCH * LOT) return "refused";
  if (!w.canTrade) return "refused";
  if (w.balance[from] < amount) return "refused";

  const payout = Math.round(sellPrice(m, c, w, from) / buyPrice(m, c, w, to) * amount);

  w.balance[from] -= amount;
  w.balance[to] += payout;

  const move = (PER_LOT * amount) / LOT;
  m.index[from] = clamp(m.index[from] - move);
  m.index[to] = clamp(m.index[to] + move);
  m.restoring = true;
  return payout;
}

// Runs on a timer while restoring. Each index moves back toward zero by at most RESTORE_STEP.
export function restoreTick(m: Market): void {
  let pending = false;
  for (const r of RESOURCES) {
    m.index[r] -= Math.min(RESTORE_STEP, Math.max(-RESTORE_STEP, m.index[r]));
    if (m.index[r] !== 0) pending = true;
  }
  m.restoring = pending;
}

export {};
