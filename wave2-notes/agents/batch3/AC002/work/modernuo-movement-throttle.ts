// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// simplified: keeps the credit-and-queue timing gate (early packets spend credit, late packets rebuild it, a queue behind a pending move, reject-and-reset on overflow), the late-baseline clamp, the rate ratio over a bounded history with a minimum sample count, the queue-depth signal, and the sustained counter with a per-player notify cooldown. Omits: the RTT-based credit bonus and stable-connection test (the stable flag is a plain input), the confidence score and its forgiveness rules (so the donor's definite rule with confidence above 0.6, and the definiteRate field, are not used here), the packet-rate signal, the burst detection, the chain-gap history reset, the RTT probe, the sequence check, the staff bypass, the donor's per-step recomputed cost (the sketch stores cost on the queued item), and the 'now' refresh inside the drain loop (one time value per call). The queue rules are reduced: a queue of 3 or more on a stable link stands in for the donor's queue-likely rules, and above 4 is definite as in the donor. Flags go to an in-memory ledger; nothing is kicked or banned.

export interface Cfg {
  maxCredit: number;          // ms of early arrival that credit can cover (donor 200 before RTT bonus)
  maxDrift: number;           // ms; a late baseline is clamped to this far behind now (donor 200)
  hardQueueLimit: number;     // queue length that triggers reject-and-reset (donor 10)
  unmodifiedQueueMax: number; // queue depth an unmodified client cannot exceed (donor 4)
  minSamples: number;         // history samples needed before a rate is used (donor 8)
  historySize: number;        // ring size (donor 20)
  suspiciousRate: number;     // donor 1.05
  definiteRate: number;       // donor 1.10
  cooldownMs: number;         // notify cooldown per player (donor 300000)
}

export interface Queued {
  cost: number;   // ms this move charges to the baseline (donor recomputes it at execution)
  seq: number;
}

export interface Sample {
  target: number;   // cost of the move
  interval: number; // actual gap since the previous recorded move
}

export interface Conn {
  nextAllowedMs: number;
  credit: number;
  queue: Queued[];
  history: Sample[];
  lastMoveMs: number | null;
  highSeconds: number;      // sustained counter: +2 per check at likely or above, -1 otherwise
  lastNotifyMs: number | null;
  stable: boolean;          // stands in for the donor's stable-connection test
}

export type Verdict = "normal" | "possible" | "likely" | "definite";

export interface Flag {
  atMs: number;
  verdict: Verdict;
  ratio: number;
}

export const ledger: Flag[] = [];

// Execute one move: late baselines are clamped, then the move's cost is charged. Cost zero (a turn) resets the baseline to now.
function execute(c: Conn, cfg: Cfg, now: number, cost: number): void {
  if (cost === 0) {
    c.nextAllowedMs = now;
    return;
  }
  if (now - c.nextAllowedMs > cfg.maxDrift) c.nextAllowedMs = now - cfg.maxDrift;
  c.nextAllowedMs += cost;
}

function recordHistory(c: Conn, cfg: Cfg, now: number, cost: number): void {
  if (cost === 0) return; // turns do not change the rate
  const interval = c.lastMoveMs === null ? -1 : now - c.lastMoveMs;
  c.lastMoveMs = now;
  if (interval <= 0 || interval > 2000) return; // chain break (donor chain gap 2000 ms)
  c.history.push({ target: cost, interval });
  if (c.history.length > cfg.historySize) c.history.shift();
}

function enqueue(c: Conn, cfg: Cfg, now: number, m: Queued): "queued" | "rejected" {
  if (c.queue.length >= cfg.hardQueueLimit) {
    resetMovement(c, now);
    return "rejected";
  }
  c.queue.push(m);
  return "queued";
}

// Donor ResetMovementState: queue cleared, baseline set to now, credit zeroed, history and sustained counter cleared.
export function resetMovement(c: Conn, now: number): void {
  c.queue = [];
  c.nextAllowedMs = now;
  c.credit = 0;
  c.history = [];
  c.lastMoveMs = null;
  c.highSeconds = 0;
}

// One incoming move. Recording happens first, before any decision.
export function onMove(c: Conn, cfg: Cfg, now: number, m: Queued): "executed" | "queued" | "rejected" {
  recordHistory(c, cfg, now, m.cost);
  if (c.queue.length > 0) return enqueue(c, cfg, now, m);

  const delta = now - c.nextAllowedMs;
  if (delta < 0) {
    const early = -delta;
    if (c.credit - early >= -cfg.maxCredit) {
      c.credit -= early; // debt may go down to -maxCredit
      execute(c, cfg, now, m.cost);
      return "executed";
    }
    return enqueue(c, cfg, now, m);
  }
  if (delta > 0) c.credit = Math.min(c.credit + delta, cfg.maxCredit);
  execute(c, cfg, now, m.cost);
  return "executed";
}

// Run queued moves whose time has come. Returns how many ran.
export function drain(c: Conn, cfg: Cfg, now: number): number {
  let ran = 0;
  while (c.queue.length > 0) {
    if (now - c.nextAllowedMs < 0) break;
    const m = c.queue.shift();
    if (m === undefined) break;
    execute(c, cfg, now, m.cost);
    ran++;
  }
  return ran;
}

export function rate(c: Conn, cfg: Cfg): { ratio: number; samples: number } {
  const n = c.history.length;
  if (n < cfg.minSamples) return { ratio: 1, samples: n };
  let target = 0;
  let actual = 0;
  for (const s of c.history) {
    target += s.target;
    actual += s.interval;
  }
  return { ratio: actual > 0 ? target / actual : 1, samples: n };
}

export function verdict(c: Conn, cfg: Cfg): Verdict {
  const { ratio, samples } = rate(c, cfg);
  if (samples < cfg.minSamples) return "normal";
  if (ratio > 1.2) return "definite";
  if (c.queue.length > cfg.unmodifiedQueueMax) return "definite";
  if (c.stable && (c.queue.length >= cfg.unmodifiedQueueMax - 1 || ratio > cfg.suspiciousRate)) return "likely";
  if (ratio > 1.03) return "possible";
  if (c.stable && c.queue.length >= 2) return "possible";
  return "normal";
}

// Called about every 2 seconds. Notifies at most once per cooldown, with the sustained gates the donor uses.
export function check(c: Conn, cfg: Cfg, nowMs: number): Verdict {
  const v = verdict(c, cfg);
  if (v === "likely" || v === "definite") c.highSeconds += 2;
  else c.highSeconds = Math.max(0, c.highSeconds - 1);

  const notify =
    v === "definite" ||
    (v === "likely" && c.highSeconds >= 10) ||
    (v === "possible" && c.highSeconds >= 30);

  if (notify && (c.lastNotifyMs === null || nowMs - c.lastNotifyMs >= cfg.cooldownMs)) {
    c.lastNotifyMs = nowMs;
    ledger.push({ atMs: nowMs, verdict: v, ratio: rate(c, cfg).ratio });
  }
  return v;
}

export {};
