# pokerth-pokerth (anticheat-validation, cell 1)

Donor: `/mnt/frankendom-donors/pokerth-pokerth/src/net/servergamestate.cpp` | Licence: AGPL-3.0-or-later (per the file header, lines 6-8: "GNU Affero General Public License as ... version 3 ... or (at your option) any later version") | C++ | symbol `ServerGameStateWaitPlayerAction::InternalProcessPacket`

Best transferable idea: The server checks each client action in a fixed order (stale round, then wrong actor, then the rule), changes nothing on a reject, and replies with a reason code; a malformed frame is a separate, harsher tier that closes the session.
Decision (proposed): adapt - keep the order, the reason codes, the no-change-on-reject rule and the timeout default; do not copy the rewrite of the client's intent before the check (see section 6). Reason: a reason code on every rejected intent makes desync testable on both ends, which the duel needs for server-verified outcomes.
Acceptance: A server test sends a stale-round action, an action from the non-acting player and an illegal raise; each gets a reject with the matching code, the fight state is unchanged afterwards, and a schema-invalid frame closes the session.

Checked: Read in full: `InternalProcessPacket` 1664-1737 (the action path), `TimerTimeout` 1741-1764, `Enter` 1639-1650, `SendPlayerAction` 103-127, `LocalPlayer::checkMyAction` localplayer.cpp 1239-1289, `NetPacketValidator::ValidateMyActionRequestMessage` netpacketvalidator.cpp 730-742, the invalid-frame close in asioreceivebuffer.cpp 268-290, game_defs.h 143-147. Read in part: the packet dispatch `AbstractServerGameStateReceiving::ProcessPacket` 257-403 (the fall-through at 400-401). Callers: grep over src finds one call site of `checkMyAction` (servergamestate.cpp:1709). Confidence high for the action path. Not read: `PerformPlayerAction` and its other callers, the lobby sender `GetSender().Send`, what `getCurrentPlayer()` returns when nobody is due to act, and the lobby-side ban and login rate-limit code. Confidence medium for the claim that the server runs its engine on the local rule code (servergame.cpp:386 creates `LocalEngineFactory`; the rule code is `LocalPlayer`).

## 1. Mechanism

- One MyAction packet from one client is checked against the table only while the server is in the wait-for-action state (one player is due at a time). The check decides accept or reject. It runs once per client packet; there is no per-frame loop. The only time source is the action timer.
- Order of steps (as the code runs, `InternalProcessPacket` 1664-1737):
  (a) Lookup (1668-1675): the sender's session maps to a seated player. If there is none (a spectator), the function returns with no reply.
  (b) Stale-state check (1679-1680): the client's `gamestate` must equal the server's current round, else `ACTION_CODE_INVALID_STATE`.
  (c) Turn check (1685-1686): only if still valid, the seated player must be the player due to act, else `ACTION_CODE_NOT_YOUR_TURN`.
  (d) Fill-in and rewrite (1690-1704), unconditional, before the rule and whether or not the action is later accepted: a call with amount 0 becomes all-in when the highest set is at least the player's set plus cash, otherwise it becomes a call of (highest minus own set); a call whose amount equals the whole stack, where own set plus cash is at most the highest, becomes all-in (1702); an all-in with amount 0 takes the whole stack.
  (e) Rule (1709-1715), `checkMyAction` (localplayer.cpp 1239-1289): FOLD is always legal. CHECK only when own set equals the highest set. CALL only when own set is below the highest and the amount is within cash; the amount must be (highest minus own set) when the player can cover the call, or the whole stack when not. BET only with no open bet and an amount of at least 2 times the small blind and at most cash. RAISE only with an open bet, an amount of at least the minimum raise and at most cash. ALLIN only when the amount equals the whole stack. Any failure gives `ACTION_CODE_NOT_ALLOWED`.
  (f) Accept (1718-1722): mark the session active, mark the player's action as remote, perform the action, then move the state to Hand. This ends the wait.
  (g) Reject (1725-1736): a `YourActionRejectedMessage` carrying the game id, round, the action and bet (after the rewrite in d), and the reason code, sent to that session only. The state does not change, so the timer keeps running.
- Two tiers before the rule. Frame level: the packet validator (netpacketvalidator.cpp 730-742) requires a non-zero game id and hand number and a relative bet of at most 10,000,000; any frame that fails its validator, or has no validator, makes the receiver close the session (asioreceivebuffer.cpp 277-283). Rule level: the reject in (g).
- Timer: on entry (1639-1650), if the table's `playerActionTimeoutSec` is above 0, a timer runs for that many seconds plus 2 (the non-test value, line 81; the test define at line 62 is commented out). When it fires and the state is still this one (1743), the server acts for the player: CHECK if the player's set equals the highest set, otherwise FOLD (1751-1755), then moves to Hand. Zero means no timer.
- Negative amount (`SendPlayerAction` 121-126): a negative total bet is logged as CRITICAL and set to 0 before the action is sent to all players.

## 2. Key functions

- `ServerGameStateWaitPlayerAction::InternalProcessPacket`: `/mnt/frankendom-donors/pokerth-pokerth/src/net/servergamestate.cpp` 1660-1737 (validation, accept, reject).
- `ServerGameStateWaitPlayerAction::Enter`: same file, 1639-1650 (timer start).
- `ServerGameStateWaitPlayerAction::TimerTimeout`: same file, 1741-1764 (default action on expiry).
- `LocalPlayer::checkMyAction`: `/mnt/frankendom-donors/pokerth-pokerth/src/engine/local_engine/localplayer.cpp` 1239-1289 (the rule; returns 0 when legal, 1 when not).
- `NetPacketValidator::ValidateMyActionRequestMessage`: `/mnt/frankendom-donors/pokerth-pokerth/src/net/netpacketvalidator.cpp` 730-742 (frame bounds).
- Invalid frame close: `/mnt/frankendom-donors/pokerth-pokerth/src/net/asioreceivebuffer.cpp` 277-283.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stale round, then wrong actor, then rule; first failing check sets the reason; a reject changes nothing | Reason codes 0 (VALID), 1 (INVALID_STATE), 2 (NOT_YOUR_TURN), 3 (NOT_ALLOWED) (theirs, game_defs.h 144-147) |
| Action timer = table timeout plus a grace of 2 s | Grace 2 s, non-test build (theirs, servergamestate.cpp 81); table timeout `playerActionTimeoutSec` per game (1643) |
| Timeout default: check if nothing is owed, otherwise fold | None (1752-1755) |
| Opening bet must be at least 2 times the small blind | Factor 2 (theirs, localplayer.cpp 1267) |
| Frame bound on the amount | 10,000,000 (theirs, netpacketvalidator.cpp 737) |
| Negative amount clamped to 0 and logged | 0 (theirs, servergamestate.cpp 123-124) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (stale round, wrong actor, rule) and the reason codes, and returns IGNORED for a non-seated sender as the donor does (no reply). It deliberately does NOT rewrite the client's intent: it omits the donor's fill-in of an omitted call amount, the short-stack call to all-in, and the all-in amount fill (section 6, adapt). It also omits the reject message, the state change on accept, the session activity marking, the frame-level validator, and the timer wiring. Its `ruleOk` is the donor's `checkMyAction` shape, with the CALL branches written as one if/else (the two donor branches cover the same case when own set plus cash equals the highest set). Typechecked on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` (exit 0).

```ts
// Licence: AGPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Action = "fold" | "check" | "call" | "bet" | "raise" | "allin";
type Verdict = "VALID" | "INVALID_STATE" | "NOT_YOUR_TURN" | "NOT_ALLOWED" | "IGNORED";

interface Seat { id: number; set: number; cash: number; }
interface Table {
  round: number;      // the server's current betting round
  turnId: number;     // seat id whose turn it is
  highest: number;    // highest bet this round
  minRaise: number;
  blind: number;      // small blind
}
interface Intent { round: number; playerId: number; action: Action; bet: number; }

// The rule for one action (the donor's checkMyAction shape). bet is the amount the client sent.
function ruleOk(t: Table, s: Seat, a: Action, bet: number): boolean {
  switch (a) {
    case "fold": return true;
    case "check": return s.set === t.highest;
    case "call": {
      if (!(s.set < t.highest && bet <= s.cash)) return false;
      if (s.cash + s.set >= t.highest) return bet === t.highest - s.set; // not all-in
      return bet === s.cash;                                             // short stack: whole stack
    }
    case "bet": return t.highest === 0 && bet <= s.cash && bet >= 2 * t.blind;
    case "raise": return t.highest > 0 && bet >= t.minRaise && bet <= s.cash;
    case "allin": return bet === s.cash;
  }
}

// Order: stale round, then turn, then the rule. The intent is checked as sent and never rewritten.
// Only a VALID result may change table state; every other result is a reply with a reason and no change.
function validate(t: Table, seat: Seat | undefined, i: Intent): Verdict {
  if (!seat) return "IGNORED";                     // spectators: no reply, as in the donor
  if (i.round !== t.round) return "INVALID_STATE";
  if (i.playerId !== t.turnId) return "NOT_YOUR_TURN";
  if (!ruleOk(t, seat, i.action, i.bet)) return "NOT_ALLOWED";
  return "VALID";
}

// Timer expiry for the player on turn: check if nothing is owed, otherwise fold.
function onTimeout(t: Table, seat: Seat): Action {
  return t.highest === seat.set ? "check" : "fold";
}
```

## 5. Lands in

- TARGET `src/fight/intake.ts` (new module: validate one client intent against the fight state, reply with a reason, change nothing on reject). Parity-checklist row 5 (controls/input, intake), under the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3).
- Rows 18 and 19 do not fit: row 18 is the loot roll and XP award, row 19 is the fight record and replay. Row 5 is the closest, as the addendum names intake as row 5.
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later: clean-room, shape only)
- Brief rule served: 1 (one engine: the turn and rule checks live in the engine, the client only sends intents); server-verified kills (the outcome of an action is decided on the server before the fight step runs).

## 6. Gaps and risks

- AGPL-3.0-or-later: clean-room only. The sketch is written from the mechanism and is not a line-by-line translation.
- The donor rewrites the client's intent before the check (1690-1704) and echoes the rewritten action in the reject (1732). The reject therefore does not show what the client sent. Frankendom should keep the raw intent for the reply and for the log, and reject a call with a missing amount instead of filling it.
- A MyAction that arrives outside the wait state is dropped with no reply. Hand is a running state; its handler calls the base, which handles only ResetTimeout (servergamestate.cpp 993, 1035). The client never learns why. Frankendom needs a reason code for "wrong phase" as well.
- A reject is only a reply. There is no strike count, flag or ban signal on this path (1725-1736 read in full). The flag pipeline, if any, is elsewhere; the lobby ban manager and login rate limit were not read (servergamestate.cpp 315 and serverlobbythread.h 156 are only seen by name).
- The turn check dereferences `curPlayer` with no null check (1685). The timer path does check for null (1748-1749). Whether `getCurrentPlayer()` can return null in this state was not read.
- `CheckPlayerTimeouts` (1501-1512) is a no-op: its body is a comment and `(void)server;`, and the comment (1503) says idle detection moved to the session activity timer. Frankendom should keep one idle timer on the action wait, not a second check.
- The timeout default is a fold or a check, which is a poker rule. A duel needs its own default (for example a guard or a hold), chosen by the fight rules, not copied from here.
- Only one number bounds the frame (a relative bet of at most 10,000,000). There is no per-player rate limit on MyAction in this file (not read elsewhere). MAX_ATTACKERS = 3 has no counterpart here.
