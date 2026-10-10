# miki151-keeperrl (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/miki151-keeperrl/workshops.cpp` (with `workshops.h`, `workshop_item.cpp`, `collective.cpp` 996-1062 and 1612-1650) | Licence: GPL-2.0 (repo LICENSE and COPYING.txt are "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"; workshops.cpp has no file header, so no "or later" wording is visible for it; a few other files say "or any later version") | C++ | symbols `Workshops::Type::queue`, `Workshops::Type::updateState`, `Workshops::Type::unqueue`, `Workshops::Type::addWork`

Checked: Read in full: workshops.cpp 1-148; workshops.h 1-50; workshop_item.cpp 1-42; creature_debt.h and creature_debt.cpp 1-38. Read in part: collective.cpp 632-641 (per-update `updateState` call), 996-1062 (resource ledger), 1523-1530 and 1612-1650 (work actions); item.cpp 340-362; player_control.cpp 1055-1092, 2784-2868 (queue, unqueue and requeue callers) and 1999; player.cpp 316-357; creature_factory.cpp 528-600 (shop debt). Callers of `queue`: player_control.cpp:2793 and 2864. Callers of `unqueue`: player_control.cpp:2860. Callers of `updateState`: collective.cpp:640 and workshops.cpp:50, 71. Callers of `Type::addWork`: collective.cpp:1636 only. Not read: furnace.cpp (the other queue), the `getEfficiency` helper, the runes/upgrade path beyond workshops.cpp 81, 91-102 and 121-123, `numResource`, and `immigration.cpp` beyond the grep lines. Confidence: high for the queue, pay, refund and progress rules and for "the debt is only a claim"; medium for the shop path. camera_scope: not applicable.

Best transferable idea: a crafting queue that books the cost as debt when an item is queued, pays when the stock covers it, refunds only a paid item that has made no progress, and gives each work tick to the first ready item in queue order.
Decision (proposed): adapt - keep the states (queued and unpaid, paid, in progress, done) and the refund-before-progress rule for a server-side crafting queue; make the queued cost a real hold in the one ledger, because the donor's debt is only a claim that other spenders ignore (see section 6). Reject the per-workshop debt table as a second ledger.
Acceptance: a server test with 10 gold in stock queues a craft costing 10 gold, then asserts that a separate 10-gold spend is refused while the craft is queued, that unqueueing before progress returns exactly 10 gold, and that unqueueing after progress returns 0.

## 1. Mechanism

- What it is: each workshop type (a furniture type that crafts, e.g. the forge) owns a list of recipe options, a queue of crafts, and a debt table keyed by resource (workshops.h:19-42; workshops.cpp 20-33). A recipe's cost is the workshop's override or, if none, the item's crafting cost (workshop_item.cpp:30; item.cpp:351-352).
- Queue (workshops.cpp 47-51). (a) `addDebt(cost)`: the resource's debt rises by the cost (48). (b) The item is inserted at the chosen index as unpaid, with the minimum skill from the workshop info (49; player_control.cpp:2791-2793). (c) `updateState` runs at once (50).
- Pay (workshops.cpp 53-60). For each queued item in order: if it is unpaid and the collective has the cost in stock, take the stock (57), remove the cost from debt (58) and mark it paid. The collective calls this for every workshop in its update code (collective.cpp:639-640; the enclosing function name was not read). The loop does not stop at the first unaffordable item, so payment is not strictly first in, first out.
- Unqueue (workshops.cpp 62-75). A paid item with no progress (`state == 0`) returns its cost to the collective (65-67). An unpaid item releases its debt (68-69). Either way the item is removed and `updateState` runs again (70-71). A paid item with progress is not refunded.
- Work (workshops.cpp 104-133). Called once per minion work action (collective.cpp:1636-1637). The loop goes over the queue in order (106). An item counts as ready if it is paid or the stock covers it, and the minion's craft skill is at least its minimum (79-82, 108). A ready unpaid item is paid now (109-113). Progress grows by `amount * 0.15 / workNeeded` (114-115). When progress reaches 1 the item is built with its prefix and runes (118-123), removed from the queue (124) and returned. Otherwise the loop stops (128), so only one item per call gets work.
- Work amount (collective.cpp 1636-1637): `efficiency * craftingSkill * 0.02 * crafting speed * speed boost`, where the speed boost is the largest multiplier, from the middle-layer furniture on the eight neighbouring tiles, default 1.0 (1630-1635). `efficiency` is usage time times `getEfficiency(c)` times luxury and, if the furniture needs light, lighting (collective.cpp 1525-1528; `getEfficiency` not read).
- Debt is a claim, not a hold. `Collective::getDebt` adds the workshop debt to the construction debt and subtracts unfinished task costs (collective.cpp 1004-1011). The only read of the free amount is the workshop panel, which shows `numResourcePlusDebt` (collective.cpp 1000-1001; player_control.cpp 1999).

## 2. Key functions

- `Workshops::Type::queue`: `/mnt/frankendom-donors/miki151-keeperrl/workshops.cpp` 47-51. Books the debt, inserts, pays what is affordable.
- `Workshops::Type::updateState`: `/mnt/frankendom-donors/miki151-keeperrl/workshops.cpp` 53-60. The pay step; called from `collective.cpp:640` each update.
- `Workshops::Type::unqueue`: `/mnt/frankendom-donors/miki151-keeperrl/workshops.cpp` 62-75. The refund rule.
- `Workshops::Type::addWork`: `/mnt/frankendom-donors/miki151-keeperrl/workshops.cpp` 104-133. Ready check, pay on start, progress, completion, one item per call.
- `Collective::hasResource` / `takeResource` / `returnResource`: `/mnt/frankendom-donors/miki151-keeperrl/collective.cpp` 1013-1062. The stock ledger: credit first, then stored items; a return goes to a storage position or to credit.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Craft progress per work call = work x 0.15 / work needed | prodMult 0.15 (workshops.cpp:77, 114) |
| Work per minion action = efficiency x skill x 0.02 x speed x boost | 0.02 (collective.cpp:1636); boost default 1.0 (1630-1635) |
| Craftable needs stock (or prior payment) and skill >= minimum | canCraft (workshops.cpp 79-82); minimum from workshop info (player_control.cpp:2791-2792) |
| Refund before progress: full cost if progress is exactly 0, nothing after | workshops.cpp:66-67 |
| Debt is never negative | CHECK at workshops.cpp:32 |
| Consistency: debt equals unpaid queued costs | workshops.cpp:35-45, run only from addUpgrade (96) and addWork (125, 131), not from queue or unqueue |
| Cost default: workshop override, else item crafting cost | workshop_item.cpp:30; item.cpp:351-352 |

## 4. TypeScript sketch

simplified: one resource map instead of storage positions and credit (collective.cpp 1026-1044, 1061). Omitted: the runes and upgrade requirement (workshops.cpp 81, 91-102), the prefix (121-122), the consistency check (35-45), the furnace queue, the speed boost and efficiency (taken as inputs), the rune return on unqueue (70-72) and the throw on an unfunded take (the donor FATALs, collective.cpp 1045). Order kept from the donor: enqueue books the debt then pays what it can; pay sets the debt back down; unqueue refunds only unstarted paid items; work gives the first ready item all the work, pays it if still unpaid, and completes it at progress 1.

```ts
// Licence: GPL-2.0 (donor; repo LICENSE and COPYING.txt are GPL Version 2, June 1991). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cost { id: string; value: number; }
interface QueuedItem {
  name: string;
  cost: Cost;
  minSkill: number;
  workNeeded: number;
  paid: boolean;
  progress: number;
}

// One ledger of stock per resource. Debt is kept separately so a queued craft can be shown as a claim.
class Stock {
  private amount = new Map<string, number>();
  get(id: string): number { return this.amount.get(id) ?? 0; }
  has(c: Cost): boolean { return this.get(c.id) >= c.value; }
  take(c: Cost): void {
    if (!this.has(c)) throw new Error("not enough " + c.id);
    this.amount.set(c.id, this.get(c.id) - c.value);
  }
  give(c: Cost): void { this.amount.set(c.id, this.get(c.id) + c.value); }
}

class Workshop {
  private queue: QueuedItem[] = [];
  private debt = new Map<string, number>(); // cost of queued items not yet paid, per resource
  constructor(private stock: Stock, private readonly prodMult = 0.15) {}

  private addDebt(c: Cost, delta: number): void {
    const d = (this.debt.get(c.id) ?? 0) + delta;
    if (d < 0) throw new Error("debt below zero for " + c.id);
    this.debt.set(c.id, d);
  }

  totalDebt(id: string): number { return this.debt.get(id) ?? 0; }

  enqueue(item: Omit<QueuedItem, "paid" | "progress">, at = this.queue.length): void {
    this.addDebt(item.cost, item.cost.value);
    this.queue.splice(at, 0, { ...item, paid: false, progress: 0 });
    this.payAffordable();
  }

  // Pays every unpaid item the stock covers, in queue order. Not strictly first-in-first-out:
  // a cheaper later item can be paid while an earlier one still waits.
  payAffordable(): void {
    for (const q of this.queue) {
      if (!q.paid && this.stock.has(q.cost)) {
        this.stock.take(q.cost);
        this.addDebt(q.cost, -q.cost.value);
        q.paid = true;
      }
    }
  }

  // Refund rule: an unpaid item releases its debt; a paid item with no progress gets its cost back;
  // a paid item with progress is not refunded.
  unqueue(index: number): void {
    const q = this.queue[index];
    if (q.paid) {
      if (q.progress === 0) this.stock.give(q.cost);
    } else {
      this.addDebt(q.cost, -q.cost.value);
    }
    this.queue.splice(index, 1);
    this.payAffordable();
  }

  // One work call. The first item in queue order that is paid or affordable, and whose minimum skill
  // is met, takes all the work. Returns the finished item's name, or null.
  work(amount: number, skill: number): string | null {
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      const ready = (q.paid || this.stock.has(q.cost)) && skill >= q.minSkill;
      if (!ready) continue;
      if (!q.paid) {
        this.stock.take(q.cost);
        this.addDebt(q.cost, -q.cost.value);
        q.paid = true;
      }
      q.progress += amount * this.prodMult / q.workNeeded;
      if (q.progress >= 1) {
        this.queue.splice(i, 1);
        return q.name;
      }
      return null;
    }
    return null;
  }
}

export {};
```

Checked by tsc: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/crafting-queue.ts` (new, proposed). It is not a fight module, so no `src/fight/` file fits. It is the server-side craft queue that a forge or workshop would use.
- Parity-checklist row 21 (catalogue fields). The recipe fields (cost, work needed, minimum skill) are catalogue fields. The queue and its hold are not covered by any row, so say plainly that no row fits the hold and the refund; a new economy row would be needed.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one ledger (the queued cost becomes a hold row in the one ledger, not a separate debt table); server-verified (the pay, refund and progress steps run on the server, so a client cannot claim a craft is paid).

## 6. Gaps and risks

- The debt is not a hold. `hasResource` compares raw stock and ignores debt (collective.cpp:1013-1015). The callers in the grep all use it that way: construction (collective.cpp:1336-1340), immigration (immigration.cpp:152-158, 256-260) and ransom (player_control.cpp:3798-3802). So a construction or an immigrant can take the stock an unpaid craft was waiting for. Frankendom must make the hold a real ledger row.
- Not first in, first out. `updateState` pays any affordable unpaid item in queue order without stopping at the first one it cannot afford (workshops.cpp:53-60). A cheap later craft can overtake an expensive earlier one. Frankendom must choose the fairness rule.
- Progress is not refunded once started (workshops.cpp 65-67). Cancelling mid-craft destroys the stock. Whether to refund a share is a design choice, not a rule to copy.
- Excess progress is dropped. The clamp at workshops.cpp:116-117 writes `workDone`, which is not read after line 117; the excess is lost when the item completes (124). Do not copy the dead write.
- Three books, not one. Stock is in collective credit plus storage (collective.cpp:1021-1062); per-creature debt is a table on each creature (creature_debt.cpp:32-38); per-workshop debt is a table per workshop type (workshops.cpp:30-33). Frankendom's one-ledger ruling would merge them.
- Creature debt clamps only the floor: `amount = max(-current, amount);` (creature_debt.cpp:34), so the debt cannot go below zero. The shop theft path adds a negative item price to the thief's debt to the shopkeeper (creature_factory.cpp:551-554). That reads as reducing the debt; whether it is intended was not checked.
- The minimum skill is per resource, read from workshop info (player_control.cpp:2791-2792). Frankendom should make it a recipe field, not a workshop default.
- The work rate uses a 0.02 factor per skill point and the largest neighbouring furniture boost (collective.cpp:1630-1637). This is the speed knob. Frankendom should express it as data (zone or station data), not as a constant in the function.
- Not read: furnace.cpp (the second queue), `getEfficiency`, the runes path beyond the lines cited, and the whole of `immigration.cpp`.
