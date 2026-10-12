// Licence: LGPL-3.0 per README (donor). Clean-room sketch written from the described mechanism (a per-suspect set of distinct reporters, a prime-suspect threshold, a reason row), not a translation of the donor lines.
// Frankendom fix: the reporter set is rebuilt from persisted report rows (donor keeps it in memory only), the reason text is stored as a row (donor has a TODO for this), a self-report is refused, and a per-reporter daily cap is enforced (donor defines the error codes but never raises them).

export interface ReportRow {
  suspectId: number;
  reporterId: number;
  reason: string;
  atMs: number;
}

interface SuspectState {
  reporters: Set<number>;
  prime: boolean;
}

// Data fields: prime threshold 5 (donor Justice.json:91, JusticeConfig.cs:15); daily cap is a Frankendom choice, not a donor value.
const PRIME_SUSPECT_COUNT = 5;
const DAILY_REPORT_CAP = 5;
const REASON_MAX_CHARS = 120;

export type ReportOutcome =
  | { ok: true; distinctReporters: number; prime: boolean }
  | { ok: false; why: "self" | "duplicate" | "daily-cap" };

// Rebuild the in-memory view from rows (called at load time, so a restart keeps every report).
export function rebuildSuspects(rows: ReadonlyArray<ReportRow>): Map<number, SuspectState> {
  const map = new Map<number, SuspectState>();
  for (const r of rows) {
    let s = map.get(r.suspectId);
    if (!s) {
      s = { reporters: new Set<number>(), prime: false };
      map.set(r.suspectId, s);
    }
    s.reporters.add(r.reporterId);
    if (s.reporters.size >= PRIME_SUSPECT_COUNT) s.prime = true;
  }
  return map;
}

export function fileReport(
  suspects: Map<number, SuspectState>,
  rows: ReportRow[],
  suspectId: number,
  reporterId: number,
  reason: string,
  nowMs: number,
  reporterReportsToday: number,
): ReportOutcome {
  if (suspectId === reporterId) return { ok: false, why: "self" };
  if (reporterReportsToday >= DAILY_REPORT_CAP) return { ok: false, why: "daily-cap" };

  let s = suspects.get(suspectId);
  if (!s) {
    s = { reporters: new Set<number>(), prime: false };
    suspects.set(suspectId, s);
  }
  if (s.reporters.has(reporterId)) return { ok: false, why: "duplicate" };

  s.reporters.add(reporterId);
  rows.push({ suspectId, reporterId, reason: reason.slice(0, REASON_MAX_CHARS), atMs: nowMs });
  if (s.reporters.size >= PRIME_SUSPECT_COUNT) s.prime = true;
  return { ok: true, distinctReporters: s.reporters.size, prime: s.prime };
}

export {};
