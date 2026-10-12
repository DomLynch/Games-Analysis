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
