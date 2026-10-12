// Licence: GNU GPL version 3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const DAY_MS = 24 * 60 * 60 * 1000;
const VIRTUE_CAP = 21000;          // default cap (donor VirtueSystem.GetMaxAmount)
const VALOR_LOSS = 250;            // points per atrophy step (donor Valor.cs LossAmount)
const VALOR_DELAY_MS = 7 * DAY_MS; // one atrophy step per delay (donor LossDelay)
const CREDIT_CAP = 3;              // sacrifice resurrect credits cap (donor Sacrifice.cs)

interface Virtue {
  value: number;    // 0..cap
  lastLoss: number; // ms timestamp of last atrophy step
  credits: number;  // sacrifice resurrect credits
}

// Level bands from points. Under 4000 is none. The +9999 makes exactly 10000 fall in level 1.
export function level(value: number, cap = VIRTUE_CAP): number {
  if (value < 4000) return 0;
  if (value >= cap) return 3;
  return Math.floor((value + 9999) / 10000);
}

// Award: clipped to the cap; returns whether a new level was reached (the "gained a path" message).
export function award(v: Virtue, amount: number, cap = VIRTUE_CAP): { gained: boolean; newPath: boolean } {
  if (v.value >= cap) return { gained: false, newPath: false };
  const add = Math.min(amount, cap - v.value);
  const before = level(v.value, cap);
  v.value += add;
  return { gained: true, newPath: level(v.value, cap) !== before };
}

// Atrophy: at most one step of 250 per 7 days since the last step. No catch-up for longer gaps.
export function atrophyValor(v: Virtue, now: number): void {
  if (v.value <= 0 || v.lastLoss + VALOR_DELAY_MS >= now) return;
  v.value = Math.max(0, v.value - VALOR_LOSS);
  v.lastLoss = now;
}

// Valor challenge: spend points to advance a champion ladder. Costs by ladder tier (0..3).
export function valorChallenge(v: Virtue, tier: number): { needed: number; spent: number } {
  const table = [
    { needed: 2500, spent: 2500 },
    { needed: 5000, spent: 5000 },
    { needed: 10000, spent: 7500 },
    { needed: 20000, spent: 10000 },
  ];
  return table[Math.min(tier, 3)];
}

// Champion ladder: kills per level, advance at 99 percent, spawn cap by tier.
export interface Ladder { level: number; maxLevel: number; kills: number; advanced: boolean; }

export function maxKills(level: number): number {
  if (level >= 16) return 16;
  if (level >= 12) return 32;
  if (level >= 8) return 64;
  if (level >= 4) return 128;
  return 256;
}

export function tierOf(level: number): number {
  return level <= 4 ? 0 : level <= 8 ? 1 : level <= 12 ? 2 : 3;
}

export function spawnCap(level: number): number { return 250 - tierOf(level) * 40; }

// Kill: a kill counts toward the level. Returns 'advance' when the level is reached, 'spawn' at the top.
export function ladderKill(l: Ladder): 'none' | 'advance' | 'spawn' {
  l.kills += 1;
  const p = Math.trunc((l.kills / maxKills(l.level)) * 100);
  if (p < 99) return 'none';
  if (l.level < l.maxLevel) {
    l.level += 1;
    l.kills = 0;
    return 'advance';
  }
  l.kills = 0;
  l.level = 0;
  return 'spawn';
}

// Valor per champion kill: (tier + 1) x 40. Title points: tier + 1.
export function championKillReward(creatureTier: number): { valor: number; titlePoints: number } {
  const sub = creatureTier + 1;
  return { valor: sub * 40, titlePoints: sub };
}

// Faction kill: award is the victim's points over ten (minimum one, cap 40); victims at -6 or below give nothing.
export function factionKillAward(victimPoints: number): number {
  if (victimPoints <= -6) return 0;
  return Math.min(40, Math.max(Math.trunc(victimPoints / 10), 1));
}

// Faction atrophy for an inactive member: ceil(points / 10) for positive points.
export function factionAtrophy(points: number, active: boolean): number {
  if (active || points <= 0) return 0;
  return Math.trunc((points + 9) / 10);
}

// Rank as a per-mille percentile of standing (1000 when alone). Ranks are a descending list of required values.
export function factionRankPermille(rankIndex: number, zeroOffset: number, members: number): number {
  if (members === 1) return 1000;
  if (rankIndex === -1 || zeroOffset <= 0) return 0;
  return Math.trunc(((zeroOffset - rankIndex) * 1000) / zeroOffset);
}

export function factionRank(permille: number, required: number[]): number {
  for (let i = 0; i < required.length; i++) if (permille >= required[i]) return i;
  return required.length - 1;
}

// Sacrifice: on the weekly step, credits reset to the level. Spend one per resurrection; a path gain adds one up to three.
export function sacrificeStep(v: Virtue, sacrificeLevel: number): void {
  v.credits = sacrificeLevel;
}
export function spendCredit(v: Virtue): boolean {
  if (v.credits <= 0) return false;
  v.credits -= 1;
  return true;
}
export function gainSacrificePath(v: Virtue): void {
  if (v.credits < CREDIT_CAP) v.credits += 1;
}

// Summon slot check: followers plus the cost must fit the cap.
export function canSummon(followers: number, cost: number, cap: number): boolean {
  return followers + cost <= cap;
}
