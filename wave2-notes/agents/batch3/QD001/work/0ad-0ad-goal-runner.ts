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
