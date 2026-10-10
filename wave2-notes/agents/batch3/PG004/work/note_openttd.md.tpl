# OpenTTD-OpenTTD (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/network/network_server.cpp` (symbols `NetworkServerSendChat`, `ServerNetworkGameSocketHandler::ReceiveClientChat`) with the client send path in `src/network/network_chat_gui.cpp` (`SendChat`) | Licence: GPL version 2 (exact header text, network_chat_gui.cpp 3: "as published by the Free Software Foundation, version 2."; no "or later" clause in the header read) | C++ | symbol `NetworkServerSendChat`

Checked: Read in full: `network_server.cpp` 1307-1415 (`NetworkServerSendChat`, all three destination branches) and 1432-1460 (`ReceiveClientChat`); `network_chat_gui.cpp` 250-267 (`SendChat`, the client send path). Hint file `network_chat_gui.cpp` (445 lines): the send path is read; the window and drawing code (35-245, 268-440) is not read in full (UI). Grep only: `network.cpp` 279 (echo caption), `network_gui.cpp` 1632 and 1710 (the UI passes the company or client id), `core/config.h` 59 (length), `network_server.cpp` 1149 and 1169 (company checks on the command path), `network_server.cpp` 1162, 2061, 2065, 2230 (server-made chat lines). Callers: `NetworkServerSendChat` is called from the receive handler (1453), from the local client send (265), and from server-made messages (grep). The "flood" or "spam" search found no chat limit in `src/network` (the one hit, `network_server.cpp` 1816, is a comment about a different path). Confidence: high on routing and the missing company check; medium on the absence of other checks, since the client socket `SendChat` and `NetworkAdminChat` (1036) were not read. Not a camera cell, so no camera_scope tag.

Best transferable idea: The server picks every chat recipient from a destination type (everyone, one company, one client), so the client never chooses who receives a line; a team line goes to the sender's team by server state, not by the id the packet carries.
Decision (proposed): adapt - adopt the three-route table and server-chosen recipients as the chat intake for parties and guilds; adapt the team id, which the donor takes from the packet, to come from the server's membership record.
Acceptance: A party member's party line reaches only authorised party members; a forged party id in the packet reaches nobody outside the sender's party (server test: a line from company 1 sent with team id 2 delivers to zero company-2 sockets); a private line reaches only the named authorised player.

## 1. Mechanism

- Client send (network_chat_gui.cpp 250-267): the action is chosen from the destination type (broadcast, team, client). A server-hosted client routes directly (`NetworkServerSendChat`, 265); a remote client sends the action, type, destination id and text to the server (263). The team destination's id is the company the UI passed in (network_gui.cpp 1632).
- Server receive (1432-1460): the packet is accepted only once the socket is past pre-active (1434). It reads the action, the destination type, the destination id (`dest`), the text cut to `NETWORK_CHAT_LENGTH` (1445; 900 bytes including the terminator, config.h 59) and a 64-bit data field (1446). Only the three chat actions are routed (1450-1453); any other action kicks the client (1456-1457).
- Route, private (1312-1351): if `dest` is the server, the line is shown locally, and copied to the admin network if that is enabled (1314-1322). Otherwise the server finds the one connection with that client id that is authorised, and sends to it only (1326-1331). The sender gets a self-flagged copy (1335-1349), which the client shows as a message "to" the other side (network.cpp 279).
- Route, team (1352-1397): every authorised connection whose company equals `dest` gets the line (1357-1364). The sender's own echo is suppressed if the sender was among those (1361). If the server's own company is `dest`, the admin network reads it too (1367-1369). If no connection matched, the route stops (1380).
- Route, broadcast (1402-1413): every authorised connection gets the line (1403-1405), then the admin network (1407), then the server's own display (1409-1412).

## 2. Key functions

- `NetworkServerSendChat`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/network/network_server.cpp` 1307-1415. The router: three branches, recipients chosen here.
- `ServerNetworkGameSocketHandler::ReceiveClientChat`: same file, 1432-1460. Accept, cut, route; unknown action kicks.
- `SendChat` (client): `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/network/network_chat_gui.cpp` 250-267. Maps the destination to the action and sends or routes locally.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Three routes: everyone, one team, one person; server picks the list | Team = company id; private = client id (theirs, network_server.cpp 1312, 1352, 1402) |
| Recipient must be authorised before a line is sent | Authorised status (theirs, 1327, 1359, 1404) |
| Sender's own echo is not sent twice | `show_local` flag (1354, 1361) |
| Length cap at receive | 900 bytes incl. terminator (theirs, core/config.h 59; read at network_server.cpp 1445) |
| Unknown action from a client drops the client | Error NotExpected (1457) |
| Admin copy of every routed line | Setting `server_admin_chat` for the private and team routes (1320, 1367); broadcast always (1407) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three routes and the authorised check, and returns the recipient ids and the cut text. It takes the team from the sender's server-side company, where the donor takes `dest` from the packet; a spectator (no company) gets no team delivery here, which the donor does not state. It counts characters where the donor counts bytes including the terminator. It omits the self-echo flag and its caption, the admin copy, the server's own display, the pre-active gate, and the unknown-action kick.

```ts
__SKETCH__
```

## 5. Lands in

- TARGET `origins/server/chat-routing.ts` (new): the server chat intake that picks recipients for party, guild and private lines. Parity-checklist row 5 (controls and input; the server-side intake sub-line): this is inbound intake. No row among 1-23 covers chat channels or party membership, so the channel rule has no row of its own. The Frankendom repo was not opened in this pass, so "today" is not read.
- Reuse tag: rewrite-from-idea (GPL version 2; clean-room only)
- Brief rule served: one engine (routing is server code); server-verified (recipients chosen on the server; the team id is not verified by the donor, see 6)

## 6. Gaps and risks

- Team id trust: `dest` for a team line comes from the packet (1441), and `ReceiveClientChat` passes it on without a company check (1453). The command path does check the sender's company (1149, 1169). So a client can post into another company's team chat by sending that company's id. Frankendom must take the party or guild from server state.
- No chat rate limit was found on this path (search above). Pair this route with a server window limit before use; the OpenRA cell in this batch has one.
- The length cap counts bytes, including the terminator (900). Frankendom counts characters at intake, with a test for multi-byte text.
- Private lines have no membership rule: any authorised client can message any other authorised client by id (1326-1331). Decide whether party-to-stranger private chat is allowed.
- The admin network copies broadcast lines (1407) and private or team lines when the server option is on (1320, 1367). A party or guild line copied to admin tools is a privacy decision, not a default.
- Unknown chat actions kick the client (1456-1457; the message text has a typo, "chact"). Keep this as a policy, not a silent drop.
- Not read: `ServerNetworkGameSocketHandler::SendChat` (client socket), `NetworkAdminChat` (network_admin.cpp 1036), the company join and creation flows (2061-2065, 2230) that set who is in which team, and the UI drawing in `network_chat_gui.cpp`.
