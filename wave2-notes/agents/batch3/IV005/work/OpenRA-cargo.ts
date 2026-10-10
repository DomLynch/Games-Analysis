// Licence: GPL-3.0 (donor). Clean-room sketch from the described mechanism (weight budget, reserve then load, release on cancel), not a translation of the donor lines.
interface Passenger { id: string; weight: number; }

interface Cargo {
  maxWeight: number;                       // donor: MaxWeight (per transport)
  loaded: Passenger[];                     // loaded order; unload is last in, first out
  reserved: Map<string, number>;           // id -> reserved weight (not yet loaded)
}

const totalWeight = (c: Cargo): number => c.loaded.reduce((s, p) => s + p.weight, 0);
const reservedWeight = (c: Cargo): number => [...c.reserved.values()].reduce((s, w) => s + w, 0);

// Donor HasSpace: loaded + reserved + incoming <= max.
function hasSpace(c: Cargo, weight: number): boolean {
  return totalWeight(c) + reservedWeight(c) + weight <= c.maxWeight;
}

// Donor ReserveSpace: a repeat reserve by the same passenger succeeds; otherwise the room must exist.
function reserve(c: Cargo, id: string, weight: number): boolean {
  if (c.reserved.has(id)) return true;
  if (!hasSpace(c, weight)) return false;
  c.reserved.set(id, weight);
  return true;
}

// Donor UnreserveSpace: the cancel path gives the room back.
function unreserve(c: Cargo, id: string): void {
  c.reserved.delete(id);
}

// Donor Load: commit a reserved passenger. Donor Load() does not check the cap itself (its callers do);
// this sketch checks it here, so a scripted or paradrop load cannot overfill.
function load(c: Cargo, id: string, weight: number): boolean {
  const held = c.reserved.get(id);
  if (held === undefined && !hasSpace(c, weight)) return false;
  c.reserved.delete(id);
  c.loaded.push({ id, weight: held ?? weight });
  return true;
}

// Donor ReleaseLock tests the weight sum (reservedWeight != 0). This tests the reservation count instead,
// so a zero-weight reservation still holds the lock.
function locked(c: Cargo): boolean {
  return c.reserved.size > 0;
}

// Donor Unload: last in, first out.
function unloadLast(c: Cargo): Passenger | null {
  return c.loaded.pop() ?? null;
}

// simplified: the donor's aircraft landing and takeoff, the condition tokens, the ticks of load and unload delay, the facing set on unload, the ejection on death or sale and the cell search (LoadRange) are omitted. The sketch models only the budget, the reservation, the commit, the cancel and the lock predicate.
export {};
