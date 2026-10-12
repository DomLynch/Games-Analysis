// Licence: GPL-3.0 (donor, EQEmu). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Shape only: a per-interval chat budget whose allowance grows with earned trust (karma), with a kick above an absolute count.
export interface BudgetRules {
  minPerInterval: number;   // data: floor allowance (donor MinimumMessagesPerInterval 4)
  maxPerInterval: number;   // data: ceiling allowance (donor MaximumMessagesPerInterval 12)
  kickAfter: number;        // data: attempts in one interval before a disconnect (donor MaxMessagesBeforeKick 20)
  intervalMs: number;       // data: interval length (donor IntervalDurationMS 60000)
  karmaEveryMs: number;     // data: active time that earns one karma point (donor KarmaUpdateIntervalMS 1200000)
  karmaGlobalGate: number;  // data: karma needed to speak in global channels below the level limit (donor 72)
}

export interface BudgetState {
  intervalStartMs: number;
  attempts: number;         // every attempt counts, including refused ones
  karma: number;
  lastKarmaMs: number;
}

export type Verdict = 'send' | 'rate-limited' | 'kick';

// Karma accrues at most one point per check, and only while the player was active (fix: donor accrues on connected time alone).
export function tickKarma(st: BudgetState, r: BudgetRules, nowMs: number, active: boolean): BudgetState {
  if (!active || nowMs - st.lastKarmaMs < r.karmaEveryMs) {
    return st;
  }
  return { ...st, karma: st.karma + 1, lastKarmaMs: nowMs };
}

export function chatAttempt(
  st: BudgetState, r: BudgetRules, nowMs: number, bypass: boolean
): { verdict: Verdict; state: BudgetState } {
  let s = st;
  if (nowMs - s.intervalStartMs >= r.intervalMs) {
    s = { ...s, intervalStartMs: nowMs, attempts: 0 };
  }

  const allowed = bypass
    ? Number.MAX_SAFE_INTEGER
    : Math.min(r.minPerInterval + s.karma, r.maxPerInterval);

  s = { ...s, attempts: s.attempts + 1 };

  if (s.attempts > allowed) {
    return { verdict: s.attempts > r.kickAfter ? 'kick' : 'rate-limited', state: s };
  }
  return { verdict: 'send', state: s };
}

export function canSpeakGlobal(st: BudgetState, r: BudgetRules, levelOk: boolean): boolean {
  return st.karma >= r.karmaGlobalGate || levelOk;
}

export {};
