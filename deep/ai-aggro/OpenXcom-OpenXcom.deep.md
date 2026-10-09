# OpenXcom-OpenXcom (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/AIModule.cpp` | Licence: GPL-3 | C++ | symbol `AIModule::think / evaluateAIMode` | input line 137 verified: `AIModule::think` opens at 137 and closes at 390. `AIModule::evaluateAIMode` is at 1192 and closes at 1439 (both opened in full this pass).

## 1. Mechanism

- Each AI unit picks one of four modes each time it is asked to act: patrol, ambush, combat, escape. The mode is a weighted random draw. Inputs: counts of known and visible enemies, enemies spotting this unit, the unit's health, time units, aggression setting, whether it is melee, whether it has a rifle or blaster, the mission type, and the closest known enemy. Output: `_AIMode`, then one action (walk, shoot, hit, end turn) from the mode's sub-action.
- `think` (137-390) rebuilds the picture each turn: enemy counts, reachable tiles for the main weapon and for an attack with it, melee and ranged flags. It sets up escape when enemies spot the unit and there is no escape plan (220-223), ambush when enemies are known, the unit is not melee and has no ambush plan (225-228), then always runs the attack and patrol planners (230-231). A pending psi action returns early (233-241). Then it decides whether to re-evaluate the mode (`evaluate` gate, 247-263): patrol re-evaluates when enemies spot, see or are known, or 10 % by chance; ambush when the unit has no rifle, no ambush plan or sees an enemy; combat only when the attack planner asked for a rethink; escape when nobody spots it or no enemy is known. Always re-evaluate when spotted by more than two enemies, health is below two thirds of base health, or the aggro target has gone unseen longer than the unit's intelligence (265-270); a cheating side re-evaluates unless already in combat (273-276). The mode then maps to one action (305-375): escape ends the unit's turn and sets hiding, ambush ends the turn, combat can switch to a grenade or a fire-point walk, patrol sets a reserve shot by aggression.
- `evaluateAIMode` (1192-1439): a charging unit with a settled attack action goes straight to combat (1194-1198). Otherwise it builds four odds (escape 15, or 12 if melee, or 5 if hostile with more than half its time units or charging; ambush 12; combat 20; patrol 15 if it sees an enemy else 30), then adjusts them in this order: spotters (patrol to 0), no rifle or no ambush plan (ambush to 0, melee combat x1.3), known enemies (one known: combat x1.2; none known and hostile: combat and escape to 0), current mode x1.1, health (below 1/3, below 2/3, below full x1.1 for escape), aggression (0, 1, 2 or a clamped formula above 2), combat mode ambush x1.5, spotters (escape and combat formulas; escape halved when nobody spots), visible enemies (combat formula; ambush 0 if the closest is under 5), ambush plan (x1.7, else 0), base-defence mission, and no weapon and no psi (combat and ambush to 0). A random number from 1 to the sum of the odds picks the mode: the first band is escape, then ambush, then combat, and the rest is patrol.
- Fallback chain: combat falls to patrol if no fire point or target is found; patrol falls to ambush if no node; ambush falls to escape if no ambush time units remain. Cheating (hostile side) and charging force combat.
- Tick: one call per unit per AI turn (a turn-based game). Output is one action per call.

## 2. Key functions

- `AIModule::think`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/AIModule.cpp` 137-390. Refreshes counts and reachable sets, runs setup, decides re-evaluation, then maps the mode to one action.
- `AIModule::evaluateAIMode`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/AIModule.cpp` 1192-1439. Base odds, modifiers, weighted random decision, fallback chain.
- `AIModule::evaluateAIMode`, decision band (block inside it): `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/AIModule.cpp` 1364-1387 (the `decision` roll and the four bands).
- `AIModule::evaluateAIMode`, fallback chain (block inside it): `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/AIModule.cpp` 1396-1438 (combat to patrol, patrol to ambush, ambush to escape).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted random mode: base odds per mode, scaled by context, drawn from the sum | Base odds 15 / 12 / 5 (escape: normal / melee / hostile with TU over half), 12 (ambush), 20 (combat), 15 or 30 (patrol) (theirs) |
| Health bands scale escape up and combat down | Thirds of max health; multipliers 1.7 / 0.6 / 0.75 and 1.4 / 0.8 / 0.8 (theirs) |
| Aggression 0 to 2 (and beyond) shifts combat and escape | Multipliers 1.4 and 0.7 for 0 and 2; above 2: combat x clamp(1.2 + a/10), escape x clamp(0.9 - a/10), clamp 0.1 to 2.0 (theirs, lines 1296-1313) |
| Spotters increase the risk of escape and decrease combat | Coefficients (spotters + 10) and (spotters + 20) (theirs) |
| Fallback chain on invalid choice, never a dead state | Order: combat, patrol, ambush, escape (mechanism) |
| Re-evaluate only on triggers (spotted, hurt, rethink due) | Triggers: more than two spotters, below two thirds health, 10 % random on patrol (theirs) |

## 4. TypeScript sketch

simplified: omitted from the donor's modifier chain are the hostile low-escape base of 5, the one-known-enemy combat bump, the current-mode x1.1 bump, the below-full-health escape bump, aggression 1 and the over-2 formula, the combat-mode ambush bump, the closest-enemy-under-5 ambush cut, the ambush-plan x1.7, the base-defence mission and the no-weapon cut; the charging early-out, the cheating / charging override and the fallback chain (combat to patrol to ambush to escape) are not sketched. `canAmbush` stands for "has a rifle and an ambush plan"; the order of the kept steps is the donor's.
```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room.
type Mode = 'patrol' | 'ambush' | 'combat' | 'escape';
interface Context {
  visibleEnemies: number; knownEnemies: number; spotters: number; hostile: boolean;
  hpFraction: number; aggression: number; melee: boolean; canAmbush: boolean; canEscape: boolean;
}

// Base odds, scaled in the donor's order: spotters, enemies, health, aggression.
function modeOdds(c: Context): Record<Mode, number> {
  let escape = c.melee ? 12 : 15;
  let ambush = 12;
  let combat = 20;
  let patrol = c.visibleEnemies ? 15 : 30;
  if (c.spotters) patrol = 0;
  if (!c.canAmbush) { ambush = 0; if (c.melee) combat *= 1.3; }
  if (c.knownEnemies === 0 && c.hostile) { combat = 0; escape = 0; }
  if (c.hpFraction < 1 / 3) { escape *= 1.7; combat *= 0.6; ambush *= 0.75; }
  else if (c.hpFraction < 2 / 3) { escape *= 1.4; combat *= 0.8; ambush *= 0.8; }
  if (c.aggression === 0) { escape *= 1.4; combat *= 0.7; }
  if (c.aggression === 2) { combat *= 1.4; escape *= 0.7; }
  if (c.spotters) {
    escape = (10 * escape * (c.spotters + 10)) / 100;
    combat = (5 * combat * (c.spotters + 20)) / 100;
  } else {
    escape /= 2;
  }
  if (c.visibleEnemies) combat *= (c.visibleEnemies + 10) / 10;
  if (!c.canEscape) escape = 0;
  return { escape, ambush, combat, patrol };
}

// Weighted draw from 1..sum; the bands are escape, ambush, combat, patrol.
function pickMode(o: Record<Mode, number>, roll: (n: number) => number): Mode {
  const d = roll(Math.max(1, o.escape + o.ambush + o.combat + o.patrol));
  if (d <= o.escape) return 'escape';
  if (d <= o.escape + o.ambush) return 'ambush';
  if (d <= o.escape + o.ambush + o.combat) return 'combat';
  return 'patrol';
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (today: `src/ai.ts`, moving), checklist row 2 (AI brain + per-rank profiles): today the brain picks among `approach` / `circle` / `retreat` / `guard` from committed duel state with a seeded `AiState`; a weighted mode draw with per-profile odds (row 21, AI knobs in the catalogue) is the new idea here. Mode names stay the brain's own.
- Reuse tag: adapt
- Brief rule served: (category default, not per-cell) 5 (many-on-one); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- One engine, server-verified kills: the donor's draw is `RNG::generate`. Frankendom's draw must use the duel's seeded stream (`AiState` seed), so the server can replay it; no new unseeded source.
- MAX_ATTACKERS = 3: the donor's "spotters" count raises escape and lowers combat. In Frankendom the spotters are the attackers already engaged (at most three), so the same term would stay bounded by 3; the cap itself is in `src/fight/world.ts`, not in this draw.
- No hidden numbers: the roughly 25 tuned constants must be catalogue fields per profile (row 21), readable behaviour only; do not copy the values.
- The donor is turn-based with time units and a grid. Frankendom is real-time at 60 Hz, so the time-unit and reachable-tile checks do not transfer and there is no "end this unit's turn" for a creature; a flee state needs its own design.
- Zones as data: the re-evaluate triggers (spotted by more than two, below two thirds health) are per-profile knobs, not zone code.
