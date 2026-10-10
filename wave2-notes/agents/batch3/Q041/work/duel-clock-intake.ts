// Licence: CC0-1.0 (donor). Clean-room sketch of the mechanism in server/game.coffee; not a translation.
// Every number below is data: pass it in from the encounter or zone definition.
export interface ClockData {
  limitMs: number;      // allowance for an active turn (donor: 90 s)
  idleLimitMs: number;  // allowance after an idle turn (donor: 15 s)
  graceMs: number;      // server-only grace that clients never see (donor: 2 s)
  autoBonusMs: number;  // time credited per automatic step (donor: 2 s)
}

export interface PlayerTimes {
  lastActionAt: number;             // ms, stamped when any explicit command arrives
  prevTurnStartedAt: number | null; // start of this player's previous turn, if any
}

export interface Clock {
  turnStartedAt: number;
  lastTickAt: number;
  bonusMs: number;
}

export function startClock(now: number): Clock {
  return { turnStartedAt: now, lastTickAt: now, bonusMs: 0 };
}

// Server allowance. The idle rule applies only after more than 2 turns, as in the donor.
export function allowanceMs(p: PlayerTimes, d: ClockData, turnsSoFar: number): number {
  const idle =
    turnsSoFar > 2 &&
    p.prevTurnStartedAt !== null &&
    p.lastActionAt < p.prevTurnStartedAt;
  return (idle ? d.idleLimitMs : d.limitMs) + d.graceMs;
}

export interface TickResult {
  remainingMs: number; // clamped at 0; includes the grace
  expired: boolean;    // caller forces the end of the turn
  sentSeconds: number; // broadcast value; the client subtracts graceMs before showing it
}

// 1 Hz heartbeat. Remaining time is read from the wall clock, so a late tick loses no time.
export function tick(c: Clock, p: PlayerTimes, d: ClockData, turnsSoFar: number, now: number): TickResult {
  const dt = now - c.lastTickAt;
  c.lastTickAt = now;
  const remainingMs = Math.max(0, allowanceMs(p, d, turnsSoFar) - (now - c.turnStartedAt) + c.bonusMs);
  c.bonusMs = Math.max(0, c.bonusMs - dt); // bonus drains in real time, after it has been read
  return { remainingMs, expired: remainingMs <= 0, sentSeconds: Math.ceil(remainingMs / 1000) };
}

// Donor: automatic steps credit time unless a followup is open.
export function creditAutomaticStep(c: Clock, d: ClockData, followupOpen: boolean): void {
  if (!followupOpen) c.bonusMs += d.autoBonusMs;
}

export interface Command {
  type: string;
  playerId: string;
  payload: unknown;
  implicit: unknown[]; // effects the client sent along; the server ignores them
}

export type Verdict = { ok: true; effects: string[] } | { ok: false; message: string };

export interface Step {
  index: number;
  timestamp: number;
  command: { type: string; playerId: string; payload: unknown };
  effects: string[];
}

export type IntakeResult = { ok: true; step: Step } | { ok: false; message: string };

// Donor order: stamp the actor's last action, drop client implicit effects,
// re-run the explicit command on the server, then sign the step with the server clock.
export function intake(
  cmd: Command,
  players: Map<string, PlayerTimes>,
  run: (explicit: { type: string; playerId: string; payload: unknown }) => Verdict,
  lastIndex: number,
  rand: () => number,
  now: number,
): IntakeResult {
  const p = players.get(cmd.playerId);
  if (p) p.lastActionAt = now;
  const explicit = { type: cmd.type, playerId: cmd.playerId, payload: cmd.payload };
  const v = run(explicit);
  if (!v.ok) return { ok: false, message: v.message };
  const index = (lastIndex + 1 + rand() * 100) | 0;
  return { ok: true, step: { index, timestamp: now, command: explicit, effects: v.effects } };
}

export {};
