# levy-street-world-of-claudecraft (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/locomotion.ts` (whole file: gait and moving hysteresis) with `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/characters/anim_state.ts` (base-state ladder 423-458, gait scale 467-534, crossfade wind-down 475-497, swim and tread blends 186-207, watchdog 336-374), `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/characters/visual.ts` (fades 180-185, 340-347; hitstop 1329-1336, 1884-1889; flinch 1871-1875; crossfade in `beginAction` 3818-3858) | Licence: MIT (`/mnt/frankendom-donors/levy-street-world-of-claudecraft/LICENSE`, line 1 "MIT License", line 3 "Copyright (c) 2026 Levy Street"); code may be adapted, keep the copyright line | TypeScript (Three.js) | symbol `updateLocomotionInto`

Checked: the hint file `src/render/ability_vfx/spirits.ts` is a spirit-apparition VFX (ghost puppets, dissolve), not the rig state; header read (lines 1-30), not the mechanism. Read in full: `src/render/locomotion.ts` (1-150), `desiredBaseState` (anim_state.ts 423-458), `locomotionTimeScale` and `gaitWindDownTimeScale` (anim_state.ts 494-541), the swim and tread blends (183-207), the fall and swim latches (133-170), the watchdog functions (325-395). Read in part: `visual.ts` (340-347, 1090-1180, 1222-1250, 1322-1345, 1862-1935, 3430-3460, 3516-3530, 3750-3775, 3795-3870). Callers checked by grep: `updateLocomotionInto` is called from `src/render/renderer.ts` 10664 only; `desiredBaseState` from `visual.ts` 3446 only; `locomotionTimeScale` from `visual.ts` 1160 only; `gaitWindDownTimeScale` from `visual.ts` 3768 only. `holdFrame` and `playHit` callers were not checked (definitions read). Camera scope: not a camera cell. Confidence: high on the pure functions (read end to end, every number checked against its line); medium on how `visual.ts` drives the mixer (read in parts; the mixer's per-frame order beyond 1322-1345 is not read). Not read: the per-rig `VisualDef` values (walkRef, runRef and so on), the climb and one-shot code, `characters/CLAUDE.md` (455 lines), `weapon_grip.ts` and `rig_shared_skeleton.ts` (attachment points, not in this note).

Best transferable idea: pick walk or run from hysteresis over a smoothed speed (enter 5.2, leave 3.6, 0.25 s dwell) and latch "moving" for 0.22 s after a speed dip, so that noisy frames never flip the clip; then match each gait's playback rate to speed within clamps and crossfade with a length that depends on whether water is involved.
Decision (proposed): adapt - take the locomotion latch, the walk/run hysteresis with dwell, the per-gait rate clamps and the crossfade-length rule as the hero's client animation state; do not take the donor's speed units or its per-rig reference speeds as fixed (keep them as data per rig). The engine never reads a pose, so nothing here touches the fight step.
Acceptance: a test drives `stepLocomotion` at a steady speed and asserts the walk-to-run switch happens only when the smoothed speed reaches 5.2 units/s, the return only at or below 3.6, and no second switch within 0.25 s; the hero's clips therefore never flicker between walk and run on a stalled frame.

## 1. Mechanism

Four client-side pieces, one per frame per entity. None of them is in the engine.

(a) Locomotion latch and speed (`locomotion.ts` 83-148). Speed is displacement over dt (93). A speed above 25 units/s is a teleport snap, not movement, and is set to 0 (94). A speed above 0.4 units/s sets the move latch to 0.22 s (96); otherwise the latch counts down by dt and "moving" stays true until it reaches zero (97-98). The cadence speed moves towards the raw speed by `min(0.5, dt * 12)` per frame on frames where the speed is above the enter threshold or the entity is not moving (104-105), so a latched but stalled entity keeps its last cadence value (comment 100-103). The cadence speed is an exponential average whose step never exceeds half the gap.

(b) Gait hysteresis (136-141). If the entity is not moving, the run flag and the dwell reset at once (132-135). Otherwise the flag switches to run when the smoothed speed is at least 5.2 and back to walk when it is at or below 3.6 (136-138), but only if the 0.25 s dwell has run out (139), and each switch restarts the dwell (141). Per-rig thresholds can replace the 5.2 and 3.6 (`LocoGaitThresholds`, 137-138). The donor's comment says a single threshold made the clip replay on noisy frames (`locomotion.ts` 14-19).

(c) Backpedal (116-129). A displacement whose dot with the facing direction is below -0.3 counts as backwards, but a change of direction must hold for three consecutive frames (119). A stalled frame keeps the last direction.

(d) Base state ladder (`anim_state.ts` `desiredBaseState`, 423-458). Order: swimming (431; idle or stroke), then airborne (439; fall or jump), then spinning (440), casting (441), sitting (442), then moving (443: wade if the rig has a wade clip, 446; prowl walk; walk-back if the rig has it and reverse backpedal is off, 448; otherwise run or walk, 449), then standing (combat idle only if the rig has the loop, 458; otherwise idle). Each optional state is only chosen when the loaded rig has its clip; `visual.ts` 3446-3453 passes that as a flag, so the machine never sits in a state that plays nothing.

(e) Cadence and crossfade.
- Playback rate: `locomotionTimeScale` (500-534): walk rate is `speed / 2.2` clamped to [0.6, walkMax 1.8] (526); run rate is `speed / 7` clamped to [runTimeScaleMin, runMax 1.6] (534); wade is `speed / 4.2` clamped to [0.65, 1.45] (527-532); swimming is `speed / 3.2` clamped to [0.55, 1.4] (511-516). Walk and run references are at 74-75; wade and swim references at 77-79. Treading returns null (its own tempo).
- Edge fade: `baseTransitionFade` returns FADE 0.22 s (`visual.ts` 180, 3516-3525), except a winged form's jump (0.04, 3519) and a cut-to-idle vehicle (CUT_FADE 0.02, 185, 3524). `waterFade` returns WATER_FADE 0.34 s when either side is a water state (340-345).
- Wind-down: when a forward gait is faded out, its playback rate is driven to zero over the first 20% of the fade (`GAIT_WIND_DOWN_SETTLE` 0.2 at 475; `gaitWindDownTimeScale` 494-497; applied per frame at `visual.ts` 3768). The wind-down is armed only for a forward gait (3854-3856) and is dropped when the snap path runs (3863).
- `beginAction` (3818-3863): every other running action is stopped (the donor says it uses `stop()` rather than `fadeOut()` to avoid a stale flash); if the outgoing action still drives the pose, it fades out and the incoming one fades in over the same time (3849, 3858); otherwise the outgoing one is stopped and the incoming one snaps in (so the rig never blends toward the bind pose).

(f) Smooth swim and tread blends and a pose watchdog. Swim blend approaches 1 or 0 with response 8 per second in and 6 out (186-187), frame-rate independent. Tread blend uses rate 6 (204, 207). The watchdog: if the current action does not drive the pose (weight at least 0.05, 336, 351), it counts starved frames and re-drives the base pose after 3 (341, 374; `visual.ts` 1229-1232).

Hit reaction and hitstop (not this note's decision, see section 6): `playHit` plays a random flinch clip once, refused while dead or while a one-shot plays, with a 0.9 s cooldown (`visual.ts` 1871-1875; 284). `holdFrame` lets a hit slow only this rig's clock: duration capped at 0.16 s (1886), overlapping holds keep the longest duration and the slowest scale (1888-1889), and the rig's dt is multiplied by the scale while held (1332). After a hold a 0.25 s refractory blocks new holds (1336; 291). The mixer's dt is capped at 0.3 s (347).

## 2. Key functions

- `updateLocomotionInto`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/locomotion.ts` 83-148. Speed, move latch, cadence EMA, direction, gait hysteresis with dwell. Called from `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/renderer.ts` 10664.
- `desiredBaseState`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/characters/anim_state.ts` 423-458. Base-state ladder, gated by loaded clips.
- `locomotionTimeScale`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/characters/anim_state.ts` 500-534. Per-gait playback rate with clamps; backwards gait gets a negative rate.
- `gaitWindDownTimeScale`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/characters/anim_state.ts` 494-497. Linear brake to zero over the settle share of the fade.
- `advanceSwimBlend` and `advanceTreadBlend`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/characters/anim_state.ts` 183-207. Exponential approach to 0 or 1.
- `scanAnimRepair`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/characters/anim_state.ts` 374-385. Starved-frame watchdog.
- `beginAction`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/characters/visual.ts` 3818-3863. Crossfade and wind-down arming (read in part).
- `holdFrame`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/characters/visual.ts` 1884-1894. Hitstop merge rule.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (theirs) |
|---|---|
| Moving latch | enter above 0.4; hold 0.22 s (locomotion.ts 11-12, 96-97) |
| Teleport snap | speed above 25 becomes 0 (locomotion.ts 23, 94) |
| Cadence smoothing | rate 12 per second; step capped at 0.5 (locomotion.ts 13, 105) |
| Walk/run hysteresis | run at 5.2 or more, walk at 3.6 or less (locomotion.ts 20-21, 137-138) |
| Gait dwell | 0.25 s between switches (locomotion.ts 22, 139-141) |
| Backpedal test | dot product below -0.3 (locomotion.ts 116); three frames to change direction (119) |
| Walk rate | speed / 2.2, clamped 0.6 to 1.8 (anim_state.ts 74, 526) |
| Run rate | speed / 7, clamped 0.6 to 1.6 (anim_state.ts 75, 534) |
| Wade rate | speed / 4.2, clamped 0.65 to 1.45 (anim_state.ts 79, 532) |
| Swim rate | speed / 3.2, clamped 0.55 to 1.4 (anim_state.ts 77, 516) |
| Crossfade | 0.22 s; 0.34 s next to water; 0.02 s for a vehicle cut to idle (visual.ts 180, 340, 185) |
| Gait brake | first 0.2 of the fade (anim_state.ts 475, 495) |
| Swim blend | response 8 in, 6 out per second (anim_state.ts 186) |
| Tread blend | rate 6 per second (anim_state.ts 207) |
| Pose watchdog | weight 0.05; 3 starved frames (anim_state.ts 336, 341) |
| Fall flail latch | enter 9.5, exit 7 (anim_state.ts 139-140) |
| Swim latch | enter 0.5 and floor 0.8; exit 0.25 and floor 0.6 (anim_state.ts 81-84) |

Units: the donor's speed comments say both "u/s" and "yd/s" (locomotion.ts 11, anim_state.ts 133-140 comments). Treat the numbers as units per second in the donor's world, and keep them as per-rig data in Frankendom, not as constants.

Worked check: a steady 6 units/s displacement sets the cadence speed towards 6; the walk-to-run switch happens on the first frame where the smoothed speed is at least 5.2, provided the 0.25 s dwell has run out. From run, the return to walk needs the smoothed speed at or below 3.6.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: speed and teleport snap, moving latch, cadence smoothing, gait hysteresis with dwell, the base-state ladder (swim, air, move, stand), the walk and run rate clamps, the gait brake, the water-aware crossfade length, and the hitstop merge with the rig-only clock. It omits the backpedal and direction-dwell logic, the per-rig reference and clamp overrides, the spin, cast, sit and prowl states, the swim and tread blends, the watchdog, the climb and one-shot code, the mixer's 0.3 s dt cap, and the donor's `holdCooldown` decrement that also runs elsewhere in the update (visual.ts 1054, 1432). The sketch decrements the hitstop cooldown inside `rigDt`, which is a re-ordering.

```ts
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
```

## 5. Lands in

- TARGET `src/fight/actor-anim.ts` (new, client only): the hero's locomotion latch, gait pick, base-state ladder, gait rate and crossfade length. The engine never reads a pose; the fight state stays in the engine. Parity-checklist row 6 (hero actor/animation).
- Hitstop and the flinch are also visual and sit closer to row 10 (hit impact/hitstop); they are not decided by this note. See section 6.
- Server tick: the donor passes the renderer's frame dt into the locomotion update (renderer.ts 10664), so the hero's clips follow the local frame, not the server tick. Frankendom's rule that the server owns the fight means the clip may lag a few frames but must not decide a hit; the server tick sub-line (row 18 / post-K item 3) does not change this note.
- Reuse tag: adapt (MIT; keep the copyright line)
- Brief rule served: 1 (one engine, two clients: the animation state is presentation only, the engine keeps the fight); rules 7-9 n/a

## 6. Gaps and risks

- MIT: adapting the code is allowed. The sketch is an adapted shape of the donor functions, not a copy; if any donor text is copied, keep the copyright line.
- Frankendom's hero is a Three.js rig too (per the brief), but this note did not read Frankendom's hero code, so whether it already has a walk-run switch is not checked. Check before building.
- Units and reference speeds are the donor's own; Frankendom's movement speeds are not the same, so the 5.2 and 3.6 thresholds must be set from Frankendom's own run speed as data, not copied.
- The donor's `holdFrame` is a visual slow-down of the rig's clock only; it does not change the world. That is the right shape for a server-verified kill: a hitstop may slow the attacker's clip, but the damage must still resolve on the server at its own time. Do not let the hitstop delay the server.
- Hit reaction and hitstop belong to row 10. The donor's rules (0.9 s flinch cooldown; 0.16 s hitstop cap; 0.25 s refractory) are the piece to evaluate there, separately from this note.
- Not read: the rest of `visual.ts` (the per-frame mixer order, the one-shot and climb code, the cast and sit flows), the `VisualDef` values, `characters/CLAUDE.md`, `weapon_grip.ts` and `rig_shared_skeleton.ts`. The sketch's order follows the functions read; the mixer's order was read only in part.
- `playHit` and `holdFrame` callers were not checked, so it is not known which combat events call them in the donor.

Reuse tag: adapt (MIT; keep the copyright line)
Brief rule served: 1 (one engine, two clients); rules 7-9 n/a
