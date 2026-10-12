# boardgameio-boardgame.io (coach-manager-mode, cell 2)

Donor: `/mnt/frankendom-donors/boardgameio-boardgame.io/src/core/flow.ts` (plus `src/core/turn-order.ts`, `src/types.ts`, `src/ai/bot.ts`, `src/ai/random-bot.ts`, `src/ai/mcts-bot.ts`, `src/ai/ai.ts`) | Licence: MIT ("MIT License", Copyright (c) 2017 The boardgame.io Authors, LICENSE line 3; bot files carry the same MIT notice) | TypeScript | symbol `ProcessMove`

Checked: Read in full: `src/ai/bot.ts`, `src/ai/random-bot.ts`, `src/ai/ai.ts`. Read in part: `src/core/flow.ts` (320-340 StartTurn counter reset; 455-500 turn end check; 540-560 turn min gate; 600-645 stage min gate; 722-765 `ProcessMove`), `src/core/turn-order.ts` (250-252 counter init; 221-232 and 341-342 min and max storage; 571-597 presets), `src/types.ts` (56-80, 206-216), `src/ai/mcts-bot.ts` (grep hits only: option defaults near 93-107, UCT near 170). Not read: the body of `EndStage` (flow.ts 598-690, only its min check at 633-644), the undo stack (not read, so I do not know whether it stores earlier counts), the MCTS playout and `play()` bodies (mcts-bot.ts 160-331, only the option defaults and the UCT line were read), the name of the function that contains turn-order.ts:250. Confidence: high on the move counters and their order of operations (ProcessMove and ShouldEndTurn read end to end); medium on the stage close path; the bot section is shape only. Depth: thin, because the `EndStage` body (the stage close the auto-end calls) was not read. camera_scope not applicable.

Best transferable idea: give each side a command budget per window with a minimum and a maximum count of commands, close the side's window when the maximum is reached, and let free actions skip the count.
Decision (proposed): adapt - take the min/max budget and the ALL_ONCE / OTHERS_ONCE presets as the shape, keep the counters immutable and server-side (the donor mutates its counter in place, see section 6), and bind the budget to the coach's command window.
Acceptance: a server test gives a coach a window maximum of 3: the first three counted commands are accepted and the fourth is refused; a free stance change (no-limit) sent mid-window (after command 1) is accepted and leaves the count at 1 (after the window is full the sketch refuses every command, free or not, as the donor's closed stage does); pre-fight, the fight does not start until both coaches have each submitted one order set (ALL_ONCE).

## 1. Mechanism

- Two counters, both kept in the game state (`ctx`): `numMoves` for the current player, and `_activePlayersNumMoves[playerID]` for each player in an active-players list. They are reset at turn start: `numMoves` to 0 (flow.ts:337) and each active player's count to 0 when the active-player list is built (turn-order.ts:250-252).
- Order of operations for one accepted move (`ProcessMove`, flow.ts 727-762):
  1. Find the move and decide whether it counts: any move except one flagged `noLimit: true` counts (731-732). A counted move increments `numMoves` if its mover is the current player (736), and increments `_activePlayersNumMoves[playerID]` when there is an active-player list (737).
  2. If the mover's stage has a maximum and its count has reached it, the stage ends automatically: `EndStage` is called with `automatic: true` (750-754).
  3. The turn's `onMove` hook runs (756-758), then the move's events are queued (764).
- `ShouldEndTurn` ends the turn when `numMoves` reaches the turn's `maxMoves` (468-473); otherwise it defers to the user's `endIf`. (Where the flow calls it after a move was not read.)
- Gates on explicit ending: ending a turn is refused while `numMoves` is below the turn's `minMoves`, unless `force` is set (547-558). Ending a stage is refused while that player's count is below its `minMoves` (633-644).
- Storage: a stage's `minMoves` and `maxMoves` are stored per player only when truthy (turn-order.ts:341-342). So 0 means "no minimum", and an absent maximum means "no limit" (the check at flow.ts:750 requires a stored maximum).
- Presets (turn-order.ts 571-597): `ALL` lets every player play with no limit; `ALL_ONCE` lets every player play with minimum 1 and maximum 1, in any order (580); `OTHERS` lets every other player play; `OTHERS_ONCE` is the same for the others (597). The comments say the turn stays with one player while the others respond, which is the pattern for a pre-fight "everyone submits once" phase.
- Bots (secondary, shape only): the base bot draws from a seeded PRNG (alea) so the same seed gives the same picks (bot.ts 101-109); `RandomBot` picks one move uniformly from the enumerated legal moves (random-bot.ts 18); the MCTS bot runs 1000 iterations by default with a playout depth of 50 (mcts-bot.ts 100 and 106), selecting with UCT sqrt(2 ln N / n) (170). `Simulate` stops at depth 10000 by default (ai.ts 60).

## 2. Key functions

- `ProcessMove` (count, auto-end, hook): `/mnt/frankendom-donors/boardgameio-boardgame.io/src/core/flow.ts` 727-762.
- `ShouldEndTurn` (turn max, turn-end check): `/mnt/frankendom-donors/boardgameio-boardgame.io/src/core/flow.ts` 464-477.
- `EndTurn` min gate: `/mnt/frankendom-donors/boardgameio-boardgame.io/src/core/flow.ts` 544-558.
- `EndStage` min gate: `/mnt/frankendom-donors/boardgameio-boardgame.io/src/core/flow.ts` 598-645 (only 633-644 read).
- `StartTurn` counter reset: `/mnt/frankendom-donors/boardgameio-boardgame.io/src/core/flow.ts` 320-340.
- Stage limit storage and presets: `/mnt/frankendom-donors/boardgameio-boardgame.io/src/core/turn-order.ts` 221-232, 341-342, 571-597.
- Bot PRNG and pick: `/mnt/frankendom-donors/boardgameio-boardgame.io/src/ai/bot.ts` 96-121.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Counted command budget per window: refuse past the maximum, close the window at the maximum | Maximum set per stage (no default in the engine; the presets use 1, theirs turn-order.ts:580 and 597) |
| Minimum before a window may end | Minimum 1 in the presets (theirs turn-order.ts:580); 0 = no minimum (falsy check, turn-order.ts:341) |
| Free actions do not use a slot | Flag `noLimit` (theirs types.ts:214) |
| Per-turn budget, reset at turn start | `numMoves` reset to 0 (theirs flow.ts:337) |
| Seeded pick for AI | Alea PRNG, state kept between calls (theirs bot.ts:105) |
| Search budget for AI | 1000 iterations and playout depth 50 by default (theirs mcts-bot.ts:100, 106); UCT exploration term sqrt(2 ln N / n) (theirs mcts-bot.ts:170) |

## 4. TypeScript sketch

simplified: the sketch keeps the per-side counted budget, the free-action flag, the auto-close at the maximum, the minimum gate and the ALL_ONCE preset. It omits the turn-level counter and its `turn.maxMoves` auto-end, the `activePlayers` list that the donor keeps per stage, the stage-transition `next` value, the `onMove` hook, undo, and the donor's `EndStage` events; the caller must close the side when `closed` is true. It also refuses the move at the maximum where the donor closes the stage and the next move is then refused by the phase, which has the same effect. The one change from the donor is the fix for its in-place counter: counts are copied, never incremented in place.

```ts
// Licence: MIT (donor LICENSE, "Copyright (c) 2017 The boardgame.io Authors"). Clean-room sketch from the mechanism.
// clean-room
export interface Budget {
  minMoves?: number; // 0 or undefined means no minimum (donor: falsy minMoves is not set)
  maxMoves?: number; // the side's window closes once this many counted commands are accepted
}

export interface WindowState {
  budget: Readonly<Record<string, Budget>>;  // per side
  used: Readonly<Record<string, number>>;    // counted commands accepted per side
}

export interface Command {
  side: string;
  name: string;
  noLimit?: boolean; // donor: move.noLimit, a free action that does not use a slot
}

export type Outcome =
  | { ok: true; state: WindowState; closed: boolean }
  | { ok: false; reason: string };

// Order of operations: refuse if the side is already at its maximum, count the command (free ones do not
// count), then report whether this command closed the side's window.
// The fix over the donor: the counts are copied, never incremented in place.
export function submit(state: WindowState, cmd: Command): Outcome {
  const budget = state.budget[cmd.side] ?? {};
  const used = state.used[cmd.side] ?? 0;
  if (budget.maxMoves !== undefined && used >= budget.maxMoves) {
    return { ok: false, reason: `side ${cmd.side} used ${used} of ${budget.maxMoves}` };
  }
  const nextUsed = cmd.noLimit === true ? used : used + 1;
  return {
    ok: true,
    state: { ...state, used: { ...state.used, [cmd.side]: nextUsed } },
    closed: budget.maxMoves !== undefined && nextUsed >= budget.maxMoves,
  };
}

// The window may end for a side only after its minimum counted commands.
export function canEnd(state: WindowState, side: string): boolean {
  const min = state.budget[side]?.minMoves ?? 0;
  return min === 0 || (state.used[side] ?? 0) >= min;
}

// Preset in the donor's style: each side submits exactly once, in any order (donor ALL_ONCE).
export const ALL_ONCE: Budget = { minMoves: 1, maxMoves: 1 };

// The phase is done when every listed side has met its minimum and reached its maximum.
export function allDone(state: WindowState, sides: readonly string[]): boolean {
  return sides.every(
    (side) =>
      canEnd(state, side) &&
      (state.budget[side]?.maxMoves === undefined ||
        (state.used[side] ?? 0) >= (state.budget[side]?.maxMoves ?? 0)),
  );
}

export {};
```

## 5. Lands in

- TARGET `src/fight/commandWindow.ts` (new engine module): the per-side command budget for a window, the minimum gate, the free-action flag and the pre-fight ALL_ONCE phase. The server keeps the counts; the client shows what is left.
- Parity-checklist row 5 (controls and input): this is command intake. Each command is checked and counted on the server before it changes the fight.
- Reuse tag: rewrite-from-idea (MIT; code could be adapted, the sketch is clean-room)
- Brief rule served: 1 (one engine: the budget is in the engine, not the client); 2 (server-verified: the server counts the commands)

## 6. Gaps and risks

- Defect (keep the idea, fix the defect): flow.ts:737 does `_activePlayersNumMoves[playerID]++` on the object taken from `state.ctx` (flow.ts:734), and the new state is a shallow copy (740-747), so the earlier state's counter map changes too. Any stored earlier state (I did not read the undo stack, so I do not know whether it stores these) would show the new count. fix: copy the map before the increment, as the sketch does (`used: { ...state.used, [side]: nextUsed }`).
- The donor counts `numMoves` only for the current player (flow.ts:736) but counts stage moves for every active player (737). Frankendom must say which side a window counts for. The sketch keeps one budget per side.
- The donor refuses ending a turn or a stage early only through explicit gates, and it ends a stage automatically at the maximum (751-753). The sketch refuses the next command instead; the caller must close the side when `closed` is true, so the server must not leave a window open after its maximum.
- Bot random pick, read but not executed: `random(arg)` tests `if (arg)` (bot.ts:111), so `random(0)` falls through and returns a float in [0,1) rather than 0 (bot.ts:120). `random([])` takes the array branch (bot.ts:113) and returns `arg[0]`, which is undefined. fix: test `arg !== undefined`, and throw on an empty choice list. Frankendom's "AI when the coach is absent" should not use uniform random picks: use a fixed default tactic table that is seeded from the fight seed.
- The MCTS budget (1000 iterations, depth 50) is an AI compute budget for board games. For a real-time duel it is far too big per tick; the per-tick budget idea is in the server-tick sub-line, not in this note.
- Frankendom's fights are not turn-based. A window must be a timer, not a turn count. The donor's minimum and maximum concepts transfer; the turn-end trigger does not.

Reuse tag: rewrite-from-idea (MIT; clean-room sketch)
Brief rule served: 1 (one engine), 2 (server-verified commands)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: numMoves reset cited flow.ts:337 but the line is 336 (`numMoves: 0` in StartTurn). Other cited claims hold: ProcessMove 727-762 order (shouldCount via noLimit, numMoves++ only for current player at 736, per-player count at 737, auto EndStage at 750-754), ShouldEndTurn maxMoves, EndTurn/EndStage min gates, falsy min/max storage turn-order.ts:341-342, ALL_ONCE/OTHERS_ONCE {min 1,max 1}, in-place counter mutation defect (real), bot random(0)/random([]) defects (real), MCTS 1000/50, UCT line 170, ai.ts depth 10000, MIT line 3. ACCEPTANCE RISK: the sketch's submit() refuses every command once used>=maxMoves, including noLimit ones, so the test 'free stance change does not use a slot' only passes if the stance change is sent BEFORE the window is full; if sent after the third counted command a correct build refuses it (donor also has the stage ended by then). Acceptance should say the free command is sent mid-window or the sketch should let noLimit bypass the max check. Also the 'ALL_ONCE: fight does not start until both have submitted' test is fine.
Missed: None major. Donor also gives every active player a per-stage budget through activePlayers/setActivePlayers (the simultaneous-window mechanism that the sketch calls 'omitted') and the stage `next` hand-off; note admits omitting them.

Fixed 2026-10-12 (Sonnet fixer): acceptance now sends the free stance change mid-window so a correct build passes it (the sketch refuses all commands once the window is full, matching the donor, whose stage has ended by then). Checker's line claim (numMoves reset at 336) not confirmed: flow.ts:337 is the `numMoves: 0` line, so the note's cite stays. Also found: none needed (activePlayers per-stage budget is already listed as omitted).
