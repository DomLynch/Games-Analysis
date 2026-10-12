// Licence: AGPL-3.0 (donor). clean-room, shape only.
// clean-room
interface SuccessWeights {
  criticalSuccess: number;
  success: number;
  partialSuccess: number;
  failure: number;
  criticalFailure: number;
}

// One roll (0..99) -> a factor. Bands in order: critical success (above 1), success (1), partial (falls from 1 to 0), failure (0), critical failure (-1).
function successFactor(chances: number, roll: number, w: SuccessWeights): number {
  const critCut = (w.criticalSuccess * chances) / (w.criticalSuccess + w.success);
  if (critCut > roll) return 1.1;
  if (chances > roll) return 1.0;
  const total = w.partialSuccess + w.failure + w.criticalFailure;
  const partialWidth = Math.floor((w.partialSuccess / total) * (100 - chances));
  const d = roll - chances;
  if (partialWidth > d) return (partialWidth - d) / partialWidth;
  const failWidth = ((w.partialSuccess + w.failure) / total) * (100 - chances);
  if (failWidth > d) return 0;
  return -1;
}

interface Sustain { perSecDmg: number; upkeep: number; power: number; }
interface Caster { energy: number; skill: number; debuff: number; }

// simplified: one sustain tick, in donor order (upkeep, skill cap, roll, factor, damage). Changes from the donor:
// (1) the target's defence is used (the donor's MagicDefense check is commented out); (2) the crit factor is capped by an explicit critCap (donor caps at 1.0); (3) the factor is applied once per tick (donor also applies it when the link is created); (4) the tick is driven by the caller at a fixed step (donor's driver is commented out).
function tickSustain(
  s: Sustain,
  c: Caster,
  targetDefence: number,
  chancesOf: (levelDelta: number) => number,
  roll: number,
  critCap: number,
  tickS: number,
  w: SuccessWeights,
): { end: boolean; damage: number } {
  if (c.energy <= s.upkeep) return { end: true, damage: 0 };    // donor: energy at or below the upkeep ends the link
  c.energy -= s.upkeep;
  const skill = Math.min(c.skill - c.debuff, s.power);            // donor: debuff first, then the brick power caps the value
  const levelDelta = Math.trunc((skill - targetDefence) / 10);    // fixed: target defence used; donor divides by 10 as well
  const f = successFactor(chancesOf(levelDelta), roll, w);
  if (f <= 0) return { end: true, damage: 0 };                    // donor: any factor <= 0 ends the link
  const factor = Math.min(f, critCap);
  return { end: false, damage: Math.trunc(s.perSecDmg * tickS * factor) };
}

export {};
