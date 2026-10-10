// Licence: GPL v2 (donor, not "or later"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const EPS = 0.001; // engine constant (donor uses 0.001f)

interface QueueElement {
  cost: number;          // cost of one item this turn (costs may move between turns)
  minTurns: number;      // fastest build time in turns
  blocksize: number;     // copies built together
  remaining: number;     // copies still wanted in this element
  progress: number;      // fraction of the current block already paid
  isBankTransfer: boolean; // element that moves group PP into the bank
}

interface Rules {
  frontloadPct: number;   // data, 0..30 (donor default 0)
  toppingUpPct: number;   // data, 0..30 (donor default 0)
  importLimited: boolean; // data (donor default false)
}

// Per-turn spend cap for one element: cost spread over the minimum build time, with optional leeway.
function perTurnCap(e: QueueElement, r: Rules): number {
  const frontFactor = r.frontloadPct * 0.01;
  const topFactor = Math.max(0, r.toppingUpPct * 0.01 - frontFactor);
  const blockCost = e.cost * e.blocksize;
  const turns = Math.max(e.minTurns, 1);
  const accumulated = e.progress * blockCost;
  const toCompleteElement = blockCost * e.remaining - accumulated;
  const toCompleteItem = blockCost - accumulated;
  const basic = blockCost / turns;
  const frontload = (1 + frontFactor / Math.max(turns - 1, 1)) * basic - 2 * EPS;
  const toppingLimit = basic + Math.min(topFactor * blockCost, basic - 2 * EPS);
  const topping = toCompleteItem < toppingLimit ? toCompleteItem : basic;
  return Math.min(toCompleteElement, Math.max(basic, frontload, topping));
}

interface Allocation { fromGroup: number; fromBank: number; allocated: number; }

// Spend order for one element: group PP first, then the bank, never above the cap.
function allocate(e: QueueElement, r: Rules, cap: number, groupPP: number,
                  bankAvail: number, bankAllowed: boolean, bankLimitLeft: number): Allocation {
  const bankForThis = bankAllowed ? bankAvail : 0;
  let alloc = Math.max(0, Math.min(cap, groupPP + bankForThis));
  if (e.isBankTransfer && r.importLimited) alloc = Math.min(alloc, bankLimitLeft);
  const fromGroup = Math.min(alloc, groupPP);
  const fromBank = Math.min(bankAvail, alloc <= fromGroup ? 0 : alloc - fromGroup);
  return { fromGroup, fromBank, allocated: Math.max(alloc, EPS) };
}

// Server turn step: pay the allocation, then complete if the block is fully paid.
// Returns true when one block completes. Overshoot is carried into the next block.
function spend(e: QueueElement, allocated: number): boolean {
  const blockCost = e.cost * e.blocksize;
  e.progress += allocated / Math.max(EPS, blockCost);
  if (blockCost - EPS > e.progress * blockCost) return false;
  e.progress -= 1;               // keep the overshoot for the next repetition
  if (e.progress < 0) e.progress = 0;
  return true;
}

// Bank update: unused PP flows in; the bank can pay out at most its capacity per turn.
function nextBank(starting: number, unusedPP: number, transferIn: number,
                  bankUsed: number, capacity: number, r: Rules): number {
  let contributions = unusedPP;
  if (contributions + transferIn > capacity && r.importLimited) {
    contributions = capacity - transferIn; // donor does not clamp this at zero (noted in the note)
  }
  return starting + contributions + transferIn - bankUsed;
}

export {};
