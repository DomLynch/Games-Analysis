# dhewm-dhewm3 (animation-rigs, cell 3)

Donor: /mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/IK.cpp | Licence: GPL-3 | C++ | symbol idIK_Walk.Evaluate / idIK::SolveTwoBones

## 1. Mechanism
- Donor: Doom 3 (dhewm3 port) procedural inverse kinematics on animated characters. idIK is the base; idIK_Walk drives legs and waist from floor traces; idIK_Reach drives an arm toward a target.
- Walk evaluate (idIK_Walk::Evaluate, 566-775) returns unless the entity exists, the game frame is new, and at least one leg is enabled.
- Per frame: it builds the animator frame without joint mods, reads each foot joint, and takes the lowest foot as the candidate pivot. Only when usePivot is set (default off, Init 544), the pivot foot is re-chosen if the lowest foot changed or the body yaw moved more than 30 degrees from the stored pivot yaw (612), and the pivot foot is pinned to its stored position (620).
- Each enabled foot clip-traces a small foot-shaped box from footUpTrace above to footDownTrace below the foot (both default 32, Init 541-542) along the gravity axis against solid and IK-clip contents (630-633). Only if the character has ground contacts and the leg is enabled is the ankle shifted by floor height minus model height plus footShift; otherwise shift is 0. The shifted ankle height is smoothed against last frame's (shift -= smoothing * step, default 0.75) unless the old heights are invalid or the character stands on a plat (659-692).
- The waist offset is the smallest leg shift plus waistShift. If minWaistFloorDist is set and the offset is downward, a trace keeps the waist at least that far above the floor; if minWaistAnkleDist is set, it is kept at least that far above the highest ankle; then the waist height is smoothed with waistSmoothing (697-727). Both minimums default to 0 (Init 539-540), so they are off unless the entity def sets them.
- For each leg, SolveTwoBones (185-210) finds the knee from the hip (waist-shifted) and the shifted ankle, using upper and lower leg lengths measured in Init (527, 531) and the knee forward direction as the bend pole. Hip and knee axes come from GetBoneAxis (217-225), then are converted by per-leg joint-offset matrices. The return value of SolveTwoBones is ignored (747).
- Output (766-774): world-override joint modifiers: waist axis and position, and axis only for hip, knee and ankle (ankle axis is the base animation's; the ankle position is never written). They apply when the animator next builds its frame, and ik_activate is set. The first call after enable only primes the old heights and returns (729-732).

## 2. Key functions
- idIK::SolveTwoBones | /mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/IK.cpp | 185-210 | two-bone solve: knee position from start, end, pole direction and two lengths; out of reach returns the midpoint and false.
- idIK::GetBoneAxis | /mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/IK.cpp | 217-225 | builds the bone's frame (along the bone, pole direction orthogonalised, and cross) and returns its length.
- idIK_Walk::Evaluate | /mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/IK.cpp | 566-775 | the full walk cycle: optional pivot foot, floor traces, ankle and waist smoothing, leg solve, joint mods.
- idIK_Walk::ClearJointMods | /mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/IK.cpp | 782-798 | resets the waist, hip, knee and ankle joint overrides to none and clears the active flag (only if active).
- idIK_Walk::Init | /mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/IK.cpp | 426-559 | reads joint names and tuning keys (ik_smoothing, ik_footUpTrace, ik_usePivot and others) from the entity's spawn args, measures leg lengths, and builds the foot clip model (lines 440-559 read; lines 426-439 are locals).

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Two-bone IK: knee on a circle, bent by a pole direction, midpoint when out of reach | Thigh and shin lengths per leg (theirs, from the rig) |
| Floor-trace foot placement with a ground offset | footUpTrace and footDownTrace 32, footShift 0 (theirs, defaults at Init 537, 541-542, overridable per entity) |
| Optional pivot foot held for a body that does not turn much | Pivot yaw change limit 30 degrees (theirs, 612) |
| Ankle and waist height smoothed against last frame | smoothing and waistSmoothing 0.75 (theirs, Init 535-536) |
| Minimum waist distance above floor and ankles | minWaistFloorDist and minWaistAnkleDist, default 0 (theirs, Init 539-540) |

## 4. TypeScript sketch
simplified: only the two-bone solve (SolveTwoBones 185-210) is sketched; the walk cycle (pivot, floor traces, smoothing, waist, GetBoneAxis) is omitted. Two deliberate differences from the donor: the sketch also fails on zero length, and clamps y to 0 before sqrt; the donor does neither.

```ts
// Licence: GPL-3 | clean-room: written from the mechanism, no donor lines.
// Two-bone IK. Given the hip and ankle positions and the two bone lengths, find the knee.
// The knee sits on the circle of the thigh length around the hip, bent toward a pole direction.
// Out of reach: the knee goes to the midpoint and the call reports failure.
type V3 = [number, number, number];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3): number => Math.sqrt(dot(a, a));
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

function solveTwoBones(start: V3, end: V3, pole: V3, len0: number, len1: number): { joint: V3; ok: boolean } {
  const v = sub(end, start);
  const L = len(v);
  const mid: V3 = [start[0] + v[0] / 2, start[1] + v[1] / 2, start[2] + v[2] / 2];
  if (L > len0 + len1 || L < Math.abs(len0 - len1) || L === 0) return { joint: mid, ok: false };
  const u: V3 = [v[0] / L, v[1] / L, v[2] / L];
  const pd = dot(pole, u);
  const perp: V3 = [pole[0] - u[0] * pd, pole[1] - u[1] * pd, pole[2] - u[2] * pd];
  const pl = len(perp) || 1;
  const w: V3 = [perp[0] / pl, perp[1] / pl, perp[2] / pl];
  const x = (L * L + len0 * len0 - len1 * len1) / (2 * L);   // distance along the hip-to-ankle line
  const y = Math.sqrt(Math.max(0, len0 * len0 - x * x));      // height off that line, toward the pole
  return {
    joint: [start[0] + x * u[0] + y * w[0], start[1] + x * u[1] + y * w[1], start[2] + x * u[2] + y * w[2]],
    ok: true,
  };
}
```

## 5. Lands in
- Frankendom file: TARGET src/fight/ik.ts (new module; the fight-client rig, hero first).
- Parity-checklist row: 6 (hero actor and animations, src/fight; K3). Creatures reuse the same solve under row 7 if the rig needs foot placement.
- Today (per the parity checklist, not re-checked): src/fight on trunk 9f4937e38 holds characters.ts and index.ts only; row 6 is K3, live in J4a.
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- Foot IK traces the world each frame. If Pit and Zone 1 both run it, it costs twice and it must never feed the engine's hit or stance state (rule 1: one core, two clients).
- The donor's walk cycle uses Doom 3's entity model and gravity axis. Frankendom's rig and its ground rule need to be stated before it is ported.
- The donor's idIK_Reach (arm to target) is not covered here; only Evaluate, SolveTwoBones, GetBoneAxis, ClearJointMods and Init (440-559) were read. EnableAll/DisableAll (805-818) reset the smoothing state; the sketch has no state.
- Symbol note (re-opened): idIK_Walk::Evaluate is at 566-775; idIK::SolveTwoBones is at 185-210.
- GPL-3: mechanism only, no lines copied. The sketch uses only the two-bone solve, not the walk cycle.
