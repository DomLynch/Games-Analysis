# Facepunch-sbox-public (chat-social-moderation, cell 2)

Donor: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Engine/Systems/Chat/Chat.cs` | Licence: MIT (repo `LICENSE.md`, standard MIT text) | C# | symbol `Chat.OnHostReceive`

Checked: Read `Chat.cs` in full (319 lines: Say, Message, OnHostReceive, OnClientReceive, SanitizeMessage, DispatchSceneEvent). Read `Reports.cs` in full (61 lines). Read `Steam.cs` 102-132 (FilterChat and FilterText). Read `GlobalChatService.cs` 1-30, 55-75, 270-330 (send gate, receive, dedupe, add); `SaveHistory` (351-377) and the two limits (47-48) by grep only. `MenuChatChannel.cs` and `ChatComposer.razor.cs` by grep only. Confidence: high on the host intake path (read end to end). Medium on the menu chat (partly read). Not read: the rest of `MenuChatChannel.cs` (join and protocol), the native Steam filter, `IChatEvent` definition. Searched for mute, ban, kick, report, filter and moderation log: no moderation tooling in this repo beyond the report post and the Steam filter (grep, not exhaustive). Camera: not a camera cell.

Best transferable idea: Run chat through the host as the only writer: the host checks the rate window per connection, cleans and clamps the line, lets a scene hook suppress it or narrow the recipients, then broadcasts with an include filter, which is a ready shape for zone, party and whisper channels.
Decision (proposed): adapt. Keep the host intake and the recipient filter as the channel mechanism; change the receiver-only block list to a host-side block list and send a slow-down notice on a dropped line; do not use Steam's text filter, because Frankendom needs its own write-time blocklist (ruled).
Acceptance: A server test sends two lines from one connection 0.2 s apart: the first is broadcast; the second is refused and the sender gets a slow-down notice, not a silent drop. A whisper is delivered only to its target. A line from a user the receiver has blocked is not delivered to that receiver.

## 1. Mechanism

Host intake, `OnHostReceive` (Chat.cs 215-268), in order:
- (a) return if chat is disabled or the raw text is whitespace (217-218).
- (b) when the message has a source connection (`source is not null`, 220; this includes the host's own line, since Say passes Connection.Host), read that connection's last-talked timer (222). If it is under 0.66 s, return silently (223). Reset the timer (224).
- (c) clean the line (227): drop control, zero-width, bidi, line and paragraph separators and the BOM, then trim (`SanitizeMessage`, 184-210). If empty, return (228).
- (d) clamp to the project maximum length (230-231).
- (e) fire the scene event `IChatEvent` (239). It can suppress (241) or set a per-recipient filter (250).
- (f) broadcast to everyone, or with an include filter built from the event's recipient filter (250-254).
- (g) a dedicated server logs the line (257-259). Otherwise, for a client's line, the host filters its own local copy through Steam (263-264).

Client receive: `OnClientReceive` calls `Message` (273-277). `Message` drops a sender the receiving client has blocked, using the receiver's Steam friend record (79-81), then applies Steam's chat filter with the sender id (83), then fires the scene event (92-94), then logs (97) and the overlay event (99).

Send: `Say` (40-67) cleans and clamps, then sends `ChatMsg` to the host, or runs `OnHostReceive` directly when the caller is the host (53-66).

Menu global chat (`GlobalChatService.cs`):
- Send gate: `CanSend` needs 1 s since the last successful send (24, 55). The timer is set only after the channel accepts the payload (275-284).
- Receive: drops a sender the receiver has blocked (290). Drops a second message from the same sender within 0.5 s (291). Rejects text over 400 characters (308). Takes the sender id from the receiver's Steam record, not from the payload (300).
- Dedupe: by message id and sender (312, 321).
- History: 20 messages (47), a byte budget of 8,191 (48), trimmed from the oldest end until it fits (357-360). In memory the list is capped at 100 (326).

Reports (`Reports.cs`): `Post` sends a package id and a flag reason (52-56). The reason is one of eight flags, bits 0 to 7 (14-49). It is a content report about a package, not a player report. Exceptions are swallowed (58).

## 2. Key functions

- `Chat.Say`: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Engine/Systems/Chat/Chat.cs` 40-67.
- `Chat.OnHostReceive`: same file, 215-268. The intake.
- `Chat.SanitizeMessage`: same file, 184-210.
- `Chat.Message` (client): same file, 72-100.
- `Chat.DispatchSceneEvent`: same file, 282-288.
- `GlobalChatService.SendMessage` and `Receive`: `/mnt/frankendom-donors/Facepunch-sbox-public/game/addons/menu/Code/Multiplayer/GlobalChatService.cs` 270-286 and 288-306.
- `Reports.Post`: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Engine/Game/Services/Reports.cs` 52-58.

## 3. Numbers vs mechanism

| Reusable idea | Donor constant |
|---|---|
| Per-connection rate window | 0.66 s (Chat.cs 14) |
| Maximum line length | Project setting `ChatMaxMessageLength` (Chat.cs 29); default 255, editor range 32-256 (PlatformSettings.cs 42-43) |
| Menu send cooldown, per player | 1 s (GlobalChatService.cs 24) |
| Menu receive throttle, per sender | 0.5 s (GlobalChatService.cs 291) |
| Menu body cap | 400 characters (GlobalChatService.cs 308) |
| Shared history | 20 messages (47); 8,191 bytes (48) |
| In-memory list | 100 messages (326) |
| Report reasons | 8 flags, bits 0 to 7 (Reports.cs 14-49) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's clean-then-clamp order and the recipient filter, but checks the empty result before the timer (the donor sets the timer first, Chat.cs 224 before 228), starts the timer only for an accepted line, and adds a host-side block check. It returns an outcome instead of broadcasting. It omits the scene event object, Steam's filter, the log line, the party-invitation and history parts of menu chat, and the connection storage (here the timer is a field).

```ts
// Licence: MIT (donor LICENSE.md). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const RATE_LIMIT_S = 0.66; // donor value, Chat.cs line 14
const MAX_LEN = 255;       // donor default of the project setting ChatMaxMessageLength

interface Sender { id: string; lastSpokeAt: number | null; }

type Outcome =
  | { kind: "dropped"; reason: "empty" | "rate" }
  | { kind: "sent"; text: string; to: string[] };

// Strip control, zero-width, bidi and line-separator characters, then trim.
function clean(text: string): string {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (c <= 0x1f || c === 0x7f) continue;
    if (c >= 0x200b && c <= 0x200f) continue;
    if (c >= 0x202a && c <= 0x202e) continue;
    if (c === 0x2028 || c === 0x2029 || c === 0xfeff) continue;
    out += ch;
  }
  return out.trim();
}

// Host-side intake for one line. routeTo plays the role of the scene event's RecipientFilter
// (zone, party or whisper); blockedBy is the host-side block list the donor does not have.
function intake(
  sender: Sender,
  raw: string,
  now: number,
  members: string[],
  routeTo: (receiver: string) => boolean,
  blockedBy: (receiver: string, senderId: string) => boolean,
): Outcome {
  const cleaned = clean(raw);
  if (cleaned.length === 0) return { kind: "dropped", reason: "empty" }; // checked before the timer

  if (sender.lastSpokeAt !== null && now - sender.lastSpokeAt < RATE_LIMIT_S) {
    return { kind: "dropped", reason: "rate" };
  }
  sender.lastSpokeAt = now; // timer starts only for a line that is accepted

  const text = cleaned.length > MAX_LEN ? cleaned.slice(0, MAX_LEN) : cleaned;
  const to = members.filter(r => routeTo(r) && !blockedBy(r, sender.id));
  return { kind: "sent", text, to };
}

export {};
```

## 5. Lands in

- TARGET `origins/server/chat-intake.ts` (new, proposed): host-side intake for zone, party and whisper lines, with the rate window and block check. The client log is HUD.
- Parity-checklist row 14 (HUD, the Lead hint for chat): the chat log and bubbles. The server intake has no row of its own; this note does not claim the post-K server-tick sub-line for it.
- Reuse tag: adapt-allowed (MIT: code may be adapted; this sketch is clean-room).
- Brief rule served: 1 (one engine; chat goes through the server as the one writer); the server-verified rule. Rules 7-9 n/a.

## 6. Gaps and risks

- Defect (fix in sketch): the rate timer is set before the empty check (Chat.cs 224, then 227-228). A line of zero-width characters uses up the window and is then dropped. Fix: check after cleaning, and start the timer only for an accepted line.
- Defect (fix: slow-down notice): a line inside the rate window returns silently (Chat.cs 223), so the player never learns why. Fix: send a slow-down notice to that sender only.
- Gap: the donor's block check is on the receiver (Chat.cs 79-81, Steam friend record), and the host still broadcasts the line to everyone (250-254). Frankendom's server-verified rule needs the block applied on the host, in the recipient filter, as in the sketch.
- Gap: text filtering is Steam's native filter with the sender id (Chat.cs 83, 264; Steam.cs 107). Frankendom needs its own write-time blocklist (ruled); Steam's filter does not transfer.
- Defect: `Reports.Post` swallows every exception (Reports.cs 58), so a failed report looks sent. Fix: return the result and show the player a failure message.
- Note: a dedicated server logs the line text on its own (Chat.cs 257-259) without the Steam filter. Frankendom's moderation log should record the cleaned line, not the raw one.
- Gap: no chat mute, ban or moderation-log code was found in this repo. Kick code does exist but is not chat moderation: PartyRoom.Message.cs 29 `Kick(SteamId)` and `Connection.Kick("Unauthorized RPC")` in Rpc.StaticRpc.cs 22 and Rpc.InstanceRpc.cs 117, 168. Mute tiers, durations, child-safety defaults and friends lists are not covered here.
- Gap: menu history is stored in Steam lobby metadata with an 8 KB cap (GlobalChatService.cs 355-365). Frankendom has a server store; do not copy this.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Chat.cs (319 lines) path verified line by line: RateLimit 0.66 (14), sanitise ranges (184-210), whitespace/empty/clamp order, timer set at 224 before empty check at 228, RecipientFilter broadcast 250-254, dedicated-server log 257-259, host Steam filter 264, receiver block check 79-81. GlobalChatService numbers verified (1 s, 0.5 s, 400, 20, 8191, 100, dedupe, sender id from Friend). Reports.cs 8 flags and swallowed catch verified. Steam.cs FilterChat at 107. ERRORS: (1) Note says rate window applies 'for a client sender'; code is 'if (source is not null)' and Say passes Connection.Host for the host's own line, so the host is rate-limited too. (2) 'No mute, ban, kick ... found': PartyRoom.Message.cs:29 has Kick(SteamId) and Connection.Kick('Unauthorized RPC') is used in Rpc.StaticRpc.cs:22 / Rpc.InstanceRpc.cs:117,168 (not chat moderation, but kick code exists). (3) MaxMessageLength default is 255 (PlatformSettings.cs:43); note says value not read (honest, but easily readable).
Missed: ChatMaxMessageLength default 255 (engine/Sandbox.Engine/Systems/Project/ProjectSettings/PlatformSettings.cs:43).

Fixed 2026-10-12 (Sonnet fixer): rate window applies to the host too; max length default 255 (range 32-256) now stated; the no-kick claim narrowed to chat moderation with the kick code named. All verified. The sketch MAX_LEN changed from 200 to the donor default 255 (number only; typechecked).
