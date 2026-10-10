# Anuken-Mindustry (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/world/blocks/storage/CoreBlock.java` (with `StorageBlock.java`, `entities/comp/ItemsComp.java`, `entities/comp/BuildingComp.java`, `input/InputHandler.java`, `type/UnitType.java`) | Licence: GPL-3.0 (LICENSE lines 1-2: "GNU GENERAL PUBLIC LICENSE" / "Version 3, 29 June 2007") | Java | symbol `CoreBuild.onProximityUpdate`, `InputHandler.requestItem`, `InputHandler.transferInventory`

Checked: read in full: `CoreBuild.onProximityUpdate` (757-786), `owns` (841-843), `CoreBuild.onRemoved` (855-872), core `acceptItem`/`getMaximumAccepted`/`handleStack` (747-795), `StorageBuild` `acceptItem`/`handleItem`/`getMaximumAccepted` (54-97), `ItemsComp.java` (whole file), `requestItem` (506-519), `takeItems` (167-177), `transferInventory` (522-543), `transferItemTo` (248-259), `Units.canInteract` (134-136), unit `itemCapacity` default (961-962), block capacities (Blocks.java 3152, 3246, 3253). Callers: `requestItem` read; `takeItems` also called by `CargoAI.java:45` and `LExecutor.java:546` (grep only, not read); `acceptStack` callers: `transferInventory` read, `MinerComp.java:75` (grep only, not read). Not read: `Ratekeeper` (the deposit rate class), the admin hook `netServer.admins.allowAction`, the threading model of the server loop, the `Call` dispatch. Whether a core appears in its own `proximity` list was not verified (affects section 6). Confidence: high on the bank cap, clamp, carrier and range numbers; medium on the split denominator. Camera: not applicable. Receipts: 38, `verify_receipts.py` passed.

Best transferable idea: Keep the bank as one shared ledger object that the core and each linked storage slot reference, recompute the cap from what is linked, and clamp every item when the cap changes.
Decision (proposed): adapt — the shared ledger and the recomputed cap fit the one-ledger ruling; we keep the shape but not the silent clamp loss (every dropped item must be logged) and not the team-wide sharing of all cores.
Acceptance: A server test links a second storage slot (cap 300) to an account's bank and asserts the cap rises to the sum with each item at or under it; unlinking, then removing the core, splits items in proportion to slot caps, and every move appears in the ledger log with its amount.

## 1. Mechanism

- Two storage models share one ledger type. (a) A **bank**: the core plus storage blocks that touch it. (b) A **carrier**: the unit's one stack.
- **Bank cap, per item kind.** `onProximityUpdate` (757-786) first makes every core of the team adopt the other cores' items module (761-762). It then sets `storageCapacity` = the core's own `itemCapacity` + the `itemCapacity` of each adjacent storage block that `owns` accepts (767). Each other core's capacity and owned storage are added (775). The result is written to every core on the team (785). The cap is applied to each item separately (748, 753, 780), so it is a per-kind limit, not a total weight.
- **Ownership.** `owns` (841-842) accepts a `StorageBuild` only if its block has `coreMerge` and it is either unlinked or already linked to this core. Each owned block gets `t.items = items` (769), so it shares the core's ledger object, and its `linkedCore` is set (770).
- **Re-link clamp.** After the recompute, if the world is not generating (778), every item is clamped to the new cap (779-781). Items above the new cap are lost, with no event.
- **Deposit (bank side).** A core accepts an item if `coreIncinerates` is set or the count is below its max (748). The max is `storageCapacity` (753). `BuildingComp.acceptStack` returns `min(max - have, amount)` if the block accepts the item and, for a source, the team matches (779-781). A linked container delegates `acceptItem` and `getMaximumAccepted` to its core (StorageBlock 55, 96). `handleStack` on the core clamps to free room: `min(amount, storageCapacity - items.get(item))` (790-792).
- **Withdraw (request).** `requestItem` (506-519) returns early unless the block is interactable by the player's team, the player is within `itemTransferRange` (507), the player is alive, and `amount > 0`. On the server it also throws `ValidateException` if `Units.canInteract` or the admin hook refuses (509-515; the admin hook's own body was not read). It then calls `Call.takeItems(build, item, min(maxAccepted, amount), unit)` (517) and fires `WithdrawEvent` (518).
- **Withdraw (move).** `takeItems` (167-177) computes `removed = build.removeStack(item, min(to.maxAccepted(item), amount))` (170), then `to.addItem(item, removed)` (173). The carrier's clamp is therefore applied inside the move, for every caller that goes through `takeItems`.
- **Carrier.** `ItemsComp` holds one `ItemStack` (10). `acceptsItem` is true if the carrier is empty, or it holds the same item and has room (30). `maxAccepted` is 0 if it holds a different item, else `cap - amount` (48). `update` clamps `amount` to `cap` every tick (17). A unit type with no explicit `itemCapacity` gets `max(round(hitSize * 4, 10), 10)` (961-962).
- **Deposit (request).** `transferInventory` (522-543) checks range (within `itemTransferRange`), not dead, `allowDeposit`. On the server it also requires `stack.amount > 0`, `canInteract`, and a rate check `itemDepositRate.allow(cooldown * 1000 * 2, 2)` (527), skipped for the local player. The donor comment (526) says the cap is double the cooldown with two deposits. It then sets `accepted = build.acceptStack(item, unit.stack.amount, unit)` (538), calls `Call.transferItemTo(unit, item, accepted, ...)` (540), and fires `DepositEvent` (542).
- **Transfer function.** `transferItemTo` (248-259) subtracts `amount` from the carrier's stack (251), spawns visual transfers, and calls `build.handleStack(item, amount, unit)` (257).
- **Split on core removal.** `CoreBuild.onRemoved` (855-872). Before unregistering (867), each linked storage that shares the ledger gets a new `ItemModule`. Each item becomes `min(storage cap, items * storage cap / totalCapacity)` (863), where `totalCapacity` sums the caps of proximity buildings that share the ledger (856). Then the other cores re-run `onProximityUpdate` (869-871).
- Tick: none of this runs on its own loop. Withdraw and deposit are request functions, one call each, run when a player's request arrives. The donor's threading model was not read, so "atomic" here means one function body with no await; see section 6.

## 2. Key functions

- `CoreBuild.onProximityUpdate`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/world/blocks/storage/CoreBlock.java` 757-786. Shared ledger, cap recompute, re-link clamp.
- `CoreBuild.onRemoved`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/world/blocks/storage/CoreBlock.java` 855-872. Proportional split to linked storage.
- `StorageBuild` `acceptItem`/`getMaximumAccepted`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/world/blocks/storage/StorageBlock.java` 54-56, 95-97. Delegation to the core when linked.
- `requestItem` (withdraw request): `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/input/InputHandler.java` 506-519. Range and state gate, then `takeItems`.
- `takeItems` (move with carrier clamp): `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/input/InputHandler.java` 167-177.
- `transferInventory` (deposit request): `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/input/InputHandler.java` 522-543. Rate check, `acceptStack`, `transferItemTo`.
- `ItemsComp` (carrier stack): `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/entities/comp/ItemsComp.java` 8-50.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One shared ledger object referenced by the core and each linked storage slot (CoreBlock 769) | None |
| Cap per item kind = core cap + sum of owned storage caps (CoreBlock 767) | core-shard 4000 (Blocks.java 3152); container 300 (3246); vault 1000 (3253) |
| Re-link clamps every item to the new cap; excess is lost (CoreBlock 780) | None (silent in the donor) |
| Split on core removal: `items * slot cap / total`, clamped to slot cap (CoreBlock 863) | None (a ratio; denominator unconfirmed, section 6) |
| Carrier: one stack, one item kind, cap by size (ItemsComp 30, 48) | Unit cap formula `max(round(hitSize * 4, 10), 10)` (UnitType 962) |
| Withdraw clamped to carrier free room inside the move (InputHandler 170) | Range 220 world units (Vars.java 123) |
| Deposit accepts `min(room, carried)` (BuildingComp 781) | Deposit cooldown 0.5 s (Rules.java 137); window `cooldown * 1000 * 2` ms, count 2 (InputHandler 527) |

## 4. TypeScript sketch

simplified: keeps the donor order for a withdraw (range and state gate, clamp to the carrier's free room, then move) and for a deposit (cap check, then move). It omits: the admin hook and `Units.canInteract`; the team check in `acceptStack`; the rate limiter (passed in as a boolean); the presentation effects and events; the campaign, incinerate and `coreIncinerates` branches; the multi-core ledger sharing (all cores of a team share one ledger in the donor, lines 761-762); the `world.isGenerating()` guard. `dissolve()` sums linked slot caps only, because whether a core appears in its own proximity list was not verified.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch from the described mechanism, not a translation of the donor lines.
// clean-room
type Item = string;

// One storage slot: the core itself, or a container that can be linked to it.
interface Slot { id: string; cap: number; }

// Shared ledger: one object, referenced by the core and by every linked container.
class Ledger {
  private readonly items = new Map<Item, number>();
  constructor(public cap: number) {} // cap applies to each item kind separately, not to a total

  have(item: Item): number { return this.items.get(item) ?? 0; }

  // Deposit side: accept only what fits under the per-item cap.
  accepts(item: Item, amount: number): number {
    return Math.max(0, Math.min(this.cap - this.have(item), amount));
  }

  add(item: Item, amount: number): void { this.items.set(item, this.have(item) + amount); }

  remove(item: Item, amount: number): number {
    const r = Math.min(Math.max(0, amount), this.have(item));
    this.items.set(item, this.have(item) - r);
    return r;
  }

  // Re-link: every item is clamped to the new cap, and the excess is lost.
  setCap(cap: number): void {
    this.cap = cap;
    for (const [item, n] of this.items) this.items.set(item, Math.min(n, cap));
  }

  entries(): [Item, number][] { return [...this.items.entries()]; }
}

// A bank is a core plus the containers linked to it. Linked containers share the core's ledger.
class Bank {
  readonly ledger: Ledger;
  readonly linked: Slot[] = [];
  constructor(readonly core: Slot) { this.ledger = new Ledger(core.cap); }

  // Cap = core cap + sum of linked caps.
  private recalc(): void {
    this.ledger.setCap(this.core.cap + this.linked.reduce((s, x) => s + x.cap, 0));
  }

  link(slot: Slot): void {
    this.linked.push(slot);
    this.recalc();
  }

  // Core removed: each linked slot gets a share of every item in proportion to its cap, clamped to its own cap.
  dissolve(): Map<string, Map<Item, number>> {
    const total = this.linked.reduce((s, x) => s + x.cap, 0);
    const out = new Map<string, Map<Item, number>>();
    for (const slot of this.linked) {
      const share = new Map<Item, number>();
      for (const [item, n] of this.ledger.entries()) {
        share.set(item, total > 0 ? Math.min(slot.cap, Math.floor((n * slot.cap) / total)) : 0);
      }
      out.set(slot.id, share);
    }
    this.linked.length = 0;
    return out;
  }
}

// Carrier: one stack, one item kind, with a cap set by the carrier's size.
interface Carrier { cap: number; item: Item; amount: number; }

// Free room for this item: 0 if the carrier holds a different item, else cap minus what it holds.
function maxAccepted(c: Carrier, item: Item): number {
  return c.item !== item && c.amount > 0 ? 0 : c.cap - c.amount;
}

interface Request { inRange: boolean; alive: boolean; }

// Withdraw: validated, clamped to what the carrier can hold, then moved. One call, one server tick.
function requestWithdraw(bank: Bank, c: Carrier, item: Item, want: number, req: Request): number {
  if (!req.inRange || !req.alive || want <= 0) return 0;
  const removed = bank.ledger.remove(item, Math.min(maxAccepted(c, item), want));
  if (removed === 0) return 0;
  c.item = item;
  c.amount += removed;
  return removed;
}

// Deposit: the bank takes only what fits under its cap; the carrier keeps the rest.
function requestDeposit(bank: Bank, c: Carrier, req: Request, depositAllowed: boolean): number {
  if (!req.inRange || !req.alive || !depositAllowed || c.amount <= 0) return 0;
  const accepted = bank.ledger.accepts(c.item, c.amount);
  bank.ledger.add(c.item, accepted);
  c.amount -= accepted;
  return accepted;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/IV002-Anuken-Mindustry-bank.ts`: exit 0.

## 5. Lands in

- TARGET `origins/server/bank.ts` (proposed new module; server-side ledger for bank slots and the carrier stack; not checked against the current tree). The move functions belong on the server, next to the other server-verified state changes.
- Parity-checklist row: **21** (catalogue fields). No row covers a bank or carrier ledger. Row 21 is the nearest because the capacity numbers (core, container, vault, carrier formula, range, deposit cooldown) are catalogue fields. Row 18 (loot roll and XP award, "one ledger") is also close, but it is for awards, not moves, so it is not used. Plainly: none of rows 1-23 fits the bank move itself.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room, shape only)
- Brief rule served: one ledger (shared object, recomputed cap); server-verified moves (range, state and clamp checked on the server); zones as data (capacities as catalogue fields)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism. Do not copy the Java lines.
- No weight model. The donor caps items per kind, not by weight. Frankendom's "weight and capacity" needs its own rule; this donor does not supply one.
- No equipment, paper-doll or binding. The donor has no equipment slots, no bind-on-pickup and no stack-size-per-slot tables. This cell fits only the bank, the carrier and the move. Say so in any report.
- Silent loss on re-link. Line 780 drops items above the new cap with no event. Frankendom's one-ledger rule needs every dropped item to be recorded.
- Team-wide sharing. All cores of a team share one ledger (761-762) and one cap (785). Do not copy this unless Frankendom wants one bank per team. A bank per account or per character is a ruling question.
- Split denominator unconfirmed. `totalCapacity` (856) sums proximity buildings that share the ledger. Whether the core itself is in its own `proximity` list was not read. Frankendom must define the denominator and test it.
- Atomicity rests on the server loop. The move functions have no await, so one call is one step. The donor's threading model was not read; Frankendom's server must enforce a single writer for a ledger.
- Rate limit uses `Ratekeeper`, which was not read. The sketch takes the rate check as a boolean. Its window and count are from 527 and 526 only.
- Admin hook not read. `netServer.admins.allowAction` (511-516) is an extension point; its behaviour is unknown.
- Events: the donor fires `WithdrawEvent` (518) and `DepositEvent` (542) after each move. Frankendom should emit the same kind of record after each move, into the one ledger log.
- Callers: `takeItems` callers `CargoAI.java:45` and `LExecutor.java:546` are not read. The claim that the clamp applies "for every caller" rests on `takeItems` itself (170), which I read, not on those callers.
