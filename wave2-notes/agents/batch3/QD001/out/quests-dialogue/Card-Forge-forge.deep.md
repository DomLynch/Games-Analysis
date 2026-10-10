# Card-Forge-forge (quests-dialogue, cell 3)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/util/AdventureQuestController.java` (with `data/AdventureQuestData.java` and `data/AdventureQuestStage.java`) | Licence: GNU GPL version 3 (`LICENSE` lines 1-2: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"; clean-room, shape only) | Java (libGDX mobile client) | symbol `AdventureQuestStage.handleEvent`

Checked: Read in full: `util/AdventureQuestController.java` (648 lines), `data/AdventureQuestStage.java` lines 65-82, 159-200 and 265-405 (every objective case), `data/AdventureQuestData.java` lines 23-140 and 393-461 (fields, copy constructor, roll-up, activation, fail). Read in part: `data/AdventureQuestData.java` 140-392 not read (initialize, token replacement, target enemy generation). `util/MapDialog.java` 105-146, 180-200 and 356-380 (dialog effects). `data/DialogData.java` 1-60, `util/AdventureQuestEvent.java`, `util/AdventureQuestEventType.java`. Not read: `player/AdventurePlayer.java` (`removeQuest`, `countItem`), the callers of the spawn functions (not traced), and the quest data files. Confidence: high on the event flow and each objective case as written. Medium on the operator-precedence reading of the Use case (AQS 380-382), which I worked out by hand from Java rules; not run. Camera: not applicable.

## 1. Mechanism

- Entry. A game event becomes an `AdventureQuestEvent` (type, POI, enemy, item, winner, flag name and value, counts) in one of the controller's update methods. Examples: `updateEnteredPOI` (357-367) sets type ENTERPOI and the POI's map reputation as `count3` (359-362); `updateQuestsWin` (414-440) sets MATCHCOMPLETE with `winner = true` and a `clear` flag that is true when no enemy left on the map blocks it (419-435; an enemy with a `defeatDialog` does not block, 422-425); `updateQuestsLose` (445-456) is the same with `winner = false`; `updateItemReceived` (509-518) and `updateItemUsed` (499-507) carry the item.
- Two passes, always. Each update method first calls `updateStages(event)` on every quest the player has (for example 362-365), then calls `activateNextStages()` (351-355, 366), which runs over every quest. So a stage started by this event does not see it, and all quests see the event before any new stage starts.
- Roll-up per quest (`AdventureQuestData.updateStages`, 393-411). `done` starts true. For each stage: ACTIVE → `handleEvent(event)`, and `done` stays true only if the result is COMPLETE (400); COMPLETE → skipped, `done` unchanged (403); any other status (INACTIVE, FAILED) → `done = false` (405). `failed` is sticky: it is or-ed with each stage that is FAILED (408). `completed = done` (410). A quest is complete only when every stage is COMPLETE.
- Per stage (`AdventureQuestStage.handleEvent`, 268-386), in order:
  1. Fetch check first (269-272): if the player already holds enough of the stage's items, COMPLETE, whatever the event is.
  2. Room gate (274-275): `checkIfTargetLocation(event.poi)`. A null POI is replaced by the current room (AQD 395-396). With no target POI, all `POITags` must be in the room's tags (168-175); with a target POI, the position must match (176-177); otherwise `anyPOI` (179).
  3. Enemy gate (277-278), only when the event has an enemy: `checkIfTargetEnemy` (182-200) matches an exact sprite if one is set, otherwise the enemy's tags must contain every `enemyTags` entry and none of `enemyExcludeTags`.
  4. Objective switch (280-384). Examples: Defeat (295-303) reacts only to MATCHCOMPLETE; a win adds one to progress3 and completes at `count3` (299); a loss adds one to progress4 and fails at `count4` only when `count4 > 0` (301). Fetch (332-341): RECEIVEITEM adds to progress1 against `count1`; USEITEM adds to progress3 against `count3`. Hunt (342-352): a DESPAWN of the target fails the stage (344); a won match against the target completes it (347). Clear (290-294): completes on `clear && winner`. Leave (353-356): LEAVEPOI counts to `count3`. Flag objectives (281-284, 357-364): complete when the flag name matches and the value is at least `mapFlagValue`. Reputation (365-373): compares `event.count3` with `count3`.
- Activation (`AdventureQuestData.activateNextStages`, 435-461). For each INACTIVE stage, `checkPrerequisites` (439; 72-81) sets it ACTIVE when every prerequisite stage ID is complete (76, 80). If the new stage is a fetch that the player already satisfies, it gets `handleEvent` with an empty event (441-443), so it completes at once. Its target sprite is registered (444). A notification lists the active stages (449-459).
- Finish and fail. A stage FAILED or `fail()` (429-433, used by `abandon`, AQC 569-571) sets the quest failed. `showQuestDialogs` (160-216) queues the prologue, the stage prologues and epilogues (shown once, see below), the failure dialog and the quest epilogue, then removes every failed or completed quest from the player (208-215).
- Shown once. Prologue and epilogue dialogs have a persisted `displayed` flag (`DialogData` 24; `getPrologue` and `getEpilogue` mark it, AQD 413-427).
- Rewards. Dialog effects carry the rewards. When a dialog node loads, `setEffects(dialog.action)` runs (MapDialog 194, 356-), and the effects include items, life, gold, shards, map reputation and reward lists. `AdventureQuestData.reward` has no reader in this package: a grep for `getReward()` and `.reward` finds no call on an `AdventureQuestData` object (the hits are on `RewardActor` objects, for example `RewardScene.java` 193 and 665).
- Side-quest offers (`getQuestNPCResponse`, AQC 573-636). An NPC at a POI first refuses if the player has an unfinished side quest from that POI (577-590), then refuses if this POI already gave one today (592-602; the day is `LocalDate` epoch day), then refuses if the player has 5 or more active side quests (604-614; `tooManyQuests` 638-646). Otherwise it picks at random among side quests whose source tags match the NPC's origin, or among all side quests if none match (618-632), and stamps the POI with today (616).
- Day gate reset. When a side quest is removed after completing (not after failing, 209), with probability 0.85 (`locationHasMoreQuests`, 221) the POI's day gate is cleared, so it can offer again at once (210).
- Spawns (a per-zone hook). `getExtraQuestSpawns` (37-69) adds enemies for every ACTIVE Defeat stage, by target enemy or by tag match. `getBoostedSpawns` (71-112) splits a total weight equally among the matching enemies (103) and adds it by enemy name (105). The caller that supplies the total is not traced.
- Tick. There is none. Events drive it. The one timer is the dialog display, a 0.25 s libGDX timer (AQC 248-258; libGDX time unit, not read in the donor).

## 2. Key functions

- `AdventureQuestController.updateEnteredPOI`, `updateQuestsWin`, `updateQuestsLose`, `updateItemReceived`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/util/AdventureQuestController.java` 357-367, 414-440, 445-456, 509-518. Event construction and the two-pass call.
- `AdventureQuestData.updateStages`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/data/AdventureQuestData.java` 393-411. Roll-up.
- `AdventureQuestData.activateNextStages`: same file, 435-461.
- `AdventureQuestStage.handleEvent`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/data/AdventureQuestStage.java` 268-386. Fetch check, room gate, enemy gate, objective switch.
- `AdventureQuestStage.checkPrerequisites`: same file, 72-81.
- `AdventureQuestStage.checkIfTargetEnemy`: same file, 182-200 (tag match).
- `AdventureQuestController.getQuestNPCResponse`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/util/AdventureQuestController.java` 573-636 (side-quest offers).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Quest complete = every stage complete | None (structure, AQD 400-410) |
| Stage goal count (kills, flag values, visits) | Per stage data: `count3` for Defeat, Leave, Travel and most others (AQS 299, 355); `count1` for Fetch receive (335). Values are in quest data files, not read |
| Stage fails after N losses; 0 means never | `count4 > 0` test (AQS 301); losses counted in progress4 |
| Active side quests cap | 5 (AQC 151; the source says "todo: move to configuration file") |
| Day gate reset after a completed side quest | 0.85 chance (AQC 221, used at 209) |
| Spawn weight split | Equal split: total / number of matching enemies (AQC 103) |
| Dialog display delay | 0.25 s (AQC 258) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: every quest is updated, then every quest starts its stages whose prerequisites are complete; within a stage, the fetch check comes first, then the room gate, then the enemy gate, then the objective switch; quest completion is "every stage complete"; failure is sticky. It differs in these ways. It uses explicit subset tests instead of the donor's count trick (AQS 195-196). It does not reproduce the donor's Use case (AQS 380-382), whose precedence is a suspected bug (section 6). It omits the reputation and flag event sources, the Hunt target sprite, the anyPOI and POI-token rules, the Clear objective's enemy-list step, the once-only dialogue flags, the dialog effects, the side-quest offers and day gate, and the spawn boost.

```ts
// Licence: GNU GPL v3 (donor LICENSE). clean-room sketch of the mechanism shape, not a translation of the donor lines.
// clean-room
type Status = "inactive" | "active" | "complete" | "failed";

// Every event carries the tags of the room the player is in.
type Ev = { room: string[] } & (
  | { kind: "enterPoi" }
  | { kind: "defeat"; winner: boolean; enemyTags: string[] }
  | { kind: "receiveItem"; item: string }
  | { kind: "flag"; name: string; value: number }
  | { kind: "tick" }
);

interface Stage {
  id: number;
  prereqs: number[];                 // stage ids that must be complete before this one starts
  status: Status;
  objective: "fetch" | "defeat" | "enterPoi" | "flag";
  count: number;                     // goal count (donor: count1 for fetch, count3 for the others)
  failAt: number;                    // losses that fail the stage; 0 = never (donor: count4)
  progress: number;
  failures: number;
  roomTags: string[];                // all must be in the room's tags
  items: string[];                   // fetch: item names that count
  wantTags: string[];                // defeat: enemy tags that must all be present
  excludeTags: string[];             // defeat: enemy tags that must be absent
  flagName?: string;
  flagValue?: number;
}

interface Quest { stages: Stage[]; completed: boolean; failed: boolean; }
interface PlayerView { itemCount(name: string): number; }

const subset = (have: string[], want: string[]): boolean => want.every(t => have.includes(t));
const statusOf = (s: Stage): Status => s.status;   // a call, so the check after handle() is not narrowed
const owned = (s: Stage, p: PlayerView): number => s.items.reduce((n, it) => n + p.itemCount(it), 0);

// One event against one active stage.
function handle(s: Stage, e: Ev, p: PlayerView): void {
  if (s.objective === "fetch") {
    // Checked on every event, before the room gate: holding the items is enough.
    if (owned(s, p) >= s.count) { s.status = "complete"; return; }
    if (e.kind === "receiveItem" && s.items.includes(e.item)) {
      s.progress += 1;
      if (s.progress >= s.count) s.status = "complete";
    }
    return;
  }
  if (!subset(e.room, s.roomTags)) return;
  if (s.objective === "defeat") {
    if (e.kind !== "defeat") return;
    if (!subset(e.enemyTags, s.wantTags) || s.excludeTags.some(t => e.enemyTags.includes(t))) return;
    if (e.winner) {
      s.progress += 1;
      if (s.progress >= s.count) s.status = "complete";
    } else if (s.failAt > 0) {
      s.failures += 1;
      if (s.failures >= s.failAt) s.status = "failed";
    }
    return;
  }
  if (s.objective === "enterPoi") {
    if (e.kind !== "enterPoi") return;
    s.progress += 1;
    if (s.progress >= s.count) s.status = "complete";
    return;
  }
  if (e.kind === "flag" && e.name === s.flagName && e.value >= (s.flagValue ?? 0)) s.status = "complete";
}

// Step 1 for a quest: only active stages see the event; the quest is complete when every stage is.
function updateQuest(q: Quest, e: Ev, p: PlayerView): void {
  let done = true;
  for (const s of q.stages) {
    if (s.status === "active") {
      handle(s, e, p);
      done = statusOf(s) === "complete" && done;
    } else if (s.status === "complete") {
      continue;
    } else {
      done = false;
    }
    if (s.status === "failed") q.failed = true;
  }
  q.completed = done;
}

// Step 2, run after every quest has seen the event: start stages whose prerequisites are complete.
function activateNext(q: Quest, p: PlayerView): void {
  for (const s of q.stages) {
    if (s.status !== "inactive") continue;
    const ready = s.prereqs.every(id => q.stages.some(x => x.id === id && x.status === "complete"));
    if (!ready) continue;
    s.status = "active";
    if (s.objective === "fetch") handle(s, { room: [], kind: "tick" }, p);
  }
}

export function dispatch(quests: Quest[], e: Ev, p: PlayerView): void {
  for (const q of quests) updateQuest(q, e, p);
  for (const q of quests) activateNext(q, p);
}

export {};
```

## 5. Lands in

- TARGET `origins/quests/stage-engine.ts` (proposed new file; the Frankendom repo was not read in this pass). Parity-checklist row 21 (catalogue fields): stage goal counts, fail thresholds, room tags and enemy tags are catalogue data, and the stage engine reads them as fields. The reward leg is row 18 and is not part of this donor's stage logic.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one engine, server-verified kills, zones as data (named rulings from the addendum; the numbered brief rules were not read)

## 6. Gaps and risks

- The donor is a client. Events come from the local game and the local save (`WorldSave`, AQC 362). Frankendom: the server emits every quest event from its own fight and zone records. A win or loss is the server-verified MATCHCOMPLETE equivalent. The client never sends a quest event.
- Operator precedence in the Use case (AQS 380-382). Read by Java rules, the condition is `((type == USEITEM) && itemNames.isEmpty()) || (itemNames.contains(event.item.name) && ++progress3 >= count3)`. Three consequences, not run: (a) when the event passes the gates and has no item, `event.item.name` throws NullPointerException in the second operand, because the argument is evaluated before `contains` is called; the update methods that call this (AQC 357-367, AQD 393-411) have no try or catch. (b) A RECEIVEITEM of a listed item adds to the Use counter. (c) With an empty list, the first USEITEM event completes the stage without reaching `count3`. Whether any quest data uses Use was not checked. Frankendom: give each objective case its own event-type check first, and test each objective.
- Tag matching by count. `checkIfTargetEnemy` (AQS 195-196) is a subset test only when tags are unique: it compares the size after `removeAll` with `tagCount - enemyTags.size()`, so duplicate enemy tags or duplicate required tags give a wrong answer. The spawn code (AQC 47-60) uses explicit contains loops, so the two disagree on duplicates. Frankendom: one explicit tag test.
- Stale comment. AQD 119 says "Temporarily allow only one active stage until parallel stages", but `activateNextStages` starts every stage whose prerequisites are complete (AQD 437-447). Parallel stages are possible. Frankendom: decide this in the catalogue and test it.
- Transient completion. `completed` is transient (AQD 37). After a load it is false until the next event calls `updateStages`, and `showQuestDialogs` reads it (AQC 194). Frankendom: persist stage statuses and derive completion on load.
- Rewards are dialog effects (MapDialog 194, 356-), so they are granted when a dialog node loads, not when a stage completes. The quest `reward` field has no reader in this package. Frankendom: grant rewards through the one ledger on the stage or quest completion event (row 18), never from dialog effects.
- Side quests and zone hooks. Side-quest offers are per POI per day with a random pick (AQC 592-632), and the active cap is 5 (AQC 151, a todo). Frankendom: the POI gate, the tag list and the cap are zone or catalogue data. Spawn boosts (AQC 37-112) are a per-zone quest hook: a quest asks for "more of tag X" and the zone population (row 23) takes the cap and the spawn weights. The caller of `getBoostedSpawns` was not traced.
- Failure is sticky and failed quests are removed (AQC 208-215) after their dialogs are queued (187-199). Frankendom: the failed state goes to the ledger record, and the client shows the fail message from it.
- Not read: `AdventureQuestData` 140-392, `AdventurePlayer.removeQuest` and `countItem`, the quest data files, and the callers of the spawn functions.

Best transferable idea: Quest progress as typed objective stages that each read only their own event kind, with completion as "every stage complete" and failure as a sticky flag, updated in two passes (update all quests, then start next stages).

Decision (proposed): adapt — take the typed stage switch, the two-pass update and the sticky failure; change the source: the server emits quest events from its own fight and zone records, the client never emits them, and rewards go to the one ledger on stage completion, not through dialog effects.

Acceptance: a server test asserts that a stage "defeat 3 bandits, fail after 2 losses" completes after the third server-verified win and fails after the second loss, that a client-sent quest event is refused, and that a quest reports complete only when every stage is complete.
