// Licence: GNU GPL v2 or later (donor, src/fheroes2/ai/ai_battle.cpp header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Unit {
  id: number;
  damage: number;          // expected damage it deals to a given defender (donor: getPotentialDamage, not read)
  hp: number;
  speed: number;           // cells per turn
  flying: boolean;
  archer: boolean;
  immovable: boolean;
  doubleAttack: boolean;
  ability: 'none' | 'enemyHalving' | 'soulEater' | 'hpDrain';
}

// Threat: what this unit can do to a defender. Distance scales it down when the unit must walk (not flying or archer).
// Retaliation is supplied by the caller (donor: EstimateRetaliatoryDamage, with tower and archer exceptions).
function threat(a: Unit, boardDist: number, retaliation: number): number {
  let t = a.damage;
  if (!(a.flying || a.archer)) {
    const range = a.speed + 1;
    if (boardDist > range) t /= (1.5 * boardDist) / a.speed;
  }
  if (a.doubleAttack) {
    if (retaliation > 0) t += t * (1 - Math.min(retaliation / a.hp, 1)); // the second blow is worth less when it draws a counter
    else t *= 2;
  }
  if (a.ability === 'enemyHalving') t *= 2;
  if (a.ability === 'soulEater') t *= 3;
  if (a.ability === 'hpDrain') t *= 1.3;
  return t;
}

// One way to attack an enemy: from a cell, with the value of the cell and of the attack.
interface Outcome { cell: number; attackValue: number; positionValue: number; canAttackNow: boolean; }

// Donor IsOutcomeImproved: attackable now beats not; then position value; then attack value on a tie.
function improved(n: Outcome, prev: Outcome | undefined): boolean {
  if (prev === undefined) return true;
  if (n.canAttackNow && !prev.canAttackNow) return true;
  if (n.canAttackNow !== prev.canAttackNow) return false;
  return prev.positionValue < n.positionValue || (prev.attackValue < n.attackValue && Math.abs(prev.positionValue - n.positionValue) < 0.001);
}

// Step 1: among enemies that can be attacked this turn, attack the one with the best outcome.
// attackValue = the enemy's threat to us, so the most dangerous reachable enemy is hit first.
function bestInReach(enemies: { unit: Unit; outcomes: Outcome[] }[]): { unit: Unit; cell: number } | undefined {
  let best: { unit: Unit; cell: number } | undefined;
  let bestOutcome: Outcome | undefined;
  for (const e of enemies) {
    let pick: Outcome | undefined;
    for (const o of e.outcomes) if (improved(o, pick)) pick = o;
    if (!pick || !pick.canAttackNow) continue;
    if (improved(pick, bestOutcome)) {
      bestOutcome = pick;
      best = { unit: e.unit, cell: pick.cell };
    }
  }
  return best;
}

// Who can not evade a melee engagement: archers, immovable units, and slower walkers. Flyers can evade.
function cannotEvade(me: Unit, e: Unit): boolean {
  if (e.archer) return true;
  if (e.immovable) return true;
  if (e.flying) return false;
  return e.speed < me.speed;
}

// Step 2: nobody in reach. Walk toward the enemy with the highest threat per step to reach it.
// Pass one only counts enemies that cannot evade; pass two counts everyone.
function distantTarget(me: Unit, enemies: { unit: Unit; stepsToReach: number | undefined; boardDist: number; retaliation: number }[]): Unit | undefined {
  const pick = (filter: (u: Unit) => boolean): Unit | undefined => {
    let best: Unit | undefined;
    let maxPriority = Number.NEGATIVE_INFINITY;
    for (const e of enemies) {
      if (e.stepsToReach === undefined || !filter(e.unit)) continue;
      const priority = threat(e.unit, e.boardDist, e.retaliation) / e.stepsToReach;
      if (priority < maxPriority) continue;
      maxPriority = priority;
      best = e.unit;
    }
    return best;
  };
  return pick((u) => cannotEvade(me, u)) ?? pick(() => true);
}

export {};
