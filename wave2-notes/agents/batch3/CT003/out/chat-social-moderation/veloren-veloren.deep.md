# veloren-veloren (chat-social-moderation, cell 2)

Donor: `/mnt/frankendom-donors/veloren-veloren/server/src/automod.rs` (with `server/src/state_ext.rs`, `common/src/comp/chat.rs`, `server/src/settings/mod.rs`, `server/src/lib.rs`) | Licence: GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007 (LICENSE file, first lines read; clean-room, shape only) | Rust | symbol `AutoMod::validate_chat_msg` and `PlayerState::enforce_message_volume`

Checked: Read in full: `server/src/automod.rs` (1-174, the whole file). Read the caller `state_ext.rs` `validate_chat_msg` (896-947) and the routing in `send_chat` for the Say, Region, Tell and Kill branches (953-1075 in part; the Group, Faction, World and NPC branches after 1075 were not read). Read `common/src/comp/chat.rs` for the `ChatType` enum (93-130), `is_private` (184-200), the speech-bubble icons (277-300) and the constants (214-218). Read `settings/mod.rs` 120-155 and `lib.rs` 480-487. Not read: the `censor` crate's matching rules (external crate), `server/src/chat.rs`, `settings/banlist.rs` (1605 lines, grep only), the chat handler in `sys/msg/in_game.rs` (grep only). Confidence: high for the volume formula and the call order (the code is short and I read all of it, and the worked numbers below are from the same formula). Medium on one defect claim that depends on Rust's `f32::max` NaN rule, which I did not run (see section 6). The hand-worked numbers were re-run in a Python float32 emulation of the same formula, not in the Rust binary.

Best transferable idea: Keep one decayed chat-rate estimate per player: each line adds the same amount to a rate that decays between lines, the rate is rescaled so a warn band (note only) and a mute band (fixed timer) sit on it, and an admin exemption sits in front of both.

Decision (proposed): adapt — take the rate-with-decay gate and the warn-then-mute bands for chat intake; fix the zero-interval division, prune the per-player map, and do not exempt party and guild chat (the donor exempts them).
Acceptance: A server test sends 8 lines from one player at 100 ms spacing and asserts the 6th line carries a warning note and the 8th is refused with a 180 s mute; a line sent 0 ms after the previous one leaves the rate finite; and the first line sent after the 180 s mute ends (with no lines in between) is delivered with no note.

## 1. Mechanism

- Entry point: every chat line reaches `validate_chat_msg` in `state_ext.rs` (972-976) when it has a sender uid that resolves to an entity. A sender entity without a Client or a Player passes unchecked (906-911). Non-plain content from a client is refused (916-917). Lines with no sender uid are not checked (`is_none_or`, 972).
- Inside `AutoMod::validate_chat_msg` (automod.rs 91-122), in order: (a) length over 256 bytes is refused (100-101); (b) if automod is off, or the chat type is private (Tell, Group, Faction; `is_private` returns true), or the sender is an admin and `admins_exempt` is set, the line passes with no state change (102-108); (c) a banned word (censor check, 109-110) refuses the line before any state change; (d) otherwise `enforce_message_volume(now)` updates the rate (112); (e) if the player is muted (114-115), the line is refused with the remaining seconds; (f) if volume > 0.75 (116-117), the line passes with a `SpamWarn` note; (g) else it passes.
- The rate update, `enforce_message_volume` (automod.rs 146-172), in order: clear the mute if it has expired (147-149); if there was a previous line, let `dt` be the seconds since it, `p = min(dt / 30, 1)`, then `rate = rate * (1 - p) + (1 / dt) * p` (151-157); otherwise (first line) `rate = 0` (159); store the time of this line (161); `volume = max((rate - 1/30) / (1/5 - 1/30), 0)` (163-166); if volume > 1.0 and no mute is set, set `muted_until = now + 180 s` (168-169).
- Derived fact (from the update line 157): for gaps shorter than 30 s the term `(1/dt) * p` equals `1/30` exactly, so each line adds 1/30 to the rate and the rate decays between lines by the factor `(1 - dt/30)`. The rate is therefore a decayed count of recent lines divided by 30. The steady state for lines every `d` seconds is `rate = 1/d`, so `volume = 1` at `d = 5 s` and `volume = 0.75` at about `d = 6.3 s`.
- Worked numbers (hand-derived from the formula; re-run in a Python float32 emulation of the same update, not the Rust binary): 12 lines at 100 ms spacing. Volume is 0.199 at line 3, 0.793 at line 6 (warn fires, t = 0.5 s), 0.990 at line 7, and 1.186 at line 8 (mute starts, t = 0.7 s, for 180 s). The rate climbs slowly from zero, so a steady 5 s interval does not reach volume 1.0 in the first 6 lines; it approaches it over about 30 s.
- Mute behaviour: the mute is set once (168) and its end is never extended. Lines sent while muted still run the rate update (112 runs before the mute check at 114), so a player who keeps sending during a mute raises the rate. The first line after expiry can then re-trigger the mute at once if the volume is still above 1.0 (from reading 146-170 and 112-116; not run).
- Delivery by range (state_ext.rs 1049-1072): Say reaches clients whose position is inside `SAY_DISTANCE` (100) of the speaker, using a squared-distance test (953-954); Region uses `REGION_DISTANCE` (1000) (1067). Tell goes to the two parties only (994-1001). Kill messages are sent to the group and nearby players only when more clients are online than `max_player_for_kill_broadcast` (1006-1011; the setting's value was not read).
- Speech bubbles: each chat type maps to a bubble icon (`icon`, comp/chat.rs 282-300; Tell at 291). Meta, kill and online lines get no bubble.
- Config: `automod` defaults to off and `admins_exempt` to on (settings/mod.rs 151-152). Banned words are loaded from data files (settings/mod.rs 130-143) into one `Censor::Custom` set shared by the censor and the automod (lib.rs 480-487).
- Tick: none of this is tick-driven. It is called per line with `Instant::now()` (state_ext.rs 926), so the rate is wall-clock and event-driven, not a fixed step.

## 2. Key functions

- `enforce_message_volume` (the rate estimator and mute start): `/mnt/frankendom-donors/veloren-veloren/server/src/automod.rs` 146-172.
- `validate_chat_msg` (order of checks and the warn and mute bands): `/mnt/frankendom-donors/veloren-veloren/server/src/automod.rs` 91-122.
- Constants: `/mnt/frankendom-donors/veloren-veloren/server/src/automod.rs` 127-133.
- Caller and sender check: `/mnt/frankendom-donors/veloren-veloren/server/src/state_ext.rs` 896-947 (sender gate, error back to the sender), and 972-976 (the call from `send_chat`).
- Range delivery: `/mnt/frankendom-donors/veloren-veloren/server/src/state_ext.rs` 953-954 (the squared-distance test), 1049-1072 (Say and Region).

## 3. Numbers vs mechanism

| Reusable rule | Donor constant (where) |
|---|---|
| Decay period of the rate | 30 s (automod.rs 127) |
| Full-volume rate (volume 1.0) | one line per 5 s on average (automod.rs 130) |
| Zero-volume rate | one line per 30 s (automod.rs 163) |
| Warn band | volume > 0.75, note only (automod.rs 116) |
| Mute band | volume > 1.0, starts a fixed mute (automod.rs 168) |
| Mute length | 180 s (automod.rs 133) |
| Line length cap | 256 bytes (comp/chat.rs 214; bytes, TODO at automod.rs 99) |
| Say range | 100 units, squared test (comp/chat.rs 218; state_ext.rs 954) |
| Region range | 1000 units (comp/chat.rs 217) |
| Automod default | off (settings/mod.rs 151); admins exempt on (152) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one line (expire the mute, update the rate, set the mute if volume > 1, then return mute or warn). It adds the admin exemption as a flag from the caller and the zero-interval guard (MIN_DT_S), which is the fix. It omits the length cap (bytes), the banned-word check (the censor crate was not read), the chat-type exemption (the caller decides), the warning text, and the map of players (the state is passed in). The constants are the donor's except the 0.05 s guard, which is my fix.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
const CHAT_VOLUME_PERIOD_S = 30;     // decay time constant of the rate estimate
const MAX_AVG_MSG_PER_S = 1 / 5;     // a steady rate of this value reads as volume 1.0
const MIN_LEVEL = 1 / CHAT_VOLUME_PERIOD_S;
const WARN_AT = 0.75;                // volume above this: warning note, line still sent
const MUTE_AT = 1.0;                 // volume above this: mute starts
const MUTE_MS = 180000;              // fixed mute length from the trigger
const MIN_DT_S = 0.05;               // fix: two lines with the same timestamp must not divide by zero

interface RateState {
  lastMsgMs: number | null;
  rate: number;                      // about messages per second, decayed
  mutedUntilMs: number | null;
}

type Gate =
  | { ok: true; note?: 'warn' }
  | { ok: false; reason: 'muted'; remainingMs: number };

function volumeOf(rate: number): number {
  return Math.max((rate - MIN_LEVEL) / (MAX_AVG_MSG_PER_S - MIN_LEVEL), 0);
}

// One chat line through the spam gate. Admin exemption is decided by the caller (passed as exempt).
function spamGate(s: RateState, nowMs: number, exempt: boolean): Gate {
  if (exempt) return { ok: true };
  if (s.mutedUntilMs !== null && s.mutedUntilMs <= nowMs) s.mutedUntilMs = null;

  if (s.lastMsgMs === null) {
    s.rate = 0;
  } else {
    const dt = Math.max((nowMs - s.lastMsgMs) / 1000, MIN_DT_S);
    const p = Math.min(dt / CHAT_VOLUME_PERIOD_S, 1);
    s.rate = s.rate * (1 - p) + (1 / dt) * p;
  }
  s.lastMsgMs = nowMs;

  const volume = volumeOf(s.rate);
  if (volume > MUTE_AT && s.mutedUntilMs === null) s.mutedUntilMs = nowMs + MUTE_MS;

  if (s.mutedUntilMs !== null) return { ok: false, reason: 'muted', remainingMs: s.mutedUntilMs - nowMs };
  if (volume > WARN_AT) return { ok: true, note: 'warn' };
  return { ok: true };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ct003-veloren-automod-gate.ts`, exit 0 (TSC_OK).

## 5. Lands in

- TARGET `origins/server/chat-gate.ts` (proposed; same module as cell 1, the chat intake gate). It runs in the writer before a chat line is routed, so the rate state is server-side and never client-trusted.
- Parity-checklist row 5 (controls/input, the intake rule). No row of the 23 covers chat; row 5 is the nearest. The sub-line "server tick: fixed step, input intake, per-tick NPC budget" is not used here because this gate is event-driven (wall clock per line), not per tick.
- Reuse tag: adapt-idea (GPL-3.0: clean-room only; the sketch is written from the mechanism)
- Brief rule served: Strategy CT rulings (spam limits; chat through the writer; mute tiers and durations); addendum rule "keep the idea, fix the defect".

## 6. Gaps and risks

- Defect, fix: a zero interval divides by zero. `(1.0 / time_since_last)` (automod.rs 157) is `inf` when two lines have the same instant, and `inf * 0` is NaN. The rate then stays NaN for that player, and `max(0.0)` on the volume (166) returns 0.0 for NaN in Rust (rule from the `f32::max` docs, not run), so that player is never warned or muted again in the session. Reachable only when `Instant::now()` gives equal values for two lines (state_ext.rs 926), so it is latent on a fine clock and more likely on a coarse one. Fix: clamp dt to a floor (the sketch's MIN_DT_S), and add a test.
- Defect, fix: the per-player map is never pruned (`players: HashMap<Uuid, PlayerState>`, automod.rs 60; `entry(...).or_default()` at 88; no removal found by grep). Memory grows for every account that ever chatted. Fix: drop the entry on logout.
- Gap: group and faction chat are private in this donor (`is_private` true, comp/chat.rs 197), so the gate skips them (automod.rs 104). One member can spam a group or guild channel with no check. Fix: run the gate on party and guild lines too, with the same bands.
- Gap: the 256 limit counts bytes (automod.rs 99, with a TODO to count graphemes). Fix: count code points or graphemes for the limit.
- Gap: a line with no sender uid skips the gate (state_ext.rs 972). Fine for server notices; the writer must not let a client forge a sender uid.
- Tuning, not a defect: 8 lines at 100 ms spacing mute the sender for 180 s (see section 1). Frankendom should treat the 30 s period, the 0.75 and 1.0 bands and the 180 s mute as data to tune, not constants.
- Tuning: the mute is not extended while the sender keeps typing, and the first line after expiry can re-trigger it (section 1). Decide whether the mute should decay the rate itself.
- Frankendom ruling gap: the donor's range chat (Say 100, Region 1000) is distance-scoped in the server fan-out. Frankendom's zone channel is the same idea (interest by zone), but there is no row for it in the 23-row checklist.
- Not in the donor, as read: a child-safety default, a write-time display-name blocklist (this filters outgoing chat text only), emotes, a friends list (not in these files), and a report path (the chat files do not show one; grep only). The banned-word data files and the censor crate's matching are (not read).

Reuse tag: adapt-idea (GPL-3.0: clean-room only; the sketch is written from the mechanism)
Brief rule served: Strategy CT rulings (spam limits; chat through the writer; mute tiers and durations); addendum rule "keep the idea, fix the defect".
