// Licence: BSD-2-Clause (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Outcome = "not-same" | "dest-full" | "merged-all" | "merged-part" | "new-stack";

interface Stack {
  key: string;        // type + status + beatitude + model, compared before appearance
  appearance: number; // compared only where the donor asks for it
  count: number;
  stackable: boolean; // donor: Item::shouldItemStack
  limit: number;      // donor: Item::getMaxStackLimit (1 when the item does not stack)
}

interface Plan {
  outcome: Outcome;
  srcAfter: number;   // count the moving stack keeps
  dstAfter: number;   // count the destination stack becomes (new stack: the amount it takes)
}

// One merge of src into dst. Reads only; nothing is changed.
function planMerge(src: Stack, dst: Stack): Plan {
  const keep = (o: Outcome): Plan => ({ outcome: o, srcAfter: src.count, dstAfter: dst.count });
  if (src.key !== dst.key) return keep("not-same");
  if (!dst.stackable) return keep(src.appearance === dst.appearance ? "dest-full" : "not-same");
  if (dst.count >= dst.limit) return keep("dest-full");
  const total = src.count + dst.count;
  if (total > dst.limit) {
    return { outcome: "merged-part", srcAfter: total - dst.limit, dstAfter: dst.limit };
  }
  return { outcome: "merged-all", srcAfter: 0, dstAfter: total };
}

// Bag scan in slot order: the first stack that accepts any of the item wins.
// If none does, the item needs a new stack and takes up to its limit.
function planIntoBag(src: Stack, bag: Stack[]): { plan: Plan; into: number } {
  for (let i = 0; i < bag.length; i++) {
    const p = planMerge(src, bag[i]);
    if (p.outcome === "not-same" || p.outcome === "dest-full") continue;
    return { plan: p, into: i };
  }
  const taken = Math.min(src.count, src.limit);
  return { plan: { outcome: "new-stack", srcAfter: src.count - taken, dstAfter: taken }, into: -1 };
}

// The only mutation. Returns how many moved; 0 means nothing changed.
function moveIntoBag(src: Stack, bag: Stack[], freeSlots: number): number {
  const { plan, into } = planIntoBag(src, bag);
  const moved = src.count - plan.srcAfter;
  if (moved <= 0) return 0;
  if (plan.outcome === "new-stack" && freeSlots <= 0) return 0; // no room: nothing changes
  if (into >= 0) bag[into].count = plan.dstAfter;
  else bag.push({ ...src, count: plan.dstAfter });
  src.count = plan.srcAfter;
  return moved;
}

export {};
