# rathena-rathena (chat-social-moderation, cell 1)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/status.cpp` (with clif.cpp, pc.cpp, atcommand.cpp, channel.cpp, map.hpp, src/common/mmo.hpp, conf/battle/misc.conf) | Licence: GNU GPL v3 (LICENSE lines 1-2: "GNU GENERAL PUBLIC LICENSE" / "Version 3, 29 June 2007"; channel.hpp line 1 "Licensed under GNU GPL") | C++ | symbol `SC_NOCHAT` (manner system)

Checked: Read in full: SC_NOCHAT start (status.cpp 11138-11147), status_change_end reset (13658-13664), status_change_timer decay (14516-14525), chat restriction flag (5698-5706), chat gate in clif_process_message (clif.cpp 10556-10565), GlobalMessage (11511-11545), WisMessage gate and log (11861-11872) and ignore checks (11948-11968), client manner report (15029-15075), GM @mute and @mutearea (atcommand.cpp 7907-7945, 8811-8840), channel_send (channel.cpp 446-466), PK penalty (pc.cpp 9951-9955), SP_MANNER setter (pc.cpp 10568-10574), misc.conf 25-33. Confidence: high for the penalty path (every step above was opened). Medium for the chat-gate callers: clif_process_message is also called at clif.cpp 13974, 14590, 18516, 20656 (seen by grep, bodies not read). Not read: chat.cpp (chat rooms), the packet field layouts beyond the reads shown, the NOCHAT status packets, the login path beyond 10928. camera_scope: not a camera cell.

Best transferable idea: a chat penalty is one signed counter in minutes (negative = muted) that decays one minute per online minute, so "how long am I muted" is a single number that every penalty source writes to.
Decision (proposed): adapt - keep the signed-minutes counter and the decay; store it as a wall-clock expiry per character (one character, one ledger), and clamp it in server math.
Acceptance: a server test applies a 65535-minute penalty and asserts the stored penalty is clamped to the 14-day floor and the next chat line is refused; a 10-minute penalty lifts 10 wall-clock minutes later even if the player logs out in between.

## 1. Mechanism

The shape is one state field, not a table. `status.manner` is an int16 per character whose meaning is "minutes muted; each negative point is one minute" (src/common/mmo.hpp:577).

Order of steps, as the code runs:

(a) Penalty sources all write the same counter.
- PK kill with `pk_mode` bit 2: the killer's manner drops by 5, and if it is now below 0, SC_NOCHAT starts (pc.cpp 9951-9954).
- GM `@mute <minutes> <name>` (atcommand.cpp 7907-7945): caller group must be >= target group (7926). If current manner < minutes, manner -= minutes and SC_NOCHAT starts (7935-7937). Otherwise manner = 0 and SC_NOCHAT ends (7939-7943).
- `@mutearea <minutes>` (atcommand.cpp 8811-8840): every player in the AREA_SIZE box, except the caller and any player with a GM group level above 0, gets manner -= minutes (8826-8827). SC_NOCHAT starts if below 0 (8828-8829), otherwise it ends.
- Client manner report (clif.cpp 15029-15060): the client sends id, type and a 16-bit value (15043-15045). Type 0 (positive points) negates the value (15047-15048), so it reaches @mute as a negative number and removes penalty. Type 1 (negative points) sends the value as minutes. Both are run as the `@mute` command through is_atcommand (15059). Type 2 (self mute) returns early (15052-15053), see section 6.
- `/rc` (clif.cpp 15064-15075): @mute with a fixed 60 minutes (15073).

(b) Mute start. `sc_start(SC_NOCHAT)` sets the status tick to 60000 ms (status.cpp 11143) and sets `val1` to the `manner_system` bitmask (11144). Login re-applies the mute when manner is below 0 (clif.cpp 10928-10929).

(c) Decay. In status_change_timer, case SC_NOCHAT (status.cpp 14516-14522): each tick adds 1 to manner; while manner is still below 0 the timer is rescheduled for 60000 ms. When manner reaches 0 the status ends.

(d) End reset. If the NOCHAT timer ends while manner is still below 0, manner is set to 0 (status.cpp 13659-13660).

(e) Enforcement. The restriction flag is recomputed from the status (status.cpp 5702-5704: `if( ( sce.val1&MANNER_NOCHAT ) != 0 ){`, then restriction = true). The chat gate in clif_process_message refuses chat when `sd->sc.cant.chat` is set (clif.cpp 10559-10560). The bitmask bits are NOCHAT 1, NOSKILL 2, NOCOMMAND 4, NOITEM 8, NOROOM 16 (misc.conf 27-32; enum status.hpp 3067-3073). The shipped value 15 turns on chat, skill, command and item restrictions; rooms stay open (misc.conf 33). Commands are gated by the NOCOMMAND bit (atcommand.cpp 11965).

(f) Order inside the chat intake (clif_process_message, from 10442): packet and length checks (10532), then `is_atcommand` (10556), then the mute gate (10559), then the global `min_chat_delay` gap (10562-10565, silent drop).

(g) Separate per-channel gap. channel_send refuses a send when the sender's last send in that channel is less than `msg_delay` ago (channel.cpp 452), and sets the timestamp only on success (463). The owner sets the delay in whole seconds, range 0-10 (channel.cpp 1204-1216).

(h) Whisper-only ignore. If the target has ignoreAll and the sender's group is not above the target's, the whisper is refused (clif.cpp 11948-11950). Otherwise the target's per-name list is checked (11965-11968). The list holds 20 names (map.hpp:80).

(i) Logs. Global chat (clif.cpp 11543) and whispers (11872) call log_chat with the type, character id, account id, map, position, target name and message (src/map/log.cpp:450).

(j) No profanity filter in the core. A search of src/map, src/char and src/common for insult, badword and profan found only a comment about "manner.txt" at clif.cpp 2688.

## 2. Key functions

- SC_NOCHAT start: `/mnt/frankendom-donors/rathena-rathena/src/map/status.cpp` 11138-11147 (inside status_change_start_post_delay, which starts at 10310).
- SC_NOCHAT decay: same file, 14516-14525 (inside status_change_timer, which starts at 14131).
- SC_NOCHAT end reset: same file, 13658-13664 (inside status_change_end, which starts at 13430).
- Chat gate and intake: `/mnt/frankendom-donors/rathena-rathena/src/map/clif.cpp` 10442 (clif_process_message), gate 10556-10565; callers 11517 (global) and 11868 (whisper).
- GM @mute: `/mnt/frankendom-donors/rathena-rathena/src/map/atcommand.cpp` 7907-7945. Area mute 8815-8840.
- Client report: `/mnt/frankendom-donors/rathena-rathena/src/map/clif.cpp` 15035-15060 (clif_parse_GMReqNoChat), 15067-15075 (clif_parse_GMRc).
- PK penalty: `/mnt/frankendom-donors/rathena-rathena/src/map/pc.cpp` 9951-9955. SP_MANNER setter: pc.cpp 10568-10574.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (file:line) |
|---|---|
| Penalty counter in minutes, negative = muted | int16 field (src/common/mmo.hpp:577) |
| Decay 1 point per 60 s while the status timer runs | 60000 ms (status.cpp 11143, 14522) |
| PK penalty of 5 points per kill when pk_mode bit 2 is set | 5 (pc.cpp 9952), mode test (pc.cpp 9951) |
| Restriction bitmask (chat, skill, command, item, room) | manner_system 15 (misc.conf 33); bit values misc.conf 27-32 |
| Global chat gap | min_chat_delay default 0 (conf/battle/client.conf 14; battle.cpp 8612) |
| Per-channel send gap | 0-10 s, owner-set (channel.cpp 1204-1216) |
| Ignore list size | 20 (map.hpp:80) |
| Chat message cap | 255 bytes plus terminator (map.hpp:286; check at clif.cpp 10532) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's shape (one signed minutes counter, decay one minute per online minute, speech refused below zero, a separate channel send gap). It fixes the int16 wrap and the positive-standing inversion by clamping in plain number math to [floor, 0]. It omits the NOCHAT status object and its bitmask, the login re-apply, the PK hook, the GM and area commands, the client report packet and its group-level checks, the global min_chat_delay gap and the ignore list. Decay is a caller-supplied minute tick, not a timer. The floor (14 days) and the PK value are a Frankendom choice and a donor value respectively.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism (manner points as minutes of mute, decay while online), not a translation of the donor lines.
// Frankendom fix: the penalty is clamped in plain number math (no 16-bit wrap), a positive standing is capped at 0, and the minute tick only runs while the player is online.

interface MannerState {
  manner: number; // 0 = clean; negative = minutes still muted
}

const MANNER_FLOOR = -14 * 24 * 60; // fix: explicit floor (14 days in minutes) instead of the donor's int16 field
const PK_PENALTY = 5;                // donor pc.cpp:9952 value, kept as a data field

// Apply a chat penalty (positive minutes = mute more, negative = remove penalty).
// Result is always clamped to [FLOOR, 0]: a clean player never gains a positive standing here.
export function applyMannerDelta(s: MannerState, minutes: number): { muted: boolean; manner: number } {
  const next = s.manner - minutes;
  s.manner = Math.max(MANNER_FLOOR, Math.min(0, next));
  return { muted: s.manner < 0, manner: s.manner };
}

// Called once per online minute by the session timer. Logged-out time is not credited (no timestamp kept).
export function onOnlineMinute(s: MannerState): boolean {
  if (s.manner < 0) s.manner += 1;
  return s.manner < 0; // keep the timer while still muted
}

// Speech gate: a muted player is refused, and the caller shows the remaining minutes.
export function canSpeak(s: MannerState): boolean {
  return s.manner >= 0;
}

// Per-channel send gap. A refused send does not move lastSentMs (donor channel.cpp:452 and :463).
export function channelTooFast(lastSentMs: number, nowMs: number, delayMs: number): boolean {
  return delayMs > 0 && nowMs - lastSentMs < delayMs;
}

export const PK_PENALTY_MINUTES = PK_PENALTY;
export {};
```

## 5. Lands in

- TARGET `origins/server/chat-gate.ts` (new module): server-side speech gate and penalty counter, written through the writer (never direct DB). Decay runs only for online characters. Parity-checklist row 5 (controls/input, intake). The checklist has no chat or social row; row 5 is the nearest intake row. See ruling 3.
- today: not checked (no Frankendom chat code was opened for this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: rule 8 (one target module and one parity row), CT ruling (chat through the writer; mute tiers and durations), one character and one ledger.

## 6. Gaps and risks

- Int16 wrap. `manner` is int16 (mmo.hpp:577) and `@mute` subtracts an int32 (atcommand.cpp:7936). A client report can carry 65535 (clif.cpp 15045). Under two's-complement wrap, manner becomes +1 (reasoned from the types, not run). The mute still starts (sc_start at atcommand.cpp 7937), and the decay tick adds 1 and then does not reschedule because manner is no longer below 0 (status.cpp 14518-14522), so the mute should end at the first 60 s tick with a positive standing left behind. Fix in the sketch: clamp to a floor.
- Inverted check. @mute compares current manner with the requested minutes (atcommand.cpp 7935). The test is manner < minutes, so a player with a positive standing (reachable only through script SP_MANNER, pc.cpp 10568-10574) takes the else branch (atcommand.cpp 7939) only when the standing is >= the requested minutes (standing 10, mute 10): the standing is reset to 0 and no mute starts. With standing 5 and a 10-minute mute the mute does start (5-10 = -5), so the mute is also shorter than asked. Fix: always apply a positive minute request, then clamp.
- Self-mute is dead code. clif.cpp 15052-15053 returns for every type 2 request because the sanity check is commented out (15052). The comment at 15034 says "self mute (+10 minutes)". Fix: keep the id check and cap self mute at 10 minutes, or delete the branch.
- The client chooses the length. Type 1 value is client-supplied, with no cap in clif_parse_GMReqNoChat (15045, 15059). Frankendom must cap per report and must not let a report set the length (ruling 2).
- Who may report is delegated. The report reuses the `@mute` command through is_atcommand (15059-15062), so permission is whatever the command table grants the caller. The command table was not read.
- No per-reporter cooldown or dedupe is visible in the report path (15035-15062). This is an absence in the path read, not a full search.
- Logged-out time does not count. Decay runs on the session status timer, and login restarts the mute (clif.cpp 10928-10929). The donor stores no timestamp, so logging out does not reduce the penalty. Frankendom should use a wall-clock expiry.
- Command gate order. Commands are dispatched before the mute gate (clif.cpp 10556 before 10559). The NOCOMMAND bit covers commands (atcommand.cpp 11965), but only if manner_system includes bit 4; the shipped value 15 does.
- Shared intake. clif_process_message is also called by at least four other chat parsers (13974, 14590, 18516, 20656). Their bodies were not read, so their exact gates are unverified.
- GPL-3.0. Clean-room only. The sketch is a rewrite from the described mechanism, not a translation.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: rule 8 (target and parity row named); CT ruling 2026-10-12 (mute tiers and durations, chat through the writer).

As-data shape (PASS2 1):
- Donor data is code plus a config file, not a table. The penalty is a column: `char.manner` (int16 minutes, mmo.hpp:577). The restriction is a status record `SC_NOCHAT` with a `val1` bitmask and a 60000 ms tick (status.cpp 11138-11144).
- Row fields as the donor would express them: `character.manner: int16 (minutes, negative = muted)`; `restriction.bits: int (1 chat, 2 skill, 4 command, 8 item, 16 room)`; `channel.msg_delay_ms: uint16 (0-10000)`; `ignore[]: name, max 20 per character`.
- A new mute tier is one row: no. The 60000 ms tick (status.cpp:11143) and the -5 PK penalty (pc.cpp:9952) are code literals, and the bit meanings are code (status.hpp 3067-3073). Only the bitmask value is config (misc.conf:33).
- A new channel gap is one row: yes. channel.cpp 1204-1216 is owner data per channel.

Provenance per claim: every receipt in receipts.tsv names the donor file and line. Licence: GPL-3.0 (LICENSE lines 1-2), copyleft, so shape only.

What they patched later: no history available (no .git directory in /mnt/frankendom-donors/rathena-rathena). Hidden rules in comments: the self-mute comment at clif.cpp 15051 ("Disabled because clients keep self-muting ... [Skotlex]") is the only documented patch, and it is the change that left the branch dead. The tags "[Skotlex]" and "[Panikon]" (status.cpp 11140-11144) show authorship only.

Rulings for Dom:
1. Should a chat mute keep counting down while the player is logged out? rAthena: no (decay runs only online). Recommend: yes, a wall-clock expiry per character.
2. Can a report set the length of a mute? rAthena: yes, the reporter's value goes straight in (clif.cpp 15045). Recommend: no. Reports add to a count; a moderator picks the length from a fixed ladder (10 min, 1 h, 24 h, 7 d).
3. Add a chat and social row to the parity checklist (row 24)? The checklist has none, so these notes map to row 5 (intake). Recommend: yes.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Error: 'Inverted check' said any positive standing given a 10-minute mute takes the else branch; real test is manner < minutes (atcommand.cpp 7935), so that happens only when standing >= requested minutes. Corrected in section 6.
- Missed: none big; NOCOMMAND gate lives in is_atcommand, before cant.chat, so the stated order is right.

Fixed 2026-10-12: section 6 'Inverted check' now states the real manner < minutes condition (sketch code unchanged; its clamp still covers both cases).
