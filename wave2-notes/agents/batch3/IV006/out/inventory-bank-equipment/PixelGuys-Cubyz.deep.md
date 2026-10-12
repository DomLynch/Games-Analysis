# PixelGuys-Cubyz (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/PixelGuys-Cubyz/src/Inventory.zig (with src/entityComponent/bag.zig and src/sync.zig) | Licence: GNU GPL v3 as read (LICENSE line 2: "Version 3, 29 June 2007") | Zig | symbol Inventories.putItemsInto, Inventories.removeItems, BagInventory.push, BagInventory.pop, Inventory.canHold, CraftFrom (sync.zig)

Checked: opened bag.zig 1-106 (whole file); Inventory.zig 355-390, 452-530, 640-660, 710-770, 810-932; sync.zig 418-436, 735-764, 798-830, 1003-1016, 1076-1090, 1298-1312, 1440-1456, 1486-1520; LICENSE. Grepped src for inventory/stack/bag (many hits, mostly rendering, world and terrain; I opened only the files above). Not read: sync.zig command transport (executeCommand at 74, 183, 228 and the serializer), the body of Command.executeBaseOperation for move and swap (780-800), Inventory.zig 1-355 and 390-450 (ids, server inventory creation, ClientInventory setup), 530-640, 770-810, BlockDrop.zig (loot drops), gui/components/BagSlot.zig (bag UI), the items stackSize definition, and the shipped recipe data. Candidate files checked for the topic: bag.zig, Inventory.zig, sync.zig, BlockDrop.zig and BagSlot.zig were the candidates; the last two were grep hits I did not open, so loot drops and the bag UI are not covered. Defect claims below are reasoned from the code and not executed. Confidence high for the fill, bag and command rules; medium for the removeItems defect (single caller, read in full). Camera: not a camera topic.

Best transferable idea: Make every inventory change a server-run command that first checks the whole outcome (can it hold, is there enough) and then applies it in fixed steps, while the fill policy tops up partial stacks before it opens an empty slot, and the bag is a LIFO list of same-item runs.
Decision (proposed): adapt — keep the command shape (client sends intent, server checks then applies, client shows the result), the fill-partial-first policy, the canHold precheck and the LIFO bag runs; fix the two defects below; drop the engine's per-entity component plumbing (bag.zig's load, save and unload), which we would not copy.
Acceptance: a server test crafts a recipe that needs 100 of an item whose stack is 64 held in two full stacks; the server removes exactly 100 (two stacks, 64 and 36) and rejects the craft if the result cannot fit, with no ingredient removed on rejection.

## 1. Mechanism
Each inventory is a fixed array of slots, each slot holds an item and an amount. Client-side actions (deposit, swap, take half, drop, craft, move to bag) are functions that issue sync commands (Inventory.zig:452-520, which call sync.client.executeCommand; that client function at sync.zig:74 was not read, so I do not claim whether it also predicts locally). On the server side, the command code builds the sync operations for the clients (sync.zig:735-749 appends them when side is server). For stacking, Inventories.putItemsInto (Inventory.zig:859-895) fills matching partial stacks first, in inventory order, up to the item's stack size; any remainder goes to an empty slot of the same inventory if the inventory already holds the item, otherwise to the first empty slot seen. Inventories.removeItems (Inventory.zig:899-931) takes the amount from partial stacks in reverse slot order, then from one full stack. Inventory.canHold (643-656) and Inventories.canHold (814-823) answer whether an amount fits without changing anything; CraftFrom (sync.zig:1486-1516) calls them and then runs: precheck ingredient totals (1490-1506), remove each ingredient with removeItems (1510), put the result with putItemsInto (1513).

The player bag (bag.zig) is a BagInventory: a list of item stacks used as a stack with a top. push (Inventory.zig:745-757) merges into the top stack only, then opens a new top stack while under the slot limit (playerBagSizeLimit = 120, bag.zig:34). pop (760) removes the top. takeFromBag (sync.zig:818-830) moves up to the amount from the top run of the same item, clamped to the stack size (823), and stops at the first different item. Bag contents are saved to disk and to the owner only (bag.zig:72). Pickup into the player inventory (Inventory.zig:360-385) fills matching stacks up to the stack size (369), then sends the rest to the first empty slot (377-378).

## 2. Key functions
- Inventories.putItemsInto (Inventory.zig:859-895): partial stacks first (the `std.meta.eql` branch); if an empty slot exists in an inventory that already holds the item (886), the remainder is created there (887); otherwise the remainder goes to the first empty slot seen (after the loop).
- Inventories.removeItems (Inventory.zig:899-931): reverse scan; partial stacks are deleted first (907-916, the full-stack skip is at 908); the first full stack seen is recorded (910); after the loop one delete of at most one stack size is issued from that stack (925-929).
- Inventory.canHold (643-656) and Inventories.canHold (814-823): sum of room; no mutation.
- sync.zig CraftFrom (1486-1516): precheck of total ingredients across all inventories; removeItems per ingredient (1510); putItemsInto of the result (1513); the code asserts nothing is left (1514, not quoted).
- sync.zig executeAddOperation (735-749): asserts the amount does not exceed the stack size (748). The wire form of create refuses an overflow (sync.zig:429).
- BagInventory.push (Inventory.zig:745-757): top-run merge (748), slot-limit refusal (752), whole-remainder append (755).
- sync.zig takeFromBag (818-830) and the sum of the top run for a take-from-bag command (1440-1450).

## 3. Numbers vs mechanism
- Bag slot limit: 120 (bag.zig:34), passed to both the client and server bag at load (58, 95, 100).
- Stack size: per item (item.stackSize(), definition not read). Fill arithmetic: room = stackSize minus current amount (Inventory.zig:650, 879 not quoted).
- takeFromBag take: min(requested, stackSize of the top item) (sync.zig:823).
- Defects (read, not executed):
  (a) removeItems: with two full stacks of 64 and a recipe that needs 100, the reverse scan skips both full stacks, records only the first (910), and issues one delete of min(100, 64) = 64 (928). The remaining 36 are not removed, and CraftFrom still creates the result. The precheck (1490-1506) passes because it counts 128 >= 100. So a recipe that spans more than one full stack is under-charged. Fix: loop over full stacks, deleting min(remaining, stack amount) each time, as the sketch does.
  (b) putItemsInto: when the inventory holds a full stack of the item and has an empty slot, the first loop adds 0 and sets hasItem; the remainder is then created in the empty slot without a clamp (887). With a result amount above the stack size (for example a recipe whose result amount is greater than the stack size), this reaches the assert at sync.zig:748. Whether any shipped recipe has a result amount above its stack size is not checked (recipe data not read). Fix: clamp the create to the stack size and loop, as the sketch does.
  (c) BagInventory.push appends the whole remainder as one slot (755) with no clamp. The current callers pass at most one stack (moveToBag takes from a single source stack), so this is latent, not reached. Pickup (378) has the same unclamped pattern; whether dropped stacks can exceed the stack size is not checked. Fix: clamp each new slot, as the sketch does.

## 4. TypeScript sketch
simplified: Single inventory array instead of the donor's list of inventories; no canPutInto callbacks, durability, creative or sync-command queue (the sketch applies changes directly; the donor queues them as commands and the server serialises them). Item and stack are plain values; stack sizes come from a Map (the donor reads item.stackSize()). The bag is a class with a slot limit (donor: playerBagSizeLimit). FIX comments mark the three changes (push clamp, put clamp, removeItems loop). craft() adds a copy-based check that the result fits before any ingredient is removed (the donor checks the result with canHold at 1488, then does the precheck). The ingredient precheck sums across this one array; the donor sums across all inventories. Duplicate recipe inputs are not merged in the sketch.

```ts
type Item = string;
interface Stack { item: Item | null; amount: number }

// Data half: stack size per base item (donor: item.stackSize()). Unknown item = 1 here.
const STACK_SIZE = new Map<string, number>([["stone", 64], ["coin", 100]]);
const stackSizeOf = (item: Item): number => STACK_SIZE.get(item) ?? 1;

// Bag: LIFO list of same-item runs. Merges only into the top run; capped by slot count (donor: playerBagSizeLimit = 120).
class Bag {
  slots: Stack[] = [];
  constructor(private sizeLimit: number) {}

  // Returns the amount that did not fit.
  push(s: Stack): number {
    let amount = s.amount;
    const top = this.slots[this.slots.length - 1];
    if (top && top.item === s.item) {
      const add = Math.min(amount, stackSizeOf(s.item!) - top.amount);
      top.amount += add;
      amount -= add;
    }
    // FIX: donor appends the whole remainder as one slot; this clamps each new slot to the stack size.
    while (amount > 0 && this.slots.length < this.sizeLimit) {
      const put = Math.min(amount, stackSizeOf(s.item!));
      this.slots.push({ item: s.item, amount: put });
      amount -= put;
    }
    return amount;
  }

  pop(): Stack {
    return this.slots.pop() ?? { item: null, amount: 0 };
  }

  peek(offsetFromTop: number): Stack {
    return this.slots[this.slots.length - 1 - offsetFromTop] ?? { item: null, amount: 0 };
  }
}

// Take up to amount of the top item run; stop at the first different item (donor: takeFromBag).
function takeFromBag(bag: Bag, amount: number): { item: Item | null; taken: number } {
  const first = bag.peek(0);
  if (first.item === null) return { item: null, taken: 0 };
  let want = Math.min(amount, stackSizeOf(first.item));
  let taken = 0;
  while (want > 0 && bag.peek(0).item === first.item) {
    const top = bag.peek(0);
    const n = Math.min(top.amount, want);
    taken += n;
    want -= n;
    top.amount -= n;
    if (top.amount === 0) bag.pop();
  }
  return { item: first.item, taken };
}

// Fill matching partial stacks first; the rest goes to the first empty slot, clamped to the stack size.
// FIX: donor sends the whole remainder to the empty slot, which can exceed the stack size.
function putItems(inv: Stack[], amount: number, item: Item): number {
  let left = amount;
  let firstEmpty = -1;
  for (let i = 0; i < inv.length; i++) {
    const s = inv[i];
    if (s.item === null && firstEmpty < 0) firstEmpty = i;
    if (s.item === item) {
      const n = Math.min(stackSizeOf(item) - s.amount, left);
      s.amount += n;
      left -= n;
      if (left === 0) return 0;
    }
  }
  if (firstEmpty >= 0 && left > 0) {
    const put = Math.min(left, stackSizeOf(item));
    inv[firstEmpty] = { item, amount: put };
    left -= put;
  }
  return left;
}

// Remove amount of one item: partial stacks first (last to first), then full stacks. Loops over every stack.
// FIX: donor deletes at most one stack size from only the first full stack, so a recipe spanning two full stacks is under-charged.
function removeItems(inv: Stack[], amount: number, item: Item): number {
  let left = amount;
  for (const pass of [0, 1]) {
    for (let i = inv.length - 1; i >= 0 && left > 0; i--) {
      const s = inv[i];
      if (s.item !== item) continue;
      if (pass === 0 && s.amount === stackSizeOf(item)) continue;
      const n = Math.min(left, s.amount);
      s.amount -= n;
      left -= n;
      if (s.amount === 0) s.item = null;
    }
  }
  return left; // 0 when the whole amount was removed
}

// Craft: check the result fits on a copy, check ingredient totals, then remove ingredients and put the result.
// Nothing changes unless the whole recipe is covered (donor: CraftFrom precheck, then removeItems, then putItemsInto).
function craft(inv: Stack[], recipe: { inputs: [Item, number][]; output: [Item, number] }): boolean {
  const probe = inv.map((s) => ({ ...s }));
  if (putItems(probe, recipe.output[1], recipe.output[0]) !== 0) return false;
  for (const [item, need] of recipe.inputs) {
    const have = inv.filter((s) => s.item === item).reduce((a, s) => a + s.amount, 0);
    if (have < need) return false;
  }
  for (const [item, need] of recipe.inputs) {
    if (removeItems(inv, need, item) !== 0) throw new Error("ingredient precheck and removal disagree");
  }
  return putItems(inv, recipe.output[1], recipe.output[0]) === 0;
}

export {};
```

Typecheck: copied to the VPS /tmp and run `npx -p typescript tsc --noEmit --strict --target es2020` there: passed with no errors.

## 5. Lands in
Target: origins/server/inventory-ops.ts (proposed new module; the Frankendom repo was not read). Parity row 18 (loot roll and XP award): pickup into the bag, the stack-fill rule for loot, and the craft or sell that spends stacks. Not row 15 (gear dressing).

## 6. Gaps and risks
- Server-verified: this is the closest donor to the Frankendom ruling. Keep the command shape: the client sends intent, the server runs check then apply, and the client shows the result. The sketch applies directly; the server must apply the same ops in one transaction.
- One ledger: the craft path removes ingredients and adds a result in two steps. Frankendom needs one ledger entry per craft or move, written after the checks. Do not copy the step-wise writes without a transaction.
- Defects (a) and (b) above are the reasons not to copy the code as is. Defect (c) is latent.
- Bag as LIFO runs: takeFromBag stops at the first different item (sync.zig:818-830), so a same-item stack under another item is unreachable until that item is taken. That is a design choice; for a loot bag that a player can sort, it is a gap.
- Pickup order: tryCollectingToPlayerInventory iterates a hash map of the player's inventories (Inventory.zig:360-363), so the inventory that receives loot is not defined by order. Fix: iterate in a fixed order.
- Loot presentation (drop ceremony, rarity colour, phone inspect) is not in the code I read; BlockDrop.zig and BagSlot.zig were not opened.
- MAX_ATTACKERS = 3 does not apply to inventory.

Reuse tag: reuse-first: the OpenTTD-OpenTTD merge cap and staged-move note (cell 9) covers merge and per-step budget; this note covers the command-and-fill side. No prior Frankendom inventory PR was checked (not searched in our repo).
Brief rule served: rules 1-4 and the anti-strictness rules (judged the idea; read the real code; receipts verified; sketch typechecked; unread parts marked; defects reasoned, not run).
