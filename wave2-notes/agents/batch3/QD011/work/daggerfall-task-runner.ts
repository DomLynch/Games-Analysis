// Licence: MIT (donor). Clean-room shape only, written from the described mechanism.
type Ctx = { yieldRequested: boolean };

interface Action {
  readonly kind: "trigger" | "always-on" | "action";
  complete: boolean;
  initialised: boolean;     // fix: init once per arming, tracked on the action itself
  readonly allowRearm: boolean;
  check(ctx: Ctx): boolean; // trigger kinds only
  init(): void;             // action kinds only
  run(ctx: Ctx): void;      // action kinds only
}

class Task {
  private armed = false;
  private readonly persistUntil?: () => boolean; // "until X performed": parked until X is true
  constructor(private readonly actions: Action[], persistUntil?: () => boolean) {
    this.persistUntil = persistUntil;
  }

  get isArmed(): boolean {
    return this.armed;
  }

  // Clearing rearms every action. fix: only on the true->false edge, not on every false check.
  setArmed(value: boolean): void {
    if (value === this.armed) return;
    this.armed = value;
    if (!value) {
      for (const a of this.actions) {
        if (a.allowRearm) a.complete = false;
        a.initialised = false;
      }
    }
  }

  // One task tick, in list order. A "primary" always-on trigger may start or stop the task;
  // later always-on triggers may only start it. Plain triggers are checked only while unarmed.
  tick(ctx: Ctx): void {
    let primaryRan = false;
    for (const a of this.actions) {
      if (a.complete) continue;
      if (a.kind === "always-on") {
        if (!primaryRan) {
          primaryRan = true;
          this.setArmed(a.check(ctx));
        } else if (a.check(ctx)) {
          this.setArmed(true);
        }
      } else if (a.kind === "trigger") {
        if (!this.armed) this.setArmed(a.check(ctx));
      } else if (this.armed) {
        if (!a.initialised) {
          a.init();
          a.initialised = true;
        }
        a.run(ctx);
        if (ctx.yieldRequested) return; // a yield ends this task's tick; remaining actions resume next tick
      }
    }
    if (this.persistUntil) {
      if (this.persistUntil()) {
        this.setArmed(false);
      } else {
        for (const a of this.actions) if (a.allowRearm) a.complete = false; // repeat while parked
      }
    }
  }
}

// fix: the yield flag is consumed at the start of each quest tick, so one yield never costs a whole tick.
function runQuestTick(tasks: Task[], ctx: Ctx): void {
  ctx.yieldRequested = false;
  for (const t of tasks) {
    t.tick(ctx);
    if (ctx.yieldRequested) return;
  }
}

// fix: carry the overshoot instead of resetting to zero; cap catch-up ticks and report the dropped debt.
class FixedStep {
  private acc = 0;
  constructor(private readonly stepSeconds: number, private readonly maxCatchUp: number) {}

  advance(dtSeconds: number, onTick: () => void): number {
    this.acc += dtSeconds;
    let n = 0;
    while (this.acc >= this.stepSeconds && n < this.maxCatchUp) {
      this.acc -= this.stepSeconds;
      onTick();
      n++;
    }
    let dropped = 0;
    if (this.acc >= this.stepSeconds) {
      dropped = this.acc;
      this.acc = 0;
    }
    return dropped; // caller logs or counts it
  }
}

export {};
