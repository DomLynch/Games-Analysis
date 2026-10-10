// Licence: MIT (donor, OpenAC). Clean-room sketch written from the described mechanism, not a line translation.
type V3 = { x: number; y: number; z: number };

const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const lerp = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t));
const len = (a: V3): number => Math.hypot(a.x, a.y, a.z);
const norm = (a: V3): V3 => {
  const l = len(a);
  return l > 1e-9 ? mul(a, 1 / l) : { x: 1, y: 0, z: 0 };
};

export interface FollowTuning {
  boomDistance: number;     // metres from pivot to eye at rest (donor default 2.61)
  boomPitch: number;        // radians above horizontal (donor default 0.291)
  pivotHeight: number;      // metres above the player origin (donor default 1.5)
  shoulderOffset: number;   // metres right of the boom axis (NOT in donor; added for over-the-shoulder)
  stiffness: number;        // donor 0.45 for translation
  nearFade: number;         // metres: body fully translucent at or inside this (donor 0.20)
  farFade: number;          // metres: body fully opaque at or beyond this (donor 0.45)
}

// Injected wall test: returns the eye after a sphere sweep from the pivot toward the wanted eye.
export type WallSweep = (pivot: V3, wantedEye: V3) => V3;

export interface CameraFrame { eye: V3; lookAt: V3; bodyTranslucency: number; }

export class FollowCamera {
  private published: V3 | null = null;

  constructor(private readonly tune: FollowTuning, private readonly sweep: WallSweep | null) {}

  // dt in seconds. target: a single lock-on point (world coords) or null. yawOrbit: mouse/keys orbit in radians.
  update(player: V3, facing: V3, dt: number, target: V3 | null, yawOrbit: number): CameraFrame {
    const pivot = add(player, { x: 0, y: 0, z: this.tune.pivotHeight });

    // Lock-on replaces the facing with the direction from the pivot to the target.
    const fwd = norm(target ? sub(target, pivot) : facing);
    const right = { x: fwd.y, y: -fwd.x, z: 0 };          // forward x up (z-up frame)
    const boom = norm(add(mul(fwd, Math.cos(yawOrbit)), mul(right, -Math.sin(yawOrbit))));

    const horizontal = this.tune.boomDistance * Math.cos(this.tune.boomPitch);
    const vertical = this.tune.boomDistance * Math.sin(this.tune.boomPitch);
    const wanted = add(
      add(sub(pivot, mul(boom, horizontal)), { x: 0, y: 0, z: vertical }),
      mul(right, this.tune.shoulderOffset),
    );

    // Damp the eye toward the wanted spot. The step starts from the last PUBLISHED eye,
    // which is already pulled in by the wall sweep.
    const alpha = Math.min(1, Math.max(0, this.tune.stiffness * dt * 10));
    const sought = this.published === null ? wanted : lerp(this.published, wanted, alpha);

    const eye = this.sweep ? this.sweep(pivot, sought) : sought;
    this.published = eye;

    const lookAt = add(pivot, mul(right, this.tune.shoulderOffset));
    const d = len(sub(eye, pivot));
    const { nearFade, farFade } = this.tune;
    const bodyTranslucency = d >= farFade ? 0 : d <= nearFade ? 1 : 1 - (nearFade - d) / (nearFade - farFade);
    return { eye, lookAt, bodyTranslucency };
  }
}

export {};
