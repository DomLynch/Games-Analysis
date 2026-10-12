// Licence: BSD-3-Clause (donor). Shape re-expressed from the described mechanism; adapted with the donor defects fixed.
interface IntakeState {
  accepted: number[]; // timestamps in ms (monotonic clock) of accepted lines, oldest first
}

type Verdict = "relay" | "too-fast" | "too-long";

interface IntakeLimits {
  maxCommandsPerWindow: number; // donor: 80 (MAX_COMMAND_RATE); <= 0 turns the limit off
  windowMs: number;             // donor: 1 s window
  maxChars: number;             // donor: 6000 (MAX_CHAR_LIMIT); <= 0 turns the check off
}

const DEFAULT_LIMITS: IntakeLimits = { maxCommandsPerWindow: 80, windowMs: 1000, maxChars: 6000 };

function admit(state: IntakeState, text: string, nowMs: number, lim: IntakeLimits = DEFAULT_LIMITS): Verdict {
  // Length check first and not counted, as in the donor (it returns before the counter moves).
  if (lim.maxChars > 0 && text.length > lim.maxChars) return "too-long";
  // Fix: 0 (or less) disables the limit as the donor docs say; the sketch has no division, so 0 cannot throw.
  if (lim.maxCommandsPerWindow <= 0) return "relay";
  // Fix: sliding window. Drop only the lines older than one full window.
  while (state.accepted.length > 0 && nowMs - state.accepted[0] >= lim.windowMs) {
    state.accepted.shift();
  }
  // Fix: rejected lines are not recorded, so a flood does not hold the counter above the cap.
  if (state.accepted.length >= lim.maxCommandsPerWindow) return "too-fast";
  state.accepted.push(nowMs);
  return "relay";
}

export {};
