// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Stat point cost to raise a stat from `low` to the next point. Renewal rises steeply from 100; pre-renewal does not.
function statPointCost(low: number, renewal: boolean): number {
  if (renewal) return low < 100 ? 2 + Math.trunc((low - 1) / 10) : 16 + 4 * Math.trunc((low - 100) / 5);
  return 1 + Math.trunc((low + 9) / 10);
}

// Points to move a stat from `from` to `to` (to > from). Sums the cost of each single point.
function pointsToRaise(from: number, to: number, renewal: boolean): number {
  let sp = 0;
  for (let low = from; low < to; low++) sp += statPointCost(low, renewal);
  return sp;
}

// Luck is a delta: only luck above the base value adds crit (renewal 3 per point, pre-renewal 10/3).
function critFromLuck(baseCrit: number, luk: number, baseLuk: number, renewal: boolean): number {
  const delta = luk - baseLuk;
  const crit = renewal ? baseCrit + 3 * delta : baseCrit + Math.trunc(delta * 10 / 3);
  return Math.max(10, crit);
}

// Renewal hit and flee from level and stats (PC branch). Pre-renewal is level + dex and level + agi.
function hitRenewal(level: number, dex: number, luk: number, con: number, bonusHit: number): number {
  return Math.min(32767, Math.max(1, bonusHit + level + dex + Math.trunc(luk / 3) + 175 + 2 * con));
}
function fleeRenewal(level: number, agi: number, luk: number, con: number, bonusFlee: number): number {
  return Math.min(32767, Math.max(1, bonusFlee + level + agi + Math.trunc(luk / 5) + 100 + 2 * con));
}

// Max HP: job base x (1 + vit/100), then upper class x1.25, then flat equipment VIT points.
function maxHpPc(baseHp: number, vit: number, upperClass: boolean, equipVit: number): number {
  let d = baseHp;
  if (vit > 0) d *= 1 + vit * 0.01;
  if (upperClass) d *= 1.25;
  d += equipVit;
  return Math.max(1, Math.trunc(d));
}

// Pre-renewal attack motion: base delay, cut by (4*agi + dex) / 1000 with integer division, plus raw bonus.
function amotionPre(baseDelay: number, agi: number, dex: number, aspdAdd: number): number {
  let amotion = baseDelay;
  amotion -= Math.trunc(amotion * (4 * agi + dex) / 1000);
  return amotion + aspdAdd;
}
