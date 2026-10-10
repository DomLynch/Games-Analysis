// Licence: MIT (Levy Street, 2026; donor LICENSE). Adapted shape of the donor's locomotion track, base-state ladder, gait scale and hitstop; written as a small standalone module.
// Licence-note: MIT permits adapting; keep the copyright line when copying the donor text.
export const MOVE_ENTER_SPEED = 0.4;   // units/s above which the entity counts as moving
export const MOVE_HOLD_TIME = 0.22;    // s the moving latch survives a speed dip
export const SPEED_SMOOTH_RATE = 12;   // per second, cadence-speed EMA
export const GAIT_RUN_ENTER = 5.2;     // units/s smoothed speed to switch walk -> run
export const GAIT_RUN_EXIT = 3.6;      // units/s smoothed speed to drop run -> walk
export const GAIT_HOLD_TIME = 0.25;    // s dwell between gait switches
const TELEPORT_SPEED = 25;             // units/s above this is a snap, not movement

export interface LocoTrack {
  moveHold: number;
  smoothSpeed: number;
  runGait: boolean;
  gaitHold: number;
}

export interface LocoState { speed: number; moving: boolean; running: boolean; }

export function newLocoTrack(): LocoTrack {
  return { moveHold: 0, smoothSpeed: 0, runGait: false, gaitHold: 0 };
}

// One frame of locomotion hysteresis. dist = horizontal displacement this frame.
export function stepLocomotion(t: LocoTrack, dist: number, dt: number): LocoState {
  let speed = dist / Math.max(dt, 1e-4);
  if (speed > TELEPORT_SPEED) speed = 0;

  if (speed > MOVE_ENTER_SPEED) t.moveHold = MOVE_HOLD_TIME;
  else t.moveHold = Math.max(0, t.moveHold - dt);
  const moving = t.moveHold > 0;

  if (speed > MOVE_ENTER_SPEED || !moving) {
    t.smoothSpeed += (speed - t.smoothSpeed) * Math.min(0.5, dt * SPEED_SMOOTH_RATE);
  }
  if (t.gaitHold > 0) t.gaitHold -= dt;

  if (!moving) {
    t.runGait = false;
    t.gaitHold = 0;
  } else {
    const want = t.runGait ? t.smoothSpeed > GAIT_RUN_EXIT : t.smoothSpeed >= GAIT_RUN_ENTER;
    if (want !== t.runGait && t.gaitHold <= 0) {
      t.runGait = want;
      t.gaitHold = GAIT_HOLD_TIME;
    }
  }
  return { speed: t.smoothSpeed, moving, running: moving && t.runGait };
}

export interface PoseFlags {
  swimming: boolean; submerged: boolean; moving: boolean; running: boolean;
  airborne: boolean; falling: boolean; wading: boolean; combat: boolean;
}
export type Base = 'idle' | 'combatIdle' | 'walk' | 'run' | 'wade' | 'swimSurface' | 'swim' | 'swimIdle' | 'jump' | 'fall';

// Priority ladder: water and air first, then movement, then standing. A state is
// only chosen when the rig has its clip (the donor passes these as flags).
export function pickBase(s: PoseFlags, hasWade: boolean, hasCombatIdle: boolean): Base {
  if (s.swimming) {
    if (!s.moving) return 'swimIdle';
    return s.submerged ? 'swim' : 'swimSurface';
  }
  if (s.airborne) return s.falling ? 'fall' : 'jump';
  if (s.moving) {
    if (s.wading && hasWade) return 'wade';
    return s.running ? 'run' : 'walk';
  }
  if (s.combat && hasCombatIdle) return 'combatIdle';
  return 'idle';
}

// Cadence (playback speed) for a gait, matched to speed and clamped per gait.
export function gaitTimeScale(base: Base, speed: number, walkRef = 2.2, runRef = 7): number | null {
  if (base === 'walk') return Math.min(1.8, Math.max(0.6, speed / walkRef));
  if (base === 'run') return Math.min(1.6, Math.max(0.6, speed / runRef));
  return null;
}

// Outgoing gait brakes to a hold over the first fifth of the crossfade, then the blend carries it.
export function windDownScale(from: number, elapsed: number, fade: number): number {
  const brake = fade * 0.2;
  if (brake <= 0) return 0;
  return from * (1 - Math.min(1, Math.max(0, elapsed / brake)));
}

// Crossfade length for a base-state edge: longer when water is on either side.
export function edgeFade(from: Base, to: Base): number {
  const water = (b: Base) => b === 'swim' || b === 'swimSurface' || b === 'swimIdle' || b === 'wade';
  return water(from) || water(to) ? 0.34 : 0.22;
}

// Hitstop on the rig's own clock. Overlapping holds keep the longest duration and the slowest scale.
export interface HitStop { holdT: number; holdScale: number; cooldown: number; }
export function holdFrame(h: HitStop, scale: number, dur: number): void {
  if (!Number.isFinite(scale) || !Number.isFinite(dur) || dur <= 0) return;
  const d = Math.min(0.16, dur);
  if (h.holdT > 0) {
    h.holdT = Math.max(h.holdT, d);
    h.holdScale = Math.min(h.holdScale, Math.max(0.02, scale));
    return;
  }
  if (h.cooldown > 0) return;
  h.holdT = d;
  h.holdScale = Math.max(0.02, scale);
}

// The rig's clock advances at holdScale while held; the world clock is untouched.
export function rigDt(h: HitStop, dt: number): number {
  if (h.cooldown > 0) h.cooldown = Math.max(0, h.cooldown - dt);
  const rig = h.holdT > 0 ? dt * h.holdScale : dt;
  if (h.holdT > 0) {
    h.holdT -= dt;
    if (h.holdT <= 0) h.cooldown = 0.25;
  }
  return rig;
}
export {}
