# flareteam-flare-engine (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/Animation.cpp` (with `Animation.h`, `AnimationSet.cpp`, `EntityBehavior.cpp`, `Entity.cpp`, `UtilsParsing.cpp`, `Settings.cpp`, `AnimationManager.cpp`) | Licence: GPL-3.0-or-later (`src/Animation.h` lines 9-11: "either version 3 of the License, or (at your option) any later version"; `COPYING` is GPL v3) | C++ | symbols `Animation::advanceFrame`, `Animation::isActiveFrame`, `Animation::setup`, `EntityBehavior::updateState`, `Entity::setAnimation`, `Entity::takeHit` (hit gate at `Entity.cpp` 660-713)

Checked: The hint file (`AnimationManager.cpp`) is a name-keyed cache of AnimationSets (`getAnimationSet` 30-46); it is not the mechanism, and its count and cleanup functions (67-106) were not read. The mechanism is in `Animation.cpp` (clip playback and active frames) and in `EntityBehavior.cpp` (an animation-driven state machine for attacks, hits and deaths). Read end to end: `Animation.h` 38-166; `Animation.cpp` 34-66 (constructor), 89-171 (setup), 188-275 (advance, render, reset), 284-415 (sync, active frames, first/last/second-last, times played, completion), 441-485 (speed, lazy init); `EntityBehavior.cpp` 752-906 (advance, power state, hit state), 908-941 (die); `Entity.cpp` 660-740 (hit gate), 743-765 (setAnimation); `AnimationSet.cpp` 33-45 (getAnimation returns a fresh copy); `UtilsParsing.cpp` 242-262 (durations to logic frames); `Settings.cpp` 84 (max_fps default 60); `AnimationSet.cpp` 170-200 (data keys, grep and read in part). Not read: `Avatar.cpp` hero attack and hit states (720-900; grep lines only), `PowerManager` activation and the TRIGGER_HIT check (grep lines only), the power's own effect, the logic loop that calls `updateState`, `AnimationManager` count and cleanup (67-106), `Animation::addFrame` (173-187). Confidence: high for clip rules, active-frame firing, hold-on-frame and the hit gate; the damage a fired power does is not covered. camera_scope: not a camera cell.

Best transferable idea: Fire an attack on a named active frame of its clip, fall back to the last frame if a play-once clip skipped it, and hold the clip on a windup frame while the state timer runs, so the telegraph is data and the strike is an animation event.
Decision (proposed): adapt — the active-frame event and the windup hold fit creature clips, but in Frankendom the server must fire the attack on its own tick and the clip must be driven to land its active frame on that tick, not the reverse.
Acceptance: a creature's attack holds on its windup frame for the data windup time and its active frame lands on the same tick the server records the fire event, asserted for every attack in the catalogue by a test.

## 1. Mechanism

Two parts, read end to end.

A. Clip playback (`Animation.cpp`).
- A clip is built once by `setup(frames, duration)` (89-171). `duration` is in logic frames (see data notes below). Each logic frame is a "sub-frame"; the clip's frames are spread over those sub-frames. If the duration divides evenly by the frame count, each frame repeats `duration / frames` times (94-102). Otherwise a Bresenham-style line lays them out (103-132; the source has a TODO saying this can give odd results).
- Default active frame: the middle frame, `(total - 1) / 2` (146). Data can replace the list (`setActiveFrames`, 309-336): a list, `-1` for every frame (313-317), and indices past the end are clipped to the last frame (326-335). Setting an explicit list clears `default_active_frames` (310-311).
- Each logic tick `advanceFrame` (188-252) moves `sub_frame_f` by `speed` (the attack speed as a fraction, `setSpeed` 441-443) and sets `sub_frame` to its integer part.
  - Play once: advances until the last sub-frame, then holds it and sets `times_played = 1` (198-205).
  - Looped: wraps to 0 and counts `times_played` (208-218).
  - Back and forth: forward then reverse (220-243; not in the sketch).
- `isActiveFrame` (359-389) is true once, at the end sub-frame of an active frame (default `END`; `START` and `ALL` also exist). For play-once clips, if the clip has reached its last frame and no active frame has fired, it reports active (384-386), so a skipped impact still fires at the end. Back-and-forth clips fire active frames only on their first forward pass (364-365).
- `reset` (275-282) clears the progress and the fired flag. `Entity::setAnimation` (743-765) does nothing if the name is unchanged; otherwise it deletes the old clip and gets a fresh copy from the set (`AnimationSet::getAnimation` 33-45 returns `new Animation(*...)`). So each new clip starts at frame 0, and a missing name falls back to a single-frame default.

B. Animation-driven state machine (`EntityBehavior.cpp`, `Entity.cpp`).
- Each `updateState` (called from `EntityBehavior.cpp` 103 in the per-entity update; the main loop that calls it was not read, so the tick rate is assumed to be the max fps setting) first advances the active clip and the extra clips unless `hold_state` is set (765-771). Then it switches on the state.
- Enemy power, state `POWER` (785-881):
  - On the first frame of the attack clip (811): chain pre-powers roll their chance (813-818); the clip speed is set from the creature's attack speed times the power's attack speed (820-821); the attack sound plays (822); the state timer gets `state_duration` (824-825); charge speed and timer are set (827-836).
  - `HOLD_ON_FRAME` (839-846): when the clip reaches `state_hold_frame` and the state timer has time left, `hold_state` is set, which stops the clip (765-766). The hold ends when the timer ends.
  - Active frame (851-867): `powers->activate` fires the power once when `isActiveFrame()` is true and not held. `HOLD_ON_ACTIVE_FRAME` (865-866) holds after the active frame until the timer ends.
  - End (870-881): when the clip is on its last frame and the timer has ended, or the attack clip was replaced, or the power was instant, the state returns to stance and the power cooldown restarts (unless instant).
- Hit state `ENTITY_HIT` (898-906): plays the `hit` clip; on its first frame sets `triggered_hit` (used by power triggers, PowerManager 2215); returns to stance on the last frame or if the clip is no longer `hit`.
- Death states (908-941): the death power fires at the second-last frame by default (916), or at the active frame if the clip has explicit active frames; the corpse flag is set on the last frame or when the clip is no longer `die` (923-925). `critdie` is the same (943-962).
- Hit gate (`Entity::takeHit`, `Entity.cpp` 660-713): a hit plays the hit sound only if `cooldown_hit` has ended (661-662). An enemy's ON_HIT power is queued on the hit (673-677). Poise is one of three styles: chance (`percentChanceF(POISE)`), HP (damage over max HP times 100, at most POISE), or absorb (`(absorption / dmg) * 100 > POISE`) (683-693; the integer types of `absorption` and `dmg` were not checked). A hit changes the state to `ENTITY_HIT` when `cooldown_hit` has ended, the target is not stunned, the hit is not a poise success or is critical, and `prevent_interrupt` is off (695-698). For an enemy this cancels its casting (703-706). The hit cooldown is reset on each hit that passes the check (696).

## 2. Key functions

- `Animation::advanceFrame`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Animation.cpp` 188-252 (clip modes per logic tick).
- `Animation::isActiveFrame`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Animation.cpp` 359-389 (impact frame and the play-once fallback).
- `Animation::setup`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Animation.cpp` 89-171 (sub-frame layout, default active frame).
- `EntityBehavior::updateState`: `/mnt/frankendom-donors/flareteam-flare-engine/src/EntityBehavior.cpp` 752-906 (advance, power state, hit state).
- Death states: `/mnt/frankendom-donors/flareteam-flare-engine/src/EntityBehavior.cpp` 908-941.
- Hit gate, `Entity::takeHit`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` 319-729 (gate at 660-713).
- `Entity::setAnimation`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` 743-765.
- `AnimationSet::getAnimation`: `/mnt/frankendom-donors/flareteam-flare-engine/src/AnimationSet.cpp` 33-45.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where it lives) |
|---|---|
| Clip duration in logic frames, from ms or s at the max fps setting | `val * max_frames_per_sec / 1000`, rounded, at least 1 (`UtilsParsing.cpp` 250-261); max fps default 60 (`Settings.cpp` 84) |
| Frames spread evenly over the duration | Repeat `duration / frames` (`Animation.cpp` 94-101) |
| Impact frame: middle by default | `(total_frame_count - 1) / 2` (`Animation.cpp` 146) |
| Impact fires once, at the end sub-frame of its frame | `ACTIVE_SUBFRAME_END` default (`Animation.cpp` 42, 368) |
| Play-once impact fallback to the last frame | `isLastFrame() && !active_frame_triggered` (`Animation.cpp` 384-385) |
| Attack speed scales the clip | `(getAttackSpeed * attack_speed) / 100` (`EntityBehavior.cpp` 820-821); `speed = val / 100` (`Animation.cpp` 441-443) |
| Death impact at the second-last frame | `isSecondLastFrame()` (`EntityBehavior.cpp` 916; `Animation.cpp` 355-357) |
| Poise as percent of max HP (HP style) | `(dmg / HP_MAX) * 100 <= POISE` (`Entity.cpp` 688-689) |
| Hit interrupt gate | `!stun && (!poise_success || crit) && !prevent_interrupt` (`Entity.cpp` 698) |

## 4. TypeScript sketch

simplified: the sketch is written in logic ticks and uses the donor's play-once and looped clips, the active-frame rules (end sub-frame, play-once fallback), the windup hold, and the HP poise style with the hit gate. It spreads frames evenly with integer rounding, where the donor uses a Bresenham line when the duration does not divide evenly. It omits back-and-forth playback, the `START` and `ALL` active sub-frame modes, the explicit active-frame list (the caller passes it), the sound and charge hooks, chain pre-powers, the `HOLD_ON_ACTIVE_FRAME` hold, the hit cooldown reset and sound, the ON_HIT power, the stun-free states and the death and corpse rules, and the chance and absorb poise styles. The hit gate here does not reset the hit cooldown. The donor's `speed` is a float per tick, as here.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// A clip advanced once per logic tick, an attack that fires on its active frame and can hold on a windup frame,
// and a hit gate that lets a small hit pass without a stagger. Time is in logic ticks (donor: max_fps, 60 by default).

class Clip {
  private sub = 0;               // index into subFrames (one entry per logic tick of the clip)
  private subF = 0;              // fractional position, advanced by speed each tick
  private timesPlayed = 0;
  private activeFired = false;   // play-once clips fall back to their last frame if the active frame was skipped
  private readonly subFrames: number[];

  constructor(
    frames: number,
    durationTicks: number,
    private readonly playOnce: boolean,
    private readonly activeFrames: number[],   // frames that can fire the power
    private readonly speed: number,            // sub-frames per tick (donor: attack speed % / 100)
  ) {
    this.subFrames = [];
    for (let t = 0; t < durationTicks; t++) {
      this.subFrames.push(Math.min(frames - 1, Math.floor((t * frames) / durationTicks)));
    }
  }

  frameNow(): number {
    return this.subFrames[this.sub];
  }

  isLastFrame(): boolean {
    return this.sub === this.subFrames.length - 1;
  }

  advance(): void {
    const last = this.subFrames.length - 1;
    if (this.sub < last) {
      this.subF += this.speed;
      this.sub = Math.min(last, Math.floor(this.subF));
    } else if (this.playOnce) {
      this.timesPlayed = 1;     // holds the last frame
    } else {
      this.sub = 0;             // looped: wrap
      this.subF = 0;
      this.timesPlayed++;
    }
  }

  // True once, at the end sub-frame of an active frame (donor default). A play-once clip that reaches
  // its last frame without having fired reports active there.
  isActiveFrame(): boolean {
    const frame = this.frameNow();
    if (this.activeFrames.includes(frame)) {
      let lastSub = this.sub;
      while (lastSub + 1 < this.subFrames.length && this.subFrames[lastSub + 1] === frame) lastSub++;
      if (this.sub === lastSub && this.subF === this.sub) {
        if (this.playOnce) this.activeFired = true;
        return true;
      }
      return false;
    }
    if (this.playOnce && this.isLastFrame() && !this.activeFired) return true;
    return false;
  }

  getTimesPlayed(): number {
    return this.timesPlayed;
  }
}

interface AttackRun {
  timerTicks: number;        // state timer; counts down one per logic tick
  holdFrame: number | null;  // hold the clip on this frame while the timer runs (windup), or null
  holding: boolean;
}

// One logic tick of an attack. Fires the power once on the active frame, unless held.
// Returns "done" on the last frame once the timer is spent.
function stepAttack(run: AttackRun, clip: Clip, fire: () => void): "running" | "done" {
  if (!run.holding) clip.advance();
  if (run.holdFrame !== null && !run.holding && clip.frameNow() === run.holdFrame && run.timerTicks > 0) {
    run.holding = true;
  }
  if (run.timerTicks <= 0) run.holding = false;
  if (clip.isActiveFrame() && !run.holding) fire();
  run.timerTicks -= 1;
  return clip.isLastFrame() && run.timerTicks <= 0 ? "done" : "running";
}

interface HitInput { dmg: number; crit: boolean; }

interface TargetState {
  maxHp: number;             // health maximum (donor: HP_MAX)
  poisePct: number;          // poise as a percent of max health (HP poise style)
  stunned: boolean;
  preventInterrupt: boolean; // set while a power that resists hits is active
  hitCooldownDone: boolean;  // donor: cooldown_hit has ended
}

// Whether a hit staggers into the hit clip. A hit whose damage is at most poisePct of max health
// does not stagger, unless it is critical. Stun and prevent-interrupt always block the stagger.
function hitStaggers(h: HitInput, s: TargetState): boolean {
  if (!s.hitCooldownDone || s.stunned || s.preventInterrupt) return false;
  const poiseOk = s.maxHp > 0 && (h.dmg / s.maxHp) * 100 <= s.poisePct;
  return !poiseOk || h.crit;
}
```

## 5. Lands in

- TARGET `src/fight/creature-clip.ts` (new, client-side clip player and attack run for creatures). The server decides when an attack fires; the client drives the clip so that its active frame lands on that tick. The hit gate belongs to the fight step (see section 6), not to this module.
- Parity-checklist row 7 (creature actor/clips). Row 6 (hero actor) would also fit: the hero's attack and hit states use the same ideas (`Avatar.cpp` 720-900, not read in full).
- today: the Frankendom repo was not read; no current clip or attack-run code is claimed.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape taken, no lines copied)
- Brief rule served: one engine (the fire tick and the hit gate are fight-step values; the clip is display), zones as data (clip frames, durations, active frames, windup hold and poise come from creature data), server-verified kills (the server records the fire event; the client does not decide damage).

## 6. Gaps and risks

- The donor fires powers from the client's animation state (`EntityBehavior.cpp` 851-852). That is the wrong owner for Frankendom. The server must record the fire event from its own tick, and the client aligns the active frame to it. Any drift between the two is a test failure, not a reason to move the fire into the clip.
- The donor's hold and active rules are per entity and run every tick, so a slow frame changes the feel. Frankendom must drive the clip from elapsed time and the fixed server tick, not from a frame count on the client.
- The play-once fallback (fire at the last frame if the active frame was skipped) hides a missed impact. Frankendom should prefer an explicit active frame in the data and a test that every attack has one.
- The poise gate is a fight rule. It belongs with the hit step (row 1, or row 10 for hit impact), and must be decided by the server. Its HP style (damage as a percent of max HP) maps well to a duel; the other two styles (chance and absorb) are not chosen here.
- The donor resets the hit cooldown on each hit that passes the check (`Entity.cpp` 696). The sketch omits this; Frankendom must decide whether a blocked hit restarts the cooldown and test it.
- The donor's uneven-duration layout is a Bresenham line with a TODO about odd results (`Animation.cpp` 103-132). Frankendom should keep clip frames to durations that divide evenly, or spread them with a stated rule.
- The donor's durations are rounded to logic frames at the max fps setting (`UtilsParsing.cpp` 250-261). Frankendom should store windup and clip lengths in ms and convert once.
- The damage a fired power does is in `PowerManager` (not read), so this note makes no claim about damage.
- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is copied.
