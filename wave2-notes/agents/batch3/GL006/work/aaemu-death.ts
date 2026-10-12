// Licence: LGPL-3.0 per the donor README (copyleft: shape only). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Death escalation: the respawn wait steps up with each death inside a 5-minute window and resets after a quiet 5 minutes.
// Experience lost at death is capped to the XP earned in the current level and 80 percent can be recovered from a priest.

const DEATH_WAIT_S = [15, 30, 60, 90, 120, 150, 180, 210, 240];   // data: wait table, seconds
const RESET_WINDOW_MS = 5 * 60_000;                               // data: quiet time that resets the count
const RECOVER_SHARE = 0.8;                                        // data: share of the loss a priest returns

// Persisted with the character: the donor keeps these two fields only in memory (defect, fixed here).
interface DeathState {
  consecutive: number;   // deaths in the current streak
  lastDeath: number;     // epoch ms of the last death, 0 = none
  lostXp: number;        // XP lost at the last death, recoverable
  recoverable: number;   // XP a priest can give back
}

// Called in the death path before the death packet is sent.
function waitSeconds(s: DeathState, now: number): number {
  if (s.lastDeath !== 0 && now - s.lastDeath >= RESET_WINDOW_MS) s.consecutive = 0;
  const idx = Math.min(s.consecutive, DEATH_WAIT_S.length - 1);
  const wait = DEATH_WAIT_S[idx];
  s.consecutive += 1;
  s.lastDeath = now;
  return wait;
}

// XP loss: the current level's XP span times the configured rate, floored, capped to XP earned this level.
// No loss at max level.
function xpLoss(level: number, maxLevel: number, expAt: (lvl: number) => number, rate: number, earnedThisLevel: number): number {
  if (level >= maxLevel) return 0;
  const span = expAt(level + 1) - expAt(level);
  return Math.min(Math.floor(span * rate), earnedThisLevel);
}

// Recovery cost in labor: equal to the level up to 50, then 20 per level above it.
function laborCost(level: number): number {
  return level <= 50 ? level : 50 + (level - 50) * 20;
}

function recoverableFrom(lost: number): number {
  return Math.round(lost * RECOVER_SHARE);
}

export {};
