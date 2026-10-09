# otland-forgottenserver (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/otland-forgottenserver/src/combat.cpp` | Licence: GPL-2 | C++ | symbol `Combat::doTargetCombat / Combat::getCombatDamage`

Checked: At 788 (verified: `doTargetCombat` 788-885; `getCombatDamage` 63-98, not 788; both read in full). `normal_random` (tools.cpp 190-201) was also read.

## 1. Mechanism

- `getCombatDamage` (63-98) sets the raw damage for a combat param. Every roll is `normal_random(min, max)` (tools.cpp 190-201): a draw from a normal distribution with mean 0.5 and sd 0.25, redrawn until it falls in 0 to 1, then mapped onto min..max, so mid values are far likelier than the ends. Kinds: a plain damage formula uses `mina..maxa` (68-69); otherwise a creature's own min and max if it has them (72-73; which creature kinds supply them was not read); else for a player a script callback, or the level-magic formula `level x 2 + (magic level + special magic level) x 3`, fused as `levelFormula x mina + minb` to `levelFormula x maxa + maxb` (77-82), or the skill formula `minb .. weaponDamage x maxa + maxb` plus the weapon's element as the secondary damage (83-93). Output: `CombatDamage` with primary and secondary values.
- `doTargetCombat` (788-885) runs for one target. Order: a distance effect if set (790-792); for health damage, `g_game.combatBlockHit` (798, body in `game.cpp`, not read), and a blocked hit returns; mana drain skips all of this and goes straight to `combatChangeMana` (823-825).
- PvP halving (803-809): if the caster is a player, the target is a different player not on black skull, and the damage is not healing, both primary and secondary values are halved (integer division).
- Critical (811-819): if not already critical and not healing or condition damage, a caster-player's critical chance and amount apply (both must be above zero): on a roll of 1-100 at or under the chance, `round(value x amount / 100)` is added to both values and the hit is flagged critical.
- `g_game.combatChangeHealth` applies the damage (822; body not read). On success (827-880): conditions are applied only if the block type is none or armour; each is cloned, owned by the caster, and added unless the target is immune (a caster hitting itself skips the immunity test); a critical effect is shown; life leech and mana leech (once per hit, not for healing, not for condition ticks, not for self-hits, only while below max): each rolls 1-100 against its chance and heals `round(totalDamage x amount / 10000)`; then the dispel of the matching condition. Finally a target callback.
- Tick: per combat event, not a fixed step.

## 2. Key functions

- `Combat::doTargetCombat`: `combat.cpp` 788-885. Block, PvP halving, critical, apply, conditions, leech, dispel.
- `Combat::getCombatDamage`: `combat.cpp` 63-98. Raw value from formula kind.
- `g_game.combatBlockHit` (call site): `combat.cpp` 798, inside `doTargetCombat`. Block gate that can end the attack before damage. Body not read; it lives in `game.cpp`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Damage from one of several formula kinds chosen per attack | Formula kinds: plain, creature values, level-magic, skill (theirs, 68-93); `normal_random` mean 0.5, sd 0.25 (tools.cpp 192) |
| PvP damage halving between two players | Halving (theirs, 807-808), exempt for black skull (theirs, 805) |
| Critical as a chance roll with an amount in percent of damage | Chance and amount from player skills (theirs) |
| Life and mana leech as a chance roll and a fraction of damage | Leech chance and amount per 10000 (theirs, 858, 868) |
| Attach conditions to the target unless immune | Condition list per spell (theirs) |

## 4. TypeScript sketch

simplified: omits the block gate, the secondary damage value, the PvP exemptions beyond one flag, the mana-drain path, condition application and dispel, and the once-per-hit and below-max leech conditions. The chance rolls in `criticalAdd` and `leechHeal` use the same bell-shaped draw as the donor's `normal_random(1, 100)` (combat.cpp 814, 857, 867; tools.cpp 190-201), not a uniform draw, via `bellRoll`; the caller supplies the unit draw. The critical sketch keeps the donor's rounding; the sketch does not model the "both values above zero" requirement.

```ts
// Licence: GPL-2 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Roll = () => number; // the donor's bell-shaped unit draw in [0, 1] (normal(0.5, 0.25), redrawn outside 0..1), see bellRoll

// PvP: damage between two players is halved, unless the target is flagged for it.
function pvpHalve(damage: number, casterIsPlayer: boolean, targetIsPlayer: boolean, targetExempt: boolean): number {
  return casterIsPlayer && targetIsPlayer && !targetExempt ? Math.trunc(damage / 2) : damage;
}

// Critical: a chance roll (the donor's normal_random(1, 100), combat.cpp 814); when it hits, add a percent of damage on top.
function criticalAdd(damage: number, chancePct: number, amountPct: number, roll: Roll): number {
  return bellRoll(1, 100, roll) <= chancePct ? Math.round((damage * amountPct) / 100) : 0;
}

// Leech: a chance roll (normal_random(1, 100), combat.cpp 857, 867); when it hits, heal a fraction of the total damage.
function leechHeal(totalDamage: number, chancePct: number, amountPer10000: number, roll: Roll): number {
  if (bellRoll(1, 100, roll) > chancePct) return 0;
  return Math.round((Math.abs(totalDamage) * amountPer10000) / 10000);
}

// A draw mapped onto min..max with a bell-shaped weight (the donor redraws a normal(0.5, 0.25) value until it lies in 0..1).
function bellRoll(min: number, max: number, unit: () => number): number {
  const lo = Math.min(min, max), hi = Math.max(min, max);
  return lo + Math.round(unit() * (hi - lo));
}

// Level-magic formula: one scalar scales both ends of the range.
function levelMagicDamage(level: number, magic: number, mina: number, minb: number, maxa: number, maxb: number, unit: () => number): number {
  const f = level * 2 + magic * 3;
  return bellRoll(f * mina + minb, f * maxa + maxb, unit);
}
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 1 (duel step / sim): the critical-as-chance-plus-percent step is a shape for the hit step; compare with the crit and damage rules in `stepDuel` (`src/duel.ts` line 221) first. Leech and conditions are specials, row 13.
- Frankendom has no leech. PvP is a server flag (`Fighter.pvp` in `src/fight/world.ts`); PvP halving would be a tuning rule on that flag.
- today: `src/duel.ts` (moving).
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2: clean-room only.
- Authority: this runs on the server and writes to the world. Frankendom's kill is verified by replay (`src/net/verify-duel.ts`); any halving or leech added to the sim must be in the replayed stream, or the verifier will disagree with the client.
- The donor rolls with a bell-shaped `normal_random`, not a uniform draw. Frankendom's seeded stream (`withRoll`, `src/duel.ts` line 92) would need that shape added deliberately, as a data field, if wanted.
- The critical amount is a player-skill number. Frankendom's crit is in `src/fight/duel.ts (today: src/duel.ts, moving)`; do not add a second crit source.
- `doTargetCombat` depends on `combatBlockHit` (not read). Block is therefore not described here. `combatChangeHealth` (not read) is where the donor actually reduces health; one ledger means Frankendom keeps that in one place too.
