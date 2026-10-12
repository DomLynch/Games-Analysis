# Facepunch-sbox-public (input-touch-controls, cell 3)

Donor: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Engine/Systems/Input/Controller/Controller.Input.cs` | Licence: MIT (repo `LICENSE.md`, standard MIT text) | C# | symbol `Controller.SetAxis`

Checked: Read `Controller.Input.cs` in full (85 lines). Read `InputRouter.Input.cs` 180-232 (axis entry and trigger-as-button). Read `Preferences.cs` 38-46 (stick dead zone and analog cursor speed convars). Read `SettingsCatalog.cs` line 816 (the slider). Searched the repo for touch, virtual stick, joystick, tap-to-move, input buffer and lock-on: no touch-screen or virtual-stick code. The only matches are the `Touchpad` enum values and Oculus "Touch" naming. Confidence: high on the dead-zone path, which is the whole of the controller-axis code I could find. This is a thin fragment of the topic, so depth is thin. Camera: not a camera cell.

Best transferable idea: Dead-zone a stick once, in one place, against a player-tunable setting, then drive a button from an analog value with a press point, so virtual sticks on a phone get the same tuning.
Decision (proposed): adapt. Take the single dead-zone point with a player setting and the analog-to-button step. Change the donor's per-axis dead zone to a radial one with rescale, and add a release point below the press point.
Acceptance: On a 375-wide phone, a virtual stick held inside 12.5 percent of its radius moves the hero zero. Just outside that zone the speed starts near zero and rises smoothly to full at the rim, with no step. A button driven by a trigger-style value does not flicker when the value hovers at its press point.

## 1. Mechanism

- Raw SDL axis values arrive per device through `OnGameControllerAxis` (InputRouter.Input.cs 190-198), which calls `Controller.SetAxis` (line 198). The call site of `OnGameControllerAxis` was not read, so the event rate and any coalescing are unknown.
- `SetAxis` (Controller.Input.cs 47-74), in order:
  - (a) remap the raw integer to -1..1 (line 50).
  - (b) choose the dead zone. Axes below the trigger enum values use the user setting divided by 100 (line 53); other axes use the fixed trigger value 0.125 (line 28, selected at 52-54).
  - (c) if the absolute value is at or below the dead zone, set it to 0 (line 56).
  - (d) if the value is positive, set `Sandbox.Input.UsingController` (lines 58-60).
  - (e) store the value on the axis record (63-73).
- No rescale: a value just outside the dead zone passes through unchanged (line 56 only zeroes the inside). Each axis is filtered on its own (axial), so the dead zone is a cross on a diagonal push.
- Trigger as button (InputRouter.Input.cs 204-218): non-trigger axes return (204-205). For a trigger, the raw value is remapped to 0..1 and compared with 0.75 (207, 218). The result is sent as a digital code. One threshold, no release point at this call.
- User setting: ConVar `controller_joystick_deadzone`, default 12.5, range 0 to 50 (Preferences.cs 42-43). The settings page exposes it as a "Stick Deadzone" slider (SettingsCatalog.cs 816).
- Analog cursor speed for menus: ConVar `controller_analog_speed`, default 2.0 (Preferences.cs 45-46). Its use was not read.

## 2. Key functions

- `Controller.SetAxis`: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Engine/Systems/Input/Controller/Controller.Input.cs` 47-74.
- `InputRouter.OnGameControllerAxis`: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Engine/Systems/Input/InputRouter.Input.cs` 190-219.
- Dead-zone convars: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Engine/Game/Preferences.cs` 42-46.

## 3. Numbers vs mechanism

| Reusable idea | Donor constant |
|---|---|
| Stick dead zone, player setting | 12.5 percent default, range 0 to 50 (Preferences.cs 42-43), i.e. 0.125 as a ratio |
| Trigger analog dead zone, fixed | 0.125 (Controller.Input.cs 28) |
| Trigger used as a button, press point | 0.75 (InputRouter.Input.cs 207) |
| Analog cursor speed for menus | 2.0 (Preferences.cs 46) |

## 4. TypeScript sketch

simplified: the sketch uses a radial dead zone with rescale and adds a release point to the button, which the donor does not have. It omits the per-axis path, the `UsingController` flag, the fixed trigger dead zone, the analog cursor speed, device routing, and the event source. The clamp to 0-0.5 mirrors the donor's ConVar range; the release value 0.6 is proposed and is not in the donor.

```ts
// Licence: MIT (donor LICENSE.md). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const DEADZONE_DEFAULT = 0.125; // donor default 12.5 percent (Preferences.cs line 43), allowed range 0 to 0.5
const PRESS = 0.75;             // donor press threshold for a trigger used as a button (InputRouter.Input.cs line 207)
const RELEASE = 0.6;            // proposed hysteresis release point; NOT from the donor

interface Stick { x: number; y: number; } // raw deflection, -1 to 1 per axis

// Radial dead zone with rescale: inside the zone the output is 0; just outside it the output starts at 0.
function stickAfterDeadzone(raw: Stick, deadzone: number = DEADZONE_DEFAULT): Stick {
  const dz = Math.min(Math.max(deadzone, 0), 0.5);
  const mag = Math.hypot(raw.x, raw.y);
  if (mag <= dz) return { x: 0, y: 0 };
  const scaled = Math.min((mag - dz) / (1 - dz), 1);
  const k = scaled / mag;
  return { x: raw.x * k, y: raw.y * k };
}

// Analog value to digital button with two thresholds, so a value sitting at the edge does not flicker.
function buttonFromAnalog(wasDown: boolean, value: number): boolean {
  return wasDown ? value > RELEASE : value >= PRESS;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/input-stick.ts` (new, proposed): client-side stick and button mapping for the phone controls. The client sends the resulting intent; the server verifies it.
- Parity-checklist row 5 (controls/input). The server intake of the resulting intent also belongs to row 5.
- Reuse tag: adapt-allowed (MIT: code may be adapted; this sketch is clean-room).
- Brief rule served: the client-only rule (controls, camera, HUD and sound are client-only; the engine verifies the outcome). Rules 7-9 n/a.

## 6. Gaps and risks

- Defect (fix in sketch): no rescale. Controller.Input.cs line 56 zeroes values inside the dead zone and leaves the rest unchanged, so speed jumps from 0 to just above the dead zone at its edge. Fix: rescale from the edge to the rim.
- Defect (fix in sketch): the dead zone is applied per axis, which gives a cross-shaped dead area on a diagonal push. A round virtual stick needs a radial test.
- Defect (fix: set the flag for any non-zero value): `UsingController` is set only when the value is positive (Controller.Input.cs 58-60). A push that only goes left or down does not switch the input mode. The code does not say whether that is intended.
- Gap (fix in sketch): a trigger used as a button has one threshold (InputRouter.Input.cs 218). A value hovering at 0.75 toggles on and off. Fix: a release point below the press point. The 0.6 release value is a proposal, not from the donor.
- Gap: nothing in this repo covers phone touch: no virtual sticks, tap-to-move, lock-on, input buffering, or landscape and portrait handling. The donor covers keyboard, mouse, gamepad and VR only. Those need another donor.
- Gap: the donor default of 12.5 percent is not tested on a phone at 375 wide. Frankendom needs its own default; Dom decides it.
- Note: the event source for `OnGameControllerAxis` was not read, so its rate and any coalescing are unknown.
