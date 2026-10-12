// Licence: unclear (donor README names LGPL-3.0; the repo also ships LICENSE.GPL and LICENSE.MIT; no per-file header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Times are UTC. One clock: `now` is passed in.

export type PeriodStatus = "NotFound" | "NotStarted" | "InProgress" | "Ended";

export interface YMD {
  y: number;
  m: number; // 1-based month
  d: number; // day of month
}

export interface ScheduleRow {
  weekday: number | null; // 0 = Sunday .. 6 = Saturday; null = any day
  startMinute: number;    // minute of the UTC day the window opens, 0..1439
  endMinute: number;      // minute of the UTC day the window closes; less than startMinute wraps midnight
  from: YMD | null;       // first date the row applies (null = no lower bound)
  to: YMD | null;         // last date the row applies (null = no upper bound)
}

function dayMs(d: YMD): number {
  return Date.UTC(d.y, d.m - 1, d.d);
}

// Minute-of-day inside [start, end]; when end is before start the window wraps midnight.
export function inWrappedWindow(minuteOfDay: number, start: number, end: number): boolean {
  if (start <= end) return minuteOfDay >= start && minuteOfDay <= end;
  return minuteOfDay >= start || minuteOfDay <= end;
}

// One row. The time of day is applied on every day the row covers (the donor tests it only on the
// first and last date, and skips it entirely when no date range is set).
export function rowStatus(row: ScheduleRow, now: Date): PeriodStatus {
  const nowMs = now.getTime();
  const fromMs = row.from ? dayMs(row.from) + row.startMinute * 60000 : -Infinity;
  const toMs = row.to ? dayMs(row.to) + row.endMinute * 60000 : Infinity;
  if (nowMs >= toMs) return "Ended";

  const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
  const weekdayOk = row.weekday === null || now.getUTCDay() === row.weekday;
  if (nowMs >= fromMs && weekdayOk && inWrappedWindow(minuteOfDay, row.startMinute, row.endMinute)) {
    return "InProgress";
  }
  return "NotStarted";
}

// Several rows on one spawner or doodad: any row in progress wins, then any ended, else not started.
export function periodStatus(rows: ScheduleRow[], now: Date): PeriodStatus {
  if (rows.length === 0) return "NotFound";
  let anyEnded = false;
  for (const r of rows) {
    const s = rowStatus(r, now);
    if (s === "InProgress") return "InProgress";
    if (s === "Ended") anyEnded = true;
  }
  return anyEnded ? "Ended" : "NotStarted";
}

// Soonest boundary among the rows' candidate times (ms). Keeps the minimum; the donor's cron path keeps the last row.
export function soonestMs(candidatesMs: number[]): number {
  return candidatesMs.length === 0 ? Infinity : Math.min(...candidatesMs);
}

export {};
