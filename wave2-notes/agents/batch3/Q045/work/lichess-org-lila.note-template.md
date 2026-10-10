# lichess-org-lila (progression, cell 1)

Donor: `/mnt/frankendom-donors/lichess-org-lila/modules/rating/src/main/Glicko.scala` | Licence: AGPL-3.0 (LICENSE file, first line "GNU AFFERO GENERAL PUBLIC LICENSE", Version 3) | Scala | symbol `GlickoExt` / `PerfExt.addOrReset` / `RatingRegulator`

Checked: Read in full: `Glicko.scala` (1-116), `RatingRegulator.scala` (1-45), `PerfsUpdater.scala` (1-112), `Perf.scala` (1-86; the BSON tail after 86 not read), `PuzzleFinisher.scala` (25-140), `RatingRange.scala` (1-38), `Gaussian.scala` (1-35), `RankingApi.scala` (28-36, the save gate), `LICENSE` header. Not read: the Glicko-2 maths itself (`chess.rating.glicko`, the scalachess library, not in this donor: `GlickoCalculator.computeGame`, `previewDeviation`, `Glicko.average`, `intRating`); the farming and boost detectors (`FarmBoostDetection`); the `RatingRange` min and max bounds; the UI that shows the interval. Candidates opened: 8 files. Confidence: high on the order of operations and on every constant (each has a receipt); medium that the whole system is Glicko-2 as named in code, since the maths is outside the donor. Depth is thin for that reason. camera_scope: n/a.

Best transferable idea: Clamp each settled result to a fixed step from the pre-game rating, reset to a default on an impossible result, and show a rating interval of rating plus or minus two deviations.
Decision (proposed): adapt - take the per-result clamp, the reset-on-insane rule, the bot halving and the interval, but change the ladder so only the server writes ratings, and keep the Glicko-2 core out until a rating maths is chosen (its maths was not read here).
Acceptance: A server test asserts that one verified duel moves a player's ladder rating by at most 700 from its pre-duel value, that an out-of-range result stores rating 1500 with deviation 500, and that a win against an AI-flagged opponent moves the rating by half the unhalved gain.

## 1. Mechanism

- Entry point: `PerfsUpdater.save` runs only for a rated, finished game with at least 2 plies or a tournament (`PerfsUpdater.scala` 22), and skips when the farm or boost detectors fire (24-26; detectors not read) or when a user is `lame` (39).
- Step A, rate: both players are passed in as their pre-game Glicko, capped first (`Perf.scala` 49), and a Glicko-2 update runs with `skipDeviationIncrease = true` (`PerfsUpdater.scala` 63). The update itself is in the library (not read).
- Step B, regulate (`RatingRegulator.apply`, 18-29): for each side, a rating gain (not a loss) is scaled by `extra = diff * (factor - 1)` (`RatingRegulator.scala` 39-44). Factors: rapid 1.015, classical 1.010, blitz 1.005, bullet 1.010, ultraBullet 1.013, atomic 1.02, antichess 1.02 (9-15); any other mode is factor 1 and passes through.
- Step C, bot halving (`RatingRegulator.scala` 25-28): a human side whose opponent is a bot gets `glicko.average(before)` applied to the regulated value. What `average` computes is not read (the sketch assumes a midpoint).
- Step D, per-game clamp and sanity (`Perf.addOrReset`, `Perf.scala` 16-34): the new rating is clamped to within 700 of the stored rating (19-20). If the clamped result fails `sanityCheck`, the code logs "Crazy Glicko2", increments a counter, and stores the default 1500 / 500 / 0.09 (30-34). Note this still counts the game (`nb + 1`, via `append`).
- Step E, cap (`append` 22-29; `cap` in `Glicko.scala` 33-38): rating floored at 400, deviation held in 45..500, volatility at most 0.1.
- Step F, recent list (`Perf.scala` 43-45): the newest rating is pushed only once the pre-game game count is at least 10, and the list keeps 12 entries (63).
- Step G, standard aggregate (`PerfsUpdater.updateStandard`, 88-106): the "standard" perf is the game-count-weighted mean of the non-provisional bullet, blitz, rapid, classical and correspondence perfs (91-98), and its date is the newest sub's date.
- Step H, write: the per-side rating difference is the new integer rating minus the old (52-53). It is saved as three parallel writes (game rating diffs, user perfs, ranking row; 68-77).
- Deviation is not a stored truth: on read and on write it is replaced by a live preview, `liveDeviation`, clamped to 45..500 (`Perf.scala` 76, 80; `Glicko.scala` 88-90). The growth formula is in the library (not read). The donor comment says the period constant was chosen so a typical deviation goes from 60 to 110 in one year (`Glicko.scala` 71-72); this is the donor's claim, not checked.
- Interval and listing: `intervalMin` and `intervalMax` are rating minus and plus two deviations (`Glicko.scala` 15-17). A perf is listed on the leaderboard only if the user is rankable, the perf has at least 2 games, and the perf type is leaderboardable (`RankingApi.scala` 32). Rankable means deviation at or under 75 for standard and 65 for variants (`Glicko.scala` 21-23, 47-48).
- Matchmaking window: `RatingRange.defaultFor` takes a Gaussian(1500, 350) (`RatingRange.scala` 18), and `Gaussian.range` (`Gaussian.scala` 28-33) finds the rating interval that holds the central 20% of probability mass around the player (width 0.2, split ±0.1 around the player's own CDF value, 21 and 31). The clamp to the min and max bounds is not read.
- Puzzles reuse the same shape: a puzzle solve is treated as a game against the puzzle's own rating (`PuzzleFinisher.scala` 87-97), and the puzzle rating is clamped by the same 700 (118-119).
- Tick: none. This is per settled game, not a per-frame loop.

## 2. Key functions

- `PerfsUpdater.calculateRatingAndPerfs`: `/mnt/frankendom-donors/lichess-org-lila/modules/round/src/main/PerfsUpdater.scala` 31-56. The order: rate, regulate, add or reset per side, rating diff.
- `RatingRegulator.apply` and `regulate`: `/mnt/frankendom-donors/lichess-org-lila/modules/rating/src/main/RatingRegulator.scala` 18-29 and 38-45. Gain damping, then bot halving.
- `PerfExt.addOrReset`: `/mnt/frankendom-donors/lichess-org-lila/modules/rating/src/main/Perf.scala` 16-34. The per-game clamp, sanity check, cap, and reset.
- `GlickoExt.sanityCheck` and `cap`: `/mnt/frankendom-donors/lichess-org-lila/modules/rating/src/main/Glicko.scala` 25-38.
- `Glicko.liveDeviation`: `/mnt/frankendom-donors/lichess-org-lila/modules/rating/src/main/Glicko.scala` 88-90.
- `PerfsUpdater.updateStandard`: `/mnt/frankendom-donors/lichess-org-lila/modules/round/src/main/PerfsUpdater.scala` 88-106.
- `RatingRange.defaultFor` and `Gaussian.range`: `/mnt/frankendom-donors/lichess-org-lila/modules/rating/src/main/RatingRange.scala` 20-24 and `Gaussian.scala` 28-33.

Callers: a grep of `modules/` finds exactly two callers of `addOrReset`: `PerfsUpdater.addToPerfs` (`PerfsUpdater.scala` 79-86, the call at 83) and the puzzle path (`PuzzleFinisher.scala` 134-135). Both were read. The rated-game caller is the one that matters for ratings.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Clamp each result to a fixed step from the pre-game rating | 700 per game (theirs, `Glicko.scala` 69) |
| Reset to a default on an impossible result, but still count the game | Default 1500 / 500 / 0.09 (theirs, `Glicko.scala` 55, 53); insane means rating outside (0, 4000), deviation outside (0, 1000), or volatility outside (0, 0.2) (`Glicko.scala` 26-31) |
| Floor and ceiling on the stored values | Rating floor 400 (`Glicko.scala` 43), deviation 45..500 (46, 49), volatility at most 0.1 (52) |
| Scale only the gain, by a per-mode factor | rapid 1.015, classical 1.010, blitz 1.005, bullet 1.010, ultraBullet 1.013, atomic 1.02, antichess 1.02 (`RatingRegulator.scala` 9-15) |
| Halve a gain against a bot opponent (midpoint with the pre-game value) | Halving is a rule, not a number; applies to the human side only (26-27) |
| Rating interval of plus or minus two deviations | 2 (`Glicko.scala` 15-17) |
| Listing gate by deviation | 75 standard, 65 variant (47-48); at least 2 games (`RankingApi.scala` 32) |
| Recent ratings after a warm-up | Warm-up 10 games (`Perf.scala` 44), list length 12 (63) |
| Deviation previewed by time, not stored | Period constant 0.21436 per day (`Glicko.scala` 72), comment on a 60 to 110 year (71) |
| Matchmaking window as a probability band | Gaussian(1500, 350) (`RatingRange.scala` 18), width 0.2 (21) |

Donor quirk: the sanity check uses a literal 4000 (`Glicko.scala` 27) while `Glicko.maxRating` (44) is used only for form number limits (`package.scala` 12). Two sources for the same bound.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: rate (passed in), regulate the gain, then bot halving, then per side the clamp to plus or minus 700, sanity check, cap, and reset-to-default on insane. It takes the Glicko-2 update as an input (`RateGame`), because that maths is not in this donor. It omits the metrics and logs, the farm and boost gates, the lame-user gate, the `latest` date bookkeeping, the live deviation preview on read and write, the `user.rankable` check, the refund path, and the matchmaking window. The halving average is written as a plain midpoint of old and new (the library `average` was not read). The recent entry is rounded with `Math.round` (the library `intRating` was not read). The standard aggregate takes provisional as a flag per mode (the donor's provisional check is not read).

```ts
@@CODE@@
```

## 5. Lands in

- TARGET `src/fight/ladder.ts` (new module: per-duel rating, leaderboard gate). Parity-checklist row 18 (loot roll and XP award). It is the nearest row: no row 1-23 covers a rating ladder, so this is a gap to flag to Lead, not a row I invented. The server tick sub-line does not apply here.
- The rating write must sit with the XP and loot writes in the one ledger, after a server-verified duel result.
- Reuse tag: rewrite-from-idea (AGPL-3.0, copyleft: clean-room, shape only; the sketch was written from the described pipeline).
- Brief rule served: 1 (one engine, ratings written server-side); rules 7-9 n/a. Clean-room because of the copyleft licence.

## 6. Gaps and risks

- AGPL-3.0: clean-room, shape only. Nothing here is a line-by-line translation.
- The Glicko-2 core is outside this donor, so the sketch takes it as an input. Frankendom must pick its own rating maths (or a permissive library) before any number from it is trusted. Do not claim the donor's update maths.
- Ratings are a one-on-one construct. Many-on-one fights (MAX_ATTACKERS = 3) have no rating shape here; a duel rating must be set from a server-verified duel, not from client-reported kills.
- One ledger: the donor keeps rating, games played, recent list and standard aggregate in one perf document per user and mode, but the save is three parallel writes (game rating diffs, user perfs, ranking row: `PerfsUpdater.scala` 73-77), not one transaction. A failure can leave them out of step. Frankendom must write them in one ledger transaction.
- Bot halving: the donor halves against bot accounts. Frankendom's AI creatures are not accounts, so the rule must be re-decided: a win over a creature is either halved or not, and that is a design call, not a transfer.
- The gain factors are per mode. Frankendom has one duel mode, so the factor sits at 1 until a second mode exists; if it is used, it is zone data.
- Deviation inflation over time needs a fixed server clock and a period constant; the constant's claim (60 to 110 in a year) is the donor's comment, not checked.
- The 4000 bound appears twice in the donor (literal in sanity, `Glicko.maxRating` for forms). Do not copy the duplication; take one constant.
- The puzzle-as-opponent trick (a solve treated as a game against the puzzle's rating, `PuzzleFinisher.scala` 87-97) may suit scaling creature difficulty, but that is an idea to test, not a mechanism I verified in combat.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine, server-side ratings); rules 7-9 n/a
