# MovingBlocks-Terasology (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/core/internal/TimeBase.java` (`TimeBase.tick`, `TimeBase.updateTimeFromServer`, `TimeStepper`), with `network/internal/NetworkSystemImpl.java` (`update`), `network/internal/ServerImpl.java` (`update`, `processMessages`), `network/internal/NetClient.java` (`update`, chunk budget) and `core/TerasologyEngine.java` (frame loop) | Licence: Apache-2.0 (`LICENSE` line 3 "Version 2.0, January 2004"; SPDX-License-Identifier: Apache-2.0 in TimeBase.java line 2 and NetworkSystemImpl.java line 2) | Java | symbol `TimeBase.tick`

Checked: Opened and read in full: `core/internal/TimeBase.java` 1-191; `network/internal/NetworkSystemImpl.java` 185-205 and 322-392; `network/internal/ServerImpl.java` 155-200 and 247-262; `network/internal/NetClient.java` 205-262 (net-tick body; the chunk budget at 239-241); `core/TerasologyEngine.java` 545-600 (frame loop); `core/subsystem/common/NetworkSubsystem.java` 41-42. Hint file `engine/src/main/protobuf/NetMessage.proto`: a schema only; the `time` field (line 16) is the carrier, the logic is in the files above. Candidates checked: TimeBase, NetworkSystemImpl, ServerImpl, NetClient, TerasologyEngine, NetworkSubsystem, plus grep only of `WorldTimeImpl.java` (day-length events, not the server tick). Not read: `ServerImpl.sendEntities` body, `NetClient.processReceivedMessages`, `core/Time.java` wrapper, the body of `currentState.update` (game content), the zero-delta sleep path at the top of `TimeBase.tick`. Confidence: high on the frame clock, the server-time convergence and the net-tick schedule; medium on the send payloads (partly read). camera_scope: n/a (not a camera cell).

Best transferable idea: The server stamps its game time on every net message and the client closes 10 percent of the gap each frame, while the frame itself is split into capped cycles and state is sent on a fixed 50 ms schedule.
Decision (proposed): adapt - take the server-time stamp, the 10-percent convergence for client display clocks (Pit timers, HUD round clock) and the 50 ms snapshot cadence with a per-tick byte budget for chunk and asset streaming; reject the variable frame step for the duel and the silent 1-second clip of long stalls, because a stall must be visible and the kill order must not depend on frame time.
Acceptance: A server test sends a server time 300 ms ahead of a client and asserts the gap shrinks by 10 percent per frame to within 1 ms in under 30 frames; a 5-second stall shows a visible "stalled" state in the Pit, not a silent 1-second clip, and no kill is decided from client time.

## 1. Mechanism

- Frame order (`TerasologyEngine` 559-574). Each frame: `time.tick()` returns an iterator of update cycles (559). Subsystems run `preUpdate` with the real delta, and `NetworkSubsystem.preUpdate` calls `networkSystem.update()` (`NetworkSubsystem.java` 42). Then each cycle runs `next()`, which advances game time (`TimeBase` 182), then `currentState.update(cycle)` (570-572). Network work therefore runs before the world cycles in the same frame.
- Frame clock (`TimeBase.tick`, 46-90). Real delta is `now - last` (48). The delta is multiplied by a game-time dilation (64), capped at 1000 ms (65-68, with a warning log): a longer stall is clipped, not replayed. The frame is split into `ceil(delta / 1000)` cycles of equal length (69, then `newDelta / updateCycles` at 88). Integer division means the cycles sum to slightly less than the frame delta.
- Server time convergence (72-79, 149-150). `updateTimeFromServer(target)` sets `desynch = target - gameTime`. Each frame, if `desynch != 0`, the clock adds `ceil(desynch x 0.1)` (at least one millisecond in the right direction, 74-75) to game time and subtracts the same from `desynch` (78). The gap closes by about a tenth per frame and never jumps.
- Pause (82-83). When paused, the frame runs one zero-length cycle, so network work still runs but game time does not move.
- Server stamp and apply (`ServerImpl.update`, 163-171; `processMessages`, 253). The server writes its game time into each net-tick message (165) and into event-only messages (171). On the client, every queued message with a time calls `updateTimeFromServer` (253). The field is `optional int64 time = 9` on `NetMessage` (`NetMessage.proto` 16).
- Net tick (`NetworkSystemImpl.update`, 332-351). Reads real time (336). If real time is past `nextNetworkTick` (338), the schedule moves forward by one period of 50 ms (339) and this update is a net tick. Every client's `update(netTick)` (344) and the server's `update(netTick)` (348) get the flag. The schedule is not reset to now, so after a stall the flag fires on successive updates until the schedule catches up.
- Server per-tick work (`ServerImpl.update`, 160-178). On a net tick: one message with game time, entities and events. Off a net tick: a message only if events are queued. Then the queued inbound messages are processed (`processMessages`).
- Client per-tick work (`NetClient.update`, 207-221). On a net tick, one message with game time, block registrations, chunk invalidations, new chunks, removed and initial and dirty entities, events. Inbound messages are processed every frame.
- Chunk budget (`NetClient` 239-241). The budget grows by `chunkSendRate x 0.05 s x bandwidthPerClient` on each net tick (239). When it passes 1.0 (240), the nearest ready chunk to the player is sent and 1.0 is subtracted (241).

## 2. Key functions

- `TimeBase.tick`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/core/internal/TimeBase.java` 46-90 (delta, dilation, cap, cycles, convergence, pause).
- `TimeBase.updateTimeFromServer` and `TimeStepper.next`: same file, 149-150 and 182.
- `NetworkSystemImpl.update`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/network/internal/NetworkSystemImpl.java` 332-351.
- `ServerImpl.update` and `processMessages`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/network/internal/ServerImpl.java` 160-178 and 247-262.
- `NetClient.update` and chunk budget: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/network/internal/NetClient.java` 207-241 (update closes at 221).
- Frame loop: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/core/TerasologyEngine.java` 559-574.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cap a stalled frame's game time | 1000 ms cap (theirs, TimeBase.java 21, 65-67) |
| Split a frame into equal cycles no longer than a limit | 1000 ms per cycle (theirs, TimeBase.java 20, 69) |
| Close a fraction of a clock gap every frame, at least one unit | 0.1 per frame, minimum 1 ms (theirs, TimeBase.java 18, 73-75) |
| Fixed-period send schedule on real time | 50 ms (theirs, NetworkSystemImpl.java 113); the client copy uses 0.05 s (theirs, NetClient.java 71). Two constants for one cadence |
| Per-tick byte budget for streaming | rate 0.05469 per client per second (theirs, NetClient.java 102, 239); one chunk per pass (240-241) |
| Smoothed frame time for display | decay 0.95 (theirs, TimeBase.java 16); display only, not used for game time |

## 4. TypeScript sketch

simplified: the clock keeps the donor order: real delta, dilation, cap, server-gap correction, pause, then equal cycles with integer division and a per-cycle game-time advance. The net tick and the chunk budget are separate small pieces with the donor's schedule rule (advance one period, not to now) and budget rule. It omits the frame-delta smoothing used only for display, the zero-delta sleep and re-read at the top of `tick`, the log on a capped stall, the registration, entity, chunk and event payloads, the nearest-chunk choice, and the source of the bandwidth figure. The clock shows only the time logic, not the client and server split.

```ts
// Licence: Apache-2.0 (donor, permissive). Written from the described mechanism (shape adapted, no lines copied).
export const UPDATE_CAP_MS = 1000;      // most game time applied in one frame; a longer stall is clipped
export const MAX_CYCLE_MS = 1000;       // each update cycle is at most this long
export const RESYNC_RATE = 0.1;         // share of the server gap closed each frame
export const NET_TICK_MS = 50;          // state send cadence, on real time
export const NET_TICK_S = 0.05;         // same cadence in seconds, used by the chunk budget

export class FrameClock {
  private last: number;
  private gameTimeMs = 0;
  private desynchMs = 0;               // server time minus local game time
  private dilation = 1;
  private paused = false;

  constructor(nowMs: number) {
    this.last = nowMs;
  }

  // Returns the cycle lengths (seconds) to run this frame. Game time advances per cycle.
  tick(nowMs: number): number[] {
    let delta = Math.trunc((nowMs - this.last) * this.dilation);
    this.last = nowMs;
    if (delta >= UPDATE_CAP_MS) delta = UPDATE_CAP_MS; // clip, do not run the extra time

    // Close part of the server gap before the cycles run.
    if (this.desynchMs !== 0) {
      let diff = Math.ceil(this.desynchMs * RESYNC_RATE);
      if (diff === 0) diff = Math.sign(this.desynchMs);
      this.gameTimeMs += diff;
      this.desynchMs -= diff;
    }

    if (this.paused) return [0];          // one zero-length cycle, as the donor does

    const cycles = Math.trunc((delta - 1) / MAX_CYCLE_MS) + 1; // integer division, as in the donor
    const per = Math.trunc(delta / cycles);
    const out: number[] = [];
    for (let i = 0; i < cycles; i++) {
      this.gameTimeMs += per;
      out.push(per / 1000);
    }
    return out;
  }

  // A net message carries the server's game time: aim the local clock at it.
  updateFromServer(targetMs: number): void {
    this.desynchMs = targetMs - this.gameTimeMs;
  }

  setPaused(p: boolean): void { this.paused = p; }
  setDilation(d: number): void { this.dilation = d; }
  gameTime(): number { return this.gameTimeMs; }
}

// Net tick schedule: due when real time passes the schedule; the schedule moves by one period, not to now.
export class NetTicker {
  private next: number;

  constructor(nowMs: number) {
    this.next = nowMs;
  }

  due(nowMs: number): boolean {
    if (nowMs > this.next) {
      this.next += NET_TICK_MS;
      return true;
    }
    return false;
  }
}

// Chunk budget: accumulate per net tick, send one chunk and pay 1.0 when the budget passes 1.0.
export function chunkBudget(counter: number, rate: number, bandwidthPerClient: number): { counter: number; send: boolean } {
  let c = counter + rate * NET_TICK_S * bandwidthPerClient;
  if (c > 1.0) {
    c -= 1.0;
    return { counter: c, send: true };
  }
  return { counter: c, send: false };
}
export {};
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module): the fight's snapshot cadence (50 ms net tick) and the per-tick byte budget for chunk and asset streaming. The server time stamp is carried on every snapshot; the Pit and HUD display clocks converge to it. The duel clock itself stays on the server's fixed step.
- Parity-checklist row 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). The snapshot cadence and byte budget are the intake and output side of that sub-line.
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, the sketch is written from the mechanism)
- Brief rule served: 1 (one engine, one clock for every client); rules 7-9 n/a

## 6. Gaps and risks

- Apache-2.0: permissive. The sketch is written from the mechanism; the shape is adapted, no lines copied.
- Variable frame step (`TimeBase` 69, 88): each frame is split into equal cycles up to 1 s, so the cycle length follows the machine's frame time. Correct for a client that keeps up with the display; wrong for the duel step, where damage and kill order must not depend on load. Reject it for the fight.
- Silent clip of long stalls (`TimeBase` 65-67): a stall longer than 1 s of game time is applied as exactly 1 s; the rest is discarded (the donor logs a warning). For us a stall must be visible in the Pit as a stall. Reject the silent clip.
- The convergence rule (72-79) is safe for display clocks: a 10 percent step per frame never jumps the clock. It is not a gameplay rule: a client must never decide a kill or a hit from its own game time. The server's stamp is the only truth.
- The net schedule (`NetworkSystemImpl` 338-339) advances by one period, so after a stall the net-tick flag fires on successive updates until the schedule catches up: a burst of snapshots after a stall. Frankendom should drop stale snapshots rather than send the burst (stale-state).
- Integer division (`TimeBase` 69, 88) drops up to one millisecond per extra cycle each frame, so game time runs slightly slow under load. A fixed-step accumulator on the server avoids this.
- Two constants for one cadence: 50 ms on the server side (`NetworkSystemImpl` 113) and 0.05 s on the client side (`NetClient` 71). Keep one value in Frankendom.
- Not read: `ServerImpl.sendEntities`, `NetClient.processReceivedMessages`, `core/Time.java`, the body of `currentState.update`, the zero-delta sleep at the top of `TimeBase.tick`.
