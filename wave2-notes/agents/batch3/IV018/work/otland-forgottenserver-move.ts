// simplified: one flat bag per move, no decay, events, tiles, house/invite rules, store items, quiver rules,
// NEEDEXCHANGE swaps or trade legs. Models Container::queryMaxCount (container.cpp:348-373),
// Game::internalMoveItem merge/split/remainder (game.cpp:1205-1276) and the DepotChest holding ledger
// (depotchest.cpp:22-41). Reorders the donor: the whole plan (both the fill of existing stacks and the new
// stacks) is computed before any mutation, while the donor commits a swap before re-checking its add
// (game.cpp:1136-1150). Fills existing stacks even when the moved count is 100, where the donor skips the
// merge (game.cpp:1210). The stack limit is one constant; the donor writes the literal 100 in player.cpp.

export {};

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
