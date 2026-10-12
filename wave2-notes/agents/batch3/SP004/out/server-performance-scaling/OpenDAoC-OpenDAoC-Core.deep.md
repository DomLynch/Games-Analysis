# OpenDAoC-OpenDAoC-Core (server-performance-scaling, cell 38)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/Managers/GameLoop/GameLoopTickPacer.cs` (with `GameLoop.cs`, `ECS-Services/ClientService.cs`, `ECS-Services/NpcService.cs`, `world/Zone.cs`) | Licence: repo `LICENSE` file is the GNU GPL version 3 text; `gplheader.txt` (template header) says "version 2 of the License, or (at your option) any later version"; the two disagree, and the files I read carry no per-file header, so treat as copyleft (GPL), clean-room only | C# | symbol `GameLoopTickPacer.WaitForNextTick`

Checked: Read in full: `GameLoop.cs` (Init, Run, TickServices, BuildTickSequence), `GameLoopTickPacer.cs` (all 157 lines), `GameLoopThreadPoolMultiThreaded.cs` (all 420 lines), `ShardedServiceObjectArray.cs` (all), `SchedulableServiceObjectArray.cs` (all 171 lines), `NpcService.cs` (all), `ClientService.cs` (BeginTickInternal, EndTickInternal, UpdateWorld, UpdateNpcs, UpdateItems, UpdateDoors, UpdateHouses), `GameServiceUtils.cs` ShouldTick, `Zone.cs` GetObjectsInRadius (320-394), `PacketProcessor.cs` SendPendingPackets, ProcessTcpPacket (320-365), SendTcpAndResetContext, GetAvailableTcpSendArgs. Not read: `GameLoopService.cs`, `TimerService.cs`, `GameServiceBase.cs` posted-action batching, `ServiceObjectArrayBase.cs` and `ServiceObjectStore.cs` internals, the base `ProcessItemsToRemove` path, `Diagnostics`, `TickPool`/`TickObjectPool` (per-tick pooled lists), `ProcessUdpPacket`. Confidence: high on the pacer, the service order and the interest-set code; medium on the timing wheel (base-class ordering not read). Server donor, so camera_scope does not apply.

## 1. Mechanism

- One dedicated game-loop thread runs a fixed-rate loop. The rate is the `game_loop_tick_rate` property, default 30 ticks per second (`ServerProperties.cs` 274). The tick duration is `1000.0 / rate`, about 33.33 ms (`GameLoop.cs` 33).
- Each iteration runs a fixed list of services in a fixed order (`GameLoop.cs` 148-162). The order is: GameLoopService, TimerService, ClientService.BeginTick (receive client packets: input intake), NpcService (brains think), AttackService, CastingService, EffectService, EffectListService.BeginTick, EffectListService.EndTick, MovementService, CraftingService, ReaperService, ZoneService, ClientService.EndTick (send), RolloverSchedulerService. Input is read first and packets go out near the end.
- After the services run, `WaitForNextTick` (`GameLoopTickPacer.cs` 73-106) does the timing. It sleeps until the deadline minus an estimated sleep overshoot (81-84), then spins until the deadline (87-88). It then checks lateness: if the loop finished a whole tick or more after the deadline, it drops the missed ticks and sets the next deadline to now plus one tick (93-94); otherwise it advances the deadline by exactly one tick (96). Game-loop time advances by exactly the tick duration each iteration (99), not by measured wall time.
- The sleep overshoot is estimated by a separate thread (`UpdateBusyWaitThreshold`, 108-155). It samples `Thread.Sleep(1)` ten times, keeps the maximum overshoot, and recalibrates every 10 s (114, 139).
- Interest management (`ClientService.cs` 794-830, `UpdateNpcs`). For each player, the set of NPCs within `VISIBILITY_DISTANCE` (6000) that are active, visible and detectable is rebuilt each update (799-803). Cache entries that left the set are removed (805-811). A new NPC is created for the client. An NPC already known is re-sent only when its last update is older than `WORLD_NPC_UPDATE_INTERVAL` (default 5000 ms, 820). The player's current target and pet are re-sent when their health percent changed and the last update is older than 250 ms (822-826).
- Static items, doors and houses use the same in-range pattern, with `WORLD_OBJECT_UPDATE_INTERVAL` (default 30000 ms). Items have no update packet, only a create (860-861).
- The player world update itself runs at most once per `WORLD_PLAYER_UPDATE_INTERVAL` (default 1000 ms, 136), gated by `ShouldTick` (`GameServiceUtils.cs` 20, a signed comparison of a tick time against the loop time).
- Radius query (`world/Zone.cs` 330-394). A zone is a 32 by 32 grid of subzones, each 65536/32 = 2048 units (21, 23). The search covers `(radius >> shift) + 1` subzone cells in each direction (337), so the 6000-unit visibility query scans a 7 by 7 block, clipped at zone edges. Subzones whose nearest edge is too far are skipped (379), and objects are kept only if inside the squared radius (389).
- Outbound packets are queued per client and drained once per tick in the send step (`PacketProcessor.cs` 266-273). They are copied into one 8192-byte TCP buffer (`CoreBase/Network/BaseClient.cs` 13) and the buffer is flushed when the next packet does not fit (341-343). A pool of four send buffers exists (16). When the pool is empty, the packet is dropped (334-335, and the pool miss at 626-629 increments `_sendBufferPoolExhaustedCount`). `StatPrint.cs` 91 reads that counter, so exhaustion is visible in stats.
- Many-object work is spread over threads with `ExecuteForEach` and `ExecuteForEachSharded` (`GameLoop.cs` 64-72). The multi-threaded pool uses guided chunking. Chunk size is `remaining / bias[active]`, where the bias is `i^2.5` (`MultiThreaded.cs` 19, 83, 284-285), and each chunk is claimed with `Interlocked.Add` (290). The caller spins until all workers finish (176-177). Objects are split into one shard per thread, assigned round-robin (`ShardedServiceObjectArray.cs` 24, 44).
- NPC brains cost is spread by interval, not capped by count. A brain thinks only when `NextThinkTick` is due (`NpcService.cs` 52-53), then sets `NextThinkTick = GameLoopTime + ThinkInterval` (69).
- Long sleeps use a 50 ms timing wheel with 65,536 buckets and a far-future priority queue (`SchedulableServiceObjectArray.cs` 16-18, 30, 93-96). A wake-up within 30 ticks (about 1 s) bypasses the wheel (20, 42).

## 2. Key functions

- `GameLoopTickPacer.WaitForNextTick`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/Managers/GameLoop/GameLoopTickPacer.cs` 73-106. Sleep to the deadline, spin, then drop-or-advance the deadline.
- `GameLoop.Run` and `TickServices`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/Managers/GameLoop/GameLoop.cs` 94-109 and 115-142. The while loop runs `TickServices()` then `WaitForNextTick()`.
- `GameLoop.BuildTickSequence`: same file, 144-176. The fixed service order.
- `ClientService.UpdateNpcs`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Services/ClientService.cs` 794-830. Per-player interest set with per-object cadence.
- `Zone.GetObjectsInRadius` (int x, y, z overload): `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/Zone.cs` 330-394.
- `PacketProcessor.SendPendingPackets` and `ProcessTcpPacket`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/packets/Server/PacketProcessor.cs` 266-301 and 320-365.
- `GameLoopThreadPoolMultiThreaded.ProcessWorkActions`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/Managers/GameLoop/GameLoopThreadPoolMultiThreaded.cs` 272-307.
- `SchedulableServiceObjectArray.Schedule` and `WakeUpItems`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/Managers/ServiceObject/SchedulableServiceObjectArray.cs` 36-59 and 99-165.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-step deadline loop; a whole tick late resets the schedule (no catch-up burst) | 30 ticks per second, 33.33 ms (`ServerProperties.cs` 274; `GameLoop.cs` 33) |
| Fixed service order: intake first, send near the end | Order list only (`GameLoop.cs` 148-162) |
| Per-player in-range set with per-object-type update cadence | Visibility 6000 units (`WorldMgr.cs` 60). NPC 5000 ms (`ServerProperties.cs` 637), static objects 30000 ms (640), player check 1000 ms (643). Target and pet health 250 ms (`ClientService.cs` 824) |
| Subzone grid radius query | 32 by 32 subzones per zone, 2048 units each (`Zone.cs` 21, 23) |
| Guided chunk split over threads | Bias exponent 2.5 (`MultiThreaded.cs` 19) |
| Fixed send buffer pool; drop and count on exhaustion | 4 send buffers (`PacketProcessor.cs` 16); 8192 bytes each (`CoreBase/Network/BaseClient.cs` 13) |
| Timing wheel for long sleeps | 50 ms resolution, 65536 buckets (`SchedulableServiceObjectArray.cs` 16-18); near wake-up threshold 30 ticks (20) |

For a phone and a small Node server: 30 Hz is plenty for a duel with at most three attackers, and the donor's loop cost is one pass per tick. The 5000 ms NPC cadence is far too slow for fight HP; the donor's 250 ms target and pet health test (`ClientService.cs` 824) is only a minimum spacing: `UpdateNpcs` runs from `UpdateWorld`, which each player gets at most once per `WORLD_PLAYER_UPDATE_INTERVAL` (1000 ms; `ClientService.cs` 133-136, 772), so in the donor target HP reaches the client about once per second. 250 ms is a Frankendom design number, not donor behaviour. The 65,536-bucket wheel allocates 65,536 list objects per array at construction (`SchedulableServiceObjectArray.cs` 30-33). That is wasteful for a per-zone array in Node; a binary heap or a Map of millisecond buckets is enough at our counts (count not measured).

## 4. TypeScript sketch

simplified: The sketch keeps the donor order: services run in a fixed list, game time advances by exactly one tick, and a whole-tick overrun resets the schedule rather than bursting. It omits the busy-spin wait and the sleep-overshoot estimator (the caller in Node sleeps for the returned delay with a timer and accepts jitter), the stats ring buffers, the per-service profiling and long-tick warnings, and the stop-the-server exception path. `iterate` returns the wait to the current deadline (what the donor's sleep and spin do), so a caller that sleeps for the returned value keeps a tick period of one tick, not service time plus one tick; an overrun frame returns 0 and the following frame waits the rest of a fresh tick. `overrunEvents` counts overrun events, not skipped ticks (a 2.5-tick overrun skips about two ticks but counts once).

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Service {
  readonly name: string;
  tick(gameTimeMs: number): void;
}

export class FixedStepLoop {
  private deadlineMs: number;
  private gameTimeMs = 0;
  overrunEvents = 0; // number of times the loop fell a whole tick or more behind (one event can skip several ticks)

  constructor(
    private readonly services: readonly Service[], // fixed order: input intake first, output last
    private readonly tickMs: number,               // 1000 / tickRate, e.g. 1000 / 30 = 33.33 ms
    startMs: number,
  ) {
    this.deadlineMs = startMs + tickMs;
  }

  // One iteration in donor order: run every service, then wait until the current deadline,
  // then settle the next deadline and advance game time by exactly one tick.
  // `clockMs` is the clock when the services have finished. Returns how long the caller should
  // wait before the NEXT iteration (donor: sleep until the deadline; 0 = already late, run now).
  iterate(clockMs: number): number {
    for (const s of this.services) s.tick(this.gameTimeMs);
    const wait = Math.max(0, this.deadlineMs - clockMs); // time left to the deadline, measured when the services finish
    const now = clockMs + wait;                          // clock after the wait (the services' end time if already late)
    if (now - this.deadlineMs >= this.tickMs) {
      // Late by a whole tick or more: restart the schedule from now, no catch-up burst.
      this.overrunEvents++;
      this.deadlineMs = now + this.tickMs;
    } else {
      this.deadlineMs += this.tickMs;
    }
    this.gameTimeMs += this.tickMs;
    return wait;
  }

  get gameTime(): number {
    return this.gameTimeMs;
  }
}

export {};
```

Typecheck: the block above (with `export {}`) was re-saved after the `iterate` fix, copied to the VPS and run with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `src/fight/tick.ts` (new): the engine's fixed-step server loop. Input intake, NPC think, fight resolution and send run in this one order, and the Pit client never runs it. Parity-checklist row 18 (sub-line "server tick: fixed step, input intake, per-tick NPC budget"). The interest cadence also lands on row 18 (the server tick and its send step). Input intake is row 5 and is cited only as the first step.
- Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only)
- Brief rule served: 1 (one engine, one clock: the server tick owns the order of intake, NPC think and send); rules 7-9 n/a

## 6. Gaps and risks

- Copyleft: the sketch is written from the mechanism, not translated. Nothing from the donor's C# is carried over.
- Defect, fix in the sketch: `Thread.SpinWait(10)` (`GameLoopTickPacer.cs` 88) burns a core while waiting for the deadline. Fix: the Node caller sleeps with `setTimeout` for the returned delay and accepts about 1 to 4 ms jitter; the drop-on-overrun rule absorbs the rest.
- Choice, kept: game time advances by exactly one tick even when the loop runs late (`GameLoopTickPacer.cs` 98-99). The donor's own property text says logic "will effectively run slower than intended" when the loop cannot keep up. For duels this is the deterministic choice (the same inputs give the same ticks), so keep it, and expose `droppedTicks` as a counter, not a silent slowdown.
- Ruling check: "server-verified kills" needs the fight step to run inside this one loop, not in socket callbacks. The donor's fixed order is what protects that; Frankendom must not let an intake callback mutate fight state between steps.
- Row 18 names a "per-tick NPC budget". The donor has no count cap. It paces each brain by `ThinkInterval` (`NpcService.cs` 52-69), so cost is spread over time, not limited per tick. With MAX_ATTACKERS = 3 a count cap is probably unnecessary, but the donor does not prove that. Not decided here.
- Interest cadence in the donor is tuned for a large open world (5 s NPC refresh). A many-on-one fight needs the target and every attacker refreshed faster than the donor's effective 1 s, so the cadence (we propose 250 ms for fight HP) must be data per encounter, not one global number, and the per-player world-update gate must not sit in front of it.
- Guided chunking across threads (`MultiThreaded.cs` 272-307) is for a multi-threaded C# server. A Node process is single-threaded, so the chunk split is rejected for now. A per-zone `worker_threads` shard could reuse the idea later; not read beyond this donor.
- At 1,000 and up: the send-buffer pool of 4 drops packets when exhausted (`PacketProcessor.cs` 334-335, 626-629). For us, drop-on-exhaustion must be a counted, visible event, and a slow client must not hold the whole tick.
- The timing wheel's per-array allocation (`SchedulableServiceObjectArray.cs` 30-33) is a cost we would not copy at our counts. The wheel's base-class ordering (`ProcessItemsToAdd` and `ProcessItemsToRemove`) was not read, so the wheel's exact drain order is (not read).

Best transferable idea: run the whole server as one fixed-step loop (intake, then NPC and fight steps, then send) that resets its schedule on a whole-tick overrun instead of bursting, and refresh each nearby object on its own cadence, with the fight target and attackers at 250 ms (our design number: the donor's real effective rate for target HP is the 1000 ms world-update gate, with 250 ms as a minimum spacing inside it).
Decision (proposed): adapt. Keep the fixed-step deadline loop, the drop-on-overrun rule, the intake-then-fight-then-send order and the per-object cadence (idea); fix the busy-spin wait with a timer, count dropped ticks and send-buffer drops, and make the cadence per-encounter data. Reject the guided multi-thread chunking and the 65,536-bucket wheel for a single-threaded Node server.
Acceptance: a server test with a fake clock and integer-millisecond ticks (tickMs 33.33 compared with a tolerance of 1e-6, or tickMs 30) runs 100 iterations where services on iteration 40 finish 2.5 tick lengths after the deadline, and asserts overrunEvents is 1, that iteration's returned wait is 0, the next iteration (services taking 5 ms) returns one tick minus 5 ms, and game time equals 100 ticks (every iteration advances it by exactly one tick). A second test (our design number, not donor behaviour): a fight target's HP change reaches the spectator view within 250 ms, and NPC refreshes outside the fight path come no more often than the NPC cadence.

Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only)
Brief rule served: 1 (one engine, one clock); server-verified kills need the fight step inside this loop


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: 1) The '250 ms target/pet health refresh' is NOT a 250 ms cadence in practice. UpdateNpcs is only called from UpdateWorld (ClientService.cs:772), and UpdateWorld is gated per player by NextWorldUpdate = GameLoopTime + WORLD_PLAYER_UPDATE_INTERVAL (1000 ms) at ClientService.cs:133-136. So the 250 ms test at 824 is only a minimum spacing; target HP reaches the client at most once per second. The note states the 1000 ms gate (section 1) yet still calls 250 ms 'the value to copy' (section 3), puts 'target and attackers at 250 ms' in Best idea/Decision and bases the Acceptance 'sees a target's HP change within 250 ms' on it. The 250 ms figure is Frankendom's own design number, not donor behaviour; the donor gives roughly 1 s. Also the 250 ms branch is an else-if after the 5000 ms full update (820-826). 2) Sketch `iterate` return value is wrong versus the donor: it advances the deadline first and returns `deadline_new - max(clock, deadline_old)`, which is always tickMs on an on-time frame, but the caller needs `deadline_old - clock` (wait until the deadline, GameLoopTickPacer.cs:75-88). A caller that does setTimeout(returned) after services finish adds the service time to every tick (tick period = service time + 33.3 ms). 3) In the donor, a whole-tick overrun makes the NEXT iteration start immediately (no sleep: ticksUntilDeadline <= 0, deadline reset to now + tick at 93-94, then services run). Sketch returns tickMs for that frame; the Acceptance asserts 'the next delay is one tick' - consistent with the sketch but not with donor timing (delay 0 for the overrun frame, one tick minus service time for the next). 4) 'game time advanced by exactly 100 ticks' with a 33.33 ms float tick is a floating-point sum; use toBeCloseTo or integer ticks. 5) droppedTicks counts overrun EVENTS, not skipped ticks (a 2.5-tick overrun skips ~2 ticks but counts 1); fine for the Acceptance but the name says ticks. Verified OK: game_loop_tick_rate 30 (ServerProperties 274), TickDuration 33 (GameLoop.cs:33), service order 148-162, pacer 73-106 (sleep minus overshoot 81-84, spin 87-88, drop at 93-94, game time += tick 99), UpdateBusyWaitThreshold 108-155 (10 samples, 10 s), UpdateNpcs 794-830 and intervals 5000/30000/1000 (ServerProperties 637/640/643), VISIBILITY_DISTANCE 6000 (WorldMgr.cs:60), Zone 32x32 / 2048 (21,23) and 7x7 scan (cellNbr = (6000>>11)+1 = 3), PacketProcessor pool 4 (16), drop at 334-335, 8192 (CoreBase/Network/BaseClient.cs:13, the note cites 'BaseClient.cs' without the CoreBase path), bias 2.5 (MultiThreaded 19, 285), wheel 50 ms x 65536 and 30-tick bypass (Schedulable 16-20, 42), NpcService 52-53/69, licence mismatch LICENSE v3 vs gplheader v2.
Missed: Missed: UpdateWorld's 1000 ms per-player gate (see error 1) is the real world-update cadence, and ClientService.BeginTick/EndTick (lines ~130-140) shows input receive and send are per-client in the same pass. Also NpcService/brains only think when NextThinkTick is due, already noted.

Fixed 2026-10-12 (Sonnet fixer, ClientService.cs 128-140, 764-828 and GameLoopTickPacer.cs 73-106 re-read over ssh): sketch `iterate` now returns the wait to the current deadline (0 on an overrun frame), counter renamed overrunEvents; Acceptance rewritten to match (overrun frame wait 0, next frame one tick minus service time, game time with tolerance, 250 ms moved to a separate design test); the 250 ms target refresh is stated as Frankendom's own number because the donor gates world updates at 1000 ms per player; BaseClient.cs path corrected. Retypechecked on the VPS.
