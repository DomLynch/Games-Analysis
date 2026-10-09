# OpenTTD-OpenTTD (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/OpenTTD-OpenTTD/src/economy.cpp | Licence: GPL-2.0 | C++ | symbol DeliverGoods / GetTransportedGoodsIncome
Ranges opened and confirmed: GetTransportedGoodsIncome 955-1017, DeliverGoodsToIndustry 1032-1073, DeliverGoods 1087-1132.

## 1. Mechanism
- Donor: OpenTTD cargo delivery payment. A vehicle unloads cargo at a station; DeliverGoods (1087) hands it to nearby industries that accept it. Pay is on the accepted amount: industry-accepted pieces, or all pieces if the station always accepts that cargo.
- Acceptance: DeliverGoodsToIndustry (1032-1073) loops over every industry near the station (the doc comment says nearest only; the loop does not stop at one). It skips the source industry itself, industries that do not accept the cargo, ones temporarily refusing it, and ones with an exclusive supplier other than the station's owner. Each remaining industry takes min(remaining pieces, 0xFFFF minus its waiting stock); the amount is added to its waiting stock, and the loop ends when no pieces are left. It returns the total accepted.
- DeliverGoods (1087-1132): accepted_total is accepted_ind, or all pieces if the station always accepts that cargo (line 1097). Pieces accepted but not taken by an industry count to the town (1110-1113). Profit = GetTransportedGoodsIncome(accepted_total, ...), then the subsidy step.
- Payment: GetTransportedGoodsIncome (955-1017) first scales transit periods by the cargo-aging-rate setting (964), and uses a NewGRF profit callback when the cargo has one (967-981, not sketched). Otherwise it returns dist * time_factor * pieces * current_payment, shifted right by 21 bits (BigMulS, 1015). Time factor: 255 for fast deliveries; slope -1 per period past the first grace period; slope -2 past the second; floored at 31. Once the unfloored curve would pass the floor (periods_over_max > 0, 992-997), the factor instead follows a scaled 1/(x+1) tail that approaches 1 (not the floor of 31), with 4 extra fraction bits so the shift is 25 (1011-1012).
- A subsidised delivery multiplies the profit by the difficulty setting subsidy_multiplier: 0 gives profit + profit>>1, 1 gives x2, 2 gives x3, otherwise x4 (1122-1129).
- The function is a plain call per delivery with no timer inside it. Who calls it and when (vehicle unload) was not read; the doc note at 1085 says the caller must trigger the industry's production.

## 2. Key functions
- GetTransportedGoodsIncome | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/economy.cpp | 955-1017 | pays for pieces by distance, time factor and price, with a per-cargo callback option.
- DeliverGoodsToIndustry | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/economy.cpp | 1032-1073 | gives pieces to nearby industries that accept the cargo; returns the count accepted.
- DeliverGoods | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/economy.cpp | 1087-1132 | the full delivery: acceptance, town counters, payment, subsidy.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Pay = distance x quantity x time factor x price, integer shift | Shift 21 bits (theirs; economy.cpp:1015) |
| Time factor: flat, then linear slopes, then a 1/(x+1) tail toward 1 | Floor 31, maximum 255, 4 fractional bits (theirs; economy.cpp:983-986) |
| Grace periods per cargo before the penalty starts | Per-cargo transit periods (theirs, cargo table; read at economy.cpp:988-989) |
| Deliveries split between nearby industries first, rest to town | Acceptance rules and the 0xFFFF stock cap (theirs; economy.cpp:1049-1061) |
| Subsidy multiplier by difficulty | x1.5, x2, x3, x4 (theirs; economy.cpp:1123-1128) |

## 4. TypeScript sketch
Licence: GPL-2.0 (OpenTTD-OpenTTD). Clean-room: written from the mechanism, no donor lines.
simplified: the cargo-aging-rate scaling, the NewGRF profit callback and the per-industry loop (stock cap, exclusive supplier, town counters) are omitted; the caller passes the industry-accepted count in. Payment is done in JS numbers, so very large distance x pieces x price products lose the 64-bit exactness the donor has. Subsidy takes the same four cases as the donor.
```ts
interface CargoSpec { grace: number; grace2: number; price: number; }   // theirs: two grace periods

const MAX_F = 255;                             // theirs
const MIN_F = 31;                              // theirs
const FRAC_BITS = 4;                           // theirs
const FRAC = 1 << FRAC_BITS;
const SHIFT = 21;                              // theirs: fixed-point payment shift

function payment(pieces: number, distance: number, periods: number, c: CargoSpec): number {
  const over1 = Math.max(periods - c.grace, 0);
  const over2 = Math.max(over1 - c.grace2, 0);
  let overMax = MIN_F - MAX_F;
  overMax += c.grace2 > -overMax ? periods - c.grace : 2 * (periods - c.grace) - c.grace2;
  if (overMax > 0) {
    // tail: scaled 1/(x+1), approaches 1, extra fraction bits in the shift
    const f = Math.max(Math.trunc((2 * MIN_F * FRAC * FRAC) / (overMax + 2 * FRAC)), 1);
    return Math.floor((distance * f * pieces * c.price) / 2 ** (SHIFT + FRAC_BITS));
  }
  const f = Math.max(MAX_F - over1 - over2, MIN_F);   // slope -1, then -2, floored
  return Math.floor((distance * f * pieces * c.price) / 2 ** SHIFT);
}

// Subsidy cases: 0 -> x1.5 (add half, integer), 1 -> x2, 2 -> x3, otherwise x4.
function subsidise(profit: number, setting: number): number {
  switch (setting) {
    case 0: return profit + Math.floor(profit / 2);
    case 1: return profit * 2;
    case 2: return profit * 3;
    default: return profit * 4;
  }
}

// Pay only for what was accepted: industry-accepted pieces, or all pieces if the station always accepts this cargo.
function deliver(pieces: number, distance: number, periods: number, c: CargoSpec,
                 industryAccepted: number, alwaysAccepted: boolean, subsidy: number | null): number {
  const accepted = alwaysAccepted ? pieces : industryAccepted;
  const profit = payment(accepted, distance, periods, c);
  return subsidy === null ? profit : subsidise(profit, subsidy);
}
```

## 5. Lands in
- Frankendom file: origins/contracts/economy.ts (delivery payout by distance and transit time). The transit clock is server state. origins/server/shop-buy.ts / origins/server/career.ts are the writers.
- Parity-checklist row: row 18 (loot roll and XP / career award: a reward that decays with time after a grace is the same payout shape) and row 21 (grace, floor and price per cargo are catalogue fields).
- Usable rule: one-character/one-ledger rule (the server pays and writes the ledger once).
- Reuse tag: rewrite-from-idea (GPL-2.0; mechanism only).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- The donor is a transport game: pay depends on distance and transit time of cargo. Frankendom's trade (contracts, fights, rewards) has no cargo aging. Only the shape "pay falls off with time after a grace" transfers.
- The donor's acceptance is a map of nearby industries. Frankendom has no industry map; the equivalent is a zone-level market, which is a data question for Lead.
- The per-cargo profit callback and aging-rate scaling are not reproduced; the tail branch is, but with JS-number precision, so do not assume bit-exact results at extreme sizes.
- Subsidies are a difficulty table; Frankendom would need an explicit bonus rule.
- Symbol note: DeliverGoods at 1087 and GetTransportedGoodsIncome at 955 are correct; the stock/acceptance logic is in DeliverGoodsToIndustry (1032).
- Server-verified: the donor trusts the caller's distance and periods. Frankendom must compute both on the server from recorded start time and position; never accept a client-sent age.
- GPL-2.0: mechanism only.
