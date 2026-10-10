# ValveSoftware-halflife (animation-rigs, cell 2)

Donor: `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/GameStudioModelRenderer_Sample.cpp` | Licence: Half-Life 1 SDK LICENSE (Valve; `LICENSE` line 1 "Half Life 1 SDK LICENSE"; line 11 lets you use the SDK free of charge, line 13 "but only for free" for distribution; restricted) | C++ | symbol `StudioProcessGait`

Checked: Read the whole file (992 lines). Live path: `_StudioDrawPlayer` (712-864) calls `StudioProcessGait` when `gaitsequence` is set (742, via 374 `StudioEstimateGait`) and `StudioSetupBones` for every drawn player (781). Off path: `SetupClientAnimation` and `StudioFrameAdvance` run only when `m_bLocal` is true (679), and `m_bLocal` is set to false in the constructor (79); the file's own comment says "The animation code is somewhat broken" (77). So the frame-advance code is not the live path. Not read: `StudioCalcRotations`, `StudioSlerpBones` body (names read as: slerp of two poses by weight `s`, the sketch uses lerp), `StudioEstimateFrame`, `StudioGetAnim`, `StudioCalcAttachments`, `StudioMergeBones`, `StudioSetUpTransform`, `StudioSaveBones`, and where `m_fGaitEstimation` is set (declared in a base header). Model-format meaning of `linearmovement[0]` is not read; the code divides by it. Callers: the gait functions are called only from `_StudioDrawPlayer` in this file. Confidence: high on the blend, gait and cross-fade arithmetic (read in full); medium on the slerp semantics.

Best transferable idea: Drive the walk-cycle phase from distance covered and the strafe pose from the angle between facing and travel (playing the cycle backwards past 120 degrees), then cross-fade the previous clip's frozen last pose out over 0.2 s.
Decision (proposed): adapt - the facing-versus-travel blend and the distance-driven cycle fit a fast duel footwork set (row 6, hero actor/animation), but the donor's time-based fallback, frame-time catch-up and model-format frame units do not; Frankendom takes the shape on a fixed tick with its own clip data.
Acceptance: A player running sideways sees the sideways step pose, running backwards plays the step cycle in reverse, and switching from a swing to idle fades the swing's last pose out over 0.2 s; a client test asserts blend byte 0 at +90 degrees facing offset and 255 at -90 (donor mapping, lines 405-409, clamped), and the cross-fade weight 1 at the switch and 0 at 0.2 s.

## 1. Mechanism

- Per drawn player (`_StudioDrawPlayer`, 712), if `gaitsequence` is set (735), `StudioProcessGait` runs before bone setup (742). Bone setup for players is `StudioSetupBones` (781).
- Gait estimate (`StudioEstimateGait`, 289-351). `dt` is the frame time clamped to 0..1 (294-296). In the origin-difference path (305-316) movement under 5 units per second counts as stationary (310). In the velocity path (317-321), movement is `|velocity| * dt` (319-320). Stationary: the travel yaw is eased toward the facing yaw by `diff * 4dt` when `dt < 0.25`, else `diff * dt` (332-335), and movement is zero (340). Moving: travel yaw is `atan2(vy, vx)` in degrees, clamped to +-180 (344-348).
- Facing versus travel (`StudioProcessGait`, 374-403). `flYaw = entity yaw - travel yaw` wrapped to +-180 (377-388). If it exceeds 120 degrees (392) the travel yaw turns 180 degrees and the movement sign flips (394-395); the same below -120 (398-401). Walking backwards therefore plays the step cycle in reverse rather than turning the body.
- Strafe byte. `blend_yaw = (flYaw / 90) * 128 + 127`, clamped to 0..255 (405-407), then inverted `255 - value` (409) and stored in `blending[0]` (411). Straight ahead (flYaw 0) gives 128.
- Entity yaw is written back as the travel yaw (415-419), so the body turns with the direction of travel.
- Gait cycle. If `linearmovement[0] > 0`, `gaitframe += (movement / linearmovement[0]) * numframes` (427); otherwise it is time-based, `fps * dt * framerate` (431). The frame is wrapped modulo `numframes` and kept non-negative (435-439). The foot cadence follows the ground covered.
- Three-way blend (`StudioSetupBones`, 133-172). A sequence stores three pose blocks, left, middle and right, offset by `numbones` (153, 166). A byte at or below 127 blends left to middle with `s = 2 * byte / 255` (141-148, 163); above 127 blends middle to right with `s = 2 * (byte - 127) / 255` (158-159, 163). The two poses are slerped with `s` (171).
- Cross-fade on a clip switch (180-241). While `sequencetime + 0.2 > clTime` and a previous sequence is latched (180-183), the previous sequence's pose at the latched `prevframe` is built (197-237), and the output pose is the current pose slerped toward it with `s = 1 - (clTime - sequencetime) / 0.2` (240-241). After the window the current frame is latched as `prevframe` (245), which freezes the last frame for the next switch.
- Conversion (249-279). Quaternions and positions become bone matrices, parent-chained from the root. Attachments (789) and the held weapon's bones (851) are handled elsewhere (not read).

## 2. Key functions

- `CGameStudioModelRenderer::StudioSetupBones` (88-281): `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/GameStudioModelRenderer_Sample.cpp` 88-281. Non-players return early (109-113). Players: three-way blend (133-177), cross-fade (180-246), matrix conversion (249-280).
- `StudioEstimateGait` (289-351): same file 289-351. Movement estimate, stationary yaw ease, travel yaw.
- `StudioProcessGait` (359-440): same file 359-440. Facing-versus-travel, reversal, strafe byte, gait cycle. Order of steps as in section 1.
- `StudioFrameAdvance` (522-549) and `SetupClientAnimation` (558-616): local path only, off (see Checked).
- `_StudioDrawPlayer` (712-864): same file 712-864. Calls the gait (742) and bone setup (781).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Blend pose by facing-minus-travel angle, scaled 128 per 90 degrees around a centre of 127, inverted | 128 per 90 degrees and centre 127 (405), inversion 255 (409) |
| Reverse the cycle instead of turning when the angle passes a limit | 120 degrees (390) |
| Cross-fade the old clip's frozen last pose out over a fixed window | 0.2 s (182, 240) |
| Cycle phase = distance / cycle distance x frames | cycle distance is per clip (`linearmovement[0]`, 427); time fallback 431 |
| Stationary heading eases toward facing | 4 x dt under 0.25 s, else dt (332-335) |
| Movement below a speed is treated as stationary | 5 units per second (310), origin-difference path only |
| Frame time clamp | 0..1 s (295-296) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order: the stationary ease or travel heading, the reversal past 120 degrees with its sign flip, the byte mapping and inversion, the distance-driven cycle with wrap, the three-block strafe pick with the same `s`, and the cross-fade weight. It omits: the origin-difference estimate path and its 5 units per second threshold; the entity yaw write-back; the time-based fallback when `linearmovement[0]` is zero (the sketch requires `cycleLen > 0`); quaternion slerp (the sketch uses a per-number lerp); the bone hierarchy and matrices; attachments and the weapon merge; the local-prediction branch (off in this file). The donor does not clamp `s` in the strafe pick (maximum 256/255), and the sketch does not either.

```ts
// Licence: Valve, Half-Life 1 SDK LICENSE (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const CROSSFADE_S = 0.2;        // donor: 0.2 s window between sequences (StudioSetupBones)
const REVERSE_LIMIT_DEG = 120;  // donor: maxyaw = 120.0 (StudioProcessGait)

interface Gait {
  moveYaw: number;     // degrees, direction of travel (donor: gaityaw)
  cycle: number;       // gait frame within the cycle (donor: gaitframe)
  blendByte: number;   // 0..255 strafe selector (donor: blending[0])
}

function wrap180(d: number): number {
  let x = ((d % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

// One tick of the gait. facing and velocity are the entity's; dt is the tick length in seconds.
// cycleLen is the distance per gait cycle (> 0); numFrames is the cycle length in frames.
function updateGait(g: Gait, facing: number, vx: number, vy: number,
                    dt: number, cycleLen: number, numFrames: number): void {
  let move = Math.hypot(vx, vy) * dt;

  if (vx === 0 && vy === 0) {
    // Stationary: ease the travel yaw toward the facing yaw. Factor 4*dt below 0.25 s, else dt.
    let diff = wrap180(facing - g.moveYaw);
    diff *= dt < 0.25 ? dt * 4 : dt;
    g.moveYaw = wrap180(g.moveYaw + diff);
    move = 0;
  } else {
    g.moveYaw = Math.atan2(vy, vx) * 180 / Math.PI;
  }

  let flYaw = wrap180(facing - g.moveYaw);
  // Facing far from travel (over 120 degrees): play the cycle backwards and turn the travel yaw round.
  if (flYaw > REVERSE_LIMIT_DEG) { g.moveYaw -= 180; move = -move; flYaw -= 180; }
  else if (flYaw < -REVERSE_LIMIT_DEG) { g.moveYaw += 180; move = -move; flYaw += 180; }

  // Map -90..+90 degrees onto 0..255 (127 is straight ahead), then invert.
  let b = (flYaw / 90) * 128 + 127;
  b = Math.max(0, Math.min(255, b));
  g.blendByte = Math.trunc(255 - b);

  // Distance-driven cycle: feet advance with ground covered, not with time.
  g.cycle += (move / cycleLen) * numFrames;
  g.cycle -= Math.trunc(g.cycle / numFrames) * numFrames;
  if (g.cycle < 0) g.cycle += numFrames;
}

type Pose = number[];

function lerpPose(a: Pose, b: Pose, s: number): Pose {
  return a.map((v, i) => v + (b[i] - v) * s);
}

// Pick the strafe pose from three stored blocks (left, middle, right) by the blend byte.
// Donor does not clamp s; its maximum is 256/255, a slight extrapolation at byte 255.
function blendPose(byte: number, left: Pose, mid: Pose, right: Pose): Pose {
  if (byte <= 127) return lerpPose(left, mid, (byte * 2) / 255);
  return lerpPose(mid, right, (2 * (byte - 127)) / 255);
}

// Cross-fade weight on the previous clip: 1 at the switch, 0 after 0.2 s.
function prevClipWeight(now: number, switchedAt: number): number {
  return now - switchedAt < CROSSFADE_S ? 1 - (now - switchedAt) / CROSSFADE_S : 0;
}

// Demo: walk forward, then turn to face sideways and run a tick.
const g: Gait = { moveYaw: 0, cycle: 0, blendByte: 0 };
updateGait(g, 0, 4, 0, 0.02, 16, 64);
updateGait(g, 90, 4, 0, 0.02, 16, 64);
const pose = blendPose(g.blendByte, [0, 0], [1, 1], [2, 2]);
const w = prevClipWeight(0.1, 0);

export {};
```

## 5. Lands in

- TARGET `src/fight/footwork.ts` (new client module: travel-versus-facing blend, distance-driven cycle, clip cross-fade). Parity-checklist row 6 (hero actor/animation).
- today: the hero's motion is not in `src/fight/footwork.ts`; this note does not read Frankendom's hero code.
- Reuse tag: rewrite-from-idea (Valve SDK licence: restricted; clean-room, shape only, no translation)
- Brief rule served: 1 (one engine: footwork is cosmetic and client-only; hits and kills stay with the server); rule 6 (zones as data: cycle distance and blend curves are clip data, not constants in the function).

## 6. Gaps and risks

- The sample's local-prediction path is off (79, 679) and its own comment calls it broken (77). Do not port `SetupClientAnimation` or `StudioFrameAdvance` as the hero's live animation.
- The time-based fallback (431) and the `dt` in the catch-up (332-335) make the animation frame-time dependent. Frankendom should advance footwork on the fixed tick or from distance only.
- The catch-up factor jumps at `dt = 0.25`: just under it the factor is about 1 (a near full snap), at or over it the factor is 0.25 (333 vs 335). This only shows at frame times over 0.25 s, but a fixed tick removes it.
- The strafe selector uses entity yaw against travel yaw (377). In a duel the facing is the lock-on target, so the donor's rule transfers only if the facing input is the target direction. The camera is not an input here.
- The 120-degree reversal (392) is a rule about walking backwards. Frankendom's backstep and dodge are actions, so they need their own state, not a blend byte.
- The cross-fade freezes the last frame of the old clip (245). Attack-to-idle in a duel must freeze the swing's last pose the same way, or the pose pops.
- The model-format meaning of `linearmovement[0]` and the 256-unit frame range were not read; the donor's clip format does not carry over, so Frankendom's clip data needs its own cycle-distance field.
- The sample is client-only. Footwork does not decide hit timing, so it must not feed kill or damage checks (server-verified kills stay with the server).
