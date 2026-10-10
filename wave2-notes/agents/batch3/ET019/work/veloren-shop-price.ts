// Licence: GPL-3.0 (donor LICENSE file). Clean-room sketch of the described mechanism; not a translation.
type Good = string;
type Amounts = Record<Good, number>;

const MIN_PRICE = 0.1;   // price floor
const SMOOTH = 0.8;      // weight on last tick's value
const VALUE_LO = 0.001;  // values outside (LO, HI) count as "no market"
const VALUE_HI = 1000;

interface Site {
  stock: Amounts;
  nextDemand: Amounts;               // what local consumers keep back each tick
  supply: Amounts;                   // this tick's production
  demand: Amounts;                   // this tick's demand (consumers plus orders)
  value: Record<Good, number | undefined>;
}

// Scarcity value: 2 = balanced, 4 = starved, about 0.25 = plentiful.
function updateValues(site: Site): void {
  for (const g of Object.keys(site.stock)) {
    const surplus = site.supply[g] + site.stock[g] - site.demand[g];
    const raw = Math.pow(2, 1 - surplus / site.demand[g]);
    if (!(raw > VALUE_LO && raw < VALUE_HI)) { site.value[g] = undefined; continue; }
    const old = site.value[g];
    site.value[g] = old === undefined ? raw : SMOOTH * old + (1 - SMOOTH) * raw;
  }
}

function price(site: Site, g: Good): number {
  return Math.max(site.value[g] ?? 0, MIN_PRICE);
}

interface Offer {
  wants: Amounts;   // positive: goods the buyer wants from the site
  pays: Amounts;    // negative: goods the buyer offers in payment (stored as positive here)
}

// Settles one buyer's offer against the site. Wanted goods are scaled down when the site is short.
function settle(site: Site, offer: Offer, totalWanted: Amounts): { gave: Amounts; leftover: Amounts } {
  const gave: Amounts = {};
  const offered: Amounts = { ...offer.pays };
  for (const g of Object.keys(offer.wants)) {
    const spare = site.stock[g] - site.nextDemand[g];
    if (!(spare > 0)) continue;                          // nothing spare: not sold
    const ratio = (totalWanted[g] ?? 0) / spare;         // above 1 means the site is short
    const allocated = offer.wants[g] / Math.max(1, ratio);
    let balance = allocated * price(site, g);
    // pay with the offered goods the site values most first
    const payGoods = Object.keys(offered).sort((a, b) => price(site, b) - price(site, a));
    for (const p of payGoods) {
      if (balance <= 0) break;
      const take = Math.min(offered[p], balance / price(site, p));
      site.stock[p] = (site.stock[p] ?? 0) + take;
      offered[p] -= take;
      balance -= take * price(site, p);
    }
    const paid = Math.min(allocated - balance / price(site, g), site.stock[g]);
    site.stock[g] -= paid;
    gave[g] = (gave[g] ?? 0) + paid;
  }
  return { gave, leftover: offered };
}

export {};
