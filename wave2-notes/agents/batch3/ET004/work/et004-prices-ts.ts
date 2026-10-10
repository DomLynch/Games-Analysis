// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface PriceInput { value: number; houseMult: number; merchantPct: number; broken: boolean; }

// Merchant percent (100 = free, negative = surcharge). Grandmaster is free; no skill uses reputation alone.
function merchantPct(skillMult: number, skillLevel: number, grandmaster: boolean, reputation: number): number {
  if (grandmaster) return 100;
  const bonus = skillMult * skillLevel;
  if (bonus === 0) return -reputation;
  return Math.min(bonus - reputation + 7, 100);
}

// Buy: value times house multiplier, discounted by the merchant percent, truncated; never below the item value.
function buyPrice(p: PriceInput): number {
  const raw = p.value * p.houseMult;
  const discounted = Math.trunc((raw * (100 - p.merchantPct)) / 100);
  return Math.max(discounted, p.value);
}

// Sell: value over (multiplier + 2), plus value times merchant percent; clamped to 1..value; broken pays 1.
function sellPrice(p: PriceInput): number {
  let result = Math.trunc(p.value / (p.houseMult + 2) + (p.value * p.merchantPct) / 100);
  if (p.value > 0) result = Math.min(Math.max(result, 1), p.value);
  else result = 1;
  if (p.broken) result = 1;
  return result;
}

interface Party { gold: number; }

// Sell in donor order: price first, then take the item, then pay. The donor has no check on the take; this sketch adds one.
function sell(party: Party, takeItem: () => boolean, p: PriceInput): number {
  const price = sellPrice(p);
  if (!takeItem()) return 0;
  party.gold += price;
  return price;
}

// Buy in donor order: check gold, check space and add, then take the gold.
function buy(party: Party, grantItem: () => boolean, p: PriceInput): { ok: boolean; paid: number } {
  const price = buyPrice(p);
  if (party.gold < price) return { ok: false, paid: 0 };
  if (!grantItem()) return { ok: false, paid: 0 };
  party.gold -= price;
  return { ok: true, paid: price };
}
export {};
