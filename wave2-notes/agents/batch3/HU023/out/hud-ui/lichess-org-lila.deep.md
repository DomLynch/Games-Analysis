# lichess-org-lila (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/lichess-org-lila/ui/round/src/ctrl.ts` | Licence: AGPLv3+ (LICENSE is GNU Affero GPL v3; COPYING.md lists the repo as AGPLv3+) | TypeScript | symbol `apiMove` (line 412), with `reload` (546) and `takebackYes` (732) | this is the round-game UI, a chess client; the premove mechanism is the input buffer

Checked: Read in full: `ui/round/src/premove.ts` (215 lines), `ui/round/src/transientMove.ts`, `ui/round/src/moveOn.ts`, `ui/round/src/keyboard.ts`. Read the relevant ranges of `ui/round/src/ctrl.ts` (sendMove 357-373, apiMove 412-520, reload 546-566, takebackYes 732-736, submitMove 796-800, the hotkey binds 975-990), `ui/round/src/view/nvuiView.ts` (386-425), `translation/source/nvui.xml` and `site.xml` and `activity.xml`. Not read: chessground's `playPremove`, `cancelPremove` and `playPredrop` bodies, and where chessground calls `additionalPremoveRequirements`. Chessground is not in the donor box (there is no `ui/chessground` folder), so the step that actually applies a stored premove is (not read). Confidence: high on the round-side order of operations (stored, deferred, guarded, applied or dropped); medium on what chessground does inside the apply step. camera_scope: not a camera cell.

## 1. Mechanism

- A player input given on the opponent's turn is kept as a premove: one stored move that is not sent yet. The donor keeps the stored move in chessground (not read). The round code is told about it through `onPremove` (ctrl.ts 200-201), which passes the move to `startPromotion` with the premove flag (`startPromotion` not read).
- Order of steps when the opponent's move arrives (`apiMove`, ctrl.ts 412 onward):
  (a) the new step is pushed (476) and, if the move is the own move coming back, the transient-move watchdog is cleared (500-501);
  (b) if the move was the opponent's (`playedColor !== d.player.color`, line 505), the code schedules a `setTimeout` with delay `premoveDelay` (509: 1 ms, or 100 ms for the atomic variant; the comment at 507-508 names the race with explosions and premoves), after capturing the current ply and FEN (510-511, timer opened at 512);
  (c) when the timer fires, it returns at once if the ply or the FEN changed since the capture (513). This is a race guard, with the comment "prevent race conditions with explosions and premoves";
  (d) otherwise it asks chessground to play the stored premove (515). If that returns false and a pre-drop also fails, it cancels the promotion state and shows the "your move" notice (516-517).
- Cancel paths, which clear the stored premove: a reload that finds a changed position (`if (posChanged) this.chessground.cancelPremove();`, 562, inside `reload` at 546); accepting a take-back (734).
- Legality before storing: `premove.ts` supplies `additionalPremoveRequirements` (207). It dispatches by piece role (209) to a rule set that checks whether the opponent's pieces would block or attack the destination. The rules are chess-specific (pawn advance and capture, en passant, knight, bishop, rook, queen, king and castling). If a rule throws, the wrapper logs the error and returns true (210-212): it fails open.
- Confirm mode (a player setting): a normal move is held in `toSubmit` and a question "Confirm move" is shown (363-369 in `sendMove`; question at 695-700). Enter submits (986) and Esc cancels. Premoves skip this (`!meta.premove`, 363), so only the first, deliberate move is guarded.
- Own-move watchdog: sending a move starts a 10 s timer (`register`, ctrl.ts 337; `setTimeout(this.expire, 10000)`, transientMove.ts 18). When the server reports the own move back, it is cleared (501). If the timer expires, `expire` reloads the socket (transientMove.ts 25-28). Its comment says it is for a board stuck in a transient state, so the clock does not tick and the player flags.
- Screen-reader path (`nvuiView.ts`): the same idea in text. On the opponent's turn the typed move is stored as `premoveInput` (417-419) and announced as "Premove recorded ... Hit enter to cancel" (420). Submitting an empty input clears the stored premove and announces "Premove cancelled" (396-398). A stored premove is submitted by `submitStoredPremove` (390).

## 2. Key functions

- `apiMove` (ctrl.ts 412-520): the server-move handler. The premove block is 505-520: capture, `setTimeout`, guard, play-or-cancel.
- `reload` (ctrl.ts 546-566): a changed position cancels the premove (562).
- `sendMove` (ctrl.ts 357-373): the confirm gate (363-369), then `actualSendMove`.
- `takebackYes` (ctrl.ts 732-736): cancels the premove and the promotion state.
- `additionalPremoveRequirements` (premove.ts 207-214): the legality wrapper; `mobilityByRole` (dispatch, 209) and the fail-open catch (210-212).
- `expire` (transientMove.ts 25-28): the watchdog reload.
- nvui submit handler (nvuiView.ts 390-425): the text input buffer with `premoveInput`.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Defer the buffered action by one tick and re-read the state before applying it | Delay 1 ms (ctrl.ts 509); 100 ms when the variant is atomic (explosions), same line |
| Drop the buffered action if the state moved again in the meantime | Compare ply and FEN captured at 508 (ctrl.ts 513) |
| Keep at most one buffered action | One stored premove (chessground, not read); the text path stores one string (`premoveInput`, interfaces.ts 23) |
| Watchdog for a sent action that gets no answer | 10000 ms (transientMove.ts 18), then reload (not a mechanism we want in a fight; see section 6) |
| Confirm before send, premove exempt | Boolean player preference (`confirmMoveToggle`, ctrl.ts 363) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: record the input, then on the opponent's move capture the state, defer one tick, re-read the state, check legality, then apply or drop. It replaces chessground with two callbacks (`isLegal`, `apply`), so the chess rules and the apply step are not in it. It omits the promotion state, the "your move" notice, the text input path, the confirm-move question, the clock hard-stop on premove, the watchdog reload and the blindfold setting. Two deliberate changes from the donor: a legality check that throws now drops the input (the donor returns true, premove.ts 211-212), and the slot is cleared when it is dropped (the donor's chessground behaviour on a failed premove is not read, so this clear is the sketch's assumption).

```ts
// Licence: AGPLv3+ (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Outcome = 'applied' | 'dropped' | 'empty' | 'raced';

// One buffered input slot. A second input replaces the first (single premove).
export class PremoveBuffer {
  private slot: string | null = null;

  // Input given while the player cannot act yet.
  record(action: string): void {
    this.slot = action;
  }

  // Empty input, or a reload that found a different position.
  cancel(): void {
    this.slot = null;
  }

  // Called when the opponent's move has been applied. The buffered input is tried on a later tick.
  onOpponentMoved(
    getStateKey: () => string,
    isLegal: (action: string) => boolean,
    apply: (action: string) => boolean,
    schedule: (fn: () => void) => void,
    onOutcome: (o: Outcome) => void,
  ): void {
    const captured = getStateKey();
    schedule(() => {
      if (this.slot === null) return onOutcome('empty');
      if (getStateKey() !== captured) return onOutcome('raced'); // slot kept, as in the donor
      const action = this.slot;
      this.slot = null;
      // Fail closed: a legality check that throws drops the input (the donor's catch returns true).
      let legal = false;
      try {
        legal = isLegal(action);
      } catch {
        legal = false;
      }
      if (!legal || !apply(action)) return onOutcome('dropped');
      onOutcome('applied');
    });
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS exits 0 (run on the file in /tmp).

## 5. Lands in

- TARGET `src/fight/input-buffer.ts` (new module, engine side). The buffer is engine state: the client shows the slot, the server decides whether it fires.
- Parity-checklist row 5 (controls and input). The hint pointed at row 14; the "Premove recorded" line is a HUD display of the same slot, so it belongs to row 14 as a presentation detail, not as a second row.
- Best transferable idea: buffer one input while a fighter is in recovery or stagger, then fire it on the first tick the window opens only if the duel state is unchanged and the action is still legal; otherwise drop it and show a missed-input cue.
- Decision (proposed): adapt. Why: the shape fits a fast duel (a one-slot input buffer with a state re-check on the tick the window opens), but chess legality is not ours, and the buffer must be server-checked, not a client timer. The fail-open catch is fixed to fail closed in the sketch.
- Acceptance: a server test in src/fight asserts that an attack recorded during recovery fires on the first tick the window opens when the target is still in range, that it is dropped with a missed-input event when the duel state version changed in between, and that a throwing legality check drops it.
- Reuse tag: rewrite-from-idea (AGPLv3+; clean-room, shape only)
- Brief rule served: 1 (one engine: the buffer lives in the engine and the client only displays it); rules 7-9 n/a

## 6. Gaps and risks

- Legality is chess-specific. Frankendom needs a duel predicate (in range, stance allowed, stamina, not stunned, target alive). Replace the predicate; do not port the chess rules.
- The donor uses a 1 ms wall-clock timer. In Frankendom the window opens on a server tick, so the apply must happen on the tick and in the same tick as the state check. This is the server-tick sub-line "fixed step, input intake" (row 18 / post-K item 3, intake row 5).
- The client buffer is a prediction. The server re-checks the duel version and reports dropped or applied. In the donor, the client alone decides the premove timing (ctrl.ts 509-513); the server side is not read (Scala, outside this cell).
- One slot is a design choice. A fighter with attack and guard as two inputs needs a decision: last input wins, or one slot per input family.
- The 10 s watchdog reloads the page. A fight must not reload: keep the idea (a sent action with no server answer is detected) and replace the reload with a server-side resync of the duel state. This is the one part rejected as written.
- The confirm-move question adds a step to every move. Frankendom should not confirm attacks in a fight. A confirm for an accidental mobile tap could exist only as an option outside a fight.
- Chessground internals (the apply step and where the premove legality is called) were not read. Anything said about how the stored premove is applied is the donor's comments and call sites, not the library code.
- String table (translation/source, 44 XML files): 3059 `<string>` entries in total; `site.xml` has 896 strings and 41 plural blocks; `nvui.xml` has 61 strings and no plurals. Placeholders: `%s` in single strings (for example "Premove recorded: %s. Hit enter to cancel"); positional `%1$s` and `%2$s` inside plural items. Plurals use only the Android-style quantity values `one` and `other` (123 `one` items and 125 `other` items across the files, 248 items in total, 125 plural blocks), so the grammar is a two-form one/other choice. `translation/source/` holds the English strings; `translation/dest/` holds per-language files (for example `dest/nvui/fr-FR.xml`).
- Licence: AGPLv3+. Clean-room, shape only. No line-by-line translation.
