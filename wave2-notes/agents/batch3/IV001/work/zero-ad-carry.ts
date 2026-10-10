// Licence: GPL-2.0-or-later (donor, binaries/data). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Carrier {
  capacity: Record<string, number>;   // per kind; a kind with no entry cannot be carried
  carrying: Record<string, number>;   // kind -> amount carried (a key may hold 0)
}

interface Supply { kind: string; amount: number; }

interface Dropsite { accepts: Set<string>; ledger: Record<string, number>; }

type Stop = "InventoryFilled" | "TargetInvalidated";

// One gather tick: take at most perTick of the supply's kind, never past the carrier's capacity.
function gatherTick(c: Carrier, s: Supply, perTick: number): Stop | undefined {
  if (s.amount <= 0) return "TargetInvalidated";
  const cap = c.capacity[s.kind] ?? 0;
  const have = c.carrying[s.kind] ?? 0;
  const taken = Math.min(perTick, cap - have, s.amount);
  s.amount -= taken;
  c.carrying[s.kind] = have + taken;
  if (have + taken >= cap) return "InventoryFilled";
  if (s.amount === 0) return "TargetInvalidated";
  return undefined;
}

// Starting a gather of another kind. The donor drops the whole load here (no refusal); the sketch keeps the donor rule.
function startGather(c: Carrier, kind: string): void {
  if (Object.keys(c.carrying).some(k => k !== kind)) c.carrying = {};
}

// Commit = one drop-off: the dropsite takes every kind it accepts into the owner's ledger (no cap),
// and the carrier subtracts exactly what was taken. Kinds not accepted stay carried.
function commit(c: Carrier, d: Dropsite): Record<string, number> {
  const taken: Record<string, number> = {};
  for (const kind of Object.keys(c.carrying)) {
    if (d.accepts.has(kind)) taken[kind] = c.carrying[kind];
  }
  for (const kind of Object.keys(taken)) d.ledger[kind] = (d.ledger[kind] ?? 0) + taken[kind];
  for (const kind of Object.keys(taken)) {
    c.carrying[kind] -= taken[kind];
    if (c.carrying[kind] === 0) delete c.carrying[kind];
  }
  return taken;
}

// Size-weighted slot admission (GarrisonHolder): fits if the holder's occupied slots plus the unit's own size
// plus whatever the unit already holds stay within capacity. unitSize is an input here (its donor source was not read).
function canGarrison(h: { capacity: number; occupied: number }, unitSize: number, unitHeld: number): boolean {
  return h.occupied + (unitSize + unitHeld) <= h.capacity;
}

export {};
