# scummvm-scummvm (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/engine/scene/AnimationState.cpp` | Licence: GPL-3.0-or-later per the ScummVM header on each file ("either version 3 of the License, or (at your option) any later version"); the Frictional Games / HPL1 header under it ("This file is part of HPL1 Engine") gives no licence text, and no HPL1 licence file was searched for (not read) | C++ | symbol `cAnimationState::Update` (with `FadeIn`, `FadeOut`, `AddTimePosition`)

Checked: `cAnimationState` read in full (AnimationState.cpp 45-375, with blank-line lines included for 45-200). `cMeshEntity::Update` read for the animation parts (MeshEntity.cpp 540-711), `Play` and `Stop` (823-848). `cAnimationTrack::ApplyToNode` read (AnimationTrack.cpp 60-160, key lookup started at 117-160). `cNode3D::AddRotation` and `AddTranslation` read (Node3D.cpp 185-201). The game-level caller, `iGameEnemy::PlayAnim` and the speed rules, read in penumbra-overture/GameEnemy.cpp (898-941, 1294-1303, 1376-1392). Candidates opened: AnimationState.h, AnimationState.cpp, MeshEntity.cpp, AnimationTrack.cpp, Node3D.cpp, GameEnemy.cpp. Grep only: SoundEntity.cpp FadeIn/FadeOut (a sound fade, not this mechanism). Not read: MeshEntity 712-760 (animation events), the skeleton-physics body (`SetBoneMatrixFromBodyRec`), `GetKeyFramesAtTime` after line 160 (the loop wrap), `cMath::Wrap`, the last argument of `cMath::QuaternionSlerp`. Confidence: high on the clip fade, weight, the apply order and the speed rule. Medium on the skeleton-physics blend (partly read, not written up). Camera: not a camera note.

## 1. Mechanism

- A clip is a `cAnimationState` with a time position, a length, a weight (default 1), a speed and a base speed (both default 1), a loop flag (default off), a pause flag, an active flag and a fade step (default 0). Defaults: AnimationState.cpp:57-67.
- Play and stop. `Play` activates a clip, sets its time to 0, its loop flag, and its weight to 1 at once (MeshEntity.cpp:827-830). `Stop` deactivates every clip (843-848). Several clips can be active together, each at weight 1, so the donor layers clips. A hard switch is possible through `Play`.
- Per frame, `cMeshEntity::Update`, skeleton branch (606-711):
  1. If any clip is active, or the bones were never updated, every bone is reset to its bind local transform (624-630). The physics temp copy is also set to the bind transform (636).
  2. If skeleton physics is on, the bones take the body pose and are slerped with the temp copy by `mfSkeletonPhysicsWeight` (644-664). Because the temp copy holds the bind pose, the animation deltas are added after this mix.
  3. For each active clip, each track is applied to its bone at the clip's current time with the clip's current weight (672-688). Then the clip advances (693).
  4. If any clip is active, the bone matrices are rebuilt down the hierarchy (702-708).
  The node branch (548-594) does the same with node states reset to identity (554), tracks applied with weight (578), and the clip advanced after (581).
- `cAnimationTrack::ApplyToNode` (97-113): the key is sampled at the clip time. Rotation is `slerp(weight, identity, key)` (107), added to the node (108). Translation is `key × weight` (111), added (112). Scale is not applied (101-104 are commented out).
- `cNode3D::AddRotation(quaternion)` pre-multiplies the rotation matrix (192). A comment says the result is order dependent (191). `AddTranslation` adds (200). The combined pose is therefore a product of weighted deltas in clip and track order. It is not a normalised mean.
- Clip time. `AddTimePosition` adds `dt × speed × baseSpeed` (249). `SetTimePosition` wraps for a loop (172) and clamps otherwise (174). `IsOver` is true when not looping and time >= length (118).
- Fade. `FadeIn(t)` sets the fade step to `+1/|t|`, and `FadeOut(t)` to `-1/|t|` (124, 128). `Update` adds `fadeStep × dt` to the weight (93). A fade-out that reaches 0 deactivates the clip (95-98). A fade-in that reaches 1 stops fading and clamps at 1 (99-102). `SetActive` clears the fade (209). The step is per unit of the `dt` passed in, and the caller's frame time is variable.
- The game-level switch, `iGameEnemy::PlayAnim` (penumbra-overture/GameEnemy.cpp 900-941):
  (a) If the same clip is already current, active and not over, return (905-910).
  (b) Activate the new clip (918).
  (c) If a different clip was current, fade it out (920). Set the new clip's weight to 0 unless it is already fading (923), then fade it in (924). Otherwise set weight 1 (926).
  (d) Set loop (928). Make it current (938).
  (e) If sync with the previous frame is requested and a clip was current, start at the same relative time (932-933). Otherwise start at time 0 (935).
  (f) Store whether the clip speed depends on movement, and its multiplier (940-941).
- Speed. In the override branch (1299-1303) and the move-state branch (1381-1385), a dependent clip runs at `|moveSpeed| × mul` when `|moveSpeed| > 0.05` (1300, 1382). Otherwise it runs at `|turnSpeed| × mul × 2` (1303, 1385).
- Clip end as an event. In the override branch, when the current clip is over, the enemy's current state is told `OnAnimationOver` with the clip name (1294-1296). Clip end can therefore drive a client state.

## 2. Key functions

- `cAnimationState::Update`: `/mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/engine/scene/AnimationState.cpp` 87-104. Fade step and clamp.
- `cAnimationState::FadeIn` and `FadeOut`: AnimationState.cpp 123-129. Step sizes.
- `cMeshEntity::Update` (skeleton branch): `/mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/engine/scene/MeshEntity.cpp` 606-711. Reset, physics mix, apply, advance.
- `cAnimationTrack::ApplyToNode`: `/mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/engine/graphics/AnimationTrack.cpp` 97-113. Weight into rotation and translation.
- `cNode3D::AddRotation`, `AddTranslation`: `/mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/engine/scene/Node3D.cpp` 189-201.
- `iGameEnemy::PlayAnim`: `/mnt/frankendom-donors/scummvm-scummvm/engines/hpl1/penumbra-overture/GameEnemy.cpp` 900-941. Crossfade, phase sync, speed.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fade step | 1/|fadeTime| per unit of frame time (AnimationState.cpp:124, 128); fade time is the caller's argument |
| Fade-in start weight | 0 (GameEnemy.cpp:923), unless already fading |
| Hard play weight | 1 (MeshEntity.cpp:830) |
| Clip defaults | speed 1 (57), base speed 1 (58), loop off (62) |
| Fade end | weight 0 deactivates (95-98); weight 1 ends the fade (99-102) |
| Move-speed dead zone | 0.05 (GameEnemy.cpp:1300, 1382); unit not read |
| Turn-speed fallback | |turnSpeed| × mul × 2 (1303, 1385) |
| Speed multiplier per call | `afSpeedMul`, stored at 941 (no donor default read) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (reset bones, add each active clip's weighted sample, then advance the clip time and fade) and the same fade rule (1/|t| step, deactivate at 0, clamp at 1). It also keeps the PlayAnim rules: early return for the same clip, fade out the old clip, start the new one at weight 0 unless already fading, and an optional phase sync. It omits pause, the animation event list, the skeleton-physics blend, scale, the node-mode branch, and the quaternion composition: the sketch adds scalar angles, which is exact only when every clip rotates about one axis. The wrap uses a standard modulo, since `cMath::Wrap` was not read. A zero fade time gives an infinite step, as in the donor, and neither version guards it. Times are in the caller's unit.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ClipState {
  active: boolean;
  time: number;          // clip time, caller's unit
  length: number;
  weight: number;        // 0..1 contribution of this clip to the pose
  fadeStep: number;      // +1/fadeTime while fading in, -1/fadeTime while fading out, 0 otherwise
  speed: number;         // set each frame from movement (see animSpeed)
  loop: boolean;
}

interface Bone { angle: number; trans: number; }             // scalar pose: one rotation angle and one offset per bone
interface TrackSample { angle: number; trans: number; }      // a bone's key value at a clip time

function isOver(s: ClipState): boolean {
  if (s.loop) return false;
  return s.time >= s.length;
}

// Fade start: weight changes by 1/|fadeTime| per unit of time.
function fadeIn(s: ClipState, fadeTime: number): void { s.fadeStep = 1 / Math.abs(fadeTime); }
function fadeOut(s: ClipState, fadeTime: number): void { s.fadeStep = -1 / Math.abs(fadeTime); }

// Advance a clip's time and fade by dt. Called after its bones have been written for this frame.
function advance(s: ClipState, dt: number): void {
  if (!s.active) return;
  s.time += dt * s.speed;
  if (s.loop) s.time = ((s.time % s.length) + s.length) % s.length;   // standard wrap, cMath::Wrap body not read
  else s.time = Math.min(Math.max(s.time, 0), s.length);

  if (s.fadeStep !== 0) {
    s.weight += s.fadeStep * dt;
    if (s.fadeStep < 0 && s.weight <= 0) { s.weight = 0; s.active = false; s.fadeStep = 0; }
    else if (s.fadeStep > 0 && s.weight >= 1) { s.weight = 1; s.fadeStep = 0; }
  }
}

// Switch to a new clip. Returns the clip that is now current.
function playAnim(prev: ClipState | null, next: ClipState, fadeTime: number, loop: boolean, syncPhase: boolean): ClipState {
  if (prev === next && next.active && !isOver(next)) return next;   // already playing: keep it running
  next.active = true;
  if (prev && prev !== next) {
    fadeOut(prev, fadeTime);
    if (next.fadeStep === 0) next.weight = 0;                       // start from nothing unless already fading
    fadeIn(next, fadeTime);
  } else {
    next.weight = 1;
  }
  next.loop = loop;
  if (syncPhase && prev) next.time = (prev.time / prev.length) * next.length;   // keep the phase of the old clip
  else next.time = 0;
  return next;
}

// Move-speed to clip-speed rule: fall back to turn speed (x2) below a small dead zone.
function animSpeed(fSpeed: number, fTurnSpeed: number, mul: number): number {
  return Math.abs(fSpeed) > 0.05 ? Math.abs(fSpeed) * mul : Math.abs(fTurnSpeed) * mul * 2;
}

// One frame: bones are reset, every active clip adds its weighted sample, then each clip advances.
// Sketch choice: the add is a scalar sum (exact when all clips rotate about one axis); the donor composes quaternions in order.
function tick(states: ClipState[], bones: Bone[], sampleAt: (s: ClipState, bone: number) => TrackSample, dt: number): void {
  for (const b of bones) { b.angle = 0; b.trans = 0; }
  for (const s of states) {
    if (!s.active) continue;
    for (let i = 0; i < bones.length; i++) {
      const v = sampleAt(s, i);
      bones[i].angle += v.angle * s.weight;     // donor: slerp(weight, identity, q) then add
      bones[i].trans += v.trans * s.weight;     // donor: translation scaled by weight, then add
    }
    advance(s, dt);                              // donor: Update runs after the tracks are applied
  }
}
```

## 5. Lands in

- TARGET `src/fight/creature-clips.ts` (client: creature clip switching, fades and move-speed clip rate; it never decides a hit or a state). Parity-checklist row 7 (creature actor/clips).
- today: not located in the Frankendom repo (not read).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room, shape only)
- Brief rule served: 1 (one engine, client-only presentation); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0-or-later. Clean-room only: the sketch is written from the described mechanism, and no donor line is copied.
- The clip-over event (GameEnemy.cpp:1294-1296) changes the enemy's state on the client. Frankendom must not let a client clip-end event change fight state. Attack windows, staggers and deaths come from the server-verified fight step (rows 1 and 4). The client may read those states to pick a clip, and nothing more.
- Weights are not normalised. Each clip multiplies its own delta in, so two clips at 0.5 do not give the mean of two poses. The result is slerp(0.5, I, qA) times slerp(0.5, I, qB), which equals qA only when qA equals qB (AnimationTrack.cpp:107, Node3D.cpp:192). Frankendom should use a normalised mean (as in the ryzom note) or keep one clip per bone group during a fade.
- Hard switch: `Play` sets weight 1 at once (MeshEntity.cpp:830). Only `PlayAnim` crossfades, so any new call site must use the fade path.
- A fade time of zero gives an infinite step (AnimationState.cpp:124), and nothing guards it. Frankendom should clamp fade time when the catalogue loads (row 21).
- The move-speed dead zone (0.05) is in the donor's move units, and the unit was not read. Frankendom must state its own unit.
- Skeleton physics (MeshEntity.cpp:644-664) blends the bind pose with the physics body, then adds the animation. That could be a ragdoll-to-clip blend. It is partly read and not written up.

Best transferable idea: switch a creature's clip by fading the new one in from weight 0 over a fixed time while the old one fades out, and drive the clip's playback rate from the creature's move speed with a small dead zone and a turn-speed fallback.
Decision (proposed): adapt - the fade switch and the move-speed-to-clip-rate rule fit creature locomotion, but Frankendom blends with a normalised mean rather than the donor's order-dependent product, clamps the fade time in the catalogue, and keeps clip-end events out of fight state.
Acceptance: a player sees an idle-to-chase switch fade over the catalogue fade time with no pop, and the chase clip plays at the move speed scaled by the creature's catalogue multiplier, dropping to the turn-speed fallback below the dead zone; a server test asserts that no clip event changes an attack, stagger or death state.
