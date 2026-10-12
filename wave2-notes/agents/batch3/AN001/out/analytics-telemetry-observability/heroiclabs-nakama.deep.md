# heroiclabs-nakama (analytics-telemetry-observability, cell 1)

Donor: `/mnt/frankendom-donors/heroiclabs-nakama/server/` (`runtime_event.go`, `metrics.go`, `metrics_limited_scope.go`, `api_event.go`, `status_handler.go`, `login_attempt_cache.go`, `config.go`) | Licence: Apache License, Version 2.0 (`/mnt/frankendom-donors/heroiclabs-nakama/LICENSE`, header "Apache License Version 2.0, January 2004") | Go | symbols `RuntimeEventQueue`, `LocalMetrics`, `metricsLimitedScope`

Checked: Read end to end: `runtime_event.go` (all), `metrics_limited_scope.go` (all), `api_event.go` (all), `status_handler.go` (all), `logger.go` (all), `metrics_grpc_handler.go` (all), `login_attempt_cache.go` (all), `metrics.go` 1-200, 200-330, 360-450, 500-557 (not read: 330-360 WsRpc body, 450-500 gauge setters, all tally/Prometheus internals). Config defaults read in `config.go` 675-748 and by grep at 1182-1183 and 1241. Callers read: `runtime_go.go` 3886-3900 (the only place that calls `eventQueue.Queue`), `runtime.go` 3789-3791, `console_authenticate.go` 425-445. Client SDKs and the Satori package: not read. Grep for `sampl` in non-test server Go found no sampling code (only a comment in `matchmaker.go:299`). Confidence high on the queue, the cap and the 5 s window; medium on the metric names (read in calls, not every caller). Parity hint was row 4 (fight loop); telemetry does not change aggro, chase or leash, so I used row 19 (fight record/replay), where engine events get logged.

## 1. Mechanism

- Two separate paths. (a) Metrics: every RPC and gRPC call updates counters and timers in tally scopes that export to Prometheus, plus a 5-second rolling window that feeds the health handler. (b) Events: a client sends a custom event; the server hands it to a bounded queue and answers the client at once.
- Event path, in order (`api_event.go`): before-hook (if registered) → mark event as external → if an event handler exists, call it (line 60) → after-hook → return empty success (line 73). The event handler does not run inline: `runtime_go.go` 3891-3897 wraps the registered functions in a closure and calls `eventQueue.Queue(...)`.
- Queue (`runtime_event.go` 33-68): a buffered Go channel with capacity `EventQueueSize` (default 65536, `config.go:1182`) and a fixed set of worker goroutines (default 8, `config.go:1183`) that each loop on the channel. `Queue` is a non-blocking send. If the channel is full, the `default` branch runs: it calls `CountDroppedEvents(1)` and logs a warning (65-66). The event is lost; the client already got success. Nothing retries.
- Rolling window (`metrics.go` 124-146): a goroutine wakes every 5 s, reads and resets request count, total milliseconds, and bytes. Average latency = total ms / request count (0 if none); rate = count / 5; receive and send KB/s = bytes / 1024 / 5. These four numbers are what the status handler reports.
- Cardinality cap (`metrics.go` 167-168, `metrics_limited_scope.go` 59-81): custom metrics go through a wrapper. Each new distinct tag set is counted; once the count reaches the limit (default 10,000, `config.go:748`), any new tag set gets a `tally.NoopScope`. Existing tag sets keep working. The wrapper does not count the overflow.
- Export: `ReportingFreqSec` default 60 (`config.go:743`); Prometheus is served only when `PrometheusPort` is above 0 (off by default).
- Trace id: each gRPC unary call gets a fresh uuid in its context (`api.go:115`), and each socket message gets one in `pipeline.go` 68-70. `LoggerWithTraceId` (`logger.go` 267-276) adds it to log lines.

## 2. Key functions

- `RuntimeEventQueue.Queue`: `/mnt/frankendom-donors/heroiclabs-nakama/server/runtime_event.go` 59-68. Non-blocking send; full queue drops, counts and warns.
- `NewRuntimeEventQueue`: `/mnt/frankendom-donors/heroiclabs-nakama/server/runtime_event.go` 33-57. Builds the channel and starts the fixed worker loops.
- `ApiServer.Event`: `/mnt/frankendom-donors/heroiclabs-nakama/server/api_event.go` 28-74. Before-hook, mark external, queue handoff via the event function (60), after-hook, empty response (73).
- `metricsLimitedScope.Tagged`: `/mnt/frankendom-donors/heroiclabs-nakama/server/metrics_limited_scope.go` 59-81. Known keys pass; new keys count against the limit; over the limit returns `tally.NoopScope`.
- `NewLocalMetrics` window goroutine: `/mnt/frankendom-donors/heroiclabs-nakama/server/metrics.go` 123-146. The 5 s snapshot.
- `LocalStatusHandler.GetStatus`: `/mnt/frankendom-donors/heroiclabs-nakama/server/status_handler.go` 56-73. Reports the window averages with counts; the health field is a constant.
- `LocalLoginAttemptCache.Add`: `/mnt/frankendom-donors/heroiclabs-nakama/server/login_attempt_cache.go` 140-175. Account branch live; IP branch commented out (160-173).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Bounded buffer, drop newest on full, count it | Capacity 65536 (theirs, `config.go:1182`); 8 workers (theirs, `config.go:1183`) |
| Cap distinct label sets, count overflow (donor does not count it) | 10,000 sets (theirs, `config.go:748`) |
| Rolling window: avg = sum / count, rate = count / window | Window 5 s (theirs, `metrics.go:124`) |
| Export on a timer | 60 s (theirs, `config.go:743`) |
| Login lockout: N failures in a window locks the account | 5 attempts, 1 minute (theirs, `login_attempt_cache.go:33-34`); IP 10 attempts, 10 minutes (theirs, `login_attempt_cache.go:36`), not active (see defects) |

Phone and small Node server: 65536 is a Go-sized buffer for many events per second. On a single-thread Node loop, a queue of a few thousand items drained at a fixed budget per tick is the better shape. Suggestion, not donor number: queue 4096 drained at 512 per tick at 20 ticks/s gives about 10,240 events/s of drain and about 0.4 s of burst. Cap of 10,000 label sets is far too many for a dashboard on a small server; 500 is a sane start (suggestion).

## 4. TypeScript sketch

simplified: the donor runs N goroutine workers draining a Go channel. Node is single-threaded, so this sketch drains a bounded FIFO once per tick under a budget instead. It keeps the donor's drop-on-full rule, the drop counter and the cardinality cap. It fixes three donor defects: the warn log on every drop (rate-limited here), the silent overflow of the cardinality cap (counted here), and integer-millisecond truncation in the latency window (kept as float here). It omits the tracker, the per-RPC metric names, the Prometheus export and the Stackdriver log format.

```ts
// Licence: Apache-2.0 (donor, heroiclabs-nakama). Shape adapted; written fresh for a single-threaded Node server, not a line translation.

export class BoundedEventQueue<T> {
  private items: T[] = [];
  private head = 0;
  dropped = 0;                 // lifetime drop count (donor: CountDroppedEvents)
  private droppedSinceWarn = 0;
  private lastWarnAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly capacity: number,     // count: donor EventQueueSize, default 65536
    private readonly warnEveryMs: number,  // ms: minimum gap between drop warnings (donor warns on every drop)
    private readonly warn: (msg: string) => void,
    private readonly now: () => number = () => Date.now(),
  ) {
    if (capacity < 1) throw new Error("capacity must be >= 1");
  }

  get depth(): number {
    return this.items.length - this.head;
  }

  // Never blocks the producer. A full queue drops the new item and counts it.
  offer(item: T): boolean {
    if (this.depth >= this.capacity) {
      this.dropped++;
      this.droppedSinceWarn++;
      const t = this.now();
      if (t - this.lastWarnAt >= this.warnEveryMs) {
        this.warn(`event queue full: ${this.droppedSinceWarn} dropped since last warning, ${this.dropped} total`);
        this.droppedSinceWarn = 0;
        this.lastWarnAt = t;
      }
      return false;
    }
    this.items.push(item);
    return true;
  }

  // Called once per server tick. Handles at most maxPerTick items, so the event work has a fixed budget.
  drain(maxPerTick: number, handle: (item: T) => void): number {
    let n = 0;
    while (n < maxPerTick && this.depth > 0) {
      const item = this.items[this.head];
      this.head++;
      handle(item);
      n++;
    }
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return n;
  }
}

// Caps how many distinct label sets (tags) a metric may create. Over the cap, the write is dropped and counted.
export class LabelCap {
  private seen = new Set<string>();
  overflow = 0;

  constructor(private readonly limit: number) {} // count: donor CustomScopeLimit, default 10000

  admit(labelKey: string): boolean {
    if (this.seen.has(labelKey)) return true;
    if (this.seen.size >= this.limit) {
      this.overflow++;
      return false;
    }
    this.seen.add(labelKey);
    return true;
  }
}

// Rolling window for health numbers: average latency and request rate over windowS seconds.
export class WindowStats {
  private count = 0;
  private sumMs = 0;

  record(ms: number): void {
    this.count++;
    this.sumMs += ms; // float ms: no truncation of sub-millisecond requests
  }

  // Call every windowS seconds (donor: 5 s). Resets the window.
  snapshot(windowS: number): { avgMs: number; rate: number } {
    const avgMs = this.count > 0 ? this.sumMs / this.count : 0;
    const rate = this.count / windowS;
    this.count = 0;
    this.sumMs = 0;
    return { avgMs, rate };
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/an001-nakama-queue.ts`).

## 5. Lands in

- TARGET `origins/server/telemetry.ts` (new module; `BoundedEventQueue`, `LabelCap`, `WindowStats`). Engine-side writers (fight record events, kill and hit logs) call `offer()`; the server tick calls `drain(maxPerTick, ...)` once per tick.
- Parity-checklist row 19 (fight record/replay). Hint was row 4; not used because telemetry does not change aggro, chase or leash.
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, this sketch was written fresh)
- Brief rule served: 1 (one engine: telemetry is a sink, not a second engine); rule 3 (server-verified kills: telemetry never decides a kill)

Best transferable idea: a fight or telemetry producer must never block the server tick. Use a bounded buffer with drop-and-count, drain a fixed budget per tick, and cap how many distinct metric labels can exist.
Decision (proposed): adapt — keep drop-on-full, the counter and the label cap; change the worker pool to a per-tick drain budget, which is the only shape that fits one Node loop.
Acceptance: a server test offers 20,000 events into a 4,096-slot queue in one tick and asserts the tick finishes inside its budget, `dropped` is 15,904, and at most one drop warning is logged per 5 s window. A second test asserts a kill outcome is identical with the telemetry queue full and empty.

## 6. Gaps and risks

- Defect (fix: count it): the cardinality wrapper returns `NoopScope` with no overflow counter (`metrics_limited_scope.go` 68-70). Fix: count overflow in its own metric, as `LabelCap.overflow` does in the sketch.
- Defect (fix: rate-limit it): the drop path logs a warning on every dropped event (`runtime_event.go` 65-66). Under a flood the log write adds load to the same process. Fix: `BoundedEventQueue` warns at most once per `warnEveryMs` and reports the count.
- Defect (fix: compute it): the health handler hard-codes `STATUS_HEALTH_OK` (`status_handler.go` 60). The numbers are there; the status is not derived from them. Fix: health = degraded when the drop count rises in the last window or the tick budget is exceeded.
- Defect (fix: keep float ms): latency is added as whole milliseconds (`metrics.go` 252), so a 0.4 ms request counts as 0. Fix: record float ms, as in the sketch.
- Defect (fix: enable or delete): the IP lockout is dead. `Add` never sets the IP lock (`login_attempt_cache.go` 160-173 commented out), but `Allow` still reads the IP table and `console_authenticate.go` 436 waits for an IP lock that cannot come. Not a telemetry rule for Frankendom, but it is a lockout that looks live and is not. Fix: test that the eleventh attempt from one IP is refused, or remove the branch.
- Defect: `Event` returns success before the queue decides (`api_event.go` 60 and 73). The client cannot learn that an event was dropped. Frankendom rule: client events are never a source of truth, so this is acceptable only if no kill or loot depends on a client event. State it in the module header.
- Privacy and retention: no sampling anywhere in the server (grep found none). Rotation is off by default (`config.go` 712, `Rotation: false`). When it is on, `MaxBackups` 0 keeps all old logs (`config.go` 686-689 usage text). Frankendom needs a retention number as data (days, backups) and a per-field allow-list before any player id goes into a log line.
- Ruling check: the donor drops events and keeps going, which matches "one ledger" only if nothing reads the queue back into game state. Frankendom must enforce that the queue is write-only from the engine.
- Not read: Prometheus reporter internals, tally internals, client SDK event batching. Any claim about client-side batching is therefore absent from this note.

Reuse tag: rewrite-from-idea (Apache-2.0)
Brief rule served: 1 (one engine, telemetry as a sink), 3 (kills stay server-verified)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: none
Missed: none
