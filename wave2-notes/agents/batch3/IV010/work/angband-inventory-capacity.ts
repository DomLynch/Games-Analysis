// Licence: GPL-2.0 or the "Angband licence" (donor, dual). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Stack { kind: string; number: number; max: number; }
interface Pack { slots: number; stacks: Stack[]; }

// How many of an incoming pile fit in the pack right now: a free slot takes the whole pile,
// otherwise only what the same-kind stacks have headroom for is taken. The rest stays on the ground.
function carryCount(pack: Pack, kind: string, incoming: number, max: number): number {
  const freeSlots = pack.slots - pack.stacks.length;
  if (freeSlots > 0) return incoming;
  let headroom = 0;
  for (const s of pack.stacks) {
    if (s.kind === kind) headroom += Math.max(0, max - s.number);
  }
  return Math.min(incoming, headroom);
}

// Top up one stack from another as far as the cap allows; returns what is left in `from`.
function topUp(into: Stack, from: Stack): number {
  const moved = Math.min(into.max - into.number, from.number);
  into.number += moved;
  from.number -= moved;
  return from.number;
}

// After an add the pack may hold one slot too many; the last slot is dropped to the ground.
function overflowDrop(pack: Pack): Stack | null {
  if (pack.stacks.length <= pack.slots) return null;
  return pack.stacks.pop() ?? null;
}

// Demo values: 0 free slots, one potion stack of 35 with cap 40, pile of 12.
const pack: Pack = { slots: 1, stacks: [{ kind: "potion", number: 35, max: 40 }] };
const taken = carryCount(pack, "potion", 12, 40);
export { taken, topUp, overflowDrop };
