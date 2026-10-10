// Licence: GPL-3.0 (donor, ModernUO LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Skill { base: number; cap: number; factor: number; lockUp: boolean; lockDown: boolean; } // base and cap in tenths of a point
interface Ledger { skills: Skill[]; totalCap: number; }        // one budget shared by all skills of one character

const total = (l: Ledger): number => l.skills.reduce((sum, k) => sum + k.base, 0);

// Gain chance for one try: budget room and skill room averaged, plus a bonus for hard tries, then scaled.
export function gainChance(l: Ledger, s: Skill, chance: number, success: boolean): number {
  let gc = (l.totalCap - total(l)) / l.totalCap;
  gc += (s.cap - s.base) / s.cap;
  gc /= 2;
  gc += (1 - chance) * (success ? 0.5 : 0.2);
  gc /= 2;
  gc *= s.factor;
  return Math.max(gc, 0.01);
}

// One step of gain. A player at the budget cap pays for it by lowering one lock-down skill.
export function applyGain(l: Ledger, s: Skill, rnd: () => number, isPlayer: boolean): void {
  if (s.base >= s.cap || !s.lockUp) return;
  const step = s.base <= 100 ? 1 + Math.floor(rnd() * 4) : 1; // 1 to 4 tenths below 10.0, else 1 tenth
  if (isPlayer && total(l) / l.totalCap >= rnd()) {
    const donor = l.skills.find(k => k !== s && k.lockDown && k.base >= step);
    if (donor) donor.base = Math.max(donor.base - step, 0);
  }
  if (!isPlayer || total(l) < l.totalCap) s.base = Math.min(s.base + step, s.cap);
}

// One use of a skill. Below min: fail, no roll. At or above max: success, no gain roll.
export function useSkill(l: Ledger, s: Skill, min: number, max: number, rnd: () => number, isPlayer: boolean): boolean {
  const value = s.base / 10;
  if (value < min) return false;
  if (value >= max || min >= max) return true;
  const chance = (value - min) / (max - min);
  const success = chance >= rnd();
  if (s.base < 100) applyGain(l, s, rnd, isPlayer);                  // below 10.0 always gains
  else if (gainChance(l, s, chance, success) >= rnd()) applyGain(l, s, rnd, isPlayer);
  return success;
}

// Stat side (not called above): one stat per cooldown, and the chance to trade a point away near the stat cap.
export function canStatGain(lastMs: number, nowMs: number, delayMs: number): boolean {
  return !(lastMs + delayMs >= nowMs);
}
export function statAtrophyChance(rawTotal: number, statCap: number, rnd: () => number): boolean {
  return rawTotal / statCap >= rnd();
}
export {};
