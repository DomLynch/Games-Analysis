// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface RatedSide {
  rating: number; // ladder rating in points; start value comes from ladder data
  isAi: boolean;  // explicit flag; the donor infers AI from a failed player lookup
}

export const AI_RATING = 1400; // donor: fixed opponent rating when the opponent is the AI

// Expected score of a side rated `rating` against `opRating`. Logistic curve, 400-point scale.
export function expectedScore(rating: number, opRating: number): number {
  return 1 / (1 + Math.pow(10, (opRating - rating) / 400));
}

// Result is from side A's point of view. Returns the integer delta applied to A; B gets the negative.
export function applyResult(
  a: RatedSide,
  b: RatedSide,
  result: 'win' | 'loss' | 'draw',
  k: number,
): number {
  if (a.isAi) throw new Error('rate the human side as a');
  // A draw scores 0.5. The donor skips rating on a draw entirely.
  const score = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;
  const bRating = b.isAi ? AI_RATING : b.rating;
  const delta = Math.round(k * (score - expectedScore(a.rating, bRating)));
  a.rating += delta;
  if (!b.isAi) b.rating -= delta; // zero-sum: the opponent gives up exactly what A gains
  return delta;
}

export {};
