# ClassicUO (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/GameController.cs` (frame loop), `.../Client/Network/NetClient.cs`, `.../Client/Network/Socket/TcpSocketWrapper.cs`, `.../Client/Network/NetStatistics.cs`, `.../Client/Network/PacketHandlers.cs` (parse, confirm, deny, ping), `.../Client/Game/Managers/WalkerManager.cs`, `.../Client/Game/GameObjects/PlayerMobile.cs` (walk request), `.../Client/Game/Scenes/GameScene.cs` (ping cadence), `.../Client/Game/Constants.cs` | Licence: BSD 2-Clause License, "Copyright (c) 2025, andreakarasho" (LICENSE.md; file headers `SPDX-License-Identifier: BSD-2-Clause`) | C# | symbol `GameController.Update`

Checked: Read in full: `GameController.Update` (381-409), `NetClient.CollectAvailableData` (158-212), `NetClient.Flush`, `Send`, `ProcessSend` (214-309), `NetStatistics.cs` (all 138 lines), `WalkerManager.cs` (all 199 lines), `PlayerMobile.Walk` (523-690), the 0x21 and 0x22 handlers (1178-1216), the ping handler (2672-2676), the ping cadence in `GameScene.cs` (746-750). Read in part: `TcpSocketWrapper.Read` (57-82), `PacketHandlers.ParsePackets` (57-117). Not read: the server side. The donor is a client only: no server tick loop, no NPC budget and no server validation code exist in it (grep for server, anti-cheat and tick words found none in the client), so the "server tick" here is the client's intake and sync loop. Confidence: high for the frame loop, pacing and confirm/deny order; medium for the packet parser's partial-packet rules (read the entry only). camera_scope: not a camera note.

## 1. Mechanism

- Clock. `IsFixedTimeStep = false` (`GameController.cs` 61) with `TargetElapsedTime` set to 4 ms (62). With the fixed step off, MonoGame calls `Update` as fast as the frame allows and this target is not used (MonoGame behaviour, not run here). Each `Update` sets `Time.Ticks` (ms from `gameTime.TotalGameTime`, 388) and `Time.Delta` (389).
- Order inside one frame (`GameController.Update`, 381-409): mouse update; one socket read (`CollectAvailableData`, 393); parse all complete packets (394); plugin tick; `Scene.Update()` when a scene is loaded; UI update; then `NetClient.Socket.Flush()` (397), which sends everything queued this frame.
- Intake. `CollectAvailableData` does one `Read` call per frame into a 4096-byte buffer (`NetClient.cs` 18, 167). `TcpSocketWrapper.Read` returns `min(buffer, Available)` bytes (62), so the rest stays in the OS socket until a later frame. `ParsePackets` appends the bytes to a circular buffer and dequeues every complete packet in a loop (`PacketHandlers.cs` 72); a packet that is not complete yet stops the loop and waits for more data (98). An unknown packet ID also stops the loop (the warning branch, not read in full), so the stream is not drained past it.
- Flush. `ProcessSend` writes the queued send buffer in chunks while `_sendStream.Length > 0` (`NetClient.cs` 269). Sends are queued by `Send` (220-250) and go out once per frame.
- Ping. `GameScene.Update` sends a ping when `Time.Ticks > _timePing` (746), via `Statistics.SendPing()`, which stamps the send time and sends packet 0x73 with a slot index (`NetStatistics.cs` 71-81). It then sets `_timePing` to now + 1000 (749), so one probe per second. The reply (0x73 handler, `PacketHandlers.cs` 2674) stores `Time.Ticks - _startTickValue` in slot `idx % 5` (`NetStatistics.cs` 66-69). `Ping` is the average of the non-zero slots (41-63). The statistics window rolls every 500 ms (96).
- Walk pacing (sender side, `PlayerMobile.Walk`). Refused while `WalkingFailed`, while `LastStepRequestTime > Time.Ticks`, when `StepsCount >= 5` (`PlayerMobile.cs` 525), or while paralysed on new clients. Turn-only moves are not sent when 3 or more packets are unconfirmed; the direction is set locally and the time gate is pushed back (621-626). Otherwise the move is recorded in `Walker.StepInfos` with its sequence byte, the 0x02 request is sent with that sequence and the next fast-walk key (668), `UnacceptedPacketsCount` goes up (682), the sequence advances and wraps 0xFF to 1 (673-680), and the time gate is set to now + the step time (686).
- Confirm (0x22, `ConfirmWalk` at `PacketHandlers.cs` 1214 into `WalkerManager.ConfirmWalk` 125-187). The sequence is searched in the in-flight list (`stepIndex`, 132-142). If it is not found, it is a bad step (144). If it is found at or after the local head (`CurrentWalkSequence`), it is marked accepted (149-154). If it is the oldest entry, it is dropped and the head moves back (156-168). Any other case is a bad step (169-172). A bad step sends `Send_Resync` once (177-181), sets `WalkingFailed`, and clears the list and head (183-185).
- Deny (0x21, `DenyWalk` at `PacketHandlers.cs` 1192 into `WalkerManager.DenyWalk` 108-123). It clears the local steps, runs `Reset()`, moves the player to the server tile when x is not -1, and syncs the direction. `Reset()` (189-198) clears the list, sequence, the failed flag and the time gate.
- Step completion (`Mobile.cs`, `ProcessSteps` removal block, read). When the local animation finishes a step, the head entry is removed if the server already accepted it (`Mobile.cs` 791-832: the accepted test at 806, the shift of `StepInfos` at 819-822, `StepsCount--` at 828). Otherwise the head moves forward (832: `CurrentWalkSequence++`), so a late confirm still lands at or after the head.

## 2. Key functions

- `GameController.Update`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/GameController.cs` 381-409 (frame order; intake at 393-394; flush at 397).
- `NetClient.CollectAvailableData`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Network/NetClient.cs` 158-212 (one read; decrypt; decompress).
- `NetClient.Flush` / `ProcessSend`: `NetClient.cs` 214-218 and 260-309.
- `TcpSocketWrapper.Read`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Network/Socket/TcpSocketWrapper.cs` 57-82 (min of buffer and available bytes).
- `PacketHandlers.ParsePackets` (stream loop): `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Network/PacketHandlers.cs` 57-117 (entry and loop read; the plugin path not read).
- `WalkerManager.ConfirmWalk` / `DenyWalk` / `Reset`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Managers/WalkerManager.cs` 108-198.
- `PlayerMobile.Walk`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/GameObjects/PlayerMobile.cs` 523-690.
- `NetStatistics` ping ring and average: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Network/NetStatistics.cs` 41-81.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bounded in-flight window of sequenced intents | 5 (theirs, `Constants.cs` 16, `MAX_STEP_COUNT`) |
| Time gate per intent: next allowed = now + the step's duration | Turn 80 ms (theirs, `Constants.cs` 17); fast turn 45 ms (`Constants.cs` 18); walk 400 ms (`MovementSpeed.cs` 12); run 200 ms (`MovementSpeed.cs` 11) |
| Sequence byte, wraps 0xFF to 1, confirm by sequence | Byte sequence (`PlayerMobile.cs` 673-680) |
| Unknown or out-of-order confirm = bad step, resync once, block until reset | Block until reset (`WalkerManager.cs` 183) |
| Turn-only coalescing under congestion | Threshold 3 unconfirmed (`PlayerMobile.cs` 621) |
| One socket read per frame, capped | 4096 bytes (`NetClient.cs` 18); at 60 frames per second this is about 240 KB/s of intake (arithmetic from the constant, not measured) |
| Ping cadence and average | 1000 ms between probes (`GameScene.cs` 749); 5 slots (`NetStatistics.cs` 13); 500 ms stats window (96) |

## 4. TypeScript sketch

simplified: the donor's client mirror of the server queue, not a server tick. The sketch keeps the window of 5, the time gate, sequence confirm with the head rule, the one-resync-then-block rule, reset on deny, the capped per-frame read, and the 1 Hz ping ring. It omits the turn coalescing, the direction and Z checks, the packet encoding and parsing (the 0x22 notoriety byte, the plugin path), encryption and decompression, the paralysis and stamina gates, the world-range update, and the resync packet body. The ping keeps the donor's single send time, so a reply to an older probe is measured from the newest send (the donor has this error too). The head rule matches the donor's removal block; the donor's `StepsCount` bookkeeping is folded into the array length.

```ts
// Licence: BSD-2-Clause (donor). Shape only, written from the described mechanism; not a translation.
const MAX_IN_FLIGHT = 5;        // donor Constants.MAX_STEP_COUNT
const READ_CAP_BYTES = 4096;    // donor NetClient _compressedBuffer: at most this per frame
const PING_EVERY_MS = 1000;     // donor GameScene: next ping due 1000 ms after the last
const PING_SLOTS = 5;           // donor NetStatistics _pings

// Intake, once per frame: one bounded read, then every complete packet is parsed; a partial packet waits.
function frameIntake(
  pending: number[],
  socketBytes: Uint8Array,
  lengthOf: (b: number[]) => number | undefined, // undefined = header not complete yet
  onPacket: (p: number[]) => void
): void {
  pending.push(...socketBytes.subarray(0, READ_CAP_BYTES)); // the rest stays in the socket for later frames
  for (;;) {
    const len = lengthOf(pending);
    if (len === undefined || pending.length < len) break;
    onPacket(pending.splice(0, len));
  }
}

interface InFlight { seq: number; dir: number; x: number; y: number; accepted: boolean; }

// Sequenced move intents: bounded in flight, time-gated, confirmed by sequence (donor WalkerManager + PlayerMobile.Walk).
class MoveSync {
  private queue: InFlight[] = [];
  private head = 0;          // donor CurrentWalkSequence: where the local animation is in the queue
  private seq = 0;
  private nextAllowedAt = 0;
  failed = false;
  private resyncSent = false;

  canSend(now: number): boolean {
    return !this.failed && now >= this.nextAllowedAt && this.queue.length < MAX_IN_FLIGHT;
  }

  send(now: number, dir: number, x: number, y: number, stepMs: number): number {
    const s = this.seq;
    this.seq = s === 0xff ? 1 : s + 1;   // wraps 0xFF to 1 (donor)
    this.queue.push({ seq: s, dir, x, y, accepted: false });
    this.nextAllowedAt = now + stepMs;
    return s;
  }

  // Server confirm. Unknown sequence, or one behind the head that is not the oldest, is a bad step.
  confirm(seq: number): "ok" | "resync" {
    const i = this.queue.findIndex(e => e.seq === seq);
    if (i < 0) return this.bad();
    if (i >= this.head) { this.queue[i].accepted = true; return "ok"; }
    if (i === 0) { this.queue.shift(); this.head -= 1; return "ok"; }
    return this.bad();
  }

  // Local animation finished a step: an accepted step leaves the queue, an unconfirmed one moves the head.
  finishLocalStep(): void {
    if (this.queue.length === 0) return;
    if (this.queue[this.head]?.accepted) this.queue.splice(this.head, 1);
    else this.head += 1;
  }

  // Donor: bad step sends resync once, blocks walking, and clears the queue.
  private bad(): "resync" {
    if (!this.resyncSent) { this.resyncSent = true; /* send resync packet here */ }
    this.failed = true;
    this.queue = [];
    this.head = 0;
    return "resync";
  }

  // Server deny or full reset (donor DenyWalk -> Reset).
  reset(): void {
    this.failed = false; this.queue = []; this.head = 0; this.seq = 0;
    this.resyncSent = false; this.nextAllowedAt = 0;
  }
}

// Ping: one probe per second; five slots; average of non-zero samples (donor NetStatistics).
class PingRing {
  private slots: number[] = new Array<number>(PING_SLOTS).fill(0);
  private idx = 0;
  private sentAt = 0;
  send(now: number): number { this.sentAt = now; const i = this.idx; this.idx = (this.idx + 1) % PING_SLOTS; return i; }
  received(slot: number, now: number): void { this.slots[slot % PING_SLOTS] = now - this.sentAt; }
  average(): number {
    const v = this.slots.filter(x => x !== 0);
    return v.length === 0 ? 0 : Math.floor(v.reduce((a, b) => a + b, 0) / v.length);
  }
}
export {};
```

## 5. Lands in

- TARGET `origins/server/tick.ts` (new module: the per-tick intake and sequenced-intent window). Parity-checklist row 18, the post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget". Input intake is row 5, but the tick rule is the one named here.
Best transferable idea: let the server accept a small fixed window of sequenced move or attack intents per tick, confirm or deny each by sequence, and move the player only on a deny.
Decision (proposed): adapt. Take the sequenced window, the confirm/deny order and the per-tick intake budget; reject the donor's per-frame read cap of 4096 bytes as a tuning choice (Frankendom's budget is per tick and a data field), and reject the variable-step frame loop (row 18 requires a fixed server step).
Acceptance: a server test sends 6 intents in one tick: 5 are accepted into the window and the 6th is refused until a confirm arrives; a confirm for an unknown sequence returns one resync and no further intents until a reset; a deny moves the fighter to the server's tile and clears the window.
- Reuse tag: rewrite-from-idea (BSD-2-Clause, code may be adapted; written as a clean sketch)
- Brief rule served: 1 (one engine: the server owns the tick and the window; the client only mirrors it); kills stay server-verified (the client never decides a hit).

## 6. Gaps and risks

- No server in this donor. The 5-deep window and sequence rules are the client half only; the server enforcement (what it does with an intent past the window, or with a stale sequence) was not read because it is not in the repo. Frankendom must specify and test the server half itself.
- The client runs on variable frames (`IsFixedTimeStep = false`). Frankendom's server tick must be fixed-step (row 18). Do not copy the frame-driven intake; copy only the per-tick budget idea.
- One read per frame at 4096 bytes is a latency and burst choice. Under a burst the rest waits in the OS buffer for later frames. Frankendom should budget packets per tick and say what happens to the rest.
- The ping stores one send time, so an out-of-order reply is measured from the newest send. Frankendom's latency display, if any, must key each probe by its own id.
- Prediction and snap: the client shows a move before the server confirms and snaps on deny. Frankendom's rule (engage is a state change; kills server-verified) allows prediction only for movement, not for a kill, and a deny must be the only snap.
- Turn coalescing at 3 unconfirmed is a congestion rule. It is not the same as Frankendom's MAX_ATTACKERS = 3, and must not be reused as one.
- The donor's bad step blocks walking until a reset (a deny or the reset path). If Frankendom uses this, a missing deny would freeze the player; a timeout is needed.
