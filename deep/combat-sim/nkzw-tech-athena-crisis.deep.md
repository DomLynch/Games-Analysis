# nkzw-tech-athena-crisis (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/lib/calculateDamage.tsx` | Licence: MIT (repo LICENSE.md) | TypeScript | symbol `calculateDamage`

Checked: `calculateDamage` opens at 6 and closes at 28 (verified; the file is 28 lines long, read in full). `calculateLikelyDamage` (9-48) and `Weapon.getDamage` (Unit.tsx 481-483) were also read in full.

## 1. Mechanism

- A pure damage formula for one unit attacking one entity on a grid. Inputs: the attacker unit (current health), the target entity (its defence stat and whether it is a shielded unit), the weapon (its damage against this target type), the cover value on each side, the attack-side and defence-side status multipliers, a flat-damage status value, and a luck multiplier.
- If the weapon is flat-damage, the result is the weapon's damage plus the flat status value, with a floor. Otherwise: health factor = 0.666 x (health / max health) + 0.334, so a damaged attacker keeps at least a third of its power.
- Offence = weapon damage x attack status, zeroed if the target is a shielded unit. Defence = target's defence x defence status. Cover on the attacker side multiplies by `1 + coverA / 400`, or by 1 for an attacker without cover (air and building units, 25); cover on the target side multiplies the defence by `1 + coverB / 100`, or by 1 for a target without cover (26). A shielded unit target zeroes the offence (23). Weapon damage comes from a per-target-type table, 0 if absent (`getDamage`, Unit.tsx 481-483).
- Result = max(floor, health factor x offence x attacker cover x luck - defence x target cover). Called per attack from the caller. The preview wrapper `calculateLikelyDamage` (9-48) calls it with luck 1, adds the tile cover from the map (finite values only) plus a building-cover bonus when a building stands on the tile (31-32), multiplies by a modifier, rounds up, floors at `MinDamage`, and multiplies by the poison-skill factor when the target is poisoned and the attacker's player has the acid-bomber skill (40-44). No tick: one call per attack.
- The preview wrapper calls the same formula with luck fixed at one, so a preview is this function with one input changed, not a second rule.

## 2. Key functions

- `calculateDamage` (default export): `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/lib/calculateDamage.tsx` 6-28. The whole formula.
- `calculateLikelyDamage`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/lib/calculateLikelyDamage.tsx` 9-48 (the preview wrapper, read in full). Adds the map cover per tile and building cover, a modifier, a ceil with the minimum-damage floor, and a poison-skill multiplier.
- `Weapon.getDamage`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/info/Unit.tsx` 481-483. Looks up the weapon's damage by the target's entity type; 0 if absent.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Health factor: keep a fraction of power at zero health, scale linearly with health | 0.666 and 0.334 (theirs, calculateDamage.tsx 21) |
| Offence minus defence, with each side scaled by cover | Cover divisors 400 (attacker) and 100 (target) (theirs) |
| Floor on damage so a hit always lands for something | `MinDamage` = 5 (theirs, athena/map/Configuration.tsx 41) |
| Health from a max | `MaxHealth` = 100 (theirs, athena/map/Configuration.tsx 40) |
| Flat-damage weapons skip the formula | Flag on the weapon (theirs) |
| Luck multiplier on the attacker's side | Passed in as 1 by the preview (theirs, a random-luck input) |

## 4. TypeScript sketch

simplified: shapes are reduced to the numbers the formula reads; the sketch drops the unit and entity type checks (the donor tests shield only on unit targets, and cover-free types by entity kind), and takes `weaponDamage` as a number instead of looking it up by target type. The flat-damage branch and the main branch are in the donor's order, and the lifted lines are unchanged in logic.

```ts
// Licence: MIT (donor). Logic lifted from athena/lib/calculateDamage.tsx lines 17-27; MaxHealth and MinDamage are passed in (theirs: 100 and 5).
// Plain TypeScript, no imports. Shapes are reduced to the numbers the formula reads.
interface Side {
  health: number;          // attacker's current health
  cover: number;           // cover value on the attacker's tile (0 for air or building)
  noCover: boolean;        // true for air or building units
}
interface Target {
  defence: number;         // target's defence stat
  cover: number;           // cover value on the target's tile
  noCover: boolean;        // true for an entity without cover
  shielded: boolean;       // a shielded unit blocks the weapon's offence
}

export function calculateDamage(
  a: Side, b: Target, weaponDamage: number, flatDamage: boolean,
  attackStatus: number, defenceStatus: number, flatStatus: number, luck: number,
  maxHealth: number, minDamage: number,
): number {
  if (flatDamage) return Math.max(minDamage, weaponDamage + flatStatus);

  const health = 0.666 * (a.health / maxHealth) + 0.334;
  const offence = b.shielded ? 0 : weaponDamage * attackStatus;
  const defence = b.defence * defenceStatus;
  const coverA = a.noCover ? 1 : 1 + a.cover / 400;
  const coverB = b.noCover ? 1 : 1 + b.cover / 100;
  return Math.max(minDamage, health * offence * coverA * luck - defence * coverB);
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module, engine damage step): the health-scaled offence and the floor are a reusable shape for a turn-based hit. Parity-checklist row 1 (duel step / sim); the weapon-by-target-type damage table is a catalogue field (row 21).
- today: `src/combat.ts` (moving to `src/fight/combat.ts`) holds the flat combat helpers; no damage module exists yet.
- Reuse tag: adapt
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- MIT: the logic is lifted in the sketch with its path. Attribution in the sketch header stays.
- The formula is a grid-tactics model (cover per tile, shields as units). Frankendom's duel has no grid cover and no shield unit. Only the shape (health-scaled offence minus defence, with a floor) transfers.
- The `luck` factor is a random input multiplied into damage. Frankendom's kills are server-verified and replayed, so any luck term must be a recorded input of the one seeded stream (`withRoll` in `src/duel.ts`), not a client roll.
- Floors and caps (`MinDamage` 5, `MaxHealth` 100) are game numbers. Frankendom must set its own; no values are proposed here.
- The preview path (`calculateLikelyDamage`) passes `luck = 1`, so the preview and the real hit differ by design. Frankendom should not show a preview whose numbers differ from the server result.
