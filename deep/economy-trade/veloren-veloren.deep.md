# veloren-veloren (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/veloren-veloren/world/src/site/economy/mod.rs | Licence: GPL-3 | Rust | symbol Economy.plan_trade_for_site / trade_at_site
Symbol check: plan_trade_for_site (352) and trade_at_site (576) confirmed. Callers: mod.rs 862 (plan) and site/economy/context.rs 229 (trade_at_site, inside the world tick).

## 1. Mechanism
- An inter-site trade model in the world simulation, not a player market. Each site (a town) holds stocks, supply, demand, prices (values) and neighbour data (last known prices and supplies). Trade is planned by sites and settled by the world tick.
- Two steps. Step 1, plan_trade_for_site, per site: list goods in deficit (missing_goods, sorted by value, highest first) and goods in surplus (extra_goods, plus coin). For each neighbour, rank the surplus goods it values most. For each missing good, buy from the cheapest neighbour that has supply, up to the amount still missing. Pay with surplus goods, limited by a separate carry budget; if the payment falls short, the buy amount is cut to what the payment covers. Push the planned order (capped at 100) onto the neighbour's order list and return per-good net change, with the transport slot set to capacity used plus the larger of the two missing-capacity totals.
- Two carry budgets: collect (going out) and dispatch (coming back), each drawn down by transport effort per good. Anything over capacity is recorded as missing transport, not traded.
- Step 2, trade_at_site, on the seller's tick: first compute the stock the site must keep (next_demand from labour and per-head orders) and a per-good ratio of total ordered to spare stock. For each arriving order, list the goods the customer wants (positive amounts) sorted by local value, lowest first, and the goods the customer brings as payment (negative amounts) sorted highest value first. Each wanted good is allocated amount divided by max(1, ratio), valued at local price, and paid down with the brought goods in that order; any brought goods not used are shipped back. Stock is reduced by what was paid for (clamped to stock). Each delivery records the seller's prices, a supply figure (spare stock plus the delivered amount) and the delivered amounts.
- Ordering in the world tick (context.rs tick, all of it gated on INTER_SITE_TRADE except the economy tick): last tick's deliveries are moved to the recipient sites first, then the per-site economy tick runs (in parallel across sites), then each site's new orders are moved to the target site's order list, then trade_at_site runs for each site with orders.
- Inputs: stocks, values, neighbours and transport capacity. Outputs: orders, deliveries and stock changes. Runs on the world tick, not per player action.

## 2. Key functions
- Economy::plan_trade_for_site (veloren) | /mnt/frankendom-donors/veloren-veloren/world/src/site/economy/mod.rs | 352-573 | step 1: deficit and surplus lists, neighbour price ranking, carry-budget-limited buy plan, order record.
- Economy::trade_at_site (veloren) | /mnt/frankendom-donors/veloren-veloren/world/src/site/economy/mod.rs | 576-720 | step 2: settle arriving orders, sell-high buy-high ordering, stock and delivery records.
- world tick block (veloren, not a function) | /mnt/frankendom-donors/veloren-veloren/world/src/site/economy/context.rs | 197-231 | fn tick: move deliveries, site economy tick, distribute orders, trade_at_site per site.
- transportation_effort (veloren) | /mnt/frankendom-donors/veloren-veloren/world/src/site/economy/mod.rs | 1386 | per-good carry cost from a cache.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Two-step trade: plan from last-known neighbour prices, then settle on arrival | Last-known-value data per neighbour (theirs) |
| Settle in value order: serve lowest-value requested goods first, take highest-value payment goods first | Goods list and values (theirs) |
| Two separate carry budgets, each limited by per-good effort | Transport effort per good (theirs, data) |
| Minimum price floor per good | Economy::MINIMUM_PRICE 0.1 (L161) and MIN_SELL_PRICE 1.0 (local to plan_trade_for_site, filters neighbour prices) (theirs) |
| Pay-with-surplus, cut the order when unable to pay | 0.95 broke-threshold, used only for a log line at L662 (theirs) |
| Order list capped per neighbour | 100 orders per neighbour (theirs) |

## 4. TypeScript sketch
simplified: planTrade omits the payment leg (paying with surplus goods valued at neighbour prices, the separate dispatch budget, and cutting the buy when payment is short), the coin good, the 100-order cap and the transport-slot result; it uses one carry budget for collection only. settleOrder omits the next-demand reserve, the order/stock ratio allocation and payment-in-goods; it only sells wanted goods in ascending local value order from stock.
```ts
// Licence: GPL-3 (veloren-veloren). CLEAN-ROOM: from the mechanism, no donor lines.
type Good = string;
interface Neighbour { id: number; lastValues: Record<Good, number>; lastSupplies: Record<Good, number>; }
interface Site { stock: Record<Good, number>; demand: Record<Good, number>; values: Record<Good, number>; neighbours: Neighbour[]; }

function planTrade(site: Site, carry: number, effort: Record<Good, number>): Map<number, Record<Good, number>> {
  const orders = new Map<number, Record<Good, number>>();
  let budget = carry;
  const deficits = Object.keys(site.demand).map((g) => [g, site.demand[g] - (site.stock[g] ?? 0)] as const)
    .filter(([, d]) => d > 0).sort((a, b) => (site.values[b[0]] ?? 0) - (site.values[a[0]] ?? 0));
  for (const [g, need] of deficits) {
    let left = need;
    const sellers = site.neighbours
      .filter((n) => (n.lastSupplies[g] ?? 0) > 0)
      .sort((a, b) => a.lastValues[g] - b.lastValues[g]);
    for (const n of sellers) {
      const load = Math.min(left, n.lastSupplies[g]);
      const cost = load * (effort[g] ?? 0);
      const take = cost > budget && effort[g] > 0 ? budget / effort[g] : load;
      budget = Math.max(0, budget - take * (effort[g] ?? 0));
      const o = orders.get(n.id) ?? {};
      o[g] = (o[g] ?? 0) + take;
      orders.set(n.id, o);
      left -= take;
      if (left <= 0) break;
    }
  }
  return orders;
}

function settleOrder(site: Site, order: Record<Good, number>): Record<Good, number> {
  const delivered: Record<Good, number> = {};
  const sortedSell = Object.entries(order).filter(([, a]) => a > 0).sort((a, b) => (site.values[a[0]] ?? 1) - (site.values[b[0]] ?? 1));
  for (const [g, amount] of sortedSell) {
    const paid = Math.min(amount, site.stock[g] ?? 0);
    site.stock[g] = (site.stock[g] ?? 0) - paid;
    delivered[g] = (delivered[g] ?? 0) + paid;
  }
  return delivered;
}
```

## 5. Lands in
- Frankendom file(s): origins/contracts/economy.ts (goods and prices as data, ledger) with zone supply data in origins/world/zone-rules.ts (both named from sibling notes, not read here); any settle step runs server-side, behind the server tick. Frankendom has no site-to-site goods flow today.
- Parity-checklist row: row 18 (post-K item 3: server tick owns rewards and the one ledger) and row 21 (catalogue price fields); feature-map section: economy / zones as data.
- Reuse tag: rewrite-from-idea (GPL-3; the two-step idea maps, but the code does not)
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- This is an NPC-town economy: sites buy and sell from each other. It has no player trade, no gold leg and no player listings.
- It runs on a world tick with a dt, and the donor's world sim is per-site parallel. Frankendom needs a fixed server tick first (post-K item 3).
- Last-known neighbour prices are a planning assumption. Frankendom's zones would need their own data source.
- No combat or fight content. Nothing lands in src/fight.
- Donor is GPL-3, so only the mechanism is described here.
