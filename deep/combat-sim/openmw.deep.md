# openmw (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/combat.cpp` | Licence: GPL-3 | C++ | symbol `blockMeleeAttack / getHitChance`

Checked: At 71 (verified: `blockMeleeAttack` 71-178; `getHitChance` 316-350; `projectileHit` 224-314, which calls it at 244; all read in full). The melee callers `Npc::hit` and the hit roll in `mwclass/npc.cpp` 555-677 were also read.

## 1. Mechanism

- Hit chance (`getHitChance`, 316-350): attack term = (skill + agility / 5 + luck / 10) x fatigue term, then plus fortify-attack and minus blind (343-347). Defence term, only if the victim's fatigue is not below zero: evasion (only if the victim is not knocked down, paralysed, or unaware of a player attacker), plus the chameleon and invisibility magnitudes each times `fCombatInvisoMult` and capped at 100 (324-342). The result is `round(attack - defence)`. Ranged: `projectileHit` (224-314, call at 244) misses if `roll0to99 >= hitChance`; on a hit, damage is bow chop plus ammo chop at the attack strength, then weapon wear, resistance to normal weapons, a werewolf silver multiplier, and a multiplier for a knocked-down or unaware victim (254-290). Melee: a separate check `roll0to99 < hitChance` runs in `Npc` before `hit` (npc.cpp 568-570); `Npc::hit` then computes damage from the chop, slash or thrust range at the attack strength (610-621), applies the same wear and resistance, a critical multiplier for an unaware victim (player attackers only) and a knocked-down multiplier (645-660), and finally calls `blockMeleeAttack`; a successful block sets `damage = 0` (667-668). God mode on the player also zeroes it (670-671).
- Block (`blockMeleeAttack`, 71-178): returns false unless the blocker has an inventory, is not knocked down, hit-recovering or paralysed, is ready to block, has an armour item in the left-hand slot, and the attacker sits inside the block arc (two GMST angles, 74-105).
- Block chance: blocker term = block skill + 0.2 x agility + 0.1 x luck, times a swing term (attack strength x multiplier + base), times a still-bonus if the blocker is not moving, times the fatigue term. Attacker term = weapon skill + 0.2 x agility + 0.1 x luck, times fatigue. The chance is `x = clamp(int(blocker - attacker), min, max)` (truncated, not rounded, 136), and the block succeeds when `roll0to99 < x`. The swing term uses the attacker's attack strength; the still-bonus applies when the blocker's forward movement is not positive (118-122). The attacker skill is hand-to-hand when unarmed (126-129).
- On a block (139-175): an armour-hit sound by shield skill, shield durability is reduced by the incoming damage (the shield unequips at zero), the blocker loses fatigue (a base, plus encumbrance times a multiplier, plus weapon weight x attack strength x a multiplier), the block flag is set for the animation, and the player gains skill use. The caller then zeroes the damage.
- Inputs: attacker, blocker, weapon, damage, attack strength. Outputs: a boolean block, shield condition change, sound.
- Tick: per hit event, not a fixed step.

## 2. Key functions

- `blockMeleeAttack`: `combat.cpp` 71-178. Block gates, arc check, block chance, shield wear.
- `getHitChance`: `combat.cpp` 316-350. Attack term minus defence term, rounded.
- `projectileHit`: `combat.cpp` 224-314 (the hit-chance call is at 244). Ranged miss roll, damage from bow plus ammo, multipliers.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Skill-plus-attributes attack term, minus defence term, one roll against it | Coefficients 0.2 agility and 0.1 luck in the block terms; agility / 5 and luck / 10 in the hit-chance attack term (theirs, combat.cpp 110-111, 343-344) |
| Block chance as a clamped difference of two terms, one roll | Min and max block chance, GMST values (theirs, game data) |
| Fatigue scales both sides | Fatigue term (theirs, from stats) |
| Arc gate: block only inside a left and right angle | Two GMST angles (theirs) |
| Still bonus on a block | Still-bonus GMST value (theirs) |
| Shield wear proportional to damage | Wear rule (theirs) |

## 4. TypeScript sketch

simplified: omits the gates (knocked down, hit recovery, paralysis, ready to block, shield slot), the swing term, the still bonus, fatigue loss on a block, the shield's durability bookkeeping (the sketch's `shieldWear` is only `damage x wearPerDamage`; the donor takes the damage truncated to an integer 1:1, caps it at the shield's remaining health and unequips the shield at zero), the choice of the attacker's skill (hand-to-hand when unarmed, otherwise the weapon's skill; `attackTerm` takes the skill as given), the hit-chance contest with the defender's evasion, and the full-negate of the blocked damage.

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Roll = () => number; // uniform in [0, 1)

// Attack side of a contest: skill plus attribute terms, scaled by fatigue.
function attackTerm(skill: number, agility: number, luck: number, fatigueTerm: number): number {
  return (skill + 0.2 * agility + 0.1 * luck) * fatigueTerm;
}

// Block chance is the clamped difference between the blocker's term and the attacker's term (truncated to an integer).
function blockChance(blockerTerm: number, attackerTerm: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(blockerTerm - attackerTerm)));
}

// The block succeeds on one roll against that chance (percent scale).
function blockSucceeds(chancePct: number, roll: Roll): boolean {
  return roll() * 100 < chancePct;
}

// The block only counts inside an arc around the blocker's facing.
function inBlockArc(angleDeg: number, left: number, right: number): boolean {
  return angleDeg >= left && angleDeg <= right;
}

// Shield wear is proportional to the incoming damage.
function shieldWear(damage: number, wearPerDamage: number): number {
  return damage * wearPerDamage;
}
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 3 (guard, parry, roll, stamina): the clamped-difference block chance, the arc gate and the fatigue cost of a successful block are candidate shapes for the guard step. Compare with the existing guard and parry rules first (guard profile and `covers`, `src/duel.ts` line 164, checked in worktree `frankendom-backend`, commit 46e670530).
- today: `src/duel.ts` (moving).
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- Frankendom's guard is a direction cover (`covers` in `src/duel.ts` line 164), not a skill contest, and it is deterministic and replayed by the verifier. Adopting a rolled skill-difference chance would change the guard model and add RNG to the replayed stream; that decision is not this file's.
- The attribute coefficients (agility, luck) are Morrowind stats. Frankendom's catalogue (checklist row 21) has no such fields; none map without adding them.
- The projectile path has no Frankendom counterpart (melee only in the duel step).
- A block here fully negates the hit and the hit roll comes before it, so the hit chance and the block chance are two independent rolls; Frankendom's guard-and-parry model has neither roll.
- `getHitContact`, `isReadyToBlock`, `adjustWeaponDamage` and `getHandToHandDamage` were not read.
