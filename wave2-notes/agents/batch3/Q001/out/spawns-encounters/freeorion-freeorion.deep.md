# freeorion-freeorion (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/default/python/universe_generation/monsters.py` (universe pass, `generate_monsters`), `/mnt/frankendom-donors/freeorion-freeorion/default/python/turn_events/turn_events.py` (turn pass, `execute_turn_events`), plan data `/mnt/frankendom-donors/freeorion-freeorion/default/scripting/monster_fleets.inf` | Licence: GPL-2.0 for the code and dual GPL-2.0 / CC-BY-SA-3.0 for game content scripts (`default/COPYING`; `README.md` lines 145-151). `default/python` is not stated as content or code in the file, so treat it as copyleft | Python + FOCS data | symbol `generate_monsters`, `execute_turn_events`

Checked: `generate_monsters` (monsters.py 84-230) and `execute_turn_events` (turn_events.py 14-65) were both read in full. Also opened: universe_tables.py (`MONSTER_FREQUENCY`, 120-129), monster_fleets.inf (lines 1-120 and 100-113 read; 121-217 not read), universe_generator.py (call site, 175-185), ServerApp.cpp (1614), ServerFramework.cpp (321-328), named_values.focs.py (66), game_rules.focs.py (172-182), monsters.py `StarlaneAlteringMonsters` (17-63, read). A grep for `respawn|despawn` across `.py`, `.cpp` and `.h` (excluding msvc) found no matches. Not read: the FOCS location-condition evaluator, the server code behind `create_monster_fleet` and `create_monster`, the seed handling inside `seed_rng`, the Krill hull. Confidence: high on both spawn paths as written. Medium on how often the turn pass fires in play, since that depends on the galaxy setup value at runtime.

## 1. Mechanism

Two spawn paths, one for universe creation and one for each server turn.

**Universe pass** (`generate_monsters`, monsters.py 84-230). Called once at universe creation (universe_generator.py:181).
- The galaxy's monster frequency maps to a base chance through a table (monsters.py:91). A base chance of 0 returns at once (93-94).
- Each plan with spawn rate > 0, spawn limit > 0 and at least one ship design gets a counter set to its spawn limit (108-112). The counter is local to this call and is shared by all systems in the pass.
- The systems list is shuffled once (166). For each system, in that order (167 onward):
  - Eligible plans are those whose location set includes this system (177), whose counter is above zero (178), and, for hulls that can alter starlanes, which pass the connectivity check (179).
  - If none is eligible, the system is skipped (182-183).
  - Otherwise the expectation tally grows (187-189), one eligible plan is picked uniformly (190), and one roll decides the spawn: it fails when `random > base chance x plan spawn rate` (193-199).
  - On success the fleet is populated (210) and the counter drops by one (212). A `MapGenerationError` is reported and skips the decrement (214-216).
- The roll is per system, not per plan. A system gets at most one fleet per pass.

**Turn pass** (`execute_turn_events`, turn_events.py 14-65). Called once per server turn from `ServerApp::ExecuteScriptedTurnEvents` (ServerApp.cpp:1614, which wraps `ExecuteTurnEvents` at ServerFramework.cpp:321-328).
- The monster part reads only the galaxy's monster frequency (36) and the list of systems (18).
- One roll per turn: `random() < systems x freq x 0.01` (39). This is one roll for the whole galaxy, not one per system. The value is not clamped, so when it is at or above 1 a spawn happens every turn.
- Candidates are systems with no planets and no fleets (47). One is picked uniformly (51). A fleet and a monster are created (55, 61).
- The monster type is hard-coded to `SM_KRILL_1` (41-42). The Floater branch (43-44) cannot run, because `random() < 1` is always true (41).
- The turn pass does not read `monster_fleets.inf`. It never reads a spawn limit and never counts live monsters. There is no population cap on this path.

**Plan data** (monster_fleets.inf, per plan: `spawnrate`, `spawnlimit`, and a location condition).
- Krill (`SM_KRILL_1`): spawnrate 0.5 (6), spawnlimit 9999 (7). Location: no monster in the system, and not within `max(2, MIN_MONSTER_DISTANCE)` jumps of a system that holds an empire-owned planet (8-13).
- Floater: spawnrate 0.7 (74), spawnlimit 50 (75).
- Kraken: spawnrate 0.8 (104), spawnlimit 100 (105), and a gas-giant requirement (108).
- Drone factory: `max(3, ...)` jumps (44). Dragon: `max(4, ...)` jumps (93).
- `MIN_MONSTER_DISTANCE` is the game rule `RULE_MINIMUM_MONSTER_DISTANCE_CAPITAL` minus 1 (named_values.focs.py:66).

**No respawn and no despawn.** The grep found no code that removes a monster on a timer or re-places one after it dies. Combat deaths are handled elsewhere (not read).

## 2. Key functions

- `generate_monsters`: `/mnt/frankendom-donors/freeorion-freeorion/default/python/universe_generation/monsters.py` 84-230. The whole universe pass: base chance, per-plan counters, per-system eligibility, one roll, decrement.
- `StarlaneAlteringMonsters.can_place_at`: same file, 17-51. Keeps a map-altering fleet from splitting the galaxy. Read in full.
- `populate_monster_fleet`: same file, 65-81. Creates the fleet and its monsters. Read in full.
- `execute_turn_events`: `/mnt/frankendom-donors/freeorion-freeorion/default/python/turn_events/turn_events.py` 14-65. The per-turn trickle spawn. Read in full.
- `MONSTER_FREQUENCY`: `/mnt/frankendom-donors/freeorion-freeorion/default/python/universe_generation/universe_tables.py` 120-129. The frequency to base-chance table.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Base chance x plan weight is the roll for one spawn point | Frequency table (theirs, universe_tables.py 121-128): none 0.0, extremelyLow 0.002, veryLow 0.01, low 0.03, medium 0.08, high 0.2, veryHigh 0.5, extremelyHigh 0.999 |
| Per-plan cap counter, checked before the roll, decremented on each placed spawn | Krill cap 9999, Floater cap 50, Kraken cap 100 (theirs, monster_fleets.inf 7, 75, 105) |
| Plan weight | Krill 0.5, Floater 0.7, Kraken 0.8 (theirs, monster_fleets.inf 6, 74, 104) |
| Presence gate: keep N jumps from owned planets | `max(2 \| 3 \| 4, MIN_MONSTER_DISTANCE)` per plan (theirs, monster_fleets.inf 10, 44, 93). The rule default is 3 (game_rules.focs.py:178), so MIN is 2 by default. The rule default is not receipted: the line is under 15 characters |
| Turn-pass density roll | `systems x freq x 0.01` per turn (theirs, turn_events.py 39) |

Worked numbers, computed from the table and the plan data: at frequency `high` (0.2), a Krill plan is rolled at 0.2 x 0.5 = 0.10 per eligible system visited in the universe pass. On the turn pass at `high` with 100 systems, the roll is 100 x 0.2 x 0.01 = 0.2 per turn.

## 4. TypeScript sketch

simplified: one director pass in the same order as the universe pass: shuffle the points, filter eligible plans by their counter and a zone predicate, pick one plan uniformly, roll base chance x weight, place, then decrement. It omits the expectation tally, the starlane-altering connectivity guard, the per-plan report counters, the `MapGenerationError` path (the donor skips the decrement on error; the sketch has no error path), the turn-pass density roll and its single-kind krill rule, the seeded RNG, and the jump-distance rule (the `allows` callback stands in for the location condition). It does not reorder anything relative to the universe pass.

```ts
// Licence: GPL-2.0 (code) and CC-BY-SA-3.0 (game content scripts), per donor default/COPYING. clean-room sketch of the mechanism, not a translation.
export interface SpawnPlan {
  name: string;
  weight: number;   // share of the base chance this plan takes (donor: spawn_rate)
  cap: number;      // spawns allowed for the whole zone set (donor: spawn_limit)
}

export interface SpawnPoint {
  id: number;
  // presence and distance gate: true if this plan may appear at this point (zone data predicate)
  allows: (plan: SpawnPlan) => boolean;
}

// One director pass over all points. Returns how many spawns were placed.
export function runDirector(
  points: SpawnPoint[],
  plans: SpawnPlan[],
  baseChance: number,              // zone frequency, e.g. 0.2 for "high"
  rnd: () => number,
  place: (pt: SpawnPoint, plan: SpawnPlan) => void,
): number {
  const remaining = new Map<string, number>(plans.map((p) => [p.name, p.cap] as const));
  let placed = 0;

  // visit points in random order (Fisher-Yates)
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }

  for (const pt of points) {
    const open = plans.filter((p) => (remaining.get(p.name) ?? 0) > 0 && pt.allows(p));
    if (open.length === 0) continue;
    const plan = open[Math.floor(rnd() * open.length)];
    if (rnd() > baseChance * plan.weight) continue; // roll failed at this point
    place(pt, plan);
    remaining.set(plan.name, (remaining.get(plan.name) ?? 0) - 1);
    placed++;
  }
  return placed;
}
```

Typecheck: `npx -y -p typescript@5.6.3 tsc --noEmit --strict --target es2020` on the VPS, with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population director, server side; engine logic with the numbers as zone data). Named in the addendum as the Lead ruling target. Not checked in the Frankendom repo (not read).
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Spawn caps and the director pass cite row 23.
- Reuse tag: rewrite-from-idea (GPL-2.0 and CC-BY-SA-3.0 dual; clean-room only)
- Brief rule served: zones as data (numbers per zone); server-verified spawns; licence rule (task rule 7) applied as clean-room

## 6. Gaps and risks

- Copyleft: clean-room only. The sketch is written from the mechanism. No line of the donor is carried over.
- No respawn, no despawn, no grace timer in this donor. Row 23 needs all three. This donor gives only the roll and the caps. Build respawn and despawn-on-empty ourselves, and do not cite this donor for them.
- The turn pass has no cap and no live count (turn_events.py reads neither). Do not copy it. A zone spawn must count the live monsters of each plan in that zone against the cap, and the cap is a zone field.
- The counter exists only inside the universe pass (monsters.py 108, local to the call). The code read does not persist it. In Frankendom the cap must sit in zone state on the one ledger, so a restart cannot exceed it.
- Randomness: the universe pass seeds the RNG before the call (universe_generator.py:180-181). The turn pass uses the global `random` with no seed in the code read (turn_events.py:9). Frankendom's server spawns should use a seeded RNG per zone so a test can replay the spawns.
- The density roll is not clamped (turn_events.py:39). In Frankendom, validate each zone spawn chance into [0, 1] at load time.
- The Floater branch is unreachable (turn_events.py:41). Do not copy that pattern. Zone data should list each spawn kind explicitly.
- The presence gate is about empire-owned planets within N jumps. The Frankendom analogue would be distance from the player's hub or spawn point. Define it per zone as a plain number, not as a condition language.
- MAX_ATTACKERS = 3 is a fight rule (row 4). The zone cap is a separate number. Keep them apart so the two are not conflated.

Reuse tag: rewrite-from-idea (GPL-2.0 and CC-BY-SA-3.0 dual; clean-room only)
Brief rule served: zones as data; server-verified spawns; licence rule (task rule 7) applied as clean-room

Best transferable idea: Give each spawn plan a counter set to its zone cap, check it before the roll and decrement it on each placed spawn, so the cap holds however many spawn points there are.
Decision (proposed): adapt - take the roll x per-plan cap x eligibility pass for zone population (row 23), but add respawn and despawn-on-empty with a grace timer, which this donor lacks, and keep the cap on the server ledger; do not copy the turn-pass trickle, which has no cap.
Acceptance: A server test seeds a zone with a Krill cap of 2 and 200 eligible points; after 500 director passes exactly 2 Krill are alive, and no spawn is placed within the minimum jump distance of a player-held point.
