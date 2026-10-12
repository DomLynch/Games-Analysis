// Licence: donor GPL v2 or later (per gadget header and repo LICENSE.md). Clean-room sketch of the shape only.
const RUN_SEED = 7654321;   // fixed seed for a reproducible run
const DRAW_TABLE = 5000;    // precomputed draw table size (donor cycles this table)
const SPAWN_EVERY = 3;      // spawn burst every 3 ticks
const RUN_TICKS = 2000;     // default run length

interface Category { name: string; max: number; step: number; noMultiplier: boolean; }
interface Run {
  table: number[];          // private table: no global RNG is touched (fix: donor calls math.randomseed)
  cursor: number;
  pendingStart: number | null;
  start: number;
  end: number;
  digests: { frame: number; sum: number }[];
}

// Deterministic private generator mapped into [0, 1). Same seed, same table, on every peer.
function makeTable(seed: number, n: number): number[] {
  const out: number[] = [];
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out.push(s / 4294967296);
  }
  return out;
}

function nextDraw(run: Run): number {
  // Donor getrandom: advance first, then read. The cursor starts on entry 1, so the first draw is entry 2 and entry 1 comes only after the wrap.
  run.cursor = (run.cursor + 1) % run.table.length; // period is the table length (donor behaviour, kept and documented)
  return run.table[run.cursor];
}

function begin(run: Run, frame: number): void {
  run.table = makeTable(RUN_SEED, DRAW_TABLE);
  run.cursor = 0;
  run.start = frame;
  run.end = frame + RUN_TICKS;
  run.pendingStart = null;
  run.digests = [];
}

// Arm a run now, or anchor it to a future frame so every peer starts on the same tick.
function arm(run: Run, now: number, startFrame: number | null): boolean {
  if (startFrame === null) {
    begin(run, now);
    return true;
  }
  if (startFrame <= now) return false;
  run.pendingStart = startFrame;
  return true;
}

// One tick: start an anchored run, spawn on the pacing interval, and sample the checksum in the window.
function onTick(run: Run, n: number, checksum: (frame: number) => number, spawn: (draw: number) => void): void {
  if (run.pendingStart !== null && n === run.pendingStart) begin(run, n);
  if (n >= run.start && n < run.end && (n - run.start) % SPAWN_EVERY === 0) spawn(nextDraw(run));
  if (n > run.start && n <= run.end) run.digests.push({ frame: n - run.start, sum: checksum(n) });
}

// Digest over checksum values in order only; frame numbers stay in the record, not in the digest.
function digestOf(run: Run): number {
  let h = 2166136261;
  for (const d of run.digests) {
    h = Math.imul((h ^ (d.sum | 0)) >>> 0, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Table-driven categories: effective counts scale with the multiplier unless the row opts out.
function effective(c: Category, mult: number): { max: number; step: number } {
  if (c.noMultiplier) return { max: c.max, step: c.step };
  return {
    max: Math.max(1, Math.floor((c.max * mult) / 2)),
    step: Math.max(1, Math.floor((c.step * mult) / 2)),
  };
}

export {};
