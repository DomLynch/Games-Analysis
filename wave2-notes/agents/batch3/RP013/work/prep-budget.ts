// Licence: MIT (donor, Levy Street 2026). This sketch is a re-expression of the mechanism, written fresh; it is not a copy of the donor lines.
// clean-room
type Cls = "actionable" | "visible" | "approaching" | "cosmetic";

interface Unit {
  label: string;
  kind: string;         // cost family, e.g. the label prefix before ':'
  cls: Cls;
  priority: number;     // higher starts first; FIFO within a priority
  run: () => number;    // runs the synchronous part, returns its main-thread ms
}

interface Pending extends Unit {
  seq: number;
  deferred: number;     // frames this unit has been refused
  refused: boolean;
}

export class FrameBudget {
  private frameEma: number;
  private frames = 0;
  private spent = 0;
  private progressUsed = false;
  private firstUsed = false;
  private degrading = false;
  private costs = new Map<string, number>(); // kind -> cost EMA in ms

  // target is the tier's drop threshold in ms; the donor passes a different value per quality tier
  constructor(
    private target: number,
    private minSlice = 1.5,
    private overrunShare = 0.12,
    private unknownCost = 4,
    private costAlpha = 0.3,
    private frameAlpha = 0.2,
    private maxDefer = 30,
    private cosmeticMaxDefer = 240,
    private maxKinds = 64,
  ) {
    this.frameEma = target; // no frame measured yet: assume the whole target is spent
  }

  noteFrame(frameMs: number): void {
    this.spent = 0;
    this.progressUsed = false;
    this.firstUsed = false;
    if (!Number.isFinite(frameMs) || frameMs < 0) return;
    this.frameEma = this.frames === 0 ? frameMs : this.frameEma + (frameMs - this.frameEma) * this.frameAlpha;
    this.frames++;
  }

  setPressure(on: boolean): void {
    this.degrading = on;
  }

  headroom(): number {
    const floor = Math.max(this.minSlice, this.frameEma * this.overrunShare);
    const slice = Math.max(floor, this.target - this.frameEma) - this.spent;
    return slice > 0 ? slice : 0;
  }

  record(kind: string, ms: number): void {
    const ema = this.costs.get(kind);
    if (ema !== undefined) {
      this.costs.set(kind, ema + (ms - ema) * this.costAlpha);
      return;
    }
    if (this.costs.size < this.maxKinds) this.costs.set(kind, ms);
  }

  spend(ms: number): void {
    if (Number.isFinite(ms) && ms > 0) this.spent += ms;
  }

  // ordered rules, first match wins (the donor's order, minus its arrival-cover and legacy switches)
  admit(u: Pending): boolean {
    if (u.cls === "actionable") return true;                       // never gated by budget
    const bound = u.cls === "cosmetic" ? this.cosmeticMaxDefer : this.maxDefer;
    if (u.deferred >= bound) return true;                          // starvation: delay, never drop
    if (u.cls === "cosmetic" && this.degrading) return false;      // pressure
    const known = this.costs.has(u.kind);
    const predicted = this.costs.get(u.kind) ?? this.unknownCost;
    if ((u.cls === "visible" || u.cls === "approaching") && !this.progressUsed && known
        && this.headroom() > 0 && predicted > this.headroom()) {
      this.progressUsed = true;                                    // one piece per frame, even if it does not fit
      return true;
    }
    if (!known) {
      if (this.firstUsed) return false;                            // one unmeasured kind per frame
      this.firstUsed = true;
      return true;
    }
    return predicted <= this.headroom();
  }
}

export class PrepQueue {
  private pending: Pending[] = [];
  private seq = 0;

  constructor(private budget: FrameBudget) {}

  submit(u: Unit): void {
    this.pending.push({ ...u, seq: this.seq++, deferred: 0, refused: false });
    this.pump();
  }

  // once per rendered frame, on the frame boundary
  onFrame(frameMs: number): void {
    this.budget.noteFrame(frameMs);
    for (const p of this.pending) if (p.refused) p.deferred++;
    this.pump();
  }

  // start the highest-priority unit the budget admits; a refused unit lets a lower one run
  private pump(): void {
    for (;;) {
      const order = [...this.pending].sort((a, b) => b.priority - a.priority || a.seq - b.seq);
      let next: Pending | undefined;
      for (const p of order) {
        if (this.budget.admit(p)) {
          next = p;
          break;
        }
        p.refused = true;
      }
      if (next === undefined) return; // park until the next frame or the next arrival
      this.pending.splice(this.pending.indexOf(next), 1);
      const ms = next.run();
      this.budget.record(next.kind, ms);
      this.budget.spend(ms);
    }
  }
}

export {};
