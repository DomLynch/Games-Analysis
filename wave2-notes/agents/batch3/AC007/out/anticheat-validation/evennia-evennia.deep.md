# evennia-evennia (anticheat-validation, cell 2)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/server/portal/portalsessionhandler.py` | Licence: BSD 3-Clause (`LICENSE.txt`: "Copyright 2012- Griatch ... Gregory Taylor"; code may be adapted, keep the notice if copied) | Python | symbol `PortalSessionHandler.data_in`

Checked: the list hint `evennia/server/validators.py` (all 40 lines) is username availability validation (guest list and taken names, lines 10-40), not anticheat, so it was not used. Read: `portalsessionhandler.py` 18-50, 98-125, 396-460 (the signature and first docstring lines 396-404 were seen in grep only); `settings_default.py` 266-296 and 838-845; `throttle.py` 1-225 (all); `accounts.py` 66-80 and 715-800; `inputfuncs.py` 305-345. Not read: the protocol code that calls `data_in` (telnet, web, ssh), the server-side input handler, the creation-throttle call sites (grep only, accounts.py 1039 and 1136). Confidence: high on the portal limiter order and its numbers (checked with a Python float test); medium that there is no second command-rate cap on the server side, because the grep found none and the server handler was not read. Camera cell: not applicable.

Best transferable idea: Refuse input above a per-session cap inside a fixed one-second window, count refused input too, drop it without forwarding, and tell the client, so the engine never applies a flood.

Decision (proposed): adapt - take the reject-and-report intake pattern and its per-window count, but set the cap per server tick in the fight engine, not per second at the edge, because a duel needs a few presses per second and the donor's 80/s is a chat-server number.
Acceptance: a server test sends 40 attack presses in one tick; only the per-tick budget is applied, the rest get a "too fast" reply, and the duel state changes only for the applied presses.

## 1. Mechanism

- Every message from a connected session goes through `PortalSessionHandler.data_in` on the Portal, the process that faces the network (portalsessionhandler.py 396).
- Step 1, length (411-416): if the text is longer than `MAX_CHAR_LIMIT` (6000), the session gets the length warning and the call returns. The counter is not touched. Non-text messages skip this (the try block at 411-419).
- Step 2, window (421-433): `now = time.time()` (wall clock). The session's `command_counter_reset` and `command_counter` are created on first use (423-427). If more than 1.0 s has passed since the window start, the window restarts at `now` with count 0 (430-433). It is a fixed window, not a sliding one.
- Step 3, count (435): `command_counter += 1`, before the cap check. A refused command still uses up the window.
- Step 4, cap (437-439): the check is `command_counter * _MIN_TIME_BETWEEN_COMMANDS > 1.0`, where the minimum gap is `1.0 / MAX_COMMAND_RATE` (29). With 80, the first refused count is 81 (checked with a Python float test). A refused command gets `COMMAND_RATE_WARNING` and the function returns. Nothing is forwarded.
- Step 5, server link (441-445): if the AMP link to the game server is not up yet, the same input is retried after 1.0 s with `reactor.callLater`.
- Step 6, accept (447-456): the text is scrubbed, `session.cmd_last = now` is set, the input is relayed to the server over AMP (452), and a local echo is sent if LOCALECHO is set (455-456).
- Config (settings_default.py): 80 commands per second (278); the comment says the cap also covers OOB messages (274-276); the warning text is at 280; the length limit is 6000 (290).
- No escalation at this layer. A refusal does not disconnect, flag, or ban the session. The only escalation in the donor is the login throttle, a separate mechanism (section 6).

## 2. Key functions

- `PortalSessionHandler.data_in`: `/mnt/frankendom-donors/evennia-evennia/evennia/server/portal/portalsessionhandler.py` 396-456. The whole intake path for one input.
- Settings: `/mnt/frankendom-donors/evennia-evennia/evennia/settings_default.py` 272-290 (rates, limit, warning text).
- Login throttle (secondary, not in the note's mechanism): `/mnt/frankendom-donors/evennia-evennia/evennia/server/throttle.py` 100-135 (update) and 189-225 (check); used at `/mnt/frankendom-donors/evennia-evennia/evennia/accounts/accounts.py` 729-762.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Length check first, not counted | 6000 characters (settings_default.py 290) |
| Fixed window that restarts after the window length | 1.0 s (portalsessionhandler.py 430) |
| Count before the cap check, so refused input counts | None |
| Cap: refuse the input after N in a window | 80 per window (settings_default.py 278); the 81st is refused (437) |
| Reject and report, do not forward | Warning text (settings_default.py 280) |
| Disable the cap | Comment says 0 or less (settings_default.py 277). Code: `1.0 / float(0)` raises ZeroDivisionError at import (portalsessionhandler.py 29; checked in Python, not run in the donor). Negative values disable it. |

## 4. TypeScript sketch

simplified: keeps the donor order: length check (not counted), window roll after the window length, count, then the cap with refusal. It writes the donor's `count * (1/rate) > 1.0` as `count > cap` (equal for 80; checked). It omits the AMP relay, the deferred retry when the server link is down, the local echo, the `cmd_last` stamp, the warning text, the OOB path, and the disable case. JS string length counts UTF-16 code units, not Python characters, so the length check differs for characters outside the BMP.

```ts
// Licence: BSD-3-Clause (donor). Clean-room sketch: the shape of a per-session fixed-window input cap, written from the described mechanism, not a translation.
// clean-room
type Verdict = { forward: true } | { forward: false; reason: "too-long" | "too-fast" };

interface SessionLimiter { windowStart: number; count: number; }

const WINDOW_S = 1.0;          // fixed window length, seconds
const MAX_CMDS_PER_WINDOW = 80; // commands allowed per window
const MAX_CHARS = 6000;         // 0 or less disables the length check

function newLimiter(now: number): SessionLimiter {
  return { windowStart: now, count: 0 };
}

// Order as in the donor: length check first (not counted), then window roll,
// then count, then cap. A refused command still counts toward the window.
function admit(lim: SessionLimiter, nowS: number, text: string): Verdict {
  if (MAX_CHARS > 0 && text.length > MAX_CHARS) return { forward: false, reason: "too-long" };
  if (Math.max(0, nowS - lim.windowStart) > WINDOW_S) {
    lim.windowStart = nowS;
    lim.count = 0;
  }
  lim.count += 1;
  if (lim.count > MAX_CMDS_PER_WINDOW) return { forward: false, reason: "too-fast" };
  return { forward: true };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/evennia-evennia-cmdrate.ts`: passed.

## 5. Lands in

- TARGET `src/fight/input-rate.ts` (new, proposed): the per-player intake cap for fight inputs, run before the duel step applies them. Parity-checklist row 5 (controls / input). The cap is an engine rule; the client only shows the reply.
- Reuse tag: rewrite-from-idea (BSD-3-Clause; code may be adapted; this sketch is clean-room)
- Brief rule served: 5 (controls / input, server-verified: the intake check is in the engine, not in the client); 1 (one engine)
- Note: no parity row 1-23 fits account login. The login throttle is not a Frankendom parity item.

## 6. Gaps and risks

- The cap sits at the network edge (Portal). The greps found no second command cap on the Evennia server side, and the server handler was not read. In Frankendom the engine must enforce the cap, because a client cannot be trusted to limit its own presses.
- 80 per second is a chat-server number. A duel player presses a few times a second, so the budget should be per server tick and set as data, not per second. At 80 per second a bot can still land 80 attacks a second unless the duel rules (cooldown, stamina; rows 1 and 3) also refuse them.
- Fixed-window bursts: 80 inputs at 0.99 s and 80 more at 1.01 s is 160 inputs in about 0.02 s, because the window restarts at the first input after the boundary. A per-tick budget (or a token bucket) avoids that burst; the donor does not.
- Wall-clock window: `time.time()` (portalsessionhandler.py 421). A clock step can reopen or hold a window. Frankendom should count server ticks, not wall time, so the budget is replayable (row 19).
- Disable by config: `MAX_COMMAND_RATE` of 0 raises at import (portalsessionhandler.py 29), while the comment says 0 or less turns the cap off (settings_default.py 277). A negative value disables it. Frankendom's anticheat settings must fail closed: invalid values stop the server, they do not pass input.
- One budget for everything: the comment says OOB messages count toward the same cap (settings_default.py 274-276). Frankendom must keep the fight-input budget separate from cosmetic or chat messages, so a chat spam cannot starve an attack.
- No escalation: a refused input gets a text warning and is dropped. There is no kick, flag or ban at this layer. Frankendom's one ledger needs a repeat-refusal count per player that feeds a flag, not just a warning.
- Login throttle (secondary): `LOGIN_THROTTLE` is keyed by IP only (throttle.py 113; accounts.py 729-762), so players behind one NAT share a lockout. `Throttle.check` calls `self.touch(cache_key)` with an already prefixed key (throttle.py 210, 218), and `touch` adds the prefix again (67-68), so the TTL refresh does not take effect. As read, the window still ends `timeout` after the last failure, so this is harmless here, but do not copy the refresh.

Reuse tag: rewrite-from-idea (BSD-3-Clause; code may be adapted; this sketch is clean-room)
Brief rule served: 5 (controls / input, server-verified); 1 (one engine); rules 7-9 n/a
