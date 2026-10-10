# gemrb-gemrb (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` | Licence: GPL-2.0-or-later (COPYING is GPL v2; source headers such as `gemrb/core/Dialog.h` say SPDX GPL-2.0-or-later) | C++ | symbol `Game::AddJournalEntry`

Checked: `Game::AddJournalEntry` 1029-1067 read in full; `Game::DeleteJournalGroup` 1019-1027, `Game::FindJournalEntry` 1110-1118 read; feedback block 1068-1098 read in part. `DialogHandler` sectionMap 28-33, `UpdateJournalForTransition` 35-48, `InitDialog` state choice 95-100, `DialogChooseTransition` 259-300 read. `Dialog::FindFirstState` 24-33 and `Dialog::FindRandomState` 35-52 read in full. Callers checked: `FindFirstState` from `DialogHandler.cpp` 96 and 99; `FindRandomState` only from `Interface.cpp` 3568. Script actions `Actions.cpp` 3853-3863 read. `Scriptable.cpp` 316-326 read. Not read: the reward actions a transition runs (XP, items, gold), the store behind `GetLocal`, the code that clears `DF_POSTPONE_SCRIPTS`, journal save and load, the journal screen. Confidence: high on the journal and state-selection order; medium on what "parked" script means in practice (only the skip gate was read, not the resume path).

Best transferable idea: a quest log keyed by line text, where solving one line with a group key replaces the whole group in one step, so a quest's stages collapse to one solved line with no cleanup script.
Decision (proposed): adapt — take the group-supersede rule and the first-passing-state dialogue pick, fix the duplicate-line defect and the biased random pick, and derive quest lines from the one ledger rather than keeping a second list.
Acceptance: a server test asserts that solving group G removes every line of G and any earlier line with the same text, that re-solving a solved line changes nothing, and that a random greeting over 10,000 draws picks each passing line within 2% of an equal share.

## 1. Mechanism

- A quest is a set of journal lines keyed by string-table text. Each line has a section (Main, Unsolved, Solved, User, UserBit), a group number (a byte, documented in the donor as a GemRB extension), a game-time stamp and a chapter number. The lines live in their own list (`Game.h` 218), separate from the globals that scripts read with `GetGlobal` (`Game.h` 490).
- Dialogue writes the journal. A transition with the journal bit (`Dialog.h` 21, 0x10) sends its line to `AddJournalEntry`. The section comes from two transition flags: unsolved (0x40, `Dialog.h` 23) gives index 1, solved (0x100, `Dialog.h` 25) gives index 2, both gives 3. The index maps to a section through a table (`DialogHandler.cpp` 31, 39-47). The group is the top 16 bits of the transition flags, stored as a byte (`DialogHandler.cpp` 47).
- Scripts write the journal the same way: the `AddJournalEntry` action (`Actions.cpp` 3855) and `SetQuestDone` (3861-3862), which deletes the line by text and then adds it as Solved with a group.
- Order inside `Game::AddJournalEntry` (1029-1066), as the code runs:
  1. Find an existing line with the same text (1031).
  2. If it exists and already has the requested section: return false and change nothing (1033-1035). No feedback, so re-solving a solved quest is silent.
  3. If the request is Solved and the group is non-zero: delete every line in that group (1037-1039), then fall through to step 5.
  4. Otherwise, with an existing line: change its section, group, chapter and time in place, and return true (1040-1050).
  5. Push a new line with the time, chapter, section, group and text (1054-1066).
  6. Feedback: build a message from the journal-change string and the first line of the text, show it if misc feedback is on, and play the string's sound (1068-1098, read in part).
- Dialogue state choice: `Dialog::FindFirstState` (24-33) walks the top-level states in priority order and returns the first whose condition is true. The priority order is set when the DLG file is loaded: `dlg.Order[TriggerIndex] = index` (`DLGImporter.cpp` 82). A state with no condition is never picked (28). `DialogHandler` calls it when a dialogue starts (96, 99).
- Random line: `Dialog::FindRandomState` (35-52) draws a start index with `RAND` (39), scans from the start to the end (40-45), then from 0 to the start (46-50), and returns the first state whose condition is true. It is used only by `Interface.cpp` 3568-3571, which returns the text of the picked state.
- Choosing a line, `DialogHandler::DialogChooseTransition` (259-300): the journal line is written first (262), then the line's text is shown (265-269). If the transition has actions, they are queued on the target: SetInterrupt(FALSE), then BreakInstants() unless the transition is immediate (284-286), then each action, then SetInterrupt(TRUE) (279-291). If the transition is final (295), dialogue ends after setting `DF_POSTPONE_SCRIPTS` when there are actions (296-299).
- Parked scripts: while `DF_POSTPONE_SCRIPTS` is set, area scripts return early on each run (`Scriptable.cpp` 318-319), unless the `CUTSCENE_AREASCRIPTS` feature is on. Any script of an object that is in the current dialogue returns early while the dialogue runs (322-325). Because the function returns early, the script is evaluated again on a later call (inferred from the early return; the code that clears the flag was not read).

## 2. Key functions

- `Game::AddJournalEntry`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` 1029-1066. The whole ledger write: find by text, no-op on same section, group supersede for Solved, in-place update, or insert.
- `Game::DeleteJournalGroup`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` 1019-1027. Removes every line whose group byte matches.
- `Game::FindJournalEntry`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` 1110-1118. Returns the first line with the text.
- `DialogHandler::UpdateJournalForTransition`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/DialogHandler.cpp` 35-48. Maps transition flags to a section index and writes the line.
- `DialogHandler::DialogChooseTransition`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/DialogHandler.cpp` 259-300 (journal write at 262; action queue 273-291; final transition 295-300).
- `Dialog::FindFirstState`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Dialog.cpp` 24-33. First passing state in priority order.
- `Dialog::FindRandomState`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Dialog.cpp` 35-52. Random start, then first passing state with wrap.
- `GameScript::SetQuestDone`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/GameScript/Actions.cpp` 3858-3863.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keyed quest line: same key and same section is a no-op | Section enum Main/Unsolved/Solved/User/UserBit (theirs, `Game.h` 109-115) |
| Solved line with a group removes the whole group, then inserts the solved line | Group is a byte taken from transition flags bits 16-23 (theirs, `DialogHandler.cpp` 47) |
| Flags to state: unsolved bit = 1, solved bit = 2, both = 3 | Bits 0x40 and 0x100 (theirs, `Dialog.h` 23, 25; `DialogHandler.cpp` 41, 44) |
| Stamp each line with time and a chapter counter | Chapter read from the global `CHAPTER` (theirs, `Game.cpp` 1058) |
| First passing state in authored priority order | Priority = DLG trigger index (theirs, `DLGImporter.cpp` 82) |
| Random pick with wrap-around scan | `RAND(0u, max - 1)` (theirs, `Dialog.cpp` 39); the scan is not uniform (see section 6) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the journal (same section is a no-op, group supersede for Solved, in-place update, insert). It fixes the duplicate-line defect by also removing lines with the same text on supersede, and it makes the random pick uniform. It omits the feedback text and sound, the save format, the chapter and time sources (passed in as functions), the section mapping from transition flags, the dialogue action queue and the final-transition handling. It does not reorder anything the donor does, apart from the two fixes.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Section = "main" | "unsolved" | "solved";

interface JournalEntry {
  textId: number;   // string-table key of the journal line
  section: Section;
  group: number;    // 0 = ungrouped; a solved line supersedes its group
  time: number;     // game seconds when the line last changed
  chapter: number;
}

class Journal {
  entries: JournalEntry[] = [];
  constructor(private now: () => number, private chapter: () => number) {}

  find(textId: number): JournalEntry | undefined {
    return this.entries.find((e) => e.textId === textId);
  }

  // Returns true if the journal changed.
  add(textId: number, section: Section, group: number): boolean {
    const existing = this.find(textId);
    if (existing) {
      // same section again: no-op, no feedback
      if (existing.section === section) return false;
      if (section === "solved" && group !== 0) {
        // supersede: drop the whole group, and this line too (the fix: the donor leaves
        // an old line behind when its group differs from the new group)
        this.entries = this.entries.filter((e) => e.group !== group && e.textId !== textId);
      } else {
        existing.section = section;
        existing.group = group;
        existing.chapter = this.chapter();
        existing.time = this.now();
        return true;
      }
    }
    this.entries.push({ textId, section, group, time: this.now(), chapter: this.chapter() });
    return true;
  }
}

// NPC dialogue: states are tried in authored priority order; the first whose condition holds wins.
interface DialogState {
  id: number;
  condition?: (ctx: unknown) => boolean; // no condition = never picked (as in the donor)
}

function firstState(states: DialogState[], ctx: unknown): number {
  for (const s of states) {
    if (s.condition && s.condition(ctx)) return s.id;
  }
  return -1;
}

// Random line: pick uniformly among the states that pass (the fix: the donor starts at a random
// index and takes the next passing state, which favours states that follow a run of failing ones).
function randomState(states: DialogState[], ctx: unknown, rand: (n: number) => number): number {
  const ok = states.filter((s) => s.condition && s.condition(ctx));
  return ok.length ? ok[rand(ok.length)].id : -1;
}
```

## 5. Lands in

- TARGET `origins/quests/journal.ts` (proposed new module; no Frankendom file was read for this note). It holds the quest log as a section of the one ledger: lines keyed by text id, group supersede, no second list of quest state.
- Parity row: no row in 1-23 covers the quest log. Row 18 (loot roll and XP award) applies only to the reward step that runs when a solved line lands; the quest log itself has no row, and Lead should decide whether it needs one.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (one character/one ledger); zones as data for dialogue and quest content

## 6. Gaps and risks

- Duplicate-line defect (as read): a Solved line whose group differs from the existing line's group does not delete the old line. `DeleteJournalGroup` matches only the new group (1023), and the insert at 1066 adds a second line with the same text. `FindJournalEntry` (1113) then returns the old unsolved line first. Fix: also remove lines with the same text, as the sketch does. The journal screen was not read, so the visible effect is not confirmed.
- Random line bias (as read): `FindRandomState` scans the state index order from a random start (40-50), so a passing state that follows a run of failing states is picked more often. Fix: pick uniformly among passing states, as the sketch does. Caller check: only `Interface.cpp` 3568 uses it.
- Two priority orders in one dialogue: `FindFirstState` uses the trigger order (`Order[i]`, 27), `FindRandomState` uses the raw state index (41, 47). Frankendom should have one authored order.
- Ordering risk: the donor writes the journal line when the player picks the line (262), before the reward actions are queued and run (273-291). If a reward fails, the quest line already moved. Frankendom must pick one order and test it.
- The donor keeps journal lines in a separate list (`Game.h` 218) from the scripts' globals. That is two ledgers. Frankendom's one-ledger ruling means the quest line should be derived from quest state, not stored beside it.
- Parked scripts: the skip gate hides ordering bugs (a script that is evaluated again later can run after the state it was waiting for has changed). Frankendom should not gate the fight step on dialogue; a fight never waits on a quest line.
- The reward path (XP, items, gold from transition actions) was not read. Do not copy the reward model from this note.
- GPL-2.0: clean-room only. The sketch is written from the described order of operations, not translated from the donor.
