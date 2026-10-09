# daggerfall-unity (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Task.cs | Licence: MIT | C# | symbol Task.Update / Task.Start / GetSaveData (input line 194 verified: `Task.Update`; `Start` 287, `Clear` 295, `GetSaveData` 499; per-tick caller `Quest.Update` in Quest.cs 290)

## 1. Mechanism
- A quest is a set of Tasks, each parsed from the game's quest script. Each Task holds actions. Some actions are trigger conditions (they decide whether the task is on), others are actions (they run only while the task is on).
- Quest.Update (Quest.cs 290-347) runs once per game tick. If the quest is already complete it returns at once (294-299). Otherwise it counts down the end timer, setting complete when it reaches zero (301-305), ticks its resources (308-311), then walks the tasks in order, skipping dropped ones (317-318). Before each task it checks for a quest break or completion left by the previous task and returns (clearing the break flag) if either is set (321-325); so a timer that expires this tick stops the quest before the first non-dropped task runs. After each task it shows pending task messages and performs pending click rearms (329-335). After the loop it shows remaining messages and post-ticks the resources (340-346); an early return skips those two steps.
- Task.Update (194-282): a trigger is checked while the task is off (or when it is always-on) (218). The first always-on trigger is primary and can both start and stop the task (221-227). Later always-on triggers are secondary and can only start it (228-233). Non-trigger actions run only while the task is on (242); on the first tick after turning on (`prevTriggered` false) each calls InitialiseOnSet before its Update (245-248). Completed actions are skipped (211-212). If an action raises a quest break, Task.Update returns immediately, skipping the PersistUntil check and the `prevTriggered` update (252-253).
- PersistUntil tasks watch a target task (263-278), after their actions have run at least once. When the target is triggered, the task clears itself; otherwise its actions are rearmed for the next tick. Then `prevTriggered` is stored (281).
- Start() (287-290) sets the task on; Clear() (295-298) sets it off. Drop() (304-308) is a one-way setting that marks it dropped and off, so the quest ignores it.
- Save: GetSaveData (499-522) writes the task's symbol, target symbol, triggered and previous-triggered flags, type, dropped, global-variable name and link, the has-trigger-conditions flag, and each action's save data. RestoreSaveData (524-549) reads them back, rebuilding each action by reflection on its saved type.
- Inputs: the parsed task lines, world state through the actions. Outputs: task on or off, action effects. Runs on the game tick.

## 2. Key functions
- Task.Update (daggerfall) | /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Task.cs | 194-282 | trigger evaluation (primary and secondary always-on rules), action ticking, PersistUntil termination.
- Task.Start (daggerfall) | /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Task.cs | 287-290 | sets the task on from outside.
- Task.Clear (daggerfall) | /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Task.cs | 295-298 | sets the task off so it can rearm.
- Task.GetSaveData (daggerfall) | /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Task.cs | 499-522 | serialises the task and its actions.
- Task.RestoreSaveData (daggerfall) | /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Task.cs | 524-549 | reads the saved state back.
- Task.Drop (daggerfall) | /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Task.cs | 304-308 | one-way: marks dropped and off.
- Quest.Update (daggerfall) | /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Quest.cs | 290-347 | per-tick driver: timer, resources, then each task in order with a break check.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Trigger / action split: triggers gate, actions run only while gated on | Trigger and action classes (theirs) |
| One primary always-on trigger that can turn off, the rest can only turn on | Primary and secondary rule (theirs, from a classic-game bug fix) |
| Rearm on each tick for repeating persistent tasks | PersistUntil target rule (theirs) |
| Save every flag needed to resume mid-quest | Field list in TaskSaveData_v1 (theirs, Task.cs 485-497) |
| Quest-level end timer in ticks | ticksToEnd countdown (theirs, Quest.cs 301-305) |

## 4. TypeScript sketch
simplified: omits PersistUntil handling (target check, rearm), the early return on an action's quest break inside `updateTask` (the sketch only checks `questBreak` between tasks), dropped tasks, resources and their tick/post-tick, pending messages and click rearms, the already-complete guard, and the save/restore pair (the sketch has no GetSaveData). Reordered: the sketch returns `true` at once when the end timer reaches zero, while the donor sets complete and stops at the next task check (321-325); the donor also clears the break flag when it stops, which the sketch's `questBreak()` callback leaves to the caller.

```ts
// Licence: MIT (daggerfall-unity). Logic lifted from Assets/Scripts/Game/Questing/Task.cs
// (Update, Start, Clear, GetSaveData) and rewritten in TS with local types.
interface Action { isTrigger: boolean; isAlwaysOn: boolean; isComplete: boolean; check(): boolean; run(): void; init(): void; }
interface TaskState { on: boolean; prevOn: boolean; actions: Action[]; }

function updateTask(t: TaskState): void {
  let primaryRan = false;
  for (const a of t.actions) {
    if (a.isComplete) continue;
    if ((a.isTrigger && !t.on) || a.isAlwaysOn) {
      if (a.isAlwaysOn && !primaryRan) { t.on = a.check(); primaryRan = true; }
      else if (a.isAlwaysOn) { if (a.check()) t.on = true; }   // secondary: can only turn on
      else t.on = a.check();
    }
    if (t.on && !a.isTrigger) {
      if (!t.prevOn) a.init();
      a.run();
    }
  }
  t.prevOn = t.on;
}

function startTask(t: TaskState): void { t.on = true; }
function clearTask(t: TaskState): void { t.on = false; }

function updateQuest(tasks: TaskState[], ticksToEnd: { n: number }, questBreak: () => boolean): boolean {
  if (ticksToEnd.n > 0 && --ticksToEnd.n === 0) return true;  // quest ends
  for (const t of tasks) {
    if (questBreak()) return false;
    updateTask(t);
  }
  return false;
}
```

## 5. Lands in
- Frankendom target: `origins/quests/journal.ts` (the quest journal, "advanced only along the content's transitions") is the existing home and is stage-based, not a per-tick task machine; this donor would only inform an optional timed or conditional layer. Server-side entry is `origins/server/quest-advance.ts`. Both exist on the VPS snapshot /root/work-k7 (not main); only header comments were read.
- Parity-checklist row: none of rows 1 to 22 (post-K item 3, server tick, is the clock that any per-tick quest driver would hang on). Feature-map section: Origins O2 quests (`docs/specs/origins/modernuo-quests.md`, `openmw-quest-journal.md` on the snapshot).
- Reuse tag: adapt (MIT, so the logic can be lifted; the QBN script format is Daggerfall's own)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Triggers read world state directly through action objects (`action.CheckTrigger(this)`, 225). In Frankendom the server must decide every trigger on its own facts; a client-side trigger is not allowed (server-verified).
- The save format is a full dump per task, rebuilt by reflection (542-543). Frankendom needs per-character storage on the server through the one ledger; the field list can inform the shape but the reflection rebuild must not be copied.
- Tick-driven: Quest.Update expects a per-tick call. Frankendom's journal advances on explicit transitions, and the server tick unification is post-K item 3. Per-tick polling of every task for every character would be expensive on a single shard; prefer event-driven checks.
- The primary/secondary always-on rule exists to match a classic-game quirk (comment 196-201); Frankendom does not need it unless it copies Daggerfall's quest scripts.
- Quest state is mutated inside `Update` through actions (rewards, spawns); Frankendom rewards are granted once by the journal and spawns come from zone data (MAX_ATTACKERS = 3 applies).
- Pit is a client only and has no quests.
- Not read: the action classes, `QuestResource.Tick`, `RearmActions`, `ReadTaskLines`, and Quest.cs outside 280-350.
