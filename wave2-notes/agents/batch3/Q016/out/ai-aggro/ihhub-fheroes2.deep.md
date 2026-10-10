# ihhub-fheroes2 (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/ai/ai_battle.cpp` (with `src/fheroes2/battle/battle_troop.cpp`) | Licence: GNU GPL v2 or later (`ai_battle.cpp` header line 6: "either version 2 of the License, or (at your option) any later version"; repo `LICENSE` is GPL v2, line 2) | C++ | symbol `meleeUnitOffense`

Checked: read `ai/ai_battle.cpp` 1-12 (header), 71-135 (outcome struct, comparator, double-cell and attack-vector helpers), 136-246 (attack vector and attack value), 246-344 (attack-position values and the approach test), 345-398 (`BestAttackOutcome`), 477-512 (`findNearestCellNextToUnit`), 737-800 and 930-975 (`planUnitTurn` branch and move-plus-attack), 1160-1218 (the defensive and cautious tactics switch), 1587-1760 (`getMeleeBestOutcome`, `meleeUnitOffense` with both passes, the siege step). `battle/battle_troop.cpp` 1000-1100 (`Battle::Unit::evaluateThreatForUnit` through the double-attack and ability multipliers). Callers checked: `evaluateThreatForUnit` is used in the target pick, the position values, the distant pass and the arena's threat sum (`battle_arena.cpp` 699, read only as a call site). `meleeUnitOffense` is called from `planUnitTurn` for non-defensive melee units (955). Not read: `getPotentialDamage` and `EstimateRetaliatoryDamage` (the damage and counter-damage estimates, so their values are unknown here), `meleeUnitDefense` (1760-2122), `archerDecision` (1220-1586), `findOptimalPositionForSubsequentAttack` (399-476), the spell caster branch of the threat (after 1093), the retreat and surrender step (750-930), the turn order, and the board distance function. Confidence: high on the target pick, the threat formula and the distant pass (read in full); medium on the attack-position values (read in full, but the cell helpers they call were read only in part). Camera: not applicable (AI cell).

## 1. Mechanism

This is a turn-based battle. Each unit gets its turn in `planUnitTurn` (737). Archers go to `archerDecision` (943, not read). Melee units go to `meleeUnitDefense` when the army is in defensive tactics (951-952, not read), and otherwise to `meleeUnitOffense` (955-956). The chosen target is then turned into a move and an attack (958-975; the attack command is queued at 969).

- Tactics switch (`analyzeBattleState`, 997-1218; the tactics part is 1160-1218). Defensive tactics are not used when the unit is already in the enemy half (1174-1175), when my army is more than 10 times the enemy's for walkers or 6 times for flyers (1178-1181), or when my shooter strength is below the enemy's (1186-1187). Defence of a castle chooses defensive (1192-1193). Otherwise, defensive is not used when my archer ratio is below 0.15 (1197-1198) or the enemy's archer ratio is above 0.66 (1202-1203). `_cautiousOffensive` is set when the enemy's archer ratio is below 0.15 (1212).
- Threat (`battle_troop.cpp` 1007-1088). This is what a unit can do to a defender, used both as a target score and as a danger score.
  - Base: the potential damage to the defender (1011, `getPotentialDamage`, not read).
  - Distance: the modifier is 1.0 against a tower (1016-1017), for flyers and archers (1020-1021), or when the board distance is at most `speed + 1` (1027, 1032-1033). Otherwise it is `1.5 x distance / speed` (1036), and the threat is divided by it (1039).
  - Double attack: the counter-damage is 0 against a tower, when the attacker ignores retaliation, or for archers that are not hand-fighting (1049-1060, 1054). Otherwise it is the defender's estimate (1062). With a counter (1066), threat becomes `threat + threat x (1 - min(counter / attacker HP, 1))` (1070). Without one, threat doubles (1072-1074).
  - Ability multipliers after that: enemy-halving x2 (1078-1079), soul eater x3 (1083), HP drain x1.3 (1087). The spell caster branch (1093 on) is not read.
  - Order: the distance division (1039) runs before the double-attack step, so the counter discount applies to a value already cut by distance.
- Target in reach (`meleeUnitOffense` 1627-1636 with `getMeleeBestOutcome` 1587-1618). For each enemy, `BestAttackOutcome` (345-397) finds the best cell next to it. An enemy is skipped unless it can be attacked from that cell this turn (1602-1603). The best across enemies is kept with `IsOutcomeImproved` (94-96, 1606): attackable now beats not; then a higher position value; then, on a tie in position, a higher attack value.
  - `attackValue` is the target's threat to the attacker (185, `target.evaluateThreatForUnit( attacker )`). So the unit hits the enemy that threatens it most, among those it can reach this turn.
  - Position value (246-317). For each cell at distance 1 from an enemy that the attacker can reach (259-290), the value is the attack value for that enemy. When several enemies touch one cell, archers add (307) and melee take the maximum (310). A cell that blocks an archer is therefore worth more.
- Distant pass, when nobody is in reach (1638-1728). The first pass (called at 1694) counts only enemies that cannot evade: archers (1701-1702), immovable enemies (1707-1708), flyers are not counted (1712-1713), and walkers slower than this unit (1716). The second pass (called at 1724) counts all enemies. For each candidate, `priority = threat to me / move distance to the nearest free cell next to it` (1658). The highest priority wins, and a later equal one replaces an earlier one (1659, 1663). The move distance is `CalculateMoveDistance` (500-502). The chosen cell is the path end (1686), a moat cell (1676), or a cautious-offensive cell (1681). The pass sets `target.cell` only, never `target.unit`, so it produces a move, not an attack.
- Siege step (1732-1755): if attacking a castle, walk to the nearest cell under the walls (`cellsUnderWallsIndexes` 73).
- Tick: turn-based. One unit acts per turn in the planner; the initiative order is not read.

## 2. Key functions

- `Battle::Unit::evaluateThreatForUnit`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/battle/battle_troop.cpp` 1007-1088. The threat formula.
- `IsOutcomeImproved` and `ValueHasImproved`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/ai/ai_battle.cpp` 83-97. The comparator.
- `optimalAttackValue` and `evaluatePotentialAttackPositions`: same file, 161-242 and 246-317. The attack value and the position value.
- `BestAttackOutcome`: same file, 345-397. The best cell next to one enemy.
- `getMeleeBestOutcome`: same file, 1587-1618. The best target in reach.
- `meleeUnitOffense`: same file, 1620-1758. In-reach pick, then the two-pass distant pick, then the siege step.
- `planUnitTurn`: same file, 737-975 (the melee branch, 943-975).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score an enemy by what it can do to you, cut by how far it must walk to reach you | Walk cut 1.5 x distance / speed (1036); no cut inside speed + 1 (1027) |
| Discount a repeat attack when the target can counter | Threat becomes threat x (2 - min(counter / HP, 1)) (1070); without counter x2 (1074) |
| Ability multipliers on the score | Enemy halving x2 (1079), soul eater x3 (1083), HP drain x1.3 (1087) |
| Attack what is in reach first, most dangerous first | Attack value = enemy threat to me (185) |
| Prefer the cell that blocks archers | Archers add to the cell value (307); melee take the max (310) |
| Walk toward the best threat per step | Threat / move distance (1658) |
| Pass one: only enemies that cannot evade | Archers, immovable, slower walkers (1701-1716) |
| Equal-value tie-break | Position value within 0.001 (96) |
| Tactics switch | Overpower 10 walkers, 6 flyers (1178); shooter ratio 0.15 (1197, 1212); enemy shooter ratio 0.66 (1202) |

## 4. TypeScript sketch

simplified: the sketch keeps the threat formula (distance cut, double-attack counter discount or doubling, the three ability multipliers), the position-then-attack comparator, the in-reach pick, the "cannot evade" test, and the two-pass distant pick. The cell values and move distances are inputs, because the donor computes them from the board (`evaluatePotentialAttackPositions`, `CalculateMoveDistance`), which is not in the sketch. It omits: the tower and flying-or-archer exceptions on the distance cut, the counter-damage exceptions (tower, ignore-retaliation, archer not hand-fighting) and the counter value itself (the caller supplies it), the spell caster threat, the double-cell and all-adjacent attacks, the soul-eater and HP-drain resurrection term in the attack value, the defensive tactics (`meleeUnitDefense`), archers, the moat and cautious-offensive cells, the siege step, and the tactics switch. The donor's sort of archers last (253) is not needed, since the sketch takes the list as given.

```ts
// Licence: GNU GPL v2 or later (donor, src/fheroes2/ai/ai_battle.cpp header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Unit {
  id: number;
  damage: number;          // expected damage it deals to a given defender (donor: getPotentialDamage, not read)
  hp: number;
  speed: number;           // cells per turn
  flying: boolean;
  archer: boolean;
  immovable: boolean;
  doubleAttack: boolean;
  ability: 'none' | 'enemyHalving' | 'soulEater' | 'hpDrain';
}

// Threat: what this unit can do to a defender. Distance scales it down when the unit must walk (not flying or archer).
// Retaliation is supplied by the caller (donor: EstimateRetaliatoryDamage, with tower and archer exceptions).
function threat(a: Unit, boardDist: number, retaliation: number): number {
  let t = a.damage;
  if (!(a.flying || a.archer)) {
    const range = a.speed + 1;
    if (boardDist > range) t /= (1.5 * boardDist) / a.speed;
  }
  if (a.doubleAttack) {
    if (retaliation > 0) t += t * (1 - Math.min(retaliation / a.hp, 1)); // the second blow is worth less when it draws a counter
    else t *= 2;
  }
  if (a.ability === 'enemyHalving') t *= 2;
  if (a.ability === 'soulEater') t *= 3;
  if (a.ability === 'hpDrain') t *= 1.3;
  return t;
}

// One way to attack an enemy: from a cell, with the value of the cell and of the attack.
interface Outcome { cell: number; attackValue: number; positionValue: number; canAttackNow: boolean; }

// Donor IsOutcomeImproved: attackable now beats not; then position value; then attack value on a tie.
function improved(n: Outcome, prev: Outcome | undefined): boolean {
  if (prev === undefined) return true;
  if (n.canAttackNow && !prev.canAttackNow) return true;
  if (n.canAttackNow !== prev.canAttackNow) return false;
  return prev.positionValue < n.positionValue || (prev.attackValue < n.attackValue && Math.abs(prev.positionValue - n.positionValue) < 0.001);
}

// Step 1: among enemies that can be attacked this turn, attack the one with the best outcome.
// attackValue = the enemy's threat to us, so the most dangerous reachable enemy is hit first.
function bestInReach(enemies: { unit: Unit; outcomes: Outcome[] }[]): { unit: Unit; cell: number } | undefined {
  let best: { unit: Unit; cell: number } | undefined;
  let bestOutcome: Outcome | undefined;
  for (const e of enemies) {
    let pick: Outcome | undefined;
    for (const o of e.outcomes) if (improved(o, pick)) pick = o;
    if (!pick || !pick.canAttackNow) continue;
    if (improved(pick, bestOutcome)) {
      bestOutcome = pick;
      best = { unit: e.unit, cell: pick.cell };
    }
  }
  return best;
}

// Who can not evade a melee engagement: archers, immovable units, and slower walkers. Flyers can evade.
function cannotEvade(me: Unit, e: Unit): boolean {
  if (e.archer) return true;
  if (e.immovable) return true;
  if (e.flying) return false;
  return e.speed < me.speed;
}

// Step 2: nobody in reach. Walk toward the enemy with the highest threat per step to reach it.
// Pass one only counts enemies that cannot evade; pass two counts everyone.
function distantTarget(me: Unit, enemies: { unit: Unit; stepsToReach: number | undefined; boardDist: number; retaliation: number }[]): Unit | undefined {
  const pick = (filter: (u: Unit) => boolean): Unit | undefined => {
    let best: Unit | undefined;
    let maxPriority = Number.NEGATIVE_INFINITY;
    for (const e of enemies) {
      if (e.stepsToReach === undefined || !filter(e.unit)) continue;
      const priority = threat(e.unit, e.boardDist, e.retaliation) / e.stepsToReach;
      if (priority < maxPriority) continue;
      maxPriority = priority;
      best = e.unit;
    }
    return best;
  };
  return pick((u) => cannotEvade(me, u)) ?? pick(() => true);
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module, proposed; the same module as the zone director in the BAR note): the threat-scored target pick, the attack-slot value, and the two-pass walk-to pick. Parity-checklist row 4 (fight loop: aggro, chase, leash). Not row 2: the target choice is the aggro question (who to fight), and row 2 is the brain's other decisions.
- today: (not read) in the Frankendom repo.
- Reuse tag: rewrite-from-idea (GPL v2 or later, clean-room only; the sketch is written from the mechanism)
- Brief rule served: 1 (many-on-one target choice lives in the engine, one combat core); MAX_ATTACKERS = 3 maps to the attack-slot value (the free cell next to the most dangerous enemy).
- Best transferable idea: Score each enemy by the damage it can do to you, cut by the distance it must walk and discounted when it draws a counter; attack the highest-scoring enemy you can already hit, and when none is in reach, walk toward the one with the most threat per step.
- Decision (proposed): adapt — keep the threat score as the one formula the target pick, the slot pick and the walk-to pick share, because it gives the engine an explicit rule for many-on-one; drop the turn-based cell distance (use ticks to reach) and the archer-blocking sum, because Frankendom is real-time with MAX_ATTACKERS = 3 and no cell grid in the duel.
- Acceptance: A server test with three attackers and one free slot gives the slot to the attacker with the highest threat; an enemy that cannot evade (archer, immovable, or slower walker) is chosen before a flyer with a higher threat; a double-attacking enemy with a counter scores below the same enemy without one.

## 6. Gaps and risks

- GPL v2 or later: clean-room only. The sketch is written from the mechanism, not translated from the C++.
- The donor measures distance in board cells and speed in cells per turn. Frankendom is real-time, so the walk cut must be time to reach in ticks, computed by the server. Do not port the 1.5 x distance / speed factor as a constant until it is set against the duel's real movement speed.
- The threat uses the donor's damage estimate (`getPotentialDamage`, not read). Frankendom's damage is server-verified in one ledger. The AI and the damage step must use the same function, or the AI's choice and the real damage will disagree.
- The counter discount needs a counter estimate. In Frankendom the counter is guard, parry and stamina (checklist row 3). Use those rules, not the donor's HP ratio.
- Archers add to a cell's value because the donor's battles have ranged units. Frankendom's MAX_ATTACKERS = 3 caps the melee attackers on one target. A fourth attacker must be queued by the engine, not scored higher. Do not copy the position sum.
- The first pass ("cannot evade") rests on donor rules for speed and flight. Frankendom has no flight in the duel, so only the immovable and slower-walker parts apply.
- Not read: `getPotentialDamage`, `EstimateRetaliatoryDamage`, `meleeUnitDefense`, `archerDecision`, the spell caster threat, the retreat step, and the turn order. Do not claim how those behave.
