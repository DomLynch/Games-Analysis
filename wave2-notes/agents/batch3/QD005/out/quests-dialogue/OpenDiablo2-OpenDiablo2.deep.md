# OpenDiablo2-OpenDiablo2 (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/quest_log.go` | Licence: GPL-3.0 (LICENSE line 2: "Version 3, 29 June 2007"; clean-room only) | Go | symbol `QuestLog` (Advance, Open, Close, stopPlayedAnimations, playQuestAnimations, setQuestLabel)

Checked: The whole quest-state mechanism in this donor is the UI reveal state machine in `quest_log.go`. I read lines 54-215, 301-336, 360-644 of that file; not read: lines 1-53 (imports, layout constants), 216-300 (Load body, loadTabs) and 337-359 (the button callback body). Those unread parts set sprites and widgets, not the status, as far as the grep for `questStatus` shows (`grep -rn questStatus` returns writes only at 433 and 595). Status values are in `d2enum/quests.go` (read in full). Confidence medium. The transitions that matter for Frankendom are NOT in this donor: nothing sets `Completing`, nothing reads a save file, and the status map is a hard-coded fixture (quest_log.go 81-110, comment "this is only test"). No objective counting, no reward grant, no dialogue tree and no quest script exist here (grep of all Go for dialog, objective, reward, RunScript found none; the script VM has no caller that runs a file). Depth is therefore thin. If the reader lead rules a UI reveal state too thin to count, downgrade to PARTIAL; the verdict rests only on this file. Quest-gated data fields are parsed but have no consumer in the repo (grep, not opened in full).

Best transferable idea: Keep "done but reveal still owed" as its own state, separate from "done", so a completion plays exactly once and the reveal itself moves the quest to done; in Frankendom the server ledger owns the first transition and the client only acknowledges the reveal.
Decision (proposed): adapt - keep the reveal-once state, but move the Completing write to the server ledger (one ledger). The donor keeps status in the UI object, which breaks the one-ledger ruling.
Acceptance: A server test asserts that only `completeQuest` writes Completing and that a client reveal ack can only move Completing to Completed; in the client, a finished quest's reveal plays once per quest, including after closing the log and reopening on another tab.

## 1. Mechanism

- Each quest has one integer status: -2 Completed (done), -1 Completing (done, reveal still owed), 0 NotStarted, and n >= 1 InProgress at step n (`quests.go` 39-42; the comment at lines 26-37 describes the same intent). The icon frame is chosen from the status when the board is built (`makeQuestIconForAct`, quest_log.go 392-402).
- Quest ids are flat: `(act-1) * 6 + slot`, minus 3 for act 5 (`cordsToQuestID`, 637-644). Act 4 has 3 slots (`loadQuestBoard`, 305-311).
- Order of steps on open: `Open` (555-560) shows the panel, calls `setTab` (558), which calls `playQuestAnimations` (503), and then `Open` calls `playQuestAnimations` again (559). Each Completing icon on the selected tab plays the reveal sound (414), is activated (417), and plays forward for the constant 3 with no loop (419-421).
- Order of steps per frame: `GameControls.Advance` calls `questLog.Advance(elapsed)` (game_controls.go 720). `QuestLog.Advance` returns at once if the panel is closed (583-585). For each Completing icon on the selected tab it advances the icon by `elapsed` (590), and if the icon is on frame 24 (594) it writes Completed (595).
- Order of steps on close: `Close` hides the panel (565), hides the boards (567-569), calls `stopPlayedAnimations` (571), then the close callback (573). `stopPlayedAnimations` writes Completed for each Completing icon on the selected tab (430-433) and sets its frame to 24 (435).
- Journal text (`setQuestLabel`, 444-481): title from a key; Completed and Completing show one fixed "previous" line (456-463); NotStarted shows nothing (464-465); any other status looks up the key `qstsa<act>q<slot><step>` and blanks the text if the key is missing (467-479).
- Button gate: a quest's button is enabled only when its status is not NotStarted (334).
- Tick: frame-driven by the GUI loop through `elapsed` (seconds or ticks: not read, the unit of `elapsed` in `d2ui` is not read). Not a server tick.

## 2. Key functions

- `QuestLog.Advance`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/quest_log.go` 582-599. Frame-driven completion: Completing becomes Completed only when the icon reaches frame 24.
- `QuestLog.Open`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/quest_log.go` 555-560. Calls `setTab` and then `playQuestAnimations` (double call; see section 6).
- `QuestLog.Close` and `stopPlayedAnimations`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/quest_log.go` 563-574 and 428-441. Flush on close, selected tab only.
- `QuestLog.playQuestAnimations`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/quest_log.go` 410-424. Plays the reveal for each Completing icon on the selected tab.
- `cordsToQuestID`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/quest_log.go` 637-644. Maps act and slot to the flat id.
- Status enum: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2common/d2enum/quests.go` 38-43.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Separate "done, reveal owed" from "done"; the reveal moves the state | Status codes -2 / -1 / 0 (theirs, `quests.go` 39-41) |
| Reveal length is a fixed constant, played once, no loop | 3 (theirs, `quest_log.go` 54; the unit of SetPlayLength is not read) |
| Completion frame check ends the reveal | Frame 24 (theirs, `quest_log.go` 187) |
| Flat quest id from act and slot | 6 slots per act (`quest_log.go` 638 uses `NormalActQuestsNumber`), 3 in act 4 (`quests.go` 7), minus 3 for act 5 (`quest_log.go` 639-641) |
| Journal line by step number, blank if missing | Key format `qstsa%dq%d%d` (theirs, `quest_log.go` 467) |
| Fixture statuses for testing | Values at `quest_log.go` 82-110, labelled "this is only test" (81) |

## 4. TypeScript sketch

simplified: the state names, the reveal-once rule and the journal fallback follow the donor. Two things are changed on purpose. (a) `completeQuest` is not in the donor: it is the Frankendom addition that makes the server ledger the only writer of Completing. (b) `closeLog` settles every shown quest, where the donor settles only the selected tab (430-431). The reveal duration is kept as data but is not enforced by the sketch, and `settleReveal` is called by the caller when the animation ends, not by a frame-equality check. The sketch uses a `Map` in place of the donor's `questStatus` map.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described state machine, not a translation of the donor.
export const QS = {
  Completed: -2,   // done, nothing owed to the player
  Completing: -1,  // done, reveal still owed to the player
  NotStarted: 0,
} as const;
// Any value >= 1 is "in progress, step n".

export type Ledger = Map<number, number>; // quest id -> status

export const REVEAL_LENGTH = 3; // donor constant questCompleteAnimationDuration; unit of SetPlayLength not read

// Button enabled only once a quest has left NotStarted.
export function isOpenable(status: number): boolean {
  return status !== QS.NotStarted;
}

// Journal text: finished quests show one fixed line; NotStarted shows nothing; a step with no text shows nothing.
export function journalText(status: number, stepText: (step: number) => string | undefined, doneLine: string): string {
  if (status === QS.Completed || status === QS.Completing) return doneLine;
  if (status === QS.NotStarted) return "";
  return stepText(status) ?? "";
}

// Server-side transition (Frankendom addition, not in the donor): the ledger moves to Completing once.
export function completeQuest(ledger: Ledger, id: number): boolean {
  const s = ledger.get(id) ?? QS.NotStarted;
  if (s === QS.Completed || s === QS.Completing) return false;
  ledger.set(id, QS.Completing);
  return true;
}

// Client-side: the reveal finished (animation end) or the log closed; Completing becomes Completed.
export function settleReveal(ledger: Ledger, id: number): void {
  if (ledger.get(id) === QS.Completing) ledger.set(id, QS.Completed);
}

// Close: settle every quest the log showed (the donor settles only the selected tab).
export function closeLog(ledger: Ledger, shownIds: number[]): void {
  for (const id of shownIds) settleReveal(ledger, id);
}
```

## 5. Lands in

- TARGET `origins/quests/quest-ledger.ts` (proposed path, not checked against the repo): the server ledger that owns quest status and is the only writer of Completing. The client reveal lives in the quest UI and only acknowledges. Parity-checklist row 18 (loot roll and XP award: a quest reward is the award step, and the reveal must follow the ledger write).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (rewards and quest state written once, on the server); the reveal is client-only.

## 6. Gaps and risks

- The donor has no quest logic beyond the reveal: no objective counting, no reward grant, no dialogue tree, no quest script, no save read. Frankendom needs all of those from its own design; this donor gives only the reveal-once state.
- Quest-gated data fields exist but have no consumer in the repo (grep for `QuestFlag`, `QuestMultipliers`, `TreasureClassQuest` outside the loaders and records finds none): NPC price multipliers keyed by quest flag (`npc_loader.go` 31-45; the table path constant is NPC, `d2resource/resource_paths.go` 331, `npc.txt`), quest treasure-class trigger and state (`monster_stats_record.go` 185-192, "the ID of the Quest State that you need to complete"; table path constant MonStats, `resource_paths.go` 451, `monstats.txt`), and a town-portal gate by quest flag (`level_details_record.go` 104-111, LevelDetails path constant `resource_paths.go` 291, `Levels.txt`; the portal rule is from the donor comment, not from code). The loader call sites that bind these path constants were not traced (not read). The tables themselves are in the game archive, not in the repo, so their rows were not counted. Frankendom could take these as zone data fields, but the donor does not show how they are applied.
- The donor's string table is not in the repo: the journal text comes from `/data/local/lng/<lang>/string.tbl` in the game archive (`d2resource/resource_paths.go` 217). It was not opened and not counted.
- Defects found while reading (keep the idea, fix in Frankendom):
  1. Double reveal on open: `Open` calls `setTab` (558), which calls `playQuestAnimations` (503), then calls `playQuestAnimations` again (559). Each Completing icon plays the sound twice (414) unless the audio layer dedups (not read). Fix: one reveal call per open, or a per-quest "revealed" flag that makes the reveal idempotent.
  2. Reveal flush is per tab: `stopPlayedAnimations` iterates only the selected tab (430-431), and `setTab` does not settle the old tab. A Completing quest on another tab stays Completing and replays its sound when that tab is opened. Fix: settle every shown quest on close (the sketch's `closeLog`). Reachable in this donor only through the fixture value -1 at id 7 (`quest_log.go` 90).
  3. Frame-equality completion: `Advance` writes Completed only when the icon reaches frame 24 (594). If the sprite stops on another frame, Advance never settles it during play; close still does. The end-of-animation behaviour of `d2ui` Sprite is not read. Fix: settle on an explicit animation-finished event, not on a frame number.
  4. Slot base convention: `setQuestLabel` subtracts 1 from the slot (454) because `onQuestClicked` passes a 1-based slot (360, 530), while `makeQuestIconForAct` (392) and `playQuestAnimations` (412) use 0-based slots. It works today only because every caller follows the convention. Fix: one id helper with an explicit base.
  5. Test fixture in the constructor (81-110) sets live-looking states; Frankendom must read statuses from the ledger and never ship the fixture.
- Quests are not zone data here: the donor hard-codes 6 slots per act and 3 in act 4 (`quests.go` 5-7), with no per-zone quest rule. Frankendom should carry quest ids and steps as zone data.
- GPL-3.0: clean-room only. The sketch is written from the described state machine.
