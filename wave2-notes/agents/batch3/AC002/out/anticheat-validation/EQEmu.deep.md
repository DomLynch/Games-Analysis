# EQEmu (anticheat-validation, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/zone/cheat_manager.cpp` (with `zone/cheat_manager.h`, `zone/client_packet.cpp`, `zone/client_process.cpp`, `common/ruletypes.h`) | Licence: GPL-3.0-or-later (per cheat_manager.cpp header lines 5-8: "version 3 of the License, or (at your option) any later version"; LICENSE.md is GPL v3) | C++ | symbol `CheatManager::MovementCheck`

Checked: The whole class is in `zone/cheat_manager.cpp` (392 lines, all read) and `zone/cheat_manager.h` (105 lines, all read). Both overloads of `MovementCheck` (233-260 and 262-316) were read in full. `CheatDetected` (47-231), `ProcessMovementHistory` (330-368), `CheckMemTimer` (318-328) and `ClientProcess` (387-392) were read in full. Callers read: `client_packet.cpp` 4832-4934 (the handler up to the check) and 4990-5023 (partly; 4936-4990 and the `m_Position` write at 5023 were read; 5000-5022 only by grep); `client_packet.cpp` 16486-16506; `client_process.cpp` 218 (the call, inside the function that starts at 54; the rest of that function not read); `zone.cpp` 2068-2072 (one caller); `mob.cpp` 6522 and `spells.cpp` 4652/4668 (the exemption set lines, read by grep only). Not read: `common/timer.cpp` (so Timer semantics are assumed: `Start(n)` arms an n-unit countdown and `GetRemainingTime()` reads 0 when it has run out); the body of the EVENT_WARP quest hook; the player-event log writer. Confidence: high on the order of operations and the thresholds (all in the read lines); medium on the time unit (the code's timestamps are ms by use, not by reading `Timer`). This is not a camera cell, so no `camera_scope`.

## 1. Mechanism

- A server-side watch on the position the client reports. Each `OP_ClientUpdate` runs `cheat_manager.MovementCheck(glm::vec3(cx, cy, cz))` (client_packet.cpp 4934). The server's stored position is still the old one at that point; the new position is written at client_packet.cpp 5023. The check records flags and returns no value. Nothing in the 392 lines of `cheat_manager.cpp` kicks or rejects the move.
- Per update, `MovementCheck(pos)` (233-260):
  1. If the 70 s movement-history timer has run out, it records `MQGhost` (235-237). This is not rate-limited: while the timer reads 0, every update repeats the flag.
  2. Measures the 2D distance from the stored position to the new one (239).
  3. A stopped update (dist == 0) with distance already accumulated flushes the window by calling `MovementCheck(0)` (241-244). A stopped update with nothing accumulated restarts the window at now and clears the moved flag (245-248).
  4. A moving update adds the distance to the window and sets the moved flag (251-252). The first moving update opens the window (253-255). Later moving updates evaluate the window once it is older than 2500 ms (`MovementCheck(2500)`, 257).
- The evaluation, `MovementCheck(time)` (262-316), runs only when `now - windowStart > time` (265):
  1. `estimated_speed = accumulated x 100 / elapsed` (266-267). The file does not explain the factor 100.
  2. `run_speed = server GetRunspeed() / min(MQWarpDetectionDistanceFactor, 1.0)` (270-274). The divisor is clamped to at most 1.0, so with the default rule value of 9.0 the run speed used is the server's own run speed exactly.
  3. If `estimated_speed > run_speed` and the client is not on GM speed and not immobile (runspeed 0 covers stun, root, mez) (275-278), it climbs an exemption ladder: ShadowStep exempt flags only when accumulated distance is over 800 (279-290); KnockBack exempt flags when the estimate is over 30 (291-295); otherwise, unless Port exempt, an estimate over 1.5 x run speed flags `MQWarp` and resets the window (297-301), and anything between run speed and 1.5 x is `MQWarpLight` (302-304). `MQWarpLight` is written to the log only when `MarkMQWarpLT` is on (CheatDetected 137-151; rule default false, ruletypes.h 1135).
  4. If the call was not the default 1000 ms call (308), the three exemptions (ShadowStep, KnockBack, Port) are cleared (308-312). The window restarts at now with zero distance (313-314).
- Exemptions come from game events the server itself runs, not from the client: KnockBack from mob.cpp 6522 and spells.cpp 4652; ShadowStep from spells.cpp 4668; Port from the underworld teleport path (client_packet.cpp 16504) and from a zone-line entry in the movement history (353). `SetExemptStatus(x, true)` first calls `MovementCheck()` (the 1000 ms default) so pending movement is judged under the old rules, and only then sets the flag (34-40).
- Teleports reported in `OP_MovementHistoryList`: `ProcessMovementHistory` (330-368) re-arms the 70 s timer first (334), then returns early if Port is set (335-337). Otherwise each entry of type `TeleportA` after index 0 is recorded as `MQWarpAbsolute` with the previous and the new position (355-363). This function applies no distance test before recording. The absolute flag starts a 2500 ms cooldown (107), which the `MQWarp` case then respects (51).
- Idle: `ClientProcess()` (387-392), called from `Client::Process` (client_process.cpp 218), which sits inside the `if (Connected() || IsLD())` block that starts at client_process.cpp 57. The pass rate of `Client::Process` was not read. If the client has not moved, the window start is pushed to now (389-391), so standing still does not build a window.
- Fast memorize: `CheckMemTimer` (318-328) runs on the memorize-spell handler (client_packet.cpp 10370). See section 6 for the subtraction order.
- Sink: every flag goes through `CheatDetected` (47-231). Each case checks its own rule (for example `EnableMQWarpDetector`, `MQWarpExemptStatus`), records a `POSSIBLE_HACK` player event (64) and writes a log line. Only `MQWarp` fires the quest hook `EVENT_WARP` (68-76). The `MQWarp` case is gated on the warp timer reading 0 (51), and only the absolute case starts that timer (107).

## 2. Key functions

- `CheatManager::MovementCheck(glm::vec3)`: `/mnt/frankendom-donors/EQEmu/zone/cheat_manager.cpp` 233-260. Per-update entry: heartbeat check, 2D distance, stop flush, accumulate, first-window start.
- `CheatManager::MovementCheck(uint32)`: `/mnt/frankendom-donors/EQEmu/zone/cheat_manager.cpp` 262-316. The window evaluation: estimated speed, run-speed bound, exemption ladder, tiers, window reset, exemption clear.
- `CheatManager::SetExemptStatus`: `/mnt/frankendom-donors/EQEmu/zone/cheat_manager.cpp` 34-40. Flushes pending movement before an exemption is set.
- `CheatManager::ClientProcess`: `/mnt/frankendom-donors/EQEmu/zone/cheat_manager.cpp` 387-392. Idle reset of the window start.
- `CheatManager::ProcessMovementHistory`: `/mnt/frankendom-donors/EQEmu/zone/cheat_manager.cpp` 330-368. Heartbeat re-arm and reported teleports.
- `CheatManager::CheatDetected`: `/mnt/frankendom-donors/EQEmu/zone/cheat_manager.cpp` 47-231. Flag sink: per-type rule gate, player event, log line, quest hook for MQWarp only.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Average speed over a window: accumulated distance / elapsed time | Window 2500 ms before evaluation (cheat_manager.cpp 257); forced flush 1000 ms default (cheat_manager.h 87) |
| Speed bound taken from the server's own run speed, not the client's claim | `GetRunspeed()` (270); tolerance factor rule default 9.0 (ruletypes.h 1124), clamped by `min(..., 1.0)` (272-273) so it has no effect above 1.0 |
| Two tiers: over run speed (light, log-only by default) and over 1.5 x run speed (hard) | 1.5 (297); light log gated by `MarkMQWarpLT`, default false (ruletypes.h 1135) |
| Short-distance allowance for a shadow step | 800 accumulated distance (280) |
| Knockback allowance | estimate over 30.0 (292) |
| Heartbeat for the client's movement-history packet | 70000 ms (79 in cheat_manager.h, and 334) |
| Cooldown after an absolute warp flag | 2500 ms (107) |
| Idle reset | No constant: resets whenever the client did not move (389-391) |
| Estimate scale | `* 100` (267); units not explained in the donor |

## 4. TypeScript sketch

simplified: keeps the windowed average speed, the evaluate-then-reset order, the idle reset, the stop flush, the light and hard tiers and the flush-before-exempt order. It omits the 70 s heartbeat (MQGhost), the teleport-history path (MQWarpAbsolute), the per-exemption thresholds (ShadowStep 800, KnockBack 30), the GM-speed and immobile skips, the 3D/Z handling, the warp cooldown and the MQFastMem check. Flags go to an in-memory ledger only; there is no kick. It uses 2D distance in distance units per ms, which matches the donor's use of `DistanceNoZ` and `GetRunspeed` but not its x100 scale.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// simplified: keeps the windowed average speed, evaluate-then-reset, the idle reset, the stop flush, the light/hard tiers and the exempt-flush order. Omits: the 70 s heartbeat (MQGhost), the teleport-history path (MQWarpAbsolute), the per-exemption thresholds (ShadowStep 800, KnockBack 30), the GM-speed and immobile skips, the 3D/Z handling, the warp cooldown and the MQFastMem check. Flags go to an in-memory ledger only; there is no kick.

export interface Flag {
  kind: "warp" | "light-warp";
  atMs: number;
  speed: number;   // average speed over the window, distance per ms
  limit: number;   // server run speed it was compared against
}

export interface WindowState {
  windowStartMs: number | null; // null until the first moving update opens a window
  distance: number;             // distance accumulated in the open window
  moved: boolean;               // did the last update move the entity
  exempt: boolean;              // set by a game event (knockback, teleport); suppresses flags
  lastX: number;                // position the server currently holds
  lastY: number;
}

export interface WatchConfig {
  windowMs: number;    // evaluate a moving window once it is older than this (donor: 2500)
  runSpeed: number;    // server-side run speed from server state, distance per ms
  hardFactor: number;  // above runSpeed * hardFactor is the hard tier (donor: 1.5)
}

// Donor default for the exemption flush (cheat_manager.h, MovementCheck default 1000).
const FLUSH_MIN_MS = 1000;

export const ledger: Flag[] = [];

// Evaluate the open window only if it is older than minElapsedMs. Returns true if it ran.
function evaluate(s: WindowState, c: WatchConfig, nowMs: number, minElapsedMs: number): boolean {
  if (s.windowStartMs === null) return false;
  const elapsed = nowMs - s.windowStartMs;
  if (elapsed <= 0 || elapsed <= minElapsedMs) return false;

  const speed = s.distance / elapsed;
  if (!s.exempt && speed > c.runSpeed) {
    const kind = speed > c.runSpeed * c.hardFactor ? "warp" : "light-warp";
    ledger.push({ kind, atMs: nowMs, speed, limit: c.runSpeed });
  }
  s.windowStartMs = nowMs; // reset the window after every evaluation
  s.distance = 0;
  return true;
}

// One position update. The check reads the position the server holds, then the server writes the new one.
export function onPosition(s: WindowState, c: WatchConfig, x: number, y: number, nowMs: number): void {
  const d = Math.hypot(x - s.lastX, y - s.lastY); // 2D, as in the donor
  if (d === 0) {
    if (s.distance > 0) {
      evaluate(s, c, nowMs, 0);                   // a stop flushes the pending window
    } else {
      s.windowStartMs = nowMs;                    // standing still: restart the window
      s.moved = false;
    }
  } else {
    s.distance += d;
    s.moved = true;
    if (s.windowStartMs === null) {
      s.windowStartMs = nowMs;                    // first movement opens the window
    } else if (evaluate(s, c, nowMs, c.windowMs)) {
      s.exempt = false;                           // donor clears exemptions on the update path
    }
  }
  s.lastX = x;
  s.lastY = y;
}

// Called once per client loop pass (donor ClientProcess): idle time does not build a window.
export function onIdleTick(s: WindowState, nowMs: number): void {
  if (!s.moved) s.windowStartMs = nowMs;
}

// Exemption set by a game event. Pending movement is judged under the old rules first, then the flag is set.
export function setExempt(s: WindowState, c: WatchConfig, nowMs: number, on: boolean): void {
  if (on) evaluate(s, c, nowMs, FLUSH_MIN_MS);
  s.exempt = on;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/eqemu-movement-window.ts`): exit 0, no output.

## 5. Lands in

- TARGET `origins/server/movement-check.ts` (new; proposed): the server-side sanity check on the hero's position per tick, next to the engine's own movement. It is not in `src/fight/`, because movement is not a fight rule. The fight rules are still `src/fight/`.
- Parity-checklist row 5 (controls/input, intake): the check validates what the server receives. The per-tick part belongs to the server-tick sub-line of row 18 ("server tick: fixed step, input intake, per-tick NPC budget"). No row is designed for anticheat; row 5 is the closest.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: server-verified intake (kills are server-verified; the server never trusts a reported position as truth) and one ledger (flags go to the one ledger, not a per-system log)

Best transferable idea: a server-side windowed speed check against the server's own run speed, with a log-only tier and a hard tier, that judges pending movement before an engine-granted exemption is switched on.

Decision (proposed): adapt — take the windowed average, the two tiers and the flush-before-exempt order, but change the trust model: Frankendom's server moves the hero from client intent, so the check is a clamp on the server's own motion and a sanity net, not a judge of a client-reported position that the server had already accepted.
Acceptance: A server test feeds one client 2.5 s of intent that would move it at 1.6 x run speed and asserts one `warp` entry in the ledger and that the server's stored position advances no more than run speed x window; a second test at 1.2 x asserts one `light-warp` entry and no change to the stored position beyond the clamp.

## 6. Gaps and risks

- Trust model: EQEmu accepts the client's reported position and only flags it (client_packet.cpp 4934, 5023). Frankendom's server is authoritative, so this must be the server's own motion, with the check as a second line. Do not port "accept, then flag" as the enforcement.
- Flag-only: the file never rejects or kicks (all 392 lines read). Frankendom's one ledger needs an explicit action policy for each flag tier; the donor has none, and its only downstream hook is the quest `EVENT_WARP`, which is a scripting hook Frankendom does not have.
- The tuning rule is clamped: `MQWarpDetectionDistanceFactor` defaults to 9.0 (ruletypes.h 1124) and is used as `min(factor, 1.0)` (cheat_manager.cpp 272-273), so its comment ("we raise it a bit") describes a value with no effect above 1.0. Frankendom should tune run-speed tolerance as data (a per-character or per-zone field) and not copy this factor.
- Units: `estimated_speed = distance x 100 / elapsed` (267). The file does not say what the 100 converts to, and the time unit is assumed to be ms. Frankendom needs its own units written down before the threshold is trusted.
- Heartbeat flag has no cooldown: after the 70 s timer expires, `MQGhost` is recorded on every update (235-237) until the next history packet re-arms it (334). Frankendom needs per-player rate limits on flags.
- Possible bug, not run: the fast-memorize test (323) is `m_time_since_last_memorization - Timer::GetCurrentTime() <= 1` on two `uint32` values (cheat_manager.h 100; common/timer.h 55). Read literally, the subtraction is last minus now and it wraps, so the test is true only for differences of 0 or 1 ms, which looks reversed. I did not run it and cannot confirm the intent. Do not copy this expression.
- Reported teleports are logged as `MQWarpAbsolute` with no distance test in this function (355-363). For Frankendom, zone travel and teleports come from the server's own state (zones as data), so they should not be inferred from a client history list at all.
- Exemptions are set by server events (KnockBack, ShadowStep, Port). That part transfers: Frankendom's engine knows its own knockback and stagger, so the exemption comes from engine state, not from the client.
- Not read and not claimed: Timer semantics (common/timer.cpp), the EVENT_WARP quest body, the player-event writer, and how often `Client::Process` runs.
