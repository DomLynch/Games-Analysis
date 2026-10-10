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
