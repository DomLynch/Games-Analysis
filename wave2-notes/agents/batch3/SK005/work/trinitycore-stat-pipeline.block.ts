// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface StatMods { base: number; basePct: number; flat: number; statBonusPct: number; totalPct: number; }

// Stat = (base * basePct) * totalPct + (flat * (1 + statBonusPct)) * totalPct
function statTotal(m: StatMods): number {
  const baseValue = m.base * m.basePct * m.totalPct;
  const totalValue = m.flat * (1 + m.statBonusPct) * m.totalPct;
  return baseValue + totalValue;
}

// Soft cap: x' = c*x / (x + c*k). Half the cap is reached at x = c*k. Flat part added after.
// Guard: a class with cap 0 has no rating path (donor only guards this for parry).
function softCapChance(cap: number, k: number, rating: number, flatPct: number): number {
  if (cap <= 0) return flatPct;
  const dr = rating > 0 ? (cap * rating) / (rating + cap * k) : 0;
  return flatPct + dr;
}

// Health: one tick per 2000 ms of accumulated time. The sub-1 remainder is carried in fraction.
interface HealthState { hp: number; maxHp: number; fraction: number; }
function healthTick(s: HealthState, perTickAmount: number): void {
  const add = perTickAmount + s.fraction;
  const whole = Math.trunc(add);
  s.fraction = add - whole; // stored even when whole is 0 (donor returns first and drops it)
  if (whole === 0) return;
  if (s.hp + whole < s.maxHp) { s.hp += whole; } else { s.hp = s.maxHp; s.fraction = 0; }
}

// Out of combat: 0.015 * maxHp per tick at level 15+, 0.20 * maxHp / level below 15; x1.5 when not standing.
function outOfCombatTick(maxHp: number, level: number, rate: number, standing: boolean): number {
  let amt = level < 15 ? (0.2 * maxHp / level) * rate : 0.015 * maxHp * rate;
  if (!standing) amt *= 1.5;
  return amt;
}

// Power: rate is per second, elapsed is the frame delta in ms (variable step). Fraction carried.
function powerRegen(cur: number, max: number, perSecond: number, elapsedMs: number, fraction: number):
  { value: number; fraction: number } {
  if (cur >= max) return { value: cur, fraction };
  const add = perSecond * 0.001 * elapsedMs + fraction;
  const whole = Math.trunc(add);
  const fits = cur + whole <= max;
  return { value: fits ? cur + whole : max, fraction: fits ? add - whole : 0 };
}
