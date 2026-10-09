# alexbatalov-fallout2-ce (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat.cc` | Licence: Sustainable Use License v1.0 (donor LICENSE.md: internal business or non-commercial/personal use only, free non-commercial distribution only). Clean-room only: never a line-by-line translation | C++ | symbol `attackCompute`

Checked: (3819-3983, verified, read in full). Also read in full: `attackDetermineToHit` (4314-4498), `attackComputeCriticalHit` (4089-4159), `attackComputeDamage` (4501-4660), and in `random.cc` `randomRoll` (85-95) and `randomTranslateRoll` (101-131). Clean-room only, because the licence (Sustainable Use License v1.0) limits use to internal business or non-commercial purposes.

## 1. Mechanism

- `attackCompute` (3819-3983) resolves one attack for one turn-based action. Input: an `Attack` record (attacker, defender, weapon, hit mode, target hit location). Output: flags on the attack record (DAM_HIT, DAM_CRITICAL, knockback), damage, and any accidental target.
- Range gate first: if the weapon range is below the distance, return -1 (no attack).
- Accuracy comes from `attackDetermineToHit` (4314-4498): unarmed skill, or the weapon's skill value; for ranged and thrown weapons a distance term built from the attacker's perception (multiplier 4 for long range, 5 for scope with a minimum distance of 8, otherwise 2; the term is then multiplied by -4, or -12 when the attacker is blind and the term is not negative, 4358-4393) and -10 per critter in the line of fire (4401); one-hander trait (-40 two-handed, +20 one-handed, 4404-4410); strength shortfall x -20 (4412-4420); accurate weapon +20; minus the target's armour class (4427-4435); called-shot penalty (full for ranged, half otherwise, 4437-4441); +15 against multi-hex targets; light-level penalty for the player (-40, -25, -10 by light, 4447-4464); -25 if the attacker is blind; +40 if the target is down or out; difficulty offset (-20 or +20) for the non-player team; and a cap of 95 (4489-4491). The lines carrying -40, +15, -25, +40 and -20/+20 are under 15 characters, so each is receipted by its condition line.
- Hit roll (`attackCompute` 3849-3854): burst and continuous fire go through a spray routine (not read); otherwise `randomRoll(accuracy, critChance - hit_location_penalty[location])`. `randomRoll` rolls d100, delta = accuracy - d100. A negative delta is a failure, and (once at least one in-game day has passed, or the config removes the limit) it becomes a critical failure when a d100 is at most `-delta / 10`. A non-negative delta is a success, upgraded to a critical success when a d100 is at most `delta / 10 + modifier` (random.cc 110-128). The modifier here is the attacker's critical-chance stat minus the location penalty.
- Between the roll and the outcome (3856-3907): a jinxed attacker's failure becomes a critical failure on a coin flip; for the player's melee and unarmed hits, Slayer forces a critical, Silent Death sets the damage multiplier to 4 on a sneak hit from behind, and a bonus critical chance may upgrade the hit; for the player's ranged hits, Sniper upgrades to a critical when a d10 is at most luck; the ammo cost is computed (and can abort the attack).
- A critical success goes to `attackComputeCriticalHit` (4089-4159): a defender that is invulnerable or not a critter returns multiplier 2 with no critical flags. Otherwise a d100 plus the attacker's better-criticals stat picks a tier by cutoffs 20, 45, 70, 90, 100 (above 100 is tier 5). The tier indexes a table by hit location, either the player table or one per defender kill type. It sets defender flags and a message, may roll a stat for a massive-critical result, may trigger random crippling, adds knock-out for an enhanced-knockout weapon, strips flags that are invalid for the defender, and returns the table's damage multiplier. Silent Death then doubles that multiplier (3914-3921).
- Success (or critical) sets the hit flag, applies knock-out rules and calls `attackComputeDamage` (4501-4660): damage threshold and resistance for the damage type (bypass flag cuts both to 20 %), ranged bonus damage for the player, difficulty modifier (75 % easy, 125 % hard for the non-player team), then, in the default branch (the Glovz and Yaam damage modes at 4574-4577 are not read), per ammo unit `((weapon damage + bonus) x multiplier / ammo divisor) / 2`, times difficulty, minus threshold, minus resistance percent (clamped 0 to 100 with the ammo modifier), added if positive (4586-4615); perk flat bonuses; knockback distance = damage / 10 (or / 5) for melee, unarmed and explosion hits on critters that can be knocked back (4633-4658). Failure on a ranged or thrown attack calls `_check_ranged_miss`; a critical failure calls `attackComputeCriticalFailure`.
- After that, a ranged or thrown attack with no hit or critical flags travels beyond the target (grenades scatter) and can strike the first blocking object or creature as an accidental target for damage multiplier 2 (3938-3967); explosions then hit extras (3972-3978) and death flags are computed (3980).
- Turn-based: the function runs once when the attacker takes an action, not on a fixed tick.

## 2. Key functions

- `attackCompute`: `combat.cc` 3819-3983. Roll dispatch, crit, miss scatter, explosions.
- `attackDetermineToHit`: `combat.cc` 4314-4498. The accuracy build-up.
- `randomRoll`: `random.cc` 85-95. d100 against difficulty, delta sign gives success or failure.
- `attackComputeDamage`: `combat.cc` 4501-4660. Threshold, resistance, ammo and difficulty multipliers, knockback.
- `randomTranslateRoll`: `random.cc` 101-131. Critical failure on -delta/10, critical success on delta/10 plus the modifier, both gated by game time.
- `attackComputeCriticalHit`: `combat.cc` 4089-4159. Second d100 plus stat, tier table, flags and cripple.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Signed-margin roll: success if d100 <= accuracy, delta = accuracy - d100 | Accuracy is skill-derived (theirs) |
| Critical chance grows with the margin (delta/10 plus a modifier) | 10 % per 10 points of margin; time gate once a day has elapsed (theirs, random.cc 113, 122) |
| Critical tier from a second d100 plus an attacker stat, cut into bands | Band cutoffs 20/45/70/90/100 (theirs, combat.cc 4107-4118) |
| Per-location crit table (hit location x tier) | Table contents (theirs, data) |
| Range accuracy penalty per unit beyond the effective range | x4, x5 and x2 perception multipliers by weapon perk; -4 per distance step, -12 when blind; accuracy cap 95 (theirs, 4340-4348, 4383-4389, 4489) |
| Line-of-fire blockers cost accuracy | -10 per critter in line of fire (theirs) |
| Strength shortfall penalty | -20 per point short; one-hander -40 two-handed, +20 one-handed (theirs) |

## 4. TypeScript sketch

simplified: omits the accuracy build-up, the 95 cap, the hit-location penalty subtracted from the critical-chance stat (the caller passes the resulting `critChanceMod`; the donor reads STAT_CRITICAL_CHANCE minus the location penalty at combat.cc 3852-3853 and uses a separate STAT_BETTER_CRITICALS, 4104, for the tier, which the sketch takes as `betterCriticals`), the jinx, Slayer, Sniper and Silent Death branches, the ammo and spray paths, the invulnerable and non-critter early return, the second-roll gate on game time, the damage formula (threshold, resistance, divisors) and the accidental-target scatter. Roll results are reduced to hit or miss with a multiplier.

```ts
// Licence: Sustainable Use License v1.0 (donor; non-commercial / internal use only). Clean-room sketch from the described mechanism, never a line-by-line translation.
type Roll = 'critFail' | 'fail' | 'success' | 'critSuccess';

// Signed margin: success when d100 is at or under the accuracy; the margin also drives the crit chance.
function rollMargin(accuracy: number, d100: number, critChanceMod: number, critRng: () => number): Roll {
  const delta = accuracy - d100;
  if (delta < 0) {
    return critRng() * 100 <= -delta / 10 ? 'critFail' : 'fail';
  }
  return critRng() * 100 <= delta / 10 + critChanceMod ? 'critSuccess' : 'success';
}

// Crit tier from a fresh d100 plus an attacker bonus, cut into bands.
function critTier(d100: number, bonus: number): number {
  const v = d100 + bonus;
  if (v <= 20) return 0;
  if (v <= 45) return 1;
  if (v <= 70) return 2;
  if (v <= 90) return 3;
  if (v <= 100) return 4;
  return 5;
}

// Resolve one attack into a hit flag and a damage multiplier from the crit table.
function resolveAttack(
  accuracy: number,
  d100: number,
  critChanceMod: number, // critical-chance stat minus hit-location penalty
  betterCriticals: number, // separate stat, added to the tier roll
  rng: () => number,
  tierD100: () => number,
  critTable: number[][],
): { hit: boolean; mult: number } {
  const r = rollMargin(accuracy, d100, critChanceMod, rng);
  if (r === 'critSuccess') return { hit: true, mult: critTable[critTier(tierD100(), betterCriticals)][0] };
  if (r === 'success') return { hit: true, mult: 2 };
  return { hit: false, mult: 0 };
}
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 1 (duel step / sim): the signed-margin roll, the margin-driven crit chance and the threshold-then-resistance order are candidates for the hit step. Compare with `stepDuel` (`src/duel.ts` line 221, checked in worktree `frankendom-combat-p3`, commit 6adcab27e) first.
- TARGET `src/gore.ts` (not moving in the checklist), parity-checklist row 8 (blood, wounds, decals): the per-location crit table maps onto the existing wound site (`woundSite` field and its `'torso'` default in `createFighter`, `src/duel.ts` lines 24 and 104). Data, not code.
- today: `src/duel.ts` and `src/gore.ts`.
- Reuse tag: rewrite-from-idea (licence forbids reuse of code; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Licence is the Sustainable Use License v1.0 (internal business or non-commercial use only; free non-commercial distribution only): this file is clean-room only. No lines may be copied or translated line by line.
- The donor's roll is one d100 per action with a separate crit d100. `src/duel.ts` already carries a seeded roll (`withRoll`, line 92). The seeded stream should be reused, not a second RNG, so the server verifier replays it.
- The day-2 time gate is a game-clock rule with no Frankendom counterpart. Do not carry it over.
- Accuracy modifiers (range, light, called-shot, armour class) belong to turn-based and ranged play. Frankendom's duel is melee with no range, light or called shots in the engine step, so most terms have no target.
- Perk multipliers (Slayer, Silent Death, Sniper) are theirs and have no Frankendom perk equivalent.
- The donor's damage is a threshold-then-resistance chain on a per-damage-type stat; Frankendom's catalogue has no such fields (checklist row 21), so adopting it means adding catalogue fields first.
