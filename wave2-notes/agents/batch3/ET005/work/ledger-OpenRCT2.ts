// Licence: GPL-3.0 (donor, OpenRCT2). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Reason = 'shopSales' | 'shopStock' | 'lootSale' | 'craftFee' | 'auctionFee' | 'upkeep' | 'wages' | 'interest';

// Which reasons count toward the day's total (the donor's per-type flag table).
const COUNTS_TOWARD_DAY: Record<Reason, boolean> = {
  shopSales: true, shopStock: true, lootSale: true, craftFee: true, auctionFee: true,
  upkeep: false, wages: false, interest: false,
};

const PERIOD_COUNT = 16;   // rolling periods kept
const COIN_LIMIT = Number.MAX_SAFE_INTEGER;

type Period = Record<Reason, number>;
const emptyPeriod = (): Period => ({
  shopSales: 0, shopStock: 0, lootSale: 0, craftFee: 0, auctionFee: 0, upkeep: 0, wages: 0, interest: 0,
});

interface Flags { preview?: boolean; noSpend?: boolean; }

class Ledger {
  coins: number;
  historical = 0;
  dayTotal = 0;
  private periods: Period[] = [emptyPeriod()];

  constructor(coins: number) { this.coins = coins; }

  // Same rule for a preview and for the real run. Preview, no-spend and zero cost always pass.
  canAfford(cost: number, flags: Flags): boolean {
    if (flags.preview || flags.noSpend || cost <= 0) return true;
    return cost <= this.coins;
  }

  // The one function that moves coins. amount > 0 spends; amount < 0 earns.
  pay(amount: number, reason: Reason): void {
    this.coins = Math.max(-COIN_LIMIT, Math.min(COIN_LIMIT, this.coins - amount));
    this.periods[0][reason] -= amount;
    if (COUNTS_TOWARD_DAY[reason]) this.dayTotal -= amount;
  }

  // Day close: the projection is 7 x the day's counted total, then the day resets.
  closeDay(): number {
    const projected = 7 * this.dayTotal;
    this.dayTotal = 0;
    return projected;
  }

  // Period roll: when the table is full, fold the oldest period into the historical total, then add a new one.
  rollPeriod(): void {
    if (this.periods.length >= PERIOD_COUNT) {
      const oldest = this.periods.pop() as Period;
      this.historical += Object.values(oldest).reduce((a, b) => a + b, 0);
    }
    this.periods.unshift(emptyPeriod());
  }
}

interface Action {
  cost: number;
  reason: Reason;
  apply: () => void;   // the game change itself
}

type Outcome = 'ok' | 'insufficientFunds';

// Check, change, settle: the order the donor uses for one top-level action.
function runAction(ledger: Ledger, action: Action, flags: Flags): Outcome {
  if (!ledger.canAfford(action.cost, flags)) return 'insufficientFunds';
  action.apply();
  if (!flags.preview && !flags.noSpend && action.cost !== 0) ledger.pay(action.cost, action.reason);
  return 'ok';
}

export {};
