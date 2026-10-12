# 0ad-0ad (quests-dialogue, cell 1)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/scripts/Tutorial.js` | Licence: GPL version 2 or later (LICENSE.txt line 18, `binaries/data/` rule; clean-room, shape only) | JavaScript (0 A.D. map trigger script) | symbol `Trigger.prototype.NextGoal`

Checked: Read in full: `maps/scripts/Tutorial.js` (113 lines, the runner). Read in part: `maps/tutorials/introductory_tutorial.js` (445 lines; the goal list is 28 blocks; read lines 1-75, 108-135, 285-386, 388-445 in full; grep of every event key and `IsDone` line for the rest). Grep only: `maps/tutorials/starting_economy_walkthrough.js` (462 lines, 32 goal blocks, same shape). Other candidates opened: `maps/scripts/NonVisualTrigger.js` (end-of-game statistics, not quest logic), `maps/scenarios/death_canyon_invasion_force_triggers.js` (21 lines, a building lock), `maps/scenarios/triggers_demo.js` (first 40 lines, logging only). Not read: the C++ engine side (not searched). Correction after the checker: the Trigger component is JavaScript, `binaries/data/mods/public/simulation/components/Trigger.js`, where `DoAfterDelay` (286) calls `Timer.SetTimeout(..., time, ...)` and the time is in milliseconds (doc comment, Timer.js 32-37). The GUI side of the tutorial panel (the consumer of `PushNotification` and the sender of `dialog-answer`) was not read. Confidence: high on the JavaScript order of operations; high on timer units (milliseconds) and low on whether the GUI can send a ready answer on the final message. Camera: not applicable.

## 1. Mechanism

- A tutorial is an ordered list of goals (`Trigger.prototype.tutorialGoals`, `introductory_tutorial.js` line 1). A goal has instruction text and optionally an `Init`, an `IsDone` guard, one or more event handlers keyed by event name (for example `OnPlayerCommand`, `OnTrainingQueued`, `OnOwnershipChanged`), and a `delay`. The runner in `Tutorial.js` walks the list one goal at a time.
- Setup (`Tutorial.js` 1-29). `InitTutorial` registers `OnDeserialized` as enabled (line 8), registers `OnPlayerCommand` as disabled (line 9), then registers every other event name that any goal handler uses as a disabled trigger (12-26). It then calls `NextGoal` (28).
- Entering a goal, `NextGoal` (31-80), in this order:
  (a) read the goal at `this.index` (35); (b) run its `Init` unless this is a restore (39-41); (c) read `IsDone`, defaulting to false (43), and record whether the goal is already done (44);
  (d) for each event name: if the goal has a handler, enable it (49-52); a goal that is not already done waits for events, so `needDelay` is cleared (53-54); event names the goal does not use are disabled (57);
  (e) if `goal.delay` is set or the goal needs no waiting (63): a positive delay arms a one-shot timer that calls `NextGoal` (65-66); otherwise the Ready flag is set and `OnPlayerCommand` is replaced by a listener for a `dialog-answer` with `ready` (68-75);
  (f) the index moves forward and the goal's text goes to the GUI with the Ready flag and a last-goal flag (79).
- Advance. A goal's own handler calls `NextGoal` when its guard is met. Examples from `introductory_tutorial.js`: a gather command on a fruit resource (9-11); the farm step needs both a field repair and a finished training batch (IsDone at 119; each handler checks `IsDone` before advancing, 125-126 and 131-132); the repel step advances when no attacker has hit points above zero (`IsAttackRepelled`, 420-423, called at 295-296).
- Scripted event. The enemy attack step (`LaunchAttack`, 388-418) issues an `attack-walk` command for the enemy player toward the first tower, or else the civic centre, and the next step advances when an enemy civic centre changes owner (370-376).
- Save and reload (`OnDeserializedTrigger`, 104-113). The index steps back one goal (106), the text of the earlier goals is replayed (109-110), and `NextGoal(true)` re-enters the current goal without running its `Init` (112 and 40). Progress flags such as `farmStarted` and `trainingDone` are plain properties on the trigger object (115, 130); whether the engine saves them was not read.
- End. The last goal's `Init` marks the player and allies as winners (`introductory_tutorial.js` 380-384).
- Tick. There is none. The runner is event-driven. `DoAfterDelay` (66) is the only timed path. The timer unit is milliseconds (Trigger.js 286, Timer.js 32-37); the engine's dispatch order was not read.
- Edge in the donor (not reproduced). The end guard at line 33 uses `>`, not `>=`. After the last goal, `this.index` equals the list length (79), so `this.tutorialGoals[this.index]` is undefined (35) and `goal.Init` at 39 would throw if `NextGoal` ran again. The last goal has no handler and no delay, so it shows a Ready button (68-75). Whether the GUI can send a ready answer on that final message (it has the `leave` flag) was not read.

## 2. Key functions

- `InitTutorial`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/scripts/Tutorial.js` 1-29. Registers the triggers for the goal event names, then starts goal 0.
- `NextGoal`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/scripts/Tutorial.js` 31-80. The runner: `Init`, `IsDone`, handler enable and disable, timer or Ready, message.
- `OnDeserializedTrigger`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/scripts/Tutorial.js` 104-113. Step back one goal, replay texts, re-enter without `Init`.
- `GoalMessage`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/scripts/Tutorial.js` 82-92. Pushes `type: "tutorial"` with instructions, `readyButton` and `leave` to the GUI interface (the GUI side not read).
- Goal list: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/tutorials/introductory_tutorial.js` 1-386, with registration at 440-445 (`InitTutorial` on `OnInitGame`, line 444).
- Scripted attack and win: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/tutorials/introductory_tutorial.js` 388-423 (`LaunchAttack`, `IsAttackRepelled`) and 378-384 (final step).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Ordered goal list, one goal live at a time | 28 goal blocks in `introductory_tutorial.js` (count of lines starting with a tab and brace, grep only); 32 in `starting_economy_walkthrough.js` (grep only) |
| A goal that is not yet done waits only for its own events | None (structure, `Tutorial.js` 46-57) |
| A goal already done at entry shows Ready instead of advancing | None (structure, 53-54 and 63-75) |
| Positive delay = one-shot timer that calls `NextGoal` | No positive delay in either tutorial file (grep for `delay`). Timer unit is milliseconds (`Trigger.js` 286 to `Timer.SetTimeout`, `Timer.js` 32-37) |
| `-1` = Ready button, no timer | `-1` (`Tutorial.js` 61, comment; `starting_economy_walkthrough.js` 252, grep only, too short for a receipt) |
| Ready answer must be a `dialog-answer` with `ready` | `"ready"` (`Tutorial.js` 72) |
| Last-goal flag | index equals list length after the increment (`Tutorial.js` 79) |
| Scripted attack command | `attack-walk`, `allowCapture: false`, `queued: false` (`introductory_tutorial.js` 409-416) |
| Repel check | No attacker hit points above 0 (`introductory_tutorial.js` 420-423) |

Donor constants are the only numbers in this file that a designer would tune. The donor has no reward amounts and no rewards at all: the tutorial ends in a win call.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (init, done check, enable only this goal's handlers, timer or Ready, then message and index step). It omits the engine trigger registration (`Tutorial.js` 12-26; the sketch takes handlers as a map on each goal), the prototype-based storage of handlers, the donor's Ready branch that overwrites a goal's own command handler when the goal is already done (69-75; the sketch keeps both), the GUI message fields, and the timer's unit (the donor's is milliseconds; the sketch uses the caller's units). It changes the donor's end guard from `>` to `>=` (line 33), so an index equal to the list length is refused instead of crashing. Restore replays the earlier texts and does not run `Init`, as in the donor.

```ts
// Licence: GPL version 2 or later (donor, binaries/data/). clean-room sketch of the mechanism shape, not a translation of the donor lines.
// clean-room
type Ev =
  | { kind: "gather"; resource: string }
  | { kind: "repair"; targetClass: string }
  | { kind: "kill"; victimClass: string }
  | { kind: "ownershipChanged"; from: number; to: number; entityClass: string }
  | { kind: "ready" };

type Kind = Ev["kind"];
type Handler<S> = (s: S, e: Ev, advance: () => void) => void;

interface Goal<S> {
  text: string;
  delay?: number;                 // > 0: auto-advance after this long (milliseconds in the donor: Trigger.js DoAfterDelay); -1: show a Ready button
  init?: (s: S) => void;          // once, on entry; not repeated on restore
  isDone?: (s: S) => boolean;     // a handler calls advance only when this holds
  on?: Partial<Record<Kind, Handler<S>>>;
}

interface Sink {
  message(text: string, ready: boolean, last: boolean): void;
  after(delay: number, fn: () => void): void;
}

export class GoalRunner<S> {
  private index = 0;
  private live: Partial<Record<Kind, Handler<S>>> = {};
  private readyWaiting = false;

  constructor(private readonly goals: Goal<S>[], private readonly state: S, private readonly sink: Sink) {}

  start(): void {
    this.enter(false);
  }

  // After a reload: step back one goal, replay the earlier texts, re-enter the current goal without init.
  restore(): void {
    this.index = Math.max(0, this.index - 1);
    for (let i = 0; i < this.index; i++) this.sink.message(this.goals[i].text, false, false);
    this.enter(true);
  }

  // Only events that the server emitted from its own event log may reach this method.
  send(e: Ev): void {
    if (e.kind === "ready") {
      if (this.readyWaiting) this.advance();
      return;
    }
    const h = this.live[e.kind];
    if (h) h(this.state, e, () => this.advance());
  }

  private advance(): void {
    this.enter(false);
  }

  private enter(restoring: boolean): void {
    if (this.index >= this.goals.length) return;   // end of list
    const g = this.goals[this.index];
    if (!restoring && g.init) g.init(this.state);
    const done = g.isDone ? g.isDone(this.state) : false;
    const handlers = g.on ?? {};
    const hasHandlers = Object.keys(handlers).length > 0;
    this.live = handlers;                           // only this goal's events are live
    this.readyWaiting = false;

    let needDelay = true;
    if (hasHandlers && !done) needDelay = false;    // a goal not yet done waits for its events
    if (g.delay || needDelay) {
      if (g.delay !== undefined && g.delay > 0) this.sink.after(g.delay, () => this.advance());
      else this.readyWaiting = true;
    }

    const last = this.index + 1 === this.goals.length;
    this.index += 1;
    this.sink.message(g.text, this.readyWaiting, last);
  }
}

// Example: a short quest in the same shape.
interface QState { kills: number }
const cutpurseQuest = (s: QState): boolean => s.kills >= 3;

export const exampleGoals: Goal<QState>[] = [
  { text: "Speak to the trainer.", delay: -1 },
  {
    text: "Defeat three cutpurses.",
    init: (s) => { s.kills = 0; },
    isDone: cutpurseQuest,
    on: {
      kill: (s, e, advance) => {
        if (e.kind !== "kill" || e.victimClass !== "Cutpurse") return;
        s.kills += 1;
        if (cutpurseQuest(s)) advance();
      },
    },
  },
];

export {};
```

## 5. Lands in

- TARGET `origins/quests/goal-runner.ts` (proposed new file; the Frankendom repo was not read in this pass). Parity-checklist row 21 (catalogue fields): the goal list is content data (text, delay, guards), so it belongs in the catalogue. The reward leg (ledger credit when a step completes) is row 18 and is not in this donor.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one engine, server-verified (named rulings from the addendum; the numbered brief rules were not read)

## 6. Gaps and risks

- Client-driven advance. In the donor, handlers run from player command messages (`OnPlayerCommand`, lines 7-11 of the intro list) and from the Ready answer. Frankendom must advance a step only from server-emitted events (a confirmed kill, a ledger write, a zone entry). A client ready answer is a request, and the server honours it only while the step is in ready-waiting state.
- Licence GPL v2 or later: shape only. The sketch is clean-room.
- Rewards. The donor grants nothing for a step. Frankendom quest rewards go through the one ledger (row 18), not through the goal runner.
- Zones as data. The donor's goal lists are JavaScript written per map. Frankendom needs them as data that the server validates at load: an unknown event name, an unknown guard or a missing `text` should refuse the quest.
- Restore. The donor replays text and skips `Init` on load, and it relies on trigger fields that may or may not be saved (engine not read). Frankendom should restore the step index and progress from server state, not from replayed client messages.
- End guard. The donor's `>` at `Tutorial.js` 33 lets the index reach the list length, after which `goal.Init` (39) would throw if `NextGoal` ran again. Whether the GUI can trigger that is not confirmed. The sketch uses `>=`.
- Timers. The donor's `DoAfterDelay` unit is milliseconds of wall time (Trigger.js 286). Frankendom timed steps should count server ticks, not wall time (the server tick sub-line under row 18 / post-K item 3: fixed step, input intake, per-tick NPC budget).
- Ready branch. When a goal is already done at entry, the donor replaces its own `OnPlayerCommand` handler with the Ready listener (`Tutorial.js` 69-75). The sketch keeps both. This was not tested.
- Not read: the C++ side of the engine, the GUI tutorial panel and the GUI sender of `dialog-answer`.

Best transferable idea: Quest steps as an ordered list where each step listens only to its own server-emitted events, advances only when its guard holds, and restores from the step index without re-running setup.
Decision (proposed): adapt — keep the ordered step list, per-step guards and restore rule, but in Frankendom only server-emitted events (a confirmed kill, a ledger write, a zone entry) move a step, and a client ready answer counts only while the server has that step waiting.
Acceptance: a server test asserts that a three-kill quest advances only after three server-confirmed kill events, that a client ready sent while the step is not waiting leaves the step unchanged, and that after reload the player sees each finished step's text once without the current step's init running again.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR.
- Note said the Trigger engine side was 'not in this snapshot' (only C++ searched); Trigger is JS at simulation/components/Trigger.js, DoAfterDelay at 286 = Timer SetTimeout in milliseconds. Confirmed in code.
- Missed: Tutorial.js 39 and 43 assign goal.Init and goal.IsDone onto Trigger.prototype, so each goal's functions are shared global state on the prototype (a goal's Init/IsDone persist into the next goal if it does not define its own). Noted, not reproduced in the sketch.

Fixed 2026-10-12: timer-unit and engine-side claims corrected (milliseconds, Trigger.js), in the Checked line, table, sketch comment, Gaps and Not-read lines.
