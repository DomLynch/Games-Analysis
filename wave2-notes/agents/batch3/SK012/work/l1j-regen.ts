// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface RegenData {
  thresholdByLevel: number[]; // per level 1..10, before x4 (donor lvlTable)
  rate: number;               // global regen rate (donor RateHpRegen = 2)
  conFloor: number;           // flat heal added on every fire
  idlePoints: number;         // points per 1 s tick when idle (donor 4)
}

interface RegenState { points: number; nextPoints: number; }

// Donor setState: a mid-tick action lowers the points for the NEXT tick only (minimum wins).
function onAction(s: RegenState, actionPoints: number): void {
  if (s.nextPoints < actionPoints) return;
  s.nextPoints = actionPoints;
}

// One 1 s tick. Returns the heal when the accumulator crosses the threshold, else 0.
function regenTick(s: RegenState, d: RegenData, level: number, bonusRoll: number, blocked: boolean): number {
  s.points += s.nextPoints;
  s.nextPoints = d.idlePoints;
  const band = Math.min(level, 10) - 1;
  const need = d.thresholdByLevel[band] * 4;
  if (need > s.points * d.rate) return 0;
  s.points = 0;
  return (blocked ? 0 : bonusRoll) + d.conFloor;
}

interface LevelGrowth { classBase: number; conFrom: number; classCap: number; }

// HP gained on one level-up: CON bonus + class roll (roll is 0 or 1), clamped to the class cap.
function hpGainOnLevelUp(curMaxHp: number, con: number, g: LevelGrowth, roll: number): number {
  const conBonus = con > g.conFrom ? con - g.conFrom : 0;
  let gain = conBonus + g.classBase + roll;
  if (curMaxHp + gain > g.classCap) gain = g.classCap - curMaxHp;
  return gain < 0 ? 0 : gain;
}

export {};
