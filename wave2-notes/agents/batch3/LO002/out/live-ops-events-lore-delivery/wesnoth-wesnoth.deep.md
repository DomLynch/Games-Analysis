# wesnoth-wesnoth (live-ops-events-lore-delivery, cell 1)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/tod_manager.cpp` (also `src/play_controller.cpp`, `src/time_of_day.cpp`, `src/utils/math.hpp`) | Licence: GPL-2.0-or-later (per `src/time_of_day.cpp` header lines 8-9: "either version 2 of the License, or (at your option) any later version."; `COPYING` is the GPL v2 text) | C++ | symbols `tod_manager::calculate_time_index_at_turn`, `tod_manager::get_illuminated_time_of_day`, the turn-start block in `play_controller`, `tod_manager::next_turn`

Checked: Read in full: `tod_manager.cpp` 214-279 (illumination), 526-541 (index and modulo), 442-451 (phase lookup), 579-584 (next turn and latch reset); `play_controller.cpp` 500-523 (turn-start events); `utils/math.hpp` 46-53 and 60. Read in part: `tod_manager.cpp` 41-63 (constructor), 156 (previous phase), 591-620 (liminal fallback). Confidence high for the phase index and the once-per-turn latch. Medium-high for the illumination rule (the unit ability composite value `get_composite_value()` was not read, so the sketch takes a raw delta). NOT read: the one-off `[event]` scripting in `src/game_events/` (`pump.cpp`, `handlers.cpp`, `manager.cpp`) and the `invasion`/reinforcement macros in `data/core/macros`; so this note covers the scheduled clock and turn events only, not invasions. camera_scope: not applicable.

## 1. Mechanism

- A scheduled clock, read from data. The scenario supplies an ordered list of phases, one `[time]` child each (time_of_day.cpp:72). The phase for a turn is `modulo(currentIndex + turn - currentTurn, N)` (tod_manager.cpp:541), where `N` is the list length and the modulo returns a value in `[0, N)` (math.hpp:60). So the list wraps forever with no stored timetable. Current phase = the turn-index with `turn == currentTurn`, which is just `currentIndex` (`get_time_of_day` sets `n_turn = turn_` at 190-191 and calls `get_time_of_day_turn` at 202; that calls the index function at 449). Previous phase uses `turn_ - 1` (tod_manager.cpp:156).
- Order of steps for one tile's light (`get_illuminated_time_of_day`, tod_manager.cpp:214-279): (a) start from the phase's `lawful_bonus`; (b) the terrain's light modifier, evaluated with the phase's bonus, gives `terrain_light` (222); (c) for each unit with an `illuminates` ability within its radius (default 1 hex, `all_map` = unlimited; 237-238), record the source's modifier, the highest `max_value` and lowest `min_value`, and track the most positive (`most_add`) and most negative (`most_sub`) modifier (227-251, one pass); (d) the net direction is `net_darker = most_add < -most_sub` (257); the base is `terrain_light + (net_darker ? most_add : most_sub)` (261); (e) each source gives `bounded_add(base, mod, max, min)` (264), and the most extreme result in the chosen direction wins (265-271); (f) the result is written back as `lawful_bonus` and the difference as `bonus_modified` (274-275).
- The bounded add (math.hpp:46-53): a positive modifier can raise the value only up to `max(base, max_sum)`, a negative one can lower it only down to `min(base, min_sum)`. A source can never pull a tile back past a cap that the tile already exceeds.
- Turn events, once per turn. At the start of a side's turn (play_controller.cpp:507-519): the `turn_N` and `new_turn` events fire only if the latch `has_turn_event_fired` is clear (513-515), and the latch is then set (516). The side events `side_turn`, `side_N_turn`, `side_turn_T` and `side_N_turn_T` fire for every side after that block (519-522). The latch is cleared in `tod_manager::next_turn` (579-584) after the turn number goes up (581-582).
- Tick: turn-based. The turn number is the tick; there is no per-frame loop for the clock that I read. `get_illuminated_time_of_day` computes one tile's light when called; its callers were not read, so I do not claim how often it runs.

## 2. Key functions

- `tod_manager::calculate_time_index_at_turn`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/tod_manager.cpp` 535-542 (index = modulo of current index + turns elapsed).
- `tod_manager::fix_time_index`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/tod_manager.cpp` 526-533 (wraps a stored index into the list).
- `tod_manager::get_time_of_day_turn`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/tod_manager.cpp` 442-451.
- `tod_manager::get_illuminated_time_of_day`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/tod_manager.cpp` 214-279 (phase, then unit illumination, net direction, bounded result).
- `bounded_add`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/utils/math.hpp` 46-53.
- Turn-start event block: `/mnt/frankendom-donors/wesnoth-wesnoth/src/play_controller.cpp` 507-522 (once-per-turn latch, then per-side events).
- `tod_manager::next_turn`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/tod_manager.cpp` 579-584 (advance turn, clear latch).

## 3. Numbers vs mechanism

TABLE (formula | donor numbers and ranges | file:line)

| Reusable algorithm (formula) | Donor numbers and ranges | file:line |
|---|---|---|
| Phase index = modulo(currentIndex + (turn - currentTurn), N); N = 0 returns 0 | N = number of `[time]` children (no cap in code); result in [0, N) | tod_manager.cpp:541, 532; math.hpp:60 |
| Current phase uses turn = currentTurn, so index = currentIndex; previous phase uses turn - 1 | none (offset of 1 turn) | tod_manager.cpp:190-191, 202, 449; 156 |
| Start phase default | `current_time` default 0 | tod_manager.cpp:63 |
| Liminal bonus fallback = max(25, best over schedule) | floor 25 | tod_manager.cpp:55 |
| Illuminator reaches a tile if hex distance <= radius; default radius 1; `all_map` = unlimited | radius 1 (default), INT_MAX for `all_map` | tod_manager.cpp:237, 238 |
| Net direction: darker if mostAdd < -mostSub; base = terrain + dominant push | sign rule only, no number | tod_manager.cpp:257, 261 |
| Source result bounded: positive capped at max(base, maxSum), negative floored at min(base, minSum) | per-ability `max_value` / `min_value` (unit data) | math.hpp:49, 51; tod_manager.cpp:264 |
| Write-back: lawful_bonus = best, bonus_modified = best - original | none | tod_manager.cpp:274-275 |
| Turn latch: turn_N and new_turn fire at most once per turn; latch cleared in next_turn | count 1 per turn | play_controller.cpp:513-516; tod_manager.cpp:581-582 |
| Side events fire for every side after the latch block | side_turn, side_N_turn, side_turn_T, side_N_turn_T | play_controller.cpp:519-522 |
| Phase list comes from scenario data, not code | `[time]` children; lawful_bonus per phase is data | time_of_day.cpp:72 |

The only game constant in code is the liminal floor 25. The phase values (lawful_bonus) and the schedule length are scenario data, which fits "zones as data".

## 4. TypeScript sketch

simplified: keeps the modulo phase index, the illumination rule (net direction, per-source bound, most extreme result in that direction) and the once-per-turn latch with the per-side order. It omits: per-area schedules (time areas with their own current time), the liminal bonus fallback (floor 25), the composite ability value (the sketch takes a raw delta where the donor uses `get_composite_value()`, not read), the `side_turn_N` and `side_N_turn_T` events, the healing and income that follow the events, and the `bonus_modified` bookkeeping. The sketch uses the donor's turn anchor (`currentTurn`).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Phases come from zone data (donor: the [time] children of a scenario).
interface Phase { id: string; lightBonus: number; }

// Phase index for a turn: wraps around the schedule, anchored to the current turn.
function phaseIndex(n: number, currentIndex: number, currentTurn: number, turn: number): number {
  if (n === 0) return 0;
  return (((currentIndex + turn - currentTurn) % n) + n) % n;
}

function boundedAdd(base: number, inc: number, maxSum: number, minSum = 0): number {
  if (inc >= 0) return Math.min(base + inc, Math.max(base, maxSum));
  return Math.max(base + inc, Math.min(base, minSum));
}

interface Illuminator { distance: number; radius: number; delta: number; min: number; max: number; }

// Light at one tile: terrain light plus nearby sources. The larger total push sets the direction;
// each source is bounded by its own min and max; the most extreme result in that direction wins.
function tileLight(terrainLight: number, sources: Illuminator[]): number {
  const inRange = sources.filter(s => s.distance <= s.radius);
  let mostAdd = 0;
  let mostSub = 0;
  for (const s of inRange) {
    if (s.delta > mostAdd) mostAdd = s.delta;
    else if (s.delta < mostSub) mostSub = s.delta;
  }
  const netDarker = mostAdd < -mostSub;
  const base = terrainLight + (netDarker ? mostAdd : mostSub);
  let best = terrainLight;
  for (const s of inRange) {
    const r = boundedAdd(base, s.delta, s.max, s.min);
    if (netDarker ? r < best : r > best) best = r;
  }
  return best;
}

// Once per turn: turn events fire on the first side that starts the turn; side events fire for every side.
class TurnClock {
  private latched = false;
  constructor(public turn: number) {}

  startSide(sideId: string, fire: (name: string) => void): void {
    if (!this.latched) {
      fire(`turn_${this.turn}`);
      fire("new_turn");
      this.latched = true;
    }
    fire("side_turn");
    fire(`side_${sideId}_turn`);
  }

  advance(): void {
    this.turn += 1;
    this.latched = false;
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-clock.ts` (new): a zone's phase clock and event latch, server-side. Phases are zone data; the phase is read from the server, never the client. Parity-checklist row 23 (zone population: scheduled zone state as zone data). Server tick sub-line for the latch: "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime; server-verified state (the phase and the latch are server values); client-only camera, HUD and sound are not touched.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Turn-based donor; Frankendom is real time. Map the turn to server time: phase = floor(serverSeconds / phaseSeconds) mod N, with phaseSeconds and N as zone data. The modulo and the latch carry over; the turn counter does not.
- In the donor, light changes the combat bonus (`lawful_bonus` feeds combat). If Frankendom copies that, the phase or light value becomes a fight rule and must be computed by the server engine, not in the client. Decide that ruling before adopting the illumination rule. Otherwise keep the light as a colour grade only (row 16, client).
- Illumination sources are units with an ability. Frankendom sources should be zone entities (braziers, totems) in zone data, not hero units, so the one-ledger rule holds.
- The once-per-turn latch is in memory in the donor. Frankendom's latch must be stored with the zone state so a server restart does not fire an event twice or skip one.
- Invasions and one-off `[event]` scripting were not read (`src/game_events/` not opened). Do not claim invasion logic from this note.
- Per-area schedules (time areas) were seen in the code (`tod_manager.cpp` area functions, 302-412) but not read in full; the sketch leaves them out.

Decision (proposed): adapt — keep the modulo phase clock and the once-per-tick latch, key them to server seconds, store the phase list as zone data, and keep light out of combat until a ruling says otherwise.
Acceptance: a server test with a 3-phase zone schedule asserts the phase at tick T equals phases[(start + elapsed) mod 3] across two full cycles, and a zone event fires once when two players trigger the same tick.
Best transferable idea: a zone's day/night and event schedule is a list of data phases indexed by modulo of elapsed server time, with a once-per-tick latch so an event fires once no matter how many players cause the tick.
