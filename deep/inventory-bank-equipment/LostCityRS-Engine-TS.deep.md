# LostCityRS-Engine-TS (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts | Licence: MIT | TypeScript | symbol Inventory.add / remove

## 1. Mechanism

- An inventory is a fixed-length array of slots. Each slot is null or `{id, count}`. The length (`capacity`) comes from the inventory type config (`InvType.size`), and the type can also pre-fill "stock" slots (shop stock) from config.
- Each inventory has a stack mode: NORMAL (stacks only if the item type is stackable), ALWAYS (every item stacks), or NEVER (no stacking). `fromType` picks NORMAL, or ALWAYS when the type's stack-all flag is set (L27-30); NEVER can only come from the constructor argument (callers not read).
- `add(id, count, beginSlot)` (Inventory.ts 107-150):
  - Non-stacking items: fill empty slots from `beginSlot` one unit at a time until `count` is reached or the slots run out (the stop check is after the write, so a count of zero or less still places one unit).
  - Stacking items: find the first slot anywhere holding the same id (beginSlot is ignored for this), else the first empty slot (from the start when beginSlot is -1, else at or after `beginSlot`). Add into that slot, capped at 2^31-1. Returns how many were actually added, so a full inventory returns a partial count.
- `remove(id, count, beginSlot)` (152-214): scans from `beginSlot` to the end, then wraps back to the slots before it. Each matching slot gives up `min(its count, what is left)`. A slot is cleared to null when its count reaches zero, except when the id is one of the inventory type's stock objects, which stay as zero-count entries. Every touched slot is marked dirty. Returns how many were removed.
- Writes go through `set` (L224), `removeAll` or the direct slot clears in `remove`, each of which ends in `markDirty`, recording the slot in a dirty set and setting an update flag. The class exposes the dirty slots sorted (`getDirtySlots`) and a `resetTracking`; the code that sends them to a client is not in this file (not read).
- Output: the slot array, the count changed, and the dirty-slot list. Who calls add/remove (scripts, player actions) is not read.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| Inventory.fromType | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts | 20-44 | Builds a container from the type config with stock pre-fill |
| Inventory.add | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts | 107-150 | Stack or slot fill; returns the count actually added |
| Inventory.remove | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts | 152-214 | Wrap-around removal across slots; keeps stock entries at zero |
| Inventory.set / markDirty | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts | 224-227, 242-245 | Single write path; records the dirty slot for sync |
| Inventory.getDirtySlots / resetTracking | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts | 233-240 | Sorted dirty list for the client, then clear |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed slot array; stack-or-fill add that returns the partial count | Slot count from config per type (theirs) |
| Three stack modes (by item, always, never) | Stack modes as three values (theirs) |
| Wrap-around remove from a start slot | Start slot argument (theirs) |
| Dirty-slot tracking: expose only what changed | Stack cap 2^31-1 (STACK_LIMIT, L14) (theirs) |
| Stock slots keep a zero-count entry | Stock behaviour for shops (theirs) |

## 4. TypeScript sketch

Licence: MIT. The logic may be lifted from the path above; this sketch restates the structure in its own names.

simplified: stackability is passed in instead of looked up from the item config; the stock-object exception in remove is omitted; remove walks the slots once with a modulo (same visit order as the donor's two passes); the update flag, `set`/`markDirty` split and the zero-count place-one quirk of non-stacking add are not modelled.

```ts
// Licence: MIT (LostCityRS-Engine-TS, src/engine/Inventory.ts add, remove, markDirty)
interface Inv { slots: ({ id: number; count: number } | null)[]; dirty: Set<number>; stackMode: 'byItem' | 'always' | 'never'; }

function add(inv: Inv, id: number, stackable: boolean, count = 1, beginSlot = -1): number {
  const start = Math.max(0, beginSlot);
  const stack = inv.stackMode !== 'never' && (stackable || inv.stackMode === 'always');
  if (!stack) {
    let done = 0;
    for (let i = start; i < inv.slots.length && done < count; i++) {
      if (inv.slots[i] !== null) continue;
      inv.slots[i] = { id, count: 1 }; inv.dirty.add(i); done++;
    }
    return done;
  }
  let idx = inv.slots.findIndex((s) => s !== null && s.id === id);
  if (idx === -1) idx = inv.slots.findIndex((s, i) => i >= start && s === null);
  if (idx < 0) return 0;
  const before = inv.slots[idx]?.count ?? 0;
  inv.slots[idx] = { id, count: Math.min(0x7fffffff, before + count) };
  inv.dirty.add(idx);
  return Math.min(0x7fffffff, before + count) - before;
}

function remove(inv: Inv, id: number, count = 1, beginSlot = -1): number {
  const n = inv.slots.length;
  const start = Math.max(0, beginSlot);
  let removed = 0;
  for (let k = 0; k < n && removed < count; k++) {
    const i = (start + k) % n;
    const cur = inv.slots[i];
    if (!cur || cur.id !== id) continue;
    const take = Math.min(cur.count, count - removed);
    removed += take;
    cur.count -= take;
    if (cur.count === 0) inv.slots[i] = null;
    inv.dirty.add(i);
  }
  return removed;
}

```

## 5. Lands in

- Frankendom: src/fight/gear-room.ts (today: src/gear-room.ts, moving) (the gear list as slots, if it is kept as an array) and src/loot-claims.ts (what a player holds). The dirty-slot sync is a server-to-client detail, so it belongs in the server tick output (post-K item 3, row 18; module name set by Lead), not in the duel.
- Parity checklist: row 21 (catalogue fields: item ids and a stack flag) with row 20 (catalogue as runtime source) and row 18 (server-verified loot into the one ledger).
- Beyond checklist: economy (later phase); bank (later phase).

Reuse tag: adapt
Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- Slot arrays of a fixed size fit a backpack or bank. Frankendom's gear room is a set of named slots (head, body, weapon, shield). A numbered array does not carry the slot meaning; the donor's inventory cannot replace an equipment slot map.
- Stack cap is 2^31-1. Frankendom's stack limit should be a catalogue field (row 21), not this constant.
- The donor writes stock slots as zero-count entries; Frankendom must decide whether a zero-count gear entry is allowed at all.
- Conflict check: this class has no authority check of its own; whether the donor calls it only on the server is not read. Frankendom's inventory must be written only by the server (one ledger, server-verified); a client slot array would split the one-engine rule.
