# LostCityRS-Client-TS (camera, cell 14)

Donor: `/mnt/frankendom-donors/LostCityRS-Client-TS/src/client/Client.ts` (with `src/client/GameShell.ts` for the loop) | Licence: MIT (per `LICENSE` line 1: "MIT License", Copyright 2023-2026 Lost City) | TypeScript | symbols `followCamera`, `camFollow`, `gameDrawMain`

Checked: camera_scope: world camera. Read in full: `followCamera` (3222-3303), `camFollow` (4432-4465), the camera block of `gameDrawMain` (4182-4196), the tick call site in `gameLoop` (2345-2353), `GameShell` loop lines 11 and 140-205. Read in part: `roofCheck` (4476-4506 and 4514-4575, middle walk not read), `cinemaCamera` (3305-3350, x axis only), `getAvH` (5052-5070, corner lookup, interpolation end not read). Not read: how `groundh` is filled (so the meaning of "rise" is inferred from the sign of the code), the `Model`/`World` projection code, the mouse-drag path beyond the arrow-key emulation. Callers: `followCamera` has one caller (`gameLoop`), `camFollow` has one caller (`gameDrawMain`), both by grep. Confidence: high on the tick and follow maths; medium on the terrain pitch floor's physical meaning.

Best transferable idea: a third-person camera can run as two rates: the focus eases toward the hero on each fixed tick, yaw and pitch are velocities that ease in while a key or drag is held and halve on release, and the pitch floor rises fast and falls slowly with the terrain while the distance grows with pitch.
Decision (proposed): adapt - LostCity is a centred orbit with no shoulder offset, no wall pull-in and no recentring, so on its own it does not fix the over-the-shoulder complaint; the tick-stepped follow, the velocity input and the asymmetric terrain pitch floor are cheap shapes worth taking into the world camera, once the `| 0` truncation is removed and a shoulder offset and wall pull-in are added by us.
Acceptance: after a run up a slope the camera lifts over about 0.5 s and settles back over about 1.6 s with no jitter, and a test that feeds the same 1 s of input at 50 Hz and at 144 Hz asserts the same camera pose within 1 unit.

## 1. Mechanism

- Two layers. Layer A is tick state, updated in `gameLoop` at 50 Hz (`followCamera`, 3222). The focus (X and Z) closes 1/16 of the gap to the player per tick and snaps if the gap is over 500 (3230, 3236). Yaw and pitch are velocities: while the left key is held the yaw velocity eases toward -24 per tick, the right key toward +24 (3243-3247); the pitch velocity eases toward +12 for the up key and -12 for the down key (3251-3255). With no key the velocity halves each tick (3248, 3256). Yaw adds half its velocity per tick and is masked to 2048 units per turn (3259); pitch adds half its velocity and is clamped to 128..383 (3260-3266).
- Layer A also builds the terrain pitch floor. It takes the highest height difference in a 9x9 tile window centred on the focus (3270-3285), multiplies by 192 and clamps to 32768..98048 (3291-3292), then eases the floor toward that value: 1/24 of the gap per tick when rising, 1/80 when falling (3298-3301). The floor is stored in units of 256 per pitch unit, so the pitch equivalent is 128..383.
- Layer B is placement, once per draw frame (`gameDrawMain`, 4182-4196). Pitch is the larger of the orbit pitch and the terrain floor (4183-4185); a pitch-axis camera shake can raise it further (4187-4188). Yaw is orbit yaw plus an idle drift angle (4191). Distance is 600 + 3 x pitch (4194). `camFollow` (4432) then puts the camera behind the focus: horizontal distance is distance x cos(pitch), height is distance x sin(pitch), turned by yaw (4434-4461). The aim point is the smoothed focus in X and Z and the ground under the player minus 50 in height (4194; the height is the unsmoothed player ground).
- Shake (server packet, 6356-6365): each of 5 axes (x, y, z, yaw, pitch) gets a random jitter in +/- `ran` plus a sine term `amp x sin(cycle x rate / 100)`, applied after placement each draw (4212-4221). The cycle counter advances once per tick (2352-2353). Pitch-axis shake does not jitter; it sets a pitch floor of `amp + 128` (4187-4188).
- Cinematic move (CAM_MOVETO, `cinemaCamera` 3305): each tick the camera steps a fixed `rate` plus `rate2/1000` of the remaining gap on each axis (3311).
- Loop driver. `GameShell` (140-205) keeps `count` and `ratio`; each pass runs `mainloop` (which holds `gameLoop`, the tick) while `count < 256`, adding `ratio` each time (192-195), then runs `mainredraw` once (203). `ratio` is estimated from the last 10 pass times and clamped to 25..256 (158-165). `deltime` is 20 ms (11). So the tick and the draw are paired at about 20 ms and the camera state changes only on ticks. The camera code read does not interpolate between ticks; placement uses the last tick's focus.
- Input. Arrow keys set key flags 1-4: left 1, right 2, up 3, down 4 (`GameShell` 448-453). A touch drag emulates arrow keys (the touch branch of `pointerMove`, 11798-11823); the mouse branch of `pointerMove` sets only the mouse position (read). Lifting the pointer (11695-11702) or leaving it (11775-11779) clears the flags. The camera pose is also sent to the server (2165-2178), for scene use only; it does not drive any combat rule in the code read.
- Not a camera collision. `roofCheck` (4476) walks tiles from the camera to the player (only when pitch is below 310, 4479) and returns the top level to draw, so roofs are hidden. It does not move the camera. The only protection against terrain is the pitch floor above.
- No recentring. `orbitCameraYaw` is written only by the login random offset (1834) and by key-driven follow (3259). No code turns yaw toward the player's facing, so the camera never returns behind the character on its own.

## 2. Key functions

- `followCamera`: `/mnt/frankendom-donors/LostCityRS-Client-TS/src/client/Client.ts` 3222-3303. Tick state: focus follow, yaw and pitch velocity, pitch clamp, terrain floor.
- `gameLoop` tick call: same file, 2345-2353 (`followCamera` only when `sceneState` is 2; shake counters advance here).
- `gameDrawMain` camera block: same file, 4182-4196. Terrain floor, yaw with drift, `camFollow` call with distance 600 + 3 x pitch; shake applied at 4212-4221.
- `camFollow`: same file, 4432-4465. Offset from the focus by pitch then yaw; sets `camX`, `camY`, `camZ`, `camPitch`, `camYaw`.
- `GameShell` loop: `/mnt/frankendom-donors/LostCityRS-Client-TS/src/client/GameShell.ts` 140-205. Accumulator that runs ticks and one draw per pass.
- `roofCheck` (read in part): same as Client.ts 4476-4575. Level choice for roof hiding; not camera placement.
- `cinemaCamera` (read in part): same as Client.ts 3305-3350. Cutscene ease.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Focus closes a fixed fraction of the gap each tick; snap when far | Divisor 16 (3236); snap at 500 units (3230) |
| Yaw and pitch as velocities eased toward a target while input is held; decay by half on release | Yaw target 24 (3244); pitch target 12 (3252); decay by half (3248) |
| Angle integrated from half the velocity each tick | Yaw by half velocity (3259); pitch by half velocity (3260) |
| Pitch clamp | 128 to 383 units (3262-3265), which is about 22.5 to 67.3 degrees at 2048 units per turn (mechanism) |
| Distance grows with pitch so steep views are farther out | 600 + 3 x pitch (4194); at pitch 128 that is 984 units, at 383 it is 1749 units (mechanism; 128 units per tile, theirs in the tile scale used by the donor) |
| Terrain pitch floor, rise fast, fall slow | Window radius 4 tiles (3275); height difference x 192 (3291); clamp 32768..98048 (3292, 3262-3266 scale); rise divisor 24 (3299); fall divisor 80 (3301) |
| Time constants implied by the divisors at 50 Hz | Focus about 0.32 s (16 ticks); pitch floor rise about 0.48 s (24 ticks); fall about 1.6 s (80 ticks) (mechanism) |
| Aim point height above ground | 50 units (4194) |
| Shake as random plus sine per axis | Packet bytes ran, amp, rate (6363-6365); sine rate divisor 100 (4216) |
| Cutscene ease: fixed step plus proportion of the gap | Proportion divisor 1000 (3311) |
| Driver: ticks counted in fixed steps, one draw per pass | Tick length 20 ms (GameShell 11); count target 256 (185) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the focus follow and the yaw and pitch velocities run on each tick, the terrain pitch floor is eased on the same tick, and the camera is placed per frame at distance 600 + 3 x pitch. It uses floats where the donor uses `| 0` truncation, so the donor's 15-unit follow dead zone and its yaw velocity stall near 23 are not copied. It omits: the idle macro drift, the shake packets, the cutscene ease, the roof-level walk, the touch and drag key emulation, and sending the pose to the server. It does not recentre yaw on the hero's facing (the donor does not either). The terrain rise is passed in by the caller (the donor samples a 9x9 tile window itself). The `shoulder` offset is ADDED here and is not in the donor; with it at 0 the sketch is the donor's centred orbit. The driver is a plain millisecond accumulator with no catch-up cap, not the donor's count and ratio loop.

```ts
// Licence: MIT (donor LICENSE). Clean-room sketch of the described mechanism, not a line translation.
type Angle = number; // donor units: 2048 per full turn

const ANGLE_FULL = 2048;
const toRad = (a: number): number => (a * 2 * Math.PI) / ANGLE_FULL;
const wrap = (a: number): number => ((a % ANGLE_FULL) + ANGLE_FULL) % ANGLE_FULL;
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

// Tunables. Donor values unless marked ADDED.
const TUNE = {
  followDivisor: 16,   // donor: focus closes 1/16 of the gap per tick
  snapGap: 500,        // donor: focus jumps when the gap exceeds 500 units
  yawTarget: 24,       // donor: yaw velocity eases toward 24 units per tick
  pitchTarget: 12,     // donor: pitch velocity eases toward 12 units per tick
  pitchMin: 128,       // donor
  pitchMax: 383,       // donor
  distBase: 600,       // donor: distance = 600 + 3 * pitch
  distPerPitch: 3,     // donor
  floorRise: 1 / 24,   // donor: terrain pitch floor rises 1/24 of the gap per tick
  floorFall: 1 / 80,   // donor: and falls 1/80 per tick (slow relax)
  shoulder: 0,         // ADDED (not in donor): lateral offset in units, + = camera to the right
};

interface OrbitCam {
  focusX: number; focusZ: number;   // smoothed focus on the ground plane (tick state)
  yaw: Angle; pitch: Angle;         // angle units; pitch 128..383 (donor)
  yawVel: number; pitchVel: number; // units per tick, eased toward the key targets
  terrainPitch: number;             // smoothed pitch floor from terrain (pitch units)
}

// yaw -1 = left key, +1 = right key; pitch +1 = up key (donor keyHeld[3]), -1 = down key.
interface Input { yaw: -1 | 0 | 1; pitch: -1 | 0 | 1; }

// One fixed tick. maxRise = how far the ground in a 9x9 tile window rises above the focus (units, >= 0), sampled by the caller.
function tick(c: OrbitCam, player: { x: number; z: number }, input: Input, maxRise: number): void {
  const gx = player.x - c.focusX;
  const gz = player.z - c.focusZ;
  if (Math.abs(gx) > TUNE.snapGap || Math.abs(gz) > TUNE.snapGap) {
    c.focusX = player.x;
    c.focusZ = player.z;
  } else {
    c.focusX += gx / TUNE.followDivisor;
    c.focusZ += gz / TUNE.followDivisor;
  }

  if (input.yaw < 0) c.yawVel += (-TUNE.yawTarget - c.yawVel) / 2;
  else if (input.yaw > 0) c.yawVel += (TUNE.yawTarget - c.yawVel) / 2;
  else c.yawVel /= 2;

  if (input.pitch > 0) c.pitchVel += (TUNE.pitchTarget - c.pitchVel) / 2;
  else if (input.pitch < 0) c.pitchVel += (-TUNE.pitchTarget - c.pitchVel) / 2;
  else c.pitchVel /= 2;

  c.yaw = wrap(c.yaw + c.yawVel / 2);
  c.pitch = clamp(c.pitch + c.pitchVel / 2, TUNE.pitchMin, TUNE.pitchMax);

  const want = clamp((maxRise * 192) / 256, TUNE.pitchMin, TUNE.pitchMax);
  c.terrainPitch += (want - c.terrainPitch) * (want > c.terrainPitch ? TUNE.floorRise : TUNE.floorFall);
}

// Per draw frame: place the camera from the tick state. y-up world units.
function place(c: OrbitCam, groundY: number): { pos: [number, number, number]; aim: [number, number, number] } {
  const pitch = Math.max(c.pitch, c.terrainPitch);
  const dist = TUNE.distBase + TUNE.distPerPitch * pitch;
  const p = toRad(pitch);
  const y = toRad(c.yaw);
  const back = dist * Math.cos(p);   // horizontal distance behind the focus
  const up = dist * Math.sin(p);     // height above the aim point
  const rx = -Math.cos(y);           // screen-right vector (ADDED shoulder uses it)
  const rz = -Math.sin(y);
  const s = TUNE.shoulder;
  const aimY = groundY + 50;         // donor aims 50 units above the ground under the player
  const aim: [number, number, number] = [c.focusX + s * rx, aimY, c.focusZ + s * rz];
  const pos: [number, number, number] = [
    c.focusX + back * Math.sin(y) + s * rx,
    aimY + up,
    c.focusZ - back * Math.cos(y) + s * rz,
  ];
  return { pos, aim };
}

// Driver: 20 ms ticks with an accumulator, one tick per 20 ms of frame time.
const TICK_MS = 20;
let accMs = 0;
function advance(dtMs: number, runTick: () => void): void {
  accMs += dtMs;
  while (accMs >= TICK_MS) {
    runTick();
    accMs -= TICK_MS;
  }
}
```

## 5. Lands in

- TARGET `src/fight/worldCamera.ts` (proposed name; the Frankendom repo was not opened in this pass). Client-only: the camera is a client module and the engine never reads it. Parity-checklist row 11 (fight camera) is the nearest row; no row covers the world camera, so Lead should decide whether row 11 is the right home for it.
- today: the world camera in Frankendom (not read in this pass).
- Reuse tag: adapt (MIT: code may be adapted; the sketch is clean-room in any case)
- Brief rule served: client-only camera (addendum: camera/HUD/sound are client-only; the engine never reads camera pose); rules 7-9 n/a

## 6. Gaps and risks

- Not an over-the-shoulder view. The aim point is the focus, so the hero sits in the centre of the frame. A shoulder offset must be added (the sketch's `shoulder`, ADDED). This donor does not solve the owner's complaint by itself.
- No wall pull-in. The camera is placed by maths; the only terrain response is the pitch floor, and `roofCheck` changes which level is drawn, not where the camera is. Zone walls will clip. A ray cast from focus to camera with a pull-in is needed and is not in this donor.
- No recentring behind the hero. Yaw changes only on input (3259) and at login (1834). Frankendom will need its own rule (for example, ease yaw toward the hero's facing after a pause); this donor does not show one.
- Truncation. `| 0` in the follow (3236) gives a dead zone of up to 15 units, and yaw velocity stalls at 23 instead of 24 (computed by hand from 3244). The sketch uses floats; a test should show the difference.
- Tick-stepped state. The camera state changes only on the 20 ms tick and placement uses the last tick's focus (read: no interpolation in the camera path). On a high-refresh screen this can judder. Whether the hero entity itself is interpolated per frame was not read. Frankendom should interpolate the focus per frame (not in donor).
- Pitch-axis shake quirk. A pitch shake sets a floor of `amp + 128` (4187-4188) rather than jittering. Do not copy.
- Idle drift. Every 500 ticks the camera drifts by up to 50 or 55 units and 40 angle units (2366-2400) to deter automation. It is a visible wobble with no purpose in a duel; reject for Frankendom.
- Sign of the terrain rise. The code reads `orbitY - groundh` (3282); the fill of `groundh` was not read, so "the ground rises above the focus" is inferred from the sign, not confirmed.
- Server reach. The pose is sent to the server (2175-2178); Frankendom must not let camera pose into hit checks (the rulings already make the camera client-only).
- Scope. No FOV change, zoom or lock-on framing exists in this client (grep: the only zoom words are minimap zoom and item model zoom). Several-enemy framing for many-on-one fights is not in this donor.
- Units. The donor uses 128 units per tile, 2048 per turn, and y-down heights. Frankendom's coordinate convention was not checked; the sketch is y-up.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** No factual errors found. Checked followCamera 3222-3303 (1/16 follow, snap 500, +-24/+-12 velocity targets, halve on release, pitch 128..383, 9x9 window, x192, clamp 32768..98048, rise /24, fall /80), gameDrawMain 4182-4196 (pitch*3+600, -50 aim), camFollow 4432-4465, shake packet mapping 6356-6365 (ran/amp/rate to Axis/Ran/Amp fields is correctly described), idle drift 2366-2400, GameShell 11/158-165/185-195, touch emulation, license MIT. Sketch order and geometry match donor. Only nit: acceptance 'settles over 1.6 s' is a 1/80-per-tick time constant, not full settle.

**Missed:** Terrain-pitch window is skipped entirely (floor stays at minimum 128) when orbit tile is outside 4..99 (3274); groundh level also bumps +1 when MapFlag.VisBelow set (3278). Neither mentioned.
