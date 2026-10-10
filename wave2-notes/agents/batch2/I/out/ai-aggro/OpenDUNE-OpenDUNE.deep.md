# OpenDUNE-OpenDUNE (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` | Licence: GPL-2.0 (README.txt line 8: "licensed under the GNU General Public License version 2.0"; COPYING is the GPL v2 text; I did not find per-file licence headers in unit.c) | C | symbol `Unit_FindBestTargetEncoded`

Checked: The hint file `table/teamaction.c` is only a 14-line list of five team-action names (Normal, Staging, Flee, Kamikaze, Guard) and is the wrong file. The real mechanism is in `unit.c` (`Unit_GetTargetUnitPriority` 743-780, `Unit_FindBestTargetUnit` 923-974, `Unit_FindBestTargetStructure` 2275-2323, `Unit_FindBestTargetEncoded` 2396-2432, `Unit_GetTargetStructurePriority` 2562-2578), all read in full, plus two callers: `Script_Team_FindBestTarget` (`script/team.c` 256-287) and the `Script_Unit_FindBestTarget` wrapper (`script/unit.c` 80-86). What mode values the unit bytecode scripts pass is NOT read (the scripts are binary data, not in the C files). Confidence: high on the scoring, medium on how often each mode is used. Flee and retreat behaviour (`ACTION_RETREAT`, unit.c 1593) and the sandworm variant (`Unit_Sandworm_GetTargetPriority`) were not read.

## 1. Mechanism

- Target choice is stateless: no threat memory, no hate list. Each time a unit (or a team) asks, every candidate is scored and the highest score wins. Re-asking later can give a different answer as distances change.
- Score of a mobile enemy (unit.c 743-780): return 0 when the candidate is the seeker, not allocated, not seen by the seeker's side (fog flag, 754), allied (756), or flagged as not targetable (761). Winged (air) targets score 0 unless the seeker has the `targetAir` flag (763-764). Otherwise `weight = priorityTarget + priorityBuild` of the target's TYPE (a table value), `distance` = tiles rounded (octagonal distance + half a tile, shifted down by 8), and `score = weight / distance + 1` (distance 0 keeps the plain weight), capped at 0x7D00 (776-779).
- Score of a structure (2562-2578): same gates for allied and seen, `weight / distance` (NO +1, so a structure farther than its weight in tiles scores 0 and cannot be chosen), capped at 32000.
- Scan (923-974): loop over every unit, skip by `mode`, keep the best with a STRICT greater-than, so the first candidate wins ties. `mode 0` and `mode 4` have no range limit; `mode 1` keeps candidates within the weapon's fire distance of the seeker's current position; `mode 2` keeps candidates within TWICE the fire distance of the seeker's ORIGIN tile (a leash around where it started, set the first time, 934-937). Fire distance is in tiles, times 256 world units (940-941). A best score of 0 means "no target".
- Structure scan (2275-2323) is the same shape, skips walls and slabs (2299), and keeps the best with greater-or-equal, so the LAST candidate wins ties.
- Chooser (2396-2432): `mode 4` takes the best structure first and only if there is none takes the best unit. Otherwise it finds the best unit, finds the best structure (the deviator unit type never targets structures, 2418), and if both exist re-scores both and returns the structure when `structureScore >= unitScore` (2425). Result is an encoded id (type + index), 0 for none.
- Team level (script/team.c 256-287): walk the units of the house, skip those not in this team (275), and ask each member in pool order with `mode 4` for Kamikaze teams and `mode 0` otherwise (276). The FIRST member that returns a target ends the scan; if it equals the team's stored target, nothing changes; else the target and a target tile in that direction are stored (278-281). So the team target is whatever the first member that sees something prefers.
- Tick: the team brain is not every frame. `GameLoop_Team` (team.c 22-63) returns early until a timer `s_tickTeamGameLoop` passes, then schedules the next run `5 + (random & 7)` game ticks later (26-27), so 5 to 12 ticks with jitter. Per team: skip if the house AI is off (48), count down the team script's delay (50-51), else run the team script one step. This is variable jitter on a timer, not a fixed step with an accumulator. The game timer's own step rate was not read.

## 2. Key functions

- `Unit_GetTargetUnitPriority`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` 743-780. Score of one enemy unit for one seeker.
- `Unit_FindBestTargetUnit`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` 923-974. Scan with range modes, strict-greater tie rule.
- `Unit_FindBestTargetStructure`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` 2275-2323. Same for buildings, greater-or-equal tie rule.
- `Unit_FindBestTargetEncoded`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` 2396-2432. Unit vs structure decision, kamikaze order.
- `Unit_GetTargetStructurePriority`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` 2562-2578.
- `Script_Team_FindBestTarget`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/script/team.c` 256-287. Team asks members in order. I read this caller and the unit-script wrapper (`script/unit.c` 80-86, one line that forwards the script's mode); other callers of the chooser: none found by grep.
- `GameLoop_Team`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/team.c` 22-63. The throttled team brain loop.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score = type weight / distance (+1), per-type table value, capped | Weights: Saboteur unit 700 (unitinfo.c 488), Heavy Factory 600 (structureinfo.c 308), Wall 30 (structureinfo.c 958); caps 0x7D00 and 32000 (theirs, unit.c 779 and 2578) |
| Hard gates score 0: self, ally, unseen, flagged not-targetable, air without anti-air | The air flag and `seenByHouses` fog bitmask are Dune specifics; the gate shape transfers |
| Range modes: any, near the seeker, near the home point (leash, 2x reach) | Reach = fire distance tiles x 256 (theirs, 940); mode numbers 0/1/2/4 |
| Tie rules differ by kind (first wins vs last wins; structure beats unit on a tie) | None (the comparison operators) |
| Team target = first member that finds anything; modes differ by team action | Kamikaze = mode 4 (theirs, script/team.c 276) |
| Brain throttle: next run in 5 + (random & 7) ticks | 5 and 7 (theirs, team.c 27) |

## 4. TypeScript sketch

simplified: the sketch keeps the scoring formula, the two kinds (mobile vs objective) with their opposite tie rules, the range modes, the objective-first mode and the team "first member wins" rule. It omits the air flag, the not-targetable flag, the map-validity checks, the deviator exception, the encoded-id output, and the throttle timer (see section 1). Structures become "objectives" (a zone spawner or totem). It does not cap attackers per target, which Frankendom needs (MAX_ATTACKERS = 3).

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Pt { x: number; y: number }          // world units; 256 per tile in the donor
interface Seeker { pos: Pt; origin: Pt; fireRange: number /* tiles */ }
interface Candidate {
  id: string;
  pos: Pt;
  basePriority: number;      // data field per creature/object type (build + target priority in the donor)
  hostile: boolean;
  seen: boolean;             // the seeker's side has line of knowledge (fog flag)
  isObjective: boolean;      // donor: a structure; here: a zone objective such as a spawner or totem
}
type Mode = 'any' | 'inRange' | 'leash' | 'objectivesFirst';

// octagonal distance: longer axis plus half the shorter axis
function dist(a: Pt, b: Pt): number {
  const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
  return dx > dy ? dx + (dy >> 1) : dy + (dx >> 1);
}
const tilesRounded = (a: Pt, b: Pt): number => (dist(a, b) + 0x80) >> 8;
const CAP = 0x7d00; // 32000

// Score one candidate: static type weight divided by distance. Unit form adds 1; objective form does not.
function score(s: Seeker, c: Candidate): number {
  if (!c.hostile || !c.seen) return 0;
  const d = tilesRounded(s.pos, c.pos);
  let p = c.basePriority;
  if (d !== 0) p = c.isObjective ? Math.floor(p / d) : Math.floor(p / d) + 1;
  return Math.min(p, CAP);
}

function inReach(s: Seeker, c: Candidate, mode: Mode): boolean {
  const reach = s.fireRange * 256;
  if (mode === 'inRange') return dist(s.pos, c.pos) <= reach;
  if (mode === 'leash') return dist(s.origin, c.pos) <= reach * 2;
  return true; // 'any' and 'objectivesFirst' have no range gate
}

// Best of one kind. Mobile targets: first wins a tie (strict >). Objectives: last wins a tie (>=).
function best(s: Seeker, cs: Candidate[], mode: Mode, objectives: boolean): { c: Candidate; p: number } | null {
  let pick: Candidate | null = null, bp = 0;
  for (const c of cs) {
    if (c.isObjective !== objectives || !inReach(s, c, mode)) continue;
    const p = score(s, c);
    if (objectives ? p >= bp : p > bp) { pick = c; bp = p; }
  }
  return bp === 0 || pick === null ? null : { c: pick, p: bp };
}

function chooseTarget(s: Seeker, cs: Candidate[], mode: Mode): Candidate | null {
  const mobile = best(s, cs, mode, false);
  const obj = best(s, cs, mode, true);
  if (mode === 'objectivesFirst') return obj ? obj.c : mobile ? mobile.c : null;
  if (mobile && obj) return obj.p >= mobile.p ? obj.c : mobile.c; // objective wins ties
  return mobile ? mobile.c : obj ? obj.c : null;
}

// Team level: members are asked in pool order; the first member that finds anything sets the team target.
function teamTarget(members: Seeker[], cs: Candidate[], mode: Mode, current: Candidate | null): Candidate | null {
  for (const m of members) {
    const t = chooseTarget(m, cs, mode);
    if (t === null) continue;
    return t === current ? current : t;
  }
  return null;
}

```

## 5. Lands in

- TARGET `src/fight/ai-target.ts` (new module, the engine's target chooser used by the AI brain, called from the aggro/chase step). Parity-checklist row 2 (AI brain); the chase and leash use is row 4. Per-creature weight and reach are catalogue fields (rows 20-21).
- today: not mapped to a current file in this pass (not read).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 5 (many-on-one: hate list and target selection in the engine); rules 7-9 n/a

Best transferable idea: score each hostile as (type weight / distance) + 1 with hard gates scoring 0, then pick the highest, with a home-point leash mode for chase limits.

## 6. Gaps and risks

- GPL-2.0: clean-room only; the sketch is written from the mechanism.
- No hate list or damage memory. Frankendom's many-on-one logic needs one; this idea only gives the base preference. Use the score as the tie-breaker among hostiles and add a threat bonus on top.
- Pure distance division means the nearest enemy dominates. That fits a many-vs-one pack, but a player can kite by distance. A stickiness bonus on the current target is not in the donor.
- No cap on how many seekers pick the same target. Frankendom's MAX_ATTACKERS = 3 must be applied after scoring (a slot check that makes the seeker take its next-best), not inside it.
- Jittered 5-12 tick throttle with random numbers is not deterministic for a server-verified fight record unless the random source is the seeded one. Frankendom should use a fixed step with a per-tick budget.
- Weights and reach are data per creature type: put them in the catalogue and zone data, not in code.
- Mode constants 0/1/2/4 are magic numbers in the donor; use a named enum.
