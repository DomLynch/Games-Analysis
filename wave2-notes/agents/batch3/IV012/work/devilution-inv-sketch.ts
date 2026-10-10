// Licence: Sustainable Use License 1.0 (donor; restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const COLS = 10;
const ROWS = 4;

type Size = { w: number; h: number };
// cells: 0 = empty, otherwise the id of the item covering that cell (the sketch stores the id in every footprint cell).
interface Grid { cells: number[]; }   // length COLS * ROWS
interface Placed { id: number; size: Size; origin: number; }

// Footprint cells for an item whose top-left cell is origin, or null if it would leave the grid.
function footprint(origin: number, size: Size): number[] | null {
  const row = Math.floor(origin / COLS);
  const col = origin % COLS;
  if (col + size.w > COLS || row + size.h > ROWS) return null;
  const cells: number[] = [];
  for (let r = 0; r < size.h; r++) {
    for (let c = 0; c < size.w; c++) cells.push(origin + r * COLS + c);
  }
  return cells;
}

// 0: footprint empty (a plain drop). n > 0: exactly one item n covers the footprint (a swap).
// -1: two or more different items cover it, or it is off the grid (refuse).
function overlapOf(g: Grid, origin: number, size: Size): number {
  const cells = footprint(origin, size);
  if (cells === null) return -1;
  let found = 0;
  for (const cell of cells) {
    const id = g.cells[cell];
    if (id === 0) continue;
    if (found === 0) found = id;
    else if (found !== id) return -1;
  }
  return found;
}

// One atomic move of the held item (id held, footprint heldSize) onto origin.
// Returns the id now in the hand (0 = hand empty), or null when refused.
// Nothing is written until the check has passed.
function placeHeld(g: Grid, held: number, heldSize: Size, origin: number): number | null {
  const over = overlapOf(g, origin, heldSize);
  if (over < 0) return null;                       // refused: hand and grid unchanged
  if (over > 0) {                                  // swap: the displaced item leaves the grid and goes to the hand
    for (let i = 0; i < g.cells.length; i++) if (g.cells[i] === over) g.cells[i] = 0;
  }
  for (const cell of footprint(origin, heldSize)!) g.cells[cell] = held;
  return over;
}

// Scan order for the first free spot for one item size: bottom row left to right,
// then columns from the right, bottom to top (the donor's order for 1-high items).
function findSlot(g: Grid, size: Size): number | null {
  const order: number[] = [];
  for (let c = 0; c < COLS; c++) order.push((ROWS - 1) * COLS + c);
  for (let c = COLS - 1; c >= 0; c--) {
    for (let r = ROWS - 2; r >= 0; r--) order.push(r * COLS + c);
  }
  for (const origin of order) {
    const cells = footprint(origin, size);
    if (cells !== null && cells.every(cell => g.cells[cell] === 0)) return origin;
  }
  return null;
}

// Repack every item by size (taller first, then wider) into the first free spots.
// All or nothing: if one item does not fit, the grid and the item list go back exactly as they were.
function repack(g: Grid, items: Placed[]): boolean {
  const savedCells = g.cells.slice();
  const savedItems = items.map(i => ({ ...i, size: { ...i.size } }));
  const sorted = items.slice().sort((a, b) => (a.size.h === b.size.h ? b.size.w - a.size.w : b.size.h - a.size.h));
  g.cells.fill(0);
  for (const it of sorted) {
    const origin = findSlot(g, it.size);
    if (origin === null) {
      g.cells = savedCells;                          // restore the grid
      items.splice(0, items.length, ...savedItems);  // restore the list (replaced, not appended)
      return false;
    }
    it.origin = origin;
    for (const cell of footprint(origin, it.size)!) g.cells[cell] = it.id;
  }
  return true;
}

// Gold: fill existing piles in list order up to cap, return what is left for new piles.
interface Pile { value: number; }
function topOffGold(piles: Pile[], value: number, cap: number): number {
  let left = value;
  for (const p of piles) {
    if (left <= 0) break;
    if (p.value >= cap) continue;
    const add = Math.min(cap - p.value, left);
    p.value += add;
    left -= add;
  }
  return left;
}

export {};
