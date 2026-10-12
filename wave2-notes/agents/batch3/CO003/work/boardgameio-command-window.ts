// Licence: MIT (donor LICENSE, "Copyright (c) 2017 The boardgame.io Authors"). Clean-room sketch from the mechanism.
// clean-room
export interface Budget {
  minMoves?: number; // 0 or undefined means no minimum (donor: falsy minMoves is not set)
  maxMoves?: number; // the side's window closes once this many counted commands are accepted
}

export interface WindowState {
  budget: Readonly<Record<string, Budget>>;  // per side
  used: Readonly<Record<string, number>>;    // counted commands accepted per side
}

export interface Command {
  side: string;
  name: string;
  noLimit?: boolean; // donor: move.noLimit, a free action that does not use a slot
}

export type Outcome =
  | { ok: true; state: WindowState; closed: boolean }
  | { ok: false; reason: string };

// Order of operations: refuse if the side is already at its maximum, count the command (free ones do not
// count), then report whether this command closed the side's window.
// The fix over the donor: the counts are copied, never incremented in place.
export function submit(state: WindowState, cmd: Command): Outcome {
  const budget = state.budget[cmd.side] ?? {};
  const used = state.used[cmd.side] ?? 0;
  if (budget.maxMoves !== undefined && used >= budget.maxMoves) {
    return { ok: false, reason: `side ${cmd.side} used ${used} of ${budget.maxMoves}` };
  }
  const nextUsed = cmd.noLimit === true ? used : used + 1;
  return {
    ok: true,
    state: { ...state, used: { ...state.used, [cmd.side]: nextUsed } },
    closed: budget.maxMoves !== undefined && nextUsed >= budget.maxMoves,
  };
}

// The window may end for a side only after its minimum counted commands.
export function canEnd(state: WindowState, side: string): boolean {
  const min = state.budget[side]?.minMoves ?? 0;
  return min === 0 || (state.used[side] ?? 0) >= min;
}

// Preset in the donor's style: each side submits exactly once, in any order (donor ALL_ONCE).
export const ALL_ONCE: Budget = { minMoves: 1, maxMoves: 1 };

// The phase is done when every listed side has met its minimum and reached its maximum.
export function allDone(state: WindowState, sides: readonly string[]): boolean {
  return sides.every(
    (side) =>
      canEnd(state, side) &&
      (state.budget[side]?.maxMoves === undefined ||
        (state.used[side] ?? 0) >= (state.budget[side]?.maxMoves ?? 0)),
  );
}

export {};
