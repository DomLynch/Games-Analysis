# 2004Scape-Server (quests-dialogue, cell 2)

Donor: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/quests/quest_cook/scripts/quest_cook.rs2` (with `data/src/scripts/general/scripts/quests.rs2`, `src/engine/entity/Player.ts`, `src/engine/World.ts`) | Licence: MIT (repo `LICENSE` lines 1-3, "MIT License", "Copyright (c) 2023-2025 Lost City"; MIT: code may be adapted) | RuneScript (.rs2) and TypeScript engine | symbol `cooks_assistant_completion` (label) and `queue cooks_quest_complete`

Checked: Read in full: `quest_cook.rs2` (101 lines, the whole cook quest), `general/scripts/quests.rs2` (283 lines, the quest-point recount and journal helpers), `quest_cook.varp` (2 lines), `general/configs/quest.constant` (head 20 and the cook lines by grep). Read in part: `interface_chat/scripts/chat.rs2` (lines 1-12, 251-262, 303-312; the `p_choice4` and `chatnpc_page` bodies not read), `src/engine/entity/Player.ts` (212-222 save, 428-445 cleanup, 805-915 enqueue and queue passes), `src/engine/World.ts` (350-412 cycle, 736-750 player processing, 1626-1641 removal, 120 and 537 tick timing), `src/engine/script/handlers/PlayerOps.ts` (121-131 `QUEUE`). Candidates opened for the topic: the 268 quest-related files were listed; only the cook quest was read end to end, with `quests.rs2`, the queue code and the cycle. Not read: the other quests' scripts, the suspend and resume handler, the dialogue page procs. Confidence: high on the cook quest order of operations, the queue and the tick loop. Medium on the XP unit (3000 is the donor's own `stat_advance` value; its unit is not read). Camera: not applicable.

## 1. Mechanism

- One persisted number per quest is the state. The cook quest's varp is `%cookquest` (`quest_cook.varp` line 1 `[cookquest]`, line 2 `scope=perm`). The engine saves a player's `perm` varps (`Player.ts` 217-218). The complete value is a named constant, `^cook_complete = 2` (`quest.constant` line 3). The starting value is 0; this is inferred from the checks, not read in the varp definition.
- Start (`cooks_assistant_whats_wrong`, `quest_cook.rs2` 25-40). The NPC asks a two-option question (`p_choice2`, line 29). Accepting sets `%cookquest = 1` (32) and calls `send_quest_progress` (33). That helper sets the journal colour: red at 0, green at or above the complete value, yellow between (`quests.rs2` 5-13).
- Talk during progress (`cooks_assistant_inprogress`, 42-75). This is a pull check: the script reads the inventory each time the player talks (`inv_total` on flour, egg and milk, line 45). All three present jumps to completion (46). None present refuses (49-52). Some present gives a status line that lists what is held and what is missing (54-74). The stage is not changed by talking.
- Completion (`cooks_assistant_completion`, 77-85). The script removes one egg, one milk and one flour (82-84), then queues `cooks_quest_complete` with delay 0 (85).
- Queued job (`cooks_quest_complete`, 87-91). It sets the stage to complete (88), awards 3000 `stat_advance` on cooking (89), logs the adventure (90) and calls `send_quest_complete` (91). That helper plays one of three jingles chosen by `random(128)` with thresholds 32 and 64 (`quests.rs2` 17-24), recalculates points (38), sets the scroll text, colours the tab green and sends the message (46-48).
- Points are derived, not added. `count_questpoints` (`quests.rs2` 57-66) adds each finished quest's points by testing its varp (the cook test is line 65, points line 66). `update_questpoints` (50-55) writes `%qp` only when the count changed. The total is the sum over finished quests, recomputed on each call.
- Location gate. `[oplocu,cooksquestrange]` (93-101) refuses use of an item on the cook's location before completion (94-98) and runs the normal use after (100).
- Queue (engine). The `QUEUE` opcode (`PlayerOps.ts` 130) calls `enqueueScript` with the delay. A normal request is appended to the player's `queue` list (`Player.ts` 822). Each player pass runs `processQueues` (`World.ts` 750; `Player.ts` 847-862). A strong queue closes modals first (`Player.ts` 848). `processQueue` (864-884) reads `delay` then decrements it (876), and runs the script when the value read was 0 or less and the player can access (877). The donor's own comment says a script added during the loop can be processed in the same tick (`Player.ts` 869; the comment calls it an authentic quirk).
- Tick. `World.cycle` runs world, client input, npc event queue, npcs, then `processPlayers` (`World.ts` 369-412; the call is at 407). `processPlayers` resumes a suspended script first (744-746), then runs `processQueues` (750). The tick constant is 600 (120). The next cycle is scheduled at `tickRate` minus the cycle's own time and a drift term (537; drift at 372).
- Dialogue. `chatnpc` splits text into pages and pauses after each page (`chat.rs2` 303-312). `p_choice2` opens a chat with two resume buttons (9) and pauses (10). The suspend and resume handler was not read; the donor's resume path is at `World.ts` 744-746.
- Removal. `Player.cleanup` clears all queues (`Player.ts` 433-440). `World.removePlayer` calls it (1640) after logout (1626-1640).

## 2. Key functions

- `cooks_assistant_inprogress` and `cooks_assistant_completion`: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/quests/quest_cook/scripts/quest_cook.rs2` 42-85. The pull check, the item removal and the queued reward.
- `cooks_quest_complete` (queued job): same file, 87-91.
- `count_questpoints` and `update_questpoints`: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/general/scripts/quests.rs2` 50-66.
- `send_quest_progress_colour` and `send_quest_complete`: same file, 5-13 and 15-48.
- Engine queue: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Player.ts` 805-884 (`enqueueScript`, `processQueues`, `processQueue`), and `QUEUE` at `/mnt/frankendom-donors/2004Scape-Server/src/engine/script/handlers/PlayerOps.ts` 121-131.
- Tick: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 120 (tick rate), 369-412 (cycle order), 736-750 (player processing), 537 (next cycle timer).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One persisted stage number per quest, finished at a threshold | Start 1 (`quest_cook.rs2` 32); complete 2 (`quest.constant` 3); default 0 (inferred) |
| Journal colour from stage against threshold | Red at 0, green at or above complete, yellow between (`quests.rs2` 7-12) |
| Objective check at talk time | At least 1 of each of flour, egg, milk (`quest_cook.rs2` 45); one of each removed (82-84) |
| Reward | `stat_advance(cooking, 3000)` (89); unit of 3000 not read |
| Quest points | 1 for cook (`quest.constant` 47); recounted (`quests.rs2` 57-66) |
| Jingle choice | `random(128)`; below 32, below 64, else (`quests.rs2` 17-23): 25%, 25%, 50% |
| Reward delay | 0 (`quest_cook.rs2` 85): runs in the next queue pass of the player |
| Tick | 600 ms per cycle (`World.ts` 120) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's stage write, the pull check, the removal before the reward, the recount and the queue rule (decrement after reading, run at 0 or less). It differs in three places. First, a job pushed by `finishQuest` runs on the next call of `processQueue`, while the donor runs a tail entry in the same pass. Second, the sketch removes items and queues the reward as two steps, which is the risk section 6 names; the acceptance line asks for one transaction instead. Third, it omits dialogue paging and suspension, the modal close for strong queues, the random jingle, the session log, the location gate, the per-quest comparison differences (`=` in some tests, `>=` in others; the sketch uses `>=`), the varp save and logout, and the XP unit.

```ts
// Licence: MIT (donor LICENSE, copyright 2023-2025 Lost City). clean-room sketch of the mechanism shape; names and numbers are ours.
// clean-room
interface QuestDef {
  id: string;
  complete: number;                         // stage value that means finished (donor: ^cook_complete = 2)
  points: number;                           // quest points when finished (donor: ^cook_questpoints = 1)
  xp: { skill: string; amount: number };    // reward; donor amount 3000 in its own stat_advance unit (not read)
}

interface Player {
  stage: Map<string, number>;               // one persisted number per quest
  items: Map<string, number>;
  xp: Map<string, number>;
  queue: { delay: number; run: () => void }[];
}

function startQuest(p: Player, q: QuestDef): void {
  p.stage.set(q.id, 1);
}

// Pull check: the objective is read from inventory when the player talks to the NPC.
function hasItems(p: Player, need: Record<string, number>): boolean {
  return Object.entries(need).every(([item, n]) => (p.items.get(item) ?? 0) >= n);
}

// Finish: take the items now, then queue the stage write and the reward for the queue pass.
function finishQuest(p: Player, q: QuestDef, need: Record<string, number>): boolean {
  if (!hasItems(p, need)) return false;
  for (const [item, n] of Object.entries(need)) p.items.set(item, (p.items.get(item) ?? 0) - n);
  p.queue.push({
    delay: 0,
    run: () => {
      p.stage.set(q.id, q.complete);
      p.xp.set(q.xp.skill, (p.xp.get(q.xp.skill) ?? 0) + q.xp.amount);
    },
  });
  return true;
}

// Derived, not incremented: recount from every stage on each call, so a repeat call gives the same total.
function questPoints(p: Player, quests: QuestDef[]): number {
  let total = 0;
  for (const q of quests) if ((p.stage.get(q.id) ?? 0) >= q.complete) total += q.points;
  return total;
}

// One queue pass per tick: read the delay, then decrement; run when the value read was 0 or less.
function processQueue(p: Player): void {
  const pending = p.queue;
  p.queue = [];
  for (const job of pending) {
    const before = job.delay;
    job.delay -= 1;
    if (before <= 0) job.run();
    else p.queue.push(job);
  }
}

// Logout or removal drops every pending job.
function cleanup(p: Player): void {
  p.queue = [];
}

export { startQuest, finishQuest, questPoints, processQueue, cleanup };
```

## 5. Lands in

- TARGET `origins/quests/quest-stage.ts` (proposed new file; the Frankendom repo was not read in this pass). Parity-checklist row 18 (loot roll and XP award): the reward is an XP award and an item removal, and both must go through the one ledger in the same server step.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; the sketch is clean-room)
- Brief rule served: one ledger and server-verified (named rulings; the numbered brief rules were not read)

## 6. Gaps and risks

- Pull, not push. The donor checks the inventory when the player talks. A Frankendom quest that counts kills must count each server-confirmed kill as it happens. A pull check is fine for item hand-ins only, and the check must run in the same server step as the removal.
- The reward queue is volatile. The items are removed at talk time (`quest_cook.rs2` 82-84) and the stage and XP are written later by a queued job (85, 88-89). `Player.cleanup` clears the queue (`Player.ts` 440) and removal calls it (`World.ts` 1640). If the removal happens while the job is still pending, the items are gone and no reward is paid. Whether the donor can reach that window was not tested; the queue normally runs in the same tick (`Player.ts` 869). Frankendom should not split item removal and reward across a deferred job. Acceptance: the three writes apply together or not at all.
- One ledger. The donor writes XP through `stat_advance` and items through `inv_del` directly from script. Frankendom sends both through the one ledger.
- Derived points. Keep the recount: it is idempotent and avoids drift. Frankendom should derive the total from stage values in the catalogue; the journal colour and scroll are client-only.
- Mixed comparisons. The recount uses `=` for some quests and `>=` for others (`quests.rs2` 65 against 134, `%elenaquest >= ^elena_complete`). Frankendom should use one rule (`>=`) and a test in the catalogue.
- Zones as data. Each quest is a separate RuneScript file. Frankendom needs stages, items, points and rewards as catalogue data, checked at load.
- Timing. The queue delay counts engine cycles at 600 ms (`World.ts` 120). Frankendom timed steps should count fixed server ticks, not wall time.
- Not read: the `p_choice4` and `chatnpc_page` bodies, the suspend and resume handler, the XP unit of 3000, and the quests other than the cook quest.

Best transferable idea: Store each quest as one persisted stage number with a complete threshold, and derive the quest-point total by recounting finished stages rather than adding to a running total.

Decision (proposed): adapt — take the one-number stage with a threshold and the recount total; reject the deferred reward queue for anything that writes to the ledger, because it is volatile and can split item removal from the reward.

Acceptance: a server test asserts that a cook-style hand-in sets the stage, removes the items and credits the XP in one step, that the step either applies all three or none, and that the quest-point total is the same after one or ten recounts.
