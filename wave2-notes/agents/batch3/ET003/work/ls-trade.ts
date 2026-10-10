// Licence: MIT (donor). Re-expressed from the described mechanism; not a line-by-line translation.
type Stack = { id: number; count: number };
type Bag = { slots: (Stack | null)[] };
type Side = { owner: string; bag: Bag; offer: Stack[] };
type Ground = { id: number; count: number; owner: string; ttlTicks: number };
type ItemMeta = { cost: number; stackable: boolean };
type TradeRow = { a: string; b: string; aValue: number; bValue: number; aItems: Stack[]; bItems: Stack[] };

const GROUND_TTL_TICKS = 200; // donor value (InvOps.ts 430); here it is zone data

// Returns how many units fit in the bag (donor: Inventory.add returns the completed count).
function bagAdd(bag: Bag, id: number, count: number, meta: ItemMeta): number {
  if (meta.stackable) {
    const hit = bag.slots.findIndex(s => s !== null && s.id === id);
    const idx = hit !== -1 ? hit : bag.slots.indexOf(null);
    if (idx === -1) return 0;
    const cur = bag.slots[idx]?.count ?? 0;
    bag.slots[idx] = { id, count: cur + count };
    return count;
  }
  let added = 0;
  for (let i = 0; i < bag.slots.length && added < count; i++) {
    if (bag.slots[i] === null) {
      bag.slots[i] = { id, count: 1 };
      added++;
    }
  }
  return added;
}

// Receiver's bag first; any overflow lands on the floor, reserved to the receiver.
function place(to: Side, stack: Stack, ground: Ground[], meta: (id: number) => ItemMeta): void {
  const added = bagAdd(to.bag, stack.id, stack.count, meta(stack.id));
  const overflow = stack.count - added;
  if (overflow > 0) {
    ground.push({ id: stack.id, count: overflow, owner: to.owner, ttlTicks: GROUND_TTL_TICKS });
  }
}

// One call for the whole swap. Both offers are taken before anything moves, so the ledger row
// records both sides as they were offered.
function swapOffers(a: Side, b: Side, ground: Ground[], meta: (id: number) => ItemMeta, ledger: TradeRow[]): void {
  const aOffer = a.offer.splice(0);
  const bOffer = b.offer.splice(0);
  const value = (xs: Stack[]): number => xs.reduce((sum, s) => sum + meta(s.id).cost * s.count, 0);
  ledger.push({ a: a.owner, b: b.owner, aValue: value(aOffer), bValue: value(bOffer), aItems: aOffer, bItems: bOffer });
  for (const s of aOffer) place(b, s, ground, meta);
  for (const s of bOffer) place(a, s, ground, meta);
}
