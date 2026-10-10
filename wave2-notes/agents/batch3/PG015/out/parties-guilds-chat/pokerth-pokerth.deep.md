# pokerth-pokerth (parties-guilds-chat, cell 1)

Donor: `/mnt/frankendom-donors/pokerth-pokerth/src/net/sessiondata.cpp` (limiter) with `/mnt/frankendom-donors/pokerth-pokerth/src/net/serverlobbythread.cpp` (chat handler) | Licence: AGPL-3.0-or-later (sessiondata.cpp header lines 3-8: "GNU Affero General Public License as published by the Free Software Foundation, either version 3 ... or (at your option) any later version"; COPYING is the AGPL v3 text) | C++ | symbol `SessionData::AcquireChatToken`, `ServerLobbyThread::HandleNetPacketChatRequest`

Checked: `SessionData::AcquireChatToken` (sessiondata.cpp 461-476) and the lobby branch of `HandleNetPacketChatRequest` (serverlobbythread.cpp 1785-1830) and the private-message branch (1852-1878) were read in full. Shadow-mute list load (serverbanmanager.cpp 62-66, 181-186) and the 10 s refresh timer (serverlobbythread.cpp 77, 2404-2410) were read. Confidence high on order and numbers. Not read: the client side of ChatRejectMessage (clientstate.cpp 1208 only seen as a dispatch line), the chat cleaner bot internals, and whether one player can hold two sessions at once (that decides whether the limit is per player or per connection). Topic search: grep for buddy, friend, guild, clan, party in pokerth src/net found no social system (only TCP keepalive comments); the closest party-formation code is game invitations (see section 6).


Best transferable idea: Gate every chat line on one per-player server budget, checked before any fan-out, and let a shadow mute echo the line to the sender only so the sender cannot tell.
Decision (proposed): adapt - keep the donor's order (budget, then mute, then fan-out), but use a sliding window or token bucket (the fixed window lets about 10 lines through at a boundary) and read the mute from the one ledger, not a 10 s database poll.
Acceptance: a server test sends 6 chat lines from one character within 1 s: 5 reach the room and the 6th returns a reject to the sender only; a shadow-muted character's lines reach only that character and still spend its budget.

## 1. Mechanism

- A chat flood gate that runs on the server before anything is fanned out. Each connection (a `SessionData`) gets a budget of chat lines per window. Lobby chat and private messages both draw from the same budget (serverlobbythread.cpp 1791, 1857).
- The window is 1 second and the budget is 5 lines (sessiondata.cpp 463, 467). When the window has run out, the call returns false and nothing increments the count (472-475).
- Order of steps for a lobby line (serverlobbythread.cpp 1785-1830):
  (a) Guest gate: only a session with player data that is not a guest may chat (1788-1789). Anything else falls through to the reject at the bottom of the function (1875-1878).
  (b) A line with no target game and no target player is lobby chat (1790).
  (c) Acquire the token. If there is none, send `ChatRejectMessage` back to the sender only, carrying the original text, and return (1791-1797).
  (d) Build the `ChatMessage` with the sender's unique id (1803-1806).
  (e) Shadow mute: if the sender's database id is on the shadow-mute list, send the line back to the sender only and return (1809-1816). This return also skips the chat cleaner and the Discord hook, so the bot never comments on lines nobody saw (the comment at 1810-1813 says so).
  (f) Broadcast to Established lobby sessions (1818), then to game, spectating and spectator-waiting sessions (1819).
  (g) Hand the text to the chat cleaner bot (1822) and the Discord webhook, if enabled.
- The shadow-mute list is a sorted vector of database ids (serverbanmanager.cpp 66), checked with `binary_search` (186). It is reloaded from the database by a timer that re-arms every 10 s (serverlobbythread.cpp 2409-2410; 77 gives the 10 s and its comment says a new or lifted mute may take that long to apply).
- Private messages use the same budget (1857). The bbcbot global-notice path (1852-1855) bypasses the budget entirely, but only for database admins (`isSenderAllowed`). Not copied here.

## 2. Key functions

- `SessionData::AcquireChatToken`: `/mnt/frankendom-donors/pokerth-pokerth/src/net/sessiondata.cpp` 461-476. Fixed-window counter under the session mutex. Restarts the window when 1 s has passed since the window start, then checks and increments.
- `ServerLobbyThread::HandleNetPacketChatRequest`, lobby branch: `/mnt/frankendom-donors/pokerth-pokerth/src/net/serverlobbythread.cpp` 1785-1830. Guest gate, token, shadow-mute echo, broadcast, chat cleaner.
- Same function, private-message branch: 1852-1871 (the `gn` admin bypass at 1852; the token at 1857; the send to the target at 1865). Reject fallthrough at 1873-1878.
- `ServerBanManager::IsShadowMuted`: `/mnt/frankendom-donors/pokerth-pokerth/src/net/serverbanmanager.cpp` 181-186. Returns false for an invalid id, otherwise `binary_search` on the sorted list.
- Shadow-mute refresh: `/mnt/frankendom-donors/pokerth-pokerth/src/net/serverlobbythread.cpp` 2404-2410. Timer callback asks the database for the muted list (2409), then re-arms itself (2410).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-connection budget checked before any fan-out | 5 lines per window (theirs, sessiondata.cpp 463) |
| Fixed window of one second, restarted on the first call after it expires | 1 s (theirs, sessiondata.cpp 467, `seconds(1)`) |
| Rejected lines are not counted and not broadcast; the sender gets its text back in a reject | No penalty, no kick, no cooldown (not present in the code read) |
| Shadow mute: the sender gets its own line, others do not; the mute still spends budget | Mute list refresh every 10 s (theirs, serverlobbythread.cpp 77) |
| Sorted id list plus binary search for the mute check | Mechanism only (serverbanmanager.cpp 66, 186) |

Fixed-window arithmetic from the code (inference, not measured): the window restarts on the first call at or after 1 s, so a sender can use 5 lines just before the boundary and 5 more just after it. That is up to 10 lines in a few milliseconds around the boundary.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (guest gate, budget, shadow-mute echo, broadcast) and the fixed window with the same numbers (5 per 1000 ms, a rejected call not counted). It omits the lobby versus private split, the bbcbot admin bypass, the chat cleaner and Discord hooks, the reject packet shape (it returns a kind instead of a message), the database refresh timer, and the mutex (single-threaded here). It uses an explicit `now` instead of `steady_clock`. It does not fix the fixed-window boundary burst; section 5 proposes that.

```ts
// Licence: AGPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ChatSession {
  isGuest: boolean;
  dbId: number;
  windowStart: number;  // ms timestamp of the current window
  windowCount: number;  // chat lines accepted in the current window
}

interface ChatPolicy {
  maxPerWindow: number;      // 5 lines per window
  windowMs: number;          // 1000 ms fixed window
  shadowMuted: Set<number>;  // database ids, refreshed from the database on a timer
}

type ChatOutcome =
  | { kind: "denied-guest" }
  | { kind: "reject-to-sender" }     // over the limit: sender gets a reject that carries the text back
  | { kind: "echo-to-sender" }       // shadow mute: only the sender sees the line
  | { kind: "broadcast" };           // every lobby session and game session gets the line

// Fixed-window token: the window restarts on the first call at or after windowMs has passed.
// Rejected calls do not count against the window.
function acquireChatToken(s: ChatSession, p: ChatPolicy, now: number): boolean {
  if (now - s.windowStart >= p.windowMs) {
    s.windowStart = now;
    s.windowCount = 0;
  }
  if (s.windowCount >= p.maxPerWindow) return false;
  s.windowCount += 1;
  return true;
}

// Lobby chat, in the donor's order: guest gate, token, shadow-mute echo, broadcast.
// A shadow-muted sender still spends a token, so a mute cannot be used to probe the limit for free.
function gateLobbyChat(s: ChatSession, p: ChatPolicy, now: number): ChatOutcome {
  if (s.isGuest) return { kind: "denied-guest" };
  if (!acquireChatToken(s, p, now)) return { kind: "reject-to-sender" };
  if (p.shadowMuted.has(s.dbId)) return { kind: "echo-to-sender" };
  return { kind: "broadcast" };
}

export {};
```

## 5. Lands in

- TARGET `origins/server/chat-gate.ts` (new, server side, the chat relay in the one engine's server). The gate runs on the server; the client only shows the reject. Not a fight module (no `src/fight/` file fits).
- Parity row: none fits. Chat is not in checklist rows 1-23. The closest row is 5 (controls/input intake), which covers player controls, not chat relay, so it is not used. Named plainly as a gap in the checklist.
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room, shape only)
- Brief rule served: server-verified state (the budget and mute decision are made on the server, before fan-out); the chat line is not a client-side rule.

## 6. Gaps and risks

- AGPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- The donor's window is fixed, so it allows a burst of up to 10 lines around a boundary (section 3). Frankendom should use a sliding window or a token bucket if it keeps the same numbers.
- The budget is per `SessionData` (per connection). The code read does not show whether one player can hold two sessions, so whether the limit is per player is not established. Frankendom has one character and one ledger, so the budget should be keyed on the character, not the socket.
- The shadow-mute list is refreshed from the database every 10 s, so a new mute can take up to 10 s to apply (the donor's own comment at 77). Frankendom should read the mute from the one ledger on each line, not from a poll.
- The bbcbot global-notice path (1852-1855) skips the budget for database admins. Frankendom should not copy that bypass; an admin notice should use the same gate.
- No penalty beyond the reject: no kick, no escalating mute, no cooldown. That is a design choice for Frankendom, not a gap in the donor.
- Party formation (the closest thing in this donor, not a full party system): invite-only games check a per-game invitation list on join (serverlobbythread.cpp 1742-1744, `IsPlayerInvited` in servergame.cpp 830-837); a player can reject an invitation and that removes it (1883-1896). Read only as far as these lines. Not written as a note.
- Presence: lobby join and leave are broadcast to all established and game sessions (serverlobbythread.cpp 619-629, `NotifyPlayerJoinedLobby` and `NotifyPlayerLeftLobby`). Not read beyond these two functions; no friend list or guild exists in this donor.
