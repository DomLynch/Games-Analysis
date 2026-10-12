// simplified: keeps the donor's order (room check, then stack-or-append, then flag refused floor items),
// the unit-count capacity, the one-weapon / one-armour / two-ring equip rules, the cursed lock and the swap-back memory.
// fixes: the donor gate checks count < MAX before adding the incoming quantity (donor line 866); this gate checks
// that the incoming units fit (count + units needed <= MAX), so a stack can never push the pack past 26.
// Omits: gold (not in pack), inventory letters, category-sorted pack order, armour donning countdown, strength checks,
// gem origin-depth match, drop-one-from-stack, prompts and messages, and the equip turn cost.
type Cat = "weapon" | "armor" | "ring" | "potion" | "scroll" | "food" | "gem";
interface It {
  id: number; cat: Cat; kind: number; quantity: number;
  enchant: number; strReq: number; cursed: boolean; quiverNo: number; avoidAuto: boolean;
}
type Slot = "weapon" | "armor" | "ringL" | "ringR";
interface Pack {
  items: It[];
  weapon: It | null; armor: It | null; ringL: It | null; ringR: It | null;
  swappedIn: It | null; swappedOut: It | null;
}
const MAX_PACK_ITEMS = 26;
const STACKS: Cat[] = ["food", "potion", "scroll", "gem"];

// donor: weapons and gems count 1 each; everything else counts by quantity
function countPack(p: Pack): number {
  return p.items.reduce((n, it) => n + (it.cat === "weapon" || it.cat === "gem" ? 1 : it.quantity), 0);
}

// donor: a stack with no extra slot cost (quiver weapon or gem with a sibling); false for potions and scrolls
function willStackWithPack(p: Pack, it: It): boolean {
  if (it.cat === "gem") return p.items.some((o) => o.cat === "gem");
  if (it.cat === "weapon" && it.quiverNo > 0) return p.items.some((o) => o.quiverNo === it.quiverNo);
  return false;
}

type Pickup = "taken" | "stacked" | "refused";
// units the incoming item adds to the pack count (weapons and gems: 1 or 0 if it stacks for free)
function unitsNeeded(p: Pack, it: It): number {
  if (it.cat === "weapon" || it.cat === "gem") return willStackWithPack(p, it) ? 0 : 1;
  return it.quantity;
}

function pickUp(p: Pack, it: It): Pickup {
  if (countPack(p) + unitsNeeded(p, it) <= MAX_PACK_ITEMS) {
    const same = findStack(p, it);
    if (same) {
      same.quantity += it.quantity;
      same.enchant = Math.max(same.enchant, it.enchant); // keep the higher enchant
      same.strReq = Math.min(same.strReq, it.strReq); // keep the lower strength need
      return "stacked";
    }
    p.items.push(it);
    return "taken";
  }
  it.avoidAuto = true; // refused: auto-collect must not retry it
  return "refused";
}

function findStack(p: Pack, it: It): It | undefined {
  const stackable = STACKS.includes(it.cat) || (it.cat === "weapon" && it.quiverNo > 0);
  if (!stackable) return undefined;
  return p.items.find((o) => o.cat === it.cat && o.kind === it.kind &&
    (it.cat !== "weapon" || o.quiverNo === it.quiverNo));
}

function unequip(p: Pack, slot: Slot, force: boolean): boolean {
  const cur = p[slot];
  if (cur === null) return true;
  if (cur.cursed && !force) return false; // cursed: refused, nothing changes
  p[slot] = null;
  return true;
}

// hint names the ring to replace when both ring slots are full
function equip(p: Pack, it: It, hint: It | null): boolean {
  if (it.cat === "weapon") {
    if (!unequip(p, "weapon", false)) return false;
    p.weapon = it;
  } else if (it.cat === "armor") {
    if (!unequip(p, "armor", false)) return false;
    p.armor = it;
  } else if (it.cat === "ring") {
    if (p.ringL && p.ringR) {
      const slot: Slot | null = hint === p.ringL ? "ringL" : hint === p.ringR ? "ringR" : null;
      if (slot === null || !unequip(p, slot, false)) return false;
    }
    if (p.ringL === null) p.ringL = it; else p.ringR = it;
  } else {
    return false;
  }
  return true;
}

// remembers what was replaced so one key can swap back (donor: swappedIn / swappedOut)
function equipAndRemember(p: Pack, it: It, replaced: It | null): boolean {
  if (!equip(p, it, replaced)) return false;
  p.swappedOut = replaced;
  p.swappedIn = replaced ? it : null;
  return true;
}

function swapBack(p: Pack): boolean {
  if (p.swappedIn === null || p.swappedOut === null) return false;
  if (!equip(p, p.swappedOut, p.swappedIn)) return false;
  const t = p.swappedIn;
  p.swappedIn = p.swappedOut;
  p.swappedOut = t;
  return true;
}

export {};
