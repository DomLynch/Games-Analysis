// Licence: GPL-2.0 (donor KeeperFX, LICENSE). Clean-room sketch of the shape, written from the mechanism, not a translation of the donor lines.
const SYNC_INTERVAL_MS = 250; // donor TURN_SYNC_INTERVAL_MS, net_exchange_gameplay.c:55
const STALE_AFTER_MS = 3 * SYNC_INTERVAL_MS; // donor drops a sample older than TURN_SYNC_INTERVAL_MS * 3
const MAX_NUDGE_NS = 1000000; // donor TURN_SYNC_MAX_ADJUSTMENT_NS, net_exchange_gameplay.c:56 (1 ms)
const NUDGE_DIVISOR = 64; // donor TURN_SYNC_ADJUST_FACTOR, net_exchange_gameplay.c:57

// Client-side estimate of the server's turn position, from its latest sample.
class TurnClock {
  private serverPosNs = 0;
  private receivedAtMs = 0; // 0 = no sample yet

  constructor(
    private nowMs: () => number,
    private localPosNs: () => number,
  ) {}

  // A server sample is its turn position plus half the ping (one way). Donor: net_exchange_gameplay.c:236-238.
  onServerSample(positionNs: number, pingMs: number): void {
    this.serverPosNs = positionNs + Math.floor((pingMs * 1000000 + 1) / 2);
    this.receivedAtMs = this.nowMs();
  }

  // Nudge in ns added to one turn's period. Zero when there is no fresh sample.
  nudgeNs(): number {
    if (this.receivedAtMs === 0) {
      return 0;
    }
    const ageMs = this.nowMs() - this.receivedAtMs;
    if (ageMs > STALE_AFTER_MS) {
      return 0;
    }
    const serverNowNs = this.serverPosNs + ageMs * 1000000; // extrapolate the server position by the sample age
    const raw = Math.trunc((this.localPosNs() - serverNowNs) / NUDGE_DIVISOR);
    return Math.max(-MAX_NUDGE_NS, Math.min(MAX_NUDGE_NS, raw));
  }
}

// Multiplier on the turn rate. A positive nudge (local clock ahead) lengthens the turn, so the local clock slows.
function clockRateScale(turnPeriodNs: number, nudgeNs: number): number {
  return turnPeriodNs / (turnPeriodNs + nudgeNs);
}

export {};
