// Licence: GPL-2.0 (donor ioquake-ioq3, COPYING.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

// One server frame at a fixed step; elapsed wall time is banked as a residual (donor SV_Frame, sv_main.c 1087-1149).
export function runFixedSteps(residual: number, elapsedMs: number, stepMs: number, step: () => void): number {
  let r = residual + elapsedMs;
  while (r >= stepMs) {
    r -= stepMs;
    step();
  }
  return r;
}

export interface Pipe {
  snapshotMs: number;      // per-client snapshot period, from the client's requested rate, clamped to the server fps
  rateBytesPerSec: number; // client byte budget, clamped to a floor and a ceiling
  lastSnapshotAt: number;  // ms, server clock
  lastSentAt: number;      // ms, server clock
  lastSentBytes: number;   // bytes of the previous datagram
  queuedFragments: number; // unsent reliable fragments
}

// Rate gate: how many ms until the next send may pass (donor SV_RateMsec, sv_main.c 1178-1213).
// The header term models the 28-byte IPv4 UDP/IP header the donor adds.
export function msecUntilSendAllowed(p: Pipe, now: number, headerBytes = 28): number {
  const rateMsec = Math.floor(((p.lastSentBytes + headerBytes) * 1000) / p.rateBytesPerSec);
  const elapsed = now - p.lastSentAt;
  return elapsed > rateMsec ? 0 : rateMsec - elapsed;
}

// Send decision for one client in one server frame (donor SV_SendClientMessages, sv_snapshot.c 643-682).
// Skipping is the whole policy: a skipped snapshot is not queued, so the next delta base stays valid.
export function mayBuildAndSend(p: Pipe, now: number): boolean {
  if (now - p.lastSnapshotAt < p.snapshotMs) return false;   // cadence
  if (p.queuedFragments > 0) return false;                    // queue still full: delta would break
  return msecUntilSendAllowed(p, now) === 0;                  // byte budget
}

// Fix for the donor's first-come cap (sv_snapshot.c 278-279 silently drops entities after 256):
// rank candidates by distance before the cap, so the nearest entities are the ones kept.
export function capNearest<T extends { dist: number }>(candidates: T[], cap: number): T[] {
  return [...candidates].sort((a, b) => a.dist - b.dist).slice(0, cap);
}
