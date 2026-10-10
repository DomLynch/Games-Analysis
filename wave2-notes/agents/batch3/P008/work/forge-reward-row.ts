// Licence: GPL-3.0 (donor; README "License: GPL-3.0", root LICENSE is the GPLv3 text; no per-file header in RewardData.java). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface RewardRow {
  probability: number;      // 0 = always; otherwise the row fires when rng <= probability
  count: number;            // base count
  addMaxCount: number;      // bonus drawn from [0, round(addMaxCount * difficultyFactor) - 1]
  kind: 'pool' | 'gold';
  pool: string[];           // filtered ids, used when kind === 'pool'
  gold: number;             // amount, used when kind === 'gold'
}

interface Rng { next(): number; }   // uniform in [0, 1)

type Reward = { kind: 'item'; id: string } | { kind: 'gold'; amount: number };

// One reward row. Gate first, then the bonus count, then the draws; the row is independent of other rows.
function rollRow(row: RewardRow, difficultyFactor: number, rng: Rng): Reward[] {
  const out: Reward[] = [];
  if (!(row.probability === 0 || rng.next() <= row.probability)) return out;

  const maxCount = Math.round(row.addMaxCount * difficultyFactor);
  const added = maxCount > 0 ? Math.floor(rng.next() * maxCount) : 0;
  const n = row.count + added;

  if (row.kind === 'gold') {
    out.push({ kind: 'gold', amount: n });
    return out;
  }
  if (row.pool.length === 0) return out;
  for (let i = 0; i < n; i++) {
    out.push({ kind: 'item', id: row.pool[Math.floor(rng.next() * row.pool.length)] });   // with replacement
  }
  return out;
}

export {};
