# lichess-org-mobile (progression, cell 10)

Donor: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/model/learn/learn_score.dart` | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Dart | symbol `learnLevelBonus`

Checked: Read in full: `learn_score.dart` (scoring and rank), `learn_progress.dart` (best-score store, next level, resume, percent), `learn_stage_controller.dart` (completion hand-off). Read lines 36-50 and 118-255 of `learn_level_state.dart` (per-move scoring and completion). Not read: the rest of `learn_level_state.dart`, `learn_stages.dart` (stage content), the UI screens, and `ui/learn/src/score.ts` on lichess.org (the donor says it mirrors it; not on the donor). Confidence high on the score path; the file uses a non-standard primary-constructor syntax, read as written. camera_scope: n/a. Torn between STRONG and PARTIAL: STRONG, because the par-tier bonus and the rank thresholds are self-contained and checkable.

Best transferable idea: grade each finished encounter into 1-3 stars from a par-based bonus (at or under par = top tier, a small overrun = middle tier), and save only a strictly better best score per encounter.
Decision (proposed): adapt - take the par-tier bonus and the best-only save, but the score must come from the engine's fight record and XP/loot must read the rank; chess points, apples and the client-side score are rejected.
Acceptance: after a fight the result shows 1-3 stars from the engine record, a server test asserts a fight at or under par gets the top bonus, a fight 1 move over par gets the middle bonus, and a worse repeat never lowers the saved best.

## 1. Mechanism

- Per-move scoring (client, `playerMove` in `learn_level_state.dart`), in this order:
  (a) If the move leaves the mover's own king attacked, the move returns at 132-140 marked failed; no points are added.
  (b) Otherwise points: +50 for taking an apple (158); for a capture (when no apple was taken on that move, the level scores captures, and the captured piece is not a king) +piece value on piece-value levels, else +50 (163); +50 for each scenario step matched (189).
  (c) If a capture or a failed assert fires, the level is marked failed and cannot complete.
  (d) If not failed, the success predicate runs (242-243; with no predicate, success = no apples left). On success the stored level score is `newScore + learnLevelBonus(level, newNbMoves)` (247).
- Time/move bonus (`learnLevelBonus`): `late = moves - par`. `late <= 0` gives 500; `late <= max(1, par/8)` gives 300; otherwise 100 (learn_score.dart 22-25).
- Completion hand-off: `onUserMove` calls `_onLevelCompleted` when the state is completed (controller 79-80); that calls `saveScore` with the level score (142).
- Save: the storage row is written only when the new score is higher than the stored one (learn_progress.dart 113); the in-memory copy has the same guard (70). A retry or next-level rebuilds the state at score 0 (controller 118), so a bad attempt never lowers a saved best.
- Ranks for the stars: a level is rank 1 at or above its max, rank 2 within 200 points below, else rank 3 (learn_score.dart 33-40). A stage is rank 1 at or above the sum of its level maxima, rank 2 within `max(200, levels*150)` below (42-50).
- Progress meter: `percent` adds 10 / 8 / 5 points for each started stage by stage rank (1 / 2 / other), divides by `stages*10`, and rounds (55-65). `nextLevelIndex` is the first level with score 0 (36-37); `resumeStage` is offered only while the percent is between 0 and 100 (47).

## 2. Key functions

- `learnLevelBonus`: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/model/learn/learn_score.dart` 21-26 (par tiers 500/300/100).
- `_levelMaxScore` and `learnLevelRank`: learn_score.dart 28-40 (max = apples x 50 + captures x 50 when captures score, plus the top bonus; rank thresholds).
- `learnStageRank`: learn_score.dart 42-50.
- `LearnProgress.percent`, `nextLevelIndex`, `resumeStage`, `withScore`: learn_progress.dart 19-75 (read in full).
- `LearnProgressStorage.saveScore`: learn_progress.dart 100-120 (transaction, guard at 113).
- `LearnStageController._onLevelCompleted`: learn_stage_controller.dart 140-147.
- `LearnLevelState.playerMove`: learn_level_state.dart 124-255 (scoring path read; the rest of the file not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Par-based tier bonus: at or under par = top tier; overrun within max(1, par/8) = middle; more = low | Tier values 500 / 300 / 100 (theirs, learn_score.dart 18); slack divisor 8 and floor 1 (learn_score.dart 24) |
| Rank by distance below max: 1 = at max, 2 = within a slack, 3 = rest | Level slack 200 (learn_score.dart 37); stage slack `max(200, levels*150)` (learn_score.dart 47) |
| Only strictly better scores are saved | None (the guard at learn_progress.dart 113) |
| Meter: started items earn a tiered share, normalised | Stage points 10 / 8 / 5 (learn_progress.dart 60-62; the value lines are under 15 characters, so the receipt is the switch line 59); denominator 10 per stage (65) |
| Points per action, summed into the level score | Apple 50, capture 50 or piece value (learn_score.dart 11-13; learn_level_state.dart 158, 163); scenario step 50 (189); piece values 90 / 50 / 30 / 30 / 10 / 0 (learn_score.dart, learnPieceValue, not receipted) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order of the rank, bonus, best-save and meter rules and the donor's level-max formula. It omits the chess move scoring (apples, captures, scenario steps, check), the piece-value table, the storage transaction, the in-memory copy, and the Dart types. It uses one fixed capture figure in the max, as the donor's `_levelMaxScore` does, although piece-value levels score piece values (see section 6). The typecheck passed on the VPS (`tsc --strict`); the file was removed from the VPS /tmp afterwards.

```ts
// clean-room: shape of the rule only, written from the described mechanism, not a translation.
type Rank = 1 | 2 | 3; // 1 = best (three stars)

const TIER_BONUS = [500, 300, 100] as const; // top, middle, low time/move bonus

interface LevelSpec {
  par: number;        // moves the level is designed for
  appleAndCapturePoints: number; // apples*50 + captures*50 when captures score
}

// Maximum level score: fixed as the donor does (apples and captures at a flat value, plus the top bonus).
function levelMax(spec: LevelSpec): number {
  return spec.appleAndCapturePoints + TIER_BONUS[0];
}

// Time/move bonus on completion only: at or under par is top, within max(1, par/8) over par is middle.
function moveBonus(spec: LevelSpec, moves: number): number {
  const late = moves - spec.par;
  if (late <= 0) return TIER_BONUS[0];
  if (late <= Math.max(1, spec.par / 8)) return TIER_BONUS[1];
  return TIER_BONUS[2];
}

function levelRank(spec: LevelSpec, score: number): Rank {
  const max = levelMax(spec);
  return score >= max ? 1 : score >= max - 200 ? 2 : 3;
}

// Stage rank: the slack scales with the number of levels, with a floor of 200.
function stageRank(levels: LevelSpec[], scores: number[]): Rank {
  const max = levels.reduce((sum, l) => sum + levelMax(l), 0);
  const total = scores.reduce((a, b) => a + b, 0);
  const slack = Math.max(200, levels.length * 150);
  return total >= max ? 1 : total >= max - slack ? 2 : 3;
}

// Best-score ledger: a write happens only when the new score is strictly higher.
function saveBest(ledger: Map<string, number>, key: string, score: number): boolean {
  const prev = ledger.get(key) ?? -1;
  if (prev >= score) return false;
  ledger.set(key, score);
  return true;
}

// Stage percent: each started stage earns 10 / 8 / 5 points by rank, out of 10 per stage.
function percent(stages: { started: boolean; rank: Rank }[]): number {
  const points: Record<Rank, number> = { 1: 10, 2: 8, 3: 5 };
  let total = 0;
  for (const s of stages) if (s.started) total += points[s.rank];
  return Math.round((total / (stages.length * 10)) * 100);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/encounter-rank.ts` (new): the engine computes the par tier and the rank from the fight record at the end of a fight, then the XP/loot award reads that rank. Stars are never sent by the client.
- Parity-checklist row 18 (loot roll and XP award); the rank feeds XP, not the duel step.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, the rank is computed on the server from the record, not on the client); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and the formulas were not copied line by line.
- The donor computes the score in the client UI state (`learn_level_state.dart`), not on a server. Frankendom's server-verified rule means the par-tier inputs (moves, time, hits) must come from the engine's fight record. Do not accept a client-sent rank.
- Max-score mismatch (donor gap): `_levelMaxScore` uses a flat 50 per capture, but `playerMove` awards piece values (up to 90) on piece-value levels, so a rank-1 threshold on those levels does not match what can be earned. Frankendom should derive the max from the same award function that scores the fight.
- Par is per level. In Frankendom it must be zone or encounter data (zones as data), not an engine constant. The donor's tier values and slack (500/300/100, /8, floor 1) are rules to keep as engine constants.
- The meter counts a started stage as 5 points (half a stage), so the first encounter moves the bar a lot. A designer should choose the same on purpose.
- Retry resets the in-fight score to 0 (controller 118). That fits one ledger only if the fight attempt is recorded separately from the best (the donor keeps only the best).
- Not read: the donor's UI for stars (`learn_stage_screen.dart` uses `learnLevelRank`) and the lichess.org score file. Piece values table and `learnStages` content not read.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine; server-verified rank); rules 7-9 n/a
