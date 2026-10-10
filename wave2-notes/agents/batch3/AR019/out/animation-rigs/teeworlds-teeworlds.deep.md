# teeworlds-teeworlds (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/animstate.cpp` | Licence: zlib-style code licence (`license.txt` lines 1-17, read: "This software is provided 'as-is'..."); `datasrc/` clip data is CC-BY-SA 3.0 (`license.txt` line 22) | C++ | symbol `AnimSeqEval` / `CAnimState::Set` / `CAnimState::Add`

Checked: Read in full: `animstate.cpp` (98 lines) and `animstate.h`; the pose block of `CPlayers::RenderPlayer` (`components/players.cpp` 94-199, plus the muzzle flag uses at 253 and 284); `CRenderTools::RenderTee` body and feet code (`render.cpp` 78-150 and 258-286); clip definitions `datasrc/content.py` 50-70 and 571-625. Not read: `RenderTeeHand` (`render.cpp` 290 on), the hammer and ninja weapon branches (`players.cpp` 201-275, only the attach-rotation line 206 is cited), the skid trail effect, `CClient::GameTickTime` (only the getter at `engine/client.h` 68), and what the input field `Player.m_Direction` means (name only). Confidence: high on the pose order and the walk phase; medium on the swing timing (the `GameTickTime()` term is not traced). Camera scope: not applicable (animation note).

## 1. Mechanism

- A tee's pose is four keyframe channels: body (x, y, angle), back foot, front foot, and attach (the weapon). Each channel is sampled from a clip at a time `t` by linear interpolation between the two keys that bracket `t` (`animstate.cpp` 10-50). A clip with no keys gives zeros (12-18); a clip with one key returns that key and ignores time (19-22).
- Per rendered player the pose is built in one fixed order (`players.cpp` 148-183):
  - (a) SET the base clip at time 0 (149). It is the rest pose.
  - (b) ONE locomotion clip is ADDED with weight 1.0, picked by an if/else chain (151-156): airborne gives the `inair` clip at time 0; else standing (raw velocity within plus or minus 1) gives the `idle` clip at time 0; else, if the input does not oppose the motion, the `walk` clip at the walk phase; otherwise nothing is added, so the pose stays at base.
  - (c) The walk phase is distance, not time. `WalkTime` is the interpolated world x modulo 100, divided by 100, so it is in [0, 1) (142-147). One full stride is 100 world units. The walk clip has keys from 0.0 to 1.0 (`datasrc/content.py` 587-608), so the phase always lands inside the clip.
  - (d) The weapon swing clip is ADDED on its own channel. Hammer: `clamp(ct*5, 0, 1)` where `ct` is elapsed ticks over 50 (plus one `GameTickTime` term), so the clip ends about 0.2 s after the attack tick (174-178). Ninja: `clamp(ct*2, 0, 1)`, about 0.5 s (179-183).
  - (e) Skid: if grounded, input opposes motion and `|vx| * 50 > 500`, a skid sound plays at most once per 0.1 s and a skid trail is emitted (185-199).
- Drawing (`render.cpp`): the body is drawn at the tee position plus the body offset times `size/64` (92, 96), rotated by the body angle in turns times 2 pi (145). Each foot is drawn at the tee position plus its own offset times the same scale (261, 283), with its own angle (266). The feet do not inherit the body offset. The weapon sprite rotates by the attach angle in turns times 2 pi plus the aim angle (206).
- Drive loop: none of its own. There is no fixed-step loop and no clock for the rig. The pose is recomputed on every render call from the latest sim state, using `IntraTick` (the fraction between the previous and current sim tick) to interpolate position and angle (109-115, 130). `RenderPlayer` is called from `OnRender` (`players.cpp` 437) in passes p=2 (other clients) and p=3 (the local client), after `RenderHook` in passes 0 and 1 (409-444). The local client's aim angle comes from the mouse, not the snapshot (117-121). The walk is driven by distance, the swing by sim ticks since `AttackTick` (sim time, not render time). The only accumulator in this block (161-172) steps the muzzle sprite frame (253, 284), not the skeleton.
- Lookup: the key search is a linear scan, and the author marks a binary search as TODO (`animstate.cpp` 30). If `t` falls in no key segment the output is not written (42-48). The walk clip never hits that case; a clip whose keys do not cover its range would leave stale values.
- Menus call `CAnimState::GetIdle()` (`animstate.cpp` 85-97) for a static base-plus-idle pose. Those callers are many (`grep` found 15 call sites in `components/*.cpp`); only the pose path above was read end to end.

## 2. Key functions

- `AnimSeqEval`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/animstate.cpp` 10-50. Per-channel keyframe sampler; zero, one, or many keys; linear blend.
- `CAnimState::Set`: `animstate.cpp` 70-76. Overwrites all four channels from one clip (the base).
- `CAnimState::Add`: `animstate.cpp` 78-83, with `AnimAdd` at 61-67. Samples the clip into a temporary state, then adds it weighted, channel by channel.
- Pose block of `CPlayers::RenderPlayer`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/players.cpp` 107-199. Interpolation (109-130), the airborne, standing and walk-phase choice (137-156), the swings (174-183), the skid (185-199).
- `CRenderTools::RenderTee`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/render.cpp` 78-287. Reads the four channels for body, feet and rotations.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Walk phase from distance travelled (one cycle per stride) | Stride 100 world units (theirs, `players.cpp` 142) |
| Standing test on the raw integer velocity | Within plus or minus 1 raw unit (theirs, `players.cpp` 137) |
| Airborne test: ground point below the centre is not solid | 16 units below the centre (theirs, `players.cpp` 138) |
| Attack clip time = ticks elapsed over tick rate, times a speed | Hammer speed 5 (about 0.2 s); ninja speed 2 (about 0.5 s) (theirs, `players.cpp` 177, 182) |
| Skid: grounded, opposing input, speed above a threshold | `|vx| * 50 > 500` (theirs, `players.cpp` 186); sound gap `time_freq()/10`, 0.1 s (189) |
| Tick rate for every tick-to-seconds conversion | 50 ticks per second (theirs, `engine/shared/protocol.h` 81) |
| Keyframe units to pixels | Scale = tee size / 64 (theirs, `render.cpp` 92); tee size 64 (theirs, `players.cpp` 107) |
| Clip values (keyframes) | Authored in `datasrc/content.py`, CC-BY-SA 3.0. Not copied here; our clip values are our own |

## 4. TypeScript sketch

simplified: keeps the donor order (base set, then one locomotion clip added by the airborne, standing, walk-or-none chain, then the swing clip added on its own channel) and the distance-driven walk phase. It omits: the `GameTickTime` term in the swing time, the skid sound and trail, the predicted-character path, the intra-tick interpolation (the caller passes an already interpolated `x` and `vx`), the air-jump feet dimming, the sprite-muzzle accumulator, the weapon branches other than the generic swing layer, and all drawing. It differs in two places: `sampleKeys` clamps to the first or last key outside the key range (the donor writes nothing in that case), and `gaitPhase` maps an exact negative multiple of the stride to 0 where the donor returns 1.0 (the walk clip is periodic, so the pose is the same).

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {};` appended, exit 0.

## 5. Lands in

- TARGET `src/fight/anim-state.ts` (new client-side view module). It reads the fight state and writes only the rig pose; the engine never reads it. Parity-checklist row 6 (hero actor/animation). Creatures use the same module under row 7 later.
- today: not read (no Frankendom file was opened in this pass).
- Decision (proposed): adapt. Take the distance-driven gait and the layer order (base set, one locomotion add, swing on its own channel) for the hero rig; do not take the 2D sprite-offset feet, because our rig needs ground contact.
- Acceptance: a client test with a fixed hero rig: at the same x the gait phase is identical at 30 and at 144 frames per second; 100 world units gives exactly one walk cycle; a standing hero shows the idle pose and no step; the hammer swing reaches its last key 0.2 s after the server attack tick, whatever the frame rate.
- Reuse tag: rewrite-from-idea (zlib-style code: may be adapted with the notice kept; this sketch is written from the mechanism; `datasrc` values are CC-BY-SA and are not copied)
- Brief rule served: 1 (one engine, two clients: the pose is a client view of engine state and never changes HP or position)

## 6. Gaps and risks

- Distance-driven gait needs a smooth x. Our server ticks give snapshots, so the client needs intra-tick interpolation from its snapshot buffer (server tick: fixed step, input intake, per-tick NPC budget; row 18 / post-K item 3). A teleport or knockback that jumps x would make the phase jump and the legs flicker. The donor does not guard that (not read).
- The donor drops the walk clip when input opposes motion, so the feet freeze at rest while the body backs off. In a fight that is a guard or backstep shuffle (row 3). It must be a deliberate stance pose, not a side effect.
- Idle and in-air have no clock (`players.cpp` 152 and 154 are marked TODO in the donor). Idle breathing would need its own client time value. That is cosmetic and must stay out of the engine.
- Swing timing is in sim ticks since `AttackTick`, which the server sets. The swing clip must be purely cosmetic: it must never decide whether a hit lands. Kills stay server-verified (row 17).
- Layers add per channel with no clamp. The donor has at most one swing per weapon. If two layers stack on the same channel the angles can exceed the intended range; we cap layer count or clamp angles.
- No ground contact: the feet are free offsets (`render.cpp` 283). On a slope or a stair they float or clip. A 3D rig needs foot placement or two-bone IK on top of this; the donor gives no help there.
- Licence: `datasrc` clip values are CC-BY-SA 3.0. Keep our keyframes as our own catalogue data (rows 20-21), never copied.
- Donor is 2D sprites with rotation in turns. Our bones are 3D quaternions. Only the layering, the phase rule and the state chain transfer.
- Not read: the hammer and ninja branches beyond the attach-angle line, `RenderTeeHand`, and the skid effect.

Reuse tag: rewrite-from-idea (zlib-style code; datasrc CC-BY-SA)
Brief rule served: 1 (one engine, two clients)
