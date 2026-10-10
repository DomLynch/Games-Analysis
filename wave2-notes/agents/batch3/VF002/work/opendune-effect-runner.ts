// Licence: GPL-2.0 (donor). Clean-room: shape only, written from the described mechanism; no donor lines reproduced.
export type Step =
  | { kind: "sprite"; id: number }
  | { kind: "wait"; ticks: number }
  | { kind: "randomWait"; maxTicks: number }
  | { kind: "shake"; cycles: number }
  | { kind: "decal" }
  | { kind: "stop" };

export interface Hooks {
  sprite(id: number): void;
  decal(): void;
  shake(cycles: number): void; // must not block; the render loop plays it
}

interface Running {
  key: string;
  steps: readonly Step[];
  index: number;
  dueTick: number;
  done: boolean;
}

export class EffectRunner {
  private readonly active: Running[] = [];
  private refusedCount = 0;

  constructor(
    private readonly maxActive: number,
    private readonly randomUpTo: (max: number) => number, // assumed inclusive; donor LCG range not read
  ) {}

  get refused(): number {
    return this.refusedCount;
  }

  // Starts an effect. An effect already running on the same key is stopped first.
  start(key: string, steps: readonly Step[], now: number): boolean {
    for (const e of this.active) {
      if (e.key === key) e.done = true;
    }
    const live = this.active.filter(e => !e.done).length;
    if (live >= this.maxActive) {
      this.refusedCount += 1; // refused and counted, never silently dropped
      return false;
    }
    this.active.push({ key, steps, index: 0, dueTick: now, done: false });
    return true;
  }

  // Run once per 1/60 s tick. Each effect runs at most one step per call.
  tick(now: number, hooks: Hooks): void {
    for (const e of this.active) {
      if (e.done || e.dueTick > now) continue;
      if (e.index >= e.steps.length) {
        e.done = true;
        continue;
      }
      const step = e.steps[e.index++];
      switch (step.kind) {
        case "sprite": hooks.sprite(step.id); break;
        case "wait": e.dueTick = now + step.ticks; break;
        case "randomWait": e.dueTick = now + this.randomUpTo(step.maxTicks); break;
        case "shake": hooks.shake(step.cycles); break;
        case "decal": hooks.decal(); break;
        case "stop": e.done = true; break;
      }
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].done) this.active.splice(i, 1);
    }
  }
}

export {};
