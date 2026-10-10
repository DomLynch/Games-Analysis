// Licence: GPL-3.0 (donor LICENSE). Clean-room sketch of the mechanism only: a threshold aggression rule, then a stealth awareness roll.
interface Mob {
  isNpc: boolean;
  dispositionToPlayer: number; // 0-100; creatures use a fixed 50
  fight: number;               // aggression setting, 0-100 (donor: AiSetting::Fight, modified value)
  isDead: boolean;
  isMobile: boolean;
  calmed: boolean;
  isWerewolf: boolean;
}

interface AggroConsts {
  distanceBase: number;     // donor GMST iFightDistanceBase
  distanceMult: number;     // donor GMST fFightDistanceMultiplier
  dispMult: number;         // donor GMST fFightDispMult
  werewolfMod: number;      // donor GMST iWerewolfFightMod (value not read)
}

// Aggression term: the setting, plus a distance bias that falls with range, plus a disposition bias.
function fightTerm(actor: Mob, distance: number, c: AggroConsts): number {
  const disposition = actor.isNpc ? actor.dispositionToPlayer : 50;
  const distanceBias = c.distanceBase - c.distanceMult * distance;
  const dispositionBias = (50 - disposition) * c.dispMult;
  return actor.fight + Math.trunc(distanceBias + dispositionBias);
}

// Threshold rule: already fighting counts as aggressive; otherwise the term must reach 100.
function isAggressive(actor: Mob, targetIsWerewolf: boolean, inCombatWithTarget: boolean, distance: number, c: AggroConsts): boolean {
  if (inCombatWithTarget) return true;
  if (actor.isDead || !actor.isMobile || actor.calmed) return false;
  let term = fightTerm(actor, distance, c);
  if (actor.isNpc && targetIsWerewolf) term += c.werewolfMod;
  return term >= 100;
}

// Periodic engage timer with jitter (donor: DeviatingPeriodicTimer, period 1.0 s, deviation 0.25 s).
interface EngageTimer { timeLeft: number; }
function tickEngageTimer(t: EngageTimer, dtS: number, deviate: (mean: number, dev: number) => number): boolean {
  if (t.timeLeft > 0) { t.timeLeft -= dtS; return false; }
  t.timeLeft = deviate(1.0, 0.25);
  return true; // elapsed: this actor may now test every other actor
}

// Stealth roll. Non-sneaking actors have sneakTerm 0, so only chameleon and invisibility add to x.
interface Stealth { sneaking: boolean; sneakTerm: number; distTermBase: number; distTermMult: number;
  chameleon: number; invisible: boolean; fatigueTerm: number; }
interface Observer { obsTerm: number; fatigueTerm: number; facingAway: boolean; }

function awarenessPasses(s: Stealth, o: Observer, distance: number, roll0to99: number,
                         noViewMult: number, viewMult: number): boolean {
  const distTerm = s.distTermBase + s.distTermMult * distance;
  let x = (s.sneaking ? s.sneakTerm : 0) * distTerm * s.fatigueTerm + s.chameleon;
  if (s.invisible) x += 100;
  const y = o.obsTerm * o.fatigueTerm * (o.facingAway ? noViewMult : viewMult);
  return roll0to99 >= x - y;
}

export {}
