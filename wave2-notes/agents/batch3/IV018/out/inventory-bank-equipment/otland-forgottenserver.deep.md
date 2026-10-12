# otland-forgottenserver (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/otland-forgottenserver | Licence: GPL-2.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"; src headers say GPL-2.0) — clean-room, shape only | C++ | symbol Game::internalMoveItem

Checked: read whole src/depotchest.cpp; src/container.cpp 169-176, 242-332, 334-384, 386-419, 421-489, 491-511, 742-772; src/game.cpp 1073-1298, 1300-1389, 1391-1420, 1850-1866, 2855-2885; src/player.cpp 800-850, 2402-2445, 2590-2672, 2674-2745, 4664-4671; src/game.h:63; config.lua.dist:115-116; data/items/items.xml:4422-4423; data/XML/groups.xml (grep only). Callers of internalMoveItem: 16 call sites found by grep over src/; read 4 of them (game.cpp:1860, 1863, 2867, 2871); not read: mailbox.cpp, house.cpp, monster.cpp, teleport.cpp, weapons.cpp, luascript.cpp, game.cpp:1012, 1067, 1781, 2127, 2287. The move and stack math is high confidence (worked example run on the VPS against the sketch). The exchange-path defect is medium confidence: the code reads as described, reachability not tested. Client UI and protocol send code (sendAddContainerItem and friends) not read.

Best transferable idea: Work out how many items fit and what the whole move will do before changing any state, then commit once and tell the player the part that did not fit.
Decision (proposed): adapt — take the plan-then-commit move with a clamp-and-report partial fit and one holding ledger for bags and the depot; fix the swap-before-recheck and the ignored trade leg in the sketch; do not copy the literal 100s. Why: this is exactly the server-verified move a bag, bank or loot pickup needs, but the slot counts and depot limits belong in item and tier data, not engine code.
Acceptance: a server test moves 150 potions into a 2-slot bag that holds one 90-stack and one free slot: 110 move, the bag shows stacks of 100 and 100, the source keeps 40, and the reply says "bag full" without failing the whole move.

## 1. Mechanism

Order of operations for one move (Game::internalMoveItem, src/game.cpp:1073):
1. Destination resolution. queryDestination follows receivers. For a stackable item (and auto-stack not turned off) it picks the first matching stack below 100 in the container (src/container.cpp:471-487).
2. Destination check. toThing->queryAdd (src/game.cpp:1114). If the answer is NEEDEXCHANGE, the destination item is swapped into the source: the source must accept it (1117), the swap is committed (1136-1139), then the add is checked again (1150).
3. How many fit. queryMaxCount (src/game.cpp:1168). For a container and a stackable item: free slots times 100, plus room in the matching stacks (src/container.cpp:348-373). Non-stackable: free slots only (378).
4. Source check. queryRemove on the source (src/game.cpp:1181).
5. Commit. moveCount = min(count, fit) for stackables (1175). If the moved item equals the destination stack and moveCount is not 100, top that stack up to 100 (1210-1216). Otherwise clone the item to carry only the moved count (1224-1228). Remove from the source, add to the destination, post notifications (1238-1252).
6. Report. If a stackable move did not fit completely, return the query's reason (1275-1276). The part that fitted stays moved.

Depot (the bank): DepotChest::queryAdd (src/depotchest.cpp:14-44) rejects the add when getItemHoldingCount() + addCount > maxDepotItems (line 38). getItemHoldingCount (src/container.cpp:169-176) walks every item, and the iterator descends into non-empty sub-containers (src/container.cpp:754-772). So a bag inside the depot costs its contents too. Each depot id gets its own chest, created on demand (src/player.cpp:819-839), 20 slots each (data/items/items.xml:4423). The limit is the group's maxdepotitems when set, else depotPremiumLimit or depotFreeLimit (src/player.cpp:4664-4671; config.lua.dist:115-116). It is copied onto the chest at creation (src/player.cpp:837).

Equipment and backpack (Player::queryAdd, src/player.cpp:2419-2672): slot-type check first (per-slot SLOTP bits, the case list around 2590-2628), then hasCapacity (weight, 2645-2647), then the onPlayerEquip move event (2650-2655), then NEEDEXCHANGE when the slot is occupied and the item came from a depot chest or the player (2657-2670). "Wherever" capacity for the backpack sums the free room of each bag (src/player.cpp:2683-2719).

Trade (src/game.cpp:2855-2885): both legs are checked first with the test flag (2860-2865; internalRemoveItem returns before removing when test is set, src/game.cpp:1420), then the real moves run (2866-2875). If both trade items sit in backpack slots the trade is refused (2855-2858).

## 2. Key functions

- Game::internalMoveItem, src/game.cpp:1073-1298: the move with exchange, partial fit and merge.
- Game::internalAddItem, src/game.cpp:1307-1389: the add used for pickup-style adds. It tops up a matching stack, clones the remainder and recurses once, and returns the count left over (1338-1352).
- Container::queryMaxCount, src/container.cpp:334-384.
- Container::queryDestination, src/container.cpp:421-489: the auto-stack target.
- DepotChest::queryAdd, src/depotchest.cpp:14-44: the ledger check.
- Player::queryAdd and Player::queryMaxCount, src/player.cpp:2419-2672 and 2674-2745.
- Game::internalRemoveItem with its test flag, src/game.cpp:1391-1420.

## 3. Numbers vs mechanism

- Stack limit: 100 (src/game.h:63). Used for fill, room and split.
- Bag or depot chest: 20 slots (data/items/items.xml:4423, containerSize).
- Depot holding limit: group maxdepotitems (data/XML/groups.xml sets 0 on the groups read, so the config value applies); config depotFreeLimit = 2000 and depotPremiumLimit = 15000 (config.lua.dist:115-116). The count is holding items, not stacks: a 100-stack counts once.
- Worked check (run on the VPS against the sketch below): 2-slot bag, one stack of 90 potions, one free slot, add 150. Room = 1 free slot x 100 + (100 - 90) = 110. Result: 110 moved, stacks [100, 100], source keeps 40, reason "full". The donor gives the same figures by hand from container.cpp:348-373 and game.cpp:1175 and 1211 (not run in the donor).

## 4. TypeScript sketch

simplified: one flat bag per move, no decay, events, tiles, house or invite rules, store items, quiver rules, NEEDEXCHANGE swaps or trade legs. Models Container::queryMaxCount (container.cpp:348-373), Game::internalMoveItem merge, split and remainder (game.cpp:1205-1276) and the DepotChest holding ledger (depotchest.cpp:22-41). Reorders the donor: the whole plan (fills of existing stacks and new stacks) is computed before any mutation, whereas the donor commits a swap before re-checking its add (game.cpp:1136-1150). Fills existing stacks even when the moved count is 100, where the donor skips the merge (game.cpp:1210). The stack limit is one constant; the donor writes the literal 100 in player.cpp.

```ts
const STACK_SIZE = 100;

interface Item {
  id: number;
  count: number;
  stackable: boolean;
  children?: Item[];
}

interface Bag {
  slots: number;
  items: Item[];
  holdingLimit: number; // Infinity for a plain bag; depot uses the group/config limit
}

function holding(items: Item[]): number {
  return items.reduce((n, it) => n + 1 + holding(it.children ?? []), 0);
}

interface Plan {
  moved: number;
  fills: { stack: Item; add: number }[];
  newStacks: number[];
  blocked: "" | "full" | "ledger";
}

function planAdd(bag: Bag, item: Item, want: number): Plan {
  const freeSlots = Math.max(bag.slots - bag.items.length, 0);
  const room = item.stackable
    ? bag.items
        .filter((s) => s.id === item.id && s.stackable && s.count < STACK_SIZE)
        .reduce((n, s) => n + (STACK_SIZE - s.count), 0)
    : 0;
  const capacity = item.stackable ? freeSlots * STACK_SIZE + room : freeSlots;
  const moved = Math.min(want, capacity);

  // fill existing stacks first, then open new slots for the remainder
  const fills: { stack: Item; add: number }[] = [];
  let left = moved;
  if (item.stackable) {
    for (const s of bag.items) {
      if (left === 0) break;
      if (s.id === item.id && s.stackable && s.count < STACK_SIZE) {
        const add = Math.min(STACK_SIZE - s.count, left);
        fills.push({ stack: s, add });
        left -= add;
      }
    }
  }
  const newStacks: number[] = [];
  if (item.stackable) {
    while (left > 0) {
      const n = Math.min(STACK_SIZE, left);
      newStacks.push(n);
      left -= n;
    }
  } else {
    for (let i = 0; i < left; i++) newStacks.push(1);
  }

  // ledger: reject the whole add if the new stacks would exceed the holding limit (depotchest.cpp:38-39)
  const perNew = 1 + holding(item.children ?? []);
  if (newStacks.length > 0 && holding(bag.items) + newStacks.length * perNew > bag.holdingLimit) {
    return { moved: 0, fills: [], newStacks: [], blocked: "ledger" };
  }
  const blocked = moved < want ? "full" : "";
  return { moved, fills, newStacks, blocked };
}

// Plan first, then commit. Returns how many moved and why the rest did not (clamp-and-report).
function moveItem(src: Bag, dst: Bag, item: Item, want: number): { moved: number; blocked: string } {
  if (src === dst) return { moved: 0, blocked: "full" };
  const plan = planAdd(dst, item, want);
  if (plan.moved === 0) return { moved: 0, blocked: plan.blocked || "full" };
  const idx = src.items.indexOf(item);
  if (idx === -1) return { moved: 0, blocked: "full" };

  // commit: take from source
  if (item.stackable && plan.moved < item.count) {
    item.count -= plan.moved;
  } else {
    src.items.splice(idx, 1);
  }
  // commit: merge into destination
  for (const f of plan.fills) f.stack.count += f.add;
  for (const n of plan.newStacks) {
    dst.items.push({ id: item.id, count: n, stackable: item.stackable, children: [] });
  }
  return { moved: plan.moved, blocked: plan.moved < want ? plan.blocked : "" };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/iv018/otland-forgottenserver-move.ts): exit 0. Worked example run (compiled copy on the VPS): moved 110, destination stacks [100, 100], source [40].

## 5. Lands in

Target: origins/inventory/move.ts (proposed name; the Frankendom repo was not opened for this note). Parity row 18 (loot roll and XP award): item ownership and the one ledger. The loot pickup uses the same clamp-and-report add.

## 6. Gaps and risks

- Frankendom rulings: one ledger, matched by the donor's single holding count for bags and the depot. Server-verified: every check here runs before commit; the client only sends the move. Zones as data: none of these numbers is zone-specific; bag slots and depot limits belong in the item and tier catalogue, not engine code.
- Defects (idea kept, fix in the sketch):
  1. The exchange commits before the add is re-checked (src/game.cpp:1136-1139 swap, 1150 re-check, 1162-1164 return). If the re-check fails, the swap stays. Fix: plan both sides before any change, as the sketch does. Reachability not tested.
  2. The second trade leg's result is ignored (src/game.cpp:2871-2872). If it fails, the first leg has already moved. Fix: check the second result and undo the first leg, or plan both legs before commit as in the sketch.
  3. Literal 100 in the player path (src/player.cpp:2704, 2712, 2730, 2736) instead of ITEM_STACK_SIZE. Changing the stack size would leave the player path wrong. Fix: one constant.
- Design choice, not a bug: a full 100 move is never merged into a partial stack (src/game.cpp:1210). The sketch merges it; Frankendom should decide which is the rule.
- Judged safe, not tested: queryMaxCount passes a per-stack counter as the index into queryAdd (src/container.cpp:359). That skips the full-container check at src/container.cpp:310, which is fine because that call only adds room in an existing stack and needs no new slot.
- Not modelled: pagination (DepotChest is paginated, src/depotchest.cpp:11), decay, house and invite rules, store inbox, the body of the move events, the equipment slot-type cases before 2590 (not read), items.cpp loading beyond maxItems, client send code.

Reuse tag: shape-reuse candidate (GPL-2.0, clean room; no code copied).
Brief rule served: judge the idea, not the genre; keep the idea and fix the defects (addendum rule of 2026-10-10); server-verified moves per the one-ledger ruling.
