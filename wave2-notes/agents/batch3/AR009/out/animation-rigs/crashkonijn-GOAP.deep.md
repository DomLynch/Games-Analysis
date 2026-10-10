# crashkonijn-GOAP (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/crashkonijn-GOAP/Demo/Assets/CrashKonijn/GOAP/Demos/Shared/Behaviours/AnimationBehaviour.cs` | Licence: Apache-2.0 (`/mnt/frankendom-donors/crashkonijn-GOAP/LICENSE`: "Apache License" / "Version 2.0, January 2004"; code may be adapted with the notice kept) | C# (Unity) | symbol `AnimationBehaviour`

Checked: Read in full: `Demo/.../Shared/Behaviours/AnimationBehaviour.cs` (78 lines, the hint file), `Demo/.../Shared/Behaviours/AgentMoveBehaviour.cs` (the source of the walk flag), `Package/Runtime/CrashKonijn.Agent.Runtime/AgentBehaviour.cs` lines 16-36 and 142-153 (pause flag and Run gate), `Demo/.../Demos/Animations/CharacterAnimationController.controller` (174 lines: the two-state graph, its transitions and the Walking parameter). Read only in part: `Demo/.../TurnBased/Behaviours/TurnAnimationBehaviour.cs` lines 25-60 (same pattern, grid mover); the Simple and Complex AnimationBehaviour.cs variants were grepped, not read. Not read: the `.anim` clips, the rig or skeleton, Unity's Animator runtime, and the action code that writes `ActionState.Data.Target`. Confidence: high for the bool mirror, the pause freeze and the facing flip; moderate for the AnimatorConditionMode numbers (1 = If, 2 = IfNot), which come from Unity's API and are not in the donor. The donor has no skeleton, skinning, blending, IK, ragdoll, retargeting, hit reaction or attachment code. camera_scope: n/a (not a camera cell).

Best transferable idea: Drive a creature's clip from one walk flag set by events, write the animator only on change, freeze it while the fight is paused, and turn to face the target only while walking.
Decision (proposed): adapt - take the change-only write, pause freeze and walk-only facing for creature clips (row 7), but not the Unity Animator graph; the flag must come from the replicated fight state so every client agrees.
Acceptance: A creature walks only while it has an approach target, its legs freeze the moment a fight pauses, it turns to face its target only while walking, and a client test asserts one clip change per state change and none on idle frames.

## 1. Mechanism

- The donor is a locomotion animation driver for a GOAP agent. It has two parts: a move layer that sets one bool (`IsMoving`) from four events, and a presentation script that copies that bool, the pause flag and a facing direction into a Unity Animator.
- Move layer, from events (not per frame): `OnTargetInRange` clears the flag; `OnTargetChanged(target, inRange)` sets the flag to `!inRange` and stores the target; `OnTargetNotInRange` sets it true; `OnTargetLost` clears the target and the flag. (`AgentMoveBehaviour.cs` 34-54.)
- Move step, every Unity `Update`: return if the agent is paused (58-59); return if the flag is false (61-62); return if there is no target (64-65); otherwise `Vector3.MoveTowards` toward the target's x and z, keeping the agent's own y, with max step `Time.deltaTime` (67). Since the max step is the frame time, the agent covers 1 unit per second whatever the frame rate.
- Presentation, every Unity `Update`, in this order (`AnimationBehaviour.cs` 26-31):
  1. `UpdatePaused` (35): `animator.speed = IsPaused ? 0 : 1`. Written every frame, no change check. A paused agent's clip freezes.
  2. `UpdateAnimation` (40-47): read `IsMoving`; return if it equals the cached `isWalking` (42-43); otherwise cache it and call `SetBool(Walking, ...)` (47). Writes happen only on a change.
  3. `UpdateScale` (52-62): return unless walking (52-53), so facing is held while standing still; compute `IsMovingLeft` (55); return if unchanged (57-58); cache and set `localScale.x` to -1 or 1 (60-62).
- `IsMovingLeft` (65-76): false when there is no action data or no action target (67-71); otherwise true when own x is greater than the target's x (75). The target here is the action's target from `ActionState.Data`, not the move layer's target (the two are set by different code, see Gaps).
- Pause, on the agent: the `IsPaused` setter (`AgentBehaviour.cs` 18-36) does nothing when the value is unchanged; otherwise it calls `Events.Pause()` or `Events.Resume()` (30, 34). `Run` returns early while paused (144-145), so the action does not advance.
- Start: `Awake` (16-24) sets the animator's local y to a random value in [-0.1, 0.1] to break up identical clips at the same spot (23).
- The controller (`CharacterAnimationController.controller`): one bool, `Walking` (117-118), and two states. `BlueIdle` (entry state, entry transition at 161-170) goes to `BlueWalkForward` when `Walking` is true (condition mode 1, line 144; duration 0, line 153; HasFixedDuration 1, line 157). `BlueWalkForward` goes back to `BlueIdle` when `Walking` is false (condition mode 2, lines 37-38; duration 0, line 46; `m_ExitTime: 0.25` at 48 but `m_HasExitTime: 0` at 49, so the exit time is inactive). The file also lists `BlueWalkForward` as `m_DefaultState` (28); the entry transition points to `BlueIdle`.

## 2. Key functions

- `AnimationBehaviour.UpdateAnimation`: `AnimationBehaviour.cs` 38-48. Edge-triggered `SetBool(Walking)`.
- `AnimationBehaviour.UpdateScale` and `IsMovingLeft`: `AnimationBehaviour.cs` 50-76. Facing by x comparison with the action target, written only on change, held while standing.
- `AnimationBehaviour.UpdatePaused`: `AnimationBehaviour.cs` 33-36. Pause freezes the clip by setting speed to 0.
- `AgentMoveBehaviour` event handlers: `AgentMoveBehaviour.cs` 34-54. The four events that set the walk flag.
- `AgentMoveBehaviour.Update`: `AgentMoveBehaviour.cs` 56-68. Walking step, gated by pause, flag and target.
- `AgentBehaviour.IsPaused` setter and `Run`: `AgentBehaviour.cs` 18-36 and 142-153 (only the parts shown are read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Edge-triggered animator writes: write a parameter only when its cached value changes | None (the rule) |
| Freeze the clip when the simulation is paused: animator speed 0 while paused, 1 otherwise | Speed values 0 and 1 (theirs, `AnimationBehaviour.cs` 35) |
| Face the direction of the target only while moving; hold facing when still | Scale -1 / 1 on x (theirs, 62) |
| Walk flag set by events, not per frame: in range clears it, out of range sets it, lost clears it | None (the rule) |
| Visual jitter so identical actors do not sit at one spot | Random local y in [-0.1, 0.1] (theirs, 23) |
| Walk step bounded by frame time | 1 unit per second, via `Time.deltaTime` as max distance (theirs, `AgentMoveBehaviour.cs` 67) |
| Blend time between the two clips | 0 for both transitions (theirs, controller 46 and 153); exit time 0.25 stored but inactive (48-49) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (pause speed, then the walk flag, then facing only while walking) and the four move events. It is 1D (x only): the donor also moves on z and reads the facing target from the action data, which the sketch folds into the one `targetX` field. It omits the Unity Animator, the clip graph and blend times (all zero in the donor), the random y jitter, the gizmo, and the `Awake` component lookups. It writes a list of changed fields where the donor calls `SetBool` and sets `localScale`.

```ts
// Licence: Apache-2.0 (donor). Clean-room sketch of the mechanism, not a translation of the donor lines.
type Facing = 1 | -1;

interface Actor {
  x: number;                 // position on the x axis (2D or side-on view)
  paused: boolean;           // set by the agent's pause flag
  moving: boolean;           // set by move events (see applyMoveEvent)
  targetX: number | null;    // null when there is no target
}

// What the presentation layer has pushed to the animator last time.
interface Clip {
  walking: boolean;          // the one animator bool
  facing: Facing;
  speed: 0 | 1;              // 0 freezes the clip
}

type MoveEvent =
  | { kind: "inRange" }
  | { kind: "targetChanged"; inRange: boolean; x: number }
  | { kind: "notInRange" }
  | { kind: "lost" };

// Move-layer events set the moving flag. Only these four transitions exist.
function applyMoveEvent(a: Actor, e: MoveEvent): void {
  switch (e.kind) {
    case "inRange": a.moving = false; break;
    case "targetChanged": a.moving = !e.inRange; a.targetX = e.x; break;
    case "notInRange": a.moving = true; break;
    case "lost": a.moving = false; a.targetX = null; break;
  }
}

// Movement step: frozen while paused; walks toward the target at 1 unit per second of dt.
function stepMove(a: Actor, targetX: number | null, dt: number): void {
  if (a.paused) return;
  if (!a.moving) return;
  if (targetX === null) return;
  const maxStep = dt * 1; // 1 unit/s
  const d = targetX - a.x;
  a.x += Math.abs(d) <= maxStep ? d : Math.sign(d) * maxStep;
}

// Presentation pass, run every frame. Each animator write happens only when the value changes.
function presentFrame(a: Actor, c: Clip): string[] {
  const changed: string[] = [];

  const speed: 0 | 1 = a.paused ? 0 : 1;
  if (c.speed !== speed) { c.speed = speed; changed.push("speed"); }

  if (c.walking !== a.moving) { c.walking = a.moving; changed.push("walking"); }

  // Facing is only updated while walking; with no target it faces right.
  if (c.walking) {
    const facing: Facing = a.targetX !== null && a.x > a.targetX ? -1 : 1;
    if (c.facing !== facing) { c.facing = facing; changed.push("facing"); }
  }
  return changed;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/goap-anim-mirror.ts`). Not run: the sketch was not executed.

## 5. Lands in

- TARGET `src/fight/creature-presentation.ts` (proposed new module name; the Frankendom repo was not read, so this path is not checked against it). Client-only presentation: it reads the server-verified fight state and never writes outcomes. Parity-checklist row 7 (creature actor/clips). The same shape would also serve row 6 (hero actor/animation).
- Reuse tag: adapt-idea (Apache-2.0; code could be adapted with the notice; this sketch is clean-room, written from the mechanism)
- Brief rule served: one engine (the animation reads engine state, the engine never reads the animator); cameras, HUD and sound are client-only, as this is. Zones as data: the move speed is per creature, supplied as data.

## 6. Gaps and risks

- Frankendom has no skeleton, blend, IK or hit reaction in this donor. A creature's hit or finisher clips need their own design; this mechanism covers only walk versus idle, pause freeze and facing.
- Two targets: the donor's move layer and its facing code read different targets (the move layer's `currentTarget` from events, the facing code's `ActionState.Data.Target`). Frankendom must have one target per actor (the many-on-one hate list lives in the engine), or facing will disagree with movement. MAX_ATTACKERS = 3 means up to three actors may face one target; each needs its own flag.
- The Walk-to-Idle exit time of 0.25 is stored in the controller but inactive (HasExitTime 0). Anyone copying the number will think there is a delay that does not exist.
- The facing flip is a negative scale on the root transform. Whether Frankendom's rigs tolerate a mirrored transform (winding or normals) was not read (not read).
- Pause here is a client flag on the agent. In Frankendom the pause is a server or fight-state fact; the client must freeze the clip from the replicated state, not from a local flag, or two clients will disagree.
- The movement step uses frame time with no fixed step and no server tick. The Frankendom server tick (row 18 / post-K item 3: fixed step, input intake, per-tick NPC budget) must own position; this donor shows only the client's visual walk.
- Licence: Apache-2.0, so adapting code is allowed; this note does not copy it.

