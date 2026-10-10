# xu4-engine-u4 (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/xu4-engine-u4/src/creature.cpp` | Licence: GPL-3.0 (COPYING file, line 1 "GNU GENERAL PUBLIC LICENSE", line 2 "Version 3, 29 June 2007"; clean-room, shape only) | C++ | symbol `Creature::act`

Checked: Read: `src/creature.cpp` (26-32, 54-110, 304-465, 564-601; 689-700 for one line), `src/combat.cpp` (395-431 and 790-838, the party turn and the round that calls the creatures), `src/location.cpp` (294-345, `moveCombatObject`), `src/map.cpp` (111-135 and 161-200, the path and distance helpers), `src/party.cpp` (20-30), `src/combat.h` (18-34), `COPYING`. The hint `src/creature.cpp` was the right file; the mechanism is in `act` and `nearestOpponent`. Callers (grep): the only creature call of `act` is in `CombatController::moveCreatures` (combat.cpp 424; the other `act` hit, combat.cpp 868, is the player's and is inside `#if 0`); `moveCreatures` is called only at combat.cpp 835, inside the round read at 790-838; `moveCombatObject` is called only at creature.cpp 449 (in `act`). Not checked: callers of `nearestOpponent` beyond the one at creature.cpp 345 (it was read only from that call). Not read: `map_getRelativeDirection` (the toward mask, so the exact geometry of "away" is not confirmed), `dirRandomDir`, `map_wrap`, `map_distance` after line 199, `CombatController::attackHit`, `applyCreatureTileEffects`, `creatureRangedAttack`, `specialAction` and `specialEffect` (111-302), `hideOrShow` (549-562), and the kill and flee messages in `applyDamage` (689 on). Confidence: high on the order of the action dice, the flee threshold, the target rule and the round; medium on the geometry of flee (mask not read).

## 1. Mechanism

- What it is: a turn-based enemy brain for one tactical battle. Each creature picks an action from a short ordered list of dice, picks the nearest party member for it, and then attacks, advances, flees, or uses a special.
- When it runs: a round, not a frame. In `CombatController` the party takes its turns one member at a time (focus++, 809-810). When the focus wraps past the last member (813), the round runs: `endTurn` (823), `passTurn` on the aura (826), then `moveCreatures()` (835), then tile effects (838). `moveCreatures` calls `act` once for each creature in list order (422-424). If an earlier creature leaves the list (flees), the index is stepped back so the next creature is not skipped (426-428).
- Order of steps inside `Creature::act` (304-465):
  (a) Sleep (311-315). A sleeping creature wakes on a 1-in-8 roll (`xu4_random(8) == 0`, 312-314). Otherwise it does nothing this round (313).
  (b) Action dice, first hit wins (325-339): teleport on 1 in 8, when the creature can teleport (325-326); ranged on 1 in 4, when `ranged != 0` and the magic-flash tile is not blocked by negation (329-331); sleep spell on 1 in 4, when it can cast sleep and is not negated (333-334); flee when the state is `MSTAT_FLEEING` (335-336); otherwise attack (339). The flee check comes after the ranged and sleep dice, so a fleeing creature can still fire or cast sleep.
  (c) Target (345): `nearestOpponent(map, &dist, action == CA_RANGED)`. If there is none, the creature returns (346-347). Opponents are objects of the other side (579-580): a creature targets party members, and under the jinx aura any other creature. The distance is the diagonal `map_distance` for ranged actions (585) and `map_movementDistance` otherwise (587). A candidate replaces the current pick if its distance is strictly smaller, or equal with a 1-in-2 roll (590). The starting value is 0xFFFF (566).
  (d) Melee range (349-350): if the action is attack and `dist > 1`, the action becomes advance. Melee therefore happens only at movement distance 1.
  (e) Camouflage (353-354): a camouflaged creature that cannot show itself does nothing this round.
  (f) Execute (356-463): attack calls `attackHit` and on a hit `dealDamage(getDamage())` (360-365); a party target can be robbed of gold on a 1-in-4 roll for up to 0x3f gold (370-372) or of food, a fixed 2500 (376-378). Sleep spell: each party member that is not poisoned, asleep or dead has a 1-in-2 chance to fall asleep (397-401). Teleport: random coordinates until a creature-walkable tile is found; the first such tile must be FAST or the loop retries once, and the next walkable tile is accepted whatever its speed (407-425). Ranged: fires along the relative direction (441-443). Flee or advance: `moveCombatObject` (449). Fixed-movement creatures do not move (location.cpp 303-304). Flee uses `map_pathAway`, advance uses `map_pathTo` with the edge directions removed (location.cpp 306-322). A flee that leaves the map removes the creature with a "Flees!" message (450-458), and a good creature gives karma (454-455).
  (g) `animateMovement` (464).
- Health states (84-104): dead at 0 or less; fleeing below 24 hp (93-94); critical below max/4 (87, 95); heavy below max/2 (88, 97); light below crit + heavy (89, 99); otherwise barely wounded. `getState` reads the current hp, so the flee check in step (b) uses the hp at the start of the act.
- Map helpers (map.cpp): `map_pathTo` takes the toward mask (115), inverts it for "away" (116-117), masks it with the valid moves (120), then picks a random direction from the mask (123-124), or any valid direction if the mask is empty (127). `map_movementDistance` steps both axes, adding one per axis step (178-186), so for an unwrapped path it equals |dx| + |dy| (wrap at 187 not read).

## 2. Key functions

- `Creature::act`: `/mnt/frankendom-donors/xu4-engine-u4/src/creature.cpp` 304-465 (action dice 325-339; target 345-350; execution 356-463).
- `Creature::nearestOpponent`: `/mnt/frankendom-donors/xu4-engine-u4/src/creature.cpp` 564-601 (nearest with 1-in-2 ties).
- `Creature::getState`: `/mnt/frankendom-donors/xu4-engine-u4/src/creature.cpp` 84-104 (flee floor and health bands).
- `CombatController::moveCreatures` and the round: `/mnt/frankendom-donors/xu4-engine-u4/src/combat.cpp` 416-431 and 790-838.
- `moveCombatObject`: `/mnt/frankendom-donors/xu4-engine-u4/src/location.cpp` 294-345.
- `map_pathTo` / `map_pathAway`: `/mnt/frankendom-donors/xu4-engine-u4/src/map.cpp` 111-135. `map_movementDistance`: 161-191.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ordered action dice, first success wins, each with its own odds | Teleport 1/8 (theirs, creature.cpp 325); ranged 1/4 (329); sleep spell 1/4 (333); wake 1/8 (312) |
| Absolute flee floor: a creature below it flees, whatever its maximum | 24 hp (theirs, 93-94); spawn floor 24 so a creature does not flee at spawn (74-75) |
| Health bands as fractions of the maximum | crit below max/4 (87), heavy below max/2 (88), light below crit + heavy (89) |
| Nearest target, ties replaced with probability 1/2 | 1/2 (theirs, 590) |
| Melee only at distance 1, otherwise advance | `dist > 1` (349) |
| Damage roll from a fraction of max hp | `xu4_random(basehp >> 2)` (64), mapped to `(x >> 4) * 10 + (x % 10)` (65): a digit mix, not a linear scale |
| Steal and sleep effects | Gold roll 1/4 (370), amount below 0x3f (372), food 2500 (378), sleep 1/2 per party member (400) |
| One AI pass per round, after the party | Round at combat.cpp 813-835 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the decision: the sleep wake roll, the action dice in order (teleport, ranged, sleep spell, flee, attack), the nearest foe with the 1-in-2 tie rule, and the switch from attack to advance at distance 1. It omits the negation and magic-flash checks, the camouflage check, the map wrap, the diagonal distance for ranged (the caller passes it in; the donor's `map_distance` was not read), the effects of each action (teleport, sleep, theft, flee and advance moves, the "Flees!" removal) and the party's own turn. It replaces the donor's index fix with a snapshot loop that skips creatures removed earlier in the round. Movement is not modelled: `plan` returns the action and the caller moves.

```ts
// Licence: GPL-3.0 (donor, COPYING). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = (n: number) => number; // integer in [0, n)

interface Pos { x: number; y: number; }

interface Mob extends Pos {
  id: string;
  hp: number;
  asleep: boolean;
  canTeleport: boolean;
  canRanged: boolean;
  canSleep: boolean;
}

type Action = "teleport" | "ranged" | "castSleep" | "flee" | "attack" | "advance";

interface Plan { action: Action; target: Mob; d: number; }

const FLEE_FLOOR_HP = 24; // absolute floor, not a fraction of the creature's maximum

// Manhattan distance: one unit per axis step, so a diagonal neighbour is 2.
function manhattan(a: Pos, b: Pos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Action roll, in the donor's order. Returns null when a sleeping creature stays asleep this round.
function chooseAction(m: Mob, rng: Rng): Action | null {
  if (m.asleep) {
    if (rng(8) !== 0) return null; // 7 in 8: still asleep, no action
    m.asleep = false;               // wakes, then acts this round
  }
  if (m.canTeleport && rng(8) === 0) return "teleport";
  if (m.canRanged && rng(4) === 0) return "ranged";
  if (m.canSleep && rng(4) === 0) return "castSleep";
  if (m.hp < FLEE_FLOOR_HP) return "flee";
  return "attack";
}

// Nearest foe. Each later tie replaces the current pick with probability 1/2, so ties are not uniform.
function nearestFoe(foes: Mob[], dist: (a: Pos, b: Pos) => number, from: Pos, rng: Rng): { foe: Mob; d: number } | null {
  let best: Mob | null = null;
  let bestD = 0xffff;
  for (const f of foes) {
    const d = dist(from, f);
    if (d < bestD || (d === bestD && rng(2) === 0)) { best = f; bestD = d; }
  }
  return best === null ? null : { foe: best, d: bestD };
}

// One creature's decision for the round. Melee that is more than one step away becomes an advance.
function plan(m: Mob, foes: Mob[], rng: Rng, dist: (a: Pos, b: Pos) => number, rangedDist: (a: Pos, b: Pos) => number): Plan | null {
  const action = chooseAction(m, rng);
  if (action === null) return null;
  const pick = nearestFoe(foes, action === "ranged" ? rangedDist : dist, m, rng);
  if (pick === null) return null;
  if (action === "attack" && pick.d > 1) return { action: "advance", target: pick.foe, d: pick.d };
  return { action, target: pick.foe, d: pick.d };
}

// Round: every creature acts once, in list order. A creature removed earlier in the round is skipped.
function creatureRound(
  mobs: Mob[],
  foes: Mob[],
  rng: Rng,
  dist: (a: Pos, b: Pos) => number,
  rangedDist: (a: Pos, b: Pos) => number,
  execute: (m: Mob, p: Plan) => void
): void {
  for (const m of [...mobs]) {
    if (!mobs.includes(m)) continue;
    const p = plan(m, foes, rng, dist, rangedDist);
    if (p !== null) execute(m, p);
  }
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (the engine's enemy brain: action dice, nearest-target choice, flee floor, advance and attack switch). Parity-checklist row 2 (AI brain). Frankendom's current enemy code was not read.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 8 (named target file and parity row); many-on-one target selection lives in the engine

## 6. Gaps and risks

- GPL-3.0 (COPYING, lines 1-2 read): clean-room only. The sketch is written from the steps above, not a translation of the donor lines.
- Target choice has no memory. Each round the creature picks the nearest party member again (creature.cpp 564-601); there is no threat list, no hate and no taunt. Frankendom's many-on-one rule (MAX_ATTACKERS = 3, a hate list in the engine) has to be designed on top of this, not copied from it.
- The tie rule is biased. Each later tie replaces the current pick with probability 1/2 (590), so with k tied members the first wins with probability (1/2)^(k-1), member j (j >= 2) wins with (1/2)^(k-j+1), and the last wins with 1/2. Frankendom should use the seeded server RNG with one explicit tie rule (for example by id) and a test.
- Melee range is a grid rule. Movement distance is the sum of the axis steps (map.cpp 178-186), so a diagonal neighbour is 2 and triggers an advance, not an attack (349). A free 2D browser fight should decide its own adjacency rule and not inherit this one by accident.
- The flee floor is absolute (24 hp, line 93), not a share of each creature's maximum. Frankendom should move it to a per-creature catalogue field (row 21) and keep the 24 default as data.
- Order: a fleeing creature still rolls the ranged and sleep dice first (329-336). Frankendom must pick one order for its flee state and test it.
- Flee is an exit, not a death: a creature that flees is removed from the map (450-457) and gives karma if good. The one ledger must not count it as a server-verified kill.
- Rounds, not frames: the AI runs once per round after the party's turn (combat.cpp 813-835). Frankendom's server tick sub-line ("fixed step, input intake, per-tick NPC budget", row 18 / post-K item 3) has to say how a round maps to ticks; this donor does not map it.
- Randomness: the donor uses `xu4_random` throughout (its source was not read). Frankendom should draw these dice from the seeded server RNG and log them for the fight record (row 19).

Best transferable idea: express an enemy's turn as a short ordered list of action dice, each with its own odds, followed by a nearest-target pick with a fixed tie rule and an absolute flee floor, so the enemy brain is a table rather than a state machine.
