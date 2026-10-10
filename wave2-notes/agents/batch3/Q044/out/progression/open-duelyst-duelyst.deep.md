# open-duelyst-duelyst (progression, cell 10)

Donor: `/mnt/frankendom-donors/open-duelyst-duelyst/server/lib/data_access/rift.coffee` | Licence: CC0 1.0 Universal (LICENSE and COPYING both read: "Creative Commons Legal Code CC0 1.0 Universal"; not in the MIT/Apache/BSD list, recorded as permissive because CC0 carries no conditions) | CoffeeScript | symbol `updateRiftRunWithGameOutcome`

Checked: The hint file `app/view/layers/postgame/RiftProgressLayer.js` is the reward screen: it reads `rift_points` and calls `levelForPoints` for display only (lines 1-80 read; `levelForPoints` again at 256-257 and 304 by grep). The rule is in three files. (a) `app/sdk/rift/riftHelper.coffee`, read in full (43 lines): level table, step, progress. (b) `server/lib/data_access/rift.coffee`: constants 36-64 (read), `updateRiftRunWithGameOutcome` 487-582 (points, upgrades, rating; read), `_getRiftRatingDeltaForGameRiftRatings` 862-884 (read). Not read: rift.coffee 583-620 (the save and Firebase writes; grep only), the new-run branch, matchmaking, upgrade spending. (c) `worker/jobs/update-user-post-game.coffee` 74-86 (the caller that turns damage into the number the rule uses; read). Checked also against `test/integration/data_access/rift.js` 581-606 (rating values; read). Callers: only the worker (`update-user-post-game.coffee` 85) and the integration test; grep found no other caller of `progressTowardsNextLevel`. Confidence: high on points, upgrades and the rating delta (the test values agree with the code); medium on the zero-damage winner case (read in the worker, not run). Hand-checked, not executed: the level thresholds 10, 30, 60, 100, 150 (levels 2 to 6) and the progress-helper result below. Camera: n/a.
Best transferable idea: Per-fight progression from server-side totals: credit damage up to a cap, add a flat win bonus, turn total points into levels with a triangular table, and grant one upgrade for each level crossed.
Decision (proposed): adapt - take the capped damage credit, the win bonus and the one-upgrade-per-level-crossed rule as the per-fight XP award on the server, with the cap and bonus as encounter data; keep the triangular level table as an engine constant; defer the rating delta (it fits a ranked ladder, not zones) and do not copy the zero-damage quirk without a decision.
Acceptance: A server test: a winning duel with 40 damage to the opponent credits 35 points (25 plus 10); a losing duel with 40 damage credits 25; a player at 25 points (level 2) who wins with 5 damage is credited 25 by the worker floor, moves to 60 points (level 4), and gains 2 upgrades.

## 1. Mechanism

- Trigger: the worker runs `update-user-post-game` once per player per finished rift game. It reads the player's `totalDamageDealtToGeneral` (`worker/jobs/update-user-post-game.coffee` 77-84). If damage is above zero, a winner with less than 25 is credited 25 (79-82); otherwise damage is passed as is. Zero damage passes 0, so a winner with no damage is not lifted to 25 (79 is the gate).
- `updateRiftRunWithGameOutcome(userId, ticketId, isWinner, gameId, isDraw, damageDealt, gameSessionData)` (`rift.coffee` 487) runs in a transaction on the user row and the run row (505-530 read). For an existing run:
  - points: `riftPointsEarned = Math.min(damageDealt, 25) || 0` (540); plus 10 if the player won (541-542).
  - level before and after: `RiftHelper.levelForPoints` on the points before and after (544-545). `upgradesEarned = after - before` when the level rises (546-547). `rift_level` and `upgrades_available_count` both rise (548-553, read).
  - points are added to the run total (554).
  - rating: `riftRatingDelta = 0` for a draw (565). Otherwise the helper is called with the winner's and the loser's run rating (570-571); the loser gets the negative (572-573); the winner gets at least `RIFT_MIN_RATING_DELTA` (576-577). Then `riftRatingAfter = before + delta` (580).
- `RiftHelper.levelForPoints(points)` (`riftHelper.coffee` 6-15): level 1 until 10 points; each next level needs 10 more than the last step (10, 20, 30, ...). The thresholds are 10, 30, 60, 100, 150 for levels 2 to 6 (hand-checked from the loop).
- Rating delta `_getRiftRatingDeltaForGameRiftRatings(winner, loser)` (`rift.coffee` 862-884): the gap `winner - loser` is clamped to 100..500, then `alpha = 1 - (gap - 100) / 400` (so 1 at a gap of 100 or less, 0 at 500 or more). `delta = floor(10 + (30 - 10) * alpha)`. If `loser - delta < 0`, the delta becomes the loser's whole rating, so the loser cannot go below 0.

## 2. Key functions

- `updateRiftRunWithGameOutcome`: `/mnt/frankendom-donors/open-duelyst-duelyst/server/lib/data_access/rift.coffee` 487-582 (read). Points, level crossing, upgrades, rating delta.
- `_getRiftRatingDeltaForGameRiftRatings`: same file, 862-884 (read). The band, the alpha and the 10 to 30 delta.
- `levelForPoints`, `pointsRequiredForLevel`, `totalPointsForLevel`, `progressTowardsNextLevel`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/rift/riftHelper.coffee` 6-33 (read in full).
- The damage credit: `/mnt/frankendom-donors/open-duelyst-duelyst/worker/jobs/update-user-post-game.coffee` 77-85 (read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-fight points from damage, capped, plus a flat win bonus | Cap 25 (`rift.coffee` 540); win bonus 10 (542); winner floor of 25 credit when 0 < damage < 25 (`worker` 81-82) |
| Level from a running total with a triangular table (each level costs 10 more than the last) | Level 2 at 10 points (`riftHelper.coffee` 7), step `i * 10` (13); levels 2 to 6 at 10, 30, 60, 100, 150 (hand-checked) |
| One upgrade for each level crossed in one fight | `upgradesEarned = after - before` (`rift.coffee` 547) |
| Elo-like rating step scaled by the gap between the two players, with a band | Default rating 400 (`rift.coffee` 39); max delta 30 (45); min delta 10 (51); gap band 100 to 500 (57, 63); test values: winner 200 vs loser 1000 gives 30, winner 1050 vs 1000 gives 30, winner 2000 vs 1000 gives 10, winner 1300 vs 1000 gives 20 (`test/integration/data_access/rift.js` 583-603) |
| Loser cannot go below zero | `loserRiftRating - ratingDelta < 0` (`rift.coffee` 880-881) |

## 4. TypeScript sketch

simplified: the sketch covers the per-fight points (with the worker's 25 floor and the cap), the win bonus, the level table, the level crossing, the rating step with the loser's zero floor, and the winner's minimum gain. It keeps the donor's order: damage floor, cap, win bonus, then level crossing. It omits: the transaction and the run row, the draw case, the rating for a draw, the save and the Firebase writes, `RiftHelper.progressTowardsNextLevel` (the donor's denominator is wrong, see section 6), the `|| 0` for a missing damage value (handled as 0), and the `rift_level` update. The donor loops to i = 1000; the sketch does the same.

```ts
// Licence: CC0 1.0 (donor LICENSE and COPYING). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// Level for a total of points. Level 2 needs 10 points; each next level needs 10 more than the last step (10, 20, 30...).
export function levelForPoints(points: number): number {
  let level = 1;
  let required = 10;
  for (let i = 2; i <= 1000; i++) {
    if (points < required) return level;
    required += i * 10;
    level = i;
  }
  return level;
}

// Points for one game: damage counted up to 25, plus 10 for a win. A winner with some damage is credited 25 first.
export function gamePoints(damage: number, won: boolean): number {
  let dealt = 0;
  if (damage > 0) dealt = won && damage < 25 ? 25 : damage;
  return Math.min(dealt, 25) + (won ? 10 : 0);
}

// Upgrades earned: one for each level crossed by this game's points.
export function upgradesEarned(pointsBefore: number, earned: number): number {
  return levelForPoints(pointsBefore + earned) - levelForPoints(pointsBefore);
}

// Rating change for the winner. The gap is clamped to 100..500; a small gap gives 30, a large gap gives 10.
export function ratingDelta(winner: number, loser: number): number {
  const band = 500 - 100;
  const alpha = 1 - (clamp(winner - loser, 100, 500) - 100) / band;
  let delta = Math.floor(10 + (30 - 10) * alpha);
  if (loser - delta < 0) delta = loser;   // the loser cannot go below zero
  return delta;
}

// The winner always gains at least 10, even when the loser is near zero.
export function winnerGain(winner: number, loser: number): number {
  return Math.max(ratingDelta(winner, loser), 10);
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/q044-progression-run-points.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/xp.ts` (new module, proposed): the per-fight award computed on the server from the fight record's damage totals. Parity-checklist row 18 (loot roll and XP award), which this note is the XP-award analogue of. Server tick and intake are not involved.
- Encounter data: the damage cap (25) and win bonus (10) are per encounter or zone data, so a boss and a trash fight can differ.
- Reuse tag: rewrite-from-idea (CC0; clean-room, shape only)
- Brief rule served: 18 (XP award on the server, one ledger); server-verified (the damage totals come from the server's fight record, never the client)

## 6. Gaps and risks

- CC0 is a dedication, so the code could be copied, but this note keeps to the shape. Nothing here is copied line for line.
- The zero-damage case: the worker gives the 25 floor only when damage is above zero (`update-user-post-game.coffee` 79). A winner with no damage gets 10 points, not 35. This may be intended or an oversight; decide before porting, and test both.
- The donor's `progressTowardsNextLevel` (`riftHelper.coffee` 30-33) divides by `pointsRequiredForLevel(currentLevel)`, which is the step into the current level, not the step out of it. By hand: 25 points is level 2, the progress is (25 - 10) / 10 = 1.5, and the correct value is 15 / 20 = 0.75. The function has no caller in this repo, so the bug is latent. Do not port it as written.
- The rating delta (10 to 30 by gap) is a ranked-ladder idea. Frankendom's duels are not a ladder yet, and the rating would be a second ledger. Defer it.
- The per-fight cap means damage above 25 adds no points. That protects against a farm that deals huge damage, but a single hit of 40 gets the same credit as 25; the designer should choose the cap per encounter.
- Not read: the save path (rift.coffee 583-640), the new-run branch, matchmaking and upgrade spending. Any claim about them is "not read".
