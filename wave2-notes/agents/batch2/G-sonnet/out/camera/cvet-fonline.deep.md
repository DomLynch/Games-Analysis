# cvet-fonline (camera, cell 14)

Donor: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` | Licence: MIT (LICENSE line 1 "MIT License", Copyright 2006-2026 Anton Tsvetinskiy) | C++ | symbol `MapView::ProcessScroll`

Checked: Read in full `MapView.cpp` 2979-3260 (`ProcessScroll`, `ProcessZoom`, `InstantZoom`, `InstantScroll`, `ScrollToHex`, `ApplyScrollOffset`, `SetExtraScrollOffset`, `RefreshMinZoom`), the fixed-step caller at 538-549, the settings (Settings.inc 344-346), zoom limits (Common.h 402-403) and the two call sites in Client.cpp (1441-1479 teleport, 1802-1806 map load). Not read: `GetScrollAxialArea`, `RebuildMapOffset`, hex-line show/hide, how the camera tracks a walking hero (no per-frame follow of the chosen critter was found by grep; only the teleport glide and the map-load snap, plus script entry points). This is an isometric 2D hex map camera, so the pixel numbers are for that, but the update shape is engine-independent.

## 1. Mechanism

- Fixed-step camera clock (538-549): each frame the real frame delta is added to `_scrollDtAccum`; when it reaches `Hex.ScrollFixedDt` (10 ms, Settings.inc 344) the accumulator is capped at 10 steps' worth, one step is subtracted, and `ProcessZoom` then `ProcessScroll` run with dt = 10 ms. Only ONE step runs per frame (an `if`, not a loop), so a slow frame drains the cap down over following frames. Camera speed is therefore independent of render rate within the cap.
- Pan sources (2979-3029): (a) a glide to a target (`_autoScrollActive`), or (b) manual keys. If a manual key is down and the glide was marked cancellable (`can_stop`), the glide is cancelled first (2983-2985).
- Glide: per step, move a fraction of the REMAINING offset: `step = speed/10000*dt`, `scroll = remaining*step`, `remaining -= scroll` (2990-2994). That is exponential ease-out: fast at first, slowing as it nears. With speed 100 and dt 10 ms the fraction is 0.1 per step (arithmetic from the code, not a stated constant). Ends when the remaining distance is under 0.001 px (2996). Starting a new glide while one runs ADDS to the remaining offset (3207-3217), so a retarget never loses distance.
- Manual pan: direction vector of -1/0/1 per axis, speed `Hex.ScrollSpeed` (1200 "pixels per second", Settings.inc 345) divided by 1000, divided by zoom, times dt (3022-3025). Dividing by zoom keeps the on-screen speed constant when zoomed.
- Zoom (3041-3081): the target zoom is clamped to [min, max] (engine range 0.05 to 20, Common.h 402-403; min is raised to a map-fitting value when scroll bounds are on). Each step zoom eases toward the target by fraction `dt*ZoomSpeed/10000` (ZoomSpeed 100, so 0.1 per 10 ms step), and snaps when within 0.001.
- Zoom around an anchor (3129-3134): after changing zoom, the view size change `screen/new - screen/old` is multiplied by the anchor (a 0..1 screen fraction) and the camera is scrolled by the negative of that, so the point under the anchor stays fixed.
- Bounds (3137-3168): after every scroll, if bounds are on, the view rectangle is pushed back inside the allowed area on each side. Minimum zoom is set so the whole view cannot exceed the area: `screen / area * 1.1` (3229-3233).
- Triggers: on a teleport of the player's own critter the client glides to the new hex at speed 100, non-cancellable (Client.cpp 1476-1477); on map load it snaps (1806).
- Tick: render-frame driven, fixed 10 ms internal step.

## 2. Key functions

- `MapView::ProcessScroll`: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` 2979-3029. Glide or manual pan.
- `MapView::ProcessZoom`: same file 3041-3081. Eased, clamped zoom target.
- `MapView::InstantZoom` (anchor math): same file 3083-3135, anchor step 3129-3134.
- `MapView::InstantScroll`: same file 3137-3198. Applies a scroll and clamps to bounds (wrap part for hex map rebuild not relevant).
- `MapView::ScrollToHex` / `ApplyScrollOffset`: same file 3200-3217. Starts or extends a glide.
- Fixed-step block: same file 538-549.
- Teleport call site: `/mnt/frankendom-donors/cvet-fonline/Source/Client/Client.cpp` 1441-1479.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-step accumulator with a cap so camera feel does not depend on frame rate | 10 ms step, cap 10 steps (theirs, Settings.inc 344; MapView.cpp 544) |
| Ease-out glide: move a fraction of the remaining offset each step; extend on retarget | Fraction speed/10000*dt; speed 100 for teleport (theirs, Client.cpp 1477) |
| Manual pan speed divided by zoom | 1200 px/s (theirs, Settings.inc 345) |
| Zoom eases to a clamped target; anchor stays fixed | ZoomSpeed 100; zoom range 0.05 to 20 (theirs, Common.h 402-403); min-fit bias 1.1 (theirs, MapView.cpp 3229) |
| Push view rect back inside bounds | Hex-grid pixel geometry (theirs, not transferable) |

## 4. TypeScript sketch

simplified: 2D pixel space only (no hex coordinates, no map-offset rebuild or wrap), one step per frame like the donor, the glide target is given as a pixel delta, the min-zoom fit uses a plain bounds rect. No screen shake, no snap-on-load (that is `x = target`), no follow-the-hero logic (the donor has none that I read). Written from the described mechanism (MIT, so adaptation is allowed).

```ts
interface CamSettings {
  fixedDtMs: number;      // fixed step, donor default 10
  scrollSpeed: number;    // manual pan, px per second at zoom 1 (donor 1200)
  zoomSpeed: number;      // donor 100: fraction per step = dt * zoomSpeed / 10000
  minZoom: number;
  maxZoom: number;
}

interface Rect { l: number; t: number; r: number; b: number; }

class FollowCamera {
  x = 0; y = 0;             // top-left of the view in world px
  zoom = 1; targetZoom = 1;
  private zoomAnchor = { x: 0.5, y: 0.5 }; // fraction of the screen that stays put
  private autoActive = false;
  private autoCanStop = false;
  private autoSpeed = 0;
  private autoOx = 0; private autoOy = 0;   // remaining distance to travel
  private accumMs = 0;
  manualX = 0; manualY = 0;                  // -1, 0, 1 per axis from input
  bounds: Rect | null = null;

  constructor(private s: CamSettings, public screenW: number, public screenH: number) {}

  // Retarget: add the remaining offset so a new target during a glide is not lost.
  scrollTo(dx: number, dy: number, speed: number, canStop: boolean): void {
    if (!this.autoActive) { this.autoActive = true; this.autoOx = 0; this.autoOy = 0; }
    this.autoCanStop = canStop; this.autoSpeed = speed;
    this.autoOx += dx; this.autoOy += dy;
  }

  setZoomTarget(z: number, anchorX: number, anchorY: number): void {
    this.targetZoom = z; this.zoomAnchor = { x: anchorX, y: anchorY };
  }

  // Called once per render frame with real elapsed ms; runs 0..10 fixed steps.
  update(frameMs: number): void {
    this.accumMs += frameMs;
    const step = this.s.fixedDtMs;
    if (this.accumMs >= step) {
      this.accumMs = Math.min(this.accumMs, step * 10) - step; // donor: cap, then take one step
      this.processZoom(step);
      this.processScroll(step);
    }
  }

  private processScroll(dt: number): void {
    const manual = this.manualX !== 0 || this.manualY !== 0;
    if (manual && this.autoCanStop) this.autoActive = false;
    let sx = 0, sy = 0;
    if (this.autoActive) {
      const k = (this.autoSpeed / 10000) * dt;   // fraction of remaining distance per step
      sx = this.autoOx * k; sy = this.autoOy * k;
      this.autoOx -= sx; this.autoOy -= sy;
      if (Math.hypot(this.autoOx, this.autoOy) < 0.001) this.autoActive = false;
    } else {
      if (!manual) return;
      const px = (this.s.scrollSpeed / 1000 / this.zoom) * dt;
      sx = this.manualX * px; sy = this.manualY * px;
    }
    this.scrollBy(sx, sy);
  }

  private processZoom(dt: number): void {
    if (this.zoom === this.targetZoom) return;
    const target = Math.min(this.s.maxZoom, Math.max(this.minZoom(), this.targetZoom));
    this.targetZoom = target;
    let next = this.zoom + (target - this.zoom) * (dt * this.s.zoomSpeed / 10000);
    if (Math.abs(next - target) < 0.001) next = target;
    this.setZoom(next);
  }

  private setZoom(z: number): void {
    const oldW = this.screenW / this.zoom, oldH = this.screenH / this.zoom;
    this.zoom = z;
    const dw = this.screenW / z - oldW, dh = this.screenH / z - oldH;
    this.scrollBy(-dw * this.zoomAnchor.x, -dh * this.zoomAnchor.y);
  }

  private minZoom(): number {
    if (!this.bounds) return this.s.minZoom;
    const w = this.bounds.r - this.bounds.l, h = this.bounds.b - this.bounds.t;
    return Math.min(this.s.maxZoom, Math.max(this.s.minZoom, this.screenW / w * 1.1, this.screenH / h * 1.1));
  }

  private scrollBy(dx: number, dy: number): void {
    this.x += dx; this.y += dy;
    const b = this.bounds;
    if (!b) return;
    const vw = this.screenW / this.zoom, vh = this.screenH / this.zoom;
    if (this.x < b.l) this.x = b.l;
    if (this.y < b.t) this.y = b.t;
    if (this.x + vw > b.r) this.x = b.r - vw;
    if (this.y + vh > b.b) this.y = b.b - vh;
  }
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` is NOT the right home: the camera is client-only (ruling). Put it in the client view layer (row 11 fight camera); the engine in `src/fight` exposes only hero and target positions. Parity-checklist row 11 (fight camera).
- Use: fight camera retarget on engage (glide to the duel midpoint, `canStop` false for the opening move), manual pan only for the Pit/zone map, zoom-to-fit the zone bounds at a duration set in zone data.
- Reuse tag: adapt-from-idea (MIT; code may be adapted)
- Brief rule served: camera/HUD/sound are client-only; zones as data (bounds, speed and zoom limits would be zone/camera data fields)

## 6. Gaps and risks

- It is a map-scroll camera, not a combat camera: no hit-shake, no lock-on framing, no two-target framing. The "frame both fighters" logic would be new work; only the glide, zoom-anchor and bounds clamp transfer.
- The glide is frame-rate stable only within the cap; a very long stall loses time (by design). Fine for a camera, but never use this clock for fight logic: the engine tick must stay separate and server-verified.
- Camera state must never feed back into the engine (client-only). Convert screen clicks to world positions in the client and send intent only.
- Glide speed units are opaque (speed/10000*dt, not a time constant). Frankendom should store a half-life in ms as data and derive the fraction.
- The follow-the-hero path and the hex area helper were not read; do not claim the donor smooth-follows a walking hero.
