# OpenRCT2-OpenRCT2 (parties-guilds-chat, cell 18)

Donor: /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2-ui/interface/Chat.cpp | Licence: GPL-3.0 | C++ | symbol ChatDraw / ChatAvailable (input line 93 verified: `ChatDraw`)

## 1. Mechanism

- A chat box drawn over the game view for multiplayer. `ChatAvailable` (51-55) is true only when the network mode is not none, the status is connected, and the auth status is ok. `ChatDraw` (93-210) returns early and sets the open flag false when chat is unavailable (97-101).
- Input: the typed line (`ChatOpen` starts a platform text input session capped at 200 characters, 57-61), and a history deque of received lines with the tick time each arrived (35-36). `ChatAddHistory` (227-252) is the entry the network layer calls with a line: it prefixes a local `[HH:MM] ` timestamp, drops the oldest entry when the history already holds 10, pushes the new line at the front (newest first) with `Platform::GetTicks()`, appends to the chat log file, and plays a news sound. `ChatInput` (254-272) on send calls `Network::SendChat` with the line if non-empty, clears the line and closes. The server round trip itself is not in this file.
- Layout each draw: left is 10 px, right is the window width less 10 capped at 600, bottom is the window height less 45 (103-106). When the box is open its top is raised by the wrapped input height and by each non-empty history entry's wrapped height plus 5 (113-127). If that top is above 50 it is clamped to 50; otherwise, if the box is shorter than 150, the top is moved so the height is exactly 150 (131-139). Then the background and two inset panels are drawn (141-158).
- History draw (164-186): lines are drawn newest first from just above the input line, stepping up by each line's height plus 5, for at most 10 entries. If the box is closed, drawing stops at the first line older than 10 seconds (170-174). Drawing also stops when the next line would start above y = 50 (182), and `ChatHistoryDrawString` (291-313) skips a line whose top would be above 50 (299-302).
- Input line (188-209): only when open; drawn in a coloured outline style; the caret is a short bar drawn while the caret counter is below 15 and the line fits on one row (201).
- Caret: `ChatUpdate` (87-91) wraps a counter at 30 UI ticks, so the caret blinks.
- Output: draw calls and dirty-rectangle marks, plus history state changes in `ChatAddHistory`, a network send in `ChatInput`, and closing the box when chat becomes unavailable.

## 2. Key functions

- `ChatAvailable`, `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2-ui/interface/Chat.cpp`, lines 51-55. Network gate: mode, connected, authenticated.
- `ChatDraw`, same file, lines 93-210 (history loop 164-186). Layout, open or closed box, history expiry, input line.
- `ChatUpdate`, same file, lines 87-91 (the 30-tick caret). Caret counter only.
- `ChatOpen` and `ChatClose`, same file, lines 57-67 (`ChatToggle` follows at 69-79). Open flag and text input session start and stop.
- `ChatAddHistory`, same file, lines 227-252. Timestamp, 10-line cap, newest-first push.
- `ChatInput`, same file, lines 254-272. Send or close.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Gate the chat UI on the network session being live and authenticated | Three gate values: mode, connected, authenticated (theirs, lines 53-54) |
| Timed visibility: when the box is closed, show a line only for a window after it arrived | 10-second window (theirs, line 170); history size 10 and max length 200 (theirs, Chat.h lines 19 and 21) |
| Stack wrapped lines upward from the input line, with a minimum top | Padding 5 px (lines 126, 178), minimum top 50 (131, 182), minimum height 150 (135-138), max width 600 (Chat.h line 22) (theirs) |
| Caret counter wraps on a fixed tick count | 30 ticks (theirs, line 90; the caret shows below 15, line 201) |

## 4. TypeScript sketch

simplified: the sketch covers only the available gate, the closed-box expiry filter (as a filter over all lines, where the donor stops at the first expired line and caps at 10 entries), the caret counter and a box-top function. Omitted: ChatAddHistory (timestamp prefix, 10-entry cap, sound, log file), ChatInput send, the open/closed split in layout (the sketch's boxTop always grows upward, the donor only does so when open), the 150 minimum-height branch (donor takes it only when the top is not already clamped to 50), the second stop at y < 50, and all drawing. boxTop also starts from `bottom - inputHeight` where the donor starts from `bottom - 10` then subtracts the input height.

```ts
// Licence: GPL-3.0 - clean-room sketch, no lines translated
// Clean-room: a chat log shown only while the session is live, with lines fading out after a window when the box is closed.
type Line = { text: string; receivedAt: number };
type Session = { mode: 'none' | 'lan' | 'server'; connected: boolean; authed: boolean };

const SHOW_WINDOW_MS = 10_000; // lines are visible this long when the box is closed (theirs)
const CARET_TICKS = 30;

// Only a live, authenticated session shows chat.
function chatAvailable(s: Session): boolean {
  return s.mode !== 'none' && s.connected && s.authed;
}

// Lines to draw now: all lines when open, only recent ones when closed.
function visibleLines(history: Line[], open: boolean, now: number): Line[] {
  if (open) return history;
  return history.filter((l) => now - l.receivedAt <= SHOW_WINDOW_MS);
}

// Caret blink counter.
function nextCaret(ticks: number): number {
  return (ticks + 1) % CARET_TICKS;
}

// Box top: the box grows upward with each wrapped line, with a floor.
function boxTop(bottom: number, inputHeight: number, lineHeights: number[], minTop: number): number {
  let top = bottom - inputHeight;
  for (const h of lineHeights) top -= h + 5;
  return Math.max(minTop, top);
}
```

## 5. Lands in

- Frankendom target: NEW file `src/chat-ui.ts` (the client-side box, a display only) and NEW `origins/presence/social.ts` (the server side of speech); neither exists today. Chat is a later-phase feature; the presence service header (`origins/presence/server.ts` line 4, VPS snapshot /root/work-k7, not main) says speech arrives with its own PR.
- Parity-checklist row: none of rows 1 to 22 (row 14 is the fight HUD, which this is not). Feature-map section: `docs/specs/origins/one-shard.md` §6a (chat: server-side filter, mute and block, free text) and §1 (say 20 m, shout 40 m).
- Reuse tag: rewrite-from-idea (GPL-3.0, clean-room sketch only).
- Brief rule served: (category default, not per-cell) 10 (zone copies); rules 7-9 n/a

## 6. Gaps and risks

- The donor shows chat only when the network session is live (51-55). Frankendom chat must work in the Pit and zones, which are clients of one engine and one presence service; the gate belongs in one place.
- The history keeps only text and an arrival tick; there is no filter, mute, block or rate limit in this file. Frankendom's one-shard spec §6a puts the filter on the server because a client filter can be bypassed.
- The donor prefixes a local-time `[HH:MM]` stamp on the client (230-236) and uses the client tick clock for expiry (170). Frankendom must not use client-clock times for any server decision (server-verified).
- Line wrapping, caret and layout are display-only; nothing here can affect fight state or the ledger. MAX_ATTACKERS and the one-engine ruling are not touched.
- Not read: `Chat.h` beyond the three constants, the network-side `SendChat` and `AppendChatLog`, and `wrapString`.
