# FunkinCrew-Funkin (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/effects/IntervalShake.hx` | Licence: Apache 2.0 (LICENSE.md line 3: "licensed under the Apache 2.0 license") | Haxe | symbol `IntervalShake.shake`

Checked: `IntervalShake.hx` read in full, lines 1-241 (verified). Callers read: `FreeplayState.hx` lines 1210, 1284, 1314, 1331 (call lines only). Note-splash pool read in part: `Strumline.hx` 1073-1110 and 1226-1250, `NoteSplash.hx` 1-60 (not written up). `LICENSE.md` 1-6 read. Topic fit, stated plainly: the donor has no blood, wound, decal, gore, finisher or hitstop code. A grep of `source/**/*.hx` for blood, gore, decal, splatter, wound, finisher, execut, hitstop, particle and shake found only this shake, the note-splash effects, and UI sparkles. Confidence: high on the `IntervalShake` arithmetic and order of steps. Medium-high on the last-tick claim, which depends on `FlxTimer` loop counting (flixel source not in the donor, not read).

Best transferable idea: a hit impact is a short decaying offset on the struck thing, with the intensity and duration as data, that always returns to its rest position on completion and on stop.
Decision (proposed): adapt - take the decay shape, the restore-on-end and restore-on-stop, and the amplitude as a fraction of the target's size, but apply it to a client-only presentation offset on the hit target or HUD card, never to the position the engine uses for hits; reject the sprite-position form and the ignore-a-second-call rule. Why: impact feedback is pure presentation under our one-engine rule, and the donor's simple decay recipe is clean and tunable; the donor's re-entry rule would drop a bigger hit that lands during a small one.
Acceptance: a landed heavy hit shakes the struck fighter's presentation offset for 0.3 s, with intensity falling fastest at the start and reaching zero at the end, and the offset returns exactly to rest; a client test asserts the offset equals rest after completion and after stop(), and that a stronger hit during a shake raises the intensity rather than being ignored.

## 1. Mechanism

- One call starts a decaying shake on one sprite. The sprite's position is moved on a fixed interval (not every frame). Inputs: the object, a duration in seconds, an interval in seconds, a start intensity, an end intensity, an ease, and optional completion and progress callbacks (38-39).
- Order of steps on a call: if the object is already shaking, return the existing shake and ignore the new arguments (41-52). An interval of zero or less becomes `FlxG.elapsed` (54-57). Take a pooled shake object, start it, and bind it to the object in a map (59-61).
- `start()`: remember the object's current position as the rest offset (167), set elapsed to 0 (170), and start an `FlxTimer` at the interval with loops = `Std.int(duration / interval)` (171).
- Each tick (`shakeProgress`, 201): add one interval to elapsed seconds (203); progress = elapsed / duration, with no clamp (204); if an ease is set, scale = 1 - ease(progress) (205-209); intensity = lerp(end, start, scale) (212). So the intensity starts at the start value and falls to the end value. With `FlxEase.quadOut` (used at FreeplayState 1210, 1284, 1314, 1331) the fall is fastest at the start, from the formula (the ease's own definition was not read).
- Offset: x = rest x + a random value between minus and plus (intensity x object.width) (214); y uses the same width term, not height (215). Both axes are shaken on every tick (`axes` defaults to XY, 169).
- Every tick calls the progress callback if set (219).
- After the last tick (line 221: loops above zero and loopsLeft equal to zero): the offset is reset to the rest position (223-224), the completion callback runs (225-228), and the shake is released to the pool only if the timer is still the same one (230). The last tick writes a new offset (214-215) and then resets it inside the same callback, so the last written offset is never drawn.
- `stop()`: cancel the timer (179), restore the rest offset (181-182), release (183).
- Release: remove the object from the map and put the shake back in the pool (189-193).

## 2. Key functions

- `IntervalShake.shake`: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/effects/IntervalShake.hx` 38-61. Entry point; re-entry rule at 41-52.
- `IntervalShake.start`: same file, 158-172. Rest offset (167), timer and loop count (171).
- `IntervalShake.shakeProgress`: same file, 201-232. The per-tick offset (203-216) and the end-of-shake reset and callback (221-231).
- `IntervalShake.stop` and `release`: same file, 177-193.
- Callers, read as call lines only: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/ui/freeplay/FreeplayState.hx` 1210 (0.3 s, interval 1/30, start 0.1, end 0, quadOut); 1284 (0.6 s, interval 1/24, start 0.12); 1314 and 1331 (start 0.12 divided by distance + 1). Only the first caller of each type was checked for the callback chain.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Intensity decays from a start value to an end value, shaped by an ease on elapsed time | Ease is `quadOut` at both shake sites (FreeplayState 1210, 1284) (theirs) |
| Amplitude is a fraction of the target's width, applied to both axes | Start 0.1 (1210), 0.12 (1284), 0.12 / (distance + 1) (1314, 1331); end 0 at every call site (theirs) |
| Offsets are re-drawn on a fixed interval, not every frame | Default interval 0.04 s (38); 1/30 s (1210), 1/24 s (1284) (theirs) |
| Tick count = floor(duration / interval) | Duration 0.3 s (1210), 0.6 s (1284) (theirs) |
| Restore the rest position on completion and on stop | None (the rule) |
| One shake per object; a second call returns the first | None (the rule, line 41-52) |

Tick counts, checked in Python: 0.3 / (1/30) = 9.0, so 9 ticks, and the last one is never drawn, so 8 visible steps at FreeplayState 1210. 0.6 / (1/24) = 14.4, so 14 ticks, 13 visible, at FreeplayState 1284.

## 4. TypeScript sketch

simplified: keeps the donor's order (advance time, eased scale, lerp intensity, offset from width on both axes, restore on the last step, and the restore on stop). It omits the per-object pool and map, the one-shake-per-object rule, the progress and completion callbacks, the `axes` switch, the `FlxTimer`, and any handling of zero duration (the donor has none; the sketch throws instead, see Gaps). It keeps the donor's use of width for the y axis on purpose, so the gap is visible.

```ts
// Licence: Apache-2.0 (donor, LICENSE.md). Shape only, written from the mechanism; not a line-by-line translation.
export interface Shakable {
  x: number;
  y: number;
  width: number;
}

export interface ShakeSpec {
  duration: number;            // seconds
  interval: number;            // seconds per step
  startIntensity: number;      // fraction of target width
  endIntensity: number;        // fraction of target width
  ease: (t: number) => number; // maps 0..1 to 0..1, e.g. quadOut
  random: () => number;        // uniform in [0, 1)
}

export class IntervalShakeSketch {
  private readonly restX: number;
  private readonly restY: number;
  private readonly totalSteps: number;
  private steps = 0;
  private seconds = 0;
  private done = false;

  constructor(private readonly target: Shakable, private readonly spec: ShakeSpec) {
    if (!(spec.duration > 0) || !(spec.interval > 0)) {
      throw new Error("duration and interval must be positive");
    }
    this.restX = target.x;
    this.restY = target.y;
    this.totalSteps = Math.floor(spec.duration / spec.interval);
  }

  // Call once per interval. Returns false once the shake has ended and the rest position is restored.
  step(): boolean {
    if (this.done) return false;
    this.steps += 1;
    this.seconds += this.spec.interval;
    const progress = this.seconds / this.spec.duration;
    const scale = 1 - this.spec.ease(progress);
    const intensity = this.spec.endIntensity + (this.spec.startIntensity - this.spec.endIntensity) * scale;
    const amp = intensity * this.target.width;
    this.target.x = this.restX + (this.spec.random() * 2 - 1) * amp;
    this.target.y = this.restY + (this.spec.random() * 2 - 1) * amp;
    if (this.steps >= this.totalSteps) {
      this.restore();
      return false;
    }
    return true;
  }

  stop(): void {
    this.restore();
  }

  private restore(): void {
    this.target.x = this.restX;
    this.target.y = this.restY;
    this.done = true;
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hit-feedback.ts` (new, client-only presentation helper; the engine never reads it). It is driven by a server-verified hit event and offsets the struck fighter's presentation or the HUD hit card, not the camera (the camera section is out of scope here). Parity-checklist row 10 (hit impact/hitstop).
- today: not read (no Frankendom source was opened in this task).
- Reuse tag: adapt-allowed (Apache 2.0: keep the licence notice; do not use the "Friday Night Funkin'" name, logo or trademarks, see LICENSE.md line 6)
- Brief rule served: 1 (one engine: the shake is a client presentation of an engine-verified hit and the engine does not read it); rules 7-9 n/a

## 6. Gaps and risks

- Rest position is captured once (167) and restored on completion and stop (181, 223-224). If anything else moves the object during the shake, the reset snaps it back to the old spot. Frankendom must keep a visual-only offset on top of the authoritative position, and never write the position the hit test reads.
- One shake per object (41-52): a second call returns the first and ignores its intensity. A bigger hit landing during a small shake does nothing. We need a max-of-intensity rule and a restart of duration, which the donor does not have.
- Zero duration is documented as "forever" (line 29), but line 204 divides by duration, so the scale becomes non-finite. What `FlxEase` does with an infinite input was not read. Frankendom should reject zero, as the sketch does.
- Both axes use `object.width` (215). A straight port scales the vertical shake by the wide dimension. Frankendom should state the basis for each axis and test it.
- The last tick is written and then reset in the same callback (214-224), so the final offset is never drawn. Plan the step count as floor(duration / interval) minus one visible step, or drop the last write.
- Time is accumulated interval, not measured time (203). A stalled client frame does not extend the shake. This is fine for presentation; do not reuse it for anything that needs real time.
- Pooling and a cap: the donor pools shake objects (18, 189-193). The note-splash pool (`Strumline.hx` 1233) fills to a cap of six (line 48) and then reuses the first available splash. That is the other hit-spark mechanism; it was read in part and is not written up.
- Not read: `FlxTimer` (how loops and loopsLeft count, and whether the first tick waits one interval), `FlxEase.quadOut`, `FlxMath.lerp` (the sketch assumes end + (start - end) x t), and `FlxG.random.float` (assumed min + r x (max - min)). These are flixel sources not in the donor.
