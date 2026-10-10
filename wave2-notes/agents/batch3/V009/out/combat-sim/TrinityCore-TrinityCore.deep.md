# TrinityCore-TrinityCore (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp` | Licence: GPL-2.0-or-later (Unit.cpp header: "either version 2 of the License, or (at your option) any later version"; the repo COPYING is GPL v2) | C++ | symbol `Unit::CalcArmorReducedDamage`

Checked: `Unit::CalcArmorReducedDamage` is defined at Unit.cpp 1689 and ends at 1778 (read in full, 1689-1800 range). Callers read in context: `Unit::CalculateSpellDamageTaken` (1198-1213) and `Unit::CalculateMeleeDamage` (1332-1405), plus the mixed magic/physical branch in `Unit::CalcAbsorbResist` (1815-1830). Seen in grep only, NOT read: DoT callers in `SpellAuraEffects.cpp` 5847 and 5931. Not read: `Player::ApplySpellMod` (TargetResistance) behaviour, `CalculatePct`, `RollMeleeOutcomeAgainst`, the item-level curve values, and the DB2 expected_stat row values (hotfix data, not in the repo). camera_scope: not applicable. Confidence: high on the armour formula and its order; medium on the penetration step for player attackers, because the spell-mod and percent helpers were not read. Cell hint was TrinityCore root: the real mechanism is in Unit.cpp (grep for `CalcArmorReducedDamage`).

## 1. Mechanism

- One static function turns a raw physical hit into the damage left after armour. Inputs: attacker (may be null), victim, raw damage, optional spell, attack type. Output: `uint32` damage after armour. It changes nothing on the victim; the caller applies the result.
- Order of steps as the code runs:
  (a) Start from the victim's armour value (1691).
  (b) If there is an attacker (1693): multiply armour by the victim's per-attacker multiplier (1695). For creatures this is 1.0 unless the creature has scalable levels, in which case it is base armour at the attacker's level over base armour at its own level (Creature.cpp 3217-3224).
  (c) Bypass: sum the amounts of `SPELL_AURA_BYPASS_ARMOR_FOR_CASTER` auras that this attacker cast on the victim (1698-1702), cap the sum at 100 (1703), and remove that percent of armour (`CalculatePct`, not read).
  (d) Add the attacker's flat `SPELL_AURA_MOD_TARGET_RESISTANCE` total to armour (1706). For a player-owned spell, a `TargetResistance` spell mod is applied (1710, not read in depth).
  (e) For each `SPELL_AURA_MOD_IGNORE_TARGET_RESIST` aura that covers the normal school and affects this spell (1712-1715), armour becomes `floor(AddPct(armour, -amount))` (1716).
  (f) If the attacker is a player (1721-1742): read the armour-penetration rating percent (1722), add the weapon's `SPELL_AURA_MOD_ARMOR_PENETRATION_PCT` auras (1724 onward, not read to the end), clamp to 0..100 (1731). Build the penetration amount `maxArmorPen`: 400 + 85 x L when the victim's level L as the attacker sees it is below 60, and 400 + 85 x L + 4.5 x 85 x (L - 59) at 60 and above (1733-1737). Cap it at `min((armour + maxArmorPen) / 3, armour)` (1740). Remove `CalculatePct(maxArmorPen, arpPct)` from armour (1742).
  (g) If armour is zero or below, return the raw damage unchanged (1746-1747).
  (h) Look up K, the armour constant, at the attacker's level with `sDB2Manager.EvaluateExpectedStat(ArmorConstant, ...)` (1761). If the attacker is a player-owned unit with an item level, and its level is the expansion maximum, multiply K by a curve value of its item level relative to the expansion maximum row (1762-1769).
  (i) If armour + K is zero, return the raw damage (1773).
  (j) `mitigation = min(armour / (armour + K), 0.85)` (1776). Return `max(damage x (1 - mitigation), 0)` truncated to `uint32` (1777). The result is floored, never rounded up.
- Gate and callers (read): `IsDamageReducedByArmor` (1680-1686) allows armour only for the physical school and only when the spell does not carry `SPELL_ATTR0_CU_IGNORE_ARMOR`. `CalculateSpellDamageTaken` calls the function behind that gate (1212-1213). `CalculateMeleeDamage` calls it behind the same gate (1397-1399), then rolls the hit outcome (1405). In `CalcAbsorbResist`, a spell with the mixed magic/physical flag computes armour reduction too, and keeps the smaller of the resist and the armour reduction (1826-1830).
- Tick: none. This is a synchronous pure function called once per hit from the damage step.

## 2. Key functions

- `Unit::CalcArmorReducedDamage`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp` 1689-1778. The whole pipeline, steps (a)-(j).
- `Unit::IsDamageReducedByArmor`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp` 1680-1687. The school and ignore-armour gate.
- `Unit::CalculateSpellDamageTaken`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp` 1198-1213 (armour call at 1212-1213).
- `Unit::CalculateMeleeDamage`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp` 1332-1405 (armour call at 1397-1399).
- `Creature::GetArmorMultiplierForTarget`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Creature/Creature.cpp` 3217-3225.
- `DB2Manager::EvaluateExpectedStat`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/DataStores/DB2Stores.cpp` 2512-2519 (lookup start only; the class-mod switch at 2521-2534 read in part).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Armour reduces damage by a diminishing fraction: `a / (a + K)` | K is a per-level table (theirs, `EvaluateExpectedStat` at Unit.cpp 1761; the values are DB2 hotfix rows, not read) |
| Mitigation is capped, so armour never blocks a hit fully | Cap 0.85 (theirs, Unit.cpp 1776) |
| Penetration removes a share of a capped amount | Base 400 + 85 per level below 60 (theirs, 1735); growth 4.5 x 85 per level above 59 (theirs, 1737); cap divisor 3 (theirs, 1740); rating clamped 0..100 (theirs, 1731) |
| Bypass aura sum capped at 100% | Cap 100 (theirs, 1703) |
| Zero or negative armour returns raw damage | Threshold 0 (theirs, 1746) |
| Damage is floored, never negative | `uint32` truncation (theirs, 1777) |

## 4. TypeScript sketch

simplified: the sketch keeps the core order: penetration on armour first, then the zero gate, then `a / (a + K)` with the 0.85 cap, then the floor. It applies penetration to every attacker (the donor applies it only to player attackers) and takes armour and K as inputs. It omits the per-target creature multiplier, the bypass and target-resistance auras, the spell mod, the ignore-target-resist aura, the item-level curve, the class mod, the DoT callers, the mixed magic/physical branch, and the outcome roll. K is a plain input here; the donor reads it from the DB2 table.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ArmourInput {
  armour: number;        // victim armour before penetration (donor: victim->GetArmor() after per-target multipliers)
  constantK: number;     // armour constant for the attacker's level (donor: DB2 expected_stat table)
  penRatingPct: number;  // attacker's armour-penetration rating in percent, clamped to 0..100
  victimLevel: number;   // victim level as the attacker sees it
}

export const ARMOUR_MITIGATION_CAP = 0.85;

// Penetration removes a percentage of a capped amount, not of raw armour.
export function effectiveArmour(a: ArmourInput): number {
  const pct = Math.min(Math.max(a.penRatingPct, 0), 100);
  const base = a.victimLevel < 60
    ? 400 + 85 * a.victimLevel
    : 400 + 85 * a.victimLevel + 4.5 * 85 * (a.victimLevel - 59);
  const cap = Math.min((a.armour + base) / 3, a.armour);
  return a.armour - (cap * pct) / 100;
}

// Diminishing returns: armour / (armour + K), never more than the cap. Result is floored, never negative.
export function mitigateHit(damage: number, a: ArmourInput): number {
  const armour = effectiveArmour(a);
  if (armour <= 0) return damage;
  if (armour + a.constantK === 0) return damage;
  const mitigation = Math.min(armour / (armour + a.constantK), ARMOUR_MITIGATION_CAP);
  return Math.floor(Math.max(damage * (1 - mitigation), 0));
}

export {};
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (the engine damage step, one place that turns a hit into health loss). Parity-checklist row 1 (duel step / sim).
- Frankendom's defence today is guard, parry and stamina (row 3), so this is a candidate only for a flat mitigation stat if one is ever added. It must not become a second defence ledger beside the guard.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: a diminishing mitigation curve `a / (a + K)` with a hard cap, floored to an integer, applied once in the damage step, with penetration that removes a share of a capped amount.
Decision (proposed): adapt - take the curve shape and the cap, not the WoW stat, the DB2 table or the level constants; Frankendom has no flat armour stat today, and adding one is only worth it if it stays inside the one damage step and one rounding rule.
Acceptance: a server test asserts that with the same attacker, armour 0 leaves the hit unchanged; at any armour the mitigated hit is an integer and never below floor(0.15 x raw) (cap 0.85); and doubling armour gives less than double the reduction.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- K is a DB2 hotfix table keyed by level and class. Frankendom has no such table; it would need its own per-level data, stored as zone or engine data (see the sidecar).
- The penetration constants (400, 85, 4.5, divisor 3) are tuned for WoW's level curve (the level 60 branch). Do not port them as they are; Frankendom's level range is different.
- Order matters. The donor applies bypass and mod auras before penetration, and the penetration cap uses armour after those steps. The server test must fix one order and a single rounding rule (the donor floors, so a 1-damage hit can become 0 after mitigation: check that a min-damage rule exists in our damage step).
- The mixed magic/physical branch keeps the smaller of resist and armour reduction. Frankendom has no resist stat in the duel, so that branch does not transfer.
- The creature per-target multiplier (scalable levels) is a level-scaling rule. If Frankendom scales enemy armour, it should be zone data, not code inside this function.
- Not read: `ApplySpellMod`, `CalculatePct`, `RollMeleeOutcomeAgainst`, the item-level curve values, and the DoT callers (grep only).


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Every line cite, constant (0.85 cap, 400/85/4.5/3 pen, 100 bypass cap, 0.01 etc) and step order matches Unit.cpp 1689-1778. Nits only: IsDamageReducedByArmor is 1680-1687 (mechanism says 1680-1686); melee armour call is at Unit.cpp 1399 with the gate at 1396 (note says 1397-1399); RollMeleeOutcomeAgainst is exactly 1405 (ok); weapon-aura read starts at 1724/1725.

**Missed:** DoT callers (SpellAuraEffects 5847, 5931) pass GetBase()->GetCasterLevel() as the attackerLevel param, which is why that param exists; not said. CleanDamage += damage - Damage at 1399-1400 (mitigated amount recorded) not mentioned. EvaluateExpectedStat returns 1.0 when no row found (DB2Stores.cpp 2518-2519).
