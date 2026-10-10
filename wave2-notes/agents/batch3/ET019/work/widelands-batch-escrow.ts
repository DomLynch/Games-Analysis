// Licence: GPL-2.0-or-later (donor header). Clean-room sketch of the described mechanism; not a translation.
type Items = Record<string, number>;
type Account = string;

// One ledger: balances move only through post(), and every move is a row.
class Ledger {
  rows: { seq: number; account: Account; item: string; delta: number; reason: string }[] = [];
  private bal = new Map<string, number>();
  have(account: Account, item: string): number { return this.bal.get(account + "/" + item) ?? 0; }
  post(account: Account, item: string, delta: number, reason: string): void {
    const next = this.have(account, item) + delta;
    if (next < 0) throw new Error("overdraft refused");   // refuse, never clamp
    this.bal.set(account + "/" + item, next);
    this.rows.push({ seq: this.rows.length + 1, account, item, delta, reason });
  }
}

function covers(have: Items, need: Items): boolean {
  return Object.keys(need).every(k => (have[k] ?? 0) >= need[k]);
}

interface Trade {
  sides: [Account, Account];     // leg 0 goes from sides[0] to sides[1], leg 1 the other way
  perBatch: [Items, Items];      // items per batch on each leg
  batchesLeft: number;           // Infinity for an open-ended deal
  escrow: [Items, Items];        // taken from the sender, not yet launched
  transit: [Items, Items];       // launched, on the way
  arrived: [Items, Items];       // arrived for the current batch
  paused: boolean;
  done: boolean;
}

// Taking a leg's items from the sender into escrow (one ledger write per item).
function fund(l: Ledger, t: Trade, leg: 0 | 1): void {
  const from = t.sides[leg];
  for (const [item, n] of Object.entries(t.perBatch[leg])) {
    l.post(from, item, -n, "escrow for trade");
    t.escrow[leg][item] = (t.escrow[leg][item] ?? 0) + n;
  }
}

// A batch launches only when both legs are fully funded and the trade is not paused.
function tryLaunch(t: Trade): void {
  if (t.paused || t.done) return;
  for (const leg of [0, 1] as const) if (!covers(t.escrow[leg], t.perBatch[leg])) return;
  for (const leg of [0, 1] as const) {
    for (const [item, n] of Object.entries(t.perBatch[leg])) {
      t.escrow[leg][item] -= n;
      t.transit[leg][item] = (t.transit[leg][item] ?? 0) + n;
    }
  }
}

// Items reach the receiving side. The batch completes only when both legs have arrived in full.
function arrive(l: Ledger, t: Trade, leg: 0 | 1, item: string, n: number): void {
  t.transit[leg][item] -= n;
  t.arrived[leg][item] = (t.arrived[leg][item] ?? 0) + n;
  const legsDone = ([0, 1] as const).every(i => covers(t.arrived[i], t.perBatch[i]));
  if (!legsDone) return;
  for (const i of [0, 1] as const) {
    const to = t.sides[i === 0 ? 1 : 0];
    for (const [it, m] of Object.entries(t.perBatch[i])) l.post(to, it, m, "trade batch received");
    t.arrived[i] = {};
  }
  if (t.batchesLeft !== Infinity && --t.batchesLeft === 0) t.done = true;
  tryLaunch(t);
}

export {};
