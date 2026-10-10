// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const MAX_LEVEL = 99;
export const STORED_CAP = 2_000_000_000; // 200 million XP in stored tenths

// thresholds[i] = stored XP (XP times ten) needed for level i + 2.
export function buildThresholds(): number[] {
  const out: number[] = [];
  let acc = 0;
  for (let level = 1; level <= MAX_LEVEL; level++) {
    acc += Math.floor(level + Math.pow(2, level / 7) * 300);
    out.push(Math.floor(acc / 4) * 10);
  }
  return out;
}

const THRESHOLDS = buildThresholds();

export function levelFromStored(stored: number): number {
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (stored >= THRESHOLDS[i]) return Math.min(i + 2, MAX_LEVEL);
  }
  return 1;
}

export interface SkillState {
  stored: number;  // the one stored number: XP times ten, a 32-bit integer
  base: number;    // level derived from stored
  current: number; // level after boosts or drains; tracks base while untouched
}

export interface AwardResult extends SkillState {
  leveledBy: number;
}

// amountTenths is in stored units (script awards are tenths: 50 means 5 XP).
// Donor order: scale by the rate (if allowed), store into an Int32 (truncates), cap, capture the old base,
// let current track the base only when it is untouched, recompute base, then replenish a drained
// current by the number of levels gained (never reset it to base).
export function addXp(s: SkillState, amountTenths: number, xpRate: number, allowRate: boolean): AwardResult {
  if (amountTenths < 0) throw new Error('negative xp');
  if (amountTenths === 0) return { ...s, leveledBy: 0 };

  const multi = allowRate ? xpRate : 1;
  let stored = (s.stored + amountTenths * multi) | 0; // Int32Array store: truncates toward zero, wraps past 2^31
  if (stored > STORED_CAP) stored = STORED_CAP;

  const before = s.base;
  let current = s.current;
  if (s.current === s.base) current = levelFromStored(stored);

  const base = levelFromStored(stored);
  const leveledBy = Math.max(0, base - before);
  if (leveledBy > 0 && current < before) current += leveledBy;

  return { stored, base, current, leveledBy };
}

// Combat level from base levels (donor weights; ranged and magic use floor(x / 2) + x, not att + str).
export function combatLevel(l: { att: number; str: number; def: number; hp: number; pray: number; rng: number; mag: number }): number {
  const base = 0.25 * (l.def + l.hp + Math.floor(l.pray / 2));
  const melee = 0.325 * (l.att + l.str);
  const range = 0.325 * (Math.floor(l.rng / 2) + l.rng);
  const magic = 0.325 * (Math.floor(l.mag / 2) + l.mag);
  return Math.floor(base + Math.max(melee, range, magic));
}

export {};
