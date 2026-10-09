# flareteam-flare-engine (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/flareteam-flare-engine/src/QuestLog.cpp | Licence: GPL-3 | C++ | symbol QuestLog::load / createQuestList (input line 68 verified: `QuestLog::load`; `createQuestList` at 170; `loadAll` at 54 and `logic` at 163 are the entry points)

## 1. Mechanism
- Quests are data. `loadAll` (54-60) lists the quest files across mods, sorts the names and loads each (`mods->list`; a file name defined in a later mod overrides the earlier one, comment at 64, so the override is per file, not per quest). Each quest file (`load`, 68-161) adds one quest record with a top-level name and an optional complete_status (84-91), then one or more `[quest]` sections (78-80). A section lists requirements (requires_status, requires_not_status, requires_level, requires_not_level, requires_currency, requires_not_currency, requires_item, requires_not_item, requires_class, requires_not_class, 100-139) and quest_text (140-150), each loaded as an event component; quest_text carries the index of its quest as a group id (147). An unknown key is logged (152).
- QuestLog stores no quest state of its own. The "active" test is `camp->checkRequirementsInVector` on each section's components (176; its body is not read), recomputed from the campaign (statuses, level, items, currency, class).
- `logic()` (163-165) calls createQuestList(); its caller is not read, so "each frame" is the donor's design, not something seen here. createQuestList (170-263) collects the sections whose requirements pass (175-180), and the quests that have a name and a non-zero complete_status that is set (183-189). If either id list differs from the stored one (193), it stores them, sets the new-quest notification flag (200) and rebuilds the Quest tab: it clears the quest log, then adds the completed quest names newest-last-first in a disabled colour (205-211), then a bold "Completed Quests (n)" heading and a separator if any active quest exists (213-221), then each active section's text in reverse order, adding the bold quest name and a separator when the next section belongs to a different quest (and the name after the last one) (223-261).
- Inputs: quest data, campaign status and hero state. Outputs: a menu log and a new-quest notification flag (set on any change, including a quest completing). Rebuilds only on change.

## 2. Key functions
- QuestLog::loadAll (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/QuestLog.cpp | 54-60 | loads every quest file across mods, sorted.
- QuestLog::load (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/QuestLog.cpp | 68-161 | parses one file into quest name, complete status and per-section event components.
- QuestLog::logic (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/QuestLog.cpp | 163-165 | per-frame call that rebuilds the list.
- QuestLog::createQuestList (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/QuestLog.cpp | 170-263 | evaluates requirements, detects change, draws completed then active quests.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Quest state derived from requirements each frame, never stored | The ten requirement keys and quest_text (theirs, lines 100-140) |
| Change-detect on id lists; rebuild the view only on change | Two id lists, active and completed (theirs, lines 171-172 and 193) |
| Completed quest gated by a single campaign status | complete_status name (theirs, per quest) |
| Data-driven quests loaded from per-file data | File-level last-defined-wins across mods (theirs, line 64) |

## 4. TypeScript sketch
simplified: the sketch drops the file parse and the mod override, the group ids and per-quest bold names and separators, the completed-quests heading with its count, the ordering of the completed block before the active block, the notification flag, and the disabled colour. Its requirement test is one function per section (the donor evaluates a vector of event components through the campaign object). It does keep the derive-from-requirements and change-detect steps, and reverses both lists as the donor does.

```ts
// Licence: GPL-3 (flareteam-flare-engine). CLEAN-ROOM: written from the mechanism, no donor lines.
interface Campaign { has(status: string): boolean; level: number; items: Map<string, number>; currency: number; }
interface Section { requires: (c: Campaign) => boolean; text: string; quest: number; }
interface QuestDef { name: string; completeStatus?: string; }

interface Log { active: number[]; completed: number[]; }

function questLog(quests: QuestDef[], sections: Section[], c: Campaign, prev: Log): { log: Log; changed: boolean } {
  const active = sections.map((s, i) => (s.requires(c) ? i : -1)).filter((i) => i >= 0);
  const completed = quests
    .map((q, i) => (q.completeStatus && c.has(q.completeStatus) && q.name ? i : -1))
    .filter((i) => i >= 0);
  const changed = active.join() !== prev.active.join() || completed.join() !== prev.completed.join();
  return { log: { active, completed }, changed };
}

function rebuildView(quests: QuestDef[], sections: Section[], log: Log): string[] {
  const lines: string[] = [];
  for (const q of log.completed.slice().reverse()) lines.push(`[done] ${quests[q].name}`);
  for (const i of log.active.slice().reverse()) {
    lines.push(sections[i].text);
  }
  return lines;
}
```

## 5. Lands in
- Frankendom target: `origins/quests/journal.ts` for the state (it already stores a per-character stage for each quest and appends entry text, per its header; it exists on the VPS snapshot /root/work-k7, not main, only the header read) and a NEW client view `src/quest-log.ts` that renders the journal (does not exist today). A requirement vector maps onto the contracts' `holdsCondition` conditions named in `origins/talk/README.md`.
- Parity-checklist row: none of rows 1 to 22 (row 14 is the fight HUD and does not cover a quest tab). Feature-map section: Origins O2 quests (`docs/specs/origins/openmw-quest-journal.md` on the snapshot).
- Reuse tag: rewrite-from-idea (GPL-3; the derive-from-requirements idea maps, the code does not)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Requirements read campaign state on the client (`camp`). Frankendom's server-verified rule means the server evaluates requirements before a quest is shown or completed, and the client view only renders the journal the server returns.
- No save of quest state here. The state is in campaign statuses, which must come from the server save. Frankendom's journal is explicit stage state, so deriving "active" from requirements each pass is a different model; adopting it would mean quests have no stored progress.
- Completion is one status flag (88-91); a Frankendom quest with a reward ledger needs paid-once rewards recorded with it.
- The change test compares whole id lists (193), so any change rebuilds the whole log and raises the notification, including a completion with no new text.
- Pit is a client only and has no quest log. Quest data is content (zones as data).
- Donor is GPL-3, so only the mechanism is described here.
- Not read: `checkRequirementsInVector`, `loadEventComponent`, `MenuLog`, and the caller of `logic`.
