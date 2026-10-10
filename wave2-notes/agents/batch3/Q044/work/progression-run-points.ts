// Licence: CC0 1.0 (donor LICENSE and COPYING). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// Level for a total of points. Level 2 needs 10 points; each next level needs 10 more than the last step (10, 20, 30...).
export function levelForPoints(points: number): number {
  let level = 1;
  let required = 10;
  for (let i = 2; i <= 1000; i++) {
    if (points < required) return level;
    required += i * 10;
    level = i;
  }
  return level;
}

// Points for one game: damage counted up to 25, plus 10 for a win. A winner with some damage is credited 25 first.
export function gamePoints(damage: number, won: boolean): number {
  let dealt = 0;
  if (damage > 0) dealt = won && damage < 25 ? 25 : damage;
  return Math.min(dealt, 25) + (won ? 10 : 0);
}

// Upgrades earned: one for each level crossed by this game's points.
export function upgradesEarned(pointsBefore: number, earned: number): number {
  return levelForPoints(pointsBefore + earned) - levelForPoints(pointsBefore);
}

// Rating change for the winner. The gap is clamped to 100..500; a small gap gives 30, a large gap gives 10.
export function ratingDelta(winner: number, loser: number): number {
  const band = 500 - 100;
  const alpha = 1 - (clamp(winner - loser, 100, 500) - 100) / band;
  let delta = Math.floor(10 + (30 - 10) * alpha);
  if (loser - delta < 0) delta = loser;   // the loser cannot go below zero
  return delta;
}

// The winner always gains at least 10, even when the loser is near zero.
export function winnerGain(winner: number, loser: number): number {
  return Math.max(ratingDelta(winner, loser), 10);
}
export {};
