# xu4-engine-u4 (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/xu4-engine-u4/src/combat.cpp` | Licence: GPL-3.0 per repo COPYING (combat.cpp has no licence header) | C++ | symbol `CombatController::beginCombat`

Checked: At 183-227 (verified; it is the setup function, not the roll). The roll is `attackHit` (515-522) and the damage step is `attackAt` (572-618). All read in full, plus `attack` (1142-1264), `finishTurn` (766-876), `PartyMember::getDamage` (party.cpp 399-408), `getAttackBonus`, `getDefense` and `dealDamage` (party.cpp 373-394) and `Creature::getDamage` (creature.cpp 63-66).

## 1. Mechanism

- `beginCombat` (183-227) sets up an encounter: places the party and creatures on a combat map, shows the altar-room banner, starts music (not when camping), makes the first party member active, and pushes the controller. If no party member can fight (and the party is not camping) it finishes the turn at once. It does not roll anything.
- Player attack: `CombatController::attack` (1142-1264) asks for a direction and, for weapons with a choosable range, a range (1145-1160), plays the attack sound, and builds a directional path from the attacker's tile over the weapon's range, stopping at blockers unless the weapon attacks through objects (1167-1172). The default build walks the path calling `attackAt` per tile until one reports a target (1227-1236); a GPU-render build resolves the same steps through `attackAt2` and then applies the hit or miss itself (1182-1225). Afterwards a thrown weapon may be lost, a weapon may leave a tile behind, a miss with no target flashes the miss tile, and a returning weapon is returned (1239-1263).
- `attackAt` (572-618) finds the creature on the target tile. No creature (or a wrong absolute range): the miss tile is flashed only if the weapon shows its travel, and it returns false. Otherwise a non-magic weapon in the Abyss misses, and `attackHit` decides the rest.
- `attackHit` (515-522): roll uniform 0-255 (`xu4_random(0x100)`), add the attacker's attack bonus, and hit when the sum is greater than the defender's defence. A party member's attack bonus is 255 (always hits) if the weapon always hits or dexterity is 40 or more, otherwise its dexterity (party.cpp 373-377); a party member's defence is its armour's defence value (379-381); a creature's attack bonus is 0 and its defence 128 (creature.cpp 498-504).
- On a hit: flash the hit tiles, play the hit sound, call `attacker->dealDamage(map, creature, attacker->getDamage())`, and clear the creature if it dies. A party member's damage is `random(min(255, weapon damage + strength))` (party.cpp 399-408); a creature's is derived from its base HP (`x = random(basehp / 4)`, then `(x >> 4) x 10 + x % 10`, creature.cpp 63-66). A kill by a party member awards the creature's XP (party.cpp 383-394). A miss prints "Missed!" and flashes the miss tile.
- `finishTurn` (766-876) advances the turn: ends combat if won, applies the standing tile's effect to the player (783-786), a quickness aura gives a free extra move on a coin flip (788), otherwise loops: the map's annotations pass a turn, a sleeping member wakes on a 1-in-8 roll, the current member loses focus and the party eats food, and focus moves to the next member; on wrapping past the last member the party's turn ends, the aura counts down, all creatures move and take tile effects, and the fight ends if lost or if the enemy fled (793-851). The loop repeats until an able, active player is found (856-861).
- Turn-based: a roll happens per action, not per tick.

## 2. Key functions

- `CombatController::beginCombat`: `combat.cpp` 183-227. Setup, not the roll.
- `CombatController::attackHit`: `combat.cpp` 515-522. The single d256 roll against defence.
- `CombatController::attackAt`: `combat.cpp` 572-618. Target lookup, range, miss or damage branch.
- `CombatController::attack`: `combat.cpp` 1142-1264 (read in full). Direction and range input, path, first target, weapon loss and return.
- `PartyMember::getAttackBonus`, `getDefense`, `getDamage`, `dealDamage`: `party.cpp` 373-408. The numbers behind the roll, the damage amount and the XP award.
- `CombatController::finishTurn`: `combat.cpp` 766-876. Turn advance, quickness, sleep, next actor.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One uniform roll over a fixed range plus bonus, hit when greater than defence | Range 0-255 (theirs, `0x100`, combat.cpp 520); creature defence 128 (theirs, creature.cpp 503); dexterity 40 or more always hits (theirs, party.cpp 374) |
| Miss on a class of target or terrain | Abyss non-magic miss rule (theirs) |
| Free extra action on a coin flip while a timed buff is active | Quickness aura, one-in-two (theirs, combat.cpp 788) |
| Wake sleepers on a one-in-eight roll each turn | Eight (theirs, combat.cpp 799) |
| Path over range stopping at blockers | Blocker rules per tile (theirs) |

## 4. TypeScript sketch

simplified: omits the Abyss rule, the absolute-range check, damage (a party member's `random(min(255, weapon + strength))`) and the XP award, the one-target-per-attack path walk, weapon loss and return, and the full `finishTurn` loop (food, auras, creature moves, win and loss checks). The path helper models only the blocker stop.

```ts
// Licence: GPL-3.0 (donor, per COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Roll = () => number; // uniform in [0, 1)

// One uniform roll over a fixed range, plus the attacker's bonus, must beat the defence.
function attackHit(bonus: number, defence: number, roll: Roll, range = 256): boolean {
  const value = Math.floor(roll() * range) + bonus;
  return value > defence;
}

// Path over range: step along the direction until the range ends or a blocker stops it.
function pathTiles(start: number, range: number, blocked: (t: number) => boolean): number[] {
  const out: number[] = [];
  for (let t = start + 1; t <= start + range; t++) {
    if (blocked(t)) break;
    out.push(t);
  }
  return out;
}

// A sleeping actor may wake on a one-in-eight roll each turn.
function maybeWake(sleeping: boolean, roll: Roll): boolean {
  return sleeping && roll() < 1 / 8;
}

// Extra action from a timed aura on a coin flip.
function freeExtraAction(auraActive: boolean, roll: Roll): boolean {
  return auraActive && roll() < 0.5;
}
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 1 (duel step / sim): the one-roll-against-defence shape is the simplest form of the hit step. Reference only; Frankendom's hit step is already in `stepDuel` (`src/duel.ts` line 221, checked in worktree `frankendom-backend`, commit 46e670530). The kill-awards-XP step (`PartyMember::dealDamage`) is the donor's version of checklist row 18, which Frankendom keeps as a server ledger write.
- today: `src/duel.ts` (moving).
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only.
- Turn-based and tile-based. Frankendom's fight is real-time 60 Hz on a free plane, so the path and turn code do not transfer.
- The one-roll shape has no crit, block or posture. Frankendom's richer chain is already in the duel step (`src/duel.ts`, moving); this donor adds no rule there.
- The donor awards XP inside `dealDamage`, in the same call as the hit; Frankendom's kills are server-verified and the award is a separate ledger write (checklist row 18).
- Sleep, quickness and the Abyss rule are game-world states with no Frankendom counterpart.
