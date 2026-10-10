# FunkinCrew-Funkin (camera, cell 14)

Donor: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/PlayState.hx` | Licence: Apache-2.0 (README: "licensed under the Apache 2.0 license") | Haxe (HaxeFlixel) | symbol `PlayState.update` (bop decay), `stepHit`, `resetCamera`, `tweenCameraZoom`

Checked: the list's hint file `graphics/FunkinCamera.hx` was opened and is a render-batching helper (drawPixels, quad batches), not camera control, so it is not the evidence. The real control is in `PlayState.hx` 1214-1232, 1846-1860, 3918-4034 and `play/event/FocusCameraSongEvent.hx` 65-110 (all read).

## 1. Mechanism

- Two separate things move the view. (a) Position: an invisible "follow point" object (`cameraFollowPoint`, 284) is the target; the camera follows it with a smoothing factor `DEFAULT_CAMERA_FOLLOW_RATE = 0.04` (`FlxG.camera.follow(..., LOCKON, rate)`, 3926; Constants.hx 696). Gameplay and song events only ever move the follow point. (b) Zoom: `currentCameraZoom` (311) is the base zoom for the stage, multiplied by a "bop" multiplier (`cameraBopMultiplier`, 317).
- Bop (a pulse on the beat): in `stepHit` (1834), if camera zoom is enabled, the HUD zoom is under 1.35x its default (1848-1851, an arbitrary cap "so the camera doesn't move insanely far in") and `(step + offset*4) % (rate*4) == 0` (1853), the multiplier is set to the intensity 1.015 (1856; Constants.hx 241) and the HUD zoom jumps by a small amount (1858). Defaults: rate 4 beats (Constants 246), offset 0 (251), 4 steps per beat (424).
- Every frame (1217-1227): the multiplier decays back toward 1.0 with `lerp(1.0, mult, 0.95^(dt*60))` where `dt = elapsed*60` (1217-1222), so the decay is frame-rate independent; the camera zoom is set to `base * multiplier` (1224-1225) and the HUD zoom decays the same way (1227).
- Scripted moves: `tweenCameraToPosition` sets the follow point then tweens (3945); `tweenCameraToFollowPoint` (3952) turns off following, tweens the scroll position over a duration with an ease, then re-enables following with `resetCamera` when it completes. `tweenCameraZoom` (3999) tweens the base zoom, either as a multiplier of the stage zoom or as a direct value (sets the target at 4011 when duration is 0). `resetCamera` (3918) cancels tweens, re-attaches following, optionally resets zoom and can snap with `focusOn` (3937).
- `FocusCameraSongEvent.handleEvent` (65) is the data-driven hook: an event carries x, y, a target (static position, player, opponent, girlfriend), duration and an ease, and sets the follow point to that character's focus point plus the offset. Nothing happens in minimal mode (71).

## 2. Key functions

- `PlayState.update` (decay block): `source/funkin/play/PlayState.hx` 1217-1227. Frame-rate independent decay and the zoom write.
- `PlayState.stepHit`: `source/funkin/play/PlayState.hx` 1834-1860. The beat-synced bop trigger and zoom cap.
- `PlayState.resetCamera`: `source/funkin/play/PlayState.hx` 3918-3938. Attach follow, reset, snap.
- `PlayState.tweenCameraToFollowPoint`: `source/funkin/play/PlayState.hx` 3952+. Manual tween with follow switched off.
- `PlayState.tweenCameraZoom`: `source/funkin/play/PlayState.hx` 3999+. Base-zoom tween.
- `FocusCameraSongEvent.handleEvent`: `source/funkin/play/event/FocusCameraSongEvent.hx` 65-110+. Events steer the follow point.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Camera chases an invisible follow point; gameplay only moves the point | Follow smoothing 0.04 (theirs, Constants.hx 696) |
| Zoom pulse: set a multiplier on an event, decay it to 1 with a frame-rate independent factor | Pulse 1.015 (Constants 241), decay base 0.95 per 1/60 s (PlayState 1217), HUD cap 1.35 (1848) |
| Pulse only on a rhythm: `(step + offset) % interval == 0` | Every 4 beats, offset 0, 4 steps per beat (Constants 246, 251, 424); the rhythm is music-specific, drop it |
| Events/data steer the follow point and zoom with duration + ease | Defaults live in FocusCameraSongEvent (names only read: DEFAULT_TARGET, DEFAULT_DURATION, DEFAULT_CAMERA_EASE) |

## 4. TypeScript sketch

simplified: position smoothing is an exponential approach with an explicit rate (the exact per-frame math inside HaxeFlixel's `followLerp` was not read); the rhythm trigger is replaced by an explicit `pulse()` call; no HUD camera, no tween objects (a tween is a timed lerp), no substate pause, no minimal mode.

```ts
// Licence: Apache-2.0 (donor). Own code written from the described mechanism.
interface Vec { x: number; y: number }

export class FightCamera {
  pos: Vec = { x: 0, y: 0 };
  target: Vec = { x: 0, y: 0 };
  baseZoom = 1;
  private bop = 1;
  constructor(private follow = 0.04, private decay = 0.95, private pulseSize = 1.015) {}

  focus(p: Vec): void { this.target = { ...p }; }
  pulse(size = this.pulseSize): void { this.bop = Math.max(this.bop, size); }

  update(elapsedSec: number): number {
    const dt = elapsedSec * 60;
    const k = 1 - Math.pow(1 - this.follow, dt);
    this.pos.x += (this.target.x - this.pos.x) * k;
    this.pos.y += (this.target.y - this.pos.y) * k;
    this.bop = 1 + (this.bop - 1) * Math.pow(this.decay, dt);
    return this.baseZoom * this.bop;
  }
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only module: fight camera follows a focus point and pulses on impact): checklist row 11 (fight camera); the pulse also serves row 10 (hit impact / hitstop). today: none read.
- Reuse tag: adapt-ok (Apache-2.0; keep notice if code is copied)
- Brief rule served: 1 (two clients: the camera is client-only, the engine never reads it); rules 7-9 n/a

## 6. Gaps and risks

- The list's evidence file was the wrong file; any earlier "camera" rating based on `FunkinCamera.hx` was about rendering, not camera control.
- Camera is client-side only. Per Brief rule 1 the engine must not depend on it; the same camera drives the Pit client and zone clients.
- Pulses here fire on music beats. Frankendom has no beat; the trigger should be hit events (damage taken/dealt, finisher), and the cap and decay must be tuned for many-on-one fights where hits are frequent, or the view will pump constantly.
- Follow point choice for many-on-one (target several attackers) is not in this donor; it follows one character at a time (only the static-position and player cases of the event switch were read, to line 110).
- The smoothing math inside HaxeFlixel `followLerp` was not read; the sketch's exponential form is our own choice.
