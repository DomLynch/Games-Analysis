// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Raw stick axes are in -1..1. y > 0 means push forward (the donor's sign is the opposite).

export interface StickConfig {
  deadzone: number;   // radial deadzone, 0..1 (donor default 0.125 for analog; client setting)
  maxSide: number;    // ticcmd sidemove at full deflection (donor: 50)
  maxForward: number; // ticcmd forwardmove at full deflection (donor: 50)
}

export interface Vec2 { x: number; y: number; }

// One radial deadzone pass: the output keeps the stick direction and rescales the length
// so that the edge of the deadzone maps to 0 and full throw maps to 1.
export function radialStick(raw: Vec2, deadzone: number): Vec2 {
  const mag = Math.hypot(raw.x, raw.y);
  if (mag === 0) return { x: 0, y: 0 };
  const dirX = raw.x / mag;
  const dirY = raw.y / mag;
  const len = Math.min(mag, 1);
  const span = 1 - deadzone;
  if (span <= 0) return len >= 1 ? { x: dirX, y: dirY } : { x: 0, y: 0 };
  if (len <= deadzone) return { x: 0, y: 0 };
  const scaled = Math.min((len - deadzone) / span, 1);
  return { x: dirX * scaled, y: dirY * scaled };
}

// One local tic: stick axes become integer ticcmd move values.
export function stickToTicMove(raw: Vec2, cfg: StickConfig): { side: number; forward: number } {
  const s = radialStick(raw, cfg.deadzone);
  return {
    side: Math.trunc(s.x * cfg.maxSide),
    forward: Math.trunc(s.y * cfg.maxForward),
  };
}

export {};
