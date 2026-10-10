// Licence: GPL-3.0-or-later (donor source headers). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const INT64_MAX = (1n << 63n) - 1n;
const INT64_MIN = -(1n << 63n);
function clamp64(x: bigint): bigint {
  return x > INT64_MAX ? INT64_MAX : x < INT64_MIN ? INT64_MIN : x;
}

type Op = 'set' | 'add' | 'sub' | 'mul' | 'div' | 'min' | 'max';

// One ledger for all quest state and rewards. A missing name reads as 0.
class Ledger {
  private store = new Map<string, bigint>();

  get(name: string): bigint {
    return this.store.get(name) ?? 0n;
  }

  // One write path. Returns false (value unchanged) for a division by zero.
  apply(name: string, op: Op, value: bigint): boolean {
    const cur = this.get(name);
    let next: bigint;
    switch (op) {
      case 'set': next = value; break;
      case 'add': next = clamp64(cur + value); break;
      case 'sub': next = clamp64(cur - value); break;
      case 'mul': next = clamp64(cur * value); break;
      case 'div':
        if (value === 0n) return false;
        next = cur / value;
        break;
      case 'min': next = cur < value ? cur : value; break;
      case 'max': next = cur > value ? cur : value; break;
    }
    this.store.set(name, next);
    return true;
  }
}

// Pays out at most what the player has: a negative payment cannot take credits below zero.
function applyPayment(l: Ledger, credits: string, payment: bigint): void {
  const account = l.get(credits);
  if (account + payment >= 0n) l.apply(credits, 'add', payment);
  else if (account > 0n) l.apply(credits, 'sub', account);
}

type Trigger = 'offer' | 'accept' | 'decline' | 'complete' | 'fail' | 'abort';

interface Quest {
  name: string;
  objectives: Array<() => boolean>;   // every objective must hold before completion (AND)
  actionCanBeDone: () => boolean;     // the reward action's own gate (e.g. enough credits to pay out)
  reward: () => void;
}

// Fires a lifecycle trigger. State lives in the ledger as "<name>: <counter>" entries.
function fire(l: Ledger, q: Quest, t: Trigger): boolean {
  if (t === 'fail' || t === 'abort') {
    // Failing and aborting move their counters first, whether or not the action can be done.
    l.apply(`${q.name}: active`, 'sub', 1n);
    l.apply(`${q.name}: ${t === 'fail' ? 'failed' : 'aborted'}`, 'add', 1n);
    if (t === 'abort') l.apply(`${q.name}: failed`, 'add', 1n);
    return true;
  }
  if (!q.actionCanBeDone()) return false;   // nothing below moves if the action cannot be done
  switch (t) {
    case 'offer':
      return true;                          // an offer only shows the mission; no counter, no reward
    case 'accept':
      l.apply(`${q.name}: offered`, 'add', 1n);
      l.apply(`${q.name}: active`, 'add', 1n);
      break;
    case 'decline':
      l.apply(`${q.name}: offered`, 'add', 1n);
      l.apply(`${q.name}: declined`, 'add', 1n);
      break;
    case 'complete':
      if (!q.objectives.every((check) => check())) return false;   // completion is an AND of objectives
      l.apply(`${q.name}: active`, 'sub', 1n);
      l.apply(`${q.name}: done`, 'add', 1n);
      break;
  }
  q.reward();
  return true;
}

// Example: "clear 3 raiders, then return". Other quests can test "bounty: done" as a condition.
const ledger = new Ledger();
ledger.apply('credits', 'set', 50n);
const bounty: Quest = {
  name: 'bounty',
  objectives: [() => ledger.get('raiders killed') >= 3n],
  actionCanBeDone: () => true,
  reward: () => applyPayment(ledger, 'credits', 200n),
};
fire(ledger, bounty, 'accept');
ledger.apply('raiders killed', 'add', 3n);
fire(ledger, bounty, 'complete');
ledger.apply('zero', 'div', 0n);   // division by zero: value unchanged, reported as false
