# teeworlds-teeworlds (server-tick-netcode, cell 3)

Donor: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` (with `src/game/server/gamecontext.cpp`, `src/game/server/gameworld.cpp`, `src/game/server/player.cpp`, `src/engine/shared/protocol.h`) | Licence: zlib-style grant (`license.txt` line 7 "Permission is granted to anyone to use this software for any purpose," with the three conditions at lines 11-17; not in the brief's list, treated as permissive); `data` and `datasrc` content is CC-BY-SA 3.0 (line 21), not read and not used | C++ | symbol `CServer::Run` (the loop), `CServer::ProcessClientPacket` (input intake), `CServer::DoSnapshot`

Checked: Read in full: the `CServer::Run` main loop (server.cpp 1330-1431), `CServer::TickStartTime` (330-332), the `NETMSG_INPUT` branch of `CServer::ProcessClientPacket` (907-963), the snapshot-rate gates in `CServer::DoSnapshot` (502-536 read; 537-600 read in part, including the rate changes at 559 and 572-576), `CGameContext::OnTick` (538-556), `CGameWorld::Tick` (166-200), `CGameContext::OnClientPredictedInput` (657-), `CPlayer::OnPredictedInput` (225-233), `CPlayer::OnDirectInput` (235- only its first lines), and `SERVER_TICK_SPEED` (protocol.h 81). Confidence high on the server loop and the input path. Not read: the character side of an input (`CCharacter::OnPredictedInput`), the client-side prediction code, the snapshot delta encoder (`CSnapshotDelta`) and storage (only their calls were read), and the `CServer::Run` setup before line 1330 (except the map load call). camera_scope: not a camera cell.

Best transferable idea: Anchor the server tick to the server start time so tick numbers never drift, and key each client's input to the tick it is meant for, moving a past tick to the next one.
Decision (proposed): adapt — The anchored clock and tick-keyed input fit our one-engine server tick, but the donor's uncapped catch-up loop would replay a stall in one burst, so we take the clock and cap the catch-up; latency rewind is rejected because kills stay server-verified.
Acceptance: Server test: after a simulated 500 ms stall one loop pass runs at most the cap of ticks and the remainder runs on the following passes, and an input whose intended tick has passed is applied on the next tick and never dropped. No test may use a latency estimate to decide a kill.

## 1. Mechanism

A wall-clock-anchored fixed-step server loop at 50 ticks per second, with input intake keyed to a game tick. Order of operations:

- (a) Anchor. Tick n starts at `m_GameStartTime + (freq * n) / 50` (server.cpp 332). The start time is set when the loop starts (1338) and again when a map reloads (1367). When the tick nears the wrap point, the loop reloads the map and resets the tick counter to 0 (1343, 1368).
- (b) Each pass of the loop (1380-1426). It reads the wall clock once (1380). It then runs a catch-up loop: `while (Now > TickStartTime(tick + 1))` (1383) increments the tick (1385), sets a snapshot flag on even ticks (1387), and for each non-empty client scans its 200-slot input ring for an input whose game tick equals this tick (1395-1397). If one is found and the client is in game, it calls `OnClientPredictedInput` (1400) and stops scanning that client (break). After the input step for that tick it calls `GameServer()->OnTick()` (1406). The catch-up loop has NO cap on the number of ticks in one pass.
- (c) Snapshot. After the loop, a snapshot is built and sent if high bandwidth is set or the flag was set on an even tick (1412). Per-client rate states decide who gets it: a client in recover state gets one per 50 ticks (529); a client in init state gets one every 10 ticks (533); a full-rate client with no acknowledged snapshot drops to recover (572-575). Stored snapshots older than 150 ticks (3 seconds) are purged (559).
- (d) Network. Packets are pumped (`PumpNetwork`), then the loop waits for `clamp(ms until the next tick start, 1, 10)` (1425), so it sleeps at most 10 ms.
- (e) Input intake (`ProcessClientPacket`, NETMSG_INPUT, 907-963). The server reads the client's last acknowledged snapshot and the `IntendedTick` (913-915). If the tick is newer than the last one seen, it replies with the ms left until that tick starts (928). If the intended tick is already past (940), it becomes the current tick plus 1 (941). The input is stored under that game tick (943), the client's ping correction is clamped to 0-50 ms (948), and latency is the snapshot round trip minus that correction, floored at 0 (949-952). The client's input ring index advances modulo 200 (957-958). Immediately afterwards, if the client is in game, `OnClientDirectInput` is called (961-962): a second, un-scheduled input path. The scheduled path is the one in (b).
- (f) Game tick (`CGameContext::OnTick`, 538-556). The world ticks first (545), then the controller (548), then each player's `Tick` and `PostTick` (554-555).
- (g) World tick (`CGameWorld::Tick`, 166-200). If the world or controller is paused, every entity gets `TickPaused` (171-180). Otherwise every entity gets `Tick` (189), by type list, then every entity gets `TickDefered` (197), then entities are removed.

## 2. Key functions

- `CServer::Run` loop: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` 1338-1431 (the `while(m_RunServer)` loop). The catch-up loop is 1383-1407.
- `CServer::TickStartTime`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` 330-332.
- `CServer::ProcessClientPacket`, NETMSG_INPUT branch: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` 907-963.
- `CServer::DoSnapshot` rate gates: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` 502-536 and 559-576.
- `CGameContext::OnTick`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/server/gamecontext.cpp` 538-556.
- `CGameWorld::Tick`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/server/gameworld.cpp` 166-200.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed step anchored to server start: tick n starts at start + n x period | 50 ticks per second, so 20 ms per tick (theirs, protocol.h 81; server.cpp 332). |
| Wait until the next tick, clamped so the loop never sleeps long | Wait clamped to 1..10 ms (theirs, server.cpp 1425: `1000/SERVER_TICK_SPEED/2`). |
| Input keyed to the tick the client intends; a past tick moves to the next tick | Ring of 200 input slots per client (theirs, server.cpp 958). |
| Client reports its own delay; the server subtracts it from the latency estimate | Correction clamped to 0-50 ms (theirs, server.cpp 948); latency floored at 0 (952). |
| Snapshot cadence by client state: full, init, recover | Full: every even tick, so 25 per second (theirs, 1387, 1412). Init: every 10 ticks (theirs, 533). Recover: once per 50 ticks, one per second (theirs, 529). |
| Purge stored states older than a window | 3 seconds = 150 ticks (theirs, server.cpp 559). |
| Wrap guard for tick numbers | Reload at 0x6FFFFFFF (theirs, server.cpp 1343). |

## 4. TypeScript sketch

simplified: the sketch keeps the anchored tick schedule, the per-pass catch-up, the input intake that moves a past tick to the next tick, the input applied before the game tick, and the wait clamp. It adds a catch-up cap of 5 ticks per pass, which the donor does NOT have. It omits: the per-client input rings (the sketch keeps one map for all clients), the first-match break on the 200-slot scan, the direct input path, the ping correction and latency estimate, the snapshot builder, the snapshot rate states and the purge, the map reload and the wrap guard, the world and controller order, and the input timing reply.

```ts
// Licence: zlib-style (donor license.txt). Clean-room: written from the described loop, not a translation of the donor.
export const TICK_HZ = 50;                 // server ticks per second
export const PERIOD_MS = 1000 / TICK_HZ;   // 20 ms per tick
export const MAX_CATCHUP = 5;              // OUR cap per loop pass; the donor has no cap
export const INPUT_SLOTS = 200;            // per-client input ring size in the donor

export interface Input {
  tick: number;
  data: number[];
}

export class ServerLoop {
  private tick = 0;
  private inputs = new Map<number, Input[]>();

  constructor(
    private startMs: number,
    private onTick: (tick: number, inputs: Input[]) => void
  ) {}

  // Start time of a tick, anchored to server start, so tick numbers do not drift with frame timing.
  tickStartMs(n: number): number {
    return this.startMs + n * PERIOD_MS;
  }

  // Input intake: keyed by the tick the client intends. A tick already past is moved to the next tick.
  intake(intendedTick: number, data: number[]): void {
    const t = intendedTick <= this.tick ? this.tick + 1 : intendedTick;
    const list = this.inputs.get(t) ?? [];
    list.push({ tick: t, data });
    this.inputs.set(t, list);
  }

  // One pass of the loop at wall time `now`. Runs every tick that is due (capped), then returns the wait in ms.
  step(now: number): number {
    let ran = 0;
    while (now > this.tickStartMs(this.tick + 1) && ran < MAX_CATCHUP) {
      this.tick++;
      ran++;
      const due = this.inputs.get(this.tick) ?? [];
      this.inputs.delete(this.tick);
      this.onTick(this.tick, due); // inputs for this tick are applied before the game tick
    }
    const wait = Math.round(this.tickStartMs(this.tick + 1) - now);
    return Math.min(Math.max(wait, 1), PERIOD_MS / 2); // donor waits between 1 and 10 ms
  }

  currentTick(): number {
    return this.tick;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/tick.ts` (engine tick: anchored clock, catch-up pass, input intake keyed to the intended tick, the wait clamp). Parity-checklist row 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (addendum: the server tick has no row of its own, so it sits under row 18). Input intake is row 5 and is only touched here.
- Reuse tag: clean-room shape only (zlib-style licence allows adapting the code; this sketch is written from the mechanism, no lines copied)
- Brief rule served: 1 (one engine: one loop drives every zone and fight); server-verified kills (the server applies every input at its tick; the client only sends intent)

## 6. Gaps and risks

- The donor has NO cap on catch-up ticks. After a stall, one loop pass runs every missed tick back to back (1383). Frankendom must cap this, and the sketch's cap of 5 is ours, not theirs. A cap means the tick number and wall clock drift apart for a while; decide what that does to duel timing and test it.
- No per-tick NPC budget exists in the donor. Every entity ticks every tick (gameworld.cpp 189). The checklist row 18 sub-line "per-tick NPC budget" is not supported by this donor and must be designed by us.
- Duplicate inputs for one tick: the scan takes the first matching ring slot in index order, not the newest (1395-1402), and then breaks. Frankendom's intake should keep one input per tick and say which one wins.
- Two input paths: the scheduled one (applied at the tick) and the direct one (applied on receipt, 961-962). Frankendom's rulings make kills server-verified, so the server should apply duel actions at a tick. Use only the scheduled path for duel actions; the direct path is for state that must not wait (such as aim or flags) and must not decide a hit.
- Latency is only an estimate: it is the snapshot round trip minus the client's correction (949-952). It must not drive a rewind for a kill. Frankendom's kills are server-verified at the current state; reject any rewind.
- Snapshot recovery drops to one per second (529, 575) when acknowledgements stop. Frankendom's netcode is not a snapshot model, so this rate policy is shape only.
- Not read: the character's handling of a predicted input (`CCharacter::OnPredictedInput`), the client prediction, the delta encoder, and the setup code before line 1330.
