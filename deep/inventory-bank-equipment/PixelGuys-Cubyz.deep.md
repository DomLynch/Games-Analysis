# PixelGuys-Cubyz (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/PixelGuys-Cubyz/src/entityComponent/bag.zig | Licence: GPL-3 | Zig | symbol bag.server.Component / playerBagSizeLimit
Symbol check: (verified: `playerBagSizeLimit` at 34, `server.Component` at 69). The component is thin; the logic is in `BagInventory` in `src/Inventory.zig` (712-767 and the push, pop and peek methods at 745-766), which this cell reads.

## 1. Mechanism

- A bag is a per-entity server component holding a `BagInventory`: a flat ordered list of item stacks with a size limit. The limit for a player is 120 (`playerBagSizeLimit`, bag.zig L34, theirs; the same constant initialises the client and the server bag). The limit is a slot count, not a weight.
- `push(stack)` (Inventory.zig 745-757) first tops up the last stack if it holds the same item, up to that item's stack size. The remainder goes into a new slot if the list is below the limit. It returns the amount that did not fit. Only the last stack merges; earlier partial stacks are not refilled.
- `pop` (759-761) removes and returns the top stack, or an empty stack if the list is empty. `peek` (763-766) reads the stack at a depth from the top without removing it.
- Save (`server.Component.save`, bag.zig 71-75): the bag is written (`toBytes`, Inventory.zig 737-742: a count, then each stack) when the audience is the disk or the player himself. Any other audience discards it. The AudienceInfo enum itself is not read.
- Load: `fromBytes` (Inventory.zig 730-735) reads a count and then each stack. `loadEmpty` (bag.zig 98-101) creates an empty bag for a new player. A client-side component (bag.zig 37-65) only loads the bag from bytes.
- Inputs: item stacks (the callers that push them, such as pickup, craft or trade, are not read). Outputs: the remainder, the top stack, and the saved bytes.
- Tick: not determined from the files read; the methods are plain calls with no timer.

## 2. Key functions

- `BagInventory.push`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/Inventory.zig` lines 745-757. Top-stack merge, then append up to the limit; returns the remainder.
- `BagInventory.pop`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/Inventory.zig` lines 759-761. Removes the top stack.
- `BagInventory.peek`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/Inventory.zig` lines 763-766. Reads a stack from the top without removing it.
- `server.Component.save`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/entityComponent/bag.zig` lines 71-75. Save audience rule: disk and the owner only.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ordered stack list; merge into the top stack first, then append | stack size per item (theirs, data) |
| Capacity counts slots, not items | slot limit 120 per player (theirs) |
| Push returns the remainder so the caller can drop or refuse it | n/a |
| Pop and peek from the top only | n/a |
| Save only to the owner and disk | audience values disk and playerHimself (theirs; enum definition not read) |

## 4. TypeScript sketch

simplified: items are plain strings (the donor compares whole item values and reads the stack size from the item), there is no u16 amount type, no serialisation (count then stacks), and the audience is reduced to three strings.
```ts
// Licence: GPL-3 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Stack { item: string; amount: number; }
interface Bag { limit: number; slots: Stack[]; }

// Stack size is a property of the item; a stack never exceeds it.
function stackSize(item: string, sizes: Record<string, number>): number {
  return sizes[item] ?? 1;
}

// Push: top up the last slot if it holds the same item, then append while under the slot limit.
// Returns the amount that did not fit.
function push(bag: Bag, incoming: Stack, sizes: Record<string, number>): number {
  let left = incoming.amount;
  const top = bag.slots[bag.slots.length - 1];
  if (top && top.item === incoming.item) {
    const room = stackSize(incoming.item, sizes) - top.amount;
    const add = Math.min(left, room);
    top.amount += add;
    left -= add;
  }
  if (bag.slots.length >= bag.limit) return left;
  if (left > 0) bag.slots.push({ item: incoming.item, amount: left });
  return 0;
}

// Pop: remove and return the top stack, or an empty stack.
function pop(bag: Bag): Stack {
  return bag.slots.pop() ?? { item: "", amount: 0 };
}

// Peek: read from the top without removing; depth 0 is the top.
function peek(bag: Bag, depth: number): Stack {
  return bag.slots[bag.slots.length - 1 - depth] ?? { item: "", amount: 0 };
}

// Save rule: the bag leaves the server only for the owner or the disk.
function canSave(audience: "disk" | "owner" | "other"): boolean {
  return audience === "disk" || audience === "owner";
}
```

## 5. Lands in

- Target: src/loot-claims.ts (what a player holds; named from sibling notes, not opened here) as the server-side bag, written only through the one ledger (origins/contracts/economy.ts). Feature-map: inventory and bank. The server inventory is the authority and the save audience rule belongs with it. Checklist: row 21 (catalogue fields: a per-item stack size) with row 20 (catalogue as runtime source) and row 18 (server-verified loot into the bag).
- Reuse tag: rewrite-from-idea
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- Merging only into the top stack means a partial stack earlier in the list is never refilled. That is a real capacity loss in the donor; Frankendom should decide the rule, and the donor does not show a choice.
- The limit counts slots. A bank with weight or category limits would need a different count.
- `push` is trust-based: nothing here checks who is pushing. The server must gate every push by the owning character.
- The save audience rule is a good shape for a one-ledger model. The donor's client component only loads bytes (bag.zig 55-60); no sync protocol is in the two files read. In Frankendom the client bag must be a read-only view of server rows (server-verified, one ledger).
