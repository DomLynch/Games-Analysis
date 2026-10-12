// Licence: GPL-3.0 (donor). Clean-room sketch of the shape only, written from the described mechanism, not a translation.

interface Cell { x: number; y: number; }
interface Grid { width: number; height: number; blocked(x: number, y: number): boolean; }
interface Exit { id: number; at: Cell; }      // cells where a walk leaves this zone
interface Arrival { id: number; at: Cell; }   // cells where a traveller lands in this zone
interface Point { id: number; at: Cell; hidden: boolean; } // NPCs and other service points
interface StepRow { targetId: number; steps: number; }

const MOVE_COST = 10;
const DIAGONAL_COST = 14;

// Walk-step search on the grid. A diagonal step needs both side cells open (no corner cutting).
// Returns the number of steps to the goal, or null when it is unreachable.
function walkSteps(g: Grid, from: Cell, to: Cell): number | null {
  if (from.x === to.x && from.y === to.y) return 0;
  if (to.x < 0 || to.y < 0 || to.x >= g.width || to.y >= g.height || g.blocked(to.x, to.y)) return null;

  // Octile estimate (admissible for these costs). The donor uses 10 x Manhattan, which can overshoot.
  const h = (x: number, y: number): number => {
    const dx = Math.abs(to.x - x);
    const dy = Math.abs(to.y - y);
    return MOVE_COST * Math.max(dx, dy) + (DIAGONAL_COST - MOVE_COST) * Math.min(dx, dy);
  };

  type Node = { x: number; y: number; g: number; steps: number };
  const key = (x: number, y: number): number => y * g.width + x;
  const best = new Map<number, number>();
  const open: Node[] = [{ x: from.x, y: from.y, g: 0, steps: 0 }];
  best.set(key(from.x, from.y), 0);

  const dirs: [number, number, number][] = [
    [1, 0, MOVE_COST], [-1, 0, MOVE_COST], [0, 1, MOVE_COST], [0, -1, MOVE_COST],
    [1, 1, DIAGONAL_COST], [1, -1, DIAGONAL_COST], [-1, 1, DIAGONAL_COST], [-1, -1, DIAGONAL_COST],
  ];

  while (open.length > 0) {
    // Linear scan for the lowest f = g + h.
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].g + h(open[i].x, open[i].y) < open[bi].g + h(open[bi].x, open[bi].y)) bi = i;
    }
    const cur = open.splice(bi, 1)[0];
    if (cur.x === to.x && cur.y === to.y) return cur.steps;

    for (const [dx, dy, cost] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= g.width || ny >= g.height || g.blocked(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (g.blocked(cur.x + dx, cur.y) || g.blocked(cur.x, cur.y + dy))) continue;
      const ng = cur.g + cost;
      const k = key(nx, ny);
      const prev = best.get(k);
      if (prev !== undefined && prev <= ng) continue;
      best.set(k, ng);
      open.push({ x: nx, y: ny, g: ng, steps: cur.steps + 1 });
    }
  }
  return null;
}

// Build-time table: for each visible point, the walk steps to each arrival cell of this zone.
function pointToArrivals(g: Grid, points: Point[], arrivals: Arrival[]): Map<number, StepRow[]> {
  const table = new Map<number, StepRow[]>();
  for (const p of points) {
    if (p.hidden) continue;
    const rows: StepRow[] = [];
    for (const a of arrivals) {
      const steps = walkSteps(g, p.at, a.at);
      if (steps !== null) rows.push({ targetId: a.id, steps });
    }
    table.set(p.id, rows);
  }
  return table;
}

// A zone is segmented when some pair of its exits cannot reach each other on foot.
function isSegmented(g: Grid, exits: Exit[]): boolean {
  for (const a of exits) {
    for (const b of exits) {
      if (a !== b && walkSteps(g, a.at, b.at) === null) return true;
    }
  }
  return false;
}

export {};
