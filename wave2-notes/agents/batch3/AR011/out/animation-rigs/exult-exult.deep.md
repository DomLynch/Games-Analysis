# exult-exult (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/exult-exult/objs/animate.cc` (with `shapes/shapeinf/aniinf.h`, `actors.cc`, `combat.cc`, `actions.cc`, `schedule.cc`, `gamewin.cc`) | Licence: GPL-2.0-or-later (`objs/animate.cc` lines 13-14: "either version 2 ... or (at your option) any later version"; `COPYING` is GPL v2) | C++ | symbols `Frame_animator::handle_event`, `Frame_animator::get_next_frame`, `Frame_animator::Initialize`, `Actor::get_attack_frames`, `Combat_schedule::start_strike`, `Npc_actor::handle_event`

Checked: The hint file (`objs/animate.cc`) is the world-object clip player; it is real and read in full for its frame logic. The rig-like part sits in the actor code: swing pose tables per weapon style and direction (`actors.cc` 152-211, 1142-1211), and the strike timing that the swing's frames set (`combat.cc` 1064-1176, 1610-1637; `actions.cc` 745-815; `actors.cc` 5165-5227). No skeleton, skinning, blend tree, IK or ragdoll exists here: sprites are pre-drawn frames, and "blending" is absent. Read: `animate.cc` 1-20, 262-489, 546-575; `aniinf.h` 30-110; `shapeinf.cc` 217-223; `actors.cc` 140-211, 1142-1211, 1349-1370, 2640-2665, 2825-2850, 2950-2970, 5165-5227; `combat.cc` 1064-1189, 1596-1672; `actions.cc` 745-815; `schedule.cc` 1454-1463 (a second caller); `gamewin.cc` 624. Not read: `animate.cc` 21-261 (sound classes) and 489-545 (sound and field animators), `Animated_object` classes (575-671), `Actor::attack_target` (`combat.cc` 1190-1400, so hit damage and miss rules are not covered), `Animation_info::create_from_tfa`. Confidence: high for the clip rules and the windup-to-strike order; the exact tick count of the windup is derived from reading the scheduler, not run. camera_scope: not a camera cell.

Best transferable idea: Let the clip rules (first-frame hold chance, tail loop, time-synched crowd clip, hold on the last frame) and a swing's windup table be data, and derive the strike time from the windup data on the server, not from the client's animation timer.
Decision (proposed): adapt — the clip rules and windup table fit creature clips, but the donor lets the actor's own queue decide the strike, which cannot own a server-verified kill.
Acceptance: a creature's swing shows its windup poses at the data frame time and the server strike lands at swing start plus the data windup time for each of the four styles, asserted by a server test.

## 1. Mechanism

Two mechanisms, read end to end.

A. Clip playback for world-object frames (`objs/animate.cc`).
- Each animated object gets an animator. `Animator::create` picks sound-only if the shape is not animated, a frame animator if it has more than one frame, and a jitter ("wiggle") animator for a single frame (269-279). `start_animation` queues the first tick 20 ms later (301-306).
- A clip is a window of `frame_count` frames inside the shape's frame strip. The window starts at `last_frame - last_frame % nframes` (330-345), so one sprite sheet holds several clips of equal length.
- Each clip has a type, a frame delay, a freeze-first chance and a recycle (tail) count (`aniinf.h` 40-55, 61-77). The animator wakes every 100 ms, aligned to the 100 ms grid (`animate.cc` 436, 481: `curtime + delay - (curtime % delay)`). It counts `frame_counter` down; at zero it resets to the frame delay and advances the clip (439-443). So a clip's frame time is `frame_delay x 100 ms`.
- Modes (`get_next_frame`, 368-426):
  - Looping: the first frame holds until a random roll passes `freeze_first` percent (407). On wrap to frame 0, if `recycle` is non-zero and not more than the frame count, the animator jumps to `nframes - recycle` (410-413). So the first pass plays the whole clip and later passes replay only the tail.
  - Non-looping: advances and holds the last frame (388-392).
  - Time-synched: frame = ticks / (100 x frame delay) plus the start offset, mod frames (396-400). Every object on the same clip shows the same frame.
  - Hourly: frame = game hour mod frames (384). Not transferable.
  - Random: a random frame each tick (420-421).
- Stop rule: when the object's tile is not in the dirty region, the animator sets `animating = false` (444-451). Restart is by `want_animation` (`animate.h` 114-118; caller `monsters.cc` 367-368 seen; other callers not searched).

B. Swing poses and strike timing (`actors.cc` and `combat.cc`).
- Swing style comes from the weapon's frame flag: reach, raise, fast swing or slow swing; default is reach for projectiles and fast swing otherwise (`actors.cc` 1151-1159). Two-handed weapons use a second table (1161-1192).
- One-handed tables (poses): reach 3, 6; raise 3, 4, 6; fast swing 3, 5, 6; slow swing 3, 4, 5, 6. Two-handed: 3, 9; 3, 7, 9; 3, 8, 9; 3, 7, 8, 9 (`actors.cc` 152-160). Each pose is shifted by the facing direction (1196). If the shape frame is empty, the code swaps the one- and two-handed visible frame, then falls back to standing (1197-1207).
- The melee swing (`combat.cc` 1064-1176): `start_strike` sets state `strike` (1117), works out facing (1147-1154), and queues the windup as a `Frames_actor_action` at the standard frame delay (1156-1158). The swing sound is delayed by `cnt / 2` frames for melee and by `cnt` frames for ranged (1172-1173).
- The strike is not keyed to a pose. `Npc_actor::handle_event` runs the action while it is set (5209-5214): each pose step returns the frame delay (`actions.cc` 807-815). When the action ends it sets the frame time and requeues (5215-5225). The schedule only runs when there is no action (5197-5208). Then `case strike` (`combat.cc` 1610-1628) sets the ready pose and calls `attack_target`. So the strike resolves on the first schedule tick after the windup action ends.
- Timing (derived, not run): with N poses and a frame delay s, the first pose shows at the start, the action ends after N frame steps, and the strike runs one more delay later. Hit time is about (N + 1) x s after the swing starts. The hit does not wait for any particular pose.
- `Is_attack_frame` (`actors.cc` 163-165, returns true for pose 6 or 9) is defined and never called in the donor. A pose-keyed hit was intended and is not wired.
- Hit reaction: a hit that does no damage plays sound 5 and sets `hit`, which draws a red outline; a `Clear_hit` event clears it 200 ms later (2834-2844, 2649-2653). A hit that does damage on a non-Avatar actor sets the same outline and 200 ms clear (2961-2964). For the Avatar, the screen flashes instead when the damage applied (`delta`, doubled for vulnerable types) is at least a third of the `strength` property, or health was below a quarter of it, or the damage is lightning (2954-2959); otherwise the outline is used. The health floor of -50 clamps `delta` (2946-2951).

## 2. Key functions

- `Frame_animator::handle_event`: `/mnt/frankendom-donors/exult-exult/objs/animate.cc` 432-483 (100 ms tick, countdown, advance, off-screen stop, sound sync).
- `Frame_animator::get_next_frame`: `/mnt/frankendom-donors/exult-exult/objs/animate.cc` 368-426 (clip modes, freeze-first and recycle tail).
- `Frame_animator::Initialize`: `/mnt/frankendom-donors/exult-exult/objs/animate.cc` 327-362 (clip window and frame count).
- `Animator::create` and `Animator::start_animation`: `/mnt/frankendom-donors/exult-exult/objs/animate.cc` 269-306.
- `Actor::get_attack_frames`: `/mnt/frankendom-donors/exult-exult/actors.cc` 1142-1211 (style table, direction, empty-frame fallback).
- `Combat_schedule::start_strike`: `/mnt/frankendom-donors/exult-exult/combat.cc` 1064-1176 (state, windup action, sound timing).
- The strike state: `/mnt/frankendom-donors/exult-exult/combat.cc` 1610-1637.
- `Frames_actor_action::handle_event`: `/mnt/frankendom-donors/exult-exult/actions.cc` 789-815.
- `Npc_actor::handle_event`: `/mnt/frankendom-donors/exult-exult/actors.cc` 5165-5227 (action versus schedule, requeue).
- `Actor::start`: `/mnt/frankendom-donors/exult-exult/actors.cc` 1349-1363.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where it lives) |
|---|---|
| Clip frame time is a multiple of a 100 ms grid | `frame_delay x 100 ms` (`animate.cc` 436, 439-440, 481) |
| First frame holds with a chance, then the clip runs | `freeze_first` percent, default 100 (`aniinf.h` 53, 61; `animate.cc` 407) |
| Loop replays only a tail after the first pass | `recycle` count (`aniinf.h` 54; `animate.cc` 410-413) |
| Time-synched clip: same frame for every instance | `ticks / (100 x frame delay)` (`animate.cc` 396-398) |
| Swing windup poses per style, one- and two-handed | Tables (`actors.cc` 152-160) |
| Hit time from the windup, not from a pose | Schedule order (`combat.cc` 1610-1628; `actors.cc` 5209-5225) |
| Frame duration from the frame rate setting | `std_delay = 1000 / fps` (`gamewin.cc` 624) |
| Hit outline duration | 200 ms (`actors.cc` 2842, 2964) |
| Default clip when none is set | `create_from_tfa(0, nframes)` (`shapeinf.cc` 217-223; create_from_tfa not read) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's clip modes, the first-frame hold, the tail loop (with the donor's guard that the tail must not exceed the clip length), the windup table and windup formula, and the hit flash. It omits the clip window inside a sprite strip (the sketch starts at frame 0), the 100 ms grid queue (the caller supplies time), the off-screen stop, the sound sync and the empty-frame fallback, the sea serpent and slime exceptions, the rotate bits in the frame number, the ranged case (sound at the end of the windup), and the damage and miss rules in `attack_target` (not read). The windup formula is the donor's order, derived from the scheduler, and was not run. In the donor the hit time follows the windup; the sketch returns the time only, and the server would own it.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Clip playback for one sprite clip, a swing's windup timing, and a short hit flash. Units: milliseconds.

type LoopMode = "loop" | "hold" | "random" | "timesynced";

interface ClipSpec {
  frames: number;       // frames in this clip (>= 1)
  frameMs: number;      // time each frame is shown (ms)
  mode: LoopMode;
  startChance: number;  // 0..1: chance that the first frame advances (1 = never holds)
  tailLoop: number;     // on wrap, replay only the last tailLoop frames (0 = whole clip)
}

class ClipPlayer {
  private pos = 0;

  constructor(private readonly spec: ClipSpec) {}

  // Call once per frameMs. Returns the frame index to show.
  tick(nowMs: number, rand: () => number): number {
    const s = this.spec;
    switch (s.mode) {
      case "timesynced":
        this.pos = Math.floor(nowMs / s.frameMs) % s.frames;
        break;
      case "hold":
        this.pos = Math.min(this.pos + 1, s.frames - 1);
        break;
      case "random":
        this.pos = Math.floor(rand() * s.frames);
        break;
      case "loop":
        if (this.pos !== 0 || rand() < s.startChance) {
          this.pos = (this.pos + 1) % s.frames;
          if (this.pos === 0 && s.tailLoop > 0 && s.tailLoop <= s.frames) {
            this.pos = s.frames - s.tailLoop;
          }
        }
        break;
    }
    return this.pos;
  }
}

type SwingStyle = "reach" | "raise" | "fastSwing" | "slowSwing";

// Pose frames shown for each swing style, one-handed weapon.
const SWING_POSES: Record<SwingStyle, number[]> = {
  reach: [3, 6],
  raise: [3, 4, 6],
  fastSwing: [3, 5, 6],
  slowSwing: [3, 4, 5, 6],
};

// Time from the start of a swing until the strike resolves. The poses play at frameMs each,
// then one more frame gap passes before the strike step runs. Hit time comes from the frame count,
// not from any pose.
function windupHitMs(style: SwingStyle, frameMs: number): number {
  return (SWING_POSES[style].length + 1) * frameMs;
}

const HIT_FLASH_MS = 200; // red outline on the hit actor after a hit (donor: Clear_hit at +200 ms)

function flashUntilMs(nowMs: number): number {
  return nowMs + HIT_FLASH_MS;
}
```

## 5. Lands in

- TARGET `src/fight/attack-clip.ts` (new, client-side clip player and windup table; the server reads the same windup table to time the strike). The server owns the strike time; the client only shows the windup.
- Parity-checklist row 7 (creature actor/clips).
- today: the Frankendom repo was not read; no current clip or windup code is claimed.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape taken, no lines copied)
- Brief rule served: one engine (the strike time is decided by the fight step; the clip is display), zones as data (clip frame times, holds, tails and windup poses come from creature data), server-verified kills (the hit time is a server value derived from the same data).

## 6. Gaps and risks

- The donor's hit time is about (poses + 1) x frame time (derived, not run). Frankendom should set the windup time explicitly as data (for example `windup_ms`) and not infer it from the frame count, so a designer can change the feel without changing the pose count.
- The pose-keyed hit intended by `Is_attack_frame` (`actors.cc` 163-165) is defined and unused. Do not treat it as a donor feature. If Frankendom wants a hit on a specific pose, that is a new rule with its own test.
- The donor's `hit` outline (200 ms) is a hit-reaction visual; it belongs to hit impact (row 10), not to this clip row.
- The donor's frame clock is a fixed 100 ms grid for clips and a standard frame delay from the fps setting (`gamewin.cc` 624). Frankendom's client should use elapsed time so the clip speed does not depend on the frame rate.
- Donor damage and miss rules live in `attack_target` (1190-1400, not read). Nothing here decides damage.
- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is copied.
