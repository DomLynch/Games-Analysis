# lincity-ng-lincity-ng (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/market.cpp | Licence: GPL-2.0-or-later per market.cpp header (code; data dual GPL/CC-BY-SA per COPYING-data.txt) | C++ | symbol Market::update

## 1. Mechanism
- Lincity-NG market building. Each commodity (food, goods, labour, waste and so on) has a stock level and a capacity per building. A market gives and takes goods to and from the buildings around it.
- Market::update (market.cpp 96-219) is the per-building update; the caller that runs it each world tick was not read. For each commodity (106-157): skip it if the market's rule neither gives nor takes it, or if the market holds less labour than its current `labor` level (and the commodity is not labour itself) (110-114). Otherwise compute the market's fill ratio (stock x 1000 / capacity, integers; TRANSPORT_QUANTA = 1000, transport.hpp 67), add it to a running market_ratio and count n (118-120).
- It then pools the market with each neighbouring partner that has a non-zero capacity for the good (128), not only partners that hold stock. A partner flagged FLAG_EVACUATE is pooled with its stock and capacity 0 (132-133, 145-147). Any other partner is pooled only if its fill ratio passes the market's own rules for that direction: a partner above the market's ratio needs market.take and partner.give; below, market.give and partner.take (139-143). A shared target trade_ratio = pooled stock x 1000 / pooled capacity is computed once (150).
- Each pooled partner is then pushed toward the target by Construction::equilibrate_stuff (lintypes.cpp 774-849; `this` is the partner, the market is passed as the remote side). Normal case: flow = target x partner capacity / 1000 - partner stock (789). Positive flow (partner receives) is refused unless partner.take and market.give, and negative flow unless partner.give and market.take (790-795). Positive flow is capped at market capacity / TRANSPORT_RATE (8) and at the market's stock (796-801); negative flow is capped at -(market capacity / 8) and at the market's free space, and set to 0 if that would turn positive (803-810). If the partner is evacuating, its flow is all it holds up to the market's free space (833-838). Both stocks are updated (846-847). The market's updated stock is written back after all partners (156).
- Tax side effect (813-831): when a non-transport, non-market partner receives labour, goods or coal, the world.taxable counters for that commodity grow by the flow.
- Labour (159-165, 190-215): each tick, if the market holds at least `labor` labour, it consumes `labor`, adds it to world.taxable.labor and counts a working day. When total_time % 25 == 17, the average fill (100 x sum of ratios / (n x 1000), 0 if n is 0) sets the level: under 10 percent = 1, under 20 = 5, under 50 = 12, else 28 (LABOR_MARKET_*, market.hpp 52-55). When total_time % 100 == 99: production counters reset, busy = working_days (184-189).
- Waste (167-182): on every tick where total_time % 50 is not 0 (the first `if` has no braces and wraps the waste test), if waste is at least 85 percent of MAX_WASTE_IN_MARKET the market burns 70 percent of the max, adds pollution at the tile south-east of it, and rolls a Bernoulli fire chance (WASTE_BURN_UNCONTROLLED x group fire_chance / 100); the roll happens first and the fire starts only if the tile has no fire cover (173-178).
- Cover (217-218, 221-233): when total_time % DAYS_BETWEEN_COVER == 75 (DAYS_BETWEEN_COVER = NUMOF_DAYS_IN_MONTH x 3 = 300, src/lincity/all_buildings.hpp 46 and lintypes.hpp 59), cover() flags a square of tiles within the group range with FLAG_MARKET_COVER_CHECK.
- Output: updated stock levels on the market and its partners, labour consumed and taxed, pollution and a possible fire.

## 2. Key functions
- Market::update | /mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/market.cpp | 96-219 | per tick: per-commodity pooling, shared target, push to partners, labour level, waste burn, monthly reset.
- Construction::equilibrate_stuff | /mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/lintypes.cpp | 774-849 | moves one commodity between this building and a partner toward a target ratio, with rules and caps.
- Market::cover | /mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/market.cpp | 221-233 | marks the tiles within the market's range with the cover-check flag (called from update at total_time % DAYS_BETWEEN_COVER == 75).

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Pooled equalisation: stock pooled over neighbours, shared target ratio, each neighbour pushed toward it | Quanta per unit 1000 (theirs, transport.hpp 67) |
| Flow capped per step and by the receiver's space and the giver's stock | Transport rate divisor 8 (theirs, transport.hpp 66) |
| Give and take flags decide direction; evacuation forces give-only | Per-building rule tables (theirs) |
| Labour level from average fill, with thresholds | Fill thresholds 10, 20, 50 percent (market.cpp 199-207); labour 1, 5, 12, 28 (theirs, market.hpp 52-55) |
| Periodic actions on a modulo schedule | Moduli 25 (== 17), 50 (waste, != 0), 100 (== 99), DAYS_BETWEEN_COVER (== 75) (theirs, market.cpp 167, 185, 190, 217) |

## 4. TypeScript sketch
simplified: labour, waste, taxable counters, the skip rule for low labour and the cover pass are omitted. Truncating integer division (donor ints) is shown as Math.floor. The loop that visits commodities and the market's write-back are left to the caller. Flow clamps follow the donor, including the negative-flow-to-zero clamp.
```ts
// Licence: GPL-2.0-or-later (code; data dual GPL/CC-BY-SA) | clean-room: written from the mechanism, no donor lines.
// Neighbour equalisation for one good. Each building has stock, capacity and give/take rules.
// The market pools itself and its willing neighbours, computes a shared fill ratio, and pushes each
// neighbour toward it by a rate-limited flow, bounded by both sides' space and stock.
interface Store { stock: number; cap: number; give: boolean; take: boolean; evacuate: boolean; }
const QUANTA = 1000;   // theirs
const RATE = 8;        // theirs: divisor that slows the flow

const fill = (s: Store): number => Math.floor((s.stock * QUANTA) / s.cap);

function equalise(self: Store, partners: Store[]): void {
  const mine = fill(self);
  // pool every partner that accepts the good; an evacuating partner joins with its stock and zero capacity;
  // any other partner joins only if the market's own give/take rules allow flow in that direction
  const pool = partners.filter(p => {
    if (p.cap <= 0) return false;
    if (p.evacuate) return true;
    const theirs = fill(p);
    if (theirs > mine && !(self.take && p.give)) return false;
    if (theirs < mine && !(self.give && p.take)) return false;
    return true;
  });
  let stock = self.stock, cap = self.cap;
  for (const p of pool) { stock += p.stock; cap += p.evacuate ? 0 : p.cap; }
  const target = Math.floor((stock * QUANTA) / cap);
  for (const p of pool) push(self, p, target);
}

function push(self: Store, p: Store, target: number): void {
  if (p.evacuate) {                                              // evacuating: dump its stock into the market's space
    const f = -Math.min(self.cap - self.stock, p.stock);
    self.stock -= f; p.stock += f;
    return;
  }
  let flow = Math.floor((target * p.cap) / QUANTA) - p.stock;   // what the partner wants
  if (flow > 0) {
    if (!(p.take && self.give)) return;
    flow = Math.min(flow, Math.floor(self.cap / RATE), self.stock);
  } else if (flow < 0) {
    if (!(p.give && self.take)) return;
    flow = Math.max(flow, -Math.floor(self.cap / RATE), -(self.cap - self.stock));
    if (flow > 0) flow = 0;                                    // the market is over capacity
  }
  self.stock -= flow;
  p.stock += flow;
}
```

## 5. Lands in
- Frankendom file: origins/contracts/economy.ts (if a goods layer is added; ledger and rules as data) or origins/world/zone-rules.ts (data for give and take rules; name from a sibling note, not opened). Frankendom has no goods-flow layer today; this is a new system question for Lead.
- Parity-checklist row: row 18 (the server tick that would run this, post-K item 3) and row 21 (give/take flags and capacities as catalogue data); goods flow itself is outside rows 1-22.
- Rule served: 4 (zones are data on one runtime: the give and take rules are data per building).
- Reuse tag: rewrite-from-idea (GPL-2.0 code; data dual GPL/CC-BY-SA; mechanism only).
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks
- Goods flow between buildings is a simulation of a city. Frankendom has no city; applying this would be a new system, not a feature. Lead must decide if it is in scope.
- The donor runs on a fixed world tick with modulo schedules; Frankendom's server tick must be the only clock (post-K item 3), and the Bernoulli fire roll uses a global generator (BasicUrbg) that a server-verified sim could not share.
- The donor mutates both buildings in place through pointers (846-847). Frankendom's one-ledger rule needs every flow as a ledger entry, not an in-place stock edit.
- Waste fire and pollution have no Frankendom counterpart; they are out of scope.
- Data files are dual licensed (CC-BY-SA as well); keep only the mechanism, as the licence column says.
- GPL-2.0-or-later: mechanism only.
