# lincity-ng-lincity-ng (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/market.cpp` (with `src/lincity/lintypes.cpp` 648-849) | Licence: GPL-2.0-or-later (market.cpp header: "either version 2 of the License, or (at your option) any later version"; COPYING.txt present) | C++ | symbols `Market::update`, `Construction::equilibrate_stuff`

Checked: Read in full: market.cpp 1-365; lintypes.cpp 648-849 (`Construction::trade` and `Construction::equilibrate_stuff`, both read end to end); simulate.cpp 53-70 and 230-249; market.hpp 41-55 and 71-94; transport.hpp 66-67, 72, 77, 89, 104-105 (constants found by grep -n; only the defining lines seen). Callers of `equilibrate_stuff`: two, both read (market.cpp:154 and lintypes.cpp:709). Partner linking (lintypes.cpp 528-556 and 440-466) read in part, not the whole connect function. Not read: `Market::cover` consumers, the vehicle and powerline branches beyond the lines cited, and whether `Construction::trade` also runs on a market tile. Confidence: high for the transfer rule and the daily schedule; medium for who is a partner.

Best transferable idea: move stock between linked shops toward one shared fill ratio, cap each transfer at a fraction of the sender's capacity, and write every move as one debit plus one credit, so surplus and shortage spread without creating or losing goods.
Decision (proposed): adapt - keep the conserved pair transfer and the per-tick cap as the shape for a regional stock flow between zone shops; reject the logistics layer (trucks, traffic, fire, pollution) and reject any mapping of fill ratio to a player price. Stock flow is not a currency, so it does not touch gold.
Acceptance: a server test runs 1000 day ticks over one hub and three linked shops and asserts that each good's total across the four shops is unchanged, that no count goes negative, and that no non-evacuating transfer exceeds hub max / 8.

## 1. Mechanism

- What it is: a Market is a city-building construction that redistributes stock of several goods (food, labour, coal, goods, ore, steel, waste, water) among nearby non-market buildings. Each good has a `maxload` and a `give` / `take` flag pair (market.hpp:71; commodities.hpp:52-56). The file has no price, no currency and no buyer. The only money-like counter is `world.taxable` (market.cpp:163; lintypes.cpp:820-823).
- Clock: `World::do_time_step` adds one to `total_time` (simulate.cpp 56) and calls `simulate_mappoints` (66). The constant names and comments say days, so one tick is one world day; the caller of `do_time_step` was not read. Inside `simulate_mappoints` every construction is visited in a shuffled order (simulate.cpp 234-237), dead ones are removed (240-245), and each live one gets `trade()` then `update()` (246-247).
- Order inside `Market::update` (market.cpp 96-219), per day:
  (a) Goods loop (106-157). Skip a good with neither give nor take, and skip every good except labour when the market holds less labour than its current tier needs (111-114). Otherwise the market's own fill is `ratio = count * 1000 / maxload` (118).
  (b) Partner filter (123-149). A partner with a maxload for that good is included if it is evacuating (its capacity counts as 0 and it is always included, 132-134) or if its fill sits on a side the two can trade across: partner fill above the market's needs market.take and partner.give; partner fill below needs market.give and partner.take (139-143). Pooled trade ratio = (market count + included counts) * 1000 / (market max + included max) (150).
  (c) Every included partner runs `equilibrate_stuff` with the market's live count and rule (151-155). The market's count is then stored (156).
  (d) Labour (159-165). If the market holds at least its tier `labor`, it consumes `labor` (161), adds the same to `world.taxable.labor` (163) and counts a working day.
  (e) Waste (167-182). On days not divisible by 50 (167), if waste is at least 85 percent of the market's waste capacity (168), it adds pollution (170), consumes 70 percent of capacity (171), and with probability `.001 * fire_chance / 100` (173-175) starts a fire unless the tile is fire-covered. For the market, fire_chance is 80 (market.hpp:46), so the chance per burn check is 0.0008.
  (f) Calendar. Day % 100 == 99: monthly counters reset (185-189). Day % 25 == 17: `market_ratio` becomes the average fill in percent over this day's goods (195), and the labour tier is set: under 10 percent gives 1, under 20 gives 5, under 50 gives 12, otherwise 28 (199-214; market.hpp:52-55). Day % DAYS_BETWEEN_COVER == 75: cover is marked over the range square (217; 221-233).
- `Construction::equilibrate_stuff` (lintypes.cpp 774-849), one receiver, one good:
  1. Target flow: `flow = ratio * own_max / 1000 - own_count` (789).
  2. Permission (790-794): an inflow needs receiver.take and sender.give; an outflow needs receiver.give and sender.take. If refused, return 0.
  3. Inflow (796-802): cap at sender max / 8 (798-799), then at what the sender holds (800-801).
  4. Outflow (803-811): cap magnitude at sender max / 8 (805-806), then at the sender's headroom (807-808), and never above zero (809).
  5. Apply (846-847): receiver count += flow, sender count -= flow. Return |flow| as traffic (840-848).
  - Evacuating receiver (787 false branch, 833-838): no permission test and no 1/8 cap. Flow = minus the sender's headroom, capped at the receiver's own stock.
  - Taxable tally (813-831): when a non-transport, non-market receiver takes an inflow, labour, goods and coal are added to `world.taxable` (819-826). So a good is counted as income where it is consumed, not where it is produced.
- `Construction::trade` (lintypes.cpp 648-772) is the same pass over adjacent neighbours instead of partners: it pools the ratio (693-701), calls `equilibrate_stuff` on each (705-713) and adds the net flow to its own count (770). Its traffic counter is smoothed as nine parts old to one part new (720), and the donor comment says this is "to suppress fluctuations from random order" (716).

## 2. Key functions

- `Market::update`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/market.cpp` 96-219. Per-good partner pass 106-157; labour and waste 159-182; calendar 184-217.
- `Construction::equilibrate_stuff`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/lintypes.cpp` 774-849. The one per-pair transfer; both callers are listed above.
- `Construction::trade`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/lintypes.cpp` 648-772. The neighbour version of the same pass.
- `World::simulate_mappoints`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/simulate.cpp` 230-249. Shuffled visit, trade then update.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fill ratio scale: 1000 = 100 percent | TRANSPORT_QUANTA 1000 (transport.hpp:67) |
| One transfer per partner per tick at most sender max / 8 | TRANSPORT_RATE 8 (transport.hpp:66; lintypes.cpp:798-806) |
| Labour tier by fill percent: <10 gives 1, <20 gives 5, <50 gives 12, else 28 | LABOR_MARKET_EMPTY/LOW/MED/FULL (market.hpp:52-55); thresholds market.cpp:199-214 |
| Labour tier refreshed every 25 days at offset 17 (so consumption uses a stale tier for up to 24 days) | market.cpp:190 |
| Overflow sink: at 85 percent of waste capacity, destroy 70 percent of capacity | market.cpp:168, 171 |
| Overflow sink fire chance: 0.001 * group fire chance 80 / 100 | all_buildings.hpp:59; market.hpp:46; market.cpp:173-174 |
| Per-good capacity from group constants, e.g. food = rail value * 8, labour = rail value * 3 | market.hpp:71, 74; transport.hpp:72, 77 |
| Link range 9, size 2 (search box 449-454) | market.hpp:47-48; lintypes.cpp:449-454 |
| Partner link: exactly one side is a market, transport never a distant partner | lintypes.cpp:545-550 |

## 4. TypeScript sketch

simplified: one good, one partner, one call. The trade ratio is an input here, where the donor pools the market and its included partners (market.cpp 139-151). Omitted: the partner filter (139-143), the powerline and vehicle branches, the taxable tally (lintypes.cpp 813-831), the traffic counters (718-748), the labour and waste steps (159-182), the daily shuffle (simulate.cpp 237) and the market's own count write-back (156). Order kept from the donor: target, permission, sender rate cap, sender stock cap, sender headroom cap, apply to both sides, return the moved amount. The evacuating branch skips permission and the rate cap, as the donor does (833-837).

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// One good, one hub, one partner, one tick. Fill ratios are fixed-point: 1000 means 100 percent.
const QUANTA = 1000;
const RATE_DIVISOR = 8; // one transfer may not exceed the sender's max load divided by 8

interface Rule { max: number; give: boolean; take: boolean; }
interface Holder { count: number; rule: Rule; evacuating: boolean; }

// Moves stock of one good between `partner` and `hub`, pulling the partner toward `targetRatio`.
// Returns the units moved (>= 0). Conservation: the partner gains exactly what the hub loses.
function equaliseOnce(partner: Holder, hub: Holder, targetRatio: number): number {
  let flow: number;
  if (partner.evacuating) {
    flow = -(hub.rule.max - hub.count);            // partner pushes into the hub's headroom
    if (-flow > partner.count) flow = -partner.count;
  } else {
    flow = Math.floor((targetRatio * partner.rule.max) / QUANTA) - partner.count;
    const allowed = flow > 0
      ? partner.rule.take && hub.rule.give
      : partner.rule.give && hub.rule.take;
    if (!allowed) return 0;
    if (flow > 0) {
      if (flow * RATE_DIVISOR > hub.rule.max) flow = Math.floor(hub.rule.max / RATE_DIVISOR);
      if (flow > hub.count) flow = hub.count;
    } else if (flow < 0) {
      if (-flow * RATE_DIVISOR > hub.rule.max) flow = -Math.floor(hub.rule.max / RATE_DIVISOR);
      if (-flow > hub.rule.max - hub.count) flow = -(hub.rule.max - hub.count);
      if (flow > 0) flow = 0;
    }
  }
  partner.count += flow;
  hub.count -= flow;
  return Math.abs(flow);
}

export {};
```

Checked by tsc: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/economy-flow.ts` (new, proposed; no Frankendom economy file was read for this note): a daily server pass that moves stock of one good between a hub shop and its linked shops, using the conserved pair transfer above. It runs from the server tick, once per world day.
- Parity-checklist row 21 (catalogue fields). The per-good record (max load, give, take, evacuation flag) is the nearest fit. No row covers the stock-flow pass itself: say plainly that none of rows 1-23 fits the flow, so a new economy row would be needed if this is built.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (each move is one debit and one credit in one function, lintypes.cpp 846-847); zones as data (max loads and labour tiers are group constants that a zone can set).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch follows the order of steps, not the lines.
- One ledger: the donor conserves each pair but has no global check. Frankendom needs a server assertion over all shops of a good, not only per pair.
- No currency: nothing here is a price. The only money counter is `world.taxable` (market.cpp:163). Do not map fill ratio to a price; a price is a separate design.
- The donor does not clamp the receiver to its own maximum on an inflow (lintypes.cpp 796-802 cap only the sender's rate and stock). The target keeps the receiver at or under its maximum only while every participant is at or under 100 percent (lintypes.cpp 701, 789). Frankendom must clamp the receiver.
- Evacuation has no rate cap (lintypes.cpp 833-837): a shop being closed can empty in one tick. Frankendom must decide whether that is wanted.
- Visit order is shuffled every day (simulate.cpp 237). Frankendom's server must use a fixed or seeded order so the same inputs give the same result on replay.
- The labour tier is stale for up to 24 days (market.cpp:190), which is fine for a city builder and may be wrong for a fight-rate economy. Treat the refresh period as a data field.
- The labour consumed each day (market.cpp:161) is a sink, but it is a logistics input, not a player currency. Frankendom should not reuse it as a gold sink.
- The overflow sink (market.cpp:168-171) is a real inflation-control shape: stock above a fill threshold is destroyed on a schedule. If used, the destroyed amount must be written to the ledger as a named sink.
- Not read: the partner connect function in full (lintypes.cpp 528-556 read in part), whether `Construction::trade` also runs for markets, and any consumer of `world.taxable`.
