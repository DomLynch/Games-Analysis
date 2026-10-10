// Licence: LGPL-3.0 / GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Status values: 0 NotReady, 1 CanEarlyComplete, 2 QuestComplete, 3 ExtraProgress, 4 Overachieved.
type Status = 0 | 1 | 2 | 3 | 4;

interface Act { count: number; progress: number; }   // one objective counter

interface Contract {
  acts: Act[];
  letItDone: boolean;   // early turn-in allowed, overachieve pays more
  selective: boolean;   // true: best act decides; false: worst act decides
  rewardPool: number;   // units, paid through the one ledger by the caller
}

// Half and 1.5x steps are rounded UP here. The donor uses integer division for these, which
// makes a Count-1 act read CanEarlyComplete at zero progress (see Gaps).
function maxProgress(a: Act, letItDone: boolean): number {
  return letItDone ? Math.ceil(a.count * 1.5) : a.count;
}

function addProgress(a: Act, amount: number, letItDone: boolean): void {
  a.progress = Math.min(a.progress + amount, maxProgress(a, letItDone));
}

function actStatus(a: Act, letItDone: boolean): Status {
  if (letItDone && a.progress >= Math.ceil(a.count * 1.5)) return 4;
  if (letItDone && a.progress > a.count) return 3;
  if (a.progress >= a.count) return 2;
  if (letItDone && a.progress >= Math.ceil(a.count / 2)) return 1;
  return 0;
}

function contractStatus(c: Contract): Status {
  if (c.acts.length === 0) return 2;                 // no objectives counts as complete
  const s = c.acts.map(a => actStatus(a, c.letItDone));
  return (c.selective ? Math.max(...s) : Math.min(...s)) as Status;
}

// Reward ratio by status. Only LetItDone contracts scale; the others always pay 1.
const RATIO: Record<Status, number> = { 0: 0, 1: 0.3, 2: 1, 3: 1, 4: 1.2 };

function payout(c: Contract): number {
  if (!c.letItDone) return c.rewardPool;
  return Math.round(c.rewardPool * RATIO[contractStatus(c)]);
}

// Turn-in gate: LetItDone contracts may turn in from CanEarlyComplete; others need QuestComplete.
function tryTurnIn(c: Contract): number | null {
  const need: Status = c.letItDone ? 1 : 2;
  if (contractStatus(c) < need) return null;
  return payout(c);
}

export {};
