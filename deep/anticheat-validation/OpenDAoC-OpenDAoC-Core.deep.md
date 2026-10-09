# OpenDAoC-OpenDAoC-Core (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/PlayerMovementMonitor.cs` | Licence: GPL-3 | C# | symbol `PlayerMovementMonitor.ValidateMovement / HandleSpeedHack` at 84 and 193 (verified: `ValidateMovement` opens at 84 and ends at 145; `HandleSpeedHack` at 193 and ends at 220; `RecordPosition` at 51-82; `TryGetSafePosition` at 161; `Pause` at 147).

## 1. Mechanism

- Server-side position monitor, one per player. `RecordPosition` (51-82) takes each reported position with two clocks (game-loop tick and monotonic milliseconds) and the player's current max speed (a steed's if mounted, cached once per game-loop tick, 235-246). Samples arriving in the same game-loop tick replace the current sample; otherwise the current sample becomes the previous one. A drop in max speed is remembered with its time and the old value (for the latency rule, 60-65). Samples are ignored while the monitor is paused (55-56).
- Safe position (`UpdateSafePosition`, 248-267): checked at most every 1.5 s (`SafePositionUpdateInterval`, 80-81 and 250). The first sample becomes both the safe and the candidate position; after that, when the current sample is more than 125 units (horizontal) from the candidate, the candidate becomes the safe position and the current sample becomes the new candidate, so the safe position lags one step behind.
- `ValidateMovement` (84-145) compares the last two samples. Time difference must be positive, then one game-loop tick is added as a processing-delay buffer (94). Allowed speed = the current max speed (or the larger of it and the previous max if a speed decrease happened within `LatencyBuffer` 750 ms, `CalculateAllowedMaxSpeed` 173-182), times 1.15 tolerance. Allowed distance = allowed speed x dt / 1000. A violation is a squared horizontal (x, y) distance above the squared allowed distance (97-103); height is ignored.
- On a violation (105-144): old violations (older than 1.5 s plus accumulated pause time) are dropped first (`GetAndUpdateValidViolationCount`, 184-191); if none remain, the accumulated pause time, teleport count and teleport sample are reset (109-114). The violation time is queued. If no teleport sample is set, it is set to the previous sample, else the current one, and with neither the method logs an error and returns (120-133). When the count reaches 6 (`ViolationThreshold`) and the player is not allowed to fly and has a privilege level of player or below, `HandleSpeedHack` runs (135-143).
- `HandleSpeedHack` (193-220): returns at once if there is no previous sample (a false positive, 196-197). Otherwise it builds a log line (action, character, account, IP, distance, allowed distance, speed, allowed speed, teleport count; 222-233), sends it to the cheat log, and chooses the action: "kick" when the teleport count is at least 5, else "teleport". Teleport moves the player to the previous sample held in `_teleport` (set at lines 120-125 to the sample before the first violation), not to the safe position, and increments the count. Kick sends a quit and disconnects. A teleport also sets previous to current and current to the teleport sample before moving the player.
- `Pause` (147-159): clears both position samples and the safe and candidate positions, and sets the pause to end 750 ms from now (it replaces, not adds to, the pause end); the accumulated pause time grows by how much the end moved, so loading or teleports do not count, and the violation window grows by the paused time.
- Inputs: position reports, game-loop tick, monotonic clock, player max speed, flight and privilege flags. Outputs: teleport back or kick, log lines. Tick: per position report, plus the game loop.

## 2. Key functions

- `PlayerMovementMonitor.RecordPosition`: `PlayerMovementMonitor.cs` 51-82. Sample intake, same-tick rule, safe-position refresh.
- `PlayerMovementMonitor.ValidateMovement`: `PlayerMovementMonitor.cs` 84-145. Distance and speed check with latency and tolerance.
- `PlayerMovementMonitor.HandleSpeedHack`: `PlayerMovementMonitor.cs` 193-220. Teleport, then kick after repeats.
- `PlayerMovementMonitor.Pause`: `PlayerMovementMonitor.cs` 147-159. Latency pause that widens the window.
- `PlayerMovementMonitor.CalculateAllowedMaxSpeed` / `GetAndUpdateValidViolationCount` / `UpdateSafePosition`: `PlayerMovementMonitor.cs` 173-182 / 184-191 / 248-267. Latency speed rule, sliding window, safe-position lag.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Speed check: squared distance against (max speed x tolerance x dt)^2 | Tolerance 1.15 (theirs, line 42) |
| Add one processing tick to dt | One game-loop tick (theirs) |
| Require N violations inside a sliding window before acting | N = 6 (line 39), window 1500 ms (line 40) (theirs) |
| Latency buffer: keep the previous max speed for a short window after a speed drop | 750 ms (theirs, line 43) |
| Teleport back to the previous sample first; kick after repeats | Teleport threshold 5 (theirs, line 41) |
| Pause checks while loading or teleporting, extending the window by the pause | Pause 750 ms (theirs, line 157, the same latency constant) |
| Safe-point sampling on an interval and a minimum move | 1500 ms interval, 125 units (theirs, lines 35-36) |

## 4. TypeScript sketch

simplified: the sketch keeps the speed test, the sliding window, the action choice and the safe-point test as four separate functions. It omits sample recording (the same-tick replace rule and the speed-drop bookkeeping that feeds `sinceSpeedDrop`), the reset of the teleport count when the window empties, the teleport-sample choice, the previous-sample guard, the fly and privilege exemptions, the move itself, and the lag of the safe position by one candidate (the sketch's safe-point test is a single interval-and-distance check). `Pause` is not sketched.

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Sample { x: number; y: number; t: number; maxSpeed: number; }

const TOLERANCE = 1.15;   // theirs
const WINDOW_MS = 1500;   // theirs
const N_VIOLATIONS = 6;   // theirs
const TELEPORT_MAX = 5;   // theirs
const LATENCY_MS = 750;   // theirs

// Speed check on the last two samples: is the move longer than the allowed distance?
function moveTooFar(prev: Sample, cur: Sample, tickMs: number, prevMaxSpeed: number, sinceSpeedDrop: number): boolean {
  const dt = cur.t - prev.t + tickMs;
  if (dt <= 0) return false;
  const speed = sinceSpeedDrop <= LATENCY_MS ? Math.max(prevMaxSpeed, cur.maxSpeed) : cur.maxSpeed;
  const allowed = (speed * TOLERANCE * dt) / 1000;
  const dist2 = (cur.x - prev.x) ** 2 + (cur.y - prev.y) ** 2;
  return dist2 > allowed * allowed;
}

// Count violations inside a sliding window; the window grows by any time spent paused.
function countWindow(times: number[], now: number, pausedMs: number): number[] {
  return times.filter((t) => now - t <= WINDOW_MS + pausedMs);
}

// Act only after enough violations; teleport back first, kick after repeats.
function action(times: number[], teleports: number): 'none' | 'teleport' | 'kick' {
  if (times.length < N_VIOLATIONS) return 'none';
  return teleports >= TELEPORT_MAX ? 'kick' : 'teleport';
}

// Safe point: refresh on an interval and only after a minimum move.
function shouldRefreshSafe(now: number, last: number, moved: number, every: number, minMove: number): boolean {
  return now - last >= every && moved >= minMove;
}
```

## 5. Lands in

- Frankendom target: `origins/presence/interest.ts`, `World.move` (the existing server-side clamp: a claimed pose past `maxSpeedCmS` 700 x `speedSlack` 1.5 x dt is snapped back and counts a strike, and `strikesToDrop` 5 within `strikeWindowMs` 10,000 drops the player; the server closes the socket with code 4009 "teleport" at `origins/presence/server.ts` line 206). Files read on the VPS snapshot /root/work-k7 (not main). What the donor adds that `move` lacks: a latency buffer after a speed drop, a pause that widens the window across loading and teleports, a one-tick processing allowance on dt, same-tick sample replacement, and a lagged safe position. The allowed speed should come from the one speed table, `src/fight/speeds.ts` (`SPEEDS.player.run` 5.2 m/s; presence's 700 cm/s is "set from the sprint speed").
- Parity-checklist row: none of rows 1 to 22 (Zone 1 movement is not a fight row; row 4 is the fight loop, not the walk). Feature-map section: `docs/specs/origins/one-shard.md` §2 "The server clamps what the client claims" (line 33) and the cheating row (line 81).
- Reuse tag: rewrite-from-idea (GPL-3, clean-room only)
- Brief rule served: 2 (engage is a state change; kills server-verified); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- The donor's teleport-back is an MMO correction. In Frankendom a teleport of the hero during a duel would rewrite the fight; the rule must apply to Zone 1 and presence movement only, never to a live duel.
- Frankendom's ruling is server-verified kills. A position monitor is a movement check, not a kill check; it does not replace `src/net/verify-duel.ts`. Presence positions are cosmetic by design (one-shard §2: "a forged position gains nothing"), so a stricter monitor only needs to protect other players' view, not the ledger.
- The donor needs six violations within 1.5 s (135) and lets five teleports pass before kicking (199); Frankendom already drops at the sixth strike inside 10 s (`interest.ts` `move`). Any change of that tolerance is a Lead decision with a receipt, not a copy of the donor's numbers.
- The donor's check is horizontal only (97); Frankendom's `move` is also x and z only, so vertical speed hacks are not covered by either.
- Flight and privilege exemptions (137) are the donor's game rules. Frankendom has no flight; an admin exemption is a Lead decision.
- Constants (1.15, 6, 1500 ms, 750 ms, 5, 125) are the donor's and must not be carried over.
- Pit is a client only; this movement check is for the open-world walk, not the arena. MAX_ATTACKERS = 3 is unaffected.
- Not read: `GamePlayer.MaxSpeed`, `MoveTo`, `LogCheatAction`, and the caller that feeds `RecordPosition` and `ValidateMovement`.
