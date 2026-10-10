# electronicarts-CnC_Remastered_Collection (economy-trade, cell 1)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/FACTORY.CPP` | Licence: GPL-3.0 with Electronic Arts section 7 additional terms (LICENSE.md 601-613; FACTORY.CPP header lines 4-7) | C++ | symbol `FactoryClass::AI`

Checked: `FactoryClass::AI` read at FACTORY.CPP 231-296 (the closing braces after 296 not printed). `FactoryClass::Start` 536-554, `FactoryClass::Abandon` 579-600 (read to 600), `Cost_Per_Tick` 720-728, `StageClass::Graphic_Logic` and `Set_Rate` STAGE.H 69-78, and the house money functions HOUSE.CPP 1717-1808 were read in full. Not read: the body of `Time_To_Build`; the callers of `Abandon` and `Start` (listed by grep only, see section 6); the REDALERT copy (grep only: STEP_COUNT=54). Confidence: high for the factory path, medium for how callers use it. Camera: not applicable (economy cell).

## 1. Mechanism

- A factory builds one item by paying for it in installments over the build time, not up front. Price is fixed at setup: `Balance = object.Cost_Of() * house.CostBias` (FACTORY.CPP 402). The AI header comment says "Uses exact installment payment method." (FACTORY.CPP 229).
- Setup (`Start`, 536-554): the factory is idle until started. Build time is divided by the 108 steps, clamped to 1..255, and becomes the timer rate (549-552). A human player may start with no money (540, `House->IsHuman ||`). An AI starts only if it can pay the first installment (540).
- Each game tick `AI` runs (231). A human's factory of that kind runs `stages` passes (243-261), where `stages` is the number of factories of that kind; an AI gets one pass. Each pass calls `Graphic_Logic` (266): the timer counts down, and at zero the stage goes up by one and the timer resets to the rate (STAGE.H 74-77).
- On a step: `cost = Cost_Per_Tick()` (269), which is `Balance / (108 - stage)` with the stage already advanced, or the whole balance when the stage is 108 (720-728). The cost is capped at the remaining balance (271).
- Funds check (279): if `cost > Available_Money()`, the stage is set back one (280). Because the timer was reset at the expiry, the step is retried after one more full rate interval. Nothing is paid and no progress is lost. Otherwise the cost is spent (282) and taken off the balance (283).
- Completion (291): at stage 108 the factory suspends and spends whatever is left of the balance (292-295). With the arithmetic above the final step already takes the whole balance, so this spend is 0 in practice.
- Cancel (`Abandon`, 579-600): the owner is refunded the full price minus the unpaid balance (588-589), added to credits (`Refund_Money`, HOUSE.CPP 1805-1808). The factory is then reset to idle.
- Money (`HouseClass`, HOUSE.CPP 1717-1808): one player has two pools: harvested storage (`Tiberium`, capped by `Capacity`) and cash (`Credits`). `Available_Money` is the sum (1750). `Spend_Money` takes from storage first, then from cash (1775-1778). `Refund_Money` always adds to cash (1808). `Harvested` clamps storage at capacity (1722-1725) but adds the full harvest to the statistic counter (1727).
- Tick: the production loop is driven from the game's own per-tick AI call (the caller was not read). There is no fixed-step or accumulator in this function; the timer counts calls.

## 2. Key functions

- `FactoryClass::AI`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/FACTORY.CPP` 231-296. Installment loop, funds check with one-step stall, completion.
- `FactoryClass::Cost_Per_Tick`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/FACTORY.CPP` 720-728. Balance divided by remaining steps.
- `FactoryClass::Start`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/FACTORY.CPP` 536-554. Funds gate for AI only, timer rate from build time.
- `FactoryClass::Abandon`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/FACTORY.CPP` 579-600. Refund of paid part to cash.
- `StageClass::Graphic_Logic`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/STAGE.H` 71-79. Timer and stage advance.
- `HouseClass::Spend_Money` / `Refund_Money` / `Available_Money`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/HOUSE.CPP` 1771-1784, 1805-1809, 1747-1751.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pay the price as equal installments that shrink with the balance: `balance / remaining steps`, floored; the final step takes what is left | 108 steps (theirs, FACTORY.H 97; RA copy uses 54 by grep, RA:FACTORY.H 96) |
| Stall, do not go into debt: if the next installment is not affordable, undo the stage advance and retry after one rate interval | Rate = build time / 108, clamped 1..255 (theirs, FACTORY.CPP 549-550) |
| Cancel refunds everything paid so far, to the spendable pool | Full refund of paid part (theirs, FACTORY.CPP 588-589) |
| Price fixed at start: price x bias | Cost bias from difficulty: 1 default, multiplied by a house type and a difficulty entry (theirs, HOUSE.CPP 251, 261; HDATA.CPP 243 default 1) |
| Spend order: storage first, then cash; refunds go to cash | Two pools only in the donor (theirs, HOUSE.CPP 1775-1778); Frankendom has one ledger |

Sketch run (node on the VPS, the sketch not the donor): price 1000, bias 1, build 1080 ticks (rate 10), 300 credits. 9 per installment; 33 installments paid (297 spent, 3 left). Stalls every 10 ticks from stage 33 with 703 unpaid. A separate run cancelled at stage 100 with 70 unpaid refunded 930 to 1000 credits.

## 4. TypeScript sketch

simplified: one ledger (a single credits number) instead of the donor's storage-then-cash pair. It runs one installment pass per tick, not one pass per factory (the human `stages` multiplier is omitted). It omits the Debug_Instant_Build hook, SpecialItem, PurchasePrice bookkeeping, the Object and House lookups, and Has_Completed. The stall is written as "undo the stage advance and return" in the same order as the donor (timer, stage advance, price, funds check, undo). `Math.floor` stands in for C integer division (same for positive values). CostBias is passed in as a number. Test results above are from this sketch, not the donor.

```ts
// Licence: GPL-3.0 with EA section-7 terms (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const STEP_COUNT = 108;

interface Ledger { credits: number; }

interface Craft {
  price: number;     // full price x cost bias, fixed when the job is set up
  balance: number;   // part of the price not yet paid
  stage: number;     // installments taken so far, 0..STEP_COUNT
  rate: number;      // ticks between installment attempts (0 = idle)
  timer: number;     // ticks left before the next attempt
  suspended: boolean;
}

// Remaining balance split over the remaining steps. At the last step it returns the whole balance.
function costPerStep(c: Craft): number {
  const steps = STEP_COUNT - c.stage;
  return steps > 0 ? Math.floor(c.balance / steps) : c.balance;
}

// Set up a job. Humans may start with no funds; an AI waits until it can pay the first installment.
export function startCraft(price: number, costBias: number, buildTicks: number, ledger: Ledger, isHuman: boolean): Craft {
  const c: Craft = { price: Math.floor(price * costBias), balance: 0, stage: 0, rate: 0, timer: 0, suspended: true };
  c.balance = c.price;
  if (!isHuman && ledger.credits < costPerStep(c)) return c;
  const rate = Math.min(255, Math.max(1, Math.floor(buildTicks / STEP_COUNT)));
  c.rate = rate;
  c.timer = rate;
  c.suspended = false;
  return c;
}

export type TickResult = "idle" | "waiting" | "paid" | "done";

// Called once per server tick. Timer first, then the installment, then the funds check.
export function tickCraft(c: Craft, ledger: Ledger): TickResult {
  if (c.suspended || c.rate === 0) return "idle";
  c.timer -= 1;
  if (c.timer > 0) return "waiting";
  // The timer expired: one installment is due. Advance the stage, then price it.
  c.stage += 1;
  c.timer = c.rate;
  const cost = Math.min(costPerStep(c), c.balance);
  if (cost > ledger.credits) {
    // Cannot pay: undo the stage advance. Nothing is paid and no progress is lost; retry after `rate` ticks.
    c.stage -= 1;
    return "waiting";
  }
  ledger.credits -= cost;
  c.balance -= cost;
  if (c.stage === STEP_COUNT) {
    ledger.credits -= c.balance; // remainder, normally 0 here
    c.balance = 0;
    c.suspended = true;
    c.rate = 0;
    return "done";
  }
  return "paid";
}

// Cancel: everything paid so far goes back to the ledger.
export function abandonCraft(c: Craft, ledger: Ledger): number {
  const refund = c.price - c.balance;
  ledger.credits += refund;
  c.balance = 0;
  c.stage = 0;
  c.rate = 0;
  c.suspended = true;
  return refund;
}
```

## 5. Lands in

- TARGET `origins/economy/instalment-spend.ts` (new, proposed path; the Frankendom repo was not read): the one place that takes money from the one ledger over time, for a craft or a paid build. Parity-checklist row 21 (catalogue fields): price, build ticks and the step count belong in the catalogue. Row 21 is the closest fit, not an exact one: no checklist row covers the payment schedule itself, so this is named plainly rather than forced onto row 18 (loot and XP), which does not fit.
- today: none (no craft or cost code in Frankendom was read for this note).
- Reuse tag: rewrite-from-idea (GPL-3.0 with EA section 7 terms; clean-room only, shape not text)
- Brief rule served: one ledger (every craft payment and cancel refund goes through one spend and refund path); server-verified (the installment schedule runs on the server tick, not the client)

Best transferable idea: pay a craft in installments from the one ledger, stall with no debt when short, and refund the paid part on cancel.
Decision (proposed): adapt - the stall-and-retry and refund-to-spendable shape is right for crafting cost; the two-pool storage rule is rejected because Frankendom has one ledger, and the schedule must run on the server tick with integer credits.
Acceptance: a server test: a craft priced 1000 with 300 credits pays 9 per installment, stops with the ledger never below 0 when it cannot afford the next one, resumes when credits arrive, and cancelling it returns exactly the paid part; paid + refund + unpaid balance = price at every tick.

## 6. Gaps and risks

- Licence: GPL-3.0 with EA section 7 additional terms: no use of Electronic Arts or Command & Conquer trademarks, and no claim of affiliation. Clean-room only; no names, text or constants copied into Frankendom.
- Two pools: the donor spends harvested storage before cash and refunds to cash. Frankendom has one ledger, so the storage-first rule has no counterpart. Only the refund-to-spendable part transfers.
- Frame timing: the donor counts timer ticks inside the game's own AI call (driver not read). Frankendom must run the installment on the server tick with integer credits, and the client only shows the state.
- Silent stall: the stall path in `AI` sets the stage back and does nothing else (279-280). Frankendom needs an explicit "waiting for credits" event so the client can show it. A separate low-money speech check exists at HOUSE.CPP 1173 (grep only, not read).
- Speed scaling: a human with several factories runs several passes per tick (243-261), so speed and spend rate rise together. If Frankendom ever lets a stat speed up a craft, the price must not change with speed.
- Start rule differs: a human may start with no money and stall on step one; an AI may not start unless it can pay step one (540). Frankendom must pick one rule and test it.
- Price freeze: `Abandon` refunds against the cost bias read at cancel time (588), so a bias change mid-job changes the refund. The sketch freezes the price at start; Frankendom should too.
- Callers not read: `Abandon` is called from BUILDING.CPP 1134, 1188, 2653, 5309, HOUSE.CPP 2596, SIDEBAR.CPP 2535 (grep only). `Start` is called from BUILDING.CPP 1217 and HOUSE.CPP 2392 (grep only). `Set` (FACTORY.CPP 379) calls `Abandon` first (385, read), so starting a new build refunds the old one. Player-cancel behaviour was not read.
- Per-item values (build time, price, step count) are catalogue fields, not zone data. The schema allows only zone data or engine constant for `where`; `where` is set to engine constant for the rule and the catalogue field is named in section 5.
