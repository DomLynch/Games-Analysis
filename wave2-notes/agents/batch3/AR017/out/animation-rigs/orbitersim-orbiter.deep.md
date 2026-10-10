# orbitersim-orbiter (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/VVessel.cpp` (the visual evaluator: `vVessel::Animate`, `vVessel::AnimateComponent`, `vVessel::UpdateAnimations`) with the rule and data in `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Vessel.cpp` (`Vessel::ApplyControlSurfaceLevels`, `Vessel::SetControlSurfaceLevel`, `Vessel::CreateAnimation`, `Vessel::AddAnimationComponent`) and the example vessel `/mnt/frankendom-donors/orbitersim-orbiter/Src/Vessel/ShuttlePB/ShuttlePB.cpp` | Licence: two files, two licences. `VVessel.cpp` header: "Dual licensed under GPL v3 and LGPL v3" (copyleft: clean-room, shape only). `Vessel.cpp` and `ShuttlePB.cpp` headers: "Licensed under the MIT License" (permissive). The root `LICENSE` is MIT. | C++ | symbol `vVessel::Animate`

Checked: Read in full: `VVessel.cpp` 520-585 (`UpdateAnimations`, both modes) and 1582-1690 (`Animate`, `AnimateComponent`, child chaining; the rest of the function tail 1690-1716 read); `Vessel.cpp` 1877-1906 (control-surface creation, delay stored), 1959-2001 (set level, apply levels with slew), 3849-3854 (the one caller path that runs apply), 5424-5431 (trim ramps), 5765-5800 (create animation and first component); `ShuttlePB.cpp` 112-170 (the example rig: ranges, rotate transforms, control-surface wiring). `VesselAPI.h` 1645-1675 (SDK wording for the delay). `D3D9Config.cpp` 192 (the config switch). Callers: `ApplyControlSurfaceLevels` has one caller in the read code (3854, only when `CtrlSurfSyncMode` is set); `SetControlSurfaceLevel` callers read: `Vessel.cpp` 2059-2061 (thruster-group inputs), 5425 and 5430 (trim ramps), 8601 (the SDK wrapper). Not read: the matrix helpers (`D3DMAT_RotationFromAxis` and friends), `TransformPoint`/`TransformDirection`, the vertex-buffer side of `mesh->TransformGroup`, the `SimT1` start logic, and the absolute-mode restore/store helpers (named, not read in full). Topic fit, stated plainly: this is a state-driven rig. There are no skeletons, skinning, IK or ragdoll in the donor; the rig is a flat list of animations, each a single 0..1 state with parts that move only inside a window, and an optional parent chain. Confidence: high on the windowed-part evaluation and the slew rule (both read end to end); medium on how the visual's incremental mode stays in step with the engine state over a long session (not run).

Best transferable idea: Drive a whole pose from one 0..1 state, let each part move only inside its own sub-window of that state, and rate-limit the engine's control target so a guard or hinge takes a fixed time (the donor's delay) to travel from neutral to full.
Decision (proposed): adapt - take the windowed-part rig and the rate-limited target (delay in seconds, neutral to full); do not take the in-place vertex accumulation or the flight-model coupling; the engine keeps the target and the slew, the client draws the pose.
Acceptance: Headless test: a guard target goes from 0 to 1 at t = 0 with delay 0.25 s; the level moves at most dt / 0.25 per step and reaches full in 0.25 s; the first part (window 0-0.5) moves before the second (0.5-1) opens; releasing reverses the order (second part closes first). In the Pit, the hero's guard raise takes the same time every swing, whatever the frame rate.

## 1. Mechanism

- A rig is a list of animations. Each animation has one state in 0..1 (`Vessel::CreateAnimation`, `Src/Orbiter/Vessel.cpp` 5765-5777, initial state from the caller, e.g. 0.5 for the ShuttlePB surfaces `ShuttlePB.cpp` 154-156). Each animation has components. A component has a window `[state0, state1]` inside 0..1, a transform (rotate about a reference point along an axis, translate, or scale), and an optional parent component (`Vessel.cpp` 5780-5811; `ShuttlePB.cpp` 157-160 uses windows 0..1).
- Per frame, for an animation whose required state differs from the visual's state (`VVessel.cpp` 578), `Animate` runs. The order of components depends on direction: rising state applies them in list order, falling state applies them in reverse (1591). Only components on the mesh being updated are touched (1594).
- Each component reads the visual's current state and the required state, clamps both into its window (1597-1600), takes the difference, and returns without work if the difference is zero (1602). Otherwise it stretches the difference to the window (1603): `fraction = (s1 - s0) / (state1 - state0)`. A rotation turns by `fraction * angle` about its axis (1618); a translation moves `fraction * shift` (1630). Scale uses the clamped ends normalised to the window instead.
- Inside `AnimateComponent` (1657-1690) a component's own mesh groups get the matrix it was given first, then each child is called with that same matrix (1684-1687). A child's reference point and axis are then moved by the parent's matrix (1690-1697), so a child hinge rides on its parent. Every component also has its own entry in the list (`Vessel.cpp` 5799 appends it whatever its parent), so a child's own motion is applied in its own pass through `Animate`. Parent then child in list order is the normal case; the effect of the reversed order on a parented child was not traced.
- Incremental mode (the default, since `D3D9Config.cpp` 91 sets `bAbsAnims` to 0 and 192 reads the key `AbsoluteAnimations`) applies only the change from the visual's last applied state, then records the new state (578-580). The mesh is changed in place, so the visual's state and the mesh stay in step only through that bookkeeping. Absolute mode (533-557) resets all transforms and re-applies every animation from its default each frame.
- The control side (`Vessel.cpp`):
  - A control surface has a permanent target and a transient target. The working target is their sum, clamped to -1..1 (1978).
  - Its level moves toward the target. If the change is not direct, the surface has a delay, and the sim has started (1981), the level may move at most `SimDT / delay` per step (1983-1984). A delay of 1 (the simple creation form) takes one second to go from neutral to full (SDK wording, `VesselAPI.h` 1652, 1671). A delay of 0 is direct.
  - The rig state is `(level + 1) / 2` (1998). So level -1 is state 0, level 0 is state 0.5 (the neutral value used in `ShuttlePB.cpp` 154-156), and level +1 is state 1.
  - The apply runs from the body-force update, only when `CtrlSurfSyncMode` is set, that is while a change is pending or a slew is still running (`UpdateBodyForces` 3849, call at 3854).
- Example in `ShuttlePB.cpp`: aileron rotation range 20 degrees (119), elevator 30 degrees (120). Each rotate transform names a mesh group, a reference point, an axis and a range (121). The elevator animation has two components with window 0..1 (159), and the elevator control surface is tied to that animation (163).

## 2. Key functions

- `vVessel::Animate`: `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/VVessel.cpp` 1582-1655. Windowed fraction and ordering.
- `vVessel::AnimateComponent`: `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/VVessel.cpp` 1657-1716. Apply transform, then children.
- `vVessel::UpdateAnimations`: `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/VVessel.cpp` 520-585. Incremental and absolute modes.
- `Vessel::ApplyControlSurfaceLevels`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Vessel.cpp` 1968-2001. Target sum, slew, state mapping.
- `Vessel::SetControlSurfaceLevel`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Vessel.cpp` 1959-1964. Permanent or transient target; `direct` sets the sync mode.
- `Vessel::CreateControlSurface`: `/mnt/frankendom-donors/orbitersim-orbiter/Src/Orbiter/Vessel.cpp` 1877-1913. Stores the delay per control.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One scalar state per pose; each part moves only inside its window | Window 0..1 used in the example (`ShuttlePB.cpp` 159); rig start 0.5 (154-156) |
| Step fraction = clamped step / window width; zero step skipped before any division | None (rule, `VVessel.cpp` 1597-1603) |
| Opening runs parts in order, closing in reverse | None (rule, 1591) |
| Target = permanent + transient, clamped to -1..1 | Clamp bounds -1 and 1 (`Vessel.cpp` 1978) |
| Slew: at most `dt / delay` per step, delay in seconds for neutral to full | Delay 1.0 for the simple form (`VesselAPI.h` 1652); delay 0 = direct (1671) |
| Level to state: (level + 1) / 2 | Factor 0.5 and offset 1 (`Vessel.cpp` 1998) |
| Keyboard trim ramp | 0.25 per simulated second (`Vessel.cpp` 5425) |
| Rotation range per surface | Aileron 20 degrees (`ShuttlePB.cpp` 119), elevator 30 degrees (120) |

## 4. TypeScript sketch

simplified: keeps the target clamp, the slew (dt / delay per step; delay 0 or direct = jump), the level-to-state mapping, the window clamp with the zero-step skip, and the opening and closing order. It omits the sim-started guard (`Vessel.cpp` 1981), the transient-target reset (the donor keeps `ttgt` until the caller clears it; not read), the child parent-chain transforms, the per-mesh filter, the matrix build for rotate, translate and scale, the in-place vertex accumulation (the sketch returns fractions; the caller applies them), and absolute mode. The sketch returns the fraction to apply and does not move any mesh.

```ts
// Licence: MIT (Vessel.cpp, ShuttlePB.cpp) and GPL-3.0 or LGPL-3.0 dual (VVessel.cpp, the visual evaluator) (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ControlSurface {
  permanent: number;   // persistent target, -1..1
  transient: number;   // momentary target added on top, -1..1
  level: number;       // current level, -1..1
  delay: number;       // seconds to travel from neutral to full deployment; 0 = direct
}

interface WindowedPart {
  state0: number;      // this part reacts only while the rig state is inside [state0, state1]
  state1: number;
}

// Target level: both targets added, clamped to [-1, 1].
function targetLevel(cs: ControlSurface): number {
  return Math.max(-1, Math.min(1, cs.permanent + cs.transient));
}

// Slew toward the target. Per step the level moves at most dt / delay (level units, full span = 2).
// A neutral-to-full move is one unit, so it takes `delay` seconds.
function slew(cs: ControlSurface, dt: number, direct: boolean): number {
  const tgt = targetLevel(cs);
  if (direct || cs.delay === 0) {
    cs.level = tgt;
    return cs.level;
  }
  const dmax = dt / cs.delay;
  const d = tgt - cs.level;
  if (d > dmax) cs.level += dmax;
  else if (d < -dmax) cs.level -= dmax;
  else cs.level = tgt;
  return cs.level;
}

// The rig's single 0..1 state. Level -1 maps to state 0, level +1 maps to state 1.
const rigStateOf = (level: number): number => (level + 1) * 0.5;

// Fraction of one part's own travel to apply for a step of the rig state from `from` to `to`.
// The step is clamped into the part's window, so a part only moves while the rig is inside it.
function partFraction(part: WindowedPart, from: number, to: number): number {
  const a = Math.min(Math.max(from, part.state0), part.state1);
  const b = Math.min(Math.max(to, part.state0), part.state1);
  const ds = b - a;
  if (ds === 0) return 0;                  // also covers a zero-width window
  return ds / (part.state1 - part.state0);
}

// Opening (state rising) runs parts in list order; closing runs them in reverse.
function applyOrder(count: number, from: number, to: number): number[] {
  const rising = to > from;
  return Array.from({ length: count }, (_, i) => (rising ? i : count - 1 - i));
}

export {};
```

## 5. Lands in

- TARGET `src/fight/rig-tracks.ts` (new client module; proposed path). It holds the windowed parts and the pose state the client draws. The slew is an engine rule and would sit with the guard (row 3, guard/parry/stamina): the engine owns the guard target and the raise time, the client draws the pose. Lead to confirm the split and the path. Parity-checklist row 6 (hero actor/animation).
- today: not read. The Frankendom repo was not opened in this pass.
- Reuse tag: clean-room (the windowed evaluator is GPL-3.0 or LGPL-3.0 dual; the slew and state mapping are MIT in `Vessel.cpp` and may be adapted if Lead prefers, but this note keeps the clean-room sketch)
- Brief rule served: 1 (one engine: the guard target and its slew are engine state; the pose is a client view of it). Licence: the copyleft evaluator is not ported line by line.

## 6. Gaps and risks

- Licence split: the evaluator is copyleft (GPL or LGPL). Only the shape is used here. The slew and the 0..1 mapping are MIT, so they can be adapted with the MIT notice; the note does not depend on that.
- Incremental mode changes meshes in place and remembers only the last applied state, so an error in one step stays in the mesh until a reset. Frankendom should pose from data each frame (a pose function of the state), not accumulate deltas. Absolute mode is the donor's way to avoid drift and costs a full reset each frame; that is the same trade-off the donor already tested for users with the config switch.
- The slew needs a sim-step clock. The donor scales by `SimDT` (1983) and only after the sim has started (1981). Frankendom's fixed-step server tick (row 18 / post-K item 3: fixed step) should drive the slew, so a guard raise takes the same time on every client and in the server's view.
- Many-on-one (MAX_ATTACKERS = 3): a guard raise is per hero, so it does not multiply, but three attackers can push the guard target in the same tick. The donor clamps the sum to -1..1 (1978) and does not say what wins; Frankendom needs one rule for that.
- The transient target is never reset in the read code (only `ttgt` is set, 1961). The caller must clear it. Whether the donor's callers always do is not read.
- The windowed-part idea needs a rig with separate parts per window. Frankendom's hero rig is a single skinned mesh (not read); a window can drive a bone pose only if the rig has separate bones or blend shapes for each part.
- Parented components: the reversed order on close (1591) matters only when a child has a parent. I did not trace what the reference-point update (1690-1697) does when the child's own pass runs before the parent's; a test with a parented rig is needed before Frankendom copies the parent chain.
- Not searched: a hit-reaction or hitstop that pauses the rig (row 10 territory).

Reuse tag: clean-room (copyleft evaluator; the slew rule is MIT and may be adapted)
Brief rule served: 1 (one engine: target and slew are engine state; pose is client-only)
