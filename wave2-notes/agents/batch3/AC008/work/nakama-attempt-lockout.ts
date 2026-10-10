// Licence: Apache-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const MAX_ATTEMPTS = 5;        // donor: maxAttemptsAccount = 5
const WINDOW_MS = 60_000;      // donor: lockoutPeriodAccount = time.Minute * 1 (also the retention window)

type Entry = { lockedUntil: number; attempts: number[] };
const table = new Map<string, Entry>();

// Gate: checks only whether the key is locked, not how many attempts it has (as in the donor's Allow).
export function allow(key: string, now: number = Date.now()): boolean {
  const e = table.get(key);
  return !(e !== undefined && e.lockedUntil > now);
}

// Record one failed attempt. Returns the lock end time if this failure locks the key, else 0.
export function recordFailure(key: string, now: number = Date.now()): number {
  let e = table.get(key);
  if (e === undefined) {
    e = { lockedUntil: 0, attempts: [] };
    table.set(key, e);
  }
  e.attempts.push(now);
  // Sliding window: keep attempts younger than the window (donor: trim drops age >= retention).
  e.attempts = e.attempts.filter((t) => now - t < WINDOW_MS);
  if (e.attempts.length >= MAX_ATTEMPTS) {
    e.lockedUntil = now + WINDOW_MS; // re-set on every failure at or above the limit
    return e.lockedUntil;
  }
  return 0;
}

// Reset on successful login (donor: Reset deletes the whole entry).
export function reset(key: string): void {
  table.delete(key);
}

// Periodic sweep (donor: every 10 minutes). Drop entries with no live lock and no live attempts.
export function sweep(now: number = Date.now()): void {
  for (const [k, e] of table) {
    e.attempts = e.attempts.filter((t) => now - t < WINDOW_MS);
    if (e.lockedUntil <= now && e.attempts.length === 0) table.delete(k);
  }
}

export {};
