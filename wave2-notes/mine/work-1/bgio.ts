// Licence: MIT (donor). Sketch is our own code, not copied.
interface Action { type: string; payload?: { type: string; args?: unknown[] }; automatic?: boolean }
interface State { stateID: number; over: boolean; active: Set<string>; }
interface Rules {
  publicTypes: Set<string>;
  moveExists(s: State, name: string, player: string): boolean;
  apply(s: State, a: Action, player: string): State;
  view(s: State, player: string): unknown;
}

export function intake(
  rules: Rules, s: State, a: Action, claimedStateID: number, player: string,
  send: (player: string, view: unknown) => void, recipients: string[],
): { error: string } | { state: State } {
  if (!a || !a.type || !a.payload) return { error: "missing action" };
  if (!rules.publicTypes.has(a.type)) return { error: "unauthorized action" };
  if (a.automatic === true) return { error: "unauthorized action" };
  if (s.over) return { error: "game over" };
  if (!s.active.has(player)) return { error: "not active" };
  if (!rules.moveExists(s, a.payload.type, player)) return { error: "no such move" };
  if (s.stateID !== claimedStateID) return { error: "stale state" };
  const next = { ...rules.apply(s, a, player), stateID: s.stateID + 1 };
  for (const r of recipients) send(r, rules.view(next, r));
  return { state: next };
}

export {}
