# lichess-org-mobile (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/lichess-org-mobile/lib/src/model/practice/practice_gamebook_controller.dart (232 lines) | Licence: GPL-3.0 (LICENSE: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Dart (Flutter, Riverpod) | symbol PracticeGamebookController (onUserMove, next, retry, _update, _onChange, feedback, comment, nbMoves), PracticeProgress.withNbMoves, PracticeProgressStorage.save

Checked: opened practice_gamebook_controller.dart (all 232 lines), practice_progress.dart (lines 1-70 and 127-140, plus the storage save at 90-104), practice_structure.dart (lines 205-215, the chapter fields and their doc comments), test/model/practice/practice_gamebook_controller_test.dart (lines 1-170: fixture and the first eight test cases; the test names of the rest from grep), lib/src/view/practice/practice_gamebook_chapter.dart (grep only: lines 31, 43, 50, 56, 62, 81, 106). Callers: the controller is used by the gamebook view and by its test file (grep). Not read: test lines 170-241 (bodies), the view body, practice_engine_controller.dart (a sibling engine controller, not the gamebook). Confidence: high on the beat order, the three delays, the feedback rules and the minimum-keeping progress (each has a receipt and a test name); medium on the view wiring (grep only). camera_scope: not applicable.

## 1. Mechanism

A gamebook chapter is an authored PGN tree. The controller keeps `ply`, the number of mainline moves done (the mainline is the authored moves, in order). build() starts at ply 0 and schedules one check through scheduleMicrotask.

Player input (onUserMove, from line 56): ignored unless the feedback is play and the move is legal. The resulting position is matched against the children of the current node. If the match is the first child (the mainline), ply advances. Any other child is an anticipated wrong move: it becomes wrongMove, carrying the author's comments for it. Any other move becomes a wrong move with no comments.

Every state change goes through _update (line 110), which clears the hint and the solution arrow, plays a move sound when the ply moved or a wrong move was made, and then calls _onChange.

_onChange (line 121) cancels the pending timer first, then decides:
- feedback end: complete the chapter with nbMoves (line 127).
- feedback good (the opponent moves next) and no comment pending: a timer calls next() after 300 ms if ply is 0 (the chapter starts with the opponent's move), otherwise after 1000 ms (lines 129-131).
- feedback bad (a wrong move on the board) and no comment pending: a timer calls retry() after 800 ms (lines 132-133).
- any pending comment: no timer. The player must tap next or retry (view lines 56 and 62).

The feedback itself is derived, not stored: a wrong move gives bad (line 189), the end of the mainline gives end (line 190), and a node where it is the player's turn gives play, otherwise good (line 191).

The comment shown is the author's comments on the current node, or on the wrong move's anticipated comments. For a wrong move with no anticipated comment, it is the deviation comment at index ply + 1 (lines 196-200; the fixture in the test has deviations [null, 'Not that pawn'] and a wrong first move reads 'Not that pawn', test line 133).

nbMoves counts the mainline prefix moves whose resulting position is not the player's turn, which is the player's own moves (lines 214-215).

Progress: PracticeProgress.withNbMoves keeps the fewest moves (line 63-67; a worse count returns the same object). complete() updates the state with that rule (line 130), then calls storage.save, which again keeps the minimum inside a database transaction (line 99 returns early when the saved count is not larger).

## 2. Key functions

- PracticeGamebookController.onUserMove (line 56): legality gate (57), resulting position (59), anticipated child match (61), mainline or wrong branch (63).
- _update (line 110): moved flag (111), sound on a move, then _onChange.
- _onChange (line 121): mounted check (122), cancel (123), end (126-127), good timer (129-131), bad timer (132-133).
- feedback (line 188): bad (189), end (190), play or good (191).
- comment (line 196): author comments first, deviation only for a wrong move (198), deviation at ply + 1 (200).
- nbMoves (line 214).
- PracticeProgress.withNbMoves (line 63), complete (line 128), PracticeProgressStorage.save (line 90).
- The three delays are top-level constants (lines 17, 20, 23).

## 3. Numbers vs mechanism

- kGamebookOpponentMoveDelay = 1000 ms (line 17): the wait before an uncommented opponent move plays.
- kGamebookFirstMoveDelay = 300 ms (line 20): the wait when the chapter opens with the opponent's move (ply 0 only).
- kGamebookRetryDelay = 800 ms (line 23): the time an uncommented wrong move stays on the board before it is taken back.
- The test waits kGamebookOpponentMoveDelay plus 100 ms before it checks the opponent's move (the constant at test line 51; fixture at lines 42-45; test cases at 96 and 111).
- No count, cap or chance. The only other number is the deviation index (ply + 1), which follows the data contract that a move is indexed by the ply it produces (practice_structure.dart line 211: "indexed like [hints] by the ply of that move").

simplified: Sketch of the beat rules only. It replaces the chess positions with input tokens (the donor compares resulting positions, so castling notations match, and checks legality). It runs the first check in the constructor where the donor uses scheduleMicrotask. It drops the hint, the solution arrow, shapes, SAN and the sound, and the feedback is a function of the run instead of a stored field. Typecheck: tsc --noEmit --strict --target es2020 on the VPS, exit 0.

```ts
// Sketch: scripted beat sequencer. The opponent's beats play themselves after a delay unless a comment is
// pending; a wrong input is shown, then taken back by timer unless it has a comment to read.
// Clean-room shape of a GPL-3.0 donor (lichess-org-mobile); written from the rule, not copied.
export const DELAY_MS = { firstOpponent: 300, opponent: 1000, retry: 800 } as const;

export type Feedback = 'play' | 'good' | 'bad' | 'end';

export interface Beat {
  input?: string; // the input the player must give here; undefined means an opponent beat
  comment?: string; // text to read; while it is pending, the script waits for next()
}

export interface Script {
  beats: Beat[];
  anticipated: Record<string, string>; // wrong input -> comment the author wrote for it
}

export interface Run {
  ply: number;
  wrong?: { input: string; comment?: string };
  inputs: number; // player inputs accepted so far
}

export function feedbackOf(s: Script, r: Run): Feedback {
  if (r.wrong) return 'bad';
  if (r.ply === s.beats.length) return 'end';
  return s.beats[r.ply].input !== undefined ? 'play' : 'good';
}

export function pendingComment(s: Script, r: Run): string | undefined {
  if (r.wrong) return r.wrong.comment;
  return r.ply < s.beats.length ? s.beats[r.ply].comment : undefined;
}

// simplified: the donor compares resulting positions (castling-safe) and checks legality; this sketch
// compares input tokens. The donor defers its first check with scheduleMicrotask; the sketch runs it in the
// constructor. Shapes, hints, SAN, sound and the feedback-driven view are omitted.
export class Sequencer {
  readonly run: Run = { ply: 0, inputs: 0 };
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly script: Script,
    private readonly onComplete: (inputs: number) => void,
  ) {
    this.reschedule();
  }

  onInput(input: string): void {
    const s = this.script;
    const r = this.run;
    if (feedbackOf(s, r) !== 'play') return;
    const beat = s.beats[r.ply];
    if (input === beat.input) {
      r.ply++;
      r.inputs++;
    } else {
      r.wrong = { input, comment: s.anticipated[input] };
    }
    this.reschedule();
  }

  next(): void {
    const f = feedbackOf(this.script, this.run);
    if (f === 'good') {
      this.run.ply++;
      this.reschedule();
    } else if (f === 'bad') {
      this.retry();
    }
  }

  retry(): void {
    if (!this.run.wrong) return;
    this.run.wrong = undefined;
    this.reschedule();
  }

  // Cancels the pending timer first, then decides the next step from the new state.
  private reschedule(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    const f = feedbackOf(this.script, this.run);
    if (f === 'end') {
      this.onComplete(this.run.inputs);
      return;
    }
    if (pendingComment(this.script, this.run) !== undefined) return;
    if (f === 'good') {
      const ms = this.run.ply === 0 ? DELAY_MS.firstOpponent : DELAY_MS.opponent;
      this.timer = setTimeout(() => this.next(), ms);
    } else if (f === 'bad') {
      this.timer = setTimeout(() => this.retry(), DELAY_MS.retry);
    }
  }
}

export {};
```

## 4. TypeScript sketch

Sketch file: /private/tmp/p2/wave2-haiku/batch3/QD017/work/lichess-gamebook-beats.ts (same content as the block above). Typecheck on the VPS (/tmp/lichess-gamebook-beats.ts): exit 0.

## 5. Lands in

Target file (proposed; not checked against the Frankendom repo): origins/quests/script-beats.ts, used by scripted intros and tutorial fights. Parity row 18 (loot roll and XP award), as the cell hint says: this is a weak fit, because the donor awards no loot or XP; its only reward-like output is a fewest-moves record. The nearest other row is 2 (AI brain), for the scripted opponent's reply pacing.

## 6. Gaps and risks

1. Fixed delays. The three delays are engine constants (lines 17, 20, 23). A scripted fight needs them per beat, in zone data, because the right pause differs for an intro line and a telegraphed attack. Fix: put delay on each Beat (the sketch does not yet).
2. A caption blocks the script forever. A commented beat waits for a tap (view lines 56 and 62) with no timeout. That suits reading a lesson; it would freeze a fight. Fix: make the pause a per-beat choice (wait for tap, or auto after N ms, or never pause in combat).
3. Chapter position is not kept. The provider is autoDispose and build() always starts at ply 0; only a finished chapter is saved (complete at line 128 is called only at the end). Leaving mid-chapter loses the place. Fix (if Frankendom wants resume): save ply on each accepted beat.
4. Equality by resulting position. The donor needs position equality because castling has two notations (test "castling is recognised whichever way the king is moved", test line 207). A Frankendom input needs a canonical token per input (the sketch's string), or the same risk comes back.
5. Completion record is client-side. The fewest-moves record lives in a local database (storage.save) and syncs later. Nothing here is server-verified. If a tutorial unlocks gear or XP, the completion must be checked on the server, which the donor does not do.
6. The single pending timer is cancelled on every state change (line 123), so a stale timer cannot fire after the player acts. That is the right shape; keep it.

Frankendom gaps against the rulings: there is no scripted-beat sequencer in the rulings (not checked against the repo). The donor's reward path is absent (no loot, no XP), so row 18 is a weak fit and the decision is about the sequencer, not the reward.

Licence note: GPL-3.0 copyleft. Clean-room: the sketch is written from the rules, not translated from the Dart.

Reuse tag: adapt (the beat sequencer with a pause-for-read gate and a timed take-back of a wrong input; the per-beat delays and the server-side completion are added for Frankendom).

Brief rule served: 12 quests-dialogue (STRONG, full depth); addendum rule "keep the idea, fix the defect" (decision adapt); parity row 18 used with the weak-fit caveat above.

Best transferable idea: a scripted sequence where each beat auto-advances after a delay unless a caption is pending, a wrong input is shown then taken back by timer unless the author wrote a caption for it, and the record keeps the fewest inputs.

Decision (proposed): adapt — keep the pause-for-read gate, the timed take-back of a wrong input and the fewest-count record; make the delays per beat in zone data, and make the pause non-blocking in combat, because the donor's infinite wait would freeze a fight.
Acceptance: in a tutorial fight the enemy's scripted reply plays 1 s after the player's input unless that beat has a caption; a wrong input is shown and taken back after 0.8 s unless the author wrote a caption for it; the lesson's completion record keeps the fewest inputs, verified on the server.
