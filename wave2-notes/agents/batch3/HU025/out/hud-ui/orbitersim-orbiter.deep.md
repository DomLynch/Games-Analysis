# orbitersim-orbiter (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/hud.cpp` (with `Src/Orbiter/Pane.cpp` for the projection) | Licence: MIT (LICENSE line 1: "MIT License", Copyright 2000-2026 Martin Schweiger; Pane.cpp line 2: "Licensed under the MIT License") | C++ | symbol `HUD::OffscreenDirMarker`

Checked: hud.cpp read at 80-122 (HUD::Draw and DrawDefault), 172-200 (Resize, marker size), 344-373 (centre marker mesh, not used by the marker chain), 1013-1022, 1167-1247 (projection, markers, off-screen chevron), 1307-1330 (orbit HUD marker chain), 1815-1861 (docking HUD target selection), 1862-1905 (velocity and target markers and labels). Pane.cpp 1-6 and 785-830 (projection). Caller grep for the marker helpers across Src. Candidates opened: hud.cpp, Pane.cpp; Orbiter.cpp 217 (locale call, grep only). Not read: D3DMath_VectorMatrixMultiply and HomogZlimit (they decide whether a point behind the camera passes the projection), the per-frame caller of HUD::Draw, Vessel::DrawHUD (Vessel.cpp 5170, grep only), DlgMap.cpp (world map). Confidence: high on the marker chain and its order; medium on the behind-camera behaviour, which depends on the unread projection code. Scope: HUD, not a camera (no camera numbers used).

Best transferable idea: draw each threat as a box when it is on screen, and when it is not, fall back to a small arrow at the centre that points toward it, with its name and distance, instead of hiding it.
Decision (proposed): adapt — the on-screen-then-arrow chain is what a three-attacker fight needs for off-screen threats; the donor's centred arrow, missing behind flag and divide-by-zero are changed in the sketch.
Acceptance: with three attackers, a target on screen gets a box with its name above and distance below; an attacker behind the camera gets an arrow on the screen rim (not the crosshair) with a "behind" tag; an attacker exactly on the camera axis gets no arrow and no NaN (unit test: chevron(0,0,1) returns null; chevron(1,0,-1) returns behind true).

## 1. Mechanism

- A HUD of world directions drawn over the 3D view. Each marker is a direction from the camera or vessel frame, not a point on the ground. It is shown as a shape at the projected point if that point is on screen, otherwise as a fallback.
- Per draw (HUD::Draw, hud.cpp 80-112), in order: (a) no HUD in external camera views (83). (b) The HUD centre is either the cockpit offset or the projection of the vessel's forward axis; behind the camera (homog.z not > 0, hud.cpp 99-105) the centre is parked at -10000 so nothing draws there. (c) Scale and then the vessel's `DrawHUD` draws the markers.
- Projection (non-cockpit): `GlobalToHUD` calls `Pane::GlobalToScreen` (hud.cpp 1181), which runs the view-projection matrix (Pane.cpp 815) and accepts a point when homog x and y are in [-1, 1] and homog.z is at most the far limit (816-818). The homog.z >= 0 test is commented out (818). Screen x = W x 0.5 x (1 + x), screen y = H x 0.5 x (1 - y) (794-795). In cockpit view (VC), the front test is ldir.z > 0 (1173), and the scale is HUDofs.z / ldir.z (1175), inside the HUD rectangle.
- Marker draw (`GlobalDrawMarker`, 1205-1222): style bit 1 is a box, bit 2 an ellipse, bit 4 a cross, all with half-size `Markersize`.
- Orbit HUD (`HUD_Orbit::Display`, 1323-1330): Vunit is the unit relative velocity. Order: prograde (style 6: ellipse plus cross) if on screen; else retrograde (style 4: cross) if on screen; else the off-screen chevron, labelled "PG". Those are three fallbacks.
- Docking HUD (`HUD_Docking::Display`, 1865-1903): (a) relative velocity: on screen gives ellipse plus cross (1870-1873); else the opposite gives a cross with label "-V[name]" (1874-1877); else the chevron (1878-1881). (b) Target: a box if on screen (1892-1893), else the chevron (1894-1897). (c) Labels: the name at y - Markersize - fH - 2 (1900), the distance at y + Markersize (1903).
- Off-screen chevron (`OffscreenDirMarker`, 1224-1246): d is the direction in the camera frame (or the focus vessel's frame in cockpit view). len = hypot(d.y, d.x). The arrow points sideways along (d.x, -d.y) with scale 0.6 x Markersize: tip 10 along the direction, two wings at 7 along the direction offset by the perpendicular of the same vector, notch 8.5 (label anchor). It is always drawn at the HUD centre, never at the rim, and d.z is never read.
- Tick: none. The HUD has no state; it is redrawn from the current frame's positions (the per-frame caller was not read).

## 2. Key functions

- `HUD::GlobalToHUD` (both overloads): `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/hud.cpp` 1167-1203. Cockpit branch with the front test, else the pane projection.
- `Pane::GlobalToScreen` and `Pane::GlobalToHomog`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Pane.cpp` 789-819. The projection and its box test.
- `HUD::GlobalDrawMarker`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/hud.cpp` 1205-1222. Style bits.
- `HUD::OffscreenDirMarker`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/hud.cpp` 1224-1246. The chevron.
- Marker chains: `HUD_Orbit::Display` 1325-1330 (prograde, retrograde, chevron); `HUD_Docking::Display` 1870-1903 (velocity and target).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Project to screen; visible if in front and inside the frame; else fallback | Windowed half-size max(20, H/25) (hud.cpp 197); cockpit half-size 6 + 10 x HRES05 / 128 (188). At a pane 812 px tall that is 32 px (arithmetic, not measured) |
| Fallback chain: primary, then the opposite, then an edge arrow | Opposite marker drawn as cross only (style 4, 1326) |
| Arrow shape from the direction, scaled by the marker size | Scale 0.6 (1234); tip 10, wings 7, notch 8.5 (1237-1243) |
| Labels above (name) and below (distance) the marker | Offsets Markersize + fH + 2 above, Markersize below (1900, 1903) |

## 4. TypeScript sketch

simplified: the sketch replaces the donor's projection matrix with a pinhole stand-in (`focal` is a placeholder, the donor's Pane::GlobalToHomog and HomogZlimit were not read); it takes camera-space directions as input; it drops the cockpit branch, the labels, the distance text, the "PG" label and the centre-parking rule; it keeps box, ellipse-plus-cross and cross as one marker kind each. Its fixes are: a zero-length sideways direction returns null (the donor divides by len with no guard, 1233-1236) and `behind` comes from the sign of d.z (the donor never reads z). It still places the chevron at the HUD centre, as the donor does; moving it to the screen rim is the planned adaptation, not in the sketch. Donor integer truncation of the arrow points is not reproduced (floats used).

```ts
// Licence: MIT (donor, Orbiter LICENSE and Pane.cpp header). Adapted shape, rewritten in TypeScript for Frankendom.
// Client-only HUD: positions come from the engine; the engine never reads these markers.

export interface Vec3 { x: number; y: number; z: number; } // camera space: +z is forward

export interface ScreenCfg {
  w: number;          // HUD width in px
  h: number;          // HUD height in px
  markerHalf: number; // marker half-size px (donor windowed value: max(20, H/25))
  focal: number;      // pinhole stand-in for the donor projection matrix (not read)
}

export interface Projected { x: number; y: number; front: boolean; inside: boolean; }

// Pinhole stand-in for Pane::GlobalToHomog. In front and inside the HUD rectangle means on screen.
export function project(d: Vec3, cfg: ScreenCfg): Projected {
  const cx = cfg.w / 2;
  const cy = cfg.h / 2;
  if (d.z <= 0) return { x: cx, y: cy, front: false, inside: false };
  const x = cx + (cfg.focal * d.x) / d.z;
  const y = cy - (cfg.focal * d.y) / d.z;
  const inside = x >= 0 && x <= cfg.w && y >= 0 && y <= cfg.h;
  return { x, y, front: true, inside };
}

export type Chevron = { pts: [number, number][]; behind: boolean };

// Off-screen arrow drawn at the HUD centre, pointing sideways toward the direction (donor OffscreenDirMarker shape).
// fix: a zero-length sideways direction returns null (the donor divides by len with no guard).
// fix: behind is set from the sign of d.z (the donor never reads z).
export function chevron(d: Vec3, cfg: ScreenCfg): Chevron | null {
  const len = Math.hypot(d.x, d.y);
  if (len < 1e-9) return null;
  const s = cfg.markerHalf * 0.6;
  const dx = (d.x / len) * s;
  const dy = (d.y / len) * s;
  const cx = cfg.w / 2;
  const cy = cfg.h / 2;
  const pts: [number, number][] = [
    [cx + 10 * dx, cy - 10 * dy],           // tip
    [cx + 7 * dx - dy, cy - (7 * dy + dx)], // wing
    [cx + 7 * dx + dy, cy - (7 * dy - dx)], // wing
    [cx + 8.5 * dx, cy - 8.5 * dy],         // notch (label anchor)
  ];
  return { pts, behind: d.z < 0 };
}

export type Marker =
  | { kind: 'ellipse+cross'; x: number; y: number }
  | { kind: 'cross'; x: number; y: number }
  | { kind: 'box'; x: number; y: number }
  | { kind: 'chevron'; pts: [number, number][]; behind: boolean }
  | { kind: 'none' };

// Velocity-style chain (donor HUD_Orbit prograde and docking relative velocity):
// primary on screen, else its opposite on screen (cross only), else the chevron.
export function velocityChain(v: Vec3, cfg: ScreenCfg): Marker {
  const p = project(v, cfg);
  if (p.inside) return { kind: 'ellipse+cross', x: p.x, y: p.y };
  const n = project({ x: -v.x, y: -v.y, z: -v.z }, cfg);
  if (n.inside) return { kind: 'cross', x: n.x, y: n.y };
  const c = chevron(v, cfg);
  return c ? { kind: 'chevron', pts: c.pts, behind: c.behind } : { kind: 'none' };
}

// Target chain (donor HUD_Docking target): box when on screen, else chevron.
export function targetChain(t: Vec3, cfg: ScreenCfg): Marker {
  const p = project(t, cfg);
  if (p.inside) return { kind: 'box', x: p.x, y: p.y };
  const c = chevron(t, cfg);
  return c ? { kind: 'chevron', pts: c.pts, behind: c.behind } : { kind: 'none' };
}
```

## 5. Lands in

- TARGET `src/fight/target-markers.ts` (new, client-only HUD module: projects engine positions to screen, one marker per attacker). Parity-checklist row 14 (HUD). The engine supplies positions only.
- Reuse tag: adapt (MIT: code may be adapted; the sketch is a rewrite with two defects fixed and one planned change)
- Brief rule served: addendum rule 2 (judge the idea, not the genre); ruling that HUD is client-only; MAX_ATTACKERS = 3 (the marker chain is for up to three attackers)

## 6. Gaps and risks

- Defect 1 (divide by zero): `OffscreenDirMarker` divides by `len` (1233-1236) with no guard. A direction on the camera's z axis gives len 0 and NaN points. Fix: return nothing when len is about 0 (the sketch returns null).
- Defect 2 (behind not shown): the chevron never reads d.z (1231-1236), so a target behind the camera gets the same arrow as one at the same sideways angle in front. Fix: add a behind tag or flip the arrow when d.z < 0 (the sketch returns behind).
- Defect 3 (behind-camera projection, not confirmed): the z >= 0 test is commented out (Pane.cpp 818). Whether a point behind the camera can pass the remaining box test depends on D3DMath and HomogZlimit, which were not read. Frankendom fix: test camera-space z before any projection (the sketch does).
- Design issue (not a bug): the chevron sits at the HUD centre, over the crosshair and the hero's head area in a third-person view. The adaptation moves it to the screen rim, in the direction of the target, with the name and distance next to it. The donor does not do this.
- Size at 375 wide: the windowed half-size follows the height (H/25, with a minimum of 20 px), not the width. Half-size 32 px is a 65 px box, which is large for three attackers at once on a phone. Frankendom should set it as a client constant and test it at 375 wide.
- Target selection in the donor is by nav radio sender (1837-1844), not a lock-on cursor, and there is no lock-on forgiveness or input buffer in this code. Not a substitute for a lock-on.
- No string table. The only locale call in the source is `setlocale (LC_CTYPE, "")` (Src/Orbiter/Orbiter.cpp 217); grep for locale and localisation in Src found nothing else. Entry count: 0. Localdoc holds textures only; Extern holds third-party docs.
- Not read: DlgMap.cpp (the world-map dialog, part of the topic); not read in this pass.
- Frankendom gap: the donor's HUD is a window of world directions with no state, so it does not need a timer. Frankendom's markers must read the engine's per-tick positions and must not change the fight.

Reuse tag: adapt (MIT)
Brief rule served: addendum rule 2; HUD and camera are client-only; MAX_ATTACKERS = 3
