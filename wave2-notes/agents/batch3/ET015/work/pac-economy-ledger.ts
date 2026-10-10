// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Stars = 1 | 2 | 3;

export interface UnitPrice {
  rarityCost: number;   // base price per rarity tier (data)
  stars: Stars;
  duo: boolean;         // paired unit: half price, half pool return
}

// Sell refund. Donor order: duo test first, then 1-star base, then x3 per star up, x0.75, rounded up.
export function sellRefund(u: UnitPrice): number {
  if (u.duo) return Math.ceil((u.rarityCost * u.stars) / 2);
  if (u.stars === 1) return u.rarityCost;
  return Math.ceil(u.rarityCost * Math.pow(3, u.stars - 1) * 0.75);
}

// Copies returned to the shop pool on sell: 1 / 3 / 9 by stars; a duo returns ceil(half).
export function poolReturn(stars: Stars, duo: boolean): number {
  const n = stars >= 3 ? 9 : stars === 2 ? 3 : 1;
  return duo ? Math.ceil(n / 2) : n;
}

export interface RoundIncomeInput {
  gold: number;
  streak: number;
  isPve: boolean;
  alive: boolean;
  isBot: boolean;
  bloodMoney: boolean;   // rule that switches interest off
  gimmighoulCoins: number;
  amuletCoins: number;
  redScales: number;
}

// Round income at the end of a fight. Interest is gold/10 floored, capped at maxInterest.
// The donor's max(x)(v) is Math.min(x, v), so the caps are real caps.
export function roundIncome(i: RoundIncomeInput): number {
  if (!i.alive || i.isBot) return 0;
  const maxInterest = 5 + i.gimmighoulCoins - i.amuletCoins;
  let income = 0;
  if (!i.bloodMoney) income += Math.min(maxInterest, Math.floor(i.gold / 10));
  if (!i.isPve) income += Math.min(5, i.streak);
  income += 5;
  income += i.redScales * 5;
  return income;
}

// Ledger: one gold number per player. Every debit or credit goes through these methods.
export class Ledger {
  gold: number;
  readonly pool: Map<string, number> = new Map();

  constructor(startGold: number) {
    this.gold = startGold;
  }

  // A shop draw takes one copy out of the pool.
  drawFromPool(unit: string): void {
    this.pool.set(unit, (this.pool.get(unit) ?? 0) - 1);
  }

  // Buy: affordability and bench space are checked, then gold is debited. The pool was already drawn.
  tryBuy(cost: number, hasBenchSpace: boolean): boolean {
    if (this.gold < cost || !hasBenchSpace) return false;
    this.gold -= cost;
    return true;
  }

  // Sell: the unit leaves the board, copies go back to the pool, gold is credited.
  sell(unit: string, u: UnitPrice): number {
    this.pool.set(unit, (this.pool.get(unit) ?? 0) + poolReturn(u.stars, u.duo));
    const refund = sellRefund(u);
    this.gold += refund;
    return refund;
  }

  // Reroll: cost 1, or free while free rolls remain. The shop's picks go back to the pool first.
  tryReroll(freeRolls: number): boolean {
    const cost = freeRolls > 0 ? 0 : 1;
    if (this.gold < cost) return false;
    this.gold -= cost;
    return true;
  }
}
export {};
