# azerothcore-azerothcore-wotlk (quests-dialogue-npc-routines, cell 3)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/PlayerQuest.cpp` (with `Quests/QuestDef.h`, `Entities/Player/PlayerUpdates.cpp`, `Events/GameEventMgr.cpp`, `Movement/Waypoints/WaypointMgr.cpp`, `AI/SmartScripts/SmartScriptMgr.h`) | Licence: GNU GENERAL PUBLIC LICENSE Version 2, June 1991 (LICENSE line 2, as read) | C++ | symbols `Player::KilledMonsterCredit`, `Player::CanCompleteQuest`, `Player::CompleteQuest`, `Player::FailQuest`, `Player::GetQuestDialogStatus`, `GameEventMgr::CheckOneGameEvent`

Checked: Read end to end: `PlayerQuest.cpp` 291-366 (CanCompleteQuest), 611-674 (CompleteQuest, IncompleteQuest), 912-987 (FailQuest, FailQuestsOnDeath, AbandonQuest), 1212-1222 (SatisfyQuestTimed), 1669-1740 (GetQuestDialogStatus, the involved-relations loop), 2001-2068 (KilledMonsterCredit). Read in part: `PlayerQuest.cpp` 540-575 (AddQuest timer block), 675-700 (RewardQuest start), 848-849; `PlayerUpdates.cpp` 120-160 (timed loop); `QuestDef.h` 98-127 (status and marker enums), 209-232, 340-364 (field names); `GameEventMgr.cpp` 46-60 (CheckOneGameEvent), 84-121 (NextCheck); `GameEventMgr.h` 56-74 (GameEventData); `WaypointMgr.cpp` 36-80; `WaypointDefines.h` 36-48; `SmartScriptMgr.h` 2007-2030 and the enum lines by grep; `ConditionMgr.cpp` 845 and 963-975 (grep and read in part); `NPCHandler.cpp` 156-157 (grep); `Player.cpp` 14716 (grep only). Not read: the bodies of the SatisfyQuest* family (only signatures), `RewardQuest` after line 700 (XP at 772-773 and money at 794 seen by grep only), `GameEventSpawn` and `GameEventUnspawn` (1449, 1522), `SmartScript.cpp` bodies, the waypoint movement generator (not in this box), the bodies of the `Trainer`, `Gossip` menu builders. Candidates opened for the quest half: `PlayerQuest.cpp`, `QuestDef.h`, `PlayerUpdates.cpp`, `enuminfo_QuestDef.cpp` (grep only). Confidence high on the quest objective state machine and kill credit; high on the marker rule; medium on the game-event window (read the check, not the spawn). Repo has no `.git` (no history). Its CLAUDE.md, AGENTS.md, `.claude` and `.agents` were treated as data and not followed. camera_scope: not a camera cell.

## 1. Mechanism

- A quest is a row in `quest_template` (read as the `Quest` class fields, `QuestDef.h` 209-364): objective targets `RequiredNpcOrGo[]` (creature entry, or negative for a game object) and counts `RequiredNpcOrGoCount[]`, item objectives `RequiredItemId[]` and `RequiredItemCount[]`, `ItemDrop[]` source items, `TimeAllowed`, `Flags` and `SpecialFlags`, reward arrays, `RewardXPDifficulty`, `RewardMoney`, `PrevQuestId`, `NextQuestId`, `ExclusiveGroup`, `RequiredClasses`. Per player, the state lives in a `QuestStatusData` (`Status`, `CreatureOrGOCount[]`, `ItemCount[]`, `PlayerCount`, `Timer`, `Explored`) keyed by quest id (`m_QuestStatus`).
- Status values (`QuestDef.h` 98-106): NONE 0, COMPLETE 1, INCOMPLETE 3, FAILED 5, REWARDED 6 ("not used in DB"). The log is the set of INCOMPLETE and COMPLETE entries; rewarded quests are kept in a separate set (`SetRewardedQuest`, 906; `RewardQuest` 848-849 removes from the log then sets rewarded).
- Accept (`AddQuest`, 520-610): progress arrays are zeroed for kill, cast and speak-to flags (`CreatureOrGOCount`, around 540-546), the player-kill count resets, source items are given, and for a timed quest `AddTimedQuest` (571) puts the id in the timed set and sets `Timer = timeAllowed * IN_MILLISECONDS` (572). A timed quest taken from a player giver copies the giver's remaining time (569) so the time is shared.
- Kill credit (`KilledMonsterCredit`, 2001-2068): for each quest in the log slots (MAX_QUEST_LOG_SIZE), if the quest is INCOMPLETE and the group and raid check on the same if-line allows it, a script hook may veto (`OnPlayerPassedQuestKilledMonsterCredit`). Then, for a kill-flagged quest, the loop over its objectives finds the first objective whose `RequiredNpcOrGo[j]` equals the killed creature's real entry; it adds one to `CreatureOrGOCount[j]` only if the count is below the need (2047-2049); then `CanCompleteQuest` decides between `CompleteQuest` and saving the status (2055-2058); then `break` (2060 comment: one target counts for one objective per quest). The credit is per killed creature; a quest that has the target in two objectives counts it once.
- Completion check (`CanCompleteQuest`, 291-366): a rewarded quest is refused unless repeatable or seasonal (299-301, with a "Xinef" comment at 299); auto-complete quests (or quests with no method) pass only if `CanTakeQuest(qInfo, false)` also holds (303-305); the status must be INCOMPLETE (319); then, inside that branch and in this order: delivery items reach their counts (the deliver-flag block), each creature or game-object objective reaches its count (337), the player-kill count, the exploration or event flag, timed quests fail when `Timer == 0` (349), a money cost is covered, and a reputation objective is met (the last check). Line numbers for the middle checks were not read individually.
- Complete (`CompleteQuest`, 611-657): status COMPLETE (623); the log slot state is set to COMPLETE; tracking-flag quests are auto-rewarded here (`RewardQuest` with reward 0), with a comment (634) saying the CAIS gate cannot run here (CAIS is the China anti-addiction play-time system, World.h 83, QuestDef.h 59 'tired time'; it blocks XP and money for tracking quests; it is not an anti-cheat check). The quest is already COMPLETE and nothing would re-trigger it, so a deferral would destroy the reward. Quest tracker row is written if the config enables it.
- Fail (`FailQuest`, 912-955): only from INCOMPLETE unless the quest has the "can fail in any state" special flag (918, with a xinef comment at 917 "dont do it again"). Sets FAILED, clears the timer, removes it from the timed set and sends the timer-failed or failed message, then destroys the quest-bound items: required items and source items whose item template is `BIND_QUEST_ITEM` (943-955).
- Abandon (`AbandonQuest`, 971-986): destroys the same bound items, and the caller removes the log entry (not read).
- Timed tick (`PlayerUpdates.cpp` 136-155): every player update, if the timed set is not empty, each timed quest's `Timer` is compared with the elapsed time `p_time`; if `Timer <= p_time` the quest fails (142-146), else the timer is decremented (150). The loop advances the iterator before the call, because `FailQuest` removes the id.
- Timed-quest gate (`SatisfyQuestTimed`, 1212-1222): a second timed quest cannot be taken while any timed quest is in the set (1214).
- Giver marker (`GetQuestDialogStatus`, 1669-1740): for each quest the giver turns in, the "quest available" condition list (`CONDITION_SOURCE_TYPE_QUEST_AVAILABLE`, read at the top of the same loop) must pass; INCOMPLETE gives marker 5 (1723); COMPLETE and not yet rewarded gives marker 10 (1717-1719); the highest value across quests wins (1731). The "available" loop after line 1740 was not read.
- Dialogue/gossip: the creature's gossip menu options carry condition lists; `Player.cpp` 14716 filters menu items by `menuItr->second.Conditions`; the gossip-hello gate is `NPCHandler.cpp` 156-157. SmartAI reads gossip events from rows: `SMART_EVENT_GOSSIP_HELLO` (SmartScriptMgr.h 163), `SMART_EVENT_GOSSIP_SELECT` (161), `SMART_ACTION_SET_GOSSIP_MENU` (727), and the `SmartScriptHolder` struct (2007) holds `entryOrGuid`, `source_type`, `event_id`, `link`, `event`, `action`, `target`.
- NPC presence schedule (game events): `GameEventData` (`GameEventMgr.h` 56-74) has `Start`, `End`, `Occurence` (63, "time between end and start"), `Length` (64, minutes), `State`, holiday fields, prerequisite events and conditions. `CheckOneGameEvent` (46-60): in the NORMAL state the event is active when `Start < now < End` and `(now - Start) % (Occurence * MINUTE) < Length * MINUTE` (55-57). So a row with `Occurence` = 1440 and `Length` = 720 is a daily window of 12 hours. `NextCheck` (84-121) returns the delay to the next start or end. Creatures are bound to events in `game_event_creature` (load at around 520-544; spawn and unspawn at 1449 and 1522, not read).
- Waypoint routes: `waypoint_data` rows (`WaypointMgr.cpp` 36): id, point, position x/y/z, orientation, velocity, delay, smoothTransition, move_type, action, action_chance. The node struct (`WaypointDefines.h` 36-48) keeps `Delay`, `MoveType` (walk or run), `EventId` and `EventChance` (default 100). The movement generator that walks the route was not read.

## 2. Key functions

- Kill credit: `Entities/Player/PlayerQuest.cpp` 2001-2068.
- Completion gate: `PlayerQuest.cpp` 291-366.
- Complete, incomplete, reward: `PlayerQuest.cpp` 611-674 and 675-700 (start), 848-849.
- Fail and abandon: `PlayerQuest.cpp` 912-987.
- Timed tick: `Entities/Player/PlayerUpdates.cpp` 136-155.
- Timed gate: `PlayerQuest.cpp` 1212-1222.
- Giver marker: `PlayerQuest.cpp` 1669-1740.
- Game-event window: `Events/GameEventMgr.cpp` 46-60 (check), 84-121 (next delay).
- Waypoint row load: `Movement/Waypoints/WaypointMgr.cpp` 36-80.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Kill objective counts up to its need, one objective per quest per kill | comparison `curkillcount < reqkillcount` (`PlayerQuest.cpp` 2047); increment by 1 (`addkillcount = 1`, 2003) |
| Timed quest: milliseconds down by the elapsed time, fail at or below zero | `Timer = timeAllowed * IN_MILLISECONDS` (572); fail when `Timer <= p_time` (`PlayerUpdates.cpp` 142) |
| Shared timed quest inherits remaining time | `getQuestStatusMap()[quest_id].Timer / IN_MILLISECONDS` (`PlayerQuest.cpp` 569) |
| Giver marker ranking | INCOMPLETE 5, REWARD 10, max wins (`QuestDef.h` 117, 122; 1731) |
| Status codes | COMPLETE 1, INCOMPLETE 3, FAILED 5, REWARDED 6 (`QuestDef.h` 101-106) |
| Daily window of a game event | active while `(now - Start) % (Occurence * 60) < Length * 60` (`GameEventMgr.cpp` 57); unit of `Occurence` is not stated in the header comment, used in minutes by the formula |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for kill credit (for each quest in the log, the first matching objective, capped, then complete if every objective is met), the timed tick (fail at or below zero, otherwise subtract), fail (only from incomplete, timed set cleared, bound items destroyed), the marker ranking and the game-event window. It omits: the quest log slot limit and log slot state, the group and raid rules, the script veto, delivery items and source items (only the bound-item list is kept), the player-kill and exploration counters, the money and reputation checks, XP and money in reward, the prerequisite and exclusive-group checks, the auto-complete path, the tracker row, and the gossip and SmartAI layers (described, not sketched). Reorders: none in the kill and timer paths. The sketch's `accept` takes the giver's remaining time as an argument, as the donor reads it from the giver's status.

```ts
// Licence: GPL-2.0 (donor AzerothCore, LICENSE "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"). Clean-room sketch of the mechanism; no donor lines copied.
// Target (proposed): src/fight/quest.ts. Kill credit, timed quests and the giver marker run on the server tick.

export {};

// Status values follow the donor's meanings (NONE, COMPLETE, INCOMPLETE, FAILED, REWARDED).
enum QStatus { None = 0, Complete = 1, Incomplete = 3, Failed = 5, Rewarded = 6 }

// Giver marker values, highest wins (donor DIALOG_STATUS_INCOMPLETE = 5, DIALOG_STATUS_REWARD = 10).
enum Marker { None = 0, Incomplete = 5, Reward = 10 }

interface QuestRow {                // one quest_template row (zone data)
  id: number;
  npcTargets: number[];             // per objective: creature entry (0 = none)
  npcNeeds: number[];               // per objective: count
  timedMs: number;                  // 0 = untimed
  repeatable: boolean;
  boundItems: number[];             // item ids destroyed on fail or abandon
}

interface QuestStatusData {
  status: QStatus;
  counts: number[];                 // progress per objective
  timerMs: number;                  // remaining time when timed
}

interface Player {
  quests: Map<number, QuestStatusData>; // the quest log
  rewarded: Set<number>;
  timed: Set<number>;                   // at most one timed quest is allowed at a time
  bagItems: Map<number, number>;        // item id -> count (destroyed by fail/abandon)
}

export function canTake(q: QuestRow, pl: Player): boolean {
  if (pl.rewarded.has(q.id) && !q.repeatable) return false;
  if (pl.quests.has(q.id)) return false;
  if (q.timedMs > 0 && pl.timed.size > 0) return false; // SatisfyQuestTimed: only one timed quest at a time
  return true;
}

// Accept. A timed quest taken from a player giver inherits the giver's remaining time (shared timed quest).
export function accept(q: QuestRow, pl: Player, giverRemainingMs: number | null): void {
  const timerMs = q.timedMs > 0 ? (giverRemainingMs ?? q.timedMs) : 0;
  pl.quests.set(q.id, { status: QStatus.Incomplete, counts: q.npcTargets.map(() => 0), timerMs });
  if (q.timedMs > 0) pl.timed.add(q.id);
}

// Kill credit: for each incomplete quest, the first matching objective gains one, capped at its need.
// A creature counts for one objective per quest (the donor's comment says so).
export function killCredit(pl: Player, defs: Map<number, QuestRow>, entry: number): void {
  for (const [id, st] of pl.quests) {
    if (st.status !== QStatus.Incomplete) continue;
    const q = defs.get(id);
    if (q === undefined) continue;
    for (let j = 0; j < q.npcTargets.length; j++) {
      if (q.npcTargets[j] !== entry) continue;
      if (st.counts[j] < q.npcNeeds[j]) st.counts[j] += 1; // cap at the need
      if (canComplete(q, st)) complete(pl, q.id);
      break;
    }
  }
}

// Every counted objective has its need; a timed quest must still have time left.
export function canComplete(q: QuestRow, st: QuestStatusData): boolean {
  if (st.status !== QStatus.Incomplete) return false;
  for (let j = 0; j < q.npcTargets.length; j++) {
    if (q.npcTargets[j] !== 0 && q.npcNeeds[j] !== 0 && st.counts[j] < q.npcNeeds[j]) return false;
  }
  if (q.timedMs > 0 && st.timerMs === 0) return false;
  return true;
}

export function complete(pl: Player, id: number): void {
  const st = pl.quests.get(id);
  if (st === undefined) return;
  st.status = QStatus.Complete; // the reward is still waiting; the player must return to the giver
}

// Timed quests: the server tick subtracts elapsed time; at or below zero the quest fails.
export function tick(pl: Player, defs: Map<number, QuestRow>, elapsedMs: number): void {
  for (const id of [...pl.timed]) {
    const st = pl.quests.get(id);
    if (st === undefined) continue;
    if (st.timerMs <= elapsedMs) {
      fail(pl, defs, id);
    } else {
      st.timerMs -= elapsedMs;
    }
  }
}

// Failing an incomplete quest removes it from the timed set and destroys its bound items.
export function fail(pl: Player, defs: Map<number, QuestRow>, id: number): void {
  const st = pl.quests.get(id);
  if (st === undefined || st.status !== QStatus.Incomplete) return;
  st.status = QStatus.Failed;
  st.timerMs = 0;
  pl.timed.delete(id);
  const q = defs.get(id);
  if (q !== undefined) destroyBound(pl, q);
}

export function abandon(pl: Player, defs: Map<number, QuestRow>, id: number): void {
  const q = defs.get(id);
  if (q !== undefined) destroyBound(pl, q);
  pl.quests.delete(id);
  pl.timed.delete(id);
}

function destroyBound(pl: Player, q: QuestRow): void {
  for (const item of q.boundItems) pl.bagItems.delete(item);
}

// Reward: the quest leaves the log and is recorded as rewarded (XP and money are not modelled).
export function reward(pl: Player, id: number): boolean {
  const st = pl.quests.get(id);
  if (st === undefined || st.status !== QStatus.Complete) return false;
  pl.quests.delete(id);
  pl.rewarded.add(id);
  return true;
}

// Giver marker: the highest value over the quests this giver turns in.
export function marker(pl: Player, giverQuests: number[]): Marker {
  let result = Marker.None;
  for (const id of giverQuests) {
    const st = pl.quests.get(id);
    let m = Marker.None;
    if (st !== undefined && st.status === QStatus.Complete) m = Marker.Reward;
    else if (st !== undefined && st.status === QStatus.Incomplete) m = Marker.Incomplete;
    if (m > result) result = m;
  }
  return result;
}

// NPC presence window (game event): inside [start, end) and in the first `lengthMin` minutes of each `occurMin` cycle.
export function eventActive(nowS: number, startS: number, endS: number, occurMin: number, lengthMin: number): boolean {
  if (!(startS < nowS && nowS < endS)) return false;
  return (nowS - startS) % (occurMin * 60) < lengthMin * 60;
}
```

Typecheck: copied to the VPS as `/tmp/qu003-quest-status-ac.ts` and run `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `src/fight/quest.ts` (new, proposed): quest log, kill credit, timed tick and marker, on the server. Parity row 18 (loot roll and XP award), because the reward is the only output that pays out and the kill credit feeds it. There is no quest row in the checklist; row 18 is the closest.
- Presence windows: a zone NPC that is only there part of the day is a game-event-like row (see sketch `eventActive`); it belongs with row 23 (zone population) and is not part of this note's parity row.
- Reuse tag: adapt (GPL-2.0; clean-room sketch from the mechanism; no donor lines copied).
- Brief rule served: 1 (one engine: kill credit and the timed tick run on the server); zones as data (quest and window rows are data).
- Best transferable idea: Keep each player's quest progress as one small record per quest with per-objective counts capped at the need, a timed quest as a millisecond countdown on the server tick that fails at zero, and a giver marker that is just the highest state among that giver's quests.
- Decision (proposed): adapt — take the per-objective capped counts, the one-objective-per-kill rule, the timed countdown on the tick and the highest-wins giver marker, as quest rows; fix the donor's gaps (see section 6) and add a server test; reject the donor's per-path progress writes (each kill, cast, item, explore and group path updates its own copy), because one ledger and server-verified kills need one writer.
- Acceptance: a server test in which a kill quest with a target needing 3 kills, given 5 kills of that creature, counts 3 and completes once; a timed quest with 1,000 ms left fails on the tick that passes 1,000 ms and destroys its bound item; the giver shows marker 10 when one quest is complete and not rewarded, even if another is incomplete.

## 6. Gaps and risks

- Frankendom rulings against the donor: the donor writes the quest state from many paths (kill, cast, speak-to, item, explore, group event, GO use), each with its own copy of the update. Frankendom must route all of them through one `progress` writer on the server (one ledger).
- Reward-gate ordering: the donor's comment at `PlayerQuest.cpp` 634 is about CAIS (the anti-addiction play-time gate), not anti-cheat: a tracking quest is auto-rewarded at completion so the gate cannot defer it. This is not an anti-cheat lesson. Our own rule stands on its own: the kill must be server-verified before `complete`, so the order is kill, verify, complete, reward.
- Death rule the note missed: `FailQuestsOnDeath` (PlayerQuest.cpp ~957-969) fails every INCOMPLETE quest whose template has `QUEST_FLAGS_STAY_ALIVE` when the player dies. Keep it as a row flag (`fails_on_death`), relevant to the death-respawn cell.
- Donor defect (shared timed quest): `getQuestStatusMap()[quest_id].Timer` (569) default-creates a zero-timer entry if the giver has no status for that quest, so the quest is accepted with 0 time and fails on the next tick. Fix: look up with find, and refuse the share if the giver has no running timer (the sketch's `giverRemainingMs ?? q.timedMs` already avoids it).
- Marker caveat: the donor's script hook `GetDialogStatus` can override the marker, and repeatable auto-complete quests give REWARD_REP (6); the sketch's marker ignores both.
- Timer unit: the donor keeps the timer in milliseconds (572) and the tick passes `p_time` (unit as the caller passes it, not read). Frankendom must use server ticks, one unit only.
- Timed quest: the donor fails a timed quest by a 0 comparison (`Timer <= p_time`, 142), so a quest with 0 time allowed fails at once. Frankendom: a zero timer should be rejected at load, not run.
- Only one timed quest at a time (1214): a design limit written as code. Frankendom: put the limit in the row (`max_timed_active`), not in the function.
- Fail destroys bound items (943-955) and abandon does the same (971-986). The rule "bound items leave with the quest" must be a row flag, so a designer can keep an item on fail.
- Repeatable quests: the rewarded check (294-295) passes repeatable quests through; daily, weekly, seasonal and monthly checks are separate functions (1341-1408, signatures only). Not read: their resets.
- Game-event windows: `Occurence` has no unit in the header comment (63); the formula uses minutes (57). Frankendom must write the unit in the row name (`occur_min`).
- Gossip conditions and SmartAI: rows are data, but the condition check is a separate table (`conditions`), so a quest gate is split between the quest row and the condition row. Frankendom: one gate list on the quest row.
- Not read: the reward body after line 700, the SatisfyQuest bodies, the game-event spawn and unspawn, the waypoint movement generator. Frankendom must not copy any claim from those.

As-data shape (PASS2):
- Source table 1, quest: `quest_template` (the `Quest` class fields in `QuestDef.h` 209-364, loaded from the world DB; the SQL schema file is not in this read). Row fields used by the quest state (C++ member names, `QuestDef.h`): `Id`, `RequiredNpcOrGo[]` and `RequiredNpcOrGoCount[]` (creature entry, negative for game object), `RequiredItemId[]` and `RequiredItemCount[]`, `ItemDrop[]` and `ItemDropQuantity[]`, `TimeAllowed` (seconds, times 1000 in code), `Flags`, `SpecialFlags`, `PrevQuestId`, `NextQuestId`, `ExclusiveGroup`, `RequiredClasses`, `RewardXPDifficulty`, `RewardMoney`, `RewardItemId[]` and `RewardItemIdCount[]`, `RewardChoiceItemId[]` and `RewardChoiceItemCount[]`. The SQL column names were not read. The row is data, so a new quest is one row: yes, for these objective kinds. A new objective kind (for example "escort") is code: no.
- Source table 2, game event: `game_event` (`GameEventData` fields: `Start`, `End`, `Occurence`, `Length`, `State`, holiday id and stage, prerequisites, conditions). A new timed NPC presence is one row plus `game_event_creature` rows: yes (for the window; creature spawns are the second table).
- Source table 3, waypoint route: `waypoint_data` (id, point, position, orientation, velocity, delay, smoothTransition, move_type, action, action_chance). A new patrol is a set of rows with one id: yes.
- Source table 4, gossip and AI: the SmartAI rows (`SmartScriptHolder`, `SmartScriptMgr.h` 2007; the table name was not read) and the gossip option conditions (`ConditionMgr`). A new dialogue step is a row: yes for the SmartAI actions in the enum, no for an action not in the enum.
- Provenance per claim: repo `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk`, GPL-2.0 (LICENSE line 2). Copyleft, so the shape only. Files cited above.

What they patched later:
- No history available: no `.git` in the repo root. Patch notes are in code comments instead: "xinef: if quest is marked as failed, dont do it again" (`PlayerQuest.cpp` 917); "xinef: take seasonals into account" (297); "Xinef: area auras may change on quest completion!" (in `CompleteQuest`); "Xinef: take seasonals into account" (299); the tracking-quest CAIS (play-time anti-addiction) note (634); "pussywizard" on `_eventIdForQuest` (`QuestDef.h`, field line not read). These are the hidden rules: a failed quest is not re-failed, seasonal quests are exempt from the rewarded check, and tracking quests are auto-rewarded before the gate.

Rulings for Dom:
1. Should a timed quest that was shared from a giver inherit the giver's remaining time (donor, recommended) or start fresh? Recommend inherit, because it stops a party from buying extra time.
2. Should bound quest items be destroyed on fail and abandon (donor default), or kept as a per-quest row flag? Recommend the row flag, default destroy.
3. Should a zone NPC's daily window use the game-event row (donor-style, recommended) or a zone-data row with the same fields? Recommend the zone-data row, one table with row 23.

Reuse tag: adapt (GPL-2.0, shape only). Brief rule served: 1, zones as data.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Comment at ~634 is about CAIS (China anti-addiction play-time), not anti-cheat; risk item and hidden-rule line rebuilt on that: fixed.
- CanCompleteQuest auto-complete path needs CanTakeQuest: fixed.
- Marker ignores script GetDialogStatus override and REWARD_REP (6): added as caveat.
- Missed FailQuestsOnDeath (QUEST_FLAGS_STAY_ALIVE): added. Missed shared-timer default-create defect (0 time, fails next tick): added.
Fixed 2026-10-12: CAIS wording, CanTakeQuest, marker caveat, death-fail rule, shared-timer defect. Sketch code unchanged.
