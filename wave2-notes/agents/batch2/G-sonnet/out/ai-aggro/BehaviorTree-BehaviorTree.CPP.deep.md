# BehaviorTree-BehaviorTree.CPP (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/controls/reactive_fallback.cpp` | Licence: MIT (LICENSE line 1, "The MIT License (MIT)"; sources carry the standard MIT permission text) | C++ | symbol `ReactiveFallback::tick`

Checked: Read in full `reactive_fallback.cpp` (1-99), `reactive_sequence.cpp` (1-99), `fallback_node.cpp` (1-103), `sequence_node.cpp` 28-100, `control_node.cpp` 20-81 and `decorators/timeout_node.cpp` (1-81). The donor is a generic behaviour-tree library: it has NO aggro, threat table, target selection, chase or flee code (grep for aggro/threat/flee/chase over include/ and src/ found nothing). What it does hold is the exact mechanism an enemy brain is built from: priority re-evaluation every tick with preemption. Confidence the mechanism is real and transferable: high. Confidence it answers "aggro" as such: low, it is the brain scaffolding only.

## 1. Mechanism

- A fallback ("selector") node is an ordered priority list of children. Each child returns success, failure, running (or skipped). In the plain `Fallback`, the node remembers an index (`current_child_idx_`); once a child returns running it returns running immediately on later ticks without looking at the earlier children again (fallback_node.cpp 42-53). A low-priority action that started therefore keeps running even if a higher-priority condition becomes true.
- `ReactiveFallback::tick` (reactive_fallback.cpp 25-91) has no remembered index. Every tick it walks children from index 0 and ticks each in order (34-37). Per child result: running -> halt every other child that is running, remember the running index, return running (44-64); failure -> go on to the next child (67-68); success -> `resetChildren()` (halt running ones, reset status) and return success (70-73). If the loop ends, every child failed: reset children and return failure (87-90).
- Consequence: put the cheap guard-style children first (a condition that returns success when "hp is low, flee" and an action under it), the chase branch next, idle last. When the flee branch starts returning running, the chase branch that was running last tick is halted the same tick (51). When flee stops, the next tick re-picks chase from scratch. No event hooks, no state machine transitions to write.
- `ReactiveSequence` (reactive_sequence.cpp 25-91) is the same idea for "all of these must hold": every tick ticks from child 0; a failure anywhere resets children and fails the whole branch (67-70); running halts the others and returns running (44-65). Use it as `[condition(target within leash), action(chase)]` so leaving the leash aborts chase the very tick it happens.
- `haltChild` (control_node.cpp 55-63) only calls `haltNode()` on a child whose status is running, then resets its status. So the halt call is the place where an action cleans up (e.g. stop an attack wind-up).
- `TimeoutNode` (timeout_node.cpp 18-72): arms a timer on the first tick (36), ticks the child; if the timer fires while the child is still running it halts the child and the node returns failure (48-60). Wrapping a chase in a timeout makes "give up the chase after N ms" a one-line tree edit and lets the selector fall through to the next branch.
- Tick: the whole tree is ticked from the root once per application tick; the library never loops by itself (no loop in these files).

## 2. Key functions

- `ReactiveFallback::tick`: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/controls/reactive_fallback.cpp` 25-91. Priority re-evaluation with preemption.
- `ReactiveSequence::tick`: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/controls/reactive_sequence.cpp` 25-91. Guard-then-act that aborts the tick a guard fails.
- `FallbackNode::tick`: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/controls/fallback_node.cpp` 31-94. The non-reactive contrast: remembers the running child.
- `ControlNode::haltChild` / `resetChildren`: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/control_node.cpp` 38-63. Halts only running children.
- `TimeoutNode::tick`: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/decorators/timeout_node.cpp` 18-72. Give-up timer around a child.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Re-tick from child 0 each tick; first running child wins and halts the rest | None in the library |
| Success/failure/running tri-state per node | None |
| Halt only the nodes that were running (cheap cleanup) | None |
| Timeout around a branch; halt then failure | Per-use `msec` port, no default (theirs, header lines 71-72); Frankendom chooses the give-up time as zone/creature data |

The donor ships no numbers for AI; every threshold (hp for flee, leash, timeout) would be Frankendom data.

## 4. TypeScript sketch

simplified: omits the skipped status, the async and wake-up variants, the multiple-running exception switch, blackboard/ports, XML tree loading and the timer thread (the timeout here counts the tick step, so it is deterministic). On a selector success the sketch halts the other children; the donor calls resetChildren, which is the same for running children. Written from the described mechanism (MIT, so adaptation is allowed, but this is not a copy).

```ts
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
```

## 5. Lands in

- TARGET `src/fight/brain.ts` (new, creature brain evaluated inside the engine tick). Parity-checklist row 2 (AI brain); also feeds row 4 (aggro, chase, leash).
- The leaves (`target within leash`, `hp below flee line`) read the engine's hate list and the engine target pick; the tree only decides which behaviour is active.
- Reuse tag: adapt-from-idea (MIT; code may be adapted)
- Brief rule served: many-on-one logic stays in the engine; zones as data (tree thresholds are creature data)

## 6. Gaps and risks

- No aggro, threat or target-selection code exists here. This note covers the brain scaffold, not "who do I hate". Do not cite it as an aggro source.
- MAX_ATTACKERS = 3: the tree has no notion of attacker slots. A slot-claim leaf would have to live in the engine and return failure when the three slots are taken, so the selector falls to a circle/wait branch.
- Server-verified kills and one ledger: leaves must only write intent (move, swing request); the engine step decides damage. Never let a leaf change health.
- Determinism: the donor's timeout uses a wall-clock thread timer. For replay (row 19) use tick counts, as the sketch does.
- Cost: re-ticking from child 0 each tick evaluates all guards for every creature every tick. Needs a per-tick NPC budget; the donor has none (not read, none found).
- Not read: the XML loader, ports/blackboard, async/wake-up paths, parallel nodes.
