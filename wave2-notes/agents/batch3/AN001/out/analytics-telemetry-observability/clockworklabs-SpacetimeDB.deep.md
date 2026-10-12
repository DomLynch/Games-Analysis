# clockworklabs-SpacetimeDB (analytics-telemetry-observability, cell 3)

Donor: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/database_logger.rs` (main, 858 lines), with `crates/core/src/worker_metrics/mod.rs` (disconnect causes, gauge sampler) and `crates/engine/src/resource.rs` (memory delta reporting) | Licence: Business Source License 1.1, Licensor Clockwork Laboratories, Inc. (`/mnt/frankendom-donors/clockworklabs-SpacetimeDB/LICENSE.txt`, "Business Source License 1.1") | Rust (Tokio) | symbols `DatabaseLogger`, `DatabaseLoggerWorker`, `MemoryLogger`, `FileLogger`, `ClientDisconnectRecorder`

Checked: Read: `database_logger.rs` 60-175 (file and memory loggers), 180-200 (levels), 316-400 (write path, tail, size), 457-540 (worker loop, append, tail with follow, subscribe), 542-600 (backward line scan). `worker_metrics/mod.rs` 27-50 (disconnect causes), 236-262 (recorder), 728-750 (gauge sampler). `engine/src/resource.rs` 20-75 (memory delta). Not read: the rest of `database_logger.rs` (`system_logger`, `read_latest_on_disk`, `open_most_recent`), most of `worker_metrics/mod.rs` (973 lines), callers of `DatabaseLogger::write` (grep found no level filter in `core/src/host/instance_env.rs` or `module_host.rs`; not a full read), and any retention job (grep for remove or delete in `database_logger.rs` found none). Licence line read. Confidence: high on the logger write, memory eviction, tail-with-follow and disconnect recorder; medium on the level-filtering question. Clean-room: BSL 1.1 is restricted for us; this note describes the shape only, and the sketch is written from it. Parity hint was row 4 (fight loop), not used: a log does not change aggro, chase or leash. I used row 19 (fight record/replay), because a structured event log with a live tail is what a fight record is.

## 1. Mechanism

- One log per game module. A record (level, message, fields) is serialized to one JSON line (`write`, 357-380) and sent on an unbounded channel to one worker task (`with_logger`, 331). The worker handles commands in a single serial loop (`run`, 468), so appends never interleave.
- Append (`DatabaseLoggerWorker::append`, 484-491): write the line to storage (file or memory), then send the same line to a broadcast channel of capacity 64 for live followers. The disk write and the broadcast happen in that order for every record.
- Storage: (a) `FileLogger` appends to today's file and opens a new file when a record's UTC date is later than the open file's date (`maybe_rotate`, 77-82). Rotation only moves forward. (b) `MemoryLogger` keeps a deque of lines and a byte count; after each append it pops from the front while the byte count is above `max_size` (`compact`, 139-140).
- Tail with `follow`, in order (`tail`, 499-527): no follow → stream the stored tail. Follow with `n` None or 0 → subscribe only. Follow with `n` > 0 → take the logger lock, subscribe to broadcast, sync the file to disk, read the last `min(n, 2500)` lines, release. Because the worker is serial and the subscription is taken before the snapshot, a record cannot fall between the snapshot and the live stream.
- Backward scan (`read_lines`, `seek_to`, 542-593): the last n lines of a file are found by reading 64 KiB chunks from the end and counting newlines. Buffer size is the next power of two of `n * 150` bytes, capped at 64 KiB (`seek_buffer`, 556-558).
- Panic records only: `LogLevel::Panic` (value 101) alone captures a backtrace (`write`, 365-367). All other levels skip the capture.
- Disconnect causes (`worker_metrics/mod.rs` 27-50): a closed enum, one variant per reason (for example `IdleTimeout`, `IncomingQueueFull`, `OutgoingQueueFull`, `ModuleExited`). `ClientDisconnectRecorder::record` (249-261) records only the first cause for a connection: a compare-and-swap on a flag, so the second call returns false.
- Gauges: the allocator sampler (`spawn_jemalloc_stats`, 728-748) advances the stats epoch, reads allocated, resident and active bytes, sets gauges, then sleeps 10 s. Other pool and runtime samplers use the same 10 s loop (lines 771, 794).
- Memory deltas (`engine/src/resource.rs` 38-42): each module instance keeps its last observed size and reports only the change, so one database-wide total is compared against one limit.

## 2. Key functions

- `DatabaseLogger::write`: -380. Level dispatch, backtrace on panic only, one JSON line, send to worker.
- `DatabaseLoggerWorker::run`:  onward. Serial command loop.
- `DatabaseLoggerWorker::append`: -491. Store, then broadcast.
- `DatabaseLoggerWorker::tail`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/crates/core/src/database_logger.rs` 499-527. Snapshot-then-follow handoff.
- `MemoryLogger::compact` and `append`: -152. Byte-capped eviction.
- `FileLogger::maybe_rotate`: -82. Daily rotation.
- `ClientDisconnectRecorder::record`: -261. First cause wins.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Byte cap on the in-memory tail, oldest evicted | `max_size` set by the caller (not read) |
| Live broadcast buffer | 64 messages (theirs, `database_logger.rs` 332) |
| Snapshot cap on follow-tail | 2500 lines (theirs, 513) |
| Backward scan chunk | 150 bytes per line estimate; buffer at most 64 KiB (theirs, 554-557) |
| Gauge sampler interval | 10 s (theirs, `worker_metrics/mod.rs` 748) |
| Panic-only backtrace | level code 101 (theirs, `database_logger.rs` 197) |

Phone and small Node server: a 2500-line snapshot at about 150 bytes a line is about 375 KB, which is too much to send to a phone. Suggestion, not donor: a 200-line default tail for an admin page and a 64 KiB in-memory cap per zone. Sampling at 10 s is fine for a gauge; it is not per-tick.

## 4. TypeScript sketch

simplified: the donor runs a Tokio worker task fed by an unbounded channel, with a lock-guarded file or memory logger and a broadcast channel for live tail. Node is single-threaded, so this sketch uses a bounded pending queue drained by `flush()`, which a server tick calls with a budget. It keeps: one serialized writer, JSON lines, an in-memory cap in bytes with oldest-first eviction, daily rotation that only moves forward, a backtrace captured only for panic records, and a snapshot-plus-follow tail. It fixes two donor defects: the unbounded command queue (bounded here, refusals are counted), and a failed file write that panics the caller (the sink error is counted here, not thrown). It omits the backward file scan, the level filter, and the lag counter for slow subscribers (callbacks here are synchronous, so nothing lags).

```ts
// Licence: Business Source License 1.1 (donor, clockworklabs-SpacetimeDB). Clean-room: shape only, written from the described mechanism; no donor line is translated.

export type Level = "error" | "warn" | "info" | "debug" | "trace" | "panic";

export class ModuleLog {
  private ring: string[] = [];
  private head = 0;                  // index of the oldest kept line
  private ringBytes = 0;
  private pending: Array<{ ts: number; line: string }> = [];
  private subscribers = new Set<(line: string) => void>();
  dropped = 0;                       // lines refused because the pending queue was full
  sinkErrors = 0;                    // lines the sink failed to write (still kept in memory)

  constructor(
    private readonly maxBytes: number,                          // bytes kept in memory (donor: MemoryLogger max_size)
    private readonly maxPending: number,                        // lines queued before a refusal (donor: unbounded)
    private readonly sink: (ts: number, line: string) => void,  // may throw
    private readonly now: () => number = () => Date.now(),
  ) {}

  // Never blocks the caller. Serializes one record to a JSON line and queues it.
  write(level: Level, fields: Record<string, unknown>): boolean {
    if (this.pending.length >= this.maxPending) {
      this.dropped++;
      return false;
    }
    const ts = this.now();
    const body = level === "panic" ? { ...fields, backtrace: new Error().stack } : fields; // stack captured only for panic
    this.pending.push({ ts, line: JSON.stringify({ ts, level, ...body }) + "\n" });
    return true;
  }

  // Called once per server tick. Writes at most maxLines queued records.
  flush(maxLines: number): number {
    const batch = this.pending.splice(0, maxLines);
    for (const { ts, line } of batch) {
      try {
        this.sink(ts, line);
      } catch {
        this.sinkErrors++;
      }
      this.keep(line);
    }
    return batch.length;
  }

  // Last n lines plus every later line. Snapshot and subscribe happen in one synchronous call, so no line falls between them.
  tail(n: number, onLine: (line: string) => void): string[] {
    const cap = Math.min(n, 2500); // donor caps a snapshot at 2500 lines
    this.subscribers.add(onLine);
    return this.ring.slice(Math.max(this.head, this.ring.length - cap));
  }

  unsubscribe(onLine: (line: string) => void): void {
    this.subscribers.delete(onLine);
  }

  private keep(line: string): void {
    this.ring.push(line);
    this.ringBytes += line.length;
    while (this.ringBytes > this.maxBytes && this.head < this.ring.length) {
      this.ringBytes -= this.ring[this.head].length;
      this.head++;
    }
    if (this.head > 0 && this.head * 2 > this.ring.length) {
      this.ring = this.ring.slice(this.head); // compact so the array does not grow without bound
      this.head = 0;
    }
    for (const s of [...this.subscribers]) {
      try {
        s(line);
      } catch {
        this.subscribers.delete(s); // a subscriber that throws is removed
      }
    }
  }
}

// Daily rotation that only moves forward, as the donor does: a record for a later UTC day opens that day's file.
export function dailyRouter(open: (day: string) => (line: string) => void): (ts: number, line: string) => void {
  let day = "";
  let write: ((line: string) => void) | undefined;
  return (ts, line) => {
    const d = new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD, UTC; string order matches date order
    if (write === undefined || d > day) {
      day = d;
      write = open(d);
    }
    write(line);
  };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/an001-spacetime-log.ts`).

## 5. Lands in

- TARGET `origins/server/zone-log.ts` (new): one `ModuleLog` per zone process. Engine code writes events with `write()`; the server tick calls `flush()`; the admin page calls `tail()` for the live view.
- Parity-checklist row 19 (fight record/replay). Hint was row 4; not used, see Checked.
- Reuse tag: rewrite-from-idea (BSL 1.1: clean-room, shape only)
- Brief rule served: 1 (one engine: the log is a sink, the engine never reads it back); rule 3 (kills stay server-verified; a log line is never the record of a kill)

Best transferable idea: keep one serialized writer per zone, cap in-memory history by bytes, and attach live followers by taking the subscription before the snapshot, so an admin view sees every line once without a gap.
Decision (proposed): adapt — keep the serial writer, byte-capped tail, forward-only daily rotation, panic-only backtraces and the snapshot-then-follow handoff; bound the pending queue and count refusals instead of an unbounded channel; never throw from the write path.
Acceptance: a server test writes 10,000 records with `maxBytes` 65536 and asserts resident bytes stay at or under 65536, `tail(200)` returns the last 200 lines, and a follower attached before a write receives that write exactly once; a second test makes the sink throw and asserts the tick does not throw and `sinkErrors` counts the lines.

## 6. Gaps and risks

- Defect (fix: bound it): the command channel is unbounded (`database_logger.rs` 333). A slow disk grows memory without limit. Fix: bounded pending queue with a counted refusal (sketch `write`).
- Defect (fix: count it, do not panic): a file write error panics the worker (`database_logger.rs` 88, `.unwrap()`), and the next send panics the caller (380, `.expect`), so a full disk takes the module down. Fix: the sink error is counted and the line is kept in memory (sketch `flush`).
- Defect (fix: tell the viewer): a lagged live subscriber silently loses lines, logged only at trace level (`database_logger.rs` 534). Fix: count skipped lines per subscriber and send one "skipped N" marker line.
- Defect (fix: reuse the buffer): `write` allocates a fresh string for each record (`database_logger.rs` 371-372, its own TODO says reuse). Fix: a per-zone reusable buffer when throughput matters.
- Retention gap: this file never deletes old day files (grep for remove and delete found none). Retention, if any, is elsewhere (not read). Frankendom needs a retention number as data (days kept) and a rule that no player id goes into a line without an allow-list.
- Level filter: not found in the two callers grepped. If there is no filter, debug and trace lines cost disk on a live zone. Frankendom should filter before `write()` (not read; confirm).
- The disconnect recorder (`worker_metrics/mod.rs` 249-261) is the best small idea in this cell: one cause per connection, first one wins, so the metric cannot double count a disconnect. Frankendom can use the same rule for "why did this client leave" (idle, queue full, server exit).
- Not read: `system_logger`, `read_latest_on_disk`, most of `worker_metrics/mod.rs`, and any caller that filters by level.

Reuse tag: rewrite-from-idea (BSL 1.1, clean-room)
Brief rule served: 1 (one engine: log is a sink), 3 (kills stay server-verified)
