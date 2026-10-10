// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Who = "a" | "b";
interface Offer {
  items: (string | null)[];   // traded slots (6); an item id per slot
  gold: number;
  accepted: boolean;
  index: number;              // server state index for this offer; re-rolled when this offer changes
}
interface Trade { a: Offer; b: Offer; }
type Outcome = "state-changed" | "partner-pending" | "no-space" | "committed" | "invalid";

const other = (w: Who): Who => (w === "a" ? "b" : "a");
const newIndex = (rng: () => number): number => Math.floor(rng() * 4294967296);   // 32-bit random

// Any change to a side's offer clears BOTH accepts; only the changed side's index re-rolls.
function changeOffer(t: Trade, who: Who, change: (o: Offer) => boolean, rng: () => number): boolean {
  const o = t[who];
  if (!change(o)) return false;               // no-op: nothing changed, so nothing resets
  t.a.accepted = false;
  t.b.accepted = false;
  o.index = newIndex(rng);
  return true;
}

// Accept. The accepter quotes the partner's index it last saw; a mismatch unaccepts and reports state-changed.
// Both sides are checked for room before anything moves; the move is then one atomic step.
function accept(
  t: Trade,
  who: Who,
  quotedPartnerIndex: number,
  canStore: (to: Who, items: string[]) => boolean,
  ledger: {
    removeItem(from: Who, slot: number): void;
    storeItem(to: Who, item: string): void;
    addGold(who: Who, delta: number): void;
  },
): Outcome {
  const me = t[who];
  const them = t[other(who)];
  me.accepted = true;
  if (them.index !== quotedPartnerIndex) {
    me.accepted = false;
    return "state-changed";
  }
  if (!them.accepted) return "partner-pending";

  const mineItems = me.items.filter((x): x is string => x !== null);
  const theirItems = them.items.filter((x): x is string => x !== null);
  if (!canStore(other(who), mineItems) || !canStore(who, theirItems)) {
    t.a.accepted = false;
    t.b.accepted = false;
    return "no-space";
  }

  for (let i = 0; i < me.items.length; i++) {
    if (me.items[i] !== null) ledger.removeItem(who, i);
    if (them.items[i] !== null) ledger.removeItem(other(who), i);
  }
  for (const item of mineItems) ledger.storeItem(other(who), item);
  for (const item of theirItems) ledger.storeItem(who, item);
  ledger.addGold(who, them.gold - me.gold);
  ledger.addGold(other(who), me.gold - them.gold);
  return "committed";
}

export {};
