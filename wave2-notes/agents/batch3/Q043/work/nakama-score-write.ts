// Licence: Apache-2.0 (donor, Copyright 2018 The Nakama Authors). Shape adapted from the donor's write rules; written from the described mechanism.
type Op = 'best' | 'set' | 'incr' | 'decr';

interface Row {
  score: number;
  subscore: number;     // tie-break value, moves with the score
  numScore: number;     // counted writes
  maxNumScore: number;  // attempt cap for a tournament row; 0 = no cap
}

// The new score and subscore for each operator (no gate applied here).
function combine(row: Row, op: Op, s: number, sub: number, higherIsBetter: boolean): { score: number; subscore: number } {
  switch (op) {
    case 'incr': return { score: row.score + s, subscore: row.subscore + sub };
    case 'decr': return { score: Math.max(row.score - s, 0), subscore: Math.max(row.subscore - sub, 0) };
    case 'set':  return { score: s, subscore: sub };
    case 'best':
      return {
        score: higherIsBetter ? Math.max(row.score, s) : Math.min(row.score, s),
        subscore: higherIsBetter ? Math.max(row.subscore, sub) : Math.min(row.subscore, sub),
      };
  }
}

// True when the write would change nothing (zero delta, same value, or not better).
function isNoOp(row: Row, op: Op, s: number, sub: number, higherIsBetter: boolean): boolean {
  if (op === 'incr' || op === 'decr') return s === 0 && sub === 0;
  if (op === 'set') return row.score === s && row.subscore === sub;
  return higherIsBetter ? !(row.score < s || row.subscore < sub) : !(row.score > s || row.subscore > sub);
}

// Board: a no-op leaves the stored row and its count untouched; a real change counts one write.
function boardWrite(row: Row, op: Op, s: number, sub: number, higherIsBetter: boolean): Row {
  if (isNoOp(row, op, s, sub, higherIsBetter)) return row;
  return { ...row, ...combine(row, op, s, sub, higherIsBetter), numScore: row.numScore + 1 };
}

// Open tournament: every submission is counted. If the count passes the cap, the write is refused
// and the caller must discard the change (the donor rolls its transaction back).
function tournamentWrite(row: Row, op: Op, s: number, sub: number, higherIsBetter: boolean): Row | 'max-attempts' {
  const next: Row = { ...row, ...combine(row, op, s, sub, higherIsBetter), numScore: row.numScore + 1 };
  if (next.maxNumScore > 0 && next.numScore > next.maxNumScore) return 'max-attempts';
  return next;
}
