// Licence: GPL-3.0 (donor, repo LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Poi { name: string; kind: "town" | "capital" | "other"; x: number; y: number; }
export interface PoiSpec { name: string; kind: "town" | "capital" | "other"; count: number; radiusFactor: number; offsetX: number; offsetY: number; }
export interface Rect { x0: number; y0: number; x1: number; y1: number; }
export interface Link { from: Poi; to: Poi; }
export interface PlaceResult { pois: Poi[]; failedSpecs: string[]; reruns: number; }

// Seeded RNG (mulberry32) so the same seed gives the same world on server and client.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPACING = 4;   // half-width of the no-fly box, in tiles (donor: an 8 x 8 rectangle centred on each point, World.java 537)
const TRIES = 500;   // donor: `counter < 500` (World.java 474)

function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1;
}

function boxAt(x: number, y: number): Rect {
  return { x0: x - SPACING, y0: y - SPACING, x1: x + SPACING, y1: y + SPACING };
}

// Fix for the donor neighbour search (World.java 503-522): every offset is tested on its own. The donor
// sets one flag before the loops and never clears it, so after the first blocked offset nothing is accepted.
export function freeSpot(x: number, y: number, boxes: Rect[]): { x: number; y: number } | null {
  const offsets: [number, number][] = [[0, 0], [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (const [dx, dy] of offsets) {
    const cx = x + dx;
    const cy = y + dy;
    if (!boxes.some(b => inRect(b, cx, cy))) return { x: cx, y: cy };
  }
  return null;
}

// Place POIs one at a time in list order. specs must already be in placement order (donor: caves and dungeons last, BiomeData.java 85-92).
// Each try draws a radius and an angle inside the biome; a try fails if it is off the map, outside the biome, or blocked.
// Donor behaviour kept: 500 tries per point, a rerun from scratch when a point cannot be placed.
// Fix: a point that fails all 500 tries (including out-of-biome tries) now counts as a failure and triggers a rerun; in the donor it is silently dropped.
export function placePois(
  specs: PoiSpec[],
  inBiome: (x: number, y: number) => boolean,
  start: { x: number; y: number },
  biomeW: number,
  biomeH: number,
  mapW: number,
  mapH: number,
  rnd: () => number,
  maxReruns: number,
): PlaceResult {
  let reruns = 0;
  for (;;) {
    const pois: Poi[] = [];
    const boxes: Rect[] = [];
    const failedSpecs: string[] = [];
    for (const spec of specs) {
      for (let i = 0; i < spec.count; i++) {
        let placed = false;
        for (let t = 0; t < TRIES && !placed; t++) {
          const r = Math.sqrt((rnd() / 2) * spec.radiusFactor);
          const th = rnd() * 2 * Math.PI;
          const x = Math.round(start.x + spec.offsetX * biomeW + r * Math.cos(th) * (biomeW / 2));
          const y = Math.round(start.y + spec.offsetY * biomeH + r * Math.sin(th) * (biomeH / 2));
          if (x < 0 || y <= 0 || x >= mapW || y >= mapH || !inBiome(x, y)) continue;
          const spot = freeSpot(x, y, boxes);
          if (spot === null) continue;
          boxes.push(boxAt(spot.x, spot.y));
          pois.push({ name: spec.name, kind: spec.kind, x: spot.x, y: spot.y });
          placed = true;
        }
        if (!placed) failedSpecs.push(spec.name);
      }
    }
    if (failedSpecs.length === 0 || reruns >= maxReruns) return { pois, failedSpecs, reruns };
    reruns++;
  }
}

function dist(a: Poi, b: Poi): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Each town links to its nearest town within maxRoad that is not already linked. Only drawn links are recorded
// (fix: the donor records a second-nearest edge as used without drawing it, World.java 606-610).
export function townRoads(towns: Poi[], maxRoad: number): Link[] {
  const links: Link[] = [];
  const linked = new Set<string>();
  const key = (i: number, j: number) => `${Math.min(i, j)}-${Math.max(i, j)}`;
  for (let i = 0; i < towns.length; i++) {   // fix: the donor loop stops one short (World.java 580)
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < towns.length; j++) {
      if (i === j || linked.has(key(i, j))) continue;
      const d = dist(towns[i], towns[j]);
      if (d > maxRoad) continue;
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best < 0) continue;
    linked.add(key(i, best));
    links.push({ from: towns[i], to: towns[best] });
  }
  return links;
}

// Every non-town point links to its nearest town with no distance cap (donor World.java 613-629).
export function poiRoads(others: Poi[], towns: Poi[]): Link[] {
  const links: Link[] = [];
  for (let i = 0; i < others.length; i++) {   // fix: the donor loop stops one short (World.java 613)
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < towns.length; j++) {
      const d = dist(others[i], towns[j]);
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best >= 0) links.push({ from: others[i], to: towns[best] });
  }
  return links;
}

// Bresenham line, one axis per step (the donor's else-if). Off-map tiles are skipped but the line still advances;
// the donor's `continue` leaves the position unchanged, so the line freezes at the edge (World.java 647-648).
export function carve(a: Poi, b: Poi, w: number, h: number, mark: (x: number, y: number) => void): void {
  let x = Math.round(a.x);
  let y = Math.round(a.y);
  const x1 = Math.round(b.x);
  const y1 = Math.round(b.y);
  const dx = Math.abs(x1 - x);
  const dy = Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  let err = dx - dy;
  for (let step = 0; step <= dx + dy; step++) {   // each step reduces the remaining Manhattan distance by one
    if (x >= 0 && y >= 0 && x < w && y < h) mark(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    else if (e2 < dx) { err += dx; y += sy; }
  }
}

export {};
