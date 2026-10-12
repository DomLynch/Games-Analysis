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
