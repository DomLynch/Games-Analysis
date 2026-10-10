// Licence: GPL-2 or the Angband licence, at the user's choice (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Grade upper bounds, in wound points (donor data: player_timed.txt 257-263).
const GRADE_MAX = [10, 25, 50, 100, 200, 1000, 10000];
// Bleed per world step by grade: Graze..Nasty 1, Severe 2, Deep Gash and Mortal Wound 3 (game-world.c 527-533).
const GRADE_TICK_DAMAGE = [1, 1, 1, 1, 2, 3, 3];
const MORTAL = GRADE_MAX.length - 1;

function gradeOf(points: number): number {
  let g = 0;
  while (g < MORTAL && points > GRADE_MAX[g]) g++; // simplified: clamped at Mortal Wound
  return g;
}

interface Fighter {
  hp: number;
  wound: number;      // wound points (donor TMD_CUT value)
  conAdjust: number;  // decay per step = 1 + CON fix value
  rock: boolean;      // immune to bleed and decay (donor PF_ROCK branch)
}

// Critical tier of one landed blow. maxRoll = the blow's largest possible damage.
function critTier(maxRoll: number, damage: number, rand100: () => number): number {
  if (damage < Math.floor((maxRoll * 19) / 20)) return 0;   // must reach 95% of max
  if (damage < 20 && rand100() >= damage) return 0;         // small hits rarely count
  let extra = damage === maxRoll ? 1 : 0;                   // perfect roll
  if (damage >= 20) while (rand100() < 2) extra++;          // 2% per extra tier
  if (damage > 45) return 6 + extra;
  if (damage > 33) return 5 + extra;
  if (damage > 25) return 4 + extra;
  if (damage > 18) return 3 + extra;
  if (damage > 11) return 2 + extra;
  return 1 + extra;
}

// Wound points added for a tier. rand(n) returns 1..n. Creature data in Frankendom.
function tierPoints(tier: number, rand: (n: number) => number): number {
  switch (tier) {
    case 0: return 0;
    case 1: return rand(5);
    case 2: return rand(5) + 5;
    case 3: return rand(20) + 20;
    case 4: return rand(50) + 50;
    case 5: return rand(100) + 100;
    case 6: return 300;
    default: return 500;
  }
}

// Called once per landed blow of a blow method that carries a cut flag.
function onBlowLanded(
  f: Fighter, cutFlag: boolean, maxRoll: number, damage: number,
  rand100: () => number, rand: (n: number) => number,
): void {
  if (!cutFlag) return;
  f.wound += tierPoints(critTier(maxRoll, damage, rand100), rand);
}

// One world step (donor: every 10 game turns). Bleed first, then decay, as in process_world.
function woundStep(f: Fighter): number {
  if (f.wound <= 0) return 0;
  const g = gradeOf(f.wound);
  const dmg = f.rock ? 0 : GRADE_TICK_DAMAGE[g];
  f.hp -= dmg;
  if (!f.rock && g !== MORTAL) f.wound = Math.max(0, f.wound - f.conAdjust);
  return dmg;
}

// Natural regeneration is switched off while any wound is open.
function regenPercent(f: Fighter, basePercent: number): number {
  return f.wound > 0 ? 0 : basePercent;
}


export {};
