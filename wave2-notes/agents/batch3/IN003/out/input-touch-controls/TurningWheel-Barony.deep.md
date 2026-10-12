# TurningWheel-Barony (input-touch-controls, cell 3)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/player.cpp` (with `player.hpp`, `actplayer.cpp`, `input.cpp`) | Licence: BSD-2-Clause ("This open source release of Barony is licensed under the BSD 2-Clause License", `LICENSE.txt` line 3; "Copyright (c) 2013-2020, Turning Wheel LLC") | C++ | symbol `GameController::getRawLeftXMove` (with `getLeftXPercentForPlayerMovement`)

Checked: Read in full: `getRawLeftXMove` (player.cpp 587-614, the left-stick deadzone); `getRawLeftYMove` read in part (617-643; the lines I saw mirror the X function, 629 and 636-641), `getLeftXPercent`, `getLeftYPercent`, `maxLeftXMove` / `maxLeftYMove` (772-784), `getLeftXPercentForPlayerMovement` / `getLeftYPercentForPlayerMovement` (745-770), the defaults (player.hpp 74, 319-329), the living-player stick-to-force and velocity lines (actplayer.cpp 4596-4683 and 4795-4798; part of the function read, the weight and speed terms not read). Read in part: the right-stick deadzone code in `GameController` (player.cpp 300-313, 390-411, 455-505); the binding analog path (input.cpp 18-22 and 1020-1105, PC branches and the Switch branch). Settings: menu default 25 and the percent-to-raw conversion (ui/MainMenu.cpp 576, 2821); console cycling of the stick types (interface/consolecommand.cpp 3742-3753, grep). Callers checked by grep: `getLeftXPercentForPlayerMovement` is used at actplayer.cpp 124-125, 222-227 (ghost path), 4087-4088, 4167-4189, 4662-4671 (living player); `BUTTON_ANALOG_REPEAT_TICKS` has no use anywhere in `src` (grep). Not read: `getSpeedFactor` and `getCurrentMovementSpeed` (weight and DEX), `defendSpeed`, the ghost (spirit) movement path (actplayer.cpp 100-270), the consumers of the right-stick outputs (`oldFloatRightX`, `oldAxisRightX`), the menu cursor code, the Nintendo branches. Confidence: high on the arithmetic and on the defects below (computed from the code, not run); medium on what the right stick drives in aim mode (consumers not read). Camera scope: not a camera topic (n/a).

Best transferable idea: A phone stick reaches full speed before full throw (0.7 of the throw after the deadzone), reverses at a quarter speed, and keeps separate forward and strafe rates whose summed velocity is capped at the forward rate.
Decision (proposed): adapt — the full-speed thresholds, reverse ratio and 2:1 forward-to-strafe ratio are the data a small phone stick needs; the per-axis deadzone gives an 11.8% diagonal boost and the binding path steps from 0 to 0.2, so the deadzone shape comes from STJr-SRB2 (cell 1) and the velocity is capped.
Acceptance: On a 375-wide phone with a 25% deadzone, a thumb at half throw up moves forward at about 48% speed, full speed is reached at about 77% of throw, and a full 45 degree push is no faster than a full straight push; a test asserts the summed velocity never exceeds fwdRate times speedFactor for any stick input.

## 1. Mechanism

- Left stick → movement, per tick. `getRawLeftYMove` and `getRawLeftXMove` read the SDL axis and apply the deadzone only when the type is per-axis (default, player.hpp 319; player.cpp 599). Inside the band (|raw| < deadzone) the value is 0 (601-604). Outside, the deadzone is subtracted from the magnitude, keeping the sign (605-612): `x += dz` on the negative side, `x -= dz` on the positive side. Then the Y invert (614 and its Y twin).
- Rescale to a fraction: `getLeftXPercent` = raw / `maxLeftXMove`, where `maxLeftXMove` = 32767 minus the deadzone when per-axis (781). So a stick at full throw is 1.0 and the band edge is 0.
- Asymmetric full-speed thresholds: `getLeftXPercentForPlayerMovement` divides a positive value by `x_forceMaxForwardThreshold` (0.7, player.hpp 327) and clamps to 1 (750). A negative value is divided by `x_forceMaxBackwardThreshold` (0.5, 328) and clamped to -1 (754). `getLeftYPercentForPlayerMovement` divides both signs by `y_forceMaxStrafeThreshold` (0.7, 329; 763 and 767). So full speed is reached before the stick is fully pushed.
- Living player: `x_force` and `y_force` take those values (actplayer.cpp 4662, 4671). A negative `y_force` is multiplied by `backpedalMultiplier` (0.25, 4611; 4680). `x_force` is multiplied by `lateralMultiplier` (1.0, 4612; 4683). Equipment modifiers can raise the backpedal to 0.75 and the lateral to 1.5 (4616-4620; the condition was not read), and one branch sets lateral to 0 (4626).
- Velocity, one tick: `vel += y_force * cos(yaw) * 0.045 * speedFactor / defendSpeed` (4795) and `vel += x_force * cos(yaw + PI/2) * 0.0225 * speedFactor / defendSpeed` (4797). Forward is twice as strong as strafe. `speedFactor` and `defendSpeed` come from the weight and DEX code (not read).
- Binding path: `analogOf` reads a half axis (positive or negative), takes it as 0 to 1 and applies `fabs(result) > deadzone ? result : 0` with a fixed deadzone of 0.2 (input.cpp 18). On PC this is the SDL controller axis branch (1082, 1085) and the SDL joystick axis branch (1099, 1102); line 1073 is the Switch branch. There is no rescale: the value jumps from 0 to just over 0.2. Turn and look use these analog bindings only when no controller is attached (actplayer.cpp 1946-1948 and 2022-2023 skip them when `hasController` is true).
- Right stick (aim and menu) with a controller: the `GameController` path (player.cpp 300-505), default type `DEADZONE_MAGNITUDE_HALFPIPE` (player.hpp 320). The branch at 312 separates the non-aim case (radial menu or virtual mouse, radial code at 390-411, ends by setting `lastMovementFromController`) from the aim case (455-505). Consumers of the outputs were not read.

## 2. Key functions

- `GameController::getRawLeftXMove` (and Y twin): `/mnt/frankendom-donors/TurningWheel-Barony/src/player.cpp` 587-614 and 617-643. Per-axis deadzone with a sign-preserving shift.
- `getLeftXPercent`, `maxLeftXMove`: `/mnt/frankendom-donors/TurningWheel-Barony/src/player.cpp` 772-784. Rescale: raw / (32767 - deadzone).
- `getLeftXPercentForPlayerMovement`, `getLeftYPercentForPlayerMovement`: `/mnt/frankendom-donors/TurningWheel-Barony/src/player.cpp` 745-770. Full-speed thresholds and clamp.
- Living movement: `/mnt/frankendom-donors/TurningWheel-Barony/src/actplayer.cpp` 4596-4683 (stick to force), 4795-4798 (velocity).
- Binding analog: `/mnt/frankendom-donors/TurningWheel-Barony/src/input.cpp` 1020-1073 (`analogOf`, fixed 0.2).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Deadzone band, then rescale to 0..1 at full throw | Left deadzone 8000 raw of 32767 = 24.4% (player.hpp 74); menu default 25% (ui/MainMenu.cpp 576, converted at 2821 as 320 x percent, clamped 5 to 50) |
| Full speed at a stick fraction below full throw | Forward and reverse: 0.7 (player.hpp 329, donor name "strafe", applied to the vertical axis). Strafe right: 0.7 (327, donor name "forward", applied to x positive). Strafe left: 0.5 (328, donor name "backward", applied to x negative). Names are wrong; see defect 2 |
| Reverse speed | 0.25 (actplayer.cpp 4611) before equipment changes |
| Per-tick velocity, forward and strafe | 0.045 and 0.0225 (actplayer.cpp 4795, 4797), speedFactor and defendSpeed multiply both |
| Binding deadzone, no rescale | 0.2 (input.cpp 18; applied at 1082, 1085, 1099, 1102) |

Worked numbers (computed by hand from the code; deadzone 8000, full 32767, range after deadzone 24767):

| Stick input | Fraction after deadzone | Movement force | Velocity ratio to full forward |
|---|---|---|---|
| Up, raw 16384 (half throw) | (16384 - 8000) / 24767 = 0.339 | 0.339 / 0.7 = 0.48 | 48% |
| Up, raw ~25337 (77% throw) | 0.700 | 1.00 | 100% (full speed reached at 77% throw) |
| Down, raw -16384 | 0.339 | 0.339 / 0.7 x 0.25 = 0.12 | 12% |
| Right strafe, raw 16384 | 0.339 | 0.339 / 0.7 = 0.48 | 0.48 x 0.5 = 24% of forward speed |
| Left strafe, raw -16384 | 0.339 | 0.339 / 0.5 = 0.68 | 0.68 x 0.5 = 34% of forward speed |
| Diagonal up-right, both full | forward 1.00, strafe 1.00 | summed velocity 0.0503 | 112% of straight forward (0.045) |

Defects found in this path (kept the idea, fix below):

1. Diagonal boost. Forward and strafe are added separately (4795, 4797) and each is clamped on its own (750-767), so a full diagonal moves 11.8% faster than straight forward (sqrt(0.045^2 + 0.0225^2) / 0.045 = 1.118). Fix: cap the summed velocity at the full forward rate (the sketch does this).
2. Threshold names do not match the axes they act on. The header calls x forward and y strafe (player.hpp 297 comment, 327-329), but the code applies the x thresholds to strafe (x multiplies cos(yaw + PI/2) at 4797) and the y threshold to forward and back (y multiplies cos(yaw) at 4795). The result: forward and back both use 0.7, and strafe uses 0.7 right and 0.5 left. Fix: rename the thresholds by the axis they act on, and decide whether the left strafe should be 0.5 (the donor value) or 0.7. This is an intent question; the sketch keeps the donor values.
3. Left-stick deadzone types beyond per-axis are ignored. The console cycles the left stick through per-axis, magnitude linear and halfpipe (interface/consolecommand.cpp 3744-3753), but the left path only applies a deadzone when the type is per-axis (599), and `maxLeftXMove` returns 32767 for other types (781). So on the other two types the left stick has no deadzone at all. Fix: implement the radial mode for the left stick (from the right-stick code) or drop the option.
4. Binding deadzone has no rescale (1082, 1085, 1099, 1102). The output jumps from 0 to just over 0.2 at the band edge. Fix: rescale as the left stick does (sketch). Affects turn and look only for analog bindings with no controller attached.
5. Right-stick magnitude modes multiply by the raw length. In the menu branch (411) the linear mode is `magnitude * (normalised - deadzone) / (1 - deadzone)`, and in the aim branch (493) the same. `magnitude` is the raw length (in units, about normalised x maxInputVector), so the output is the intended linear value times the normalised length. At half throw that is about 35% of the intended value (computed: 16384 x 0.2187 = 3583, against 46341 x 0.2187 = 10134). Fix: use `maxInputVector * (normalised - deadzone) / (1 - deadzone)`. The default right-stick type is halfpipe (player.hpp 320), where the aim branch (489) multiplies the same raw length by (normalised - deadzone)^2 (the comment says "half pipe gradient"); the fix is the same, and the default is affected. The consumers of these values were not read, so the in-game effect is not confirmed.
6. `BUTTON_ANALOG_REPEAT_TICKS` (input.cpp 22, TICKS_PER_SECOND / 4) is declared and never used in `src` (grep). It reads like a 4 per second repeat for held analog buttons that was never wired up. Dead code, not a mechanism.

## 4. TypeScript sketch

simplified: integers become floats in the -1..1 range (raw / 32767), so the donor's integer and float mixing is gone. The sketch keeps the per-axis deadzone with rescale, the full-speed thresholds per direction (named by the movement they act on, not by the donor's axis names), the reverse multiplier and the forward and strafe rates. It adds the diagonal cap (defect 1). It omits the weight and DEX speed factor, `defendSpeed`, the equipment multipliers, the yaw and position integration beyond one step, the ghost path, the Y invert and the controller-type checks. The donor's clamp of raw values to -32768 is not reproduced (the sketch clamps the fraction to 1). The thresholds are data: the sketch takes the donor's values, so the 0.5 left-strafe is kept until the intent question is settled.

```ts
// Licence: BSD-2-Clause (donor; adaptable). Fresh rewrite of the described mechanism, not a copy of the donor lines.
// Raw stick values are integers in -32767..32767. Stick y > 0 means stick up (the donor inverts Y before use).

export interface StickCfg {
  deadzone: number;             // raw units; donor default 8000 (25% of 32767)
  fullRange: number;            // 32767
  thresholdForward: number;     // stick fraction at which forward reaches full speed (donor: 0.7)
  thresholdBack: number;        // stick fraction for full reverse before backpedal (donor: 0.7 on the vertical axis)
  thresholdStrafeRight: number; // donor applies 0.7 to positive x; the donor names this "forward"
  thresholdStrafeLeft: number;  // donor applies 0.5 to negative x; the donor names this "backward"
  backpedal: number;            // reverse speed multiplier (donor: 0.25)
  fwdRate: number;              // per-tick velocity at full forward, speedFactor 1 (donor: 0.045)
  strafeRate: number;           // per-tick velocity at full strafe (donor: 0.0225)
}

export interface Stick { x: number; y: number; }
export interface Force { forward: number; strafe: number; }

// Per-axis deadzone with rescale: 0 inside the deadzone, 0..1 at full throw, sign kept.
export function axisPercent(raw: number, dz: number, full: number): number {
  const m = Math.abs(raw);
  if (m <= dz) return 0;
  const p = Math.min((m - dz) / (full - dz), 1);
  return raw < 0 ? -p : p;
}

// Stick to movement force. Each axis has its own full-speed threshold and sign.
export function stickForces(s: Stick, cfg: StickCfg): Force {
  const py = axisPercent(s.y, cfg.deadzone, cfg.fullRange);
  const px = axisPercent(s.x, cfg.deadzone, cfg.fullRange);
  const forward = py > 0
    ? Math.min(py / cfg.thresholdForward, 1)
    : Math.max(py / cfg.thresholdBack, -1) * cfg.backpedal;
  const strafe = px > 0
    ? Math.min(px / cfg.thresholdStrafeRight, 1)
    : Math.max(px / cfg.thresholdStrafeLeft, -1);
  return { forward, strafe };
}

// One tick of velocity. The donor adds forward and strafe separately, so a diagonal is faster
// than straight forward. The fix caps the combined velocity at the full forward rate.
export function velocityStep(f: Force, yaw: number, speedFactor: number, cfg: StickCfg): { vx: number; vy: number } {
  let vx = (f.forward * cfg.fwdRate * Math.cos(yaw) + f.strafe * cfg.strafeRate * Math.cos(yaw + Math.PI / 2)) * speedFactor;
  let vy = (f.forward * cfg.fwdRate * Math.sin(yaw) + f.strafe * cfg.strafeRate * Math.sin(yaw + Math.PI / 2)) * speedFactor;
  const len = Math.hypot(vx, vy);
  const cap = cfg.fwdRate * speedFactor;
  if (len > cap) { vx *= cap / len; vy *= cap / len; }
  return { vx, vy };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 barony-stick-force.ts` on the VPS exits 0.

Worked check from the sketch: stick up at raw 16384 gives forward 0.48 (the table above); a full forward stick reaches full speed at about 77% throw (fraction 0.7 after deadzone).

## 5. Lands in

- TARGET `src/fight/input.ts` (the phone stick: fraction, full-speed thresholds, reverse ratio, velocity cap). Parity-checklist row 5 (controls/input). It joins the radial deadzone from STJr-SRB2 (cell 1); this note supplies the thresholds and the reverse ratio, not the deadzone shape.
- Reuse tag: adapt-with-attribution (BSD-2-Clause; the sketch is a fresh rewrite; if donor lines are copied, keep the copyright notice)
- Brief rule served: addendum rule 2 (judge the idea, not the genre); Strategy rule 2026-10-10 (keep the idea, fix the defect); the stick sets an intent, and the engine owns the movement.

## 6. Gaps and risks

- Decision (proposed): adapt. Take three things as data: the full-speed thresholds (a phone stick reaches full speed at 70% of throw, which is good on a small screen), the reverse ratio (0.25), and the forward-to-strafe ratio (2:1). Take the radial deadzone from STJr-SRB2 (cell 1), not the per-axis band, because per-axis gives the diagonal boost. Fix the diagonal with the velocity cap. Reject the donor's threshold names and the left-stick types that do nothing (defect 3).
- Acceptance: on a 375-wide phone with a 25% deadzone, a thumb at half throw up moves forward at about 48% speed, reaches full speed at about 77% of throw, and a 45 degree push at full throw is no faster than straight up. A test asserts that the summed velocity never exceeds `fwdRate x speedFactor` for any stick input.
- Server-verified: the donor computes movement in the client loop (`actplayer.cpp` runs per tick on the player's machine). Frankendom must clamp the move on the server (the sketch's cap is client-side only).
- Weight and DEX (`getSpeedFactor`, not read) and the equipment modifiers (4611-4627) set the real speed. Frankendom's stat rules decide these; the stick sets only the intent.
- Right stick (aim and menu) has defect 5 (magnitude multiply in both modes, default halfpipe). Its consumers were not read, so its in-game effect is not confirmed. If Frankendom's aim or camera uses a stick curve, take the fixed form only.
- Camera: with a controller, the analog turn and look code is skipped (actplayer.cpp 1946-1948, 2022-2023), so the camera look comes from the right-stick `GameController` path (defect 5, halfpipe default). Whether and how those outputs move the camera was not read. If the world camera takes a stick look, use the rescaled form with the radial deadzone (cell 1), not this path.
- Landscape vs portrait, touch hit areas and the phone layout: not in this donor (not read).
- Lock-on (the callout lock-on `lockOnEntityUid` in actplayer.cpp and interface.cpp, grep only) and gesture specials: not read.
