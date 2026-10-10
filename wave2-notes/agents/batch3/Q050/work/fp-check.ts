// Licence: MIT (donor, Very Good Ventures 2021). Code may be adapted; this sketch is a rewrite from the mechanism, not a copy.

const MAX_MULTIPLIER = 6;
const HITS_PER_STEP = 5;      // multiplier steps on every fifth ramp hit
const BONUS_EVERY_HITS = 10;  // bonus on every tenth ramp hit
const BONUS_POINTS = 1000000;
const SCORE_CAP = 9999999999;

interface Run {
  roundScore: number;   // points this round, raw (not multiplied yet)
  totalScore: number;   // banked points from finished rounds
  multiplier: number;   // 1..MAX_MULTIPLIER
  rounds: number;       // rounds left; game over at 0
  hits: number;         // ramp hits this round; resets with the round
}

function addPoints(r: Run, points: number): void {
  r.roundScore = Math.min(r.roundScore + points, SCORE_CAP - r.totalScore);
}

// One landed ramp hit: points, then the bonus on every tenth hit, then the multiplier step on every fifth.
function rampHit(r: Run, hitPoints: number): void {
  r.hits += 1;
  addPoints(r, hitPoints);
  if (r.hits % BONUS_EVERY_HITS === 0) addPoints(r, BONUS_POINTS);
  if (r.hits % HITS_PER_STEP === 0 && r.multiplier < MAX_MULTIPLIER) r.multiplier += 1;
}

// Round lost: the round's raw points are multiplied once and banked; the multiplier and the hit counter reset.
function loseRound(r: Run): void {
  r.totalScore = Math.min(r.totalScore + r.roundScore * r.multiplier, SCORE_CAP);
  r.roundScore = 0;
  r.multiplier = 1;
  r.hits = 0;
  r.rounds = Math.max(r.rounds - 1, 0);
}

// Example: 25 hits of 5000 with the two 1000000 bonuses (hits 10 and 20) reach x6; the loss banks the round at x6.
const run: Run = { roundScore: 0, totalScore: 0, multiplier: 1, rounds: 3, hits: 0 };
for (let i = 0; i < 25; i++) rampHit(run, 5000);
loseRound(run); // 2125000 x 6 = 12750000 banked

export {};
