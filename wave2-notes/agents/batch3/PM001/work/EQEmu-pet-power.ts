// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Pet power: a summoned companion takes a tier row, then stat scaling and a capped level bonus.
interface TierRow { petpower: number; npcId: string; }
interface BaseStats { level: number; maxHp: number; ac: number; minDmg: number; maxDmg: number; size: number; }

// Highest tier whose threshold is at or below the power. Power <= 0 is treated as 0.
function pickTier(rows: TierRow[], power: number): TierRow | undefined {
  const p = Math.max(0, power);
  let best: TierRow | undefined;
  for (const r of rows) {
    if (r.petpower <= p && (best === undefined || r.petpower > best.petpower)) best = r;
  }
  return best;
}

// One level per 25 power, never more than the cap (fixed: the donor compares against level + cap).
function levelBonus(power: number, cap: number): number {
  return Math.min(1 + Math.floor(power / 25), cap);
}

// Stat scaling on the base NPC, only when power > 0. Scale = power / 100.
function scalePet(base: BaseStats, power: number, cap: number): BaseStats {
  if (power <= 0) return { ...base };
  const s = power / 100;
  return {
    level: base.level + levelBonus(power, cap),
    maxHp: base.maxHp * (1 + s),
    ac: base.ac * (1 + s),
    minDmg: base.minDmg * (1 + s / 2),
    maxDmg: base.maxDmg * (1 + s / 2),
    size: Math.min(base.size * (1 + s / 2), base.size * 3),
  };
}

const rows: TierRow[] = [{ petpower: 0, npcId: "a" }, { petpower: 100, npcId: "b" }];
const pick = pickTier(rows, 150);
const scaled = scalePet({ level: 1, maxHp: 100, ac: 20, minDmg: 4, maxDmg: 8, size: 1 }, 250, 10);
console.log(pick?.npcId, scaled.level, levelBonus(250, 10));
export {};
