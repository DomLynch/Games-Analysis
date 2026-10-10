# endless-sky-endless-sky (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Engine.cpp` (symbols `Engine::SpawnFleets` 2018-2048 and the pre-warm in `Engine::EnterSystem` 1527-1555; table type `RandomEvent<T>` in `RandomEvent.h`; entry choice `Fleet::Enter` in `Fleet.cpp` 191-292) | Licence: GPL-3.0-or-later (RandomEvent.h and Fleet.cpp headers, line 6: "either version 3 of the License, or (at your option) any later version."; license.txt is GPL v3) | C++ | symbol `Engine::SpawnFleets`

Checked: The hint file `System.h` (290 lines) only declares the per-system tables (`Fleets()` 180, `fleets` 257) and the RaidFleet and hazard lists; it does not draw spawns. The draw is in `Engine.cpp` SpawnFleets (2018-2048), the entry pre-warm in EnterSystem (1527-1555), the table entry type in `RandomEvent.h` (whole file read), the random source in `Random.cpp` (77-84), the source choice in `Fleet.cpp` (191-292). Also read: `System.cpp` Danger (1160-1170), `AI.cpp` strength lookups (1313-1325, lookup defaults only), `Gamerules.cpp` 107. Candidate files opened: 8 (System.h, RandomEvent.h, Engine.cpp, Fleet.cpp, Random.cpp, System.cpp, AI.cpp, Gamerules.cpp); GamerulesPanel.cpp only by grep. Read in full: the spawn draw, guard, pre-warm, RandomEvent, Random::Int. Read in part: Fleet::Enter to the source choice (191-292); the placement after line 292 was not read (not read). Not read: how AI::Step fills the strength tables, the fleet's own leave/despawn behaviour, Raid fleets (Engine.cpp 1557 onward, seen only in part), the other callers of System::Danger. Confidence: high on the draw and guard order; medium on the entry placement. camera_scope: not a camera cell.

Best transferable idea: Give each zone a table of spawn entries, each with an interval and a condition gate; scale every interval by one global multiplier, pre-fill a newly entered zone by a few simulated seconds of draws, and block new spawns while friendly groups already outnumber enemies two to one.
Decision (proposed): adapt — the per-zone interval table with a condition gate is what row 23 needs as zone data, and the one global multiplier is a clean engine knob; but the donor's strength-ratio guard and the missing interval floor do not fit Frankendom's MAX_ATTACKERS = 3 ruling, so Frankendom takes the table and the knob, adds an explicit interval floor, and caps by attacker count instead of strength ratio.
Acceptance: A server test runs a seeded zone with one entry of interval 600 ticks at multiplier 1 and asserts a spawn count near 10 over 6000 ticks; at a large multiplier it asserts the zone floor holds (no more than one spawn per floor period per entry); and with more allied groups than twice the hostile groups in the zone, no new group spawns.

## 1. Mechanism

- Table: each system holds a list of fleet entries. Each entry has an event, a period (mean interval in engine steps; when the period is zero or negative it is set to 200, RandomEvent.h 49), and a condition set (the `to spawn` block, RandomEvent.h 53; test at 78).
- Per step (SpawnFleets, Engine.cpp 2018-2048): read the global fleet multiplier (2029-2030). If it is zero, stop. For each entry of the player's current system: draw `Random::Int(period / multiplier)` and spawn only if the draw is zero and `CanTrigger()` is true (2033). Random::Int(n) returns a value in [0, n) by a multiply-high (Random.cpp 77-84), so a zero draw has chance about 1/n. With the default period 200 and multiplier 1 that is about 1 in 200 per step, so the expected gap is 200 steps.
- Guard (2038-2043): skip the entry when the government has no government object (2035-2036), and skip when there is an enemy present (`enemyStrength` nonzero) and allied strength is more than twice the enemy strength. If no enemy is present, the guard never applies.
- Spawn (2046): `Enter` on the player's system. Entry placement is in `Fleet::Enter` (191-292): it collects linked systems (jump neighbours if the fleet has a jump drive, otherwise hyperspace links) and inhabited, non-enemy planets; a fleet that is not welcome here gets each non-enemy neighbour eight times in the list (Fleet.cpp 247-250); the source is chosen with `Random::Int(options)` (280); a planet source also picks a travel target among the links (288); a hyperspace source is a link (292). If there are no options at all, the code falls back to any non-enemy planet and returns if there are none (Fleet.cpp 265-277).
- Pre-warm on entry (EnterSystem, 1527-1555): five simulated seconds, each second a pass over the entries. An entry is placed directly into the system (`Fleet::Place`, 1537) when the fleet has a government, `Random::Int(period / multiplier) < 60` holds, and `CanTrigger()` is true (1535). The 60 stands for one second of steps, read from the comment and the code; the donor does not state the frame rate. The pre-warm does not apply the ally-strength guard.
- Multiplier semantics: "fleet multiplier" in the gamerules divides every period (`period / fleetMultiplier`, 2033 and 1535). Parsed as max(0, value) (Gamerules.cpp 107).
- Danger (System.cpp 1160-1170): per system, the sum over enemy-government entries of strength divided by period, described as "credits worth of enemy ships jumping in per frame" (1158). Callers not read.
- Step counter: `step` advances once per Go call while not paused (Engine.cpp 1127); SpawnFleets is called from `CalculateUnpaused` (1731-, call at 1846). The wall-clock length of a step is set by the caller, which was not read.

## 2. Key functions

- `Engine::SpawnFleets`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Engine.cpp` 2018-2048. Draw, condition, guard, enter.
- `Engine::EnterSystem` (pre-warm block): `/mnt/frankendom-donors/endless-sky-endless-sky/source/Engine.cpp` 1527-1555. Five-second fill with `Place`.
- `RandomEvent<T>` (table entry; constructor 47-55, `Period` 68-71, `CanTrigger` 76-79): `/mnt/frankendom-donors/endless-sky-endless-sky/source/RandomEvent.h`.
- `Random::Int(uint32_t)`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Random.cpp` 77-84. Bound zero returns zero.
- `Fleet::Enter`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Fleet.cpp` 191-292 (source choice); placement after 292 not read.
- `System::Danger`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/System.cpp` 1160-1170.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-zone table of entries, each with a mean interval and a condition gate | Default interval 200 steps when unset (RandomEvent.h 49) |
| One global multiplier divides every interval | Multiplier 0 turns fleets off (Engine.cpp 2030); parsed with floor 0, no upper clamp (Gamerules.cpp 107) |
| Chance per step is 1 over the interval (draw equal to zero) | Draw is `Random::Int(period / multiplier)` (2033) |
| Entry-time pre-fill: a few simulated seconds of draws, placed directly | Five seconds (1531), threshold 60 per second (1535) |
| Population guard by strength ratio, only when an enemy is present | Ratio 2 (2043) |
| Entry source weighted toward friendly neighbours when unwelcome | Weight 8 (Fleet.cpp 250); default entry radius 1000 (206) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (draw, then condition, then guard, then spawn) and its pre-warm shape (per-second draws, direct placement, condition check, no guard). It changes three things on purpose: it clamps the interval at a floor (the donor has none, and `Random::Int(0)` makes every draw hit), so the floor is an explicit parameter that Frankendom sets; it uses a caller-supplied RNG function (the donor uses a global RNG); and it omits the government-object check, the source choice and placement of `Fleet::Enter`, the danger estimate, the weight-8 neighbour list, and the raid-fleet path. The file typechecks on the VPS with `tsc --strict --target es2020` (exit 0; md5 matches the local copy).

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpawnEntry {
  groupId: string;
  interval: number;        // mean ticks between draws at multiplier 1 (zone data)
  canTrigger: () => boolean; // condition gate (zone data)
}

export interface ZoneCensus {
  allyStrength: number;    // strength of friendly groups already in the zone
  enemyStrength: number;   // strength of hostile groups already in the zone
}

// Chance per tick is 1 / max(floorTicks, interval / multiplier). The floor is a Frankendom
// choice: the donor has none, so a multiplier above the interval makes the draw always hit.
function due(e: SpawnEntry, multiplier: number, floorTicks: number, rand: () => number): boolean {
  if (multiplier <= 0) return false;
  const n = Math.max(floorTicks, Math.floor(e.interval / multiplier));
  return Math.floor(rand() * n) === 0;
}

// One engine tick: each due, allowed entry spawns one group, unless allies already outnumber
// enemies more than 2:1 (the guard applies only when an enemy is present).
export function tickSpawns(
  entries: SpawnEntry[],
  multiplier: number,
  zone: ZoneCensus,
  rand: () => number,
  spawn: (groupId: string) => void,
  floorTicks = 1,
): number {
  if (multiplier <= 0) return 0;
  let spawned = 0;
  for (const e of entries) {
    if (!due(e, multiplier, floorTicks, rand)) continue;
    if (!e.canTrigger()) continue;
    if (zone.enemyStrength > 0 && zone.allyStrength > 2 * zone.enemyStrength) continue;
    spawn(e.groupId);
    spawned++;
  }
  return spawned;
}

// On zone entry: a few simulated seconds of draws, each entry placed directly in the zone
// (no travel). No population guard is applied here, as in the donor.
export function prewarm(
  entries: SpawnEntry[],
  multiplier: number,
  rand: () => number,
  place: (groupId: string) => void,
  seconds = 5,
  ticksPerSecond = 60,
  floorTicks = 1,
): void {
  if (multiplier <= 0) return;
  for (let s = 0; s < seconds; s++) {
    for (const e of entries) {
      const n = Math.max(floorTicks, Math.floor(e.interval / multiplier));
      const hit = Math.floor(rand() * n) < ticksPerSecond;
      if (hit && e.canTrigger()) place(e.groupId);
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the per-zone spawn table, the global rate knob, the entry pre-fill, and the cap). Zone data per entry: group id, interval, condition. Engine constants: the rate knob's floor and the attacker cap.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with grace). The fit is good for the table, the rate knob and the entry pre-fill. It is partial for caps: the donor's cap is a strength ratio, not a count, so Frankendom's MAX_ATTACKERS = 3 is not covered here. Respawn after a kill and despawn with a grace timer are not in this donor path (not read). Sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3): the donor draws over the current system's entries once per step (2018-2048), so the per-tick cost scales with the entries of one zone, which is the per-tick budget shape to keep.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (the table, interval and condition are zone fields, the rate knob is one engine value); server-verified spawns (one seeded RNG owned by the server; the pre-fill runs on the server before any client sees the zone).

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism and not translated line by line.
- Missing interval floor (donor bug or design gap): with `period / multiplier` below one, `Random::Int` takes a bound of zero (Random.cpp 83 returns zero for any bound of zero), so `!Random::Int(...)` is true on every step (Engine.cpp 2033), and the pre-warm test `< 60` is true every second (1535). Gamerules parsing has no upper clamp on the multiplier (Gamerules.cpp 107). The gamerules panel has a validated number dialog (GamerulesPanel.cpp 939-940); the validator was not read. Frankendom must set a floor in code and in the zone data.
- The pre-warm skips the population guard (1535 has no ally check). A freshly entered zone can start with more groups than the live spawn would allow. This is the donor's behaviour; Frankendom must choose: either guard the pre-warm too, or accept it as an arrival wave on purpose.
- The guard only applies when an enemy is present (2043). With no enemy in the zone, allies never block a spawn. Frankendom's MAX_ATTACKERS = 3 is a count cap on the fight, not a ratio, so the donor's rule does not transfer as written.
- The table has no respawn timer, no despawn and no grace timer on this path. Fleets are placed or entered and then move by their own AI (not read). Row 23's despawn-on-empty with grace needs a separate design.
- Source choice depends on neighbour systems and jump range (Fleet.cpp 237-288), which means the zone graph must exist as data (links). Frankendom zones need an explicit link list before this can run.
- Randomness: the donor uses one global RNG (Random.cpp 41-61 holds the fixed-seed switch; the draw is at 77-84). A server version needs one seeded stream owned by the server so that the same seed gives the same spawns on every run.
- Step timing: `period` is counted in engine steps, and `step` advances only when time is not paused (Engine.cpp 1127). The donor's wall-clock step length was not read, so Frankendom should express intervals in server ticks, not seconds, and convert once.
- Not read: the placement after Fleet.cpp 292, the AI's fleet departure rules, the raid-fleet path (Engine.cpp 1557 onward, in part), and the strength tables (AI.cpp) beyond the two lookup functions.
