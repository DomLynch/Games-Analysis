# OpenRA-OpenRA (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Server/PlayerMessageTracker.cs` (flood gate, symbol `PlayerMessageTracker.IsPlayerAtFloodLimit`) with channel routing in `OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs` (`IngameChatLogic`, sender) and `OpenRA.Game/Network/UnitOrders.cs` (`UnitOrders.ProcessOrder`, case `"Chat"`, receiver) | Licence: GPL-3.0-or-later (per file header: "version 3 of the License, or (at your option) any later version"; COPYING is the GPLv3 text) | C# | symbol `IsPlayerAtFloodLimit`

Checked: Read end to end: the sender send path (IngameChatLogic.cs 1-200 and 240-262; line 357 read by grep only), the server chat case and relay (Server.cs 569-570, 853-862, 1015-1033), the flood gate (PlayerMessageTracker.cs 1-86, whole file), the receiver (UnitOrders.cs 48-169 and the DisableChatEntry case 78-90), settings (Settings.cs 160-171) and the connection clock (Connection.cs 34). The hint file `ChatCommands.cs` was read in full (63 lines): it is only a `/command` router, not the channel or flood mechanism. Callers: `IsPlayerAtFloodLimit` has one caller (Server.cs 1029), read. Confidence: high on the flood gate and the team-channel rules; medium on the admin flag (set at lobby join, Server.cs 550 seen by grep only). Not a camera cell, so no camera_scope tag.

Best transferable idea: Gate chat on the server with a sliding-window limit whose penalty holds the window full for a fixed time after the message that trips it, so spam control does not depend on the client.
Decision (proposed): adapt - the window-plus-penalty gate is the right shape for our server intake and is cheap to test, but we keep the recipient filter on the server: OpenRA broadcasts every chat line and filters on each receiver, which breaks our server-verified rule.
Acceptance: Five chat lines at t=0..4 s from one player; a server test asserts the sixth at t=6 s is dropped with about 13 s left, that no line is accepted before 19 s (15 s after the fifth), and that a party-only line is delivered only to party sockets (an outsider socket receives nothing).

## 1. Mechanism

- Three channels are chosen by the sender and carried as a number in the chat order: general (0), a team number (the sender's team), and a spectator channel (`uint.MaxValue`). The sender picks the channel from a mode toggle (IngameChatLogic.cs 144, 154-157). A local observer, or a local player who is defeated or has won, sends on the spectator channel (155).
- Team chat is offered only when it can work. It starts off unless the local player has a non-bot, non-noncombatant ally (71). The mode button greys out when the local player is the last living member of the team; the flag is set to true and never cleared (113-131). A defeated local player is moved to the spectator channel (120-124). Game over turns team chat off for good (138).
- Server intake (Server.cs 1027-1030): every `Chat` order first passes the flood gate (1029). If it passes, it is relayed unchanged to every other validated connection (1030, loop at 857-859). The server does not read the channel number or check team membership.
- Flood gate (PlayerMessageTracker.cs 42-84), per connection, runs in this order: (i) prune stamps older than the window (51); (ii) a non-admin is refused until the connection is 5 s old (56; the clock starts at connection creation, Connection.cs 34); (iii) if 5 stamps are already in the window, refuse and report when the oldest expires (64-68); (iv) otherwise stamp the message (71); (v) if that stamp makes 5, move all 5 stamps to the time of this message plus 10 s (76-78), and send the client a 15 s chat pause (80). Net effect: after the limit trips, the window stays full until 15 s after the fifth accepted message.
- Client pause (UnitOrders.cs 78-90): `DisableChatEntry` sets `ChatDisabledUntil = Game.RunTime + value` on the client clock at receipt (87), or to "until further notice" when the value is the max (85). Chat is enabled while `Game.RunTime >= ChatDisabledUntil` (IngameChatLogic.cs 357).
- Receiver (UnitOrders.cs 112-169): the text is cut to 2500 characters (119-121). General lines show to everyone, tagged `(Dead)`, `(Spectator)` or `(Ally)` (124-133). Spectator-channel lines show only to observers, and only when the sender is an observer or no longer in play (151-158). Team lines show only when the sender is alive and on the channel's team (161), and the local player is alive and on that team, or the world is a replay (162-165).
- Order of effects for one chat line: sender picks channel, team-availability gate, server flood gate, server relay to all, receiver filter and truncation. The filter that hides team text runs on the receiver, not on the server.

## 2. Key functions

- `PlayerMessageTracker.IsPlayerAtFloodLimit`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Server/PlayerMessageTracker.cs` 42-84. The whole flood gate: prune, join pause, window-full refusal, stamp, penalty push-out, UI pause.
- Penalty block inside it: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Server/PlayerMessageTracker.cs` 74-81 (`cooldownDelta = max(0, cooldown - interval)`; each stamp set to `time + cooldownDelta`; `DisableChatUI(conn, cooldown)`).
- Server chat case: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Server/Server.cs` 1027-1033 (gate then relay); relay loop `DispatchOrdersToClients` 853-862.
- Sender: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs` 61-138 (team availability and channel number), 142-180 (send, enter key), 357 (client pause check, grep only for the enclosing method).
- Receiver: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/UnitOrders.cs` 112-169 (`case "Chat"`: truncate, general, spectator, team filter).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sliding-window limit: at most N accepted messages in the last W ms; refuse and report the time until the oldest stamp leaves | N = 5, W = 5000 ms (theirs, Settings.cs 164, 167) |
| Penalty push-out: on the N-th accepted message, every stamp moves to that message's time plus (cooldown - W), so the window stays full until cooldown after the trigger | cooldown = 15000 ms (theirs, Settings.cs 170); delta = 10000 ms (derived, PlayerMessageTracker.cs 76) |
| Join pause for non-admins measured from connection creation | 5000 ms (theirs, Settings.cs 161; clock Connection.cs 34) |
| Channel number in the order: 0 general, team number, max value for spectators | `uint.MaxValue` for spectators (theirs, UnitOrders.cs 151) |
| Length cap, applied on receive | 2500 characters (theirs, UnitOrders.cs 22) |
| Team line visible only to live members of the channel's team | None (rule, UnitOrders.cs 161-165) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order inside the flood gate (prune, join pause, window-full refusal, stamp, penalty push-out, UI pause), and returns milliseconds where the donor returns whole seconds rounded up. It takes the admin flag as a parameter (the donor reads it from the client). It omits the lobby and replay paths, the general and spectator channel routing, the `(Dead)`, `(Spectator)` and `(Ally)` tags, the 2500-character cut and the client-side pause clock. `showTeamLine` covers only the team-line rule (UnitOrders.cs 161-165).

```ts
__SKETCH__
```

## 5. Lands in

- TARGET `origins/server/chat-intake.ts` (new): server intake for chat, run before any relay. Parity-checklist row 5 (controls and input; the server-side intake sub-line). Row 5 is the nearest fit because the flood gate is intake; none of rows 1-23 covers chat channels, so the team-channel rule has no row. The Frankendom repo was not opened in this pass, so "today" is not read.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: one engine (the intake gate is engine code, not a client throttle); server-verified (partly: the gate is server-side, the recipient filter is not, see 6)

## 6. Gaps and risks

- Recipient filter: the donor sends every team line to every connection and hides it on the receiver (Server.cs 1030; UnitOrders.cs 161-165). Under our server-verified ruling the server must resolve the party or guild recipient set and send only to them. Do not copy the broadcast.
- The server does not check the channel number or the sender's team (Server.cs 1027-1033 shows no check). A modified client can send any channel number. Frankendom's server must check membership before it stamps or routes the line.
- Length cap is enforced only on receive (UnitOrders.cs 119-121); the server relays the full string (Server.cs 1030). Frankendom must cap at intake, with a test.
- One ledger: the stamps live on the server, but the pause is a client countdown started at receipt (UnitOrders.cs 87), so it drifts by network delay. Frankendom should send the pause as an absolute server time, or accept an approximate countdown and say so.
- Team-chat availability (IngameChatLogic.cs 113-131, "alive" and "allied") is decided from client state. In Frankendom alive and party state must come from the server; the client should only grey out the box.
- Admin exemption (PlayerMessageTracker.cs 56): admins skip the join pause. Where the admin flag is set (Server.cs 550) was seen by grep only. Frankendom has no admin role in the duel, so only guild officers would need it.
- The flood gate applies to every chat line, including team lines (Server.cs 1029). There is no per-channel allowance; decide whether party chat should have its own window.
- Numbers are server settings (Settings.cs 161-170), not zone data. Keep them as engine constants unless a zone needs its own chat rules.
- Not read: the rest of IngameChatLogic.cs (201-239, 263-356, 358-387), LobbyLogic.cs chat send (grep only, around 551), TextNotificationsManager (muted players), any network frame size limit (the 2500-character cap is the only length check I read), and the lobby team command in LobbyCommands.cs 1055 (grep only).

Reuse tag and brief rule are repeated in section 5 for the example's layout.
