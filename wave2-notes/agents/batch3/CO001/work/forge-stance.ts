// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface RaceInputs {
  aiLife: number;
  humanLife: number;
  humanNonCombatDamage: number;      // possible non-combat damage the opponent could take this turn
  humanCounterDamage: number;        // damage the opponent's creatures could deal to us next turn
  aiUnblockedDamage: number;         // damage our attackers deal if unblocked
  aiForces: number;                  // our creatures that can attack this turn
  humanForces: number;               // their creatures that could attack next turn
  humanBlockersThatCanBlock: number; // their blockers able to block any of our attackers
  attackers: number;                 // our attackers this turn
  attritionalWin: boolean;           // donor simulates an attrition race; not reproduced here, passed in
  unblockableTurnsToKill: number;    // 0 = no unblockable clock this turn (donor default)
  unblockableOnAttack: boolean;      // donor doUnblockableAttack
}

interface Personality {
  playAggro: boolean;
  chanceToTradePct: number;          // 0..100
}

// Stance 0..5 (the donor also has 6 = exalted, a separate override; omitted here).
// simplified: the donor's random-trade branch also needs creature-count, life, mana and lower-life-pressure gates;
// this sketch keeps only the percentage and the damage ratio. The attrition race and the unblockable clock
// are computed by the caller and passed in.
function stance(r: RaceInputs, p: Personality, roll: () => number): number {
  let aiRatio = r.humanCounterDamage > 0 ? r.aiLife / r.humanCounterDamage : 1_000_000;
  aiRatio -= r.humanBlockersThatCanBlock; // donor: fixed penalty per blocker (a magic number, kept for parity)
  const humanRatio =
    r.aiUnblockedDamage > 0 ? (r.humanLife - r.humanNonCombatDamage) / r.aiUnblockedDamage : 1_000_000;
  const ratioDiff = aiRatio - humanRatio;
  const outNumber = r.aiForces - r.humanForces;
  const trade = roll() * 100 < p.chanceToTradePct;

  if (ratioDiff > 0 && r.attritionalWin) return 5;
  if ((ratioDiff >= 1 && r.attackers > 1 && (humanRatio < 2 || outNumber > 0)) || (p.playAggro && trade && humanRatio > 1)) {
    return 4;
  }
  if (trade && humanRatio > 1) return 4;
  if (ratioDiff >= 0 && r.attackers > 1) return 3;
  if (ratioDiff + outNumber >= -1 || aiRatio > 1 || -ratioDiff < r.unblockableTurnsToKill) return 2;
  if (r.unblockableOnAttack) return 1;
  return 0;
}

// Unblockable clock, donor formula 1 + (life - now) / next. Zero when no unblockable damage now (donor default).
// When the next-turn figure is 0 the donor divides by zero: it gets +/-Infinity in doubles. Made explicit here,
// same values, so the stance-2 path is visible rather than accidental.
function unblockableTurns(lifeAfterNow: number, perTurnNow: number, perTurnNext: number): number {
  if (perTurnNow <= 0) return 0;
  if (perTurnNext <= 0) return lifeAfterNow > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  return 1 + lifeAfterNow / perTurnNext;
}

export {};
