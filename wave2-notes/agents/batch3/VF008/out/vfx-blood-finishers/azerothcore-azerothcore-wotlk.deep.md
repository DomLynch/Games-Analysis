# azerothcore-azerothcore-wotlk (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Unit/Unit.cpp` | Licence: GNU GPL v2 (`LICENSE` file, "Version 2, June 1991"; Unit.cpp header: "either version 2 of the License, or (at your option) any later version") | C++ | symbol `Unit::IsDamageReducedByArmor` (with `Unit::CalcArmorReducedDamage`, `AuraEffect::HandlePeriodicDamageAurasTick`, `Unit::SpellTakenCritChance`, `Unit::MeleeDamageBonusTaken`)

Checked: Read on the VPS. Read in full: `Unit::IsDamageReducedByArmor` (Unit.cpp 2206-2226) and its header default (Unit.h 1266); `Unit::CalcArmorReducedDamage` (2229-2299); the bleeding aura state in `SpellInfo.cpp` (2037-2039); the periodic tick armour call (SpellAuraEffects.cpp 6290-6370, armour block at 6363-6365) and the leech armour call (6442-6480, armour block at 6477-6480). Read in part: the direct-hit call (Unit.cpp 1505-1530; the call at 1526), the multiplier helper (5991-6005, first half only), the taken-crit function (8953-9159; the druid bleed branch 9088-9092 read, the rest not read), the taken-damage function (10115-10160; the mechanic block 10144-10155 read, the rest not read). Not read: the armour-penetration block between 2231 and 2287, `SpellDamageBonusTaken`, the bleed-removal rules at SpellEffects.cpp 3673 and 5444, how the target's bleeding state is applied when an aura lands, and the database values (the Rend and Tear amount, the mechanic-damage aura amounts). Confidence: high for the armour exemption and its gating; medium for the crit and damage-taken branches, which I read only at the lines cited. camera_scope: not applicable (not a camera topic). Visual check: this donor is a server; it has no blood, decal or particle code, and its wound logic is numbers only. Only the state is copied.

## 1. Mechanism

Armour mitigation runs on physical damage only. `IsDamageReducedByArmor` returns false (no armour) in three cases, in order: the school is not physical (2208-2210); the spell has an "ignores armour" attribute; or an effect index is passed and that effect is a periodic-damage aura (or a school-damage effect) whose mechanic mask has the bleed bit (2217-2223). The third case is the bleed exemption: "bleeding effects are not reduced by armor" (2217).

The exemption applies only where an effect index is passed. The periodic damage tick passes it (SpellAuraEffects.cpp 6364, `GetEffIndex()`), and so does the health-leech tick (6478, `m_effIndex`). The direct-hit path does not (Unit.cpp 1526 passes only the school and spell), so a direct hit that carries the bleed mechanic is still armour-reduced. Order of steps in the periodic tick: `SpellDamageBonusTaken` runs first, then the armour check (6363-6365), then a crit roll on the damage and a crit bonus. The leech tick rolls its crit before the armour check (6477-6478 comes after the crit lines in that function), so the two ticks order their steps differently.

Armour formula, when it applies (`CalcArmorReducedDamage`, 2229-2299):
1. `armor = victim armour` (2231). Then the penetration block (not read) can lower it, and the attacker's ignore-target-resist auras apply.
2. Level term: `levelModifier` is the attacker's level; above 59 it becomes `L + 4.5 * (L - 59)` (2287-2289).
3. Fraction: `f = 0.1 * armor / (8.5 * L + 40)` (2291), then `f = f / (1 + f)` (2292). Clamped to 0 below and 0.75 above (2294-2296).
4. Result: `ceil(max(damage * (1 - f), 0))` (2299).

Bleeding state (`SpellInfo.cpp` 2037-2039): a spell's aura state is `AURA_STATE_BLEEDING` when any of its effects carries the bleed mechanic (the state is derived from the spell data). The target's `HasAuraState(AURA_STATE_BLEEDING)` is then the check used by the next two rules; how the state is set on the target when the aura lands was not read.

Finisher bonus on bleeding targets (`SpellTakenCritChance`, 9088-9092): the donor's comment is "Rend and Tear - bonus crit chance for Ferocious Bite on bleeding targets". The branch needs the druid family flag `0x00800000`, the icon id 1680 and the target bleeding (9089). It adds `rendAndTear->GetAmount()` from the caster's dummy aura 2859 effect 1 (9091-9092). The amount is database data, not in code.

Mechanic damage-taken multiplier (`MeleeDamageBonusTaken`, 10144-10155): the spell's mechanic mask is built from its effects. Druid spells with family flags `0x00008800` get the bleed bit added (10147-10149; the code comment says Shred and Maul). Then `TakenTotalMod` is multiplied by `GetTotalAuraMultiplier(SPELL_AURA_MOD_MECHANIC_DAMAGE_TAKEN_PERCENT, ...)` over the victim's auras whose misc value is in that mask (10153-10155). The helper groups auras of the same spell group and keeps the highest amount (6004 comment; body read only in part).

## 2. Key functions

- `Unit::IsDamageReducedByArmor`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Unit/Unit.cpp` 2206-2226 (header default `effIndex = MAX_SPELL_EFFECTS` at `Unit.h` 1266).
- `Unit::CalcArmorReducedDamage`: `Unit.cpp` 2229-2299. Read in full.
- `AuraEffect::HandlePeriodicDamageAurasTick`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Spells/Auras/SpellAuraEffects.cpp` 6290-, armour block 6363-6365.
- `AuraEffect::HandlePeriodicHealthLeechAuraTick`: `SpellAuraEffects.cpp` 6442-, armour block 6477-6480.
- Bleeding aura state: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Spells/SpellInfo.cpp` 2037-2039.
- `Unit::SpellTakenCritChance`: `Unit.cpp` 8953-9159; druid bleed branch 9088-9092.
- `Unit::MeleeDamageBonusTaken`: `Unit.cpp` 10115-; mechanic block 10144-10155.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Bleed tick skips armour; direct physical hit does not | Rule, no number (2217-2223; direct call 1526) |
| Armour fraction = 0.1 x armour / (8.5 x level + 40), then x / (1 + x) | 0.1, 8.5, 40 (2291-2292) |
| Fraction cap | 0.75 (2296) |
| Level term above 59 | +4.5 per level over 59 (2289) |
| Damage after armour rounds up | `ceil` (2299) |
| Finisher crit on bleeding target | Bonus = caster aura 2859 effect 1 amount (DB, not read; 9091-9092) |
| Bleed bit for Shred and Maul | Family flags 0x00008800 (10148) |
| Mechanic damage-taken auras | Amount is an aura value (DB, not read; 10153) |
| Bleeding aura state and mechanic bit | Aura state 18, mechanic 15 (`SharedDefines.h` 1298, 1328) |

Where the numbers are in data (the finisher bonus and the mechanic percentages) they come from the database, which this read did not open. The formula constants are fixed in code.

Worked check on the donor formula (my arithmetic, not a donor output): armour 500 and attacker level 60 give L = 64.5, f = 50 / 588.25 = 0.0850, then f / (1 + f) = 0.0783. A 100-damage physical direct hit lands at ceil(92.17) = 93. The same 100 as a bleed tick lands at 100.

## 4. TypeScript sketch

simplified: The sketch keeps the donor's gate order for armour (physical school, then the bleed exemption on the periodic path only) and the donor's formula (level term, fraction, fraction over one plus fraction, cap, round up). It omits: the armour-penetration block; the ignore-target-resist auras; the "ignores armour" spell attribute; the crit roll and its order against the armour step in each tick; the leech tick; the `SpellDamageBonusTaken` step before the tick; resilience; and the database values. For the mechanic multiplier it uses `(100 + percent) / 100` per matching aura. The donor helper's same-spell-group rule is not modelled, and its exact form was only read in part. The Shred and Maul bleed bit is not added, so Shred and Maul are not modelled.

```ts
// Licence: GPL-2 (donor LICENSE file; Unit.cpp header: GPL v2 or any later version). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface Effect {
  periodic: boolean;   // periodic damage aura tick (vs direct hit)
  physical: boolean;   // physical school (armour applies to physical only)
  bleed: boolean;      // effect carries the bleed mechanic
}

// Armour applies to physical damage, except bleed ticks. A direct hit never gets the bleed
// exemption: the donor's direct call passes no effect index (Unit.cpp 1526, 2206-2223).
function armourApplies(e: Effect): boolean {
  if (!e.physical) return false;
  if (e.periodic && e.bleed) return false;
  return true;
}

// Mitigation from armour (Unit.cpp 2287-2299). Armour penetration (not read) is not modelled.
function armourReduce(damage: number, armour: number, attackerLevel: number): number {
  const lvl = attackerLevel > 59 ? attackerLevel + 4.5 * (attackerLevel - 59) : attackerLevel;
  let f = (0.1 * Math.max(armour, 0)) / (8.5 * lvl + 40);
  f = f / (1 + f);
  f = Math.min(Math.max(f, 0), 0.75);
  return Math.ceil(Math.max(damage * (1 - f), 0));
}

// The bleeding state is set on the target when a spell's effects carry the bleed mechanic (SpellInfo.cpp 2038-2039).
function bleedsTarget(mechanics: string[]): boolean {
  return mechanics.includes('bleed');
}

// Crit chance for the finisher-type spell on a bleeding target (Unit.cpp 9089-9092).
// The bonus amount comes from a caster aura, so it is data.
function finisherCrit(baseCrit: number, targetBleeding: boolean, isFinisherSpell: boolean, bonusFromCasterAura: number): number {
  return isFinisherSpell && targetBleeding ? baseCrit + bonusFromCasterAura : baseCrit;
}

// Damage taken multiplier from mechanic auras on the target (Unit.cpp 10144-10155).
interface MechanicAura { mechanic: string; percent: number; }
function mechanicMultiplier(auras: MechanicAura[], spellMechanics: Set<string>): number {
  let m = 1;
  for (const a of auras) {
    if (spellMechanics.has(a.mechanic)) m *= (100 + a.percent) / 100;
  }
  return m;
}
```

## 5. Lands in

- TARGET `src/fight/wounds.ts` (new engine module, shared with the wounds in the cell-13 Angband note). The bleed is a fighter status on the server: its tick and its armour exemption run in the fight step, so kills stay server-verified and there is one ledger. The client only draws the bleed tint. Parity-checklist row 8 (blood/wounds/decals). The finisher crit bonus is the part that belongs to row 9 (finishers) and is listed as a gap, not a second target.
- Reuse tag: rewrite-from-idea (GPL-2; clean-room only)
- Brief rule served: 1 (one engine: the armour exemption and the bleed state are one rule in src/fight; clients draw them)

## 6. Gaps and risks

- Clean-room only. The sketch is written from the mechanism; no donor lines are copied.
- The exemption is narrow and per effect. It applies to periodic ticks only, so a direct hit with bleed is still armour-reduced. Frankendom's rule must say the same, or a bleed move will feel inconsistent between a hit and its bleed.
- The armour formula is WoW's (level-scaled, capped at 0.75). Frankendom's armour model is not in this donor. Only the rule "bleed ignores armour" transfers. Do not port the level term unless the duel has a level model; the rulings name none.
- The finisher bonus and the mechanic percentages are database values. Frankendom should hold them as catalogue fields on the finisher and the wound, not hard-code them.
- The finisher is found in the donor by a spell family flag and an icon id. Frankendom must tag finishers explicitly in the catalogue, not by bit flags. That tag belongs to row 9 (finishers).
- Several attackers: a victim can carry bleeds from up to MAX_ATTACKERS = 3 casters. The donor's aura tick is per aura per caster, and the stacking across casters was not read.
- The bleed-removal rules (SpellEffects.cpp 3673, 5444) were not read. Whether a cure or a dispel removes a bleed is undecided here.
- Server authority: this is server code. The tint and any bleed decal on the client must read the server's bleed state and never write it.
- Not read: the penetration block, `SpellDamageBonusTaken`, the taken-crit branches outside the druid case, the aura-application path that sets the bleeding state on the target, and the database amounts.

Best transferable idea: A bleed tick skips armour while a direct physical hit does not, so bleeding counters heavy armour, and a finisher gets a bonus crit against a bleeding target.

Decision (proposed): adapt. Take the bleed-ignores-armour rule and the bleeding state as data flags on the engine's wound status, and the finisher bonus on a bleeding target as catalogue data. Do not take WoW's armour formula, its level term or its spell-family bit tests. Why: the armour exemption is a clear, testable rule for a gladiator game (heavy armour stops being a full answer to a bleed), and it links the wound to the finisher, but Frankendom has no armour model or level term to copy the formula onto.

Acceptance: Server test with armour 500 and attacker level 60: a 100-damage physical direct hit lands at 93 (formula as in section 3), and the same 100 as a bleed tick lands at 100. A finisher flagged in the catalogue gets its bonus crit only when the target is bleeding; the same finisher on a clean target does not. The client shows the bleed tint only when the server state says so.

Reuse tag: rewrite-from-idea (GPL-2; clean-room only)
Brief rule served: 1 (one engine: the armour exemption and the bleed state are one rule in src/fight; clients draw them)
