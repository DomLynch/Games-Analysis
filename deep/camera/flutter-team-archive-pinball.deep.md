# flutter-team-archive-pinball (camera, cell 14)

Donor: /mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/camera_zoom.dart | Licence: MIT | Dart | symbol CameraZoom
Symbol check: CameraZoom class (10), onLoad (29) and apply (37) confirmed on the VPS.

## 1. Mechanism
- CameraZoom is a Flame Effect. When it is added to the game, onLoad reads the current viewfinder zoom as the start value and sets the end value from the constructor.
- The effect's controller is built in the constructor (lines 14-19) with duration 0.4 and curve Curves.easeOut. Flame's Effect base class (not read here) is what calls apply each frame with a progress value from 0 to 1.
- apply(progress) sets the viewfinder zoom to the tween's value at that progress, so the zoom moves from start to end.
- completed is a Future that is already resolved if the controller has finished at the time it is read (lines 44-45); otherwise it resolves only when the effect is removed (onRemove, lines 52-56), not when the controller finishes, so a caller can await the zoom only up to removal.
- Inputs: target zoom value and the current zoom at load time. Output: viewfinder zoom each frame. Runs on the Flame frame update (Flame source not read); the controller duration is in seconds, so it is time-based.
- Caller (lib/game/behaviors/camera_focusing_behavior.dart, _zoomTo, lines 90-97): creates CameraZoom(value: focus zoom), and in completed.then moves the camera to the focus position, so the pan happens only after the zoom finishes. _snap (lines 83-87) is the instant variant: moveTo with speed 100 and a direct zoom assignment.

## 2. Key functions
- CameraZoom (pinball) | /mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/camera_zoom.dart | 10-57 | the effect class: 0.4 s ease-out controller and value.
- CameraZoom.onLoad (pinball) | /mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/camera_zoom.dart | 29-34 | records start (current zoom) and end (target) in a tween.
- CameraZoom.apply (pinball) | /mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/camera_zoom.dart | 37-39 | writes the tweened zoom each frame.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Time-based tween from current to target zoom with an ease-out curve | duration: 0.4 s (theirs; lines 16) and Curves.easeOut (theirs; line 17) |
| Awaitable completion: immediate if already finished, otherwise resolved on removal | none (algorithm) |

## 4. TypeScript sketch
simplified: the awaitable `completed` future (immediate if finished, else resolved on removal) is omitted; ease-out is a quadratic stand-in for Flutter's Curves.easeOut; cancel() has no donor counterpart (the donor ends via effect removal).

```ts
// Licence: MIT (flutter-team-archive-pinball). Sketch written from the mechanism; donor path cited above.
type Cam = { zoom: number };
// Quadratic ease-out as a stand-in. The donor uses Flutter's Curves.easeOut, which is a cubic bezier.
function easeOut(t: number): number { return 1 - (1 - t) * (1 - t); }

class ZoomTween {
  private elapsed = 0;
  private from: number;
  private done = false;
  constructor(private cam: Cam, private to: number, private duration = 0.4) {
    this.from = cam.zoom;                                  // start value read when the tween starts
  }
  update(dt: number): void {
    if (this.done) return;
    this.elapsed = Math.min(this.elapsed + dt, this.duration);
    const p = easeOut(this.elapsed / this.duration);
    this.cam.zoom = this.from + (this.to - this.from) * p;
    if (this.elapsed >= this.duration) this.done = true;
  }
  get finished(): boolean { return this.done; }
  cancel(): void { this.done = true; }
}
```

## 5. Lands in
- Frankendom target: src/fight/camera.ts, as a punch-in zoom tween (today: src/camera* (moving), which includes the camera kick; the zoom tween here must be merged into that one path, not added beside it).
- Parity row: 11 (fight camera, camera kick, standoff).
- Reuse tag: adapt (MIT; the tween is small enough to re-type in TypeScript)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- Zoom only: no follow, shake or pan.
- Flame's viewfinder and effect controller are the engine. The idea transfers; the classes do not.
- Uses the wall clock through the Flame frame. Frankendom must drive the tween from game time so a replay gives the same zoom.
- One engine, zones as data: a single zoom path in src/fight/camera.ts serving the Pit client and every zone; the existing camera kick (row 11) already exists, so this tween only adds a timed zoom-to-value, not a second camera.
- Camera zoom is presentation only: server-verified kills and the fight record (row 19) must not depend on it. MAX_ATTACKERS = 3 could set the standoff zoom target, but the donor has only a fixed per-state zoom table (focus data per game status).
