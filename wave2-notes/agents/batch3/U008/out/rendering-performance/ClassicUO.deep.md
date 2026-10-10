# ClassicUO (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/GameController.cs` (with `ClassicUO.Client/Game/Constants.cs`, `Configuration/Profile.cs`, `ClassicUO.Client/Game/GameObjects/Mobile.cs`, `ClassicUO.Renderer/Batcher2D.cs`) | Licence: BSD-2-Clause (SPDX header on GameController.cs line 1; LICENSE.md; permissive, adaptable) | C# (MonoGame/XNA) | symbol `GameController.Update` (381) with `SetRefreshRate` (208) and `Draw` (464)

Checked: Opened GameController.cs 208-237 (SetRefreshRate), 381-446 (Update: loop, accumulator, suppressed draw), 464-560 (Draw and the BeginDraw override at 556-558); Constants.cs 9-10; Profile.cs 260; Mobile.cs 733-748 (movement uses the half-frame value); Batcher2D.cs 14-30, 1059-1085, 1124-1140, 1279-1320 (sprite batch capacity, growth and flush). Candidates also checked: Profile.cs and Mobile.cs as above; World.cs was only grepped for culling (object removal beyond view range at 305, 359), not read in full. Confidence: high on the frame pacing (read end to end, the numbers in section 3 are from the code). Medium on the sprite batcher (partly read, not sketched). Not read: MonoGame's `SuppressDraw` internals (framework code), `Scene.Draw` and the render-target stack. camera_scope: not applicable (rendering topic, not a camera).

## 1. Mechanism

- Two loops share one thread. Game logic and UI update on every MonoGame `Update` call; the loop tick is bounded by `TargetElapsedTime` = 1000/250 ms = 4 ms with `IsFixedTimeStep = false` (`GameController.cs` 61-62), which is what makes the draw accumulator meaningful. Drawing is paced by a separate accumulator.
- `SetRefreshRate(rate)` (208): clamps the rate to 12..250 (Constants.cs 9-10). Rate 12 is special-cased to an 80 ms draw interval (224), treating 12 as 12.5 fps. Any other rate gives `1000 / rate` ms (228). The half-interval `FrameDelay[1]` is the draw interval truncated to whole ms, shifted right by one (231-232). The draw interval goes into `_intervalFixedUpdate[0]` (236). The unfocused interval is a fixed 217 ms, about 4.6 draws per second (237).
- `Update` (381), in order:
  1. Set `Time.Ticks` and `Time.Delta` from game time (388-389); process packets; run `Scene.Update()` (404). This runs every loop tick, it is not gated by the accumulator.
  2. Add the elapsed ms to `_totalElapsed` (410).
  3. Choose the interval: `_intervalFixedUpdate[1]` (217 ms) when the window is inactive and `ReduceFPSWhenInactive` is set (default true, Profile.cs 260); otherwise `[0]` (421-428).
  4. If `_totalElapsed > x`, the draw is due: `_totalElapsed %= x` (430-432). The modulo keeps the leftover ms, so the phase does not drift.
  5. Else the draw is suppressed: `_suppressedDraw = true` and `SuppressDraw()` (436-437), then `Thread.Sleep(1)` unless the game is running slow (439-441).
  6. `UO.GameCursor` and `Audio.Update()` run every tick (446), after the draw decision.
- `BeginDraw` (556) returns false when `_suppressedDraw` is set (558), so a suppressed tick skips `Draw`. `Draw` (464) clears, draws `Scene.Draw` (489), then the UI and the cursor, and counts `_totalFrames` for the FPS readout.
- `Mobile.ProcessSteps` (around 743): the movement step is removed when its delay reaches `TimeToCompleteMovement - FrameDelay[1]`, so a walk finishes half a frame before the next step is needed.
- Sprite batch (Batcher2D.cs): `MAX_SPRITES = 0x800` (19). Capacity grows by 0x800 when full (1059-1085, 1124-1133). `Flush` (1279) draws the queue in chunks of at most 0x800 sprites (1292, 1313), and inside each chunk draws runs of consecutive sprites that share a texture, counting a switch each time the texture changes.

## 2. Key functions

- `GameController.SetRefreshRate`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/GameController.cs` 208-237.
- `GameController.Update`, frame accumulator: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/GameController.cs` 381-446 (accumulator at 410 and 430-441).
- `GameController.BeginDraw` override: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/GameController.cs` 556-558.
- `UltimaBatcher2D.Flush`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Renderer/Batcher2D.cs` 1279-1320 (partly read: the chunk loop and texture runs).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Draw cap as an interval, rate clamped | Clamp 12..250 fps (Constants.cs 9-10); 12 fps treated as 80 ms (GameController.cs 224) |
| Accumulator with remainder carry (`acc % interval`) | None (the modulo) |
| Logic every tick, draw paced | Logic not gated (404); draw gated (430) |
| Background throttle | 217 ms (about 4.6 draws per second) when inactive (GameController.cs 237) |
| Movement half-interval (only movement uses it; the one animation use is commented out, `BoatMovingManager.cs` 234) | Draw interval in whole ms, shifted right by one (GameController.cs 231-232; Mobile.cs 743) |
| Sprite batch chunk | 0x800 sprites (Batcher2D.cs 19) |

## 4. TypeScript sketch

simplified: the sketch keeps the accumulator with remainder carry, the rate clamp with the 12-fps special case, the unfocused interval and the half-interval. It drops the 1 ms sleep (a browser loop is paced by requestAnimationFrame, so the sleep has no place), the suppressed-draw flag and the MonoGame draw hooks, the `IsRunningSlowly` check, the packet and scene update, the FPS counter, and the Audio and cursor update. The demo is a real run on the VPS: 60 focused ticks at 4 ms and 60 unfocused ticks at 4 ms gave 15 draws in total (the split between focused and unfocused was not printed).

```ts
// Licence: BSD-2-Clause (donor ClassicUO). Clean-room sketch of the described mechanism, not a line-by-line translation.
// Logic runs on every loop tick; only the draw is paced.

// Donor clamp is 12..250 fps. 12 is treated as 12.5 fps (80 ms), as in the donor.
export function frameDelays(rate: number, minFps = 12, maxFps = 250): { drawMs: number; halfMs: number } {
  const r = Math.min(maxFps, Math.max(minFps, rate));
  const drawMs = r === minFps ? 80 : 1000 / r;
  const whole = Math.floor(drawMs);
  return { drawMs, halfMs: Math.floor(whole / 2) };
}

export class FramePacer {
  private acc = 0; // ms carried between loop ticks

  constructor(private readonly inactiveMs = 217) {}

  // Call once per loop tick with the elapsed ms. Returns true when a draw is due.
  tick(elapsedMs: number, drawMs: number, focused: boolean, reduceWhenInactive: boolean): boolean {
    const interval = !focused && reduceWhenInactive ? this.inactiveMs : drawMs;
    this.acc += elapsedMs;
    if (this.acc > interval) {
      this.acc = this.acc % interval; // keep the remainder so the phase does not drift
      return true;
    }
    return false;
  }
}

// Demo: 60 fps target, 4 ms loop ticks, then the window loses focus.
const { drawMs, halfMs } = frameDelays(60);
const pacer = new FramePacer();
let draws = 0;
for (let i = 0; i < 120; i++) {
  if (pacer.tick(4, drawMs, i < 60, true)) draws++;
}
console.log(drawMs.toFixed(2), halfMs, draws);
export {};
```

## 5. Lands in

- TARGET `src/fight/pacing.ts` (new, client-only draw pacer, proposed; the Frankendom tree was not checked in this pass). Parity-checklist row 16 (colour grade and quality), the nearest row: no row covers frame pacing. Lead should decide whether pacing gets its own row. The fight step itself stays on the engine tick and is not paced by this.
- Reuse tag: adaptable (BSD-2-Clause, so code may be adapted; this sketch is clean-room)
- Brief rule served: rule 1 (one engine; the draw is a client view of the engine state, and pacing never changes the engine step); row 16 chosen by nearest topic.

## 6. Gaps and risks

- The browser already paces draws with requestAnimationFrame. The donor's useful part is the remainder carry and the separation of logic from draw. The 1 ms sleep and the draw-suppress flag have no browser equivalent and should not be ported.
- The unfocused-window throttle does not map cleanly. A hidden tab stops rAF on its own, and the server keeps ticking. Frankendom should rely on the server tick for the fight, not on the draw rate.
- Logic is variable step here (`IsFixedTimeStep = false`, line 61). Frankendom's fight step is server-owned and fixed. The client must never advance the fight step from the draw clock; the accumulator only decides when to draw.
- Movement uses a half-frame early finish (Mobile.cs 743). A similar shortcut would couple movement to the draw rate, which breaks server-verified positions. Do not copy it.
- Sprite batching (Batcher2D.cs 1279-1320) is a separate, possibly transferable mechanism (chunk at 2048 sprites, draw runs by texture). It was read only in part and is not sketched here. Treat it as a second candidate, not part of this verdict.
- Not read: World.cs object removal beyond view range (305, 359, only grepped), `Scene.Draw`, the render-target stack, and the shader path.

Best transferable idea: Run game logic on every loop tick and pace only the draw, carrying the leftover milliseconds into the next draw so the frame cadence does not drift.
Decision (proposed): adapt — take the remainder-carry draw cap as a client quality setting, with the fight step on the server tick; reject the 1 ms sleep, the draw-suppress flag and any pacing of movement or the fight step by the draw clock.
Acceptance: With the draw cap set to 30 fps, the client draws 30 frames in one second while input and the fight state advance on every loop tick (test counts ticks and draws over one second and asserts the fight step count is independent of the draw count).
Reuse tag: adaptable (BSD-2-Clause; clean-room sketch)
Brief rule served: rule 1 (one engine; the draw is a view and pacing never changes the engine step); rule 8 (target + row 16, nearest)


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Table row 'Animation and movement half-interval' - only Mobile.cs:743 (movement) uses FrameDelay[1]; grep finds no animation use (BoatMovingManager.cs:234 has it commented out). Otherwise verified: SetRefreshRate 208-237 (clamp 12..250 at Constants 9-10, 12 -> 80 ms at 224, 1000/rate at 228, FrameDelay[1]=>>1 at 231-232, interval[0] 236, 217 at 237 whose comment says '5 FPS'; 4.6/s arithmetic is right), Update order 388-446 (Scene.Update 404, _totalElapsed 410, interval choice 421-427, > then %= at 430-432, SuppressDraw 436-437, Sleep(1) unless IsRunningSlowly 439-441, cursor/audio 445-446), ReduceFPSWhenInactive default true (Profile.cs 260), BeginDraw 556-558, Draw 464/489, IsFixedTimeStep=false at 61, Batcher MAX_SPRITES 0x800 (19), grow 1076/1133, Flush 1279-1321 (chunk 1292, 1313), BSD-2 SPDX on line 1. Demo claim '15 draws' reproduced (python re-run = 15).

**Missed:** GameController.cs:62 TargetElapsedTime = 1000/250 ms (4 ms): the loop-tick rate that bounds logic frequency and makes the accumulator meaningful is never stated; it is the main number missing from the 'logic every tick' claim. UIManager.Update (408) and packet parse (393-397) are also in the unconditional part of Update.
