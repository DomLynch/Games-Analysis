// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Item { id: string; slots: number; burden: number; attuned: boolean; }
interface Holder {
  id: string;
  items: Map<string, Item>;        // what the holder owns
  slotsFree: number;
  burdenFree: number;
  busy: boolean;
  window: Map<string, Item>;       // offered items (by id)
  accepted: boolean;
}
interface Trade { a: Holder; b: Holder; inProgress: boolean; }
type Outcome = { ok: true } | { ok: false; reason: string };

const fail = (reason: string): Outcome => ({ ok: false, reason });
const other = (t: Trade, who: Holder): Holder => (who === t.a ? t.b : t.a);

// Donor rule: any change to either window clears BOTH acceptances (ACE clears self and partner on add).
function clearBoth(t: Trade): void { t.a.accepted = false; t.b.accepted = false; }

function offer(t: Trade, who: Holder, itemId: string): Outcome {
  if (t.inProgress) return fail("transfer in progress");
  const item = who.items.get(itemId);
  if (!item) return fail("not owned");
  if (item.attuned) return fail("attuned item");
  // uniqueness check not modelled here
  who.window.set(itemId, item);
  clearBoth(t);
  return { ok: true };
}

function withdraw(t: Trade, who: Holder, itemId: string): Outcome {
  if (t.inProgress) return fail("transfer in progress");
  who.window.delete(itemId);
  clearBoth(t);
  return { ok: true };
}

function canTake(to: Holder, items: Item[]): boolean {
  const slots = items.reduce((s, i) => s + i.slots, 0);
  const burden = items.reduce((s, i) => s + i.burden, 0);
  return slots <= to.slotsFree && burden <= to.burdenFree;
}

function decline(t: Trade, reason: string): Outcome {
  clearBoth(t);
  return fail(reason);
}

function accept(t: Trade, who: Holder): Outcome {
  if (t.inProgress) return fail("transfer in progress");
  who.accepted = true;
  if (!other(t, who).accepted) return { ok: true };
  return finalize(t);
}

function finalize(t: Trade): Outcome {
  if (t.a.busy || t.b.busy) return decline(t, "too busy");
  // every offered item must still be owned by its holder (else decline, nothing moves)
  for (const h of [t.a, t.b]) {
    for (const id of h.window.keys()) if (!h.items.has(id)) return decline(t, "item gone");
  }
  const fromA = [...t.a.window.values()];
  const fromB = [...t.b.window.values()];
  if (!canTake(t.b, fromA) || !canTake(t.a, fromB)) return decline(t, "not enough room");

  // phase 1: escrow. Items leave their owners; both sides are busy and the trade is in progress.
  t.inProgress = true;
  t.a.busy = true;
  t.b.busy = true;
  for (const it of fromA) { t.a.items.delete(it.id); t.a.slotsFree += it.slots; t.a.burdenFree += it.burden; }
  for (const it of fromB) { t.b.items.delete(it.id); t.b.slotsFree += it.slots; t.b.burdenFree += it.burden; }

  // phase 2: deliver. The donor ignores the result of its create call; here a delivery that does not fit goes back to its owner.
  const deliver = (to: Holder, owner: Holder, list: Item[]): void => {
    for (const it of list) {
      if (to.slotsFree >= it.slots && to.burdenFree >= it.burden) {
        to.items.set(it.id, it);
        to.slotsFree -= it.slots;
        to.burdenFree -= it.burden;
      } else {
        owner.items.set(it.id, it);  // returned to owner, never dropped
        owner.slotsFree -= it.slots;
        owner.burdenFree -= it.burden;
      }
    }
  };
  deliver(t.b, t.a, fromA);
  deliver(t.a, t.b, fromB);

  t.a.window.clear();
  t.b.window.clear();
  t.a.busy = false;
  t.b.busy = false;
  t.a.accepted = false;
  t.b.accepted = false;
  t.inProgress = false;
  return { ok: true };
}

export {};
