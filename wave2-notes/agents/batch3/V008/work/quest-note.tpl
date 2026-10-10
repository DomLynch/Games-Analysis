# AAEmu-AAEmu (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Quests/NewQuestCode.cs` (objective status ladder, step advance; with Quest.cs reward ratio, QuestActObjMonsterHunt/Talk/ConReportNpc/ObjAggro acts) | Licence: LGPL-3.0 per README.md:36 wording; LICENSE.GPL is GPL-3.0 text; LICENSE.MIT (Rain0Ash 2019) also present; treated as copyleft, clean-room only | C# | symbol `Quest.GetQuestObjectiveStatus` / `Quest.RunCurrentStep` / `Quest.DistributeRewards`

Checked: Read in full: NewQuestCode.cs (1-365), QuestStep.cs, QuestComponent.cs, QuestActObjMonsterHunt.cs, QuestActObjTalk.cs, QuestActConReportNpc.cs, QuestActObjAggro.cs, Aggro.cs, CSQuestTalkMadePacket.cs, CSTryQuestCompleteAsLetItDonePacket.cs. Read in part: Quest.cs 56-68, 160-180, 340-400, 476-487 (not read: 304-339, 400-418 item pool, 180-340 and 419-475 drop/cleanup); QuestManager.cs 120-200 and 139-169 (queue); QuestManagerEvents.cs 1-80 and 120-150; QuestAct.cs 1-80; QuestActTemplate.cs 75-180; CharacterQuests.cs 643-660; Npc.cs 990-1044 and 1352-1376; Unit.cs 445-460. Not read: CharacterQuests.AddQuest (level and requirement gating), the quest DB loader, the aggro rank values Rank1-3 in the quest data. Callers: `GetQuestObjectivePercent` has one caller (NewQuestCode.cs:74); `GetQuestObjectiveStatus` callers are TryCompleteQuestAsLetItDone, the NPC and doodad report acts, and Quest.cs:352. Confidence: high on the status ladder, the step advance and the reward ratios; medium on the aggro-rank rule (one reader, one inverted-sort doubt, not run). camera_scope: not applicable.

## 1. Mechanism

- Something changes an objective counter. Monster hunt adds the kill count (`AddObjective`, QuestActObjMonsterHunt.cs:46). Talk sets the counter to 1 when the NPC matches (QuestActObjTalk.cs:51). The aggro-rank act sets the counter to a rank 1-3 on the acceptor NPC's death (QuestActObjAggro.cs:58-105). Every counter change calls `RequestEvaluation` (QuestActTemplate.cs:129, 171).
- `RequestEvaluation` sets a dirty flag (Quest.cs:480-483). The flag enqueues the quest only on the false-to-true change and only after the quest is initialised (Quest.cs:172-174). The queue skips duplicates (QuestManager.cs:144) and drains on a 1 ms scheduled task (QuestManager.cs:150, 157-169). The drain clears the flag first (`StartingEvaluation`, NewQuestCode.cs:361-364) and then runs `RunCurrentStep` (QuestManager.cs:164-166).
- `RunCurrentStep` (NewQuestCode.cs:62-90) runs the step's components (`RunComponents`, QuestStep.cs:52-132). Components in the Start and Ready steps are OR'd across acts; other components are AND'd, except that a Selective quest's Progress step is OR'd across components (QuestStep.cs:60-76; QuestComponent.cs:49-59). For a LetItDone quest the Progress step can never advance by itself (QuestStep.cs:127-129). Only the report acts move it on.
- If the step passes, `GoToNextStep` walks None, Supply, Progress, Ready, Reward, then completion (NewQuestCode.cs:95-161). The Reward step marks the quest completed and drops it (139-151).
- Objective status ladder (NewQuestCode.cs:202-292). For a non-score quest, each act gets one status from its counter, in this order: Overachieved (4) at or above Count x 3/2 (LetItDone only); ExtraProgress (3) above Count (LetItDone only); QuestComplete (2) at or above Count; CanEarlyComplete (1) at or above Count x 1/2 (LetItDone only); else NotReady (0) (258-274). The quest status is the lowest act status, or the highest if the quest is Selective (287-289). A Progress step with no objectives counts as QuestComplete (207-208). Score quests sum Count x counter over the acts, and use the Score as the threshold, with the same ladder at 1.5x and 0.5x Score (210-240).
- Counter cap: `MaxObjective` is Count, or ceil(Count x 3/2) when LetItDone; score quests use Score / Count + 1 (QuestActTemplate.cs:105-112). `AddObjective` clamps to it (157-174).
- Turn-in. An NPC report needs the status at least CanEarlyComplete for LetItDone quests, else QuestComplete (QuestActConReportNpc.cs:47-55). The early turn-in packet calls `TryCompleteQuestAsLetItDone`, which needs LetItDone and status at least CanEarlyComplete, then sets Step to Reward (CharacterQuests.cs:645-659; CSTryQuestCompleteAsLetItDonePacket.cs:29).
- Payout (Quest.cs:344-398). For a LetItDone quest the reward ratio comes from the status: NotReady 0, CanEarlyComplete 0.3, QuestComplete 1, ExtraProgress 1, Overachieved 1.2; other quests use 1 (350-378). XP = round(pool x ratio) and copper = round(pool x ratio), both via `Math.Round` (386-397).
- Talk (dialogue). The client sends the NPC object id in CSQuestTalkMadePacket (CSQuestTalkMadePacket.cs:16-27). `DoTalkMadeEvents` looks the NPC up in the world and fires OnTalkMade (QuestManagerEvents.cs:130-145). The talk act sets its counter to 1. A TeamShare talk also fires for team members (QuestActObjTalk.cs:53-78). No range check is made (line 72 is a TODO).
- Tick: no fight tick. The queue drains on a 1 ms scheduled task, separate from the world loop. Each quest evaluates in queue order.

## 2. Key functions

- `Quest.GetQuestObjectiveStatus`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Quests/NewQuestCode.cs` 202-292. The ladder, the Selective choice, the score branch.
- `Quest.RunCurrentStep` and `Quest.GoToNextStep`: NewQuestCode.cs 62-90 and 95-161. Step advance and the reward/completion step.
- `QuestStep.RunComponents`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Quests/QuestStep.cs` 52-132. Component AND/OR, score override, LetItDone forcing.
- `Quest.DistributeRewards` (ratio and payout part): `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Quests/Quest.cs` 344-398.
- `QuestManager.EnqueueEvaluation` and `DoQueuedEvaluations`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/QuestManager.cs` 139-169.
- `CharacterQuests.TryCompleteQuestAsLetItDone`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/CharacterQuests.cs` 645-659.
- `QuestActConReportNpc.OnReportNpc`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Quests/Acts/QuestActConReportNpc.cs` 40-62.
- `QuestActObjAggro.OnKill` (secondary rule, same folder): `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Quests/Acts/QuestActObjAggro.cs` 58-105, with `Npc.GetAggroRatingInPercent` at `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/NPChar/Npc.cs` 1357-1376.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Objective counter capped at a maximum | Max = Count; LetItDone max = ceil(1.5 x Count) (QuestActTemplate.cs:105-112) |
| Status ladder by fraction of target | LetItDone: 1/2 (CanEarlyComplete), 1 (QuestComplete), above 1 (ExtraProgress), 3/2 (Overachieved) (NewQuestCode.cs:258-274; donor uses integer division for 1/2 and 3/2) |
| Reward multiplier by status | 0 / 0.3 / 1 / 1 / 1.2 for NotReady / CanEarlyComplete / QuestComplete / ExtraProgress / Overachieved (Quest.cs:355-369), LetItDone only |
| Turn-in gate | CanEarlyComplete for LetItDone, QuestComplete otherwise (QuestActConReportNpc.cs:47-49; CharacterQuests.cs:653) |
| Dirty-flag evaluation | 1 ms scheduled drain (QuestManager.cs:150) |
| Score threshold | Score; LetItDone bands at 1/2, 1, 3/2 of Score (NewQuestCode.cs:226-240) |
| Aggro-rank reward | Rank thresholds Rank1-3 (percent), ratios Rank1Ratio-3Ratio / 100 (QuestActObjAggro.cs:75-99), data from quest DB |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's status order (Overachieved, ExtraProgress, QuestComplete, CanEarlyComplete), the Selective min/max choice, the ratios and the turn-in gate. It changes two things on purpose. First, the half and 1.5x steps round up (`Math.ceil`), where the donor uses integer division; this removes a quirk (see Gaps). Second, it rounds with JS `Math.round` (half up) where the donor uses C# `Math.Round` (half to even by default). It omits the Score branch, the Start/Ready OR logic, the step machine, the evaluation queue, the team talk share, the item rewards, the level-based supply, and the aggro rank. It is a pure function of the counters; the caller owns state and the ledger.

```ts
@@SKETCH@@
```

## 5. Lands in

- TARGET `origins/server/quests.ts` (new; proposed, not checked against the repo). Pure status and payout functions, called from the server's turn-in handler, with the payout credited through the one ledger.
- Parity-checklist row 18 (loot roll and XP award). The payout is an award, so row 18 fits. The status ladder and the evaluation queue belong in the server tick: row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget", not a 1 ms timer.
- Reuse tag: rewrite-from-idea (LGPL/GPL: clean-room; shape only)

## 6. Gaps and risks

- Integer-division quirk. For a LetItDone act with Count 1, the donor's CanEarlyComplete threshold is `Count * 1 / 2 = 0` (NewQuestCode.cs:271). At zero progress the act reads CanEarlyComplete, and the early turn-in gate (CharacterQuests.cs:653) passes. The reward ratio is then 0.3 (Quest.cs:359). Chain as read: CSTryQuestCompleteAsLetItDonePacket.cs:29, CharacterQuests.cs:645-659. Not run. The same arithmetic makes an Overachieved act read at exactly Count 1 (NewQuestCode.cs:258), skipping QuestComplete. Frankendom must use explicit ceil/floor and a test per Count.
- Early turn-in target check is partial. The packet refuses only when it has an object id and a current target that differs (CSTryQuestCompleteAsLetItDonePacket.cs:23-28); with no target, the turn-in proceeds. No distance check. Frankendom's server must verify the NPC and range itself.
- Talk objective is client-asserted. The client sends the NPC id (CSQuestTalkMadePacket.cs:16-27). The server checks only that the NPC exists (QuestManagerEvents.cs:130-134). The counter is set to 1 with no range or proximity check, and the team-share fan-out has a TODO for range (QuestActObjTalk.cs:72). This fails the server-verified ruling.
- Evaluation is asynchronous. Events set counters, and the queue runs a 1 ms later, in queue order. A kill and a turn-in in the same tick are not atomic. Frankendom folds evaluation into the tick (row 18 sub-line).
- Unit mix in the percent helper. `GetQuestObjectivePercent` returns a count (Score x 1.5 or Count x 1.5) when overachieved, and a fraction otherwise (NewQuestCode.cs:328, 348, 354). Its only caller tests `>= 1f` (NewQuestCode.cs:74). Harmless there, a trap for any UI percent.
- Rounding. C# `Math.Round` defaults to half-to-even (C# language rule, not from the donor), and the sketch uses JS half-up. Frankendom must pick one and test the .5 cases.
- Aggro-rank rule is broken as read (secondary; not written up as a note). Two faults in `GetAggroRatingInPercent` (Npc.cs:1357-1376). (a) Units: it returns 100 when the player is not in the table (1371-1372) but `1f / Count * pos`, a fraction from 0 up to just under 1, when the player is (1375). The act compares that with integer thresholds Rank1-3 (QuestActObjAggro.cs:75, 85, 95). With any Rank1 of 1 or more, every listed contributor is rank 1. (b) Direction: it sorts ascending by total aggro (1360), so index 0 is the least aggro, while the doc says 0 = most aggro (1356, 1374). The rank is read at kill time: `base.DoDie` fires OnKill (Npc.cs:1023; Unit.cs:456) before the table is cleared (Npc.cs:1024). The threshold values were not read. Not run. Do not reuse the rank without a fix and a test.
- The reward ratio applies to XP and copper only. Item rewards are gated by a flag set in the aggro rank (QuestActObjAggro.cs:71, 79); item pool code (Quest.cs 400-418) not read.
- Quest-level gating (who may accept, level and requirements) is not read (CharacterQuests.AddQuest). Frankendom's one ledger and the zone-data rule need that as data, not code.

Reuse tag: rewrite-from-idea (LGPL/GPL: clean-room; shape only)

Best transferable idea: a contract with an early turn-in (30% at half progress), a full payout at target, and a 120% overachieved bonus, all computed as a pure function of the objective counters and paid through one ledger.
Decision (proposed): adapt — the status ladder and the ratios are plain numbers that fit bounties and contracts, but the integer-division quirk, the client-asserted talk and the untested early turn-in must not be copied.
Acceptance: server test: a count-2 LetItDone contract refuses turn-in at 0 of 2 kills, pays 30% of the pool at 1 of 2, 100% at 2 of 2, and 120% at 3 kills (ceil(2 x 1.5) = 3); a turn-in request from a player beyond the NPC's range is refused.
