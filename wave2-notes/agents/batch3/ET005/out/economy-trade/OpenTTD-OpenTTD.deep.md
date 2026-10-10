# OpenTTD-OpenTTD (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/economy.cpp` | Licence: GPL-2.0 (economy.cpp header, line 3: "version 2"; COPYING.md: "Version 2, June 1991") | C++ | symbol `GetTransportedGoodsIncome`

Checked: `GetTransportedGoodsIncome` is defined at economy.cpp 955-1017 and was read in full. Callers: `DeliverGoods` (1116) and `CargoPayment::PayTransfer` (1238) were read in context; `ScriptCargo::GetCargoIncome` (script_cargo.cpp 71, grep hit only, not read in context) calls it with a days-to-periods conversion. Ageing: vehicle.cpp 1012-1028 and cargopacket.cpp 404-415 were read; the vehicle's `cached_cargo_age_period` value is set elsewhere (not read). Transfer split: economy.cpp 1182-1252 and cargopacket.cpp 518-545 read in part. Inflation and interest: economy.cpp 694-832 and 1964-1982 read in full. Not read: the NewGRF profit callback body (967-981, only its branch shape), `ScaleByPercentage` rounding, the subsidy branch (1121-1129 seen but not analysed), and the fluctuation counter (834-854, not used here). Confidence: high for the distance-and-time pay formula and its regimes (I checked the three regimes with an arithmetic run, not in the donor); medium for the transfer split (only the transfer path read). Camera: not applicable.

Best transferable idea: Pay a timed delivery as distance x amount x a time factor that stays flat for a grace window, falls by a fixed slope, then falls on a 1/(x+k) tail that never reaches zero.
Decision (proposed): adapt. Keep the time-decay curve shape as data for timed rewards (escort, timed bounty, rushed craft order); do not port the ageing counter, the cargo table or the coupled inflation, which belong to a transport economy.
Acceptance: A server test: a timed bounty pays its full base at elapsed 0, pays strictly less at every later tick, drops to 31/255 of base where the linear phase ends, stays above zero after that, and the payout is computed on the server from server ticks.

## 1. Mechanism

- Order of steps in `GetTransportedGoodsIncome` (economy.cpp 955-1017):
  (a) An invalid cargo spec returns 0 (958-961).
  (b) The transit count is scaled by the `cargo_aging_rate` setting (964). Default 100 percent, range 0 to 250 (economy_settings.ini 377-382).
  (c) If the cargo has a profit callback, its result replaces the whole formula (967-981). The callback body was not read.
  (d) Two thresholds come from the cargo spec: td1 = `transit_periods[0]` (988), td2 = `transit_periods[1]` (989). Then over1 = max(t - td1, 0) (990) and over2 = max(over1 - td2, 0) (991).
  (e) Linear phase: factor = max(255 - over1 - over2, 31) (1014). So the factor is 255 while t is at most td1, then falls by 1 per period for td2 periods, then falls by 2 per period, and never goes below 31.
  (f) Tail switch. `periods_over_max` starts at 31 - 255 = -224 (992). If td2 > 224 (993) it becomes -224 + (t - td1) (994); otherwise -224 + 2(t - td1) - td2 (996). The tail applies when that value is above 0 (1010). The tail begins exactly where the linear phase reaches 31 (my derivation from 992-996 and 1014, confirmed by the arithmetic run below).
  (g) Tail: fixed = max(15872 / (x + 32), 1) with x = that value (1011), where 15872 = 2 x 31 x 16 x 16. The payment is shifted by 21 + 4 bits (1012). On the 255 scale this is 992 / (x + 32), so it starts at 31 and falls toward zero.
  (h) Payment = (distance x factor x pieces x current_payment) >> 21, computed in 64-bit integers (BigMulS, 84-87; linear branch at 1015).
  (i) `current_payment` = `initial_payment` x `inflation_payment` >> 16 (792; `initial_payment` at cargotype.h 84).
- Ageing. Each packet's `periods_in_transit` goes up by 1 when the carrying vehicle's countdown reaches zero (vehicle.cpp 1021-1026, `AgeCargo` at 1024; cargopacket.cpp 406-413). The countdown reloads with `cached_cargo_age_period`, documented as "Number of ticks before carried cargo is aged." (vehicle_base.h 87). So t counts ageing ticks of the carrying vehicle, not calendar days.
- Numbers (from the formula above; worked by hand and checked by a local arithmetic run of the same integer steps, not in the donor):
  - Passengers (td1 0, td2 24; cargo_const.h 58): factor 255 at t 0, 231 at t 24, 31 at t 124, 29.125 at t 125.
  - Coal (td1 7, td2 255; cargo_const.h 59): factor 255 at t 7, 212 at t 50, 62 at t 200.
  - Note: the comment at economy.cpp 1007 says the tail is a scaled 1/(x+1) function, but the code's denominator is x + 32 (1011). The code is what this note uses.
- Transfer split (economy.cpp 1216-1248; cargopacket.cpp 531-537):
  - At a transfer, `PayTransfer` returns (income for the distance so far, at the packet's current transit count, minus the feeder share the packet already holds) x `feeder_payment_share` percent (1238-1244; default 75, economy_settings.ini 203-207). The caller adds that amount to the packet's feeder share and the vehicle's (cargopacket.cpp 534-536).
  - At final delivery, the route profit is the full income (1219-1220). The last vehicle's visible profit is that minus the feeder share still on the packet (1223). A part of a packet gets a share in proportion to its count (cargopacket.h 172-175).
  - Money is booked when the `CargoPayment` object is destroyed (economy.cpp 1182-1192).
- Inflation (economy.cpp 698-800, 1966-1972):
  - Monthly, when the inflation setting is on: `AddInflation()` then `RecomputePrices()` (1968-1970).
  - Two separate indices: `inflation_prices` (costs and the maximum loan) and `inflation_payment` (cargo pay). Each month an index grows by index x amount x 54 >> 16 (724-725), capped at `MAX_INFLATION` (727-728). The donor comment says the payment index differs so that income relative to costs drops slowly (700-701).
  - With `check_year` set (default true, economy_func.h 44), inflation stops outside the original base to max years (715).
  - `RecomputePrices`: each price = start x difficulty multiplier x `inflation_prices` (766); max loan follows `inflation_prices` (739); cargo payment = initial x `inflation_payment` >> 16 (792).
- Interest (economy.cpp 803-832, monthly economy timer 1977-1982): yearly fee = loan x rate / 100, plus negative cash x rate / 100 (820-824). This month's charge is the cumulative fee to this month minus the cumulative fee to last month (825-828), so twelve monthly charges sum to the yearly fee despite integer division (comment 806-814). Each company also pays the station-value price shifted right by 2 each month (830).

## 2. Key functions

- `GetTransportedGoodsIncome`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/economy.cpp` 955-1017. The pay curve.
- `DeliverGoods`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/economy.cpp` 1087-1132. Calls the pay function at 1116; subsidy multipliers at 1121-1129 (not analysed).
- `CargoPayment::PayTransfer` and `PayFinalDelivery`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/economy.cpp` 1216-1248; destructor booking 1182-1207.
- `VehicleCargoList::AgeCargo`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/cargopacket.cpp` 406-415; the countdown: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/vehicle.cpp` 1012-1028.
- `AddInflation` and `RecomputePrices`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/economy.cpp` 698-800. `CompaniesPayInterest`: 803-832. Monthly timers: 1964-1982.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Flat grace window, then slope -1, then slope -2, never below a floor | 255 flat and 31 floor (983-984, theirs); thresholds per item (cargotype.h 85; cargo_const.h 58-59 rows) |
| Hyperbolic tail that starts at the floor and falls toward zero | 2 x 31 x 16 x 16 = 15872 numerator and +32 offset (1011); 4 fraction bits (985) |
| Pay = distance x pieces x factor x rate, shift to scale | >> 21 (1015) and >> 25 for the tail (1012) |
| Base rate scaled by a separate payment index | `initial_payment` (cargotype.h 84) x `inflation_payment` >> 16 (792) |
| Transfer share of the route income | 75 percent default (economy_settings.ini 207) |
| Ageing period in ticks | Value per vehicle (vehicle_base.h 87; the number was not read) |
| Monthly interest as a cumulative difference | Rate / 100 of loan and of negative cash (820-824) |
| Inflation step | index x amount x 54 >> 16 (724-725); cap at MAX_INFLATION (727-728) |

## 4. TypeScript sketch

simplified: the sketch returns the time factor on the 255 scale (the donor's tail fixed point is divided by 16 in the sketch, so the tail value is a fraction), and it keeps the donor order: over1, over2, the tail test, the tail branch, then the linear branch with the floor. It omits the cargo-aging scaling (the caller passes an already scaled count), the NewGRF profit callback, the subsidy multiplier, the transfer split, the inflation indices and the 64-bit shift (JavaScript numbers are used). It does not reproduce the donor's comment about 1/(x+1).

```ts
// Licence: GPL-2.0 (donor, OpenTTD). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const MIN_F = 31;            // floor of the linear phase (of 255)
const MAX_F = 255;           // flat rate for fast deliveries
const FRAC = 16;             // fixed-point fraction used by the hyperbolic tail (1 << 4)

// Returns the multiplier on the flat rate, in units of 1/255 (so 255 = full pay).
function timeFactor(transit: number, td1: number, td2: number): number {
  const over1 = Math.max(transit - td1, 0);      // periods past the flat window
  const over2 = Math.max(over1 - td2, 0);        // periods past the medium window
  let overMax = MIN_F - MAX_F;                   // -224: distance to the tail threshold
  if (td2 > -overMax) overMax += transit - td1;          // slope-1 cargo: tail once linear hits MIN_F
  else overMax += 2 * (transit - td1) - td2;             // slope-2 cargo: tail once linear hits MIN_F

  if (overMax > 0) {
    // Hyperbolic tail: starts at MIN_F, falls toward zero, fixed point with FRAC fractional bits, at least 1/16.
    const fixed = Math.max(Math.floor((2 * MIN_F * FRAC * FRAC) / (overMax + 2 * FRAC)), 1);
    return fixed / FRAC;
  }
  // Linear phases: flat, then slope -1 for td2 periods, then slope -2, never below MIN_F.
  return Math.max(MAX_F - over1 - over2, MIN_F);
}

// Pay for one delivery: distance x pieces x payment rate x time factor, shifted down by 21 bits.
function deliveryPay(pieces: number, distance: number, transit: number, td1: number, td2: number, currentPayment: number): number {
  return Math.floor((distance * pieces * timeFactor(transit, td1, td2) * currentPayment) / 2 ** 21);
}

export {};
```

Typecheck: the sketch is `/private/tmp/p2/wave2-haiku/batch3/ET005/work/timefactor-OpenTTD.ts`, copied to the VPS at `/tmp/timefactor-OpenTTD.ts` and run with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `src/fight/payout.ts` (new): the server-side payout for timed rewards (timed bounty, escort, rushed order), computed from elapsed server ticks. Proposed, not an existing file.
- Parity row: 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget". The elapsed count is server ticks, not wall-clock time. Closest row only: no parity row covers a time-decayed payout.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one ledger, server-verified: the payout is computed on the server); licence rule 7 (GPL-2.0, shape only, no line-by-line translation).

## 6. Gaps and risks

- Frankendom's current rewards (loot and XP per kill) are not time-based. The curve earns its place only where timed content exists (timed bounty, escort, rushed craft order). Without that content, reject it for now.
- The donor counts ageing ticks of the carrying vehicle, and the period length is a per-vehicle cache whose value was not read. Frankendom must count its own server ticks and state the period length as zone data.
- The curve scales a payout; it does not decide who gets it. Many-on-one credit (hate list, MAX_ATTACKERS = 3) is not in this donor's function (not read in other files).
- The transfer split is a hop-by-hop payout: each hop takes 75 percent of the income so far minus the shares already paid. For a single item passed between players this is a ledger row per hop, and the final payout is the total minus the paid shares. The donor splits by packet count (cargopacket.h 172-175), which assumes stackable goods; Frankendom items are single, so the split would need to be restated, not copied.
- Inflation: the donor keeps two indices that drift apart. Frankendom zones use fixed data, so reject the monthly inflation for a duel economy unless a zone economy needs a sink to control it.
- The donor's comment (economy.cpp 1007) says 1/(x+1) but the code uses x + 32. Trust the code, and write the Frankendom test from the integers.
- Integer behaviour: the donor uses integer division and 64-bit shifts. The sketch uses floats for the tail; the server port must keep integer ledger units and the same floor rounding.
- The subsidy multipliers (1121-1129) are a separate faucet multiplier, read but not analysed here.
- Licence: GPL-2.0. Clean-room only. The sketch is written from the mechanism.
