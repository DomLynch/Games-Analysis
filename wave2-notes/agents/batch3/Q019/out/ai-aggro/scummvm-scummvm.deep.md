# scummvm-scummvm (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/engines/bladerunner/actor_combat.cpp` (with `actor_combat.h`, `actor.cpp`, `bladerunner.cpp`, `script/script.cpp`, `script/ai/izo.cpp`) | Licence: GPL-3.0-or-later (file header: "the Free Software Foundation, either version 3 of the License, or (at your option) any later version"; the repo `COPYING` is the GPL v3 text) | C++ | symbol `ActorCombat::tick`

Checked: `ActorCombat::tick` (actor_combat.cpp 115-226) read in full; `hitAttempt` (228-298) read in full; `combatOn` (52-108) read; the five ratio functions (597-672) and the coefficient and damage functions (524-595) read in full; the state actions `cover`, `approachToCloseAttack`, `approachToRangedAttack`, `uncover`, `aim`, `rangedAttack`, `closeAttack`, `flee` (372-518) read in full; `findClosestPositionToEnemy` (674-698) read. Callers: `tick` has one caller, `Actor::tickCombat` (actor.cpp 914-917), called for every actor in the game-tick loop (bladerunner.cpp 1231-1234), read. `hitAttempt` is called from script code at set animation frames: `script/script.cpp` 265-269 read; 15 call sites in `script/ai/` (izo, zuben, steele, mutant3, free_slot_b read in context; the other 10 not read). `combatOn` is reached through `Non_Player_Actor_Combat_Mode_On` (21 script files match, including its definition in script.cpp) and `Actor::combatModeOn` (actor.cpp 1271-1280), read. Not read: `findCoverWaypoint` and `findFleeWaypoint` (combat.cpp), `Actor::angleTo`, `distanceFromActor`, `isObstacleBetween`, `getIntelligence`, the `retire()` parameters, the frame limiter body in `gameTick`/`gameLoop`, and the settings for difficulty beyond the two McCoy overrides. Confidence: high on the stance choice and the hit and damage formulas (read in full); medium on how the cover and flee walks finish (the helper functions are not read). camera_scope: not applicable (not a camera cell).

Best transferable idea: Each tick, an attacker scores three options (attack, cover, flee) from weighted terms on distance, angle, both HP and aggression, picks the highest with fixed tie rules, and a hit that lands scales its damage by how far under the hit chance the roll was.
Decision (proposed): adapt - the weighted stance chooser and the margin-scaled damage fit a per-tick AI brain in `src/fight`; the frame-keyed hit call, the walking-to-waypoint cover and flee, and the single-enemy id do not fit a many-on-one fight as written, so keep the scoring and drop the frame coupling.
Acceptance: A server test asserts that a fixed input table (distance, angle, both HP, aggression, speed, cover and flee availability) yields the same stance and the same hit chance and damage as the donor's formulas; in play a wounded, low-aggression group member takes cover or flees when a cover point or flee point exists, and a healthy one stays on the attack.

## 1. Mechanism

- Driver: `BladeRunnerEngine::gameLoop` runs `gameTick()` in a do-while (bladerunner.cpp 1158-1165). Inside `gameTick`, unless the dialogue menu is open (1231-1232), `tickCombat()` runs for every actor (1233-1234). `Actor::tickCombat` (actor.cpp 914-917) calls `ActorCombat::tick` only for non-player, non-retired actors that are in combat. So the step is variable (one call per loop iteration), with no accumulator and no fixed timestep (the frame limiter exists, `bladerunner.cpp` 129 and 591; its body not read). `tick` has a static reentrancy counter (actor_combat.cpp 116-118, decremented at 225).
- Order of steps inside `tick` (115-226), each call:
  (a) Exit if inactive or re-entered (118). If the actor and the enemy are in different sets, leave combat (125-127).
  (b) Attack ratio: the script constant if it is 0 or more, otherwise `calculateAttackRatio()` (137-141; line 138 read).
  (c) Cover ratio: 0 unless a cover waypoint exists now; then the constant or `calculateCoverRatio()`.
  (d) Flee ratio: the constant or `calculateFleeRatio()` (155-158).
  (e) Stance: if attack < flee or attack < cover, then cover if cover >= flee and cover >= attack, otherwise flee (160-161). Otherwise attack: ranged goes to approach if farther than the range (default 300, set at 69), uncover if an obstacle is between, otherwise ranged attack; melee goes to approach beyond 36 units, otherwise close attack (163-183).
  (f) An enemy that has retired makes the stance idle (186). An actor in a hit animation is set to idle (190-191). A stance change stops the walk (193-195).
  (g) The stance's action runs (197-224).
- The ratios (597-672), all weights as in the code (0-100 scales):
  - Melee attack = 0.20 x distance term + 0.10 x angle term + 0.10 x combat term + 0.15 x (100 - enemy HP) + 0.15 x own HP + 0.30 x own aggression. Distance term = 2 x (50 - min(distance / 12, 50)), so 100 at zero units and 0 at 600 units and beyond. Angle term = 100 x |enemy's angle to me| / 512. Combat term = 100 if the enemy is not in combat, else 0 (606-622).
  - Ranged attack = 0.25 angle + 0.05 combat + 0.20 (100 - enemy HP) + 0.10 own HP + 0.40 own aggression (610-615).
  - Cover (melee) = 0.25 x distance term' + 0.20 x (100 - angle term) + 0.05 x enemy HP + 0.10 x (100 - own HP) + 0.50 x (100 - own aggression), where distance term' = 2 x min(distance / 12, 50) (638-645 region; ranged cover 645 and melee cover 652 read). Ranged cover = 0.40 angle' + 0.05 enemy HP + 0.15 (100 - own HP) + 0.50 (100 - aggression).
  - Flee = 0.2 x (100 if the enemy is in combat, else 0) + 0.4 x (100 - own HP) + 0.4 x (100 - own aggression). It is 0 if the set has no flee points (656-672; line 670 read).
- Hit chance (close, `getCoefficientCloseAttack`, 524-552): 0 if distance > 36. Base 11 if the enemy runs, 22 if it moves, 33 if it stands (536-540). Add own aggression / 3 (543). 0 if |own angle to enemy| > 128 (547-548). Add |angle - 128| / 3.7 (551). Truncated to an integer percent.
- Hit chance (ranged, 554-575): 0 if an obstacle is between (558-559). Base 10 / 20 / 30 by the same speed classes (566-570). Add own aggression / 5 (573). Add |distance / 30 - 30| (integer division, distance capped at 900 at 562) and intelligence / 5 (574).
- Hit roll (`hitAttempt`, 228-298): if the enemy is McCoy and the player has no control and the attack is not unstoppable, return (232). If the chance is 0, return before any roll (247-249). Otherwise roll 1-100 (251). Hit if roll <= chance (253).
- Damage (577-595): McCoy as enemy on easy takes half the weapon damage (578-580); on hard, the full weapon damage (581-583). Otherwise damage = ((min(chance - roll, 30) x 100 / 60) + 50) x weapon damage / 100 (584; the ranged version is 594). The margin term is 0 at a margin of 0 and 50 at a margin of 30 or more, so damage runs from 50% to 100% of the weapon damage.
- Apply (272): enemy HP = max(HP - damage, 0). If it reaches 0 and the enemy was not retired: die animation (sentence 9020) and, in the build without BLADERUNNER_ORIGINAL_BUGS, the movement track is flushed (277-281). Then `enemy->retire(true, 6, 3, _actorId)` (289).
- Numbers that are the actor's own data: default aggression 50 (actor.cpp 115), clipped to 0-100 on change (actor.cpp 1185, 1197). Script constants: the calls pass a ratio of -1 (or any negative) to compute it; the zone script passes fixed numbers, for example `Non_Player_Actor_Combat_Mode_On(kActorZuben, ..., 0, 0, 100, 15, 300, false)` in `script/scene/ct07.cpp` line 92 (flee 0, cover 0, attack 100, damage 15, range 300).
- Flee action (497-518): if no flee point is set, pick one (`findFleeWaypoint`, not read) and walk there. When walking and within 12 units of it, call `fledCombat`, move the actor to a free set and leave combat. The exit is the waypoint, not a timer.
- Cover action (372-390): wait while walking; if an obstacle is between, face the enemy; otherwise walk to a cover waypoint, or go idle if none.
- Approach (392-413): beyond 36 units (or beyond range for ranged), pick the best of 4 spots 28 units from the enemy (`findClosestPositionToEnemy`, 674-698, the spots are at offsets 28 on each axis) that are free and walkable; the third argument is set when the distance is 240 units or more (its name in `asyncWalkToXYZ` not read). Within reach, stop, face the enemy and switch to the attack stance.

## 2. Key functions

- `ActorCombat::tick`: `/mnt/frankendom-donors/scummvm-scummvm/engines/bladerunner/actor_combat.cpp` 115-226. The stance chooser and the dispatch.
- `ActorCombat::hitAttempt`: `/mnt/frankendom-donors/scummvm-scummvm/engines/bladerunner/actor_combat.cpp` 228-298. The roll, the hit, the damage and the retire.
- `calculateAttackRatio` / `calculateCoverRatio` / `calculateFleeRatio`: `/mnt/frankendom-donors/scummvm-scummvm/engines/bladerunner/actor_combat.cpp` 597-672. The weighted scores.
- `getCoefficientCloseAttack` / `getCoefficientRangedAttack`: `/mnt/frankendom-donors/scummvm-scummvm/engines/bladerunner/actor_combat.cpp` 524-575. The hit chance.
- `getDamageCloseAttack` / `getDamageRangedAttack`: `/mnt/frankendom-donors/scummvm-scummvm/engines/bladerunner/actor_combat.cpp` 577-595. The margin damage and the McCoy overrides.
- `Actor::tickCombat`: `/mnt/frankendom-donors/scummvm-scummvm/engines/bladerunner/actor.cpp` 914-917. The gate that calls the tick.
- `BladeRunnerEngine::gameTick` loop: `/mnt/frankendom-donors/scummvm-scummvm/engines/bladerunner/bladerunner.cpp` 1158-1168 and 1231-1234.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score each option from weighted terms; pick the largest; attack wins ties; cover beats flee on a tie | Attack weights 0.20 / 0.10 / 0.10 / 0.15 / 0.15 / 0.30 (theirs, 606-622). Cover weights 0.25 / 0.20 / 0.05 / 0.10 / 0.50 (melee, 638-652). Flee weights 0.2 / 0.4 / 0.4 (670) |
| Distance term that saturates | 2 x (50 - min(d/12, 50)) gives 100 at 0 units and 0 at 600 units (606) |
| Percent hit chance from a base by target speed, a bonus from aggression, and a bonus from angle, with a hard cutoff | Base 11 / 22 / 33 (close, 536-540) or 10 / 20 / 30 (ranged, 566-570). Reach 36 (close, 397 and 178). Angle cutoff 128 and divisor 3.7 (547-551) |
| Hit when a 1-100 roll is at or below the chance, damage scaled by the margin, capped | Margin cap 30; damage 50% plus 5/3 per margin point (584) |
| Floor HP at zero, then retire the target | Floor 0 (272); retire arguments 6, 3 (289; not read beyond the call) |
| Default aggression | 50 per actor, range 0-100 (actor.cpp 115, 1185) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the scores, the stance choice with its tie rules, the hit chance, the roll gate and the margin damage. It omits: the ranged obstacle and uncover branch (the sketch uses one reach test for both attack kinds), the walks and animations that carry out each stance (cover, approach, flee), the hit-animation reset to idle, the enemy-set exit, the retire call and the die animation, the McCoy easy and hard overrides, the reentrancy counter, and speech. It reorders nothing, but the caller must skip the roll when the chance is 0 (the donor returns before rolling). It floors HP at 0 as the donor does.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Stance = 'idle' | 'cover' | 'approach' | 'attack' | 'flee';
export type Speed = 'still' | 'moving' | 'running';

export interface Fighter {
  hp: number;          // 0..100
  aggression: number;  // 0..100, default 50
  inCombat: boolean;
  speed: Speed;
  distance: number;    // game units
  angleToOther: number; // this fighter's angle to the other fighter, engine units (scale not verified)
  retired: boolean;
}

export interface StanceRules {
  ranged: boolean;
  reach: number;               // close-attack reach, 36 in the donor
  coverAvailableNow: boolean;  // a cover point exists this tick
  hasFlee: boolean;            // flee points exist for this set
  fixedAttack?: number;        // script constant; undefined means compute
  fixedCover?: number;
  fixedFlee?: number;
}

export function closeAttackRatio(self: Fighter, enemy: Fighter): number {
  const distanceFactor = 2 * (50 - Math.min(self.distance / 12, 50));
  const angleFactor = (100 * Math.abs(enemy.angleToOther)) / 512;
  const combatFactor = enemy.inCombat ? 0 : 100;
  return distanceFactor * 0.20 + angleFactor * 0.10 + combatFactor * 0.10
    + (100 - enemy.hp) * 0.15 + self.hp * 0.15 + self.aggression * 0.30;
}

export function rangedAttackRatio(self: Fighter, enemy: Fighter): number {
  const angleFactor = (100 * Math.abs(enemy.angleToOther)) / 512;
  const combatFactor = enemy.inCombat ? 0 : 100;
  return angleFactor * 0.25 + combatFactor * 0.05 + (100 - enemy.hp) * 0.20
    + self.hp * 0.10 + self.aggression * 0.40;
}

export function coverRatio(self: Fighter, enemy: Fighter, ranged: boolean): number {
  const angleFactor = 100 - (100 * Math.abs(enemy.angleToOther)) / 512;
  if (ranged) {
    return angleFactor * 0.40 + enemy.hp * 0.05 + (100 - self.hp) * 0.15 + (100 - self.aggression) * 0.50;
  }
  const distanceFactor = 2 * Math.min(self.distance / 12, 50);
  return distanceFactor * 0.25 + angleFactor * 0.20 + enemy.hp * 0.05
    + (100 - self.hp) * 0.10 + (100 - self.aggression) * 0.50;
}

export function fleeRatio(self: Fighter, enemy: Fighter): number {
  const combatFactor = enemy.inCombat ? 100 : 0;
  return combatFactor * 0.2 + (100 - self.hp) * 0.4 + (100 - self.aggression) * 0.4;
}

export function chooseStance(self: Fighter, enemy: Fighter, r: StanceRules): Stance {
  const attack = r.fixedAttack ?? (r.ranged ? rangedAttackRatio(self, enemy) : closeAttackRatio(self, enemy));
  const cover = r.coverAvailableNow ? (r.fixedCover ?? coverRatio(self, enemy, r.ranged)) : 0;
  const flee = r.hasFlee ? (r.fixedFlee ?? fleeRatio(self, enemy)) : 0;

  let s: Stance;
  if (attack < flee || attack < cover) {
    s = cover >= flee && cover >= attack ? 'cover' : 'flee';
  } else if (r.ranged) {
    s = self.distance > r.reach ? 'approach' : 'attack';
  } else {
    s = self.distance > r.reach ? 'approach' : 'attack';
  }
  if (enemy.retired) s = 'idle';
  return s;
}

// Hit chance in percent. Returns 0 when the attack cannot land.
export function closeHitChance(self: Fighter, enemy: Fighter, reach: number): number {
  if (self.distance > reach) return 0;
  const base = enemy.speed === 'running' ? 11 : enemy.speed === 'moving' ? 22 : 33;
  const aggressiveness = base + Math.trunc(self.aggression / 3);
  const a = Math.abs(self.angleToOther);
  if (a > 128) return 0;
  return Math.trunc(aggressiveness + Math.abs(a - 128) / 3.7);
}

// roll is 1..100. A hit needs roll <= chance. Damage scales with the margin (capped at 30 points).
export function resolveHit(roll: number, chance: number, weaponDamage: number): { hit: boolean; damage: number } {
  if (chance === 0 || roll > chance) return { hit: false, damage: 0 };
  const margin = Math.min(chance - roll, 30);
  const damage = Math.trunc(((margin * 100 / 60) + 50) * weaponDamage / 100);
  return { hit: true, damage };
}

export function applyDamage(enemy: Fighter, damage: number): void {
  enemy.hp = Math.max(enemy.hp - damage, 0);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (the per-tick stance chooser that the fight loop calls for each attacker; engine-side and server-verified). Parity-checklist row 4 (fight loop: aggro, chase, leash). The stance choice is the brain, so row 2 is the alternative; I chose row 4 because the tick drives the chase and the flee.
- today: not checked. I did not read the Frankendom repo for an existing per-tick stance chooser.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the stance and the hit live in `src/fight`; the numbers are data); rule 2 AI brain as the alternative row

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism and typechecks; it is not a translation.
- The donor drives the stance from the frame loop with no fixed step. Frankendom's server tick is fixed-step (row 18, post-K item 3, "fixed step, input intake, per-tick NPC budget"). The scoring can run once per server tick; the frame-keyed hit call must not be copied. Every hit must be resolved by the server at a tick, not by an animation frame.
- Hit timing: the donor rolls the hit on a set animation frame (script/ai/izo.cpp 639-640 frame 9; zuben 786-787 frame 11; steele 1794-1795 frame 4). Frankendom must roll on the server tick, with the animation as a client cue only, so the kill is server-verified.
- One enemy per actor: `combatOn` takes one `enemyId` (52). There is no hate list or target choice in this file; for MAX_ATTACKERS = 3, the engine must pick which enemy each attacker scores (not in this donor).
- The cover and flee walks hand off to the movement system and to waypoints that are data. Frankendom's zones are data, so flee and cover points should be zone data (the donor's `findFleeWaypoint` and `findCoverWaypoint` are not read, so their rules are unknown).
- The margin damage gives 50% to 100% of weapon damage. This is a clean rule for Frankendom; it needs a test at the margin boundaries (0, 30) and at the cap.
- Angle units are the engine's and not verified; the donor divides by 512 in the ratios and cuts at 128 in the hit. Frankendom must pick its own unit and test it.
- Hit chance above 100 (possible when the terms add up) always hits, as the roll is 1-100. The donor does not clamp; Frankendom should decide the cap and test it.
- The donor's `getCoefficientCloseAttack` returns `false` for an angle over 128 (547-548). The effect is 0, the same as the intent. Not a defect in use, but a reason to test the cutoff directly.
