// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface RentItem { required: number; paid: number; }
interface Tenancy {
  houseId: number;
  purchaseAt: number;      // seconds
  dueAt: number;           // seconds; the queue sorts by this, then by houseId
  rent: RentItem[];        // upkeep owed this period
  meetsRank: boolean;      // requirements checked at the due time
}
type Outcome = 'paid' | 'grace' | 'evict';

const INTERVAL_S = 30 * 24 * 3600; // donor RentInterval, 30 days

// Start of the current period, then one interval after it: the next due time.
export function nextDue(purchaseAt: number, now: number, intervalS: number = INTERVAL_S): number {
  const offset = Math.max(0, now - purchaseAt); // fix: clamp so a future purchase time cannot wrap
  const periods = Math.floor(offset / intervalS);
  return purchaseAt + intervalS * periods + intervalS;
}

// Exempt (free) houses are always paid. Otherwise rent and requirements must both hold.
// Unpaid rent gets a grace window (our addition, not in the donor, which evicts at the due time).
export function settle(t: Tenancy, exempt: boolean, now: number, graceS: number): Outcome {
  const rentPaid = t.rent.every(r => r.paid >= r.required);
  if (exempt || (rentPaid && t.meetsRank)) return 'paid';
  if (!rentPaid && now < t.dueAt + graceS) return 'grace';
  return 'evict';
}

export class UpkeepQueue {
  private queue: Tenancy[] = [];
  private lastRun = -Infinity;

  constructor(private readonly tickMs = 60000) {} // donor: RateLimiter(1, 1 minute)

  add(t: Tenancy): void {
    this.queue.push(t);
    this.queue.sort((a, b) => a.dueAt - b.dueAt || a.houseId - b.houseId);
  }

  // Runs at most once per tickMs. Drains every entry whose due time has passed.
  // Each entry leaves the queue before it is settled; paid and grace entries go back in.
  // No early return drops an entry: every path re-queues or evicts (fixes the donor's silent drop).
  tick(now: number, exempt: (houseId: number) => boolean, graceS: number): { houseId: number; outcome: Outcome }[] {
    if (now - this.lastRun < this.tickMs) return [];
    this.lastRun = now;
    const out: { houseId: number; outcome: Outcome }[] = [];
    while (this.queue.length > 0 && now > this.queue[0].dueAt) {
      const t = this.queue.shift()!;
      const outcome = settle(t, exempt(t.houseId), now, graceS);
      out.push({ houseId: t.houseId, outcome });
      if (outcome === 'paid') {
        t.dueAt = nextDue(t.purchaseAt, now);
        this.add(t);
      } else if (outcome === 'grace') {
        t.dueAt = t.dueAt + graceS; // check again when the grace window ends
        this.add(t);
      }
      // 'evict': the caller runs eviction (owner cleared, permissions cleared, house released).
    }
    return out;
  }
}

export {};
