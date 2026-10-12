// Licence: GPL-3.0 (donor, EQEmu). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type TradeState = "trading" | "accepted" | "completing";
interface Item { id: string; loreGroup: number | null; noDrop: boolean }
interface Player {
  id: string;
  coin: number;          // balance read from the one ledger (copper-equivalent units)
  bag: Item[];           // items the player owns
  freeSlots: number;     // free bag slots at settle time
  state: TradeState;
  offer: Item[];         // subset of bag
  offerCoin: number;
}
interface Trade { a: Player; b: Player; open: boolean }
type Outcome = "waiting" | "settled" | "cancelled" | "closed";

const MAX_COIN = 2147483647; // int32 cap (data)

// Any change to an offer clears both accept states (donor AddEntity and the coin move both set Trading).
function markDirty(t: Trade): void {
  t.a.state = "trading";
  t.b.state = "trading";
}

function addItem(t: Trade, who: Player, item: Item): boolean {
  if (!t.open) return false;
  if (item.noDrop) return false;                         // donor: NoDrop items cannot enter the trade
  if (!who.bag.includes(item) || who.offer.includes(item)) return false;
  who.offer.push(item);
  markDirty(t);
  return true;
}

function setOfferCoin(t: Trade, who: Player, amount: number): boolean {
  if (!t.open || !Number.isInteger(amount) || amount < 0) return false; // donor: negative amounts dropped
  who.offerCoin = Math.min(amount, who.coin);                           // donor: clamp to balance
  markDirty(t);
  return true;
}

// Lore: the receiver already holds an item of the same lore group.
function loreClash(giver: Player, receiver: Player): boolean {
  return giver.offer.some(
    (i) => i.loreGroup !== null && receiver.bag.some((j) => j.loreGroup === i.loreGroup),
  );
}

// Two accept states must meet; the second accept runs settle once.
function accept(t: Trade, who: Player): Outcome {
  if (!t.open) return "closed";
  who.state = "accepted";
  const other = who === t.a ? t.b : t.a;
  if (other.state !== "accepted") return "waiting";
  t.a.state = "completing";
  t.b.state = "completing";
  const result = settle(t);
  t.open = false;
  return result;
}

// All-or-nothing. Donor settles per item and returns what fails to the giver; this sketch checks first,
// then commits, so a half-finished trade cannot happen.
function settle(t: Trade): Outcome {
  const a = t.a;
  const b = t.b;
  if (loreClash(a, b) || loreClash(b, a)) return "cancelled";
  if (a.offer.some((i) => i.noDrop) || b.offer.some((i) => i.noDrop)) return "cancelled";
  if (!a.offer.every((i) => a.bag.includes(i)) || !b.offer.every((i) => b.bag.includes(i))) return "cancelled";
  if (b.freeSlots < a.offer.length || a.freeSlots < b.offer.length) return "cancelled";

  // Coin: compute both new balances before any write (donor debits the source first).
  const newA = a.coin - a.offerCoin + b.offerCoin;
  const newB = b.coin - b.offerCoin + a.offerCoin;
  if (newA < 0 || newB < 0 || newA > MAX_COIN || newB > MAX_COIN) return "cancelled";

  // Commit: no awaits between these writes.
  const aGive = a.offer;
  const bGive = b.offer;
  a.bag = a.bag.filter((i) => !aGive.includes(i)).concat(bGive);
  b.bag = b.bag.filter((i) => !bGive.includes(i)).concat(aGive);
  a.coin = newA;
  b.coin = newB;
  a.offer = [];
  b.offer = [];
  a.offerCoin = 0;
  b.offerCoin = 0;
  return "settled";
}

// Cancel: nothing moved before settle, so there is nothing to return.
function cancel(t: Trade): void {
  t.open = false;
  t.a.offer = [];
  t.b.offer = [];
  t.a.offerCoin = 0;
  t.b.offerCoin = 0;
}

export {};
