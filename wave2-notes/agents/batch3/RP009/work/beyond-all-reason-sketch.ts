// Licence: GPL v2 (donor LICENSE.md). Clean-room shape of a dense instance table, written from the mechanism, not a translation.
export interface Table {
  data: number[];                     // CPU mirror: stride numbers per element, 0-based element index
  stride: number;
  used: number;                       // elements in use
  capacity: number;                   // elements the (notional) GPU buffer holds
  idToIndex: Map<number, number>;     // element id -> index
  indexToId: (number | undefined)[];  // index -> element id
  dirty: boolean;                     // deferred pushes/pops not yet uploaded
  gpuUploads: { from: number; to: number }[]; // recorded single-row uploads (stand-in for GPU calls)
}

export function makeTable(stride: number, capacity = 64): Table {
  const data: number[] = [];
  for (let i = 0; i < stride * capacity; i++) data.push(0);
  return { data, stride, used: 0, capacity, idToIndex: new Map(), indexToId: [], dirty: false, gpuUploads: [] };
}

// Double the capacity and extend the mirror (donor: maxElements * 2).
function grow(t: Table): void {
  t.capacity *= 2;
  for (let i = t.data.length; i < t.stride * t.capacity; i++) t.data.push(0);
}

// Insert or update one element. Grows only when a new id takes the last spare slot (the donor grows on every push).
// Returns false when the row size is wrong, or when an existing id is pushed without updateExisting.
export function push(
  t: Table,
  id: number,
  row: number[],
  opts: { updateExisting?: boolean; defer?: boolean } = {},
): boolean {
  if (row.length !== t.stride) return false;
  let index = t.idToIndex.get(id);
  if (index !== undefined && !opts.updateExisting) return false; // refused before any growth
  if (index === undefined) {
    if (t.used + 1 >= t.capacity) grow(t);  // grow only when a new slot is actually taken
    index = t.used;
    t.used += 1;
    t.idToIndex.set(id, index);
    t.indexToId[index] = id;
  }
  const base = index * t.stride;
  for (let i = 0; i < t.stride; i++) t.data[base + i] = row[i];
  if (opts.defer) t.dirty = true;
  else t.gpuUploads.push({ from: index, to: index + 1 });
  return true;
}

// Remove one element. The last element moves into the hole, so the used range stays dense.
export function pop(t: Table, id: number, defer = false): boolean {
  const index = t.idToIndex.get(id);
  if (index === undefined || t.used === 0) return false;
  const last = t.used - 1;
  t.idToIndex.delete(id);
  if (index !== last) {
    const movedId = t.indexToId[last];
    if (movedId === undefined) {
      // Bookkeeping is broken: converge to empty and rebuild on the next flush.
      t.used -= 1;
      t.dirty = true;
      return false;
    }
    t.idToIndex.set(movedId, index);
    t.indexToId[index] = movedId;
    const base = index * t.stride;
    const from = last * t.stride;
    for (let i = 0; i < t.stride; i++) t.data[base + i] = t.data[from + i];
    if (defer) t.dirty = true;
    else t.gpuUploads.push({ from: index, to: index + 1 });
  }
  t.indexToId[last] = undefined;
  t.used -= 1;
  return true;
}

// Rebuild everything in one contiguous upload of the used range, then clear dirty.
export function flush(t: Table): { from: number; to: number } {
  t.dirty = false;
  t.gpuUploads = [];
  return { from: 0, to: t.used };
}

export {};
