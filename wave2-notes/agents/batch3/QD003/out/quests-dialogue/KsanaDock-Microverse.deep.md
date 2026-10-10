# KsanaDock-Microverse (quests-dialogue, cell 3)

Donor: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/AIAgent.gd` (366-411) and `/mnt/frankendom-donors/KsanaDock-Microverse/script/ui/GodUI.gd` (741-790) | Licence: MIT (LICENSE line 3: "Copyright (c) 2025 KsanaDock"; line 1 "MIT License") | GDScript (Godot) | symbol `_refresh_daily_tasks`

Checked: Two copies of the same daily refresh were read, and they disagree. `AIAgent._refresh_daily_tasks` (382-411) keeps open tasks, tops up to 3, and writes the meta store; `GodUI._refresh_daily_tasks` (760-790) keeps open tasks, tops up to 10, and writes the `character_data` store. Read in full: both refresh functions and both checks (366-380, 741-758). Read in part: `AIAgent.gd` 331-362 (task info and the refresh call), 420-491 (random task; pool 420-469 not read), 828-840 (prompt read), 896-906 (init), 1008-1017 (LLM top-up), 1030-1036 and 1128-1148 (decision read path), 1220-1230 (decision branch), 1573-1588 (completion), 1706-1745 (fallback defaults). `GodUI.gd` 610 (call), 666-697 (completion, grep lines only). `ConversationManager.gd` 314-330 (grep lines only, 317). The donor has no `script/TaskManager.gd`: `find` shows only its `.uid` file, so the name in the list is a dead reference. Confidence: high on the two refresh rules and on the two-store split (call sites read; not run). Medium on the LLM decision path (option 4 is read; the prompt text is not). Not read: the random-task pool (420-469), the save and load in `GameSaveManager.gd` (grep only), `DialogManager.gd`, `MemoryManager.gd` internals. Camera: not a camera cell. camera_scope: n/a.

## 1. Mechanism

- A task is a dictionary: `description`, `priority` (1 to 10), `created_at`, `completed` (AIAgent.gd 420-491 builds it; the priority is `randi() % 10 + 1`, line 477).
- The refresh is called from the task-info getter, not from a timer: `get_character_task_info` (331) runs `_check_and_refresh_daily_tasks` (361) every time it builds the text.
- Clock check: if 86400 s (24 h) have passed since the stored `last_task_refresh`, refresh (378-379). The clock is `get_meta("last_task_refresh", 0)` in the AI copy (371, 411) and `character_data["last_task_refresh"]` in the UI copy (749, 789). Default 0 means the first check always refreshes.
- Refresh order (AI copy, 382-411): read the tasks (387); keep only tasks that are not completed (392); sort the kept tasks by priority, high first (396); while fewer than 3 are open, generate a random task and add it (399-401); store the list (408); stamp the clock (411). Completed tasks are dropped here. Nothing is removed beyond the 3 minimum; all open tasks are kept.
- Refresh order (UI copy, 760-790): same steps; the minimum is 10 (780); it stores to `character_data["tasks"]` (786) and stamps `character_data["last_task_refresh"]` (789). The UI copy runs only from `_update_task_list` (610 calls `_check_daily_task_refresh`), that is, when the task panel is updated.
- Current task (LLM path): the decision code keeps open tasks and sorts them by priority, so the current task is the highest-priority open one (1133-1148 read in part; sort at 1148 per grep). The LLM is asked to pick from a numbered option list; option "4" calls `_complete_task` (1225-1227).
- Completion: `_complete_task` (1573) finds the task by description and `created_at`, sets `completed` true (1582), and writes it back (1587). It is an LLM choice, not a game event. No reward is paid: the outcome is a memory entry.
- Two stores: the LLM path reads and writes `character_data["tasks"]` (prompt 834-836, decision 1133, completion 1575-1587, generation 1008-1017). The fallback path and the AI refresh use the meta key `tasks` (337, 387-408, 1710-1744). The UI path uses `character_data["tasks"]` (768-786), and the UI add writes meta `tasks` (GodUI 639-641). Nothing in the read sites copies one store into the other.

## 2. Key functions

- `_check_and_refresh_daily_tasks` and `_refresh_daily_tasks` (AI copy): `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/AIAgent.gd` 366-411. The 24 h check, keep-open, top-up to 3, store.
- `_check_daily_task_refresh` and `_refresh_daily_tasks` (UI copy): `/mnt/frankendom-donors/KsanaDock-Microverse/script/ui/GodUI.gd` 741-790. Same shape, top-up to 10, `character_data` store.
- `_generate_random_task`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/AIAgent.gd` 420-491 (tail read; pool not read). Priority from line 477.
- `_complete_task`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/AIAgent.gd` 1573-1588. Marks one task completed by description and creation time.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Daily refresh: after a fixed interval, drop finished items and keep open ones | 86400 s interval (AIAgent.gd 378; GodUI.gd 756) |
| Sort the open items by priority, high first, so the top one is the current goal | priority scale 1 to 10 (AIAgent.gd 477) |
| Top the board up to a minimum count with new random items | minimum 3 (AIAgent.gd 399, 1008) in the AI copy; minimum 10 (GodUI.gd 780) in the UI copy |
| Fallback list when the generator fails: ten items | 10 (AIAgent.gd 1735) |
| Completion by matching an item's description and creation time | none |
| Clock per character, default 0 means refresh now | `last_task_refresh` (AIAgent.gd 371, 411; GodUI.gd 749, 789) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's refresh order (interval check, keep open, sort by priority high first, top up to the minimum, store, stamp the clock) and the current-task rule (highest-priority open item). It uses one store and one minimum (the caller passes `minOpen`, 3 or 10). It omits the task text and the pool by personality, the memory entries, the null-generator guard of the AI copy (the sketch's generator never fails), the Godot sort's tie order, the LLM choice of option 4 (`completeTask` stands in for it), the completion match by description and creation time (by id here), and the `last_task_refresh` default handling (0 means refresh now in both). The donor refreshes inside a read (the info getter); the sketch leaves the caller to decide when to call it.

```ts
// Licence: MIT (donor, KsanaDock-Microverse). Adapted shape, written fresh from the described rule.
interface Task {
  id: number;
  priority: number;     // 1 (low) to 10 (high)
  completed: boolean;
  createdAt: number;    // seconds
}

interface Board {
  tasks: Task[];
  lastRefresh: number;  // seconds; 0 means never refreshed
  nextId: number;
}

const DAY_S = 86400;

// Daily refresh: keep the open tasks, sort them by priority (high first), top the board up
// to the minimum with new random tasks, then stamp the clock. Completed tasks are dropped.
function refreshBoard(board: Board, now: number, minOpen: number, rng: () => number): boolean {
  if (now - board.lastRefresh < DAY_S) return false;

  const open = board.tasks.filter((t) => !t.completed);
  open.sort((a, b) => b.priority - a.priority);
  while (open.length < minOpen) {
    open.push({
      id: board.nextId,
      priority: Math.floor(rng() * 10) + 1,
      completed: false,
      createdAt: now,
    });
    board.nextId += 1;
  }

  board.tasks = open;
  board.lastRefresh = now;
  return true;
}

// The task to work on now: the highest-priority open task.
function currentTask(board: Board): Task | undefined {
  let best: Task | undefined;
  for (const t of board.tasks) {
    if (t.completed) continue;
    if (best === undefined || t.priority > best.priority) best = t;
  }
  return best;
}

// Mark one open task done. Returns false if it is not open on this board.
function completeTask(board: Board, id: number): boolean {
  const t = board.tasks.find((x) => x.id === id && !x.completed);
  if (t === undefined) return false;
  t.completed = true;
  return true;
}
```

Typecheck: the block plus `export {};` copied to the VPS /tmp and run with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `origins/quests/board.ts` (new, server-side; proposed name, the Frankendom repo layout was not read in this pass). The refresh belongs in a scheduled server job, not in a read path.
- Parity-checklist row: 23 (zone population: a pool topped up to a minimum on a timer, with a respawn interval). This is the closest fit, and it is a stretch: no row fits a quest board exactly, because the donor's items are self-assigned goals with no spawn, no reward and no zone. Say so in review.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, this sketch is a fresh expression)
- Brief rule served: 1 (one engine; the board is data in one place); rules 7-9 n/a

Best transferable idea: A daily bounty board: once a day, drop what is done, sort what is left by priority, and top the board up to a minimum count, so the hub always has a current goal.
Decision (proposed): adapt - take the daily keep-open, sort and top-up order and the highest-priority-is-current rule for a hub bounty board on the server clock, with the minimum as zone data; reject the LLM-judged completion (Frankendom completion comes from server-verified game events), reject the refresh-on-read side effect (it must run from one scheduled job), and reject the two-store split (one store only).
Acceptance: Server test: a board with two open tasks (priority 9 and 4) and one completed; after 86400 s the next refresh keeps the 9 and the 4 (9 first), adds one more so three are open, drops the completed one and stamps the clock; a second refresh inside 86400 s changes nothing; completing the dropped task returns false.

## 6. Gaps and risks

- MIT: code may be adapted; the sketch is a fresh expression of the rule.
- Two stores (read, not run): the LLM path and the UI path read `character_data["tasks"]`; the AI refresh and the fallback read and write the meta `tasks` key (AIAgent.gd 387-408, 1710-1744). So the AI refresh changes a list the LLM path never reads, and the LLM path's completions are written where the AI refresh never looks. The UI copy works on `character_data`, so the UI refresh is the only one that matches the LLM path. Frankendom must have one store, and a test that refresh and completion touch the same record.
- Refresh on read: the AI refresh runs inside the task-info getter (361), so a read changes state, and it runs only when a prompt is built. Frankendom's refresh must be a scheduled server job; a player read must not change the board.
- The two minimums disagree (3 in the AI copy, 10 in the UI copy, AIAgent.gd 399 and GodUI.gd 780). Frankendom must pick one per zone as data.
- Completion is LLM-judged: option "4" (AIAgent.gd 1225-1227) marks the task done without any game event. Nothing checks it. Frankendom's completion must come from server-verified events (kill, loot, deliver counters), and a board must refuse a completion the server did not see.
- Completion matches by description and creation time (1576-1582), not by id. Two tasks with the same text in the same second cannot be told apart. Frankendom should use an id.
- The UI copy's top-up loop has no null check on the generator (GodUI.gd 780-782); the AI copy has one (AIAgent.gd 401-403). Frankendom's generator must never return nothing for a non-empty pool.
- Rewards: none. A finished task only writes a memory line (1582-1590 area, grep confirmed the memory call in `_complete_task`). Frankendom's reward must go through the one ledger.
- The donor file `script/TaskManager.gd` is absent (only its `.uid`), so any reference to it is dead.
- Not read: the pool (420-469), `GameSaveManager` save and load (grep only), `DialogManager`, `MemoryManager` internals, the prompt text after line 836.

Reuse tag: rewrite-from-idea (MIT; code may be adapted; this sketch is a fresh expression)
Brief rule served: 1 (one engine; the board is data in one place); rules 7-9 n/a
