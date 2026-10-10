# latentcollapse-RustDAoC (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/lib.rs` (`clip_sample_time` 973-987), with the table join in `crates/caer-assets/src/anims.rs` and the per-entity clip choice in `crates/caer-render/src/entities.rs` | Licence: GPL-3.0-or-later (`Cargo.toml` `[workspace.package] license`; the `LICENSE` file is the GPL v3 text) | Rust | symbol `clip_sample_time`

Checked: Read in full: `clip_sample_time` (lib.rs 973-987) and its caller (lib.rs 681-691); a second call at lib.rs 707 samples the other side of a blend (not read in full); `AnimTables::from_tables` and `clip` (anims.rs 187-310); `rate_scale`, `authored_duration`, `playback_duration` (anims.rs 121-147); `load_clip` (entities.rs 900-909); `clip_for_state`, `state_for_speed`, `state_for_motion` (entities.rs 283-345 region, read in part); `tick_anim`, `blend_weight`, `prune_anim_states` (entities.rs 209-228, 842-867). Not read: the key interpolation in `nif.rs` (`sample_lerp` at 5140 and `key_span`), `Skeleton::pose_blend`, and the palette upload path. Confidence high on the clock, rate and blend arithmetic; I checked the arithmetic with a Python transcription of `clip_sample_time` (not run in Rust) and the phase finding in section 6 rests on that. The donor's tests were read in part (the anims.rs table and rate asserts at 394-456; lib.rs 1015-1061) and not run. camera_scope: not a camera cell.

Best transferable idea: Drive a locomotion clip's cycle from ground speed divided by the stride length (with a per-clip playback rate for standing), and keep the authored key timeline separate from the played rate as data.
Decision (proposed): adapt - the stride match stops feet skating and the authored/played split is cheap data; we take the shape but make phase a cycle fraction and make the hold and blend lengths explicit, because the donor's phase offset is not a clean cycle fraction and its hold flag is not applied on the render path.
Acceptance: A walking hero or creature at speed S with a stride of L completes one walk cycle every L/S seconds, so a server-free client test asserts the cycle fraction equals (elapsed * S / L) mod 1 within 1e-3, and a 30-frame idle authored at 15 fps and played at 4 fps takes 7.5 s per cycle.

## 1. Mechanism

- Resolve the clip for an entity. `(anim set, action)` gives a clip id from a row of `anims.csv` (or `canims.csv` for combat actions); id 0 means "no clip" (anims.rs 298-310). The id is a row of `animnifs.csv`, which carries the file, frame count, playback fps, authored base fps, and a `loop`/`clamp` type (anims.rs 187-284, the join; base fps falls back to fps when missing or zero, anims.rs 216-220; looping is read from the type column, anims.rs 222-224).
- Two rates per clip. Authored length is `frames / base_fps` (the key timeline; anims.rs 121-127). Playback rate is `fps / base_fps` (anims.rs 141-147). A clip authored at 15 fps but played at 4 fps stretches its timeline; the donor's test table has I_hm as 30 frames, 15 authored fps, 4 played fps (anims.rs 400), and asserts a rate scale of 4/15 (anims.rs 430).
- Load. `load_clip` reads the `.kfa`, then sets `clip.rate` from the table's rate scale, or 1.0 if that is zero (entities.rs 900-909). The `.kfa` itself does not know its playback rate.
- Choose the clip each frame. The render pass calls `rig.clip_for_state(want)` (lib.rs 690). `want` comes from speed and facing (`state_for_motion`, entities.rs 335). Walk falls back to run and run to walk when a clip is missing (entities.rs 298, 303); a missing directional clip falls back to walk.
- Sample. The closure at lib.rs 681-682 calls `clip_sample_time(clip, stride_units, speed, phase, anim_time)`, then the palette bucket is `floor(t * 30)` (lib.rs 692), used to share palettes between instances with the same state and bucket.
- `clip_sample_time` (lib.rs 973-987), in this order: `d = max(duration, 0.001)`. If the clip has a stride and the entity has a speed above zero, the rate is `speed / stride` cycles per second (locomotion matched to ground covered, so feet do not skate). Otherwise the rate is `clip.rate / d` (standing: the clip's own playback rate). Then the sample time in authored seconds is `((anim_time + phase * d) * rate * d) mod d`, made absolute.
- Phase: each entity gets `fract(object_id * 0.618034)` (lib.rs 559), so a group of the same creature does not breathe in step. The comment (entities.rs 251) says the moving rate is `speed / stride` cycles per second.
- Cross-fade on a state change. `tick_anim` runs once per skinned entity per frame (lib.rs 657). When the wanted state differs from the current one, it saves the current state as `prev` and restarts the fade clock (entities.rs 842-858; `prev` at 853, `blend_start` at 855). `blend_weight` returns `elapsed / 0.2` clamped to [0,1] until elapsed reaches `0.2 - 0.001`, then returns none (entities.rs 209-228; constant at 192).
- Pruning. Anim state not seen for 5 s is dropped (entities.rs 863-866), so the map does not grow with streamed mobs.

## 2. Key functions

- `clip_sample_time`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/lib.rs` 973-987. The only sampling clock in the render path; `preworld_idle_t` (lib.rs 992) calls it with no stride.
- `AnimTables::clip` and `from_tables`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-assets/src/anims.rs` 298-310 and 187-284. The table joins that give a clip for a set and action.
- `load_clip` and `clip_for_state`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/entities.rs` 900-909 and 295-310. Attach the rate; choose the clip and the stride.
- `tick_anim` and `blend_weight`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/entities.rs` 842-858 and 209-228. The 0.2 s cross-fade.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Authored length = frames / authored fps; playback rate = played fps / authored fps; a standing clip advances at that rate | Per-clip table values. I_hm: 30 frames, 15 authored fps, 4 played fps, so rate 4/15 and a 7.5 s cycle (theirs, anims.rs 400 and 430) |
| Moving clip: cycles per second = speed / stride, so one cycle covers one stride of ground | Stride per clip comes from the monnifs table (entities.rs 251 comment, not read in the table itself) |
| Run split at a wire speed threshold | `RUN_SPEED` = 100 wire speed (theirs, entities.rs 284) |
| Cross-fade on a state change | 0.2 s (theirs, entities.rs 192). The donor says the value is its own, because the `Blend Time` column is 0 in all 3,938 populated rows (entities.rs 189-190) |
| Per-entity phase | Golden-ratio step 0.618034 of the object id (theirs, lib.rs 559) |
| Palette bucket | 30 per second (theirs, lib.rs 692) |
| Stale anim state pruned | 5.0 s (theirs, entities.rs 864) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's two sampling regimes (stride match for moving, the clip's own rate for standing), the authored/played rate split, and the cross-fade start rule and length. It differs in two places on purpose. (a) Phase is a fraction of one cycle, added after the rate, so each entity's offset is the same for every clip; the donor multiplies the phase by the duration and the rate, which makes the offset depend on clip and speed (section 6). (b) A non-looping clip holds its last pose; the donor reads the `loop`/`clamp` flag (anims.rs 222-224) but I found no render-path reader of it. The sketch omits the table join, the wire-speed-to-units assumption, the per-state bookkeeping in `tick_anim`, the palette bucket and the stale-state prune.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ClipTiming {
  frames: number;       // authored key count
  authoredFps: number;  // rate the key times are expressed in
  playFps: number;      // rate the clip is played at (table value)
  looping: boolean;     // false = play once and hold the last pose
}

function authoredDuration(c: ClipTiming): number {
  return c.authoredFps > 0 ? c.frames / c.authoredFps : 0;
}

// Authored seconds of clip per real second; 0 when a rate is missing.
function rateScale(c: ClipTiming): number {
  return c.authoredFps > 0 && c.playFps > 0 ? c.playFps / c.authoredFps : 0;
}

// Sample time in authored seconds. Moving: one cycle covers strideUnits of ground, so cycles per
// second = speed / stride (feet stay planted). Standing: the clip's own playback rate.
// phaseFrac is a fraction of one cycle, added after the rate.
function sampleTime(c: ClipTiming, elapsedS: number, speed: number, strideUnits: number, phaseFrac: number): number {
  const dur = Math.max(authoredDuration(c), 0.001);
  const cyclesPerS = speed > 0 && strideUnits > 0
    ? speed / strideUnits
    : (rateScale(c) > 0 ? rateScale(c) : 1) / dur;
  let cycles = elapsedS * cyclesPerS + phaseFrac;
  if (!c.looping) cycles = Math.min(cycles, 1 - 1e-6); // clamp: hold the last pose
  const frac = cycles - Math.floor(cycles);
  return frac * dur;
}

const BLEND_SECONDS = 0.2;

interface Blend { cur: string; prev: string | null; blendStart: number; }

// Weight of the current state in a cross-fade; null when nothing is blending.
function blendWeight(b: Blend, now: number): number | null {
  if (b.prev === null || b.prev === b.cur) return null;
  const elapsed = now - b.blendStart;
  if (elapsed >= BLEND_SECONDS - 1e-3) return null;
  return Math.min(Math.max(elapsed / BLEND_SECONDS, 0), 1);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/anim-clock.ts` (new client presentation module; the engine never reads clip time, so it stays out of the duel step). Repo layout not read. Parity-checklist row 6 (hero actor/animation). Creatures use the same clock under row 7.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: presentation is client-only (camera, HUD, sound and animation); rule 7 (clean-room, GPL)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- Phase is applied before the rate, which I checked by hand and with a Python transcription (not run in Rust). For a standing clip the offset in cycle fraction is `phase * clip.rate`, so for I_hm (rate 4/15) the group spreads over only the first 27% of its cycle, not the whole cycle. For a moving clip the offset is `phase * duration * speed / stride` cycles, so it changes with speed and at some speeds is a whole number of cycles (phase 0.5 with duration 2 and speed/stride 2 gives no shift). The donor's intent (desynchronise a group) holds, but the offset is not a clean fraction. Frankendom must add phase as a cycle fraction after the rate.
- The `loop`/`clamp` flag is parsed (anims.rs 222-224) and asserted in a test (anims.rs 454), but a grep for `.looping` across `crates/` finds only the audio bus's own field and the anims tests. `clip_sample_time` wraps every clip with `mod d`. Whether a death clamp clip is ever sampled through this path (I did not find a caller that would use the flag) is not read. Frankendom's death and hit-hold clips must hold explicitly.
- The stride rule divides the wire speed (`speed`, a u16 in the render call) by the stride from monnifs (entities.rs 251). The donor assumes both are in the same units. Frankendom must check its own units before using this rule; a mismatch scales every walk cycle.
- Clip time is driven by wall-clock `anim_time`, so it is variable-step and differs per client. The engine must never take a hit or a kill from a clip frame (server-verified kills; animation is client-only). Hit timing must come from the engine's fixed step (row 5 controls, row 1 duel step), with the animation only showing it.
- The cross-fade length (0.2 s) is the donor's own choice and it is not in the data. Frankendom should make it a per-clip or engine-level constant and say which.
- Not read: `nif.rs` key interpolation (`sample_lerp` 5140, `key_span`) and the palette upload path. The claim that a clip's keys are linearly interpolated is not made here.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: presentation is client-only (camera, HUD, sound and animation); rule 7 (clean-room, GPL)
