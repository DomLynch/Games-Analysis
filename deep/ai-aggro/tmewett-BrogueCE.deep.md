# tmewett-BrogueCE (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` | Licence: AGPL-3 | C | roguelike | symbol `monstersTurn / updateMonsterState / awareOfTarget` at 3320 (verified: `awareOfTarget` opens at 1649, `updateMonsterState` at 1709, `monstersTurn` at 3320; `awarenessDistance` at 1621). Clean-room only: the licence is AGPL-3.

## 1. Mechanism

- Monster state is one of wandering, sleeping, tracking scent, fleeing, or ally. `updateMonsterState` (1709-1823) runs each monster turn, before `monstersTurn` (3320; calls it at 3373 and 3378) acts on it.
- `awarenessDistance` (1621-1645): the perceived distance is the scent-map distance (the scent turn minus the scent value of the monster's tile, which is double the apparent distance). If the monster is in the player's field of view, or a target's line is open, the direct scent distance is used if it is smaller. Capped at 1000.
- `awareOfTarget` (1649-1683): awareness radius = stealth range x 2. Always-hunting monsters are always aware. Immobile ones are aware only inside the radius. Beyond three times the radius, not aware. A monster already tracking keeps tracking inside the radius, and outside it keeps tracking 97 % of turns. A monster not yet tracking needs the player in view, and within the radius it notices with 25 % per turn.
- `updateMonsterState` transitions: wandering and aware and the player is in view, then alert (tracking). Sleeping and aware, then wake the horde. Tracking and not aware, then wander toward the last seen position. Tracking and a feared enemy within 3, then flee. A monster that flees near death and is at or below 3/4 HP starts fleeing only once at or below 1/4 HP, and stays fleeing while it remains at or below 3/4 HP. A normal-mode fleeing monster with no magical fear and a feared enemy 3 or more away goes back to tracking. Recovery: a normal-mode fleeing monster with the flee-near-death flag, no magical fear and HP at or above 3/4 of max stops fleeing (back to tracking, or ally if it follows the player). The chain is else-if, so only the first matching branch runs per turn. Other branches (always-hunting, immobile turrets, permanent fear, thief dropping its item) are not described here.
- Inputs: the monster, scent map, field of view, stealth range, the player and fear sources. Outputs: the monster's state and waypoint target. Tick: once per monster turn.

## 2. Key functions

- `awarenessDistance`: `Monsters.c` 1621-1645. Scent-or-direct perceived distance, capped.
- `awareOfTarget`: `Monsters.c` 1649-1683. Notice roll, keep-tracking roll, radius rules.
- `updateMonsterState`: `Monsters.c` 1709-1823. State transitions.
- `monstersTurn`: `Monsters.c` 3320-3400 (read to the discordant-monster branch; the rest is not read). Checks paralysis, captivity and dying, then calls `updateMonsterState` (3373 for sleepers, who spend a full turn on it, 3378 for everyone else) before moving.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Notice chance per turn inside a radius, only when in view | 25 % per turn (theirs) |
| Keep tracking with a small chance of losing track outside the radius | 97 % keep (theirs) |
| Awareness radius from a stealth value, times two | Stealth range x 2 (theirs) |
| Hard cut-off beyond three times the radius | Factor 3 (theirs) |
| Flee at low HP with hysteresis: start at the low threshold, keep fleeing and recover only at the higher one | Start at 1/4 of max HP, stay fleeing at or below 3/4, recover at 3/4 or more (theirs) |
| Flee ends when the fear source is 3 or more away | 3 cells (theirs) |
| Perceived distance by scent map, with a direct shortcut in view | Scent doubles distance (theirs) |

## 4. TypeScript sketch

simplified: ally state, perm-fleeing mode, always-hunting and immobile flags, the thief-recovers-item branch and the lastSeenPlayerAt update are omitted; wakeUp (horde wake, body not read) and alertMonster are modelled as a plain switch to tracking; wanderToward (waypoints) is omitted; the feared-enemy distance is passed in instead of scanned. Branch order follows the donor's else-if chain (first match wins and later branches are skipped).
```ts
// Licence: AGPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type State = 'wander' | 'sleep' | 'track' | 'flee';
interface Mon { state: State; hp: number; maxHp: number; fleesNearDeath: boolean; }

// Perceived distance: scent-map distance, or the direct distance when in view, capped; a negative result means "unreachable".
function perceived(scentDist: number, direct: number | null): number {
  const d = direct === null ? scentDist : Math.min(scentDist, direct);
  const capped = Math.min(d, 1000);
  return capped < 0 ? 1000 : capped;
}

// Awareness: inside the radius a non-tracking monster notices with a per-turn chance; a tracker keeps trying.
function aware(dist: number, radius: number, tracking: boolean, inView: boolean, roll: () => number): boolean {
  if (dist > radius * 3) return false;
  if (tracking) return dist <= radius ? true : roll() < 0.97;
  if (!inView) return false;
  return dist <= radius ? roll() < 0.25 : false;
}

// One state transition per monster turn.
function nextState(m: Mon, isAware: boolean, inView: boolean, fearDist: number, magicalFear: boolean): State {
  const threeQuarters = Math.floor((3 * m.maxHp) / 4);
  const quarter = Math.floor(m.maxHp / 4);
  if (m.state === 'wander' && isAware && inView) return 'track';        // notice
  if (m.state === 'sleep') return isAware ? 'track' : 'sleep';          // wake (horde wake not modelled)
  if (m.state === 'track' && !isAware) return 'wander';                  // lost the trail
  if (m.state === 'track' && fearDist < 3) return 'flee';                // feared enemy close
  if (m.fleesNearDeath && m.hp <= threeQuarters) {
    // Hurt: already fleeing keeps fleeing; a fresh monster starts only at a quarter or less.
    return m.state === 'flee' || m.hp <= quarter ? 'flee' : m.state;
  }
  if (m.state === 'flee' && !magicalFear && fearDist >= 3) return 'track'; // fear source far enough away
  if (m.state === 'flee' && m.fleesNearDeath && !magicalFear && m.hp >= threeQuarters) {
    return 'track';                                                      // recovery: stop fleeing at 3/4 HP or more
  }
  return m.state;
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (today: `src/ai.ts`, moving), checklist row 2 (AI brain): the notice-roll, keep-tracking roll and radius rule form a state machine for when an opponent starts to act. A candidate for the Pit or Zone 1 brain. Compare with the brain's reading of committed duel state first.
- TARGET `src/fight/world.ts`, checklist row 4 (aggro, leash): the sight hysteresis already there (`AGGRO_M` 9 m, `SIGHT_M` 14 m) is the same idea as the donor's keep-tracking rule. Confirm before adding a second one.
- Reuse tag: rewrite-from-idea
- Brief rule served: 5 (many-on-one: hate list and target selection in the engine); rules 7-9 n/a

## 6. Gaps and risks

- AGPL-3: clean-room only.
- MAX_ATTACKERS = 3: the donor's tracking state has no cap on how many monsters hunt one target at once. Frankendom must cap engaged attackers at 3 and queue the rest (hate-list ordering is not in this donor).
- Server-verified kills: the donor's per-turn rolls (97 %, 25 %) draw from the shared RNG. Frankendom's server must replay them from the seeded stream (`withRoll` in the duel step), or the server cannot verify a kill.
- One engine / zones as data: the 3/4 and 1/4 flee thresholds, the radius factor and the 25 % / 97 % rolls must live in the catalogue (row 21 AI knobs), not as constants inside the brain, so a zone can retune them without a code change.
- Grid and scent-map world: Zone 1 is metres in a free plane with Euclidean rings, so the scent map does not transfer; only the state logic does.
- The 97 % and 25 % values are theirs; do not carry them into Zone 1 without a look-test under brief rule 3 (look-test first).
