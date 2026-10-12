# widelands-widelands (quests-dialogue, cell 12)
Donor: /mnt/frankendom-donors/widelands-widelands/data/campaigns/atl01.wmf/scripting/mission_thread.lua (quest threads) + /mnt/frankendom-donors/widelands-widelands/data/scripting/coroutine.lua + /mnt/frankendom-donors/widelands-widelands/src/commands/cmd_luacoroutine.cc (scheduler) | Licence: GPL-2.0 (COPYING line 2: "Version 2, June 1991"; engine source headers say "any later version") -> copyleft, clean-room, shape only | Lua + C++ | symbol run / sleep / set_objective_done
Checked: camera_scope not applicable (quests). Read in full: mission_thread.lua (297 lines), data/scripting/coroutine.lua (77 lines), src/commands/cmd_luacoroutine.cc (execute, 37-45). Read in part: data/scripting/messages.lua (259-263 add_campaign_objective, 333-349 set_objective_done), data/scripting/objective_utils.lua (55-75 check_for_buildings), src/scripting/lua_root.cc (launch_coroutine body near 445-460), src/logic/game.cc (call sites 434 and 1915 only). Not read: how the game command queue dispatches a queued command at its time (only the enqueue and the re-enqueue were read), data/campaigns/atl01.wmf/scripting/init.lua msg_boxes (only its definition line 42 seen by grep), save_campaign_data persistence, the objectives dialog. Confidence: high on the parked-thread scheduler and the gates; medium on exact tick timing (queue dispatch not read). Depth: full.

## 1. Mechanism
A quest is a chain of coroutines. `run(fn)` starts a function as a coroutine; each `sleep(ms)` yields the absolute game time at which it wakes (coroutine.lua:58-59), and the engine re-queues the coroutine at that time (cmd_luacoroutine.cc:39-42). Each objective step is a poll gate: `while not check_for_buildings(p1, {...}) do sleep(N) end` (mission_thread.lua:36-39, 62-67). The objective is added when the thread reaches the step (line 62), and set_objective_done sleeps 3000 ms by default before it sets objective.done = true (messages.lua:343-349). Start points: the bottom run() calls (293-297) start intro (which calls build_environment, line 31), leftover_buildings, build_warehouse_and_horsefarm and water_rising; the rest are started from each other (make_spidercloth_production at 198, build_food_environment at 201, build_heavy_industrys_and_mining at 144 after 10 minutes, build_barracks at 119, build_training at 136). Thread bodies, in file order: horsefarm and warehouse (lines 34-80), training (82-93), toolsmith hint (95-100), heavy industry and mining (102-120), barracks (122-137), food (139-162), spidercloth (164-180), base build (182-202), leftover buildings (204-235, a set of fields and a message list, both consumed one by one, polled every 3000 ms at line 233), ship gate (237-253), and the flood (256-291). The victory thread polls until p1 has three ships (239-240), saves the ship names through save_campaign_data for the next scenario (244-248), then marks the scenario solved (252). Each polling gate uses its own interval (2323 to 8234 ms). The story is delivered with msg_boxes between gates (e.g. line 61) and long fixed waits between stages (sleep(15 * 60 * 1000) at 135 and 200; sleep(10 * 60 * 1000) at 143).

## 2. Key functions
- run(func, ...) (coroutine.lua:36-46): creates the coroutine, resumes it once, and hands it to the engine with the first sleep time (wl.Game():launch_coroutine(c, sleeptime), line 41). Callers: mission_thread.lua 293-297 and inside other threads (104, 119, 136, 198, 201).
- sleep(time) (coroutine.lua:58-60): yields wl.Game().time + time. Only valid inside a coroutine (per its own comment).
- CmdLuaCoroutine::execute (cmd_luacoroutine.cc:37-45): resumes the coroutine (39), pops the sleep time (40), and if still YIELDED re-enqueues it at that time (42). If DONE it releases the coroutine. Callers: the engine's queued-command path (game.cc, LuaGame::launch_coroutine in lua_root.cc) (only the enqueue sites were read).
- add_campaign_objective (messages.lua:259-266): calls players[1]:add_objective with the objective name, title and body.
- set_objective_done (messages.lua:343-349): sleeps then sets done. Caller in the same coroutine, so the thread itself pauses.
- check_for_buildings (objective_utils.lua:61-67): returns false as soon as one house type is below its required count (line 65); region variant not read.

## 3. Numbers vs mechanism
- Gate poll intervals (ms, game time): 2500 (line 39), 2384 (66), 3874 (89), 3478 (98, 116), 3784 (129), 2789 (158), 2323 (165), 6273 (175), 3731 (195), 3243 (258), 8234 (240), 3000 (233 leftover loop). They differ per gate. The code does not say why; any reason would be inference.
- Done pause: 3000 ms default (messages.lua:345). Ship gate: three ships (239).
- Stage waits: 60 s (132), 15 min (135, 200), 10 min (143). Intro sleep 1000 ms (intro, line 24).
- Scheduler: resumes happen at absolute game time, so the gate interval is game time and is not tied to frames.

## 4. TypeScript sketch
simplified: Lua coroutines become an explicit step list driven by the server tick; the objective is listed as done when its gate passes (the donor lists it when the thread reaches the step, before the gate); message boxes, the water rise and the leftover-building watcher are omitted; the donor's per-gate intervals are passed in, not hard-coded. The 3000 ms done pause is kept as a step field.
```ts
// Parked quest steps: a gate is polled at a fixed game-time interval, then a pause, then the objective is marked done.
// Clean-room shape of Widelands mission_thread.lua, coroutine.lua and messages.lua set_objective_done, in Frankendom terms.
// simplified: Lua coroutines become an explicit step list driven by the server tick; the objective is listed as
// done when its gate passes (the donor lists it when the thread reaches the step, before the gate); message boxes,
// the water rise and the leftover-building watcher are omitted; the donor's per-gate intervals are passed in, not hard-coded.
export interface Gate {
  check(): boolean;
  pollMs: number; // poll interval in game time, like sleep(2500) inside a while loop
}

export interface Step {
  objective?: string;
  gate: Gate;
  donePauseMs: number; // like set_objective_done's sleep, default 3000 in the donor
}

export interface Parked {
  step: number;
  wakeAt: number; // absolute game time in ms, like coroutine.yield(wl.Game().time + time)
  pendingDone: boolean; // gate passed; the donor sleeps before objective.done = true
  done: string[];
}

// Advance one parked quest at game time `now` (ms). Deterministic: no frame counts.
export function tickQuest(q: Parked, steps: Step[], now: number): Parked {
  if (q.step >= steps.length || now < q.wakeAt) return q;
  const s = steps[q.step];
  if (q.pendingDone) {
    const done = s.objective ? [...q.done, s.objective] : q.done;
    return { step: q.step + 1, wakeAt: now, pendingDone: false, done };
  }
  if (!s.gate.check()) {
    return { ...q, wakeAt: now + s.gate.pollMs };
  }
  return { ...q, wakeAt: now + s.donePauseMs, pendingDone: true };
}

export {};
```
Typecheck: /tmp/QD020-widelands-parked-steps.ts on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in
origins/quests/parked-steps.ts (proposed new module; quest steps as declarative data run by the server tick) | parity row 18 (quest reward and completion are part of the loot and XP award path; the step that completes an objective is where the award is written to the one ledger). The poll intervals are the per-step data.

## 6. Gaps and risks
- Lua code in zone data: the donor's quest is Lua per scenario. Our one-engine and zones-as-data rulings mean the step list must be declarative data, not script code.
- Game time, not frames: the donor polls on game time. Frankendom's server tick should own the clock; a client clock must never decide a gate.
- Server-verified state: the gates read building or ware counts from the engine. For Frankendom the gate inputs (kills, pickups, arrivals) must come from server-verified events, not client state.
- Pause inside the thread: set_objective_done holds the whole thread for 3 s, so the next gate cannot be checked during that pause. The donor does this; our version keeps the pause as a field, so a zone can set it to 0.
- No one ledger yet: the donor persists ship names as campaign data (line 248). Frankendom's one ledger should hold that state, not a side file.
- MAX_ATTACKERS = 3: no direct link; the ship gate's count of three is a quest count, not an attacker cap.
- Pit as client: the message boxes and the water rise are client presentation; the step list and the gates stay server side.

Reuse tag: new for Frankendom (the Frankendom repo was not searched by this reader; reuse-first not checked).
Brief rule served: judge the idea, not the genre (addendum rule 2): a parked quest that wakes on game time and re-polls a state gate is a checkable mechanism, and it is written as a short, testable state machine here.
Best transferable idea: quest steps are parked waits on game time that re-poll a state gate and add a short completion pause, so the whole quest is a list of gates the server tick can advance deterministically.
Decision (proposed): adapt - keep the parked, game-time gate shape and the completion pause, but as declarative zone data run by the server tick rather than Lua coroutines in scenario files; the donor's Lua is code in data files, which conflicts with zones as data.
Acceptance: a test with a fake clock shows a step's gate is not checked before its wake time, the objective is marked done only after the pause, and the step advances exactly once when the third ship exists.
