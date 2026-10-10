# Anuken-Mindustry (camera, cell 14)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/Renderer.java` | Licence: GNU General Public License, Version 3, 29 June 2007 (`LICENSE` lines 1-2) | Java | symbols `Renderer.update` and `Renderer.shake`, `Effect.shake(…, x, y)`, `DesktopInput` follow and pan

Checked: The list hint was INFERRED, and the real camera is spread over three files: `Renderer.java` (zoom, shake, camera offset per frame), `entities/Effect.java` (impact shake with distance falloff) and `input/DesktopInput.java` (follow, pan, detached camera). Read end to end for those paths: high confidence on the code shape. Not read (not in this repo, Arc library): `Mathf.lerpDelta`, `Mathf.clamp` with one argument, `Time.delta`, `minScale()`/`maxScale()`, the zoom limits `minZoom`/`maxZoom`, the `Pixelator` path (only the call site), and `InputHandler` logic-cutscene pan (only the call, line 956). camera_scope: world camera (follow, zoom and shake in the open map; this donor is a top-down 2D strategy game, so the transfer to a 3D third-person rig is a shape transfer, not a code transfer).

## 1. Mechanism

- Zoom (`Renderer.update`, 152-199). Each frame the base target is `targetscale` (default `Scl.scl(4)`, line 59). During a logic cutscene the target is interpolated between `minZoom` and `maxZoom` by a cutscene value (158-159). The target is clamped to `[minScale(), maxScale()]` (162). `camerascale` moves toward it with `lerpDelta(…, 0.1)` (163) and snaps when within 0.001 (164). The visible size is screen size divided by `camerascale` (198-199), so zoom changes the visible world, not the screen.
- Shake state (`shake`, 85-89). A call keeps the strongest intensity (clamped to 0..100) and the longest duration, then sets a linear decay rate `reduction = intensity / time` (86-88).
- Shake per frame (`Renderer.update`, 209-218). While time is positive: magnitude is random up to `intensity × (screenshake setting / 4) × 0.75` in a random direction (210-211). That offset is added to the camera position (212). Intensity drops by `reduction × delta` and time by `delta`, and intensity is clamped to 0..100 (213-215). When time runs out, the offset and intensity are zeroed (217-218).
- Render-only. The offset is subtracted again after the frame is drawn (227), on both the normal and the pixelate path (72-76). So the shake never accumulates into the camera's own position. The rig moves only by input.
- Impact shake (`Effect.shake`, 201-208 and 195-199). The distance from the camera to the impact point is floored at 1 (204-205). The strength is `clamp(1 / (d² / 10000)) × intensity` (207, `shakeFalloff` = 10000 at line 21). That is `min(1, 10000/d²) × intensity` if the one-argument clamp is 0..1 (assumed; not read). The shake reaches the renderer only when not headless (195-197).
- Follow (`DesktopInput`, 236-300). Camera speed is pan speed (pan-boost speed with the boost key) × frame delta (239). Branch 1: if the detached-camera setting is on, or the player is dead or paused (and no chat or dialog), the camera moves by the move axes (282). Branch 2: if the player is alive (or spectating) and not panning, the camera lerps to a target with factor 0.08 when smooth camera is on, or 1.0 (snap) when off (289). The target is the team's last core when the game is over outside PvP, else the spectated unit, else the player (287).
- Panning. The pan key sets `panning` (not receipted). A move-axis or mouse-move input clears it (268). While panning, branch 2 is skipped (283). Mouse pan moves the camera by `clamp((mouse - screen centre) × panScale, -1, 1) × camSpeed` on each axis (293-294).
- Detached mode also steers the unit. With the detached setting on, the unit's movement is `(camera - unit)` limited to its speed, and it stops within 15 units of the camera (983-988). So the camera leads the unit in that mode.

## 2. Key functions

- `Renderer.update` (152-232): zoom lerp, camera width and height, shake offset add before draw, shake offset subtract after draw.
- `Renderer.shake` (85-89) and `Renderer.draw` (camera update and NaN recovery, 304-312; not read in full).
- `Effect.shake` with a position (201-208) and the no-position form (195-199).
- `DesktopInput` camera block (236-300): speed (239), detach toggle (254), move-axis free camera (282), smooth follow (283-289), mouse pan (293-294); detached unit steering (983-988).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep the strongest shake and the longest duration; decay linearly | Max intensity 100 (theirs, Renderer.java 86) |
| Shake magnitude scales with the player's screen-shake setting | `setting / 4 × 0.75` (theirs, Renderer.java 210); the setting default is 4 (210) |
| Shake is added before the draw and removed after it | Two lines only (212, 227) |
| Impact strength falls with inverse square distance, capped at full | `10000` (theirs, Effect.java 21); distance floor 1 (205) |
| Zoom eases toward a clamped target | Zoom lerp `0.1` per frame (theirs, Renderer.java 163); snap threshold `0.001` (164); default scale `4` (59) |
| Follow eases toward the target | Smooth factor `0.08` (theirs, DesktopInput.java 289); snap `1.0` when off |
| Detached unit stops near the camera | Radius `15` units (theirs, DesktopInput.java 988) |

## 4. TypeScript sketch

simplified: the sketch keeps the follow smoothing, the shake state (strongest intensity, longest duration, linear decay), the inverse-square impact falloff and the render-only offset. It omits the zoom lerp and clamps, the logic-cutscene zoom, the mouse pan, the detached-unit steering, the pixelate path and the NaN recovery. It converts the donor's per-frame (Time.delta) timing into 60 Hz frame equivalents; the donor's `lerpDelta` and `Time.delta` are Arc functions that were not read, so the frame-rate independence in the sketch is our own construction, not a copy of the donor.
```ts
// Licence: GPL-3.0 (donor). Clean-room sketch of the shape only: a follow rig with frame-rate-aware smoothing, a shake state that decays linearly, a distance falloff for impacts, and a render-only offset that never changes the rig.
interface Vec2 { x: number; y: number; }

// Follow with smoothing per 60 Hz frame (the donor uses lerpDelta 0.08 when smooth camera is on, snap when off).
// Frame-rate independent: the per-frame factor is applied once per 60 Hz frame elapsed.
function followStep(rig: Vec2, target: Vec2, dtMs: number, smooth: boolean): void {
  if (!smooth) { rig.x = target.x; rig.y = target.y; return; }
  const frames = (dtMs * 60) / 1000;
  const a = 1 - Math.pow(1 - 0.08, frames);
  rig.x += (target.x - rig.x) * a;
  rig.y += (target.y - rig.y) * a;
}

interface Shake { intensity: number; time: number; reduction: number; }

// As in the donor: keep the strongest intensity and the longest duration; decay linearly to zero over the duration.
function shake(s: Shake, intensity: number, duration: number): void {
  s.intensity = Math.max(s.intensity, Math.min(Math.max(intensity, 0), 100));
  s.time = Math.max(s.time, duration);
  s.reduction = s.intensity / s.time;
}

// Impacts fall off with the square of distance from the camera: full strength within about 100 donor units (donor constant 10000; donor distances are world pixels, so rescale if our units differ).
function impactIntensity(intensity: number, distance: number): number {
  const d = Math.max(distance, 1);
  return Math.min(1, 10000 / (d * d)) * intensity;
}

// Render-only offset for one frame. The caller adds it to a copy of the rig position for drawing and never writes it back.
function frameShakeOffset(s: Shake, dtMs: number, screenShake: number, rand: () => number): Vec2 {
  if (s.time <= 0) { s.intensity = 0; return { x: 0, y: 0 }; }
  const frames = (dtMs * 60) / 1000;
  const magnitude = s.intensity * (screenShake / 4) * 0.75 * rand();
  const angle = rand() * Math.PI * 2;
  s.intensity = Math.min(100, Math.max(0, s.intensity - s.reduction * frames));
  s.time -= frames;
  return { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only): the follow smoothing, the shake state and the impact falloff. The engine never reads it. Parity-checklist row 11 (fight camera). Gap: the world camera has no parity row; Lead should decide whether it gets its own.
- Reuse tag: adapt-allowed only as an idea; donor is GPL-3.0, so this is clean-room (shape only, our own code)
- Brief rule served: 1 (client-only camera; the engine never reads the camera); licence rule 7 (GPL, clean-room)
- Best transferable idea: Apply camera shake as an offset that is added to a copy of the camera for one frame and removed after the draw, with impact strength falling off with the square of distance, so a shake can never drift the camera and a far hit barely moves the view.
- Decision (proposed): adapt - take the render-only shake and the distance-falloff impact for the world third-person camera (client-only, a far hit shakes less, the screen-shake setting scales it). Do not take the zoom-to-visible-world rule (2D zoom), the mouse pan, or the detached-unit steering (the camera driving the character breaks the server-verified input rule).
- Acceptance: In a zone, a hit close to the player shakes the third-person view for about the set duration and fades to nothing; a hit about 300 world units away shakes at roughly one ninth of the strength (donor falloff, if our units match pixels). A test asserts the rig position is identical before and after a shaken frame.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described shape; do not copy `Renderer.java` or `DesktopInput.java` lines.
- The donor is top-down 2D. Its shake is a flat 2D offset, and a 3D third-person camera needs the shake in camera-local axes (or as a small rotation). The falloff constant is in donor pixels and must be rescaled to Frankendom units.
- Shake and impact feel are client-only. They must never change server state or kill results (server-verified kills), and they must not be the only way to show a hit (the hit must still be visible on the HUD and in the combat log).
- Pit camera: the Pit view is frozen and tuned, so this mechanism is for the world camera only. If it is used in the Pit later, that is a separate owner decision.
- The donor's time base (Time.delta, lerpDelta, the one-argument clamp) lives in the Arc library, which was not read. The 60 Hz frame equivalent is an assumption until Arc is checked.
- Not read: the logic-cutscene pan (`InputHandler` 956 only as a call), the `Pixelator` path, `minScale`/`maxScale` and the zoom limits. None of these is claimed in the note beyond the call sites.

Reuse tag: adapt-allowed only as an idea (GPL-3.0, clean-room)
Brief rule served: 1 (client-only camera); parity row 11
