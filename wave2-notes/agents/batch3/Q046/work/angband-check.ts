// Licence: GPL-2.0 or the Angband licence (dual; src/player.c header). Treated as GPL-2.0: clean-room, shape only. Numbers are the donor's table, kept as data.
// Frankendom reading: one XP record (exp, high-water mark, fractional carry); level is derived from exp and the race/class factor.
const PY_MAX_LEVEL = 50;
const PY_MAX_EXP = 99999999;
// Base XP threshold table: entry i is the base for reaching level i+2 (before the percent factor).
const PLAYER_EXP: readonly number[] = [10, 25, 45, 70, 100, 140, 200, 280, 380, 500, 650, 850, 1100, 1400, 1800, 2300, 2900, 3600, 4400, 5400, 6800, 8400, 10200, 12500, 17500, 25000, 35000, 50000, 75000, 100000, 150000, 200000, 275000, 350000, 450000, 550000, 700000, 850000, 1000000, 1250000, 1500000, 1800000, 2100000, 2400000, 2700000, 3000000, 3500000, 4000000, 4500000, 5000000];

export interface Char {
  lev: number;
  exp: number;        // current XP
  maxExp: number;     // high-water XP mark
  expfact: number;    // percent: race exp + class exp (e.g. 130 = 130%)
  expFrac: number;    // fractional XP carried between kills, 0..0xFFFF
}

// XP needed to be at level `level` (level >= 2), in whole XP: base * expfact / 100, truncated.
export function thresholdFor(level: number, expfact: number): number {
  return Math.trunc((PLAYER_EXP[level - 2] * expfact) / 100);
}

// Level from exp, with the donor's two loops: drop while below this level's threshold, rise while at or above the next.
export function adjustLevel(p: Char): void {
  if (p.exp > p.maxExp) p.maxExp = p.exp;
  while (p.lev > 1 && p.exp < thresholdFor(p.lev, p.expfact)) p.lev--;
  while (p.lev < PY_MAX_LEVEL && p.exp >= thresholdFor(p.lev + 1, p.expfact)) p.lev++;
}

// Kill XP: base = monster exp x monster level / player level; the remainder is carried in 1/65536 steps.
export function killXp(mexp: number, monsterLevel: number, p: Char): number {
  const div = p.lev;
  let gain = Math.trunc((mexp * monsterLevel) / div);
  const frac = Math.trunc((((mexp * monsterLevel) % div) * 0x10000) / div) + p.expFrac;
  if (frac >= 0x10000) {
    gain += 1;
    p.expFrac = frac - 0x10000;
  } else {
    p.expFrac = frac;
  }
  return gain;
}

// Gain: cap at PY_MAX_EXP; while still below the mark, the mark grows by a tenth of the gain.
export function gainExp(p: Char, amount: number): void {
  amount = Math.min(amount, PY_MAX_EXP - p.exp);
  p.exp += amount;
  if (p.exp < p.maxExp) {
    p.maxExp = Math.min(PY_MAX_EXP, p.maxExp + Math.trunc(amount / 10));
  }
  adjustLevel(p);
}

// Drain: take exp (never below 0); a permanent drain also lowers the mark.
export function loseExp(p: Char, amount: number, permanent: boolean): void {
  if (p.exp < amount) amount = p.exp;
  p.exp -= amount;
  if (permanent) p.maxExp -= amount;
  adjustLevel(p);
}


const c: Char = { lev: 3, exp: 0, maxExp: 0, expfact: 130, expFrac: 0 };
const k1 = killXp(10, 5, c), k2 = killXp(10, 5, c);
console.log("kills at lev3 (mexp10,mlev5):", k1, k2, "frac", c.expFrac);
const h: Char = { lev: 1, exp: 0, maxExp: 0, expfact: 130, expFrac: 0 };
console.log("thr lev2,5,50:", thresholdFor(2, 130), thresholdFor(5, 130), thresholdFor(50, 130));
gainExp(h, 12); console.log("after 12 xp lev", h.lev);
gainExp(h, 1); console.log("after 13 xp lev", h.lev, "max", h.maxExp);
gainExp(h, 1000); loseExp(h, 500, true); console.log("after +1000 -500 perm: exp", h.exp, "max", h.maxExp, "lev", h.lev);
gainExp(h, 100); console.log("drained gain 100: exp", h.exp, "max", h.maxExp);
const z: Char = { lev: 1, exp: 0, maxExp: 0, expfact: 100, expFrac: 0 };
gainExp(z, 10000000); console.log("max lev reached", z.lev, "exp", z.exp);
export {};
