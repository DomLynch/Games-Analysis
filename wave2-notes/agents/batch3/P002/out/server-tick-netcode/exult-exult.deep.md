# exult-exult (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/exult-exult/tqueue.cc` (with `tqueue.h`, `gumps/gump_utils.h`, `exult.cc`) | Licence: GPL-2.0-or-later (per `tqueue.cc` header: "either version 2 of the License, or" any later version; the bundled `COPYING` is GPL v2) | C++ | symbol `Time_queue::activate`

Checked: Read `tqueue.cc` 30-330 in full (lines 1-30 are the licence header, checked by grep, and includes) and `tqueue.h` 23-160 (the top 1-22 are includes and guards, not read). Read the frame loop top in `exult.cc` (1300-1470) and the other two `activate` call sites (2540-2580, 2660-2700); `gump_utils.h` 36-60; `combat.cc` 1890-1925; `gamewin.cc` 620-626 and 2825-2856; `usecode/conversation.cc` 560-576. Hint file `server/servemsg.cc` read at lines 1-30 (its header: "This is for inclusion by both client and server") and its `GetTickCount` use at 139-140 (a busy-wait helper, not the game loop). `server/server.cc` read at lines 1-12 and grep only; its code sits under `#ifdef USE_EXULTSTUDIO` from `server/server.cc:30` and its header says "Server functions for Exult (NOT ExultStudio)" (line 2), so I did not resolve what it is, but it is not the game clock (not read in full). Not read: the bodies of `handle_event` in any game object (NPC schedule, effects, missiles), so how a handler uses the frame time is (not read). The enclosing function names of `exult.cc:2564` and `2683` are (not read). Confidence: high on the queue and its pause rule; medium on calling it a "server tick" at all, because Exult is single-player with no netcode (see section 6).

## 1. Mechanism

- One global time queue (`gwin->get_tqueue()`) holds every timed event: a due time, a handler, and one word of user data. Entries are kept sorted by due time; `add` inserts after all entries due at or before the new one (`tqueue.cc:71`).
- The clock is the wall clock, not a fixed step. Each frame of the main loop reads `ticks = SDL_GetTicks()` (`exult.cc:1365`) and passes that frame time to `activate(ticks)` (`exult.cc:1391`), but only when the window has focus and no drag is active (`exult.cc:1390`).
- Frame pacing: at the top of each loop iteration, `Delay()` runs first (`exult.cc:1352`, the branch without `USE_EXULTSTUDIO`). `Delay()` returns when 10 ms have passed since it was called (`gump_utils.h:41,45`), or early if any event is pending; while waiting it sleeps in 1 ms steps (`gump_utils.h:53`). So one frame is at least about 10 ms apart unless an event forces an early return.
- `activate(now)` (`tqueue.cc:192-200`) picks one of three paths: (a) if the queue is in map-edit mode, a map-edit path; (b) if paused (count > 0), only entries whose handler has the `always` flag run (`tqueue.cc:195-196`); (c) otherwise, if the head entry is due, drain: pop the head, call `handle_event(now, udata)` (`tqueue.cc:221`), and repeat while the new head is due (`tqueue.cc:224`). Every due entry in a single call gets the same `now`; there is no per-call cap on how many run.
- Pause is a counted stack. `pause(now)` increments the count and records the pause start only on the 0 to 1 transition (`tqueue.h:140-142`). Adding during a pause to a non-`always` entry subtracts the time already spent paused from its due time (`tqueue.cc:65-68`), so its delay counts from the resume.
- `resume(now)` decrements the count and does nothing until the count reaches 0 (`tqueue.cc:291-293`). Then `diff = now - pause start`, and every non-`always` entry whose `pause_added` equals that pause start is pushed later by `diff` (`tqueue.cc:295`, `304-305`). Entries queued before the pause are not pushed (their `pause_added` is 0).
- Who pauses: the combat pause toggle (`combat.cc:1898` returns early unless already paused or in the non-original mode; `combat.cc:1905` pauses, `1922` resumes); window focus loss (`gamewin.cc:2853`); the conversation loop waiting for sprite effects, which pauses and calls `activate` in its own loop (`usecode/conversation.cc:565`, `571`, `576`); a click wait (`exult.cc:2512-2514`); and several gump and menu paths.
- Game time step: `std_delay = 1000 / fps` (`gamewin.cc:624`), with `fps` read from config and defaulting to 5 (`gamewin.cc:620`), which gives 200 ms. The compiled-in constant is `c_std_delay = 200` (`exult_constants.h:42`). It is used as the animation step, not as a simulation tick.

## 2. Key functions

- `Time_queue::activate` at `/mnt/frankendom-donors/exult-exult/tqueue.cc` 192-200: the dispatch between map-edit, paused, and normal drain.
- `Time_queue::activate0` at `/mnt/frankendom-donors/exult-exult/tqueue.cc` 207-225: the normal drain (pop head, `handle_event(curtime, udata)`, re-check head).
- `Time_queue::activate_always` at `/mnt/frankendom-donors/exult-exult/tqueue.cc` 232-254: the paused drain. It removes and runs only `always` entries that are due and skips the rest.
- `Time_queue::add` (the `pause`-aware overloads) at `/mnt/frankendom-donors/exult-exult/tqueue.cc` 61-73 and 75-91: sorted insert, with the due-time shift while paused.
- `Time_queue::resume` at `/mnt/frankendom-donors/exult-exult/tqueue.cc` 291-309: the counted unpause and the shift of entries from this pause cycle only.
- `Time_queue::pause` (inline) at `/mnt/frankendom-donors/exult-exult/tqueue.h` 140-143.
- `Delay` at `/mnt/frankendom-donors/exult-exult/gumps/gump_utils.h` 44-55: the 10 ms frame wait.
- Frame loop at `/mnt/frankendom-donors/exult-exult/exult.cc` 1348-1391: `while (!quitting_time)`, `Delay()`, `ticks`, focus guard, `activate(ticks)`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sorted queue of due events; drain every due head per frame | None (the queue is generic over `Time_sensitive`) |
| Counted pause; push back only the entries queued during this pause, by the pause length | None; the shift is `now - pause start` (`tqueue.cc:295`) |
| Paused: only entries flagged `always` run | Flag per object (`tqueue.h:34`) |
| Frame wait at least 10 ms, sleeping 1 ms steps, early return on a pending event | `DELAY_TOTAL_MS 10`, `DELAY_SINGLE_MS 1` (`gump_utils.h:41-42`) |
| Animation step = 1000 / fps ms | Default fps 5 (`gamewin.cc:620`) gives 200 ms; compiled-in `c_std_delay` 200 (`exult_constants.h:42`) |

Checked against the code: the 10 ms is a budget per `Delay()` call, not a measured frame rate (not measured). The 200 ms is the default animation step, not a simulation rate.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three paths in `activate` (paused: only `always` entries; normal: drain due heads), the same pause-count rule, and the same shift on resume. It omits the map-edit path, the `shared_ptr` ownership and `queue_cnt` bookkeeping, `remove`, `find`, `find_delay`, and the iterator. It uses a plain array with `splice` where the donor uses `std::list`, so inserts are O(n). It takes `now` as a parameter in `add`, where the donor reads the clock itself. It shares the donor's `0 = not paused` sentinel, so a pause that starts at time 0 is not counted in either version.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Timed {
  always: boolean;                              // runs even while the queue is paused
  onDue(frameTime: number, data: number): void; // receives the frame time, not the due time
}

interface Entry { due: number; obj: Timed; data: number; pauseAdded: number; }

export class TimeQueue {
  private entries: Entry[] = [];   // kept sorted by due time
  private pauseStart = 0;          // time the current pause began; 0 = not paused
  private pauseDepth = 0;          // nested pause count

  // `now` is passed in; the donor reads the clock inside add().
  add(due: number, obj: Timed, data: number, now: number): void {
    let at = due;
    let pauseAdded = 0;
    if (this.pauseDepth > 0 && !obj.always) {
      at -= now - this.pauseStart;     // delay counts from the resume, not from the pause
      pauseAdded = this.pauseStart;
    }
    let i = this.entries.length;       // insert after every entry due at or before `at`
    while (i > 0 && this.entries[i - 1].due > at) i--;
    this.entries.splice(i, 0, { due: at, obj, data, pauseAdded });
  }

  pause(now: number): void {
    if (this.pauseDepth++ === 0) this.pauseStart = now;
  }

  resume(now: number): void {
    if (this.pauseDepth === 0 || --this.pauseDepth > 0) return;   // only the outermost resume counts
    const cycle = this.pauseStart;
    const diff = now - cycle;
    this.pauseStart = 0;
    if (diff < 0) return;
    for (const e of this.entries) {
      if (!e.obj.always && e.pauseAdded === cycle) { e.due += diff; e.pauseAdded = 0; }
    }
  }

  // Called once per frame with the wall-clock time.
  activate(now: number): void {
    if (this.pauseDepth > 0) {
      // Paused: only due 'always' entries run; the rest stay queued.
      for (let i = 0; i < this.entries.length; ) {
        const e = this.entries[i];
        if (e.due > now) break;
        if (e.obj.always) { this.entries.splice(i, 1); e.obj.onDue(now, e.data); }
        else i++;
      }
      return;
    }
    // Drain every due entry from the head; re-check the head after each handler call.
    while (this.entries.length > 0 && this.entries[0].due <= now) {
      const e = this.entries.shift()!;
      e.obj.onDue(now, e.data);
    }
  }
}
```

Typecheck: `work/exult-tqueue.ts` (this block plus `export {};`) passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/tick.ts` (proposed new module for the engine's fixed-step timer; the file does not exist in what I checked, and I did not check the repo). Parity-checklist row 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). The queue is the timer part of that sub-line. Input intake is row 5, not covered here.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: one scheduler for every timed event); rules 7-9 n/a

Best transferable idea: one sorted queue of due events drained once per fixed engine tick, with a counted pause that pushes back only the events queued during that pause.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism and was not translated line by line.
- Wall clock, not a fixed step: the donor passes `SDL_GetTicks()` into `activate` (`exult.cc:1365`, `1391`) and runs the queue once per loop iteration, so when an event runs depends on frame timing. Frankendom's server outcomes (server-verified kills) need a fixed tick. Do not copy the clock source; drive `activate` from a fixed step counter.
- Burst after resume (by reading, not run): entries queued before a pause are not pushed by `resume` (`tqueue.cc:304`), so one that falls due during a long pause runs at the first drain after resume. Frankendom must pick one rule for entries that cross a pause and test it.
- No per-tick budget: one `activate` call drains every due entry (`tqueue.cc:221-224`). Frankendom's sub-line requires a per-tick NPC budget. A queue that drains freely would turn a resume burst into a single long frame.
- No netcode at all: Exult is single-player. There is no input intake ordering, no sync, no lag compensation and no rollback here. Those must come from elsewhere (row 5 for intake).
- Client frame code: `Delay()` and the frame loop are client code. Under the rule that the Pit is a client, the server tick must not use them.
- `handle_event` receives the frame time, not the due time (`tqueue.cc:221`). Whether a handler should use its own schedule instead is (not read). Frankendom's duel step should use the tick number, not wall time.
- MAX_ATTACKERS = 3: the queue carries no target state, so many-on-one logic (hate list, target choice) does not belong here. It stays in the engine.
