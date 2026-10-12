// Licence: GPL-3.0 (donor, OpenDAoC-OpenDAoC-Core LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ItemId = number;

interface Account { id: number; money: number; freeSlots: number; owned: Set<ItemId>; }
interface Offer { items: ItemId[]; money: number; accepted: boolean; }
interface Trade { a: Account; b: Account; offerA: Offer; offerB: Offer; open: boolean; }

const MAX_ITEMS = 10; // per side, as in the donor

// Lock on change: any edit clears BOTH accepts.
function clearAccepts(t: Trade): void {
  t.offerA.accepted = false;
  t.offerB.accepted = false;
}

function addItem(t: Trade, side: "a" | "b", id: ItemId): boolean {
  const acct = side === "a" ? t.a : t.b;
  const offer = side === "a" ? t.offerA : t.offerB;
  if (!acct.owned.has(id) || offer.items.includes(id) || offer.items.length >= MAX_ITEMS) return false;
  offer.items.push(id); // a reference: the item stays with its owner until settle
  clearAccepts(t);
  return true;
}

// An item that leaves an account (moved, sold, dropped) falls out of any offer that holds it.
function itemLeft(t: Trade, id: ItemId): void {
  t.offerA.items = t.offerA.items.filter(x => x !== id);
  t.offerB.items = t.offerB.items.filter(x => x !== id);
  clearAccepts(t);
}

function refuse(t: Trade): "refused" {
  clearAccepts(t);
  return "refused";
}

function accept(t: Trade, side: "a" | "b"): "waiting" | "settled" | "refused" {
  (side === "a" ? t.offerA : t.offerB).accepted = true;
  if (!(t.offerA.accepted && t.offerB.accepted)) return "waiting";
  return settle(t);
}

function transfer(from: Account, to: Account, offer: Offer): void {
  from.money -= offer.money;
  to.money += offer.money;
  for (const id of offer.items) {
    if (!from.owned.delete(id)) throw new Error("item vanished during settle");
    to.owned.add(id);
  }
}

// 1. Checks only (nothing moves). 2. Apply, with a copy to restore if a step throws.
function settle(t: Trade): "settled" | "refused" {
  const pairs = [
    { from: t.a, offer: t.offerA, to: t.b },
    { from: t.b, offer: t.offerB, to: t.a },
  ];
  for (const p of pairs) {
    if (p.from.money < p.offer.money) return refuse(t);
    if (p.offer.items.some(id => !p.from.owned.has(id))) return refuse(t);
  }
  // net slots: items arriving minus items leaving, per side
  const needA = Math.max(0, t.offerB.items.length - t.offerA.items.length);
  const needB = Math.max(0, t.offerA.items.length - t.offerB.items.length);
  if (t.a.freeSlots < needA || t.b.freeSlots < needB) return refuse(t);

  const saved = [t.a, t.b].map(acct => ({ acct, money: acct.money, owned: new Set(acct.owned) }));
  try {
    for (const p of pairs) transfer(p.from, p.to, p.offer);
  } catch {
    for (const s of saved) {
      s.acct.money = s.money;
      s.acct.owned = s.owned;
    }
    return refuse(t);
  }
  t.open = false;
  return "settled";
}

export {}
