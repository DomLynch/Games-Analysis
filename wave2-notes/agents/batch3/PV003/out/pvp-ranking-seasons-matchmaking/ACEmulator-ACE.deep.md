# ACEmulator-ACE (pvp-ranking-seasons-matchmaking, cell 1)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Chess/ChessMatch.cs` (AdjustPlayerRanks 719-750, ExpectationToWin 755-760, Finish 326-395) | Licence: AGPL-3.0 (repo LICENSE file, GNU AGPL v3) | C# | symbol `AdjustPlayerRanks`

Checked: Read in full `AdjustPlayerRanks` (719-750) and `ExpectationToWin` (755-760), `Finish` (326-395), `Chess.cs` 15-16, `ChessSide.cs` 20-23, and `AllegianceNode.cs` 69-88. Callers checked with grep over the whole Source tree: `AdjustPlayerRanks` has one caller (`Finish`, line 388); `ExpectationToWin` has one caller (`AdjustPlayerRanks`, line 729). Confidence high on the rating arithmetic and its gating. Not read: the chess AI move code, how `ChessRank` is persisted beyond the property setter, whether `PlayerManager.FindByGuid` can return null (so the null-player path is not confirmed), and the stalemate delay path beyond its `Finish` call. Camera: not applicable.

## 1. Mechanism

- A chess ladder rating (`PropertyInt.ChessRank`, PropertyInt.cs 260) is a standard Elo-style update, run once per finished match.
- Order of steps: (a) `Finish(winner)` only runs while the match is WaitingForPlayers or InProgress (328-329). (b) For each human side, it counts a game when `winner` is not the end-game code -2 (347-354, so a stalemate -1 still counts a game) and a win or loss only when `winner >= 0` (356-375). (c) Rating moves only when `winner >= 0` (381). A stalemate (-1, Chess.cs 15) or an end-game with no winner (-2, Chess.cs 16) therefore leaves both ratings unchanged. (d) The winner guid is `Sides[0]` if `winner == 0`, else `Sides[1]` (384-386), and `AdjustPlayerRanks` is called once (388).
- Inside `AdjustPlayerRanks`: `rank` is the player's stored rating or 1400 (724). The opponent's rating is its stored value; if no opponent object is found, the code takes the chess-AI path and uses 1400 (725-727). Expected score: `chance = 1 / (1 + 10^((opRank - rank) / 400))` (729, 755-759). Score: 1 for the winner, 0 otherwise (731). Delta: `(int)Math.Round(50 x (score - chance))` (714, 732); C# `Math.Round` with no mode rounds half to even. The player is set to `rank + delta` (734). A human opponent is set to `opRank - delta` (736-737), so the change is zero-sum. Online players get a private property update (739-749).
- Worked numbers (derived from the formula, not run): equal ratings 1400 vs 1400 give E = 0.5, so the winner gains 25 and the loser drops 25. A 1600 player beating a 1400 player gains 12; losing to the same player costs 38.
- Second rule, in a different file (`AllegianceNode.cs`, not `ChessMatch.cs`; not the topic's main mechanism, but it is a rank floor): an allegiance patron's rank is `min(10, max(lower + 1, higher))`, where `lower` and `higher` are the two highest vassal ranks (`AllegianceNode.cs` 84-87; the comment at 74-75 gives the rule). A patron is never below the best vassal and is at least one above the lower of the top two.
- Tick: none. The update is event-driven, one call per finished match, synchronous with `Finish`. Not a per-frame loop.

## 2. Key functions

- `AdjustPlayerRanks`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Chess/ChessMatch.cs` 719-750. Reads both ratings, computes the expected score, writes both back.
- `ExpectationToWin`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Chess/ChessMatch.cs` 755-760. The logistic curve on a 400-point scale.
- `Finish`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Chess/ChessMatch.cs` 326-395. Gates rating on `winner >= 0` (381) and calls `AdjustPlayerRanks` (388).
- `ChessSide.IsAi`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Chess/ChessSide.cs` 20-23. Defined, but `AdjustPlayerRanks` does not call it; it infers AI from a failed lookup (726).
- `AllegianceNode.CalculateRank`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/AllegianceNode.cs` 69-88. Second rule (rank floor from subordinates).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Logistic expected score on a 400-point scale, `1/(1+10^((opp-me)/400))` | Scale 400 (theirs, ChessMatch.cs 759) |
| Score minus expected, times K, rounded to an integer | K = 50 (theirs, `RankFactor`, ChessMatch.cs 714) |
| Zero-sum write-back: the opponent gets the negative of the same delta | None (the subtraction, 737) |
| Start rating for a player with no stored rating | 1400 (theirs, ChessMatch.cs 724) |
| Fixed rating for the AI opponent | 1400 (theirs, ChessMatch.cs 726-727) |
| Draw / end-game | Not rated at all (theirs, ChessMatch.cs 381); no 0.5 score |
| Allegiance rank floor from top two subordinates | Cap 10 (theirs, AllegianceNode.cs 87) |

## 4. TypeScript sketch

simplified: keeps the donor order (expected score first, then the integer delta, then the zero-sum write-back). Omits the `Finish` loop, the win/loss/total counters, the online property pushes, the chess board, and the allegiance rule. Changes two donor behaviours on purpose: the AI opponent is an explicit flag, not a failed lookup (donor defect D1, ChessMatch.cs 726); a draw scores 0.5 instead of being skipped (donor gap D2, ChessMatch.cs 381). The null-player case (D3) cannot occur because the input is typed, not looked up.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface RatedSide {
  rating: number; // ladder rating in points; start value comes from ladder data
  isAi: boolean;  // explicit flag; the donor infers AI from a failed player lookup
}

export const AI_RATING = 1400; // donor: fixed opponent rating when the opponent is the AI

// Expected score of a side rated `rating` against `opRating`. Logistic curve, 400-point scale.
export function expectedScore(rating: number, opRating: number): number {
  return 1 / (1 + Math.pow(10, (opRating - rating) / 400));
}

// Donor uses C# Math.Round, which rounds exact halves to the even integer; JS Math.round does not.
export function roundHalfEven(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

// Result is from side A's point of view. Returns the integer delta applied to A; B gets the negative.
export function applyResult(
  a: RatedSide,
  b: RatedSide,
  result: 'win' | 'loss' | 'draw',
  k: number,
): number {
  if (a.isAi) throw new Error('rate the human side as a');
  // A draw scores 0.5. The donor skips rating on a draw entirely.
  const score = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;
  const bRating = b.isAi ? AI_RATING : b.rating;
  const delta = roundHalfEven(k * (score - expectedScore(a.rating, bRating)));
  a.rating += delta;
  if (!b.isAi) b.rating -= delta; // zero-sum: the opponent gives up exactly what A gains
  return delta;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ladder.ts` (new, engine-side rating step). It runs on the server after a duel result is verified, never on a client-reported result. Parity-checklist row 19 (fight record / replay): the rating step consumes the same server fight record. No row covers ladders directly; row 19 is the closest.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, server-verified result); copyleft clean-room; rule 8 satisfied by the row-19 target above.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism, and the donor's code is not translated.
- Defect D1 (fix: explicit `isAi` from the side, as `ChessSide.IsAi` at ChessSide.cs 20-22 already defines, instead of "the lookup failed"): the donor treats any failed opponent lookup as the AI (comment "chess ai", 726-727). A missing human opponent (for example a deleted character) would be rated as the AI at 1400; that case is an inference, not shown by a test. Frankendom must keep bot and human ratings apart in the engine.
- Defect D2 (fix: score a draw at 0.5): draws and end-games never move ratings in the donor (ChessMatch.cs 381). Whether a Frankendom duel can end as a draw (for example a timeout) is not decided in the rulings I was given; if it can, the rating step must have an explicit draw rule rather than skipping it.
- Defect D3 (fix: typed input or a null check): `AdjustPlayerRanks` dereferences `player` at 724 with no null check. Whether `FindByGuid` can return null was not read. Treat as a risk.
- Gap G1 (no floor): nothing clamps the rating (734 and 737 write the raw sum), so a rating can go below 0. Frankendom should add `min_rating` as a ladder data field.
- Gap G2 (no provisional K, no decay): K is 50 for every player (714). No inactivity decay was seen in the code read. Frankendom needs a provisional K for new characters as data, and a decay rule only if a season wants one.
- Gap G3 (AI anchor): the AI is a fixed 1400 (726-727). A player who farms only the AI is pulled toward 1400 by the formula (derived, not simulated). Frankendom should keep training-bot duels off the ladder.
- Gap G4 (1v1 only): `Finish` pairs `Sides[0]` with `Sides[1]` (384-385). MAX_ATTACKERS = 3 means many-on-one fights have no team rating; Frankendom needs a separate rule for those, not this one.
- Ruling check: one character and one ledger. The rating write must go through the same ledger as XP and career rows, not a separate store.

## Data fields (sidecar)

See `ACEmulator-ACE.json`. Data fields: K = 50 (ladder data), start rating = 1400 (ladder data), scale = 400 (engine constant), AI anchor = 1400 (ladder data), draw score unrated in donor (engine constant), rating floor absent in donor (new field).

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine, server-verified result); copyleft clean-room.

Best transferable idea: a zero-sum Elo step on the server, K and start rating as ladder data, run once per verified duel result, with the bot and draw cases decided explicitly.
Decision (proposed): adapt - take the Elo shape, change the bot test to an explicit flag and score draws at 0.5, because our duels are 1v1 and we need one number per result that is easy to test.
Acceptance: a server test asserts that two humans at 1400 give A 1425 and B 1375 after A wins, that a draw gives 1400 and 1400, and that for every human-vs-human match the two rating changes sum to zero; and `roundHalfEven(12.5) == 12`, `roundHalfEven(13.5) == 14`, `roundHalfEven(-12.5) == -12`.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: 1) Mechanism says 'Second rule in the same file' for the allegiance rank floor; it is in AllegianceNode.cs (not ChessMatch.cs). The rule itself is correct (AllegianceNode.cs 81-87, min(10, max(lower+1, higher))). 2) Step (b) says 'for each human side, it counts a game and a win or loss (347-375)'; real: total games is counted when winner != ChessWinnerEndGame (-2) at 347-354, so a stalemate (-1) counts a game but not a win/loss, wins/losses only when winner >= 0 (356-375). Not a rating issue. 3) D1 text 'a missing human opponent (deleted character) is silently treated as the AI' is the reader's inference from the null check at 726-727; code comment only says 'chess ai'; flagged as risk, fine. Verified OK: RankFactor 50 at 714; AdjustPlayerRanks 719-750; rank default 1400 (724), AI opRank 1400 (725-727); chance 755-760 with /400; delta (int)Math.Round(50*(win-chance)) 732; zero-sum 734/737; Finish gate 328-329, winner>=0 at 381, winner guid 384-388; constants -1/-2 Chess.cs 15-16; IsAi ChessSide.cs 20-23; single callers; PropertyInt.ChessRank = 181 at line 260; AGPL v3 LICENSE. Worked numbers right (E=0.5 -> +/-25; 1600 vs 1400: +12 / -38). Acceptance test is consistent with the sketch.
Missed: Rounding: donor uses C# Math.Round (banker's rounding, half to even); sketch uses JS Math.round (half up, and -0.5 -> -0). Differs only on exact .5 deltas; not covered by the Acceptance cases but a ladder test with k=50 can hit .5 (e.g. expectations that give 12.5).

Fixed 2026-10-12 (Sonnet fixer): game-count rule corrected (347-375, verified); allegiance rule marked as a different file; D1 softened to the verified comment plus an explicit inference flag; sketch now rounds half to even like C# Math.Round (added roundHalfEven, acceptance extended) and typechecked. Also found: none beyond the rounding.
