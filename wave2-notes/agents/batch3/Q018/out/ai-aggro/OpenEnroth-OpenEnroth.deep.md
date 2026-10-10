# OpenEnroth-OpenEnroth (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Actor.cpp` | Licence: LGPL-3.0 (repo `LICENSE`: GNU Lesser General Public License v3, 29 June 2007; no per-file licence header) | C++ | symbol `Actor::_SelectTarget` (plus `Actor::UpdateActorAI`, `Actor::AI_Flee`, `Actor::AI_Pursue3`)

Checked: `Actor::_SelectTarget` is defined at Actor.cpp 2033 and was read in full (2033-2118). The decision block of `Actor::UpdateActorAI` (defined 2450) was read from 2556 to about 2800, and the background loop from 2473 to 2520. `AI_Flee` (1875-1916), `AI_Pursue3` (1973-2030), `MakeActorAIList_ODM` (3854-3902), `MakeActorAIList_BLV` (3906-3992), `Detect_Between_Objects` (3996-4075, range and outdoor/sector cases only) and `GetActorsRelation` (2122, body read to about 2170) were read. The hint file `src/Engine/Objects/ActorEnums.h` was read: it holds the state enum and the comment at line 100 ("nearest 30 actors ... where the ai will attack/ flee/ cast spells/ wander"), so it describes the mechanism but is not the implementation. Callers: `_SelectTarget` has four callers, `Actor.cpp:2556` (read) and `TurnEngine.cpp` 656, 857 and 998 (not read; turn-based mode). Not read: the spell and ranged branches after about line 2800, the portal trace inside `Detect_Between_Objects`, the `Actor` fields `monsterInfo.hp` and `radius` (definitions not read), `GetDirectionInfo`. Confidence: high on target selection, the flee threshold and the chase numbers; medium on the complete order of the decision block (tail not read).

## 1. Mechanism

- Three stages run each game tick. (a) An active-set pass (`MakeActorAIList_ODM` outdoors, `MakeActorAIList_BLV` indoors, called at the top of `UpdateActorAI`, 2468-2470) decides which monsters get the full AI. (b) Target search (`_SelectTarget`, called per full-AI monster at 2556) picks one foe. (c) The decision block (2636-2800) picks one action from the monster's state, its flee rules, and the distance to the target.
- (a) Outdoors (3854-3902): each actor that can act is measured by octagonal distance to the party minus its radius. Within 5632 it is marked active; within 5120 it raises the party's yellow alert, and within 307 red alert (3875-3881). Active actors are stable-sorted by that distance (3893) and the first `MaxActiveAIActors` (config default 30, `GameConfig.h:269`) get `ACTOR_FULL_AI_STATE` (3897-3899). Indoors (3906-3992): actors within 10240 are candidates; the first 30 that already flag as nearby or pass `Detect_Between_Objects` are taken (3952-3955); then every actor that can act in the party's sector is added; then previously-detected actors are added; the first `configLimit` entries get the full-AI flag. Monsters outside that set get a background update (partly read, 2473-2520).
- (b) `_SelectTarget` (2033-2118). It loops over every actor and skips dead, dying, removed, summoned and disabled actors and itself (2059-2061). A foe is skipped if the relation is FRIENDLY, except on the retaliation branch described below (2064-2075), which skips only same-group actors and uses LONG range. The monster's range tier is its own stats tier when it is not FRIENDLY (2077-2078), so the pair relation only filters friends; the range comes from the monster. Range table (`_4DF380_hostilityRanges`, 55-60): CLOSE 1024, SHORT 2560, MEDIUM 5120, LONG 10240. A foe is a candidate when |dx|, |dy| and |dz| are each within the tier range (2084), `Detect_Between_Objects` is true (2085), and the squared distance is below the best so far (2087-2088). The loop keeps the nearest candidate. After the loop, the party (`Pid(OBJECT_Character, 0)`) is tested only if `can_target_party` is set and the party is not invisible (2097). The party's relation is LONG for an ActorEnemy monster that is not enslaved, charmed or summoned, and the table value otherwise; a FRIENDLY relation skips it (2098-2104). For a hostile monster the party is tested against LONG range (2107-2109), whatever the monster's own tier, and it replaces the monster target if it is inside that box and closer by squared distance than the best foe (2113-2115).
- Retaliation: when `lastCharacterIdToHit` is set (written in `ActorDamageFromMonster` at 2286 when a monster hits a monster), the first branch is skipped and the tier is forced to LONG (2075). The guard at 2064 compares against `Pid(OBJECT_Actor, v5)`, and `v5` is set to 0 at 2050 and never advanced in the loop, so as read the forced branch only applies when the last hitter is actor 0. The forced LONG is overwritten at 2077 for every non-friendly monster, so it only matters for FRIENDLY-typed monsters. (As read; the behaviour was not run.)
- (c) Decision block, per full-AI monster each tick (2556-2800). The target is re-picked (2556). A non-friendly monster with no target is set FRIENDLY for that tick (2558-2559). The flee and attack distances are `distanceToTarget` minus the monster radius and, for an actor target, minus its radius (2690-2692); the attack gate is `v81 < 5120` (2697). Order of checks: (1) afraid buff: at distance 10240 or more, a random move; otherwise flee (2658-2663). (2) WIMP type: stationary monsters stand, others flee (2668-2673). (3) If not already fleeing, NORMAL types flee when base hp times 0.2 is above current hp, AGGRESSIVE types when base hp times 0.1 is above current hp, and only when the target is within 10240 (2679-2684). (4) Otherwise choose an attack ability. For a melee monster without a missile, if the distance is at or beyond `radiusMultiplier * meleeRange` (0.5 for actor targets, 1.0 for the party; 2564) the monster stands if stationary, runs (`AI_Pursue3`) at 1024 or more, and follows (`AI_Pursue2`) below that (2715-2722). Inside melee range it melees once recovery time is 0 (2728), or stands while recovering.
- Movement commands. `AI_Flee` (1875-1916): a treant always stands or idles instead (1892-1893). Otherwise, if the flee target is an actor and the distance from the monster to the party (`GetDirectionInfo` against `Pid::character(0)`, 1890) is under meleeRange, it stands or idles instead (1893-1895). Otherwise it sets the state to Fleeing, sets action length to distanceXZ * 128 / moveSpeed capped at 256 ticks (1902), and sets yaw to target yaw + 512 plus random(0..1023) (1904-1907). That spreads the heading over 90 degrees either side of straight away. `AI_Pursue3` (1973-2030): stops if inside meleeRange (2002); when no fixed action length is passed, action length is distanceXZ * 128 / moveSpeed capped at 128 ticks (2014); yaw is the direction plus or minus 256 (45 degrees) chosen at random (2017-2020); state Pursuing.
- Tick: `UpdateActorAI` is the per-game-tick AI update. Recovery and action timers advance by `gameTimer->dt()` (2601 and the action-time line after it), and the target is re-picked in the same pass. How `dt()` is produced was not read, so this note does not say whether the step is fixed or variable.

## 2. Key functions

- `Actor::_SelectTarget`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Actor.cpp` 2033-2118. Nearest candidate in the monster's tier box, then the party test at LONG range.
- `Actor::GetActorsRelation`: same file, 2122 onward. Returns the relation between two actors or the party, with group and charm/berserk/enslaved overrides.
- `Actor::UpdateActorAI`, decision block: same file, 2636-2800 (read to about 2800). Afraid, WIMP, NORMAL/AGGRESSIVE flee, then attack-or-approach choice.
- `Actor::AI_Flee`: same file, 1875-1916. Flee heading and action length.
- `Actor::AI_Pursue3`: same file, 1973-2030. Pursue heading jitter and action length.
- `Actor::MakeActorAIList_ODM`: same file, 3854-3902. Outdoor active set, alert radii, first-N full-AI selection.
- `Actor::MakeActorAIList_BLV`: same file, 3906-3992. Indoor active set.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Target = nearest foe inside a per-monster range box, with a line-of-sight test | Tier ranges CLOSE 1024 / SHORT 2560 / MEDIUM 5120 / LONG 10240 (theirs, Actor.cpp 55-60) |
| Party is checked last at the longest range for hostile monsters | LONG range 10240 for the party, whatever the monster's tier (theirs, 2107-2109) |
| Flee when hp falls below a share of base hp, by AI type | Share 0.2 for NORMAL, 0.1 for AGGRESSIVE (theirs, 2679, 2681); WIMP always (2668); flee only inside 10240 (2683) |
| Flee heading spread over a half turn around straight away | Offset 512 plus random 0..1023 of a 2048 turn (theirs, 1904 and 1907) |
| Pursuit wobble | Plus or minus 256 of a 2048 turn, i.e. 45 degrees (theirs, 2017-2020; TrigLut.h 12-13) |
| Engagement distance gate | 5120 (theirs, 2697); melee range 307.2 (theirs, mm7_data.h 112) |
| Active set: nearest N get the AI, others idle | N = 30 (config default, GameConfig.h 269); activation 5632 outdoor, 10240 indoor (theirs, 3875, 3930) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for target choice (nearest foe in the monster's tier box, then the party at the longest tier, last) and the flee and pursue headings. It omits the relation table and the friend skip, same-group skip, charm, berserk and enslaved overrides, the invisible-party check, the retaliation branch and its `v5` comparison (not reproduced on purpose), the actor and monster radii in the distances, the afraid and WIMP-stationary branches, the spell and ranged branches, the attack-recovery timing, the active-set builders, and every animation and sound call. `wantsToFlee` uses the maxHp argument as the donor's base hp field (not read), and treats only the three AI kinds in the sketch's type. The sketch reorders nothing else.

```ts
// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Angles: 2048 units per full turn (donor TrigLut). Ranges are donor map units.
const FULL_TURN = 2048;
const HALF_PI = 512;
const PI = 1024;
const QUARTER_PI = 256;
const TIER_RANGE = [0, 1024, 2560, 5120, 10240]; // index = hostility tier (0 friendly, 4 long)
const PARTY_TIER = 4;                              // hostile monsters look at the party at the longest tier

interface Body { x: number; y: number; z: number; }
interface Foe extends Body { id: number; alive: boolean; }
interface Mob extends Body { id: number; tier: number; hp: number; maxHp: number; kind: "normal" | "aggressive" | "wimp"; }

type Target = { kind: "foe"; id: number } | { kind: "party" } | null;

// Nearest foe inside the mob's tier box that it can see; the party is considered last, at PARTY_TIER.
function selectTarget(self: Mob, foes: Foe[], party: Body, partyVisible: boolean, sees: (f: Foe) => boolean): Target {
  const range = TIER_RANGE[self.tier];
  let best: Target = null;
  let bestD2 = Infinity;
  for (const f of foes) {
    if (!f.alive || f.id === self.id) continue;
    const dx = Math.abs(f.x - self.x), dy = Math.abs(f.y - self.y), dz = Math.abs(f.z - self.z);
    if (dx > range || dy > range || dz > range) continue;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < bestD2 && sees(f)) { bestD2 = d2; best = { kind: "foe", id: f.id }; }
  }
  if (partyVisible) {
    const pr = TIER_RANGE[PARTY_TIER];
    const dx = Math.abs(party.x - self.x), dy = Math.abs(party.y - self.y), dz = Math.abs(party.z - self.z);
    const d2 = dx * dx + dy * dy + dz * dz;
    if (dx <= pr && dy <= pr && dz <= pr && d2 < bestD2) best = { kind: "party" };
  }
  return best;
}

// Flee below a share of base hp for normal and aggressive types; wimps flee at any hp.
function wantsToFlee(m: Mob, distanceToTarget: number): boolean {
  if (m.kind === "wimp") return true;
  const share = m.kind === "normal" ? 0.2 : 0.1;
  return m.maxHp * share > m.hp && distanceToTarget < TIER_RANGE[4];
}

// Flee heading: target yaw + a quarter turn + a random half turn, so it spreads over the 90 degrees either side of straight away.
function fleeYaw(targetYaw: number, rnd: () => number): number {
  return (targetYaw + HALF_PI + Math.floor(rnd() * PI)) & (FULL_TURN - 1);
}

// Pursue heading: aim at the target with a random 45-degree wobble to either side.
function pursueYaw(targetYaw: number, rnd: () => number): number {
  return (targetYaw + (rnd() < 0.5 ? QUARTER_PI : -QUARTER_PI)) & (FULL_TURN - 1);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (AI brain: target choice, flee, pursue). Parity-checklist row 2 (AI brain).
- today: (not checked) the Frankendom repo was not opened in this pass; treat `src/fight/ai.ts` as the intended home.
- Reuse tag: rewrite-from-idea (LGPL-3.0: clean-room, shape only)
- Brief rule served: 1 (one engine: target search and flee live in the engine, not the client); MAX_ATTACKERS = 3 is not in the donor (gap noted in section 6)

## 6. Gaps and risks

- LGPL-3.0: clean-room only. The sketch is written from the mechanism; no donor lines are translated.
- The donor has no attacker cap. Any monster inside range of the party targets the party, and the only limit is the active-set size (30). Frankendom's MAX_ATTACKERS = 3 must be enforced by the engine; the donor shows where it would plug in (the target choice), not how many may attack.
- No hate list and no threat. Target choice is nearest visible inside a range box, which is distance-only aggro. Frankendom's many-on-one hate list (engine rule) is not in this code.
- Hostile monsters check the party at LONG range regardless of their own tier (2107-2109). A short-range monster therefore still sees the party from far away. Frankendom has to decide this explicitly; copying it silently would change the feel of the fight.
- The retaliation guard compares against actor 0 because `v5` never advances (2050, 2064). As read, that is a defect. Do not copy the branch; if Frankendom wants retaliation, write it as an explicit hit-to-hate rule.
- Flee is a movement in the donor (action length plus a yaw). Frankendom's engage is a state change and kills are server-verified. Flee here should be a state change, and the server should verify it, not a movement command.
- Ordering: the donor flees before choosing an attack, and a flee by hp overrides the attack choice. Frankendom must pick one order and test it (the donor's order is shown in section 1).
- Distances subtract monster and target radii. Frankendom's duel has no radius term; the sketch has none. Adding it would change the engagement distances.
- Units: 1024, 2560, 5120, 10240 and 307.2 are donor map units; the scale to Frankendom units was not read and must be chosen. These are zone-free engine constants in the donor; Frankendom can expose the tier ranges as data per monster type.
- Server tick and budget (post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget"): the donor's 30-actor full-AI cap (3897-3899, 3955) is a per-tick NPC budget. The donor also re-picks the target every tick (2556) with no cache.
- Not read: the spell and ranged branches after about 2800, the portal trace in `Detect_Between_Objects`, the turn-based callers in `TurnEngine.cpp`, `Actor` field definitions (`monsterInfo.hp`, `radius`), `GetDirectionInfo`. Any claim about those is not made here.

Best transferable idea: pick the target as the nearest visible foe inside a per-monster range box (range from data, not the pair), and make flee a hp-share state change, not a movement.
Decision (proposed): adapt - the nearest-in-box choice and the per-type flee threshold fit a fast duel AI, but the donor's distance-only aggro and its movement-based flee do not fit one engine with server-verified state changes and MAX_ATTACKERS = 3.
Acceptance: a server test where a NORMAL-type monster below 20 percent of base hp, with a player within its tier range, switches to a flee state and never queues a further attack; a second test with three player characters around one monster asserts that the monster's chosen target is the nearest of them and that no more than three attackers are active.
