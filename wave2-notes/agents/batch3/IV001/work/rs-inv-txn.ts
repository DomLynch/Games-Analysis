// Licence: MIT (donor, Lost City 2023-2025; adaptation allowed). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Item = { id: number; count: number };
type Slot = Item | null;
type Changed = { slot: number; item: Item };
type Txn = { requested: number; completed: number; changed: Changed[] };

const STACK_LIMIT = 0x7fffffff;

function countOf(inv: Slot[], id: number): number {
  return inv.reduce((n, s) => n + (s !== null && s.id === id ? s.count : 0), 0);
}

// Add. Stackable items merge into one stack (capped at STACK_LIMIT). Other items take one slot per unit.
// allOrNothing = true refuses unless every unit fits; false places what fits.
function addItems(inv: Slot[], id: number, count: number, stackable: boolean, allOrNothing: boolean, beginSlot = 0): Txn {
  const fail: Txn = { requested: count, completed: 0, changed: [] };
  const previous = countOf(inv, id);
  const free = inv.filter(s => s === null).length;

  if (stackable) {
    if (previous === STACK_LIMIT) return fail;
    if (free === 0 && previous === 0) return fail;
    if (allOrNothing && previous > STACK_LIMIT - count) return fail;
    let idx = inv.findIndex(s => s !== null && s.id === id);
    if (idx === -1) {
      idx = inv.indexOf(null, beginSlot);
      if (idx === -1) return fail;
    }
    const before = inv[idx]?.count ?? 0;
    const total = Math.min(STACK_LIMIT, before + count);
    inv[idx] = { id, count: total };
    return { requested: count, completed: total - before, changed: [{ slot: idx, item: { id, count: total } }] };
  }

  if (allOrNothing && count > free) return fail;
  const changed: Changed[] = [];
  for (let i = Math.max(0, beginSlot); i < inv.length && changed.length < count; i++) {
    if (inv[i] !== null) continue;
    inv[i] = { id, count: 1 };
    changed.push({ slot: i, item: { id, count: 1 } });
  }
  return { requested: count, completed: changed.length, changed };
}

// Remove. Walks from beginSlot to the end, then wraps to the start. As in the donor, an emptied stack is
// recorded with count 0 and a partly used stack is not recorded at all.
function removeItems(inv: Slot[], id: number, count: number, allOrNothing: boolean, beginSlot = 0): Txn {
  const have = countOf(inv, id);
  if (allOrNothing ? have < count : have < 1) return { requested: count, completed: 0, changed: [] };

  let done = 0;
  const changed: Changed[] = [];
  for (let k = 0; k < inv.length && done < count; k++) {
    const i = (beginSlot + k) % inv.length;
    const s = inv[i];
    if (s === null || s.id !== id) continue;
    const take = Math.min(s.count, count - done);
    done += take;
    s.count -= take;
    if (s.count === 0) {
      inv[i] = null;
      changed.push({ slot: i, item: { id, count: 0 } });
    }
  }
  return { requested: count, completed: done, changed };
}

// Proposed server move (not the donor's order). Check that the target fits first, on a copy;
// only then remove from the source and add to the target. Nothing is removed unless the add will succeed.
function moveAtomic(from: Slot[], to: Slot[], id: number, count: number, stackable: boolean): Txn {
  const probe = to.map(s => (s === null ? null : { ...s }));
  if (addItems(probe, id, count, stackable, true).completed !== count) {
    return { requested: count, completed: 0, changed: [] };
  }
  const taken = removeItems(from, id, count, true);
  if (taken.completed !== count) throw new Error("source changed between check and remove");
  return addItems(to, id, count, stackable, true);
}

export {};
