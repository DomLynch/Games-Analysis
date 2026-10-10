# freeorion-freeorion (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/Empire/ProductionQueue.cpp` (`CalculateProductionPerTurnLimit` 91-125, `CalculateNewStockpile` 127-164, `SetProdQueueElementSpending` 180-345, `ProductionQueue::Update` 674-, `StockpileCapacity` 581-593) and `/mnt/frankendom-donors/freeorion-freeorion/Empire/Empire.cpp` (`Empire::CheckProductionProgress` 2397-2633) | Licence: GPL v2 (not "or later"): README.md 148-150 says the source code is GPL v2; default/COPYING line 9 says "Everything else is licensed under the GNU General Public License, Version 2." No per-file licence header was read in ProductionQueue.cpp or Empire.cpp | C++ | symbol `CalculateProductionPerTurnLimit` / `SetProdQueueElementSpending` / `Empire::CheckProductionProgress`

Checked: Read in full: `SetProdQueueElementSpending` (ProductionQueue.cpp 180-345), `CalculateProductionPerTurnLimit` (91-125), `CalculateNewStockpile` (127-164), `StockpileCapacity` (581-592), the `Update` entry and its bank lines (674-700, 755-775), `Empire::CheckProductionProgress` (Empire.cpp 2397-2633; 2513-2530 and 2531-2556 read). Callers: `CalculateProductionPerTurnLimit` is called only from `SetProdQueueElementSpending` (ProductionQueue.cpp 274). `SetProdQueueElementSpending` is called from `Update` at 763 (real pass) and at 837 (forecast). `CheckProductionProgress` is called only from server/ServerApp.cpp 4522 (grep over the tree). Not read: `Update` lines 700-754 (queue-to-group mapping), the forecast body 800-870 (call sites only), the item-creation code after 2636, the pool update around Empire.cpp 2880-2881 beyond the one line, the enclosing server turn function, the UI. Confidence: high for the per-turn cap and the spend order (read end to end); medium for the bank, because I did not trace the pool update end to end. This is not a camera topic.

## 1. Mechanism

- A production queue spends PP (production points) on queue elements. Two parts: a per-turn spend cap per element, and a bank (the "stockpile") that takes unused PP and pays it back later, with a per-turn withdrawal cap.
- Per-turn cap (`CalculateProductionPerTurnLimit`, ProductionQueue.cpp 91-125). Block cost = unit cost x blocksize (100). Basic cap = block cost / max(min build turns, 1) (101, 107). Two leeway factors, both zero by default (rule defaults; see Section 3): frontload raises the basic cap by `(1 + f / max(turns-1, 1))` (109-110); topping-up lets the cap rise to `basic + min(t x block cost, basic - 2 EPS)` when the item is nearly finished (111-114). The element cap is `min(PP still needed for the element, max(basic, frontload, topping))` (115-117).
- Allocation (`SetProdQueueElementSpending`, 180-345). Per element, in queue order: the bank can be used only if the element allows it (282-283); allocation = `max(0, min(cap, group PP + bank for this))` (285-287); a bank-transfer element is further limited when the import rule is on (289-294); `allocated_pp = max(allocation, EPS)` (302); group PP is drawn first, then the bank for the rest (305-313). In the real pass the progress is not advanced here: `progress` is advanced only in the forecast branch (336-337). The header says so: `Update` "Does not actually "spend" the PP" (ProductionQueue.h 210-211).
- Bank update (`CalculateNewStockpile`, 127-164). Unallocated PP per resource group (excess above EPS, 145-151) flows in. If the import rule is on and inflow plus transfers exceed capacity, inflow is cut to `capacity - transfer` (159-161; no clamp at zero is applied there). The new bank is `start + inflow + transfers - used` (163). Bank capacity is the sum of the planets' stockpile meters (`StockpileCapacity`, 581-592). Withdrawal per turn is `min(bank in pool, capacity)` (697), so the bank pays out at most its capacity each turn.
- Growth of capacity: each planet's stockpile meter is set by a species macro that moves it toward its max by at most 1 per turn (default/scripting/species/species_macros/stockpile.py 40-44). The max is set from population (`SetMaxStockpile`, lines 17-28 and 55; not traced further).
- Spend, server side (`Empire::CheckProductionProgress`, Empire.cpp 2397; called from server/ServerApp.cpp 4522), per queue element, in this order: (a) cost x blocksize (2501); (b) progress += allocated PP / cost (2507). This happens before any gate. (c) Build location and system must exist (2532-2545). (d) Location condition is re-checked before each item, so an item placed earlier in the turn can block a later one (2547-2553). (e) Progress gate: complete only if `cost - EPS <= progress x cost` (2557); otherwise skip. (f) Consumption gate: the specials and meters the item consumes must cover blocksize copies, else skip with progress kept (2561-2590). (g) Carry: progress -= 1, clamped at 0 (2593-2603), so any overshoot goes to the next copy. (h) Consumption is deducted from the planet's special capacity and meter (2609-2633). (i) The object is created (2636 on; not read).
- Tick: the spend is once per turn, on the server (ServerApp.cpp 4522). `ProductionQueue::Update` is a recalculation that does not spend (ProductionQueue.h 207-212); whether the client also calls it was not checked.

Worked numbers (from the formulas above, not run). (1) Cost 60, minimum build time 5, one copy, leeway factors 0: basic cap = 60/5 = 12 per turn; it completes on the fifth turn with progress exactly 1.0 and no carry. (2) Same item, two copies, frontload 10 percent: cap = (1 + 0.1/4) x 12 - 0.002 = 12.298 per turn. After four turns progress is 0.8199. On turn five the cap is still 12.298 (the topping-up term is 10.81, below the frontload term, so the frontload term wins), so progress reaches 1.0249, the copy completes and 0.0249 x 60 = 1.49 PP carries into the second copy. This is the overshoot case: the cap can exceed what the current copy still needs. (3) Bank: group PP 5, bank 100, bank capacity 20: allocation = min(12, 5 + 100) = 12, drawn as 5 from the group and 7 from the bank (7 is below the 20 withdrawal limit).

## 2. Key functions

- `CalculateProductionPerTurnLimit`: `/mnt/frankendom-donors/freeorion-freeorion/Empire/ProductionQueue.cpp` 91-125. The per-turn cap: basic, frontload and topping-up leeway. Pure function of the element, cost and min turns.
- `CalculateNewStockpile`: `/mnt/frankendom-donors/freeorion-freeorion/Empire/ProductionQueue.cpp` 127-164. The bank's next value, with the import cap.
- `SetProdQueueElementSpending`: `/mnt/frankendom-donors/freeorion-freeorion/Empire/ProductionQueue.cpp` 180-345. The allocation loop: group PP first, then bank, capped; progress only in the forecast.
- `StockpileCapacity`: `/mnt/frankendom-donors/freeorion-freeorion/Empire/ProductionQueue.cpp` 581-593. Bank capacity is the sum of planet stockpile meters.
- `Empire::CheckProductionProgress`: `/mnt/frankendom-donors/freeorion-freeorion/Empire/Empire.cpp` 2397-2633. The server spend step: progress, location check, progress gate, consumption gate, carry, consumption deduction.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Spend cap per item = cost spread over the minimum build time | Min build turns per item (theirs, ProductionQueue.cpp 107) |
| Leeway for costs that rise mid-build: frontload and topping-up, each a percent of cost | Frontload and topping-up default 0.0, range 0 to 30 percent (theirs, rule registration ProductionQueue.cpp 41-46 and 47-52; the default 0.0 is on lines 44 and 50; the range line is 46 and 52) |
| Epsilon for float comparisons | EPS 0.001 (theirs, ProductionQueue.cpp 32; Empire.cpp uses the same EPSILON) |
| Overshoot carries into the next copy | Subtract 1 block, clamp at 0 (theirs, Empire.cpp 2597-2603) |
| Bank with a withdrawal cap per turn | Withdrawal limited to the sum of planet stockpile meters (theirs, ProductionQueue.cpp 581-592, 697) |
| Import into the bank can be capped | Rule off by default (theirs; the Add call at ProductionQueue.cpp 36-39 passes `false` as the default; the parameter order is in util/GameRules.h 139-140) |
| Bank capacity grows by at most 1 per turn per planet | Step of 1 (theirs, species_macros/stockpile.py 42) |
| Completion needs consumed inputs on hand | Input check per copy (theirs, Empire.cpp 2561-2590; deducted 2609-2633) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one element (the per-turn cap from min time with leeway, then allocation from group PP and then the bank, then progress from the allocation, then the completion gate with overshoot carry) and the bank update. It omits: the paused and to-be-removed skip; the location and producibility checks (Empire.cpp 2532-2553); the resource-sharing groups (one group is assumed, and the bank's unallocated PP is passed in as one number, where the donor sums the excess per group at 145-151); the specials and meter consumption gate and deduction (2561-2590, 2609-2633); the creation of the item (2636 on, not read); the forecast pass (337); `progress_memory` and `blocksize_memory`; and the per-element loop over the queue. It does not reorder the donor's steps, except that the sketch's `spend()` is the progress and gate part only; in the donor, progress is written at 2507 before the location and consumption gates.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/economy/craft-queue.ts` (new, proposed; the Frankendom repo was not read for this note): the per-item cap (cost over min craft time, with leeway as data) and the carry of overshoot into the next copy. The bank, if it is kept at all, must be a balance in the one ledger, not a second pool (see Section 6).
- Parity row: 21 (catalogue fields). The cap inputs (cost, min time, blocksize) are catalogue fields. This is the closest row and not a clean fit: row 21 is about catalogue data, not a per-tick spend. The per-tick spend belongs to the server tick sub-line of row 18 / post-K item 3 ("server tick: fixed step, input intake, per-tick NPC budget"), which is a timing rule, not a spend rule. Flagged for Lead.
- Reuse tag: rewrite-from-idea (GPL v2; clean-room only)
- Brief rule served: one ledger and server-verified progress and completion (the spend step runs on the server, ServerApp.cpp 4522; the forecast is client-side); rules 7-9 n/a

Best transferable idea: a craft can absorb at most its cost divided by its minimum craft time per tick, with overshoot carried into the next copy, and the server alone decides completion.
Decision (proposed): adapt — the cap and the carry transfer as a shape, expressed in ticks and as per-item data. Reject the bank as a separate pool, because the one-ledger ruling does not allow a second balance; if a buffer is wanted it becomes a row in the one ledger.
Acceptance: a server test asserts that a 60-cost craft with minimum time 5 takes 12 per tick and finishes on tick 5 with the ledger debited 60 in total, and that a two-copy order with 10 percent frontload finishes its first copy on tick 5 and carries 1.49 into the second copy.

## 6. Gaps and risks

- GPL v2 (not "or later"): clean-room only. The sketch is written from the mechanism.
- One ledger: the donor's bank is a second pool beside the queue (the "industry stockpile" is set from the queue's expected amount at Empire.cpp 2881). Frankendom's ruling is one ledger, so the bank cannot be copied as a parallel balance. The cap and carry do not need it.
- Turns: the donor counts minimum build time in turns (`build_turns`, 101). Frankendom's fights run in real time, so the minimum must be in ticks or seconds, held as data. Do not copy the turn unit.
- Progress is written before the gates: Empire.cpp 2507 adds progress before the location check (2550), the progress gate (2557) and the consumption gate (2561-2590). A blocked completion keeps the progress, so an item can be paid up to the cost while it cannot complete. Whether the PP is refunded when a gate blocks was not traced (the pool update was not read end to end). Frankendom must decide the order and write a test for it.
- Input consumption happens at completion (2609-2633), after the carry (2597). If the donor's gate fails, the inputs stay on hand; Frankendom needs the same property, or a refund of the reserved inputs.
- Import cap: when the rule is on, inflow is set to `capacity - transfer` (ProductionQueue.cpp 161) with no clamp at zero. If transfers exceed capacity this goes negative. Not run; any port must clamp it.
- Leeway factors (frontload, topping-up) exist for mid-build cost increases (ProductionQueue.cpp 60-84). Frankendom has no cost drift in a fight, so they are probably not needed; if kept, they are data with default 0.
- Server-verified: progress and completion run on the server (ServerApp.cpp 4522); the forecast in `Update` is a display only (ProductionQueue.h 207-212). That matches the ruling.
- Not read: the item creation (2636 on), the pool update beyond line 2881, `Update` 700-754, the forecast body, and the UI. The bank's full update path (client and server) is the least certain part of this note.
