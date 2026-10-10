# gemrb-gemrb (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Interface.cpp` (loop `Interface::GameLoop` and `Interface::Main`), with `GlobalTimer.cpp` (`GlobalTimer::Update`), `Map.cpp` (`Map::UpdateScripts`) and `Scriptable/Scriptable.cpp` (`Scriptable::Update`, `Scriptable::TickScripting`) | Licence: GPL-2.0-or-later (SPDX header in the source files, e.g. `ProjectileServer.cpp` line 3; `COPYING` is the GPL v2 text) | C++ | symbol `Interface::GameLoop`

Checked: Opened and read in full the tick path: Interface.cpp 476-478, 1055-1062, 1894-1912, 2468-2476; GlobalTimer.cpp 108-189; Game.cpp 1599-1613; Map.cpp 424-575 and 2435-2470; Scriptable/Scriptable.cpp 161-270; Interface.h 101. Hint file `ProjectileServer.cpp` opened: it is the projectile factory and has no tick (no `Update` in it). Candidates checked for the tick: Interface.cpp, GlobalTimer.cpp, Game.cpp, Map.cpp, Scriptable.cpp, Scriptable.h. Not read: the body of `Game::Update()` (the global script step, Game.cpp ~1601), `TickScripting` after line 270 (script execution), the path worker threads in `PathFinderScheduler` (header comments only), `DoStepForActor`. Confidence: high on the tick cadence and the stagger; high on the actor loop order. This is single-player: no netcode is present. camera_scope: n/a (not a camera cell).

Best transferable idea: One engine tick that gives every per-object AI check a fixed 16-bucket stagger keyed by a stable id, so a crowd budget is a count of evaluations per tick.
Decision (proposed): adapt - take the stagger and the idle/trigger gates for crowd NPCs in zones, but reject GemRB's wall-clock tick: our server needs a fixed-step accumulator, the tick rate must not come from a client frame cap, and engaged attackers (MAX_ATTACKERS = 3) must never wait for a bucket.
Acceptance: A server test feeds a 100 ms stall into the tick clock and asserts the duel step runs once per 1000/15 ms of simulated time (no lost or doubled steps), and with 200 idle neutral NPCs in a zone only about N/16 (about 13) evaluate on any tick while the 3 engaged attackers evaluate on every tick.

## 1. Mechanism

- Tick source. The `Interface::Main` loop runs timers, input and GUI on every pass, then calls `GameLoop()` only when `time - lastGameUpdate >= oneTick` (Interface.cpp 1055-1058), where `oneTick = 1000 / Time.ticksPerSec` (1055). `Time.ticksPerSec` is set from the "Maximum Frame Rate" variable (default 30) divided by two (476, 478), so the default is 15 ticks per second. `defaultTicksPerSec = 15` (Interface.h 101) is the in-game clock base used for hour and millisecond conversions, not the tick rate.
- No catch-up. When the gate passes, `lastGameUpdate = time` (1062). The next tick is measured from when this one ran. A late frame shifts the schedule; the missed steps are not replayed. One `GameLoop()` is one game step however many intervals were missed.
- GameLoop (1894-1912). `GSUpdate(update_scripts)` (1903) calls `GlobalTimer::Update()` (2471) unless a dialogue has frozen scripts (then `timer.Freeze()` only moves the viewport and the real-time counter, not game time). If the timer returns true and a game exists, `game->UpdateScripts()` runs (1912).
- GlobalTimer gate (108-120). `advance = thisTime - startTime`; it returns false until `advance >= interval`, where `interval = 1000 / ticksPerSec` (111-113). `count = advance / interval` (116) feeds the viewport pan and the fade steps only.
- GlobalTimer::Update (122-189). After the gate, if the screen is fading or shaking (157), it updates fog and projectiles and returns early (163) without reaching `startTime = thisTime` (189), so the next pass sees all the elapsed time. Otherwise it runs `UpdateFog`, `UpdateEffects`, `UpdateProjectiles`, then `game->AdvanceTime(1)` once (175), then banter and bored checks. Game time moves exactly one step per passed tick.
- Game::UpdateScripts (1599-1613). Runs the global script `Update()` (1601), drains completed path results (1608), then calls `UpdateScripts()` on every map (1613). The rest of the function (music, combat counter) was not read.
- Map::UpdateScripts (424-575). Rebuilds the priority queues every tick (`GenerateQueues`, 2435) and sorts each queue by screen y, descending (`SortQueues`, 2463; comparator 2467). If there are no party members and the map is not a master area it returns (no run). If party members exist it runs the map script (`Update()`, 463), otherwise `ProcessActions()` (465). The actor run loop (483-560) walks the RunScripts queue from the back. It skips actors that moved to another area, and skips time-stopped actors (492). Each actor gets `actor->Update()` (526) and `UpdateActorState()` (527), then a movement step (546, 559). All actors read one stamp: `ieDword time = game->Ticks;` (480).
- Per-object stagger (Scriptable::Update 161-182). Each object increments its tick counters, then calls `TickScripting()` (180), then `ProcessActions()` (182). The second call runs every tick, not staggered. `TickScripting` (187) returns unless `Ticks % 16 == globalID % 16` (191); `globalID` comes from a creation counter (Scriptable.cpp 45). The area script is the one exception (`Type != ST_AREA || Ticks > 1`).
- Gates inside TickScripting, in order: a really-dead actor that has not just died is skipped (202-203); `needsUpdate = !CurrentAction || TriggerCountdown > 0 || IdleTicks > 15` (211); a forced-update flag (215) and an on-screen, explored actor (237) also set it; hibernation (243-252): a neutral actor (EA between `EA_CONTROLLABLE` and `EA_EVILCUTOFF`) that is unexplored or outside the viewport returns, unless it has the force flag or the START_ACTIVE feature is set; charmed actors with `IdleTicks < 5` are not updated (255); if not needed, `IdleTicks++` and return (259-261); otherwise a trigger sets `TriggerCountdown = 5` (264-265) and `IdleTicks = 0` (267).

## 2. Key functions

- `Interface::GameLoop`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Interface.cpp` 1894-1912 (dialogue freeze, timer gate, game script update).
- Main loop gate: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Interface.cpp` 1055-1062 (`oneTick`, `doGameStateUpdate`, `lastGameUpdate = time`).
- `GlobalTimer::UpdateViewport` and `GlobalTimer::Update`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/GlobalTimer.cpp` 108-120 and 122-189.
- `Map::UpdateScripts`, `Map::GenerateQueues`, `Map::SortQueues`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Map.cpp` 424-575 and 2435-2470.
- `Scriptable::Update` and `Scriptable::TickScripting`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Scriptable.cpp` 161-270.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-rate gate on wall clock; next tick measured from the last tick (no catch-up) | Tick rate = frame cap / 2; default 30 / 2 = 15 ticks per second (theirs, Interface.cpp 476-478) |
| Per-object step spread over N buckets by a stable id | 16 buckets (theirs, Scriptable.cpp 191) |
| Force an update after N quiet ticks | 15 idle ticks (theirs, Scriptable.cpp 211) |
| Keep evaluating for N ticks after an event | 5 ticks (theirs, Scriptable.cpp 265) |
| Slow update for a controlled (charmed) object | Update when idle count reaches 5 (theirs, Scriptable.cpp 255) |
| Skip full AI for off-screen or unexplored neutrals | Rule only, no number (theirs, Scriptable.cpp 243-252) |
| Advance the world clock one step per passed tick | 1 step (theirs, GlobalTimer.cpp 175) |
| Order per-tick work by screen y | Descending y (theirs, Map.cpp 2467) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the stagger (bucket test first), the hibernation test, then the busy/trigger/idle test. It adds one change that is ours, not the donor's: `engaged` entities are exempt from the stagger and from hibernation. It omits the donor's trigger list (the countdown is set elsewhere), the explored-fog and viewport test, the charmed gate, the dead-actor one-shot, the priority queues and y-sort, the time-stop skip, the dialogue freeze, and the GlobalTimer fade and shake branches. The fixed-rate gate is shown as the donor's wall-clock check, which we would replace with an accumulator on the server.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const TICK_STAGGER = 16;     // each object evaluates its script step once per 16 ticks, offset by its id
export const IDLE_FORCE_TICKS = 15; // an idle object is forced to evaluate after more than 15 quiet ticks
export const TRIGGER_COUNTDOWN = 5; // after a trigger, evaluate for 5 more ticks

export interface Entity {
  id: number;             // stable id, used for the stagger bucket
  busy: boolean;          // has an action running
  engaged: boolean;       // in the fight: adaptation, never staggered or hibernated
  hibernating: boolean;   // off-screen neutral: skip the full AI step
  triggerCountdown: number;
  idleTicks: number;
}

// Wall-clock gate. Fires when at least one tick interval has passed since the last tick.
// The caller stores the time of THIS tick as the new reference, so lateness is not made up later.
export function tickDue(nowMs: number, lastTickMs: number, tickMs: number): boolean {
  return nowMs - lastTickMs >= tickMs;
}

// Decide whether one entity runs its AI step on this tick.
export function shouldEvaluate(e: Entity, tick: number): boolean {
  if (e.engaged) return true;                                    // adaptation: fight entities are not staggered
  if (tick % TICK_STAGGER !== e.id % TICK_STAGGER) return false; // stagger bucket
  if (e.hibernating) return false;                               // off-screen neutral: no full AI
  const needs = !e.busy || e.triggerCountdown > 0 || e.idleTicks > IDLE_FORCE_TICKS;
  if (!needs) {
    e.idleTicks++;
    return false;
  }
  e.idleTicks = 0;
  if (e.triggerCountdown > 0) e.triggerCountdown--;
  return true;
}
export {};
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module): the one server tick for the fight, a fixed-step accumulator with a clamp, and the per-tick evaluation count. The Pit and zones are clients of it.
- Parity-checklist row 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). Zone NPC density stays with row 23 in `origins/server/world-spawns.ts`, not here.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, one tick loop for every zone); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not the donor lines.
- Wall-clock gate with no catch-up (Interface.cpp 1056, 1062): a slow frame makes the world run slower and never replays the missed steps. Frankendom's server must use a fixed-step accumulator so damage and kill order do not depend on frame timing. Reject this part.
- Tick rate comes from the client's "Maximum Frame Rate" / 2 (Interface.cpp 476-478), so game speed follows a display setting. Reject for Frankendom: the server tick is an engine constant, never a client option.
- Fade and shake early return (GlobalTimer.cpp 157-163, with `startTime` reset only at 189): the next pass moves the viewport by the whole elapsed count but advances game time once. This is a pan catch-up, not a clock catch-up. Do not copy it on the server, where steps must never bunch.
- The stagger (Scriptable.cpp 191) is a fixed bucket count, not a measured time budget. An NPC can wait up to 15 ticks (about 1 s at the default 15 per second) between AI steps. For MAX_ATTACKERS = 3 fights that would delay target choice, so the `engaged` exemption in the sketch is our change, not the donor's.
- Single-player only: there is no server or client split, no input intake and no lag or rollback in this code. Nothing transfers for the intake sub-line of row 18.
- Not read: the body of `Game::Update()`, the script execution after `TickScripting` line 270, the `PathFinderScheduler` worker threads (header comments only), and `DoStepForActor`.
- Actor order is by screen y (Map.cpp 2467). That is a draw-order rule, not a fairness rule. Frankendom should order attack resolution by the ledger, not by position.
