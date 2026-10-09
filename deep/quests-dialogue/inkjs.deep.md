# inkjs (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/inkjs/src/engine/StoryState.ts | Licence: MIT | TypeScript | symbol StoryState (VisitCountForContainer / variablesState / currentChoices) (input line 37 is `ToJson`; the named symbols are `VisitCountForContainer` at 70 and `currentChoices` at 163)

## 1. Mechanism
- Donor: inkjs, the JavaScript runtime for the ink dialogue language (inkle). The story is a graph of containers; the runtime state is the call stack, visit counts, turn indices, variables and the current choice list.
- VisitCountForContainer (70-99) returns how many times a container was entered (0 if never). It reads a patch overlay first when one exists, then the count map keyed by the container's path string (85-96). A container that does not count visits calls `story.Error`, which throws a StoryException (`Error` returns `never`, Story.ts 2417-2421); inside a Continue that exception is caught and recorded (Story.ts 387-391).
- IncrementVisitCountForContainer (101-116) adds one to the count (into the patch when one is active). RecordTurnIndexVisitToContainer (118-126) stores the current turn index for the container; TurnsSinceForContainer (128-153) returns the current turn index minus that, or -1 when never visited.
- currentChoices (163-169) returns an empty list while text can still continue (`canContinue`); choices appear only when the text is exhausted, so they always come last. `generatedChoices` (171-173) returns the raw list.
- SetChosenPath (1123-1135) clears the choice list, moves the pointer to the chosen path (an index of -1 becomes 0), and advances the turn index only when the caller says so (`incrementingTurnIndex`, default true via ChoosePath). ChooseChoiceIndex (Story.ts 1726-1747) asserts the index against the visible choices, fires the `onMakeChoice` hook, switches the call stack to the thread saved when the choice was generated, then goes through ChoosePath (Story.ts 1719-1724), which calls SetChosenPath and then `VisitChangedContainersDueToDivert` to record visits for containers newly entered.
- ContinueInternal (Story.ts 355-509) throws if the story cannot continue (364-368), then loops `ContinueSingleStep` while it can continue, stopping when the output ends in a newline, on the async time limit, or when a StoryException is caught and recorded (384-402); it then restores any newline snapshot (409-411), checks for end-of-content errors, notifies variable observers, and reports errors through `onError` or throws a summary exception (461-502).
- Runs on the caller's Continue and ChooseChoiceIndex calls (the game loop), synchronously.

## 2. Key functions
- StoryState.VisitCountForContainer | /mnt/frankendom-donors/inkjs/src/engine/StoryState.ts | 70-99 | read a container's visit count, patch first, then the global map; errors if the container does not count.
- StoryState.IncrementVisitCountForContainer | /mnt/frankendom-donors/inkjs/src/engine/StoryState.ts | 101-116 | add one visit, into the patch when present.
- StoryState.RecordTurnIndexVisitToContainer / TurnsSinceForContainer | /mnt/frankendom-donors/inkjs/src/engine/StoryState.ts | 118-126 / 128-153 | store and read the turn index of a container's last visit.
- Story.ChooseChoiceIndex | /mnt/frankendom-donors/inkjs/src/engine/Story.ts | 1726-1747 | validates a choice index, fires the hook, restores the thread, then ChoosePath.
- StoryState.currentChoices (getter) | /mnt/frankendom-donors/inkjs/src/engine/StoryState.ts | 163-169 | the visible choice list, empty while text can continue.
- StoryState.SetChosenPath | /mnt/frankendom-donors/inkjs/src/engine/StoryState.ts | 1123-1135 | clears choices, moves the pointer, advances the turn index.
- Story.ContinueInternal | /mnt/frankendom-donors/inkjs/src/engine/Story.ts | 355-509 | the step loop that produces text and the choice list.
- Story.ChoosePath | /mnt/frankendom-donors/inkjs/src/engine/Story.ts | 1719-1724 | the path entry point used by choices and scripts.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Visit counts and turn indices per named node, used as conditions | Save format versions 8 to 10 (theirs, StoryState.ts lines 31-32) |
| Choices hidden until text is exhausted, cleared on any move | n/a (rule of the language) |
| Patch overlay so a test or a branch can change state without touching the base | Patch class (theirs) |
| Step loop with an optional async time limit | Time limit argument (theirs) |

## 4. TypeScript sketch
simplified: the sketch keeps per-path visit counts, turn indices, the choice-hiding rule and the out-of-range check, but `choose` records one visit to the target and takes the turn index from its caller. The donor records visits for every container newly entered by the divert (`VisitChangedContainersDueToDivert`), increments the turn index inside `SetChosenPath`, restores the saved thread, fires the choice hook, and supports the patch overlay, the call stack and the continue loop, none of which are in the sketch. `visitCount` has no error for a container that does not count visits.

```ts
// Licence: MIT | written from the mechanism at src/engine/StoryState.ts; not lifted.
// Dialogue state: visit counts and turn indices per named node, variables, and the choice list.
// Choices are hidden while text can still continue, and any move clears them.
interface Dialog {
  visits: Map<string, number>;
  turns: Map<string, number>;
  vars: Map<string, unknown>;
  choices: string[];
  canContinue: boolean;
}

function visitCount(d: Dialog, path: string): number {
  return d.visits.get(path) ?? 0;
}

function recordVisit(d: Dialog, path: string, turn: number): void {
  d.visits.set(path, visitCount(d, path) + 1);
  d.turns.set(path, turn);
}

function visibleChoices(d: Dialog): string[] {
  return d.canContinue ? [] : d.choices;        // choices come only when the text is exhausted
}

function choose(d: Dialog, index: number, target: string, turn: number): void {
  const list = visibleChoices(d);
  if (index < 0 || index >= list.length) throw new Error("choice out of range");
  d.choices = [];                                // any move clears the list
  recordVisit(d, target, turn);
}
```

## 5. Lands in
- Frankendom target: `origins/talk/talk.ts` (the existing dialogue module: a flat per-NPC line pool, a `choices` list and a `pick`, per `origins/talk/README.md`) and the server entry `origins/server/talk-pick.ts`. Both exist on the VPS snapshot /root/work-k7 (not main); only the README and file headers were read. The README says conditions are data, effects are a data list, and a `once` line is hidden after it is said, so visit counts here would be per-character talk flags rather than a graph runtime.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: Origins O2 talk (`docs/specs/origins/gothic-dialogue.md`, `openmw-dialogue-conditions.md` on the snapshot); zones as data.
- Reuse tag: adapt (MIT; the library could be used as a dependency or its mechanism adapted; a Lead decision).
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks
- The runtime state is a per-player object in the client. Frankendom must keep visit counts and variables in the server state so a client cannot rewind a branch (server-verified, one ledger); the existing talk module already rebuilds talk state on the server per pick (`talk-pick.ts` header).
- Save and load is a versioned JSON (8 to 10, lines 31-32) done client-side; Frankendom must version its own save with the server record.
- The patch overlay (85-90, 102-107) exists for side-effect-free evaluation. A client overlay must never write to server state.
- The async time limit is a client scheduling feature (Story.ts 396-401); Frankendom's dialogue advances on request, not on a clock.
- Scripted external functions bound in the host are the donor's link to the game; Frankendom must bind only server-checked verbs.
- An ink story graph is compiled code-like content; Frankendom's talk is flat and data-validated at load, which suits zones as data better.
- Pit is a client only and has no dialogue. Nothing here touches fight authority, kill verification or MAX_ATTACKERS.
- Licence MIT: the sketch is written from the mechanism; donor lines are not copied.
- Not read: `VariablesState`, `CallStack`, `VisitChangedContainersDueToDivert` (Story.ts 843), `ContinueSingleStep` beyond its first lines, and the JSON writer/loader.
