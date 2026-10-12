// Licence: MIT (donor, LICENSE: Copyright (c) 2023-2026 Lost City). Re-expressed from the mechanism; not a line-by-line translation.
type Ladder = { base: number; current: number };

const CAP = 255;

// Shared rounding for every op: the donor uses "| 0", which truncates toward zero.
function delta(constant: number, percentOf: number, percent: number): number {
  return (constant + (percentOf * percent) / 100) | 0;
}

// Blessing shape: raises current toward base + d. Never lowers a stat, never above CAP.
function boost(l: Ladder, constant: number, percent: number): void {
  const d = delta(constant, l.base, percent);
  const boosted = Math.max(Math.min(l.current + d, l.base + d), l.current);
  l.current = Math.min(boosted, CAP);
}

// Heal: raises current up to base. Never lowers a boosted stat.
function heal(l: Ladder, constant: number, percent: number): void {
  const healed = l.current + delta(constant, l.base, percent);
  l.current = Math.max(Math.min(healed, l.base), l.current);
}

// Curse by base: lowers current by constant + base x percent. Floor 0.
function sub(l: Ladder, constant: number, percent: number): void {
  l.current = Math.max(l.current - delta(constant, l.base, percent), 0);
}

// Curse by current: lowers current by constant + current x percent. Floor 0.
function drain(l: Ladder, constant: number, percent: number): void {
  l.current = Math.max(l.current - delta(constant, l.current, percent), 0);
}

// Add: raises current by constant + base x percent. No base cap, capped at CAP.
function add(l: Ladder, constant: number, percent: number): void {
  l.current = Math.min(l.current + delta(constant, l.base, percent), CAP);
}

// Decay: every regenInterval ticks, every stat moves one step toward its base.
// fix: the donor starts regenInterval at 0, so its first tick regens at once. Create the clock with interval = regenrate.
interface RegenClock { clock: number; interval: number; regenrate: number }

function regenTick(c: RegenClock, ladders: Ladder[]): void {
  if (++c.clock >= c.interval) {
    c.interval = c.regenrate;   // reloaded on every regen, as the donor does
    c.clock = 0;
    for (const l of ladders) {
      if (l.current < l.base) l.current++;
      else if (l.current > l.base) l.current--;
    }
  }
}

export {};
