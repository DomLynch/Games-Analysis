// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Abm {
  triggers: Set<string>;       // node contents this ABM watches
  interval: number;            // seconds between runs (donor default 10)
  chance: number;              // 1 in N per matching node per run
  minY: number;
  maxY: number;
  timer: number;               // seconds; starts with a random phase offset
  run(y: number, objectsInBlock: number, objectsWider: number): void;
}

interface Cell { content: string; y: number; }

interface Block {
  cells: Cell[];
  objectCount: number;             // objects in this block
  neighbourObjects: (number | null)[]; // 27 entries (3x3x3 incl. centre); null = not loaded
}

// Random start phase so ABMs registered together do not all fire on the same pass.
function initTimer(interval: number, rnd: () => number): number {
  const itv = Math.max(0.001, interval);
  const lo = Math.trunc(Math.max(-0.51 * itv, -60));
  const hi = Math.trunc(Math.min(0.51 * itv, 60));
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

function shuffle<T>(xs: T[], rnd: () => number): void {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
}

// Density signal handed to every trigger: this block, and the 3x3x3 neighbourhood with unloaded parts extrapolated.
function countObjects(b: Block): [number, number] {
  let wider = 0;
  let unknown = 0;
  for (const n of b.neighbourObjects) {
    if (n === null) unknown++;
    else wider += n;
  }
  const known = b.neighbourObjects.length - unknown;
  if (known > 0) wider += Math.floor((unknown * wider) / known);
  return [b.objectCount, wider];
}

// One pass. Called when the pass accumulator reaches passInterval (donor: abm_interval, default 1.0 s).
function abmPass(abms: Abm[], blocks: Block[], passInterval: number, budgetRatio: number,
                 rnd: () => number, nowMs: () => number): void {
  // each ABM adds one pass to its timer; it is due when the timer reaches its interval, and one interval is removed
  const due: Abm[] = [];
  for (const a of abms) {
    a.timer += passInterval;
    if (a.timer < a.interval) continue;
    a.timer -= a.interval;
    due.push(a);
  }
  shuffle(due, rnd);
  shuffle(blocks, rnd);

  const budgetMs = passInterval * 1000 * budgetRatio;
  const start = nowMs();
  for (const b of blocks) {
    const [inBlock, wider] = countObjects(b);
    for (const cell of b.cells) {
      for (const a of due) {
        if (!a.triggers.has(cell.content)) continue;
        if (cell.y < a.minY || cell.y > a.maxY) continue;
        if (Math.floor(rnd() * a.chance) !== 0) continue; // 1 in chance per matching node per run
        a.run(cell.y, inBlock, wider);
      }
    }
    if (nowMs() - start > budgetMs) break; // time budget spent: remaining blocks wait for the next pass
  }
}

export {};
