// Licence: MIT (donor BehaviorTree.CPP). Clean-room sketch from the described mechanism, not a line-by-line port.
export type Status = "SUCCESS" | "FAILURE" | "RUNNING" | "SKIPPED";

export interface Node {
  tick(): Status;
  halt(): void;
}

// Leaf: a multi-tick action (an ability or a move). Returns RUNNING for ticksToFinish ticks, then SUCCESS or FAILURE.
export class Action implements Node {
  private left = 0;
  constructor(
    private readonly ticksToFinish: number,
    private readonly outcome: () => boolean,
  ) {}
  tick(): Status {
    if (this.left === 0) this.left = this.ticksToFinish;
    this.left -= 1;
    if (this.left > 0) return "RUNNING";
    return this.outcome() ? "SUCCESS" : "FAILURE";
  }
  halt(): void {
    this.left = 0;
  }
}

// While-guard (donor `_while`): checked on every tick; when false it halts the child and returns SKIPPED.
export class WhileGuard implements Node {
  constructor(
    private readonly guard: () => boolean,
    private readonly child: Node,
  ) {}
  tick(): Status {
    if (!this.guard()) {
      this.child.halt();
      return "SKIPPED";
    }
    return this.child.tick();
  }
  halt(): void {
    this.child.halt();
  }
}

// Reactive selector (donor ReactiveFallback). Every tick walks the children from the first one.
// A RUNNING child halts all its siblings; a SUCCESS child ends the selector with SUCCESS.
export class ReactiveFallback implements Node {
  constructor(private readonly kids: Node[]) {}
  tick(): Status {
    let allSkipped = true;
    for (let i = 0; i < this.kids.length; i++) {
      const s = this.kids[i].tick();
      allSkipped = allSkipped && s === "SKIPPED";
      if (s === "RUNNING") {
        this.kids.forEach((k, j) => {
          if (j !== i) k.halt();
        });
        return "RUNNING";
      }
      if (s === "SUCCESS") {
        this.halt();
        return "SUCCESS";
      }
      if (s === "SKIPPED") this.kids[i].halt();
      // FAILURE: fall through to the next child (next option in priority order)
    }
    this.halt();
    return allSkipped ? "SKIPPED" : "FAILURE";
  }
  halt(): void {
    this.kids.forEach((k) => k.halt());
  }
}

// Example priority list for an enemy: re-checked from the top every tick.
export function makeBrain(hp: () => number, inMeleeRange: () => boolean): Node {
  return new ReactiveFallback([
    new WhileGuard(() => hp() > 0.3, new Action(2, () => inMeleeRange())), // attack while not low on health
    new Action(4, () => true), // fallback: back off
  ]);
}

export {};
