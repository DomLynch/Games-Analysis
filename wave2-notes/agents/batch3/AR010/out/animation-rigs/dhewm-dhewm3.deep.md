# dhewm-dhewm3 (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/IK.cpp` | Licence: GPL-3.0-or-later (file header, lines 9-10) plus id Software's additional terms (header line 22); copyleft, clean-room only | C++ | symbol `idIK_Walk::Evaluate`

Checked: Read `IK.cpp` in full (1130 lines). Walk path read end to end: `idIK::SolveTwoBones` 185-210, `idIK_Walk::Init` 426-559, `idIK_Walk::Evaluate` 566-775, `ClearJointMods` 782-798, `EnableAll`/`DisableAll` 805-818. The reach controller `idIK_Reach::Evaluate` 1054-1109 was read too, but no caller exists: a grep of the donor finds `idIK_Reach` only in `IK.h` and `IK.cpp`. Callers read: `d3xp/Actor.cpp` 549 and 1721-1738, `d3xp/ai/AI.cpp` 5017, `d3xp/Player.cpp` 9333 (call line only), `d3xp/Entity.cpp` 2638 (call line only). Not read: what sets `gameLocal.isNewFrame` (only the field at `Game_local.cpp` 278 was seen), what the trace returns on a miss, the animator's joint-mod application, and whether gameplay code reads posed joints. Confidence: high on the walk solver order and its numbers. The 60 Hz figure is the usercmd constant (`UsercmdGen.h` 40), not a measured game-frame rate. camera_scope: not applicable (animation cell).

## 1. Mechanism

Walk IK for a character with up to 8 legs. It is a visual pass: after the animation is sampled, it moves the waist, hip, knee and ankle joints so the feet meet the floor. It runs from `idActor::UpdateAnimationControllers` (`Actor.cpp` 1732-1733) and only when `gameLocal.isNewFrame` is set (`IK.cpp` 576-577).

Order of steps inside `idIK_Walk::Evaluate`, once per tick:
(a) Gates: no entity or not a new frame, return (576-578); no legs enabled, return (581-583).
(b) Foot heights are read from the animated pose (593-605). The lowest foot is recorded for the pivot option, which is off by default. The pivot foot is re-chosen when the foot changes or the yaw moves more than 30 degrees (607-621, threshold at 612).
(c) Floor probe for each enabled leg: a vertical clip translation from `footUpTrace` above the foot joint to `footDownTrace` below it (630-632), against a small square clip model (setup 546-554, half-size `ik_footSize` x 0.5). The floor height is taken from the trace end point (633).
(d) Grounded test from the physics contacts (647). When grounded, each enabled leg gets a raw shift = floor height - origin height + `ik_footShift` (664-668). Otherwise the shift is 0. The smallest raw shift is kept (670-672).
(e) Ankle smoothing, for every leg including disabled ones (659-692). Target = ankle height + raw shift. If the rig has a valid previous state and the character is not on a platform, the shift is reduced by smoothing x (target - last ankle height) (679-682). Algebra: new = last + (1 - smoothing) x (target - last), so the ankle closes 25% of the gap per tick at the default 0.75. The new height is stored for next tick (684-689).
(f) Waist (694-727): waist offset = smallest raw shift + `ik_waistShift` (698). Optional floor and ankle clearances follow (700-717); both default to 0 (off). The waist is then smoothed against its last height, with the same form (719-724). Its height is stored (727).
(g) First valid tick: state is stored and the function returns with no joint change (729-732). A rig that was just enabled or initialised skips one tick of IK. `EnableAll` and `DisableAll` clear the valid flag (807, 817), so re-enabling causes the same settle tick.
(h) Solve, for every leg (735-763): hip = hip joint + waist offset (738-739); knee = `SolveTwoBones(hip, ankle target, bend, upper, lower)` (747); hip and knee axes are rebuilt from the new joint positions (757-762).
(i) Waist, hip, knee and ankle are written as world-override joint modifiers (766-772), and the rig is marked active (774). `ClearJointMods` (782-798) sets them back to none.

Two-bone solve, `SolveTwoBones` (185-210): if the ankle target is out of reach (distance > l0 + l1, or < |l0 - l1|), the middle joint is placed halfway and the call returns false (194-198). In reach, the middle joint sits at distance x = (d^2 + l0^2 - l1^2) / (2d) along the chain and at y = sqrt(l0^2 - x^2) off it, toward the bend direction made perpendicular to the chain (200-207).

Rest data, fixed at `Init` (459-533): upper and lower bone lengths are measured from the rest-pose frame (527, 531). The bend direction is knee-to-`ik_dir` joint, or (1, 0, 0) when no such joint exists (516-520). The leg count comes from `ik_numLegs`, capped at 8 (446). An invalid joint name is a fatal error (469-499).

Tick rate: the smoothing runs once per game frame. `USERCMD_HZ` is 60 (`UsercmdGen.h` 40). So 0.75 means 25% of the gap per tick, and that is frame-rate dependent in a variable-fps renderer. The donor has no dt term.

Reach (`idIK_Reach`, 852-1109), read but unused: it traces from the shoulder toward the hand target and stops at the first solid hit (1077-1078), then solves the elbow with the same two-bone solve (1085). No caller in the donor.

## 2. Key functions

- `idIK_Walk::Evaluate`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/IK.cpp` 566-775. The whole pipeline, steps (a) to (i).
- `idIK::SolveTwoBones`: same file, 185-210.
- `idIK_Walk::Init`: same file, 426-559 (leg joints, rest lengths, tunables 535-544, foot quad 546-554).
- `idIK_Walk::ClearJointMods`: same file, 782-798. `EnableAll` / `DisableAll`: 805-818.
- Callers: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Actor.cpp` 1721-1738 (calls `walkIK.Evaluate()` at 1733); `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/ai/AI.cpp` 5017 (monster path calls the actor update); `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Entity.cpp` 2638 (entities without physics; the caller was not read in full).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Analytic two-bone solve (law of cosines), with a midpoint fallback when out of reach | None (math). Bone lengths come from the rig at Init. |
| Ankle eases toward its floor target by a fixed fraction per tick, skipped on moving platforms | `ik_smoothing` 0.75 (Init default, IK.cpp 535): 25% of the gap per tick |
| Waist drops by the lowest foot's needed shift, then eases | `ik_waistSmoothing` 0.75 (Init default, 536). The constructor sets 0.5 (265), which Init overrides. |
| Floor probe is a short vertical segment around the foot | `ik_footUpTrace` 32 and `ik_footDownTrace` 32 (541-542), in donor units (not converted) |
| Foot probe volume | `ik_footSize` 4, used as a half-size of 2 (547) |
| Optional extra waist clearances | `ik_minWaistFloorDist` 0 (539) and `ik_minWaistAnkleDist` 0 (540), both off |
| Pivot foot re-chosen only on change or on a yaw change over 30 degrees | 30 degrees (612); `ik_usePivot` default off (544) |
| Shift from the animated origin | `ik_footShift` 0 (537), `ik_waistShift` 0 (538) |
| Leg cap | 8 legs (`MAX_LEGS`, `IK.h` 101; cap at `IK.cpp` 446) |
| Rate behind the per-tick numbers | 60 per second (`UsercmdGen.h` 40) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: raw floor shift while grounded, ankle smoothing with the platform bypass, waist drop and smoothing, first-tick return, then the leg solve. It omits the optional waist floor and ankle clearances (700-717), the pivot foot (607-621, off by default), the enabled-leg mask (the sketch treats every leg as enabled), the debug draw, the hip and knee axis rebuild and the world-override joint writes (735-774), the trace itself (the sketch takes `floorHeight` as an input), and the donor's behaviour when a probe misses (not read). Heights are measured along `up`.

```ts
// Licence: GPL-3.0-or-later with id Software additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type V3 = { x: number; y: number; z: number };
const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: V3): number => Math.sqrt(dot(a, a));
const unit = (a: V3): V3 => { const l = len(a); return l > 0 ? mul(a, 1 / l) : { x: 0, y: 0, z: 0 }; };

// Two-bone solve. Returns the middle joint. Out of reach: the joint sits halfway, ok = false.
export function solveTwoBones(start: V3, end: V3, bend: V3, l0: number, l1: number): { joint: V3; ok: boolean } {
  const v = sub(end, start);
  const d = len(v);
  if (d === 0 || d > l0 + l1 || d < Math.abs(l0 - l1)) return { joint: add(start, mul(v, 0.5)), ok: false };
  const axis = mul(v, 1 / d);
  const side = unit(sub(bend, mul(axis, dot(bend, axis))));  // bend direction made perpendicular to the chain
  const x = (d * d + l0 * l0 - l1 * l1) / (2 * d);            // distance along the chain to the middle joint
  const y = Math.sqrt(Math.max(0, l0 * l0 - x * x));          // distance off the chain, toward the bend
  return { joint: add(add(start, mul(axis, x)), mul(side, y)), ok: true };
}

export interface Leg {
  upper: number;        // thigh length, measured at rest
  lower: number;        // shin length, measured at rest
  bend: V3;             // knee bend direction, world space
  hip: V3;              // animated hip, world space, before the waist drop
  ankle: V3;            // animated ankle, world space, before IK
  floorHeight: number;  // floor height along `up` under this foot (from a short down-probe)
}
export interface RigState { valid: boolean; oldAnkle: number[]; oldWaist: number; }
export interface Tuning { ankleSmoothing: number; waistSmoothing: number; footShift: number; waistShift: number; }

// One fixed tick. Order follows the donor: floor shift, ankle smoothing, waist drop and smoothing, first-tick return, leg solve.
export function ikTick(legs: Leg[], origin: V3, pelvis: V3, up: V3, grounded: boolean, onPlatform: boolean,
                       st: RigState, t: Tuning): { ankles: V3[]; knees: V3[] } | null {
  const h = (p: V3): number => dot(p, up);
  const originH = h(origin);
  // raw floor shift, only while grounded
  const raw = legs.map(l => (grounded ? l.floorHeight - originH + t.footShift : 0));
  const lowest = raw.length > 0 ? Math.min(...raw) : 0;

  // ankle smoothing: close a fraction of the gap to the target each tick, except on a moving platform
  const ankleH: number[] = [];
  const shift: number[] = [];
  legs.forEach((l, i) => {
    let s = raw[i];
    const ah = h(l.ankle);
    if (st.valid && !onPlatform) {
      const target = ah + raw[i];
      s = raw[i] - t.ankleSmoothing * (target - st.oldAnkle[i]);
    }
    shift.push(s);
    ankleH.push(ah + s);
  });

  // waist: drops by the lowest needed shift, then is smoothed against its last height
  let off = lowest + t.waistShift;
  const ph = h(pelvis);
  if (st.valid) {
    off -= t.waistSmoothing * (ph + off - st.oldWaist);
  }
  st.oldWaist = ph + off;
  st.oldAnkle = ankleH;
  if (!st.valid) { st.valid = true; return null; }  // first tick: state stored, no solve

  const ankles: V3[] = [];
  const knees: V3[] = [];
  legs.forEach((l, i) => {
    const ankle = add(l.ankle, mul(up, shift[i]));   // ankle target after the IK shift
    const hip = add(l.hip, mul(up, off));            // hip follows the waist drop
    ankles.push(ankle);
    knees.push(solveTwoBones(hip, ankle, l.bend, l.upper, l.lower).joint);
  });
  return { ankles, knees };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/client/rig/foot-ik.ts` (proposed path, not checked against the repo). Client-only visual pass; it is not `src/fight`, because the engine never reads poses. Parity-checklist row 6 (hero actor/animation). The same module would serve creatures under row 7 once their rigs have feet.
- today: none. The Frankendom rig has no IK yet (not checked against the repo).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later with id additional terms: clean-room only; shape only)
- Brief rule served: 1 (one combat core, two clients: the IK is a client-only visual pass and no engine code reads poses); rules 7-9 n/a

## 6. Gaps and risks

- Client only. The pose must never feed the engine. A hit, a kill or a loot drop must use the server's own hit volumes and state, never a foot or hand moved by IK. Not read: whether the donor's gameplay reads posed joints.
- Frame rate. The donor's 0.75 is per game frame (60 Hz constant). A browser client renders at variable fps, so Frankendom needs a dt form, for example factor = 1 - (1 - smoothing)^(dt x 60), so that 60 fps and 120 fps settle the same. This derivation is not tested.
- Probe miss. The donor takes `results.endpos` as the floor height (633), and the miss behaviour was not read. A foot over a ledge may get a wrong floor height. Frankendom needs an explicit maximum step (clamp the shift) and a rule for no floor.
- Per-tick cost. Each leg makes one clip trace per tick (630-633). A fight with MAX_ATTACKERS = 3 is cheap; a zone crowd needs a per-tick budget, for example IK only for the nearest N creatures. The donor has no budget (not read).
- Zones as data. `footUpTrace` and `footDownTrace` should be zone data, since step height differs by level. The other tunables are per-entity in the donor (spawnArgs), so in Frankendom they are per-creature rig data, not zone data.
- The Pit: the Pit floor is assumed flat (not checked against the Pit scene). Keep IK off there; it buys nothing on a flat floor.
- The reach controller has no caller in the donor. Do not port it. Its idea (trace to the first solid, then solve) is only a candidate for a hand that stops at a wall.
- Waist smoothing default conflicts inside the donor (constructor 0.5 at 265, Init 0.75 at 536). Frankendom should keep one value.
- The donor's one-ledger, server-verified-kill and MAX_ATTACKERS rules do not touch this mechanism; it has no damage or loot.

Best transferable idea: Each tick, close a fixed fraction of the gap between each foot and the floor (skipped on a moving platform), then solve each leg analytically so the knee bends the right way, with the hips dropped by the lowest foot.
Decision (proposed): adapt - client-only foot placement for the hero and creatures on uneven zone terrain, with the easing made dt-based, the Pit kept off, and the engine never reading poses.
Acceptance: Player sees: on a stepped zone floor the hero's heels rest on each step in the idle still at 375 wide, with no sliding while idle; a server test asserts the same hit result with IK toggled off and on (the pose is never an input).
