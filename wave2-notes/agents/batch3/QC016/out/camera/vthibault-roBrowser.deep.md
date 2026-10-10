# vthibault-roBrowser (camera, cell 14)

Donor: `/mnt/frankendom-donors/vthibault-roBrowser/src/Renderer/Camera.js` | Licence: GPL-3.0 (donor LICENSE file, "GNU GENERAL PUBLIC LICENSE Version 3"; Camera.js has no licence header of its own) | JavaScript (AMD modules) | symbol `Camera.update`

Checked: camera_scope = world camera (open-zone orbit around the player). Read `Renderer/Camera.js` in full (347 lines), `Preferences/Camera.js` in full (21 lines), and the drivers and inputs: `Renderer/Renderer.js` 191 and 219-234, `Renderer/MapRenderer.js` 160, 337 and 365, `Controls/MapControl.js` 130-214, `Core/Mobile.js` 215-270. Callers checked with grep: `Camera.update` has one caller (`MapRenderer.js:365`); `Camera.rotate` has callers at `MapControl.js` 135 and 180 and `Mobile.js` 220 and 262; `Camera.setZoom` has one caller (`MapControl.js:214`); `angleFinal` is written only inside `Camera.js`. Candidates opened: 6 (Camera.js, Preferences/Camera.js, Renderer.js, MapRenderer.js, MapControl.js, Mobile.js). Confidence high on the mechanism and numbers. Not read: the gl-matrix `translateZ` sign convention (so the exact eye distance is not computed), `SpriteRenderer.js` 398 (the latitude uniform), and any collision or terrain query (none exists in Camera.js; checked by reading the whole file).

## 1. Mechanism

- A third-person orbit camera. It sits at a distance behind a focus point (the player), set by a pitch angle (`angle[0]`), a yaw angle (`angle[1]`) and a zoom value. Nothing else is in the camera state. Source: `Camera.js` 56-122.
- Input sets goals; each frame eases the drawn values toward the goals. Right-button drag writes goals in `processMouseAction` (`Camera.js` 230-269). On touch, a two-finger gesture does the same job: a same-direction translation calls `rotate(true)`, with vertical movement selecting pitch, and a pinch changes the zoom goal (`Mobile.js` 193-197 and 255-271). Mouse wheel writes the zoom goal in `setZoom` (277-284). Nothing writes the drawn values directly.
- Modifier keys choose what a drag changes: no modifier = yaw; Shift = pitch; Ctrl = zoom (`Camera.js` 233-262).
- Per-frame order (`Camera.update`, 292-341). Driven by the render loop: `Renderer._render` runs on `requestAnimationFrame`, sets `this.tick = Date.now()` (219-226), and calls each render callback; `MapRenderer.onRender` is registered with `Renderer.render` (`MapRenderer.js` 160 and 337) and calls `Camera.update(tick)` at 365.
  1. `lerp = min((tick - lastTick) * 0.006, 1.0)`; `lastTick = tick` (294-295). This is the only time step: a linear factor on elapsed milliseconds, capped at 1. It is not an exponential decay.
  2. If the drag is active, `processMouseAction()` runs first (298-300), so it writes goals before the eases read them.
  3. Focus: if `Preferences.smooth` (default true), the focus point moves toward the target by `lerp` per axis (303-307); otherwise it snaps (308-312).
  4. Zoom, pitch and yaw each move toward their goal by `(goal - value) * lerp * 2.0` (315, 318-319). Then `angle[0]` and `angle[1]` are taken modulo 360 (320-321).
  5. Sprite facing: `direction = floor((yaw + 22.5) / 45) % 8` (324): eight 45-degree sectors from the yaw.
  6. View matrix: `translateZ((altitudeFrom - zoom) / 2)`, then `rotateX(pitch)`, `rotateY(yaw)`, then a translate to the focus point (329-337). Zoom therefore changes the offset along the view axis; pitch and yaw set the angle.
- Clamps applied when goals are written: pitch goal to 190..270 (235-236, Shift-drag only); zoom goal to 2.0..150 (242-243 and 280-281); yaw goal to -360..360 (260-261). The yaw has a wrap (250-258) that moves the value and the goal together by 360: when both are above 180, or when the value is below -180 and the goal is non-zero.
- Persistence: zoom is saved to preferences 3000 ms after the last change (168-185, called from 268 and 283). Not gameplay-relevant.
- Double-click reset (`rotate`, 193-224). Two right-button presses within 500 ms (204) and within 10 px of each other (205-206). Shift sets the pitch goal to the default (209). Without Ctrl the yaw goal goes to 0 (214-216). Ctrl sets the zoom goal to 0 (211-212). Shift and a plain double-click both also run the yaw reset, because the `else` belongs to the Ctrl check only.
- Nothing in this file rotates the yaw to follow the player's movement. The yaw changes only by drag, double-click, and the wrap. So the camera does not recentre behind the character on its own.

## 2. Key functions

- `Camera.update`: `/mnt/frankendom-donors/vthibault-roBrowser/src/Renderer/Camera.js` 292-341. Frame step: time-based lerp, focus ease, zoom/pitch/yaw ease, sprite direction, view matrix.
- `Camera.processMouseAction`: `/mnt/frankendom-donors/vthibault-roBrowser/src/Renderer/Camera.js` 230-269. Drag to goals with three modifier modes and clamps.
- `Camera.setZoom`: `/mnt/frankendom-donors/vthibault-roBrowser/src/Renderer/Camera.js` 277-284. Wheel notch: goal += 15 x notch, clamped to 2.0..150.
- `Camera.rotate`: `/mnt/frankendom-donors/vthibault-roBrowser/src/Renderer/Camera.js` 193-224. Starts and ends a drag; double-click reset.
- Driver: `/mnt/frankendom-donors/vthibault-roBrowser/src/Renderer/MapRenderer.js` 349-365 (`MapRenderer.onRender`, which calls `Camera.update(tick)`), and `/mnt/frankendom-donors/vthibault-roBrowser/src/Renderer/Renderer.js` 219-234 (`_render`, the rAF loop that sets `tick`).
- Inputs: `/mnt/frankendom-donors/vthibault-roBrowser/src/Controls/MapControl.js` 130-136 and 178-191 (right button down and up), 199-215 (wheel); `/mnt/frankendom-donors/vthibault-roBrowser/src/Core/Mobile.js` 215-270 (touch: rotate, pinch zoom).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Input writes a goal; each frame eases the value toward it with a factor from elapsed time | Time factor 0.006 per ms, capped at 1 (theirs, 294); ease gain 2.0 (theirs, 315, 318, 319) |
| Drag speed scaled by screen size (a full width or height = a fixed angle or distance) | Yaw 720 per full screen width (theirs, 248); pitch 300 per full height (theirs, 234); zoom 150 per full height (theirs, 241) |
| Clamp goals at the write, not at the ease | Pitch 190..270 (theirs, 235-236); zoom 2.0..150 (theirs, 242-243, 280-281; 150 = 15 altitude span x MAX_ZOOM 10, theirs 100, 107-108); yaw -360..360 (theirs, 109-110) |
| Wheel notch changes the zoom goal by a fixed step | 15 per notch (theirs, 279) |
| Double-click detection on a timer and a pixel radius | 500 ms (theirs, 204); 10 px (theirs, 205) |
| Recentre on double-click | Pitch goal 240 (theirs, 154 and 156; 209 uses `range`); yaw goal 0 (theirs, 215); zoom goal 0 (theirs, 212) |
| Persist the user's zoom after input stops | 3000 ms debounce (theirs, 181) |
| Default zoom 50 and smoothing on | Theirs, `Preferences/Camera.js` 19-20 (line only; the value lines are too short for a 15-character receipt) |
| Eight sprite facings from yaw | 8 sectors of 45 degrees, offset 22.5 (theirs, 324) |
| Projection: narrow field of view | 15 degrees vertical, near 1, far 1000 (theirs, `Renderer/Renderer.js` 191) |

## 4. TypeScript sketch

simplified: the sketch keeps the input-goal step, the clamps, the three drag modes as an argument, the wheel step, and the per-frame ease in the donor order (input first, then ease). It omits: the double-click reset (204-217), the yaw wrap at +/-180 (250-258), the modulo of the drawn angles (320-321), the matrix build and the translateZ/rotate order (329-337), the 3-second save (168-185), touch (Mobile.js), and the donor's negated focus coordinates (304-306, which are plain coordinates here). Modes are passed in rather than read from the keyboard.

```ts
// Licence: GPL-3.0 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface OrbitTuning {
  yawMin: number;      // degrees, lower yaw bound
  yawMax: number;      // degrees, upper yaw bound
  pitchMin: number;    // degrees, lower pitch bound
  pitchMax: number;    // degrees, upper pitch bound
  zoomMin: number;     // distance floor
  zoomMax: number;     // distance ceiling
  wheelStep: number;   // zoom change per wheel notch
  lerpPerMs: number;   // smoothing rate per millisecond
}

interface Orbit {
  yaw: number; pitch: number; zoom: number;             // values used to draw the view
  yawGoal: number; pitchGoal: number; zoomGoal: number; // values the input asks for
  focusX: number; focusY: number; focusZ: number;       // smoothed follow point
}

type DragMode = "yaw" | "pitch" | "zoom";

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Input step: dx and dy are pixel deltas since the last drag event.
function dragOrbit(o: Orbit, t: OrbitTuning, dx: number, dy: number, screenW: number, screenH: number, mode: DragMode): void {
  if (mode === "pitch") {
    o.pitchGoal = clamp(o.pitchGoal + (dy / screenH) * 300, t.pitchMin, t.pitchMax);
  } else if (mode === "zoom") {
    o.zoomGoal = clamp(o.zoomGoal - (dy / screenH) * 150, t.zoomMin, t.zoomMax);
  } else {
    o.yawGoal = clamp(o.yawGoal - (dx / screenW) * 720, t.yawMin, t.yawMax);
  }
}

// Wheel step: notches is signed (positive = zoom in).
function wheelZoom(o: Orbit, t: OrbitTuning, notches: number): void {
  o.zoomGoal = clamp(o.zoomGoal + notches * t.wheelStep, t.zoomMin, t.zoomMax);
}

// Per-frame step, run after the input step. The step is linear in dtMs and capped at 1.
function stepOrbit(o: Orbit, t: OrbitTuning, dtMs: number, smooth: boolean, targetX: number, targetY: number, targetZ: number): void {
  const lerp = Math.min(dtMs * t.lerpPerMs, 1.0);
  if (smooth) {
    o.focusX += (targetX - o.focusX) * lerp;
    o.focusY += (targetY - o.focusY) * lerp;
    o.focusZ += (targetZ - o.focusZ) * lerp;
  } else {
    o.focusX = targetX; o.focusY = targetY; o.focusZ = targetZ;
  }
  o.zoom  += (o.zoomGoal  - o.zoom)  * lerp * 2.0;
  o.yaw   += (o.yawGoal   - o.yaw)   * lerp * 2.0;
  o.pitch += (o.pitchGoal - o.pitch) * lerp * 2.0;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed new client module; the Frankendom repo layout was not read, so this path is a proposal). Client-only: the engine never reads it. The orbit state and goals are a view concern; the focus point comes from the engine's hero position.
- Parity-checklist row 11 (fight camera). Caveat: row 11 describes the Pit fight camera. The world camera has no row in the addendum (see section 6).
- Camera tunables that a designer would set are data: pitch and zoom limits (zone data, so an indoor zone can differ), the drag and wheel rates, the double-click window and the save delay (client constants).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: camera is client-only (rule for camera/HUD/sound); one engine, so the focus point is read from the engine and the camera never writes game state.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- This is an orbit camera around the player, not an over-the-shoulder follow. There is no shoulder offset (the focus point is the player's exact position, `Camera.js` 304-312), no look-at offset, no collision (none in the file), no auto-yaw follow, and no lock-on or multi-target framing. What transfers: the input-goal and ease split, the clamp-at-write rule, the drag-scaling by screen size, the double-click recentre, and the frame-time lerp. What does not transfer: the orbit centre and the placement of the eye, which Frankendom's over-the-shoulder view must add itself (shoulder offset, collision pull-in, and recentring behind the hero after the hero moves).
- The step is linear in elapsed time with a cap (294), not an exponential decay. At 16 ms frames the yaw moves about 19 percent of the remaining gap per frame (derived: 16 x 0.006 x 2.0). The gain is `lerp * 2.0`, so it passes 1.0 at a frame gap of about 83 ms and the drawn value overshoots the goal; at about 167 ms or more the gain is capped at 2.0 (lerp is capped at 1), which only flips the sign of the remaining gap each frame. This is derived from the arithmetic, not run. Frankendom should use an explicit `1 - exp(-k dt)` form if it needs one frame-rate-independent rate; this donor does not.
- The fixed field of view of 15 degrees (`Renderer.js` 191) is a telephoto look. A third-person camera at that field would show little of the scene around the hero. Frankendom must choose its own field of view; the donor offers no zoom-to-FOV change in combat.
- Frankendom rule (camera is client-only): nothing here writes game state. The camera writes its own state and, after a 3-second debounce, the zoom preference (`Renderer/Camera.js` 168-185). Frankendom should keep the same separation.
- The camera is tied to the donor's sprite-facing (8 sectors, 324). That facing is a sprite concern and does not transfer to a 3D model.
- Two numbers (default zoom 50 and smooth true, `Preferences/Camera.js` 19-20) are cited by line only: the value lines are shorter than the 15-character receipt minimum.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: camera is client-only (rule for camera/HUD/sound); one engine, so the focus point is read from the engine and the camera never writes game state.

Best transferable idea: Let input write a goal (pitch, yaw, zoom) with clamps applied at the write, and ease the drawn camera toward that goal each frame, so drags and wheel steps never jerk the view.
Decision (proposed): adapt - the goal-and-ease split and clamp-at-write are right for the world camera, but the orbit centre must become an over-the-shoulder offset with collision pull-in, which this donor does not have.
Acceptance: In a zone, a right-drag (or two-finger drag) turns the view, the pitch stays inside its band, the wheel changes distance in fixed steps, and a double-click recentres yaw behind the hero; a client unit test asserts that a 16 ms step moves the yaw about 19 percent of its gap to the goal and that no goal leaves its clamp.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** All numbers verified (lerp 0.006*ms cap 1, gain 2.0, pitch 190..270, zoom 2..150 = 15*10, yaw -360..360, 720/300/150 drag rates, 500 ms/10 px double click, 3000 ms save, wheel 15, direction floor((yaw+22.5)/45)%8, FOV 15 deg at Renderer.js 191, default zoom 50 smooth true, GPL-3.0). One false statement: 'Nothing writes the drawn values directly' - the yaw wrap in processMouseAction (Camera.js 250-258) and Camera.init (154-157) write angle[] directly, and Mobile.js 268-270 writes zoomFinal.

**Missed:** none significant; Camera.init sets initial pitch 240 / yaw 0 and target follow has no collision (note says so)
