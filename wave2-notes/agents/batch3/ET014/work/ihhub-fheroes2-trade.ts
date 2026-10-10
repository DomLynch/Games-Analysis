// Licence: donor per-file header is GPL-2.0-or-later. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Res = "wood" | "ore" | "mercury" | "sulfur" | "crystal" | "gems" | "gold";
type Cls = "common" | "rare" | "gold";
type Ledger = Record<Res, number>;

const MAX_TIERS = 9;

// Rate rows by category pair. Each row has one entry per marketplace tier (1 to 9).
// For a trade to gold the value is gold per one unit of the source; otherwise it is units of the source per one unit of the target.
const RATE_ROWS: Record<string, readonly number[]> = {
  "common>common": [10, 7, 5, 4, 4, 3, 3, 3, 2],
  "rare>rare": [10, 7, 5, 4, 4, 3, 3, 3, 2],
  "common>rare": [20, 14, 10, 8, 7, 6, 5, 5, 4],
  "rare>common": [5, 4, 3, 2, 2, 2, 2, 2, 1],
  "common>gold": [25, 37, 50, 62, 74, 87, 100, 112, 124],
  "rare>gold": [50, 74, 100, 124, 149, 175, 200, 224, 249],
  "gold>common": [2500, 1667, 1250, 1000, 834, 715, 625, 556, 500],
  "gold>rare": [5000, 3334, 2500, 2000, 1667, 1429, 1250, 1112, 1000],
};

function categoryOf(r: Res): Cls {
  if (r === "gold") return "gold";
  if (r === "wood" || r === "ore") return "common";
  return "rare";
}

// Rate for a pair at a given count of marketplaces. Zero when no trade is possible.
function tradeRate(marketplaces: number, from: Res, to: Res): number {
  if (from === to || marketplaces === 0) return 0;
  const row = RATE_ROWS[`${categoryOf(from)}>${categoryOf(to)}`];
  const tier = Math.min(marketplaces, MAX_TIERS) - 1;
  return row[tier];
}

// Largest number of steps the source funds allow. One step gives 1 source unit (to gold) or `rate` source units (to a resource).
function maxSteps(fromFunds: number, rate: number, toGold: boolean): number {
  if (rate === 0) return 0;
  return toGold ? fromFunds : Math.floor(fromFunds / rate);
}

function stepsToAmounts(steps: number, rate: number, toGold: boolean): { give: number; get: number } {
  return toGold ? { give: steps, get: steps * rate } : { give: steps * rate, get: steps };
}

// Commit on the server. Refuses when the source is short; the donor subtracts and clamps to zero instead.
function settleTrade(ledger: Ledger, from: Res, to: Res, give: number, get: number): boolean {
  if (give <= 0 || get <= 0) return false;
  if (ledger[from] < give) return false;
  ledger[from] -= give;
  ledger[to] += get;
  return true;
}
