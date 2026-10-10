// Licence: clean-room sketch written from the mechanism in the donor note, not a translation of donor lines.
// No donor clip values are copied (datasrc is CC-BY-SA 3.0); the keyframe values are authored per rig.

type Key = { t: number; x: number; y: number; a: number }; // a = rotation in turns
type Channel = { x: number; y: number; a: number };
type Clip = { body?: Key[]; backFoot?: Key[]; frontFoot?: Key[]; attach?: Key[] };
type Pose = { body: Channel; backFoot: Channel; frontFoot: Channel; attach: Channel };

// Tunable data (clip values and sim constants), not engine code.
const STRIDE_UNITS = 100;     // world units per full walk cycle (donor WalkTimeMagic = 100)
const STAND_RAW_VEL = 1;      // |raw velocity| <= this counts as standing (donor Stationary)
const TICKS_PER_SECOND = 50;  // donor SERVER_TICK_SPEED
const SKID_SCALED = 500;      // donor: length(Vel*50) > 500

// Linear sample of one channel. Clamps outside the key range; empty channel is all zero.
function sampleKeys(keys: Key[] | undefined, t: number): Channel {
  if (!keys || keys.length === 0) return { x: 0, y: 0, a: 0 };
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (keys.length === 1 || t <= first.t) return { x: first.x, y: first.y, a: first.a };
  if (t >= last.t) return { x: last.x, y: last.y, a: last.a };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (a.t <= t && t <= b.t) {
      const u = (t - a.t) / (b.t - a.t);
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, a: a.a + (b.a - a.a) * u };
    }
  }
  return { x: last.x, y: last.y, a: last.a };
}

function blankPose(): Pose {
  const z = (): Channel => ({ x: 0, y: 0, a: 0 });
  return { body: z(), backFoot: z(), frontFoot: z(), attach: z() };
}

// The base clip is SET (overwrites the pose). Every other clip is ADDED, weighted, channel by channel.
function setClip(pose: Pose, clip: Clip, t: number): void {
  pose.body = sampleKeys(clip.body, t);
  pose.backFoot = sampleKeys(clip.backFoot, t);
  pose.frontFoot = sampleKeys(clip.frontFoot, t);
  pose.attach = sampleKeys(clip.attach, t);
}

function addClip(pose: Pose, clip: Clip, t: number, weight: number): void {
  const add = (dst: Channel, src: Channel): void => {
    dst.x += src.x * weight;
    dst.y += src.y * weight;
    dst.a += src.a * weight;
  };
  add(pose.body, sampleKeys(clip.body, t));
  add(pose.backFoot, sampleKeys(clip.backFoot, t));
  add(pose.frontFoot, sampleKeys(clip.frontFoot, t));
  add(pose.attach, sampleKeys(clip.attach, t));
}

// Gait phase in [0, 1) from DISTANCE travelled, not elapsed time: feet step once per stride.
function gaitPhase(x: number, stride: number): number {
  const m = x % stride;
  return (m < 0 ? m + stride : m) / stride;
}

export interface Motion {
  x: number;                 // interpolated world x (between last two sim ticks)
  vx: number;                // interpolated velocity, units per tick
  rawVx: number;             // integer velocity as sent by the sim
  inputDir: -1 | 0 | 1;      // player input, not velocity
  airborne: boolean;         // caller tests a ground probe below the centre
}

export type Locomotion =
  | { kind: "inair" }
  | { kind: "idle" }
  | { kind: "walk"; phase: number }
  | { kind: "none" }; // input opposes motion: base pose only, no walk clip

function wantsOtherDir(m: Motion): boolean {
  return (m.inputDir === -1 && m.vx > 0) || (m.inputDir === 1 && m.vx < 0);
}

// Order matches the donor: airborne first, then standing, then walk unless input opposes motion.
export function pickLocomotion(m: Motion): Locomotion {
  if (m.airborne) return { kind: "inair" };
  if (Math.abs(m.rawVx) <= STAND_RAW_VEL) return { kind: "idle" };
  if (wantsOtherDir(m)) return { kind: "none" };
  return { kind: "walk", phase: gaitPhase(m.x, STRIDE_UNITS) };
}

// Swing progress in [0, 1] from ticks since the attack tick. speed is data: the donor uses 5 for the hammer, 2 for the ninja.
export function swingT(elapsedTicks: number, speed: number): number {
  const ct = elapsedTicks / TICKS_PER_SECOND; // donor also adds one tick-time term; omitted here
  return Math.min(1, Math.max(0, ct * speed));
}

export function isSkidding(m: Motion): boolean {
  return !m.airborne && wantsOtherDir(m) && Math.abs(m.vx) * TICKS_PER_SECOND > SKID_SCALED;
}

export interface Clips {
  base: Clip;
  inair: Clip;
  idle: Clip;
  walk: Clip;
}

export interface Swing {
  clip: Clip;
  elapsedTicks: number;
  speed: number;
}

export function buildPose(clips: Clips, motion: Motion, swing: Swing | null): { pose: Pose; locomotion: Locomotion } {
  const locomotion = pickLocomotion(motion);
  const pose = blankPose();
  setClip(pose, clips.base, 0);
  if (locomotion.kind === "inair") addClip(pose, clips.inair, 0, 1);
  else if (locomotion.kind === "idle") addClip(pose, clips.idle, 0, 1);
  else if (locomotion.kind === "walk") addClip(pose, clips.walk, locomotion.phase, 1);
  if (swing) addClip(pose, swing.clip, swingT(swing.elapsedTicks, swing.speed), 1);
  return { pose, locomotion };
}
