// Licence: GPL-3.0-or-later (donor). Clean-room sketch of the mechanism; not a translation of the donor lines.
export interface Vec2 {
  x: number;
  z: number;
}

// Legacy-style timer: fires once per call when its period has elapsed.
// accurate = true keeps a fixed schedule (start advances by one period);
// accurate = false restarts the period from the moment it fires.
export class CoarseTimer {
  private start: number;

  constructor(
    private readonly period: number,
    private readonly accurate: boolean,
    now: number,
  ) {
    this.start = now;
  }

  check(now: number, reset: boolean = true): boolean {
    if (now - this.start <= this.period) return false;
    if (reset) {
      if (this.accurate) this.start += this.period;
      else this.start = now;
    }
    return true;
  }
}

// One movement step with a raw (unclamped) frame time, as in the donor.
// Returns the new position and whether the target was reached this step.
export function stepToward(
  pos: Vec2,
  target: Vec2,
  speed: number,
  frameTimeS: number,
  factor: number = 0.4 * 1.45,
): { x: number; z: number; arrived: boolean } {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const len = Math.hypot(dx, dz);
  if (len === 0) return { x: pos.x, z: pos.z, arrived: true };
  const move = frameTimeS * speed * factor;
  if (move > len) return { x: target.x, z: target.z, arrived: true };
  return { x: pos.x + (dx / len) * move, z: pos.z + (dz / len) * move, arrived: false };
}

// Sync cadence: a movement command is re-sent on a speed change, or after a heartbeat.
export function heartbeatDue(nowS: number, lastSentS: number, heartbeatS: number): boolean {
  return nowS - lastSentS >= heartbeatS;
}

// Ground correction: only when the FixZWhenPathing rule is on; due once the distance moved since the last
// correction is strictly greater than 1 unit while engaged, 10 units otherwise (the donor resets the counter on a correction).
export function fixZDue(movedSinceCorrection: number, engaged: boolean, fixZWhenPathing: boolean): boolean {
  if (!fixZWhenPathing) return false;
  return movedSinceCorrection > (engaged ? 1 : 10);
}

export {};
