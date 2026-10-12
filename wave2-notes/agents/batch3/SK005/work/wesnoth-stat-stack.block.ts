// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Mod {
  source: string;   // named source id: one source's best add/mul/div wins, different sources stack
  priority: number; // groups apply in ascending priority; each group sees the previous result
  add?: number;     // integer points
  sub?: number;     // integer points, magnitude
  mul?: number;     // percent, 100 = x1.0
  div?: number;     // percent, 100 = x1.0
  max?: number;     // cap contributed by this source
  min?: number;     // floor contributed by this source
}

function roundHalfAway(x: number): number { return Math.sign(x) * Math.round(Math.abs(x)); }

// Damage: base x bonus / divisor, rounded toward base at the tie, never below 1 for a non-zero base.
function roundDamage(base: number, bonus: number, divisor: number): number {
  if (base === 0) return 0;
  const rounding = Math.floor(divisor / 2) - (bonus <= divisor || divisor === 1 ? 0 : 1);
  return Math.max(1, Math.trunc(Math.trunc(base * bonus + rounding) / divisor));
}

function applyGroup(def: number, group: Mod[]): number {
  const best = new Map<string, { add: number; sub: number; mul: number; div: number }>();
  let maxCap: number | undefined;
  let minCap: number | undefined;
  for (const m of group) {
    const b = best.get(m.source) ?? { add: 0, sub: 0, mul: 100, div: 100 };
    b.add = Math.max(b.add, m.add ?? 0);
    b.sub = Math.max(b.sub, m.sub ?? 0);
    if (m.mul !== undefined) b.mul = Math.max(b.mul, m.mul);
    if (m.div !== undefined) b.div = Math.max(b.div, m.div);
    best.set(m.source, b);
    if (m.max !== undefined) maxCap = maxCap === undefined ? m.max : Math.min(maxCap, m.max);
    if (m.min !== undefined) minCap = minCap === undefined ? m.min : Math.max(minCap, m.min);
  }
  let addition = 0, subtraction = 0, multiplier = 1, divisor = 1;
  for (const b of best.values()) {
    addition += b.add; subtraction += b.sub;
    multiplier *= b.mul / 100; divisor *= b.div / 100;
  }
  let v = (def + addition - subtraction) * multiplier / divisor;
  // Clamp: both caps only when min < max (donor branch); the sketch passes value first.
  if (maxCap !== undefined && minCap !== undefined && minCap < maxCap) v = Math.min(maxCap, Math.max(minCap, v));
  else if (maxCap !== undefined && minCap === undefined) v = Math.min(maxCap, v);
  else if (minCap !== undefined && maxCap === undefined) v = Math.max(minCap, v);
  return roundHalfAway(v);
}

function composeStat(base: number, mods: Mod[]): number {
  const priorities = [...new Set(mods.map(m => m.priority))].sort((a, b) => a - b);
  let value = base;
  for (const p of priorities) value = applyGroup(value, mods.filter(m => m.priority === p));
  return value;
}
