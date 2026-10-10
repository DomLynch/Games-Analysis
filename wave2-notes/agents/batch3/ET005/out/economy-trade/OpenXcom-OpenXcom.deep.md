# OpenXcom-OpenXcom (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Basescape/PurchaseState.cpp` | Licence: GPL-3.0-or-later (file header, lines 6-9: "either version 3 of the License, or (at your option) any later version"; LICENSE.txt: "Version 3, 29 June 2007") | C++ | symbol `PurchaseState::increaseByValue`

Checked: `PurchaseState.cpp` was read from line 1 to 685 except lines 13-29 (the includes, not read); lines 1-12 are the licence header. The functions read: constructor (57-221), `btnOkClick` (327-382), the hold-repeat handlers (397-506), `increaseByValue` (512-598), `decreaseByValue` (614-638), `updateItemStrings` (643-675). Not read: the callers that push this screen, the `Transfer` class and the rule getters (`getBuyCost`, `getTransferTime`, `getSize`, `getPersonnelTime`, `getScientistCost`, `getEngineerCost`), and the `storesOverfull` helper. So the rule values (prices, transfer days, sizes, personnel time) are not known; only the rules that read them are. Confidence: high for the cart and commit path, because every line of it was read; the rest of the economy (funding, manufacture, sell) was not part of this cell. Camera: not applicable.

Best transferable idea: Check funds and capacity against the running cart total at every add, clamp the quantity to what remains, write the balance once at commit, and queue each row's delivery after its transfer time.
Decision (proposed): adapt. Keep the add-time money check with the quantity clamp (the player sees how many they can afford) and the single balance write, and add the commit-time re-check that this donor does not do. Queue deliveries with the catalogue delivery time. Reject the base capacity pools (quarters, hangars, store space) unless Frankendom gets a capacity-limited inventory, and reject the float store size.
Acceptance: A server test: a cart of 10 units at a price of 25 with 100 funds clamps to 4 units and a total of 100; commit writes the balance once to 0 and queues one delivery per row after its catalogue delivery time in server ticks; if funds drop to 60 before commit, commit returns a funds error and changes no state.

## 1. Mechanism

- Build the list (constructor, 57-221). Soldier rows need a non-zero buy cost and the research requirement (152-154). Scientist and engineer rows always appear, at the mod's cost times 2 (163-180: `getScientistCost() * 2` at 164, `getEngineerCost() * 2` at 173). Craft rows follow the same buy-cost and research test (185-187). Item rows use the item's buy cost and the stock already in the base (200-202).
- Add units (`increaseByValue`, 512-598). Order of steps:
  (a) Funds test for one unit: if `_total + cost > funds`, an error is set (517-520).
  (b) Capacity test for one unit: personnel need a free quarter (529), a craft needs a free hangar (535), an item needs store space for its size (542). Any failure sets an error (529-546).
  (c) If there is no error: the quantity is clamped by money, `maxByMoney = (funds - total) / cost` (552-554); then by capacity: quarters (561-562), hangars (568-569), or store space, `(freeStores + 0.05) / size` (577-583).
  (d) The amount grows by the clamped change; the cart total grows by cost x change (588-589); for items the store load is a float that grows by size x change (584).
  (e) On error, the repeat timer stops and an error screen is pushed (592-596).
- Remove units (`decreaseByValue`, 614-638): the change is capped at the amount held (617); the total falls by cost x change (636); the pools fall by the same amount.
- Hold to repeat (217-220, 397-506). The first press adds or removes one unit. A repeat timer starts at 250 (217, 219). Once running, `increase()` and `decrease()` set the interval to 50 (503-504; 605-606). A right click adds or removes the maximum at once (422, 460).
- Commit (`btnOkClick`, 327-382):
  (a) One balance write: funds = funds - total (329). No funds test is made here.
  (b) For each row with amount > 0 (332): soldiers get one transfer per unit (338-346), with the rule's transfer time, or the personnel time if that is 0 (341-343); scientists and engineers get one transfer per row at the personnel time (349-358); crafts get one transfer per unit at the rule's time, with status set to refuelling (359-368, 365); items get one transfer per row with the amount (370-377).
  (c) The screen is popped (381).

## 2. Key functions

- `increaseByValue`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Basescape/PurchaseState.cpp` 512-598. The add path: check, clamp, update.
- `decreaseByValue`: same file, 614-638. The remove path.
- `btnOkClick`: same file, 327-382. The commit: one write, then one transfer per row or unit.
- Constructor row build: same file, 57-221, with the price fields at 154, 164, 173, 187, 202.
- Hold-repeat: same file, 217-220 (timers) and 501-506 (`increase`, interval 50).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Cart total checked against funds at every add | Test is `_total + cost > funds` (517) |
| Quantity clamped to what funds allow | Floor division of money left by unit cost (552-554) |
| Capacity pools checked per add and clamped | Quarters, hangars and store space (529-583) |
| Float store space with tolerance | 0.05 added to free space (581); a separate 0.05 threshold decides when the store load shows (666) |
| Balance written once at commit | `funds - total` (329) |
| Delivery delay per row | Rule transfer time (341, 363, 373); personnel default when 0 (343) |
| Hold-to-repeat rates | 250 start (217, 219), 50 repeat (504) |

Values: the buy costs, transfer days, sizes and personnel time are rule data and were not read. The scientist and engineer prices are the mod cost times 2 (164, 173); why the factor is 2 was not read.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's add order (funds test, capacity test, clamp by money, clamp by capacity, then update the total and the pool use). It differs in three ways. First, the commit re-checks the funds against the current balance, which the donor does not do. Second, a zero unit cost is not divided by (the donor divides at 552 and would fail on a zero cost). Third, pools are keyed by name rather than fixed to three fields. It omits the hold-repeat timers and error screens, the float store load and its tolerance, the personnel and craft creation, the refuelling status, the category filter and the storage-overfull helper.

```ts
// Licence: GPL-3.0-or-later (donor, OpenXcom). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Row {
  id: string;
  pool: string;          // capacity pool this row uses (for example personnel, craft, store)
  cost: number;          // price per unit
  slots: number;         // capacity used per unit (0 = no capacity check)
  transferTime: number;  // delivery delay in days after commit
  amount: number;        // units in the cart
}

class Cart {
  total = 0;             // cart cost, kept in step with every add and remove
  private used = new Map<string, number>();

  constructor(private balance: number, private free: Map<string, number>) {}

  private usedIn(pool: string): number { return this.used.get(pool) ?? 0; }
  private freeIn(pool: string): number { return this.free.get(pool) ?? 0; }

  // Add up to `want` units. Funds and capacity are checked here, before the commit.
  add(row: Row, want: number): { added: number; error?: 'funds' | 'space' } {
    if (this.total + row.cost > this.balance) return { added: 0, error: 'funds' };
    if (row.slots > 0 && this.usedIn(row.pool) + row.slots > this.freeIn(row.pool)) return { added: 0, error: 'space' };
    const byMoney = row.cost > 0 ? Math.floor((this.balance - this.total) / row.cost) : want;
    const bySpace = row.slots > 0 ? Math.floor((this.freeIn(row.pool) - this.usedIn(row.pool)) / row.slots) : want;
    const n = Math.max(0, Math.min(want, byMoney, bySpace));
    row.amount += n;
    this.total += row.cost * n;
    this.used.set(row.pool, this.usedIn(row.pool) + row.slots * n);
    return { added: n };
  }

  remove(row: Row, n: number): void {
    const k = Math.min(n, row.amount);
    row.amount -= k;
    this.total -= row.cost * k;
    this.used.set(row.pool, this.usedIn(row.pool) - row.slots * k);
  }

  // Commit: re-check the funds against the current balance, then one balance write and one delivery entry per row.
  commit(rows: Row[], balance: number): { balance: number; deliveries: { id: string; units: number; day: number }[] } | 'funds' {
    const total = rows.reduce((s, r) => s + r.cost * r.amount, 0);
    if (total > balance) return 'funds';   // re-checked at commit; the donor does not do this here
    return {
      balance: balance - total,            // one balance write
      deliveries: rows.filter(r => r.amount > 0).map(r => ({ id: r.id, units: r.amount, day: r.transferTime })),
    };
  }
}

export {};
```

Typecheck: the sketch is `/private/tmp/p2/wave2-haiku/batch3/ET005/work/cart-OpenXcom.ts`, copied to the VPS at `/tmp/cart-OpenXcom.ts` and run with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `origins/server/shop-cart.ts` (new): the server side of a buy action (the cart check at add time, the re-check and single balance write at commit, and the delivery queue). Proposed, not an existing file.
- Parity row: 21 (catalogue fields). The buy cost, delivery time and size used here are catalogue fields that the donor reads from its rule objects; a Frankendom version reads them from the catalogue. Closest row only: no parity row covers shops and carts directly.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one ledger, server-verified: the commit re-checks funds on the server, the donor's client does not); licence rule 7 (GPL-3.0-or-later, shape only).

## 6. Gaps and risks

- The donor trusts the screen. `btnOkClick` writes the balance and queues transfers with no funds or capacity test (327-382). Frankendom must re-check on the server at commit, which the sketch does.
- Division by zero. `increaseByValue` divides by the unit cost (552) whenever no error is set. Scientist and engineer rows are added without a non-zero check (163-180), so a mod cost of 0 would divide by zero. The mod defaults were not read; Frankendom must reject a zero price at catalogue load.
- The scientist and engineer price is the mod cost times 2 (164, 173). Why 2 was not read. Do not copy the factor without knowing its reason.
- Capacity pools are base-management concepts (quarters, hangars, store space). Frankendom has no bases, so reject them unless an inventory has a slot or weight limit. The store load is a float with a 0.05 tolerance (577-581); use integers in the Frankendom version.
- Money is clamped by floor division, so the last unit is never partially paid. This is correct for whole units, but the server must make the same floor so the client and server agree.
- Delivery in the donor is a separate transfer object, one per unit for soldiers and crafts and one per row for items and personnel groups (338-377). A Frankendom delivery queue should pick one rule and state it in the acceptance test. The `Transfer` class was not read, so its timing rules are unknown.
- The hold-to-repeat timers are client UI (250 then 50, 217-220, 503-504). Keep them on the client only; they are not part of the server rule.
- Licence: GPL-3.0-or-later. Clean-room only. The sketch is written from the mechanism.
