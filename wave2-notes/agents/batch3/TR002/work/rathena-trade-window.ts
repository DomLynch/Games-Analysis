// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TRADE_RANGE = 2;      // tiles (donor: TRADE_DISTANCE 2)
const MAX_SLOTS = 10;       // item slots per side (donor: deal.item[10])
const MAX_ZENY = 2147483647; // donor: MAX_ZENY INT_MAX

interface Line { itemId: string; qty: number; }
interface Offer { lines: Line[]; zeny: number; }
interface Trader {
  id: string; x: number; y: number;
  inv: Map<string, number>; zeny: number;
  offer: Offer;
  ok: boolean;          // step 1: OK locks this side's offer
  committed: boolean;   // step 2: Trade
}
interface Trade { a: Trader; b: Trader; open: boolean; }
type Result = { ok: true } | { ok: false; reason: string };
type Row = { from: string; to: string; itemId?: string; qty?: number; zeny?: number };

const fail = (reason: string): Result => ({ ok: false, reason });

function inRange(a: Trader, b: Trader): boolean {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= TRADE_RANGE;
}
function other(t: Trade, who: Trader): Trader { return who === t.a ? t.b : t.a; }

// Donor rule kept: a locked side cannot edit. Fixed: any edit clears BOTH OK flags,
// because the donor checks only the caller's lock and lets the partner change after OK.
function setOffer(t: Trade, who: Trader, offer: Offer): Result {
  if (!t.open) return fail("trade not open");
  if (who.ok) return fail("locked: cancel to edit");
  if (offer.lines.length > MAX_SLOTS) return fail("too many slots");
  if (offer.zeny < 0 || offer.zeny > who.zeny) return fail("not enough zeny");
  for (const l of offer.lines) {
    if (l.qty <= 0 || (who.inv.get(l.itemId) ?? 0) < l.qty) return fail("not enough " + l.itemId);
  }
  who.offer = offer;
  t.a.ok = false;
  t.b.ok = false;
  t.a.committed = false;
  t.b.committed = false;
  return { ok: true };
}

function press(t: Trade, who: Trader): Result {
  if (!t.open) return fail("trade not open");
  if (who.ok) return fail("already locked");
  if (!inRange(t.a, t.b)) return fail("too far");
  who.ok = true;
  return { ok: true };
}

function rowsFor(t: Trade): Row[] {
  const rows: Row[] = [];
  for (const [src, dst] of [[t.a, t.b], [t.b, t.a]] as const) {
    for (const l of src.offer.lines) rows.push({ from: src.id, to: dst.id, itemId: l.itemId, qty: l.qty });
    if (src.offer.zeny > 0) rows.push({ from: src.id, to: dst.id, zeny: src.offer.zeny });
  }
  return rows;
}

// All-or-nothing: apply every row to a copy; any failure returns null and nothing changes.
function applyRows(traders: Trader[], rows: Row[]): Map<string, { inv: Map<string, number>; zeny: number }> | null {
  const next = new Map<string, { inv: Map<string, number>; zeny: number }>();
  for (const t of traders) next.set(t.id, { inv: new Map(t.inv), zeny: t.zeny });
  for (const r of rows) {
    const from = next.get(r.from);
    const to = next.get(r.to);
    if (!from || !to) return null;
    if (r.itemId !== undefined && r.qty !== undefined) {
      const have = from.inv.get(r.itemId) ?? 0;
      if (have < r.qty) return null;
      from.inv.set(r.itemId, have - r.qty);
      to.inv.set(r.itemId, (to.inv.get(r.itemId) ?? 0) + r.qty);
    } else if (r.zeny !== undefined) {
      if (from.zeny < r.zeny || to.zeny > MAX_ZENY - r.zeny) return null;
      from.zeny -= r.zeny;
      to.zeny += r.zeny;
    }
  }
  return next;
}

// Step 2: commit. Both sides must be locked; the server re-validates and settles once.
function commit(t: Trade, who: Trader): Result {
  if (!t.open) return fail("trade not open");
  if (!who.ok) return fail("press OK first");
  who.committed = true;
  const partner = other(t, who);
  if (!partner.committed) return { ok: true };
  if (!partner.ok) return fail("partner not locked");
  const next = applyRows([t.a, t.b], rowsFor(t));
  if (next === null) {                 // nothing moved; both offers reset
    t.a.ok = t.b.ok = t.a.committed = t.b.committed = false;
    t.open = false;
    return fail("settle refused");
  }
  for (const tr of [t.a, t.b]) {
    const v = next.get(tr.id);
    if (v) { tr.inv = v.inv; tr.zeny = v.zeny; }
    tr.offer = { lines: [], zeny: 0 };
    tr.ok = false;
    tr.committed = false;
  }
  t.open = false;
  return { ok: true };
}

export {};
