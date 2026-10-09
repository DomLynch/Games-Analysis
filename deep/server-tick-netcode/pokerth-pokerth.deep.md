# pokerth-pokerth (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/pokerth-pokerth/src/net/servergamestate.cpp` | Licence: AGPL-3 | C++ | symbol `ServerGameStateHand::EngineLoop / AbstractServerGameStateReceiving::ProcessPacket`

Checked: (verified: `ProcessPacket` at 257-403, `EngineLoop` at 1053-1276, `TimerLoop` at 1039-1050, `TimerComputerAction` at 1293-1310, `ServerGameStateWaitPlayerAction::InternalProcessPacket` at 1660-1738, `TimerTimeout` from 1741; all read). `ServerGame*::Enter` does not exist as written; the `Enter` methods are on each `ServerGameState*` subclass.

## 1. Mechanism

- The server game is a state machine. Each state (Init, StartGame, Hand and so on) has its own packet handler. `AbstractServerGameStateReceiving::ProcessPacket` (257-403) runs first for any packet: it resets the session's activity timer only for packets that count as client activity (259-261), delegates player-info, avatar and game-report requests to the lobby, handles leave, kick, vote-kick, subscriptions and avatar reports, and handles chat; anything else goes to the state's own `InternalProcessPacket` (401). A kick by an admin works only before the game runs, for the same game id, and not for ranked games (274-275). Starting a vote-kick is refused in ranked games (279); casting a vote is not restricted (283-285). Chat is rejected for guests; before the game starts it goes to the lobby chat; in a running game it needs the sender not muted and a chat token (rate limit, 303), a shadow-muted sender is echoed only to themself (315-317), and other text goes to players and spectators (318).
- The hand is timer driven. `ServerGameStateHand::TimerLoop` (1039-1050) calls `EngineLoop` (1053-1276) when a timer fires, only if the server is still in this state, and closes the game on an engine exception (1044-1048). `EngineLoop` advances the current betting round by one step (`switchRounds`, then the round's `run` unless all players are all-in, 1058-1062). When the round changes it deals the new cards after a delay (flop 5 s, turn 2 s, river 2 s, plus 2 s extra on all-in turn; `GetDealCardsDelaySec`, 1341-1360), or at all-in with 2 or more live players it first sends everyone's cards and waits `SERVER_SHOW_CARDS_DELAY_SEC` = 2 s (1073-1101). A round that goes backwards throws (1066-1067).
- When the hand continues, the engine broadcasts whose turn it is (1122-1128). If the seat is a computer, `TimerComputerAction` (1293-1310) fires after 2 s (`SERVER_COMPUTER_ACTION_DELAY_SEC`), the bot acts (`curPlayer->action()`, no validation), the action is broadcast and `EngineLoop` runs again. If the seat is a human who has left or is inactive, the server folds for them and loops again after 50 ms (1138-1146). Otherwise the server switches to state `ServerGameStateWaitPlayerAction` (1148).
- `WaitPlayerAction.InternalProcessPacket` (1660-1738): ignores action packets from non-players, then validates the action: the round must match (1679), it must be this player's turn (1684), omitted bet values are filled in and short-stack calls become all-in (1690-1705), and `checkMyAction` must pass (1708). A valid action is performed and the state returns to `Hand`; an invalid one gets a rejected message with the reason code (1724-1735). `TimerTimeout` (1741-) acts for a slow player: check if no bet is owed, otherwise fold.
- Hand end (1151-1274): the engine decides the winner (`postRiverRun`), the server sends hide-cards or show-cards end-of-hand packets, removes disconnected players (the one place this is done, 1230), updates rankings, and either starts the next hand state, or ends the game when one or no players have cash left.
- Errors in the engine remove all sessions from the game (close the table) in `TimerLoop` (1047), `TimerComputerAction` (1307) and `TimerTimeout`; `TimerShowCards` (1279-1290) has no handler.
- Inputs: packets and timers. Outputs: broadcast packets to players and spectators; state changes.
- Tick: one engine step per timer firing. No real-time per-frame update.

## 2. Key functions

- `AbstractServerGameStateReceiving::ProcessPacket`: `/mnt/frankendom-donors/pokerth-pokerth/src/net/servergamestate.cpp` lines 257-403. Per-packet router for any receiving state; activity timer, lobby delegation, kick, vote, chat.
- `ServerGameStateHand::TimerLoop`: `/mnt/frankendom-donors/pokerth-pokerth/src/net/servergamestate.cpp` lines 1039-1050. Timer entry; runs the engine step; on error closes the game.
- `ServerGameStateHand::EngineLoop`: `/mnt/frankendom-donors/pokerth-pokerth/src/net/servergamestate.cpp` lines 1053-1276. One betting step: round switch, card deal, all-in reveal, next-turn notice, bot action scheduling.
- `ServerGameStateHand::TimerComputerAction`: `/mnt/frankendom-donors/pokerth-pokerth/src/net/servergamestate.cpp` lines 1293-1310. Bot action, broadcast, next engine step.
- `ServerGameStateWaitPlayerAction::InternalProcessPacket` and `TimerTimeout`: same file lines 1660-1738 and 1741-1765. The server-side check of a player's action (round, turn, legality) and the act-for-the-player timeout.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| State machine: each state owns its packet handler; a shared router runs first | state set (theirs) |
| Timer-driven step: one engine step per firing; a human seat returns and waits | delays (theirs, lines 74-81): next game 10 s, flop 5 s, turn 2 s, river 2 s, all-in extra 2 s, show cards 2 s, bot action 2 s, loop delay 50 ms (line 91) |
| Server validates a player's action (right round, right turn, legal) and rejects with a reason | action codes (theirs) |
| Server acts for a slow player | timeout constant for the wait (theirs, not read) |
| Per-session activity timer, reset on client packets | `SERVER_VOTE_KICK_TIMEOUT_SEC` = 30 (theirs, line 90) |
| Rate-limited chat forwarding | rate limit (theirs, not read) |
| Error inside the engine closes the whole table | n/a |

## 4. TypeScript sketch

simplified: the sketch has no timers, no card deal or show-cards delays, no end-of-hand path, no timeout-acts-for-the-player rule, and no fold-for-absent-human rule (all in the donor). `acceptAction` stands in for the donor's three checks (round, turn, legality); `valid` is an input here, not computed.

```ts
// Licence: AGPL-3 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
type Phase = "lobby" | "deal" | "betting" | "showdown";
interface Seat { id: string; bot: boolean; folded: boolean; }
interface Table { phase: Phase; turn: number; seats: Seat[]; }

// Next seat that has not folded, after `from`.
function nextSeat(t: Table, from: number): number {
  for (let i = 1; i <= t.seats.length; i++) {
    const idx = (from + i) % t.seats.length;
    if (!t.seats[idx].folded) return idx;
  }
  return from;
}

// One engine step per timer firing. A human seat returns "waiting" and stays put.
function step(t: Table, botAct: (s: Seat) => void): "waiting" | "continue" | "done" {
  if (t.phase !== "betting") return "continue";
  const seat = t.seats[t.turn];
  if (seat.folded) { t.turn = nextSeat(t, t.turn); return "continue"; }
  if (!seat.bot) return "waiting";
  botAct(seat);
  t.turn = nextSeat(t, t.turn);
  const live = t.seats.filter(s => !s.folded).length;
  return live <= 1 ? "done" : "continue";
}

// A player's packet counts only in the phase and seat that expects it.
function acceptAction(t: Table, playerId: string, valid: boolean): boolean {
  const seat = t.seats[t.turn];
  return t.phase === "betting" && seat.id === playerId && !seat.bot && valid;
}

// Packets from any session reset its activity clock before routing.
function onPacket(session: { lastActive: number }, now: number): void {
  session.lastActive = now;
}
```

## 5. Lands in

- TARGET `src/fight/engine-state.ts` (new), the fight engine's server-side state machine under `src/fight/`: validate-then-apply for a client intent, and act-for-the-player on timeout. Parity-checklist row 18 (post-K item 3: server verdict) and row 4 (fight loop: aggro, chase, leash).
- today: no server-side turn state machine exists; the live duel handshake and driver are in `src/net/pvp.ts` and the server-side check is `src/net/verify-duel.ts`. (read in worktree `frankendom-combat-p3`, commit 6adcab27e). The fight loop is duplicated in Zone 1 and the origins (checklist row 4).
- Reuse tag: rewrite-from-idea
- Brief rule served: 2 (engage is a state change; kills server-verified); rules 7-9 n/a

## 6. Gaps and risks

- A card game. There is no movement, no area, no timing against a live opponent. Only the state machine and the turn-step pattern transfer.
- Hidden information is per seat: each player is sent only their own cards. That is a relevance rule the fight engine would need for hidden state (for example, a monster's aggro table), and it is not in these functions beyond the card reveal.
- Bot seats are driven by the same engine loop, the one-engine pattern. A player's action is validated in `WaitPlayerAction` (round, turn, legality) while a bot's action is not validated at all (`TimerComputerAction`). Frankendom's server-verified kills want the same check for both.
- The act-for-the-player timeout (check or fold) is a rule Frankendom would need for a client that stops sending; it has no meaning in a real-time fight beyond "idle intent".
- Errors close the whole table (all sessions removed). Frankendom's zones as data on one engine would need a narrower failure scope: one failed fight must not close the zone.
