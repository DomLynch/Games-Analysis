// Licence: AGPL-3.0 (donor, LICENSE line 1). CLEAN-ROOM: written from the described mechanism only; no donor lines copied.
interface Brick {
  id: string;
  sabrinaValue: number;                              // + cost, - credit (donor: Basics.SabrinaCost)
  sapCost: number;                                   // pool cost per brick parameter (donor: CSBrickParamSap)
  hpCost: number;                                    // health cost per brick parameter (donor: CSBrickParamHp)
  skill: string;                                     // skill code the brick's power uses
  spPrice: number;                                   // skill-point price to learn (donor: Basics.SPCost)
  learnSkills: { code: string; value: number }[];    // any one must be reached (donor: LearnRequiresOneOfSkills)
  learnNeeds: string[];                              // bricks that must be known or be in the same phrase
}

interface Phrase { bricks: Brick[]; }

interface SuccessTable {
  chanceByIndex: number[];                           // index = 50 - relativeLevel, 101 entries (donor: _SuccessXpTable)
  crit: number; succ: number; partial: number; fail: number; critFail: number;
}

const MAX_DELTA = 50;                                // donor: MAX_DELTA_LVL, MIN_DELTA_LVL = -50, MIDDLE = 50

function phraseTotals(p: Phrase): { credit: number; cost: number; sap: number; hp: number } {
  let credit = 0, cost = 0, sap = 0, hp = 0;
  for (const b of p.bricks) {
    if (b.sabrinaValue < 0) credit -= b.sabrinaValue; else cost += b.sabrinaValue;
    sap += b.sapCost;
    hp += b.hpCost;
  }
  return { credit, cost, sap, hp };
}

// Donor: deltaLvl = (skill + credit - 2 * cost) / 10 with C integer division (truncates toward zero), then clipped to +-50.
export function relativeLevel(skill: number, p: Phrase): number {
  const t = phraseTotals(p);
  const raw = Math.trunc((skill + t.credit - 2 * t.cost) / 10);
  return Math.max(-MAX_DELTA, Math.min(MAX_DELTA, raw));
}

export function successChance(rel: number, table: SuccessTable): number {
  // Donor: _SuccessXpTable[MIDDLE_DELTA_LVL - relativeLevel]; the clip is applied first.
  return table.chanceByIndex[MAX_DELTA - rel];
}

// Donor getSucessFactor: returns >1 critical success, 1 success, (0,1) partial, 0 fail, <0 critical failure.
export function successFactor(chance: number, roll: number, t: SuccessTable): number {
  if ((t.crit * chance) / (t.crit + t.succ) > roll) return 1.1;
  if (chance > roll) return 1.0;
  const pSChance = Math.trunc((t.partial / (t.partial + t.fail + t.critFail)) * (100 - chance));
  if (pSChance > roll - chance) return (pSChance - roll + chance) / pSChance;
  const failBand = ((t.partial + t.fail) / (t.partial + t.fail + t.critFail)) * (100 - chance);
  if (failBand > roll - chance) return 0;
  return -1;
}

// Donor checks sap and HP before a cast (magic_phrase validate). Dead players cannot cast.
export function canCast(p: Phrase, hp: number, sap: number, dead: boolean): boolean {
  const t = phraseTotals(p);
  return !dead && hp > 0 && hp >= t.hp && sap >= t.sap;
}

// Donor memorize: every brick in the phrase must already be known by the player.
export function bricksKnown(p: Phrase, known: Set<string>): boolean {
  return p.bricks.every((b) => known.has(b.id));
}

// Donor available_phrases (live): a brick is learnable when its skill requirement is at or below the cap,
// the player's MaxLvlReached meets one of its skill requirements, and its prerequisites are known or in the phrase.
export function brickLearnable(b: Brick, maxLvlReached: Record<string, number>, known: Set<string>, inPhrase: Set<string>, skillCap: number): boolean {
  if (b.learnSkills.length > 0) {
    if (!b.learnSkills.some((s) => s.value <= skillCap)) return false;
    if (!b.learnSkills.some((s) => (maxLvlReached[s.code] ?? 0) >= s.value)) return false;
  }
  return b.learnNeeds.every((n) => known.has(n) || inPhrase.has(n));
}

// Donor buyRolemasterPhrase: price is the sum of skill-point prices of bricks not yet known.
export function phraseSpPrice(p: Phrase, known: Set<string>): number {
  return p.bricks.reduce((sum, b) => (known.has(b.id) ? sum : sum + b.spPrice), 0);
}

export {};
