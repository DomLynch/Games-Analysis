// Licence: GPL-2.0 for the donor framework (luarules/gadgets/unit_script.lua); the walk include is public domain.
// Clean-room sketch written from the described mechanism (signal-masked threads, frame sleeps, keyframe clips scaled by speed),
// not a translation of the donor lines.

const FRAME_MS = 33;   // one game frame, about 30 frames per second
const SIG_AIM = 2;
const SIG_WALK = 4;

type Cmd =
  | { op: "sleepMs"; ms: number }
  | { op: "waitTurn"; key: string };

type Body = Generator<Cmd, void, undefined>;

interface Axle {
  cur: number;    // degrees
  goal: number;   // degrees
  speed: number;  // degrees per second
}

interface Thread {
  mask: number;   // signal mask; 0 means no mask signal can cancel it
  body: Body;
  wait: { kind: "sleep"; frame: number } | { kind: "turn"; key: string } | null;
  alive: boolean;
}

interface Flags {
  leftArm: boolean;
  rightArm: boolean;
  isAiming: boolean;
}

interface TurnCmd {
  piece: string;
  axis: number;
  goal: number;        // degrees
  bakedSpeed: number;  // degrees per second, for a keyframe that lasts one frame
}

interface Keyframe {
  turns: TurnCmd[];
}

const ANIM_MIN = 2;    // frames per keyframe at the fastest
const ANIM_MAX = 8;    // frames per keyframe at the slowest

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Game frames for a sleep: round to the nearest frame, never less than one.
function framesFor(ms: number): number {
  return Math.max(1, Math.round(ms / FRAME_MS));
}

// Frames per keyframe from ground speed (units per second) and the unit's max speed.
function animFramesFor(speedPerSec: number, maxSpeed: number): number {
  const ref = maxSpeed + maxSpeed / (2 * 4);   // small headroom above max speed
  const v = Math.max(1, speedPerSec);
  return clamp((4 * ref) / v, ANIM_MIN, ANIM_MAX);
}

class Rig {
  frame = 0;
  private axles = new Map<string, Axle>();
  private threads: Thread[] = [];
  private current: Thread | null = null;

  // A new goal replaces the old one, as a new engine turn does.
  turn(piece: string, axis: number, goal: number, speed: number): void {
    const key = `${piece}:${axis}`;
    const a = this.axles.get(key) ?? { cur: 0, goal: 0, speed: 0 };
    a.goal = goal;
    a.speed = speed;
    this.axles.set(key, a);
  }

  setMask(mask: number): void {
    if (this.current) this.current.mask = mask;
  }

  // Start a body now. It inherits the mask of the thread that starts it.
  start(body: Body): void {
    const mask = this.current ? this.current.mask : 0;
    const t: Thread = { mask, body, wait: null, alive: true };
    this.threads.push(t);
    this.resume(t);
  }

  // Cancel every waiting thread whose mask shares a bit with the signal.
  // A running thread is not in a wait queue, so it is not cancelled (as in the donor).
  signal(mask: number): void {
    for (const t of this.threads) {
      if (t.alive && t.wait !== null && (t.mask & mask) !== 0) {
        t.alive = false;
        t.wait = null;
      }
    }
  }

  // One game frame: move the axles, then wake sleepers and turn-waiters whose time has come.
  tick(): void {
    this.frame += 1;
    const dt = FRAME_MS / 1000;
    for (const a of this.axles.values()) {
      const step = a.speed * dt;
      const d = a.goal - a.cur;
      a.cur = Math.abs(d) <= step ? a.goal : a.cur + Math.sign(d) * step;
    }
    for (const t of [...this.threads]) {   // copy: a body may start or signal threads while we wake
      if (!t.alive || t.wait === null) continue;
      const w = t.wait;
      const ready = w.kind === "sleep" ? this.frame >= w.frame : this.settled(w.key);
      if (ready) this.resume(t);
    }
    this.threads = this.threads.filter((t) => t.alive);
  }

  private settled(key: string): boolean {
    const a = this.axles.get(key);
    return a === undefined || a.cur === a.goal;
  }

  private resume(t: Thread): void {
    t.wait = null;
    const prev = this.current;
    this.current = t;
    const r = t.body.next();
    this.current = prev;
    if (r.done || !t.alive) {
      t.alive = false;
      return;
    }
    const c = r.value;
    t.wait = c.op === "sleepMs"
      ? { kind: "sleep", frame: this.frame + framesFor(c.ms) }
      : { kind: "turn", key: c.key };
  }
}

// Keyframe walk: each keyframe lasts k frames; its turns are stretched by k from the one-frame speed.
// The mask lets StopMoving cancel the walk at once. The check at each keyframe is a second, soft stop.
function* walkCycle(rig: Rig, clip: Keyframe[], isMoving: () => boolean, frames: () => number): Body {
  rig.setMask(SIG_WALK);
  while (isMoving()) {
    for (const kf of clip) {
      if (!isMoving()) return;
      const k = Math.round(frames());
      for (const t of kf.turns) {
        rig.turn(t.piece, t.axis, t.goal, t.bakedSpeed / k);
      }
      yield { op: "sleepMs", ms: FRAME_MS * k };
    }
  }
}

// Called when movement stops: cancels the walk thread (it holds SIG_WALK in this sketch).
function stopMoving(rig: Rig, moving: { on: boolean }): void {
  moving.on = false;
  rig.signal(SIG_WALK);
}

// Upper-body aim on its own thread. It cancels the previous aim and its pending restore.
function* aimWeapon(rig: Rig, flags: Flags, headingDeg: number): Body {
  rig.setMask(SIG_AIM);
  rig.signal(SIG_AIM);
  rig.turn("aimy1", 2, headingDeg, 300);
  flags.leftArm = false;
  flags.isAiming = true;
  rig.start(aimRestore(rig, flags));
}

// Hold the aim pose for three seconds, then return the arms. A new aim cancels this thread.
function* aimRestore(rig: Rig, flags: Flags): Body {
  rig.setMask(SIG_AIM);
  yield { op: "sleepMs", ms: 3000 };
  rig.turn("aimy1", 2, 0, 105);
  flags.rightArm = true;
  flags.leftArm = true;
  flags.isAiming = false;
}
export {};
