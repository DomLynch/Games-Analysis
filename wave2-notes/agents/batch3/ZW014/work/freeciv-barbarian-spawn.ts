// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Pt = { x: number; y: number };
interface Anchor { pos: Pt; owner: string; }            // a settled point (a donor city) that anchors a zone
interface Rules {
  minBand: number; maxBand: number;                      // tile distance band from the nearest anchor
  rate: number;                                          // barbarian rate: 2 = NORMAL, 3 = FREQUENT, 4 = HORDES
  mapFactor: number;                                     // one attempt per mapFactor tiles, per pass
  onsetTick: number;                                     // no spawns before this tick
  chanceByOwner: (owner: string) => number;              // percent 0..100 for the owner's government
}
interface World {
  width: number; height: number; anchors: Anchor[];
  noSpawn(p: Pt): boolean; occupied(p: Pt): boolean;
}
export interface Spawn { owner: string; at: Pt; count: number; }

// Tile distance. Sketch uses Chebyshev distance; the donor uses real_map_distance in the active topology (not read in full).
const dist = (a: Pt, b: Pt): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// Tier rises at owner-anchor counts 10, 32, 80 (donor loop, city_max truncated to int on each step).
function tierFor(anchorCount: number): number {
  let tier = 1; let max = 10;
  while (max <= anchorCount) { tier++; max = Math.trunc(max + max * 1.2 + 10); }
  return tier;
}

// One attempt: sample a uniform random tile, then pass through the donor's gates in order.
export function tryOneSpawn(w: World, r: Rules, rng: () => number, owned: Record<string, number>): Spawn | null {
  const pick = (n: number): number => Math.floor(rng() * n);
  const p: Pt = { x: pick(w.width), y: pick(w.height) };
  if (w.noSpawn(p)) return null;

  let best: Anchor | null = null; let bestD = Infinity;
  for (const a of w.anchors) { const d = dist(p, a.pos); if (d < bestD) { bestD = d; best = a; } }
  if (best === null || bestD < r.minBand || bestD > r.maxBand) return null;

  let at: Pt | null = null;                              // a free tile in the 3x3 block around p
  for (let dy = -1; dy <= 1 && at === null; dy++) {
    for (let dx = -1; dx <= 1 && at === null; dx++) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (q.x >= 0 && q.y >= 0 && q.x < w.width && q.y < w.height && !w.occupied(q)) at = q;
    }
  }
  if (at === null) return null;

  const owner = best.owner;
  const n = owned[owner] ?? 0;
  if (pick(30) + 1 > n * (r.rate - 1)) return null;      // gate A: more anchors, more likely
  if (pick(100) > r.chanceByOwner(owner)) return null;   // gate B: government chance

  return { owner, at, count: pick(3) + tierFor(n) * r.rate };
}

// Per-pass driver: attempts = floor(area / mapFactor) * (rate - 1), none before the onset tick.
export function passSpawns(w: World, r: Rules, rng: () => number, owned: Record<string, number>, tick: number): Spawn[] {
  if (tick < r.onsetTick || r.rate <= 1) return [];
  const area = w.width * w.height;
  const attempts = Math.max(1, Math.floor(area / r.mapFactor)) * (r.rate - 1);
  const out: Spawn[] = [];
  for (let i = 0; i < attempts; i++) {
    const s = tryOneSpawn(w, r, rng, owned);
    if (s !== null) out.push(s);
  }
  return out;
}

export {};
