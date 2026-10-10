// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Side = "a" | "b";

interface ItemInfo {
  tradeable: boolean;   // false for attuned items, a summoned pet device, or a unique the partner cannot carry
  backpack: boolean;    // true if the item takes a container (backpack) slot rather than a main slot
  burden: number;
}

interface Trader {
  id: string;
  offer: Set<string>;         // item ids in this side's offer window
  owned: Set<string>;         // item ids this trader holds (pack and equipped)
  accepted: boolean;          // this side has accepted the current offers
  busy: boolean;              // doing something else that blocks a trade
  freeContainerSlots: number;
  freeInventorySlots: number;
  burdenHeadroom: number;
}

interface TradeState {
  a: Trader;
  b: Trader;
  items: Map<string, ItemInfo>;
  transferring: boolean;      // set while the items move; blocks every edit and accept
}

type Outcome = "open" | "transferred" | "declined" | "cleared" | "blocked";

// Any change to either offer clears BOTH acceptances, so neither side can confirm an offer the other has not seen.
function addOffer(t: TradeState, side: Side, item: string): Outcome {
  if (t.transferring) return "blocked";
  const info = t.items.get(item);
  if (info === undefined || !info.tradeable) return "blocked";
  t.a.accepted = false;
  t.b.accepted = false;
  t[side].offer.add(item);
  return "open";
}

function clearAcceptance(t: TradeState): void {
  t.a.accepted = false;
  t.b.accepted = false;
}

// Accepting only commits when both sides have accepted the same offers.
function accept(t: TradeState, side: Side): Outcome {
  if (t.transferring) return "blocked";
  t[side].accepted = true;
  if (!(t.a.accepted && t.b.accepted)) return "open";
  return finalize(t);
}

// Room check for the items a side would receive: burden first, then backpack slots, then main slots.
function canReceive(recv: Trader, incoming: string[], items: Map<string, ItemInfo>): boolean {
  let burden = 0;
  let containers = 0;
  for (const id of incoming) {
    const info = items.get(id);
    if (info === undefined) return false;
    burden += info.burden;
    if (info.backpack) containers += 1;
  }
  if (burden > recv.burdenHeadroom) return false;
  if (containers > recv.freeContainerSlots) return false;
  if (incoming.length - containers > recv.freeInventorySlots) return false;
  return true;
}

// Commit: busy check, then ownership of every offered item (a missing item declines that side only), then room on both sides (clears acceptance).
function finalize(t: TradeState): Outcome {
  if (t.a.busy || t.b.busy) {
    clearAcceptance(t);
    return "cleared";
  }
  for (const side of ["a", "b"] as const) {
    for (const id of t[side].offer) {
      if (!t[side].owned.has(id)) {
        t[side].accepted = false; // the other side's acceptance is left as it was, as in the donor
        return "declined";
      }
    }
  }
  const aGets = [...t.b.offer];
  const bGets = [...t.a.offer];
  if (!canReceive(t.a, aGets, t.items) || !canReceive(t.b, bGets, t.items)) {
    clearAcceptance(t);
    return "cleared";
  }
  // Move. The donor removes both offers first, waits 0.5 s, then creates the items on the other side; this sketch does it in one step.
  t.transferring = true;
  for (const id of t.a.offer) { t.a.owned.delete(id); t.b.owned.add(id); }
  for (const id of t.b.offer) { t.b.owned.delete(id); t.a.owned.add(id); }
  t.a.offer.clear();
  t.b.offer.clear();
  clearAcceptance(t);
  t.transferring = false;
  return "transferred";
}

// Entering combat or closing the window ends the negotiation for both sides (the donor also resets the partner link).
function closeTrade(t: TradeState): void {
  if (t.transferring) return;
  t.a.offer.clear();
  t.b.offer.clear();
  clearAcceptance(t);
}

export {};
