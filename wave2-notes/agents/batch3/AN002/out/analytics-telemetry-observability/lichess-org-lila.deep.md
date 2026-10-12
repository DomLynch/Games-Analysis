# lichess-org-lila (analytics-telemetry-observability, cell 40)

Donor: `/mnt/frankendom-donors/lichess-org-lila/modules/mon/src/main/Chronometer.scala` (with `modules/mon/src/main/mon.scala`, `modules/mon/src/main/AsyncActorMonitor.scala`, `modules/web/src/main/PrometheusReporter.scala`, `conf/base.conf`) | Licence: AGPL-3.0-or-later (LICENSE is GNU AGPL v3; COPYING.md: "either version 3 of the License, or (at your option) any later version") | Scala | symbol `Chronometer` (object `lila.mon.Chronometer`)

Checked: Opened in full: Chronometer.scala (151 lines), AsyncActorMonitor.scala (25), PrometheusReporter.scala (99). Opened lines 1-260 and 732-736, 792-796 of mon.scala (810 lines; the rest not read). Opened conf/base.conf 440-470. Callers checked: syncMon and await were found by grep (about 9 and 9 hits); I opened only two of them (SecurityForm.scala 89 and EmailAddressValidator.scala 34 for await, read as grep lines), so the caller list is not complete. logIfSlow/logTimeIfGt: 18 grep hits, not opened. Not read: Kamon library internals (Timer.start/stop/record), the Prometheus HTTP exposition, whether production config overrides `kamon.enabled`, modules/irwin, and any health endpoint (grep for health/healthcheck in app, modules and conf found none). Confidence: high on the timing wrapper, the label rules and the scrape path; medium on the full caller set. camera_scope: n/a (not a camera cell).

## 1. Mechanism

Lila has no single telemetry module. It uses Kamon (a JVM metrics library) through a thin wrapper in `lila.mon`, plus a copy of Kamon's Prometheus reporter in `modules/web`. Three controls sit on one metric surface.

(a) One wrapper per kind of timed call. A blocking wait (`await`, Chronometer.scala 17-23) runs in this order: start the `blocking.time` timer with the call name (18, which calls `syncMon` at 143-147); run `Await.result` with a budget given by the call site; on any `Exception`, increment `blocking.timeout` for that name (22) and rethrow (23). The timer is stopped at 146, which runs only if the inner block returned normally. Async calls use `lapTry` (126-131), which records the duration for both success and failure.

(b) Labels are fixed per call site. Free text goes through an `escape` extension that drops `"`, newline and backslash (mon.scala 16-22) before it becomes a tag value, for example the HTTP path (54) and the IRC stream name (225). The metrics read have fixed tag sets (the HTTP count uses action, client, method and code; mon.scala 37-39). A "high cardinality" copy of the async-actor monitor (AsyncActorMonitor.scala 18-20) keeps the overflow path but replaces the per-name queue-size record with a no-op, so that path adds no per-name histogram series.

(c) The reporter prepares the scrape text once, and a watch counts series. Each reporting period is added to an accumulator with a 2-day stale period (PrometheusReporter.scala 19-21, 40-42). Counters are filtered to non-zero values (46, 59-60). The built text is stored once (54), and the scrape endpoint returns the stored string (56-57). `setupPeriodicMonitor` is called from the web module's env setup (modules/web/src/main/Env.scala 49), and it schedules a fixed-rate job every minute (PrometheusReporter.scala 89). It counts scrape lines per metric name (79-85: skip blank and `#` lines, name = text before the first space or brace) and writes each count to a gauge (90-92; the gauge is defined at mon.scala 794). The scrape endpoint itself is gated by a key (Main.scala 118-119).

Slow-only logging sits beside these: `Lap.logIfSlow(threshold)` logs only when `millis >= threshold` (Chronometer.scala 51-53), so a fast call writes nothing.

Order for one `await` on a timeout: timer starts (syncMon), `Await.result` throws after the budget, the timeout counter increments, the exception rethrows, and the timer is NOT stopped (see defect in section 6).

## 2. Key functions

- `futureExtension.await` (Chronometer.scala 17-23): timed wait, timeout counter, rethrow. Callers: e.g. SecurityForm.scala 89, EmailAddressValidator.scala 34.
- `futureExtension.awaitOrElse` (24-26): same, returns a default on any `Exception`.
- `Chronometer.syncMon` (143-147): start timer, run f, stop timer. No try/finally.
- `Chronometer.lapTry` and `FuLapTry.mon` (126-131, 112-115): duration recorded for success and failure.
- `Lap.logIfSlow` (51-53) and `Lap.log` (54-56): log line `<Nms> msg` at info.
- `escape` extension (mon.scala 16-22) and the HTTP tag sets (mon.scala 35-43, 54).
- `asyncActorMonitor.full` and `highCardinality` (AsyncActorMonitor.scala 9-20).
- `PrometheusReporter.reportPeriodSnapshot` (40-54), `removeZeros` (59-60), `scrapeData` (56-57), `linesPerMetric` (79-85), `setupPeriodicMonitor` (87-93, called from modules/web/src/main/Env.scala 49).
- Config: `kamon` block in conf/base.conf 443-469 (enabled, tick, buckets, lilaKey at 463).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (theirs) |
|---|---|
| Wait budget chosen per call site, not global | 1 s for email uniqueness (EmailAddressValidator.scala 34) and team member lookup (TeamSecurity.scala 77); 2 s for signup username (SecurityForm.scala 89) and captcha validation (CaptchaApi.scala 26) |
| Metric export cadence | Kamon tick 60 s (conf/base.conf 446); line-count watch every 1 minute (PrometheusReporter.scala 89) |
| Stale-data cut-off for the accumulator | 2 days + 1 s (PrometheusReporter.scala 19) |
| Histogram buckets (server latency) | default 10, 100, 1000, 10000, 100000 (conf/base.conf 465); time buckets 0.01, 0.05, 0.1, 0.5, 1, 5, 10 seconds (466) |
| Slow-log threshold | an Int in ms passed by each caller (Chronometer.scala 51); caller values not read |
| Kamon on/off | `enabled = false` by default (conf/base.conf 444) |
| Series cap per metric name | None in the donor. Only label discipline (escape, fixed tag sets). |

Which numbers suit a phone and a small Node server: the 60 s cadence and the 1-2 s waits both suit a Node server; a Node `Promise.race` gives the same budget shape. The bucket lists are server-side timings in ms and seconds and say nothing about a 375-wide phone. Nothing in this donor measures the client, so no phone budget is taken from it.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's label escape, zero filter, per-name line count, timed wait and slow-only log. It omits the Kamon and Prometheus exposition format (lines are `name{labels} value`), the 2-day accumulator, the histogram buckets (kept as numbers in section 3), the 60 s scheduler (`linesPerMetric` is a pure function; the caller schedules it), and the blocking-timer call path. It adds two things the donor does not have: a per-name series cap with a dropped counter (MetricStore), and a `finally` block so `timedWait` records the duration and the timeout on failure too (the donor's `syncMon` does not, see section 6). Blocking time is a summed counter here, not a histogram.

```ts
// clean-room: written from the mechanism in lichess-org-lila (AGPL-3.0-or-later), not a translation.
type TagValue = string | number | boolean;
type Tags = Record<string, TagValue>;

// Donor drops quote, backslash and newline from free-text label values (mon.scala 16-22).
function escapeLabel(v: string): string {
  let out = "";
  for (const ch of v) {
    if (ch !== '"' && ch !== "\\" && ch !== "\n") out += ch;
  }
  return out;
}

export class MetricStore {
  private readonly values = new Map<string, number>();
  private readonly seriesByName = new Map<string, Set<string>>();
  dropped = 0;

  // maxSeriesPerName is NOT in the donor: the donor has no cap, only label discipline.
  constructor(private readonly maxSeriesPerName: number) {}

  inc(name: string, tags: Tags, by = 1): void {
    const labels = Object.keys(tags)
      .sort()
      .map((k) => `${k}="${escapeLabel(String(tags[k]))}"`)
      .join(",");
    const key = `${name}{${labels}}`;
    let keys = this.seriesByName.get(name);
    if (keys === undefined) {
      keys = new Set<string>();
      this.seriesByName.set(name, keys);
    }
    if (!keys.has(key)) {
      if (keys.size >= this.maxSeriesPerName) {
        this.dropped += 1; // the refusal is counted; the store does not grow
        return;
      }
      keys.add(key);
    }
    this.values.set(key, (this.values.get(key) ?? 0) + by);
  }

  // Scrape text: non-zero series only, one line each (donor removeZeros, PrometheusReporter.scala 59-60).
  scrape(): string[] {
    const lines: string[] = [];
    for (const [key, v] of this.values) {
      if (v !== 0) lines.push(`${key} ${v}`);
    }
    return lines;
  }
}

// Donor reporter: count scrape lines per metric name (PrometheusReporter.scala 79-85).
export function linesPerMetric(scrapeLines: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const line of scrapeLines) {
    if (line.length === 0 || line.startsWith("#")) continue;
    const m = /^[^ {]+/.exec(line);
    if (m === null) continue;
    out.set(m[0], (out.get(m[0]) ?? 0) + 1);
  }
  return out;
}

// Timed wait with a per-call-site budget. Duration and timeout are recorded on success AND on failure.
// (The donor's syncMon does not stop its timer when f throws: the fix is the finally block here.)
export async function timedWait<T>(
  store: MetricStore,
  name: string,
  budgetMs: number,
  p: Promise<T>,
  now: () => number = Date.now
): Promise<T> {
  const start = now();
  const handle: { t?: ReturnType<typeof setTimeout> } = {};
  const limit = new Promise<never>((_, reject) => {
    handle.t = setTimeout(() => reject(new Error(`timeout: ${name}`)), budgetMs);
  });
  try {
    return await Promise.race([p, limit]);
  } catch (e) {
    store.inc("blocking.timeout", { name });
    throw e;
  } finally {
    if (handle.t !== undefined) clearTimeout(handle.t);
    store.inc("blocking.time_ms", { name }, now() - start);
  }
}

// Donor Lap.logIfSlow (Chronometer.scala 51-53): log only at or above the threshold, in ms.
export function logIfSlow(
  elapsedMs: number,
  thresholdMs: number,
  msg: string,
  log: (line: string) => void = console.log
): void {
  if (elapsedMs >= thresholdMs) log(`<${elapsedMs}ms> ${msg}`);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` run on the VPS on `/tmp/AN002-lila-telemetry-budget.ts`: exit 0 (no output). Local tsc/eslint hook is unavailable on the Mac (no project dev dependencies), so only the VPS run counts.

## 5. Lands in

- TARGET `origins/server/telemetry.ts` (new module: the server metric store, the wait budget and the slow log). Parity-checklist row 4 (the topic hint). The fit is loose: telemetry does not run in the fight loop. The nearest other row is 19 (fight record/replay), which is where event records go.
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: this module reads game state and never writes it, so kills stay server-verified); addendum rule 6 (licence); "keep the idea, fix the defect" (2026-10-10)

## 6. Gaps and risks

- AGPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor lines are copied.
- Defect 1 (fix: `finally`): `syncMon` (Chronometer.scala 143-147) calls `timer.stop()` only after `f` returns. The timed-out `await` path (17-23) rethrows out of `f`, so its duration is never recorded. Fix: stop the timer in `finally` (sketch `timedWait`).
- Gap 1: the donor has no hard cap per metric name. Label discipline (escape, fixed tag sets) is the only guard, so one wrong tag (a player id, for example) would still grow the store. Fix: a per-name cap with a drop counter (sketch `MetricStore`). The cap number is a Frankendom choice, not a donor value. Start near 64 per name for a small Node server and tune it from the first week of metrics.
- Gap 2: `removeZeros` (PrometheusReporter.scala 60) drops zero counters from the scrape, so a metric is absent until it first fires. Dashboards must read absence as zero.
- Gap 3: the ruling is one ledger. This module counts; it must never become a second source of kill or loot records. Keep it read-only with respect to game state.
- Gap 4: the scrape endpoint in the donor is gated by one shared key (Main.scala 118). Frankendom should decide who may read `/metrics` before any endpoint exists.
- Gap 5: the donor's wait budgets (1-2 s) are per call site. Frankendom's duel step is not a wait; the budget applies to DB and network calls only, not to the tick.
- Not read: the irwin anti-cheat module (modules/irwin/src/main), so anti-cheat signals as telemetry are not covered by this note; the structured-log schema (none found in the paths read, logs use Play's `logger.info` and `logger.warn`); the Kamon library internals; the other call sites of `logIfSlow` (18 hits).

Best transferable idea: a metric store that refuses new label combinations past a per-name cap, counts the refusal, and reports series counts once a minute, plus a timed wait that always records its duration.
Decision (proposed): adapt — take the shape (bounded labels, a per-name series cap with a drop counter, a per-minute series count, zero filter, slow-only log, per-call-site wait budget). Change: add the cap the donor lacks, and fix the missing finally. Reject Kamon and the full Prometheus exposition: Frankendom needs only a small `/metrics` text endpoint.
Acceptance: a server test records 500 different player-id labels on one metric name with cap N and asserts that the store holds N series and `dropped` equals 500 minus N; and a second test makes a wait time out and asserts that `blocking.timeout` and `blocking.time_ms` each record one entry.
