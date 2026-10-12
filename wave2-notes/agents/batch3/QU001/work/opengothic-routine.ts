// clean-room sketch of the OpenGothic NPC routine table (MIT donor; shape only, written from the described steps)
// Clock values are minutes of the day, 0..1439.
interface Routine { start: number; end: number; state: string; waypoint: string; }

const DAY = 24 * 60;

// addRoutine: append, then keep the table sorted by start (stable sort).
function addRoutine(table: Routine[], r: Routine): void {
  table.push(r);
  table.sort((a, b) => a.start - b.start);
}

// currentRoutine: the entry whose window holds `now` (a window with end < start wraps midnight).
// If none holds it, take the entry whose end is the nearest one before `now` (24 h wrap);
// on a tie the later entry in table order wins.
function currentRoutine(table: Routine[], now: number, needWaypoint = false): Routine | undefined {
  const usable = needWaypoint ? table.filter(r => r.waypoint !== "") : table;
  for (const r of usable) {
    if (r.end < r.start && (now < r.end || r.start <= now)) return r;
    if (r.start <= now && now < r.end) return r;
  }
  let best: Routine | undefined;
  let bestD = Number.MAX_SAFE_INTEGER;
  for (const r of usable) {
    let d = now - r.end;
    if (d < 0) d += DAY;
    if (d <= bestD) { best = r; bestD = d; }
  }
  return best;
}

// endTime: absolute minute (counted from day 0) at which this routine hands over.
function endTime(r: Routine, nowAbs: number): number {
  const dayStart = Math.floor(nowAbs / DAY) * DAY;
  const time = nowAbs - dayStart;
  if (r.end < r.start) return time < r.end ? dayStart + r.end : dayStart + DAY + r.end;
  if (r.start < r.end) return (r.end < 60 || r.end < time) ? dayStart + DAY + r.end : dayStart + r.end;
  if (r.start === r.end && r.end === 0) return dayStart + DAY;
  return nowAbs; // donor: start == end and not zero is treated as "not active now"
}

// tick: when no state is running, start the current routine's state until its end time.
function tickStart(table: Routine[], nowAbs: number, stateRunning: boolean): { state: string; until: number } | null {
  if (stateRunning) return null;
  const r = currentRoutine(table, nowAbs % DAY, false);
  if (r === undefined) return null;
  return { state: r.state, until: endTime(r, nowAbs) };
}

export {};
