// Licence: Apache-2.0 (donor, LICENSE.md). Adapted mechanism; the donor's band rule and shake are kept, with the one change noted in the simplified line.
type Vec3 = { x: number; y: number; z: number };

const STEP = 1 / 60;   // 60 Hz interpolation step
const MAX_STEPS = 4;   // at most 4 steps per frame
const DEG = Math.PI / 180;

// Band rule: a large error is divided by a large divisor, a medium error by a small divisor, a tiny error snaps.
function bandStep(err: number, big: number, small: number, bigDiv: number, smallDiv: number): number {
  const a = Math.abs(err);
  if (a > big) return err / bigDiv;
  if (a > small) return err / smallDiv;
  return err;
}

export interface BandTuning {
  angleBigDeg: number;
  angleSmallDeg: number;
  angleBigDiv: number;
  angleSmallDiv: number;
  distBig: number;
  distSmall: number;
  distBigDiv: number;
  distSmallDiv: number;
  targetBig: number;
  targetSmall: number;
  targetBigDiv: number;
  targetSmallDiv: number;
}

// Donor values. distSmallDiv 0.6 overshoots and rings (see section 6).
export const DONOR_TUNING: BandTuning = {
  angleBigDeg: 5.5, angleSmallDeg: 0.06, angleBigDiv: 10, angleSmallDiv: 4,
  distBig: 5, distSmall: 0.04, distBigDiv: 1, distSmallDiv: 0.6,
  targetBig: 5, targetSmall: 0.08, targetBigDiv: 9, targetSmallDiv: 4,
};

// Sketch values: the distance big divisor is 9 (a wheel notch glides instead of popping in one step) and the
// distance small divisor is 4 (a medium zoom glides instead of ringing).
export const SKETCH_TUNING: BandTuning = { ...DONOR_TUNING, distBigDiv: 9, distSmallDiv: 4 };

const wrapRad = (a: number): number => {
  const t = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return t > Math.PI ? t - 2 * Math.PI : t;
};
const wrapDeg = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180;

export class BandCamera {
  yaw = 0;
  pitch = 55 * DEG;
  dist = 200;
  target: Vec3 = { x: 0, y: 0, z: 0 };
  dYaw = 0;
  dPitch = 55 * DEG;
  dDist = 200;
  dTarget: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(private readonly t: BandTuning) {}

  // dt in seconds: a whole number of 60 Hz steps, rounded, capped at MAX_STEPS.
  interpolate(dt: number): void {
    const steps = Math.min(MAX_STEPS, Math.max(1, Math.round(dt / STEP)));
    for (let i = 0; i < steps; i++) this.once();
  }

  private once(): void {
    const t = this.t;
    this.dYaw = wrapRad(this.dYaw);
    const yawStep = bandStep(wrapDeg((this.dYaw - this.yaw) / DEG), t.angleBigDeg, t.angleSmallDeg, t.angleBigDiv, t.angleSmallDiv);
    this.yaw = wrapRad(this.yaw + yawStep * DEG);
    const pitchStep = bandStep((this.dPitch - this.pitch) / DEG, t.angleBigDeg, t.angleSmallDeg, t.angleBigDiv, t.angleSmallDiv);
    this.pitch += pitchStep * DEG;
    this.dist += bandStep(this.dDist - this.dist, t.distBig, t.distSmall, t.distBigDiv, t.distSmallDiv);
    this.target = {
      x: this.target.x + bandStep(this.dTarget.x - this.target.x, t.targetBig, t.targetSmall, t.targetBigDiv, t.targetSmallDiv),
      y: this.target.y + bandStep(this.dTarget.y - this.target.y, t.targetBig, t.targetSmall, t.targetBigDiv, t.targetSmallDiv),
      z: this.target.z + bandStep(this.dTarget.z - this.target.z, t.targetBig, t.targetSmall, t.targetBigDiv, t.targetSmallDiv),
    };
  }

  // World Y grows downwards (donor comment), so a positive pitch lifts the eye to a smaller Y.
  eyeUnclamped(): Vec3 {
    const d = this.dist;
    return {
      x: this.target.x + d * Math.cos(this.pitch) * Math.sin(this.yaw),
      y: this.target.y - d * Math.sin(this.pitch),
      z: this.target.z - d * Math.cos(this.pitch) * Math.cos(this.yaw),
    };
  }

  // Ground floor: if the eye is below the floor (larger Y), pull it up to the floor. No margin, as in the donor.
  eye(floor: number | null): Vec3 {
    const e = this.eyeUnclamped();
    if (floor !== null && e.y > floor) e.y = floor;
    return e;
  }
}

// Shake: linear decay, a stacking rule that keeps the larger of the new and remaining amplitude, hashed per 60 Hz frame.
export class Shake {
  private amp = 0;
  private elapsed = 0;
  private dur = 0;

  trigger(amplitude: number, durationMs: number): void {
    const remaining = this.dur > 0 ? this.amp * (1 - Math.min(1, Math.max(0, this.elapsed / this.dur))) : 0;
    this.amp = Math.max(amplitude, remaining);
    this.dur = Math.max(durationMs / 1000, 1e-3);
    this.elapsed = 0;
  }

  tick(dt: number): void {
    if (this.dur > 0) this.elapsed += dt;
  }

  offset(): Vec3 {
    if (this.dur <= 0 || this.elapsed >= this.dur) return { x: 0, y: 0, z: 0 };
    const amp = this.amp * (1 - this.elapsed / this.dur);
    const frame = Math.floor(this.elapsed * 60) >>> 0;
    const j = (salt: number): number => {
      let x = (Math.imul(frame, 2654435761 | 0) + Math.imul(salt, 40503) + 0x9e3779b9) >>> 0;
      x = (x ^ (x >>> 15)) >>> 0;
      return ((x % 100000) / 100000) * 2 - 1;
    };
    return { x: j(1) * amp, y: j(2) * amp * 0.5, z: j(3) * amp };
  }
}

export {};
