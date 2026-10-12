# evennia-evennia (chat-social-moderation, cell 35)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/server/portal/portalsessionhandler.py` 396-456 (method `PortalSessionHandler.data_in`) | Licence: BSD-3-Clause (`/mnt/frankendom-donors/evennia-evennia/LICENSE.txt` line 1: "BSD 3-Clause License") | Python | symbol `data_in`

Checked: Symbol `data_in` is defined at 396 and closes at 456 (verified, read in full). Read also the portal constants at 22-32 and the settings at `settings_default.py` 272-290. Callers: only `webclient.py` 453 was read; telnet and the other protocol paths were not read, so the claim covers the webclient route and the Portal path generally. The window-burst (section 6) is derived from reading and was not run. The division-by-zero was run on the VPS (`python3 -c` with `1.0/float(0)` gives ZeroDivisionError). The sketch typechecks (`tsc --noEmit --strict --target es2020` on the VPS, exit 0). Not a camera cell. Confidence: high on order of operations and numbers. Chat moderation (channel mute and ban, boot, reports, audit log) was also read as context and is listed in section 6, but this note covers only the input rate limit.

Best transferable idea: Count accepted lines per session in a sliding one-second log before anything is relayed, reject the excess with a warning, and never let rejected lines count against the budget.
Decision (proposed): adapt - Frankendom needs a server-side intake budget so a chat flood cannot flood the engine; the donor's shape fits, but its window-edge burst, double count, zero-division and wall-clock defects must be fixed, and fight inputs must not share the chat budget.
Acceptance: A server test sends 80 chat lines in one second (all relay), an 81st in the same second returns too-fast, 80 lines at 999 ms and 80 at 1001 ms do not all relay, and a rate of 0 relays everything without throwing.

## 1. Mechanism

- Every line a session sends (text or OOB) enters `data_in` in the Portal, before the game server sees it. The order of steps, as the code runs:
  (a) Length check first: if `text` is longer than 6000 characters, send the length warning and return (413-416). This happens before the counter is touched, so over-long lines are not counted. The check sits in a `try` block, so a missing `text` key just continues (417-419).
  (b) The per-session counter is created on first use: `command_counter_reset = now` and `command_counter = 0` (423-427).
  (c) Window refresh: `now = time.time()` (421). If more than 1.0 s has passed since the reset stamp, the stamp becomes `now` and the counter goes to 0 (430-433). The window therefore opens at the first line after the previous window closed; it is a fixed window, refreshed only when a new line arrives.
  (d) Counter goes up by one (435). This is before the test, so rejected lines are counted too.
  (e) Overflow test: `counter * (1/80) > 1.0`, which is counter > 80 (29, 437). On overflow, send the overflow warning and return; the line is dropped and not relayed (438-439).
  (f) If the AMP link to the server is not ready, the same call is re-scheduled with `callLater(1.0, ...)` and returns (441-445). The counter was already incremented at (d), so the same line is counted again on the retry.
  (g) Accepted: scrub the data (448), stamp `session.cmd_last` (451), relay over AMP to the server (452), and echo locally if LOCALECHO is set (455-456).
- Numbers: 80 lines per window; window 1.0 s; interval 1/80 = 0.0125 s; character cap 6000.
- Worst case at a window edge, derived from reading (not run): 80 lines at t = 0.99 s, then 80 more at t = 1.01 s. The second group opens a new window at 1.01 s, so 160 lines relay in about 20 ms.
- Tick: none. The limiter is event-driven, one call per input the protocol delivers. There is no loop and no accumulator.
- Caller: the webclient hands each input to `self.sessionhandler.data_in(self, **kwargs)` (webclient.py 453). Other protocols were not read.

## 2. Key functions

- `PortalSessionHandler.data_in`: `/mnt/frankendom-donors/evennia-evennia/evennia/server/portal/portalsessionhandler.py` 396-456. The whole pipeline: length, window, counter, overflow, retry, relay.
- Constants: `/mnt/frankendom-donors/evennia-evennia/evennia/server/portal/portalsessionhandler.py` 22-32 (rate, char limit, interval, warning text) and 29 (interval = 1.0 / rate).
- Settings: `/mnt/frankendom-donors/evennia-evennia/evennia/settings_default.py` 272-290 (MAX_COMMAND_RATE 80, COMMAND_RATE_WARNING, MAX_CHAR_LIMIT 6000).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-session budget checked before relay | 80 lines per second (`settings_default.py` 278, theirs) |
| Window length | 1.0 s, hard-coded in the refresh test (430) |
| Overflow: drop the line and warn | warning text (`settings_default.py` 280, theirs) |
| Character cap, checked first and not counted | 6000 characters (`settings_default.py` 290, theirs; check at 413) |
| Off switch | Documented as "<= 0" (`settings_default.py` 277), but 0 raises ZeroDivisionError at import (29; run on the VPS) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order of checks (length first, then the rate, then relay) and the same values (80 per 1 s, 6000 characters). It omits the warning send, the AMP re-queue when the server link is not ready, the scrub, the local echo, the wire format and the connection-rate limiter (MAX_CONNECTION_RATE). It changes the window: the donor refreshes a fixed window only on a new line and counts rejected lines; the sketch prunes stamps older than one full window on every check and records only accepted lines (a sliding log). It takes the time as an argument; the donor reads `time.time()`, which is a wall clock.

```ts
// Licence: BSD-3-Clause (donor). Shape re-expressed from the described mechanism; adapted with the donor defects fixed.
interface IntakeState {
  accepted: number[]; // timestamps in ms (monotonic clock) of accepted lines, oldest first
}

type Verdict = "relay" | "too-fast" | "too-long";

interface IntakeLimits {
  maxCommandsPerWindow: number; // donor: 80 (MAX_COMMAND_RATE); <= 0 turns the limit off
  windowMs: number;             // donor: 1 s window
  maxChars: number;             // donor: 6000 (MAX_CHAR_LIMIT); <= 0 turns the check off
}

const DEFAULT_LIMITS: IntakeLimits = { maxCommandsPerWindow: 80, windowMs: 1000, maxChars: 6000 };

function admit(state: IntakeState, text: string, nowMs: number, lim: IntakeLimits = DEFAULT_LIMITS): Verdict {
  // Length check first and not counted, as in the donor (it returns before the counter moves).
  if (lim.maxChars > 0 && text.length > lim.maxChars) return "too-long";
  // Fix: 0 (or less) disables the limit as the donor docs say; the sketch has no division, so 0 cannot throw.
  if (lim.maxCommandsPerWindow <= 0) return "relay";
  // Fix: sliding window. Drop only the lines older than one full window.
  while (state.accepted.length > 0 && nowMs - state.accepted[0] >= lim.windowMs) {
    state.accepted.shift();
  }
  // Fix: rejected lines are not recorded, so a flood does not hold the counter above the cap.
  if (state.accepted.length >= lim.maxCommandsPerWindow) return "too-fast";
  state.accepted.push(nowMs);
  return "relay";
}

export {};
```

## 5. Lands in

- TARGET `origins/server/chat-intake.ts` (new): the server-side intake budget for chat and commands, in front of the engine's input handling. Parity-checklist row 5 (controls/input, intake). The sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3) is where the budget is placed in the tick. The hint row 14 (HUD) applies only to the chat panel's display, not to this limit.
- today: Frankendom's own intake file was not checked for this note.
- Reuse tag: adapt (BSD-3-Clause, code may be adapted; the sketch is re-expressed from the mechanism with the defects fixed)
- Brief rule served: one engine and server-verified (the donor limit sits in the Portal, outside the game server; Frankendom puts the rule in the one engine so the client cannot skip it)

## 6. Gaps and risks

- The donor budget counts every input line, including OOB and non-chat input (the settings doc says so, `settings_default.py` 273-277). In Frankendom a chat flood would then starve duel inputs (parry, strike). Give fight inputs their own budget or exempt them (row 5).
- The budget is per session. A player with two sessions gets two budgets. Frankendom should key the budget on the account (and presence), not the socket. (Not read: whether Evennia has an account-level limit elsewhere.)
- Defect 1, zero-division: MAX_COMMAND_RATE of 0 raises ZeroDivisionError at import (29), although the docs (277) say "<= 0" turns the limiter off. Run on the VPS: `1.0/float(0)` gives ZeroDivisionError. Fix: test "<= 0" before any division; the sketch does.
- Defect 2, window-edge burst: 160 lines relay in about 20 ms across a window boundary (430-437, derived from reading, not run). Fix: sliding log (the sketch prunes stamps on each check).
- Defect 3, rejected lines count: the counter goes up before the test (435-437), so a flood keeps the counter over the cap. Fix: record accepted lines only (the sketch does).
- Defect 4, double count on retry: when the AMP link is not ready, the line is counted at 435 and counted again when `callLater` re-enters `data_in` (444). Fix: run the link check before counting, or pass a flag on the retry.
- Defect 5, wall clock: `now = time.time()` (421) with `max(0, now - command_counter_reset)` (430). After a backward clock step the difference is negative, `max` clamps it to 0, and no window reset happens until the clock passes the old stamp. Fix: monotonic clock (the sketch takes `nowMs` from the caller).
- Defect 6, warning per line: each rejected line sends the warning (438), so a flood gets one reply per line. Fix: send one warning per window.
- The overflow limit is not a chat limit. 80 lines per second is far above human chat, and the code has no per-channel rate, no duplicate-line check and no per-minute cap. Frankendom needs its own chat budget on top (ruling: spam limits).
- Chat moderation elsewhere in the donor (read as context, not written up here): channel mute is a per-user list (`comms/comms.py` 265-287) filtered at send time unless `bypass_mute` is set (643-644); channel ban is checked at connect (`comms/comms.py` 370) and its own docstring says it does not stop users already connected (309-318); channel boot writes a `logger.log_sec` line (`commands/default/comms.py` 641; the channel `ban_user` at 647 writes none, and the only other log_sec in that file is channel delete at 552; the server-wide ban and unban in `commands/default/admin.py` 229 and 284 do log). Joining (379) and leaving (406) both clear a user's mute, so a mute does not survive a rejoin. These are candidates for the moderation cells, not this note.
- Not read: the telnet and other protocol callers of `data_in`, the scrub step (`clean_senddata`), and the server side of the relay.

Reuse tag: adapt (BSD-3-Clause)
Brief rule served: one engine, server-verified intake; row 5


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Note says 'boot and ban write logger.log_sec lines (commands/default/comms.py 610-666)'. Only boot logs (log_sec at 641); ban_user (starts 647) has no log_sec; the only other log_sec in the file is channel delete at 552. Everything else holds: data_in 396-456, length check 413, counter 421-437, 80/s math, retry callLater 444, settings 272-290, MAX_COMMAND_RATE=0 divides at 29, comms.py mute/unmute/ban/connect lines, licence BSD-3.
Missed: None significant.

Fixed 2026-10-12 (Sonnet fixer): channel ban does not write a security log line; only channel boot does (comms.py 641). Verified by grep of comms.py and admin.py.
