# open-duelyst-duelyst (server-tick-netcode, cell 8)

Donor: `/mnt/frankendom-donors/open-duelyst-duelyst/server/game.coffee` | Licence: CC0-1.0 (LICENSE and COPYING are the CC0 1.0 text; package.json `"license": "CC0-1.0"`; README says CC0) | CoffeeScript (Node/socket.io server) + SDK in `app/sdk/gameSession.coffee` | symbols `onGameEvent`, `restartTurnTimer`, `onGameTimeTick`, `emitGameEvent`, `executeAction`

Checked: Read in full: `game.coffee` 465-523 (intake), 700-862 (disconnect timer, turn clock, spectator timer), 862-1000 (spectator flush), 979-1061 (`emitGameEvent`), 1190-1281 (`onBeforeRollbackToSnapshot`, `onStep`, `onInvalidAction`); `gameSession.coffee` 625-830 (buffering, followups, snapshots), 1514-1621 (`executeAction`), 1943-2010 (`validateAction`), 2080-2125 (end of step); `gameTurn.coffee` 1-30; `step.coffee` 36-50; `config.js` 525-527; `game.js` 440-442 and 730-740. Read in part: `game.coffee` 225-330 (join), 1100-1135 (game load), `gameSession.coffee` 1479-1665 with comment lines filtered out, 1685-1700 and 1785-1795 (step execution), 1795-1835 (end of action). Not read: the validator modules (`app/sdk/validators`, `server/validators`), the client step-replay code, the disconnect handler body (`game.coffee` 526-573), `afterGameOver`, and the card followup code. `single_player.coffee` has the same clock constants and the same timer (grep only). Callers: `restartTurnTimer` is called from `initGameSession` (1131) and `onStep` (1225, 1230) only; `onGameTimeTick` runs only from its `setInterval` (773). Confidence: high on the clock arithmetic and the intake order (every quote verified); medium on the followup and snapshot flow (read the SDK paths, not every followup card). The donor has no per-frame simulation: the server code read does nothing between explicit actions except the 1 Hz clock, the 500 ms spectator flush and the 60 s disconnect timer. The grep for interpolation, lag compensation, prediction and fixed step gave hits in text and card helpers that were not opened.
Best transferable idea: The server takes only the explicit command from the client, throws away the client's implied effects, re-runs the command itself and stamps the result with its own clock, and runs the turn deadline from wall-clock time with a hidden grace that the viewer never sees.
Decision (proposed): adapt — the explicit-command intake is the shape that fits our server-verified kills; the deadline clock only as a shape, because the donor is turn-based and we are real-time. Reject the followup snapshot-and-rollback and the held opponent view: they need a hidden pending choice and a second copy of state, and our rulings have one ledger and no hidden choice.
Acceptance: A server test sends an explicit attack from a client with an injected implied "damage" effect; the server drops the injected effect, re-runs the attack, applies its own damage value, and stamps the step with the server time; and the client's timer shows the server limit minus 2 s.
Reuse tag: adapt allowed (CC0-1.0); the sketch below is clean-room, written from the described mechanism
Brief rule served: server-verified kills (intake re-runs the explicit command and drops client-sent effects) and one engine (the clock belongs to the session, not the client)

## 1. Mechanism

The donor is a two-player, turn-based card-game server. It has no fixed-step simulation. Its loops are a 1 Hz turn clock (`restartTurnTimer` 767-773, `onGameTimeTick` 791), a 500 ms spectator flush (862, 888) and a 60 s disconnect timer (718-720). The netcode is a command model: the client sends one explicit action, the server re-runs it, validates it, signs it and broadcasts it as a step.

Order of operations for one explicit action, on the server:
- (a) Intake. `onGameEvent` (465) takes an `EVENTS.step` event. It stamps the sender's last-action time first (491), then deserializes the step (495), calls `action.resetForAuthoritativeExecution()` (500) to clear implied effects the client sent, and runs `gameSession.executeAction(action)` (503). If anything throws, the code calls `destroyGameSessionIfNoConnectionsLeft(gameId, true)` (510) and emits a network error that forces a reconnect (512-513); the body of that helper was not read.
- (b) Validation. `validateAction` (SDK 1943) runs the validate event only for an authoritative source or a first-time action (1957). An invalid explicit action is reported only to its owner (`emitGameEvent` 1026-1036, via `onInvalidAction` 1254). Its `desync` flag is true only when the session is active, the owner is the current player and more than 2 s of turn time remain (1270-1272).
- (c) Step. If the action is valid and the source is authoritative, `executeAction` (1557-1560) updates state and, when no step is already in progress (1603-1621), builds a `Step` with `generateIndex()` (1608). The index is the previous index plus 1 plus a random 0 to 99, truncated (475). `step.addSignature()` (1612) sets `timestamp = Date.now()` (step.coffee 48). The step is queued and started (1621).
- (d) Broadcast. `onStep` (1203) sends the signed step to the clients (1212). `emitGameEvent` (979) sends the owner a scrubbed copy at once (987-999). The opponent's copy goes into `opponentEventDataBuffer` (1006) and is released only when the session is not buffering events (1009-1025).

Followups (hold and possibly cancel). Playing a card that has a followup starts one (1978-1979, then 742-751): `followupActive` is set (745), event buffering starts (746), and the player whose turn it is, or the server, takes a full JSON snapshot (750). While it is open the opponent's events stay buffered. At the end of a step, if the first action has no valid followup, an end-followup action runs (1824-1826); otherwise stop-buffering runs once the queue is empty (1827-1829). A resign or end-turn action restores the snapshot and discards it (1965-1967, 807-830). A rollback request is ignored unless the source is authoritative or it is the player's turn (1544-1548). On reconnect, if the returning player owns an open followup, the server rolls back first (250-251); otherwise the other player gets the snapshot data (275-276).

The turn clock, per turn:
- Allowance. `MAX_TURN_TIME` = (90 + 2) s = 92 s (server 102; config 525, 527). If the game has more than 2 ended turns (803) and the player has taken no action since their previous turn started (817), the allowance is `MAX_TURN_TIME_INACTIVE` = (15 + 2) s = 17 s (103, 819). "Previous turn" is the last ended turn of that player: turns join the list only when they end (1324), and each turn's `createdAt` is set when it is built (gameTurn.coffee 19).
- Start. `restartTurnTimer` stamps `turnTimerStartedAt` with `Date.now()` (772) and starts a 1000 ms `setInterval` (773). It runs on each StartTurnAction (1225), when both players hold a starting hand (1230), and at game load (1131). The start of the turn is wall-clock time.
- Tick (`onGameTimeTick`, 791). Remaining = max(0, allowance minus (now minus turn start) plus bonus) (825). Then the bonus drains by the wall-clock time since the last tick, clamped at 0 (826). Because remaining comes from the wall clock, a late tick does not lose time. The bonus is credited +2000 ms per automatic step, unless a followup is open (1232-1238).
- Expiry (832). In the new-game state, each player without a starting hand gets a forced mulligan (836-842). In the active state, a forced end-turn runs (845-847). Otherwise the server sends `turn_time` to the whole room with `ceil(remaining / 1000)` (829, 851, 1052).
- Client display. The client subtracts the 2 s latency buffer before it shows the bar (`game.js` 732, fed from 441).

Other timers. When only one player is connected, a 60 s timer starts for the absent player (268, 718-720). On expiry, if that player is still absent, the server executes their resign (760). Spectators see the game 30 s late (1083, 909), flushed every 500 ms (862, 888).

## 2. Key functions

- `onGameEvent`: `/mnt/frankendom-donors/open-duelyst-duelyst/server/game.coffee` 465-523. Intake: stamp, deserialize, reset implied effects, re-execute.
- `restartTurnTimer` and `stopTurnTimer`: `/mnt/frankendom-donors/open-duelyst-duelyst/server/game.coffee` 767-784. Start the 1 Hz interval and stamp the start.
- `onGameTimeTick`: `/mnt/frankendom-donors/open-duelyst-duelyst/server/game.coffee` 791-851. Allowance selection, remaining time, bonus drain, expiry, `turn_time` event.
- `onStep`: `/mnt/frankendom-donors/open-duelyst-duelyst/server/game.coffee` 1203-1249. Broadcasts each signed step; restarts the clock on StartTurnAction; adds the automatic-step bonus; archives the game when it is over.
- `emitGameEvent`: `/mnt/frankendom-donors/open-duelyst-duelyst/server/game.coffee` 979-1061. Owner copy at once; opponent copy buffered and released when not buffering; room broadcast when there is no origin socket.
- `executeAction`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/gameSession.coffee` 1514-1621. Authoritative gate, validation, step build and signature, queue start.
- `validateAction` and `_updateStateAfterActionValidated`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/gameSession.coffee` 1943-1979. Validate event gate; resign and end-turn rollback; followup start.
- Followup and snapshot: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/gameSession.coffee` 742-751 (`_startFollowup`), 807-830 (`_rollbackToSnapshot`, `_discardRollbackSnapshot`).
- End of step: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/gameSession.coffee` 2080-2125 (`p_resolveStep` tail). Applies a requested rollback, or discards the snapshot, then starts the next turn.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Deadline = allowance minus wall-clock elapsed plus bonus, clamped at 0 | Active 90 s (config 525); idle 15 s (config 526); hidden grace 2 s (config 527; the server limit is the sum) |
| The viewer sees the limit minus the grace | 2.0 s (`game.js` 732) |
| Allowance drops after a turn with no action; only after more than 2 turns | 2 turns (803); 17 s total with grace (819) |
| Credit per automatic step, drained in real time, not while a followup is open | +2000 ms (1238) |
| Heartbeat of 1 Hz; whole seconds on the wire | 1000 ms (773); `ceil` (829) |
| Absent player forfeits after a grace period | 60000 ms (argument on line 720; too short to receipt, so the value is cited without a quote) |
| Spectators see events late, flushed on a short timer | 30000 ms delay (1083); 500 ms flush (862) |
| Step index increases by 1 to 100 per step | `1 + random * 100`, truncated (475). The reason is not stated in the code read. |

## 4. TypeScript sketch

simplified: keeps the donor order: stamp the actor's last action first, drop the client's implied effects, re-run and validate the explicit command on the server, then sign the step with the server clock. The clock keeps the donor's arithmetic (remaining computed before the bonus drains, grace included in the limit, whole seconds sent). It omits the spectator delay, the followup snapshot and rollback, the held opponent buffer, the disconnect auto-resign, the mulligan branch, the game-over archive, and the step index gap. The sketch's idle test uses the start of the player's previous turn, which matches the donor's `createdAt` comparison.

```ts
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
```

## 5. Lands in

- TARGET `src/fight/net-tick.ts` (new module): the server-side intake of explicit commands and the per-turn deadline clock, with the hidden grace. Shape only; the Pit client does not own any of it.
- Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget". The intake part is also row 5, but one row is named. The donor has no fixed step and no per-tick NPC budget, so only the intake and the deadline clock land here.
- Today: not checked against the Frankendom repo in this pass (no Frankendom file was opened), so no claim is made about where this would sit beside existing code.

## 6. Gaps and risks

- Turn-based donor, real-time target. Duelyst has turns; a fast duel does not. The 1 Hz clock and the 2 s grace transfer as a shape only. A duel would need a per-action or per-encounter deadline, and the unit (ms) must be fixed in the engine, not in the client.
- One-on-one only. The donor has two players. Nothing here covers many-on-one target choice, and MAX_ATTACKERS = 3 is not tested by this donor.
- The held opponent view and the followup snapshot are hidden-information and rollback tools. Our rulings have no hidden pending choice and one ledger, so both are rejected. Do not port the whole-session JSON snapshot: it is costly at real-time tick rates and makes a second copy of state.
- Server-verified intake: the donor re-runs the explicit command but does not, in the code read, check which player owns a step beyond the validators, which were not read. Frankendom must check ownership and the target in the engine itself, not rely on this donor.
- The donor's `desync` flag exists so a client can recover from a rejected command. It is set only when the owner is the current player with more than 2 s left (1270-1272). We need an equivalent rule for a real-time reject: clear the client's predicted hit and show the server result. Not read beyond line 1272.
- The 60 s absent-player auto-resign is a turn-game rule. If we adopt a forfeit, it must be a fight-end rule on the one ledger, not a timer in the duel loop. Death and respawn are row 17.
- The random step-index gap (+1 to +100) is not explained in the code read. Do not copy it without a stated reason.
- CC0-1.0: adaptation is allowed. This sketch is written from the mechanism and typechecks with `tsc --strict`; it is not a translation.
- Not verified: the validator modules, the client step-replay code, the disconnect handler body (526-573), and afterGameOver. Any claim about those is not made here.
