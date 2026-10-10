# daggerfall-unity (quests-dialogue, cell 2)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Task.cs` (plus Quest.cs, QuestMachine.cs, QuestAction.cs, Foe.cs, Clock.cs, Actions/*.cs, Components/QuestResourceBehaviour.cs, and Game/TalkManager.cs) | Licence: MIT License (`/mnt/frankendom-donors/daggerfall-unity/LICENSE`: "MIT License", Copyright (c) 2009-2023 Daggerfall Workshop; each .cs header also says MIT License) | C# (Unity) | symbol `Task.Update`

Checked: Read in full: Task.cs (553 lines), QuestAction.cs (221 lines), KilledFoe.cs (110 lines). Read in ranges: Quest.cs 214-230, 281-347, 400-450, 826-842; QuestMachine.cs 44-45, 80-100, 295-335, 436-520; Foe.cs 30-130, 210-240; Clock.cs 28-30, 276-348, 385-420 (SetResource at 112-186 not read); GivePc.cs 36-200; GiveItem.cs 18-155; DialogLink.cs 18-147; TalkManager.cs 2158-2225 and 2246-2262; Components/QuestResourceBehaviour.cs 180-210; Actions/CreateFoe.cs 28-66; Actions/AddDialog.cs by grep only (lines 73, 77, 81). Confidence: high on the trigger/action runner and the tick order (read the whole path). High on the kill counter and the reward gate (read the whole functions). Medium on the dialogue-link defect: read by code path (TalkManager returns early on a missing key), not run. Not read: Parser.cs (QBN text parser), Person.cs, Place.cs, Message.cs, EndQuest.cs, Say.cs, QuestMCP.cs, save/restore of Quest and QuestMachine, QuestMachine.cs 66-79 and 1982-1988, and the other ~80 action files. Whole-mechanism claim is about the runner only, not every action.

## 1. Mechanism

- A quest is a set of tasks. Each task is a list of actions parsed from quest text. An action is either a trigger (it can arm the task) or an effect (it runs only while the task is armed). A trigger is "always-on" or plain. Plain triggers are checked only while the task is unarmed. Always-on triggers are checked every tick.
- Among always-on triggers, the first non-complete one in list order is the "primary". The primary can set the task armed or disarmed. Any later always-on trigger ("secondary") can only arm the task. (Task.cs 218-238.)
- Arming and disarming go through one setter. Disarming rearms every action of the task, so one-shot effects can fire again on the next arm (Task.cs 454-478).
- Order inside one `Task.Update` (Task.cs 194-282), for each action in list order:
  (a) skip actions that are complete (211-212), including triggers;
  (b) an always-on trigger runs as primary or secondary (218-238); a plain trigger runs only while unarmed (218, 237);
  (c) if the task is armed and the action is an effect: on the rising edge (prevTriggered false) call `InitialiseOnSet` (245-247), then `Update` (251); if `QuestBreak` is now set, return at once (252-253).
  After the action loop: a `PersistUntil` task ends (disarms) when its target is armed; otherwise it rearms its actions and repeats (263-278). Last, `prevTriggered = IsTriggered` (281).
- A `PersistUntil` task ("until X performed") starts armed (Task.cs 384-386) and is parked until X is armed. While parked, its effects are rearmed every tick, so they repeat. This is the donor's "parked script" shape.
- The quest tick: a Unity `Update` hook on QuestMachine (QuestMachine.cs 299-328) accumulates frame time and calls `Tick()` once the accumulated time reaches 1/10 s (45, 319-320). `Tick` calls `Update()` on each quest that is not complete (469-470). `Quest.Update` (Quest.cs 290-347) first counts down `ticksToEnd`, then ticks resources, then loops over tasks. The loop returns early when a break or completion is pending (321-325). Then it ticks resources again (PostTick).
- Objectives (kill count): when a foe's health reaches zero the foe is counted once per instance (QuestResourceBehaviour.cs 194-200, latch `isFoeDead`). The kill count lives on the Foe resource (Foe.cs 219-221). `KilledFoe` is a trigger: it arms the task when `foe.KillCount >= killsRequired` (KilledFoe.cs 57-69).
- Timers (Clock): the clock counts down world seconds. Each tick it subtracts the world-time difference since its last sample (Clock.cs 284-287). At zero it starts the task with the same name and latches finished (290-295, 401-413). `StartTimer` resets the sample, so paused time does not count (309-334).
- Rewards: `give pc` (GivePc) does nothing while the player is outside a town or outside hours 7 to 18 (71-72, 84-89), and sets `waitingForTown`. The random wait is drawn only on the first eligible check after such a wait: 40 to 500 quest ticks (73-74, 91-97). If the first check already passes, no wait is drawn. Then it adds the item to the player's inventory (179, 186) or offers it with the quest-complete popup (150-174). Its `allowRearm` is false (GivePc.cs 49; the check is in QuestAction.cs 170-171), so the reward cannot re-fire after the task is rearmed.

## 2. Key functions

- `Task.Update`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Task.cs` 194-282. The whole runner for one tick.
- `Task.SetTriggerValue` (disarm rearms actions): `Task.cs` 454-478, with the rearm at 473-477.
- `Quest.Update`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Quest.cs` 290-347 (break check 321-325; task loop 314-336).
- `QuestMachine.Update` and `Tick`: `QuestMachine.cs` 299-328 and 441-516. Exception policy at 472-487 (a non-protected quest that throws is removed, 482-486).
- `ActionTemplate.RearmAction` and `allowRearm`: `QuestAction.cs` 126, 168-172.
- `KilledFoe.CheckTrigger`: `Actions/KilledFoe.cs` 57-75.
- Kill latch: `Components/QuestResourceBehaviour.cs` 185-201. The injured event is handled before death (185-191, with the comment at 186).
- `Foe.IncrementKills`: `Foe.cs` 219-222.
- `Clock.Tick` and `StartTimer`: `Clock.cs` 276-300, 309-336. `TriggerTask`: 401-413.
- `GivePc.Update`: `Actions/GivePc.cs` 69-141 (gate 84-89, random delay 94, countdown 103-107, fire 111-140).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Quest tick rate 10 per second (QuestMachine.cs 45); the accumulator fires when it reaches 1/10 s (320) | 10 ticks/s; startup delay 0 s (44) |
| Armed/parked state, rearm on disarm, one-shot effects | None (rule) |
| Kill objective: count >= required, counted once per foe | Required count comes from the quest script (KilledFoe.cs 47) |
| Foe spawn count ceiling | 8 (Foe.cs 36) |
| Timer: random start, count down world seconds | Random start range: 60 s to 604800 s (Clock.cs 194-195; `GetTimeInSeconds` = days*86400 + hours*3600 + minutes*60 at 385-387) |
| Reward gate: town and hour window, then random wait in ticks (only after the player was outside the window) | Hours 7 to 18 (GivePc.cs 71-72); wait 40 to 500 ticks (73-74), which is 4 to 50 s at 10 ticks/s (derived arithmetic, not measured; the countdown runs only while in town, 101-102) |
| Completed quests kept for rumours | One in-game week, SecondsPerWeek (QuestMachine.cs 497) |

## 4. TypeScript sketch

simplified: This keeps the donor's order: always-on primary then secondary, plain triggers only while unarmed, effects in list order, a yield ends the task pass, and the PersistUntil check after the pass. It differs in three places, which are the three defects listed in section 6: (1) each action has its own `initialised` flag, cleared on disarm, instead of the shared `prevTriggered`, so a yield cannot cause a second init; (2) disarm rearms only on the true-to-false edge, not on every false check; (3) the yield flag is consumed at the start of each quest tick, not when the loop reaches the next task, and the tick accumulator carries overshoot. It omits the donor's trigger type for global variables, the dropped flag, save and restore, the message queue, the Unity loop, and the Clock and Foe resources. It is a clean-room rewrite of the shape, not a translation of the C#. (Typechecked on the VPS with `export {}` appended.)

```ts
// Licence: MIT (donor). Clean-room shape only, written from the described mechanism.
type Ctx = { yieldRequested: boolean };

interface Action {
  readonly kind: "trigger" | "always-on" | "action";
  complete: boolean;
  initialised: boolean;     // fix: init once per arming, tracked on the action itself
  readonly allowRearm: boolean;
  check(ctx: Ctx): boolean; // trigger kinds only
  init(): void;             // action kinds only
  run(ctx: Ctx): void;      // action kinds only
}

class Task {
  private armed = false;
  private readonly persistUntil?: () => boolean; // "until X performed": parked until X is true
  constructor(private readonly actions: Action[], persistUntil?: () => boolean) {
    this.persistUntil = persistUntil;
  }

  get isArmed(): boolean {
    return this.armed;
  }

  // Disarming rearms every action. fix: only on the true->false edge, not on every false check.
  setArmed(value: boolean): void {
    if (value === this.armed) return;
    this.armed = value;
    if (!value) {
      for (const a of this.actions) {
        if (a.allowRearm) a.complete = false;
        a.initialised = false;
      }
    }
  }

  // One task tick, in list order. A "primary" always-on trigger may arm or disarm the task;
  // later always-on triggers may only arm it. Plain triggers are checked only while unarmed.
  tick(ctx: Ctx): void {
    let primaryRan = false;
    for (const a of this.actions) {
      if (a.complete) continue;
      if (a.kind === "always-on") {
        if (!primaryRan) {
          primaryRan = true;
          this.setArmed(a.check(ctx));
        } else if (a.check(ctx)) {
          this.setArmed(true);
        }
      } else if (a.kind === "trigger") {
        if (!this.armed) this.setArmed(a.check(ctx));
      } else if (this.armed) {
        if (!a.initialised) {
          a.init();
          a.initialised = true;
        }
        a.run(ctx);
        if (ctx.yieldRequested) return; // a yield ends this task's pass; remaining effects resume next tick
      }
    }
    if (this.persistUntil) {
      if (this.persistUntil()) {
        this.setArmed(false);
      } else {
        for (const a of this.actions) if (a.allowRearm) a.complete = false; // repeat while parked
      }
    }
  }
}

// fix: the yield flag is consumed at the start of each quest tick, so one yield never costs a whole tick.
function runQuestTick(tasks: Task[], ctx: Ctx): void {
  ctx.yieldRequested = false;
  for (const t of tasks) {
    t.tick(ctx);
    if (ctx.yieldRequested) return;
  }
}

// fix: carry the overshoot instead of resetting to zero; cap catch-up ticks and report the dropped debt.
class FixedStep {
  private acc = 0;
  constructor(private readonly stepSeconds: number, private readonly maxCatchUp: number) {}

  advance(dtSeconds: number, onTick: () => void): number {
    this.acc += dtSeconds;
    let n = 0;
    while (this.acc >= this.stepSeconds && n < this.maxCatchUp) {
      this.acc -= this.stepSeconds;
      onTick();
      n++;
    }
    let dropped = 0;
    if (this.acc >= this.stepSeconds) {
      dropped = this.acc;
      this.acc = 0;
    }
    return dropped; // caller logs or counts it
  }
}
```

## 5. Lands in

- TARGET `origins/quests/task-runner.ts` (new, proposed path; no quest runner module is confirmed in the Frankendom repo). Server-side only: the runner ticks on the server, not in the client.
- Parity-checklist row 18 (loot roll and XP award). Row 18 covers the reward delivery part (the give-pc gate, one inventory, reward fires once). No row 1-23 covers the trigger/arm/rearm runner itself, so this is a gap to report to Strategy, not a fit.
- Sub-line for the tick: "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). The `FixedStep` sketch is the fixed-step part.
- Reuse tag: adapt-allowed (MIT); the sketch is a clean-room rewrite of the shape.
- Brief rule served: quests as data on one engine (the arm/rearm/persist shape is expressed as data, not code); one ledger for the reward (the gate and grant go through one inventory call, as GivePc does at 179 and 186).

Best transferable idea: A quest task is a list of triggers and effects with a lifetime: one primary always-on trigger can arm or disarm it, disarming rearms every effect, and a parked task rearms its effects each tick until its target is armed.
Decision (proposed): adapt - keep the arm, disarm, rearm and parked shape, and express it as zone data on the server; fix the three ordering defects in section 6 and reject the Unity runtime and the QBN text parser (Frankendom quests are authored data).
Acceptance: A server test runs a quest with "kill 3 imp" then "give pc reward": the reward is granted exactly once; a message that yields on the tick the task arms does not init the spawn counter twice; disarming the task rearms the one-shot effects and a second arm grants them again.

## 6. Gaps and risks

- Client-side runtime: QuestMachine is a Unity MonoBehaviour (QuestMachine.cs 35) that ticks in the client. Frankendom must run the runner on the server. The kill count is incremented in the client's scene object (QuestResourceBehaviour.cs 199). That must become a server-verified kill event; the donor does not verify kills.
- Defect 1, stale prevTriggered after a yield. `Task.Update` returns at the break (252-253) before `prevTriggered` is stored (281). If the task armed on that tick, `prevTriggered` is still false when the task next runs, so `InitialiseOnSet` runs again for effects that already started. The only override in Actions is CreateFoe (63-64: `lastSpawnTime = 0;`, `spawnCounter = 0;`), so a spawn counter can reset twice. fix: per-action `initialised` flag cleared on disarm (sketch). Confirmed by reading the code path; not run.
- Defect 2, a yield skips the task pass. `Quest.Update` clears the break only when the loop reaches another task (321-325). If the break came from the last task, the flag survives into the next tick and that tick returns before any task runs. fix: consume the yield at the start of the tick (sketch `runQuestTick`). Confirmed by reading; not run.
- Defect 3, the accumulator resets to zero (QuestMachine.cs 327), so the overshoot of each tick is thrown away and the tick runs slower than 10 per second when frames are longer than 0.1 s. By arithmetic, at 30 fps a tick waits for the first frame that crosses 0.1 s, so the rate is about 7.5 to 10 per second (not measured). fix: carry the overshoot and cap the catch-up (sketch `FixedStep`).
- Defect 4, dialogue links. In DialogLink.cs the pairwise rows (97, 98, 103, 104, 109, 110) use as their first key `namePlace` (empty string; the assignment at 76 is inside a comment block, 75-79), `namePerson` (`person.DisplayName`, 84) or `nameItem` (`ItemName`, 89). Resources are registered by symbol name (AddDialog.cs 73; DialogLink.cs 80, 85, 90). TalkManager looks the first key up in the registry (TalkManager.cs 2174) and returns with a log when it is missing (2180-2181). By reading, all six pairwise calls return at that point unless a display or item name happens to equal a symbol name, so the pairwise links are not stored. Not run. fix: key every link by the same symbol id the quest uses; do not key by display name.
- Two error policies. GiveItem throws when an item symbol is missing (GiveItem.cs 58), which removes a non-protected quest (QuestMachine.cs 482-486). GivePc logs and retries every tick (GivePc.cs 122-123). Frankendom must pick one; for one ledger, a missing reward should fail the quest load test, not the live quest.
- The random reward delay uses `UnityEngine.Random` (GivePc.cs 94), a global RNG that is not tied to any save or server seed (by reading; how Unity seeds it was not read). The server must draw the delay from its own seeded RNG so the outcome can be checked.
- Doc error: ActionTemplate says `Update` is "called once per frame" (QuestAction.cs 82). The runner calls it once per quest tick, 10 per second (QuestMachine.cs 441-470). Trust the code, not the comment.
- Donor quests are parsed from QBN text at load (Task.cs 156-192). Frankendom quests should be authored data; reject the text parser. Parser.cs was not read.
- Parked tasks rearm their effects each tick (Task.cs 275). A parked effect that is not idempotent (a counter, a spawn) repeats every tick. Frankendom must make each parked effect idempotent or gate it.
- Design note, not donor code: the donor has no input intake for the quest pass (quests react to resource events inside the client loop). For Frankendom, player and world events should be queued before the server quest pass, so each tick sees a fixed input set (row 5 intake; server tick sub-line).
