# orbitersim-orbiter (rendering-performance, cell 17)

Donor: /mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Scene.cpp | Licence: Scene.cpp header says dual GPL v3 / LGPL v3 (repo LICENSE is MIT), so treat as clean-room | C++ | symbol Scene::CheckVisual / GetObjectAppRad

## 1. Mechanism

- Decides which distant objects get a full visual (a live vessel or planet model) and which stay as a point. It runs once per frame on one object (round robin), as described below.
- Input: the object's handle; `CheckVisual` fetches its size (`oapiGetSize`), its global position and the camera's global position (`oapiCameraGlobalPos`) inside `GetObjectAppRad`, plus the scene's view height `viewH` (pixels) and `oapiCameraAperture()`.
- Apparent radius in pixels = radius times viewH, divided by (distance times tan(oapiCameraAperture())). The code applies `tan` directly to the aperture value with no halving (whether the engine's aperture is already a half-angle is outside this file, not read). It is the on-screen size of the object's disc.
- `CheckVisual` returns early on a NULL handle; if the object has no visual record it creates one with `AddVisualRec` (not read) before measuring, and stores the result in the record's `apprad` (as a float).
- Round robin: on the first update every object is checked once. After that, `Scene::Update` checks one object per frame, advancing a cursor (`iVCheck`) and wrapping (`iVCheck >= nobj` resets to 0) at the object count. The first-update flag is a function-local `static bool`. The update also steps or deletes particle streams first (skipped while paused), which is not part of the visibility check. So each visual is re-checked every N frames, where N is the object count.
- Hysteresis: a visual that is active is switched off only when its apparent radius drops below 1.0 pixel. An inactive visual is switched on only when it exceeds 2.0 pixels. Between the two, it keeps its state, so an object at the edge does not flicker.
- Stars (record type `OBJTP_STAR`) are always active: `Activate(true)` and return, no size test.
- Output: the visual's active flag (via `vobj->Activate`, body not read) and its stored apparent radius. The function itself touches no simulation state; what `Activate` does inside the visual is not read.

## 2. Key functions

- `Scene::CheckVisual`, `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Scene.cpp`, lines 557-580. Apparent radius, star rule, activate and deactivate with hysteresis (the hysteresis comment is at 578-579).
- `Scene::GetObjectAppRad`, same file, lines 533-541. Apparent radius in pixels from `oapiCameraGlobalPos` (comment at 537: called before camera setup).
- `Scene::GetObjectAppRad2`, same file, lines 545-553. Same formula, with the camera position from `GetCameraGPos()` (body not read) instead.
- `Scene::FindVisual`, same file, lines 592-598. Lookup of the visual record by handle.
- Caller: `Scene::Update`, same file, starts at line 749; the visibility part is lines 761-782 (first update checks all objects, lines 767-773; later frames check one object each, lines 774-782). Lines 785 onward (camera-target and mesh-debugger setup) are unrelated and not read past 795.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Apparent size on screen = radius times view height over distance times tangent of aperture | None; formula only |
| Hysteresis: switch off below a low threshold, switch on above a high one | Thresholds 1.0 px off and 2.0 px on (theirs, Scene.cpp lines 574 and 576) |
| Always-on rule for point-like bodies | Star type rule (theirs, line 568) |

## 4. TypeScript sketch

simplified: omits the NULL-handle return, visual-record lookup and creation, the pooled `apprad` store, and the per-frame round-robin (the caller `Scene::Update` drives that); the donor reads radius, positions and aperture from engine calls, the sketch takes them as parameters; the donor's star test is on the record type, the sketch uses an `alwaysOn` flag.

```ts
// Clean-room (file header is dual GPL v3 / LGPL v3, repo LICENSE is MIT): formula and two-threshold idea only, nothing copied from Scene.cpp lines 533-580
// Adapted: apparent radius in pixels, with two thresholds so an object at the edge does not flicker.
type Vis = { active: boolean; alwaysOn: boolean; radius: number; pos: { x: number; y: number; z: number } };

// Apparent radius in pixels: object size times view height, over distance times tangent of aperture.
function appRad(radius: number, distance: number, viewHeight: number, aperture: number): number {
  return (radius * viewHeight) / (distance * Math.tan(aperture));
}

// Switch the visual on or off with hysteresis; always-on visuals skip the test.
function checkVisual(v: Vis, cam: { x: number; y: number; z: number }, viewHeight: number, aperture: number): number {
  const d = Math.hypot(v.pos.x - cam.x, v.pos.y - cam.y, v.pos.z - cam.z);
  const px = appRad(v.radius, d, viewHeight, aperture);
  if (v.alwaysOn) { v.active = true; return px; }
  if (v.active) {
    if (px < 1.0) v.active = false;
  } else if (px > 2.0) {
    v.active = true;
  }
  return px;
}
```

## 5. Lands in

- Frankendom target: TARGET src/fight/zone-lod.ts (new module; zone objects are data, so the thresholds live in the zone catalogue). Today: no Frankendom module covers this.
- Parity-checklist row: 16 (colour grade / quality, K4) is the nearest row; with row 20 (catalogue as runtime source) for the thresholds as zone data.
- Reuse tag: rewrite-from-idea (the file header is GPL/LGPL, so clean-room only; the formula and the two-threshold idea are generic, the thresholds are Orbiter's and must be tuned for Frankendom).
- Brief rule served: (category default, not per-cell) 3 (warm up at zone entry); rules 7-9 n/a

## 6. Gaps and risks

- The donor divides by distance with no guard (lines 540 and 552): a zero distance gives infinity. Frankendom needs a minimum distance.
- The thresholds (1.0 and 2.0 pixels) are Orbiter's. Do not take them as Frankendom's; they must be data.
- The donor controls only activation, not level of detail. A Frankendom zone with many objects needs a budget, which the donor does not handle.
- The camera position source differs between the two functions. Frankendom must pick one camera source.
- Nothing here touches fight state or kill authority. Frankendom rulings: one engine, zones as data (thresholds and the per-frame check rate are zone data), server-verified kills and one ledger are unaffected because visuals are client-only. Round-robin re-check means a visual can lag by up to object-count frames; with MAX_ATTACKERS = 3 the fight-camera targets must be exempt (always checked), which the donor does not do.
