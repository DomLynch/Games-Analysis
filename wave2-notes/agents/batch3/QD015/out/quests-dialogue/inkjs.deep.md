# inkjs (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/inkjs/src/engine/Story.ts` | Licence: MIT (`LICENSE.md`: "MIT License", Copyright 2017 inkle Ltd and inkjs contributors) | TypeScript | symbol `Story.ProcessChoice` (with `Story.TryFollowDefaultInvisibleChoice`, `StoryState.VisitCountForContainer`, `StoryState.TurnsSinceForContainer`)

Checked: `Story.ts` 511-520 (single step and fallback trigger), 832-897 (visit and turn recording, divert ancestors), 915-964 (choice offer), 1719-1747 (path choice and index pick), 2326-2356 (fallback choice), 2417-2421 (Error throws). `StoryState.ts` 52-154 (visit and turn memory), 392-504 (named flows), 1123-1135 (chosen path). `Flow.ts` 1-109 read in full. `ChoicePoint.ts` 1-72 read in full. `Container.ts` 76-88 read. Callers: `ProcessChoice` only from the step (774); `TryFollowDefaultInvisibleChoice` only from `ContinueSingleStep` (519); `VisitContainer` from 736 and 888; `IncrementVisitCountForContainer` only from `VisitContainer` (835). Not read: `Choice.ts`, the compiler code that sets the visit and turn count flags, the code that copies `generatedChoices` into the visible choice list, the shuffle and sequence code (`NextSequenceShuffleIndex` 2358 read by name only), the JSON load path beyond `Flow`. Confidence: high on the offer gate, the turn rule and the fallback order; medium on what the compiler marks as counted, which decides whether a once-only choice can be used.

Best transferable idea: a dialogue option is hidden once its target has been read or when its condition is false, it keeps the thread it was offered on so it can resume, and a fallback option is taken automatically only when no visible option remains, without advancing the turn counter.

Decision (proposed): adapt - take the once-only gate keyed by content id, the captured resume point per option, the fallback rule and the turn counter as a derived read; leave out the named-flow map (parked threads) for a later cell.

Acceptance: a server test sets an NPC with "Ask about the bridge" (once-only, target read on first pick) and "Goodbye" (fallback). After the bridge line is read, the option is absent from the next offer; with no visible option left, "Goodbye" is taken without the turn counter moving; a "turns since" read is -1 before a visit and 0 in the same turn.

## 1. Mechanism

- A choice point carries flags: a condition, start text, choice-only text, an invisible-default (fallback) flag and a once-only flag (`ChoicePoint.ts` 8-12; once-only defaults to true at 12).
- Offer, one choice point at a time (`Story.ProcessChoice`, 915-964), in this order:
  1. If the choice point has a condition, pop it; a false value hides the choice (919-924).
  2. Pop the choice texts from the stack, always, so they do not reach the output (930-936; comment 948-950).
  3. Once-only: read the visit count of the choice's target; above zero, hide the choice (939-946). The check runs after the texts are popped, so the content is consumed either way (938 comment).
  4. Otherwise create the choice: target path, source path, invisible flag, a fork of the current thread captured as the choice's resume point, tags, and trimmed text (955-963).
- Memory: entering a container counts a visit only when the container has the visit flag (835 under the check at 833-834), and only at the start when the container counts start only (833). Each counted visit also records the current turn index (838). Visit counts are stored per container path (`StoryState.ts` 101-116, map write at 112); turn indices likewise (118-126).
- Turn counter: starts at -1 (`StoryState.ts` 441). A chosen path adds one when the flag is set (1132-1134). A player pick uses that default (`Story.ts` 1719, 1746). A fallback passes `false` (2353), so it does not add one.
- Turns since: current turn index minus the recorded turn index for the container (`StoryState.ts` 128-153, subtraction at 149); -1 if the container was never recorded (151). An expression reads it at `Story.ts` 1354 (seen by grep; the surrounding code was not read).
- Pick: `ChooseChoiceIndex` (1726-1747) checks the index is in range (1729-1730), restores the captured resume point of the chosen option (1744), then follows its target (1746).
- Fallback: after every single step, if the story cannot continue and it is not evaluating a function from the game, `TryFollowDefaultInvisibleChoice` runs (`Story.ts` 518-519). It takes the invisible options (2329); it does nothing if there are no invisible options or if any visible option exists (2331-2335); otherwise it takes the first invisible option (2337), restores its resume point (2347), forks the thread when a snapshot is pending (2349-2351) and follows the target without advancing the turn (2353).
- Choosing clears the offered list for the flow (`StoryState.ts` 1125).
- Saves: a choice keeps the index of the thread it was offered on (`Flow.ts` 58). If that thread is no longer on the call stack, the save writes the captured thread for the choice (60-70), so the choice can resume after the story has moved on.
- Parked threads (not written up): each named flow owns its own call stack and current choices (`Flow.ts` 9-22, 13); switching re-points the variables view at that stack (`StoryState.ts` 456-480); removing the current flow first returns to the default flow (496-497).

## 2. Key functions

- `Story.ProcessChoice`: `/mnt/frankendom-donors/inkjs/src/engine/Story.ts` 915-964. The offer gate.
- `Story.TryFollowDefaultInvisibleChoice`: same file, 2326-2356. The fallback.
- `Story.VisitContainer` and `Story.VisitChangedContainersDueToDivert`: same file, 832-897. Visit and turn recording, including ancestors entered by a divert (888).
- `Story.ChooseChoiceIndex` and `Story.ChoosePath`: same file, 1719-1747.
- `StoryState.VisitCountForContainer`, `IncrementVisitCountForContainer`, `RecordTurnIndexVisitToContainer`, `TurnsSinceForContainer`: `/mnt/frankendom-donors/inkjs/src/engine/StoryState.ts` 70-153.
- `StoryState.SetChosenPath`: same file, 1123-1135.
- `ChoicePoint`: `/mnt/frankendom-donors/inkjs/src/engine/ChoicePoint.ts` 1-72.
- `Flow` (resume points in saves): `/mnt/frankendom-donors/inkjs/src/engine/Flow.ts` 9-109.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Option hidden once its target has been read (visit count above zero) | `onceOnly` defaults to true (theirs, `ChoicePoint.ts` 12); visit test (theirs, `Story.ts` 939-946) |
| Visit counted per content, optionally only on entry at the start | Visit flag (theirs, `Container.ts` 82) and start-only flag (theirs, 86); start-only test (`Story.ts` 833) |
| Turn counter: starts at -1, +1 per player pick, not for fallbacks | Start -1 (theirs, `StoryState.ts` 441); +1 (1133); fallback passes `false` (`Story.ts` 2353) |
| Turns since last visit: current minus recorded, -1 if never | -1 for never (theirs, `StoryState.ts` 151) |
| Fallback only when no visible option remains and the story is stuck | Stuck test (theirs, `Story.ts` 518); visible-option test (2333) |
| Resume point captured per option when offered | Fork of the thread (theirs, `Story.ts` 959) |

## 4. TypeScript sketch

simplified: the sketch keeps the offer order (condition, once-only, create), the fallback rule and the turn rule of the donor. It replaces the captured thread fork with a numeric thread id and omits the text popping and tags (there is no output stream), the flow map, the save format, the expression-level `TURNS_SINCE`, the stuck-story check that triggers the fallback, and the compiler flags: the sketch counts every visit, where the donor counts only containers the compiler marks. It does not reorder anything the donor does.

```ts
// Licence: MIT (donor, inkjs LICENSE.md: Copyright 2017 inkle Ltd and inkjs contributors). Clean-room sketch of the described order of steps, not a line-by-line translation.
// clean-room
interface Choice {
  text: string;
  targetId: string;      // the content the choice leads to
  threadId: number;      // the thread captured when the choice was offered
  fallback: boolean;     // invisible default: taken automatically when nothing else is offered
}

interface ChoicePoint {
  text: string;
  targetId: string;
  condition?: () => boolean; // a false condition hides the choice
  onceOnly: boolean;         // hidden once the target has been seen
  fallback: boolean;
}

interface MemoryView {
  visits(id: string): number;     // 0 if never seen
  turnsSince(id: string): number; // -1 if never seen
}

// Offer step: a choice point is shown or hidden once, when the flow reaches it.
function offer(cp: ChoicePoint, mem: MemoryView, currentThread: number): Choice | null {
  if (cp.condition && !cp.condition()) return null;             // condition false: hidden
  if (cp.onceOnly && mem.visits(cp.targetId) > 0) return null;  // already read: hidden
  return { text: cp.text, targetId: cp.targetId, threadId: currentThread, fallback: cp.fallback };
}

// Auto step: only when the story has stopped producing text. If every offered choice is a
// fallback, take the first one. A fallback does not advance the turn counter.
function autoFollow(offered: Choice[], follow: (c: Choice, advanceTurn: boolean) => void): boolean {
  if (offered.length === 0) return false;
  const fallbacks = offered.filter((c) => c.fallback);
  if (fallbacks.length === 0 || fallbacks.length < offered.length) return false;
  follow(fallbacks[0], false);
  return true;
}

// Player choice: advances the turn counter.
function choose(c: Choice, follow: (c: Choice, advanceTurn: boolean) => void): void {
  follow(c, true);
}

// Visit and turn memory, keyed by content id.
class Memory implements MemoryView {
  private visitCount = new Map<string, number>();
  private lastTurn = new Map<string, number>();
  turn = -1; // starts at -1; each player choice adds one

  enter(id: string, atStart: boolean, countAtStartOnly: boolean): void {
    if (countAtStartOnly && !atStart) return;
    this.visitCount.set(id, (this.visitCount.get(id) ?? 0) + 1);
    this.lastTurn.set(id, this.turn);
  }

  visits(id: string): number {
    return this.visitCount.get(id) ?? 0;
  }

  turnsSince(id: string): number {
    const t = this.lastTurn.get(id);
    return t === undefined ? -1 : this.turn - t;
  }

  advanceTurn(): void {
    this.turn += 1;
  }
}
```

## 5. Lands in

- TARGET `origins/dialogue/options.ts` (proposed new module; no Frankendom file was read for this note). It offers a speaker's options from authored data, keeps the once-only and visit memory in the one ledger, and resolves a player's pick against the options that were offered.
- Parity row: no row in 1-23 covers NPC dialogue. Row 5 (controls and input) is the nearest: the player's pick is input, and the donor checks it against the offered list (`Story.ts` 1729-1730). Lead should decide whether dialogue needs its own row.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, this sketch is clean-room)
- Brief rule served: one ledger (visit memory and the turn count are ledger fields, not a second store); zones as data (options and their once-only flags are authored per zone)

## 6. Gaps and risks

- Visit memory belongs in the one ledger. The donor keeps it in maps keyed by a path string (`StoryState.ts` 109-125). Frankendom should key it by content id in the one character and quest ledger.
- A once-only option on a target that was not counted fails loudly in the donor: `VisitCountForContainer` calls `story.Error` when the container is not counted (`StoryState.ts` 74-81), and `Error` throws (`Story.ts` 2417-2418). The count flag comes from the compiler (not read). Frankendom should check option data at load time, not at pick time.
- The donor's "turn" is a player pick count. Frankendom's duels run in real time, so the turn counter needs an explicit definition (per pick, per encounter, or per zone visit) before the turns-since test can be written.
- The resume point is a fork of the whole call stack (`Story.ts` 959). Frankendom should store a small resume token per offered option, not a copy of the stack.
- Server verification: a pick is a client input. The server must check the index against the option list it offered and resolve the target from the offered option, as the donor does (1729-1730, 1744). The donor does not verify against a server; the check is a client assert.
- Parked threads (the named-flow map, `StoryState.ts` 456-504) are a second mechanism for parked dialogue. Not written up here; needs its own cell.
- Not read: `Choice.ts`, the compiler's count flags, the shuffle and sequence code (`NextSequenceShuffleIndex` 2358, name only). The other visit and turn reads in expressions (`Story.ts` 1354-1355, 1451, 1641) were seen by grep only, not read in context.
- MIT: code may be adapted. This note and the sketch are written from the described order of steps, not copied.
