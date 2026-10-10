# veloren-veloren (anticheat-validation, cell 2)

Donor: `/mnt/frankendom-donors/veloren-veloren/server/src/automod.rs` | Licence: GPL-3.0-or-later (per the workspace `Cargo.toml` line 34: `license = "GPL-3.0-or-later"`; automod.rs has no header of its own; the repo LICENSE file is the GPLv3 text) | Rust | symbol `AutoMod::validate_chat_msg` and `PlayerState::enforce_message_volume`

Best transferable idea: Keep a per-player time-decayed message rate, warn above 0.75 of the allowed band, and mute for 180 s above 1.0, with the mute refusal in the same call that updates the rate.
Decision (proposed): adapt - use the rate band for chat and social requests (trade invites, duel challenges, emotes), not for fight intents; a duel's attack cadence belongs to the fight state machine (stale round, turn, cooldowns). Reason: it gives a visible, timed consequence for spam at almost no cost, and it would wrongly punish a fast legitimate fighter if applied to attacks.
Acceptance: A server test sends one social message per second for 40 s; the player gets a warn note once the band is crossed, the message that crosses 1.0 is refused with the remaining mute time, a banned-word message is refused and leaves the rate unchanged, and a 30 s pause makes the next message a fresh rate.

Checked: Read in full: `server/src/automod.rs` (174 lines: `validate_chat_msg` 91-121, constants 127-133, `enforce_message_volume` 146-172, the `PlayerState` struct); the send gate in `server/src/state_ext.rs` 896-944 and 972-990 (the validator's only caller is 974); `server/src/settings/mod.rs` 118-156 (defaults). Read for the question "is there another rate limit?": `common/query_server/src/ratelimit.rs` (the cell's hint file, 85 lines, whole), `common/query_server/src/server.rs` 56-215, `server/src/lib.rs` 641-652, `common/query_server/src/proto.rs` 9-10. Confidence: high on the chat path (read the whole call chain). The rate arithmetic was re-run in node on the VPS with the same recurrence (not the Rust build). Not read: the censor crate and banned-word loading, `ActionErr::TooLong` template beyond its text, the client's handling of the CommandInfo and CommandError messages, the chat exporter. The hint file is a real rate limiter, but it is a UDP query-server limiter that a browser client cannot use; the chat band in automod.rs is the browser-relevant mechanism and is the subject of this note. The query limiter is covered in section 6.

## 1. Mechanism

- One chat message from one player is judged against that player's rate state. Event-driven: one call per message, the only clock is `Instant::now()` at the call. There is no per-frame loop.
- Order of steps (`validate_chat_msg`, 91-121):
  (a) Length: longer than the byte cap is refused with `TooLong` (100-101). No state change.
  (b) Bypass: if automod is off, or the chat is private, or the sender is an admin and admins are exempt, the message is allowed and the rate is not touched (103-107). Automod is off by default and admins are exempt by default (settings 151-152).
  (c) Banned word: `censor.check(msg)` refuses with `BannedWord` (109-110). The rate is not touched, because this check comes before step (d).
  (d) Rate update: `enforce_message_volume(now)` runs for every message that reaches this point, including messages that step (e) will refuse (112). Inside (146-169):
      - If a mute has ended, clear it (147-149).
      - If there was a previous message, `p = min(elapsed / 30 s, 1)` and `rate = rate * (1 - p) + (1 / elapsed) * p` (155-157). With no previous message, `rate = 0` (159).
      - Record `last_msg_time = now`.
      - `volume = max((rate - 1/30) / (1/5 - 1/30), 0)` (163-166). So volume is 0 at the slowest rate, 1.0 at one message per 5 s on average.
      - If `volume > 1.0` and no mute is running, set `muted_until = now + 180 s` (168-169).
  (e) Mute: if `muted_until` is set, refuse with `SpamMuted(remaining)` (114-115). The message that started the mute in (d) is refused here with the full 180 s.
  (f) Warn band: otherwise, if `volume > 0.75`, the message is allowed and the sender gets `SpamWarn` as a note (116-117).
  (g) Otherwise allowed with no note.
- Send gate (`state_ext.rs` 972-974): a message with a sender goes to recipients only if the validator returns true. A refusal sends a `CommandError` to the sender only (939-944). Server-generated messages with no sender skip the gate. Non-plain content from a client is refused (916-918).
- Steady-state values, from the same recurrence re-run in node on the VPS (not the Rust build): one message every 3 s gives volume 1.800; 4 s gives 1.300; 5 s gives 1.000; 6.3 s gives 0.752; 8 s gives 0.550; 10 s gives 0.400; 20 s gives 0.100; 40 s gives 0.000.

## 2. Key functions

- `AutoMod::validate_chat_msg`: `/mnt/frankendom-donors/veloren-veloren/server/src/automod.rs` 91-121 (the refusal order and the warn band).
- `PlayerState::enforce_message_volume`: same file, 146-172 (the decayed rate, the volume, and the mute start).
- Constants: same file, 127-133 (30 s period, 1 message per 5 s, 180 s mute).
- Send gate: `/mnt/frankendom-donors/veloren-veloren/server/src/state_ext.rs` 972-974 and refusal 939-944.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Time-decayed average of an event rate: weight `min(elapsed / T, 1)` on the new sample `1 / elapsed` | Period T = 30 s (theirs, automod.rs 127) |
| Normalise the rate between a minimum (1/T) and a maximum allowed rate | Maximum 1 message per 5 s (theirs, automod.rs 130); minimum 1/30 (163) |
| Warn band just under the mute line | 0.75 (theirs, automod.rs 116) |
| Mute line: volume above 1.0, set once | 1.0 (theirs, automod.rs 168) |
| Mute length, fixed at start | 180 s (theirs, automod.rs 133) |
| Refuse the banned word before the rate update, so a refused word does not raise the rate | Order only (automod.rs 109 before 112) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (banned word first with no rate change, then the rate update, then the mute check, then the warn band) and the same numbers. It omits the length check, the private-chat and admin bypass, the censor (the banned flag is an input), the note texts, and the CommandError send. It adds one guard the donor does not have: an elapsed time of zero is treated as 1 ms, because the donor divides by the elapsed time before multiplying it by zero (section 6). Typechecked on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` (exit 0).

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
const PERIOD_S = 30;          // averaging time constant
const MAX_RATE = 1 / 5;       // messages per second allowed on average
const MIN_RATE = 1 / PERIOD_S;
const WARN_LEVEL = 0.75;
const MUTE_LEVEL = 1.0;
const MUTE_MS = 180_000;

interface RateState { lastMs?: number; rate: number; mutedUntilMs?: number; }
type ChatVerdict =
  | { ok: true; warn: boolean }
  | { ok: false; reason: "muted"; remainMs: number }
  | { ok: false; reason: "banned" };

// Order: banned word first (the rate is not touched), then the rate update, then the mute check, then the warn band.
function judgeMessage(s: RateState, nowMs: number, banned: boolean): ChatVerdict {
  if (banned) return { ok: false, reason: "banned" };
  if (s.mutedUntilMs !== undefined && s.mutedUntilMs <= nowMs) s.mutedUntilMs = undefined;

  if (s.lastMs === undefined) {
    s.rate = 0;
  } else {
    const elapsedS = Math.max((nowMs - s.lastMs) / 1000, 0.001); // zero-gap guard (not in the donor)
    const p = Math.min(elapsedS / PERIOD_S, 1);
    s.rate = s.rate * (1 - p) + (1 / elapsedS) * p;
  }
  s.lastMs = nowMs;

  const volume = Math.max((s.rate - MIN_RATE) / (MAX_RATE - MIN_RATE), 0);
  if (volume > MUTE_LEVEL && s.mutedUntilMs === undefined) s.mutedUntilMs = nowMs + MUTE_MS;

  if (s.mutedUntilMs !== undefined) return { ok: false, reason: "muted", remainMs: s.mutedUntilMs - nowMs };
  return { ok: true, warn: volume > WARN_LEVEL };
}
```

## 5. Lands in

- TARGET `origins/server/chat-guard.ts` (new module: the rate band and the warn or mute verdict for chat and social requests, run at server intake before fan-out). Parity-checklist row 5 (controls and input: intake) is the closest of rows 1-23. No row covers chat. Rows 18 and 19 do not fit: row 18 is the loot roll and XP award, row 19 the fight record and replay.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later: clean-room, shape only)
- Brief rule served: one ledger (a mute and a warn are recorded as ledger rows, not kept only in memory; see section 6).

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the Rust.
- Zero elapsed time gives NaN (lines 155-157 and 166). If two messages from one player have the same `Instant`, `elapsed` is 0, `p` is 0, and `(1 / 0) * 0` is NaN, so `chat_volume` becomes NaN. In Rust `NaN.max(0.0)` is 0.0 (per the std docs for `f32::max`; not run), so volume reads 0. automod.rs never removes a player entry, so this would hold for the rest of the server run: a fail-open. The arithmetic was checked in node (`cv = 0.2`, `t = 0` gives `NaN`); the Rust build was not run. Low probability on fine clocks. Frankendom's version needs a minimum elapsed time, as the sketch has.
- Messages during a mute keep updating the rate (step d runs before the mute check, and the mute is not extended). So a player who keeps typing is muted again on the first message after the mute ends, unless a pause of about 30 s has reset the rate. This follows from reading the code; not run. Decide whether this is the penalty we want, and show it to the player.
- The state is in memory only: `AutoMod` holds a `HashMap<Uuid, PlayerState>` (the struct is defined above `validate_chat_msg`), and automod.rs has no write to storage. A restart clears every mute and rate. Frankendom's one-ledger rule means a mute or a warn must be a ledger row.
- A banned-word refusal leaves the rate unchanged (109 before 112). A player can try words without raising their rate. Low impact; decide whether that is wanted.
- Warn and refusal messages go to the sender only (`state_ext.rs` 930-944). Others learn nothing, which is the right default for a spam rule.
- Scope: this is chat. Fight intents need the fight state machine's own checks (stale round, turn, cooldown), not this band, which would punish a fast legitimate fighter. Row 5 is a stretch for chat.
- Query-server limiter (the cell's hint file, `common/query_server/src/ratelimit.rs`, read in full): four segments of 15 s (7, 15, 22). A request is refused when the total of the four segments, after this request's increment, is not below the limit (48-50), so in a steady window 119 of the configured 120 are accepted (the doc at line 22 says 120; this is derived by reading). A new address is accepted without the check (52-53). A refused request still counts. Segments rotate only in `maintain()`, which shifts once per call when more than 15 s have passed since the last shift, however long the silence (36-42, 60): old counts age with traffic, not with the clock. The caller (`common/query_server/src/server.rs`) answers a datagram whose token does not match with a challenge before the limiter sees it (188), counts only the echoed ones (203), and drops datagrams shorter than 256 bytes (131; `MAX_RESPONSE_SIZE = 256` in proto.rs 10), which bounds reflection. The limit 120 is set in `server/src/lib.rs` 641. It is UDP, so a browser cannot send it. The transferable parts are the segment counter and the challenge-before-count order, if Frankendom ever needs a request budget on its WebSocket or HTTP intake.
