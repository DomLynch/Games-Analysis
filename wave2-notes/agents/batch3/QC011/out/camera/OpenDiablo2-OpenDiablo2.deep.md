# OpenDiablo2-OpenDiablo2 (camera, cell 14)

Donor: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2map/d2maprenderer/camera.go` (with `d2core/d2map/d2maprenderer/renderer.go`, `d2game/d2gamescreen/game.go` and `d2game/d2player/game_controls.go`) | Licence: GPL-3.0 (the `LICENSE` file is the GPLv3 text, Version 3, 29 June 2007; the README badge says "License: GPL v3"; the `.go` files carry no licence header and none says "or later") | Go | symbol `Camera.advanceToTarget`

Checked: Read in full: `camera.go` 1-58 (the whole file) and `renderer.go` 614-625 (MapRenderer.Advance). Read for the camera path: `game.go` 262-300 (the camera target, read in full), 227-236 only as grep lines 228, 231, 235 (the order of the controls call); `game_controls.go` 316-350 (arrow-key pan), 452-476 (free-cam click), and 716-717 (GameControls.Advance, by grep). Grepped only: `viewport.go` (how the camera offset is used for drawing) and the rest of `game_controls.go`. Not read: `WorldToOrtho`, the chunk and bounds code. This is a 2D isometric map camera, one of the simplest follow rules in the set. Camera scope: world camera (the map view in the open game; no arena). Confidence: high on the order of operations and the 0.85 gain (all read); medium-high on the lag figure (derived from the order of operations and checked with a small script on the Mac, not run in the game).

## 1. Mechanism

- Per-frame order, in one `Game.Advance` call. `Game.Advance` calls `gameControls.Advance` (game.go 235), which calls `mapRenderer.Advance` (game_controls.go 716-717), which calls `Camera.Advance` (renderer.go 614, 624). That moves the camera: `advanceToTarget` takes the gap `position - target`, scales it by -0.85, and adds it to the position (camera.go 52-56). So each call closes 85% of the gap. The `elapsed` argument is passed in and ignored (camera.go 52).
- Only after that does `Game.Advance` set the next target: if the local player exists and free cam is off (game.go 273), the player's world position is converted to ortho coordinates (275) and written as the target (277). So the pull on frame n uses the target written on frame n-1. The camera trails by one frame before any lag from the gain.
- Steady lag (derived, not measured in the game). With the hero moving v per frame, the gap after a pull is 0.15 of the gap before it, and the target has moved on by v. In steady state the camera trails by v / 0.85, about 1.18 frames of movement. A small script on the Mac reproduces 1.176 after 300 frames with the same order. In time, that is 1.18 / fps seconds: about 20 ms at 60 fps and 39 ms at 30 fps. Because the gain is per call and not per second, the lag grows as the frame rate drops.
- Free cam (the target is the user's, not the hero's). When `FreeCam` is on, the follow write (273-277) is skipped, so the target stays where the user put it. The arrow keys (318-325) call `MoveCameraTargetBy` with a step of 8 units per key-repeat event, or 16 with Shift (318-320). `Camera.MoveTargetBy` creates a target at the camera position if none exists (camera.go 28-33). The pull is not gated by `FreeCam`, so the camera still eases to the moved target.
- Free-cam click (462-472): the target is set to a point built from the camera position plus an offset of half the screen size (464, 472; the offset constants are not read).
- `MoveTo` makes position and target the same pointer (camera.go 12-14, line 14). Any later move of one moves the other. Callers were not checked.

## 2. Key functions

- `Camera.advanceToTarget`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2map/d2maprenderer/camera.go` 52-58. The pull: gap times -0.85, added to the position.
- `Camera.MoveTargetBy`: same file, 28-35. Free-look target pan; creates a target if none exists.
- `MapRenderer.Advance`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2map/d2maprenderer/renderer.go` 614-625. Frame bookkeeping, then the camera advance.
- `Game.Advance` (camera lines): `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2gamescreen/game.go` 227-236 and 272-278. Controls first, then the follow target.
- `GameControls.OnKeyRepeat` (arrow pan) and free-cam click: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/game_controls.go` 316-325 and 462-472.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Camera eases toward a target every frame, a fixed fraction of the gap per call | Fraction 0.85 per call (theirs, camera.go 55); frame-rate dependent, do not copy |
| Follow target is written from the hero each frame, but only when free look is off | Free-look flag gate (theirs, game.go 273) |
| Free-look pan moves the target, and the camera eases to it | Step 8 units per key repeat, 16 with Shift (theirs, game_controls.go 318, 320) |
| Lag in frames of movement = speed / gain | 1 / 0.85 = 1.18 frames (derived from the order, theirs 273-277 and 55) |

## 4. TypeScript sketch

simplified: the sketch shows the donor-style step (a fixed gain per call, with the target one frame old) next to the adapted step (a time-based ease with a half-life, with the target written in the same frame). It omits the ortho conversion (WorldToOrtho), the viewport offset, the chunk and map bounds, the free-cam click offset, the MoveTo pointer aliasing, and the key-repeat timing. The half-life of 0.08 s is a proposal, not a donor constant. The smoke test runs a hero walking at 1 unit per frame; its results are not used by any caller.

```ts
// Licence of donor: GPL-3.0. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cam2 {
  x: number;                                  // camera position (screen-ortho units)
  y: number;
  target: { x: number; y: number } | null;    // where the camera eases to
}

const DONOR_GAIN = 0.85;     // fraction of the gap closed per call (donor), not per second
const HALF_LIFE_S = 0.08;    // proposed follow half-life in seconds (tunable)

// Donor-shaped step, for comparison only: one fixed-gain pull per call, whatever the frame time.
function donorStyleStep(cam: Cam2): void {
  if (cam.target === null) return;
  cam.x += DONOR_GAIN * (cam.target.x - cam.x);
  cam.y += DONOR_GAIN * (cam.target.y - cam.y);
}

// Adapted step: fraction of the gap closed depends on elapsed seconds, so the feel is the same at any frame rate.
function easeStep(cam: Cam2, dtS: number): void {
  if (cam.target === null) return;
  const k = 1 - Math.pow(0.5, dtS / HALF_LIFE_S);
  cam.x += k * (cam.target.x - cam.x);
  cam.y += k * (cam.target.y - cam.y);
}

// Follow: the target is written from the hero only when free look is off. The camera always eases to the target.
function setFollowTarget(cam: Cam2, heroX: number, heroY: number, freeLook: boolean): void {
  if (!freeLook) cam.target = { x: heroX, y: heroY };
}

// Free look pan: moves the target, not the camera. Shift doubles the step (donor: 8 and 16 units per key repeat).
function panTarget(cam: Cam2, dx: number, dy: number, shift: boolean): void {
  if (cam.target === null) cam.target = { x: cam.x, y: cam.y };
  const step = shift ? 16 : 8;
  cam.target.x += dx * step;
  cam.target.y += dy * step;
}

// Smoke test: hero walks right at 1 unit per frame; compare the donor-style lag with the adapted one.
const donorCam: Cam2 = { x: 0, y: 0, target: null };
const easeCam: Cam2 = { x: 0, y: 0, target: null };
let heroX = 0;
for (let frame = 0; frame < 120; frame++) {
  donorStyleStep(donorCam);                 // donor order: pull first, then the target is set from the hero
  setFollowTarget(donorCam, heroX, 0, false);
  heroX += 1;
  setFollowTarget(easeCam, heroX, 0, false);
  easeStep(easeCam, 1 / 60);
}
const donorLag = heroX - donorCam.x;
const easeLag = heroX - easeCam.x;
panTarget(easeCam, 1, 0, true);
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/qc011-opendiablo2-follow-camera.ts` there; copy at `work/opendiablo2-follow-camera.ts`).

## 5. Lands in

- TARGET `src/fight/camera.ts` (new, client only). Parity-checklist row 11 (fight camera). The target comes from the hero's position in the latest server snapshot, not from a local object.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 11 (fight camera is client-only; free look never writes server state)

## 6. Gaps and risks

- This donor is a plain 2D follow. It has no dead zone, no look-ahead, no shoulder offset, no pitch, yaw, zoom, collision, shake or lock-on. Most of the owner's list is not covered here.
- The fixed 0.85 gain per call is frame-rate dependent (the `elapsed` argument is passed in and never used, camera.go 52). Do not copy it. The time-based ease in the sketch has a steady lag of the hero's speed times the half-life over ln 2 (about 0.115 s at an 0.08 s half-life), the same at any frame rate. That half-life is a proposal to tune.
- The one-frame target delay (game.go 273-277) is a real lag source. In Frankendom, set the target and ease in the same client frame.
- Transferable pattern: one shared camera target that the hero writes each frame unless free look is on; free look pans that same target; the camera always eases to it. That gives manual look and auto-follow one target and one ease, with no mode-specific camera code.
- Free look must not change server state. In Frankendom the pan only moves the client's target; the hero and the server snapshot are not touched.
- `MoveTo` aliases position and target to the same object (camera.go 14). Frankendom should not share one object between the camera and its target.
- GPL-3.0: clean-room only. Not read: `WorldToOrtho`, the chunk and bounds code, and most of `viewport.go`.

Best transferable idea: keep one camera target that the hero writes each frame unless free look is on, let free look pan that same target, and always ease the camera toward it.

Decision (proposed): adapt - take the shared target, the free-look gate and the pan-the-target rule for the world camera; reject the per-call 0.85 gain, because it changes with frame rate.

Acceptance: with the hero walking at a steady speed the camera trails by the same distance at 30 and 60 fps (within a few percent); holding the free-look key pans the view, and releasing it returns the view to the hero within 0.5 s; the pan never changes the hero's position. A client test asserts the trailing distance agrees at 30 and 60 fps and that the pan leaves the server state unchanged.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 11 (fight camera; client only; free look never writes server state)



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** camera.go 52-58 gain -0.85 with ignored elapsed; follow target written after controls advance (game.go 273-277, controls at 235 -> renderer.go 624); FreeCam gate; arrow step 8/16 with Shift; MoveTo aliasing at camera.go 14; GPL-3 LICENSE; lag 1/0.85 derivation checked by hand.

**Missed:** ClearTarget (camera.go 38-40) and FreeCam toggle not covered; minor.
