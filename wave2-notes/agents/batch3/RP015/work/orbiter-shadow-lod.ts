// Licence: GPL-3.0 or LGPL-3.0 (dual, per the Scene.cpp header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type V3 = [number, number, number];
export interface Sphere { c: V3; r: number; }
export interface Caster extends Sphere { id: number; }

const CASTER_MAX_R = 80;        // a caster larger than this is never a shadow caster in this pass
const CASTER_MAX_ALONG = 1000;  // window along the light direction
const CASTER_MAX_ACROSS = 1000; // window across the light direction
const TERRAIN_COVERAGE = 10;    // a caster whose merged sphere stays this small is always included
export const SHM_LOD_COUNT = 5; // map sizes are shadowMapSize >> 0..4

function sub(a: V3, b: V3): V3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a: V3, b: V3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function len(a: V3): number { return Math.sqrt(dot(a, a)); }
function addScaled(a: V3, b: V3, s: number): V3 { return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]; }

// Grows one enclosing sphere around the focus object: each caster that passes the filters is folded in.
// The running centre is used for the offset, as in the donor. Focus is implicitly first.
export function buildCoverage(focus: Sphere, ld: V3, casters: Caster[]): { sphere: Sphere; included: number[] } {
  let c = focus.c;
  let r = focus.r;
  const frad = focus.r;
  const included: number[] = [];
  for (const v of casters) {
    if (v.r > CASTER_MAX_R) continue;
    const bc = sub(v.c, c);
    const z = dot(ld, bc);
    if (Math.abs(z) > CASTER_MAX_ALONG) continue;
    const fbc = addScaled(bc, ld, -z);
    const dst = len(fbc);
    if (dst > CASTER_MAX_ACROSS) continue;
    const nrd = (r + dst + v.r) * 0.5;
    if (!(dst < v.r + frad || nrd < TERRAIN_COVERAGE)) continue;
    included.push(v.id);
    if (nrd < r) continue;
    if (nrd < v.r) { c = v.c; r = v.r; }
    else {
      if (dst > 0.001) c = addScaled(c, fbc, (nrd - r) / dst);
      r = nrd;
    }
  }
  return { sphere: { c, r }, included };
}

// Light-space test used to pick casters for one map: a cylinder around the light ray, bounded along the ray.
// The donor's test (VVessel.cpp 611-612) has no along-ray bound; the bound here reuses the coverage window (defect fix).
export function inShadowCylinder(center: V3, radius: number, origin: V3, ld: V3, coverRad: number): boolean {
  const bc = sub(center, origin);
  const x = dot(bc, ld);
  if (Math.abs(x) > CASTER_MAX_ALONG) return false;
  const perp2 = dot(bc, bc) - x * x;
  return Math.sqrt(Math.max(0, perp2)) <= coverRad + radius;
}

// Depth range of the map from the casters' extents along the light (the donor adds 10 units of padding).
export function depthRange(center: V3, ld: V3, coverRad: number, casters: Sphere[]): { depth: number; cameraDist: number } {
  let mnd = 1e16;
  let mxd = -1e16;
  for (const s of casters) {
    const x = dot(sub(s.c, center), ld);
    mnd = Math.min(mnd, x - coverRad);
    mxd = Math.max(mxd, x + coverRad);
  }
  // ortho near = 50, far = 50 + depth; the light camera sits 55 units before the nearest caster
  return { depth: mxd - mnd + 10, cameraDist: mnd - 55 };
}

// Map size from the apparent size of the shadowed object. apparentPx is the donor's rsmax (its unit depends on the
// camera aperture convention; not verified). The map is the power-of-two step closest to 1.5 x apparentPx in log2 space.
export function shadowLod(shadowMapSize: number, apparentPx: number): { lod: number; size: number } {
  const raw = Math.log2(shadowMapSize / (apparentPx * 1.5));
  // apparentPx of 0 gives +Infinity here; the donor's int(round(inf)) is undefined behaviour in C++, this returns the coarsest level.
  const lod = Math.max(0, Math.min(Math.round(raw), SHM_LOD_COUNT - 1));
  return { lod, size: shadowMapSize >> lod };
}

export {};
