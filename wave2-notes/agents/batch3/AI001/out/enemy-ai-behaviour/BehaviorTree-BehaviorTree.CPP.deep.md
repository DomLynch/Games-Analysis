# BehaviorTree-BehaviorTree.CPP (enemy-ai-behaviour, cell 1)

Donor: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/controls/reactive_sequence.cpp` (plus `reactive_fallback.cpp`, `sequence_node.cpp`, `parallel_node.cpp`, `src/tree_node.cpp`, `include/behaviortree_cpp/decorators/script_precondition.h`, `src/bt_factory.cpp`) | Licence: MIT (`LICENSE` line 1: "The MIT License (MIT)"; reactive_sequence.cpp header is an MIT-style notice, Faconti/Eurecat 2020-2025) | C++ | symbol `ReactiveSequence::tick`, `ReactiveFallback::tick`, `Tree::tickRoot`, `TreeNode::executeTick`

Checked: Read in full: `reactive_sequence.cpp`, `reactive_fallback.cpp`, `sequence_node.cpp`, `parallel_node.cpp`, `tree_node.cpp` (executeTick 71-157, checkPreConditions 204-259), `script_precondition.h`, `decorator_node.cpp` (halt/resetChild), `control_node.cpp` (halt/haltChild/resetChildren), `bt_factory.cpp` (tickRoot 762-811), `tree_node.h` (precondition doc 47-68). Partly read: `src/xml_parsing.cpp` (only the precondition attribute group 1565-1570), `CHANGELOG.rst` (grep only). Candidate files opened: 9 (the list above plus `bt_factory.h`). Confidence: high on tick order, halt rules and the tick loop (read end to end). Medium-high on the stale-latch defect in section 6: read from code, not executed (no test run; `tests/gtest_preconditions.cpp` was grepped, not read in full). Not read: the leaf node classes under `src/actions` and `src/decorators` (not needed for the control flow). The donor has no enemy AI, no aggro, no utility scoring: only the control-flow machinery of a behaviour tree. camera_scope: not applicable.

Best transferable idea: a per-NPC priority list re-walked from the top every tick, where a higher child that starts RUNNING halts the lower ones and each guard is an explicit node, so an ability choice can interrupt a running action without a hidden timer.
Decision (proposed): adapt - take the reactive priority selector and the per-tick `_while`-style guard; drop the XML, script-string and blackboard runtime, which costs too much per NPC on a small server. Fix the missing latch reset on halt (section 6) by re-checking guards on every tick; the latch itself is an intended donor fix, kept only as a wait-gate.
Acceptance: a test NPC with the priority list "attack while hp > 30%, else back off" switches from attack to back-off on the first tick its hp falls to 30% or below, and after a halt (the NPC knocked out of the fight and re-engaged) the guard is checked again on the next tick (no stale state).

## 1. Mechanism

- The driver is `Tree::tickRoot` (bt_factory.cpp 762-811). Each pass calls `rootNode()->executeTick()` (786). When a tick returns RUNNING and `sleep_time > 0` it sleeps (800-803). The caller chooses the cadence; the default for `tickWhileRunning` is a 10 ms sleep (bt_factory.h 165). There is no fixed-step accumulator in the tree itself. For `tickOnce`, an inner loop re-ticks while a wake-up signal is pending (788-794, read, not receipted).
- Order of steps inside every node tick (`TreeNode::executeTick`, tree_node.cpp 71-157): (a) pre-conditions are checked first (86); if one decides the status, the node's own `tick()` is skipped; (b) otherwise the optional pre-tick callback may substitute a status; (c) `tick()` runs (115); (d) if the status is SUCCESS or FAILURE, the post-conditions run (137-140); (e) status is stored (154-155).
- Pre-conditions (checkPreConditions 204-259) are checked in the order FAILURE_IF, SUCCESS_IF, SKIP_IF, WHILE_TRUE. The first three are evaluated only while the node is IDLE or SKIPPED (223). WHILE_TRUE is also evaluated while RUNNING (247-255): if it is false the node is halted and returns SKIPPED. This is documented as the only pre-condition that can interrupt a running node (tree_node.h 60-64).
- ReactiveSequence (reactive_sequence.cpp 25-91): every tick starts at child 0 again. A child that returns RUNNING halts all other children (47-53), records the running index, and the node returns RUNNING (64). A FAILURE child resets all children and returns FAILURE (67-69). A SUCCESS child moves on. If all children succeed, all children are reset and the node returns SUCCESS, or SKIPPED if every child was skipped (87-90).
- ReactiveFallback (reactive_fallback.cpp 25-91) is the mirror image: FAILURE moves on to the next option (67-68); a SUCCESS child resets and returns SUCCESS (70-72); RUNNING halts siblings and returns RUNNING; if no option succeeds it returns FAILURE (90). The priority order is the child order, so ability choice is "first option whose guard holds and whose action can start".
- Plain Sequence (sequence_node.cpp 39-104) is the contrast. It keeps `current_child_idx_` across ticks (50-60): while child k is RUNNING it returns RUNNING and does not re-check children 0..k-1. It is reset only on FAILURE (62-66), on completion (96-101) or by halt (34).
- ParallelNode (parallel_node.cpp 40-132): a child that has completed is not ticked again (74). Success threshold defaults to -1, meaning all children, with skipped children counted as successes (113). Failure threshold defaults to 1: the node fails at the first failed child (122-123).
- There is no utility scoring, no goal planner, no aggro table, no leash and no pathfinding in this donor. The "choice" is only the child order plus guards.

## 2. Key functions

- `ReactiveSequence::tick`: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/controls/reactive_sequence.cpp` 25-91.
- `ReactiveFallback::tick`: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/controls/reactive_fallback.cpp` 25-91.
- `SequenceNode::tick` (plain, index kept between ticks): `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/controls/sequence_node.cpp` 39-104.
- `ParallelNode::tick`: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/controls/parallel_node.cpp` 40-132.
- `TreeNode::executeTick` and `checkPreConditions`: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/tree_node.cpp` 71-157 and 204-259.
- `PreconditionNode::tick` (the `<Precondition if= else=>` decorator, with its latch): `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/include/behaviortree_cpp/decorators/script_precondition.h` 63-90.
- `ControlNode::halt`, `haltChild`, `resetChildren`: `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/control_node.cpp` 32-63.
- `Tree::tickRoot` (the driver loop): `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/bt_factory.cpp` 762-811.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| Priority selector: first child that succeeds wins; a RUNNING child halts siblings | No numbers. Child order is the priority. |
| Guard re-checked on every tick (`_while`, WHILE_TRUE) | Rule, not a number: false while RUNNING halts and returns SKIPPED (tree_node.cpp 251-254). |
| Guards on IDLE/SKIPPED only (`_failureIf`, `_successIf`, `_skipIf`) | Rule: evaluated only while IDLE or SKIPPED (tree_node.cpp 223). |
| Driver sleep between ticks | 10 ms default (bt_factory.h 165). This is a polling cadence for a standalone loop. Do not port it: the Frankendom server tick is fixed-step (post-K item 3). |
| Parallel: all children must succeed | Success threshold -1 (parallel_node.cpp 35); skipped children count as successes (113). |
| Parallel: first failure fails the node | Failure threshold 1 (parallel_node.cpp 36, 123). |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's priority-selector rules (a RUNNING child halts its siblings, FAILURE moves to the next option, SUCCESS ends the selector and resets it), and the `_while` guard that is checked on every tick. It omits the blackboard ports, the XML loader, the script-string pre-conditions, the post-conditions and callbacks, the wake-up signal, the parallel node, the sleep cadence, and the donor's single-RUNNING exception (off by default in the donor; not implemented here). It also changes one donor behaviour: the guard is always re-checked, so there is no latch (section 6, defect 1). The Frankendom per-tick NPC budget is not in the donor and is not in the sketch.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/ai001-bt-reactive-brain.ts` on the VPS (TypeScript 7.0.2): exit 0. The local quality hook could not check it on the Mac (no tsc there); the VPS check is the one that counts.

## 5. Lands in

- TARGET `src/fight/brain.ts` (new module: the engine's per-NPC decision step; the brain chooses intent, the engine resolves hits and kills).
- Parity-checklist row 2 (AI brain). Row 4 (fight loop: aggro, chase, leash) consumes its output but does not own the mechanism.
- Reuse tag: adapt-permitted (MIT: code may be adapted, attribution kept); the sketch above is clean-room and was not copied from the donor.
- Brief rule served: 2 (AI brain: one brain step per NPC per server tick; guards are explicit nodes in one engine); the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" is for the caller, not this module.

## 6. Gaps and risks

- Defect 1, latch never reset on halt (keep the idea, fix the defect). The latch itself is a deliberate patch: CHANGELOG.rst 479 "Fix Precondition to only check condition once (#904)" (also 706 "reduce the number of times preconditions scripts are executed", 726 "don't execute preconditions if state is RUNNING"), and script_precondition.h 29-30 documents it. Only the missing `halt()` reset is the defect. `PreconditionNode` (`<Precondition if= else=>`) sets `_children_running = true` once its child starts (script_precondition.h 76) and clears it only when the child completes (84-87). It has no `halt()` override, and `DecoratorNode::halt` resets only the child (decorator_node.cpp 32-36, 53-64). A parent that halts it mid-run (ReactiveFallback halting siblings, control_node.cpp 60) therefore leaves the latch set. On re-entry the if-script is not evaluated and the child ticks at once, even when the guard is false. This is from reading the code and was not executed. Fix: clear the latch in `halt()`, or (our choice) re-check every guard on every tick with no latch. The donor also ships `IfThenElse` and `WhileDoElse` (bt_factory.cpp 132-133) and a `TryCatch` node (CHANGELOG 301): `WhileDoElse` gives the same "guard re-checked every tick, else branch" behaviour without the latch and is a closer fit than a bare `WhileGuard`; the sketch's guard-plus-fallback pair is equivalent.
- Defect 2, contradictory documentation. `tree_node.h` 66-67 says that `<Precondition else="RUNNING">` re-evaluates "on every tick"; the decorator's own doc (script_precondition.h 29-30) and the code (76) say it does not re-evaluate once the child has started. Fix: use the guard node (`WhileGuard` in the sketch), which is checked every tick; document the latch as a wait-gate only (it is correct before the child starts).
- Defect 3, `_failureIf` on a running node is not re-checked (tree_node.cpp 223; tree_node.h 53-55). A guard that should cancel an ability in progress must be a sibling in a reactive selector, not an attribute on the running node. Fix: state this rule in the Frankendom brain format.
- Open design gap, not a donor bug: switching a running option to a different one is silent (the single-RUNNING exception is off, reactive_sequence.cpp 18). For a fight this is a state change (engage, disengage, stagger) and must be a visible transition in the fight record (row 19). Fix: emit a transition event on every switch.
- Cost on a small server (not in the donor): a reactive selector re-walks from the root every tick, so cost is proportional to the nodes visited per NPC per tick, with no caching and no budget. Frankendom needs a per-tick NPC budget outside the tree (the server tick sub-line), and each NPC's list must stay short (a handful of nodes), with expensive checks (line of sight, path) cached per tick by the engine.
- MAX_ATTACKERS = 3: the donor has no group role or slot logic. The "may I attack now" answer must come from the engine as a guard leaf (for example a slot grant), not from the tree.
- One ledger and server-verified kills: leaves in the donor write to a shared blackboard. Here leaves may only request engine actions (move, ability start); damage and death stay in the engine's single damage step (row 1).
- Zones as data: the donor's trees are XML, with leaves that are C++ classes registered by name (bt_factory.cpp 130-131). A new enemy brain is one data row only if its leaves already exist; a new leaf is code. The XML and script parser is too heavy per NPC in a browser: use a JSON row list in zone data, with leaves in code.
- Pit as client: the brain runs in the engine for both the world and the Pit; the Pit only renders the intent.

## 7. As-data shape (PASS2 item 1)

- Donor data: BT XML trees. Schema for the pre-condition attributes is in `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/src/xml_parsing.cpp` 1565-1570 (`_failureIf`, `_skipIf`, `_successIf`, `_while`, all optional strings). Trees are embedded XML in `tests/gtest_preconditions.cpp` (for example 154 `<KeepRunning _while="B==0" />`, read as a grep hit only).
- Row fields for one tree node (from the schema read): element name = node type (must be registered: `registerNodeType<ReactiveFallback>` at bt_factory.cpp 131); attributes = named ports (strings, not read in full) plus the reserved pre-conditions above (strings holding scripts); children = ordered list.
- A new enemy brain is one row: yes, if all its leaf types already exist (why: leaves are registered C++ classes, so a row can only combine them). A new leaf type is code, not a row (no).

## 8. Provenance and history (PASS2 items 2 and 3)

- Provenance per claim: repo BehaviorTree/BehaviorTree.CPP, MIT (LICENSE line 1), files and lines as in the receipts; the donor has no `.git` directory in the box, so no commit history is available.
- Patch history from `/mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP/CHANGELOG.rst`: line 308 "Fix #917: add comments about preconditions" (the precondition docs were patched by comment, not by behaviour, which is why the doc contradiction in section 6 survived); line 302 "Fix #1111: EntryUpdatedDecorator::halt() not halting its child" (a halt-propagation bug of the same family as defect 1, fixed for one decorator only); line 256 "Fix WakeUp test flakiness by using steady_clock" (tick wake-up timing, test-only). The precondition latch itself is a changelog item: line 479 "Fix Precondition to only check condition once (#904)" (plus 706 and 726 on running-state precondition re-runs), so it was an intended patch; no entry covers the missing halt reset.

## 9. Rulings for Dom (PASS2 item 4)

1. Should each enemy run one reactive priority list re-checked every tick (short list, guards as engine predicates), or a plain state machine per NPC with explicit enter and exit events? Recommendation: the priority list for the top level only, with at most about six nodes per NPC.
2. May a running ability be replaced mid-action by a higher-priority one (chase to attack, attack to back-off)? Recommendation: yes, through an explicit halt and a transition event recorded in the fight record.
3. Do we allow an XML or script parser for enemy brains in the browser? Recommendation: no; brains are JSON rows in zone data, and leaves are code.

## Reuse tag

adapt-permitted (MIT). Clean-room sketch written from the mechanism; no lines copied.

## Brief rule served

2 (AI brain: one brain step per NPC per server tick; guards are explicit nodes; the engine owns the choice and the damage).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- "What they patched later" was wrong: CHANGELOG.rst 479 (#904), 706 and 726 document the precondition latch as a deliberate fix; only the missing halt reset is a defect (confirmed).
- Header attribution Faconti/Eurecat vs LICENSE copyright Colledanchise: the note quotes LICENSE line 1 only, fine.
- Missed: IfThenElse and WhileDoElse registered (bt_factory.cpp 132-133) as a latch-free guard; TryCatch node (CHANGELOG 301) (confirmed).

Fixed 2026-10-12: Decision wording, Defect 1 reframed (latch is intended, halt reset is the defect), changelog line corrected, IfThenElse/WhileDoElse/TryCatch added. Sketch unchanged.
