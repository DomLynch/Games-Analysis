// Licence: GPL-2.0-or-later (freeciv ai/default/daiunit.c header: "either version 2, or (at your option) any later version"; COPYING: Version 2). Clean-room shape written from the mechanism; not a line-by-line translation.
const SHIELD_WEIGHTING = 17;   // donor weight: score per turn of delay, and the scale of kill desire
const MORT = 24;               // donor interest constant: discount per turn is 1 - 1/MORT
const MAX_TURNS = 10;          // donor cutoff: a target more than 10 turns away scores 0

interface Me {
  power: number;               // attack rating (squared inside the score, as in the donor)
  cost: number;                // what we risk losing (donor bcost)
  buildRate: number;           // production per turn, used for the build-time delay
  fuzzy: number;               // per-mille chance a decision is flipped (donor ai_common.fuzzy)
}

interface Foe {
  defense: number;             // defence rating (squared inside the score)
  prize: number;               // attractiveness of the target (donor benefit)
  turns: number;               // turns needed to reach it
}

// Expected trade for one attacker against one victim, scaled by a saturating denominator.
function killDesire(benefit: number, attack: number, loss: number, vuln: number, victims: number): number {
  const den = attack + vuln * victims;
  if (den <= 0) return 0;
  return ((benefit * attack - loss * vuln) * victims * SHIELD_WEIGHTING) / den;
}

function amortize(value: number, delay: number): number {
  return value * Math.pow(1 - 1 / MORT, delay);
}

function wantFor(me: Me, foe: Foe): number {
  if (foe.turns > MAX_TURNS) return 0;
  let want = killDesire(foe.prize, me.power * me.power, me.cost, foe.defense * foe.defense, 1);
  want -= foe.turns * SHIELD_WEIGHTING;                    // time penalty per turn of travel
  if (want <= 0) return 0;                                 // donor military_amortize returns 0 for value <= 0
  const buildTurns = Math.trunc(me.cost / Math.max(1, me.buildRate));
  return amortize(want, Math.max(1, foe.turns) + buildTurns);
}

// Donor ai_fuzzy(TRUE): accepted unless the roll falls under the fuzzy per-mille value.
function fuzzyAccept(fuzzy: number, rand: () => number): boolean {
  return rand() * 1000 >= fuzzy;
}

// Pick the best foe. Each candidate is only taken when it beats the best so far and passes the fuzzy roll.
function pickTarget(me: Me, foes: Foe[], rand: () => number): { foe: Foe | null; want: number } {
  if (me.power <= 0) return { foe: null, want: 0 };        // donor: no attacking power, no target
  let best = 0;
  let bestFoe: Foe | null = null;
  for (const f of foes) {
    const w = wantFor(me, f);
    if (w > best && fuzzyAccept(me.fuzzy, rand)) {
      best = w;
      bestFoe = f;
    }
  }
  return { foe: bestFoe, want: best };
}

export {};
