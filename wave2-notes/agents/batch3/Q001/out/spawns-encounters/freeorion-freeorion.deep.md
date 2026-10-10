# freeorion-freeorion (spawns-encounters, cell 1)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/default/python/turn_events/turn_events.py` (per-turn spawner) with `/mnt/frankendom-donors/freeorion-freeorion/default/python/universe_generation/monsters.py` (game-start director) | Licence: GPL v2 for source (README.md 148-150); game content scripts under GPL v2 and CC-BY-SA-3.0 (default/COPYING 6); turn_events.py and monsters.py carry no header, so as read: GPL v2 / CC-BY-SA-3.0, clean-room only | Python (FOCS for the experimentor schedule) | symbol `execute_turn_events`

Checked: `execute_turn_events` is defined at turn_events.py 14-65 (read in full). `generate_monsters` is at monsters.py 84-222 (read in full; `populate_monster_fleet` 65-81 read in full; its game-start caller was not traced). `MONSTER_FREQUENCY` at universe_tables.py 120-129 (read). Caller chain read: ServerFramework.cpp 321-329, ServerApp.cpp 1610-1614 and 4546; the function that contains line 4546 was not read. `EXPERIMENTOR_OUTPOST.focs.py` read lines 1-220 of 301 (221-301 not read; it has more `Random(` rolls at 235, 258 and 281 that were not read). The FOCS evaluation semantics (how effects groups are scheduled each turn) were not read. Confidence: high for the per-turn spawner and the game-start director; medium for the experimentor schedule. camera_scope: n/a (spawns).

Best transferable idea: one chance roll per tick for a zone, where the chance scales with the zone's spawn-point count times a frequency value, the spawn lands only on an empty point, and at most one monster is placed per roll.

Decision (proposed): adapt - take the per-tick roll and the empty-point filter, but roll once per server tick per zone with the zone frequency as data and a per-kind cap as data; the donor live path has no cap (the game-start director does), and its kind is hard-coded to Krill, which Frankendom should not copy.
Acceptance: a server test with a seeded RNG: over 10,000 ticks in a zone with 4 empty points and frequency 0.03, the spawn count is within the expected value (about 12) and never exceeds the zone cap, and no spawn lands within the exclusion radius of a player.

## 1. Mechanism

Three spawn paths sit in the donor's Python and FOCS layer. The live one during play is the per-turn spawner; the other two are a game-start director and a timed escalation schedule.

(a) Per-turn spawner (turn_events.py 14-65). The server calls `execute_turn_events` once per turn, inside turn processing: ServerApp.cpp 4546 calls `ExecuteScriptedTurnEvents` (defined at 1610-1614, which calls `PythonServer::ExecuteTurnEvents` at 1614), and that wrapper calls the Python function (ServerFramework.cpp 321-329). Order of steps as the code runs:
- (1) Field roll (22-32) runs first. It is unrelated to monsters and is not described further.
- (2) Monster roll: `monster_freq` is looked up from the galaxy setup value (36). The chance is `len(systems) * monster_freq * 0.01` (39). A pass means at most one spawn this turn.
- (3) Kind: `if random() < 1:` is always true (41), so the kind is `SM_KRILL_1` (42). The `SM_FLOATER` else-branch (44) can never run.
- (4) Candidates: systems with no planets and no fleets (47). If there are none, the code prints an error and stops (48-49).
- (5) One candidate is chosen uniformly (51). An empty fleet is created there (55), then one monster is created in it (61). If monster creation fails, the code reports it (62-63) and does not remove the empty fleet it already created (no cleanup seen in those lines).

Numbers. Table values: extremelyLow 0.002, low 0.03, high 0.2, extremelyHigh 0.999 (universe_tables.py 122-128; none is 0.0 at 121). Expected spawns per turn = systems x f x 0.01. Low with 150 systems gives 0.045 per turn. High with 150 systems gives 0.3. With extremelyHigh and 150 systems the chance is above 1, so a spawn happens every turn. The donor comment (37-38) gives the low case as 150 / 30 * 0.01 = 0.05, which uses 1/30 for low; the table value 0.03 gives 0.045. The table is what runs. Nothing in this path caps how many monsters exist; in this file the only brakes are the rate and the empty-system filter.

(b) Game-start director (monsters.py 84-222, one pass when the universe is generated). Per-plan counters start at each plan's spawn limit for plans with spawn rate > 0, limit > 0 and at least one design (108-112). The systems are shuffled once (166). For each system: the suitable plans are those whose location test accepts the system and whose counter is above 0 (174-180). One plan is picked uniformly (190). The roll is `basic_chance * spawn_rate` (193). A failed roll means the system gets nothing this pass, even if other plans were suitable. On success the fleet is populated (210) and the plan's counter drops by one (212). The per-plan data is in `monster_fleets.inf`: SM_KRILL_1 spawnrate 0.5 and spawnlimit 9999 (6-7); SM_FLOATER spawnrate 0.7 and spawnlimit 50 (74-75). The location tests are FOCS conditions (for Krill: no monster present, and not within max(2, MIN_MONSTER_DISTANCE) starlane jumps of an empire-owned planet, lines 8-13, read). The live spawner in (a) does not read these plans. It hard-codes Krill, so the two spawn systems share no data.

(c) Timed escalation (EXPERIMENTOR_OUTPOST.focs.py, lines 1-220 read). Start turn: `CALC_A` = a base-turn game rule + 50 x (5 - max AI aggression) + 1000 when aggression is 2 or less (62-64; the base value comes from RULE_EXPERIMENTORS_SPAWN_BASE_TURN at line 56, value not read). Start = CALC_A x (1.2 - planet density / 10) x max(1, galaxy size / 200)^0.4 (68-70). Factor F = (1 + aggression) / 5 (54). Four effects groups, each with its own per-turn roll on the outpost:
- Start to start+35: roll 0.2F, spawns 2 Black Krakens (142-147).
- From start+36: roll 0.1F, spawns 2 Black Krakens (165-170).
- Start+36 to start+70: roll 0.2F, spawns 2 Bloated Juggernauts (188-193).
- From start+71: roll 0.1F, spawns 2 Bloated Juggernauts (211-216).
Groups 2 and 3 overlap from start+36 to start+70, so two independent rolls can fire on the same turn.

## 2. Key functions

- `execute_turn_events`: `/mnt/frankendom-donors/freeorion-freeorion/default/python/turn_events/turn_events.py` 14-65 (whole file, read).
- `PythonServer::ExecuteTurnEvents`: `/mnt/frankendom-donors/freeorion-freeorion/server/ServerFramework.cpp` 321-329 (the call at 323; caller at `/mnt/frankendom-donors/freeorion-freeorion/server/ServerApp.cpp` 1614 and 4546).
- `generate_monsters`: `/mnt/frankendom-donors/freeorion-freeorion/default/python/universe_generation/monsters.py` 84-222 (game-start director, read in full).
- `populate_monster_fleet`: `/mnt/frankendom-donors/freeorion-freeorion/default/python/universe_generation/monsters.py` 65-81.
- `MONSTER_FREQUENCY` table: `/mnt/frankendom-donors/freeorion-freeorion/default/python/universe_generation/universe_tables.py` 120-129.
- Experimentor start turn and tiers: `/mnt/frankendom-donors/freeorion-freeorion/default/scripting/buildings/EXPERIMENTOR_OUTPOST.focs.py` 54-70 and 142-216.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-tick chance = candidate count x frequency x fixed scale, one roll, one spawn at most | Scale 0.01 (theirs, turn_events.py 39); frequency table 0.002 / 0.03 / 0.2 / 0.999 (theirs, universe_tables.py 122-128) |
| Spawn only on a point with nothing on it | Empty means no planets and no fleets (theirs, turn_events.py 47) |
| Pick one candidate uniformly | `choice` over the candidates (theirs, turn_events.py 51) |
| Per-kind counter that drops on each spawn and stops at zero | Spawn limits 9999 (Krill), 50 (Floater) in the game-start plans (theirs, monster_fleets.inf 7, 75). The live path has no counter |
| Timed tiers gated by a start turn and a per-turn roll | Start turn formula, windows 0-35 / 36-70 / 71+ and roll factors 0.2 and 0.1 times F (theirs, EXPERIMENTOR_OUTPOST.focs.py 62-70, 142-212) |
| Start turn scales with difficulty and map | +50 per aggression tier below 5, +1000 for low aggression, density and size factors (theirs, EXPERIMENTOR_OUTPOST.focs.py 63, 69) |

## 4. TypeScript sketch

simplified: this is the per-turn spawner (turn_events.py 36-61) with a per-kind cap taken from the game-start director (monsters.py 108-112, 212), which the donor's live path does not have. It omits the field roll, the galaxy setup lookup, the sitrep, and the game-start pass and the experimentor schedule. The kind is a parameter, not hard-coded Krill. Order differs from the donor in one place: the cap check runs before the roll (the donor has no cap here). The roll still comes before the empty-point filter, as in the donor (39 then 47).

```ts
// Licence: donor GPL v2 (source) and GPL v2 + CC-BY-SA-3.0 (content scripts). Clean-room sketch from the described mechanism, not a translation.
// clean-room
interface SpawnPoint {
  id: number;
  occupied: boolean; // donor: any planet or any fleet present (turn_events.py 47)
}

interface ZoneSpawnData {
  freq: number; // zone data: ratio from the frequency table (donor: 0.002 .. 0.999)
  cap: number;  // zone data: max live monsters of this kind (donor per-turn path has none)
  kind: string; // monster kind to place
}

interface SpawnRoll {
  spawned: boolean;
  pointId: number | null;
  kind: string | null;
}

const PER_POINT_SCALE = 0.01; // engine constant: donor turn_events.py 39 uses * 0.01

// One roll for one zone, called once per server tick. rand() returns a value in [0, 1).
export function spawnTick(points: SpawnPoint[], zone: ZoneSpawnData, live: number, rand: () => number): SpawnRoll {
  const none: SpawnRoll = { spawned: false, pointId: null, kind: null };
  if (zone.freq <= 0 || live >= zone.cap) return none;
  const chance = points.length * zone.freq * PER_POINT_SCALE;
  if (rand() >= chance) return none;
  const free = points.filter((p) => !p.occupied);
  if (free.length === 0) return none;
  const pick = free[Math.floor(rand() * free.length)];
  return { spawned: true, pointId: pick.id, kind: zone.kind };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone spawn director, server side; the donor roll becomes one call per zone per server tick). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). The per-tick roll also touches the server-tick sub-line "per-tick NPC budget" (post-K item 3), but the row is 23.
- today: not checked in this pass (the Frankendom repo was not opened); the target is a proposal.
- Reuse tag: rewrite-from-idea (GPL v2 source and CC-BY-SA-3.0 content; clean-room, shape only)
- Brief rule served: 1 (one engine, zones as data); row 23 spawn caps

## 6. Gaps and risks

- Licence is copyleft (GPL v2 and CC-BY-SA-3.0). Clean-room only: the sketch is written from the mechanism, not translated from the Python.
- Zones as data: the donor's chance uses the whole galaxy's system count and one galaxy setting. Frankendom needs the frequency and cap per zone, read from zone data, not from a global table.
- Server-verified: the donor filters on planets and fleets. Frankendom's "empty" must be defined by the server (for example no player within an exclusion radius), and the donor does not show how that is checked.
- One ledger: the live path keeps no counter. The per-kind cap has to be a server-side count in the one ledger, and the game-start director's counter is the shape to copy, not its code.
- MAX_ATTACKERS = 3: turn_events.py has no check for a fight in progress (read in full), so in the donor a spawn can land in an active fight. Frankendom must gate spawns against live fights and the attacker cap.
- The donor's Krill-only kind choice, the unreachable Floater branch (turn_events.py 41-44), the stale comment (37-38) and the split between the plan file and the live spawner are not to be copied. Their data is not shared.
- The experimentor schedule is a timed escalation tied to a difficulty value. It fits a boss-wave or encounter director in zone data, but only the start-turn formula and the four tiers (lines 1-220) were read; lines 221-301 (more rolls) were not read.
