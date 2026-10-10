# daggerfall-unity (camera, cell 14)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Player/CameraRecoiler.cs` (with `Game/Player/VitalsChangeDetector.cs` and `Game/PlayerMouseLook.cs`) | Licence: MIT License (per the file header "License: MIT License" and the repo `LICENSE`, "MIT License", Copyright 2009-2023 Daggerfall Workshop) | C# (Unity) | symbol `CameraRecoiler.Update`

Checked: Read in full: `Game/Player/CameraRecoiler.cs` 1-199 (the whole file) and `Game/Player/VitalsChangeDetector.cs` 1-140 (the Update and UpdateDeltas path; its event plumbing after 139 not read). Read in part: `Game/PlayerMouseLook.cs` 23-24 and 36-170 (pitch limits, smoothing; the cursor and input code after 170 not read). Opened and rejected: `Game/NoFogCamera.cs` (the list hint; it switches `RenderSettings.fog` off around the camera render, so it is not a camera control). Other camera scripts from the grep were not opened: `Game/Player/HeadBobber.cs`, `Game/Player/PlayerHeightChanger.cs`, `Utility/ViewportChanger.cs`, `Utility/CameraClearManager.cs`. This is a first-person camera; the mechanism is a damage-triggered view kick. Camera scope: world camera (the player's view in the open world). The pit is not covered by this note (not read). Confidence: high on the order of operations and the numbers (all read); high on the amplitude finding in section 6 (read from the code, not run); medium on the frame-rate effect (reasoned from the code, not measured).

## 1. Mechanism

- Trigger (CameraRecoiler.cs 64-110, `Update`). Each frame it reads two values from `VitalsChangeDetector`: `HealthLost` (points, line 72) and `HealthLostPercent` (fraction of max health, line 73). If the percent is above 0.02 (lines 77, 80), a sway starts: `bSwaying = true` (83), the timer is set to `timerStart` (87), and a random direction is drawn from the unit circle (126).
- Duration (129-135). `timerStart = piScalar x pi`, with `piScalar = 5 + floor(percent x 5)` (133, 135). So a hit of 2-19% of max health gives 5 pi, 20-39% gives 6 pi, and so on up to 10 pi at 100%. The timer counts down at 2 pi radians per second, scaled by `Time.deltaTime` (99-100), so the sway lasts piScalar / 2 seconds: 2.5 s to 5 s.
- Amplitude while swaying (151-160, `CalculateRotationScalar`). `rotationScalar = maxRotationScalar x (timer / timerStart) x healthLostFactor`. `maxRotationScalar` = base 50 (45, 153) x the user setting: Off 0, Low 0.25 (143), Medium 0.5 (144), High 0.75 (145), VeryHigh 1 (146). `healthLostFactor = clamp(healthLost x 0.015, 0.015, 1)` (156), so 67 points or more saturate. The envelope `timer / timerStart` decays from 1 to 0.
- Angles (166-170, `GetRotationVector`). `x = sin(timer) x rotationScalar x axis.x` and `y = sin(timer) x rotationScalar x axis.y` (166-167), returned as a Euler vector (170). The caller calls `playerCamTransform.Rotate(...)` (104) once per frame, inside the sway branch. The call passes no delta time, so each frame adds the full per-frame angle, while the timer that drives the sine is time-based.
- End: `bSwaying = (timer > 0)` (107). The Off, paused and cursor-active checks return early at the top of `Update` (66-68).
- Health source: `VitalsChangeDetector.UpdateDeltas` (83-123) sets `HealthLost = previousHealth - currentHealth` (93), `HealthLostPercent = HealthLost / maxHealth` (94), then `previousHealth = currentHealth` (120). The value is therefore a one-frame delta: it is non-zero only on the frame the loss was seen. Several hits in one frame are summed.
- Resets: `ResetRecoil` clears the sway on world init, save load and the court screen (`bSwaying = false`), so a relocated or reloaded player is not still swaying.

## 2. Key functions

- `CameraRecoiler.Update`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Player/CameraRecoiler.cs` 64-110. Trigger, timer countdown, per-frame rotation.
- `CameraRecoiler.CalculateTimerStart`: same file, 129-136. `piScalar = 5 + floor(percent x 5)`, returns `piScalar x pi`.
- `CameraRecoiler.CalculateRotationScalar`: same file, 151-160. Setting x timer ratio x health factor.
- `CameraRecoiler.GetRotationVector`: same file, 162-170. The sine per axis.
- `VitalsChangeDetector.UpdateDeltas`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Player/VitalsChangeDetector.cs` 83-123. Per-frame health delta and percent of max.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ignore small hits: start a wobble only above a fraction of max health | 0.02 of max health (theirs, CameraRecoiler.cs 77) |
| Longer wobble for bigger hits, in steps | `5 + floor(percent x 5)` half-seconds: 2.5 s to 5 s (theirs, 133, 135) |
| Decaying oscillation with a random direction | Timer 2 pi rad/s (theirs, 99); direction from the unit circle (126) |
| Amplitude = base x user setting x envelope x severity | Base 50 (theirs, 45); setting 0 / 0.25 / 0.5 / 0.75 / 1 (theirs, 143-146) |
| Severity grows with the hit, saturating | 0.015 per point, floor 0.015, cap 1 (theirs, 156) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's start rule (2 percent threshold), duration rule (5 + floor(5 x fraction) half-seconds), 50-degree base scaled by the setting, the 0.015-per-point severity with floor and cap, and the decaying sine with a random direction. It changes two things on purpose. First, severity is fixed when the hit lands; the donor re-reads the current frame's health loss, which is zero after the first frame (see section 6). Second, the angle is a function of elapsed time; the donor adds a per-frame Rotate with no delta time. It omits: the Unity Euler Rotate (the sketch returns angles for the caller to apply), the pause, cursor and Off gates, the court, load and world-init resets, the VitalsChangeDetector event plumbing, and the max-health change reset. The smoke test values are arbitrary and the exported result is not used by any caller.

```ts
// Licence of donor: MIT. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Setting = 'off' | 'low' | 'medium' | 'high' | 'veryHigh';

const BASE_AMP_DEG = 50;                       // full-severity amplitude, degrees
const SETTING_SCALE: Record<Setting, number> = { off: 0, low: 0.25, medium: 0.5, high: 0.75, veryHigh: 1 };

interface Sway {
  startMs: number;      // time of the hit
  timerStart: number;   // radians; piScalar * pi
  amp: number;          // amplitude fixed at the hit: base x setting x severity
  ax: number;           // unit direction, pitch component
  ay: number;           // unit direction, yaw component
}

// Starts a sway for one hit. hitFraction = health lost / max health; hitPoints = health lost.
function startSway(hitFraction: number, hitPoints: number, setting: Setting, nowMs: number, rnd: () => number): Sway | null {
  if (hitFraction <= 0.02) return null;                      // ignore hits under 2 percent of max health
  const piScalar = 5 + Math.floor(hitFraction * 5);          // longer sway for bigger hits, steps of 20 percent
  const severity = Math.min(1, Math.max(0.015, hitPoints * 0.015)); // fixed for the whole sway (see simplified line)
  const dir = rnd() * 2 * Math.PI;
  return {
    startMs: nowMs,
    timerStart: piScalar * Math.PI,
    amp: BASE_AMP_DEG * SETTING_SCALE[setting] * severity,
    ax: Math.cos(dir),
    ay: Math.sin(dir),
  };
}

// Angles at a given time. Depends only on elapsed time, so it does not change with frame rate.
function swayAngles(s: Sway, nowMs: number): { pitchDeg: number; yawDeg: number } | null {
  const t = (nowMs - s.startMs) / 1000;
  const timer = s.timerStart - 2 * Math.PI * t;              // counts down at 2 pi rad per second
  if (timer <= 0) return null;                               // finished
  const envelope = timer / s.timerStart;                     // 1 at the hit, 0 at the end
  const a = Math.sin(timer) * s.amp * envelope;
  return { pitchDeg: a * s.ax, yawDeg: a * s.ay };
}

// Smoke test
const hit = startSway(0.2, 20, 'veryHigh', 0, () => 0.25);
const angles = hit ? swayAngles(hit, 500) : null;
const none = startSway(0.01, 1, 'veryHigh', 0, () => 0.5);
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/qc011-daggerfall-impact-sway.ts` there; copy at `work/daggerfall-impact-sway.ts`).

## 5. Lands in

- TARGET `src/fight/camera.ts` (new, client only). Parity-checklist row 11 (fight camera). The hit that starts the sway comes from the server-verified fight step (row 1), but the sway itself is client-side and never feeds back.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, but this is a rewrite from the mechanism because the Unity Rotate and the per-frame accumulator are not wanted)
- Brief rule served: 11 (fight camera is client-only; the engine never reads it)

## 6. Gaps and risks

- Amplitude finding (read from the code, not run). `healthLost` is a one-frame delta (VitalsChangeDetector.cs 93, 120), and `CalculateRotationScalar` re-reads it every frame (CameraRecoiler.cs 72, 156). From the frame after the hit, `healthLost` is 0, so `healthLostFactor` is the 0.015 floor. The hit's size therefore affects only the hit frame, where `sin(timer)` is about sin(2 pi x frame time), roughly 0.1 at 60 fps, and the sway duration (133). The rest of the sway has the same amplitude for every hit above 2 percent. The donor comment at line 155 ("each point of health lost makes the sway %1.5 of max effectiveness") describes the intent, which the code does not deliver. Do not port this; the sketch fixes it.
- Frame-rate dependence (read from the code, not measured). `Rotate` (104) adds a full per-frame angle with no delta time, while the timer (100) is time-based. The angle accumulated over the sway therefore depends on the number of frames. The sketch computes the angle from elapsed time instead.
- Duration is too long for a fast duel. 2.5 to 5 s per hit (133-135) would fight the camera during a many-on-one fight. Frankendom should use a shorter default, as zone or weapon data (proposed 0.4 to 1.0 s, to be tuned).
- The sway rotates the first-person view itself. A third-person follow camera should apply the offset to its aim point or rig, not to the hero, so the hero's body does not wobble. The envelope and random direction transfer; the Euler `Rotate` on the camera does not.
- Client only. A sway must never change a hit result or a kill; kills are server-verified. The sketch has no server input.
- Mouse look (also read, PlayerMouseLook.cs): pitch is clamped to -90..90 (23, 69, 144). Smoothing blends the displayed look toward the target (166) with a rate scaled from 60 fps by unscaled frame time (102-104, 163). The scaling is a rational function of the frame count (104), not an exact exponential; I did not check it against a formula. This is a separate, adoptable idea for the world camera's look smoothing, not the STRONG mechanism of this note.
- `NoFogCamera.cs` (the list hint) only toggles fog around the render (lines 8-16). It is not the camera; no note.
- Not read: `Game/Player/HeadBobber.cs`, `Game/Player/PlayerHeightChanger.cs`, `Utility/ViewportChanger.cs`, `Utility/CameraClearManager.cs`, the events in `VitalsChangeDetector.cs` after 139, and the cursor and input code of `PlayerMouseLook.cs` after 170.

Best transferable idea: on a hit above a small fraction of max health, start a short decaying camera wobble in a random direction whose size is fixed by that hit, and compute it from elapsed time so it does not change with frame rate.

Decision (proposed): adapt - take the threshold, the hit-sized duration and the decaying wobble for the world camera's impact feedback; reject the per-frame Rotate accumulator, the 2.5-5 s duration and the first-person Euler rotation of the view.

Acceptance: on a hit above 2 percent of max health the camera wobbles in a random direction and returns to rest within the hit's duration (zone or weapon data, proposed 0.4 to 1.0 s); a bigger hit gives a bigger wobble for its whole duration; a server test asserts the wobble never changes the hit result; a client test asserts the angle at a given time after the hit is the same at 30 and 120 fps.

Reuse tag: rewrite-from-idea (MIT; code may be adapted, but we rewrite the mechanism, not the lines)
Brief rule served: 11 (fight camera is client-only; the engine never reads it)



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** None. All numbers and lines match: CameraRecoiler Update 64-110, 2% threshold 77/80, timerStart piScalar=5+floor(pct*5) at 133-135, timer 2*pi/s at 99-100, base 50 at 45, settings 0/.25/.5/.75/1 at 142-146, healthLostFactor clamp(0.015..1) at 156, sin per axis 166-167, Rotate at 104 with no deltaTime, bSwaying=(timer>0) at 107, ResetRecoil on init/load/court, VitalsChangeDetector UpdateDeltas 93-94/120 one-frame delta, so the 'amplitude only reflects the hit frame' finding holds. PlayerMouseLook pitch +/-90 (23-24, 69, 144), smoothing 100-105/163/166, NoFogCamera toggles fog 8-16, MIT header.

**Missed:** none
