# boardgameio-boardgame.io (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/boardgameio-boardgame.io/src/master/master.ts` (`onChatMessage`, 618-650), with `src/server/transport/socketio.ts`, `src/client/client.ts`, `src/server/auth.ts` and `src/master/filter-player-view.ts` | Licence: MIT (LICENSE line 3: "Copyright (c) 2017 The boardgame.io Authors.") | TypeScript | symbol `Master.onChatMessage`

Checked: Read `onChatMessage` (618-650) in full; the chat socket handler (socketio.ts 254-266) and the match broadcast (139-149, 155-161); the client send and receive (client.ts 336-343, 353-354, 401-403; transport socketio.ts 81-87); `filter-player-view.ts` lines 1-80 (the default branch at 73-74 is what chat takes); `auth.ts` from line 1 to the end of `authenticateCredentials`; the join route (api.ts 362-412) in full; `docs/documentation/chat.md` in full. Grep of `src/` and `packages/` (non-test) for guild, friend, party and invite: no hits. Not read: the leave routes (api.ts 419-459), `broadcastMatchData`, the create route, the storage adapters (whether a write is atomic), `redactLog`, and where `app.context.auth` is attached (server/index.ts line 118 builds `Auth`). Confidence: high on the chat relay (every step read); medium on the seat join (route read in full, storage behaviour not checked). Not a camera cell (`camera_scope` not applicable).

Best transferable idea: Relay a match chat message only after checking the claimed sender against that seat's own credential, then fan it out unchanged to everyone in the match without storing it.
Decision (proposed): adapt — The donor takes the author from the message body and checks it against a seat credential; Frankendom's server-verified rule needs the author bound to the server session instead, so keep the relay and the check but change where identity comes from. The donor has no guild, rank, friend or party code to reuse.
Acceptance: Server test: a message sent with another player's seat id is refused, a spectator send is refused, and the seat owner's message reaches every match client, spectators included, unchanged.

## 1. Mechanism

Chat is a per-match relay with no storage. It is the nearest thing to a party channel in this donor. There is no guild, rank, friend or invite code.

- Send: `sendChatMessage` builds `{ id: nanoid(7), sender: this.playerID, payload }` (client.ts 337-343) and emits `chat` with `[matchID, chatMessage, this.credentials]` (client transport socketio.ts 81-87).
- Receive on the server: the socket handler (socketio.ts 254-266) builds a `Master` for the match and calls `onChatMessage` with those three arguments. The chat handler does not call the match queue that the update path uses (socketio.ts 196-197).
- `onChatMessage` (master.ts 618-650), in order:
  1. If the server has an auth object (`this.auth`), read the match metadata (625-631).
  2. Refuse unless `chatMessage.sender` is a string (632-634; returns `unauthorized`).
  3. Ask `auth.authenticateCredentials` whether the claimed sender and the credentials sent with the call match (635-642). Refuse if not.
  4. `sendAll({ type: 'chat', args: [matchID, chatMessage] })` (645-648). The same object is relayed. No write.
- The credential check (`auth.ts`): `authenticateCredentials` returns true when the match has no seat with credentials (line 85, using `doesMatchRequireAuthentication`, line 47). When it applies, `areCredentialsAuthentic` refuses an empty credential (26) and otherwise requires equality with the seat's credential (28). If the host supplies its own `authenticateCredentials`, the check is always on (line 64).
- Fan-out: `sendAll` publishes on the match's channel (socketio.ts 155-161). The subscriber (139-149) sends every client in the match room `filterPlayerView(client.playerID, payload)`. For `chat`, the filter's default branch returns the payload unchanged (filter-player-view.ts 73-74), so every client in the room, spectators included, gets the same message.
- Client: `receive` on `chat` (client.ts 401-403) appends to `chatMessages` (353-354) and notifies subscribers. The list is in memory and is reset when the client is constructed (336).

Party formation (lobby join, api.ts 362-412), the closest thing to a party roster:

- A match has fixed seats in its metadata (`metadata.players[playerID]`). A join without a `playerID` takes the first seat with no name (379). A seat that already has a name is refused with 409 (392-394). The join writes the name (399), issues a new credential from `auth.generateCredentials` (400; the default is `nanoid()`, auth.ts 53-54), and saves the metadata (403). The credential is then the seat's only proof for chat and later actions.

## 2. Key functions

- `Master.onChatMessage`: `src/master/master.ts` 618-650. The whole relay: auth, sender check, credential check, fan-out.
- Chat socket handler: `src/server/transport/socketio.ts` 254-266 (`master.onChatMessage` call at 264).
- Match broadcast and subscriber: `src/server/transport/socketio.ts` 139-149; `createTransportAPI` and `sendAll` 155-161.
- Default credential check: `src/server/auth.ts` 22-29 (`areCredentialsAuthentic`); `authenticateCredentials` (lines 85-87).
- View filter default branch: `src/master/filter-player-view.ts` 73-74.
- Client send and receive: `src/client/client.ts` 336-343, 353-354, 401-403; transport `src/client/transport/socketio.ts` 81-87.
- Join route: `src/server/api.ts` 362-412.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Relay: the claimed author must match the author's own credential; refuse on empty or mismatch | Empty credential refused (auth.ts 26); equality (28) |
| Credential check only when some seat holds a credential | Rule (auth.ts 85); the host override forces it on (line 64) |
| Same message to everyone in the match, spectators included; no per-viewer redaction for chat | Default branch returns payload (filter 73-74) |
| Ephemeral: no write on relay; history lives only in each client's memory | Rule (master.ts 618-650; chat.md line 30) |
| Seat claim: first free seat; taken seat refused; new credential per claim | 409 for a taken seat (api.ts 392-394); credential is `nanoid()` (auth.ts 53-54) |

No tunable numbers: the 403, 409 and 'unauthorized' values are HTTP and error codes, not game values. `nanoid(7)` (client.ts 339) is a message id length, not a designer value.

## 4. TypeScript sketch

simplified: the sketch keeps the sender-versus-credential check, the auth-on gate, the "credential only when some seat holds one" rule, the fan-out to every listener and the in-memory client list. It omits the async metadata read and the storage layer, the socket, Koa and pub/sub layers, `nanoid`, the join route, the player-view hook (the sketch fans out the same object, which is what the default branch does for chat) and the host override that forces the check on (auth.ts line 64). The sketch takes `authEnabled` as an input (donor: `this.auth` is set). The donor reads `doesMatchRequireAuthentication` from metadata; the sketch reads the seats directly.

```ts
// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type PlayerID = string;

interface Seat {
  name?: string;
  credentials?: string;   // set when a player claims the seat; absent for an unclaimed seat
}

interface ChatMessage {
  id: string;
  sender: PlayerID;       // a claim made in the message body; the credential decides whether it holds
  payload: unknown;
}

type Outcome = { ok: true } | { ok: false; error: "unauthorized" };

interface Match {
  seats: Record<PlayerID, Seat>;
  listeners: Set<(msg: ChatMessage) => void>; // one fan-out list per match, spectators included
}

// authEnabled: the server has an auth object (donor: this.auth is set).
// Credentials are required only when some seat holds one (donor: shouldAuthenticate).
function relayChat(match: Match, msg: ChatMessage, credentials: string | undefined, authEnabled: boolean): Outcome {
  if (authEnabled) {
    // A multiplayer client with no playerID (a spectator) sends no string sender, so it is refused.
    if (typeof msg.sender !== "string") return { ok: false, error: "unauthorized" };
    const usesCredentials = Object.values(match.seats).some((s) => !!s.credentials);
    if (usesCredentials) {
      const seat = match.seats[msg.sender];
      const ok = !!credentials && !!seat && !!seat.credentials && credentials === seat.credentials;
      if (!ok) return { ok: false, error: "unauthorized" };
    }
  }
  // No storage write: the message is only fanned out.
  for (const send of match.listeners) send(msg);
  return { ok: true };
}

// Client side: an in-memory, append-only list; nothing is replayed on reconnect.
class ChatClient {
  chatMessages: ChatMessage[] = [];

  receive(msg: ChatMessage): void {
    this.chatMessages = [...this.chatMessages, msg];
  }
}
```

## 5. Lands in

- TARGET `origins/server/social-chat.ts` (new, proposed; not checked against the Frankendom repo). The same module as the cell 1 mute list.
- today: none checked in Frankendom.
- Parity row: 14 (HUD) is the closest, and only for the client chat list. The server relay and the seat claim fit no row in 1-23, so they have no parity row (none). Party formation has no row either.
- Reuse tag: adapt-allowed (MIT; the note and sketch are written from the mechanism, nothing is copied)
- Brief rule served: server-verified (the sender is checked against a server-held credential); one ledger (the relay keeps no second copy of the chat)

## 6. Gaps and risks

- Authorship is a claim in the body. The `sender` field comes from the client (client.ts 340). When no seat holds credentials, the check is skipped (auth.ts 85), so any client can send as any seat string. Frankendom must bind the author to the server session, not the message field.
- With the auth object absent, no check runs at all (master.ts 618-650 tests `this.auth` first). Whether the donor's server always has the object is not checked (server/index.ts line 118 builds `Auth`; where it is attached was not read). A spectator can send only in that case.
- History is lost on reload or late join (chat.md line 30). A guild chat that needs history needs a store, which is a separate decision.
- No rate limit or message length check was found in `onChatMessage` (618-650). I did not search the whole repo for one.
- Seat join: the route reads metadata, checks the name and writes (api.ts 362-412) with no lock or queue in the handler, unlike the socket update path (socketio.ts 196-197). Two joins to one seat at once depend on the storage layer's atomicity, which was not checked. Frankendom's one-ledger rule needs that check inside one transaction.
- The seat credential is `nanoid()` (auth.ts 53-54) and is the only proof of a seat. Frankendom should use its own session tokens; this donor has no session.
- A party here is a fixed seat set per match. There is no guild, rank, friend list or invite in this donor (grep of `src/` and `packages/`, non-test: no hits), so only the relay and seat-claim shapes transfer.

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: auth.ts line 10: doesMatchRequireAuthentication returns false when matchData is missing, so chat to an unknown matchID is relayed with no check; the join route also calls broadcastMatchData (api.ts 404) after saving, which pushes the roster to the room; the socket 'chat' handler does not await onChatMessage (socketio.ts 264), so a rejection is unhandled and the sender gets no error reply; trivial: the note says the credential is issued at 400; it is generated at 400 and assigned at 401
