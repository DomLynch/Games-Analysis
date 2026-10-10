# FunkinCrew-Funkin (camera, cell 14)

Donor: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/PlayState.hx` | Licence: Apache-2.0 (donor `LICENSE.md` line 3: "licensed under the Apache 2.0 license") | Haxe | symbol `PlayState.update` and `PlayState.stepHit` (camera follow, zoom and beat kick)

Checked: The hint file `source/funkin/graphics/FunkinCamera.hx` is NOT camera control (read in full, 292 lines). It is a `FlxCamera` subclass (line 42) whose one relevant override, `drawPixels` (130-218), swaps in a shader and render-texture path to fake blend modes. It has no follow target, zoom change or kick. The control code is in `PlayState.hx`: `update` 1217-1228, `stepHit` 1834-1859, stage load 2102-2106, `resetCamera` 3918-3938, `tweenCameraZoom` 3999-4025; plus `FocusCameraSongEvent.hx` 59-158, `ZoomCameraSongEvent.hx` 37-79, `SetCameraBopSongEvent.hx` 31-60, `Constants.hx` 237-251 and 692-697 (plus 373 and 424 by line-numbered grep), `Preferences.hx` 137-141 (by grep). Not read: flixel's own follow and tween internals, the `Conductor` implementation, `Stage.camZoom`, and the camera code in `GameOverSubState.hx`.

## 1. Mechanism

Three parts. All are client-side presentation, driven from the PlayState loop.

(a) Follow point. `resetCamera` attaches the camera to one `FlxObject`, `cameraFollowPoint`, with LOCKON and lerp 0.04 (3926). The point moves in three ways: stage start puts it on the dad's `cameraFocusPoint` (2227); a FocusCamera chart event adds the chosen character's focus point to the event's x/y (`FocusCameraSongEvent` 94-133); or a tween moves it (`tweenCameraToPosition`, 3943-3947). The default ease `CLASSIC` sets the point at once and cancels any follow tween (142-145).

(b) Set zoom. `currentCameraZoom` is the zoom the song wants. `tweenCameraZoom` sets it at once when duration is 0 (4008-4011), or tweens it. The target is `zoom * FlxCamera.defaultZoom` in absolute mode or `zoom * stageZoom` in stage mode (4006). A zoom event converts its length from steps to seconds: `stepLengthMs * duration / MS_PER_SEC` (`ZoomCameraSongEvent` 68), and the tween divides that by `playbackRate` (4016).

(c) Beat kick. Each frame in `update`, when no substate is open and `cameraZoomRate > 0` (1220), the multiplier `cameraBopMultiplier` decays toward 1 by `lerp(1, m, 0.95^(elapsed x 60))` (1217-1222). The camera zoom is then written as `currentCameraZoom * cameraBopMultiplier` (1224-1225). The HUD camera zoom decays the same way toward its default (1227). On a step event (`stepHit`, 1834), a kick happens only if: the step is not paused (1841); the `zoomCamera` option is on, default true (`Preferences.hx` 141; 1850); the HUD zoom is below 1.35 x default (1848, 1851); and the step, shifted by offset x 4, is a multiple of rate x 4 (1853). The kick sets the multiplier to `cameraBopIntensity` (1.015, 1856) and adds `hudCameraZoomIntensity x defaultHUDCameraZoom` to the HUD zoom (1858).

Order as written: the decay and the zoom write run in `update`; the kick runs in `stepHit`. Which of the two runs first within a frame is set by the engine loop, which was not read. The kick only changes zoom values. It writes no gameplay state (no health, no hit window).

Pause and reset: a substate sets `followLerp = 0` (1603) and skips the decay and zoom write (1220); on resume the follow lerp is restored to 0.04 (1686). The stage-zoom reset (`resetCameraZoom`, 2098-2107) sets the zoom to the stage zoom and the bop multiplier to 1.0; its caller was not read. A restart path resets bop intensity and zoom rate (1109-1111; the enclosing function was not named in the read).

## 2. Key functions

- `PlayState.update` (override, starts 1031): decay and zoom write, 1217-1228.
- `PlayState.stepHit` (override, 1834): kick gate and kick, 1841-1859.
- `PlayState.resetCamera` (3918): attach the follow point, lerp 0.04, optional snap (3926-3937).
- `PlayState.tweenCameraZoom` (3999): direct or stage zoom target, instant or tweened (4006-4017).
- `FocusCameraSongEvent.handleEvent` (65): picks the focus point by character index and the ease (97-158).
- `ZoomCameraSongEvent.handleEvent` (37): step-to-seconds conversion and ease lookup (66-77).
- `SetCameraBopSongEvent.handleEvent` (40): sets bop intensity, rate and offset from the chart event (45-51).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Kick multiplier relaxes to 1 by a fixed factor each 60 Hz frame, scaled by real elapsed time | Decay 0.95 per 60 Hz frame (theirs, PlayState.hx 1217-1218). Half-life = ln 0.5 / ln 0.95 = 13.5 frames, about 0.23 s at 60 Hz (arithmetic) |
| Kick size | 1.015, i.e. +1.5% (theirs, Constants.hx 241) |
| HUD kick = 2 x (kick - 1) x default HUD zoom | Factor 2 (theirs, PlayState.hx 351 default 0.015 x 2.0; SetCameraBop 50). Gives 0.03 (arithmetic) |
| Kick on a fixed step grid with a beat offset | Rate 4 beats and offset 0 (theirs, Constants.hx 246, 251); STEPS_PER_BEAT = 4 (theirs, Constants.hx 424). One kick every 16 steps |
| Kick cap: no kick once zoom reaches cap x base | Cap 1.35 (theirs, PlayState.hx 1848) |
| Follow: close a fixed fraction of the gap each frame | 0.04, documented as "4% of distance per frame" (theirs, Constants.hx 694, 696). 90% of the gap is closed after ln 0.1 / ln 0.96 = 56 frames, about 0.94 s at 60 Hz (arithmetic; flixel's per-frame rule not read) |
| Zoom tween length from musical steps | MS_PER_SEC = 1000 (theirs, Constants.hx 373); step length comes from `Conductor` (not read) |

## 4. TypeScript sketch

simplified: one camera. The donor has a second HUD camera with its own zoom, a stage-zoom tween, the CLASSIC and INSTANT focus eases, and the substate pause on every tween. The sketch's kick is an event the caller must place before the frame decay; the donor's order between the two is not guaranteed (engine loop not read). It gates the cap on the game zoom, not the HUD zoom. It omits the zoom and focus tweens, the chart event parsing, the `Preferences.zoomCamera` option gate, and the stage-load path beyond a plain reset. The follow step is one lerp per call, as the donor's per-frame follow (flixel internals not read). Constants are the donor's defaults.

```ts
// Licence: Apache-2.0 (donor LICENSE.md). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface CameraTuning {
  kickScale: number;       // zoom multiplier on a kick (donor default 1.015)
  kickEveryBeats: number;  // beats between kicks (donor default 4)
  kickOffsetBeats: number; // shifts the kick grid (donor default 0)
  kickCapScale: number;    // no kick once zoom is at or above base x cap (donor 1.35)
  decayPerFrame: number;   // kick relaxes by this factor per 60 Hz frame (donor 0.95)
  followRate: number;      // share of the gap closed per frame (donor 0.04)
}

interface FightCamera {
  baseZoom: number; // set zoom (stage zoom or tween target)
  kick: number;     // multiplier, 1 = no kick
  zoom: number;     // what the renderer uses
  x: number;
  y: number;
  paused: boolean;
}

const STEPS_PER_BEAT = 4; // donor Constants.hx 424

// Grid step event. Ignored while paused (donor: stepHit returns early when paused).
function onGridStep(cam: FightCamera, t: CameraTuning, step: number): void {
  if (cam.paused) return;
  const gridSteps = t.kickEveryBeats * STEPS_PER_BEAT;
  const shifted = step + t.kickOffsetBeats * STEPS_PER_BEAT;
  if (cam.zoom < cam.baseZoom * t.kickCapScale && shifted % gridSteps === 0) {
    cam.kick = t.kickScale;
  }
}

// Frame update with real elapsed seconds. Donor: update() decays the kick, writes the zoom, then follows.
function onFrame(cam: FightCamera, t: CameraTuning, focusX: number, focusY: number, elapsedS: number): void {
  if (cam.paused) return; // donor: no decay or zoom write while a substate is open
  const frames = elapsedS * 60;
  cam.kick = 1 + (cam.kick - 1) * Math.pow(t.decayPerFrame, frames);
  cam.zoom = cam.baseZoom * cam.kick;
  cam.x += (focusX - cam.x) * t.followRate;
  cam.y += (focusY - cam.y) * t.followRate;
}

// Stage start or restart: drop any kick and set the base zoom and focus.
function resetFightCamera(cam: FightCamera, baseZoom: number, focusX: number, focusY: number): void {
  cam.baseZoom = baseZoom;
  cam.kick = 1;
  cam.zoom = baseZoom;
  cam.x = focusX;
  cam.y = focusY;
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (new module: client-side fight camera state and its step; presentation only, not engine state). Parity-checklist row 11 (fight camera: follow, camera kick, standoff). Today: `src/camera*` (own follow cam; checklist row 11 says "no (own follow cam)"). Row 10 (hit impact / hitstop) is not in this donor's camera code.
- Reuse tag: rewrite-from-idea (Apache-2.0; clean-room sketch, no donor lines copied)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Not a fight camera. The kick is keyed to the music's beat grid (`Conductor.instance.currentStep` at 1853; `Conductor.instance.stepLengthMs` in `ZoomCameraSongEvent` 68; the `Conductor` itself is not read). Frankendom fights have no beat clock. A kick there must be keyed to fight events from the engine tick (hit landed, parry, finisher). Do not copy the step grid.
- One focus point. The donor frames one character or one fixed point (FocusCamera event). MAX_ATTACKERS = 3 means a many-vs-one fight has the hero plus up to three attackers in view. The donor has no multi-target framing in the files read. Frankendom must design that framing. Nothing in this donor proves it works.
- Zones as data. Kick size, rate, offset, cap, decay and follow rate are donor constants (`Constants.hx`) and chart-event fields. Frankendom should carry them as zone data with these values as defaults, not as constants in the camera module.
- One ledger and server-verified kills. The camera reads engine state and writes presentation only. Keep it out of the damage path: the kick must not change hit timing, or a client and the server would disagree on a hit. The donor's kick writes only zoom fields (1856-1858), so that boundary transfers.
- Pit as client. The Pit and each zone run the same camera module as clients. The donor's game-over camera (`GameOverSubState.hx` 221) was not read, so no end-screen behaviour is claimed.
- Frame rate. The donor scales the kick decay by real elapsed time (1218), but its follow lerp is per frame (`Constants.hx` 694: "per frame"). The sketch scales the decay by elapsed time and applies the follow once per call. Pick one rule for both and test at 60 Hz and 120 Hz.
- Pause. A substate freezes the follow and skips the decay (1603, 1220). Frankendom's Pit pause must freeze the kick too, or a stale zoom survives a resume.
- Licence. Apache-2.0 permits reuse with the licence and notice. This note is clean-room (mechanism only, no lines copied), so it carries no donor text. A literal lift would need the Apache licence and notice.
