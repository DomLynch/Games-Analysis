# Dawn-of-Light-DOLSharp (inventory-bank-equipment, cell 2)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GameLivingInventory.cs` (base), `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GamePlayerInventory.cs` (player override) | Licence: GPL-2.0-or-later (per file header: "version 2 of the License, or (at your option) any later version"; the LICENSE file is GNU GPL v2) | C# | symbols `MoveItem`, `AddTemplate`, `RemoveTemplate`, `CommitChanges`

Checked: Read in full: base `GameLivingInventory.cs` 735 (`MoveItem`), 1144-1278 (combine, stack, exchange, change batching), 857-1041 (`AddTemplate`), 1042-1143 (`RemoveTemplate`), 139-248 (`CountSlots`, `IsSlotsFree`), 292-313 (`GetValidInventorySlot`), 526-562 (`AddItem`), 632-711 (`AddCountToStack`, `RemoveCountFromStack`). Player `GamePlayerInventory.cs` 582-660 and 660-800 (dead gate, weapon-slot switch, horse-bag gate, poison, class gate), 800-1040 read in part (every case label checked; armour, weapon and quiver rules read in full, the rest by grep), 1040-1200 (realm and displaced-item checks, base call, weapon/quiver switch, resync), 1210-1330 (combine, stack, exchange overrides), 1503-1549 (`UpdateChangedSlots`). Enum values in `GameServer/gameutils/IGameInventory.cs` 27-119. Callers: `GameServer/packets/Client/168/PlayerMoveItemRequestHandler.cs` 229 and 274 (grep, 274 read); `GameTrainer.cs` 278-283 (grep); `IsSlotsFree` callers in `PlayerTradeWindow.cs` 542-543 (grep), `DataQuest.cs` and `GameTrainer.cs` (grep). Of 17 call sites of `AddTemplate`/`RemoveTemplate`, only the names were listed, not each one read. Not read: `GameInventoryItem.Combine`, `DyeItem`, `RemoveItem` bodies and the DB layer; `GameVault.cs` beyond 96-108 and 234-272; `GameHouseVault.cs`; the loot generators (loot-drops category). Confidence: high on the move order and on the add/remove plan; medium on the per-slot equipment rules (read by case, not every line); high that there is no phone or touch presentation code in this donor.

Best transferable idea: Add a loot bundle or a purchase all-or-nothing by planning the whole stack placement first (top up existing stacks, then open empty slots) and only then writing, so a full bag refuses the whole bundle.
Decision (proposed): adapt - take the plan-then-commit add and the check-then-apply removal; reject the per-slot rule table and the direct DB writes inside the move. Why: a loot award in a duel-and-zone game needs "all or nothing" and one UI flush per award (Frankendom ruling: one ledger), and this donor shows it cleanly; the donor's hard-coded slot rules and inline DB saves do not fit "zones as data" and server-verified kills.
Acceptance: A server test awards a 20-count loot bundle into a bag with room for 19 and asserts the bag is unchanged and the award returns false; a second test moves 5 of a 20-stack onto a stack of 10 (max 20) and asserts 5 moved, 15 left in the source, and one inventory update sent.

## 1. Mechanism

- Two inventory operations cover what a player does with items: a move between two slots (`MoveItem`) and a count-based add or remove across a slot range (`AddTemplate`, `RemoveTemplate`). Slots are integer ids; the player's pack is slots 40-79 (`IGameInventory.cs` 73-74), vault slots start at 110 (`IGameInventory.cs` 92).
- `MoveItem` order in the player override (`GamePlayerInventory.cs` 582 onward): (a) a dead player is refused with a message and a resync (584-589); (b) both slots are mapped through `GetValidInventorySlot`, and an invalid slot is refused; (c) moving a weapon onto its own slot switches the active weapon and returns (the same-slot switch, just after the slot mapping); (d) the source item must exist and must not be the same object as the destination item (633); (e) the horse-bag and poison gates; (f) class gates in both directions, from `AllowedClasses` of the moving item and of the displaced item; (g) the destination-slot type rules for the moving item (a large switch on the target slot, for example armour must match its `Item_Type` to the slot); (h) the realm rule for horse slots (915-923); (i) the displaced item (if any) must fit the SOURCE slot, using the same kind of switch on the source slot (for example 1047 `if (toItem.Item_Type != (int) fromSlot)`); (j) only if all gates pass, the base move runs (1106).
- Base move (`GameLivingInventory.cs` 735): try `CombineItems` (player: merge a dye or combinable item, 1210); if it fails, try `StackItems` (player: merge or split a stack, 1246); if that fails too, `ExchangeItems` swaps the two slots (player: base swap 1167 plus DB save of both items and equip/unequip events, 1301). Each step either finishes the move or passes it on.
- Stack split and merge (player `StackItems`, 1246-1290): a requested count of 0 means the whole stack (1260). Merge into an existing stack of the same name when the destination is stackable (1263): if the sum would exceed the max count, the source keeps the surplus and the target is set to its max (1265-1271); otherwise the source count is added and the source is removed (1272-1273). Split into an empty slot (1279): a clone takes the requested count and the source keeps the rest.
- `AddTemplate` (857): plan first, write later. Pass 1 walks the range and tops up existing stacks of the same template that are below max (`countFree`, 908-924). Pass 2 walks the range again and takes each empty, unplanned slot for up to one full stack (`MaxCount`, 966). If the plan covers the count, the writes run inside `BeginChanges`/`CommitChanges` (991-1026); if not, the function returns false and nothing was written (986-988).
- `RemoveTemplate` (1042): plan first over the range (whole stacks while the count still exceeds them, 1076), return false if the count is not covered (1098), then apply inside one change batch (1102-1127).
- Change batching (`GameLivingInventory.cs` 1242-1270): `BeginChanges` increments a counter; `CommitChanges` decrements it and flushes changed slots only when the counter reaches 0 and something changed (1261). A slot change outside a batch flushes at once.

## 2. Key functions

- `MoveItem` (player override): `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GamePlayerInventory.cs` 582-1200 (gates, then base call at 1106, then weapon and quiver switches and a final resync at 1195).
- `MoveItem` (base): `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GameLivingInventory.cs` 735 onward (combine, then stack, then exchange at 750-752).
- `StackItems` (player): `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GamePlayerInventory.cs` 1246 onward (merge at 1263-1273, split at 1279).
- `AddTemplate`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GameLivingInventory.cs` 857 onward (plan 890-988, apply 990-1026).
- `RemoveTemplate`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GameLivingInventory.cs` 1042 onward (plan 1076-1098, apply 1102-1127).
- `CommitChanges`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GameLivingInventory.cs` 1250 onward (flush test at 1261).
- `IsSlotsFree` (empty slots only): `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GameLivingInventory.cs` 213 onward (loop at 230-233).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Plan a whole add: fill existing stacks first, then open empty slots, each taking at most one full stack; refuse the whole add if the plan falls short | Stack cap per template (`MaxCount`, per item; no fixed number in this donor) |
| Check a move both ways (moving item to the target slot, displaced item to the source slot) before any write | Slot type numbers and the per-slot rule table (`GamePlayerInventory.cs` 800-1140; `Item_Type` compared to the slot id) |
| Split a stack by a requested count; a count of 0 means the whole stack | Requested count 0 = whole stack (theirs, 1260) |
| Merge clamps to the target max and leaves the surplus in the source (1265-1271) | Pack slots 40 to 79 (theirs, `IGameInventory.cs` 73-74); vault slots 110 to 149 (theirs, 92 and 93) |
| One UI flush per outermost batch (1261) | None |
| Refuse every move while dead (584-589) | None |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's order (plan, then check, then write) for add and remove, and the move order (validate both ways, then merge or split, otherwise swap). It OMITS: the combine step (dye and combinable-item hooks), the per-slot equipment rule table, class and realm gates, the horse-bag and poison gates, weapon and quiver switching, DB saves, the equip/unequip events, and the "slot is valid" mapping. It REORDERS nothing. It FIXES one donor defect: a merge into an existing stack moves only the requested count (the donor moves the whole source count, see section 6). A full target stack returns a reason instead of a silent success.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type SlotId = number;

interface Item {
  slot: SlotId;
  templateId: string;
  name: string;
  count: number;
  maxCount: number;
  stackable: boolean;
}

interface Template {
  templateId: string;
  name: string;
  maxCount: number;
  stackable: boolean;
}

// Returns null when the item may sit in the slot, or a reason string when it may not.
type Placement = (item: Item, slot: SlotId) => string | null;

class Ledger {
  readonly items = new Map<SlotId, Item>();
  private pending = new Set<SlotId>();
  private depth = 0;
  flushes = 0; // one UI flush per outermost batch

  constructor(readonly min: SlotId, readonly max: SlotId) {}

  private touch(slot: SlotId): void {
    this.pending.add(slot);
    if (this.depth === 0) this.flush();
  }

  private flush(): void {
    if (this.pending.size > 0) {
      this.flushes++;
      this.pending.clear();
    }
  }

  begin(): void {
    this.depth++;
  }

  commit(): void {
    this.depth--;
    if (this.depth === 0) this.flush();
  }

  // Plan first, mutate only when the whole count fits. Pass 1 tops up matching stacks,
  // pass 2 opens empty slots (one full stack each). Nothing changes on failure.
  addTemplate(tpl: Template, want: number, lo: SlotId = this.min, hi: SlotId = this.max): boolean {
    if (want <= 0 || lo < this.min || hi > this.max) return false;
    if (lo > hi) [lo, hi] = [hi, lo];

    const plan = new Map<SlotId, number>(); // positive = add to stack, negative = new stack of that size
    let left = want;

    for (let s = lo; s <= hi && left > 0; s++) {
      const it = this.items.get(s);
      if (!it || it.templateId !== tpl.templateId || it.count >= it.maxCount) continue;
      const add = Math.min(left, it.maxCount - it.count);
      plan.set(s, add);
      left -= add;
    }

    for (let s = lo; s <= hi && left > 0; s++) {
      if (this.items.has(s) || plan.has(s)) continue;
      const add = Math.min(left, tpl.maxCount);
      plan.set(s, -add);
      left -= add;
    }

    if (left > 0) return false; // all or nothing: the ledger was not touched

    this.begin();
    try {
      for (const [s, n] of plan) {
        if (n > 0) {
          const it = this.items.get(s);
          if (it) it.count += n;
        } else {
          this.items.set(s, { slot: s, templateId: tpl.templateId, name: tpl.name, count: -n, maxCount: tpl.maxCount, stackable: tpl.stackable });
        }
        this.touch(s);
      }
    } finally {
      this.commit();
    }
    return true;
  }

  // Check the whole plan first, then apply it inside one batch.
  removeTemplate(templateId: string, want: number, lo: SlotId = this.min, hi: SlotId = this.max): boolean {
    if (want <= 0 || lo < this.min || hi > this.max) return false;
    if (lo > hi) [lo, hi] = [hi, lo];

    const plan: Array<{ slot: SlotId; take: number }> = [];
    let left = want;
    for (let s = lo; s <= hi && left > 0; s++) {
      const it = this.items.get(s);
      if (!it || it.templateId !== templateId) continue;
      const take = Math.min(left, it.count);
      plan.push({ slot: s, take });
      left -= take;
    }
    if (left > 0) return false;

    this.begin();
    try {
      for (const p of plan) {
        const it = this.items.get(p.slot);
        if (!it) continue;
        if (p.take === it.count) this.items.delete(p.slot);
        else it.count -= p.take;
        this.touch(p.slot);
      }
    } finally {
      this.commit();
    }
    return true;
  }

  // Move order: validate both ways, then stack-split or merge, otherwise swap.
  // requested = 0 means the whole stack. Returns null on success or a reason string.
  move(from: SlotId, to: SlotId, requested: number, placement: Placement): string | null {
    if (from === to) return "same slot";
    const a = this.items.get(from);
    if (!a) return "nothing to move";
    const b = this.items.get(to);

    const gate = placement(a, to) ?? (b ? placement(b, from) : null);
    if (gate) return gate;

    const n = requested > 0 ? Math.min(requested, a.count) : a.count;

    this.begin();
    try {
      if (b && b.stackable && b.templateId === a.templateId) {
        // simplified: the donor merges the whole source stack here; this sketch merges only the requested count.
        const put = Math.min(n, b.maxCount - b.count);
        if (put === 0) return "target stack is full";
        b.count += put;
        a.count -= put;
        if (a.count === 0) this.items.delete(from);
        this.touch(to);
        this.touch(from);
      } else if (!b && n < a.count) {
        this.items.set(to, { ...a, slot: to, count: n });
        a.count -= n;
        this.touch(to);
        this.touch(from);
      } else {
        this.items.delete(from);
        this.items.delete(to);
        if (b) {
          b.slot = from;
          this.items.set(from, b);
        }
        a.slot = to;
        this.items.set(to, a);
        this.touch(from);
        this.touch(to);
      }
    } finally {
      this.commit();
    }
    return null;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/iv003-dawn-inventory-ledger.ts`) exits 0. Sketch file: `/private/tmp/p2/wave2-haiku/batch3/IV003/work/dawn-inventory-ledger.ts`.

## 5. Lands in

- TARGET `origins/server/inventory.ts` (new file name proposed; the Frankendom inventory file was not read in this pass, so it is not confirmed to exist). It is the one ledger for items: adds and removes for loot awards, purchases and rewards go through `addTemplate`, moves go through `move`.
- Parity row 18 (loot roll and XP award): the atomic add is what a loot award calls. The checklist has no inventory row; row 18 is the closest, and this is a gap (section 6).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: Frankendom ruling "one ledger" (every item count change goes through one planned write path); licence rule 7 (GPL read from the header; shape only, no line-by-line translation)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Defect D1, merge ignores the requested count (`GamePlayerInventory.cs` 1263-1273): the merge branch adds from `fromItem.Count` whatever `itemCount` the player asked for. Worked case from the code: a request of 5 from a 20-stack onto a 10-stack (max 20) takes the surplus branch (1265-1268) and moves 10, not 5; a request of 2 from a 6-stack onto a 5-stack (max 20) moves all 6. fix: `put = min(requested, source count, room)`, as the sketch does.
- Defect D2, `RemoveTemplate` commits twice on its failure paths (`GameLivingInventory.cs` 1114 and 1120 call `CommitChanges()` before `throw`, and the `finally` at 1127 commits again). The second commit drives the counter below zero and logs an error. fix: drop the explicit commits; the `finally` already commits.
- Defect D3, `AddTemplate` apply step ignores return values (`GameLivingInventory.cs` 1005 `AddCountToStack(item, itemCount);` and 1020 `AddItem(itemSlot, item);`). The plan is checked, but an apply call that fails (for example the owner check in `GamePlayerInventory.cs` `AddCountToStack`) still returns true, so the add is partial. fix: pre-check owner and slot emptiness during planning, or check each return and undo the writes already made.
- Defect D4, realm refusal message (`GamePlayerInventory.cs` 915-923): the switch that blocks the move is only set for non-GM accounts (918), but the message at 923 is sent for everyone, so a GM is told "You cannot put an item from this realm!" and the move still goes through. fix: send the message inside the same branch.
- Defect D5, mismatch: `IsSlotsFree` (213-237) counts only empty slots, while `AddTemplate` also uses stack room. Callers such as the trade window (`PlayerTradeWindow.cs` 542-543) can refuse what `AddTemplate` would accept. fix: build `IsSlotsFree` on the same planner, so both answer the same question.
- The realm check in `MoveItem` covers only horse armour and barding (915-916). Realm gating for normal equipment is not in this function; where it lives was not read (not read).
- Per-slot equipment rules are hard-coded per slot number in `GamePlayerInventory.cs` (about 400 lines). Frankendom should keep the rule as data on the item (slot type list) and check it in the engine, not as a switch.
- Ruling check, one ledger: the donor's `ExchangeItems` writes items to the DB inline, in the middle of a move. Frankendom must write the ledger once per action and send the result from the server; the donor's inline writes are a pattern to avoid.
- Ruling check, server-verified: the donor refuses moves on the server (dead, class, slot type, realm), which matches the rulings. The donor does NOT check for a fight in progress. A weapon swap in the donor calls `StopAttack` (the weapon and quiver block after 1106). In Frankendom, a weapon swap in combat is a timed action in the duel step (parity row 1), not an inventory side effect.
- Ruling check, zones as data: the donor's pack size and vault size are constants or per-house values, not zone data. Frankendom should treat stack caps and bag sizes as item and character data (rows 20-21), not zone fields.
- Phone presentation: no phone or touch presentation code exists in this donor (client-side presentation is the DAoC client's). The loot and bag UI is out of scope for this donor; any phone layout must come from Frankendom's own client.
- Loot presentation is not implemented here: this file moves items and counts only. The loot roll itself is in the loot-drops category (`LootList.cs`, `LootGeneratorBase.cs`, not read in this pass).
