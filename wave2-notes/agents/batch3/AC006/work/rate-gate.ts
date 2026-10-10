// Licence: BSL 1.1 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface RateRow {
  identity: string;
  lastAcceptedUs: number; // server clock, microseconds, of the last ACCEPTED call
}

export interface RateTable {
  get(identity: string): RateRow | undefined;
  set(row: RateRow): void;
}

export type GateResult =
  | { ok: true }
  | { ok: false; code: "RATE_LIMITED"; retryAfterUs: number };

const MIN_INTERVAL_US = 1_000_000; // 1 second window (donor constant)

// Runs inside the engine's single action step. nowUs must come from the server clock, never from the client.
export function admitAction(
  table: RateTable,
  identity: string,
  nowUs: number,
  minIntervalUs: number = MIN_INTERVAL_US,
): GateResult {
  const row = table.get(identity);
  if (row !== undefined) {
    const sinceUs = nowUs - row.lastAcceptedUs;
    if (sinceUs < minIntervalUs) {
      return { ok: false, code: "RATE_LIMITED", retryAfterUs: minIntervalUs - sinceUs };
    }
  }
  // Only accepted calls move the window; a rejected call writes nothing.
  table.set({ identity, lastAcceptedUs: nowUs });
  return { ok: true };
}

export {};
