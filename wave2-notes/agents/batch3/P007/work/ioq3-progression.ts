// Licence: GPL-2.0-or-later (donor header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface RunInput {
  won: boolean;        // the player's side finished ahead
  baseScore: number;   // points from the match itself (where the match score is computed was not read)
  opponentScore: number;
  seconds: number;     // run length in whole seconds
  parSeconds: number;  // zone data: time to beat (0 = no par, so no time bonus)
  difficulty: number;  // 1..5; values <= 0 count as 1
}

interface Record { score: number; seconds: number }

interface Settled {
  score: number;
  record: Record | null;   // what is kept after this run
  newHigh: boolean;
  newBestTime: boolean;
}

// One finished run. Score is settled once; the stored record only moves on a winning, higher score.
export function settleRun(run: RunInput, prev: Record | null): Settled {
  const timeBonus = run.parSeconds > 0 && run.seconds < run.parSeconds ? (run.parSeconds - run.seconds) * 10 : 0;
  const shutoutBonus = run.won && run.opponentScore <= 0 ? 100 : 0;
  const multiplier = run.difficulty > 0 ? run.difficulty : 1;
  const score = (run.baseScore + shutoutBonus + timeBonus) * multiplier;

  const newHigh = run.won && score > (prev ? prev.score : 0);
  // Donor compares against a zeroed record when none exists; this sketch requires a record first (fixes the quirk).
  const newBestTime = prev !== null && run.seconds < prev.seconds;
  const record = newHigh ? { score, seconds: run.seconds } : prev;
  return { score, record, newHigh, newBestTime };
}
export {};
