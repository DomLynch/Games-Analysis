# orbitersim-orbiter (rendering-performance, cell 3)

Donor: `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Scene.cpp` (with `VVessel.cpp`, `Scene.h`, `D3D9Config.cpp`; `Mesh.cpp` by grep only) | Licence: dual GPL v3 and LGPL v3 per the `Scene.cpp` header (line 4, "Dual licensed under GPL v3 and LGPL v3"). The repo `LICENSE` is MIT (Copyright 2000-2026 Martin Schweiger), but the file header is the more specific statement for this file, so I treat it as copyleft: clean-room, shape only | C++ (Direct3D 9) | symbol `Scene::RenderShadowMap`

Checked: camera_scope n/a (the light's shadow-map camera, not the player camera). Read in full: `Scene::RenderShadowMap` (`Scene.cpp` 2472-2565). Read in part: the terrain-shadow caster merge (`Scene.cpp` 1506-1584), the vessel shadow call sites (1776-1850), `VVessel.cpp` 595-660 (both shadow tests and the light-distance function), `Scene.h` 42 and 230-361 (grep), `D3D9Config.cpp` 160 (clamp). Confidence high on the shadow-map LOD and caster filters; medium on the terrain path (read 1506-1584 but not the render that follows it); low on the apparent-size unit (see section 6). Not read: `D3D9Util.cpp` (`D9IsBSVisible`, `D9LinearFieldOfView` bodies), `sort_vessels`, `vVessel::GetBoundingSpherePosDX`, the definition of `Camera.aperture`, the planet/terrain render after line 1584, and the `Mesh.cpp` culling body (lines 1477-1530 and 1627-1629 seen only in grep). Default shadow map size 2048 is at `D3D9Config.cpp` line 68 (read, not receipted).

## 1. Mechanism

- Shadow maps are rendered on demand, once per shadowed target and per frame. The target is the focus vessel (vessel path, `Scene.cpp` 1794-1797) or each vessel in an intersect list (1839-1846), or a merged sphere around the focus and nearby casters for terrain shadowing (1526-1581).
- Caster selection, vessel path (`RenderShadowMap` with no list, 2497-2498): every active vessel whose bounding sphere lies within the shadow cylinder around the light ray (`IntersectShadowVolume`, `VVessel.cpp` 605-613) is added to the render list.
- Caster selection, terrain path (1526-1576): the focus goes in first. Each caster must have radius at most 80 (1547), be within 1000 units along the light (1551) and within 1000 units across it (1554). It is included when its sphere overlaps the focus sphere (1560) or the merged radius is under 10 (1522, 1561). Included casters grow one enclosing sphere (1556 merged radius; 1568, 1575 centre shift and radius update).
- Coverage: the radius is scaled by 1.02 (2474). The ortho box is `-rad..rad` across, z from 50 to `50 + depth` (2527).
- Depth: each caster gives `x - rad` and `x + rad` along the light (`GetMinMaxLightDist`, `VVessel.cpp` 639-640); `depth = (mxd - mnd) + 10` (2525); the light camera is placed at `mnd - 55` along the light (2529).
- Apparent size (`rsmax`): non-list path, `viewh * rad / (tanap * |pos|)` (2504), focus only. List path: `rsmax` starts at 0 (2482) and takes the maximum over the list of `viewh * rad / (tanap * |bspos|)` (2520), where `rad` is the coverage radius and `bspos` each listed vessel's sphere centre.
- LOD: `lod = log2(ShadowMapSize / (rsmax * 1.5))` (2536); `lod = min(round(lod), SHM_LOD_COUNT - 1)` (2538); `lod = max(lod, 0)` (2539); map size `ShadowMapSize >> lod` (2540). `SHM_LOD_COUNT` is 5 (`Scene.h` 42). The configured size is clamped to 512..4096 on read (`D3D9Config.cpp` 160), default 2048 (line 68). With 2048 the five sizes are 2048, 1024, 512, 256, 128.
- Render: the map is pushed to the render target for that LOD (2542), cleared, then the list is rendered in the shadow pass (`BeginPass(RENDERPASS_SHADOWMAP)`, then `Render` per vessel, popping the list).
- Tick: none. Shadow maps are rebuilt each frame from the current geometry. There is no time-based cache, no fixed step and no accumulator.

## 2. Key functions

- `Scene::RenderShadowMap`: `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Scene.cpp` 2472-2565 (start at 2472). Coverage scale (2474), list build (2497-2499), apparent size (2482, 2504, 2520), depth and camera (2525-2529), LOD (2536-2540), render target and pass (2542).
- Terrain caster merge, inside the function that calls `RenderShadowMap(pos, ld, rad, false, true)` at 1581: `Scene.cpp` 1526-1576. Filters (1547-1561), merge (1568-1575). The merge bound constant `bouble_rad` is at 1522.
- `vVessel::IntersectShadowVolume`: `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/VVessel.cpp` 605-613.
- `vVessel::GetMinMaxLightDist`: same file, 632-641.
- `Mesh.cpp` group culling (grep only, not read in full): `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Mesh.cpp` 1517 (linear frustum from the projection), 1629 (bounding-sphere test per group).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Shadow map size from the shadowed object's apparent size, in log2 steps | `log2(S / (1.5 x apparent))` rounded (2536-2538); 1.5 at 2536 |
| Five resolution levels, clamped | `SHM_LOD_COUNT` 5 (`Scene.h` 42); floor 0 (2539) |
| Configured map size range | 512..4096 (`D3D9Config.cpp` 160); default 2048 (line 68, not receipted) |
| Coverage margin | x 1.02 (2474) |
| Depth padding | +10 units (2525) |
| Near plane of the light camera | 50 (2527); camera 55 units before the nearest caster (2529) |
| Caster radius cap | 80 (1547) |
| Caster window along and across the light | 1000 and 1000 (1551, 1554) |
| Terrain coverage merge bound | 10 (1522, 1561) |
| Per-frame caster count cap | none; the list grows with every caster that passes the test (2497-2498) |

## 4. TypeScript sketch

simplified: the sketch keeps the caster filters and merge (`buildCoverage`), the light-ray cylinder test, the depth range and the LOD rule. Omitted: the vessel and planet lists and their render calls, the render target and clear, the ortho and light view matrices, the stencil flag, the `sort_vessels` order (not read; the sketch takes casters as given), and the terrain path's surrounding setup. Changed on purpose: the donor's cylinder test (`VVessel.cpp` 611-612) has no along-ray bound, so the sketch bounds it with the same window the coverage builder uses (defect fix, section 6). The sketch returns the LOD for an apparent size of 0 as the coarsest level; the donor's `int(round(inf))` would be undefined in C++.

```ts
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
```

## 5. Lands in

- TARGET `origins/client/render/shadow-lod.ts` (proposed path, not checked against the Frankendom repo). Client-only: the shadow map for the boss or hero, sized from the shadowed actor's on-screen size, drawn in the world and in the Pit as a client option.
- Parity-checklist row 16 (colour grade / quality). Shadows are a quality tier and a frame-budget item; the lane hint said row 12, but in the addendum list row 12 is combat sound cues, so I used row 16. Lead should confirm the row.
- Reuse tag: rewrite-from-idea (GPL-3.0 or LGPL-3.0; clean-room only)
- Brief rule served: the camera and shadows are client-only (the engine never reads a shadow map); zones as data (caster windows and the coverage bound can be zone data); defect rule (keep the idea, fix the defect).

## 6. Gaps and risks

- Copyleft licence: clean-room only. The sketch is written from the described mechanism, not from the donor lines.
- Client only. Shadow casters must never decide a hit, a kill or a spawn. Shadows are not a gameplay input, so the server-verified kill rules are unaffected.
- Defect 1, no along-ray bound in the vessel test. `IntersectShadowVolume` (`VVessel.cpp` 611-612) tests only the perpendicular distance to the light ray and does not check which side of the target the caster is on. Casters far along the ray or on the other side are included, and they widen the depth range (2525), which costs depth precision. Fix: bound the along-ray window (as in `inShadowCylinder`). Whether the far-side casters ever cast onto the target was not checked.
- Defect 2, apparent-size unit not verified. `rsmax` uses `viewh * rad / (tanap * d)` with `tanap = tan(Camera.aperture)` (`Scene.h` 361). If `Camera.aperture` is a half-angle, `rsmax` is an apparent diameter in pixels, not a radius; the 1.5 factor then means something else. The definition of `Camera.aperture` was not read. Fix: check the convention before porting, and name the value in the port (for example "apparent diameter in px").
- Defect 3, zero apparent size. `rsmax` of 0 gives `log2(+inf)`, and `int(round(inf))` is undefined behaviour (2536-2538). `rsmax` is 0 when `rad` is 0, and the non-list path divides by `|pos|` (2504), which is 0 if the focus sits at the origin. Fix: clamp `rsmax` to at least 1 pixel before the log (the sketch returns the coarsest level).
- Risk, two size rules. The non-list path sizes the map by the focus only (2504). The list path takes the maximum over listed vessels, each divided by its own distance (2520), so the nearest listed vessel decides. Both are reasonable, but a port must choose one rule and state it.
- Risk, no caster cap. Every caster that passes the test is added to the list (2497-2498) and rendered into the map. Nothing caps the count. Frankendom needs a per-zone cap as zone data, set per quality tier.
- Risk, one map per target per frame. Each target gets its own `RenderShadowMap` call and its own clear and render pass (1797, 1839-1846). A fight with several shadowed actors costs several shadow passes per frame. On a phone, cap the number of shadowed actors per frame.
- Frame budget. The LOD gives a cheaper map when the target is small on screen, which is the cheap case. Measure on a phone before tuning the 1.5 factor.
- Mesh culling (grep only): `Mesh.cpp` 1517 builds a linear frustum from the projection and 1629 tests each group's bounding sphere before drawing it. This is a separate, standard mechanism; it was not written as a note and the test body (`D9IsBSVisible`) was not read.
- Camera dependency. The shadow LOD follows the focus's on-screen size, which depends on the camera distance (2504). Pulling back an over-the-shoulder camera makes the boss's shadow map drop a level, which is the intended effect; check it does not make the shadow visibly soft at the fight distance.

Best transferable idea: Pick the shadow-map resolution from the shadowed actor's on-screen size, in power-of-two steps clamped to five levels, and cull shadow casters by a radius cap and a distance window, so a small or distant boss costs a small shadow pass.

Decision (proposed): adapt - take the apparent-size resolution rule, the caster radius cap and window, and the depth padding; fix the along-ray bound, the zero-size guard and the unit of the apparent size, and add a caster cap as zone data. Why: the boss and hero shadows are the main quality cost on a phone and this rule scales them with the camera; the defects are fixable and the rule does not conflict with the rulings (client only, no engine input).

Acceptance: On a phone-width world zone (375 wide), the boss's shadow map steps down through 2048, 1024 and 512 as the camera pulls back to three set distances (a dev overlay shows the size), at most one shadow pass per shadowed actor per frame, and a unit test asserts `inShadowCylinder` is false for a caster 1200 units along the light and `shadowLod(2048, 0)` returns level 4.

Brief rule served: the shadow path is client-only; the caster window and cap are zone data; defect rule (keep the idea, fix the defect).
