# dhewm-dhewm3 (quests-dialogue, cell 3)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/script/Script_Thread.cpp` (plus Script_Interpreter.cpp, game/Mover.cpp, game/Player.cpp, d3xp/Item.cpp, game/Entity.cpp) | Licence: GNU GPL version 3 or later (Script_Thread.cpp header, lines 9-12), with the id Software "additional terms" that the header says accompany the GPL (line 22; the terms text is not in the box and was not read) | C++ | symbol `idThread::Execute`

Checked: Read: Script_Thread.cpp 1-30 (licence header), 43-46, 120-124, 325-348, 536-586, 646-800, 866-1000; Script_Interpreter.cpp 892-899 and 992-1030; game/Mover.cpp 418-431 and 2383-2393; game/Player.cpp 3245-3301; d3xp/Item.cpp 1476-1514 and 2110-2136; game/Entity.cpp 3150-3162 and 3290-3299. Grep only: Script_Thread.cpp 370-395 (save fields), game/Mover.cpp 618, 806, 2610, callers of `Execute()` in Weapon.cpp and Actor.cpp. Confidence: high on the park, wake and resume order (read end to end). High that the lost-wakeup and the fatal budget are in the code (not run). Medium on wait(0) because it depends on callers I did not read. Not read: the event queue (idEvent, `PostEventMS`, `ServiceEvents`), `CancelEvents`, the `SEC2MS` macro, the statement-by-statement interpreter, and the savegame restore of wait targets. Dialogue and quest search: grep for "conversation" and "dialog" under neo/ found only menu and framework files; the box has no dialogue tree and no quest state machine. The quest-like pieces are script threads and a player objective list.

## 1. Mechanism

- A script thread (`idThread`) runs compiled script on an interpreter. The interpreter runs statements until something sets `doneProcessing` (Script_Interpreter.cpp 1015-1016). A pause call then parks the thread with exactly one wake condition, held in three fields: `waitingUntil` (a time), `waitingFor` (an entity number), or `waitingForThread` (a thread).
- Park calls: `wait(seconds)` goes through `WaitSec` to `WaitMS`, which sets `waitingUntil = now + ms` (Script_Thread.cpp 888-899). `waitFrame` sets the wake one engine msec ahead (907-915), except in manual-control threads, which set no time so they can run again that frame (910-914). `waitFor(entity)` asks the entity for a callback (965-966); only if the entity returns true does the thread park with `waitingFor` set (967-969). `waitForThread(n)` parks with `waitingForThread` (990).
- Resume, in `Execute` (649-679), in this order: (1) a manual-control thread with a future wake returns without running (653-654); (2) `lastExecuteTime` is stamped (660); (3) all waits are cleared (661); (4) the interpreter runs until it parks or ends (662); (5) if it ended, `End` runs and the thread may be removed (663-667); (6) otherwise, if `waitingUntil > lastExecuteTime`, one `EV_Thread_Execute` is posted at the wait length (669-670), or every engine msec while a multi-frame event is in progress (671-672).
- Wake by entity: when the entity finishes, `ObjectMoveDone` checks that this thread is the one waiting on it (751-754), clears the waits and calls `DelayedStart(0)` (755-756). Wake by thread end: when a thread is destroyed, it calls `ThreadCallback` on every thread waiting on it (338-341); `ThreadCallback` wakes the waiter only if it is the one it waits for (770-772).
- One resume at a time: `DelayedStart` cancels any pending `EV_Thread_Execute` before posting the new one (539-544). `Start` does the same and then runs `Execute` at once (552-559).
- Signals and calls preempt a park: `CallFunction` calls `ClearWaitFor` first (707-710), so a parked thread that gets a function call (for example from an entity signal, Entity.cpp 3296-3297) loses its wait.
- Compute budget per resume: the interpreter loop has a counter of 5,000,000 statements (1013); when it runs out, it raises `Error("runaway loop error")` (1019-1020). That is a fatal error, not a yield.
- Objectives (adjacent quest state, thin): the player keeps a list of objective entries with title, text and screenshot. `GiveObjective` appends one (Player.cpp 3271-3281). `CompleteObjective` removes the first entry whose title matches case-insensitively (3288-3295) and shows a popup (3296). An objective trigger (d3xp/Item.cpp 1479-1506) gives the objective, then sets the `objEnabled` flag on the first complete-trigger entity with the same title (1499-1503). A complete trigger does nothing unless that flag is set (2114-2115), then calls `CompleteObjective` by title (2131).

## 2. Key functions

- `idThread::Execute`: `Script_Thread.cpp` 649-679 (order of steps in section 1).
- `idThread::IsWaiting`: 688-698 (true for thread, entity or time waits).
- `idThread::ClearWaitFor`: 730-734.
- Wake paths: `ObjectMoveDone` 751-758 (entity), `ThreadCallback` 765-774 (thread), and the destructor's wake loop 328-343.
- Park paths: `WaitMS` 888-891, `WaitSec` 898-900, `WaitFrame` 907-915, `Event_WaitFor` 964-972, `Event_WaitForThread` 979-992.
- Scheduling: `DelayedStart` 539-545, `Start` 552-559.
- Interpreter loop: `Script_Interpreter.cpp` 1013-1020 (budget and loop), 897 (multi-frame flag).
- Entity side of `waitFor`: `game/Mover.cpp` 423-431 (plain mover, checks `!move_thread` at 428) and 2386-2393 (binary mover, no check).
- Objective list: `game/Player.cpp` 3271-3301; trigger and complete logic `d3xp/Item.cpp` 1479-1514 and 2110-2136.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Seconds to wake time | `SEC2MS(time)` (Script_Thread.cpp 899; macro not read) |
| One-frame wait | `gameLocal.msecPrecise` (913), an engine frame length |
| Repost while a multi-frame event runs | `gameLocal.msec` (672), an engine frame length |
| Entity wake delay | `DelayedStart(0)` (756): posted with delay 0 (event queue not read, so the exact frame is not known) |
| Statements per resume before a fatal error | 5,000,000 (Script_Interpreter.cpp 1013) |

Wait targets are in engine ms (`gameLocal.time`, 890 and 913). The frame length comes from engine variables (`msec`, `msecPrecise`); this code does not fix it.

## 4. TypeScript sketch

simplified: This keeps the donor's rules: a park holds one wake condition; `Execute` clears the wait before running; a wake cancels the pending resume before posting a new one; a thread-end wake fires for every waiter. It differs in four places. (1) Waiters are stored per script, so several scripts can wait on one entity (the donor's binary mover keeps one slot). (2) An over-budget resume yields and is counted, instead of a fatal error. (3) A time wait of zero is due at once in the sketch; the donor's `Execute` does not repost a zero-length wait itself (Script_Thread.cpp 669), and whether it resumes depends on its callers, which were not run. (4) The event queue is replaced by an explicit `advance(now)`. It omits `waitFrame`, manual-control threads, signals, save and restore, and the interpreter itself (`step` is a contract, not an implementation). It is a clean-room shape, not a translation. (Typechecked on the VPS with `export {}` appended.)

```ts
// Licence: GPL-3.0-or-later donor (copyleft). Clean-room shape only, written from the described mechanism.
type Wake =
  | { kind: "none" }
  | { kind: "time"; until: number }       // wait(seconds), converted to game ms
  | { kind: "entity"; entityId: number }  // waitFor(entity): woken by that entity's done notify
  | { kind: "thread"; threadId: number }; // waitForThread: woken when that script ends

type StepResult = { parked: true; wake: Wake } | { parked: false };

interface Script {
  readonly id: number;
  // Runs statements until the script parks or ends, or the budget is spent (then parks with wake none).
  step(budget: number): StepResult;
}

class Scheduler {
  private now = 0;
  private readonly scripts = new Map<number, Script>();
  private readonly wakes = new Map<number, Wake>();
  private readonly epoch = new Map<number, number>();   // fix: a newer resume supersedes an older one
  private due: Array<{ at: number; id: number; epoch: number }> = [];
  overBudget = 0;                                       // fix: over-budget resumes are counted, not fatal

  constructor(private readonly budgetPerResume: number) {}

  add(s: Script): void {
    this.scripts.set(s.id, s);
    this.resume(s.id, this.now);
  }

  // One pending resume per script: scheduling a new one cancels the old one (donor CancelEvents).
  private resume(id: number, at: number): void {
    const e = (this.epoch.get(id) ?? 0) + 1;
    this.epoch.set(id, e);
    this.due.push({ at, id, epoch: e });
  }

  private resumeNow(id: number): void {
    this.wakes.set(id, { kind: "none" });
    this.resume(id, this.now);
  }

  // Several scripts may wait on one entity; each gets its own wake (fix: no single shared slot).
  entityDone(entityId: number): void {
    for (const [id, w] of this.wakes) {
      if (w.kind === "entity" && w.entityId === entityId) this.resumeNow(id);
    }
  }

  advance(now: number): void {
    this.now = now;
    const ready = this.due.filter((d) => d.at <= now).sort((a, b) => a.at - b.at || a.id - b.id);
    this.due = this.due.filter((d) => d.at > now);
    for (const d of ready) {
      if (this.epoch.get(d.id) !== d.epoch) continue; // stale resume
      const s = this.scripts.get(d.id);
      if (!s) continue;
      this.wakes.set(d.id, { kind: "none" }); // waits are cleared before the script runs
      const r = s.step(this.budgetPerResume);
      if (!r.parked) {
        this.scripts.delete(d.id);
        this.wakes.delete(d.id);
        this.threadEnded(d.id);
        continue;
      }
      if (r.wake.kind === "none") {
        this.overBudget++;
        this.resume(d.id, now); // yield and continue next advance
        continue;
      }
      this.wakes.set(d.id, r.wake);
      if (r.wake.kind === "time") this.resume(d.id, r.wake.until); // wait(0) is due at once
    }
  }

  private threadEnded(threadId: number): void {
    for (const [id, w] of this.wakes) {
      if (w.kind === "thread" && w.threadId === threadId) this.resumeNow(id);
    }
  }
}
```

## 5. Lands in

- TARGET `origins/quests/parked-scripts.ts` (new, proposed path). Server side: a quest step that waits runs on the server scheduler, and its wake is a server event (a timer, a door reporting done, another script ending).
- Parity-checklist row 18 (loot roll and XP award), the cell's hint. No row 1-23 covers parked scripts, so this is a gap to report to Strategy; the reward hand-off that a parked script triggers falls under row 18.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later with id additional terms: copyleft, clean-room only).
- Brief rule served: quests as data on one engine (a parked step is zone data that the server runs); server-verified outcomes (the wake is a server event, not a client report).

Best transferable idea: A parked script holds exactly one wake condition (a time, an entity's done notice, or another script's end), and each wake cancels the pending resume before posting a new one, so a script runs once per wake.
Decision (proposed): adapt - keep one wake per park and the cancel-then-repost rule on the server; store waiters per entity instead of one slot, yield and count over-budget resumes instead of stopping the server, and make a zero-length wait due at once; reject the idThread and interpreter code itself (copyleft, clean-room only) and the objective list as written, because it keys by display title and has no ids.
Acceptance: A server test runs a quest step "wait 2 s, then wait for door 7": the step resumes at 2 s and again when door 7 reports done; two scripts waiting on door 7 both resume; a script that spends its budget yields and continues on the next advance; no script runs twice for one wake.

## 6. Gaps and risks

- No dialogue tree or quest state machine in this donor. The quest-like code is script threads (sections 1 and 2) and a player objective list. The "dialogue trees" part of the cell is not covered.
- Lost wakeup (defect, by reading, not run): `idMover_Binary::Event_SetCallback` (Mover.cpp 2386-2393) returns true while the mover is moving and stores `move_thread` without checking whether it is already set. The plain mover checks `!move_thread` (428). If two scripts `waitFor` the same moving binary mover, the mover's single `move_thread` slot ends up naming only the second script, so the move-done notify never wakes the first, whose `waitingFor` stays set until something runs it again. fix: a list of waiters per entity (sketch `entityDone`).
- Fatal budget (defect, by reading): one long resume ends the game with `Error("runaway loop error")` (Script_Interpreter.cpp 1019-1020). fix: yield, count and report (sketch `overBudget`).
- Silent no-op wait: `waitFor` on an entity that does not accept a callback, or on a binary mover that is at rest, returns without parking (Script_Thread.cpp 965-970; Mover.cpp 2387-2391). The script then continues as if the wait had happened. For Frankendom: a quest step that waits on a door must check the door's state first, or fail loudly.
- Zero-length wait (open check): `Execute` reposts only when `waitingUntil > lastExecuteTime` (669). For `wait(0)` it does not repost, so the resume depends on the caller (Entity.cpp 3296-3297 and the Weapon.cpp and Actor.cpp callers were not read). Check before porting; the sketch treats it as due at once.
- Preemption: `CallFunction` clears a pending wait (Script_Thread.cpp 707-710). A signal or call delivered to a parked script abandons its wait without an error. Frankendom must decide whether a new command preempts a parked quest step; a server must record the preemption in the one ledger.
- Save and load: the wait fields are saved (Script_Thread.cpp 370-372, read at 393-395). The wait target is an entity number, which may refer to another entity after load. Not verified.
- Objective list (adjacent, thin): `CompleteObjective` shows the complete popup even when no title matched, because `ShowObjective` is outside the `if` (Player.cpp 3291-3296). `GiveObjective` appends with no duplicate check (3276). The trigger enables only the first complete entity with the same title (d3xp Item.cpp 1501-1503), and the complete trigger does not clear `objEnabled` (2114-2131), so a second trigger would show the popup again. The key is the display title, not an id.
- Licence: GPL-3.0-or-later plus id additional terms (header line 22, text not read). Clean-room shape only; no copy of the code.
- Not read: event queue (`PostEventMS`, `ServiceEvents`), `CancelEvents`, `SEC2MS`, the interpreter statements, and the savegame restore of wait targets.
