# YarnSpinnerTool-YarnSpinner (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner/VirtualMachine.cs` | Licence: MIT (`LICENSE.md` line 1: "The MIT License (MIT)"; copyright Yarn Spinner Pty. Ltd., Secret Lab Pty. Ltd., and Yarn Spinner contributors) | C# | symbol `VirtualMachine.Continue` (with `Dialogue.SetSelectedOption` and `RandomBestLeastRecentlyViewedSaliencyStrategy.QueryBestContent`)

Checked: Read in full: `VirtualMachine.cs` 278-550 (execution states, `SetSelectedOption`, `Continue`, `ReturnFromNode`, `CheckCanContinue`), `RunLine`/`RunCommand`/`AddOption`/`ShowOptions` (552-726), the variable push/store opcodes (752-841, except the bit that loads a stored value's type, which is in 752-788 and read), the saliency opcodes (892-1000), `ExecuteJumpToNode` (1008-1044). Read in full: `Saliency/RandomBestLeastRecentlyViewedSaliencyStrategy.cs` and `Saliency/BestLeastRecentlyViewedSaliencyStrategy.cs`. Read in part: `Dialogue.cs` 860-862 and 912-920; `Library.cs` 200-212; `Compiler.cs` 1714-1742; `NodeGroupCompiler.cs` 76-104 and 180-266. Not read: `VirtualMachine.cs` 728-751 (push-string/float/bool, JumpIfFalse, Pop, CallFunc dispatch) and 1066-1169 (`CallFunction`); the `once` variable's writer; `GetBooleanOperatorCountInExpression`; the smart-variable evaluator. Callers: `SetSelectedOption` has one non-test caller, the public wrapper at `Dialogue.cs` 862; `VirtualMachine.Continue` is called from `Dialogue.cs` 920 (other callers outside `YarnSpinner/` not checked). Confidence: high on the park/resume path, the choice path and the saliency pick; medium on the node-group hub detour details (the hub code was read at 250-266 only). Not a camera donor, so no `camera_scope` tag.

Best transferable idea: Let a conversation hold its place (program counter and pending options) in a small VM that parks at each line, command and menu until the client answers, and pick among conditional variants by least-viewed-then-most-specific with a random tie-break, both reading and writing one variable store.

Decision (proposed): adapt - take the parked-script VM and the least-viewed variant pick for quest-stage and NPC dialogue, with the variable store being the server's one ledger and commands being server-validated grants, not client text.
Acceptance: A server test runs a three-option NPC node where one option is disabled: the disabled option is rejected by `choose`, the same variant is not picked twice in a row when two variants pass, and a reward command only changes the ledger through the server's grant function (the client never sees a writable store).

## 1. Mechanism

- A conversation is a compiled list of instructions. A VM runs it and parks in three cases: at a line or command, waiting for the client to call `Continue` (`LineHandler` at 584, `CommandHandler` at 627, `WaitingForContinue` at 590 and 633); at a menu, waiting for `SetSelectedOption` (`WaitingOnOptionSelection` at 711); or at the end of the script.
- Options: each `AddOption` pops its substitutions and an optional condition flag, then appends `{line, destination, enabled}` to `state.currentOptions` (638-688). `ShowOptions` (690-726) stops the run if the list is empty (692), otherwise parks in `WaitingOnOptionSelection` and hands the set to the client (711, 716). The client calls `SetSelectedOption(i)` (389): it rejects a state other than waiting-on-options, pushes the chosen destination and a `true` flag (or `false` for the no-choice sentinel), clears the list, and sets `WaitingForContinue` (423). Options with a failed condition are still passed to the client with `enabled = false`; the donor does not refuse them in `SetSelectedOption` (the range check only).
- Resume: `Continue` (443) returns early if already inside a run (`isContinuing`), calls `CheckCanContinue` (530; throws if there is no node, if it is still waiting on an option, or if no handler is set), then runs the `while` loop at 471 while the state is `Running`: run one instruction, advance the program counter, and when the counter passes the end call `ReturnFromNode` (481), set `Stopped` and fire `DialogueComplete`.
- Completion counter: `ReturnFromNode` (496) fires `NodeCompleteHandler` and, if the node has a tracking variable, reads it and writes `+1` back (505-511). Tracking variables are set at compile time for tracked nodes and node groups (`Library.cs` 209 names them `$Yarn.Internal.Visiting.<node>`; `NodeGroupCompiler.cs` 227 writes the header for a tracked node group).
- Variables: `StoreVariable` writes the top of the stack straight into `IVariableStorage` (825). `PushVariable` reads the store, and if the store has no value it uses the program's declared initial value (789); if neither exists it throws. So the declared default in the script is the fallback, not the store.
- Commands: `RunCommand` (595-637) replaces `{n}` markers with stacked values and passes the resulting text to `CommandHandler` (627). The VM does not interpret the text.
- Conditional variants (node groups and line groups): a `when:` header compiles to a boolean and a smart variable (`NodeGroupCompiler.cs` 76-104). The hub node adds each member as a candidate with its complexity score and its pass/fail count (`AddSaliencyCandidateFromNode`, 908-955 in the VM; emitted at `NodeGroupCompiler.cs` 250), then `SelectSaliencyCandidate` (266) asks the strategy. On a pick the VM checks it is a real candidate, calls `ContentWasSelected` (977, which adds one to its view count), pushes the destination and `true`, and the hub jumps there; with no pick it pushes `false` and the hub returns (`NodeGroupCompiler.cs` from 266 on, shape read, not line-checked past 266).
- Selection (default strategy, `VirtualMachine.cs` 242): drop candidates with any failing condition (`Random` 63); group the rest by view count and keep the group with the fewest views (93-94); inside it keep the highest complexity (99-100); pick one uniformly at random (104). The view count lives in the store under `$Yarn.Internal.Content.ViewCount.<id>` (`ContentSaliencyOption.cs` 78) and goes up by 1 on commit (`Random` 55-56).
- Complexity per `when:` header (`Compiler.cs` 1714-1742): `when: always` is 0 (1724-1727); `once` adds 1 (1732-1734, the line is too short for a receipt); an expression adds its boolean-operator count plus 1 (1739). The node group sums its headers (`NodeGroupCompiler.cs` 104) and writes the total as a header (191).
- Timing: none. The VM has no clock and runs only when the client calls `Continue` or `SetSelectedOption` (`Dialogue.cs` 920, 862). Nothing runs per frame. The `while` loop has no step cap: a script with a loop and no line, command or menu would run to completion in one call (read the loop at 471; no cap seen).

## 2. Key functions

- `VirtualMachine.SetSelectedOption`: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner/VirtualMachine.cs` 389-424. Choice gate: state check, index range check, push destination, clear options, set `WaitingForContinue`.
- `VirtualMachine.Continue`: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner/VirtualMachine.cs` 443-494 (loop at 471). Resume: re-entry guard, `CheckCanContinue`, run until park or end, completion.
- `VirtualMachine.ShowOptions` case: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner/VirtualMachine.cs` 690-727. Empty menu stops; otherwise park and hand the set out.
- `VirtualMachine.ReturnFromNode`: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner/VirtualMachine.cs` 496-519 (visit counter 505-511).
- Saliency pick: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner/Saliency/RandomBestLeastRecentlyViewedSaliencyStrategy.cs` 60-107 (`QueryBestContent`) and 43-57 (`ContentWasSelected`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Park at each line, command and menu; resume on an answer or a Continue | No numbers (the state machine) |
| Choice is an index into a pending list; the destination is an instruction index | Sentinel `-1` for no choice (theirs, `Dialogue.cs` 580) |
| Drop failing variants, then least-viewed, then highest complexity, then uniform random | No tuned weights; the tie-break is uniform (theirs, `Random` 93-104) |
| Each commit adds one to a per-variant view count | `+1` (theirs, `Random` 55) |
| Each completed node adds one to its visit counter | `+1` (theirs, `VirtualMachine.cs` 510) |
| Condition complexity: once, boolean operators, always | `once` +1; expression = boolean operators + 1; `when: always` = 0 (theirs, `Compiler.cs` 1726, 1739) |
| Missing store value falls back to a declared default | Default is declared in the script (theirs, `VirtualMachine.cs` 789) |

## 4. TypeScript sketch

simplified: the donor runs a compiled bytecode with a value stack, jump-to-index instructions, a call stack for detours and a `-1` no-choice path; the sketch uses a plain step list with absolute jump indexes and no detour stack or `-1` path. It also omits substitutions, the synchronous "handler called Continue inside the callback" case, node-group hub generation and the declared-default fallback (a missing counter is 0 here; the donor reads the declared default or throws). Two deliberate differences: `choose` refuses a disabled option (the donor leaves that to the client), and `continue` silently ignores calls outside `waitingContinue` (the donor throws). Order of operations follows the donor for lines and commands (park), options (collect, then park at `showOptions`; an empty list stops without counting a visit, as the donor does), and the view count (written on commit). A finished run bumps the node's visit counter, as `ReturnFromNode` does.

```ts
// Licence: MIT (donor). Clean-room sketch of the pattern, written from the donor's described order, not a translation.
type Value = number | string | boolean;

// The one store. On Frankendom the server implements it; the dialogue writes nowhere else.
export interface Ledger {
  get(key: string): Value | undefined;
  set(key: string, value: Value): void;
}

export type Step =
  | { op: "line"; id: string }
  | { op: "addOption"; id: string; enabled: boolean; to: number }
  | { op: "showOptions" }
  | { op: "command"; text: string }
  | { op: "set"; key: string; value: number }
  | { op: "jump"; to: number }
  | { op: "stop" };

export type Status = "running" | "waitingOption" | "waitingContinue" | "stopped";

export interface PendingOption { id: string; to: number; enabled: boolean; }

export interface Candidate { id: string; complexity: number; failing: number; to: number; }

export interface Client {
  line(id: string): void;
  command(text: string): void;
  options(list: PendingOption[]): void;
}

// The parked script: it holds its place (pc, pending options) until the client calls choose() or continue().
export class ParkedDialogue {
  status: Status = "stopped";
  private pc = 0;
  private pending: PendingOption[] = [];

  constructor(
    private readonly nodeName: string,
    private readonly steps: Step[],
    private readonly ledger: Ledger,
    private readonly client: Client,
  ) {}

  run(): void {
    if (this.status === "waitingOption") throw new Error("still waiting on a choice");
    this.status = "running";
    while (this.status === "running") {
      const s = this.steps[this.pc];
      this.pc += 1;
      if (s === undefined) { this.finish(); return; }
      switch (s.op) {
        case "line":
          this.client.line(s.id);
          this.status = "waitingContinue";
          return;
        case "command":
          this.client.command(s.text);
          this.status = "waitingContinue";
          return;
        case "addOption":
          this.pending.push({ id: s.id, to: s.to, enabled: s.enabled });
          break;
        case "showOptions":
          if (this.pending.length === 0) { this.status = "stopped"; return; }
          this.status = "waitingOption";
          this.client.options(this.pending.slice());
          return;
        case "set":
          this.ledger.set(s.key, s.value);
          break;
        case "jump":
          this.pc = s.to;
          break;
        case "stop":
          this.finish();
          return;
      }
    }
  }

  choose(index: number): void {
    if (this.status !== "waitingOption") throw new Error("not waiting on a choice");
    const opt = this.pending[index];
    if (opt === undefined || !opt.enabled) throw new Error("no such enabled option");
    this.pending = [];
    this.pc = opt.to;
    this.status = "waitingContinue";
  }

  continue(): void {
    if (this.status === "waitingContinue") this.run();
  }

  private finish(): void {
    const key = `$Yarn.Internal.Visiting.${this.nodeName}`;
    const seen = this.ledger.get(key);
    this.ledger.set(key, (typeof seen === "number" ? seen : 0) + 1);
    this.status = "stopped";
  }
}

const viewKey = (id: string): string => `$Yarn.Internal.Content.ViewCount.${id}`;

function viewsOf(ledger: Ledger, id: string): number {
  const v = ledger.get(viewKey(id));
  return typeof v === "number" ? v : 0;
}

// Drop failing candidates, keep the least-viewed group, then the highest complexity inside it, then pick one at random.
// Committing a pick adds one to its view count.
export function pickCandidate(cands: Candidate[], ledger: Ledger, rand: () => number = Math.random): Candidate | undefined {
  const live = cands.filter(c => c.failing === 0);
  if (live.length === 0) return undefined;
  const fewest = Math.min(...live.map(c => viewsOf(ledger, c.id)));
  const least = live.filter(c => viewsOf(ledger, c.id) === fewest);
  const top = Math.max(...least.map(c => c.complexity));
  const best = least.filter(c => c.complexity === top);
  const pick = best[Math.floor(rand() * best.length)];
  ledger.set(viewKey(pick.id), viewsOf(ledger, pick.id) + 1);
  return pick;
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS (`/tmp/qd007-tc/qd007-yarn-parked-dialogue.ts`, the block above plus `export {};`), exit 0.

## 5. Lands in

- TARGET `origins/quests/dialogue-vm.ts` (new): the parked-script VM and the variant pick, with the store injected by the server. Dialogue data (nodes, `when:` conditions, complexity) lives in zone data.
- Parity-checklist row 18 (loot roll and XP award): a quest or dialogue reward is a server-applied write to the one ledger, never a client grant. The server tick sub-line does not apply to this donor (it has no clock).
- Reuse tag: adapt (MIT: code may be adapted; this note uses the shape, and the sketch is clean-room).
- Brief rule served: one ledger (every flag and reward is a write to the server store); zones as data (variants and their conditions are data).

## 6. Gaps and risks

- The donor has no quest model: no objectives, no quest log, no reward type. Quest state is only variables. Frankendom needs its own objective counters on top; they belong in the ledger, not in the dialogue.
- `<<command>>` is passed to the client as text (`VirtualMachine.cs` 627). Frankendom must treat a reward command as a request the server validates and applies, never as text the client executes.
- `<<set>>` writes straight to whatever `IVariableStorage` the host passes in (825). The host must pass the server ledger, and the client must never hold a writable copy.
- A parked dialogue lives in the VM object: program counter, pending options and stack. Nothing in the read code serialises it. A disconnect mid-conversation needs saved state per player; that is not in this donor (not read: any save/restore code).
- The donor's `SetSelectedOption` checks only the index range, not the `enabled` flag (`VirtualMachine.cs` 389-424). The sketch adds the check; Frankendom's engine must check it on the server too.
- View counts are keyed per content ID in one store. If the store is shared across players, one player's views change another player's variant. Frankendom needs the view counts per player.
- An empty option menu ends the run silently (692-697). A dead-end conversation looks like a normal end. Frankendom should log it.
- No step cap in the `Continue` loop (471). A script loop with no line, command or menu runs to completion in one call. Frankendom needs a per-call step budget (the server's per-tick budget, row 18 sub-line).
- Commands and substitutions are strings (`{n}` replacement, 595-637). The donor does no escaping; Frankendom must not build grants from string substitutions.
- The donor is C# on .NET; the sketch is TypeScript and the server runtime is Node. The sketch does not copy the bytecode.

Reuse tag: adapt
Brief rule served: one ledger; zones as data; server-verified rewards (row 18)
