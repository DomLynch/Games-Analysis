// Licence: Zlib (donor, DFHack). Clean-room sketch of the described mechanism, not a translation of the donor lines.
export {};

interface Pt { x: number; y: number; z: number; }

interface Item {
  id: number;
  pos: Pt;
  keys: string[];   // filter buckets this item can satisfy
  inJob: boolean;   // already attached to a building
}

interface Requirement {
  key: string;        // filter bucket, like the donor's getBucket
  qty: number;        // units still needed
  sources: string[];  // item sources that may supply this requirement
}

interface Building {
  id: number;
  pos: Pt;
  reqs: Requirement[];
  done: boolean;
}

interface Task { bld: number; req: number; }

interface World {
  buildings: Map<number, Building>;
  sources: Array<{ name: string; items: Item[] }>;     // scan order; the caller puts the last-scan sources at the end
  queues: Map<string, Map<string, Task[]>>;            // queues[source][bucket] is a FIFO
}

// Chebyshev distance in the plane plus vertical steps (donor distance()).
function dist(a: Pt, b: Pt): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) + Math.abs(a.z - b.z);
}

// Planning: one task per unit of each requirement, per source and bucket (donor registerPlannedBuilding).
export function register(w: World, b: Building): void {
  b.reqs.forEach((req, ri) => {
    for (const src of req.sources) {
      let buckets = w.queues.get(src);
      if (!buckets) { buckets = new Map<string, Task[]>(); w.queues.set(src, buckets); }
      let q = buckets.get(req.key);
      if (!q) { q = []; buckets.set(req.key, q); }
      for (let u = 0; u < req.qty; u++) q.push({ bld: b.id, req: ri });
    }
  });
  w.buildings.set(b.id, b);
}

// Priority: move this building's first task per requirement and source to the front of its bucket.
export function prioritize(w: World, b: Building): void {
  b.reqs.forEach((req, ri) => {
    for (const src of req.sources) {
      const q = w.queues.get(src)?.get(req.key);
      if (!q) continue;
      const i = q.findIndex((t) => t.bld === b.id && t.req === ri);
      if (i >= 0) {
        const [t] = q.splice(i, 1);
        q.unshift(t);
      }
    }
  });
}

// One cycle (donor buildingplan_cycle). The caller runs it on a timer; the donor uses 599 frames.
export function cycle(
  w: World,
  attach: (item: Item, b: Building, req: number) => boolean,
  finalize: (b: Building) => void,
): void {
  for (const src of w.sources) {
    const buckets = w.queues.get(src.name);
    if (!buckets) continue;
    for (const [bucket, queue] of buckets) {
      // Candidates are computed once per bucket per cycle, as the donor does on the first task.
      const candidates = src.items.filter((it) => !it.inJob && it.keys.includes(bucket));
      while (queue.length > 0 && candidates.length > 0) {
        const task = queue[0];
        const b = w.buildings.get(task.bld);
        if (!b || b.done || b.reqs[task.req].qty <= 0) { queue.shift(); continue; } // drop stale tasks
        // Nearest candidate first; on a tie the earlier candidate wins (strict less-than).
        let best = 0;
        for (let i = 1; i < candidates.length; i++) {
          if (dist(b.pos, candidates[i].pos) < dist(b.pos, candidates[best].pos)) best = i;
        }
        const item = candidates[best];
        candidates.splice(best, 1);            // never offer the same item twice in this bucket
        if (!attach(item, b, task.req)) continue; // fix: a failed attach drops the candidate; the donor retries the same item
        item.inJob = true;
        queue.shift();
        b.reqs[task.req].qty -= 1;
        if (b.reqs.every((r) => r.qty === 0)) {
          b.done = true;
          finalize(b);
          w.buildings.delete(b.id);
        }
      }
      if (queue.length === 0) buckets.delete(bucket);
    }
  }
}
