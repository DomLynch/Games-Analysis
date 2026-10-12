# openmw (quests-dialogue-npc-routines, cell 2)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwdialogue/quest.cpp` (quest progress), `apps/openmw/mwdialogue/journalimp.cpp` (journal, load), `apps/openmw/mwdialogue/journalentry.cpp` (index to INFO), `apps/openmw/mwdialogue/filter.cpp` (dialogue response choice), `apps/openmw/mwdialogue/selectwrapper.cpp`, `components/esm3/loadinfo.hpp` and `loadinfo.cpp` (INFO record fields), `apps/openmw/mwmechanics/aisequence.cpp` (AI package queue), `apps/openmw/mwmechanics/aiwander.cpp` (idle roll) | Licence: GNU GPL v3 (root `LICENSE`, first line "GNU GENERAL PUBLIC LICENSE", Version 3, 29 June 2007). Copyleft: clean-room, shape only; no line-by-line translation | C++ | symbol `MWDialogue::Quest::addEntry`

Checked: Opened quest.cpp (all, 103 lines); journalimp.cpp 21-29, 78-125, 214-257; journalentry.cpp 82-99, 133-141; filter.cpp 83-100, 166-172, 209-234, 231-345 (dispatch and numeric compare), 740-779; selectwrapper.cpp 13-60 and 250-260; loadinfo.hpp 38-60; loadinfo.cpp 66-90; queststate.hpp (all); aisequence.cpp 340-362 and 492-500 (start of fill), grep only for 505-528; aiwander.cpp 157-160, 376-380, 747-770, aiwander.hpp 80-90. Confidence: high for the quest-progress rules and the dialogue choice order (read end to end, receipts). High for the routines finding (the donor says the time-of-day field is not functional). Medium for the testPlayer and actor gates (read in part, not in full). Not read: the Lua quest hooks (questUpdated) beyond their call sites; the Journal save writer (journalimp.cpp 155-200, grep only); the greeting state machine (`greetingstate.hpp`, not opened); the script side that sets journal indexes (MWScript functions, not opened); the Morrowind game data (not in the box). Camera: out of scope for this note.

Verdict: STRONG for quest progress and dialogue response choice (both real, read, and self-contained). For routines, this donor has no working clock schedule: see section 1.

Best transferable idea: quest progress as a forward-only journal index plus a finished or restart marker carried by each dialogue line, with each line counted once, so a quest's state is one small record that any line can move but never move backwards.
Decision (proposed): adapt - take the index plus markers and per-line dedupe for the quest record; do not take the same-name restart loop as is (it scans every quest), and fail the zone load on a duplicate journal index instead of picking the first match.
Acceptance: a server test for one quest with lines at index 1 (no restart), index 2 (finished), and a restart line: hearing index 2 twice adds one entry and leaves the index at 2; a late index 1 line does not lower the index; the finished flag clears on the restart line; a zone whose quest has two lines with index 2 fails to load.

## 1. Mechanism

- Quest state (quest.cpp 14-33, 97-102). A quest is a dialogue topic plus three values: the journal index (`mIndex`), a finished flag (`mFinished`) and a list of entries. Saved as topic, index and finished flag (`ESM::QuestState`, queststate.hpp 15-18).
- Applying a line (quest.cpp 69-95). Each dialogue line can carry a journal index (`mData.mJournalIndex`, which must not be -1, quest.cpp 77) and one quest marker: name (QS_Name, 41), finished (QS_Finished, 81) or restart (QS_Restart, 91, 94). Order inside `addEntry`: set finished from the marker (80-81); move the index up only if the line's index is larger (83-87); if this line was already heard for this quest, stop (89-91); otherwise append the line as an entry (93); return whether the line is a restart (91, 94).
- Journal level (journalimp.cpp 81-116). `Journal::addEntry` first checks for a repeat of the same topic and line (86): a repeat only moves the index up (88) and does not re-add. A new line creates the quest on demand (26, `getOrStartQuest`), calls `quest.addEntry` (99), and if that returned restart, un-finishes every other finished quest with the same name (105). Empty-text lines advance state but are not shown in the journal (111).
- Index to line (journalentry.cpp 87-99). A quest's index maps to a line by scanning the topic's lines for the first one with that index (93). No match throws (98). A duplicate index therefore silently resolves to the first line in file order.
- Dialogue choice (filter.cpp 740-779, 209-234). `Filter::list` walks one topic's responses in file order (746). A response is taken when: its actor, race and player gates pass (testActor, testPlayer, 746); every select condition passes (testSelectStructs: AND over all selects, 211-216); and the NPC's derived disposition is at least the response's disposition value (testDisposition, 225-228). The first taken response wins unless the caller asks for all (`searchAll`, 748-752). If nothing is taken and some response failed only on disposition, the topic "Info Refusal" is searched with the same tests (759-766).
- Select conditions (filter.cpp 267-310; selectwrapper.cpp 13-40). A condition is a function, a name or argument, a comparison (equal, not equal, greater, greater or equal, less, less or equal; 17-30) and a value. Gates before the comparison: a choice-based function is rejected outside a choice (269-270); weather is rejected in interior cells (276-277). A global that does not exist makes its condition pass (308).
- Records (loadinfo.hpp 41-58; loadinfo.cpp 77-86). One data block holds either a disposition (for responses) or a journal index (for journal lines) in the same four bytes (a union, loadinfo.hpp 42-44). The quest marker is a subrecord: QSTN (name), QSTF (finished), QSTR (restart).
- Load (journalimp.cpp 214-257). Saved journal lines are restored only if their topic and line still exist (223). Quest states are restored and the index is re-applied (247-253), with a comment that this handles players upgrading from the base game file to the expansion file (251-252).

### Routines (NPC daily schedules)

- openmw has no clock-driven schedule in this donor. The wander package takes a time-of-day parameter (aiwander.cpp 157), and the header says it is "Currently unimplemented. Not functional in the original engine." (aiwander.hpp 84). It is stored and never read for scheduling.
- NPC activity is an actor's AI package queue (aisequence.cpp 340-362). The front package runs; when it reports completion and is a repeating non-combat package, it is reset and cloned to the back of the queue (350-354). So the routine is a round-robin of packages, not a time window. A wander package ends when its duration runs out (aiwander.cpp 378).
- Idle choice (aiwander.cpp 752-767). An idle is attempted only if a random roll is at most the `fIdleChanceMultiplier` game setting (752). Then each of the 8 idle slots gets its own roll from 0 to 100 (759), and the slot whose chance covers its roll and that is highest so far wins (760). Slots are independent, not a cumulative table, so the chances do not have to sum to 100.

## 2. Key functions

- `MWDialogue::Quest::addEntry`: `/mnt/frankendom-donors/openmw/apps/openmw/mwdialogue/quest.cpp` 69-95.
- `MWDialogue::Journal::addEntry`: `/mnt/frankendom-donors/openmw/apps/openmw/mwdialogue/journalimp.cpp` 81-116.
- `JournalEntry::idFromIndex`: `/mnt/frankendom-donors/openmw/apps/openmw/mwdialogue/journalentry.cpp` 87-99.
- `MWDialogue::Filter::list`: `/mnt/frankendom-donors/openmw/apps/openmw/mwdialogue/filter.cpp` 740-779.
- `MWDialogue::Filter::testSelectStructs` and `testSelectStruct`: `/mnt/frankendom-donors/openmw/apps/openmw/mwdialogue/filter.cpp` 209-234 and 267-310.
- `AiWander::getRandomIdle`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/aiwander.cpp` 747-767.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| Journal index only moves forward | Rule, not a number (quest.cpp 83) |
| Quest line marker: finished, restart, name | Three enum values, 1 (name), 2 (finished), 3 (restart) (loadinfo.hpp 55-58) |
| Missing journal index is an error | -1 means no journal entry (quest.cpp 77) |
| Disposition gate | Integer threshold in the response data, compared to the NPC's derived disposition (filter.cpp 225-228); range not read |
| Select comparisons | Six operators (selectwrapper.cpp 17-28) |
| Missing global passes | Rule (filter.cpp 308) |
| Idle gate and slot rolls | `fIdleChanceMultiplier` game setting (value not read); slot rolls 0 to 100 (aiwander.cpp 759) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for quest lines (finished or restart marker, then forward-only index, then per-line dedupe, then the restart return) and for response choice (file order, conditions ANDed, disposition gate, first match unless searchAll, refusal topic fallback). It omits: the journal-level repeat shortcut (journalimp.cpp 86-89), the same-name restart loop across quests (journalimp.cpp 102-108), the empty-text rule for the visible journal, the actor, race, faction and player gates, the choice and weather gates, the numeric local and global dispatch (the sketch takes a `read` function), the invert flag for service refusal, the Lua hooks, and save and load. The sketch throws on a missing journal index, as the donor does (quest.cpp 77-78).

```ts
// clean-room sketch of openmw's quest progress and dialogue response choice (GPL-3.0 donor; shape only)
type Cmp = "eq" | "ne" | "gt" | "ge" | "lt" | "le";

interface Select { read: () => number | undefined; cmp: Cmp; target: number; }

// qStatus: the INFO's quest marker (none, name line, finished, restart).
interface Info {
  id: string;
  journalIndex: number;
  qStatus: "none" | "name" | "finished" | "restart";
  disposition: number;
  selects: Select[];
  text: string;
}

interface Quest { topic: string; index: number; finished: boolean; seen: Set<string>; entries: string[]; }

function compare(cmp: Cmp, a: number, b: number): boolean {
  switch (cmp) {
    case "eq": return a === b;
    case "ne": return a !== b;
    case "gt": return a > b;
    case "ge": return a >= b;
    case "lt": return a < b;
    case "le": return a <= b;
    default: throw new Error("unknown comparison");
  }
}

// A select passes when its value is missing (the donor ignores a missing global) or the comparison holds.
function selectPasses(s: Select): boolean {
  const v = s.read();
  if (v === undefined) return true;
  return compare(s.cmp, v, s.target);
}

// applyInfo: one quest line heard. Finished/restart set the flag, the index only moves forward,
// a line already heard is not added twice. Returns true when this line is a restart.
function applyInfo(q: Quest, info: Info): boolean {
  if (info.journalIndex < 0) throw new Error("no journal index on " + info.id);
  if (info.qStatus === "finished") q.finished = true;
  if (info.qStatus === "restart") q.finished = false;
  if (info.journalIndex > q.index) q.index = info.journalIndex;
  if (!q.seen.has(info.id)) {
    q.seen.add(info.id);
    q.entries.push(info.text);
  }
  return info.qStatus === "restart";
}

// pickResponse: responses of one topic in file order; the first that passes wins unless searchAll.
// A response that passes everything but the disposition gate is a refusal; if every response is refused,
// the refusal topic is searched instead.
function pickResponse(topic: Info[], refusalTopic: Info[], npcDisposition: number, searchAll = false): Info[] {
  const out: Info[] = [];
  let refused = false;
  for (const info of topic) {
    if (!info.selects.every(selectPasses)) continue;
    if (npcDisposition >= info.disposition) {
      out.push(info);
      if (!searchAll) break;
    } else {
      refused = true;
    }
  }
  if (out.length === 0 && refused) {
    for (const info of refusalTopic) {
      if (!info.selects.every(selectPasses)) continue;
      if (npcDisposition >= info.disposition) {
        out.push(info);
        if (!searchAll) break;
      }
    }
  }
  return out;
}

export {};
```

Typecheck: copied to the VPS as /tmp/qu001-openmw-quest-dialogue.ts; `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in

- TARGET `origins/quests/journal.ts` (new module, proposed; not in the tree yet): the quest record and the line-apply rule. Parity-checklist row 20 (catalogue as runtime source): quest lines and dialogue responses are catalogue rows read at runtime, and the module reads them from the catalogue. The dialogue choice belongs with the same catalogue rows.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room, shape only).
- Brief rule served: zones as data (quest and dialogue rows in the zone catalogue); one ledger (one quest record per character, forward-only). Rules 7-9 n/a.

## 6. Gaps and risks

- Duplicate journal index: `idFromIndex` takes the first line with a given index in file order (journalentry.cpp 93) and throws only when none matches (98). Two lines with the same index in one quest are silent. Fix: the zone load rejects a duplicate index per quest.
- Restart scans all quests: `Journal::addEntry` un-finishes every other finished quest with the same name (journalimp.cpp 102-108). Fix: scope restart to the quest id in the catalogue, not to the display name.
- Missing global passes (filter.cpp 308): a typo in a global name silently makes a response available. Fix: the catalogue validator checks that each select names a known field, at load.
- Weather rule deviation: the donor notes that the original engine lacks the quasi-exterior check (filter.cpp 277) and keeps the deviation. Frankendom has no weather; the rule does not transfer.
- Clock schedules are absent here: see section 7 and the OpenGothic note for a working clock window.
- Quest state and dialogue are per process: no server authority or concurrency model. The one-ledger rule must be added by Frankendom.
- Creatures get only topics bound to their id (filter.cpp 95-98). That is a useful gate for Frankendom's non-talking creatures (`testActor`, 95-98, read: with no actor id on the response and a creature speaker, the response is refused). The mirror rule is `Filter::testDisposition` 220-223: a creature (non-NPC speaker) skips the disposition gate and returns true, so creature topics never fail on disposition. `Journal::addEntry` (88-92) also shows the journal-entry UI message when a repeat entry raises the stored index.

## 7. As-data shape (PASS2)

- Dialogue response row (INFO). Fields: actor id (string, may be empty), race, faction and rank gates (not read in full), disposition int (`mData.mDisposition`, union with journal index, loadinfo.hpp 42-44), select list (each: function, name or argument, comparison, value), text, and quest marker (none, name, finished, restart; loadinfo.cpp 77-86). A new response is one row: yes (one INFO record with a list of conditions). Conditions are typed rows, so a new condition kind needs code in the evaluator, not in the data.
- Quest line row (journal entry): topic id, journal index (int, must exist), marker, text. A new quest line is one row: yes. A new quest is one row: yes for the journal (a topic whose lines carry indexes). Objectives, prerequisites and rewards are not in the data; they live in game scripts (not in this box).
- Saved quest state: topic (string), index (int), finished (byte). A new saved field needs a save-format change (queststate.hpp 15-18).
- Provenance per claim: `/mnt/frankendom-donors/openmw` (GPL-3.0 LICENSE). Shape only.

## 8. Provenance and licence

Every claim naming a file and line has a receipt in `/private/tmp/p2/wave2-haiku/batch3/QU001/receipts.tsv` (138 rows across all three games, verifier passed). Licence: GNU GPL v3 (`/mnt/frankendom-donors/openmw/LICENSE`, first line read), so the contract shape is taken from reading, not copied.

## 9. What they patched later

- No commit history in this box for these files (the clone was not inspected for history; "no history available" for this read).
- Patch comments in code:
  - journalimp.cpp 251-252: "reapply quest index, this is to handle users upgrading from only Morrowind.esm (no quest states) to Morrowind.esm + Tribunal.esm". A save-upgrade fix: index restored from the line data when the quest state is missing.
  - journalimp.cpp 223: a saved line is loaded only if its topic and line still exist. A guard against content that was removed between saves (no comment; the check is the fix).
  - filter.cpp 277: a noted deviation from the original engine's weather check.
  - filter.cpp 308: a missing global is ignored (a tolerance; the comment says so).
  - filter.cpp 762 and 766: the refusal fallback topic, named "Info Refusal" in code.
  - aiwander.hpp 84: time of day is unimplemented in the wander package, "not functional in the original engine".
  - aisequence.cpp 357-359: the active package is "not always" the first entry (an AI pursue that runs a script can put a combat package at the front). A known exception to the queue rule.

## 10. Rulings for Dom

1. Should each dialogue line carry a forward-only quest index and a finished or restart marker, so a quest is one small record (the openmw model)? Recommendation: yes, and the zone load rejects a duplicate index per quest.
2. Should NPC routines be clock windows (OpenGothic) or repeating package queues (openmw)? Recommendation: clock windows as zone data, because openmw's queue has no time of day and the donor says its time field does not work.
3. Should the restart rule act on a quest id from the catalogue rather than the display name? Recommendation: yes; the display name can match two quests.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room).
Brief rule served: zones as data (catalogue rows) and one ledger (one quest record per character). Rules 7-9 n/a.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- The cite aisequence.cpp 18-20 for the "active package is not always the first" comment is wrong; the comment is at aisequence.cpp 357-359 (18-20 are includes).
- Missed: Filter::testDisposition 220-223 returns true for non-NPC speakers (creatures skip the disposition gate); Journal::addEntry 88-92 shows a UI message on a repeat that raises the index.

Fixed 2026-10-12: corrected the aisequence.cpp cite (section 9 comment list) and added the creature disposition rule and addEntry line to the creature-gate gap.
