// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ItemRef = { id: string; canTrade: boolean };
type Currency = "gold" | "plat";
interface Wallet { gold: number; plat: number }
interface Offer { items: ItemRef[]; gold: number; plat: number }
interface Side { playerId: string; offer: Offer; accepted: boolean }
interface Trade { a: Side; b: Side; open: boolean }
type Row =
  | { kind: "item"; itemId: string; from: string; to: string }
  | { kind: Currency; amount: number; from: string; to: string };
interface Ledger { wallets: Map<string, Wallet>; owner: Map<string, string> }

const MAX_BALANCE = 2147483647; // int32 cap (donor Account.DepositPlat has no check; fix here)
const RANGE_TILES = 2;          // donor InRange(..., 2)
const ZERO: Wallet = { gold: 0, plat: 0 };

function walletOf(l: Ledger, id: string): Wallet {
  return l.wallets.get(id) ?? ZERO;
}

// Client input is validated at write time (donor gap: no lower bound, no balance check on write).
function offerIsValid(o: Offer, w: Wallet, ownerOf: (id: string) => string | undefined, who: string): boolean {
  if (!Number.isInteger(o.gold) || !Number.isInteger(o.plat)) return false;
  if (o.gold < 0 || o.plat < 0) return false;
  if (o.gold > w.gold || o.plat > w.plat) return false;
  return o.items.every((it) => it.canTrade && ownerOf(it.id) === who);
}

// Any change to either offer clears BOTH accept flags (donor: ClearChecks on item add/remove and on gold edit).
function setOffer(t: Trade, side: "a" | "b", offer: Offer, l: Ledger): boolean {
  if (!t.open) return false;
  const me = t[side];
  if (!offerIsValid(offer, walletOf(l, me.playerId), (id) => l.owner.get(id), me.playerId)) return false;
  me.offer = offer;
  t.a.accepted = false;
  t.b.accepted = false;
  return true;
}

// Two-step confirm: nothing settles until both sides accept in the same offer state.
function setAccepted(
  t: Trade,
  side: "a" | "b",
  value: boolean,
  l: Ledger,
  canTradeWith: (it: ItemRef, from: string, to: string) => boolean,
): "waiting" | "reset" | "settled" | "closed" {
  if (!t.open) return "closed";
  t[side].accepted = value;
  if (!(t.a.accepted && t.b.accepted)) return "waiting";

  // Confirm-time re-check (donor Update): item permission, then balances, for both sides.
  const sides: [Side, Side][] = [[t.a, t.b], [t.b, t.a]];
  const ok = sides.every(([from, to]) =>
    from.offer.items.every((it) => canTradeWith(it, from.playerId, to.playerId)) &&
    offerIsValid(from.offer, walletOf(l, from.playerId), (id) => l.owner.get(id), from.playerId),
  );
  if (!ok) {
    t.a.accepted = false;
    t.b.accepted = false;
    return "reset";
  }

  const rows = buildRows(t);
  if (!settle(l, rows)) {
    t.a.accepted = false;
    t.b.accepted = false;
    return "reset";
  }
  t.open = false;
  return "settled";
}

function buildRows(t: Trade): Row[] {
  const rows: Row[] = [];
  for (const [from, to] of [[t.a, t.b], [t.b, t.a]] as const) {
    for (const it of from.offer.items) {
      rows.push({ kind: "item", itemId: it.id, from: from.playerId, to: to.playerId });
    }
    if (from.offer.gold > 0) rows.push({ kind: "gold", amount: from.offer.gold, from: from.playerId, to: to.playerId });
    if (from.offer.plat > 0) rows.push({ kind: "plat", amount: from.offer.plat, from: from.playerId, to: to.playerId });
  }
  return rows;
}

// Single door: all rows apply or none do. Dry run on copies, commit at the end.
function settle(l: Ledger, rows: Row[]): boolean {
  const wallets = new Map<string, Wallet>();
  for (const [k, v] of l.wallets) wallets.set(k, { ...v });
  const owner = new Map(l.owner);
  for (const r of rows) {
    if (r.kind === "item") {
      if (owner.get(r.itemId) !== r.from) return false;
      owner.set(r.itemId, r.to);
      continue;
    }
    const src = { ...(wallets.get(r.from) ?? ZERO) };
    const dst = { ...(wallets.get(r.to) ?? ZERO) };
    if (src[r.kind] < r.amount) return false;
    src[r.kind] -= r.amount;
    dst[r.kind] += r.amount;
    if (dst[r.kind] > MAX_BALANCE) return false;
    wallets.set(r.from, src);
    wallets.set(r.to, dst);
  }
  l.wallets = wallets;
  l.owner = owner;
  return true;
}

// Presence: any of these cancels the trade (donor ValidateAllTrades: dead, deleted, range, map).
function presenceOk(distanceTiles: number, sameMap: boolean, bothAlive: boolean): boolean {
  return sameMap && bothAlive && distanceTiles <= RANGE_TILES;
}

export {};
