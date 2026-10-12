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
