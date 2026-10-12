# SFTtech-openage (determinism-replay, cell 2)

Donor: `/mnt/frankendom-donors/SFTtech-openage/libopenage/event/event_loop.cpp` | Licence: GPL-3.0-or-later ("GPL3+", copying.md:3-4: "under the terms of the GNU General Public License Version 3, or ... any later version") | C++ | symbol `EventLoop::reach_time` (with `EventQueue::take_event`, `Clock::update_time`, `RNG::seed`)

Checked: opened libopenage/event/event_loop.cpp 60-212 (reach_time, execute_events, update_changes head); eventqueue.cpp 22-60 (create_event, partly), 84-130 (add_change), 164-200 (take_event, swap), 200-230 (Change ctor and Equal); eventqueue.h 24-51; eventstore.h 1-51 (full); eventstore.cpp 1-60 and 96-123; event.cpp 21-60 (hash, operator<); event.h (grep only, lines 15-42); eventhandler.h 34-44 (enum start only); time/clock.h (typedefs and members), time/clock.cpp (full, 1-129); time/time_loop.h and .cpp (full); time/time.h (full); gamestate/simulation.cpp 25-75; rng/rng.h (full); rng/rng.cpp (full, 1-223); rng/global_rng.h and .cpp (full); rng/rng_tests.cpp (grep for seed, fill, random_range, to_string); event/demo/physics.cpp and main/demo/pong/physics.cpp (grep for rng). Not read: the bodies of `predict_invoke_time`, `setup_event` and `invoke` in the handlers (content code), the body of update_changes past the DEPENDENCY branch (about line 212 onward), siphash (util/hash.h), timing::get_real_time, gamestate save code (none found by grep, not exhaustive). Confidence: high for the queue order, the reach-time loop and the clock arithmetic; medium for the change-set effect (predict bodies not read, so whether hash order changes results is not known). Not a camera cell.

## 1. Mechanism

The donor has four parts that together make simulation content a function of scheduled times, with the wall clock deciding only when events are executed.

- Clock (time, real to sim): `Clock::update_time` (clock.cpp:27-51) takes whole milliseconds since `last_check` (32), multiplies by the Q16 `speed`, and adds the result to `sim_time` (45). A single update is capped at 50 ms of real time (`max_tick_time`, 14): when more than 50 ms passed, it adds `speed * 50` to sim_time, so the cap is 50 ms of real time scaled by speed, not a flat 50 ms of sim time (37-41); the excess is dropped (the comment at 39-40 says this stops runaway time after a long stop). `TimeLoop::run` is a loop that only calls `update_time` (time_loop.cpp:21-25). `Clock::get_time` returns `sim_time / 1000` seconds (clock.cpp:57).
- Events carry a time: `EventQueue::create_event` asks the handler for the time of ONCE, REPEAT and DEPENDENCY events (eventqueue.cpp:36, via predict_invoke_time; TIME_MIN means "never", 38), and sets the reference time for DEPENDENCY_IMMEDIATELY and TRIGGER (46-48). Events live in a pairing heap ordered by `Event::operator<` (eventstore.h:25-26; event.cpp:55-56).
- Driver: `GameSimulation::run` reads the clock each pass (simulation.cpp:48) and calls `reach_time(now)` (49). `reach_time` alternates `update_changes` and `execute_events` (event_loop.cpp:93-94) and repeats while an attempt ran at least one event (`while (cnt != 0)`, line 101). `execute_events` takes the earliest event while its time is <= the bound (eventqueue.cpp:173; event_loop.cpp:128), then invokes it with the event's own time (144), not the poll time. A REPEAT event is re-enqueued at its predicted next time (150-161).
- Changes: a modification to an entity records a change. Changes sit in a double-buffered `unordered_set` (eventqueue.h:51; eventqueue.cpp:195-197; swap at event_loop.cpp:105). `update_changes` re-evaluates dependent ONCE and DEPENDENCY events from the change time (event_loop.cpp:194-212).

Result: the content of the simulation is the set of effects at their scheduled times. The wall clock changes only when those effects are run.

Seeded RNG (rng/): xorshift128+ on two 64-bit words (rng.h:13, 178). `seed(uint64)` hashes the bytes of the value with SipHash under a fixed 16-byte key into `state[0]` and `state[1]` (rng.cpp:49-67), then discards 50 outputs (70; rng.h:184). `random()` swaps the two words and steps (85-88). State serialises as two decimal words separated by a space (144-150) and round-trips through a string (rng_tests.cpp:177-179); invalid strings throw (182-185, not quoted). A default seed is wall-clock nanoseconds, XORed with the entropy device when asked for a random seed (rng.cpp:203-207, 218-219). One global RNG object is seeded once (global_rng.cpp:11, 14), and its header says to avoid it (global_rng.h:11-12). The engine core does not use it: the only callers found by grep (libopenage) are the two demo physics files (event/demo/physics.cpp:303; main/demo/pong/physics.cpp:270).

## 2. Key functions

- `EventLoop::reach_time`: `/mnt/frankendom-donors/SFTtech-openage/libopenage/event/event_loop.cpp` 71-107. Settling loop: throws when attempts > 10, so 11 attempts run before the throw.
- `EventLoop::execute_events`: same file, 110-174. Takes events up to the bound and invokes them at their own times; REPEAT re-enqueue at 150-161.
- `EventLoop::update_changes`: same file, 185-212 (head read). Re-evaluates dependent events from the change time.
- `EventQueue::take_event`: `/mnt/frankendom-donors/SFTtech-openage/libopenage/event/eventqueue.cpp` 164-182. Pops the top event only if its time <= the bound.
- `EventQueue::create_event`: same file, 22-68 (partly read). Sets event time from the handler (36-38) or the reference time (46-48).
- `Clock::update_time`: `/mnt/frankendom-donors/SFTtech-openage/libopenage/time/clock.cpp` 27-51.
- `RNG::seed(uint64)` and `RNG::seed(data,count)`: `/mnt/frankendom-donors/SFTtech-openage/libopenage/rng/rng.cpp` 49-71. `RNG::random` 85-88; `RNG::to_stream` 144-150.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (where) |
|---|---|
| Earliest-first event queue, run while time <= now | Order by time only (event.cpp:55-56); no tie-break |
| Real-time cap per clock update | 50 ms real time, sim advance = speed x 50 ms (clock.cpp:14, 37-41). Engine constant. |
| Settling attempts before giving up | max_attempts 10 (event_loop.cpp:80); the test is `attempts > max_attempts` (83), so 11 attempts run, then it throws (86-88). Engine constant. The comment at 79 says "over 9000". |
| Sim time and speed | Q16 fixed point (time.h:16; clock.h:16) |
| RNG state | two 64-bit words (rng.h:178) |
| RNG warm-up after seed | 50 outputs (rng.h:184; rng.cpp:70). Engine constant. |

Donor defects, each with the fix (keep the idea, fix the defect):
1. Equal-time events have no order: `Event::operator<` compares time only (event.cpp:55-56), so equal-time events leave the heap in an order fixed by heap shape. fix: a sequence number as the second key (the sketch does this). Grep of event/tests.cpp for "same time", "simultan", "order" and "tie" found no test.
2. Changes are processed in `unordered_set` order (event_loop.cpp:194; eventqueue.h:51). The hash combines the entity id with `std::hash<std::string>` of the handler id (event.cpp:28-29), which the standard leaves implementation-defined, so the order can differ between standard libraries. Whether the final schedule changes depends on predict_invoke_time, which is not read. fix: keep changes in (time, seq) order.
3. The equality predicate returns true as soon as the handler ids match, before the entity is compared (eventqueue.cpp:212-213). In the usual hash-set implementations it runs only when the full hashes collide (stdlib not read), so the defect is latent. fix: compare entity id and handler id together.
4. The clock truncates real time to whole milliseconds (clock.cpp:32) and then sets `last_check = now` (48) even though the remainder was not added. Arithmetic, not measured: updates every 1.5 ms each add 1 ms, so sim time runs at about 67% speed. fix: advance `last_check` by the whole milliseconds counted, or keep sub-ms remainder.
5. The settling cap throws (event_loop.cpp:86-88); nothing in `GameSimulation::run` (simulation.cpp:45-52) catches it, so one runaway chain of events stops the simulation loop. The comment at 79 says "over 9000" but the value is 10 (80). fix: count the overflow, carry unsettled changes to the next tick, log it, and fix the comment.
6. The time-loop header says it "dispatches events" (time_loop.h:31), but `run` only updates the clock (time_loop.cpp:24). fix: correct the comment, or move dispatch into the loop on purpose.
7. `seed(uint64)` hashes the in-memory bytes of the value (rng.cpp:50), so the same seed gives a different stream on a machine of the other byte order. fix: encode the seed as eight little-endian bytes before hashing.
8. `random_range` is documented as inclusive (rng.h:82) but returns `% (upper - lower) + lower` (85), so `upper` is never returned. global_rng.h:25 says [lower, upper). `upper == lower` divides by zero. No test of random_range exists (grep of rng_tests.cpp found none). fix: one contract, [lower, upper), with a guard.
9. `real()` is documented as [0, 1) (rng.h:98) but divides by `UINT64_MAX` (101). The top raw value rounds to exactly 1.0 in double. Probability about 2^-64 per draw. fix: divide by 2^64 and keep [0, 1).

## 4. TypeScript sketch

simplified: keeps the donor's queue rules (earliest time first; take only events with time <= the bound; invoke with the event's own time; REPEAT re-enqueues at the predicted time). Three deliberate differences: (a) integer milliseconds replace the Q16 fixed point; (b) equal times break by insertion sequence, which the donor lacks; (c) a repeat that does not move forward throws, which the donor does not check. Omitted: the dependency change set and its double buffer, the entity weak pointers, handler and parameter objects, the TIME_MIN sentinel (here a `null` return), the mutex, the settling loop and the logging. The sketch is the queue and the reach-time loop only.

```ts
// Licence: GPL-3.0-or-later (donor, "GPL3+"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Integer milliseconds stand in for the donor's FixedPoint<int64_t,16> time.
export type SimTime = number;

export interface SimEvent {
  time: SimTime;
  seq: number;                             // insertion order: the equal-time tie-break the donor lacks
  run: (at: SimTime) => void;              // effects use the event's own time, not the poll time
  next?: (at: SimTime) => SimTime | null;  // repeat: next time, or null to stop (donor: predict_invoke_time)
}

export class EventQueue {
  private heap: SimEvent[] = [];
  private seqCounter = 0;

  get size(): number {
    return this.heap.length;
  }

  push(time: SimTime, run: SimEvent["run"], next?: SimEvent["next"]): void {
    this.heap.push({ time, seq: this.seqCounter++, run, next });
    this.up(this.heap.length - 1);
  }

  peek(): SimEvent | undefined {
    return this.heap[0];
  }

  pop(): SimEvent | undefined {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      this.down(0);
    }
    return top;
  }

  private less(a: SimEvent, b: SimEvent): boolean {
    return a.time !== b.time ? a.time < b.time : a.seq < b.seq;
  }

  private up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(this.heap[i], this.heap[p])) break;
      [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
      i = p;
    }
  }

  private down(i: number): void {
    const n = this.heap.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.less(this.heap[l], this.heap[m])) m = l;
      if (r < n && this.less(this.heap[r], this.heap[m])) m = r;
      if (m === i) break;
      [this.heap[i], this.heap[m]] = [this.heap[m], this.heap[i]];
      i = m;
    }
  }
}

// Runs every event with time <= until, in (time, seq) order. Returns how many ran.
export function reachTime(q: EventQueue, until: SimTime): number {
  let ran = 0;
  for (;;) {
    const top = q.peek();
    if (top === undefined || top.time > until) break;
    q.pop();
    top.run(top.time);
    ran++;
    if (top.next !== undefined) {
      const t = top.next(top.time);
      if (t !== null) {
        if (t <= top.time) throw new Error("repeat must move forward");
        q.push(t, top.run, top.next);
      }
    }
  }
  return ran;
}
```

Typecheck and run on the VPS: `tsc --noEmit --strict --target es2020` exit 0 (npx typescript@5.6.3). Compiled to CommonJS and run with node: events at 5, 3 and 5 plus one at 11 with bound 10 ran 3 in the order C@3 A@5 B@5, one left in the queue; a REPEAT from 1 with a stop at 4 ran 4 times (1, 2, 3, 4); a repeat that returns its own time throws. The check drives this sketch only, not the donor.

## 5. Lands in

- TARGET `src/fight/timers.ts` (proposed new module: the server tick's timer queue; no Frankendom file was read for this note).
- Parity row 18 (server tick; sub-line "server tick: fixed step, input intake, per-tick NPC budget"). Fight timers (DoT ticks, cooldown ends, respawn grace) are the events.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape not code)
- Brief rule served: 1 (one engine: the server applies every timed effect); rules 7-9 n/a

Decision (proposed): adapt - keep the time-ordered queue and the rule that each effect runs at its own scheduled time, add an insertion-sequence tie-break, and drop the unordered change set; the donor's wall-clock driver is replaced by the server's tick counter.
Acceptance: a server test schedules a DoT tick and a cooldown end at the same millisecond and asserts they run in insertion order on every run; a repeat whose next time is not later than its own is refused; one tick runs every due timer and each effect is stamped with its scheduled time.

Best transferable idea: keep the server's timers in one queue ordered by (time, insertion sequence), and run each effect at its own scheduled time, not whenever the loop happens to poll, so the same inputs always give the same order.

## 6. Gaps and risks

- Wall clock drives the donor sim: `GameSimulation::run` reads the real clock each pass (simulation.cpp:48). Content is a function of scheduled times, but a recorded run cannot reproduce its own timing unless the clock is recorded. Frankendom should drive timers from an integer server tick, not a clock.
- No replay format in this donor: no input log, no state hash, no checksum (grep of libopenage for these terms found only the RNG and unrelated code). The only state that could be recorded is the RNG (two decimal words, rng.cpp:144-150) and the event queue (not serialised in what was read).
- Settling cap (event_loop.cpp:86-88) throws. A chain of timers that re-trigger at the same time would stop the server. Frankendom needs a counted fallback that carries work to the next tick.
- Many-on-one cost: the change set holds one entry per changed (entity, handler) pair (eventqueue.cpp:90-126). Its size under a 3-attacker fight with many entities was not measured. MAX_ATTACKERS = 3 does not bound the number of timers.
- The donor's RNG is used only by demos, so this donor shows no gameplay RNG stream design. The seeded-object pattern (own RNG per object, two words, serialisable) is the part that transfers.
- The donor does not sort changes deterministically (defect 2); the fix is in the Frankendom code, not something the donor shows.

## 7. As-data shape, provenance, patch history, rulings

As-data shape:
- Table: no data table defines events. Trigger types are a C++ enum: DEPENDENCY, REPEAT, ONCE, DEPENDENCY_IMMEDIATELY, TRIGGER (`/mnt/frankendom-donors/SFTtech-openage/libopenage/event/eventhandler.h` 34-50; cases in eventqueue.cpp 32-34 and 46-47).
- Row fields of an event (from the code, not a schema): time (time_t, Q16 fixed point), entity (weak pointer), handler (shared pointer; string id), params (param map), last-changed time (eventqueue.cpp 84-89; event.cpp 21-29).
- A new event is one row: no. A new trigger is a handler class with setup_event, predict_invoke_time and invoke (bodies not read), and a case in each switch.

Provenance per claim: donor repo SFTtech-openage; file and line as in the receipts. Licence: GPL-3.0-or-later ("GPL3+"), copyleft class, clean-room only.

What they patched later (from the donor's own history):
- RNG added in engine 0.3.0: "Random number generator (XORShift)" (doc/changelogs/engine/v0.3.0.md:39).
- Simulation clock added in engine 0.5.0: "Simulation clock" (doc/changelogs/engine/v0.5.0.md:60).
- The settling-cap comment (event_loop.cpp:79) disagrees with the value (80); no history line says why.
- The clock cap comment (clock.cpp:38-40) states it is deliberate; no history line found for the truncation (clock.cpp:32, 48).
- No git history in the donor (no .git directory); changelog.md is five lines and only points to doc/changelogs.

Rulings for Dom (answer each in one line):
1. Should all Frankendom fight timers (DoT, cooldown, respawn grace) run from one server-tick queue ordered by (time, sequence)? Recommend yes.
2. When the settling cap is reached, should the server log it and carry the work to the next tick rather than throw (the donor throws)? Recommend carry and log.
3. Should each replay file store the RNG seed as two words per stream, next to the input frames? Recommend yes; the donor shows the state fits in two decimal words.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine); rules 7-9 n/a

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Settling cap: code is `attempts > max_attempts` with max_attempts=10 (event_loop.cpp:80-86), so 11 attempts run before the throw; note said a 10-attempt cap. Confirmed.
- Clock cap: over-cap branch adds speed * max_tick_time (clock.cpp:38-41), i.e. 50 ms real scaled by speed, not a flat 50 ms of sim time. Confirmed.
- Missed (harmless): clock sleeps 1 ms when passed==0 (clock.cpp:30-32). Not added.
Fixed 2026-10-12: Mechanism clock line, Key functions settling line, and the two Numbers rows (11 attempts; cap is 50 ms real time times speed). Decision, Acceptance, Rulings and sketch do not depend on these; no TypeScript changed.
