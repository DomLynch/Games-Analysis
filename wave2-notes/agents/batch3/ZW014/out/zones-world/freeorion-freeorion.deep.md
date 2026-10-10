# freeorion-freeorion (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/default/python/universe_generation/monsters.py` (`generate_monsters`, with `default/python/turn_events/turn_events.py` `execute_turn_events` for the runtime path, the per-kind table `default/scripting/monster_fleets.inf`, and the location and cap hooks in `universe/FleetPlan.h`, `server/ServerWrapper.cpp`, `universe/Conditions.cpp`) | Licence: GNU GPL Version 2 (`default/COPYING` line 9: "Everything else is licensed under the GNU General Public License, Version 2."; line 6: game content scripts are also GPL v2 and CC-BY-SA-3.0). No "or any later version" clause was seen in the excerpt read. Python and C++ | symbol `generate_monsters`

Checked: Hint file was absent (INFERRED). Read in full: `generate_monsters` (monsters.py 84-230), `can_place_at` and `place` of `StarlaneAlteringMonsters` (17-62), `populate_monster_fleet` (65-81), `execute_turn_events` (turn_events.py 14-65, whole file; the field spawn at 17-33 is not part of this note), the monster frequency table (universe_tables.py 120-129), and the first 80 lines and the spawn-rate lines of `monster_fleets.inf`. Also read: `MonsterFleetPlan` (universe/FleetPlan.h 43-68), `FilterIDsWithCondition` (server/ServerWrapper.cpp 193-222, locations at 523), `WithinStarlaneJumps::Match` (universe/Conditions.cpp 7930-7961), the default of `RULE_MINIMUM_MONSTER_DISTANCE_CAPITAL` (default/scripting/game_rules.focs.py 174-178) and `MIN_MONSTER_DISTANCE` (default/scripting/macros/named_values.focs.py 66). Not read: `WithinJumpsOfOthers` (the pathfinder), `DisjointSets` (galaxy module), `fo.create_monster_fleet` and `fo.create_monster` (C++ side), the rest of `monster_fleets.inf` (lines 80-217 only spot-checked for rates and limits). Scope: zone population at galaxy generation and at runtime; not a camera topic. Confidence: high on the generation loop and on the runtime spawner (both read end to end); high on the location rule's meaning (the condition and its evaluator were read); medium on the cost of the pathfinder call (not read).

Best transferable idea: Give each spawn kind its own location rule (a hop distance from player-held zones), a cap, and a rate, then pick one eligible kind per zone before a single roll, so every zone is visited once.
Decision (proposed): adapt - keep the per-kind table (rate, cap, location rule as zone data) and the one-kind-then-roll loop at generation; reject the runtime spawner as written, because it ignores the table's caps and location rules and hard-codes one kind.
Acceptance: a server test sets a 2-hop safe radius around each player-held zone and a cap of 5 on one kind; across 500 seeded generation passes no spawn lands within 2 hops of a player zone (the fleets are at least 3 hops away), that kind never exceeds 5, and a lane-breaking spawn that would split the zone graph into more regions than (blockers + 1) is refused.

## 1. Mechanism

- Galaxy generation (`generate_monsters`, monsters.py 84-230), run once at game start:
  1. Base chance: `basic_chance = MONSTER_FREQUENCY[setting]` (91). The table is 0.0 (none), 0.002 (extremely low), 0.01, 0.03 (low), 0.08 (medium), 0.2 (high), 0.5, 0.999 (universe_tables.py 120-129). A base of 0 returns at once (93-94).
  2. Table: load every monster fleet plan (101). Keep only plans with spawn rate > 0, spawn limit > 0 and at least one ship design (108-112). Each kept plan gets a counter equal to its spawn limit.
  3. Location cache: each plan's location condition is evaluated once over all systems (146-150; `FilterIDsWithCondition` in server/ServerWrapper.cpp 523 and 193-222).
  4. Shuffle the systems (166). Visit each system exactly once.
  5. Per system: suitable plans are those whose location includes the system and whose counter is still above zero (174-180). For a plan whose hull can alter starlanes, the connectivity check must also pass (179; `can_place_at`, 17-51). If no plan is suitable, move on (182-183).
  6. Pick ONE suitable plan uniformly at random (190). Then roll once: if `random() > basic_chance * spawn_rate`, the system is skipped and no other plan is tried there (193-199). A pass places one fleet with one monster per design (71-79, 206-210) and decrements the counter (212).
  7. Expectation tally (187-189) and the per-kind statistics (218-230) are logging only.
- Starlane-breaking kinds (`StarlaneAlteringMonsters`, 10-62): a candidate is refused unless, with its own lanes removed, the galaxy has exactly `placed + 2` contiguous regions (38-49; `placed` counts earlier blockers, so the new one brings the total to placed + 1 blockers and the regions to blockers + 1). Fewer regions raises an error and refuses; more regions refuses silently (40-41).
- Location rules are data (default/scripting/monster_fleets.inf). Example: SM_KRILL_1 has rate 0.5 and limit 9999 (lines 6-7), and requires the system to contain no monster and to be "Not WithinStarlaneJumps" of a system holding an empire-owned planet, with jump limit `max(2, MIN_MONSTER_DISTANCE)` (lines 2-16; the jump line is 10). SM_DRONE_FACTORY has rate 0.4 and limit 5 (lines 37 and 38) and uses `max(3, ...)` (location at line 44). SM_FLOATER has rate 0.7 and limit 50 (70-75). SM_EXP_OUTPOST has rate 1000.0 and limit 1 (lines 183-184), with `max(6, ...)` at line 198.
- `MIN_MONSTER_DISTANCE` = `RULE_MINIMUM_MONSTER_DISTANCE_CAPITAL - 1` (named_values.focs.py 66); the rule defaults to 3 (game_rules.focs.py 174-178). So by default the jump limit is 2.
- `WithinStarlaneJumps::Match` (Conditions.cpp 7930-7961): jump limit 0 means "same system"; otherwise the candidate must be within that many jumps of a subcondition match (7957-7959). So "Not WithinStarlaneJumps 2" means at least 3 jumps from an owned planet.
- Runtime (turn_events.py 14-65), once per turn: `monster_freq = MONSTER_FREQUENCY[setting]` (36). If `random() < len(systems) * monster_freq * 0.01` (39), one fleet is made, at most one per turn. The kind is hard-coded: `if random() < 1:` always takes `SM_KRILL_1` (41-42), so the `SM_FLOATER` branch never runs. The place is a uniform pick from systems with no planets and no fleets (47, 51). The fleet and one monster are created (55-61). The runtime spawner does not read `monster_fleets.inf`: no spawn rate, no spawn limit, no distance rule.

## 2. Key functions

- `generate_monsters`: `/mnt/frankendom-donors/freeorion-freeorion/default/python/universe_generation/monsters.py` 84-230. Whole pass: base chance, table, location cache, shuffle, one-kind-then-roll, caps.
- `StarlaneAlteringMonsters.can_place_at`: same file, 17-51. Connectivity guard for blockers.
- `execute_turn_events` (monster part): `/mnt/frankendom-donors/freeorion-freeorion/default/python/turn_events/turn_events.py` 34-63. Runtime spawn, at most one per turn.
- `MonsterFleetPlan`: `/mnt/frankendom-donors/freeorion-freeorion/universe/FleetPlan.h` 43-68. Holds spawn rate (default 1.0) and spawn limit (default 9999) and the location condition.
- `WithinStarlaneJumps::Match`: `/mnt/frankendom-donors/freeorion-freeorion/universe/Conditions.cpp` 7930-7961. Hop-distance check.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Visit each zone once in random order, pick one eligible kind uniformly, then roll once for it | Base chance by setting: low 0.03, medium 0.08 (theirs, universe_tables.py 124-125) |
| Kind weight multiplies the base chance; a weight above 1 over the base saturates | Rates from 0.1 (SM_DRONE) to 1000.0 (SM_EXP_OUTPOST) in the lines read (theirs, monster_fleets.inf 6-7, 183-184) |
| Per-kind cap as a counter decremented on each placement | Caps 5 (SM_DRONE_FACTORY), 50 (SM_FLOATER), 9999 as "effectively unlimited" (theirs, monster_fleets.inf 37-38, 74-75, 7) |
| Location rule as a hop distance from player-held zones | Jump limit = max(per-kind floor, MIN_MONSTER_DISTANCE); floors 2 to 6 (theirs, monster_fleets.inf 10, 44, 198) |
| Galaxy-wide one-shot generation vs runtime per-turn spawn | Runtime chance systems × freq × 0.01 per turn (theirs, turn_events.py 39); one per turn (39-41) |
| Blocker must keep the zone graph connected in exact count | Regions = blockers + 1 (theirs, monsters.py 38) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's generation order: shuffle the zones, then for each zone filter by occupied, hop distance and remaining cap, pick one kind uniformly, and roll once against base chance times the kind's rate. It omits the starlane-breaking connectivity guard, the lane-altering kinds, the expectation tally and statistics, the nest kinds, the runtime per-turn spawner, the multi-monster fleets, and the "Contains Or [Armed Monster]" variants. It takes the hop distance from player zones as an input array instead of evaluating the location condition with the pathfinder. It uses Fisher-Yates for the shuffle (not Python's random.shuffle).

```ts
// Licence: GPL v2 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Kind { name: string; rate: number; limit: number; minHops: number; }   // minHops = jump limit of the location rule
interface Zone { id: number; hopsToPlayer: number; hasMonster: boolean; }        // hops from a player-held zone (precomputed here)
export interface Placement { zone: number; kind: string; }

// Generation pass: each zone is visited once in random order and gets at most one roll.
export function generatePass(zones: Zone[], kinds: Kind[], basicChance: number, rng: () => number): Placement[] {
  if (basicChance <= 0) return [];
  const left = new Map<string, number>(kinds.map((k): [string, number] => [k.name, k.limit]));
  const order = [...zones];
  for (let i = order.length - 1; i > 0; i--) {                                   // Fisher-Yates shuffle
    const j = Math.floor(rng() * (i + 1));
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  }
  const placed: Placement[] = [];
  for (const z of order) {
    // location rule: not occupied, and not within minHops of a player zone; plus the cap must have room
    const eligible = kinds.filter(k =>
      !z.hasMonster && z.hopsToPlayer > k.minHops && (left.get(k.name) ?? 0) > 0);
    if (eligible.length === 0) continue;
    const k = eligible[Math.floor(rng() * eligible.length)];                     // pick ONE kind uniformly
    if (rng() > basicChance * k.rate) continue;                                  // single roll for that kind only
    placed.push({ zone: z.id, kind: k.name });
    left.set(k.name, (left.get(k.name) ?? 0) - 1);
  }
  return placed;
}

export {};
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file /tmp/freeorion-monster-pass.ts).

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population director; engine logic, zones as data). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The per-kind cap and the hop-distance location rule feed row 23. The one-kind-then-roll loop is a per-zone budget at generation; at runtime it would sit on the server tick, under the "server tick: fixed step, input intake, per-tick NPC budget" sub-line of row 18 / post-K item 3.
- Today: origins/server/world-spawns.ts (row 23's file). No fight-module target; this is not a fight step.
- Reuse tag: rewrite-from-idea (GPL v2; clean-room only)
- Brief rule served: zones as data (the kind table, caps and location rules are zone data); one engine (the location and cap rules are engine checks, not per-zone code).

## 6. Gaps and risks

- GPL v2: clean-room only. The sketch is written from the mechanism; no lines are translated.
- The runtime spawner (turn_events.py 39-63) bypasses the table: no spawn limit, no distance rule, and only SM_KRILL_1. Frankendom must not copy this path. Both paths need one rule set.
- The donor's caps are galaxy-wide counts fixed at generation. Frankendom's cap is per zone and must be live (count of current spawns), with despawn on empty and a grace timer (row 23). The donor has no despawn at all.
- The "one roll per zone" rule means a rejected roll wastes the zone for this pass. In a real-time game this should be a per-tick budget, not a single pass.
- A rate above 1 over the base chance is a certainty, not a higher chance (SM_EXP_OUTPOST 1000.0). Frankendom should clamp rates into [0, 1] or document saturation, and put the clamp in the tests.
- Hop distance is a graph distance from player zones. It needs a precomputed distance field or a cached BFS; the donor evaluates it through the pathfinder (not read) once per plan and system.
- The connectivity guard (monsters.py 17-51) is the only transition-safety rule in the donor. Frankendom's transitions (zone portals) can use the same count check (regions equals blockers + 1), but the donor's check is only for lane-breaking hulls.
- The shipped game rule default makes the jump limit 2 (rule 3 minus 1). The number is zone data in our build, not a fixed rule.
- Not read: the rest of monster_fleets.inf (lines 80-217 beyond the rate and limit lines) and `WithinJumpsOfOthers`.

Reuse tag: rewrite-from-idea (GPL v2; clean-room only)
Brief rule served: zones as data; one engine (location and cap checks in the engine, kind table as zone data).

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: The per-plan location cache is evaluated once before any placement, so location conditions such as 'Not Contains Monster' go stale during the pass (a zone filled earlier in the pass still counts as free); the note's sketch uses a live hasMonster-style flag, which differs from the donor
