// Licence: GPL-3.0-or-later donor (copyleft). Clean-room shape only, written from the described mechanism.
type Wake =
  | { kind: "none" }
  | { kind: "time"; until: number }       // wait(seconds), converted to game ms
  | { kind: "entity"; entityId: number }  // waitFor(entity): woken by that entity's done notify
  | { kind: "thread"; threadId: number }; // waitForThread: woken when that script ends

type StepResult = { parked: true; wake: Wake } | { parked: false };

interface Script {
  readonly id: number;
  // Runs statements until the script parks or ends, or the budget is spent (then parks with wake none).
  step(budget: number): StepResult;
}

class Scheduler {
  private now = 0;
  private readonly scripts = new Map<number, Script>();
  private readonly wakes = new Map<number, Wake>();
  private readonly epoch = new Map<number, number>();   // fix: a newer resume supersedes an older one
  private due: Array<{ at: number; id: number; epoch: number }> = [];
  overBudget = 0;                                       // fix: over-budget resumes are counted, not fatal

  constructor(private readonly budgetPerResume: number) {}

  add(s: Script): void {
    this.scripts.set(s.id, s);
    this.resume(s.id, this.now);
  }

  // One pending resume per script: scheduling a new one cancels the old one (donor CancelEvents).
  private resume(id: number, at: number): void {
    const e = (this.epoch.get(id) ?? 0) + 1;
    this.epoch.set(id, e);
    this.due.push({ at, id, epoch: e });
  }

  private resumeNow(id: number): void {
    this.wakes.set(id, { kind: "none" });
    this.resume(id, this.now);
  }

  // Several scripts may wait on one entity; each gets its own wake (fix: no single shared slot).
  entityDone(entityId: number): void {
    for (const [id, w] of this.wakes) {
      if (w.kind === "entity" && w.entityId === entityId) this.resumeNow(id);
    }
  }

  advance(now: number): void {
    this.now = now;
    const ready = this.due.filter((d) => d.at <= now).sort((a, b) => a.at - b.at || a.id - b.id);
    this.due = this.due.filter((d) => d.at > now);
    for (const d of ready) {
      if (this.epoch.get(d.id) !== d.epoch) continue; // stale resume
      const s = this.scripts.get(d.id);
      if (!s) continue;
      this.wakes.set(d.id, { kind: "none" }); // waits are cleared before the script runs
      const r = s.step(this.budgetPerResume);
      if (!r.parked) {
        this.scripts.delete(d.id);
        this.wakes.delete(d.id);
        this.threadEnded(d.id);
        continue;
      }
      if (r.wake.kind === "none") {
        this.overBudget++;
        this.resume(d.id, now); // yield and continue next advance
        continue;
      }
      this.wakes.set(d.id, r.wake);
      if (r.wake.kind === "time") this.resume(d.id, r.wake.until); // wait(0) is due at once
    }
  }

  private threadEnded(threadId: number): void {
    for (const [id, w] of this.wakes) {
      if (w.kind === "thread" && w.threadId === threadId) this.resumeNow(id);
    }
  }
}
