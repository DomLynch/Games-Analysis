# OpenRA-OpenRA (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Traits/World/ScreenShaker.cs` | Licence: GPL-3.0-or-later (file headers: "either version 3 of the License, or (at your option) any later version"; repo `COPYING` is GPL v3; copyleft, clean-room, shape only) | C# | symbol `ScreenShaker` (`ITick.Tick` line 44; `GetScrollOffset` line 68; `GetIntensity` line 81)

Checked: opened `ScreenShaker.cs` (all 98 lines), `ShakeOnDeath.cs` (lines 12-44, all), `ShakeScreenWarhead.cs` (all 35 lines), `Viewport.cs` 360-380 (the `Scroll` body), and the hint file `ExplosionOnDamageTransition.cs` (all 78 lines: a one-shot trigger when a damage state is crossed, `Impact`-ing a weapon; thin, not the topic's mechanism). Also read `LeaveSmudgeWarhead.cs` 12-75 (the decal path, see gaps). The hint file was not the best match: the screen shake is the real screen-effect mechanism. Callers of `ScreenShaker.AddEffect` were checked by grep: exactly two (`ShakeOnDeath.cs:41` and `ShakeScreenWarhead.cs:32`). Confidence: high on the offset, intensity, expiry and the order of steps (read in full); not read: the world tick rate, the world-units-per-cell constant (so the falloff distance is in unknown cell terms), the zoom path beyond the one `Scroll` line, and how the renderer uses the view centre. camera_scope: not a camera cell (screen effect); it does move the view centre, see gaps. Nothing was run.

Best transferable idea: Shake the view by a separate additive offset whose strength is the sum of nearby hits over squared distance, capped, and let each shake expire after a fixed number of ticks, so a many-on-one pile-on cannot shake the view harder than the cap.
Decision (proposed): adapt - keep the summed, capped, distance-weighted strength and the expiry in ticks; drive it from the server-verified hit and kill events on the client; keep the shake an offset that the camera's own follow never reads or writes; make duration, intensity and the cap data fields; replace the fixed sine/cosine pattern only if the hit direction must show.
Acceptance: a hit that lands close to the viewer shakes the view for its few ticks in a fixed pattern while a far hit barely moves it, and any number of simultaneous hits never moves the view by more than 30 units per axis (multiplier cap 3 times intensity cap 10).

## 1. Mechanism

- Storage. `AddEffect(time, position, intensity, multiplier)` appends an effect with `ExpiryTime = ticks + time` (ScreenShaker.cs:63-65). An effect is a duration in world ticks, an event position, an intensity and a per-axis multiplier.
- Order each world tick (`ITick.Tick`, line 44). (1) Remove every effect whose `ExpiryTime` equals the current tick (46). (2) If effects remain, compute the new offset (48, 68-73); otherwise the offset is zero. (3) Scroll the viewport by the change from the previous offset, with the map border check off (51; `Viewport.Scroll` at Viewport.cs:364-372 adds `1f / Zoom * delta` to the centre and clamps only when `ignoreBorders` is false). (4) Store the new offset as the previous one (52) and advance `ticks` (55).
- Offset. `GetScrollOffset = Multiplier * Intensity * (sin(ticks * 2pi / 4), cos(ticks * 2pi / 5))` (70-72). So the x axis has a period of 4 ticks and the y axis a period of 5 ticks. It is a fixed pattern, not noise, and it has no direction of its own.
- Multiplier. The multiplier is the sum of the live effects' multipliers, clamped per axis to `[MinMultiplier, MaxMultiplier]`, which default to (-3, -3) and (3, 3) (23-24, 77-78).
- Intensity. `intensity = 100 * 1024 * 1024 * sum(e.Intensity / |e.Position - viewCentre|^2)` (84-85), then `min(intensity, 10)` (87). So the strength falls with the square of the distance from the view centre, the terms add up across shakes, and the total is capped at 10.
- Sources. (a) `ShakeOnDeath` (Killed notify): if the trait's death-type list is empty or overlaps the damage types, it adds an effect at the dying actor's centre with duration 10 ticks and intensity 1 by default (ShakeOnDeath.cs:22-23, 36-41). (b) `ShakeScreenWarhead`: a warhead adds an effect with its own duration, intensity and multiplier (ShakeScreenWarhead.cs:22, 25, 28, 32); its defaults are 0, so it does nothing unless the ruleset sets them.

## 2. Key functions

- `ScreenShaker.Tick` (step): `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Traits/World/ScreenShaker.cs` 44-56.
- `ScreenShaker.AddEffect`: same file, 58-66.
- `ScreenShaker.GetScrollOffset` and `GetMultiplier`: same file, 68-79.
- `ScreenShaker.GetIntensity`: same file, 81-88.
- `ShakeOnDeath.Killed`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/ShakeOnDeath.cs` 36-42.
- `ShakeScreenWarhead.DoImpact`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Warheads/ShakeScreenWarhead.cs` 30-33.
- `Viewport.Scroll`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/Viewport.cs` 364-372.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Expire a shake when its tick comes up (fixed tick count) | Death shake 10 ticks (ShakeOnDeath.cs:22); warhead default 0 (ShakeScreenWarhead.cs:22) |
| Strength = sum over hits of intensity / squared distance to the view centre | Scale 100 x 1024 x 1024 (ScreenShaker.cs:84); death intensity 1 (ShakeOnDeath.cs:23) |
| Cap the summed strength | Cap 10 (ScreenShaker.cs:87) |
| Per-axis clamp on the summed multiplier | Min -3, max 3 (ScreenShaker.cs:23-24) |
| Fixed oscillation, add only the change each tick | Periods 4 (x) and 5 (y) ticks (ScreenShaker.cs:71-72) |
| Worst-case offset (derived: 3 x 10) | 30 units per axis (not run) |

## 4. TypeScript sketch

simplified: keeps the donor order inside one world tick (expire, sum multipliers and distance-weighted intensities, clamp, oscillate, move the view by the change only, advance the tick). Two differences from the donor, both noted at the code: the sketch removes an effect when its expiry is at or before the tick (the donor removes only on equality, so a negative duration would never expire there), and it floors the squared distance at 1 to avoid division by zero (the donor does not guard it). It also uses a symmetric clamp (the donor's min and max are separate data, default -3 and 3). It omits the death-type filter, the warhead source, the world-units-per-cell constant (the donor's distance is in its own units), the zoom factor on the scroll, and the border clamp (the donor skips it here as well, so the sketch matches that).

```ts
// Licence: GPL-3.0-or-later (donor, OpenRA). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const MULT_LIMIT = 3;                        // per-axis clamp on the summed multiplier (donor: min/max data, default -3..3)
const INTENSITY_SCALE = 100 * 1024 * 1024;   // donor constant, applied to intensity / squared distance
const INTENSITY_CAP = 10;                    // cap on the summed intensity, px

interface ShakeEffect {
  expiryTick: number;
  x: number;                                 // event position, world units
  y: number;
  intensity: number;
  mult: { x: number; y: number };
}

interface View { cx: number; cy: number; }   // view centre, world units

class ScreenShake {
  private effects: ShakeEffect[] = [];
  private tick = 0;
  private prevX = 0;
  private prevY = 0;

  constructor(private readonly view: View) {}

  add(durationTicks: number, x: number, y: number, intensity: number, mult = { x: 1, y: 1 }): void {
    this.effects.push({ expiryTick: this.tick + durationTicks, x, y, intensity, mult });
  }

  // Once per game tick (fixed step). Moves the view by the change in the shake offset only, so the view's own logic is untouched.
  step(): void {
    this.effects = this.effects.filter(e => e.expiryTick > this.tick);
    let nx = 0, ny = 0;
    if (this.effects.length > 0) {
      let mx = 0, my = 0, sum = 0;
      for (const e of this.effects) {
        mx += e.mult.x; my += e.mult.y;
        const dx = e.x - this.view.cx, dy = e.y - this.view.cy;
        const d2 = Math.max(dx * dx + dy * dy, 1); // floored at 1 to avoid division by zero
        sum += e.intensity / d2;
      }
      const k = Math.min(INTENSITY_SCALE * sum, INTENSITY_CAP);
      const gx = Math.max(-MULT_LIMIT, Math.min(MULT_LIMIT, mx));
      const gy = Math.max(-MULT_LIMIT, Math.min(MULT_LIMIT, my));
      nx = gx * k * Math.sin((this.tick * 2 * Math.PI) / 4); // fixed pattern: period 4 ticks on x
      ny = gy * k * Math.cos((this.tick * 2 * Math.PI) / 5); // period 5 ticks on y
    }
    this.view.cx += nx - this.prevX;
    this.view.cy += ny - this.prevY;
    this.prevX = nx; this.prevY = ny;
    this.tick++;
  }
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS (the block in a file, `export {}` appended) exited 0.

## 5. Lands in

- TARGET `src/fight/screen-fx.ts` (new client module: additive view offset for hit, finisher and death shakes, driven by the server-verified events; the view adds it after its own follow, and nothing in the fight step reads it). Not checked against the Frankendom repo (I did not open it).
- Parity-checklist row 10 (hit impact/hitstop). The offset is also a view change, so row 11 (fight camera) is touched, but the cited row for this note is 10.
- today: no equivalent (not checked against the repo).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: client-only presentation (the shake never changes game state); zones or weapons as data for duration and intensity; server-verified events are the only trigger.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- The shake shares the view centre with the camera (Viewport.cs:367 changes `CenterLocation`). The owner's world-camera work must not inherit a shake silently: keep the shake as a separate term that is added after the camera's own follow and never read back by it. This is the one place in this donor where a screen effect touches the camera.
- Tick-based timing. The shake runs once per world tick (ScreenShaker.cs:44), not per render frame. On Frankendom's fixed-step fight that is deterministic; on a variable-frame client the shake would stutter unless it is stepped at the fight rate. Decide which clock owns it and write it down.
- Edge cases in the donor: a negative duration never expires (ScreenShaker.cs:46 removes only on equality); a zero distance with zero intensity gives NaN (ScreenShaker.cs:85, no guard). Frankendom must validate duration at zero or more and guard the division.
- The fixed sine and cosine pattern has no hit direction. A directional kick (for a finisher or a heavy hit) is a different shape; do not claim it from this donor.
- Capping the sum at 10 means a pile-on saturates instead of stacking forever. That is the behaviour a many-on-one fight wants, and it is a data field, not a constant, in Frankendom.
- Decal path (not this cell's verdict). `LeaveSmudgeWarhead.cs` 42-72 places a per-tile smudge on terrain, with a chance roll (`Chance < world.LocalRandom.Next(100)`, line 42) over an annulus of tiles, and skips air hits above `AirThreshold` (48). The smudge layer itself (`SmudgeLayer`) was not read. This is the closest donor line for row 8 decals and should be a separate candidate.
- Finishers and blood: `ExplosionOnDamageTransition.cs` fires once when a damage state is crossed (`e.PreviousDamageState < Info.DamageState`, line 68), which is a usable finisher trigger shape but has no finisher animation or gore in it.
- Not read: the world tick rate, the world-units-per-cell constant (the falloff distance is in unknown cell terms), the zoom path beyond line 367, and how the renderer uses the view centre.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN. All verified (Tick 44-56, AddEffect 58-66, offsets, multiplier clamp, intensity formula, ShakeOnDeath/ShakeScreenWarhead defaults, two AddEffect callers, Viewport.Scroll, smudge chances, GPL v3-or-later).
- Missed: none. The zero-distance NaN claim holds for zero intensity; positive intensity gives +inf, capped to 10.
