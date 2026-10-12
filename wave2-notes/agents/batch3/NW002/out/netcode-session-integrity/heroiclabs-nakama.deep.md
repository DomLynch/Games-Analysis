# heroiclabs-nakama (netcode-session-integrity, cell 3)

Donor: `/mnt/frankendom-donors/heroiclabs-nakama/server/match_handler.go` | Licence: Apache License 2.0 (LICENSE line 3 "Version 2.0, January 2004") | Go | symbol `MatchHandler` (`NewMatchHandler`, `QueueData`, `queueCall`, `loop`)
Also read: `server/match_registry.go` (SendData 771-791; join wait 728-750), `server/match_presence.go` (MatchJoinMarkerList 60-108), `server/pipeline_match.go` (340-368), `server/runtime_go_match_core.go` (176-186), `server/session_ws.go` (188-196), `server/config.go` (SocketConfig 819-824 and defaults 897-905; MatchConfig 1192-1220; validation 254-273), `CHANGELOG.md` (targeted grep), `LICENSE`.

Checked: Read the whole authoritative match loop path: ticker set-up (match_handler.go 175-207), the call, join, signal and input queues and their overflow branches (250-280), the tick body (282-334), the deferred-broadcast drain (336-347), and the join marker lifecycle from allow to confirm (match_handler.go 380-395 and 499-520; match_registry.go 728-750; match_presence.go 60-108). Confidence high on the queue and tick mechanism; high on the join marker. Not read: `MatchJoin`/`MatchLeave` bodies, the JavaScript and Lua cores (`runtime_javascript_match_core.go`, `runtime_lua_match_core.go`), the websocket write path and its outgoing queue, `disconnectClients`, and the presence list. A grep for ratelimit, rate_limit, rate limit, throttle and flood across `server/*.go` (non-test) returned one hit, a comment about query limits (`console_account.go:510`): there is no per-client rate limiter in the server. Camera: not applicable.

Best transferable idea: Give each fight one bounded input queue that the tick drains whole once per fixed step, drop and count overflow instead of blocking, and hold a join as reserved until the server confirms it, expiring it on a deadline.
Decision (proposed): adapt — the one-writer tick with a drained-per-tick queue fits the server-tick row; adapt because the donor drops the newest input, disconnects everyone when the call queue fills, and truncates its join deadline to whole seconds.
Acceptance: A server test sends 200 inputs into a 128-slot fight queue within one tick and asserts exactly the queued batch is processed once, the overflow is counted per session and the fight keeps running; a join not confirmed within 1.5 s (at 60 Hz) is removed at its deadline tick.

## 1. Mechanism

One goroutine per authoritative match runs everything. Its `select` (match_handler.go 182-200) takes, in no fixed priority, a stop signal, the tick, and three bounded queues: calls, join attempts and signals. Client data goes to a fourth bounded channel, the input queue, through a separate path.

- Fixed-rate tick. A ticker fires every `1 / Rate` seconds (176). On each tick it queues one `loop` call into the call queue (186-188). `Rate` is the core's chosen tick rate (`MatchInit`, 130; `maxEmptyTicks` uses it at 160). The changelog says handlers can now tick at 60 per second (CHANGELOG 954); no cap was seen in the code read.
- Input intake. A client's `MatchDataSend` (pipeline_match.go 340) is refused unless the sender holds an authoritative presence on that match (361-365). It then goes to `SendData` (367), which hands it to `QueueData` (match_registry.go 781). `QueueData` does a non-blocking send into the input channel (match_handler.go 272-279). If the channel is full, the NEW message is dropped with a warning and nothing else happens. The loop never waits for intake.
- Call queue overflow. `queueCall` is also non-blocking (255-264). If the call queue is full, the match is stopped and every client is disconnected (260-262). This is fail-closed: a slow handler ends the match rather than letting it fall behind.
- Tick body (`loop`, 282-334), in order: run the user's `MatchLoop(tick, state, inputCh)` (288); on error stop the match AND disconnect all clients (290-293, `disconnectClients`); if the returned state is nil stop the match (297-303), otherwise send the deferred broadcasts (299); every `30 * Rate` ticks sweep expired join markers into leaves (307-313); count consecutive empty ticks and stop the match at the limit (316-330); store the state and advance the tick (332-333).
- What the user's loop sees. The Go core drains the WHOLE input queue at the start of the loop, reading as many messages as the queue held at that instant (runtime_go_match_core.go 178-183). Messages that arrive during the loop wait for the next tick. So each tick sees a batch in arrival order, and a burst is capped only by the queue size.
- Join reservations. An allowed join attempt adds a join marker with the current tick (match_handler.go 391) and queues the join unmarked (392). The presence tracker later calls `Join` on the registry (match_registry.go 749), which queues a marked join (510-512) and removes the marker (`Mark`, match_presence.go 91-95). A marker still present when its expiry tick passes is swept into a leave (match_presence.go 97-108; match_handler.go 307-311). The join attempt itself waits at most a fixed 10 seconds for the match handler (match_registry.go 729-733), and a timeout is assumed rejected (732).

## 2. Key functions

- `NewMatchHandler`: `/mnt/frankendom-donors/heroiclabs-nakama/server/match_handler.go` 118-208 (channel sizes 160-165; ticker 176; goroutine loop 179-202).
- `queueCall` and `QueueData` (overflow branches): same file 250-280.
- `loop` (tick body): same file 282-334; `processDeferred` 336-347.
- Join attempt and marker add: same file 349-395; `QueueJoin` mark branch 499-520.
- `LocalMatchRegistry.SendData`: `/mnt/frankendom-donors/heroiclabs-nakama/server/match_registry.go` 771-791. `LocalMatchRegistry.Join`: same file 742-750. Join wait: same file 728-740.
- `MatchJoinMarkerList` (`NewMatchJoinMarkerList`, `Add`, `Mark`, `ClearExpired`): `/mnt/frankendom-donors/heroiclabs-nakama/server/match_presence.go` 67-108.
- Client data gate: `/mnt/frankendom-donors/heroiclabs-nakama/server/pipeline_match.go` 340-368.
- Go core drain: `/mnt/frankendom-donors/heroiclabs-nakama/server/runtime_go_match_core.go` 176-186.
- Socket read limit: `/mnt/frankendom-donors/heroiclabs-nakama/server/session_ws.go` 188-196 (SetReadLimit at 193).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Fixed tick | `time.Second / Rate` (match_handler.go 176); rate set by the match core (`MatchInit`, 130). Changelog: handlers can tick at 60/s (CHANGELOG 954) |
| Per-match input queue | 128 messages by default (config.go 1193, 1214; channel at match_handler.go 161) |
| Per-match call queue | 128 by default (config.go 1194, 1215; match_handler.go 163). Signal queue 10 (config.go 1195, 1216). Join-attempt queue 128 (1196, 1217). Deferred broadcasts 128 (1197, 1218) |
| Join marker deadline | 15000 ms default (config.go 1198, 1219). Config rejects below 1 ms (269). Stored as ms, but the expiry tick uses whole seconds (match_presence.go 76, 86) |
| Sweep of join markers | every `30 * Rate` ticks (match_handler.go 307) |
| Idle empty match stop | `Rate * MaxEmptySec` consecutive empty ticks; default MaxEmptySec 0 means no limit (config.go 1199, 1220; match_handler.go 160, 316-330) |
| Join attempt wait | fixed `time.Second * 10` (match_registry.go 729); not a config value |
| Socket message cap | 4096 bytes default (config.go 903, inside `NewSocketConfig` at 897). The struct comment says "Used for real-time connections." (824) |

Arithmetic (mine, from the code): with the default 15000 ms deadline at a 60 Hz rate, the marker expires at join tick + 60 x 15 = join + 900 ticks. The sweep runs every 30 x 60 = 1800 ticks (30 s), so the marker is removed at the first sweep at or after that tick. Sweeps run only at tick multiples of 1800 (including tick 0), so removal lands 15 to 45 seconds after the join (for example, a join 14 s before a sweep expires 1 s after it and waits for the sweep 30 s later, 44 s in all), not at 15 seconds.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's shape: one bounded input queue per room, drained whole once per fixed tick, with overflow dropped and counted (drop-newest as in the donor, drop-oldest as an option); and join reservations that either get a confirmation or expire, counted in ticks. It changes three donor points: the deadline is kept in ms and converted to ticks with rounding up (the donor truncates to whole seconds); expired markers are returned on each call so the caller can sweep every tick instead of every 30 s; and overflow is counted on the queue so the caller can report it per session (the donor only logs). It omits: the call, signal and join-attempt queues; the fail-closed stop on call-queue overflow; the deferred broadcasts; the presence check on intake; the idle empty-match stop; the goroutine and channel machinery; and the 10 s join-attempt wait.

```ts
// Licence of donor: Apache-2.0 (LICENSE line 3 "Version 2.0, January 2004"). Clean-room sketch of the mechanism, not a translation.
// Frankendom target (proposed): origins/server/fight-tick.ts. Donor points fixed here: join deadline kept in ms (donor floors it to whole seconds); join markers can be swept every tick (donor sweeps every 30 s of ticks); overflow is counted per policy (donor only logs).

export interface Msg { sessionId: string; opCode: number; data: Uint8Array; reliable: boolean; recvMs: number }

// Bounded per-match input queue. offer() never blocks the tick; overflow is dropped by policy and counted.
export class BoundedQueue<T> {
  private items: T[] = [];
  dropped = 0;

  constructor(private readonly cap: number, private readonly policy: 'drop-newest' | 'drop-oldest') {}

  offer(item: T): boolean {
    if (this.items.length < this.cap) {
      this.items.push(item);
      return true;
    }
    this.dropped += 1;
    if (this.policy === 'drop-oldest') {
      this.items.shift();
      this.items.push(item);
    }
    return false;
  }

  // Takes everything queued now. Anything offered after this call waits for the next tick.
  drain(): T[] {
    const out = this.items;
    this.items = [];
    return out;
  }
}

// Join reservations: a session counts only after the room acknowledges the join; otherwise it expires.
export class JoinMarkers {
  private expiry = new Map<string, number>();

  constructor(private readonly tickRate: number, private readonly deadlineMs: number) {}

  // Expiry tick = now + deadline in ticks, rounded up (deadline kept in ms, not whole seconds).
  add(sessionId: string, nowTick: number): void {
    this.expiry.set(sessionId, nowTick + Math.ceil((this.deadlineMs * this.tickRate) / 1000));
  }

  ack(sessionId: string): void {
    this.expiry.delete(sessionId);
  }

  // Sessions whose join was not acknowledged by nowTick. Removed from the table when returned.
  expired(nowTick: number): string[] {
    const out: string[] = [];
    for (const [id, t] of this.expiry) {
      if (t <= nowTick) out.push(id);
    }
    for (const id of out) this.expiry.delete(id);
    return out;
  }
}

export interface TickState { tick: number }

// One fixed tick: drain what is queued, run the step on it once, then advance. Input that arrives during the step waits.
export function runTick(state: TickState, inputs: BoundedQueue<Msg>, step: (tick: number, msgs: Msg[]) => void): void {
  const msgs = inputs.drain();
  step(state.tick, msgs);
  state.tick += 1;
}

export {};
```

Typecheck: saved as `work/nakama-sketch.ts`; run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` (TypeScript 7.0.2); exit 0. The local PostToolUse hook again reported missing local tsc and eslint on this Mac; the VPS run is the check.

## 5. Lands in

- TARGET `origins/server/fight-tick.ts` (proposed new module: the server tick and input intake for a fight). Parity-checklist row 18 (server tick: fixed step, input intake, per-tick NPC budget). The row 5 intake rules are covered by the same queue and are not claimed separately.
- Current Frankendom tick and intake code was not read in this pass.
- Reuse tag: rewrite-from-idea (Apache-2.0: code may be adapted; this sketch is clean-room)
- Brief rule served: Frankendom ruling "server tick" (fixed step, one loop, input queued and applied once per tick) and "kills are server-verified" (a join or engage counts only after the server confirms it).

## 6. Gaps and risks

- No rate limit. The server has no per-client or per-socket rate limiter (grep result in Checked). The only cap on client input is the per-match queue of 128 messages, shared by every client in the match (config.go 1193). One noisy client can fill the queue and push out honest input. Frankendom needs a per-client command budget in intake, before the queue.
- Drop newest, silently to the client. When the input queue is full, the newest message is dropped with a server log line only (match_handler.go 277). The client is not told, and for input the newest message is the one that matters most. Frankendom should drop oldest (or coalesce to the latest per action), count drops per session, and send the count back on the next snapshot.
- Fail closed on call overflow. A full call queue stops the whole match and disconnects everyone (match_handler.go 259-262). A slow fight tick would end the fight for every player in it. Frankendom should degrade the tick (skip NPC work, keep input) rather than end the fight; its zones are data, so the budget is a row field, not a constant.
- Join markers are quantised and whole-second. The deadline is stored in ms but converted with integer division by 1000 (match_presence.go 86), and the sweep runs every 30 s of ticks (match_handler.go 307). A 15 s deadline removes the join between 15 and 45 s later (expiry is join + 900 ticks; sweeps only at multiples of 1800 ticks), and any sub-second deadline behaves like a 0 s one until the next sweep. Frankendom should sweep every tick (the sketch does) and keep the deadline in ms.
- Join attempt wait is hard-coded at 10 s (match_registry.go 729), not a config value, so Frankendom cannot tune it per zone without changing the engine.
- Server authority: the state is touched only inside the loop (single goroutine, match_handler.go 179-202), and join attempts, signals and state reads are queued through the same loop (call, join, signal queues). That is the one-writer rule Frankendom wants. Intake is refused without an authoritative presence (pipeline_match.go 362-365). The refusal returns `false, nil` (364) and the read did not show the client being told.
- Defects and patched items (keep the idea, fix the port):
  - (a) Join marker truncation to whole seconds (match_presence.go 86). Fix: ms times rate, rounded up (sketch).
  - (b) Sweep only every 30 s (match_handler.go 307), so removal lands 15 to 45 s after the join. Fix: sweep each tick, or the cadence set by the deadline.
  - (c) Input drop is log-only (match_handler.go 277). Fix: count per session and report (sketch counts it).
  - (d) Changelog: join attempts got their own bounded queue and stopped counting towards the call limit (CHANGELOG 1365). This is a fix worth keeping: a join must not starve the tick.
  - (e) Changelog: Lua matches were closed gracefully when the call queue fills up (CHANGELOG 712). The current Go path disconnects clients (match_handler.go 260-262). Frankendom should take the graceful close as the target behaviour for a fight, not the disconnect.
  - (f) Changelog: a session-token ID bug on socket connection was fixed in 3.41.0 (CHANGELOG 32). Session validation is a server check that has broken before; keep it under test.
- Donor exploit or dupe history: no history of client-side exploits in the copy. There is no `.git` directory and the changelog covers releases. The changelog lines read above are the only history used. Known gaps are as listed above.
- Data shape (as-data, PASS2 item 1): the donor's config is a row of queue sizes and deadlines (`MatchConfig`, config.go 1192-1220): `input_queue_size: int`, `call_queue_size: int`, `signal_queue_size: int`, `join_attempt_queue_size: int`, `deferred_queue_size: int`, `join_marker_deadline_ms: int`, `max_empty_sec: int`, with defaults 128 / 128 / 10 / 128 / 128 / 15000 / 0. A new match "kind" is one row: yes for its queue sizes and deadline. A new intake rule (what a valid input is) is not a row: no, the donor leaves validation to the match code (match_handler.go has no schema check).
- Licence provenance: Apache 2.0 (LICENSE). Code may be adapted; this sketch is clean-room.

Rulings for Dom:
1. When a fight's input queue is full, should we drop the OLDEST input (recommended, the newest is the one that matters) or coalesce to the latest per action?
2. Should a fight that falls behind its tick degrade (skip NPC work, keep input) rather than end the fight, as the donor's Go path does by disconnecting everyone? Recommend degrade, and a per-zone row for how far behind it may run.
3. What per-client command cap (commands per second) should intake enforce before the queue? Recommend choosing the number after measuring a real client; the donor has none.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Error: join-marker arithmetic said removal 15 to 30 s after join; real range is 15 to 45 s (expiry join+900 ticks, sweeps only at multiples of 1800). Fixed in section 3 and section 6 (b).
- Error: loop error path (match_handler 290-293) also calls disconnectClients, not just Stop. Fixed in section 1.
- Error: 'tick rates up to 60/s' over-read the changelog (it says handlers can tick at 60/s). Fixed.
- Missed (noted): marker expiry then QueueLeave for a presence that may already have joined through the unmarked path; no reconciliation.

Fixed 2026-10-12: section 1 tick body and tick rate wording, section 3 arithmetic and table row, section 6 (b) and truncation bullet (sketch code unchanged; it sweeps each tick).
