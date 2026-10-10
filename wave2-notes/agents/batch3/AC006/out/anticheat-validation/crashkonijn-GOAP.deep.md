# crashkonijn-GOAP (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Agent.Runtime/ActionRunner.cs` (symbol `Run` / `RunIsValid`, with `GoapActionBase.IsValid` in `CrashKonijn.Goap.Runtime/Behaviours/GoapActionBase.cs`) | Licence: Apache License 2.0 (LICENSE, "Version 2.0, January 2004") | C# (Unity) | symbol `ActionRunner.Run`

Best transferable idea: re-check a queued action against live world state on every tick, before anything is applied, and stop it with a reason when its conditions, its target or its own rule no longer hold, instead of trusting the state from when it was queued.
Decision (proposed): adapt - the per-tick re-check at resolution time is what kills need (an attack resolves only if the target is still alive and in range at the server tick), but the donor's target check is a null test only, the loop runs on the render frame with variable delta, and a stop is a warning log; Frankendom must check fight state at a fixed server tick and return a typed stop reason.
Acceptance: a test queues an attack, the target dies from another attacker in the same tick, the next server tick stops the queued attack with TARGET_INVALID, no damage or XP is written to the ledger, and the client receives the stop reason.

Checked: Read `ActionRunner.cs` (lines 1-173, whole), `GoapActionBase.cs` 95-145 (the two `IsValid` overloads), `AgentType.cs` 55-80 (`AllConditionsMet`), `ConditionObserver.cs` (whole, 29 lines), `TransformTarget.cs` 25-45 and `PositionTarget.cs` 15-30 (`IsValid`), `AgentBehaviour.cs` 120-170 (`Update`, `Run`, `UpdateTarget`), `Scriptables/CapabilityAction.cs` (lines 19 and 21 only, the defaults), `Package/Documentation/Classes/Actions.md` 40-50, and `LICENSE`. This is AI-side action validity in a Unity GOAP library, not a client-input validator: the donor's authority is the game client, so the transferable part is the re-check, not the trust model. Confidence: high on the per-frame order (the whole runner read); medium on the planner side, because the job-runner path (`Classes/Runners/AgentTypeJobRunner.cs` around 165-232) was seen only in grep output and not read in full. (not read): the `RunState` implementations, the bodies of `StopAction` and `CompleteAction`, and the user `Perform` and `BeforePerform` hooks.

## 1. Mechanism

- Every frame, `AgentBehaviour.Update` calls `Run()` when `RunInUnityUpdate` is set (AgentBehaviour.cs 125-128), which calls `Run(Time.deltaTime)`. Inside, a paused agent returns (144), then `UpdateTarget()` refreshes the current target and fires lost or changed events (150; the body is 155-169), then `actionRunner.Run(deltaTime)` (152).
- `ActionRunner.Run` (19) first calls `RunIsValid()` (21). If there is no action, it logs and returns false. Otherwise it calls `Action.IsValid(agent, data)` (43). If that is false, it logs a warning, calls `StopAction()` (48) and returns false, so no movement or perform happens that frame.
- `GoapActionBase.IsValid(agent, data)` (103), in order: (a) if `Config.ValidateConditions` and not all conditions are met, return false (108; `AgentType.AllConditionsMet` at AgentType.cs 61-73, which sets the world data and tests each condition); (b) if `Config.ValidateTarget` and `Config.RequiresTarget`: a null target returns false (check at 116), and `!data.Target.IsValid()` returns false (122); (c) call the action's own `IsValid(agent, data)` (139-141, default returns true). Both flags default to true (CapabilityAction.cs 19, 21).
- Only after validity: the move mode decides. `MoveBeforePerforming`: if in range (or already performing), perform; otherwise move (73-84). `PerformWhileMoving`: if in range, perform; otherwise move and perform (55-69).
- `PerformAction` (94): `ShouldContinue()` (96) updates the run state (127), completes or stops the action if the run state says so (129-139), and returns whether to perform. Then `BeforePerform` runs once (102-103), `Perform` runs (105), and completion or stop is applied (107-117); otherwise the run state is stored.
- Target validity is a null check: `TransformTarget.IsValid` returns `Transform != null` (34). `PositionTarget.IsValid` returns true (21-23).
- Tick: variable step. The delta comes from `Time.deltaTime` (AgentBehaviour.cs 136), so there is no fixed step and no accumulator. Each frame re-checks everything once per agent.

## 2. Key functions

- `ActionRunner.Run` and `RunIsValid`: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Agent.Runtime/ActionRunner.cs` 19-53 (read in full).
- `GoapActionBase.IsValid` (the entry that checks conditions, then target, then the own rule): `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Runtime/Behaviours/GoapActionBase.cs` 103-137 (read in part; the own-rule overload at 139 read).
- `AgentType.AllConditionsMet`: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Runtime/Classes/AgentType.cs` 61-73 (read).
- `ConditionObserver.IsMet` value path: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Goap.Runtime/Observers/ConditionObserver.cs` 19-22 (read).
- `AgentBehaviour.Update` and `Run`: `/mnt/frankendom-donors/crashkonijn-GOAP/Package/Runtime/CrashKonijn.Agent.Runtime/AgentBehaviour.cs` 125-152 (read).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Re-check conditions, target and own rule every tick, before the action acts | Flags `validateConditions` and `validateTarget`, both default true (CapabilityAction.cs 19, 21) |
| Target still exists | Null test only (TransformTarget.cs 34); a position target is always valid (PositionTarget.cs 23) |
| Stop instead of perform when invalid | Stop, then return (ActionRunner.cs 48); the donor logs a warning and gives no reason code |
| Range gate before perform | Range from `proxy.IsInRange()` (ActionRunner.cs 73); no number, a boolean from the proxy |
| Time | Variable: `Time.deltaTime` (AgentBehaviour.cs 136) |

No tuned numbers appear in the validity path. Everything that is a value is a flag or a boolean from the proxy.

## 4. TypeScript sketch

simplified: keeps the donor's order (conditions when the flag is on, then target when required, then the own rule, then the range gate, then perform) and the default flags. It omits the Unity events (TargetLost and TargetChanged), the run-state object (its Update, ShouldStop, ShouldPerform and IsCompleted), the BeforePerform hook, the perform-while-moving variant, the logger, and the agent-type registry. It adds a typed stop reason where the donor only logs a warning, and it runs as one plain function instead of a per-frame method on a behaviour.

```ts
// Licence: Apache-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface WorldView {
  get(key: string): number | undefined;
}

export interface Condition {
  key: string;
  test: (world: WorldView) => boolean;
}

export interface Target {
  id: string;
  valid: boolean;
}

export interface ActionSpec {
  name: string;
  validateConditions: boolean; // donor default true
  validateTarget: boolean;     // donor default true
  requiresTarget: boolean;
  conditions: Condition[];
  ownRule?: (world: WorldView) => boolean; // the action's own check, run last
}

export type StopReason = "CONDITIONS_NOT_MET" | "NO_TARGET" | "TARGET_INVALID" | "OWN_RULE";

export type TickResult =
  | { state: "stopped"; reason: StopReason }
  | { state: "moving" }
  | { state: "performed"; done: boolean };

// Re-check the queued action against live state. Order: conditions, target, own rule.
export function revalidate(action: ActionSpec, target: Target | undefined, world: WorldView): StopReason | null {
  if (action.validateConditions && !action.conditions.every((c) => c.test(world))) return "CONDITIONS_NOT_MET";
  if (action.validateTarget && action.requiresTarget) {
    if (target === undefined) return "NO_TARGET";
    if (!target.valid) return "TARGET_INVALID";
  }
  if (action.ownRule !== undefined && !action.ownRule(world)) return "OWN_RULE";
  return null;
}

// One fixed server tick of a running action. Invalid: stop and do not perform.
// Out of range: move, do not perform. In range: perform once and report done or not.
export function tickAction(
  action: ActionSpec,
  target: Target | undefined,
  world: WorldView,
  inRange: boolean,
  perform: () => boolean, // returns true when the action is finished
): TickResult {
  const reason = revalidate(action, target, world);
  if (reason !== null) return { state: "stopped", reason };
  if (!inRange) return { state: "moving" };
  return { state: "performed", done: perform() };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/AC006-intent-revalidate.ts` on the VPS, exit 0 (same code, saved as `work/intent-revalidate.ts`).

## 5. Lands in

- TARGET `src/fight/intake.ts` for the queued intent check at the server tick, and the resolution step in `src/fight/` that applies an attack only when the check passes. The check reads fight state (alive, in range, not already dead this tick), not the presence of an object.
- Parity-checklist row 5 (controls / input intake): the queued intent is the input, so its re-check at the server tick is cited under row 5 only. The server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3) is the tick-side home. Row 5 is the closest single row; no row fits the stop-reason ledger write exactly.
- Reuse tag: rewrite-from-idea (Apache-2.0: adaptation allowed; this sketch is clean-room)
- Brief rule served: server-verified kills (the target is checked at resolution time, never at queue time).

## 6. Gaps and risks

- The donor's target check is a null test (TransformTarget.cs 34). A dead but present target still passes. Frankendom's check must test fight state, not presence.
- The donor loop runs on the render frame with `Time.deltaTime` (AgentBehaviour.cs 125-136), so the re-check is variable-step. Frankendom's re-check must run once per fixed server tick (rulings: one engine, server tick), or two clients will see different stop times.
- The donor's stop is a warning log (ActionRunner.cs 47-48). Frankendom needs a typed reason so the client can show it and tests can assert it.
- Re-checking every condition for every agent every tick costs time. In a many-on-one fight this is the per-tick NPC budget (row 18 sub-line); it needs a budget and a cap, not an unbounded re-check.
- Both flags default to true, so a designer who turns validation off for speed gets the stale-state bug back. Frankendom should keep the re-check on for every attack and make the flag a test-visible setting, not a silent default.
- The donor validates the queued action, not the input that queued it. Input rate and value checks are a separate problem (see the Colyseus note's intake ring).
- Not read: the job-runner path (AgentTypeJobRunner.cs, grep only), the `RunState` implementations, and the bodies of `StopAction` and `CompleteAction`.

Reuse tag: rewrite-from-idea (Apache-2.0; adaptation allowed, sketch clean-room)
Brief rule served: server-verified kills (the target is checked at resolution time).
