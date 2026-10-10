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
