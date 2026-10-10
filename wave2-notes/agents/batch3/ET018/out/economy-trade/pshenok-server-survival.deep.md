# pshenok-server-survival (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/pshenok-server-survival/src/core/economy.js` | Licence: MIT (LICENSE file, "Copyright (c) 2025 Kostyantyn Pshenychnyy"; code may be adapted) | JavaScript (browser ES modules) | symbols `getAutoRepairUpkeep`, `processAutoRepair`, plus the money lines in `Service.update`, `Service.repair`, `deleteObject` (src/sim/topology.js)

Checked: The cell hint is economy.js, read in full (383 lines). The mechanism spans economy.js and the code that calls it: game.js `animate` (1112-1255, read in the parts that touch money), src/entities/Service.js upkeep (637-649), upgrade (396-418) and repair (994-1020), src/sim/topology.js `deleteObject` (354, 400-431), src/core/actions.js `getUpkeepMultiplier` (30-61) and request outcomes (170-270). Callers checked: `processAutoRepair` has one caller (game.js:1199); `getAutoRepairUpkeep` has one caller (game.js:1248); `deleteObject` has one caller in the code I searched (src/input/handlers.js:438). Confidence: high for the numbers and the order of operations I cite. Not read: src/sim/dlq.js (only the debit line), src/sim/handlers/serverless.js (only the debit line), the rest of game.js `updateFinancesDisplay` callers, src/sim/autoscaling.js beyond `upkeepInstanceFactor`, the full tests (tests/sim/economy.test.mjs read at lines 1-5, 17-40 by grep and 43-90; money-on-screen.test.mjs header only). No tests were run. camera_scope: not applicable (economy topic).

## 1. Mechanism

A survival run is a money loop with four sinks and two faucets, all written into one finances object (`STATE.finances`). The client holds the balance as a plain number.

- Faucet: a completed request credits its reward to `STATE.money` and to the income line for its traffic type (src/core/actions.js:259-268).
- Sink, per-instance upkeep, every frame: `Service.update(dt)` is called once per frame from `animate` (game.js:1155). If `STATE.upkeepEnabled` is true it debits `(upkeep / 60) * dt * multiplier * instanceFactor` (src/entities/Service.js:637-644). `upkeep` is a per-minute figure (compute: 12, config.js:180). `dt` is the clamped frame time times `timeScale` (game.js:1119-1120), so a paused game charges nothing. The multiplier is `getUpkeepMultiplier()`: a time ramp from 1.0 to 2.0 over 600 game seconds (config.js:857-862; interpolation at actions.js:51-59), times an event spike (actions.js:44, 61).
- Sink, paid auto-repair, every frame: `processAutoRepair(dt)` heals each damaged service by `5 * dt` (economy.js:345-358, called at game.js:1199). The charge is a separate line in the HUD block of `animate`: `getAutoRepairUpkeep()` returns `(sum of build costs * 0.1) / 60` per second (economy.js:360-375), and game.js:1252-1255 debits that times `dt`, but only when `STATE.upkeepEnabled` is true. The heal is gated on the auto-repair flag and the mode (economy.js:346, 366), not on the upkeep flag.
- Sink, repair on demand: `Service.repair()` returns false if health is already 100 (Service.js:995). Otherwise it charges `ceil(build cost * 0.15)` (Service.js:998-1000, config.js:877). If money is short it flashes and warns and does nothing. On success it debits money, books the repairs line and resets health to 100 (Service.js:1012-1014).
- Sink, penalties: a blocked malicious request costs 1.0 (actions.js:182; config.js:833); a passed one costs 50 (actions.js:196; config.js:834).
- Purchases: placement debits the build cost and books the services, per-service and count lines (topology.js:69-75). Upgrades debit the next tier cost and book it into the services and per-service lines, not into a separate line (Service.js:413-418).
- Sell: `deleteObject(id)` refunds `floor(build cost / 2)` (topology.js:422-423). The refund reverses the services line, clamped at zero, and decrements the count (topology.js:426-428). The author's comment says the refund is a money movement that books itself and is not income (topology.js:408).
- Order inside one frame (game.js line numbers): clamp dt (1119) and scale by timeScale (1120); services update and charge per-instance upkeep (1155); heal with auto-repair (1199); refresh finances panel (1200); charge auto-repair (1252-1255).

## 2. Key functions

- `getAutoRepairUpkeep`: `/mnt/frankendom-donors/pshenok-server-survival/src/core/economy.js` 360-375. Returns 0 if the toggle is off or the mode is not survival; otherwise total build cost times the percent, divided by 60.
- `processAutoRepair`: `/mnt/frankendom-donors/pshenok-server-survival/src/core/economy.js` 345-358. Heals every service under 100 by `5 * dt`, mode-gated only.
- `Service.update` money block: `/mnt/frankendom-donors/pshenok-server-survival/src/entities/Service.js` 637-649. Per-instance upkeep, gated on `STATE.upkeepEnabled`.
- `Service.repair`: `/mnt/frankendom-donors/pshenok-server-survival/src/entities/Service.js` 994-1020.
- `deleteObject` refund block: `/mnt/frankendom-donors/pshenok-server-survival/src/sim/topology.js` 408-431 (function starts at 354).
- `getUpkeepMultiplier`: `/mnt/frankendom-donors/pshenok-server-survival/src/core/actions.js` 30-61.
- Frame loop: `/mnt/frankendom-donors/pshenok-server-survival/game.js` 1112 (`animate`), 1199 (heal), 1248-1255 (auto-repair charge), 1691-1692 (`toggleUpkeep`, no mode check).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sink rate per minute, paid per frame as rate/60 x dt, frozen by pause | Compute upkeep 12 per minute (config.js:180); per-minute convention for every service (`upkeep / 60`, Service.js:643) |
| Time ramp on a sink: multiplier goes base to max over a fixed time, then holds | base 1.0, max 2.0, scaleTime 600 s (config.js:859-861); ramp described at actions.js:33 |
| Repair priced as a fraction of the build price, rounded up | 15 percent (config.js:877); `Math.ceil` (Service.js:998) |
| Paid heal priced as a fraction of total build cost per minute | 10 percent per minute, shown as 10 percent per second in the code comment (economy.js:369 vs 374) |
| Heal rate per second | 5 hp/s, hard-coded (economy.js:353-354). Not the config value: config.js:880 `autoRepairRate: 2` is the idle regeneration in Service.js:597 |
| Sale refund: half the build price, reverses the purchase line, clamped at zero | `floor(cost / 2)` (topology.js:422); clamp (topology.js:426) |
| Penalty per event | 1.0 blocked (config.js:833); 50 breach (config.js:834) |
| Frame time clamp against tab-switch spikes | 0.1 s (game.js:1119) |

## 4. TypeScript sketch

simplified: the sketch keeps the money rules and the single-flag fix (heal and charge share one gate). It omits the traffic income, the per-traffic-type lines, the event spike, the instance factor (it is an input), the repair-on-demand guard and warning, the level-start charge, the malicious penalties, the DLQ and serverless debits, and the frame order. It reorders nothing from the donor except that the heal and the charge are done in one function, which the donor does not do. The `booked` invariant is the sketch's own check, not taken from the donor's tests. All three numbers are taken from the donor (HEAL_PER_S is hard-coded at economy.js:354).

```ts
// clean-room sketch of the donor's rules (MIT donor). Written from the described mechanism, not a translation.
type Bucket = "services" | "upkeep" | "repairs" | "autoRepair" | "mitigation" | "breach" | "dlq";

interface Ledger {
  balance: number;
  income: number;
  expenses: Record<Bucket, number>;
}

interface Svc {
  health: number;
  buildCost: number;
  upkeepPerMin: number;
  instanceFactor: number;
}

// Single entry point for money out: the balance and the ledger bucket move together.
function spend(l: Ledger, bucket: Bucket, amount: number): void {
  if (amount <= 0) return;
  l.balance -= amount;
  l.expenses[bucket] += amount;
}

// Single entry point for money in. Income is a separate line from expenses.
function earn(l: Ledger, amount: number): void {
  l.balance += amount;
  l.income += amount;
}

// A sale returns part of a purchase. It reverses the purchase line, it is not income, and the bucket is clamped at zero.
function refund(l: Ledger, bucket: Bucket, amount: number): void {
  l.balance += amount;
  l.expenses[bucket] = Math.max(0, l.expenses[bucket] - amount);
}

// Upkeep multiplier ramps from base to max over scaleTime game seconds, then holds.
function upkeepMultiplier(gameSeconds: number, base: number, max: number, scaleTime: number): number {
  const progress = Math.min(gameSeconds / scaleTime, 1);
  return base + (max - base) * progress;
}

// Per-frame drain. dt is already game-scaled (paused time is zero), so upkeep freezes with the sim.
function tickUpkeep(l: Ledger, svcs: Svc[], dt: number, multiplier: number, enabled: boolean): void {
  if (!enabled) return;
  for (const s of svcs) {
    spend(l, "upkeep", (s.upkeepPerMin / 60) * dt * multiplier * s.instanceFactor);
  }
}

const REPAIR_PCT = 0.15;   // repairCostPercent (config.js:877)
const AUTO_PCT = 0.1;      // autoRepairCostPercent (config.js:879)
const HEAL_PER_S = 5;      // hard-coded in economy.js:354, not read from config

function repairCost(s: Svc): number {
  return Math.ceil(s.buildCost * REPAIR_PCT);
}

// Paid auto-repair. The heal and the charge share ONE flag here. The donor gates the heal on mode only
// and the charge on the upkeep toggle, so with upkeep off the heal is free.
function autoRepairTick(l: Ledger, svcs: Svc[], paidOn: boolean, dt: number): void {
  if (!paidOn) return;
  const total = svcs.reduce((a, s) => a + s.buildCost, 0);
  spend(l, "autoRepair", (total * AUTO_PCT / 60) * dt);
  for (const s of svcs) {
    if (s.health < 100) s.health = Math.min(100, s.health + HEAL_PER_S * dt);
  }
}

function sell(l: Ledger, s: Svc, bucket: Bucket): void {
  refund(l, bucket, Math.floor(s.buildCost / 2));
}

// Sketch's own invariant (not taken from the donor's tests): balance = start + income - expenses.
function booked(l: Ledger, startBalance: number): boolean {
  const out = Object.values(l.expenses).reduce((a, b) => a + b, 0);
  return Math.abs(l.balance - (startBalance + l.income - out)) < 1e-9;
}

export {};
```

## 5. Lands in

- TARGET `origins/economy/ledger.ts` (proposed new module; the Frankendom repo was not read, so the path is a proposal). One booking entry point for every money movement (spend, earn, refund), so the balance and the ledger line cannot drift. The donor has 12 money-moving lines by grep (10 debits, 2 credits), each written by hand, plus one level-start assignment (game.js:822) that is not a debit.
- Parity-checklist row: 21 (catalogue fields). The donor's fields that matter are price-linked: build cost, repair percent, upkeep per minute, refund ratio. Row 18 (loot roll and XP award) is the nearest other row, but the donor has no loot or XP here, so row 18 does not fit.
- Reuse tag: rewrite-from-idea (MIT, so code may be adapted; the sketch above is clean-room)
- Brief rule served: one ledger (every movement books itself); zones as data (ramp and auto-repair percent are per-level fields); server-verified (the donor's client-side counter is not the model, see section 6).

## 6. Gaps and risks

- Client-only ledger. `STATE.money` is a number in the browser, and every movement is a hand-written pair of lines. Nothing in the donor enforces the pairing; the donor's own comment (topology.js:408-421) says a missed booking was a real bug. Frankendom must put the server ledger behind one function and reject any write that does not go through it.
- Heal without the upkeep flag. `processAutoRepair` checks only `STATE.autoRepairEnabled` and the mode (economy.js:346). The charge checks `STATE.upkeepEnabled` (game.js:1252). `toggleUpkeep` (game.js:1691-1692) has no mode check. So in survival, with upkeep switched off and auto-repair on, services heal and nothing is charged. The lines of tests/sim/economy.test.mjs I read (1-5, 17-40 by grep, 43-90) do not set upkeep off while healing. Frankendom should use one gate for a paid service, or make the test assert it.
- Documentation mismatch. economy.js:369 says "10% of total service cost per second", but the code divides by 60 (economy.js:374), which is 10 percent per minute. The test expects the division by 60 (tests/sim/economy.test.mjs:30). The code is a per-minute rate; the comment is wrong. Do not copy the comment.
- Two heal rates. The paid heal is 5 hp/s hard-coded (economy.js:354). The config field `autoRepairRate: 2` (config.js:880) is the idle regeneration (Service.js:597). Frankendom should have one named field per rate.
- Sell refund ignores upgrades. The refund is `floor(base cost / 2)` (topology.js:422), but an upgrade's cost is booked into the services line (Service.js:416). After a sale, the upgrade spend stays in the expense breakdown and is not refunded. The money counter and the ledger still agree (the sketch's invariant holds), so this is a pricing and display gap, not drift.
- Clamp breaks the invariant. The refund is clamped at zero (topology.js:426), which is needed for a free preBuilt service (topology.js:419-421 comment). With a clamp, `balance = start + income - expenses` no longer holds exactly. Frankendom should refuse to sell a node it did not pay for, or book the free node at zero from the start.
- Booking styles differ. The level-start board charge assigns the services line (game.js:822) while every other site adds to it. It is correct at level start only if the line was zero, which I did not verify.
- Time ramp uses client time. `getUpkeepMultiplier` uses `STATE.elapsedGameTime` (actions.js:50). In a server-verified game the ramp clock must be the server's game clock, or a client can slow it.
- Frame-rate dependence is handled: dt is clamped and scaled, so a paused game charges nothing (game.js:1119-1120). Frankendom's server tick must do the same charge per tick, not per frame.
- Not read: the DLQ drain (dlq.js:83, only the debit line), serverless per-invocation charge (handlers/serverless.js:18, only the debit line). Whether the upkeep toggle is visible in survival was not checked.

Best transferable idea: One booking function for every money movement, with a sale that reverses the purchase line instead of adding income, and a percent-of-price sink with a time ramp as a data field.
Decision (proposed): adapt — the ledger rule and percent-of-price repair fit our one-ledger and catalogue-field rulings; the client-side money counter and the per-frame drain on a browser clock do not, so the server must own the ledger and charge per tick.
Acceptance: a server test runs 1000 random buy, upgrade, repair, sell, heal and charge operations and asserts balance = start + income - expenses at each step; a second test asserts that with upkeep off, paid auto-repair neither heals nor charges.

Reuse tag: rewrite-from-idea (MIT; adapt the shape only, the sketch is clean-room)
Brief rule served: one ledger, server-verified; zones as data; catalogue fields (row 21)
