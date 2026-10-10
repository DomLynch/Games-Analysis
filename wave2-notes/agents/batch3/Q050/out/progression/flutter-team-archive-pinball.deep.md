# flutter-team-archive-pinball (progression, cell 3)

Donor: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/bloc/game_bloc.dart` | Licence: MIT (LICENSE: "Copyright (c) 2021 Very Good Ventures"; code may be adapted) | Dart (Flutter, bloc) | symbol `GameBloc._onRoundLost` (with `_onIncreasedMultiplier` and `_onScored`)

Checked: the hint file (`packages/pinball_components/test/src/components/skill_shot/skill_shot_test.dart`) is a test; the skill-shot component (`skill_shot/skill_shot.dart`, `skill_shot/cubit/skill_shot_cubit.dart`) is only a lit/dimmed sprite toggle with no scoring, so it is not the progression mechanism. The donor has no XP, level or skill-point system (grep for experience, xp, level up, skill point across lib and packages: 0 matches). What I read in full: `game_bloc.dart` (74 lines), `game_state.dart` (121 lines), `spaceship_ramp_cubit.dart`, `spaceship_ramp_state.dart`, `ramp_multiplier_behavior.dart`, `ramp_bonus_behavior.dart`, `ramp_progress_behavior.dart`, `ramp_reset_behavior.dart`, `ramp_shot_behavior.dart`, `draining_behavior.dart`, `multipliers_behavior.dart`, `multipliers.dart`, `game_event.dart`; `score_component.dart` 80-105 (Points values); `android_acres.dart` lines 21-25 (grep). Not read: `ScoringBehavior` (how a points award reaches `Scored`), the Flame/bloc provider wiring, and the sparky, dino, google and flutter-forest bonus behaviors. Confidence: high on the multiplier ladder and the bank-on-loss rule as written; medium on whether this counts as "progression" (the donor's progression is a per-run multiplier, not XP or levels), so I wrote STRONG and say so here. Licence read from LICENSE (MIT): adaptation allowed; this sketch is a rewrite from the mechanism, not a copy.

Best transferable idea: keep a run-long multiplier that steps up every fixed number of successful hits up to a cap, add points unmultiplied while the round is live, and multiply the round's points once when the round is lost (then reset the multiplier and the step counter).
Decision (proposed): adapt - the step-every-N ladder with a cap and the single multiply-at-settlement rule fit a fight's award (one ledger write, one multiplication); reject the lamp-count display coupling and the "rounds as lives" count, which do not match our one-character fights.
Acceptance: a server test: 25 landed hits of 5000 raw points with a 10-hit bonus of 1000000 at hits 10 and 20 give a multiplier of x6 at the cap, and the fight-end award is the raw sum times 6 (2125000 x 6 = 12750000), written to the ledger once; a loss resets the multiplier to 1 before the next fight.

## 1. Mechanism

- Points reach the bloc as `Scored` events (how ScoringBehavior sends them was not read). While the game is playing, the round score grows by the points, capped so that the running total never exceeds `_maxScore` (game_bloc.dart 47-55; cap at 19). The multiplier is not applied at this stage: the round score is kept raw (the donor's own comment on the state says so, game_state.dart 58-62).
- Ramp hits (android_acres.dart 21-22): each hit into the spaceship ramp scores 5000 (`Points.fiveThousand`, RampShotBehavior); every tenth hit also scores 1000000 (`Points.oneMillion`, RampBonusBehavior, `hits % 10 == 0`, ramp_bonus_behavior.dart 25).
- The ladder: on every fifth ramp hit (`newState.hits % 5 == 0`, ramp_multiplier_behavior.dart 17) the multiplier steps up by one, sent as a `MultiplierIncreased` event (20, 25); GameBloc raises it by one with a cap of 6 (game_bloc.dart 57-65, cap at 61), and only while playing. `isMaxMultiplier` is multiplier == 6 (game_state.dart 86). So the steps go x1 to x2 at hit 5, x3 at 10, x4 at 15, x5 at 20 and x6 at 25.
- Arrow lamp: a separate light state steps once per ramp hit through six states and wraps (spaceship_ramp_cubit.dart 16). At max multiplier the arrow stays fully lit (ramp_progress_behavior.dart 23-32). This is display; it does not change the score.
- Round loss (the last ball leaves the board: draining_behavior.dart 17-22 sends `RoundLost` when no ball is left): the round score is multiplied once and added to the total, capped (game_bloc.dart 31; total at 38), the round score is cleared (39), the multiplier resets to 1 (40), and the rounds count goes down by one, floored at zero (34, and 41 in the same copy). A change in the rounds count resets the ramp state (ramp_reset_behavior.dart 12, cubit reset at spaceship_ramp_cubit.dart 21).
- Order that matters: points, then the 10-hit bonus, then the multiplier step on the fifth hit. The donor runs these as separate listeners (ramp shot, bonus, progress, multiplier), so the exact order between listeners is not fixed by the code I read.
- Numbers as shipped: 3 rounds at the start (game_state.dart 55), multiplier cap 6, step every 5 ramp hits, bonus every 10 ramp hits, score cap 9999999999 (game_bloc.dart 19).

## 2. Key functions

- `GameBloc._onRoundLost`: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/bloc/game_bloc.dart` 29-45. The bank-on-loss rule.
- `GameBloc._onScored`: game_bloc.dart 47-55. Raw points into the round score, capped; only while playing.
- `GameBloc._onIncreasedMultiplier`: game_bloc.dart 57-65. Step by one, cap 6.
- `RampMultiplierBehavior.listenWhen`: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/components/android_acres/behaviors/ramp_multiplier_behavior.dart` 12-21. Every fifth hit, not at max.
- `RampBonusBehavior.listenWhen`: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/components/android_acres/behaviors/ramp_bonus_behavior.dart` 20-28. Every tenth hit.
- `SpaceshipRampCubit.onAscendingBallEntered` and `onReset`: `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/spaceship_ramp/cubit/spaceship_ramp_cubit.dart` 9 and 21. The hit counter and reset.
- `DrainingBehavior.beginContact`: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/components/drain/behaviors/draining_behavior.dart` 11-23. Round loss when the last ball is removed.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Multiplier steps up by one every N successful hits, capped | N = 5 (theirs, ramp_multiplier_behavior.dart 17); cap 6 (theirs, game_bloc.dart 61) |
| Bonus every M hits (flat points, added to the live round) | M = 10 (theirs, ramp_bonus_behavior.dart 25); 1000000 (theirs, score_component.dart 93, via android_acres.dart 22) |
| Per-hit points | 5000 (theirs, android_acres.dart 21) |
| Live points are raw; multiplier applied once at settlement | Mechanism (game_bloc.dart 31 applies the multiplier only in `_onRoundLost`) |
| Score ceiling on each add and on settlement | 9999999999 (theirs, game_bloc.dart 19) |
| Lives: rounds counted down, game over at zero | 3 rounds (theirs, game_state.dart 55); floored at 0 (game_bloc.dart 34) |

## 4. TypeScript sketch

simplified: the sketch keeps the rules that matter: raw points while live, the 10-hit bonus, the step on every fifth hit up to the cap, and one multiply-and-bank on round loss that also resets the multiplier and the step counter. It omits the playing-status gate (the donor adds and steps only while playing), the lamp and arrow display (ArrowLightState, MultipliersBehavior), the donor's separate listeners (the sketch fixes the order: points, then the bonus, then the step), the ScoringBehavior popups (not read), and the rounds-changed listener (the sketch resets the step counter inside the loss function). The donor's cap applies on every add (game_bloc.dart 49-52); the sketch applies it the same way.

```ts
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
```

## 5. Lands in

- TARGET `src/fight/xp.ts` (the fight award module): a per-fight award multiplier with a step ladder, applied once when the fight ends and written to the one ledger. Parity-checklist row 18 (loot roll and XP award).
- Reuse tag: adapt (MIT: code may be adapted; this sketch is a rewrite from the mechanism)
- Brief rule served: one ledger (the multiplier is applied once at settlement, one ledger write); server-verified hits feed the counter; row 18.

## 6. Gaps and risks

- Topic fit: this is a per-run multiplier, not XP or levels. It fits the award path (row 18) only if Frankendom wants a combo award; it does not give levels or skills.
- Multiply-at-settlement: on the donor, losing a round still banks its points, multiplied. So the loss pays out in this design. Frankendom must decide whether a lost fight pays the multiplied award at all; that is a rule choice, not something the donor settles for us.
- Server-verified hits: the counter must count only hits the server has applied; a client lamp must read the server value and never drive it.
- Rounds as lives (3 rounds, game over at 0) is pinball structure. Our fights are not lives; do not port the rounds count. Keep it out of the award.
- Score cap 9999999999 is a pinball display limit; for the fight award, use the ledger's own cap (not read in Frankendom code here).
- The multiplier steps every fifth hit, so the first step comes after five hits: a fight with fewer hits never gets the multiplier. Frankendom should test whether that matches the intended pacing.
- Not read: `ScoringBehavior` (how an award reaches `Scored`), the provider wiring between the bloc and the components, and whether any other event can raise `MultiplierIncreased`; grep only showed the ramp behavior sends it in the paths I read.

Reuse tag: adapt (MIT: code may be adapted; this sketch is a rewrite from the mechanism)
Brief rule served: one ledger (one multiply at settlement, one write); server-verified hits; row 18 (loot roll and XP award).
