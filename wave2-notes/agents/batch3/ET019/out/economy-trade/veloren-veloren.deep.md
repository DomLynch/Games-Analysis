# veloren-veloren (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/veloren-veloren/world/src/site/economy/mod.rs` | Licence: GPL-3.0 (`/mnt/frankendom-donors/veloren-veloren/LICENSE`, "GNU GENERAL PUBLIC LICENSE" (line 1), "Version 3, 29 June 2007" (line 2); file headers not checked for "or later"; clean-room only) | Rust | symbol `Economy` (`tick`, `get_site_prices`, `trade_at_site`); driver `context.rs` `tick`

Checked: Read in full: `mod.rs` 1-146 (constants, structs, Economy fields), 146-346 (`get_site_prices` 323-346, the earlier helpers), 576-722 (`trade_at_site`), 793-935 (`tick`: demand, supply, surplus, values), 1100-1170 (labour values, decay, population, unconsumed stock), and `context.rs` 197-236 (the driver that calls `tick` and `trade_at_site`). Not read: `mod.rs` 352-575 (`plan_trade_for_site`; only its signature was read), 723-792 (`collect_deliveries`), 936-1099 (workforce, production and material costs), `map_types.rs`, and the decay table in `cache.rs` (lines 48-90 only skimmed). Callers: `tick` is called only from `context.rs` 211; `trade_at_site` only from `context.rs` 229; `get_site_prices` from `world/src/index.rs` 91-96 (grep only, not read) and two examples. Confidence: high on the price curve and the settlement; the stock double count and the coin statements are read from the code and were not run. Camera scope: not applicable.

## 1. Mechanism

This is a world-level economic simulation over sites, not a live market. The driver runs once per economic step (`context.rs` 197-236): deliveries from earlier trades are moved to their receivers (200-207); every site with economic simulation on is ticked in parallel (209-215); the orders each site made are gathered (218-222) and traded at the receiving site (224-231). Inside one site `tick` (793-1169), in order:

(a) Collect deliveries that arrived from the last step (796).
(b) Demand (807-819): for each labour, its order amounts times its workers (labour share times `pop`), plus the "everyone" orders times `pop`, plus `STARTING_COIN` for coin when inter-site trade is on (818; `INTER_SITE_TRADE` is true at line 27).
(c) Supply (828-839): starts as a copy of the stocks, then adds each labour's yield times its share times `pop`.
(d) Surplus (851-852): `surplus = supply + stock - demand` and `marginal_surplus = supply - demand`. Note that `supply` already contains the stock (828), so the surplus counts the stock twice (see section 6).
(e) Trade planning (862, not read) adds planned sales to supply (870) and planned purchases to demand (873).
(f) Value (886-910): for each good, `val = 2^(1 - surplus / demand)` (899). If `0.001 < val < 1000` the value becomes `0.8 * old + 0.2 * val` (901-905; the old value is `val` when there is none). Otherwise the value becomes "no market" (908). Coin uses stock minus demand (886) instead of surplus. The comment at 82-83 reads the value as 4.0 = starved, 2.0 = balanced, 0.1 = extra.
(g) Labour values (1106-1113): total labour value divided by total output, or none when output is 0.01 or less. The cost-per-unit step (1009-1091) was not read.
(h) Stock changes: decay each good by its decay rate (1116-1119); `replenish` lifts each natural resource to at least its yearly yield (1122; 272-278).
(i) Population (1125-1141): births at 0.05 a year while food surplus is above zero (1125, 1127-1132), deaths at 0.005 a year (1126), both scaled by `dt / DAYS_PER_YEAR` (1135), where the year is 360 days (`DAYS_PER_YEAR = 12.0 * DAYS_PER_MONTH` at 29, `DAYS_PER_MONTH = 30.0` at 28).
(j) Unconsumed stock (1159-1168): stock minus next step's demand, the amount free to trade.

Prices and settlement are separate from the tick:

- `get_site_prices` (323-346) normalises the values and the labour values across goods so each set sums to one, then gives each good `max(0.1, (labour share + value share) / 2)` (337-342). This is the price shown to callers.
- `trade_at_site` (576-720) is the settlement, and it uses the raw values, floored at 0.1 (615-620), not the normalised prices. It computes, per good, `order_stock_ratio = total wanted / (stock - next demand)` (606-613); a good with no spare is not sold (646). Each buyer's wanted amount for a good is divided by `max(1, ratio)` (647), which is proportional rationing when the site is short. Wanted goods are sold lowest value first (630), and the buyer pays with its offered goods highest value first (637, 649-659). The site's stock moves in both directions (652, 687). Leftover offered goods go back to the buyer (690-695). The delivery's supply estimate is `stock - next demand - orders + goods delivered`, floored at zero (702).

## 2. Key functions

- `tick`: `/mnt/frankendom-donors/veloren-veloren/world/src/site/economy/mod.rs` 793-1169 (demand, supply, surplus, values, stock changes, population, unconsumed stock). Read in full.
- Value update, inside `tick`: same file 886-910 (curve, smoothing, range check).
- `get_site_prices`: same file 323-346 (normalised shares, price floor).
- `trade_at_site`: same file 576-720 (ratio, rationing, payment, leftovers, delivery). Read in full.
- Driver: `/mnt/frankendom-donors/veloren-veloren/world/src/site/economy/context.rs` 197-236 (`tick`: deliveries, parallel site ticks, orders, settlement).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Scarcity value = 2^(1 - surplus/demand): balanced 2, starved 4, plentiful toward 0.1 | Base 2 and exponent 1 (899); balanced/starved/extra reading (82-83) |
| Smoothing: keep 0.8 of the old value, take 0.2 of the new per step | `smooth = 0.8` (900, 905) |
| Accepted value range; outside it the good has no market | `0.001 < val < 1000` (901) |
| Price floor | `MINIMUM_PRICE = 0.1` (161; used at 341, 618) |
| Coin demand each step | `STARTING_COIN = 1000.0` (162), added at 818 |
| Starting coin stock at each site | `STARTING_COIN` (121) |
| Population: birth 0.05 a year when food surplus is positive; death 0.005 a year | `NATURAL_BIRTH_RATE` (1125), `DEATH_RATE` (1126) |
| Year length | `DAYS_PER_YEAR = 12.0 * DAYS_PER_MONTH`, with `DAYS_PER_MONTH = 30.0` (28-29), so 360 days |
| Stock decay each step | Per-good `decay_rate` from item config (1116-1119; cache.rs 48-76; values not read) |
| Natural resource floor | Stock at least yearly yield (275) |

## 4. TypeScript sketch

simplified: the sketch counts stock once (the donor adds stock to supply at 828 and again at 851), so the surplus here is production plus stock minus demand. It leaves out: the coin special case (818, 886); the price sort of wanted goods (630), so the sketch fills wanted goods in input order; cross-site planning (862); delivery collection (796, 723-792); production and labour-value steps (829-839, 1009-1113); the silent `BUG` clamp at 674-685, which the sketch replaces with no clamp; and the decay and population steps. The sketch returns leftover offered goods instead of building a delivery.

```ts
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
```

## 5. Lands in

- TARGET `origins/server/economy/shop-price.ts` (new module; the path is proposed and was not checked against the repo). Shop buy and sell prices from stock and expected demand, plus proportional rationing when a vendor is short. Zone data holds the demand per good.
- Parity-checklist row 21 (catalogue fields): the closest row, and only a partial fit, because the derived price is a field read from the catalogue and the donor's mechanism has no row of its own. Row 18 (loot roll and XP award) does not cover price setting.
- Today: not checked; no current Frankendom shop file was read.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room only; the sketch was written from the described mechanism)
- Brief rule served: one-character/one-ledger rule (HANDOFF "also usable" list); rules 1-10 n/a

## 6. Gaps and risks

- One ledger: the settlement changes site stocks in place (652, 661, 687) and writes no rows. Frankendom must write one row per move, and the gold and item move must be one server write.
- The silent clamp: when a payment would take stock below zero, the donor logs "BUG" and clamps the payment (674-685) instead of refusing it. Frankendom must reject the overdraft, not clamp it.
- Stock counted twice: `supply` starts as the stocks (828) and the surplus adds them again (851), so the donor's surplus is production plus twice the stock, plus trade, minus demand. Read from the code, not run. Do not copy the double count; decide the surplus formula on purpose and test it.
- Buyer stock: `trade_at_site` takes the buyer's payment from the order's negative amounts (649-659) and does not check the buyer's inventory. Whether it was reduced when the order was placed is in `plan_trade_for_site` (352-575, not read). Frankendom must check the buyer's balance on the server at settlement.
- Inflation control: the donor has no explicit control. It has a per-step decay on every good (1116-1119), a coin demand equal to the starting coin (818), and no visible coin faucet in `mod.rs` (coin appears at 63, 121, 384, 818, 886, 890). Whether labour products include coin was not read. Frankendom needs an explicit gold sink and a faucet budget; decay is not a proof of inflation control.
- The donor's own comment says all goods in all cities have the same price (147-160). That is a donor gap, not a design. For us, price per shop is zone data.
- The smoothing factor 0.8 is per economic step, not per second. Frankendom must set it per server tick (row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- Two price notions: `get_site_prices` (normalised shares, 323-346) and `trade_at_site` (raw values, floored, 615-620). Frankendom must pick one price for a shop and say which one the player sees.

Best transferable idea: a shop's price rises when its stock falls below expected demand and eases back as stock refills (each step keeps 0.8 of the old value), and a short vendor splits what it has in proportion to what each buyer asked for.
Decision (proposed): adapt - the scarcity curve and proportional rationing are small and checkable and fit shop pricing; reject the two-phase world-level trade, the workforce allocation through values, and the normalised share prices, because Frankendom needs absolute prices in gold.
Acceptance: a vendor's price for a potion rises as players buy its stock out and eases back over the next few server ticks; when two players ask for more than the vendor has spare, each receives the same fraction of what they asked, and the gold and items move in one server write.

Reuse tag: rewrite-from-idea (GPL-3.0: clean-room only)
Brief rule served: one-character/one-ledger rule (HANDOFF "also usable" list); rules 1-10 n/a
