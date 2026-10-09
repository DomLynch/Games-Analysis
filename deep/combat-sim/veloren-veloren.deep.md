# veloren-veloren (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/veloren-veloren/common/src/combat.rs` | Licence: GPL-3 | Rust | symbol `Attack.apply_attack`

Checked: At 283 (verified, closes at 1052). Also read in full: `compute_block_damage_decrement` (186-257), `Attack::compute_damage_reduction` (259-281), `Damage::compute_damage_reduction` (1748-1787), `calculate_health_change` (1789-1844).

## 1. Mechanism

- `Attack::apply_attack` (283-1052) resolves one attack event against one target. Inputs: optional attacker info, target info (stats, inventory, character state, orientation), attack direction, options (target dodging, PvP permit, friendly fire, target group), strength modifier, precision multiplier, attack source. Outputs: health, energy, poise and buff events, and a per-attack hook.
- Setup (312-407): the options carry dodging, PvP permit, friendly fire, target group and an optional precision multiplier. `avoid_damage` is true when the target is dodging, or PvP is not permitted and the entry targets the out-of-group side (325-328). The attacker's conditional precision modifiers are folded with the options' multiplier (max, or min if an override flag is set, 334-373), then combined with the target's vulnerability override (max, 379-383). `precision_power = 1 + (attack precision_multiplier - 1) x attacker's precision-power stat` (385-389). `damage_modifier` is the attacker's attack-damage stat (402-404).
- Per damage entry (filtered by friendly-fire or group match, then not avoided, 405-414): (1) damage reduction (`Attack::compute_damage_reduction`, 259-281): penetration is the attacker's `mitigations_penetration` clamped to 0..1; the target's raw reduction is kept if it is already 100 %, otherwise scaled by (1 - penetration). (2) `damage_with_precision = value x strength_modifier x damage_modifier x (1 + precision_mult x (precision_power - 1))` (421-423). (3) block soak from `compute_block_damage_decrement` on that precise damage (425-436). (4) `calculate_health_change` (438-448).
- Block (186-257): applies only if the attack is blockable, the damage is positive, and the target has a character state, orientation and inventory. It needs the target facing the attack within its block angle, parry or block active for this source, and block strength above zero (206-208). A parry sets the strength to the damage itself (full negate) and emits a parry hook (210-219); the hook's poise multiplier is `2.0 - min(damage / strength, 1)`, evaluated after the strength was set to the damage, so it is always 1.0 as written. Poise cost is `min(damage / strength, 1) x MAX_BLOCK_POISE_COST` (25), reduced by the target's poise protection (221-229), and applied as a poise change. A plain block returns the equipment's block strength.
- Health (`calculate_health_change`, 1789-1844): damage = value x damage modifier; precise bonus = damage x precision multiplier x (power - 1), added for attacks (1802-1806); subtract the block soak, floored at zero (1808); multiply by (1 - damage reduction) (1810). Falling damage becomes zero only at full reduction; buff and other damage skip all of it.
- Per-kind side effects (457-543), only when the health change exceeds an epsilon: slashing drains energy equal to 0.5 x applied damage, and any shortfall beyond the target's energy becomes extra health damage; crushing converts the damage the armour removed (x1.0, x the attacker's poise stat) into poise damage, and if the target is stunned, the poise damage is converted to health damage instead; piercing and energy add nothing here (its armour penetration is inside the reduction).
- Per-damage effects (544-763) and the attack-level effects (766-1039) run knockback, energy reward to the attacker, chance-gated buffs, lifesteal, poise, heal, combo, additional damage, buff refresh, self buff, energy, transform and debuff-vulnerable bonus damage. Attack-level effects check requirements against the damage accumulated so far and may modify the strength. At the end an entity-attacked hook is emitted if anything applied (1042-1050), and the function returns whether it applied.
- Tick: per attack event, not a fixed step.

## 2. Key functions

- `Attack::apply_attack`: `combat.rs` 283-1052. Setup of precision and modifiers, per-damage loop (reduction, block, health change, per-kind side effects, effects), then attack-level effects and the hook.
- `Attack::compute_block_damage_decrement`: `combat.rs` 186-257. Facing, parry and block gates, strength soak, poise cost.
- `Attack::compute_damage_reduction` (attack wrapper): `combat.rs` 259-281. Applies the attacker's penetration.
- `Damage::compute_damage_reduction`: `combat.rs` 1748-1787. Armour fraction p/(60+|p|), piercing penetration, stat reduction combined as 1-(1-armour)(1-stat).
- `Damage::calculate_health_change`: `combat.rs` 1789-1844. Precise bonus, block soak, reduction multiply.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Armour as a saturating fraction p/(K+|p|) | K = 60 (theirs, line 1769) |
| Combine two reductions multiplicatively: 1-(1-a)(1-b) | Stat cap at 100 % (theirs) |
| Block soak: subtract strength, floor at zero | Block strength from equipment (theirs, data) |
| Parry: full negate and a poise cost scaled by damage / strength | `MAX_BLOCK_POISE_COST` = 25 (theirs, line 79); hook multiplier 2.0 - min(ratio, 1) (theirs, 217; always 1.0 on a parry as written) |
| Precise hit: damage x (1 + precision x (power - 1)), where the bonus is damage x precision x (power - 1) | Precision power and multiplier (theirs, 385-389) |
| Penetration capped by the armour value | `PIERCING_PENETRATION_FRACTION` = 0.75 (theirs, line 1735) |
| Slashing drains energy, crushing converts to poise | `SLASHING_ENERGY_FRACTION` 0.5, `CRUSHING_POISE_FRACTION` 1.0 (theirs, 1736-1737) |

## 4. TypeScript sketch

simplified: omits penetration by the attacker, the piercing penetration of protection, facing and block-angle checks, the poise cost of blocking, per-kind side effects (slashing energy drain, crushing poise), all combat effects, and the group and PvP filters. Falling, buff and other damage sources skip mitigation in the donor and are not modelled. The precise bonus is damage x precision x (power - 1), added to the damage, as in the donor.

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Hit { value: number; precise: number; blockable: boolean; }

// Saturating armour fraction: more protection helps, with diminishing return.
function armourFraction(protection: number, k: number): number {
  return protection / (k + Math.abs(protection));
}

// Two independent reductions combine multiplicatively.
function combineReduction(armour: number, stat: number): number {
  return 1 - (1 - armour) * (1 - stat);
}

// Block soak: a parry negates the hit; a block subtracts its strength, floored at zero.
function blockSoak(damage: number, strength: number, parry: boolean): number {
  if (parry) return damage;
  return Math.min(strength, damage);
}

// Final health change from one hit: precision, then block, then reduction.
// `h.precise` is the precision multiplier (0 when the hit is not precise).
function healthLoss(h: Hit, reduction: number, soak: number, precisionPower: number): number {
  let d = h.value;
  d += d * h.precise * (precisionPower - 1);   // bonus = damage x precision x (power - 1)
  d = Math.max(0, d - soak);
  return d * (1 - reduction);
}
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 1 (duel step / sim): the reduction order (fraction, then soak, then multiply) is a candidate for the damage step.
- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 3 (guard, parry, stamina): the parry-full-negate and poise-cost pair is a candidate for guard and parry. Compare with the existing guard and parry rules first.
- Reuse tag: adapt
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- Armour here is a per-slot inventory model feeding one protection number. Frankendom's gear dressing (checklist row 15) is cosmetic wear and tint grades; only the saturating-fraction shape could transfer, and only if armour becomes a catalogue field (row 21).
- The reduction order matters: precision, then soak, then multiply. Frankendom's existing order in the duel step (`src/duel.ts`, moving) was not read here and must be compared before anything changes.
- Poise and knockback are a physics model. Frankendom's posture and stagger sit in the duel step (checklist rows 1 and 3); this file gives no new rule for them.
- The parry hook's poise multiplier is always 1.0 as written (the ratio is computed after the strength is set to the damage). Do not copy the 2.0 - ratio formula expecting a range.
- Events are emitted through many trait-bounded emitters; the donor's buff and transform paths are server-side and do not apply to a client-side duel.
