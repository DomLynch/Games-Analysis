// clean-room sketch from the described mechanism; not a translation of the donor
type Cell = { x: number; y: number };

interface Board {
  cols: number;
  rows: number;
  occupied(c: Cell): boolean; // true when a unit or blocker sits on the tile
}

interface PendingRespawn {
  owner: number;
  kind: string;
  boundariesLeft: number; // donor: durationEndTurn = 1, so one boundary
}

// Called when a unit dies. The donor queues the respawn before the kill is applied.
function queueRespawn(pending: PendingRespawn[], owner: number, kind: string): void {
  pending.push({ owner, kind, boundariesLeft: 1 });
}

// Candidate tiles: pattern offsets from an origin, kept only if on the board and free.
function candidateTiles(board: Board, origin: Cell, pattern: Cell[]): Cell[] {
  const out: Cell[] = [];
  for (const o of pattern) {
    const c = { x: origin.x + o.x, y: origin.y + o.y };
    if (c.x < 0 || c.y < 0 || c.x >= board.cols || c.y >= board.rows) continue;
    if (board.occupied(c)) continue;
    out.push(c);
  }
  return out;
}

// Called at each boundary event. Spawns at most one unit per queued entry, then expires it.
function onBoundary(
  pending: PendingRespawn[],
  board: Board,
  pattern: Cell[],
  rand: (n: number) => number, // server-side integer in [0, n)
  spawn: (owner: number, kind: string, at: Cell) => void,
): PendingRespawn[] {
  const keep: PendingRespawn[] = [];
  for (const p of pending) {
    const free = candidateTiles(board, { x: 0, y: 0 }, pattern);
    if (free.length > 0) spawn(p.owner, p.kind, free[rand(free.length)]);
    p.boundariesLeft -= 1;
    if (p.boundariesLeft > 0) keep.push(p);
  }
  return keep;
}
export {}
