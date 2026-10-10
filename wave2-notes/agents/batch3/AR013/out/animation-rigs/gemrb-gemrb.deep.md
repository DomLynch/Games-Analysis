# gemrb-gemrb (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/CharAnimations.cpp` (with `Animation.cpp`, `Animation.h`, `AnimationFactory.cpp`, `Scriptable/Actor.cpp`, `Scriptable/Movable.cpp`, `Map.cpp`, `GameScript/Actions.cpp`) | Licence: GPL-2.0-or-later (SPDX-License-Identifier header in each file read; `COPYING` is the GPL v2 text) | C++ | symbols `Animation::NextFrame`, `CharAnimations::GetAnimation`, `Actor::AdvanceAnimations`, `Actor::UpdateActorState`, `Actor::GetHit`

Checked: Read in full: `core/Animation.cpp` (194 lines), `core/Animation.h`, `core/AnimationFactory.cpp`, `core/AnimationFactory.h`. Read the relevant spans of `CharAnimations.cpp` (813-900, 1022-1075, 1160-1180, 1213-1240, zOrder tables 18-48, 1389-1403), `Scriptable/Actor.cpp` (4110-4132, 6656-6672, 7871-7946, 8390-8452, 8556-8590, 8841-8869), `Scriptable/Movable.cpp` (44-57), `GameScript/Actions.cpp` (3369-3377), `Map.cpp` (424-530 only near 527; 918-1004; 1036-1052). Not read: the equipment and suffix functions in `CharAnimations.cpp` (1244-2760), `Interface::GetAnimationFPS` (`Interface.cpp:4246`), the death path (`Killed`), `ScriptedAnimation.cpp`, and the rest of `Actor.cpp`. Confidence: high on the clip clock (Animation.cpp), the one-shot stance table and the hit gate; medium on the release-frame skip (reasoned from two loops, not run). camera_scope: not applicable.

Best transferable idea: Drive every layer of a character from one master clock, return one-shot clips (flinch, attack, death) to a stance by table when they end, and tie an attack's release to a named frame of its clip.

Decision (proposed): adapt. Take the one master clock, the one-shot stance table and the hit gate; change the release so it only triggers the client's visual cue, and make it fire when the clock crosses the frame. The hit itself stays in `src/fight` and is decided by the engine, not by a frame index, because Frankendom's kills are server-verified and the client must not decide damage from its clock.

Acceptance: In the Pit, the strike spark appears on the attack clip's release frame and never before the clip reaches it; a test with a 60 ms render gap asserts the release cue fires exactly once and that damage is applied exactly once, from the engine's record.

## 1. Mechanism

- Who advances the clock. The animation clock moves in the draw pass, not on a fixed game tick. `Map::DrawMap` calls `Actor::UpdateDrawingState` for each actor (`Map.cpp:1049`), with a comment that animations update even when the actor is not visible (`Map.cpp:1048`). `UpdateDrawingState` calls `AdvanceAnimations` (`Actor.cpp:8586`). Separately, `Actor::UpdateActorState` runs from the script loop `Map::UpdateScripts` (`Map.cpp:527`). So the frame index that gameplay reads was moved by the draw pass.
- Order inside `AdvanceAnimations` (`Actor.cpp:8390`). (a) Clear the current part list (8398). (b) Ask for the stance clips for the current stance and facing (8401-8406); if there are none, return false. (c) Build the draw list in z-order (8411-8420). (d) If the actor is immobile, hold the master's frame (8434); otherwise advance the master part with `NextFrame` (8442). (e) Every other part calls `GetSyncedNextFrame(*first)` (8449-8451), which copies the master's start time, end flag, last time and paused state, and sets its own frame index to `master.frameIdx % its own frame count` (`Animation.cpp:126-139`). Layers stay in step. A follower with fewer frames than the master wraps early; one with more frames never shows the frames past the master's count.
- The clock, `Animation::NextFrame` (`Animation.cpp:71-124`). The per-frame duration is `1000 / fps` converted to integer ms (84). When the game is frozen, the clock reads `lastTime` and marks itself paused (85-87). On resume it moves its start by the pause gap, so the pause does not skip frames (90-94). If at least one frame has elapsed, it adds `inc = elapsed / delta` whole frames and resets the start to now (104-107), so a fractional remainder is discarded. At the end of the clip, a one-shot clip clamps to its last frame and sets `endReached` (111-114); a looping clip wraps with modulo and never sets `endReached` (115-116).
- Stance change at clip end. `UpdateActorState` checks `first->endReached` (`Actor.cpp:7942`) and calls `HandleActorStance` (7944); if that changed the stance, it rewinds the clip to frame 0 (7946-7947). `HandleActorStance` applies `nextStanceID` when `autoSwitchOnEnd` is set (`Actor.cpp:8846-8848`). The next-stance table is set in `CharAnimations::GetAnimation` (`CharAnimations.cpp:851-880`): DIE and SLEEP go to TWITCH (854-855); EMERGE, GET_UP, HEAD_TURN and PST_START go to AWAKE (864-869); DAMAGE, CONJURE, SHOOT and the ATTACK variants go to READY (871-879). The clips for DAMAGE, SLEEP, TWITCH, DIE, PST_START, HEAD_TURN, CONJURE, SHOOT and ATTACK* get the `Once` flag (1030-1044). EMERGE and GET_UP are also played in reverse (1046-1048).
- Hit reaction. `Actor::GetHit` sets the DAMAGE stance only if the actor is not immobile, not really dead, and the hit is not a killing blow (`Actor.cpp:4112-4113`). A script can also force a recoil: `GameScript::Recoil` sets DAMAGE and sets a wait of 1 (`GameScript/Actions.cpp:3375-3376`). Callers of `GetHit` were not traced.
- Dead lock. `Movable::SetStance` refuses to leave TWITCH or DIE for any stance other than TWITCH once the actor has really died (`Movable.cpp:52-56`).
- Immobile. `Actor::Immobile` is true when held, cast-held, `STATE_STILL`, or time is stopped for the actor (`Actor.cpp:6656-6672`). The master then holds its frame instead of advancing.
- Release on a frame. In `UpdateActorState`, if an attack projectile is queued (`Actor.cpp:7909`), the projectile is released into the area when the attack clip is at frame 8 of a clip with more than 8 frames, or at `frameCount / 2` of a shorter clip (7912-7923). The hit is therefore tied to a clip frame, not to a timer.
- Layer order per facing. For `IE_ANI_CODE_MIRROR`, `zOrder_Mirror16[Orient]` gives the draw order of four part slots (`CharAnimations.cpp:20-37`, lookup 1392-1393). For `IE_ANI_TWENTYTWO` the table is `zOrder_8[Orient / 2]` (39-48, 1394-1395). Each row is a permutation of part indices, so it sets which part is drawn first (behind) and last (in front) for each facing. Which part index is the weapon depends on the layout (not traced).
- Mirroring. For the listed animation types (`CharAnimations.cpp:1051-1068`), orientations above 8 get a horizontal mirror of the clip (1065-1067). The stored sprite set is halved.

## 2. Key functions

- `Animation::NextFrame`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Animation.cpp` 71-124. The clock: frame duration, freeze, pause gap, catch-up, one-shot clamp, loop wrap.
- `Animation::GetSyncedNextFrame`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Animation.cpp` 126-142. A follower layer copies the master's clock and frame.
- `CharAnimations::GetAnimation`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/CharAnimations.cpp` 813-1150. Chooses the stance, sets the next-stance table and the one-shot flags, builds one clip per part, caches by stance and facing.
- `Actor::AdvanceAnimations`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 8390-8452. Draw order, master advance, follower sync.
- `Actor::UpdateActorState` (release and stance end): `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 7871-7947. Release frame at 7916; end-of-clip stance change at 7942-7947.
- `Actor::HandleActorStance`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 8841-8869. Applies the auto-switch; the idle and head-turn branches (8851-8866) are not traced for reachability.
- `Actor::GetHit`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 4110-4113. Flinch gate.
- `Movable::SetStance`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Movable.cpp` 49-57. Dead lock.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| One master clock; followers copy the master's frame index modulo their own count | Rule (Actor.cpp:8442, 8451; Animation.cpp:139) |
| Frame duration = 1000 / fps, integer ms | fps default 15 (Animation.h:19); per-animation fps from animfps.2da via `GetAnimationFPS` (AnimationFactory.cpp:23; that function not read). At 15 fps the integer duration is 66 ms (computed from Animation.cpp:84). |
| Catch up whole frames after a slow render; drop the remainder | Rule (Animation.cpp:104-107) |
| Pause gap added to the start on resume | Rule (Animation.cpp:92-93) |
| One-shot clip holds its last frame and reports end; loop wraps | Rule (Animation.cpp:111-116) |
| Attack release frame | 8 if the clip has more than 8 frames, else `frameCount / 2` (Actor.cpp:7916) |
| One-shot stance returns to a fixed next stance | DAMAGE, CONJURE, SHOOT, ATTACK* to READY (CharAnimations.cpp:871-879); DIE, SLEEP to TWITCH (854-855); EMERGE, GET_UP, HEAD_TURN, PST_START to AWAKE (864-869) |
| Flinch unless immobile, dead or killing blow | Rule (Actor.cpp:4112) |
| Dead cannot leave dead | Rule (Movable.cpp:52-56) |
| Facings above 8 are mirrors of the stored clip | Threshold 8 (CharAnimations.cpp:1065), for the listed animation types |
| Draw order per facing | Per-facing table of four entries (CharAnimations.cpp:20-37) |
| Random idle head-turn roll | `RAND(0, 24)`, so one in 25 (Actor.cpp:8851-8852); reachability not established, not carried into the sketch |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's order: the clock first, then the master-to-layer sync, then the stance and hit rules. It omits the start-time sentinel, the `LastFrame()` clock rewrite for immobile actors, the copy of the clock into followers (the sketch copies only the frame index and end flag), the one-tick lag (the donor returns the frame it had before advancing, `Animation.cpp:78`), the idle and ready-to-awake branches of `HandleActorStance`, the reverse playback of EMERGE and GET_UP, the facing mirror, and stances SLEEP, SHOOT, CONJURE, HEAD_TURN, PST_START, EMERGE and GET_UP from the next-stance table. The one deliberate change is `crossedRelease`: it fires when the clock crosses the release frame in a step, where the donor tests for equality with frame 8 or `frameCount / 2`. The crossing check assumes a one-shot clip with no wrap.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

type Stance = "awake" | "ready" | "damage" | "attack" | "die" | "dead";

// Stance entered when a one-shot clip reaches its end (the donor sets these per stance).
const NEXT_AFTER_ONE_SHOT: Partial<Record<Stance, Stance>> = {
  damage: "ready",
  attack: "ready",
  die: "dead",
};

interface Clip {
  frameCount: number;
  fps: number;        // per clip; donor default 15
  once: boolean;      // one-shot: hold the last frame and report end
  frameIdx: number;
  endReached: boolean;
  frozen: boolean;    // game paused or time stopped
}

interface ClockState {
  startMs: number;
  lastMs: number;
  paused: boolean;
}

// Advance one clip from the render clock. Whole frames are caught up at once; the sub-frame remainder is dropped.
function advanceClip(c: Clip, clk: ClockState, nowMs: number): void {
  let t: number;
  if (c.frozen) {
    t = clk.lastMs;
    clk.paused = true;
  } else {
    t = nowMs;
    if (clk.paused) {            // resume: shift the start so the pause does not skip frames
      clk.paused = false;
      clk.startMs += t - clk.lastMs;
    }
    clk.lastMs = t;
  }

  const deltaMs = Math.floor(1000 / c.fps);
  if (t - clk.startMs >= deltaMs) {
    const inc = Math.floor((t - clk.startMs) / deltaMs);
    c.frameIdx += inc;
    clk.startMs = t;            // remainder dropped
  }
  if (c.frameIdx >= c.frameCount) {
    if (c.once) {
      c.frameIdx = c.frameCount - 1;
      c.endReached = true;
    } else {
      c.frameIdx %= c.frameCount;
      c.endReached = false;      // looping clips never report an end
    }
  }
}

interface Layer {
  clip: Clip;
  clk: ClockState;
}

interface Pose {
  layers: Layer[];            // layers[0] is the master clock (body)
  drawOrder: number[] | null; // per facing: which layer is drawn in which slot
}

// Master clock drives the pose; every other layer copies the master's frame position.
function advancePose(p: Pose, nowMs: number, immobile: boolean): number[] {
  const master = p.layers[0];
  if (!immobile) advanceClip(master.clip, master.clk, nowMs); // immobile: hold the current frame
  for (let i = 1; i < p.layers.length; i++) {
    const l = p.layers[i].clip;
    l.frameIdx = master.clip.frameIdx % l.frameCount;
    l.endReached = master.clip.endReached;
  }
  return p.drawOrder ?? p.layers.map((_, i) => i);
}

interface Actor {
  stance: Stance;
  immobile: boolean;
  reallyDied: boolean;
}

function setStance(a: Actor, next: Stance): void {
  // A dead actor cannot leave death for anything but the held dead pose.
  if ((a.stance === "die" || a.stance === "dead") && next !== "dead" && a.reallyDied) return;
  a.stance = next;
}

// Hit reaction: flinch unless immobile, already dead, or this hit kills.
function onHit(a: Actor, killingBlow: boolean): void {
  if (!a.immobile && !a.reallyDied && !killingBlow) setStance(a, "damage");
}

// Called when the one-shot clip ends. The donor also has idle and ready-to-awake branches (not in this sketch).
function onClipEnd(a: Actor): void {
  const next = NEXT_AFTER_ONE_SHOT[a.stance];
  if (next !== undefined) setStance(a, next);
}

// Attack release frame: frame 8 of a long clip, half the frame count of a short one.
function releaseFrame(frameCount: number): number {
  return frameCount > 8 ? 8 : Math.floor(frameCount / 2);
}

// Fires when the clock crosses the release frame in this step, not only when it lands on it.
// Assumes a one-shot clip (no wrap).
function crossedRelease(prevIdx: number, nowIdx: number, frameCount: number): boolean {
  const r = releaseFrame(frameCount);
  return prevIdx < r && nowIdx >= r;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/gemrb-gemrb-clip-stance.ts`; local copy in `work/gemrb-gemrb-clip-stance.ts`).

## 5. Lands in

- TARGET `src/fight/animation.ts` (new, client-only): one clip clock for the hero and creature rigs, the one-shot stance table, the hit-reaction gate as a request to the animator. It changes no damage, no state and no server code.
- Parity row 6 (hero actor/animation). The release cue is the visual side of row 10 (hit impact); the damage decision stays in `src/fight`.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the stance and the damage decision stay in the engine; animation is client presentation only)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the donor.
- Release on equality is fragile. The clock is advanced by the draw pass (`Map.cpp:1049`) and the release check runs from the script loop (`Map.cpp:527`, `Actor.cpp:7916`). If the clock moves past frame 8 between two checks, the equality test never matches. I reasoned this from the two loops; I did not run it. The sketch fires on crossing for that reason.
- Presentation and truth. The donor's release releases the projectile into the area; that makes the animation part of the hit. Frankendom must not do that: the engine decides the hit at a server tick (row 18 / post-K item 3 sub-line: server tick: fixed step, input intake, per-tick NPC budget), and the animation only shows it.
- Every hit flinches. `GetHit` sets DAMAGE for any non-killing hit on a mobile actor (`Actor.cpp:4112-4113`); I did not trace its callers, so I cannot say which damage paths reach it. The donor has no block or guard state. Frankendom's guard and stagger (row 3) must choose the reaction in the engine, so a blocked hit does not flinch.
- No clip blending. `GetAnimation` starts the new clip at frame 0 (`CharAnimations.cpp:1026`, `1232`; the last-frame case is the other branch of 1023-1026) and the stance switch is a hard cut. I found no crossfade in the animation files read. The `BlendBlack` flag (`Animation.h:29`) is a sprite blend mode; the other "blend" hits in `core` were not read. Frankendom needs a short crossfade for hero idle and attack in Three.js; the donor offers nothing here.
- No skeleton, skinning, retargeting, ragdoll or IK. A grep of `core` for skeleton, ragdoll, inverse kinematics and bone found only comments and spell-table handling about bones (for example `GameScript/Actions.cpp:4985`, and a comment at `Scriptable/Actor.cpp:4778`). Attachments are sprite layers picked by index (the draw order table), not bone attachments.
- The idle random head-turn (`Actor.cpp:8851-8852`) is reached only through end-of-clip paths (7942-7944, 7931). I did not find a path that reaches it for a looping AWAKE clip, so the sketch leaves it out. Not confirmed either way.
- Frame data is the donor's. fps comes from animfps.2da (not read). Frankendom should express fps, release frame and the next-stance table as clip data per creature and per hero attack, not as constants in the module.
- The donor's stance-end table is a fixed table in code (`CharAnimations.cpp:851-880`). Frankendom should keep it as data, per clip, so a new attack can end in a different stance.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine; animation is client presentation only)
