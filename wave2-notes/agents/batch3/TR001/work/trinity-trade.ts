// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Item { id: string; canBeTraded: boolean; boundTo: string | null }
interface Side {
  playerId: string;
  x: number;
  y: number;
  offer: Item[];       // items this side offers (references, not escrowed)
  money: number;       // copper offered
  accepted: boolean;
  version: number;     // id of THIS side's current offer; changes on every edit
}
interface Trade { a: Side; b: Side; open: boolean }
interface Ledger {
  money: Map<string, number>;   // balances
  owner: Map<string, string>;   // item id -> owner id
  freeSlots: Map<string, number>;
}
type Result = "waiting" | "settled" | "refused" | "stale" | "far" | "closed";

const TRADE_DISTANCE = 11.11;            // donor ObjectDefines.h (yards)
const MAX_MONEY = 99999999999;           // donor Player.h (copper)

function newVersion(): number {
  // Random id so a client cannot precompute the next value (donor uses rand32).
  return Math.floor(Math.random() * 4294967296);
}

function dist(a: Side, b: Side): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Any edit bumps this side's version and clears both accepts (donor SetItem / SetMoney).
function setOffer(t: Trade, who: "a" | "b", items: Item[], money: number, l: Ledger): boolean {
  if (!t.open) return false;
  const me = t[who];
  if (!Number.isInteger(money) || money < 0) return false;
  if ((l.money.get(me.playerId) ?? 0) < money) return false;          // refuse at write, not only at confirm
  for (const it of items) {
    if (!it.canBeTraded) return false;
    if (it.boundTo !== null && it.boundTo !== (who === "a" ? t.b : t.a).playerId) return false;
    if (l.owner.get(it.id) !== me.playerId) return false;
  }
  me.offer = items;
  me.money = money;
  me.version = newVersion();
  t.a.accepted = false;
  t.b.accepted = false;
  return true;
}

// The accept names the partner's offer version the accepter saw (donor StateIndex check).
function accept(t: Trade, who: "a" | "b", seenPartnerVersion: number, l: Ledger): Result {
  if (!t.open) return "closed";
  const me = t[who];
  const other = who === "a" ? t.b : t.a;
  if (other.version !== seenPartnerVersion) return "stale";          // offer changed under the accepter
  if (dist(me, other) > TRADE_DISTANCE) return "far";
  me.accepted = true;
  if (!other.accepted) return "waiting";

  // Both accepted: re-check everything at the moment of settle (donor Update path).
  for (const [s, o] of [[t.a, t.b], [t.b, t.a]] as const) {
    if ((l.money.get(s.playerId) ?? 0) < s.money) return refuse(t);
    if ((l.money.get(o.playerId) ?? 0) + s.money > MAX_MONEY) return refuse(t);
    for (const it of s.offer) {
      if (!it.canBeTraded) return refuse(t);
      if (it.boundTo !== null && it.boundTo !== o.playerId) return refuse(t);
      if (l.owner.get(it.id) !== s.playerId) return refuse(t);
    }
    if ((l.freeSlots.get(o.playerId) ?? 0) < s.offer.length) return refuse(t);
  }

  // Commit: compute everything, then write. One step, no awaits.
  const newMoney = new Map(l.money);
  const newOwner = new Map(l.owner);
  const newFree = new Map(l.freeSlots);
  for (const [s, o] of [[t.a, t.b], [t.b, t.a]] as const) {
    newMoney.set(s.playerId, (newMoney.get(s.playerId) ?? 0) - s.money);
    newMoney.set(o.playerId, (newMoney.get(o.playerId) ?? 0) + s.money);
    for (const it of s.offer) newOwner.set(it.id, o.playerId);
    newFree.set(s.playerId, (newFree.get(s.playerId) ?? 0) + s.offer.length);
    newFree.set(o.playerId, (newFree.get(o.playerId) ?? 0) - s.offer.length);
  }
  l.money = newMoney;
  l.owner = newOwner;
  l.freeSlots = newFree;
  t.open = false;
  return "settled";
}

function refuse(t: Trade): Result {
  t.a.accepted = false;
  t.b.accepted = false;
  return "refused";
}

// Cancel: nothing was escrowed, so nothing to return.
function cancel(t: Trade): void {
  t.open = false;
}

export {};
