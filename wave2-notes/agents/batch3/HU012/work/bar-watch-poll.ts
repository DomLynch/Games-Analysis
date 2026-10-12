// Licence: GNU GPL v2 (donor widget header, BAR LICENSE.md). CLEAN-ROOM: shape only, written from the described mechanism.
// Unit bar stack: bar rows as data, staggered watch polling, change-only uploads, hide-at-threshold rule.

export type BarKind = "health" | "shield" | "emp" | "paralyzed" | "reload" | "capture" | "building" | "stockpile";

export interface BarRow {
  kind: BarKind;
  hideAt: number;                           // fraction at which the bar is hidden (donor table value; enforcement not read)
  lo: [number, number, number, number];     // colour at 0 fraction
  hi: [number, number, number, number];     // colour at 1 fraction
}

// Hide rule, as the donor table states it (the donor's Lua does not apply it; see notes).
export function shouldShow(row: BarRow, fraction: number): boolean {
  return fraction < row.hideAt;
}

// One watch: polls a value for every tracked unit, but only on frames where frame % period == phase.
export interface WatchState {
  period: number;
  phase: number;
  last: Map<string, number>;                // last value sent, per unit id (change-only uploads)
  read: (unitId: string) => number | null;  // null means "no value now" (caller removes the bar)
}

// Returns how many values were uploaded this frame. Units not read this frame keep their last value.
export function runWatch(
  frame: number,
  w: WatchState,
  unitIds: Iterable<string>,
  upload: (unitId: string, value: number) => void,
): number {
  if (frame % w.period !== w.phase) return 0;
  let uploads = 0;
  for (const id of unitIds) {
    const v = w.read(id);
    if (v === null) continue;
    if (w.last.get(id) !== v) {
      w.last.set(id, v);
      upload(id, v);
      uploads++;
    }
  }
  return uploads;
}

export {};
