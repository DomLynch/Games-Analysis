# OpenXcom-OpenXcom (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Basescape/PurchaseState.cpp | Licence: GPL-3 | C++ | symbol PurchaseState::btnOkClick
Ranges opened and confirmed: btnOkClick 327-382, btnCancelClick 388-391, increaseByValue 512-598, decreaseByValue 614-638.

## 1. Mechanism
- Donor: OpenXcom base purchase screen (PurchaseState). The player builds a cart of soldiers, scientists, engineers, craft and items. The screen keeps a running total and a per-row count.
- Adding (increaseByValue 512-598, called with a change amount): the check runs once per call, not per unit. Running total plus one unit's cost must not exceed funds (line 517); then for soldiers, scientists and engineers one more person must fit in free quarters (the three share one counter), for craft one more must fit in free hangars, for items the stores must not be overfull after adding one unit's size. A failed check pops an error message and adds nothing. If it passes, the change is clamped down to what money (funds minus total, divided by row cost, line 552), quarters, hangars or store space (with a 0.05 allowance) can hold, then the row amount, the running total and the counters rise by that clamped change (lines 561-590). A zero-cost row would divide by zero at line 552.
- Removing (decreaseByValue 614-638) clamps the change to the row amount, lowers the counters, the row amount and the running total.
- Confirm (btnOkClick, 327): subtracts the running total from funds once, then walks the rows. Soldiers and craft get one Transfer per unit; scientists, engineers and items get one Transfer per row with the amount on it. Delivery time: soldiers use the rule's transfer time, falling back to the mod personnel time when it is zero; scientists and engineers use the personnel time; craft and items use the rule's transfer time. Soldiers are generated here (genSoldier, body not read) and each craft object is created here with status refuelling. Funds are not re-checked. The screen closes.
- Cancel (btnCancelClick, 388) only closes the screen. No money moves.
- Runs on player input in the base screen; the cart is local to the screen until confirm.

## 2. Key functions
- PurchaseState::btnOkClick | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Basescape/PurchaseState.cpp | 327-382 | pays the total once and turns each cart row into delivery jobs with delays.
- PurchaseState::increaseByValue | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Basescape/PurchaseState.cpp | 512-598 | the add check: funds, living quarters, hangars, store space.
- PurchaseState::decreaseByValue | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Basescape/PurchaseState.cpp | 614-638 | lowers the count and the running total (the total is reduced at line 636).
- PurchaseState::btnCancelClick | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Basescape/PurchaseState.cpp | 388-391 | closes the screen; nothing is paid.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Cart: check total against funds on every add call, clamp the add to what money and room allow, pay once on confirm (PurchaseState.cpp:517, 552, 329) | Running total in the screen (theirs, UI) |
| Capacity checks per item kind before an add | Living quarters, hangars, store size (theirs, base rules; checks at 529, 535, 542, store allowance 0.05 at 581) |
| Each purchased row becomes a delivery job with its own delay | Transfer time per rule; personnel time for people (theirs, mod data; PurchaseState.cpp:341-343, 350, 355) |
| Cancel changes nothing | n/a |

## 4. TypeScript sketch
Licence: GPL-3 (OpenXcom-OpenXcom). Clean-room: written from the mechanism, no donor lines.
simplified: one shared "people" counter for soldier/scientist/engineer, craft and items kept as two more counters; the store allowance of 0.05, the UI error state and the per-unit soldier/craft object creation are omitted (confirm emits one job per row). Soldier transfer time falls back to a personnel time when the rule's time is zero.
```ts
type Kind = "soldier" | "scientist" | "engineer" | "craft" | "item";
interface Row { kind: Kind; cost: number; delayDays: number; amount: number; size: number; }
interface Base { quartersFree: number; hangarsFree: number; storeFree: number; }
interface Used { people: number; craft: number; store: number; }

// One check per call, then clamp the change to what money and room allow, as the donor does.
function addUnits(funds: number, total: number, row: Row, base: Base, used: Used, change: number): { added: number; error: string | null } {
  if (change <= 0) return { added: 0, error: null };
  if (total + row.cost > funds) return { added: 0, error: "not enough money" };
  const isPerson = row.kind === "soldier" || row.kind === "scientist" || row.kind === "engineer";
  if (isPerson && used.people + 1 > base.quartersFree) return { added: 0, error: "no living space" };
  if (row.kind === "craft" && used.craft + 1 > base.hangarsFree) return { added: 0, error: "no free hangar" };
  if (row.kind === "item" && used.store + row.size > base.storeFree) return { added: 0, error: "not enough store space" };
  let n = row.cost > 0 ? Math.min(Math.trunc((funds - total) / row.cost), change) : change;
  if (isPerson) n = Math.min(base.quartersFree - used.people, n);
  else if (row.kind === "craft") n = Math.min(base.hangarsFree - used.craft, n);
  else if (row.size > 0) n = Math.min(Math.trunc((base.storeFree - used.store) / row.size), n);
  if (n <= 0) return { added: 0, error: null };
  row.amount += n;
  if (isPerson) used.people += n; else if (row.kind === "craft") used.craft += n; else used.store += n * row.size;
  return { added: n, error: null };
}

// Confirm pays the cart total once, with no re-check, and turns each non-empty row into a job.
function confirm(funds: number, rows: Row[]): { funds: number; jobs: { kind: Kind; amount: number; days: number }[] } {
  const total = rows.reduce((s, r) => s + r.cost * r.amount, 0);
  const jobs = rows.filter(r => r.amount > 0).map(r => ({ kind: r.kind, amount: r.amount, days: r.delayDays }));
  return { funds: funds - total, jobs };
}
```

## 5. Lands in
- Frankendom file: origins/shops/shop.ts (the shop screen) and origins/server/shop-buy.ts (the server purchase, which should be the one that pays and writes the ledger).
- Parity-checklist row: row 18 (loot roll and XP / career award: the server inventory grant the purchase must end in) and row 21 (price, size and delivery time are catalogue fields).
- Usable rule: one-character/one-ledger rule (the server confirms; the client cart is a view).
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- The donor confirm sets funds directly and does not re-check them. If funds changed between add and confirm, funds can go negative. Frankendom must check on the server at confirm time.
- Delivery jobs are local to the base. Frankendom's delivery (a loot or contract grant) must land in the server inventory on the server tick (one ledger).
- Capacity limits are checked on add only (confirm 327-382 does not re-check). A later change to capacity is not re-checked.
- A zero-cost row divides by zero in the clamp (line 552); the port needs an explicit free-item rule.
- Soldier creation (genSoldier) happens at confirm. Whether it is random was not read; if it is, Frankendom needs creation on the server with a recorded seed.
- GPL-3: mechanism only.
