# lichess-org-mobile (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/model/analysis/forecast.dart` | Licence: GPL-3.0-or-later (COPYING.md: "either version 3 of the License, or (at your option) any later version") | Dart (Flutter) | symbol `Forecast` (class, `_collides` 29, `_truncate` 49, `isCandidate` 57, `add` 67, `playMove` 88); the live-game premove gate is `_applyBoardUpdate` (game_body.dart 301) and `tryExecutePremove` (widgets/board.dart 88)

Checked: The hint file `view/game/game_screen.dart` is the screen shell (GameScreen, title variants, game menu); I grepped it (class list, build at 108) and did not read it end to end. The mechanisms are elsewhere. Read in full: `lib/src/model/analysis/forecast.dart` (115 lines). Read the relevant ranges of `lib/src/model/common/uci.dart` (UciPath helpers 95-135), `lib/src/model/analysis/analysis_controller.dart` (addCurrentPathAsPremove 557, playPendingMoveAndSaveForecast 571, _syncForecast 605), `lib/src/model/game/game_controller.dart` (userMove 250-262, move event 745-770, _sendMoveToSocket 580-600, shouldConfirmMove 1218), `lib/src/view/game/game_body.dart` (255-372: the board-update gate and the premove call), `lib/src/widgets/board.dart` (88-102). Not read: `game_repository.dart` saveForecast body (only the signature at 158 and the POST at 166 seen by grep), `conditional_premoves.dart` UI, the server (not in the donor), and the dartchess package (`position.isLegal` is called but its body is not in the donor). Also checked the truncation defect (section 6) by a hand transliteration of the two Dart lines, run in node on the VPS; that is a replica, not the Dart code. Confidence: high on the forecast model and the consumption rule; high on the live premove gate; medium on how the server stores lines. camera_scope: not a camera cell.

## 1. Mechanism

- A forecast is a set of planned lines. Each line is a list of moves from the current position, and the first move belongs to whoever is to move in the stored view (`onMyTurn`). Lines are kept newest first.
- Adding a line (`add`, forecast.dart 67-77): the candidate is the path from the live move, cut by `_truncate` (49-54) to at most 30 plies (`kMaxForecastPlies`, line 14). The donor's `_truncate` first fixes the parity (the line must end on the viewer's own move: an odd length when it is the viewer's turn, an even length otherwise), then cuts to 30 (defect, section 6). The candidate is rejected when it is shorter than 1 ply on the viewer's turn or 2 plies otherwise (`_isLongEnough`, 44-46), or when a saved line already starts with it (`isCandidate`, 57-64). Otherwise every saved line that the candidate extends or that collides with it is removed (line 74), and the candidate is inserted at the front (75).
- Collision (`_collides`, 29-42): compare the two lines from index 0. At the first index where they differ, the lines collide when: on the viewer's turn, the index is not 0 and is even (33); on the opponent's turn, the index is odd (35). If one line is a prefix of the other, they do not collide (41). Reading: a branch the viewer decides (their own move) cannot be kept in two versions, while a branch the opponent decides can be kept on both sides, because the viewer can answer either.
- Playing a move (`playMove`, 88-96): every line whose first move equals the played move keeps its tail (90-91); lines that become empty are dropped (92); the turn flips (94). The game side does the same on every incoming move event (game_controller.dart 756-759): the lines whose head matches keep their tail, and the lines whose head does not match are dropped, so a move that matches no line's head clears the forecast.
- Live premove (one slot), in `_applyBoardUpdate` (game_body.dart 301 onward): a revert (`newPly < _lastPly`, line 321) clears the queued premove (338) instead of playing it. A forward change is a move added to the game; the code then plays the queued premove only when it is now the viewer's turn (358), through `tryExecutePremove` (359). That function (widgets/board.dart 88-102) clears the premove, then checks legality at apply time (91); a legal pawn premove that promotes opens a promotion prompt (93-94); a legal premove is sent from a microtask (96-97); an illegal one is cleared silently (101).
- A premove is sent with zero think time (game_controller.dart 582-584, `isPremove == true` gives `Duration.zero`).
- Confirm mode (a setting): a normal move is held in `moveToConfirm` (253-254); a premove skips the hold (`isPremove != true`, 253).
- HUD: the bottom bar shows the number of correspondence forecast lines as a badge (game_body.dart 697 and 805).

## 2. Key functions

- `Forecast._collides`: `lib/src/model/analysis/forecast.dart` 29-42 (parity rule for the first differing index).
- `Forecast._truncate`: `lib/src/model/analysis/forecast.dart` 49-54 (parity step, then cut to 30; defect).
- `Forecast.isCandidate` and `Forecast.add`: `lib/src/model/analysis/forecast.dart` 57-77.
- `Forecast.playMove`: `lib/src/model/analysis/forecast.dart` 88-96 (consumption).
- `UciPath.truncate`: `lib/src/model/common/uci.dart` 119-120 (keeps the first `maxSize` plies).
- Live consumption: `lib/src/model/game/game_controller.dart` 745-759 (the `move` event case; the forecast update is 755-759).
- Live premove gate: `lib/src/view/game/game_body.dart` 301 onward; the revert branch 336-339; the turn check and call 358-362.
- Premove executor: `lib/src/widgets/board.dart` 88-102.
- Forecast saved for correspondence games: `lib/src/model/analysis/analysis_controller.dart` 571-595 and 605 onward (POST through `game_repository.dart` 158-166, body not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Cap how far ahead a planned line may run | 30 plies (forecast.dart 14) |
| A planned line needs at least one of the viewer's actions | 1 ply on the viewer's turn, 2 plies on the opponent's turn (45) |
| Collision by who decides the branch | Viewer's turn: differ at an even index above 0 collides; opponent's turn: differ at an odd index collides (33, 35) |
| Premove think time sent to the server | 0 ms (game_controller.dart 583-584) |
| Premove apply | Legality checked at apply time, then a microtask (board.dart 91, 97) |
| HUD count | The number of lines (game_body.dart 697) |

## 4. TypeScript sketch

simplified: the sketch uses action ids (strings) instead of UCI pairs, and it leaves out the server save and load (`saveForecast`, `_syncForecast`), the analysis tree bookkeeping (`pathToLiveMove`), the JSON form, the live-game `moveToConfirm` hold, the live single premove and its promotion prompt, and the badge. It keeps the donor order: cut to the cap, then make the line end on the viewer's action, then reject a short line or one a saved line already extends, then remove lines it extends or collides with, then insert newest first; on each move, keep the lines whose head matches, drop the head, drop empty lines, and flip the turn. The one change: the donor cuts to 30 after its parity step, so a long line can end on the wrong side. The sketch cuts first and then fixes the parity (Fix in section 6).

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Move = string; // one action id; the donor uses UCI pairs

export const MAX_PLIES = 30;

const startsWith = (line: readonly Move[], prefix: readonly Move[]): boolean =>
  prefix.length <= line.length && prefix.every((m, i) => line[i] === m);

export class Forecast {
  constructor(
    readonly onMyTurn: boolean,
    readonly lines: readonly (readonly Move[])[] = [],
  ) {}

  // Two lines collide when the player to act cannot take both branches at the first point they differ.
  private collides(a: readonly Move[], b: readonly Move[]): boolean {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) {
        return this.onMyTurn ? i !== 0 && i % 2 === 0 : i % 2 === 1;
      }
    }
    return false; // one is a prefix of the other: not a collision
  }

  // Cut to MAX_PLIES first, then make the line end on the viewer's own action.
  // Fix: the donor applies the parity step before truncating, so a long line can end on the wrong side.
  private truncate(line: readonly Move[]): Move[] {
    let t = line.slice(0, MAX_PLIES);
    const endsOnMine = this.onMyTurn ? t.length % 2 === 1 : t.length % 2 === 0;
    if (!endsOnMine) t = t.slice(0, -1);
    return t;
  }

  isCandidate(line: readonly Move[]): boolean {
    const c = this.truncate(line);
    if (c.length < (this.onMyTurn ? 1 : 2)) return false;
    return !this.lines.some(l => startsWith(l, c)); // no saved line already extends it
  }

  add(line: readonly Move[]): Forecast {
    const c = this.truncate(line);
    if (!this.isCandidate(c)) return this;
    const kept = this.lines.filter(l => !(startsWith(c, l) || this.collides(l, c)));
    return new Forecast(this.onMyTurn, [c, ...kept]); // newest first
  }

  // A move was played (by either side): lines that start with it keep their tail, the rest are dropped.
  playMove(move: Move): Forecast {
    const kept = this.lines
      .filter(l => l[0] === move)
      .map(l => l.slice(1))
      .filter(l => l.length > 0);
    return new Forecast(!this.onMyTurn, kept);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS exits 0 for this file.

## 5. Lands in

- TARGET `src/fight/reaction-plan.ts` (new, engine side): a short queued plan of our beats, keyed on the enemy's beats. The engine holds it; the client shows it.
- Parity-checklist row 5 (controls and input: the plan is input intake). The donor's badge count is a HUD display (row 14) of the same plan, not a second row.
- Best transferable idea: a queued reaction plan that is a small list of our actions per enemy action, where an enemy action consumes the head of each matching line, a mismatch drops the plan, and two plans that differ at a beat we decide cannot both be kept.
- Decision (proposed): adapt. Why: the donor is a chess client with correspondence sync, but the forecast model is plain data (a capped list of lines, consume-on-match, drop-on-mismatch, one collision rule) and it fits a duel's queued counter. Frankendom keeps it in the engine, server-checked; the donor's silent drop becomes a visible cue; the truncation defect is fixed in the sketch; the parity rule is replaced by a per-beat owner field, because a duel is not strict alternation.
- Acceptance: in a duel, the player queues "if the enemy's high attack lands, guard, then riposte"; the enemy's high attack consumes the guard and the riposte fires in the next window; a different enemy attack drops the plan and shows a "plan broken" cue; a server test asserts that a queued plan never fires an action the duel state rejects and that a plan is never longer than the cap.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the plan is engine state, the client only displays it); rules 7-9 n/a

## 6. Gaps and risks

- Chess-specific parts do not transfer: UCI paths, promotion prompts, correspondence sync, the analysis tree. Frankendom needs its own action ids and its own legality predicate (in range, stance, stamina, target alive).
- Defect, verified by reading and a hand replica (run in node on the VPS): `_truncate` (forecast.dart 49-54) applies the parity step before `truncate(30)` (uci.dart 119-120). On the viewer's turn a line longer than 30 plies is cut to 30 and can end on the opponent's ply. Replica output: a 31-, 32- or 33-ply line on the viewer's turn is kept at 30 plies that end on the wrong side, while on the opponent's turn the result ends on the viewer's move. Fix: cut to the cap first, then fix the parity (the sketch does this).
- Silent drops: a mismatched forecast is dropped with no message (game_controller.dart 757), and an illegal premove is cleared with no message (board.dart 101). Frankendom must tell the player (row 14 HUD cue).
- No expiry in the donor: a correspondence forecast waits for days. A real-time plan needs a window in ticks, after which it is dropped.
- Parity is not our rule: `_collides` assumes strict alternation of moves. A duel is not turn-based in that way, so the collision test needs a per-beat owner ("who decides this beat"), not a parity test.
- The server copy: `saveForecast` posts the lines to the server (game_repository.dart 158-166; body not read). For Frankendom the server copy is the truth and the client copy is a prediction; a mismatch must reset to the server state.
- String table (`lib/l10n`, English source `app_en.arb`): 54 `.arb` files in `lib/l10n` (includes `app_en.arb` and `app_en_US.arb`). `app_en.arb` has 2221 message keys and 259 `@`-metadata entries (placeholder types and descriptions). 92 messages are ICU MessageFormat plurals, written as `{count, plural, =1{...} other{...}}`, so the English grammar is an exact-one choice plus "other". Named placeholders such as `{count}` and `{param2}` appear in plural bodies. No `select` messages were found in the English file. The generated `lib/l10n/l10n_*.dart` files (51 found) are not used for counts. Other locales' plural categories were not read.
- Licence: GPL-3.0-or-later. Clean-room, shape only. No line-by-line translation.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine: the plan is engine state, the client only displays it); rules 7-9 n/a
