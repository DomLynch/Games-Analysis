# YarnSpinnerTool-YarnSpinner (quests-dialogue-npc-routines, cell 1)

Donor: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner/VirtualMachine.cs` | Licence: MIT (LICENSE.md, "The MIT License (MIT)", Copyright Yarn Spinner Pty. Ltd., Secret Lab Pty. Ltd., and Yarn Spinner contributors) | C# | symbol `SelectSaliencyCandidate` (case in `RunInstruction`, 956-982)

Checked: Opened `VirtualMachine.cs` (run loop 470-481, AddOption 638-688, ShowOptions 690-727, SetSelectedOption from 389, Stop 842-858, saliency opcodes 892-982, ReturnFromNode from 496 to 514, ExecuteJumpToNode 1008-1034), `Saliency/BestLeastRecentlyViewedSaliencyStrategy.cs` (in full), `Saliency/RandomBestLeastRecentlyViewedSaliencyStrategy.cs` (in full), `Saliency/BestSaliencyStrategy.cs` (in full), `Saliency/ContentSaliencyOption.cs` (in full), `Saliency/FirstSaliencyStrategy.cs` (grep only, not read), `YarnSpinner.Compiler/Visitors/CodeGenerationVisitor.cs` (EvaluateLineCondition 543-580; line-group codegen 640-780), `YarnSpinner.Compiler/NodeGroupCompiler.cs` 60-115, `YarnSpinner.Compiler/Compiler.cs` 1645-1690, `YarnSpinner/Dialogue.cs` 745-790 and 1196-1250, `YarnSpinner/Library.cs` 78 (grep), `YarnSpinner/yarn_spinner.proto` (messages and fields by grep and 5-45), `YarnSpinner.Compiler/StringInfo.cs` (fields by grep), `CHANGELOG.md` (headings and listed lines). Not read: `SmartVariableEvaluationVirtualMachine.GetSaliencyOptionsForNodeGroup`, `GetBooleanOperatorCountInExpression`, `Library.GenerateUniqueContentViewedVariableName`, the rest of `EvaluateLineCondition` after the once test, the option fall-through codegen (CHANGELOG 111), and the `.yarn` test plans. Confidence: high on candidate selection, the once guard and visit counting (read end to end); medium on the node-group `when:` path. Quest structure is absent from this donor (0 word-match hits for quest, quests, objective, journal in the YarnSpinner and YarnSpinner.Compiler `.cs` sources). Camera: not applicable.

## 1. Mechanism

- What it is: Yarn Spinner is a dialogue scripting language and a virtual machine (VM) that runs compiled dialogue. The VM hands lines and options to the game and waits. The part that matters for NPC barks and quest-giver lines is the line group: several candidate lines (or nodes with `when:` headers) at one point in the script, from which the VM picks one.
- Authoring step (compile time): each candidate item may carry an `once` test and an `if` expression. For each item the compiler evaluates the condition and leaves a bool on the stack, then emits `AddSaliencyCandidate` with `ComplexityScore = conditionCount` (CodeGenerationVisitor.cs 699). `conditionCount` is the number of boolean operators in the condition plus 1 for the expression, plus another 1 if the line has a `once` condition (Compiler.cs 1660-1674), so a `once` line outranks an otherwise identical plain line in the specificity tie-break. An item with no condition pushes `true` and has complexity 0. An item with `once` first pushes the test "not the once variable" (EvaluateLineCondition, from 553). The once variable is named from the line ID (CodeGenerationVisitor.cs 553).
- Authoring step, node groups: a node group is several nodes with the same name, each with `when:` headers. The compiler sums the header complexity per node (NodeGroupCompiler.cs 88 and 104). At run time `AddSaliencyCandidateFromNode` (VM 908-954) reads each condition variable by name, counts passing and failing, and adds one candidate for the node.
- Run-time order of steps, line group:
  1. `AddSaliencyCandidate` (VM 892-906) appends a candidate with `FailingConditionValueCount = condition ? 0 : 1` (VM 899) and the complexity score (VM 898).
  2. `SelectSaliencyCandidate` (VM 956-982) asks the strategy `QueryBestContent(list)` (VM 961). If it returns null it pushes `false`. Otherwise it checks the returned object is in the list (throws if not), calls `ContentWasSelected(result)` (VM 977), pushes the destination and `true`, and clears the list.
  3. After the select opcode (CodeGenerationVisitor.cs 718) the compiled code jumps to the end of the group if nothing was selected, or jumps to the chosen item. For a once item it then sets its once variable to `true` (CodeGenerationVisitor.cs 760-775). The once flag is set when the item is reached, so it is independent of the view counter.
- Default strategy (VM 242): `RandomBestLeastRecentlyViewedSaliencyStrategy`. Its `QueryBestContent` (RandomBestLeastRecentlyViewedSaliencyStrategy.cs 60-) does this: drop every candidate with a failing condition (line 63); if none is left return null; read each candidate's view count (default 0); keep the group with the fewest views (line 93); inside that group keep the highest complexity; pick one at random with a static unseeded `Random` (line 115, pick at line 146).
- Deterministic variant: `BestLeastRecentlyViewedSaliencyStrategy` sorts by view count ascending (BestLeastRecentlyViewedSaliencyStrategy.cs 90), then by complexity descending (line 91), and takes the first. Ties that remain keep declaration order (the sort is stable, per the comment in that file).
- Third variant: `BestSaliencyStrategy` (BestSaliencyStrategy.cs 31-32) drops failing candidates, orders by complexity descending and takes the first. It keeps no view counts, and `ContentWasSelected` does nothing.
- Recording a view: `ContentWasSelected` in the two counting strategies reads the view count and adds 1 (BestLeastRecentlyViewedSaliencyStrategy.cs 53). The key is `$Yarn.Internal.Content.ViewCount.` plus the content ID (ContentSaliencyOption.cs 78). The count lives in the game's variable storage, so it is saved with the game's variables.
- Options (one-shot choice, not a group): `AddOption` (VM 638-688) pops the substitutions and, if the option has a condition, pops a bool into `lineConditionPassed` (VM 663-678), then stores a pending option with `enabled = lineConditionPassed` (VM 685). `ShowOptions` (VM 690-727) stops the run if there are no pending options (VM 690-697); otherwise it passes every option to the client, including disabled ones, with its `enabled` flag (VM 706), sets the state to waiting, and calls the options handler.
- The pick: `SetSelectedOption` (VM 389-420) requires the waiting state, pushes `false` for `NoOptionSelected`, and otherwise checks only that the index is in range (VM 405). It then pushes the destination and `true`, clears the options and sets the state to waiting-for-continue. It does not check the `enabled` flag.
- Visit counts (node memory): `ReturnFromNode` (VM 496-515) adds 1 to the node's tracking variable (VM 508-510) when a node is left. It is called when the run loop reaches the end of a node (481), on `Stop` (845 and in the unwinding loop at 851), on `Return` (873), and when a jump or detour leaves a node (1019 and 1026). It is not called on entry.
- Tick: none. The VM runs a `while` loop until the execution state changes (VM 470-481). The client calls `Continue` again after each line. There is no clock, no frame and no timer in this path.

## 2. Key functions

- `VirtualMachine.RunInstruction`, case `SelectSaliencyCandidate`: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner/VirtualMachine.cs` 956-982 (read in full).
- `VirtualMachine.RunInstruction`, cases `AddSaliencyCandidate` and `AddSaliencyCandidateFromNode`: same file 892-954 (read in full).
- `VirtualMachine.RunInstruction`, cases `AddOption` and `ShowOptions`, and `VirtualMachine.SetSelectedOption`: same file 389-420 and 638-727 (read).
- `VirtualMachine.ReturnFromNode`: same file from 496 (read to 514).
- `BestLeastRecentlyViewedSaliencyStrategy.QueryBestContent`: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner/Saliency/BestLeastRecentlyViewedSaliencyStrategy.cs` from 58 (read in full; the ordering lines are 90-91).
- `RandomBestLeastRecentlyViewedSaliencyStrategy.QueryBestContent`: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner/Saliency/RandomBestLeastRecentlyViewedSaliencyStrategy.cs` from 60 (read in full; the group-by at 93, the static Random at 115, the pick at 146).
- Line-group codegen: `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/YarnSpinner.Compiler/Visitors/CodeGenerationVisitor.cs` 640-780, with the once test in `EvaluateLineCondition` at 543-580 (read in part).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Drop any candidate with a failing condition | Threshold 0 failing conditions (BestLeastRecentlyViewedSaliencyStrategy.cs 61; RandomBest... 63) |
| Rotate: least-viewed group first | View step +1 per run (BestLeastRecentlyViewedSaliencyStrategy.cs 53). No decay, no cooldown, no cap. The name says "recently", but the code counts views, not time. |
| Tie-break: most specific first | Complexity = boolean operators in the condition + 1, plus 1 more for a `once` condition (Compiler.cs 1660-1674); 0 for an unconditional item (CodeGenerationVisitor.cs 699). CHANGELOG 167 says `not` is no longer counted; the body of `GetBooleanOperatorCountInExpression` was not read, so that is not checked here. |
| Once guard | One bool per line, keyed by line ID, set true when the item runs (CodeGenerationVisitor.cs 553 and 775) |
| Node-group score | Sum of the `when:` header complexities (NodeGroupCompiler.cs 88, 104) |
| Option gate | One `enabled` bool per option (VM 685); the VM does not enforce it (VM 405) |
| Visit tracking | +1 per node left (VM 510) |
| Random pick | Unseeded static Random (RandomBest... 115) |

## 4. TypeScript sketch

simplified: keeps the donor order (drop failing candidates; least-viewed group; highest complexity inside it; random pick). The once guard is modelled as "views > 0", which matches the donor because the once flag is set when the item runs and the view count is written at the same selection. It omits the node-group `when:` path, the variable-storage layer (views are a Map), the `NoOptionSelected` path, the option fall-through (CHANGELOG 111) and the donor's check that the returned object is in the list. Two donor defects are fixed in the sketch: the random source is injected and must be seeded per player (donor: unseeded static Random, RandomBest... 115), and the option gate refuses a disabled pick (donor: only a range check, VM 405). The sketch never decays counts, because the donor does not either.

```ts
// Licence: MIT (donor). Shape adapted from the saliency selection described in the donor; written fresh, not a line-by-line translation.
// Rng is a seeded stream owned by the server (one per player), replacing the donor's unseeded static Random.

type Rng = () => number;

interface LineCandidate {
  id: string;            // stable line id; the once guard and view count are keyed by it
  conditionsPassed: boolean;
  complexity: number;    // boolean operators in the condition + 1, +1 more if once; 0 when there is no condition
  once: boolean;         // true = never offered again after its first run
}

// Pick the next line for a dialogue beat. Order of steps follows the donor:
// 1) drop failing candidates; 2) least-viewed group; 3) highest complexity in that group; 4) seeded random pick.
function pickNextLine(cands: LineCandidate[], views: Map<string, number>, rng: Rng): LineCandidate | null {
  const viewsOf = (id: string): number => views.get(id) ?? 0;
  const live = cands.filter(c => c.conditionsPassed && !(c.once && viewsOf(c.id) > 0));
  if (live.length === 0) return null;

  const leastViewed = Math.min(...live.map(c => viewsOf(c.id)));
  const group1 = live.filter(c => viewsOf(c.id) === leastViewed);
  const topComplexity = Math.max(...group1.map(c => c.complexity));
  const group2 = group1.filter(c => c.complexity === topComplexity);
  const index = Math.floor(rng() * group2.length);
  return group2[Math.min(index, group2.length - 1)];
}

// Called once the line has actually run (the donor calls ContentWasSelected here).
function recordLineRun(c: LineCandidate, views: Map<string, number>): void {
  views.set(c.id, (views.get(c.id) ?? 0) + 1);
}

// Option gate: the server re-checks the pick. The donor VM only range-checks the index.
function acceptOptionPick(options: { id: string; enabled: boolean }[], pickedIndex: number): string {
  if (pickedIndex < 0 || pickedIndex >= options.length) {
    throw new Error("option index out of range");
  }
  const opt = options[pickedIndex];
  if (!opt.enabled) {
    throw new Error("option not available for this player");
  }
  return opt.id;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/qu002-ysn-saliency.ts) exits 0.

## 5. Lands in

- TARGET `origins/quests/dialogue-select.ts` (proposed new module; not checked against the Frankendom repo). It holds the candidate pick, the once and view-count state, and the server option gate, all as one engine step. Parity-checklist row 20 (catalogue as runtime source): dialogue lines, their conditions and their once flags are data rows that the server reads at run time.
- today: none known (not checked).
- Reuse tag: rewrite-from-idea (MIT, code may be adapted; this sketch is written fresh from the mechanism)
- Brief rule served: zones as data (barks and dialogue as rows); server-verified (option gate on the server); one ledger (view counts and once flags stored with the character's state, to be saved there)

## 6. Gaps and risks

- No quest model. The donor has no quest object, objective type, step list, prerequisite, reward, state machine or journal. Yarn gives lines, options, variables and node visits. Frankendom must build quest state itself, using variables that the dialogue reads.
- The client picks, the VM does not check. `SetSelectedOption` only checks the index (VM 405). The `enabled` flag is a display hint. Frankendom's rule is server-verified, so the server must re-run the condition before it applies a pick.
- Unseeded random. The default strategy picks with a static unseeded `Random` (RandomBest... 115 and the pick at 146). Replays and the determinism fingerprint would drift. Fix: seeded stream per player, stored with the replay.
- Name versus behaviour. "Least recently viewed" counts views, not time (BestLeastRecentlyViewed... 53 and 90). Nothing decays. A bark seen 20 times stays behind a fresh one for good. If barks should return, Frankendom needs a designer cooldown field in seconds; the donor has none.
- Specificity loses to rotation. Views sort before complexity (BestLeastRecentlyViewed... 90 before 91), so an unseen generic line beats a specific line that was seen once. The designer should decide this per group, as a data field.
- Once is keyed by the line ID (CodeGenerationVisitor.cs 553; CHANGELOG 48). Changing a line's ID changes or resets its once state. Lint once-lines for a fixed ID.
- Visit counts are written on exit, not on entry (VM 508 via 481, 845, 873, 1019, 1026). Inside a node, `visited()` sees the old count. A save taken mid-node does not yet count that visit. The server must record visits itself if a visit must count on entry.
- Donor defects kept as the idea and fixed in the sketch: the unseeded random source (RandomBest... 115) and the unchecked pick (VM 405). The donor's no-candidate exception in `BestSaliencyStrategy` was fixed in 3.2.2 (CHANGELOG 30); the sketch returns null, which is the fixed behaviour.
- Not read: the node-group candidate source, the rest of `EvaluateLineCondition`, the option fall-through codegen (CHANGELOG 111), and whether a `Dialogue` instance is shared between players (assumed one per run; not checked).

## As-data shape

- Compiled node: `Node { name: string; instructions: Instruction[]; headers: Header[] }` (yarn_spinner.proto 23-35, fields at 25, 28, 31 in that order). `Header { key: string; value: string }` (proto 37-43). A node's `when:` and `title:` are header rows.
- Compiled program: `Program { name: string; nodes: map<string, Node> (proto 11); initial_values: map<string, Operand> (proto 16) }`.
- Candidate row (from the VM, not from the proto field list): `AddSaliencyCandidate { ContentID: string; ComplexityScore: int }` (VM 898 uses ComplexityScore; ContentID is read from the same instruction).
- Option row: `AddOption { lineID: string; destination: int; substitutionCount: int; HasCondition: bool }` (lineID and destination in proto 158-166 by grep; HasCondition as read in the VM AddOption case).
- String table row: `StringInfo { text: string?; nodeName: string; lineNumber: int; fileName: string; isImplicitTag: bool; metadata: string[]; shadowLineID: string? }` (StringInfo.cs 28, 33, 38, 43, 55, 64, 70; read by grep).
- A new bark is one row: yes, a script line with a `#line` ID, compiled into the string table and a node. A new condition type is one row: no, a new function needs host code through `Library.RegisterFunction` (Library.cs 78; the `has_any_content` example at Dialogue.cs 747). A new quest is one row: no, the donor has no quest row; you write it as variables and node groups.

## Provenance

- Repo: YarnSpinnerTool/YarnSpinner, at `/mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/`. Files and lines as in the notes above. Licence: MIT (read from `LICENSE.md`). The contract (schema, instruction set) may be reused under MIT.

## What they patched later

- Saliency: `BestSaliencyStrategy` threw when there were no candidates, fixed in 3.2.2 (CHANGELOG 30). Instruction.Destination for `AddSaliencyCandidateFromNode` returned the wrong value, fixed in 3.2.2 (CHANGELOG 31).
- Once: the once key uses the line ID, and the changelog says it is unstable without an explicit `#line` ID (CHANGELOG 46-48, 3.2.1).
- Options: if every option in a group was unavailable, the dialogue got stuck; fixed in 3.1.0 so it falls through (CHANGELOG 111), with `NoOptionSelected` for the game to signal "carry on" (CHANGELOG 122 and 127, 3.1.0).
- Visits: `visited()` did not track node groups, fixed in 3.1.0 (CHANGELOG 138); tracking inside nested calls fixed in Unreleased (CHANGELOG 20).
- Complexity: `not` no longer counted in `when:` complexity (CHANGELOG 167, 3.0.1). Default strategy changed from first-match to random least-viewed (CHANGELOG 168, 3.0.1).

## Rulings for Dom

1. Should ambient barks rotate (least-viewed first, the donor default) or always show the most specific passing line? Recommendation: rotate for ambient barks, specific-first for quest-giver lines.
2. Should a bark be allowed to come back after a cooldown in seconds (a new zone-data field)? Recommendation: yes, default no cooldown, so the donor behaviour holds unless a designer sets one.
3. Should the server refuse any dialogue pick whose option is not enabled? Recommendation: yes, under the server-verified rule.

Best transferable idea: Keep the candidate list, drop failing conditions, rotate by view count with a complexity tie-break, make once a per-line flag keyed by a stable line ID, and have the server check every option pick.
Decision (proposed): adapt - the candidate filter, the rotation and the once guard fit NPC barks and quest-giver lines; we change the ranking to a per-group designer choice, use a seeded per-player stream and add the server option gate.
Acceptance: A server test shows a once line is never offered twice to the same player, a pick on a disabled option is refused, and the same seed and history produce the same bark sequence.

Reuse tag: rewrite-from-idea (MIT; adapted shape, fresh code)
Brief rule served: zones as data (barks and dialogue as rows); server-verified kills n/a (option gate is the server check here); one ledger (view counts and once flags saved with character state); rules 7-9 n/a

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Complexity rule incomplete: ConditionCount also adds +1 for a `once` condition before the expression (Compiler.cs 1660-1663), so a `once` line outranks an otherwise identical plain line in the specificity tie-break.
- Proto Node field order mis-listed (name 25, instructions 28, headers 31; note had headers before instructions).
- Everything else verified (VM lines, the three strategies, CodeGen, NodeGroupCompiler, CHANGELOG attributions, MIT, honest no-.git, as-data yes/no lines).

Fixed 2026-10-12: complexity rule (+1 for once) in Mechanism and Numbers table; Node field order; sketch comment on `complexity` updated (code unchanged, mirrored in work/ysn-saliency.ts). Typecheck on VPS (tsc --strict, es2020): exit 0.
