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
