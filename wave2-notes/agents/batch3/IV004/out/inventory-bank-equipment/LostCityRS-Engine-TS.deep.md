# LostCityRS-Engine-TS (inventory-bank-equipment, cell 2)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts` | Licence: MIT (`LICENSE` line 1 "MIT License", line 3 "Copyright (c) 2023-2026 Lost City") | TypeScript | symbol `Inventory` (add, remove), with the move and overflow path in `src/engine/script/handlers/InvOps.ts` (`INV_MOVEITEM`, `BOTH_MOVEINV`) and the ground-loot path in `src/engine/World.ts` (`addObj`)

Checked: Read `Inventory.ts` in full (246 lines). Read `Player.ts` 1548-1708 (invAdd, invDel, invItemSpace, invMoveToSlot, invMoveFromSlot) and 1358-1415 (worn appearance), `InvOps.ts` 296-318, 373-528, 532-563, `World.ts` 120, 333, 1465-1500, `Obj.ts` 1-60, `Zone.ts` 36-38, 302-347, `InvType.ts` 1-119, `tools/pack/config/InvConfig.ts` 1-90. Not read: `World.removeObj` (the expiry body), the loop that calls `Obj.turn()`, `UpdateInvPartial` and the client inventory UI, and any `.inv` source data (`data/pack` is absent from this snapshot, so the real bag sizes and stock lists are unknown). Confidence: high on the container, the add/remove counts and the move/overflow path; medium on the exact expiry path. camera_scope: n/a.

Best transferable idea: a bag whose `add` returns how many units actually fit, whose move checks the target before removing from the source, and whose leftover becomes a ground drop owned by the player that reveals to everyone after a set delay.
Decision (proposed): adapt — keep the container, the stack modes and the owner-only drop with a reveal window; change the default so a move never removes what it cannot place (the donor removes first and drops the rest to the floor), and never creates an item on overflow. Frankendom's one-ledger ruling needs the move as one engine step.
Acceptance: a player with one free slot and 40 stackable arrows moves 40 arrows, sees "Bag full: 12 left" and may drop them, visible only to them for 60 s; a server test asserts moved + overflow + missing == requested and that no move ever raises the total of an item.

## 1. Mechanism

Five pieces, all engine-side. Nothing here is client code.

- **Container.** An inventory is a fixed array of `capacity` slots, each `null` or `{id, count}`. Its stacking mode is set per inventory type: NORMAL (stack only if the item type is stackable), ALWAYS (stack everything), NEVER (never stack) (`Inventory.ts` 14-18, 109). Shop-style containers keep "stock" entries at count 0 instead of clearing them (`stockobj` read at 153; cleared only when not stock at 181).
- **Add** (`Inventory.ts` 107-150). Non-stacking: starting at `max(0, beginSlot)`, take each free slot, one unit each, and stop when `completed >= count` (113-126). The check comes after the write, so count 0 still writes one item (defect D1). Stacking: use the slot already holding the id, otherwise the first free slot (from `beginSlot` if given, else the first free slot). If none exists, return 0 (128-140). Then `total = min(STACK_LIMIT, old + count)` is written and the function returns `total - old` (143-146). So add returns how many units actually went in; a full bag does not throw.
- **Remove** (`Inventory.ts` 152-214). Scan from `beginSlot` to the end, then wrap to `0..beginSlot-1` (`skippedIndices`, 157-164, 191-211). Each matching slot gives `min(slot count, still needed)` (177). A slot that reaches 0 is cleared unless it is a stock entry (181). Every touched slot is marked dirty (184). Returns the total removed.
- **Player wrapper and slot moves.** `invAdd` passes `beginSlot = -1` (`Player.ts` 1548-1555). `invDel` forwards to `remove` (1570-1582). `invMoveToSlot` reads both slots first, then writes source into target and target into source (1647-1679): a true two-slot swap. `invMoveFromSlot` removes first, then adds, and returns the overflow (1681-1707).
- **The script move that drops the overflow** (`InvOps.ts` 496-528, `INV_MOVEITEM`). Remove `count` of the item from the source inventory (513). If nothing was removed, stop (514-516). Add the removed amount to the target (518). A non-stackable overflow becomes one ground object per unit; a stackable overflow becomes one ground object with the overflow count. All are DESPAWN objects at the player's tile with a 200-tick duration (519-527). `INV_MOVEITEM_CERT` (532-563) differs in two ways: it maps the item to its cert link first (only when `certtemplate == -1 && certlink >= 0`, 549-552), and the overflow is always ONE ground object with the full overflow count (no per-unit split for non-stackables, since a cert is stackable already). `BOTH_MOVEINV` (373-492, the trade settlement) deletes each source slot before adding it to the other player, and sends the overflow to the receiving player's tile with 200 ticks (419-431).
- **Ground loot ownership** (`World.ts` 1465-1500; `Obj.ts` 1-50; `Zone.ts` 302-347). A drop with a receiver is a DESPAWN object with that lifetime, an owner, and a 100-tick reveal (1486-1493). A stackable drop of the same item by the same receiver on the same tile merges into the existing drop if the total stays within the limit, and the merge resets the lifetime to the new duration (1468-1480). Each `Obj.turn()` decrements the reveal counter and the lifetime counter; at zero an active DESPAWN object is removed (`Obj.ts` 28-37). On reveal (`Zone.ts` 328-347), untradeable objects and members objects in a free world are skipped (334-336); otherwise the owner is cleared and the object is sent to everyone (339-346). The zone holds at most `Zone.OBJS` objects; when full, the first DESPAWN object is removed to make room (305-313).
- **Timing.** The engine tick is `TICKRATE = 600` ms (`World.ts` 120). The next tick is set to now plus `TICKRATE` (333). Obj counters are in ticks, so 100 ticks = 60 s and 200 ticks = 120 s at that rate. The loop that calls `turn()` was not read.
- **Worn items.** `wearpos2` and `wearpos3` let one worn object occupy extra body slots. The appearance code collects those slots and skips them when it writes the appearance (`Player.ts` 1363-1387, 1396-1399). Which items use those fields is data and was not read.

## 2. Key functions

- `Inventory.add`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts` 107-150 (stack decision, non-stack loop, stacked cap and count).
- `Inventory.remove`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts` 152-214 (beginSlot wrap, per-slot take, zero clear unless stock).
- `Inventory.fromType`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts` 20-44 (seeds stock entries from the type; read, not analysed further).
- `Player.invItemSpace`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1624-1645 (space check; see D4).
- `Player.invMoveToSlot`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1647-1679 (two-slot swap).
- `INV_MOVEITEM`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/InvOps.ts` 496-528 (remove, add, overflow to ground). Defect D2 at 518.
- `BOTH_MOVEINV`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/InvOps.ts` 373-492 (whole-inventory move, delete then add).
- `World.addObj`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 1465-1500 (stack merge, owner, reveal timer).
- `Obj.turn`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Obj.ts` 27-50 (countdowns, despawn at zero).
- `Zone.revealObj`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts` 328-347 (reveal to all; skip rules).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Container of fixed slots; add returns what fits, remove returns what was taken | Capacity per inventory type (`InvType.size`, data; not read) |
| Three stack modes (normal, always, never) | Stack limit 2147483647 (`0x7fffffff`, theirs, `Inventory.ts` 14) |
| Stock entries kept at count 0 for restock | Stock list per inventory type (data; `stockobj`, `Inventory.ts` 153) |
| Owner-only ground drop, revealed to all after a delay | `REVEAL = 100` ticks (theirs, `Obj.ts` 9) = 60 s at `TICKRATE` |
| Overflow drop despawn | 200 ticks (theirs, `InvOps.ts` 522, 525) = 120 s |
| Engine tick | `TICKRATE = 600` ms, "DO NOT CHANGE" in the donor comment (theirs, `World.ts` 120) |
| Zone object cap | `OBJS = (SIZE << 1) + 1` with `SIZE = 8 * 8`, so 129 (theirs, `Zone.ts` 36-38) |
| Protected-access flag per inventory | `protect` default true; `scope` temp/perm/shared (theirs, `InvType.ts` 80, 84-117) |

## 4. TypeScript sketch

simplified: the sketch keeps the container, the stack modes and a one-step move. It reorders the donor: it checks what the target can take before removing anything from the source (the donor removes first and drops the rest to the floor), and it reports `missing` (what the source did not hold) separately from `overflow` (what the target could not take). Fixes D1 (count 0 writes nothing) and D2 (overflow and missing come from what was actually removed). Omitted: stock entries kept at zero, restock, the `beginSlot` start/wrap argument, the dirty-slot network protocol, the ground-drop and reveal step (the caller decides), the protected-access gate, and the worn-slot rules. Typechecked on the VPS with `tsc --strict --target es2020` (exit 0).

```ts
// Licence: MIT (LostCityRS-Engine-TS LICENSE, "MIT License"). Shape adapted and rewritten here; not a line-by-line copy.
export const STACK_LIMIT = 0x7fffffff;
export type StackMode = 'normal' | 'always' | 'never';
export interface Stack { id: number; count: number; }

export class Bag {
  readonly slots: (Stack | null)[];
  readonly dirty = new Set<number>();

  constructor(size: number, readonly mode: StackMode, private readonly stackableIds: ReadonlySet<number>) {
    this.slots = new Array<Stack | null>(size).fill(null);
  }

  private stacks(id: number): boolean {
    return this.mode !== 'never' && (this.mode === 'always' || this.stackableIds.has(id));
  }

  private set(i: number, s: Stack | null): void {
    this.slots[i] = s;
    this.dirty.add(i);
  }

  total(id: number): number {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    return Math.min(STACK_LIMIT, n);
  }

  // How many of `count` would fit right now. Pure: changes nothing.
  canAdd(id: number, count: number): number {
    if (count <= 0) return 0;
    if (!this.stacks(id)) {
      const free = this.slots.filter(s => s === null).length;
      return Math.min(count, free);
    }
    const i = this.slots.findIndex(s => s !== null && s.id === id);
    if (i !== -1) return Math.min(count, STACK_LIMIT - (this.slots[i]?.count ?? 0));
    return this.slots.includes(null) ? Math.min(count, STACK_LIMIT) : 0;
  }

  // Places up to `count`; returns how many were placed.
  add(id: number, count: number): number {
    const fit = this.canAdd(id, count);
    if (fit === 0) return 0;
    if (!this.stacks(id)) {
      let placed = 0;
      for (let i = 0; i < this.slots.length && placed < fit; i++) {
        if (this.slots[i] === null) {
          this.set(i, { id, count: 1 });
          placed++;
        }
      }
      return placed;
    }
    let i = this.slots.findIndex(s => s !== null && s.id === id);
    if (i === -1) i = this.slots.indexOf(null);
    const before = this.slots[i]?.count ?? 0;
    this.set(i, { id, count: before + fit });
    return fit;
  }

  // Takes up to `count` from the first matching slots; returns how many were taken.
  remove(id: number, count: number): number {
    let removed = 0;
    for (let i = 0; i < this.slots.length && removed < count; i++) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const take = Math.min(s.count, count - removed);
      removed += take;
      if (s.count - take === 0) {
        this.set(i, null);
      } else {
        s.count -= take;
        this.dirty.add(i);
      }
    }
    return removed;
  }
}

// One step: check the target first, remove only what it can take, then add.
// Items are never created: placed <= moved <= want <= held.
export function moveItems(from: Bag, to: Bag, id: number, count: number): { moved: number; overflow: number; missing: number } {
  const want = Math.min(count, from.total(id));
  const fits = to.canAdd(id, want);
  const moved = from.remove(id, fits);
  const placed = to.add(id, moved);
  return { moved: placed, overflow: want - placed, missing: count - want };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module): owner-only ground drop, reveal window, stack merge on drop, and the overflow rule. The inventory container (`Bag`) sits beside it under `origins/` (not read: how Frankendom stores inventories today).
- Parity-checklist row **18** (loot roll and XP award). The ground-drop despawn and reveal numbers are zone data (row 23 covers zone population; the drop lifetime is a loot field, so it stays under row 18).
- Reuse tag: adapt (MIT: code may be adapted; the sketch is our own rewrite of the shape, with the donor credited in its header line)
- Brief rule served: 1 (one engine, one ledger: a move is one engine step that never creates items); rules 7-9 n/a

## 6. Gaps and risks

- **D0 (minor):** the stack branch of `Inventory.add` has no guard for count <= 0 (it writes `min(STACK_LIMIT, old + count)`); at STACK_LIMIT it returns 0 correctly. `Obj.turn` also has fail-safe branches (lifecycleTick < 0) not described here.
- **D1 (defect, keep the idea):** `Inventory.add` with count 0 on a non-stacking container writes one item (`Inventory.ts` 121-123: the write happens before the count check). fix: return 0 when count <= 0 before any write. The sketch does this.
- **D2 (defect, keep the idea):** `INV_MOVEITEM` (`InvOps.ts` 513, 518) and `INV_MOVEITEM_CERT` (549, 558) compute overflow as `count - invAdd(..., completed)`, using the requested count, not what was removed. If the source held fewer than `count`, the difference is dropped to the ground as items that were never taken. The engine does not check the source total first; a content script may pre-check (not read). fix: `overflow = removed - added`, and report `missing = count - removed` without dropping anything. The sketch's `moveItems` does this.
- **D3 (default, keep the idea):** the move removes from the source before the target is checked (`InvOps.ts` 513-518). A full target therefore takes the items and drops the rest to the floor. The donor's idea (leftover visible only to the owner, then revealed) is good; the default is wrong for a ledger. fix: `canAdd` first, then move what fits, and make the leftover an explicit server choice (keep on the source, or drop as an owned drop with the reveal window).
- **D4 (not a defect, contract note):** `invItemSpace` for a non-stacking item (`Player.ts` 1644) computes `count - (free - (invSize - size))`, where `size` is the caller's virtual capacity (slots beyond `size` are treated as unusable). Size 0 therefore means nothing fits by design, and size = capacity means all free slots count. Confirmed from the formula; script docs not read. The sketch uses `canAdd` and does not depend on it, but a Frankendom version should keep the virtual-capacity idea (a bag limit smaller than the container).
- **Delete-before-add (risk):** `BOTH_MOVEINV` deletes each source slot (`InvOps.ts` 419) before adding it to the other player (423). Because the engine is synchronous this is not a race, but an exception between the two lines loses the item. fix: add first, then delete, or put both in one transaction.
- **D5 (defect, keep the gate):** in every move handler the check on the TARGET inventory reads the SOURCE's scope: `toInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED` (`InvOps.ts` 397 for `BOTH_MOVEINV`, 508 for `INV_MOVEITEM`, 544 for the CERT variant). So a shared-scope source lets a protected target be written without the protected-player pointer. The intent was not read (script docs not read); it reads as a copy error. fix: test `toInvType.scope` on the target side.
- **Protected-access gate (idea to keep):** the move handlers throw unless the protected-player pointer is set, for a source or target with `protect` (default true, `InvType.ts` 80) and a non-shared scope (`InvOps.ts` 393, 504, 540 for the source side). This is the donor's anti-tamper rule for who may write a ledger; D5 is the hole in its target side. It maps to Frankendom's one-ledger ruling: only the engine's move and award functions write item counts.
- **Frankendom mismatch:** the donor's stock lists, restock and shop buying are out of scope for the duel loop. Only the container, the move and the drop transfer.
- **Data not read:** the real bag sizes, stack flags and `wearpos2`/`wearpos3` values are in `.inv` and `.obj` sources that are absent from this snapshot (`data/pack` does not exist; the packer in `tools/pack/config/InvConfig.ts` shows the key names only: `size`, `scope`, `stackall`, `restock`, `allstock`, `protect`, `runweight`, `dummyinv`, `stock*`).
- **Not read:** `World.removeObj`, the loop that calls `Obj.turn()` (so the 60 s and 120 s figures assume one turn per tick), and the client inventory presentation (`UpdateInvPartial`, drag and swap on the phone). Phone layout of a full bag and the drop-pickup ceremony are not covered by this note.

Reuse tag: adapt (MIT)
Brief rule served: 1 (one engine, one ledger); rules 7-9 n/a

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- INV_MOVEITEM_CERT was said to do the same as INV_MOVEITEM with only a different target id; the donor also maps the item via certlink (InvOps 549-552) and always drops overflow as one stacked Obj. Confirmed.
- D4 was presented as a possible defect; the invItemSpace formula treats `size` as virtual capacity, so size 0 meaning nothing fits is intended. Confirmed from Player.ts 1625-1644.
- Missed: stack branch of Inventory.add lacks a count <= 0 guard; Obj.turn fail-safe branches not mentioned.

Fixed 2026-10-12: CERT bullet corrected, D4 reclassified as a contract note, D0 line added.
