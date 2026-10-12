# crawl-crawl (live-ops-events-lore-delivery, cell 2)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/timed-effects.cc` (also `dgn-event.cc`, `dgn-event.h`, `files.cc`, `god-abil.cc`, `mapmark.cc`, `player-act.cc`) | Licence: GPL-2.0-or-later (`/mnt/frankendom-donors/crawl-crawl/LICENSE`: "either version 2 of the License, or (at your option) any later version"; the LICENSE also lists some GPL-compatible pieces under other licences, none of the files read) | C++ | symbols `update_level`, `run_environment_effects`, `dgn_event_dispatcher::fire_event`, `dgn_event_dispatcher::fire_position_event`, `_run_time_step`, `simulate_time_passing`

Checked: Read in full: `timed-effects.cc` 619-656 (level catch-up), 1073-1086 (per-turn environment step, part); `dgn-event.cc` 1-181 (bus); `dgn-event.h` 1-136 (enum and structs); `god-abil.cc` 2064-2084 and 7450-7470 (step loop and catch-up entry). Read in part: `files.cc` 2258-2280 (the caller on level re-entry), `mapmark.cc` 380-402 (Lua veto), `l-dgn.cc` 825-842 (registration), `player-act.cc` 100. Callers of `update_level`: `files.cc:2275` and `god-abil.cc:2173` (both read). The vetoable dispatch has no caller in the `.cc` files I searched. NOT read: the bodies of `handle_monsters`, `manage_clouds`, `rot_corpses`, `shoals_apply_tides`, `timeout_terrain_changes`, `update_monster`, `env.markers.run_all`; the value of `you.time_taken` during a catch-up (it gates the per-step turn event, `timed-effects.cc:1076`). Lore text itself (the Lua vault scripts) was not read. Confidence: high for the catch-up arithmetic (three lines, worked examples below) and for the bus; medium for the live part (the step loop is read, what each step does for monsters is not). camera_scope: not applicable.

## 1. Mechanism

- Time unit: 10 ticks per normal turn. `run_environment_effects` divides by 10 for its per-turn chance (`timed-effects.cc:1083`) and returns early when no time was taken (1076).
- Catch-up on level re-entry. When a level that was left is entered again, `files.cc:2272-2275` calls `update_level(you.elapsed_time - env.elapsed_time)`. Order of steps inside `update_level` (`timed-effects.cc:619-653`):
  (a) cap the live part: `sim_turns = min(10, E / 10)` (625), where E is the absence in ticks;
  (b) remainder: `E -= sim_turns * 10` (626);
  (c) quick turns: `quick_turns = (E - sim_turns * 10) / 10` (627). This is the defect (section 6): it subtracts the live part a second time;
  (d) live part: `simulate_time_passing(sim_turns)` (632). That sets `DUR_TIME_STEP = turns` and `doing_monster_catchup = true` (`god-abil.cc:7465-7466`), then runs `_run_time_step` once. That function does `do { run_environment_effects(); handle_monsters(); manage_clouds(); clear_monster_flags(); } while (--DUR_TIME_STEP > 0);` (`god-abil.cc:2068-2079`), so the live part is `sim_turns` full steps of environment, monster AI and clouds;
  (e) timers on the remainder: corpses (635), level markers `env.markers.run_all(E)` (637), terrain timers (638), sanctuary (640-646: removed when `quick_turns >= env.sanctuary_time`, else `sanctuary_time -= quick_turns`), and each monster `update_monster(mon, E)` (653);
  (f) the timer event: `DET_TURN_ELAPSED` with `(sim_turns + quick_turns) * 10` ticks (650).
  Order matters: the live part runs before any timer, so monster moves happen first and the cheap timers see only what is left.
- The event bus (`dgn-event.cc`, `dgn-event.h`). One dispatcher holds (i) global listeners, gated by a global mask (`fire_event`, 83-96: mask test at 85, copy of the list at 87, per-listener mask and registered check at 90-91, notify at 93), and (ii) per-square alarms, created only for squares that have listeners (`register_listener_at`, 125-139), gated by the square's mask (`fire_position_event`, 71-80: mask test at 75, copy of the alarm at 77, notify at 79). A third variant, vetoable (50-61), stops at the first listener that returns false (58-59). Position events are fired by the game: `player-act.cc:100` fires `DET_PLAYER_MOVED` for the new square; doors, items, pressure plates and monster moves fire their own position events (grep).
- Scripted listeners. `map_lua_marker::notify_dgn_event` (`mapmark.cc:382-402`) calls a Lua method with the event. Only a real boolean false vetoes (398-400). A Lua error is treated as "no veto" (392 comment; the return value is `true`). Lua registers listeners with `dgn_register_listener` (`l-dgn.cc:825-839`): a mask and an optional square.
- Tick: the turn-elapsed event is fired from `run_environment_effects` (1079) whenever time was taken (1076); how often that function is called was not read. The catch-up fires its own total in step (f). Other places that simulate a level the player is not on were not searched.

## 2. Key functions

- `update_level` (catch-up and timers): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/timed-effects.cc` 619-653 (the cap, the remainder, the quick turns, the timers, the event total).
- `run_environment_effects` (per-turn event and sound chance): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/timed-effects.cc` 1073-1086.
- `_run_time_step` (the step loop): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/god-abil.cc` 2068-2079.
- `simulate_time_passing` (catch-up entry): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/god-abil.cc` 7458-7469.
- Re-entry caller: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/files.cc` 2272-2275.
- `dgn_event_dispatcher::fire_event` (global) and `fire_position_event` (square): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dgn-event.cc` 83-96 and 71-80.
- `dgn_event_dispatcher::register_listener_at`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dgn-event.cc` 125-139.
- `map_lua_marker::notify_dgn_event` (veto rule): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mapmark.cc` 382-402.

## 3. Numbers vs mechanism

TABLE (formula | donor numbers and ranges | file:line)

| Reusable algorithm (formula) | Donor numbers and ranges | file:line |
|---|---|---|
| Live turns = min(10, floor(E / 10)), E = absence in ticks | cap 10 turns; 10 ticks per turn | timed-effects.cc:625 |
| Remainder after live part = E - live * 10 | single subtraction in the fix; the donor applies it at 626 | timed-effects.cc:626 |
| Quick turns, donor = (E - live * 10) / 10 (subtracts live part twice) | donor is short by `live` turns; negative for E < 100 (example: E = 50 gives -5) | timed-effects.cc:627 |
| Quick turns, fix = remainder / 10 | E = 300 gives 20 quick turns (donor 10); E = 1000 gives 90 (donor 80) | (fix, see sketch) |
| Live steps = live turns; each step: environment, monster AI, clouds, flag clear, repeat while counter > 0 | 0 to 10 steps | god-abil.cc:2068-2079; 7465 |
| Timers on the uncapped remainder E: corpses, markers, terrain, each monster | uses E, not quick turns | timed-effects.cc:635, 637, 638, 653 |
| Sanctuary timer: removed when quick >= timer, else timer -= quick | timer in turns; negative quick would lengthen it (as read) | timed-effects.cc:643, 646 |
| Turn-elapsed event total = (live + quick) * 10 | donor total is short by live * 10 (example: E = 300 reports 200) | timed-effects.cc:650 |
| Per-turn sound chance = 5 * time_taken / 10 per seed | base 5; 10 ticks per turn | timed-effects.cc:1073, 1083 |
| Global dispatch: mask gate, copy list, skip removed listeners | none | dgn-event.cc:85-93 |
| Square dispatch: mask gate, copy alarm, notify each | none | dgn-event.cc:71-80 |
| Veto dispatch: first false stops | none | dgn-event.cc:50-61 (58-59) |
| Lua veto: only boolean false vetoes; a Lua error does not veto | none | mapmark.cc:392, 398-400 |

Worked examples (arithmetic on the donor lines, not run): E = 300 (30 turns away). Live = 10. Donor quick = (200 - 100) / 10 = 10, timer total 200. Correct: remainder 200, quick 20, total 300. E = 50: live = 5, remainder 0, donor quick = (0 - 50) / 10 = -5, timer total 0. Correct: quick 0, total 50.

## 4. TypeScript sketch

simplified: keeps the live-turn cap, the remainder with a single subtraction (the fix), the timer total, and the bus with a copy before dispatch and a registered check. It omits: the body of the live steps (`simulate_time_passing`, `handle_monsters` and the rest are not read), the timers on the remainder (corpses, markers, terrain, sanctuary, monsters: named in section 1 only), the `you.time_taken` gate on the per-turn event, the vetoable path (no caller found), the Lua marker layer, and the square-alarm map. The sketch takes non-negative input only (the donor's C++ integer division truncates; for negative input the donor goes wrong, which is the defect).

```ts
// Licence: GPL-2.0-or-later (donor LICENSE; the files read carry no per-file licence header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Donor time units: 10 per normal turn (timed-effects.cc divides by 10 for a turn).
const TICKS_PER_TURN = 10;
// Donor cap on live simulation after a long absence.
const MAX_SIM_TURNS = 10;

interface CatchUp { simTurns: number; quickTurns: number; timerTicks: number; }

// Split an absence of `elapsed` ticks into a live part (capped) and a timers-only part.
// Fix to the donor: the simulated ticks are subtracted once, so quickTurns is the true remainder.
function splitCatchUp(elapsed: number): CatchUp {
  const simTurns = Math.min(MAX_SIM_TURNS, Math.floor(elapsed / TICKS_PER_TURN));
  const remainingTicks = elapsed - simTurns * TICKS_PER_TURN;
  const quickTurns = Math.floor(remainingTicks / TICKS_PER_TURN);
  // Timer event reports the whole turns that were covered (remainder below one turn is dropped, as in the donor).
  const timerTicks = (simTurns + quickTurns) * TICKS_PER_TURN;
  return { simTurns, quickTurns, timerTicks };
}

interface Listener { mask: number; alive: boolean; notify(ticks: number): void; }

class EventBus {
  private listeners: Listener[] = [];

  register(l: Listener): void {
    this.listeners.push(l);
  }

  // Dispatch over a copy, and skip a listener removed during the dispatch (donor: copy + registered check).
  fire(type: number, ticks: number): void {
    const copy = [...this.listeners];
    for (const l of copy) {
      if ((l.mask & type) !== 0 && l.alive) l.notify(ticks);
    }
  }
}

// Level re-entry: catch up the absence, then announce the elapsed turns on the bus.
function reenterLevel(elapsed: number, bus: EventBus, turnElapsed: number): CatchUp {
  const c = splitCatchUp(elapsed);
  bus.fire(turnElapsed, c.timerTicks);
  return c;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (existing engine logic for zone population). Catch-up on zone wake: run at most 10 live spawn-decision steps, then advance respawn and despawn-grace timers by the uncapped remainder. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Server tick sub-line: "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3); the live-step cap is a per-tick budget rule of that kind.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (cap and timers are zone data); server-verified state (the catch-up runs on the server, not the client).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect (keep the idea, fix the defect): `timed-effects.cc:627` subtracts the live part a second time. Result as read: quick turns short by the live count, and negative for absences under 100 ticks, which then reach `shoals_apply_tides(quick_turns, true)` (636) and the sanctuary timer (646, a negative quick turn would lengthen it). The timer event total (650) is short by the same amount. Fix: remainder = E - live * 10, quick = remainder / 10 (in the sketch). The arithmetic is from the three lines; I did not run the donor, and I did not read the code that handles a negative `quick_turns`.
- Live part can move monsters while the player is absent. Frankendom rule: kills are server-verified and loot is one ledger. The catch-up must not award kills, XP or loot; it may only move spawns and monsters. The donor does not say which; `handle_monsters` was not read, so this is a risk to check, not a fact about the donor.
- Frankendom needs the cap as zone data (a dungeon may want 10 live turns, a field may want 0), so the cap is not an engine constant in the table above.
- Re-entry is the trigger here. For Frankendom's zone population, the equivalent trigger is the first player entering an empty zone, and the grace timer must not double-count the same absence (see the fix above).
- The bus is in memory in the donor; the donor's comment says listeners are not saved and map markers persist on their own. Frankendom must store any pending timer in the zone's state, not in a listener.
- Lua veto: a Lua error is a silent "no veto" on a vetoable event (`mapmark.cc:392`). If Frankendom ever uses a scripted gate, a script error must fail closed (deny), not open.
- The donor's catch-up runs with `doing_monster_catchup` set, and `you.time_taken` may be zero during it; the per-step turn event depends on that (1076). Not read, so do not copy the per-step event into Frankendom without checking.

Decision (proposed): adapt — keep the capped live catch-up followed by cheap timers on the remainder, fix the double subtraction, make the cap zone data, and make sure the live part awards no kills or loot.
Acceptance: a server test leaves a zone empty for 300 ticks (30 turns), re-enters it, and asserts 10 live spawn-decision steps, respawn and despawn-grace timers advanced by 200 ticks, and a timer total of 300; a 50-tick absence gives 5 live steps and 0 quick steps; and a player entering that zone sees no burst of spawns at the door beyond the cap, with no kill or loot credit from the catch-up.
Best transferable idea: after a zone sits empty, simulate at most a capped number of live turns, then advance the cheap timers by the uncapped remainder, so a long absence costs bounded work and nothing is counted twice.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- No errors found; all cited lines and numbers verified against the donor.
- Missed: `update_level` calls `delete_all_clouds()` (timed-effects.cc 629) before `simulate_time_passing`; absent from the note's order of steps. Confirmed. Frankendom reading: area effects are cleared on catch-up, not simulated.
- Missed: the god-abil.cc:2173 caller is Chei's time-skip, `update_level(1000)` after `_run_time_step`; a second catch-up use not described. Frankendom reading: catch-up simulation has more than one trigger (return to a level, and a deliberate time-skip power). No vetoable caller was found (the note says the same).
