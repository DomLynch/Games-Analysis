# XProger-OpenLara (camera, cell 14)

Donor: `/mnt/frankendom-donors/XProger-OpenLara/src/camera.h` | Licence: BSD 2-Clause (LICENSE, read: "BSD 2-Clause License", Copyright (c) 2018, Timur "XProger" Gagiev; permissive, code may be adapted with the notice kept) | C++ | symbol `Camera::update`

Checked: camera_scope = world camera (third-person follow behind the actor in open levels). Symbols read: `Camera::update` (356-632), `Camera::move` (330-354), `Camera::traceClip` (248-288), `clipSlide` (211-246), `clipBox` (290-328), `getViewPoint` (127-168), `changeView` (711-724), `setup` (634-682) in `src/camera.h` (727 lines, read in full); `ICamera` (controller.h 18-47), `Controller::trace` and `traceX`/`traceZ`/`clipHeight` (controller.h 910-1087, read in full); `Game::update` sub-step loop (game.h 271-329, read in the timing lines 317-326); `Core::update` (core.h 1126-1134); `Character::lookAt`/`lookAtPos` (character.h 236-272); `Lara::lookAt` (lara.h 1296-1327); `Lara::updateState` camera presets (lara.h 2941-3008); Lara input mode line (lara.h 3317-3320); `Lara::update` head (lara.h 3252-3290); `Lara::updateTargets` (lara.h 1389-1471, the target choice only); shake sources (level.h 706-745); `level.h` controller loop (2295-2320); `vec3` constructors (utils.h 424-440). Confidence: high for the follow/combat numbers and the order of steps (read end to end). Medium for the exact slide geometry in `clipSlide` (read, but I did not run it). Not read: `src/fixed/camera.h` (fixed-point port, grep hits only), `clampAngle`, the scalar `lerp`, `Frustum`, the `getFloor`/`getCeiling` bodies, the retarget loop in `updateTargets` (1398 onward), and the underwater branch of `getViewPoint`. Sign of the vertical offset is derived from the `vec3` constructor and the hang preset, not run.

Best transferable idea: keep the orbit distance fixed, pull the eye in to the wall with a clip that slides along the wall on a circle of the same radius, and ease the eye at a frame-rate-independent rate (30/speed per second) so the view never clips through geometry.
Decision (proposed): adapt - the shape is useful for a world third-person camera (orbit from a focus point, pitch clamp, wall pull-in, rate-based follow, per-state orbit presets); the donor's tile-grid collision and its look-only head aim do not fit our rulings, and the donor has no over-the-shoulder offset, so we must add one.
Acceptance: when the player stands with a wall about one sector behind, the camera slides along the wall and never passes through it, the eye catches up within about 0.4 s after a fast turn while the view angle turns at once, and the camera stays behind the character's facing in both follow and combat modes.

## 1. Mechanism

- One camera per player. It is client code: nothing in the engine reads it. `Camera::update` runs once per Lara tick (lara.h:3290), which the level calls for each controller per tick (level.h:2303-2308).
- Timing: `Game::update` clamps the wall-clock frame to 0.2 s for non-cutscene levels (game.h:318), then runs `Game::updateTick` in sub-steps of at most 1/30 s until the frame is used up (game.h:320-323). `Core::deltaTime` is the ms difference from the clock (core.h:1131). So every camera rate below is per second of game time, not per frame.
- Order of steps in one tick (follow or combat path, camera.h 356-553):
  (a) Shake decays by dt (358). Shake is a number of seconds left.
  (b) Look offset. In look mode the stick integrates `lookAngle` at 3 x dt, clamped to pitch -75 to +55 deg and yaw +-80 deg (424-438). Outside look mode, `lookAngle` lerps back to zero at rate 10 x dt (441-445).
  (c) Stick view offset, not stored: pitch -R.y x 67.5 deg, yaw R.x x 90 deg (453-455). It applies outside look mode (and not in spectator) and is gone the moment the stick is released.
  (d) Orbit angles: `targetAngle = owner.angle + lookAngle + viewAngle` (460). Pitch is clamped to +-85 deg (465). Yaw is not smoothed: it equals the actor's yaw.
  (e) Aim. `owner.lookAt(lookAt)` (481) turns Lara's head and chest toward the look target. The look target is Lara's own `viewTarget` if set (`updateTargets` picks the nearer of her two arm targets, or a tracked target if none, lara.h:1461-1470), otherwise the camera's `viewTarget` (set by trigger commands, lara.h:1985) if it is within the front cone (`dot > 0.1`, about 84 deg; camera.h:473). When Lara has a target, `Lara::lookAt` also sets the camera's preset angle from the direction head-to-target (lara.h:1318-1321, `getAngle` at 1288-1289). Derived, not run: the orbit then places the eye on the far side of Lara from the target, so the camera looks through Lara at the target.
  (f) Preset. `targetAngle += angle` (488), in follow and combat only. `angle` is written each tick only while the camera mode is FOLLOW (lara.h:2944), so in combat the last preset persists until `lookAt`/`setAngle(0,0)` resets it (1323-1324). The state table (lara.h:2949-3006), as (pitch, yaw) in degrees: reach (0,85), back-jump (0,135), surf states and wade (-22,0), slide (-45,0), hang (-60,0), push/pull block (-25,35), push-pull-ready (0,75), pick-up (-15,-130), switch (-25,80), key/puzzle (-25,-80), special (-25,170), default (0,0). Combat with no target resets it to (0,0) (lara.h:1323-1324).
  (g) Look point. x and z follow the actor (511), except when `centerView` is set, which swaps in the box centre (144-147); Lara sets it in water-out, death, push/pull-block and special states (lara.h 2951-3000). y is 3/4 of the way from the bottom of the actor's box toward the top (156), minus 256 (161), and eases at rate 5 x dt when `smooth` is set (514). In look mode the point is the head joint with a `(0, -128, 0)` offset applied in joint space (camera.h:150-153; the sign of the lowering is not verified).
  (h) Ideal eye: `offset` behind the look point along the orbit direction (524-525). Offset is 1536 in follow, 2048 in combat (522), 512 in look mode. Lara sets combat every tick when her hands are not empty and she is alive, otherwise follow (lara.h:3318); look is set by the look input (3319-3320).
  (i) Wall pull-in (`traceClip`, 528). First, a grid ray is walked from the look point to the ideal eye, one 1024-unit cell at a time, and stops at the first blocked cell (`Controller::trace`, controller.h:1054-1068; `traceZ` stops at 1035-1038). Then the free box of the sector is taken (`clipBox`, 290-328) and inset by 256 (262). If the stopped point is outside the box's Z range, X and Z are swapped (270-275), and the point is left alone if its X is inside the box (277-278). Otherwise `clipSlide` (211-246) works in three cases: two corner cases and one side case. Its side case puts the eye on the circle of radius `offset` around the look point where that circle meets the wall line (226). A corner case falls back to the box corner when the circle does not reach the wall or passes the corner (222-233, 240-245).
  (j) Eye follow (`move`, 330-354). When `smooth` is set and speed > 0, the eye lerps toward the clipped point with factor 30/speed x dt, so 12 gives 2.5 per second and 8 gives 3.75 per second (331). Look mode uses 20 x dt (333). When not smooth the factor is 1 (snap). After the lerp, the eye's y is clamped between the sector ceiling plus 256 and the sector floor minus 256 (340-353). If the two cross, both collapse to the midpoint (349-350).
  (k) `smooth = true` (540). `smooth` is cleared on reset (98), on a switch into first person (715), and at the end of a static timer (548), so the next eye move snaps.
  (l) Shake is added only to the view matrix, not to the eye (641-642): y offset = 48 x s x sin(7 x PI x s), with s the seconds left. Sources: floor shake sets 0.5 x (1 - d^2 / (15 x 1024)^2) within 15 sectors of the player (level.h:714); explosions set 1.0 (level.h:727); other code can add (level.h:741).
  (m) Mode reverts. After the update, `mode` returns to FOLLOW unless it was re-requested this tick (552-553). Static mode is requested by trigger commands (lara.h:1996). Heavy mode (lara.h:2175) is kept while its timer runs (552), so it is the exception.
- Field of view: 65 deg in third person and 90 deg in first person, set only in `changeView` (717). Combat does not change the FOV.

## 2. Key functions

- `Camera::update`: `/mnt/frankendom-donors/XProger-OpenLara/src/camera.h` 356-632 (decay and cutscene 370-418; look branch 423-457; orbit 460-465; aim 467-485; presets and offset 487-531; move 531; smooth and revert 540-557; spectator 559-626, read but not part of the follow camera; listener 630-631).
- `Camera::traceClip`: `/mnt/frankendom-donors/XProger-OpenLara/src/camera.h` 248-288 (ray, axis swap, box test, slide).
- `Camera::clipSlide`: `/mnt/frankendom-donors/XProger-OpenLara/src/camera.h` 211-246 (circle-on-wall placement, three cases).
- `Camera::move`: `/mnt/frankendom-donors/XProger-OpenLara/src/camera.h` 330-354 (rate lerp and floor/ceiling clamp).
- `Controller::trace` (Location overload): `/mnt/frankendom-donors/XProger-OpenLara/src/controller.h` 1054-1068; `traceX` 978-1014 and `traceZ` 1016-1052 in the same file.
- `Lara::lookAt` and aim: `/mnt/frankendom-donors/XProger-OpenLara/src/lara.h` 1296-1327.
- `Lara::updateState` presets: `/mnt/frankendom-donors/XProger-OpenLara/src/lara.h` 2941-3008.
- Sub-step loop: `/mnt/frankendom-donors/XProger-OpenLara/src/game.h` 317-326.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Orbit eye = focus point minus orbit direction times offset | Offset 1536 follow (camera.h:20), 2048 combat (25), 512 look (28) |
| Pitch clamp on the orbit | +-85 deg (465) |
| Stick view offset, instant, not stored | Pitch up to 67.5 deg (PI x 0.375, 453); yaw up to 90 deg (PI x 0.5, 454) |
| Look offset: integrate at 3 x dt, clamp, recentre | Integrate 3 x dt (424); look pitch -75 to +55 deg (31-32), yaw +-80 deg (33); recentre rate 10 x dt (441) |
| Eye follow as a rate, frame-rate independent | 30 / speed x dt: 12 gives 2.5 per s (9, 331); 8 gives 3.75 per s (10) |
| Look-mode eye rate | 20 x dt (333) |
| Look point height eased | 5 x dt (514) |
| Look point height rule | 3/4 up the box (156), minus 256 (161) |
| Wall inset | 256 (262) |
| Floor and ceiling headroom | 256 each (340, 348) |
| Frame clamp and sub-step cap | 0.2 s frame clamp (game.h:318); 1/30 s sub-step (321) |
| Shake | Decays 1 per s (358); amplitude 48 (642); phase 7 x PI per unit (642); floor shake 0.5 within 15 sectors (level.h:714); explosion 1.0 (727) |
| FOV | 65 deg third person, 90 deg first person (717) |
| Look-at cone | dot > 0.1, about 84 deg (473) |
| State presets | Reach yaw 85 (lara.h:2958), back-jump yaw 135 (2961), surf and wade pitch -22 (2968, 3003), slide pitch -45 (2972), hang pitch -60 (2977), push/pull (-25,35), push-pull-ready (0,75), pick-up (-15,-130), switch (-25,80), key/puzzle (-25,-80), special (-25,170) (lara.h:2949-3006) |

Mechanism claims, no constant: the eye is always pulled in from the focus point, never pushed; the slide keeps the distance equal to the offset; the eye is kept off the floor and ceiling by 256.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: shake decay, look-offset recentre, orbit angles (pitch clamp, then preset), look point, ideal eye, wall pull-in, frame-rate-independent eye lerp, floor/ceiling clamp, then shake as a view-only offset. It omits: the look-mode stick integration (the caller sets `lookPitch`/`lookYaw`), the owner's own pitch and the yaw wrap (`clampAngle`), the underwater -256 exception, the head-joint look point in look mode, the second eye trace when the ideal eye is below the floor, sector and room tracking, the wall slide geometry (`pullIn` is injected and must be supplied by the engine's world query), the static, cutscene and first-person paths, and the aim and look-at logic (the caller supplies `preset`, from a state table or a target direction), the `centerView` x/z swap to the box centre, and the second eye trace in `move` (342-346). The sketch's `PRESET` table lists the donor's full state table. Nothing else is reordered.

```ts
// Licence: BSD-2-Clause (donor: XProger-OpenLara, LICENSE). Adapted shape, hand-written in TypeScript from the read mechanism.
// BSD-2 notice: Copyright (c) 2018, Timur "XProger" Gagiev. Keep that notice in any code copied from the donor.

type V3 = { x: number; y: number; z: number };
type Stick = { pitch: number; yaw: number }; // radians, already dead-zoned by the caller
type Mode = 'follow' | 'combat' | 'look';

const DEG = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const lerp3 = (a: V3, b: V3, k: number): V3 =>
  k >= 1 ? { x: b.x, y: b.y, z: b.z }
         : { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };

// Donor vec3(lng, lat) constructor (utils.h:431) with lng = pitch, lat = yaw.
function dirFromAngles(pitch: number, yaw: number): V3 {
  return { x: Math.sin(yaw) * Math.cos(pitch), y: -Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
}

// Tunables. Values are the donor's; a designer would make these zone data where they differ per zone.
export interface Tune {
  offsetFollow: number;  // 1536 units (donor CAM_OFFSET_FOLLOW)
  offsetCombat: number;  // 2048 units (CAM_OFFSET_COMBAT)
  offsetLook: number;    // 512 units  (CAM_OFFSET_LOOK)
  speedFollow: number;   // 12 (CAM_SPEED_FOLLOW); eye rate = 30 / speed per second
  speedCombat: number;   // 8  (CAM_SPEED_COMBAT)
  lookRate: number;      // 20 per second in look mode
  recentreRate: number;  // 10 per second (look offset back to 0)
  targetYRate: number;   // 5 per second (look point height easing)
  pitchMax: number;      // 85 degrees in radians
}
export const DONOR_TUNE: Tune = {
  offsetFollow: 1536, offsetCombat: 2048, offsetLook: 512,
  speedFollow: 12, speedCombat: 8, lookRate: 20, recentreRate: 10, targetYRate: 5,
  pitchMax: 85 * DEG,
};

// Per-state orbit presets (donor lara.h:2949-3006, in degrees there). The donor writes them only while the camera mode is follow.
export const PRESET = {
  none:          { pitch: 0 * DEG,   yaw: 0 * DEG },
  reach:         { pitch: 0 * DEG,   yaw: 85 * DEG },
  backJump:      { pitch: 0 * DEG,   yaw: 135 * DEG },
  surfWade:      { pitch: -22 * DEG, yaw: 0 * DEG },
  slide:         { pitch: -45 * DEG, yaw: 0 * DEG },
  hang:          { pitch: -60 * DEG, yaw: 0 * DEG },
  pushPullBlock: { pitch: -25 * DEG, yaw: 35 * DEG },
  pushPullReady: { pitch: 0 * DEG,   yaw: 75 * DEG },
  pickUp:        { pitch: -15 * DEG, yaw: -130 * DEG },
  switchUse:     { pitch: -25 * DEG, yaw: 80 * DEG },
  keyPuzzle:     { pitch: -25 * DEG, yaw: -80 * DEG },
  special:       { pitch: -25 * DEG, yaw: 170 * DEG },
};

export interface Actor { x: number; z: number; yaw: number; boxMinY: number; boxMaxY: number; }

// World queries are injected. The donor uses its tile trace, clipBox and clipSlide for pullIn, and sector floor/ceiling for the others.
export interface Env {
  pullIn(from: V3, ideal: V3, offset: number): V3;
  floorAt(p: V3): number;   // y grows downward
  ceilingAt(p: V3): number;
}

export interface Cam {
  eye: V3;
  look: V3;
  lookPitch: number; // stored look offset (look mode integrates it, other modes recentre it)
  lookYaw: number;
  smooth: boolean;   // false on the first frame and after a view change: snap
  shake: number;     // seconds left
}

// One sub-step. The caller must split wall-clock time into steps of at most 1/30 s (donor game.h:321) and call this once per step.
export function camStep(c: Cam, a: Actor, mode: Mode, stick: Stick, preset: Stick,
                        t: Tune, dt: number, env: Env): V3 {
  c.shake = Math.max(0, c.shake - dt);

  if (mode !== 'look') { // donor lerps the look offset toward 0 at rate recentreRate * dt
    c.lookPitch += (0 - c.lookPitch) * (t.recentreRate * dt);
    c.lookYaw   += (0 - c.lookYaw)   * (t.recentreRate * dt);
  }

  // Orbit angles. Yaw follows the actor with no lag. The stick offset is instant and not stored. The preset is added after the clamp.
  const pitch = clamp(c.lookPitch + stick.pitch, -t.pitchMax, t.pitchMax) + preset.pitch;
  const yaw   = a.yaw + c.lookYaw + stick.yaw + preset.yaw;

  // Look point: x/z rigid on the actor. y is 3/4 of the way up the box, then 256 higher (donor camera.h:156, 161), and eased when smooth.
  const lookY = a.boxMaxY + (a.boxMinY - a.boxMaxY) * 0.75 - 256;
  c.look = {
    x: a.x,
    y: c.smooth ? c.look.y + (lookY - c.look.y) * dt * t.targetYRate : lookY,
    z: a.z,
  };

  // Ideal eye: `offset` behind the look point along the orbit direction (donor camera.h:524-525).
  const offset = mode === 'combat' ? t.offsetCombat : mode === 'look' ? t.offsetLook : t.offsetFollow;
  const d = dirFromAngles(pitch, yaw);
  const ideal: V3 = { x: c.look.x - d.x * offset, y: c.look.y - d.y * offset, z: c.look.z - d.z * offset };

  // Wall pull-in (injected, see Env). Then the eye moves toward the result at a frame-rate-independent rate.
  const free = env.pullIn(c.look, ideal, offset);
  const speed = mode === 'combat' ? t.speedCombat : t.speedFollow;
  const k = mode === 'look' ? t.lookRate * dt : c.smooth ? Math.min(1, (30 / speed) * dt) : 1;
  c.eye = lerp3(c.eye, free, k);

  // Keep the eye between ceiling + 256 and floor - 256. If the gap is closed, both collapse to the midpoint (donor camera.h:340-353).
  let floor = env.floorAt(c.eye) - 256;
  let ceil = env.ceilingAt(c.eye) + 256;
  if (floor < ceil) { floor = ceil = (floor + ceil) * 0.5; }
  if (c.eye.y > floor) c.eye.y = floor;
  if (c.eye.y < ceil) c.eye.y = ceil;

  c.smooth = true;

  // Shake is a view-only vertical offset (donor setup(), camera.h:641-642). Amplitude 48 * s, phase 7 * PI * s, s = seconds left.
  const shakeY = c.shake > 0 ? Math.sin(c.shake * Math.PI * 7) * c.shake * 48 : 0;
  return { x: c.eye.x, y: c.eye.y + shakeY, z: c.eye.z };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/world-follow-camera.ts: exit 0.

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed client-only module for the world third-person camera; not checked against the repo, so it may not exist yet). The camera reads the actor and the world and writes only the view. It must not feed the engine.
- Parity row 11 (fight camera). Row 11 is the closest fit. Row 22 (Pit-only) is untouched: the frozen Pit camera stays as it is.
- Reuse tag: adapt-shape (BSD-2-Clause; code may be adapted with the notice kept; the sketch is a hand re-expression, not a copy)
- Brief rule served: 11 (fight camera, client-only; the engine never reads camera state). Rules 7-9 n/a.

## 6. Gaps and risks

- No over-the-shoulder offset. Nothing in this donor moves the eye sideways; the eye sits on the line behind the actor's facing (camera.h:524-525; `getDir`, controller.h:784-786). The owner's over-the-shoulder ask needs a lateral term on the look point (a right-hand vector times a shoulder distance), which we must add and test ourselves. This is not in the donor.
- One target only. The camera turns to face one look target (Lara's nearer arm target, or a trigger target in front). It never widens to frame several enemies. For many-on-one (MAX_ATTACKERS = 3) the donor gives no framing rule. In our rulings the engine owns the hate list and target choice (zones as data, one engine), so the client camera should take one focus point from the engine's state and never pick a target itself.
- Combat changes distance and speed only (2048 and 8 against 1536 and 12). FOV stays at 65 deg. A combat zoom pulse would be new, not from this donor.
- Input against follow. Yaw follows the actor with no lag, and the stick offset is instant on release. Only the stored look offset recentres, at 10 per s, and only outside look mode (camera.h:441-445). If the owner wants a recentre behind the character after a stick release, this lerp is the pattern to copy, not the instant stick offset.
- Wall clip uses the donor's 1024-unit tile grid and TR sector floors and ceilings. Our zones are data, not tiles, so only the rule transfers: trace from the focus point, inset 256 from walls, slide on the circle of the same radius. The exact `clipSlide` cases need a test with a wall at 0.5, 1 and 2 sectors.
- Frame timing. The donor's rates are per second of game time, and it caps a sub-step at 1/30 s and a frame at 0.2 s (game.h:318, 321). Our client camera can use render-frame dt directly, but it must clamp dt the same way or the view jumps after a stall.
- Shake is view-only in the donor and does not change any hit result. That fits our rule that the camera is client-only: shake must never feed server-verified kills.
- Aim. The donor's head aim follows the camera direction (lara.h:1305). Hit detection must come from server state, never from camera aim, or the client could steer kills.
- Tunables. Offsets (1536, 2048, 512) are the donor's feel and should be per-zone data if they differ by zone; the rates, clamps and 256 headroom are engine constants of the camera.
- Licence: BSD-2 permits adaptation. No GPL code is involved; the notice must travel with any copied text.
- Not read: `src/fixed/camera.h` (fixed-point port), `clampAngle`, scalar `lerp`, `Frustum`, `getFloor`/`getCeiling` bodies, the underwater branch of `getViewPoint` (only its flag checks were read), the retarget loop in `updateTargets` (1398 onward). The slide geometry was read, not run.

Reuse tag: adapt-shape (BSD-2-Clause; notice kept)
Brief rule served: 11 (fight camera, client-only); rule 1 is not a fight rule here, so n/a


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Mechanism (g) says look point x/z 'follow the actor exactly (511)'; getViewPoint 144-147 swaps in the box centre when centerView is set (death, water-out, push/pull block, special states per lara.h 2951-3000), so x/z are not always the actor position. Look-mode head offset is vec3(0,-128,0) in joint space (152): 'lowered by 128' is unverified given y-down; do not rely on direction. Preset list in (f)/sketch names only reach/hang/slide; the real state table (lara.h 2949-3006) also has back-jump yaw 135, surf/wade pitch -22, push/pull (-25,35), pick-up (-15,-130), switch (-25,80), key/puzzle (-25,-80), special (-25,170), push-pull-ready (0,75). Rest verified: 1536/2048/512, 12/8 speeds, 30/speed*dt, 20*dt look, 5*dt, 256 insets, 3/4 height, +-85, 67.5/90 stick, -75/+55/80 look, 10*dt recentre, 0.2/1/30 s timing, shake 48*sin(7 PI s) with sources 714/727/741, FOV 65/90, dot>0.1, traceClip/clipSlide/clipBox/move line ranges, vec3(lng,lat) at utils.h 431, BSD-2.

**Missed:** centerView flag and the full per-state preset table; second eye trace in move() (342-346) is only listed as omitted in sketch, not in mechanism (j); presets are only written when camera->mode == FOLLOW (lara.h 2944), so in combat the last preset persists until lookAt/setAngle(0,0) at 1323.
