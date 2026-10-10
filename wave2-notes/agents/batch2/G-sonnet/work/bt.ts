type Status = "success" | "failure" | "running";

interface Node {
  tick(dt: number): Status;
  halt(): void;
}

// Priority list re-evaluated from the top every tick; a higher branch that wakes up
// halts the lower one that was running.
class ReactiveSelector implements Node {
  constructor(private children: Node[]) {}
  tick(dt: number): Status {
    for (let i = 0; i < this.children.length; i++) {
      const s = this.children[i].tick(dt);
      if (s === "running") {
        this.children.forEach((c, j) => { if (j !== i) c.halt(); });
        return "running";
      }
      if (s === "success") {
        this.children.forEach((c, j) => { if (j !== i) c.halt(); });
        return "success";
      }
    }
    this.halt();
    return "failure";
  }
  halt(): void { this.children.forEach((c) => c.halt()); }
}

// Gate then act: any failing condition aborts the branch the same tick.
class ReactiveSequence implements Node {
  constructor(private children: Node[]) {}
  tick(dt: number): Status {
    for (let i = 0; i < this.children.length; i++) {
      const s = this.children[i].tick(dt);
      if (s === "running") {
        this.children.forEach((c, j) => { if (j !== i) c.halt(); });
        return "running";
      }
      if (s === "failure") { this.halt(); return "failure"; }
    }
    this.halt();
    return "success";
  }
  halt(): void { this.children.forEach((c) => c.halt()); }
}

// Tick-time timeout (the donor uses a wall-clock timer thread; a fixed step is the
// deterministic equivalent for a server tick).
class Timeout implements Node {
  private elapsed = 0;
  constructor(private ms: number, private child: Node) {}
  tick(dt: number): Status {
    this.elapsed += dt;
    if (this.elapsed >= this.ms) { this.halt(); return "failure"; }
    const s = this.child.tick(dt);
    if (s !== "running") this.elapsed = 0;
    return s;
  }
  halt(): void { this.elapsed = 0; this.child.halt(); }
}

class Cond implements Node {
  constructor(private f: () => boolean) {}
  tick(): Status { return this.f() ? "success" : "failure"; }
  halt(): void {}
}

class Act implements Node {
  constructor(private f: (dt: number) => Status, private onHalt: () => void = () => {}) {}
  tick(dt: number): Status { return this.f(dt); }
  halt(): void { this.onHalt(); }
}

// Example brain: flee beats chase, chase beats idle, re-evaluated every tick.
interface Mob { hpFrac: number; targetDist: number; leash: number; state: string; }
function buildBrain(m: Mob): Node {
  return new ReactiveSelector([
    new ReactiveSequence([new Cond(() => m.hpFrac < 0.2), new Act(() => { m.state = "flee"; return "running"; })]),
    new ReactiveSequence([
      new Cond(() => m.targetDist < m.leash),
      new Timeout(8000, new Act(() => { m.state = "chase"; return "running"; })),
    ]),
    new Act(() => { m.state = "idle"; return "running"; }),
  ]);
}
export {};
