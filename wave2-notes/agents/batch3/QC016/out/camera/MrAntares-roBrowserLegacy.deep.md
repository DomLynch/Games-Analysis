# MrAntares-roBrowserLegacy (camera, cell 14)

Donor: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Renderer/Camera.js` (with `Renderer/Map/OccluderFade.js` and `Renderer/Effects/Shaders/GLSL/OccluderFade.glsl`) | Licence: GPL-3.0 (donor LICENSE file, "GNU GENERAL PUBLIC LICENSE Version 3"; the camera files carry no licence header of their own) | JavaScript (ES modules) | symbols `Camera.updateState`, `Camera.update`, `OccluderFade.beginFrame`

Checked: camera_scope = world camera (third-person rig and wall fade for open zones; the isometric mode is the default). Read in full: `Renderer/Camera.js` (567 lines), `Preferences/Camera.js` (23 lines), `Renderer/Map/OccluderFade.js` (302 lines), `Renderer/Effects/Shaders/GLSL/OccluderFade.glsl` (85 lines). Read the drivers and inputs: `Renderer/MapRenderer.js` 262-335 (render order), `Renderer/Renderer.js` 121 and 307, `DB/Effects/EffectTable.js` 3012-3022 and 3150-3160 (quake triggers), `UI/Components/JoystickUI/JoystickMouseCursorAdapter.js` 180-195, `Preferences/Graphics.js` 82-84, and the query lines in `Renderer/Map/Models.js` 241-242 and `Renderer/Map/AnimatedModels.js` 771-772 (lines only). Callers checked with grep: `Camera.update` is called from `MapRenderer.js:277` (`UI/Components/EffectViewer/EffectViewer.js:180` is a separate tool screen, not read); `updateState` is called from `Camera.js` 412 and 431 and `JoystickMouseCursorAdapter.js` 190; `angleFinal` is written outside `Camera.js` only in `JoystickMouseCursorAdapter.js` 189 (and an EffectViewer tool screen); `Camera.init` is called from `Engine/MapEngine.js` 689 and `App/MapViewer.js` 187. `init` does not call `updateState` (the grep finds no call at lines 268-306). Candidates opened: 11 files. Confidence high on the state machine, the quake and the fade shape (whole files read). Not read: the body of `Renderer.resize` above line 307, the GR2 renderer, the post-process, and the `altitudeRange` writers beyond the two found by grep (`Camera.js` 284 and EffectViewer's own copy).

## 1. Mechanism

Part A. Three camera states, chosen from the zoom goal.

- `updateState` (`Camera.js` 436-483) picks the state. First person only when first person is enabled and the zoom goal is exactly 0 (437). Third person when third person is enabled and the zoom goal is below `|altitudeRange| x C_THIRDPERSON_TRESHOLD_ZOOM` (452-453). Otherwise isometric. Both options come from `Configs` and default to false (269-270).
- `altitudeRange` is 15 as a static default (119) but `init` sets it to `altitudeTo - altitudeFrom` (284), which is -65 with `altitudeTo = -65` (118) and `altitudeFrom = 0` (117). So in play the span is 65 units (absolute), and the third-person threshold is 65 (zoom below 65). This matters for every zoom number below.
- Each state sets: a pitch band (iso 190-270, third 175-270, first 90-270; `Camera.js` 29-30, 33-34, 36-37 for the constants; the switch is at 439-440, 456-457, 470-471); a wheel and ctrl-drag multiplier (1, 0.3, 0.3; 441, 458, 472); a hero-visibility flag (first person hides the hero, 444; the others show it, 461 and 475); and a vertical field of view (first 50, third 30, iso 15; 447, 464, 478), followed by `Renderer.resize()` (448, 465, 479). The projection is built from `vFov` (`Renderer/Renderer.js` 307). The field of view therefore changes at the state change, instantly. The drawn zoom eases separately (514), so the FOV snaps while the distance is still moving.
- There is no hysteresis. The state is chosen from the goal against one threshold (453 for the state, 521 for the focus lift). Crossing 65 flips the state, the pitch band and the FOV at once.
- The zoom floor depends on the options, not the state: `init` sets `MIN_ZOOM` to 0 when first person is enabled (287), 0.2 when third person is enabled (289), and 1 otherwise (291). With a span of 65 that is a floor of 0, 13 or 65. Outdoor ceiling is `MAX_ZOOM` = 5 (`C_MAX_ZOOM`, 27) or the `CameraMaxZoomOut` option (271), times the span: 325 by default. Indoor ceiling is `MAX_ZOOM_INDOOR` 2.5 (139) times the span.
- A state change does not re-clamp the current pitch goal. The goal is clamped to the band only when a Shift-drag writes it (366-367) or when a third/first drag writes it (404-405). So after a move from third to iso the goal can sit below 190 until the next Shift-drag. This follows from the code; it was not run.

Part B. Input writes goals; each change re-chooses the state.

- Right-button drag (no modifier) changes the yaw goal by `dx / width x 720` (384), clamped to the rotation range (398-399). Shift-drag changes the pitch goal by `dy / height x 300` (361), clamped to the state band (366-367). Ctrl-drag changes the zoom goal by `-dy x (zoomStep x mult) / 10` (373), so 1.5 units per pixel in iso and 0.45 in third or first person, then clamped to the floor and ceiling (375-379). In third or first person a plain vertical drag also changes the pitch goal (402-406).
- Wheel: `zoomFinal += notch x 15 x mult` (423), clamped (424-430), then `updateState` (431).
- Double-click (322-346): two presses within 500 ms (324) and within 10 px (325). Shift sets the pitch goal to 230 outdoors (`range`, 122 and 334) or 240 indoors (`indoorRange`, 134 and 332). Ctrl sets the zoom goal to 125 (338). Without Ctrl the yaw goal goes to 0 outdoors (343) or to `indoorRotationTo` (-25, 341) indoors.
- Joystick: `changeCameraAngle` adds to the yaw goal and calls `updateState` (`JoystickMouseCursorAdapter.js` 188-191). The same state rules apply.

Part C. Per-frame update, in the order the code runs (`Camera.update`, 490-551; called at `MapRenderer.js` 277 before the models).

1. `lerp = min((tick - lastTick) x 0.006, 1)` (491-492). `tick` is the frame's time from the render loop.
2. If the right button is held, `processMouseAction` writes goals first (495-497).
3. `processQuake(tick)` applies any active screen quake (500; see Part D).
4. Focus: if smooth is on and the state is not first person, the focus moves toward the target by `lerp` (503-506); otherwise it snaps to the target (507-511). The snap at 508-510 also erases any quake offset that was added to the position in step 3.
5. Zoom eases: `zoom += (zoomFinal - zoom) x lerp x 2` (514).
6. Focus lift `zOffset`: 2 in first person (517-518); 1.5 in third person while the zoom goal is below the threshold (519-523); otherwise 0.
7. Pitch and yaw ease the same way, `x lerp x 2` (527-528), then both are taken modulo 360 (529-530).
8. Sprite direction: `floor((yaw + 22.5) / 45) % 8` (533), eight 45-degree sectors.
9. View matrix (535-547): `translateZ((altitudeFrom - zoom) / 2)` (538), `rotateX(pitch)` (539), `rotateY(yaw)` (540), then `translate` by the focus with the lift on the height axis (543-546). `focus` is stored as the negated translation (547) for the occluder fade.

Part D. Screen quake (skill hits).

- `setQuake(start, duration, ...)` appends a quake (212-222). Defaults: duration 650 ms (215), side amount 1.0 (216), pitch amount 0.2 (217), zoom amount 0.24 (218); multiplier 0.1 (`C_QUAKE_MULT`, 39).
- Skill effects call it: one with `const duration = 200` (`DB/Effects/EffectTable.js` 3020-3021), and one with the start 600 ms after the effect start and the default duration (3158-3159).
- `processQuake` (233-263), each rendered frame while `start <= tick < start + duration` (236-237): it adds `((rand x 5 - 2.5) / 10 + sideQuake) x cos(yaw) x 0.1` to the focus position and the matching sine term to the other axis (240-247), then flips the sign of `sideQuake` (248). It adds a jitter-plus-amount kick to the zoom (250-251) and to the pitch (253-254), each flipping sign on its own. So the shake reverses direction every rendered frame. The period in milliseconds therefore depends on the frame rate.
- In first person, or with smoothing off, step 4 snaps the focus and erases the position kick. The zoom and pitch kicks still apply.
- Removal (259-260): an inactive quake is spliced out inside the `for` loop, so the next entry can be skipped for one frame. This follows from the code; it was not run.

Part E. Wall and prop fade (occluder fade). Geometry between the eye and the hero fades, so the hero stays readable.

- Gate: `isActive` is false when the graphics option `occluderFade` is `'off'` (default, `Preferences/Graphics.js` 82) or when the state is first person (98).
- Per frame (`beginFrame`, 136-160; called at `MapRenderer.js` 327 after `Camera.update`): the eye is the translation column of the inverse model view (137-140). `dt = min(tick - lastTick, 100)` (142). Results of the last query are read (150-152, 168-180). If either model renderer reported a hit, `strength += dt / 150` (156); otherwise `strength -= dt / 300` (158). Clamped to 0..1.
- The query (`renderQuery`, 250-266): the models are drawn again with colour writes off (260), inside an `ANY_SAMPLES_PASSED_CONSERVATIVE` query (261-263), in a narrow capsule of radius 0.7 cells (`QUERY_RADIUS`, 58; GLSL mode 4 at 61-65 keeps fragments with `c.x < radius` and `c.y < -0.5`). It is issued from `Models.js` 242 and `AnimatedModels.js` 772. A new query is not started while the slot is pending (251). The result is read on a later frame, so the reaction is at least one frame late.
- Fade shape (GLSL 26-53): a cylinder around the eye-to-focus line. `radial = 1 - smoothstep(R x 0.5, R, distance)`, so full fade inside half the radius and zero at the radius (50). The radius R is the `occluderFadeRadius` option, default 5.0 cells (`Preferences/Graphics.js` 84). Along the axis `along = 1 - smoothstep(-0.5, 0, past)` (51), so the fade runs out over the last 0.5 cells before the focus plane (29). The cut plane is through the focus, so geometry behind the hero never fades (27 comment; 38-44 pick the plane normal, horizontal unless the camera is steep). `visibility = 1 - fade x (1 - opacity)` with opacity 0.25 by default (68; `Graphics.js` 83).
- Render modes (GLSL 4-8 and 70-85): dither (mode 1, Bayer threshold), or alpha. Alpha has an opaque pass that discards fragments with `fade >= 0.01` (mode 2, 76-78) and a translucent pass that draws only the capsule (mode 3, 80-84). The alpha variant is selected by the option (`OccluderFade.js` 106-108).
- Save: the zoom preference is saved 3 s after the last change (`Camera.js` 180), indoor and outdoor separately (554-562).

## 2. Key functions

- `Camera.updateState`: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Renderer/Camera.js` 436-483. Chooses iso, third or first person from the zoom goal and sets the pitch band, the zoom multiplier, hero visibility and the FOV.
- `Camera.update`: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Renderer/Camera.js` 490-551. Per-frame ease, quake, focus lift, view matrix.
- `Camera.processMouseAction`: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Renderer/Camera.js` 358-414. Drag writes to goals by modifier.
- `Camera.setZoom`: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Renderer/Camera.js` 421-434. Wheel step per state.
- `Camera.setQuake` and `Camera.processQuake`: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Renderer/Camera.js` 212-263.
- `OccluderFade.beginFrame`, `pollQuery`, `renderQuery`: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Renderer/Map/OccluderFade.js` 136-160, 168-180, 250-266.
- Fade shader: `/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/Renderer/Effects/Shaders/GLSL/OccluderFade.glsl` 26-53 (cylinder and amount), 56-85 (per-fragment rules).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Zoom bands from one span: floor, third-person threshold, ceiling as multiples of the span | Span 65 after init (theirs, 118 and 284); floors 0 / 0.2 / 1 (theirs, 287, 289, 291); threshold 1 (theirs, 32); ceiling 5 outdoors (theirs, 27), 2.5 indoors (theirs, 139) |
| Per-state table: pitch band, FOV, zoom-step multiplier, hero visibility | Iso 190-270, FOV 15, mult 1 (theirs, 29-30, 478, 472); third 175-270, FOV 30, mult 0.3 (theirs, 33-34, 464, 458); first 90-270, FOV 50, mult 0.3 (theirs, 36-37, 447, 441) |
| Wheel step scaled by the state | 15 per notch (theirs, 123, 423) |
| Drag speed as a fraction of the screen | Yaw 720 per width (theirs, 384); pitch 300 per height (theirs, 361); ctrl-zoom 1.5 per px iso (theirs, 373, computed from 15 and /10) |
| Ease toward goal, time-scaled | 0.006 per ms, capped at 1 (theirs, 491); gain 2 (theirs, 514, 527-528) |
| Focus lift when close | 1.5 third, 2 first (theirs, 518 and 523; the value lines are under 15 characters, so these are cited by line only) |
| Screen quake | Multiplier 0.1 (theirs, 39); defaults 650 ms, 1.0, 0.2, 0.24 (theirs, 215-218); effect duration 200 (theirs, 3020) |
| Occluder fade timing | Fade in 150 ms, out 300 ms, frame gap cap 100 ms (theirs, 63, 64, 142) |
| Occluder fade shape | Radius 5.0 cells default (theirs, `Graphics.js` 84); full fade inside R/2; query capsule 0.7 (theirs, 58); fade ends 0.5 cells before the focus (theirs, GLSL 29); opacity 0.25 (theirs, `Graphics.js` 83) |
| Double-click recentre | Pitch 230 outdoors (theirs, 122), 240 indoors (theirs, 134); zoom 125 (theirs, 338); yaw 0 (theirs, 343) or -25 indoors (theirs, `indoorRotationTo`, 341 and 133) |
| Save delay | 3000 ms (theirs, 180) |

## 4. TypeScript sketch

simplified: keeps the donor's choice order (state from the zoom goal, with the first-person test first), the per-state table (pitch band, FOV, zoom multiplier), the zoom floor from the enable flags, the wheel step, the pitch clamp at write, and the focus lift. It omits the drag handlers, the double-click reset, the eased zoom and pitch, the indoor values and indoor ceiling, the FOV call into the renderer (the sketch returns the FOV value and does not apply it), and the hero-visibility flag. It adds nothing: there is no hysteresis, as in the donor.

```ts
// Licence: GPL-3.0 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type RigState = "iso" | "third" | "first";

interface RigParams {
  pitchMin: number;      // degrees, floor for pitch goals in this state
  pitchMax: number;      // degrees, ceiling for pitch goals in this state
  fov: number;           // vertical field of view, degrees
  zoomStepMult: number;  // multiplier on wheel and ctrl-drag zoom steps
}

interface RigConfig {
  span: number;           // |altitude span| in units (65 once init has run)
  thirdEnabled: boolean;  // player option
  firstEnabled: boolean;  // player option
  maxZoomMult: number;    // outdoor zoom ceiling = span x maxZoomMult
  thirdThreshold: number; // third person below span x thirdThreshold
}

const ZOOM_STEP = 15;
const FOCUS_LIFT_THIRD = 1.5; // units, applied only while close
const FOCUS_LIFT_FIRST = 2.0;

const RIG: Record<RigState, RigParams> = {
  iso:   { pitchMin: 190, pitchMax: 270, fov: 15, zoomStepMult: 1.0 },
  third: { pitchMin: 175, pitchMax: 270, fov: 30, zoomStepMult: 0.3 },
  first: { pitchMin: 90,  pitchMax: 270, fov: 50, zoomStepMult: 0.3 },
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Donor rule (updateState): first person only at zoom goal exactly 0 and when enabled;
// third person below span x threshold when enabled; otherwise iso. There is no hysteresis band.
function chooseState(zoomGoal: number, cfg: RigConfig): RigState {
  if (cfg.firstEnabled && zoomGoal === 0) return "first";
  if (cfg.thirdEnabled && zoomGoal < cfg.span * cfg.thirdThreshold) return "third";
  return "iso";
}

// Zoom floor depends on the player options (not on the current state): 0 with first person, 0.2 with third, else 1.
function zoomFloor(cfg: RigConfig): number {
  return cfg.span * (cfg.firstEnabled ? 0 : cfg.thirdEnabled ? 0.2 : 1);
}

// Wheel: goal moves by notches x 15 x the current state's multiplier, then clamps.
function wheelZoom(zoomGoal: number, notches: number, state: RigState, cfg: RigConfig): number {
  const stepped = zoomGoal + notches * ZOOM_STEP * RIG[state].zoomStepMult;
  return clamp(stepped, zoomFloor(cfg), cfg.span * cfg.maxZoomMult);
}

// Pitch goal is clamped to the current state's band when it is written.
function clampPitchGoal(pitchGoal: number, state: RigState): number {
  return clamp(pitchGoal, RIG[state].pitchMin, RIG[state].pitchMax);
}

// Focus height lift: applied while close (first person always; third person below the threshold).
function focusLift(state: RigState, zoomGoal: number, cfg: RigConfig): number {
  if (state === "first") return FOCUS_LIFT_FIRST;
  if (state === "third" && zoomGoal < cfg.span * cfg.thirdThreshold) return FOCUS_LIFT_THIRD;
  return 0;
}

export {};
```

simplified: keeps the cylinder test (radius with full fade inside half of it, fade out at the focus plane), the strength ease with the 100 ms frame cap, and the visibility mix. It omits: the cut-plane blend to the horizontal view direction when the camera is not steep (GLSL 38-43; the sketch always uses the eye-to-focus axis, which is the donor's steep-camera case), the first-frame zero step, the dither and alpha render modes (the per-fragment rules), and the GPU query that produces the `occluded` flag (one frame late in the donor). The caller supplies `occluded`.

```ts
// Licence: GPL-3.0 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vec3 { x: number; y: number; z: number; }

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: Vec3): number => Math.sqrt(dot(a, a));
const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Fade amount of a point: 1 inside the eye-to-focus cylinder (full within radius / 2), 0 at radius and beyond,
// and 0 once past the focus plane (the last endCells before the plane fade out).
function occluderAmount(p: Vec3, eye: Vec3, focus: Vec3, radius: number, endCells: number): number {
  const axis = sub(focus, eye);
  const L = Math.max(len(axis), 0.01);
  const rel = sub(p, eye);
  const t = Math.min(1, Math.max(0, dot(rel, axis) / (L * L)));
  const onAxis: Vec3 = { x: axis.x * t, y: axis.y * t, z: axis.z * t };
  const radial = len(sub(rel, onAxis));
  const normal: Vec3 = { x: axis.x / L, y: axis.y / L, z: axis.z / L };
  const past = dot(sub(p, focus), normal);
  const a = 1 - smoothstep(radius * 0.5, radius, radial);
  const b = 1 - smoothstep(-endCells, 0, past);
  return a * b;
}

// Strength eases in over fadeInMs when occluded and out over fadeOutMs when clear; frame gap capped at 100 ms.
function stepStrength(s: number, occluded: boolean, dtMsRaw: number, fadeInMs: number, fadeOutMs: number): number {
  const dt = Math.min(dtMsRaw, 100);
  return occluded ? Math.min(1, s + dt / fadeInMs) : Math.max(0, s - dt / fadeOutMs);
}

// Fragment visibility: at full strength and full fade the fragment keeps the opacity setting.
function visibility(amount: number, strength: number, opacity: number): number {
  return 1 - amount * strength * (1 - opacity);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed new client module; the Frankendom repo layout was not read, so the path is a proposal). Client-only. The rig state, zoom bands and FOV are view concerns; the focus point comes from the engine's hero position, and the fade reads the view and the hero position only.
- Parity-checklist row 11 (fight camera). Caveat: row 11 describes the Pit fight camera; the world camera has no row in the addendum (see section 6).
- Data that a designer would set: the pitch bands and FOV per state (engine constants, since they define the rig), the wall fade radius and opacity (player options here, so client settings), the zoom bands as a fraction of a per-zone span (zone data if indoor and outdoor differ, as they do in the donor).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: camera is client-only (rule for camera/HUD/sound); the camera never writes game state, and the fade is a render-only effect.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketches are written from the mechanism, not from the donor lines.
- The donor's third person is a close orbit behind the hero with a focus lift; it is not an over-the-shoulder offset. The focus is the hero's own position with a height lift (544) and no sideways offset. Frankendom needs a shoulder offset added by the client, and the donor gives no lateral offset to copy.
- Camera collision: the donor has no pull-in (no collision query in `Camera.js`). Its answer to walls is the fade (Part E). A wall pull-in is still needed for a camera that must not sit inside a wall; the fade covers only what is between the eye and the hero.
- No hysteresis at the threshold: crossing the third-person zoom line flips the state, the pitch band and the FOV at once (453 and 521), and the FOV snaps (448, 465, 479). The donor shows the flip at the boundary; Frankendom should use a band and ease the FOV.
- The pitch goal is not re-clamped when the state changes (see Part A), so a stale goal can sit outside the new band until the next write (366-367, 404-405).
- Screen shake is per rendered frame, so its period depends on the frame rate (248, 250-254). Frankendom should drive any shake from elapsed time if the shake must look the same at 30 and 144 Hz.
- The quake removal splices inside the loop (259-260) and can skip one entry for a frame. Harmless for one quake; a lockstep test would catch it.
- Load state: `init` does not call `updateState` (no call at 268-306), and the state stays -1 until the first drag, wheel or joystick write (154). A saved zoom below the third-person line (for example 13-65 after third person was used) therefore loads with the isometric FOV of 15 and the isometric pitch band until the player first gives input. This follows from the code; it was not run.
- The FOV change happens at the goal, not at the eased zoom, so the FOV can change before the distance has moved (514 against 447-448).
- The occluder fade depends on GPU occlusion queries (`ANY_SAMPLES_PASSED_CONSERVATIVE`), which need WebGL2 and are one frame late. Frankendom's Pit as client and server-verified kills do not depend on it, but a fallback for devices without the query is needed (the donor has none; `OccluderFade.js` 97-99 checks only the option and first person).
- Two values are cited by line only because their value lines are under the 15-character receipt minimum (zOffset 1.5 at 523 and 2 at 518; the default zoom 125 at `Preferences/Camera.js` 20 is also short).
- The donor's own comments say the wall fade is for "the third person camera" (GLSL 1-2) and skips first person (`OccluderFade.js` 6, 98); Frankendom should keep that rule.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: camera is client-only (rule for camera/HUD/sound); the camera never writes game state, and the fade is a render-only effect.

Best transferable idea: Use one zoom-to-state rule with explicit per-state bands (pitch, FOV, zoom step), and fade geometry that sits between the eye and the hero instead of pulling the camera past walls.
Decision (proposed): adapt - the three-state rig and the between-eye-and-hero fade fit a world third-person camera, but Frankendom must add hysteresis, an eased FOV and a wall pull-in, which this donor does not have.
Acceptance: In a zone, zooming past the third-person line changes the view without a flicker at the line (a band, not a single threshold), the FOV eases over 0.3 s instead of snapping, and a wall between the camera and the hero fades to 25 percent opacity within 150 ms while the hero stays visible; a client test asserts no state flip while the zoom goal moves inside the band.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** None found. Checked about 30 claims: all Camera.js state-machine lines (29-40, 117-139, 284-291, 322-346, 358-434, 436-483, 490-551), quake 212-263 and EffectTable 3020/3158, OccluderFade.js 58/63/64/97-99/136-160/250-266, GLSL 26-85, Graphics.js 82-84, MapRenderer 277/327, Renderer 307, license GPL-3. Part C order matches. Sketch constants and clamps match. Minor: Camera.init is also called from EffectViewer.js:72 (note lists only MapEngine 689 and MapViewer 187).

**Missed:** Init also sets the default zoomFinal to Preferences.zoom||125 (Camera.js 299/303) and indoor start pitch 230/yaw -40 (300-301), and indoor pitch clamp 220-240 (MIN/MAX_ALTITUDE_INDOOR 144-149) which the shift-drag path uses instead of the state band; the note only says indoor was omitted.
