# heroiclabs-nakama (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/heroiclabs-nakama/server/match_handler.go` (`NewMatchHandler` 130-207 for the ticker and driver goroutine; `queueCall` 250-265; `QueueData` 267-280; `loop` 282-334), with `server/match_presence.go` 61-108 (join markers) and `server/runtime_go_match_core.go` 101-109 and 176-187 | Licence: Apache-2.0 (repo-root `LICENSE`, Version 2.0 text; `match_handler.go` header: "Licensed under the Apache License, Version 2.0") | Go | symbol `loop`

Checked: The list hint `server/api_test.go` is the WRONG file: it is a test file, and its only test function (line 300) checks the WWW-Authenticate header on an unauthenticated HTTP call. Not netcode. The real tick loop is in `match_handler.go`. Searched `ticker|NewTicker|tickRate|tick_rate|func .*[Ll]oop` across `server/*.go`. Other tickers are unrelated (`matchmaker.go` 315 matchmaker interval; `login_attempt_cache.go` 90 and `metrics.go` 125 housekeeping; `match_registry.go` 184 label refresh). `sample_go_module/sample.go` 141 sets `tickRate := 1`; it is an example module. Files opened for this note: `match_handler.go` 90-207, 250-340, 376-396, 500-516 (read in full for the tick path); `match_presence.go` 55-130; `runtime_go_match_core.go` 101-109 and 176-189 (read; the rest only grepped for rate fields); `config.go` 1210-1222 (read) and 254-276 (grep of the validation lines); `match_common.go` 45-58 (candidate: only the label `tick_rate` field, not the loop); `api_test.go` (test list). Confidence: high on the match loop, the intake and the join markers. Medium on the Go ticker's drop-or-queue behaviour under load, which I did not measure. Not read: `processDeferred` (`match_handler.go` 336 on), the body of the join-attempt path between 340 and 376, and the user match code (only the sample's tick line). Camera: not applicable. Category: server-tick-netcode.

Best transferable idea: Run each match on one fixed-rate loop that takes one bounded batch of inputs per tick and counts join and idle timeouts in ticks, so the timing lives in the tick counter, not in per-player timers.

Decision (proposed): adapt - keep the fixed-rate loop, the single bounded input drain per tick, and join and idle limits counted in ticks; change the overflow policy, because the donor closes the whole match when its call queue fills (`match_handler.go` 259-263) and Frankendom must not end a fight on an input burst: drop and count instead.
Acceptance: a server test pushes three times the input cap in one tick and asserts the fight keeps ticking, the drop count equals the overflow, and the kept inputs apply in arrival order on the next tick; a second test leaves a join unconfirmed and asserts it expires at join tick plus 15 times the rate, with the sweep run on the 30-second tick boundary.

## 1. Mechanism

- Setup (`NewMatchHandler`, 130-176): the match's `MatchInit` returns state and a tick rate. The rate is checked to be 1 to 60 (`runtime_go_match_core.go` 106-107). Queues are sized from config: input queue (InputQueueSize), call queue (CallQueueSize), join-attempt, signal and deferred queues. The empty limit is `rate x MaxEmptySec` (160).
- Driver (175-202): one goroutine selects over the stop channel, the ticker, the call channel, the join-attempt channel and the signal channel. The ticker period is one second divided by the rate (176). A ticker event does `queueCall(loop)` (186-190). Calls from the other channels run in the same goroutine (191-199), so the tick and joins and signals never run at the same time.
- `queueCall` (250-265): the call goes into a buffered channel with a non-blocking send. If the buffer is full, the match stops, all clients are disconnected, and a "too slow" warning is logged (259-263).
- Input intake, `QueueData` (267-280): a non-blocking send into the input channel. If the channel is full, the message is dropped with a warning and no counter (273-278).
- One tick, `loop` (282-334), in order:
  (a) The Go core drains the input channel (`runtime_go_match_core.go` 177-183). It takes only the count present at the start (`size := len(inputCh)`, 178), so messages that arrive during the drain wait for the next tick. It then calls the match's `MatchLoop` with the tick number and the batch (185).
  (b) If the returned state is nil, the match stops (300-303); otherwise deferred broadcasts are processed (299).
  (c) When `tick % (rate x 30) == 0`, expired join markers are cleared and turned into leaves (306-313).
  (d) Empty limit (316-330): while the presence list is empty, a counter goes up each tick and the match stops at the limit; it resets as soon as someone is present.
  (e) The state is saved and the tick increments (332-333).
- Join markers (`match_presence.go` 61-108; `match_handler.go` 389-393 and 504-515): an allowed join adds a marker whose expiry tick is the join tick plus `rate x (deadline ms / 1000)` (86, integer division). The default deadline is 15000 ms (`config.go` 1219). A confirmed join clears its marker (512). A marker expires when its tick is reached (101), but the sweep runs only on 30-second tick boundaries (307-308). So an expired, unconfirmed join can stay up to 30 s past its deadline. That is my reading of the code; I did not run it.

## 2. Key functions

- `NewMatchHandler` (driver goroutine and ticker): `/mnt/frankendom-donors/heroiclabs-nakama/server/match_handler.go` 130-207.
- `queueCall`: `/mnt/frankendom-donors/heroiclabs-nakama/server/match_handler.go` 250-265. Overflow stops the match.
- `QueueData`: `/mnt/frankendom-donors/heroiclabs-nakama/server/match_handler.go` 267-280. Non-blocking intake.
- `loop`: `/mnt/frankendom-donors/heroiclabs-nakama/server/match_handler.go` 282-334. The per-tick function.
- `RuntimeGoMatchCore.MatchLoop`: `/mnt/frankendom-donors/heroiclabs-nakama/server/runtime_go_match_core.go` 176-187. Drain, then call the user's loop.
- Join markers: `/mnt/frankendom-donors/heroiclabs-nakama/server/match_presence.go` 74-108 (`NewMatchJoinMarkerList`, `Add`, `Mark`, `ClearExpired`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed-rate loop: period = 1 s / rate, rate checked 1 to 60 | Rate limits 1 and 60 (`runtime_go_match_core.go` 106-107) |
| Bounded input queue, one drain per tick | InputQueueSize default 128 (`config.go` 1214); the drain takes the count present at the start (`runtime_go_match_core.go` 178) |
| Call queue overflow stops the match | CallQueueSize default 128 (`config.go` 1215); overflow stops the match (`match_handler.go` 259-263) |
| Join marker expiry in ticks | JoinMarkerDeadlineMs default 15000 (`config.go` 1219); expiry = join tick + rate x 15 |
| Sweep every 30 s of ticks | rate x 30 ticks (`match_handler.go` 307) |
| Empty-match stop | MaxEmptySec default 0, meaning never (`config.go` 1220); limit = rate x MaxEmptySec ticks (`match_handler.go` 160) |

## 4. TypeScript sketch

simplified: the sketch keeps the bounded intake with drop-and-count, the drain of only what was present at the start of the tick, join-marker expiry in ticks with the deadline in whole seconds, the 30-second sweep, and the empty-limit threshold. It omits the real ticker and goroutine, the call queue, the join-attempt and signal queues, deferred broadcasts, the presence list, the nil-state stop, and the counter reset on join. It also changes the donor's overflow policy: the donor logs and drops input (no counter) and stops the whole match when the call queue fills; the sketch only drops and counts input and never stops a fight. That change is an adaptation, not a copy.

```ts
// Licence: Apache-2.0 (donor). Sketch written from the described mechanism; shape only, not a translation of the donor lines.
// clean-room
export interface Msg {
  sessionId: string;
  payload: string;
}

export interface LoopConfig {
  rate: number;            // ticks per second, donor accepts 1..60
  inputCap: number;        // donor InputQueueSize default 128
  joinDeadlineMs: number;  // donor JoinMarkerDeadlineMs default 15000
  maxEmptySec: number;     // 0 means never stop for being empty
}

export class FixedStepIntake {
  private queue: Msg[] = [];
  dropped = 0;

  constructor(private readonly cap: number) {}

  // Non-blocking intake: when full, the message is dropped and counted.
  push(m: Msg): boolean {
    if (this.queue.length >= this.cap) {
      this.dropped++;
      return false;
    }
    this.queue.push(m);
    return true;
  }

  // Take only what is queued now; anything pushed after this waits for the next tick.
  drain(): Msg[] {
    return this.queue.splice(0, this.queue.length);
  }
}

// Join marker expires at join tick + rate x whole seconds of the deadline (donor integer division).
export function joinExpiryTick(joinTick: number, rate: number, joinDeadlineMs: number): number {
  return joinTick + rate * Math.floor(joinDeadlineMs / 1000);
}

// Expired markers are only swept every 30 seconds of ticks, as in the donor.
export function sweepJoinMarkers(markers: Map<string, number>, tick: number, rate: number): string[] {
  if (tick % (rate * 30) !== 0) return [];
  const expired: string[] = [];
  for (const [sid, expiryTick] of markers) {
    if (expiryTick <= tick) {
      expired.push(sid);
      markers.delete(sid);
    }
  }
  return expired;
}

export function emptyLimitReached(emptyTicks: number, cfg: LoopConfig): boolean {
  return cfg.maxEmptySec > 0 && emptyTicks >= cfg.rate * cfg.maxEmptySec;
}

export {};
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module: the fixed-rate fight tick, one bounded input drain per tick, tick-counted join and idle limits). Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget". Input intake is the first part of that sub-line.
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, the sketch is clean-room in shape)
- Brief rule served: 1 (one engine: one fixed-step loop owns the fight on the server); rules 7-9 n/a

## 6. Gaps and risks

- Overflow policy: the donor stops the whole match when the call queue is full (`match_handler.go` 259-263). Frankendom must not end a fight on a burst: drop and count, as in the sketch.
- No per-tick NPC budget. The loop hands everything to the match's own `MatchLoop` (`runtime_go_match_core.go` 185). Frankendom's per-tick NPC budget (row 18 sub-line) has to live in the engine, not in the zone's code.
- Ticker lag: the period comes from a Go ticker, but each tick is queued into the call channel and run later by the same goroutine (186-199). A slow tick therefore queues loop calls (up to CallQueueSize) instead of skipping them, and the tick counter counts loops, not wall time. How often the Go ticker drops ticks versus the queue absorbing them was not measured. Frankendom needs a written rule for lag (skip or catch up), and every timer must use the same tick counter.
- Join sweep: markers are swept every 30 s of ticks (`match_handler.go` 307), so an unconfirmed join can outlive its 15 s deadline by up to 30 s (inference from 101 and 307). Frankendom's join and engage timeouts should be checked every tick.
- Input latency: the drain takes only messages present at the start of the tick (`runtime_go_match_core.go` 178). A message that arrives after the drain waits for the next tick. That is a deliberate donor choice; Frankendom must decide whether one tick of input latency is acceptable for a fast duel.
- No ownership or turn check in the platform: every message is passed to the user's loop. Frankendom must check each intake message against the duel state in the engine (row 5), and the server, not the zone script, must verify it.
- The donor's numbers (rate 1 to 60, queues of 128, 15 s, 30 s sweep) are donor defaults. Frankendom's tick rate and queue sizes are engine constants, and the join and idle limits are data fields.
- The donor's own sample module runs at tick rate 1 (`sample.go` 141), so it is not evidence for a fight rate.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** None in main claims. Verified match_handler.go driver goroutine/ticker (time.Second/Rate), queueCall overflow -> Stop + disconnectClients, QueueData drop with warn only, loop order, ClearExpired every Rate*30 ticks, empty-limit counter with reset, match_presence.go expiry = tick + rate*(ms/1000), runtime_go_match_core.go tick 1..60 and size:=len(inputCh) drain, config defaults 128/128/15000/MaxEmptySec 0, Apache-2.0. Tiny ordering nit: nil-state stop and processDeferred are one if/else (state!=nil -> processDeferred, else Stop+return), note lists them as (b).

**Missed:** loop() also stops the match and disconnects all clients if MatchLoop returns an error (match_handler.go ~288-295) - a second fight-ending path alongside the call-queue overflow; not mentioned.
