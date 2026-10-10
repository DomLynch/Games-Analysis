# crossuo-crossuo (camera, cell 14)

Donor: `/mnt/frankendom-donors/crossuo-crossuo/src/ScreenStages/GameScreen.cpp` (camera) with the step animation in `/mnt/frankendom-donors/crossuo-crossuo/src/GameObjects/GameCharacter.cpp` | Licence: AGPL-3.0 (top-level `LICENSE`, GNU Affero v3); per-file SPDX headers are mixed (GameScreen.cpp says MIT, GameWorld.cpp says AGPL-3.0-or-later), so treated as copyleft: clean-room, shape only | C++ | symbol `CGameScreen::CalculateGameWindowBounds`

Checked: camera_scope: world camera (2D isometric open-world follow; a fragment only, see section 6). Read: `CalculateGameWindowBounds` (GameScreen.cpp 1059-1241; read 1059-1115 and 1190-1225, not read 1116-1189 and 1226-1240), `UpdateAnimationInfo_ProcessSteps` (GameCharacter.cpp 1290-1476, read in full), `CWalkData::GetOffset` (WalkData.cpp 7-70), `CApplication::OnMainLoop` (Application.cpp 12-20), `CApplication::Run` (Wisp/WispApplication.cpp 35-61), `CWeather::Earthquake` (Weather.cpp 325-328). Read in part: `CGame::Process` (CrossUO.cpp 928-1040, only the animation and bounds calls). Not read: the sprite draw path beyond GameCharacter.cpp:126 and GameScreen.cpp:444/1340; the walk queue that fills `m_Steps`; the inactive-window frame delay. Confidence: high on the camera formula and the step interpolation (both read end to end); medium on the claim that the player sprite stays on the screen centre (derived from the centre arithmetic, not traced through the draw path).

## 1. Mechanism

- There is no camera object. Each rendered frame, `CalculateGameWindowBounds` builds the view from three terms: the window centre, the player's sprite offset, and the player's logical tile. Order of steps (GameScreen.cpp): (a) centre = window centre plus height lift, `GetZ() * 4` (1084-1088); (b) if the earthquake timer is running, add a random jitter to centre X and Y each frame, 0..2 px for the one quake the donor calls (1090-1093); (c) subtract the player's sprite offset from centre X, and `OffsetY - OffsetZ` from centre Y (1096-1097); (d) world draw offset = tile position in pixels minus centre, with the isometric factor 22 (1099-1102). Steps (a) to (d) are the donor's order.
- Net effect (derived from (c) and (d); the sprite draw adds `OffsetX` back at GameCharacter.cpp 126, and the player circle at GameScreen.cpp 1340 does the same): the player sprite stays on the screen centre while the world slides under it during a step. The camera therefore follows the interpolated visual position, not the logical tile.
- Visual position comes from a per-mobile walk queue. The front step is animated in `UpdateAnimationInfo_ProcessSteps`:
  - Step length `maxDelay` = walk speed minus 15 ms (1337). Walk speed from `GetWalkSpeed` (PathFinder.cpp 562-570), a 2x2 table of walk/run and mounted (values Constants.h 122-128, table 138-140).
  - `delay` = ms since `LastStepTime` (1339). If `delay < maxDelay`, the offset is computed (1371-1377): `x = delay / scale`, `steps = maxDelay / scale`, `OffsetZ = dz * x * 4 / steps` (height lerp), and `GetOffset` gives the x/y pixel offset (22 px per tile on the cardinal axes, 44 px on diagonals, both divided by `steps`).
  - When `delay >= maxDelay` (1340), the step is removed (1390): the logical tile `m_X/m_Y/m_Z` jumps to the step's target (1434), draw coordinates are refreshed (1443), offsets reset to 0 (1447), and `LastStepTime = g_Ticks` (1466).
  - Two cases snap with no glide (read, 1347-1386 and the `else` branch): a same-tile step (direction change) is removed at once, and a step that is not a valid one-tile move is removed at once.
- Order per frame (read): `CApplication::OnMainLoop` sets `g_Ticks = SDL_GetTicks()` then calls `CGame::Process(true)` (Application.cpp 15-19). `CGame::Process` runs `g_World->ProcessAnimation()` (CrossUO.cpp 983), which advances every mobile's step queue (GameWorld.cpp 91-104), then calls `CalculateGameWindowBounds` for the rendered frame (CrossUO.cpp 1033-1034). `CApplication::Run` loops `while (!quit)`, calls `OnMainLoop`, then sleeps `max(render delay minus frame time, CPU delay)` (WispApplication.cpp 35-61). The active render delay is 30 ms (Constants.h 38). So time is wall clock sampled once per loop, the offset is a function of elapsed time (no accumulator), and the sleep is a frame cap.
- Shake: a server weather event (case 4) calls `Earthquake(3, 1)` (PacketManager.cpp 2297). That sets `EarthquakeTimer = g_Ticks + duration * 1000` and the magnitude (Weather.cpp 327-328). While the timer runs, every rendered frame adds `RandomInt(magnitude * 3)` to the centre X and Y (GameScreen.cpp 1090-1093). `RandomInt(n)` is `rand() % n` (Misc.h 32). So the jitter is one-sided (0..2 px), does not decay, and moves the whole world including the player.

## 2. Key functions

- `CGameScreen::CalculateGameWindowBounds`: `/mnt/frankendom-donors/crossuo-crossuo/src/ScreenStages/GameScreen.cpp` 1059-1241 (read 1059-1115 and 1190-1225). Centre, lift, shake, player offset, world offset (1084-1102).
- `CGameCharacter::UpdateAnimationInfo_ProcessSteps`: `/mnt/frankendom-donors/crossuo-crossuo/src/GameObjects/GameCharacter.cpp` 1313-1476. Step length, progress, height and tile offset, step removal and logical tile update (1337-1466).
- `CWalkData::GetOffset`: `/mnt/frankendom-donors/crossuo-crossuo/src/Walker/WalkData.cpp` 7-70. Per-direction pixel offset: cardinal `22/steps`, diagonal `44/steps` (9-10), applied per axis (19 and onward).
- `CApplication::OnMainLoop` and `CApplication::Run`: `/mnt/frankendom-donors/crossuo-crossuo/src/Application.cpp` 12-20 and `/mnt/frankendom-donors/crossuo-crossuo/src/Wisp/WispApplication.cpp` 35-61. Wall-clock tick and frame-capped loop.
- `CWeather::Earthquake`: `/mnt/frankendom-donors/crossuo-crossuo/src/Weather.cpp` 325-328. Sets the timer and magnitude.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Camera target = visual position = logical tile + (fraction of step walked) x (next tile minus logical tile); logical tile changes only when the step ends | Walk step 400 ms, run 200 ms, mounted walk 200 ms, mounted run 100 ms (theirs, Constants.h 122-128); step length = walk delay minus 15 ms (theirs, GameCharacter.cpp 1337) |
| Progress fraction = elapsed / step length (wall clock), with the delay scale cancelling out of the pixels | Delay scale 100 or 70 (theirs, Constants.h 69-70, set per frame in GameWorld.cpp 96); global default 80 (Globals.cpp 122) is overwritten each frame |
| Pixel shift per tile: 22 px cardinal, 44 px diagonal (iso projection) | 22 and 44 (theirs, WalkData.cpp 9-10). Not a 3D value. |
| Height lift of the camera per height unit | 4 px per z (theirs, GameScreen.cpp 1088; GameCharacter.cpp 1375) |
| Timed shake: magnitude x 3 span, for a set duration, from an event | Duration 3 s, magnitude 1 (theirs, PacketManager.cpp 2297); span `rand() % (3 x magnitude)`, one-sided (Misc.h 32; GameScreen.cpp 1092) |
| Frame cap: sleep the rest of the frame budget | 30 ms active render delay (theirs, Constants.h 38) |

Arithmetic check (read): `x = delay / s` and `steps = maxDelay / s`, so `22 * x / steps = 22 * delay / maxDelay`. The scale `s` cancels, so the pixel offset depends only on elapsed time over step length.

## 4. TypeScript sketch

simplified: world units, not pixels, and no isometric projection. It clamps progress at 1 so the camera lands exactly on the new tile, where the donor removes the step on the next frame (a one-frame snap the sketch does not reproduce). It changes the donor's one-sided shake (`rand() % n`) to a centred one, and passes the shake window in explicitly instead of the global timer. It omits the diagonal factor, the direction table in `GetOffset`, the same-tile and bad-step snaps, the step queue, the bounds clamp, the 'Ouch' text, and the sound. The lift is a plain per-height factor.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Step { fromX: number; fromY: number; fromZ: number; toX: number; toY: number; toZ: number; startMs: number; walkMs: number; }
interface Pos { x: number; y: number; z: number; }
interface Shake { untilMs: number; magnitude: number; }

const STEP_MARGIN_MS = 15;   // donor: step length = walk delay - 15 ms
const LIFT_PER_Z = 4;        // donor: camera centre moves 4 px per height unit
const SHAKE_PER_MAG = 3;     // donor: jitter span is magnitude * 3 px per axis

// Visual position of the followed character: logical tile plus the fraction of the step already walked.
function visualPos(step: Step | null, nowMs: number, rest: Pos): Pos {
  if (step === null) return rest;
  const span = Math.max(1, step.walkMs - STEP_MARGIN_MS);
  const t = Math.min(1, Math.max(0, (nowMs - step.startMs) / span));
  return {
    x: step.fromX + (step.toX - step.fromX) * t,
    y: step.fromY + (step.toY - step.fromY) * t,
    z: step.fromZ + (step.toZ - step.fromZ) * t,
  };
}

// Camera target for one frame: follow the visual position, lift with height, then add shake while it lasts.
function cameraTarget(step: Step | null, nowMs: number, rest: Pos, shake: Shake | null, rand: () => number): Pos {
  const p = visualPos(step, nowMs, rest);
  const cam: Pos = { x: p.x, y: p.y, z: p.z * LIFT_PER_Z };
  if (shake !== null && nowMs < shake.untilMs) {
    const span = shake.magnitude * SHAKE_PER_MAG;
    cam.x += (rand() * 2 - 1) * span;
    cam.y += (rand() * 2 - 1) * span;
  }
  return cam;
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (new client-only module; the engine never reads it; name proposed, not checked against the repo). Parity-checklist row 11 (fight camera). The same rule applies to the world camera: it is client-side only.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room, shape only)
- Brief rule served: camera is client-only (one engine; the camera reads the engine's state, never writes it); row 11

Best transferable idea: Drive the world camera from the character's visual position (logical tile plus the fraction of the walk step already done), so it glides with the walk and does not snap at tile boundaries, and lift it by a fixed amount per height unit.
Decision (proposed): adapt — Frankendom's over-the-shoulder world camera should follow the hero's interpolated position and lift with height; the 2D projection, the 22/44 px constants and the one-sided shake do not transfer.
Acceptance: client test: in a zone a one-tile hero step moves the camera target across the step duration with no jump at the tile boundary (per-frame change no larger than the hero's per-frame visual change plus one frame), and a raised tile lifts the target by the zone's lift value per height unit.

## 6. Gaps and risks

- 2D isometric donor: it has no shoulder offset, no pitch or yaw, no collision pull-in, no lock-on or many-enemy framing, no FOV or zoom change, no recentring, and no input-vs-auto-follow blend. Only the follow-the-visual-position rule and the height lift transfer to a 3D third-person camera. The 22 and 44 px constants and the tile-to-pixel projection do not.
- The donor snaps the logical tile at step end: `m_X` changes on the frame the step is removed (1434), after the last offset was computed one frame earlier (inferred from the order at 1340 and 1390; not measured). A small one-frame jump of up to one frame of travel is possible. Frankendom should avoid this by holding the visual position until the next step begins.
- Shake is one-sided (`rand() % 3` for magnitude 1), constant, and never decays. Do not copy it; use a centred, decaying offset with the duration and magnitude as zone data (the event sets them, so `where` is zone data).
- The donor's tunables are client values (camera is client-only), not engine constants. Only the step rule is fixed.
- Licence: AGPL-3.0 (copyleft). Clean-room, shape only; nothing above is a line-by-line translation.
- Frankendom's current world camera: not read on the Frankendom side, so it is not known whether it already follows the visual or the logical position (not read). The Pit camera is frozen and tuned; this mechanism is a world-camera candidate only.
