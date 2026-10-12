// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Frame-local opaque batcher: collect polygons, sort by band and state, one draw per state run.

export interface Vertex { x: number; y: number; z: number; s: number; t: number; }

export interface StateKey {
  texture: number;   // texture id; -1 for untextured
  flags: number;     // polygon flags
  colour: number;    // packed RGBA
  shader: number;    // shader id; 0 when shaders are off
}

// Ordered: horizon-type polygons, drawn first in submission order.
// Untextured: grouped by state, no texture.
// Textured: grouped by state hash.
export const enum Band { Ordered = 0, Untextured = 1, Textured = 2 }

export interface Poly {
  band: Band;
  key: StateKey;
  verts: Vertex[];   // convex fan, verts[0] is the fan centre
  order: number;     // submission index
  hash: number;      // Ordered: the submission index. Others: 31-bit FNV-1a over the key.
}

const FNV_OFFSET = 0x811c9dc5 | 0;
const FNV_PRIME = 0x01000193;

// Word-wise FNV-1a over the key fields, masked to a non-negative 31-bit value.
export function stateHash(k: StateKey): number {
  let h = FNV_OFFSET;
  for (const w of [k.texture, k.flags, k.colour, k.shader]) {
    h = Math.imul(h ^ w, FNV_PRIME);
  }
  return h & 0x7fffffff;
}

export function sameKey(a: StateKey, b: StateKey): boolean {
  return a.texture === b.texture && a.flags === b.flags && a.colour === b.colour && a.shader === b.shader;
}

export function makePoly(key: StateKey, verts: Vertex[], order: number, horizon: boolean): Poly {
  const band = horizon ? Band.Ordered : key.texture < 0 ? Band.Untextured : Band.Textured;
  const hash = band === Band.Ordered ? order : stateHash(key);
  return { band, key, verts, order, hash };
}

// Explicit comparisons: no subtraction, so no int overflow between a negative key and a large one.
export function comparePolys(a: Poly, b: Poly): number {
  if (a.band !== b.band) return a.band < b.band ? -1 : 1;
  if (a.hash !== b.hash) return a.hash < b.hash ? -1 : 1;
  return a.order < b.order ? -1 : a.order > b.order ? 1 : 0;
}

export interface BatchStats { polys: number; draws: number; verts: number; }
export type DrawFn = (key: StateKey, verts: Vertex[], indices: number[]) => void;

export function renderBatches(input: Poly[], draw: DrawFn): BatchStats {
  const stats: BatchStats = { polys: input.length, draws: 0, verts: 0 };
  if (input.length === 0) return stats;
  const sorted = input.slice().sort(comparePolys);

  let key = sorted[0].key;
  let verts: Vertex[] = [];
  let indices: number[] = [];

  for (const p of sorted) {
    // Flush on the real key, not on hash equality, so a hash collision cannot hide a state change.
    if (!sameKey(key, p.key)) {
      draw(key, verts, indices);
      stats.draws++;
      stats.verts += verts.length;
      verts = [];
      indices = [];
      key = p.key;
    }
    const base = verts.length;
    for (const v of p.verts) verts.push(v);
    // Fan to triangles: (0, k, k+1) for k = 1 .. n-2.
    for (let k = 1; k + 1 < p.verts.length; k++) {
      indices.push(base, base + k, base + k + 1);
    }
  }
  draw(key, verts, indices);
  stats.draws++;
  stats.verts += verts.length;
  return stats;
}

export {};
