// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Pose = number[];                 // one value per bone in this sketch (donor: a 4x4 transform per node)
export type Quat = [number, number, number, number]; // x, y, z, w

export interface Clip {
  readonly length: number;                   // clip length in clip-seconds
  sample(t: number): Pose;                   // pose at clip time t, t in [0, length]
}

export interface Rng {
  int(min: number, maxExclusive: number): number;
}

export interface WeightedClip {
  clip: Clip;
  weight: number;                            // 0..100; a pick below the weight selects this entry
}

// Shortest-path blend of two quaternions: lerp then normalise, flipping one end when the dot is <= 0.
export function nlerpShortest(a: Quat, b: Quat, f: number): Quat {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const s = dot <= 0 ? -1 : 1;               // donor tests acos(dot) >= pi/2
  const q: Quat = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) q[i] = f * s * b[i] + (1 - f) * a[i];
  const m = Math.hypot(q[0], q[1], q[2], q[3]);
  return [q[0] / m, q[1] / m, q[2] / m, q[3] / m];
}

// One channel per actor: one clip at a time, a timed or looping request, and a weighted idle to return to.
export class ClipChannel {
  private current: Clip | null = null;
  private next: Clip | null = null;
  private loopTime = 0;                      // position inside the current loop, clip-seconds
  private playTime = 0;                      // real seconds since the last request or idle pick
  private playLength = 1;                    // real seconds; negative means run until replaced
  private speed = 1;
  pose: Pose = [];

  constructor(private readonly rng: Rng, private readonly idle: WeightedClip[]) {}

  // Request a clip. lengthSec 0 means one loop at this speed; negative means loop until replaced.
  play(clip: Clip, restart: boolean, lengthSec: number, speed: number): void {
    if (speed <= 0) return;                                   // donor ignores speed <= 0
    this.speed = speed;
    this.playLength = lengthSec === 0 ? clip.length / speed : lengthSec;
    this.playTime = 0;                                        // timer resets even without restart
    if (restart || this.current !== clip) this.next = clip;   // same clip, no restart: keep the phase
  }

  private pickIdle(): Clip | null {
    let pick = this.rng.int(0, 100);
    for (const entry of this.idle) {
      if (pick < entry.weight) return entry.clip;
      pick -= entry.weight;
    }
    return null;                             // weights below 100 in total leave a chance of no idle
  }

  private startIdle(): void {
    const chosen = this.pickIdle();
    if (chosen === this.current) return;     // donor: same idle schedules nothing
    this.next = chosen;
    this.speed = 1;
    this.playLength = chosen ? chosen.length : 1;   // an idle plays one loop, then re-rolls
    this.playTime = 0;
  }

  private setCurrent(clip: Clip | null): void {
    this.current = clip;
    this.loopTime = 0;
  }

  // One tick of real time dt in seconds.
  tick(dt: number): void {
    let lastT = this.loopTime;
    let nextT = this.loopTime + this.speed * dt;

    if (!this.current && !this.next) this.startIdle();

    if (this.next) {                         // a scheduled clip starts now and interrupts the current one
      this.setCurrent(this.next);
      this.next = null;
      dt = 0;
      lastT = 0;
      nextT = 0;
    }
    if (!this.current) return;               // donor: no clip this tick, the last pose stays

    const len = this.current.length;
    if (lastT < len && nextT >= len) {       // the loop ends inside this tick: show its last frame
      this.pose = this.current.sample(len);
      this.playTime += dt;
      this.loopTime = len;
      return;
    }

    if (this.playLength >= 0 && this.playTime >= this.playLength) {  // timed clip is over: return to idle
      this.startIdle();
      this.setCurrent(this.next);
      this.next = null;
      if (this.current) this.pose = this.current.sample(0);
      return;
    }

    if (lastT >= len) {                      // start the next loop
      this.pose = this.current.sample(0);
      lastT = 0;
      nextT = this.speed * dt;
    }
    this.pose = this.current.sample(nextT);
    this.playTime += dt;
    this.loopTime = nextT;
  }
}

export {};
