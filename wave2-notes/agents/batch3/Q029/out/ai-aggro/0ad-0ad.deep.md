# 0ad-0ad (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/UnitAI.js` | Licence: GPL version 2 or later (as read, LICENSE.txt lines 17-18: "binaries/data/" then "GPL version 2 (or later) - see license_gpl-2.0.txt") | JavaScript | symbols `g_Stances`, `UnitAI.prototype.AttackEntitiesByPreference`, `UnitAI.prototype.ShouldAbandonChase`, `UnitAI.prototype.FindWalkAndFightTargets`; preference ranks in `Attack.js`

Checked: Read in full: the stance table `g_Stances` (UnitAI.js 80-166); `RespondToTargetedEntities`, `AttackVisibleEntity`, `AttackEntityInZone` (5011-5058); `ShouldAbandonChase` and `ShouldChaseTargetedEntity` (5105-5155); `FindWalkAndFightTargets` (5997-6080); `GetQueryRange` (6083-6122); `AttackEntitiesByPreference` (6410-6467); the idle `Attacked` and LOS handlers (1634-1656); the COMBAT `Attacked` handler (2041-2045); the FLEEING state (1986-2032); the CHASING state (2284-2340); `OnAttacked` (4313-4318); Attack.js `GetPreference` and its helpers (221-328, 370-410). Also read: `AIProxy.js` `OnAttacked` (346-349), `AttackDetection.js` `OnGlobalAttacked` (44-53), `tests/test_UnitAI.js` line 196 (the stub only), LICENSE.txt header and the per-directory licence list. Not read: the C++ code that posts the `Attacked` message (the field names `target`, `attacker`, `type` are taken from how UnitAI uses them); the range manager's list order (which decides "first in the list" in `AttackVisibleEntity`); bodies of `CheckTargetIsInVisionRange`, `CheckTargetDistanceFromHeldPosition` and `CheckTargetRangeExplicit`; `Attack.CanAttack`; the template default for `FleeDistance`. Confidence: high on the stance table, the order of the target choice, the chase check and the flee rule; medium on the exact meaning of the hold-radius check (its body was not read). camera_scope: not applicable (ai-aggro cell). Candidate files opened: UnitAI.js, Attack.js, AIProxy.js, AttackDetection.js, tests/test_UnitAI.js, LICENSE.txt (6 files).

## 1. Mechanism

- There is no aggro meter. A unit's behaviour comes from its stance: a named row in a constant table (`g_Stances`, UnitAI.js:80) of booleans. The flags are `targetVisibleEnemies` (anything in vision is a candidate), `targetAttackersAlways` (anything that hurts the unit is a candidate, even over a forced order), and the response flags `respondChase`, `respondChaseBeyondVision`, `respondStandGround`, `respondHoldGround` and `respondFlee` (the comment block at UnitAI.js:65-79 states each one). The `violent` row sets `targetAttackersAlways` and `respondChaseBeyondVision` (UnitAI.js:83, 87); `defensive` sets `respondHoldGround` (111); `standground` sets `respondStandGround` (132); `skittish` sets `respondFleeOnSight` (140).
- Three triggers can start a fight, each checked against the stance:
  1. A new enemy enters the unit's attack-range query. If the unit is idle and the stance has `targetVisibleEnemies`, the new entities go to `AttackEntitiesByPreference` (UnitAI.js:1655-1656).
  2. The unit is hit. If idle, it answers the attacker when `targetAttackersAlways` is set or the current order is not forced (1634-1636). In the COMBAT state (the parent of attacking and chasing), only a `Melee` hit can redirect it, and only under the same condition (2041-2045). In the FLEEING state, the hit counts only if the hit entity is no farther from the unit than the flee target (2013-2021, the check at 2018); an attack by the flee target itself is ignored (2014).
  3. A walk-and-fight order re-scans the attack-range query (`FindWalkAndFightTargets`, 5997).
- Target choice by preference (the core rule). Each attack type lists `PreferredClasses` in descending order (Attack.js:7, 221). `GetPreference` returns the lowest index of a preferred class that the target carries, or undefined if none (Attack.js:305-328). Index 0 returns at once (321-322). `RestrictedClasses` marks targets that cannot be attacked at all (Attack.js:17, 291).
  - `AttackEntitiesByPreference` (6410-6467): filter by `CanAttack` and by ownership or animal rules; a rank-0 entity is answered at once (6442); other entities are grouped by rank; groups are tried in ascending rank (6460-6462); entities with no rank are tried last (6466).
  - `FindWalkAndFightTargets` (5997-6080) does the same on the walk-and-fight path: a rank-0 entity is attacked at once (6056); otherwise the first entity in the best rank group is attacked (bestPref at 6048; the group filter at 6070).
- Response by stance (`RespondToTargetedEntities`, 5045-5067): chase or standground → `AttackVisibleEntity` (5050-5054), which attacks the first entity in the group that `CanAttack` (5013-5017). Holdground → `AttackEntityInZone` (5056-5057), which requires the target to be inside the hold distance and, unless `respondChaseBeyondVision` is set, inside vision (5026-5040). Flee → push a Flee order on the first entity (5059+).
- Range that decides what is seen (`GetQueryRange`, 6083-6122): vision is the base. Chase looks out to full vision (6106-6107). Standground uses the weapon's min..min(range, vision) (6103-6104). Holdground uses min(range + vision / 2, vision) (6113). The attack-range query is the source of the candidates above.
- Chase (CHASING state, 2284-2340). Entering the state moves toward the target's attack range; if the target is fleeing the unit runs (2303). A 1000 ms repeating timer starts (2306). On each tick `ShouldAbandonChase` runs (2316). It returns true (abandon) when: the target is not visible (5107); the stance holds ground and the target is outside the hold distance (5124-5125); the stance does not chase beyond vision and the target is out of vision (5129-5130). A guard keeps chasing while its guarded unit is in attack range (5114-5122, read). `ShouldChaseTargetedEntity` (5140-5155) only lets a stance with `respondChase` start a chase (guards excepted).
- Flee (FLEEING state, 1986-2032). On entry the unit sets `distanceToFlee` = current distance to the target + the template `FleeDistance` (1989), and runs (MoveToTargetRange at 1992-1993). It finishes when the target is beyond that distance (2030).
- Order of work on a new fight: the idle LOS handler picks a target by rank and stance (1655-1656); the chosen order (Attack) enters CHASING or ATTACKING; the 1 s timer then drops the chase when the abandon rule fires; a dropped chase returns the unit to idle, and a holdground unit walks back to its held position (2320-2321).

## 2. Key functions

- `g_Stances`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/UnitAI.js` 80-166. The constant table of stances, read in full.
- `UnitAI.prototype.AttackEntitiesByPreference`: UnitAI.js 6410-6467. Rank grouping and the order of groups, read in full.
- `UnitAI.prototype.RespondToTargetedEntities`: UnitAI.js 5045-5067. Stance-to-response dispatch.
- `UnitAI.prototype.AttackVisibleEntity`: UnitAI.js 5011-5018. First attackable entity in list order.
- `UnitAI.prototype.AttackEntityInZone`: UnitAI.js 5026-5040. Holdground target filter.
- `UnitAI.prototype.ShouldAbandonChase`: UnitAI.js 5105-5133. The chase-abandon rule.
- `UnitAI.prototype.ShouldChaseTargetedEntity`: UnitAI.js 5140-5155.
- `UnitAI.prototype.FindWalkAndFightTargets`: UnitAI.js 5997-6080. Walk-and-fight target scan, read in full.
- `UnitAI.prototype.GetQueryRange`: UnitAI.js 6083-6122. Range per stance, read in full.
- `Attack.prototype.GetPreference`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Attack.js` 305-328. Lowest preferred index.
- The CHASING and FLEEING states: UnitAI.js 2284-2340 and 1986-2032.
- Attacked handlers: UnitAI.js 1634-1636 (idle), 2013-2021 (flee), 2041-2045 (combat).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A stance is a row of booleans that says whom to target and how to respond | The rows themselves (UnitAI.js:80-166); `violent` sets `targetAttackersAlways` (83) |
| Rank by a preference list; rank 0 is taken at once | Class lists per attack type, in descending order (Attack.js:7, 221); rank 0 at once (Attack.js:321-322; UnitAI.js:6442) |
| Groups tried best first; unranked last | Ascending rank order (UnitAI.js:6460-6466) |
| Chase check on a fixed repeating timer | 1000 ms, start and repeat (UnitAI.js:2306) |
| Leash by vision, with an exception per stance | Vision range (6106-6107); `respondChaseBeyondVision` (5129) |
| Hold radius from range and vision | min(range + vision / 2, vision) (UnitAI.js:6113) |
| Flee to a set distance beyond the current gap | `FleeDistance` from the template (UnitAI.js:1989); the template default was not read |
| Melee-only redirect while already in combat | Melee check (UnitAI.js:2044) |

## 4. TypeScript sketch

simplified: the sketch keeps the stance rows, the rank grouping, the chase check, the flee goal and the three retaliation rules. It uses Euclidean distance everywhere, where the donor's vision and hold checks (bodies not read) may use other metrics. It takes list order from the input array; the donor's list order comes from the range manager and was not read. It omits the guard exception, ownership and animal filters, `CanAttack` (it is a parameter), formation controllers, the healer path, the Flee order itself, the Capture attack type, the path-based range checks, and the forced-order interruption rules beyond the single `forced` flag. The ordering inside the sketch matches the donor's: a rank-0 entity wins at once, then the best group, then unranked entities.

```ts
// Licence: GPL version 2 or later (donor binaries/data/, LICENSE.txt). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
interface Stance {
  targetVisibleEnemies: boolean;   // anything in vision is a candidate
  targetAttackersAlways: boolean;  // anything that hurts us is a candidate, even over a forced order
  respondChase: boolean;           // chase the candidate
  respondChaseBeyondVision: boolean;
  respondHoldGround: boolean;      // attack only inside the hold radius
  respondFlee: boolean;            // run instead of fighting
}

// Rows copied as values from the donor's stance table (one row per stance name).
const STANCES: Record<string, Stance> = {
  violent:    { targetVisibleEnemies: true,  targetAttackersAlways: true,  respondChase: true,  respondChaseBeyondVision: true,  respondHoldGround: false, respondFlee: false },
  aggressive: { targetVisibleEnemies: true,  targetAttackersAlways: false, respondChase: true,  respondChaseBeyondVision: false, respondHoldGround: false, respondFlee: false },
  defensive:  { targetVisibleEnemies: true,  targetAttackersAlways: false, respondChase: false, respondChaseBeyondVision: false, respondHoldGround: true,  respondFlee: false },
  passive:    { targetVisibleEnemies: false, targetAttackersAlways: false, respondChase: false, respondChaseBeyondVision: false, respondHoldGround: false, respondFlee: true },
};

type Pt = { x: number; y: number };
interface Ent { id: number; pos: Pt; classes: string[]; visible: boolean; }
interface Unit { pos: Pt; stance: Stance; forced: boolean; vision: number; holdPos: Pt; holdRange: number; }

const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

// Hold-ground query radius: the range plus half the vision, capped at vision.
const holdQueryRange = (range: number, vision: number): number => Math.min(range + vision / 2, vision);

// Preference rank: index of the first preferred class the entity carries (0 = best). Undefined = no match.
function rank(classes: string[], preferred: string[]): number | undefined {
  const i = preferred.findIndex(c => classes.includes(c));
  return i < 0 ? undefined : i;
}

// Rank-0 entities are taken at once; otherwise the best rank group wins, first attackable in list order.
function pickTarget(ents: Ent[], preferred: string[], u: Unit, canAttack: (e: Ent) => boolean): Ent | undefined {
  const groups = new Map<number, Ent[]>();
  const unranked: Ent[] = [];
  for (const e of ents) {
    if (!canAttack(e)) continue;
    if (u.stance.respondHoldGround && dist(e.pos, u.holdPos) > u.holdRange) continue;
    const r = rank(e.classes, preferred);
    if (r === 0) return e;
    if (r === undefined) { unranked.push(e); continue; }
    const g = groups.get(r) ?? [];
    g.push(e);
    groups.set(r, g);
  }
  const best = [...groups.keys()].sort((a, b) => a - b)[0];
  if (best !== undefined) return groups.get(best)?.[0];
  return unranked[0];
}

// Retaliation rules by state. Idle: answer the attacker if the stance says so or the order is not forced.
function respondIdle(u: Unit): boolean {
  return u.stance.targetAttackersAlways || !u.forced;
}
// In combat only melee hits can redirect the unit (the donor's COMBAT state).
function redirectInCombat(type: 'Melee' | 'Ranged', u: Unit): boolean {
  return type === 'Melee' && (u.stance.targetAttackersAlways || !u.forced);
}
// While fleeing, a hit counts only if the hit entity is no farther away than the flee target.
function redirectWhileFleeing(u: Unit, hit: Ent, fleeTarget: Ent, attackerIsFleeTarget: boolean): boolean {
  if (attackerIsFleeTarget) return false;
  if (dist(u.pos, hit.pos) > dist(u.pos, fleeTarget.pos)) return false;
  return u.stance.targetAttackersAlways || !u.forced;
}

// Chase check, run every 1000 ms while chasing. Drop the chase when the target is hidden, outside the hold radius
// (hold stances), or out of vision (unless the stance chases beyond vision).
const CHASE_CHECK_MS = 1000;
function shouldAbandonChase(u: Unit, target: Ent): boolean {
  if (!target.visible) return true;
  if (u.stance.respondHoldGround && dist(target.pos, u.holdPos) > u.holdRange) return true;
  if (!u.stance.respondChaseBeyondVision && dist(u.pos, target.pos) > u.vision) return true;
  return false;
}

// Flee: keep running until the target is at least the current distance plus the flee distance away.
function fleeGoalDistance(u: Unit, target: Ent, fleeDistance: number): number {
  return dist(u.pos, target.pos) + fleeDistance;
}
function fleeDone(u: Unit, target: Ent, goal: number): boolean {
  return dist(u.pos, target.pos) >= goal;
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (proposed; Frankendom's current module layout was not read). The engine-side stance table (one row per enemy profile), the rank pick for many-on-one target choice, the 1 s chase check made into a server-tick count, and the flee goal. The client shows the state only. Parity-checklist row 4 (fight loop: aggro, chase, leash). Row 2 (AI brain) also applies because the stance table is the brain's profile.
- Reuse tag: rewrite-from-idea (GPL version 2 or later; clean-room only; no lines copied)
- Brief rule served: 1 (one engine decides target choice, chase and flee; the client only renders). Many-on-one target choice lives in the engine.

## 6. Gaps and risks

- GPL-2.0-or-later code. The sketch is written from the described rules and copies no donor line. Frankendom should not paste or port the donor code.
- Tie-break is list order. Within one rank group the donor attacks the first attackable entity in the range-query list (`AttackVisibleEntity`, 5013). The list order was not read, so it may not be nearest-first. Frankendom must name its own tie-break (nearest, then id) and test it. The sketch uses input order only for the simplified version.
- No attacker cap. Every unit decides alone, so a pack can surround a player with no limit. Frankendom's MAX_ATTACKERS = 3 must be a separate engine gate after the stance returns "attack". The donor gives no pattern for it.
- Time unit. The donor's chase check is 1000 ms of wall time on a timer. Frankendom's duels run on server ticks, so the 1 s check becomes a tick count; for fast duels that is too slow, and it fits only zone NPCs that chase.
- Dead code. `Attack.prototype.CompareEntitiesByPreference` (Attack.js:395-402) tests for `null`, but `GetPreference` returns `undefined`, so the comparator would return NaN. It is not called from UnitAI.js (only the test stubs at tests/test_UnitAI.js:196 and 384 reference it). Do not copy it.
- Hold radius is measured by a check whose body was not read. Frankendom should define the hold radius as a number in zone data and test it.
- Flee distance depends on the template's `FleeDistance` (default not read). Frankendom should keep it as unit data with an explicit default.
- The donor's "attacked by its flee target" rule (2014) and "nearer than the flee target" rule (2018) are useful, but the second depends on the meaning of `msg.data.target` in the C++ message (not read).
- Not read: the C++ message code, the range-manager list order, the vision and hold check bodies, `CheckTargetRangeExplicit`.

Best transferable idea: A unit's aggression is a named stance row of booleans (who to target, whether to chase, how far to leash), and it picks its target by a ranked class list, taking a rank-0 match at once.
Decision (proposed): adapt - take the stance rows as enemy profile data and the ranked class list as the many-on-one target rule; replace the 1000 ms wall-time chase check with a server-tick count and add MAX_ATTACKERS = 3 as a separate engine gate, which the donor does not have.
Acceptance: A server test asserts that a `defensive` foe with hold radius 6 attacks a player who steps within 6 tiles and ignores one at 7 tiles, and that a `violent` foe keeps chasing a player until the player is out of its vision at one check.

Reuse tag: rewrite-from-idea (GPL version 2 or later; clean-room only)
Brief rule served: 1 (one engine decides target choice, chase and flee; the client only renders)
