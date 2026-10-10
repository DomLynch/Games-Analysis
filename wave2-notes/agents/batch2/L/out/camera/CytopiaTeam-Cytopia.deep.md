# CytopiaTeam-Cytopia (camera, cell 14)

Donor: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/basics/Camera.cxx` | Licence: GPL-3.0 (license.txt is the GNU GPL Version 3, 29 June 2007 text; no per-file header or README statement checked, so "GPL v3" rests on that file alone) | C++ (SDL2) | symbol `Camera` (`centerScreenOnPoint`, `increaseZoomLevel`, `setPinchDistance`, `moveCamera`)

Checked: Read `Camera.hxx` (1-70) and `Camera.cxx` (1-99) in full; the input side in `EventManager.cxx` (checkEvents 87-110, keyboard pan 173-205, touch 232-256, mouse drag 267-275, wheel 546-548); the lock side in `UIManager.cxx` (openMenu/closeMenu, 150-175); `isoMath.cxx` 1-47; `Map::refresh`/`calculateVisibleMap` heads (Map.cxx 114-136); `Sprite::refresh` head (75-90); and the game loop `Game.cxx` 150-190. The hint file (data/resources/data/AudioConfig.json) is unrelated. Not read: the rest of `calculateVisibleMap` and `Sprite::refresh` bodies, the isometric tile-picking in `MapFunctions::findNodeInMap`. Callers checked by grep: `moveCamera` is called only from EventManager.cxx (key, touch, mouse drag); `changeZoomLevel` only from the wheel handler (547); `setPinchDistance` only from the multigesture handler (245). Confidence: high; this is a small camera and I read all of it.

## 1. Mechanism

- It is a 2D isometric city-builder camera, not a 3D chase camera. State: a pixel `offset` (world to screen shift), a `zoom` in steps, two lock flags (`canMove`, `canScale`), a pinch accumulator, and the logical "centre" point (Camera.hxx 61-67). Tile size is 32 x 16 at zoom 1 (Camera.hxx 62); zoom starts at 1.0 (64).
- Driving loop: a variable-rate `while (!m_shutDown)` frame loop (Game.cxx 152). Each frame: poll ALL pending SDL events (EventManager.cxx 97), tick the game clock, render. There is no fixed step, no accumulator and no smoothing: the camera offset changes instantly inside the event handler, once per input event, and the next render just uses the new offset. A held key moves it only as fast as the OS repeats KEYDOWN events.
- Zoom: 0.5 steps between 0.5 and 4.0 (Camera.cxx 11-13 and 24-26). It does nothing if scaling is locked (8, 21). After a step, the camera re-centres on the stored centre point (14, 27), so zoom is always about the screen middle, and the visible map is refreshed. Mouse wheel calls `changeZoomLevel(wheel.y > 0)` (EventManager.cxx 547).
- Pinch zoom (touch): the gesture distance is scaled by 15 (EventManager.cxx 245) and ADDED into an accumulator (Camera.cxx 34); only when it passes +-0.25 does it reset to 0 and take one zoom step (36-53). Before the step, if the zoom can still change, the camera first centres on the pinch point (41, 50), whose iso coordinates were stored at gesture start so they stay fixed across zoom levels.
- Centre on a point (`centerScreenOnPoint`, 56-73): ignored if the point is outside the map (58). Otherwise convert iso coordinates to screen pixels without offset, then `offset.x = screen.x + tile.x*zoom*0.5 - screenW*0.5`, `offset.y = screen.y + tile.y*zoom*0.25 - screenH*0.5`, then subtract another `tile.x*zoom*0.75` from x and `tile.y*zoom` from y (63-68), each truncated to int. Then refresh the visible map.
- Pan (`moveCamera`, 82-93): ignored if movement is locked (84); `offset -= (dx, dy)` (87-88); refresh the visible map; then re-derive the stored centre from the screen middle via a screen-to-iso conversion (91-92). Pan sources: right mouse drag (button down sets panning, EventManager.cxx 420; motion calls moveCamera with the raw mouse delta, 274, NO clamp), two-finger drag (251, no clamp), and WASD/arrows. Key pan moves one sixteenth of the screen size per key event, and tests a clamp BEFORE moving (up: offset.y > -2 x screenH x zoom, 175; right: offset.x < 5 x screenW x zoom, 199), so a step can overshoot the limit by up to one step.
- Modal lock: opening a menu sets both `canScale(false)` and `canMove(false)` (UIManager.cxx 158-159); closing the last menu restores both to "stack is empty" (170-171).
- Culling tie-in: the visible tile range is computed from the iso coordinates of the screen corners (Map.cxx 130-131), and a sprite re-clips its texture only when the zoom changed (Sprite.cxx 75).

## 2. Key functions

- `Camera::centerScreenOnPoint`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/basics/Camera.cxx` 56-73. Bounds check, offset formula, refresh.
- `Camera::increaseZoomLevel` / `decreaseZoomLevel`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/basics/Camera.cxx` 6-30. Stepped zoom with limits and lock, re-centre.
- `Camera::setPinchDistance`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/basics/Camera.cxx` 32-54. Accumulator with threshold; zoom about the pinch point.
- `Camera::moveCamera`: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/basics/Camera.cxx` 82-93. Pan by delta, then recompute centre.
- Key pan with clamp: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/EventManager.cxx` 173-205 (inside `EventManager::checkEvents`).
- Menu lock: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/engine/UIManager.cxx` 150-175 (`openMenu` / `closeMenu`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Discrete zoom steps with min/max; zoom always re-centres on a stored logical centre | Step 0.5, min 0.5, max 4.0 (theirs, Camera.cxx 11-13, 24) |
| Pinch accumulator: sum deltas, one zoom step per threshold crossing, then reset | Threshold 0.25; input scale x15 (theirs, Camera.cxx 36; EventManager.cxx 245) |
| Centre-on-point: world to screen, then subtract half the screen so the point lands mid-screen | Offsets tile.x*zoom*0.5/0.75 and tile.y*zoom*0.25/1 are isometric-tile specific; tile 32 x 16 (theirs, Camera.hxx 62) |
| Pan = subtract the input delta from the offset; recompute the logical centre from the screen middle | None |
| Clamp tested before the move, scaled by zoom | Bounds -2 x screenH, 5 x screenW etc. (theirs, EventManager.cxx 175, 199); pan step screen/16 (177) |
| Modal state locks pan and zoom together | None |
| Re-cull only when the view changes (offset or zoom) | None |

## 4. TypeScript sketch

simplified: keeps the stepped zoom, pinch accumulator, centre-on-point, pan with recomputed centre, key clamp-before-move and the modal lock. It merges the donor's two truncations in the centre formula into one expression, takes the world/screen conversions and the bounds test as injected functions (the donor uses its isometric math and map size), and shows only the "up" key pan. It omits touch gesture state, the visible-tile refresh body, sprite re-clipping, and the iso height offset.

```ts
// Licence: GPL-3.0 (donor, license.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Pt { x: number; y: number }

class StepCamera {
  offset: Pt = { x: 0, y: 0 };  // world->screen shift, in screen pixels at the current zoom
  zoom = 1;
  canMove = true;
  canScale = true;
  private pinchAcc = 0;
  private centre: Pt = { x: 0, y: 0 }; // logical point kept in the middle of the screen

  constructor(
    private screen: Pt,
    private tile: Pt,                       // world unit size at zoom 1
    private toScreen: (p: Pt, zoom: number) => Pt, // world -> screen pixels, no offset
    private fromScreen: (p: Pt, offset: Pt, zoom: number) => Pt,
    private inBounds: (p: Pt) => boolean,
    private onViewChanged: () => void,      // e.g. recompute the visible set
    private minZoom = 0.5, private maxZoom = 4, private zoomStep = 0.5,
    private pinchThreshold = 0.25,
  ) {}

  centreOn(p: Pt): void {
    if (!this.inBounds(p)) return;         // out-of-bounds targets are ignored, camera stays
    this.centre = p;
    const s = this.toScreen(p, this.zoom);
    this.offset = {
      x: Math.trunc(s.x + this.tile.x * this.zoom * 0.5 - this.screen.x * 0.5 - this.tile.x * this.zoom * 0.75),
      y: Math.trunc(s.y + this.tile.y * this.zoom * 0.25 - this.screen.y * 0.5 - this.tile.y * this.zoom),
    };
    this.onViewChanged();
  }

  zoomIn(): void { this.stepZoom(+this.zoomStep, this.zoom < this.maxZoom); }
  zoomOut(): void { this.stepZoom(-this.zoomStep, this.zoom > this.minZoom); }

  private stepZoom(delta: number, allowed: boolean): void {
    if (!this.canScale || !allowed) return;
    this.zoom += delta;
    this.centreOn(this.centre);            // zoom is always about the stored centre
  }

  // Pinch deltas accumulate; only a full threshold crossing moves one discrete zoom step.
  pinch(delta: number, at: Pt): void {
    this.pinchAcc += delta;
    if (this.pinchAcc > this.pinchThreshold) {
      this.pinchAcc = 0;
      if (this.zoom < this.maxZoom) this.centreOn(at);
      this.zoomIn();
    } else if (this.pinchAcc < -this.pinchThreshold) {
      this.pinchAcc = 0;
      if (this.zoom > this.minZoom) this.centreOn(at);
      this.zoomOut();
    }
  }

  pan(dx: number, dy: number): void {
    if (!this.canMove) return;
    this.offset = { x: this.offset.x - dx, y: this.offset.y - dy };
    this.onViewChanged();
    this.centre = this.fromScreen({ x: this.screen.x / 2, y: this.screen.y / 2 }, this.offset, this.zoom);
  }

  // Key pan: clamp is tested BEFORE the move, so one step can overshoot; drag pan() has no clamp.
  keyPanUp(): void {
    if (this.offset.y > -2 * this.screen.y * this.zoom) this.pan(0, this.screen.y / 16);
  }

  // A modal menu locks both pan and zoom; closing the last one unlocks.
  setModalOpen(open: boolean): void { this.canMove = !open; this.canScale = !open; }
}
```

## 5. Lands in

- TARGET `src/fight/camera-steps.ts` (client-only module; camera, HUD and sound are not simulation state). Parity-checklist row 11 (fight camera).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (client-only camera on top of one engine; the engine never reads it); rules 7-9 n/a
- Best transferable idea: keep the camera as a tiny state machine (offset, stepped zoom, lock flags) where zoom always re-centres on a stored logical centre and pinch input is an accumulator that fires one discrete step per threshold, so touch zoom never jitters.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism.
- Genre mismatch: this is a static isometric map camera. Frankendom's fight camera must follow two moving duellists, frame many-on-one fights (up to 3 attackers) and shake on hits; the donor has no follow target, no smoothing and no shake. Only the zoom-step, pinch and lock shapes carry over.
- No time step: the donor moves the camera per input event, in a variable-rate frame loop. Frankendom's camera should be driven off render frames or the fixed sim tick explicitly; do not copy the event-driven jumps for follow motion.
- Clamp inconsistency in the donor (key pan clamped before the move and can overshoot; drag and touch pan not clamped). Frankendom must clamp after every source.
- The camera must stay out of the engine: nothing here may feed back into sim state (one engine, server-verified kills). Zone framing limits should be zone data, not constants (zones as data).
- The visible-set refresh tied to every pan/zoom is a map-rendering concern; a fight arena probably has a fixed visible set, so that part likely does not apply.
- The tile-specific offsets (0.5, 0.25, 0.75 of a 32 x 16 tile) are isometric and meaningless for a side-on or 3D arena.
