# wesnoth-wesnoth (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/server/wesnothd/game.cpp` (with `src/server/wesnothd/server.cpp` 2212-2228) | Licence: GPL-2.0-or-later (game.cpp header: "either version 2 of the License, or (at your option) any later version"; COPYING is the GPL v2 text) | C++ | symbols `game::process_turn`, `game::is_muted_observer`, `game::is_legal_command`, `game::send_data_sides`, `game::controls_side`

Checked: Read in full: `game::process_turn` (975-1135, the chat part), `game::is_muted_observer` (170-181), `game::send_data_sides` and `game::controls_side` (1659-1685), `game::all_game_users` (1897-1905). Read in part: `game::is_legal_command` (905-945; the rest of it not read), `game::kick_member` (785-810), `game::mute_observer` (710-720). Callers read: `process_turn` has one caller, `server.cpp` 2212-2228 (a client `turn` message is handed to the game). Not read: `take_side`, `ban_user`, `send_chat_history`, the lobby chat code in `server.cpp`, client-side chat display. No friend-list or guild code found (grep of `src/server` for friend, guild, buddy: only C++ `friend` declarations). Confidence: high on chat routing as written; nothing was run. camera_scope: not a camera cell. The hint file (`server.cpp`) is the lobby entry point; the mechanism is in `game.cpp`.

## 1. Mechanism

Chat in a Wesnoth game is not a separate message. It rides inside the turn command stream, and the server routes it by channel. Order of steps for one incoming `turn` message (`process_turn`, `game.cpp` 975-1135):

1. The message is taken from the received document, `turn` (982). Each command is checked by `is_legal_command` (905-945): a `speak` command is always legal (940-941), so chat from any player or observer is accepted.
2. For a `speak` command, a repackage flag is set if the message has a target (`to_sides`) or if the sender is a muted observer (988, 1011-1013). The message is truncated (1017), and the server overwrites two fields so the sender cannot spoof them: the sender name is forced to the logged-in name (1021), and for a player the claimed side is checked (1024-1027); if the side is not the player's, it is replaced by the player's real side: for the current player, the current side (1028-1029); otherwise the first side the player owns (1030-1032).
3. If nothing needs repackaging (no target, sender not muted), the turn document is recorded and sent unchanged to all other game users (1091-1093). The recipients are all game users: players then observers (`all_game_users`, 1897-1905), minus the sender.
4. If repackaging, each speak is rebuilt as its own message (1116-1120). Then the channel decides:
   - Muted observer: any target other than the observer team is refused, and the sender gets "You have been muted, others can't see your message!" (1111-1112).
   - Empty target: send to all game users, minus the sender (1122-1123).
   - Observer team: send to observers only (1125-1126).
   - Side list: `send_data_sides` (1129, 1659-1670): recipients are the players, not observers, who control one of the listed sides. `controls_side` checks ownership by side index (1675-1680).
5. A muted observer's status: `is_muted_observer` (170-181) is true when the player is an observer and either the mute-all flag is on (176) or the player is in the muted list (180). Only the host can mute (`mute_observer` 710-713, and `kicker != owner_` for kick at 791).

Also in scope: a `turn` message reaching the server from a client is dispatched at `server.cpp` 2224-2228 to `process_turn`, which then re-syncs the lobby description.

## 2. Key functions

- `game::process_turn`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/server/wesnothd/game.cpp` 975-1135. Chat stamp, repackage flag, channel routing.
- Identity stamp, inside `process_turn`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/server/wesnothd/game.cpp` 1011-1046.
- Mute check: `game::is_muted_observer`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/server/wesnothd/game.cpp` 170-181.
- Side-targeted delivery: `game::send_data_sides` and `game::controls_side`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/server/wesnothd/game.cpp` 1659-1685.
- Legal-command gate: `game::is_legal_command`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/server/wesnothd/game.cpp` 905-945 (read in part).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Server overwrites sender name and side, so the client's claim is not trusted | Side numbers are 1-based on the wire, converted with `- 1` (`game.cpp` 1025) |
| Recipient set chosen by channel: all, observers, or the players who own listed sides | Observer team name is a `game_config` constant (value not read; `game.cpp` 1125) |
| Muted list checked by membership, with a mute-all flag short-circuit | No numbers; the mute-all flag is a boolean (176) |
| Targeted chat is copied per message and sent to its own recipients | None |

There are no timers, caps or counts in this path.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (stamp identity and side, then the mute rule, then recipients by channel). It replaces the donor's current-player rule for side correction with the first owned side only; the donor uses the current side when the sender is the current player (1028-1029). It omits the repackage shortcut (the donor forwards untargeted chat unchanged; the sketch always builds a message), message truncation, the `is_legal_command` gate and the rest of the turn, the observer-join and chat-history messages, and the wire format (the donor's `to_sides` is a string split into side numbers; the sketch takes an array of 0-based indexes). The observer channel name and the donor's `all_game_users` order (players then observers) are kept as data, not read from config.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type PlayerId = number;
type Channel = "all" | "observers" | number[]; // number[] = 0-based side indexes

interface ChatMsg { text: string; channel: Channel; side?: number }

interface RoomState {
  players: PlayerId[];              // join order
  observers: PlayerId[];
  sideOwner: (PlayerId | null)[];   // index = side, value = controlling player
  muted: Set<PlayerId>;             // muted observers
  muteAll: boolean;
}

type Route =
  | { ok: true; to: PlayerId[]; from: PlayerId; side: number | undefined; text: string }
  | { ok: false; error: string };

// One chat message. The server stamps who sent it and from which side, then picks recipients by channel.
function routeChat(room: RoomState, from: PlayerId, msg: ChatMsg): Route {
  // 1. Identity: the sender's name is always the logged-in one. A player's side is corrected if it is not theirs.
  let side: number | undefined = msg.side;
  if (room.players.includes(from)) {
    const idx = msg.side ?? -1;
    if (room.sideOwner[idx] !== from) side = room.sideOwner.indexOf(from); // -1 if the player owns no side
    if (side !== undefined && side < 0) side = undefined;
  }

  // 2. Mute: a muted observer may write only to the observer channel.
  const muted = room.observers.includes(from) && (room.muteAll || room.muted.has(from));
  if (muted && msg.channel !== "observers") {
    return { ok: false, error: "You have been muted, others can't see your message!" };
  }

  // 3. Recipients by channel, never including the sender.
  let to: PlayerId[];
  if (msg.channel === "all") {
    to = room.players.concat(room.observers);          // donor: all_game_users()
  } else if (msg.channel === "observers") {
    to = room.observers;
  } else {
    const sides: number[] = msg.channel;
    to = room.players.filter(p => sides.some(i => room.sideOwner[i] === p));
  }
  return { ok: true, to: to.filter(p => p !== from), from, side, text: msg.text };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 wesnoth-chat.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/chat.ts` (proposed new module; the path is not checked against the Frankendom repo). It holds the server's chat routing: stamp, mute check, recipient set by channel.
- Parity-checklist row: none. None of the 23 rows covers chat, channels or friend lists. Row 18 (loot roll and XP award) is the nearest only in that a party or group decides who hears team chat, and that is not what row 18 describes. Stated plainly: no row fits.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: server-verified state (the server, not the client, stamps identity and side on every chat message); one ledger for who may hear what.

Best transferable idea: the server stamps the sender's name and side on every chat message and picks recipients by channel (all, spectators, or the owners of listed sides), so a client cannot spoof identity or reach a channel it is not in.
Decision (proposed): adapt — take the stamp-and-route rule and the mute check as server logic in `origins/server/chat.ts`; do not copy the turn-stream embedding or the repackage shortcut, since Frankendom chat should be its own message type, not a game command.
Acceptance: A client sends a chat message claiming another player's name and a side it does not own; a server test asserts the delivered message carries the real name and the real side. A muted spectator's message to the team channel is refused with the donor's wording and reaches nobody.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Chat lives inside the turn command stream (`process_turn` 975; caller `server.cpp` 2224-2228). Frankendom's ruling is one engine with server-verified state; chat as a game command mixes two concerns. Keep chat as its own message type.
- The repackage flag (988, 1013) is a shortcut: untargeted, unmuted chat is forwarded as received, while targeted chat is rebuilt. Frankendom should route every chat message through one function, so the two paths cannot drift.
- Side correction (1028-1032) gives a current player their current side and other players their first owned side. A player who owns two sides always gets the first one stamped, unless they are the current player. Frankendom should use player ids, not side positions, as the sender identity.
- Mute and moderation are host-only (`mute_observer` 712-713; kick 791-792). The mute path (not read in full) does not show a moderator exemption in the lines read; kick and ban do (kick 805-806). Frankendom must decide whether a moderator can be muted.
- Host succession (`game.cpp` 1447-1530, not in this cell's note): when the host leaves before the game starts the game ends (1464); after start the first remaining player becomes host (1503), and the leaver's sides move to the host (1522). That is a party-leader rule worth a separate cell. Not written here.
- `players_` is in join order (constructor push, `add_player` push_back at 1374-1376), so "first remaining" means "earliest joined". Frankendom must choose the successor rule on purpose.
- Chat history and observer-join messages were not read; a late joiner's chat backlog policy is unknown.
