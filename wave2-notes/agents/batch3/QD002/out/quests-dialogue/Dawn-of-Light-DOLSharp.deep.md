# Dawn-of-Light-DOLSharp (quests-dialogue, cell 3)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/quests/QuestsMgr/DataQuest.cs` | Licence: GNU GPL version 2 or any later version (header of DataQuest.cs line 7 and AbstractQuest.cs line 7, "either version 2 ... or (at your option) any later version"; the repo LICENSE and gpl.txt are GPL v2) | C# | symbol `DataQuest.AdvanceQuestStep`

Checked: The hinted file `DOLDatabase/Tables/DataQuest.cs` is the database table class (382 lines); I read only its header and line count. The engine is `GameServer/quests/QuestsMgr/DataQuest.cs`. Read in full: `AdvanceQuestStep` (1586-1780), `FinishQuest` (2827-3062), `OnEnemyKilled` (2705-2735), `Notify` (1795-1945, with its kill route at 1901), `CheckQuestQualification` (1007-1088), `MaxQuestCount` (886-893), the `Step` setter and `GetCharacterQuest` (945-1003). Read in part: the step accessors `StepType`, `TargetName`, `TargetRegion`, `StepItemTemplate`, `RewardXP` (1148-1410), `ParseQuestData` (361-506; the rest of it, including any length check on the parallel lists, was not read), `ExecuteCustomQuestStep` (1521-1545; the call body not read), `CheckOfferQuest` (1993-2100; only the auto-start branch read). Not read: `RewardQuest.cs`, `DataQuestRewardQuest.cs` and `BaseQuest.cs` (the reward-quest variant is described only where `FinishQuest` branches on it), the lines after 3062 of DataQuest.cs. Callers: `AdvanceQuestStep` is called from OnPlayerInteract (2349), OnPlayerGiveItem (2433, 2474), OnPlayerWhisper (2549), OnEnemyKilled (2725) and QuestCommandCompleted (2797). Each call site was seen in grep; OnPlayerInteract and OnPlayerWhisper were not read in full. Confidence: high for the step engine (advance, finish, the gates and the order of grants) and for qualification; moderate for the parse and the custom-step hook. camera_scope: not applicable.

Best transferable idea: a quest is a per-character row holding a 1-based step pointer and a completed count, driven by a list of step definitions (type, target name and region, item, per-step reward); every event either moves the pointer or does nothing, and every bag and XP check runs before any grant or pointer write.
Decision (proposed): adapt - keep the per-character pointer and completed count, the step list as data, the precheck-then-grant order (bag space and XP gates before anything is granted) and the chance roll on a kill step's drop; reject the per-call reward grants, the one-step-per-kill style for counted kills, and the save order (rewards granted before the pointer is reset, with no transaction), because Frankendom needs one ledger posting that moves the pointer in the same write.
Acceptance: a server test in which a full bag or a zero-chance drop leaves the pointer, the ledger and the completed count unchanged; a finish posts one ledger transaction with every reward and sets the pointer to 0 and the completed count to +1 in that same write; a counted kill quest of 10 advances only on the tenth kill of the named target in the named region (0 = any region), with one pointer write per advance.

## 1. Mechanism

- Data. A quest is a DB row. Its per-step fields are strings split on `|` into parallel lists, one entry per step: step types (ParseQuestData, 440), step texts, item templates (454), money (490), XP (500), and the others (CL-XP, RP, BP, targets, regions). The step accessors index the lists by `Step - 1`: type (1231), target name (1156), target region (1179), item template (1304), XP (1408). The read part of `ParseQuestData` does not check that the lists have the same length.
- Progress. Each character has a `CharacterXDataQuest` row per quest with `Step` (1-based; 0 = not active) and `Count` (completed times). A new row starts at step 0 and count 0 (995). The `Step` setter writes the row only when the value changes (961-964).
- Qualification, `CheckQuestQualification` (1007-1088). In order: level band (1009); class allow-list if one is set (1012-1016); the custom qualification hook; for collection quests, the completed count against the cap (1026); the quest is not already in the player's active list; the completed count is below `MaxQuestCount` (1051, and 886-893, where a stored cap of 0 means unlimited); and named prerequisite quests are all in the finished list, compared in lower case (1059-1075).
- Events. `Notify` (1795) is sent to each quest in the player's active list. An enemy-killed event goes to `OnEnemyKilled` (1901). That handler checks the current step's target name, and its region (0 = any), against the killed living (2707). A `Kill` step then calls `AdvanceQuestStep` (2711-2727); a `KillFinish` step calls `FinishQuest` (2729-2731). A kill step matches one kill. There is no kill counter on a step, so a quest that needs ten kills is written as ten steps.
- `AdvanceQuestStep` (1586-1780), in this order:
  1. The next step's type is read from the list at `Step` (1590).
  2. The custom step check runs (1593).
  3. XP and RP gates: a step that gives XP is refused while the player's XP is off, and likewise for RP (1595-1603).
  4. Kill and search steps with an item template of the form `item;chance` roll the chance (1622-1646). A chance of zero is refused with a debug message (1631-1641). A failed roll returns false: no advance (1633-1635).
  5. If the next step is a deliver type, its item template is added to the items to give (1649-1651).
  6. Slot check: if the bag cannot take the items, the player gets a message and the advance is refused (1659-1689).
  7. Items are given (1663-1683); then, if still advancing (1696), the current step's XP, RP, money, CL-XP and BP are granted (1703 for XP), except for a reward quest; then `Step++` (1732); then the quest list is refreshed (1733), and the source text is said.
- `FinishQuest` (2827-3062). In order: no quest, no row, or an unsaved row returns false (2829-2831). The finish hook runs when asked for (2836-2837). Slot precheck for the final and chosen optional items (2843), with a refusal message if there is no room (3024). For a non-reward quest: XP from the list at `lastStep - 1` (2856), refused while XP is off (2866-2870), RP likewise, then the final and chosen items, CL-XP, BP and money at `lastStep - 1` (2856-2930). A reward quest reads index 0 for all of them. Only after all the grants: `Step = 0`, `Count + 1`, save (3029-3031). Then the post-finish hook, the completion message, and the move from the active list to the finished list (3042).

## 2. Key functions

- `AdvanceQuestStep`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/quests/QuestsMgr/DataQuest.cs` 1586-1780. The step engine. Gates first, then grants, then the pointer.
- `OnEnemyKilled`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/quests/QuestsMgr/DataQuest.cs` 2705-2735. Name and region match; kill step advances, kill-finish step completes.
- `FinishQuest`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/quests/QuestsMgr/DataQuest.cs` 2827-3062. Precheck, XP gate, grants, then reset and count.
- `CheckQuestQualification`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/quests/QuestsMgr/DataQuest.cs` 1007-1088. Level, class, cap, active, prerequisites.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-character pointer: 1-based current step, 0 = not active; completed count | Count and step both start at 0 (995) |
| Completion cap; a stored 0 means unlimited | Cap 0 becomes `int.MaxValue` (890-891) |
| Level band (quest data) | Min and max level from the quest row (1009) |
| Drop roll on a kill step: `item;chance`, roll percent, failed roll = no advance | Chance is a percent in the text; zero is refused (1631-1641); roll at 1633 |
| Precheck then grant: count the items the step or finish will give, and compare with free bag slots | Slots = items to give (1659-1665; finish at 2843) |
| Per-step rewards as parallel lists indexed by step | `|`-separated; index = step - 1 (accessors 1231, 1304, 1408; FinishQuest 2856, 2927) |
| Kill target match by name and region | Region 0 = any region (2707) |
| Prerequisites by quest name, compared in lower case | Names from the quest row (1059-1075) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order that matters: the XP gate, the kill-step roll, the bag precheck, then the grants, then the pointer step; and for finish, the bag precheck, the XP gate, the grant, then the reset and count. It omits: the custom step hook (`ExecuteCustomQuestStep`) at each check point; the RP, CL-XP and BP rewards; the reward-quest variant that reads index 0; the optional-reward choice; the collection-quest branch of qualification; the auto-start path; the items given at accept; the quest-list refresh, indicator refresh and source text; and the database save. The sketch posts all of one step's or one finish's entries in one call, which the donor does not do: the donor makes separate grant calls, and the sketch's single post is a Frankendom design choice, not a copy of the donor.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind =
  | "kill" | "killFinish" | "deliver" | "deliverFinish"
  | "interact" | "interactFinish" | "collect" | "collectFinish";

interface StepDef {
  kind: Kind;
  targetName: string;
  targetRegion: number;    // 0 = any region
  item?: string;           // item template for this step (kill steps: the drop template)
  dropPercent: number;     // roll for the drop; 0 with an item means the step is refused
  rewardXp: number;
  rewardMoney: number;     // copper
}

interface QuestDef {
  id: string;
  steps: StepDef[];        // step n (1-based, as in the donor) is steps[n - 1]
  maxCount: number;        // Infinity = unlimited
  minLevel: number;
  maxLevel: number;
}

interface CharQuest {
  step: number;            // 0 = not active; 1-based current step
  count: number;           // completed times
}

interface Entry {
  kind: "xp" | "money" | "item";
  amount: number;
  item?: string;
}

interface Env {
  rollPercent(p: number): boolean;
  freeSlots(playerId: string): number;
  xpEnabled(playerId: string): boolean;
  post(playerId: string, entries: Entry[], ref: string): void;   // one ledger transaction per call
}

function canAccept(q: QuestDef, c: CharQuest, level: number, classAllowed: boolean): boolean {
  if (level < q.minLevel || level > q.maxLevel) return false;
  if (!classAllowed) return false;
  if (c.step !== 0) return false;              // already doing it
  return c.count < q.maxCount;                 // finished count below the cap
}

function accept(q: QuestDef, c: CharQuest, level: number, classAllowed: boolean): boolean {
  if (!canAccept(q, c, level, classAllowed)) return false;
  c.step = 1;
  return true;
}

function currentStep(q: QuestDef, c: CharQuest): StepDef | undefined {
  return c.step >= 1 ? q.steps[c.step - 1] : undefined;
}

// Donor AdvanceQuestStep, simplified: XP gate, drop roll, slot check for every item given,
// grant the current step's rewards, then step + 1. Returns false and changes nothing if any gate fails.
function advance(q: QuestDef, c: CharQuest, env: Env, playerId: string, killed: boolean): boolean {
  const cur = currentStep(q, c);
  if (cur === undefined) return false;
  if (cur.rewardXp > 0 && !env.xpEnabled(playerId)) return false;

  const items: string[] = [];
  if (cur.item !== undefined) {
    if (killed) {
      if (cur.dropPercent <= 0) return false;              // donor: a zero chance is refused
      if (!env.rollPercent(cur.dropPercent)) return false; // failed roll: no advance
    }
    items.push(cur.item);
  }
  const next = q.steps[c.step];                             // the step after the current one
  if (next !== undefined && (next.kind === "deliver" || next.kind === "deliverFinish") && next.item !== undefined) {
    items.push(next.item);
  }
  if (env.freeSlots(playerId) < items.length) return false; // bag full: do not advance

  const entries: Entry[] = [];
  if (cur.rewardXp > 0) entries.push({ kind: "xp", amount: cur.rewardXp });
  if (cur.rewardMoney > 0) entries.push({ kind: "money", amount: cur.rewardMoney });
  for (const it of items) entries.push({ kind: "item", amount: 1, item: it });
  env.post(playerId, entries, "quest:" + q.id + ":step:" + String(c.step));
  c.step += 1;
  return true;
}

// Donor FinishQuest, simplified: slot precheck for final and chosen items, XP gate, one grant,
// then step reset to 0 and count + 1. Nothing changes unless every check passes.
function finish(
  q: QuestDef, c: CharQuest, env: Env, playerId: string,
  lastStep: number, finalItems: string[], chosenItems: string[],
): boolean {
  const itemCount = finalItems.length + chosenItems.length;
  if (env.freeSlots(playerId) < itemCount) return false;

  const last = q.steps[lastStep - 1];
  const xp = last !== undefined ? last.rewardXp : 0;
  const money = last !== undefined ? last.rewardMoney : 0;
  if (xp > 0 && !env.xpEnabled(playerId)) return false;

  const entries: Entry[] = [];
  if (xp > 0) entries.push({ kind: "xp", amount: xp });
  if (money > 0) entries.push({ kind: "money", amount: money });
  for (const it of finalItems) entries.push({ kind: "item", amount: 1, item: it });
  for (const it of chosenItems) entries.push({ kind: "item", amount: 1, item: it });
  env.post(playerId, entries, "quest:" + q.id + ":finish");

  c.step = 0;
  c.count += 1;
  return true;
}
```

## 5. Lands in

- TARGET `origins/server/quest-steps.ts` (new module, proposed; the Frankendom layout was not checked here): the step list as zone data, the server-side pointer and completed count, the drop roll, the precheck-then-grant order, and the finish. Cell 1 (CleverRaven) lands in `origins/server/quests.ts`; the two share the report-back and one-ledger ideas, not the file.
- Parity-checklist row 18 (loot roll and XP award): the drop roll on a kill step, the XP and RP gates, and the award at each step and at finish.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (the step list and the level band are quest data, and a step's target region is the zone link); one ledger (one posting per step or finish, with the pointer change); server-verified (the server runs the kill match and the roll, not the client)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Separate grants. The donor grants XP, RP, money, CL-XP, BP and items through separate calls (2856-2930 and 1700-1703), each with its own side effect. One ledger means one posting per step or finish, with every entry in it. Do not copy the separate calls.
- Save order. At finish the donor grants the rewards (2856-2930) and only then sets `Step = 0` and `Count + 1` and saves (3029-3031). The code has no transaction; a crash between the grant and the save could leave the rewards paid and the quest still active. Frankendom must put the pointer change and the posting in one write.
- One step per kill. A kill step advances on the first matching kill (2711-2727), and the completed count (`Count`) counts finished quests, not kills. A counted kill objective needs a counter on the step with its own target, not one step per kill.
- Drop chance as text. The chance is a percent inside a `item;chance` string (1622-1640). A zero is refused rather than meaning never; a Frankendom loot roll must be a number in data, with its own rule for zero.
- Length checks. The reward lists are indexed by step with only a `Count > 0` guard (2855-2856 and 2927). If a list is shorter than the step count, FinishQuest would index past the end; the read part of ParseQuestData shows no length check, and I did not test this.
- Event fan-out. Each active quest is sent each event (`Notify`, 1790-1795) and checks its own step. For a server, one kill should be routed once to the zone and matched against the step list, not sent to every quest.
- Prerequisites by name, compared in lower case (1059-1075). Frankendom should use quest IDs.
- Silent unlimited cap: a stored 0 becomes unlimited (890-891). Frankendom should write unlimited explicitly.
- Interact and whisper steps were not described in this note; those handlers were not read in full (2349-2555). They belong to a separate note if needed.
