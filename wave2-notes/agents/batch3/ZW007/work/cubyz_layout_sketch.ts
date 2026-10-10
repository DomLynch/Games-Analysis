// Licence: GPL-3.0 (donor LICENSE file). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ZoneKind {
  id: string;
  radius: number;          // mean radius, world units
  radiusVariation: number; // +/- spread
  minH: number;            // height range this zone can be drawn at
  maxH: number;
  minHLimit: number;       // zone is discouraged where the local height is outside these limits
  maxHLimit: number;
}
export interface Centre { x: number; y: number; kind: ZoneKind; radius: number; height: number; weight: number; }
export type Rnd = () => number; // uniform in [0, 1)

export const CHUNK = 2048;     // chunk edge, world units
export const MAX_REJECTS = 100; // consecutive rejections before a chunk stops adding centres
export const SPACING = 0.85;    // centres may come this close, as a fraction of the summed radii
export const STRENGTH = 0.5;    // width of the blend band, in normalised distance
export const HEIGHT_PENALTY = 10;

// Phase order: (even,even) first, then (even,odd), (odd,even), (odd,odd). Each chunk only checks
// neighbours already placed in an earlier phase, so every adjacent pair is checked exactly once.
export function phaseOf(cx: number, cy: number): number {
  return (((cx % 2) + 2) % 2) * 2 + ((((cy % 2) + 2) % 2));
}
export const PHASE_NEIGHBOURS: [number, number][][] = [
  [],
  [[0, -1], [0, 1]],
  [[-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]],
  [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]],
];

// Place centres in one chunk. `neighbours` are the already-placed centres of adjacent chunks.
export function placeChunk(cx: number, cy: number, kindAt: (x: number, y: number) => ZoneKind,
                           rnd: Rnd, neighbours: Centre[]): Centre[] {
  const out: Centre[] = [];
  let rejects = 0;
  while (rejects < MAX_REJECTS) {
    const x = cx + Math.floor(rnd() * CHUNK);
    const y = cy + Math.floor(rnd() * CHUNK);
    const kind = kindAt(x, y);
    const radius = kind.radius + kind.radiusVariation * (2 * rnd() - 1);
    const clash = out.concat(neighbours).some((c) => {
      const minD = (radius + c.radius) * SPACING;
      const dx = c.x - x;
      const dy = c.y - y;
      return dx * dx + dy * dy < minD * minD;
    });
    if (clash) {
      rejects++;
      continue;
    }
    rejects = 0;
    out.push({
      x, y, kind, radius,
      height: kind.minH + rnd() * (kind.maxH - kind.minH),
      weight: 1 / Math.sqrt(Math.PI * radius * radius),
    });
  }
  return out;
}

// Normalised distance: Euclidean distance times the centre's weight, so it is measured in units of the centre's radius.
export function voronoiDist(c: Centre, x: number, y: number): number {
  return Math.hypot(c.x - x, c.y - y) * c.weight;
}

function smoothstep(t: number): number { return t * t * (3 - 2 * t); }

// Share that the second centre takes over the first, as a smooth function of the first centre's distance.
function bandShare(d1: number, d2: number): number {
  const centre = (d1 + d2) / 2;
  const start = centre - STRENGTH / 2;
  const end = centre + STRENGTH / 2;
  if (d1 < start) return 0;
  if (d1 > end) return 1;
  return smoothstep((d1 - start) / (end - start));
}

// Biome identity is a hard argmin of normalised distance (with a height gate); the height is a blend.
export function classify(x: number, y: number, cands: Centre[]): { kind: ZoneKind; height: number } {
  const list: { c: Centre; w: number }[] = cands.map((c) => ({ c, w: 1 }));
  let i = 0;
  outer: while (i < list.length) {
    let j = i + 1;
    while (j < list.length) {
      const share = bandShare(voronoiDist(list[i].c, x, y), voronoiDist(list[j].c, x, y));
      if (share === 0) { list.splice(j, 1); continue; }
      if (share === 1) { list.splice(i, 1); continue outer; }
      list[i].w *= 1 - share;
      list[j].w *= share;
      j++;
    }
    i++;
  }
  const total = list.reduce((s, e) => s + e.w, 0);
  const height = list.reduce((s, e) => s + e.c.height * e.w, 0) / total;
  let best = list[0].c;
  let bestD = Infinity;
  for (const e of list) {
    let d = voronoiDist(e.c, x, y);
    if (height > e.c.kind.maxHLimit) d += HEIGHT_PENALTY;
    if (height < e.c.kind.minHLimit) d += HEIGHT_PENALTY;
    if (d < bestD) { bestD = d; best = e.c; }
  }
  return { kind: best.kind, height };
}

export {};
