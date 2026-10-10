// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.

// One ledger: all coin is a single copper count.
interface Wallet { copper: number; }

interface Bag { freeSlots: number; }

interface MerchantRules {
  usePriceMod: boolean;   // default true
  sellCostMod: number;    // 1.05 default, applied to the vendor's sell price
  chaBonusMod: number;    // 3.45 default
  chaBonusPct: number;    // 4 default (max bonus, percent)
  chaPenaltyMod: number;  // 1.52 default
  chaPenaltyPct: number;  // 4 default (max penalty, percent)
}

interface StockLine {
  slot: number;
  baseCopper: number;     // item price x sell rate, already in copper
  stackable: boolean;
  stackSize: number;
  minLevel: number;
}

// Percent adjustment from charisma. Pivot 103 for factions 6+ (apprehensive or worse), 75 for factions 1-5.
function chaPercent(cha: number, factionLevel: number, r: MerchantRules): number {
  const pivot = factionLevel >= 6 ? 103 : 75;
  let pct = 0;
  if (cha > pivot) pct = (cha - pivot) * -(r.chaBonusMod / 100) * r.chaBonusPct;
  else if (cha < pivot) pct = (pivot - cha) * (r.chaPenaltyMod / 100) * r.chaPenaltyPct;
  return Math.min(Math.max(pct, -r.chaBonusPct), r.chaPenaltyPct);
}

// Unit buy price in copper. Each multiply truncates to an integer, as the donor's int price does.
function unitBuyCopper(line: StockLine, cha: number, factionLevel: number, r: MerchantRules): number {
  let unit = Math.trunc(line.baseCopper);
  unit = Math.trunc(unit * r.sellCostMod);
  if (r.usePriceMod) {
    const mult = 1 + chaPercent(cha, factionLevel, r) / 100;
    unit = Math.trunc(unit * mult);
  }
  return unit;
}

type BuyResult =
  | { ok: true; granted: number; charged: number }
  | { ok: false; reason: "unknown-slot" | "bad-quantity" | "no-slot" | "not-enough-coin" };

function handleBuy(
  stock: StockLine[], slot: number, requested: number, playerLevel: number,
  cha: number, factionLevel: number, r: MerchantRules, wallet: Wallet, bag: Bag,
): BuyResult {
  // The server finds the line by slot; the client never sends a price or an item id.
  const line = stock.find(s => s.slot === slot && playerLevel >= s.minLevel);
  if (!line) return { ok: false, reason: "unknown-slot" };
  if (requested < 1) return { ok: false, reason: "bad-quantity" };

  // Stackables clamp to the stack size. Non-stackables are one item per purchase (sketch change: the donor charges the requested quantity).
  const qty = line.stackable ? Math.min(requested, line.stackSize) : 1;
  const total = unitBuyCopper(line, cha, factionLevel, r) * qty;

  // Room is checked BEFORE the charge (sketch change: the donor charges first and does not refund).
  if (bag.freeSlots < 1) return { ok: false, reason: "no-slot" };
  if (wallet.copper < total) return { ok: false, reason: "not-enough-coin" };

  wallet.copper -= total;
  bag.freeSlots -= 1;
  return { ok: true, granted: qty, charged: total };
}
