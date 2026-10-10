# evennia-evennia (spawns-encounters, cell 8)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/scripts/ondemandhandler.py` | Licence: BSD 3-Clause License (repo `LICENSE.txt`, line 1: "BSD 3-Clause License"; permissive, code may be adapted) | Python | symbol `OnDemandTask.stagefunc_loop`

Checked: Read in full: `OnDemandTask.__init__` (171-233), `check` (246-308, with `_find_stage` 263-285 and `_find_dt` 288-296), `stagefunc_loop` (106-134), `get_dt` and `get_stage` (310-349). `OnDemandHandler` add/get/get_stage read in part (448-476, 564-583, 625-641); these are plumbing. Callers: grep over the donor for `stagefunc_loop` finds only the test at `scripts/tests.py` 546-580 (a test, the loop is set up at 559); callers of `check` are `__init__` (the first check that starts the timer), `__str__`, `get_dt` and `get_stage`; `set_dt` and `set_stage` do not call it. `service.py` 569-572 (save) and 668-670 (load) read, enclosing functions not read. Second candidate read in full and not written up: `contrib/tutorials/evadventure/dungeon.py` (see section 6). Also opened: `prototypes/spawner.py` (the list hint; `spawn()` at 885 only builds objects from prototype dicts, no population logic). Harness: I loaded the donor file on the VPS with stub `evennia` imports and a fake clock and ran four cases (section 3). Confidence: high that the mechanism works as written; medium that it fits respawn, because the donor has no creature population or respawn director (grep for respawn, despawn, population across the `.py` tree found none that is creature logic).

Best transferable idea: Keep one start time and a stage table per spawn group, and work out respawn state only when someone looks, counting the cycles that wrapped since the last look, instead of running a ticker per zone.
Decision (proposed): adapt — Frankendom respawn timing has the same shape (cycle length plus stage thresholds, evaluated on observation), but the donor's wrap label, its unbounded catch-up count and its pickled-callback store clash with server-verified state and the one ledger, so take the shape and change those three things.
Acceptance: A server test observes a zone after 20 unseen cycles and asserts the new-cycles count is 20 but the spawns made are capped at the zone's spawn cap, and the first observation on the wrap moment returns the post-wrap stage, never a loop label.

## 1. Mechanism

- Nothing ticks. A task keeps one `start_time` and a stage table `{seconds: name}`. The state is computed by `check()` only when a caller asks: `get_stage()` (349) and `get_dt()` both call `check`, and `check` is the only place the clock is read.
- Order of one observation (`check`, autostart on):
  (a) `_find_dt` (288-296): if there is no start time yet, it sets start to now and returns dt = 0; otherwise dt = now - start_time (295).
  (b) `_find_stage` (263-285): the stage table is sorted largest threshold first (230), and the first threshold at or below dt wins (skip rule at 268). If that stage name differs from `last_stage` (271-272), the stage's callable runs once (276). If the callable does not raise, the lookup runs again with the same `delta_dt` (285), so the stage returned on that call is the one found before the callable ran. If the callable raises, the error is logged (no rerun) and the stage is returned.
  (c) `check` reads dt again (306) and returns `(dt, stage)` (308).
- Loop (`stagefunc_loop`, 106-134), attached as the callable on the last stage: cycle length = max(keys) - min(keys) (127). On the observation that finds it: `iterations += elapsed // cycle` (130), position = `elapsed % cycle` (132), `start_time = now - position` (134). Missed cycles are counted, not replayed; the callable is not called once per cycle.
- Clock: `runtime()` (92-103) returns gametime's runtime, `SERVER_RUNTIME + time.time() - SERVER_RUNTIME_LAST_UPDATED` (`utils/gametime.py` 91). Its docstring says runtime since first start minus downtimes; how `SERVER_RUNTIME` is kept current was not read.
- Persistence: `OnDemandHandler.save()` (398-422) tries `pickle.dumps` on each task, drops any that fail, and writes the rest to ServerConfig (422). `load()` reads them back. `service.py` calls save (572) and load (670).

## 2. Key functions

- `OnDemandTask.check`: `/mnt/frankendom-donors/evennia-evennia/evennia/scripts/ondemandhandler.py` 246-308 (the observation; `_find_stage` 263-285, `_find_dt` 288-296).
- `OnDemandTask.stagefunc_loop`: same file, 106-134 (the cycle count and position).
- `OnDemandTask.__init__`: same file, 171-233 (validates keys as int or float and values as name or (name, callable); sorts the table at 230).
- `OnDemandHandler.save`: same file, 398-422 (picklability check and ServerConfig write).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Cycle length is the span of the stage table | max(keys) - min(keys), line 127; no fixed number in the donor |
| Stage = largest threshold at or below elapsed time | Thresholds are caller data; test table is 0, 50, 150, 300, 400 with a loop at 500 (`scripts/tests.py` 554-559) |
| Wrapped cycles counted on look | elapsed // cycle, line 130; no cap on the count |
| Position in cycle | elapsed % cycle, line 132 |
| Stage callable fires on change, not per cycle | Only when the stage name differs from `last_stage`, line 271 |
| Clock excludes downtime (per docstring) | `runtime()` formula, gametime.py 91 |

Harness results (run on the VPS against the donor file, fake clock, python3 3.12.3, stub evennia imports):
- T1: task created at 0 with the loop table; the first `get_stage()` at 500 returns `'_loop'` with iterations 1 and start_time 500; the next `get_stage()` at 500 returns `'seedling'`.
- T2: created at 0; first observation at 10250: `get_dt()` 250, iterations 20, stage `'flower'`.
- T3: no loop, table {0: a, 100: b, 250: c}: at 150 `'b'`; at 260 `'c'`.
- T4: stage callable at 100, no observation between 0 and 1000: 0 calls before the observation; 1 call on the observation at 1000 (stage `'b'`).

## 4. TypeScript sketch

simplified: This is a fresh shape, not a translation. It differs from the donor on purpose: on the call that wraps a cycle it returns the stage of the new cycle (the donor returns the `_loop` label on that call, see section 6), and it returns `newCycles` so the caller can make spawns per cycle. It omits per-stage callbacks, bounce mode, the `_loop` label, persistence and pickling, the uptime clock, and the name validation the donor does in `__init__`.

```ts
// Lazy respawn timer for one spawn point or zone group. There is no ticker: the state is
// worked out only when someone observes it (a player enters, or the zone is queried).
export interface SpawnStage {
  atS: number;   // seconds into the current cycle where this stage starts; first stage must be 0
  name: string;
}

export interface LazyTimer {
  startedAt: number;     // server-clock seconds when the current cycle started
  stages: SpawnStage[];  // sorted ascending by atS
  cycleS: number | null; // cycle length in seconds; null means the timer does not loop
  cycles: number;        // completed cycles, counted when observed
}

export interface Observed {
  stage: string;
  newCycles: number;     // cycles that wrapped since the last observation (can be > 1)
}

export function observe(t: LazyTimer, now: number): Observed {
  let elapsed = now - t.startedAt;
  let newCycles = 0;
  if (t.cycleS !== null && elapsed >= t.cycleS) {
    newCycles = Math.floor(elapsed / t.cycleS);
    t.cycles += newCycles;
    elapsed = elapsed % t.cycleS;
    t.startedAt = now - elapsed;
  }
  let stage = t.stages[0].name;
  for (const s of t.stages) {
    if (elapsed >= s.atS) stage = s.name;
  }
  return { stage, newCycles };
}

export {};
```

Sketch checks (run on the VPS): `npx -p typescript tsc --noEmit --strict --target es2020` exits 0. The compiled file, run with a short script: at 500 returns `seedling` with newCycles 1; at 10250 (unseen) returns `flower` with newCycles 20; at 180 returns `flower` with newCycles 0; a table with no loop at 5000 returns the last stage.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`: one lazy respawn timer per spawn group; the wrap count feeds that zone's respawn batch.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). This note covers the respawn timing only. The donor has no occupancy check, so despawn-on-empty and the grace timer are not covered by it (section 6).

## 6. Gaps and risks

- Wrong label on the wrap call. The docstring (`ondemandhandler.py` 115) says the looped label "will never actually be visible". Harness T1 shows the call that wraps the cycle returns `'_loop'`; the next call returns the new stage. The sketch returns the new stage on the wrap call. Frankendom must pick one rule and test it.
- Batch on look is unbounded. After 20 unseen cycles the donor counts 20 (T2) with no cap. Frankendom must clamp the respawn batch to the zone's spawn cap (row 23 field), or one visit to an idle zone could flood it.
- One callback per observation, not per cycle. The stage callable runs once per stage change on look (T4, code lines 271-276). A respawn event must be driven by the cycle count (`newCycles`), not by the callback.
- Time is server uptime minus downtime (gametime.py 91). A restart or deploy stops the clock for the timer. Frankendom should store wall-clock timestamps in the one ledger so respawns do not pause during downtime. This is a choice to make, not a bug in the donor.
- Storage: the donor keeps timers in a pickled dict in ServerConfig and checks picklability in save() (398-422). Stage callables must be module-level functions to survive that. Frankendom's rulings want the timer as a row in the one ledger, with no pickled callables.
- No occupancy input. `check` only sees time, so there is no grace timer and no despawn-on-empty. Frankendom needs an occupancy check at observation time, plus a grace stage if it wants one.
- Not creature logic. Evennia is a MUD framework; the donor has no creature respawn director, population cap or spawn chance.
- Second mechanism, not written up: `contrib/tutorials/evadventure/dungeon.py` (read in full). Its start-room exits reset with a 50% coin every 300 s (`recycle_time` 457, coin at 439); branches are checked every 3600 s (458) and collapse when `branch.last_updated` is older than 604800 s (459, 418). `last_updated` is set only when a new room is generated (284), so the collapse means "no new room for a week", not "empty". It sends the characters left in the branch back to the start room. The lazy room budget is `max_unexplored_exits = 2` (213), `max_new_exits_per_room = 2` (214), with `randint(1, n)` (326). This does not meet row 23's on-empty despawn rule; it could be a separate note if Strategy wants it.
- MAX_ATTACKERS = 3 is about attackers in a fight, not spawns. The row 23 zone cap is the field to use here.

Reuse tag: rewrite-from-idea (BSD-3-Clause; adaptation allowed, but the sketch is written from the mechanism and is not a translation)
Brief rule served: 1 (one engine, zones as data: respawn timing computed in the engine from zone fields); rules 7-9 n/a



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** none found. Verified BSD 3-Clause LICENSE.txt line 1; stagefunc_loop 106-134 (cycle=max-min key, iterations//, %, start_time reset); _find_stage 263-286 incl. rerun-with-same-delta (so wrap call returns '_loop', docstring 115-118 contradicts it: note's central finding is right); check 246-308; __init__ 171-233 validation and reverse sort at 230; runtime() gametime.py 91; save() 398-422; service.py 572/670; tests.py loop table 554-559; dungeon.py recycle 457, branch_check 458, max life 459, coin 439, last_updated 284, max exits 213-214, randint 326

**Missed:** stagefunc_bounce exists (ondemandhandler.py 136+) and set_dt lets callers cheat the clock (322-337); also loop key spans max-min so a one-key table would divide by zero (line 130). Minor extras
