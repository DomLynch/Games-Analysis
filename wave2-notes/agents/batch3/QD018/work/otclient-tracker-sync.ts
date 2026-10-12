// Quest tracker sync: the client keeps a per-character mirror of tracked
// missions. The server is authoritative: a full replace (list push) and an
// upsert (one mission push) overwrite the mirror. The mirror is only sent
// back as a selection, capped by the protocol.
export {};

export const MAX_TRACKED = 255; // protocol count is one byte

export interface TrackedEntry {
  missionId: number;
  questId: number;
  name: string;
  desc: string;
}

export interface Tracker {
  entries: TrackedEntry[]; // client mirror, never authoritative for completion
  applying: boolean; // true only while a server push is applied (no timers)
  dirty: boolean; // a save is wanted; the caller decides when to write
}

export function newTracker(): Tracker {
  return { entries: [], applying: false, dirty: false };
}

// Server full replace: clears and rebuilds the mirror.
export function applyFull(t: Tracker, list: TrackedEntry[]): void {
  t.applying = true;
  try {
    t.entries = list.map((e) => ({ ...e }));
    t.dirty = true;
  } finally {
    t.applying = false;
  }
}

// Server upsert: one mission changed (progress text, name, quest id).
export function applyUpsert(t: Tracker, e: TrackedEntry): void {
  t.applying = true;
  try {
    const i = t.entries.findIndex((x) => x.missionId === e.missionId);
    if (i >= 0) t.entries[i] = { ...e };
    else t.entries.push({ ...e });
    t.dirty = true;
  } finally {
    t.applying = false;
  }
}

// Player tracks a mission. Refuses past the cap instead of dropping silently.
export function track(t: Tracker, e: TrackedEntry): "ok" | "full" | "dup" {
  if (t.entries.some((x) => x.missionId === e.missionId)) return "dup";
  if (t.entries.length >= MAX_TRACKED) return "full";
  t.entries.push({ ...e });
  t.dirty = true;
  return "ok";
}

export function untrack(t: Tracker, missionId: number): void {
  t.entries = t.entries.filter((x) => x.missionId !== missionId);
  t.dirty = true;
}

// Payload for the server: unique ids, capped. The overflow count is returned
// so the caller can tell the player.
export function payload(t: Tracker): { ids: number[]; dropped: number } {
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const e of t.entries) {
    if (seen.has(e.missionId)) continue;
    seen.add(e.missionId);
    if (ids.length < MAX_TRACKED) ids.push(e.missionId);
  }
  return { ids, dropped: seen.size - ids.length };
}

// The caller decides when to write (the donor debounces 500 ms with a timer).
export function flushIfDirty(t: Tracker, write: (json: string) => void): boolean {
  if (!t.dirty) return false;
  write(JSON.stringify(t.entries));
  t.dirty = false;
  return true;
}

// Example: a server full push, one upsert, one track request, then payload.
const t = newTracker();
applyFull(t, [{ missionId: 1, questId: 10, name: "Q", desc: "kill 3" }]);
applyUpsert(t, { missionId: 1, questId: 10, name: "Q", desc: "kill 2 of 3" });
const r = track(t, { missionId: 2, questId: 10, name: "Q", desc: "find key" });
const p = payload(t);
flushIfDirty(t, () => {});
