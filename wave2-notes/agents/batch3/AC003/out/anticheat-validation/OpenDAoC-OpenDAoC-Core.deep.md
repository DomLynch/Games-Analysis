# OpenDAoC-OpenDAoC-Core (anticheat-validation, cell 1)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/PlayerMovementMonitor.cs` | Licence: GPL-3.0 (repo `LICENSE` file, "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; the monitor file itself has no header; the repo's `gplheader.txt` template says "either version 2 ... or (at your option) any later version") | C# | symbol `PlayerMovementMonitor` (methods `RecordPosition`, `ValidateMovement`, `Pause`, `HandleSpeedHack`)

Checked: Read in full: `PlayerMovementMonitor.cs` (271 lines, class 10-130 plus the record struct at 269). Callers read: `GameServer/ECS-Components/PlayerMovementComponent.cs` (whole file, 165 lines, the only caller of `RecordPosition`, `ValidateMovement`, `Pause`); `GameServer/gameobjects/GamePlayer.cs` 7854-7910 (the `MoveTo` override, which the monitor's rollback calls) and 824-838 (`OnPositionUpdateFromPacket` path). Constants read at lines 35-43. Grep-only (not read in full): `GameLoop.cs` lines 33 and 99; `ServerProperties.cs` 274-275; `PlayerPositionUpdateHandler.cs` call sites 139 and 279; `SpeedHack.cs` (an admin command that reflects the monitor's properties); `Tests/` (no test references the monitor). Not read: `GameServer.LogCheatAction` and the kick path internals (`SendPlayerQuit`, `Disconnect`), where `MaxSpeed` values come from (`GamePlayer.MaxSpeed` and `Steed.MaxSpeed`), the rest of `GameLoop.Run` and `BuildTickSequence`, and the packet handler outside those lines. Confidence: high on the order of operations inside the monitor and on the rollback and kick counts (checked against the `HandleSpeedHack` guard). Camera: not applicable to this topic.

## 1. Mechanism

- Path in. A client position report reaches `GamePlayer.OnPositionUpdateFromPacket` (GamePlayer.cs 836-838), which calls `PlayerMovementComponent.UpdatePosition` (PlayerMovementComponent.cs 95). That method hands the new position to the monitor only when XY changed (104-108) and then sets `_validateMovementOnNextTick` (109). The component's `TickInternal` (50-87) runs `ValidateMovement` only inside `if (!Owner.IsLinkDeathTimerRunning)` (52) and only when that flag is set (65-69). So a sample is recorded when the packet arrives, and judged once per game-loop tick. The loop's time is set by `_tickPacer.WaitForNextTick()` (GameLoop.cs 99) and the target rate is `GAME_LOOP_TICK_RATE`, default 30 (ServerProperties.cs 274-275; `TickDuration = 1000.0 / GAME_LOOP_TICK_RATE` at GameLoop.cs 33). This is a fixed target rate with a one-tick allowance, not a variable step.
- Order of steps (as the code runs):
  (a) `RecordPosition` (51-82). Returns early while paused (55). If the server's max speed is lower than the last sample's, it stores the drop time and the old speed (58-65). It builds a sample from the position, the game-loop time, a monotonic millisecond stamp and the server's max speed (58, 67). If the last sample has the same game-loop tick, the new one replaces it; otherwise the last one moves to `_previous` (70-76). A safe-position snapshot is updated after that (80-81; not explained here).
  (b) `ValidateMovement` (84-145). Time difference between the last two samples, plus one game-loop tick as a processing allowance (86-94). Allowed speed = the server's max speed x 1.15 (98). If the max speed dropped within the last 750 ms, the older, higher speed is allowed instead (173-182). Allowed distance = allowed speed x time / 1000 (99). The squared 2D distance is compared with the squared allowed distance (97, 102).
  (c) On a hit (105-145). Count the hits still inside the window (107; the expiry is at 187-188, window = 1500 ms + accumulated pause). If the window was empty, reset the rollback target, the rollback count and the accumulated pause (109-114). Queue this hit's timestamp (116) and count it (117). On the first hit of a window the rollback target is set to the previous sample (120-125). Action only when the hit count reaches 6 (135), and only if the player is not allowed to fly and its privilege level is at or below the Player level (137).
  (d) `HandleSpeedHack` (193-220). Returns if there is no previous sample (196-197). If the rollback count is at least 5, the action is "kick": `SendPlayerQuit(true)` then `Disconnect()` (204-207). Otherwise: previous = current, current = rollback target (211-212), `MoveTo` the rollback position (214), rollback count + 1 (215). The count is not reset while hits stay in the window, so each later hit in that window repeats (d). With the default numbers: hits 6 to 10 each roll back (5 rollbacks), and hit 11 kicks.
  (e) Forced moves pause the monitor. `GamePlayer.MoveTo` (7854-7910) returns false early when the region or zone check fails (7868-7872). Otherwise it calls `movementComponent.ForceUpdatePosition()` (7901), which calls `Pause()` (PlayerMovementComponent.cs 89-93). `Pause` clears previous, current and the safe-position snapshot, sets `_pausedUntil` to now + 750 ms, and adds the newly-added pause time to the accumulated pause (147-159). The accumulated pause lengthens the violation window (187).
- Tick: the check is per game-loop tick (see above). It is not a per-frame or variable-step check.

## 2. Key functions

- `RecordPosition`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/PlayerMovementMonitor.cs` 51-82. Pause gate, speed-drop memory, same-tick collapse, sample shift.
- `ValidateMovement`: same file, 84-145. Time difference, allowed distance, hit window, rollback target, action gate.
- `HandleSpeedHack`: same file, 193-220. Kick versus rollback, the `MoveTo` call, the rollback counter.
- `Pause`: same file, 147-159. Forced-move pause and accumulated pause.
- `CalculateAllowedMaxSpeed` and `GetAndUpdateValidViolationCount`: same file, 173-182 and 184-191. Speed-drop grace and window expiry.
- Caller of the check: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Components/PlayerMovementComponent.cs` 50-87 (tick), 95-109 (position intake), 89-93 (forced-move pause).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Allowed distance = max speed x tolerance x elapsed time, plus one tick of processing allowance | Tolerance 1.15 (theirs, PlayerMovementMonitor.cs 42); tick 1000 / 30 ms (theirs, ServerProperties.cs 274-275; GameLoop.cs 33) |
| Hits counted in a sliding window before any action | Threshold 6 (theirs, PlayerMovementMonitor.cs 39); window 1500 ms (theirs, PlayerMovementMonitor.cs 40, with its comment at the same line saying it "must be at least ViolationThreshold * ~210") |
| Rollback to the last sample before the first hit, not a kick | None (mechanism) |
| Rollbacks counted per window; kick once the count reaches the limit | Limit 5 (theirs, PlayerMovementMonitor.cs 41); with the threshold of 6, hit 11 kicks |
| Grace after a max-speed drop, and a pause after a forced move | One constant, 750 ms (theirs, PlayerMovementMonitor.cs 43; the pause uses it at 157) |
| Window stretched by the time spent paused | None (mechanism, 147-159 and 187) |

## 4. TypeScript sketch

simplified: keeps the donor order: record (pause drop, speed-drop memory, same-tick collapse), then validate (allowed distance with the tolerance and the grace, window pruning with the accumulated pause, rollback target on the first hit, rollback or kick on the count), then the forced-move pause that clears both samples, as the donor's `MoveTo` does. It omits the safe-position snapshot, the flight and privilege exemption (PlayerMovementMonitor.cs 137), the cheat log and the kick I/O, the `MoveTo` success check (the sketch assumes the move works), the missing-previous-sample edge (the sketch returns early), and the Z axis (2D distance only, as in the donor).

```ts
// Licence: GPL-3.0 (donor repo LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Sample { x: number; y: number; t: number; tick: number; maxSpeed: number; }

export interface GuardConfig {
  tolerance: number;          // ratio; donor MaxSpeedToleranceFactor 1.15
  tickMs: number;             // one server tick; donor 1000 / GAME_LOOP_TICK_RATE (30)
  latencyBufferMs: number;    // grace after a speed drop and after a forced move; donor LatencyBuffer 750
  violationThreshold: number; // hits in the window before action; donor 6
  violationWindowMs: number;  // donor ViolationValidityDuration 1500
  teleportThreshold: number;  // rollbacks in one window before kick; donor 5
}

export type GuardAction =
  | { kind: "ok" }
  | { kind: "rollback"; to: Sample }
  | { kind: "kick" };

export class MoveGuard {
  private prev?: Sample;
  private cur?: Sample;
  private rollbackTo?: Sample;      // set on the first hit of a window
  private hits: number[] = [];      // hit timestamps, ms
  private rollbacks = 0;
  private pausedUntil = 0;
  private accumulatedPauseMs = 0;
  private dropAt = Number.NEGATIVE_INFINITY;
  private dropFrom = 0;

  constructor(private readonly cfg: GuardConfig) {}

  // Called for every client position report that changed the position.
  record(s: Sample, nowMs: number): void {
    if (nowMs < this.pausedUntil) return;                    // samples are dropped while paused
    if (this.cur && this.cur.maxSpeed > 0 && s.maxSpeed < this.cur.maxSpeed) {
      this.dropAt = nowMs;                                   // remember the speed allowed before the drop
      this.dropFrom = this.cur.maxSpeed;
    }
    if (this.cur && this.cur.tick === s.tick) this.cur = s;  // two reports in one tick: keep the last
    else { this.prev = this.cur; this.cur = s; }
  }

  // Called once per game tick, only when a position changed since the last tick.
  validate(nowMs: number): GuardAction {
    const prev = this.prev, cur = this.cur;
    if (!prev || !cur) return { kind: "ok" };
    const dt = cur.t - prev.t;
    if (dt <= 0) return { kind: "ok" };
    const allowedSpeed = this.allowedSpeed(cur) * this.cfg.tolerance;
    const allowedDist = allowedSpeed * (dt + this.cfg.tickMs) / 1000;
    const dx = cur.x - prev.x, dy = cur.y - prev.y;
    if (dx * dx + dy * dy <= allowedDist * allowedDist) return { kind: "ok" };

    const live = this.pruneHits(cur.t);
    if (live === 0) { this.rollbacks = 0; this.rollbackTo = undefined; this.accumulatedPauseMs = 0; }
    this.hits.push(cur.t);
    if (!this.rollbackTo) this.rollbackTo = prev;            // rollback target = sample before the first hit
    if (this.hits.length < this.cfg.violationThreshold) return { kind: "ok" };
    if (this.rollbacks >= this.cfg.teleportThreshold) return { kind: "kick" };

    const to = this.rollbackTo;
    this.prev = this.cur; this.cur = to;                     // same order as the donor: set, then move
    this.rollbacks++;
    this.onForcedMove(nowMs);                                // the server move clears both samples
    return { kind: "rollback", to };
  }

  // Called when the server itself moves the player (rollback, teleporter, zone change).
  onForcedMove(nowMs: number): void {
    this.prev = undefined; this.cur = undefined;
    const newUntil = nowMs + this.cfg.latencyBufferMs;
    this.accumulatedPauseMs += newUntil - Math.max(this.pausedUntil, nowMs);
    this.pausedUntil = newUntil;
  }

  private allowedSpeed(cur: Sample): number {
    const recentDrop = cur.t - this.dropAt <= this.cfg.latencyBufferMs;
    return recentDrop ? Math.max(this.dropFrom, cur.maxSpeed) : cur.maxSpeed;
  }

  private pruneHits(nowT: number): number {
    while (this.hits.length > 0 && nowT - this.hits[0] > this.cfg.violationWindowMs + this.accumulatedPauseMs) this.hits.shift();
    return this.hits.length;
  }
}
```

## 5. Lands in

- TARGET `origins/server/movement-guard.ts` (new). It is the server-side intake check for client-reported positions, so it is not fight state and does not belong in `src/fight/`. It is the closest fit to parity row 5 (controls/input intake), the row the addendum gives to intake. Row 18's server-tick sub-line ("server tick: fixed step, input intake, per-tick NPC budget") also applies because the check runs once per tick, but row 5 is the one that names the intake.
- today: not checked. No Frankendom repo was read in this pass, so whether a position check already exists is unknown.
- Reuse tag: adapt-shape (GPL-3.0: clean-room only, shape and steps, no lines copied)
- Brief rule served: server decides; clients only report (the server, not the client, decides whether a position is accepted); rules 7-9 n/a

Best transferable idea: a position report is only a claim, so the server checks it against max speed x a tolerance x elapsed time, counts hits in a sliding window, rolls back to the last accepted point, and kicks only after repeated rollbacks.
Decision (proposed): adapt. Frankendom's duels are decided by server input intake, so the check should not run on duel positions; it fits free-roam zone positions if any client reports them, and the rollback must stay a position change that never touches fight state (no reset of a guard, a combo or a hit).
Acceptance: a server test asserts that a report at more than 1.15x the allowed distance is not applied; the 6th hit inside 1.5 s returns the player to the last accepted position; hits 6 to 10 roll back and hit 11 disconnects; a report within the allowance is never flagged; and a 750 ms grace follows a max-speed drop.

## 6. Gaps and risks

- Server-verified kills: this check verifies movement reports, not kills or hits. In Frankendom a duel is decided by server input intake (row 5); if the server simulates movement from input, the position check is only needed for zone positions a client reports, and it should not run inside a duel.
- Rollback is a visible snap. It must not reset guard, stamina, combo or hit state. One ledger: the rollback changes only the position.
- The `MoveTo` result is not checked. `HandleSpeedHack` sets the current sample to the rollback target (212) and then calls `MoveTo` (214) without looking at the return value. `GamePlayer.MoveTo` returns false early when the zone is missing (7868-7872), and then the player is not moved and not paused, but the monitor already believes it was rolled back. Frankendom must commit the rollback only when the move succeeds.
- A forced move drops reports silently for 750 ms (`RecordPosition` 55). Any movement in that window is not validated. Frankendom should prefer resetting the baseline over dropping samples.
- Only the last report per game-loop tick is judged (70-71). Earlier reports in the same tick are overwritten and never checked. Frankendom's intake must count or validate every input, or set a rule that one input per tick is enough.
- Staff and flight exemption (137): a player with flight rights or a staff privilege is never acted on, but their hits are still counted. If Frankendom needs an exemption, make it a role flag in data, not a special case in the check.
- 2D distance only (97, `AsVector2`). Height is ignored. Decide whether zones need a Z check.
- All numbers are code constants (39-43), not zone data. Tolerance and window are fixed rules of the engine; the speed comes from the character. Put only the max speed in data.
- The kick path (204-207) and the cheat log call (201) were not read in depth. The log fields are useful: character, account, address, distance, allowed distance, speed, allowed speed, rollback count. Frankendom's log should carry the same fields.
- The `ViolationValidityDuration` comment (40) says the window must be at least threshold x about 210 ms, which assumes the client reports every 200 ms. Check any Frankendom report rate against it.
- GPL-3.0 licence: clean-room. The sketch was written from the steps above, not from the lines. The file header template in the repo says GPL v2 or later, which is a conflict to note; it does not change the clean-room rule.

Reuse tag: adapt-shape (GPL-3.0: clean-room only)
Brief rule served: server decides; clients only report; rules 7-9 n/a
