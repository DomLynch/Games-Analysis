// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Rand = (lo: number, hi: number) => number; // inclusive integers; seeded by the caller
type Rect = { x: number; y: number; w: number; h: number }; // grid cells; one cell = one zone block

interface PoolEntry { id: string; w: number; h: number; freq: number; maxUses: number } // maxUses < 0 = unlimited
interface Command {
  kind: "addBlock" | "addLine" | "fillArea";
  axis?: "vertical" | "horizontal"; // addLine only
  label: number;                    // 0 = unlabelled
  chance: number;                   // percent 0-100 that the command runs at all
  executions: number;               // attempts for addBlock
  conditionals: number[];           // +n: run only if label n succeeded; -n: only if it failed
  rects: Rect[];                    // empty = whole grid
  pool: PoolEntry[];                // empty for addLine
}
interface Grid { w: number; h: number; cells: (string | null)[][] } // null = empty; "dummy" = footprint cell

// Weighted pick. An entry with a use cap drops out of the pool once the cap is spent.
function pickEntry(pool: PoolEntry[], rand: Rand): PoolEntry | null {
  const live = pool.filter(p => p.maxUses !== 0);
  const total = live.reduce((s, p) => s + p.freq, 0);
  if (total <= 0) return null;
  let pick = rand(0, total - 1);
  for (const p of live) {
    if (pick < p.freq) {
      if (p.maxUses > 0) p.maxUses -= 1;
      return p;
    }
    pick -= p.freq;
  }
  return null;
}

// True when the whole w x h footprint at (x, y) is empty. Checks every row, including the last.
function fits(g: Grid, x: number, y: number, w: number, h: number): boolean {
  if (x < 0 || y < 0 || x + w > g.w || y + h > g.h) return false;
  for (let i = x; i < x + w; i++)
    for (let j = y; j < y + h; j++)
      if (g.cells[i][j] !== null) return false;
  return true;
}

// Every legal anchor for a w x h footprint inside the rects (whole grid when none given).
function anchors(g: Grid, rects: Rect[], w: number, h: number): [number, number][] {
  const areas: Rect[] = rects.length > 0 ? rects : [{ x: 0, y: 0, w: g.w, h: g.h }];
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const r of areas)
    for (let x = r.x; x + w <= r.x + r.w; x++)
      for (let y = r.y; y + h <= r.y + r.h; y++) {
        const key = x + "," + y;
        if (seen.has(key) || !fits(g, x, y, w, h)) continue;
        seen.add(key);
        out.push([x, y]);
      }
  return out;
}

// Stamp one block. The anchor cell holds the block id; the other footprint cells are marked "dummy".
function place(g: Grid, x: number, y: number, id: string, w: number, h: number): boolean {
  if (!fits(g, x, y, w, h)) return false;
  for (let i = x; i < x + w; i++)
    for (let j = y; j < y + h; j++) g.cells[i][j] = i === x && j === y ? id : "dummy";
  return true;
}

// Place up to `executions` blocks, one at a time, each at a uniformly chosen legal anchor.
function runAddBlock(g: Grid, cmd: Command, rand: Rand, pool: PoolEntry[]): boolean {
  let ok = false;
  for (let e = 0; e < cmd.executions; e++) {
    const entry = pickEntry(pool, rand);
    if (!entry) continue;
    const spots = anchors(g, cmd.rects, entry.w, entry.h);
    if (spots.length === 0) continue;
    const [x, y] = spots[rand(0, spots.length - 1)];
    ok = place(g, x, y, entry.id, entry.w, entry.h) || ok;
  }
  return ok;
}

// Keep filling until the pool is spent or nothing left in it fits. Entries that cannot fit now are
// skipped, so one large pick does not stop the fill (donor stops at the first pick that does not fit).
function runFillArea(g: Grid, cmd: Command, rand: Rand, pool: PoolEntry[]): boolean {
  let ok = false;
  for (;;) {
    const usable = pool.filter(p => p.maxUses !== 0 && anchors(g, cmd.rects, p.w, p.h).length > 0);
    const entry = pickEntry(usable, rand);
    if (!entry) break;
    const spots = anchors(g, cmd.rects, entry.w, entry.h);
    const [x, y] = spots[rand(0, spots.length - 1)];
    ok = place(g, x, y, entry.id, entry.w, entry.h) || ok;
  }
  return ok;
}

// Draw one full-length road in a column (vertical) or row (horizontal) picked from the rects.
// A line may cross the other road type (the cell becomes "cross"); anything else blocks it.
function runLine(g: Grid, cmd: Command, rand: Rand): boolean {
  const vertical = cmd.axis === "vertical";
  const span = vertical ? g.h : g.w;
  const across = vertical ? g.w : g.h;
  const mine = vertical ? "road-ns" : "road-ew";
  const theirs = vertical ? "road-ew" : "road-ns";
  const at = (k: number, t: number): [number, number] => (vertical ? [k, t] : [t, k]);

  const lines: number[] = [];
  for (const r of cmd.rects) {
    const from = vertical ? r.x : r.y;
    const to = vertical ? r.x + r.w : r.y + r.h;
    for (let k = from; k < to && k < across; k++) if (!lines.includes(k)) lines.push(k);
  }
  const usable = lines.filter(k => {
    for (let t = 0; t < span; t++) {
      const [x, y] = at(k, t);
      const c = g.cells[x][y];
      if (c !== null && c !== theirs) return false;
    }
    return true;
  });
  if (usable.length === 0) return false;
  const k = usable[rand(0, usable.length - 1)]; // uniform over usable lines
  for (let t = 0; t < span; t++) {
    const [x, y] = at(k, t);
    g.cells[x][y] = g.cells[x][y] === null ? mine : "cross";
  }
  return true;
}

// Run a script in order. A command skipped by its chance roll or its conditionals counts as failed.
export function runScript(g: Grid, cmds: Command[], rand: Rand): Map<number, boolean> {
  const done = new Map<number, boolean>();
  for (const cmd of cmds) {
    if (cmd.label > 0 && done.has(cmd.label)) throw new Error("duplicate label " + cmd.label);
    if (cmd.label > 0) done.set(cmd.label, false);
    const gated = cmd.conditionals.every(c => {
      const n = Math.abs(c);
      if (!done.has(n)) throw new Error("conditional names a label not defined earlier: " + n);
      return c > 0 ? done.get(n) === true : done.get(n) === false;
    });
    let success = false;
    if (gated && rand(0, 99) < cmd.chance) {
      const pool = cmd.pool.map(p => ({ ...p })); // use caps are per command run
      success = cmd.kind === "addLine" ? runLine(g, cmd, rand)
        : cmd.kind === "addBlock" ? runAddBlock(g, cmd, rand, pool)
        : runFillArea(g, cmd, rand, pool);
    }
    if (cmd.label > 0) done.set(cmd.label, success);
  }
  return done;
}

export {};
