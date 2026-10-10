# Open-RSC-Core-Framework (camera, cell 14)

Donor: `/mnt/frankendom-donors/Open-RSC-Core-Framework/Client_Base/src/orsc/mudclient.java` (with `Client_Base/src/orsc/graphics/three/Scene.java` for the camera transform) | Licence: AGPL-3.0 (per `/mnt/frankendom-donors/Open-RSC-Core-Framework/LICENSE`, "GNU AFFERO GENERAL PUBLIC LICENSE", version 3): clean-room, shape only | Java | symbols `handleGameInput` (camera block), `autoRotateCamera`, `cameraColliding`, `drawGame` (camera block), `Scene.setCamera`

Checked: camera_scope: world camera. Read in full: the camera block of `handleGameInput` (11989-12046: snap, turn, follow); `autoRotateCamera` (1482-1522) and `cameraColliding` (1524-1563); the key turn (12205-12240); `update()` (17420) and its idle sway (17440-17495); `Scene.setCamera` (2930-2971); `getCameraPitch` (18390-18392). Read in part: the live `drawGame` camera block (5219-5247; the branch at 5190-5218 is dead because `cameraAutoAngleDebug` is the constant false at 102); the roof zoom block (4925-4960, only the lines that touch the zoom); the zoom decay (12290-12306); the run loop's rate code (1040-1088). Not read: `FastMath.trigTable_1024` (the 1024-unit convention is inferred from the masks and table name), `CollisionFlag` (the meaning of OBJECT is not decoded), `saveZoomDistance`, what `drawUiTab5`'s second argument means. Callers: `autoRotateCamera` is called from `drawGame` at 5221 (live) and at 5194 (dead debug branch); `cameraColliding` is called from `autoRotateCamera` and from the key turn at 12214 and 12228. Confidence: high on the follow arithmetic and the turn ramp (replayed in integers, see section 3); medium on the heading choice (the even and odd branches are as read, but I could not confirm what the donor intends by preferring odd headings); medium on the pitch in degrees (inferred from 1024 units per turn).

Best transferable idea: when the camera's line back to the hero is blocked, turn it to the nearest clear compass heading instead of pulling it in, and let the follow lag grow with the camera's distance.
Decision (proposed): adapt - the turn-away rule fits our world-camera clipping problem without a pull-in ray cast, but the 8 headings, the odd preference and the integer steps are tied to a tile grid, so we take the shape and set the headings and probe tiles from our own zone collision (zones as data); shape only, because the licence is AGPL.
Acceptance: in a corridor with a wall behind the hero the camera turns to the open side in 31 ticks for a 45-degree turn (0.62 s at 50 Hz) and never ends a turn facing a blocked probe tile; a test asserts this for 20 scripted corridor positions.

## 1. Mechanism

- Tick and draw. `run()` runs a count-and-ratio loop like the LostCity client: `update()` runs while the count is below 256 (1062-1063), one `draw()` per pass (1088), and the sleep default is 20 ms (397). `update()` (17420) calls `handleGameInput()` only in game mode (17436-17437), and then ticks the idle sway (17441-17446). So the camera state changes once per `update()`, about 50 times a second at the default.
- Follow (per update, in `handleGameInput`, 11989-12046). First, a snap: if the gap between the camera focus and the hero is over 500 units on either axis, the focus jumps to the hero (11992-11997; the same snap appears again at 12041-12045, in the `else if` of the dead debug flag, so it does not run). Then the focus closes a fraction of the gap on each axis: the step is the gap divided by `(cameraZoom - 500) / 15 + 16` with integer division (12032-12039). At zoom 750 that is a divisor of 32, at 600 it is 22, at 1000 it is 49. The farther the camera, the more it lags. Integer division also means a gap smaller than the divisor makes no step, so the focus stops within divisor minus 1 units of the hero.
- Turn to the chosen heading (auto mode, not first person, 12000-12028). The target yaw is the compass index times 32 on a 256-unit circle (12001). The shortest signed delta is taken (12002-12024). A counter `m_Wc` goes up by one each tick while turning (12005) and the yaw moves by `ceil(delta x m_Wc / 256)` times the sign (12025), wrapped to 256 (12026). The counter resets to 0 when aligned (12028). So the step grows with the time spent turning and shrinks as the delta shrinks. The integer ceiling means the step is at least 1 unit per tick.
- Heading choice (`autoRotateCamera`, 1482-1522, called from `drawGame` at 5221). It runs only in auto mode, not first person, and not while the zoom pulse is active (5220). The rule as read: an odd heading is kept while its probe is clear (1485 gate). A clear even heading moves to an odd neighbour (+1 first, then -1) if one is clear (1486-1490, 1508-1515). A blocked heading searches outward by +1, -1, +2, -2, +3, -3, +4 and takes the first clear one (1496-1503). `cameraColliding` returns true when the probed tiles are clear: for each heading it checks the tile or tiles one and two steps out from the hero in that direction (odd headings check three tiles at a corner; the exact tile offsets are in 1524-1563) for the OBJECT collision flag, and returns false on the first hit.
- Key turn (12205-12240). In auto mode, only when not mid-turn (12205), a key press steps the compass index by one and then searches for a clear heading, up to eight tries (12208-12229). In manual mode the keys change the yaw by 2 units per tick (12235-12237).
- Placement (`drawGame` 5245-5246, `Scene.setCamera` 2930-2971). The look-at point is the eased focus plus the idle sway offset, and its height is the negative of the ground elevation minus 180 (5245), which I read as 180 units above the ground in the donor's y-down convention (inferred). The camera pitch is `getCameraPitch()`, which returns the constant 912 unless first person (18390-18391; 312). The camera distance is zoom times 2 (5246). `setCamera` rotates an offset vector (0, 0, distance) by pitch and then yaw, and sets the camera at the look-at point minus that offset (2936-2971). So the third-person camera is an orbit at fixed pitch around the eased focus. There is no pitch input in third person.
- Zoom. `cameraZoom` is 750 by default (314), with `minCameraZoom` 600 (316). `cameraZoom` is set to `minCameraZoom` plus the saved zoom times 2 (4941). On a roof transition, `amountToZoom` moves by 50 (4936 and 4958) and sets `doCameraZoom`, which blocks auto turning while it is set. Each tick, `minCameraZoom` moves by 4 while `amountToZoom` is non-zero and `amountToZoom` moves 1 toward zero (12299-12306). The 4941 block that writes `cameraZoom` sits inside roof code I read only in part, so how often the pulse reaches the draw is not confirmed.
- Idle sway (17440-17495). Every 500 updates, the sway offset moves on X and/or Z by the current step (2, with a random choice of the two axes at 17444-17450), and the zoom is saved (17454). The step flips when the offset passes plus or minus 50 (17457-17490). This is an anti-idle drift, not a player action.
- Side-tab shift (8321): when the side-tab draw's second argument is true, the sway X offset is set to -88. Nothing else resets it in the code read, so it returns only through the random walk of plus or minus 2 every 500 updates (not decoded whether the draw sets it every frame).
- Fog and first person. Fog distances are set from `cameraZoom` (5226-5239: zoom times 6, or a gameWidth-based formula when C_HIDE_FOG). First person sets distance 0 (5246) and pitch 0 and the direction's rotation (`toggleFirstPersonView`, 18387).

## 2. Key functions

- Camera follow and turn: `/mnt/frankendom-donors/Open-RSC-Core-Framework/Client_Base/src/orsc/mudclient.java` 11989-12046, inside `handleGameInput` (11684).
- Heading choice: same file, `autoRotateCamera` 1482-1522; `cameraColliding` 1524-1563.
- Key turn: same file, 12205-12240.
- Draw placement: same file, `drawGame` 5219-5247 (the live else branch).
- Camera transform: `/mnt/frankendom-donors/Open-RSC-Core-Framework/Client_Base/src/orsc/graphics/three/Scene.java`, `setCamera` 2930-2975.
- Idle sway and tick: `mudclient.java` `update` 17420-17495.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs unless marked) |
|---|---|
| Follow closes gap / divisor, divisor grows with distance | Divisor `(zoom - 500) / 15 + 16` (12034, 12039); zoom 750 gives 32, 600 gives 22, 1000 gives 49 (computed) |
| Integer division dead zone | Gap below the divisor gives no step, so the focus stops within 31 units at zoom 750 (computed) |
| Snap when far | 500 units on either axis (11992) |
| Turn ramp: step = ceil(remaining x ticks / 256), at least 1 | Replayed in integers (`work/turn_ramp_check.py`): a 32-unit (45 degree) turn takes 31 ticks at a constant 1 unit per tick; a 64-unit turn takes 35 ticks; a 128-unit (180 degree) turn takes 40 ticks, with steps rising to 5 then falling back to 1 (computed, not run in the donor) |
| Overshoot | None in the replay for 32, 64, 128 and 192 units (computed) |
| Heading count and spacing | 8 headings, 32 units apart on 256 (12001) |
| Third-person pitch | 912 of 1024 units per turn, about 39 degrees down (312; inferred 1024 convention) |
| Distance | 2 x zoom: 1500 at zoom 750, 1200 at zoom 600 (5246, computed) |
| Look-at height | 180 units above ground (5245) |
| Zoom pulse | 50 per roof transition, 4 per tick, 50 ticks (4936, 12300); about 200 units of `minCameraZoom` change per transition (computed) |
| Idle sway | Every 500 updates, step 2, bound plus or minus 50 (17442, 17457-17490) |
| Manual yaw rate | 2 units per tick (12235) |
| Update cadence | 20 ms default (397); count target 256 (1062) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: per tick, the follow step and then the turn step; per draw, the heading choice and then placement at fixed pitch and distance 2 x zoom. It uses floats where the donor uses integer division, so the follow dead zone is not copied. It adds a cap so a turn step never passes the remaining distance (the donor has no cap; the replay shows no overshoot for 32 to 192 units). It omits: the key turn, manual yaw, the zoom pulse, the idle sway, the first-person view, the fog, the side-tab shift, and server input. The collision probe is a parameter here (the donor reads OBJECT flags on the tile grid directly). The shoulder offset is ADDED and is not in the donor; at 0 the sketch is the donor's centred orbit. Shape only; written from the steps, not translated from the donor lines (AGPL).

```ts
// Licence: AGPL-3.0 (donor LICENSE). Clean-room shape only: written from the described steps, not a translation of the donor lines.
const YAW_FULL = 256;        // donor: yaw state is 256 units per turn
const COMPASS_STEP = 32;     // donor: 8 compass indices, 32 yaw units apart
const PITCH_UNITS = 912;     // donor: third-person pitch, 1024 units per turn (about 39 degrees down)
const PITCH_FULL = 1024;
const TURN_FULL = 1024;      // donor: setCamera angles are 1024 units per turn
const SNAP_GAP = 500;        // donor: focus jumps when the gap exceeds 500 units

interface Cam {
  focusX: number; focusZ: number;  // eased follow point (tick state)
  yaw: number;                     // 0..255 yaw units
  compass: number;                 // 0..7 chosen compass index
  turnTicks: number;               // ticks spent turning
  zoom: number;                    // donor cameraZoom; distance = 2 x zoom
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;

// Shortest signed turn from a to b on the 256-unit circle.
function signedDelta(a: number, b: number): number {
  const d = mod(b - a, YAW_FULL);
  return d > YAW_FULL / 2 ? d - YAW_FULL : d;
}

// One tick of turning. Step grows with ticks spent turning and never drops below 1 unit per tick.
// ADDED clamp: the step is capped at the remaining distance (the donor has no cap; no overshoot in a replay for 32-192 units).
function turnTick(c: Cam): void {
  const d = signedDelta(c.yaw, c.compass * COMPASS_STEP);
  if (d === 0) { c.turnTicks = 0; return; }
  c.turnTicks++;
  const step = Math.min(Math.max(1, Math.ceil((Math.abs(d) * c.turnTicks) / 256)), Math.abs(d));
  c.yaw = mod(c.yaw + Math.sign(d) * step, YAW_FULL);
}

// One tick of follow. The gap closes by 1/divisor, and the divisor grows with zoom, so a farther camera lags more.
// Donor divisor: (zoom - 500) / 15 + 16 with integer division; the sketch keeps floats (no dead zone).
function followTick(c: Cam, hero: { x: number; z: number }): void {
  const gx = hero.x - c.focusX;
  const gz = hero.z - c.focusZ;
  if (Math.abs(gx) > SNAP_GAP || Math.abs(gz) > SNAP_GAP) {
    c.focusX = hero.x;
    c.focusZ = hero.z;
    return;
  }
  const divisor = (c.zoom - 500) / 15 + 16;
  c.focusX += gx / divisor;
  c.focusZ += gz / divisor;
}

// Choose the compass index to face while the camera is in auto mode (shape of the donor's rule).
// Odd indices are kept while clear; a clear even index moves to an odd neighbour if one is clear;
// a blocked index searches outward by +1, -1, +2, -2, +3, -3, +4 for the nearest clear index.
function pickCompass(current: number, clear: (i: number) => boolean): number {
  const evenRule = (i: number): number => {
    if (clear(mod(i + 1, 8))) return mod(i + 1, 8);
    if (clear(mod(i - 1, 8))) return mod(i - 1, 8);
    return i;
  };
  if (current % 2 === 1 && clear(current)) return current;
  if (current % 2 === 0 && clear(current)) return evenRule(current);
  let i = current;
  for (const off of [1, -1, 2, -2, 3, -3, 4]) {
    const j = mod(current + off, 8);
    if (clear(j)) { i = j; break; }
  }
  if (i % 2 === 0 && clear(i)) i = evenRule(i);
  return i;
}

// Per draw: aim point and camera position, y-up world units. Third person: fixed pitch, distance 2 x zoom.
// The aim point is the eased follow point, so the hero stays centred (no shoulder offset in the donor).
function place(c: Cam, groundY: number, shoulder: number): { pos: [number, number, number]; aim: [number, number, number] } {
  const dist = 2 * c.zoom;
  const elev = (mod(PITCH_FULL - PITCH_UNITS, PITCH_FULL) / PITCH_FULL) * 2 * Math.PI;
  const yaw = (c.yaw * 4 / TURN_FULL) * 2 * Math.PI;   // donor: yaw is passed as yaw x 4 in 1024 units
  const back = dist * Math.cos(elev);
  const up = dist * Math.sin(elev);
  const rx = -Math.cos(yaw);   // ADDED shoulder: screen-right vector
  const rz = -Math.sin(yaw);
  const aimY = groundY + 180;  // donor aims 180 units above the ground
  const aim: [number, number, number] = [c.focusX + shoulder * rx, aimY, c.focusZ + shoulder * rz];
  const pos: [number, number, number] = [
    c.focusX + back * Math.sin(yaw) + shoulder * rx,
    aimY + up,
    c.focusZ - back * Math.cos(yaw) + shoulder * rz,
  ];
  return { pos, aim };
}
```

## 5. Lands in

- TARGET `src/fight/worldCamera.ts` (proposed; the same module as the LostCity and RuneLite notes). Client-only: the camera reads the hero's tile and the zone collision grid and never writes game state. Parity-checklist row 11 (fight camera) is the nearest row; Lead should confirm, since no row covers the world camera.
- today: the world camera in Frankendom (not read in this pass).
- Reuse tag: adapt (AGPL-3.0: shape only; the sketch is clean-room)
- Brief rule served: client-only camera (addendum: the camera is client-only and the engine never reads it); rules 7-9 n/a

## 6. Gaps and risks

- Centred again. The aim point is the eased follow point, so the hero is in the middle of the frame. This donor does not give an over-the-shoulder offset; the sketch's `shoulder` is ADDED.
- No pull-in, only turn-away. The rule chooses a heading; it does not move the camera closer when no heading is clear. If all eight headings are blocked the code keeps the current heading (the search finds nothing). Frankendom needs a fallback (pull-in or a height lift); not in this donor.
- The even and odd preference (even clear headings move to an odd neighbour) was read but I could not work out the donor's intent. Do not copy the preference without a test that shows what it prevents.
- Integer steps. The follow dead zone and the integer turn step are artifacts of the donor's arithmetic. The sketch uses floats; a test should show the 31-tick figure for 45 degrees is the same within one tick.
- Look-at shift leak. The side-tab shift of -88 (8321) is not reset in the code read, so it can persist for minutes through the random walk of 2 units per 500 updates. Do not let a UI overlay set the world camera's offset without a reset.
- Zoom pulse reach. The roof zoom pulse changes `minCameraZoom` at 4 per tick, but the camera reads `cameraZoom`, which is recomputed in roof code I read only in part (4941). Frankendom should not copy the pulse without checking how it reaches the draw.
- Idle sway: an anti-idle drift of up to 50 units every 10 seconds (17442-17490). It is a visible wobble with no purpose in a duel; reject for Frankendom, as for the LostCity drift.
- Pitch is fixed in third person (18390-18391): the donor has no pitch control outside first person. Frankendom's owner wants a better world camera; pitch control is a separate decision.
- Licence: AGPL-3.0, clean-room. Do not copy the structure line by line; the sketch takes the shape only. Any server-side use would bring AGPL obligations; the sketch is client-only, so this does not apply to it.
- Client-only rule: the heading and the follow state must never affect hits, targets or any server message.
