// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const MAX_CREDIT_MS = 200;     // base credit buffer (donor: _maxCredit)
const MAX_RTT_BONUS_MS = 150;  // extra credit for high latency (donor: _maxRttBonus)
const HARD_QUEUE_LIMIT = 10;   // reject and reset at this depth (donor: _hardQueueLimit)
const MAX_DRIFT_MS = 200;      // lateness that may be banked (donor: maxDrift in Mobile.Move)

type Decision = 'execute' | 'queued' | 'rejected';
type Verdict = 'normal' | 'possible' | 'likely' | 'definite';

interface Gate {
  credit: number;   // may go negative down to -limit (debt)
  clockMs: number;  // earliest time the next input is allowed
  queue: number[];  // deferred input ids, in arrival order
}

function creditLimit(avgRttMs: number): number {
  return MAX_CREDIT_MS + Math.min(Math.floor(avgRttMs / 2), MAX_RTT_BONUS_MS);
}

// Reject path shared by queue overflow and a failed move: clear the queue, credit and clock.
function rejectAndReset(g: Gate, now: number): Decision {
  g.queue = [];
  g.credit = 0;
  g.clockMs = now;
  return 'rejected';
}

// Server-side move: advances the clock by the cost, clamping banked lateness first.
// If the move itself fails (blocked, frozen), the donor rejects and resets instead of advancing.
function execute(g: Gate, now: number, costMs: number, moveOk = true): Decision {
  if (!moveOk) return rejectAndReset(g, now);
  if (costMs === 0) { g.clockMs = now; return 'execute'; } // turn in place resets the clock
  if (now - g.clockMs > MAX_DRIFT_MS) g.clockMs = now - MAX_DRIFT_MS;
  g.clockMs += costMs;
  return 'execute';
}

// Deferred input: reject and reset at the hard limit, otherwise queue.
function enqueue(g: Gate, now: number, id: number): Decision {
  if (g.queue.length >= HARD_QUEUE_LIMIT) return rejectAndReset(g, now);
  g.queue.push(id);
  return 'queued';
}

// One input. Queue order is kept; early inputs spend credit; late inputs refill it.
function admit(g: Gate, now: number, costMs: number, avgRttMs: number, id: number, moveOk = true): Decision {
  if (g.queue.length > 0) return enqueue(g, now, id);
  const delta = now - g.clockMs; // > 0 on time or late, < 0 early
  const limit = creditLimit(avgRttMs);
  if (delta < 0) {
    const early = -delta;
    if (g.credit - early >= -limit) { g.credit -= early; return execute(g, now, costMs, moveOk); }
    return enqueue(g, now, id);
  }
  g.credit = Math.min(g.credit + delta, limit);
  return execute(g, now, costMs, moveOk);
}

// simplified: rate and queue only. Donor also gates on confidence (0.2 to 0.6), RTT (under 100 ms for some
// tiers), packet rate and burst forgiveness; those are dropped here.
function verdict(rate: number, queueDepth: number, stable: boolean): Verdict {
  if (rate > 1.20 || queueDepth > 4) return 'definite';
  if (queueDepth >= 3 && stable) return 'likely';  // donor: 4 on a stable link under 100 ms RTT, or 3 on a stable link
  if (rate > 1.05 && stable) return 'likely';
  if (rate > 1.03 || (queueDepth >= 2 && stable)) return 'possible';
  return 'normal';
}

// Staff signal only: the caller updates `sustained` every check; nothing here rejects input.
function staffSignal(v: Verdict, sustained: number): 'HIGH' | 'MEDIUM' | 'LOW' | null {
  if (v === 'definite') return 'HIGH';
  if (v === 'likely' && sustained >= 10) return 'MEDIUM';
  if (v === 'possible' && sustained >= 30) return 'LOW';
  return null;
}

export {};
