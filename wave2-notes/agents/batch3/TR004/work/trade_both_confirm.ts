// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Side = 0 | 1;
const SLOTS = 6;            // offered item slots per side
// Range (donor: TRADE_DISTANCE 11.11 game units) is checked by world.inRange at every accept.

export interface Stack { id: number; bound: string | null; tradable: boolean; }
export interface Offer { playerId: string; items: (Stack | null)[]; gold: number; accepted: boolean; }
export interface Trade { offers: [Offer, Offer]; open: boolean; }
export interface Event { to: string; kind: "back_to_trade" | "accepted" | "settled" | "refused"; reason: string; }
export interface LedgerRow { from: string; to: string; kind: "item" | "gold"; ref: number; qty: number; }
export interface World {
  inRange(a: string, b: string): boolean;
  copper(playerId: string): number;
  freeSlots(playerId: string): number;  // empty bag slots, NOT counting the stacks being offered
  apply(rows: LedgerRow[]): void;       // the one door that moves items or gold; must be atomic
}

// Any change to either side clears BOTH confirmations, so nobody confirms a deal that has moved.
function clearAccepts(t: Trade, events: Event[], reason: string): void {
  for (const o of t.offers) o.accepted = false;
  for (const o of t.offers) events.push({ to: o.playerId, kind: "back_to_trade", reason });
}

export function setItem(t: Trade, side: Side, slot: number, item: Stack | null, events: Event[]): boolean {
  const me = t.offers[side];
  const other = t.offers[1 - side];
  if (!t.open || slot < 0 || slot >= SLOTS) return false;
  if ((me.items[slot]?.id ?? 0) === (item?.id ?? 0)) return false; // no-op edits do not clear confirmations
  if (item) {
    if (!item.tradable) return false;
    if (item.bound !== null && item.bound !== other.playerId) return false;
    if (me.items.some((s) => s?.id === item.id)) return false; // one item cannot sit in two slots
  }
  me.items[slot] = item;
  clearAccepts(t, events, "item changed");
  return true;
}

export function setGold(t: Trade, side: Side, copper: number, events: Event[], world: World): boolean {
  const me = t.offers[side];
  if (!t.open || copper < 0 || me.gold === copper) return false;
  if (copper > world.copper(me.playerId)) return false; // simplified: donor closes the window here
  me.gold = copper;
  clearAccepts(t, events, "gold changed");
  return true;
}

export function accept(t: Trade, side: Side, world: World, events: Event[]): "waiting" | "settled" | "failed" {
  if (!t.open) return "failed";
  const me = t.offers[side];
  const other = t.offers[1 - side];
  me.accepted = true;
  if (!world.inRange(me.playerId, other.playerId)) {
    me.accepted = false;
    events.push({ to: me.playerId, kind: "refused", reason: "too far" });
    return "failed";
  }
  if (!other.accepted) {
    events.push({ to: other.playerId, kind: "accepted", reason: "partner confirmed" });
    return "waiting";
  }
  // Both confirmed: re-check everything at the moment of settle, not when the offer was made.
  const mine = me.items.filter((s): s is Stack => s !== null);
  const theirs = other.items.filter((s): s is Stack => s !== null);
  const eligible =
    mine.every((s) => s.tradable && (s.bound === null || s.bound === other.playerId)) &&
    theirs.every((s) => s.tradable && (s.bound === null || s.bound === me.playerId));
  const goldOk = me.gold <= world.copper(me.playerId) && other.gold <= world.copper(other.playerId);
  // Each side's own offered stacks leave first, so they count as free room for the incoming stacks.
  const roomOk =
    world.freeSlots(other.playerId) + theirs.length >= mine.length &&
    world.freeSlots(me.playerId) + mine.length >= theirs.length;
  if (!eligible || !goldOk || !roomOk) {
    clearAccepts(t, events, "trade could not settle");
    return "failed";
  }
  // Barter is two item rows plus optional gold rows: nothing moves outside the ledger.
  const rows: LedgerRow[] = [];
  for (const s of mine) rows.push({ from: me.playerId, to: other.playerId, kind: "item", ref: s.id, qty: 1 });
  for (const s of theirs) rows.push({ from: other.playerId, to: me.playerId, kind: "item", ref: s.id, qty: 1 });
  if (me.gold > 0) rows.push({ from: me.playerId, to: other.playerId, kind: "gold", ref: 0, qty: me.gold });
  if (other.gold > 0) rows.push({ from: other.playerId, to: me.playerId, kind: "gold", ref: 0, qty: other.gold });
  world.apply(rows);
  t.open = false;
  events.push({ to: me.playerId, kind: "settled", reason: "" }, { to: other.playerId, kind: "settled", reason: "" });
  return "settled";
}

export {};
