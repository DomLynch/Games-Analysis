// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Racer { xp: number; }

const SHORT_LEVELS = [1, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 9]; // XP 0..2499 in 100s
const LOSS_FACTORS = [10, 11, 11, 25, 25, 43, 43, 67, 67];                                        // levels 1..9; 100 from level 10
// [win, loss] scalar for (ourLevel - theirLevel) from -6 to +6
const OFFSET: [number, number][] = [
  [175, 25], [165, 35], [155, 45], [145, 55], [130, 70], [115, 85], [100, 100],
  [90, 110], [80, 120], [70, 130], [60, 140], [50, 150], [40, 160],
];

export function levelOf(xp: number): number {
  if (xp >= 22500) return 50;
  if (xp >= 2500) return 10 + Math.trunc((xp - 2500) / 500);
  return SHORT_LEVELS[Math.trunc(Math.max(xp, 0) / 100)];
}

export function lossFactor(level: number): number {
  return level >= 10 ? 100 : LOSS_FACTORS[level - 1];
}

export function offsetScalar(ourLevel: number, theirLevel: number, win: boolean): number {
  const x = ourLevel - theirLevel;
  if (x < -6 || x > 6) return 0; // no exchange across a gap of more than six levels
  return OFFSET[x + 6][win ? 0 : 1];
}

// XP change for one side. Win is positive, loss negative, and a settled change is at least 1 in size.
export function xpChange(ourXp: number, theirXp: number, weWon: boolean): number {
  const ourLevel = levelOf(ourXp);
  const scalar = offsetScalar(ourLevel, levelOf(theirXp), weWon);
  if (scalar === 0) return 0;
  let xp = 25 * scalar;
  if (!weWon) xp = Math.trunc((xp * lossFactor(ourLevel)) / 100);
  xp = Math.trunc(xp / 100);
  if (xp <= 0) xp = 1;
  return weWon ? xp : -xp;
}

// Settle a one-versus-one duel. Both changes are read from the same pre-match XP (the donor's sequential
// Award calls would apply the first change before computing the second if its Find worked; as written Find
// returns fresh zero-XP entries, so the order effect is latent there).
export function settleDuel(a: Racer, b: Racer, aWon: boolean): { aDelta: number; bDelta: number } {
  const aXp = a.xp;
  const bXp = b.xp;
  const aDelta = xpChange(aXp, bXp, aWon);
  const bDelta = xpChange(bXp, aXp, !aWon);
  a.xp = Math.max(0, aXp + aDelta);
  b.xp = Math.max(0, bXp + bDelta);
  return { aDelta, bDelta };
}

export {};
