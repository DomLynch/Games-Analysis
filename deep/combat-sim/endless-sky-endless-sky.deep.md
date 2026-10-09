# endless-sky-endless-sky (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/DamageProfile.cpp` | Licence: GPL-3.0-or-later per DamageProfile.cpp header (Copyright 2022 Amazinite) | C++ | symbol `DamageProfile::CalculateDamage`

Checked: Symbol `CalculateDamage` opens at 69 and closes at 168 (verified, read in full). `CalculateScaling` is 172-198 and the constructors 27-44, also read in full.

## 1. Mechanism

- Builds one damage record for one weapon hit on one entity. Inputs: the weapon (its damage levels, piercing, shield and hull damage), the target entity (its shield level and max, hull and max, protection values per damage type, permeability, cloaking, disruption), the impact position, and a scaling factor (the profile's constructor scales by weapon damage drop-off over the distance a projectile travelled, 32-33; `CalculateScaling`, 172-198, adds blast fall-off, and for hazards a drop-off by distance).
- Shield pass first (only if the target has shields): a piercing fraction (weapon piercing over target piercing protection, minus the target's piercing resistance, clamped 0-1, 91) plus the target's permeability (cloak permeability, plus a mix of high and low shield permeability by the current shield portion, 92-101) gives `shieldFraction = (1 - min(piercing + permeability, 1)) / (1 + disruption x 0.01)` (102). A shield-damage level (flat plus relative to max shields, over the shield protection) is computed; if that raw level exceeds the remaining shields, the fraction is capped at shields over level (104-108). The shield level is then multiplied by the fraction (115).
- Hull pass (116-129): hull damage (flat plus a percentage of max hull; the minable variants for minable entities) is scaled by the share that was not blocked, `ScaleType(1, 0, hull protection)` = (1 - shieldFraction) / protection, times the scaling. If that exceeds the hull left before disabling, the hull part is cut to that and the excess fraction is replaced by the weapon's disabled-damage term (also scaled by protection).
- Each damage type (energy, heat, fuel, ion, burn, leak, corrosion, discharge, slowing, scrambling, disruption) has a fixed "how much shields block" and "how much hull blocks" pair, given to the same scaling helper `ScaleType` (130-152): energy, heat, fuel, ion, burn, slowing and scrambling 0.5 / 0; corrosion and leak 1 / 0; discharge and disruption 0 / 0.5; shield damage 0 / 0. Force (knockback) is not blocked by shields; it is a vector from the impact point to the target.
- Output: a record of per-level damage, a force vector, and a prospecting value. Runs once per hit when the weapon resolves against an entity (projectile or blast). Not a per-tick loop.

## 2. Key functions

- `DamageProfile::CalculateDamage`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/DamageProfile.cpp` 69-168. Shield pass, hull pass, the per-type table, force vector.
- `ScaleType` (lambda inside `CalculateDamage`): `/mnt/frankendom-donors/endless-sky-endless-sky/source/DamageProfile.cpp` 80-84. Blocked share = shieldFraction x (1 - shield block) + (1 - shieldFraction) x (1 - hull block); the result is scaling x blocked / protection.
- `DamageProfile::CalculateScaling`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/DamageProfile.cpp` 172-198 (read in full). Distance from the impact to the entity's mask edge; blast fall-off only when the weapon has a blast radius and damage scaling; hazard drop-off.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Piercing = clamp(weapon piercing / target protection - resistance, 0, 1) | Clamp 0-1 (mechanism); resistance and protection values per ship (theirs) |
| Shield bleed = (1 - min(piercing + permeability, 1)) / (1 + disruption x 0.01) | Disruption factor 0.01 per point (theirs, 102) |
| Cap shield damage at remaining shields | Remaining shield level (theirs, state) |
| Two-layer block per damage type: shield share and hull share | Per-type pairs, e.g. energy 0.5 / 0, hull 1 / 0, shield 0 / 0 (theirs, 105, 116, 131) |
| Hull over-kill goes to a disabled term | Disabled damage terms (theirs) |
| Blast fall-off: k / ((1 + r^4)^2) with r = distance / blast radius | k = 1 + 0.25 (trigger / blast ratio)^2 (theirs) |

## 4. TypeScript sketch

simplified: omits cloak and shield-portion permeability, the protection divisors, the relative (percent of max) damage terms, the minable variant, the non-shield damage types and the force vector, and the pre-scaling by projectile distance. `splitHit` returns plain damage numbers; the hull overkill term is not divided by protection here. Order matches the donor: shield fraction (capped by remaining shields), then hull from the complementary share.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Target { shield: number; maxShield: number; hull: number; protection: number; resist: number; permeability: number; disruption: number; }
interface Shot { hullDamage: number; shieldDamage: number; piercing: number; disabledDamage: number; }

// Share of damage that gets past shields.
function shieldBleed(shot: Shot, t: Target): number {
  const piercing = Math.max(0, Math.min(1, shot.piercing / t.protection - t.resist));
  return (1 - Math.min(piercing + t.permeability, 1)) / (1 + t.disruption * 0.01);
}

// Split one hit into shield and hull parts; disabled damage is the hull overkill.
function splitHit(shot: Shot, t: Target): { toShield: number; toHull: number } {
  let sf = t.shield > 0 ? shieldBleed(shot, t) : 0;   // share that gets past shields
  if (t.shield > 0 && shot.shieldDamage * sf > t.shield) {
    sf = Math.min(sf, t.shield / Math.max(shot.shieldDamage, 1e-9));
  }
  const toShield = shot.shieldDamage * sf;
  let toHull = shot.hullDamage * (1 - sf);            // hull takes the complementary share
  if (toHull > t.hull) {
    const frac = t.hull / toHull;
    toHull = t.hull + shot.disabledDamage * (1 - frac);
  }
  return { toShield, toHull };
}

// Blast fall-off: a point near the centre keeps full damage; far points drop fast.
function blastScale(distance: number, blastRadius: number, triggerRadius: number): number {
  const br = Math.max(1, blastRadius);
  const ratio = triggerRadius / br;
  const k = ratio === 0 ? 1 : 1 + 0.25 * ratio * ratio;
  const r2 = (distance * distance) / (br * br);
  return k / ((1 + r2 * r2) * (1 + r2 * r2));
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module, engine damage step): a two-layer block (guard or armour, then body) with a clamp on each layer. Parity-checklist row 1 (duel step / sim) and row 3 (guard, parry, stamina) for the first layer.
- TARGET `src/fight/area.ts` (new module): blast fall-off, only if Frankendom wants area attacks, under MAX_ATTACKERS = 3. Parity-checklist row 13 (specials) if a special uses it.
- today: `src/combat.ts` (moving to `src/fight/combat.ts`) holds the flat combat helpers; no damage-layer or area module exists.
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Ship shields, hull and permeability are a space model. Frankendom has guard, parry and stamina in the duel engine, not shields and hull. Only the layer-split shape (cap at what the first layer holds, overflow to the next) transfers.
- The per-type table is large and specific to ships. Frankendom should not import the table; it needs its own damage types, if any.
- Force (knockback) from the impact point is a physics vector. Frankendom has stagger and posture, not a vector; no direct use.
- Blast fall-off is a space-combat effect. Frankendom's fight has no area damage in the duel engine today.
- Shield and hull caps depend on state the donor holds per entity. Frankendom's one-ledger rule means these caps must come from the server inventory and fight snapshot, not from the client.
