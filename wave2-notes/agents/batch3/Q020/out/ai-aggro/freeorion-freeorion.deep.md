# freeorion-freeorion (ai-aggro, cell 1)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/default/python/AI/MilitaryAI.py` | Licence: GPL-2.0 for the game-content scripts (`default/COPYING` line 6: "Game content scripts are also licensed under the GNU General Public License, Version 2"; the same file also licenses game content under CC-BY-SA 3.0, line 1; `README.md` line 148 gives GPL v2 for the source code) | Python | symbol `Allocator.allocate` (with `get_military_fleets`, `AIstate.__update_system_status`)

Checked: Read in full: `MilitaryAI.py` 190-430 (AllocationHelper, Allocator), 431-580 (all allocator subclasses), 581-621 (threat getters), 622-853 (`get_military_fleets`), 854-960 (start of `assign_military_fleets_to_systems`); `AIstate.py` 530-740 (threat assembly) and 1040-1056 (turn entry); `CombatRatingsAI/_ratings.py` 60-90; `freeorion_tools/combine_ratings.py` 1-41; `character/character_module.py` 381-382 (the `Aggression` class, 283-483). Grep-only: `PriorityAI.py`, `AIFleetMission.py` (callers). Candidates opened: MilitaryAI.py, AIstate.py, CombatRatingsAI/_ratings.py, freeorion_tools/combine_ratings.py, character_module.py, FreeOrionAI.py (action list), plus the list hint `ship_design/_ship_design_cache.py` (wrong file: ship design cache, not threat). Not read: `AIstate.py` 437-529 (the sensing that builds the enemy fleet lists), `assess_planet_threat`, the fleet and ship rating code in `CombatRatingsAI/_fleet_combat_stats.py` and `_ship_combat_stats.py` (so the rating unit itself is unverified), `FleetUtilsAI.get_fleets_for_mission`, `MilitaryAI.py` 961-1017. Confidence: high on the allocation arithmetic and order (every line in that chain read); medium on the threat inputs. Depth: thin, because the enemy-fleet sensing (437-529) and the fleet ratings that feed the threat are not read. Camera: not applicable (ai-aggro). No camera_scope tag.

## 1. Mechanism

- A strategic threat director, run once per AI turn. It does not chase or flee units. It decides how much of the empire's military rating each enemy-threatened system should receive, and in what priority order.
- Order of steps (as the code runs):
  (a) Turn entry: `prepare_for_new_turn` (`AIstate.py` 1042) calls `__update_system_status` (1053) before any allocation.
  (b) Threat per system: the enemy mobile fleets in the system are rated and combined with `combine_ratings` (545 for enemy, with mobile monsters and immobile monsters rated separately). A system seen this turn gets `fleetThreat = max(combine(enemy, mobile), 2 x lost - monster)` (640-642) and `totalThreat = combine(fleetThreat, monsterThreat, planet attack x health)` (650-654). Planet threat is `pattack * phealth` (598).
  (c) Memory when not seen this turn: `fleetThreat = max(combine(enemy, mobile), 0.98 x last fleetThreat, lost-fleet term)` (618-622). A system out of sight keeps at least 98% of its last value each turn. The lost-fleet term is about ships destroyed there and is not in the sketch.
  (d) Regional threat: `area_ratings` combines `enemy_threat` over the neighbour rings (738), and `regional_threat = combine(fleetThreat, neighborThreat, jump2_threat)` (723-724).
  (e) Demand per system: `get_military_fleets` (622) builds one allocator per system in this order: capital (737), occupied planets (743), top targets (747, only if `totalThreat` is not above the empire's total military rating, 727), enemy planets (756), colony and outpost targets (765), interior systems (782, only if `threat_bias + totalThreat > 0.8 x assigned`, 777-778), border systems (806, same 0.8 gate at 802).
  (f) Each allocator (`Allocator.allocate`, 281-304) computes `threat`, then `min` and `max` via `rating_needed(factor x threat, already_assigned)`: min uses factor 1.3 and max uses 2.5 for a plain target (338, 352, 492-493). Planet need is added as a second number. If both are zero it stops (287). Otherwise it enqueues the request when the remaining pool exceeds `min` or `take_any` is true (294). For a plain target `take_any` is true only when the system already has force assigned (505).
  (g) Pool bookkeeping: each enqueued request reduces the pool by `rating_difference` (228), which is not a plain subtraction.
  (h) Three-pass split of the pool in `get_military_fleets`: pass 1 gives capital, occupied and top targets their full `max`, in that order, while the pool lasts (814-818). Pass 2 gives the lower groups (otherTargets, accessibleTargets, exploreTargets) a base `min` each, in order (824-828). Pass 3 tops each of those up from what is left, up to its `max` (831-839).
  (i) `assign_military_fleets_to_systems` (854) walks those allocations and asks the fleet picker for fleets that meet each request (`FleetUtilsAI.get_fleets_for_mission`, not read). Each fleet it gets is set to aggressive (947) and given a mission (secure, protect region or military).
- Tick: none. The donor is turn-based. The threat update and allocation run once per AI turn from the action list (`FreeOrionAI.py` 331).

## 2. Key functions

- `Allocator.allocate`: `/mnt/frankendom-donors/freeorion-freeorion/default/python/AI/MilitaryAI.py` 281-304. Threat, min and max, skip when nothing is needed, enqueue on pool or take_any.
- `Allocator._minimum_allocation` and `_maximum_allocation`: `MilitaryAI.py` 338 and 352. Both are `rating_needed(factor x threat, assigned)`, so committed force reduces the request.
- `TargetAllocator._calculate_threat`: `MilitaryAI.py` 496-502. Threat = bias + safety x combine(local, 0.75 x neighbour, 0.5 x jump2) + potential (`_potential_threat`, 414, factor 0.5 at 494).
- `get_military_fleets`: `MilitaryAI.py` 622-852. The allocator sequence (737-806) and the three-pass pool split (811-842). Read in full.
- `__update_system_status`: `AIstate.py` 437 onward; read 530-740 (threat assembly, stale branch 612-635, visible branch 636-657, regional 723-740).
- `rating_needed` and `rating_difference`: `CombatRatingsAI/_ratings.py` 65-86. `combine_ratings`: `freeorion_tools/combine_ratings.py` 6-41 (the sqrt-sum rule is the docstring and line 32).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Group rating combines as (sqrt a + sqrt b)^2, so a group is worth more than its sum | None (the formula; docstring says it assumes attack ~ structure) (theirs, combine_ratings.py 32) |
| Extra force needed to reach a target given force already committed: 0 if covered, else (sqrt t - sqrt c)^2 | None (the formula; theirs `_ratings.py` 72-75) |
| Threat = local + 0.75 x neighbour + 0.5 x two-jump, combined, times a safety multiplier, plus a potential term | Weights 0.75 and 0.5 (theirs, MilitaryAI.py 500); potential factor 0.5 (theirs, 494) |
| Request band: min 1.3 x threat, max 2.5 x threat, both net of committed force | Min 1.3 (theirs, 492), max 2.5 (theirs, 493); top targets max 3 (theirs, 530) |
| Interior systems only when threat exceeds 80% of what is already committed | 0.8 (theirs, 778) |
| Threat memory: a system out of sight keeps 98% of its last value per turn | 0.98 per AI turn (theirs, 620) |
| Safety multiplier by aggression index | [4.0, 3.0, 2.0, 1.5, 1.2, 1.0] indexed by `self.aggression` (theirs, character_module.py 382). The enum order was not read, so which end is cautious is not verified |
| Pass 1 full max, then base mins, then top-up from leftover | Group order (capitol, occupied, top targets; then the rest) (theirs, 814, 824) |

## 4. TypeScript sketch

simplified: keeps the rating combine, the needed-gap rule, the threat weights and safety multiplier, the min and max band for one target, and the 0.98 memory. It omits the planet attack-times-health term, the lost-fleet term, the potential term (sketch takes it as an input), the take_any rule, the interior and border gates, the three-pass priority pool, the per-allocator factor differences (only the plain-target 1.3 and 2.5 are used), the fleet picking and the mission orders. It does not reorder anything, but the sketch is a single-target function, so the donor's order across targets is absent.

```ts
// Licence: GPL-2.0 / CC-BY-SA-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Two forces together are worth (sqrt a + sqrt b)^2, so a group is more than the sum of its parts.
export function combine(a: number, b: number): number {
  return a + b + 2 * Math.sqrt(a * b);
}

export function combineAll(ratings: number[]): number {
  return ratings.reduce((acc, r) => combine(acc, r), 0);
}

// Extra rating still needed to reach `target` when `committed` is already on the target.
export function neededRating(target: number, committed: number): number {
  if (committed >= target || target <= 0) return 0;
  return target + committed - 2 * Math.sqrt(target * committed);
}

export interface ThreatView {
  local: number;      // enemy rating in the target's own area
  neighbour: number;  // enemy rating one jump out
  jump2: number;      // enemy rating two jumps out
  potential: number;  // extra for enemies that could arrive (0 if none)
  safety: number;     // risk multiplier, from a per-difficulty table
}

export function threatOf(v: ThreatView): number {
  return v.potential + v.safety * combineAll([v.local, 0.75 * v.neighbour, 0.5 * v.jump2]);
}

export interface Request { min: number; max: number; }

// Min and max extra rating to send to one target, net of what is already committed there.
export function requestFor(threat: number, committed: number, minFactor = 1.3, maxFactor = 2.5): Request {
  return {
    min: neededRating(minFactor * threat, committed),
    max: neededRating(maxFactor * threat, committed),
  };
}

// Fleet threat memory: when the system is not seen this turn, keep 98% of the last value at least.
export function fleetThreatMemory(seen: number, previous: number, visible: boolean, decay = 0.98): number {
  return visible ? seen : Math.max(seen, decay * previous);
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module, engine target selection and commit rule). Parity-checklist row 4 (fight loop: aggro, chase, leash). Donor threat is per system and per AI turn; Frankendom would use it per target per server tick, so every decay constant needs retuning.
- today: no threat or commit model in `src/fight/`; the duel step is row 1 and the AI brain is row 2.
- Reuse tag: rewrite-from-idea (GPL-2.0 scripts, CC-BY-SA 3.0 content: clean-room, shape only)
- Brief rule served: 1 (one engine: commit and threat rules sit in src/fight, not in a client); many-on-one target selection lives in the engine; MAX_ATTACKERS = 3 still applies.
Best transferable idea: Commit attackers against the gap still uncovered, using a superlinear group rating, so a crowd of enemies reads as more threat than the sum of its members while a target out of sight decays slowly instead of vanishing.
Decision (proposed): adapt — keep the superlinear group threat and the commit-only-the-gap rule to decide how many of the three attacker slots a target needs, and the slow memory of a target out of view; reject the 4X supply, planet and tier system, which does not map onto a duel.
Acceptance: A server test asserts that three attackers of equal rating r give a group threat of 9r (not 3r), that a fourth attacker is queued rather than committed while three hold the target, and that a target out of view keeps at least 0.98 of its last threat for the next turn (retuned per server tick if adopted).

## 6. Gaps and risks

- Licence: GPL-2.0 scripts and CC-BY-SA 3.0 content. Clean-room only; the sketch follows the mechanism, not donor lines.
- The rating unit is attack x structure (`default_ship_stats`, `ShipCombatStats`), and the combine rule assumes attack is roughly structure (docstring of `combine_ratings.py`). Frankendom's duel rating must be checked against that assumption before it uses the formula.
- The donor is per AI turn. A per-tick version would need a different decay (0.98 per turn is not 0.98 per tick).
- The 4X ideas (supply tiers, planet threat, system priorities, interior and border systems) do not transfer to a duel and are not proposed.
- Frankendom's rule is server-verified kills. Threat is a commit decision only; it must not change damage or kills.
- Many-on-one: the donor has no concept of a player engaging a group. The combine rule is a guess at a crowd's weight until tested on the duel rating.
- Not read: how each fleet rating is computed; the sensing that fills the enemy lists (AIstate 437-529); the fleet picker. Any claim about those is unverified.
