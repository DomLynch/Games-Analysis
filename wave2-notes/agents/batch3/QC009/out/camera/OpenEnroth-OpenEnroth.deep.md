# OpenEnroth-OpenEnroth (camera, cell 14)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Camera.cpp` (placement: `Engine::drawWorld`, `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Engine.cpp` 137-145) | Licence: LGPL-3.0 ("GNU LESSER GENERAL PUBLIC LICENSE, Version 3, 29 June 2007", LICENSE file at the repo root; Camera.cpp has no per-file licence header) | C++ | symbol `Camera3D::CalculateRotations`

Checked: Read in full: `src/Engine/Graphics/Camera.h` (101 lines), the placement block in `Engine::drawWorld` (Engine.cpp 137-145), `Camera3D::CalculateRotations` (Camera.cpp 308-318), `Project` and `FitToViewport` (282-306), `CreateViewMatrixAndProjectionScale` (105-135), `BuildViewFrustum` (138-169, read to the last plane). Read in part: Camera.cpp 1-200 (the top of the file and frustum culling, not the rig); 201-281 not read. Party-side control read: Indoor.cpp 1380-1420 (turn) and 1455-1478 (look, centre), Outdoor.cpp 1150-1180 (look) and 985-1040 (turn, grep for the rest), Party.h 281-294, Party.cpp 64-68, GameConfig.h 223, 431-432, 634-638, Duration.h 28, Spells.cpp 845-862 (armageddon), Actor.cpp 2450-2476 (caller), CastSpellInfo.cpp 2900 (cast). Candidates opened and set aside: `EngineController.cpp` 335-372 (teleport only, no mouse look), Engine.cpp hint file as the main camera (it is the call site). Not read: OpenGL pitch projection math (OpenGLRenderer.cpp 640-670, 1385-1420, found by grep only), the `randomInSegment` range semantics (assumed -8..8 from the comments), the full outdoor turn body. No mouse-look path was found: the only yaw and pitch writes are party keyboard actions, teleports and the armageddon effect. Confidence: medium-high on the rig (read end to end); the camera is first-person, so the third-person transfer is shape only. Camera scope: world camera (first-person exploration in open outdoor and indoor maps; not a fixed arena).

## 1. Mechanism

- Each draw, `Engine::drawWorld` copies the party's yaw and pitch straight into the camera (Engine.cpp 137-138; no smoothing or lag). It puts the camera at the party position minus `_yawGranularity` (25 units) along the yaw direction (139-140), at party z plus `eyeLevel` (141; default 160 from the config, Party.h 281 comment). It then calls `CalculateRotations` (143), `CreateViewMatrixAndProjectionScale` (144) and `BuildViewFrustum` (145).
- `CalculateRotations` (Camera.cpp 308-318) negates pitch (310), stores yaw (311) and takes the sine and cosine of both on a 2048-unit circle (313-317).
- `CreateViewMatrixAndProjectionScale` (105-135) builds the view matrix from the yaw and pitch rotations, takes the half FOV tangent from 75 degrees outdoors or 60 indoors (122; Camera.h 77 and 79), and sets the view plane distance from the viewport width (126). `Project` (283) divides by depth x to get the screen position, with x as the depth axis.
- Turning is party input and is time-based by default. The indoor path computes `rotation` from game ticks x `_yawRotationSpeed` (90 deg/s, Party.cpp 68) per real second of 128 ticks (Indoor.cpp 1389; Duration.h 28). With `TurnSpeed` at 0 (default, GameConfig.h 634) the yaw moves by `rotation * fTurnSpeedMultiplier` (1399); a fast turn is twice that (1412). If `TurnSpeed` is above 0, each queued action moves yaw by a fixed number of units (1396-1402). That fixed path is frame-rate dependent. The outdoor turn uses the same rate (Outdoor.cpp 990) and the same fixed fallback (1021).
- Look is discrete. Each look-up or look-down action changes pitch by `VerticalTurnSpeed` (25 units, GameConfig.h 638; Indoor.cpp 1459) and clamps to plus or minus 128 units (1460; Outdoor.cpp 1168-1169). Centre view sets pitch to 0 (Indoor.cpp 1475; Outdoor.cpp 1164). 128 units of 2048 is 22.5 degrees.
- Armageddon (outdoor only): the spell sets a 256-tick timer (CastSpellInfo.cpp 2900). `armageddonProgress` (Spells.cpp 847), called from `Actor::UpdateActorAI` (Actor.cpp 2473-2474), adds a random yaw and pitch nudge each update (859-860; pitch clamped to plus or minus 128), and counts the timer down by game time (861). The nudge writes `pParty->_viewYaw` itself, not a camera variable. Walking uses that same yaw (Indoor.cpp 1435), so the effect changes where the party moves.

## 2. Key functions

- Camera rig placement: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Engine.cpp` 137-145.
- `Camera3D::CalculateRotations`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Camera.cpp` 308-318.
- `Camera3D::CreateViewMatrixAndProjectionScale`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Camera.cpp` 105-135.
- `Camera3D::BuildViewFrustum`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Camera.cpp` 138-169.
- Indoor turn and look: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Indoor.cpp` 1389-1475.
- Outdoor turn and look: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Outdoor.cpp` 990, 1021, 1164-1169.
- Armageddon jitter: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Spells/Spells.cpp` 847-861.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Rig a fixed distance behind the hero along facing, at eye height | back offset 25 units (theirs, Party.cpp 66); eye level 160 (theirs, GameConfig.h 223) |
| Turn at a rate in real time | 90 deg/s (theirs, Party.cpp 68); 128 ticks per real second (theirs, Duration.h 28) |
| Discrete turn fallback (frame-rate dependent) | `turn_speed` default 0 (theirs, GameConfig.h 634): 0 means use the rate |
| Look in fixed steps, clamp | 25 units per step (theirs, GameConfig.h 638); clamp plus or minus 128 units (Indoor.cpp 1460; Outdoor.cpp 1169) |
| Centre the view | pitch to 0 (Indoor.cpp 1475) |
| Projection | FOV 75 outdoors, 60 indoors (Camera.h 77, 79); near clip 32 (GameConfig.h 432), far clip 16192 (GameConfig.h 431) |
| Timed screen jitter, decaying | nudge plus or minus 8 units per update (Spells.cpp 859-860); timer 256 ticks (CastSpellInfo.cpp 2900); the donor has a TODO guard at 417 ticks (Spells.cpp 850-853) |

## 4. TypeScript sketch

simplified: The sketch keeps the rig shape: placement from party position, yaw, pitch and eye height; a time-based turn with the discrete fallback; fixed look steps with a clamp; and the jitter as a separate function that shows what the donor does. It works in degrees, not the donor's 2048-unit circle, and replaces the donor's bit-mask wrap with modulo 360. It omits the view matrix and frustum, the projection and FOV, the near and far clip, the BLV and ODM split, the walking code, the teleport conversion (512 units per 90 degrees), the OpenGL pitch use, the armageddon timer and outdoor-only condition, and any collision. The random range of the donor's `randomInSegment(-8, 8)` was not read; the sketch assumes -8 to 8 inclusive.

```ts
// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface RigTuning {
  backOffset: number;     // world units behind the hero along facing (donor: _yawGranularity = 25)
  eyeHeight: number;      // world units above the hero's base (donor: eyeLevel, config default 160)
  turnDegPerSec: number;  // continuous turn rate (donor: _yawRotationSpeed = 90 deg/s)
  turnStepDeg: number;    // if > 0, a fixed step per input instead of a rate (donor: TurnSpeed setting, default 0)
  pitchStepDeg: number;   // fixed look step per input (donor: VerticalTurnSpeed = 25 units)
  pitchMaxDeg: number;    // look clamp (donor: 128 units of 2048 per turn = 22.5 deg)
}

interface Rig { yawDeg: number; pitchDeg: number; }
interface Hero { x: number; y: number; z: number; }
interface View { x: number; y: number; z: number; yawDeg: number; pitchDeg: number; }

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Turn input is -1, 0 or +1. Time-based unless a step is configured (donor Indoor.cpp 1396-1419).
function turn(rig: Rig, input: number, dtSec: number, t: RigTuning): void {
  if (input === 0) return;
  rig.yawDeg += t.turnStepDeg > 0 ? input * t.turnStepDeg : input * t.turnDegPerSec * dtSec;
  rig.yawDeg = ((rig.yawDeg % 360) + 360) % 360;
}

// Look input is -1, 0 or +1: one fixed step per input, then clamp (donor Indoor.cpp 1459-1469).
function look(rig: Rig, input: number, t: RigTuning): void {
  rig.pitchDeg = clamp(rig.pitchDeg + input * t.pitchStepDeg, -t.pitchMaxDeg, t.pitchMaxDeg);
}

// Camera rig: fixed offset behind the hero along facing, at eye height (donor Engine.cpp 137-143).
function placeView(hero: Hero, rig: Rig, t: RigTuning): View {
  const rad = (rig.yawDeg * Math.PI) / 180;
  return {
    x: hero.x - t.backOffset * Math.cos(rad),
    y: hero.y - t.backOffset * Math.sin(rad),
    z: hero.z + t.eyeHeight,
    yawDeg: rig.yawDeg,
    pitchDeg: rig.pitchDeg,
  };
}

// Armageddon-style jitter (donor Spells.cpp 859-861). The donor writes the party's own yaw and
// pitch, so it changes facing and movement. Shown here only to make that point; keep camera shake
// client-side in Frankendom. Donor randomInSegment(-8, 8) range semantics were not read.
function jitterRig(rig: Rig, rnd: () => number, t: RigTuning): void {
  const units = (): number => Math.floor(rnd() * 17) - 8;
  rig.yawDeg = ((rig.yawDeg + units() * (360 / 2048)) % 360 + 360) % 360;
  rig.pitchDeg = clamp(rig.pitchDeg + units() * (360 / 2048), -t.pitchMaxDeg, t.pitchMaxDeg);
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/QC009-openenroth-camera.ts, exit 0.

Best transferable idea: A camera rig that sits a fixed distance behind the hero along the facing at eye height, turns at a set rate per real second, and clamps look-up to about 22 degrees.
Decision (proposed): adapt - take the fixed back offset at eye height, the per-second turn rate with a fixed-step fallback, and the look clamp, because they are the rig shape a third-person follow camera needs; reject the Armageddon-style jitter as written, because it writes the party's real facing and so changes movement, and Frankendom's camera shake must stay client-side.
Acceptance: Client test: holding turn for 1 s changes the view yaw by 90 degrees, look-up stops at 22.5 degrees, and the view stays 25 units behind the hero at eye height; a server test asserts that a camera shake leaves the hero's facing and position unchanged.

Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only; shape and numbers as design data, no line translation)
Brief rule served: client-only camera (ruling); rules 7-9 n/a. Camera scope: world camera.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only rig: offset, eye height, turn rate, look clamp; the engine never reads it).
- Parity-checklist row 11 (fight camera). The addendum has no row for the world camera; flag for Lead (same gap as hedgewars-hw).
- Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only).
- Brief rule served: client-only camera (ruling); rules 7-9 n/a.

## 6. Gaps and risks

- LGPL-3.0 (copyleft class). Clean-room only: the sketch is written from the mechanism; the numbers are design data.
- First-person, not third-person. The 25-unit back offset keeps the camera almost on the hero's head. A third-person follow needs a much larger offset, a pitch model with pull-in, and a smoothing step. The donor has none of those. What transfers: the offset-at-eye-height shape, the time-based turn rate, and the look clamp.
- No smoothing or lag. The camera copies party yaw and pitch every draw (Engine.cpp 137-138), so there is no follow, no damping and no frame-rate independent smoothing. Frankendom needs its own.
- No collision in the rig. The placement (Engine.cpp 139-141) does not test walls, and I found no camera-collision code in the files I read. A 3D third-person camera needs wall pull-in.
- Mixed turn paths. A non-zero `turn_speed` makes turning a fixed step per input (Indoor.cpp 1396-1402; Outdoor.cpp 1021), which depends on frame rate. Frankendom should use the time-based path only.
- The jitter changes gameplay state. Armageddon writes party yaw and pitch (Spells.cpp 859-860) and walking uses that yaw (Indoor.cpp 1435). Do not port this into the camera. It belongs, if anywhere, in an explicit server effect with its own ledger entry.
- No mouse look. The yaw and pitch writes are keyboard actions, teleports and the armageddon effect. The owner's input-versus-auto-follow blend is not in this donor.
- Not read: the OpenGL pitch projection (grep only), the `randomInSegment` range semantics, and the full outdoor turn body. The donor's 417-tick guard in armageddon is marked TODO (Spells.cpp 850-853) and was not analysed.
