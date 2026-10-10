// clean-room: written from the described mechanism (GPL-2.0-or-later donor), not a translation of the donor lines.
// Per-turn research pacing: a queue spends a pool of points in priority order, each item capped per turn,
// then leftover points auto-fill the cheapest researchable items that are not queued.
interface Item {
  name: string;
  cost: number;        // total points to finish (>0)
  minTurns: number;    // minimum turns to finish; the per-turn cap is cost / max(1, minTurns)
  progress: number;    // fraction 0..1 done
  researchable: boolean;
  paused: boolean;
}

const EPS = 0.01;      // tolerance for "finished" and "enough left"

interface TurnResult { spent: Map<string, number>; finished: string[]; }

// One turn. queue = ordered list of names the player wants; items = the whole catalogue.
function runTurn(points: number, queue: string[], items: Map<string, Item>): TurnResult {
  const spent = new Map<string, number>();
  const finished: string[] = [];
  let left = points;

  // 1) queue, in order. Full allocation while it fits; the first item that does not fit takes the rest.
  let queueSpent = 0;
  for (const name of queue) {
    const it = items.get(name);
    if (!it || it.paused || !it.researchable) continue;
    const need = it.cost - it.progress * it.cost;
    const cap = it.cost / Math.max(1, it.minTurns);
    const want = Math.min(need, cap);
    let give = 0;
    if (queueSpent + want <= left - EPS) give = want;
    else if (queueSpent < left - EPS) give = left - queueSpent;
    if (give > 0) {
      spent.set(name, give);
      queueSpent += give;
    }
  }
  // apply queue progress; an item finishes when progress reaches cost (within EPS)
  for (const [name, give] of spent) {
    const it = items.get(name)!;
    it.progress += give / Math.max(EPS, it.cost);
    if (it.cost - EPS <= it.progress * it.cost) finished.push(name);
  }
  left -= queueSpent;

  // 2) leftover auto-fill: researchable, not queued, not done; cheapest remaining cost first (stable on ties).
  const queued = new Set(queue);
  const candidates: Array<[number, string]> = [];
  for (const [name, it] of items) {
    if (queued.has(name) || !it.researchable || it.paused || it.progress >= 1) continue;
    candidates.push([it.cost * (1 - it.progress), name]);
  }
  candidates.sort((a, b) => a[0] - b[0]);
  for (const [, name] of candidates) {
    if (left <= EPS) break;
    const it = items.get(name)!;
    const capFrac = (it.cost / Math.max(1, it.minTurns)) / it.cost;   // per-turn fraction cap
    const inc = Math.min(1 - it.progress, capFrac, left / it.cost);
    it.progress += inc;
    left -= inc * it.cost;
    spent.set(name, (spent.get(name) ?? 0) + inc * it.cost);
    if (it.cost - EPS <= it.progress * it.cost) finished.push(name);
  }
  return { spent, finished };
}

export {};
