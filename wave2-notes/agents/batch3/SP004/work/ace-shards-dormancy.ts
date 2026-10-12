// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Cell {
  readonly cx: number;
  readonly cy: number;
  dormant: boolean;
  keepAlive: boolean;   // a keep-alive object or permaload stops dormancy and unload
  lastActiveMs: number;
}

export interface Shard {
  readonly cells: Set<Cell>;
}

export interface Mover {
  readonly id: number;
  readonly from: Cell;
  readonly to: Cell;
}

export const SPACING_ACTIVE = 4;          // cells join a shard when the Chebyshev gap is below this
export const SPACING_DORMANT = 3;         // narrower spacing when either cell is dormant
export const DORMANT_MS = 60_000;         // idle this long: dormant
export const UNLOAD_MS = 300_000;         // idle this long: unload

function gap(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.cx - b.cx), Math.abs(a.cy - b.cy));
}

function joins(shard: Shard, c: Cell): boolean {
  for (const m of shard.cells) {
    const need = m.dormant || c.dormant ? SPACING_DORMANT : SPACING_ACTIVE;
    if (gap(m, c) < need) return true;
  }
  return false;
}

// Place a new cell in the first shard it joins, or start a new shard.
// (The donor also merges several shards when one cell joins more than one; not sketched.)
export function placeCell(shards: Shard[], c: Cell): void {
  const hit = shards.find((s) => joins(s, c));
  if (hit) {
    hit.cells.add(c);
    return;
  }
  shards.push({ cells: new Set<Cell>([c]) });
}

// One world pass. Shards are ticked largest first. A cell that crosses into another shard is recorded and
// applied after the pass, on one thread, so no shard reads another shard's cells mid-pass.
export function tickShards(
  shards: Shard[],
  tickCell: (c: Cell, moved: Mover[]) => void,
  relocate: (m: Mover) => void,
): void {
  const ordered = [...shards].sort((a, b) => b.cells.size - a.cells.size);
  const moved: Mover[] = [];
  for (const s of ordered) {
    for (const c of s.cells) tickCell(c, moved);
  }
  for (const m of moved) relocate(m);
}

// Mark a cell active (a player or activity touched it).
export function activate(c: Cell, nowMs: number): void {
  c.lastActiveMs = nowMs;
  c.dormant = false;
}

// Heartbeat: returns the cells to unload. Keep-alive cells are never marked dormant.
export function heartbeat(cells: readonly Cell[], nowMs: number): Cell[] {
  const toUnload: Cell[] = [];
  for (const c of cells) {
    if (c.keepAlive) continue;
    const idle = nowMs - c.lastActiveMs;
    if (idle > DORMANT_MS) c.dormant = true;
    if (idle > UNLOAD_MS) toUnload.push(c);
  }
  return toUnload;
}

export {};
