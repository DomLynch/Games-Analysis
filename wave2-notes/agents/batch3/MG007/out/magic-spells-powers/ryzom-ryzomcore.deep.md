# ryzom-ryzomcore (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/sabrina/s_link_effect.cpp` (with `s_link_effect_dot.cpp`, `magic_action_dot.cpp`, `phrase_utilities_functions.cpp`, `entities_game_service/entity_manager/entity_base.cpp`) | Licence: GNU AGPL v3 (COPYING:2 "Version 3, 19 November 2007"; README.md:5 "GNU Affero General Public License 3.0"); art assets CC-BY-SA 3.0 / FAL 1.3 (not used) | C++ | symbols `CSLinkEffectOffensive::update` (s_link_effect.cpp:92), `CSLinkEffectDot::update` (s_link_effect_dot.cpp:35), `getSucessFactor` (phrase_utilities_functions.cpp:330)

Checked: Read in full: `s_link_effect.cpp` 30-163 (update period, upkeep, the offensive resist roll), `s_link_effect_dot.cpp` 20-97 (the DoT tick), `magic_action_dot.cpp` 35-171 (brick params, link creation), `phrase_utilities_functions.cpp` 310-351 (success chance and the factor bands). Read in part: `entity_base.cpp` 942-990 (the only update caller, and it is commented out), `entity_base.cpp` 1355-1410 and 1800-2123 (addLink/removeLink, searched only), `egs_static_success_table.cpp` 160-220 (sheet loader). Opened for the search: `magic_phrase.cpp` (header and phrase build, not the cast-time path), `magic_action_hot.cpp`, `magic_action_debuff.cpp`, `magic_action_affect_stat.cpp` (same link pattern, creation lines only), `egs_static_success_table.h`. Not read: the success table data (a Georges sheet not in the box; grep finds no text copy), the brick data (`static_sabrina_bricks.h` read only by search), `CRandom::rand` range, `CTickEventHandler`, the magic cast time path. Confidence: high for the link model and factor bands as code; high that the per-tick driver is disabled in this snapshot (one call site, inside a `/* */` block, and `tickEffectUpdate` has no other caller in `server/src`); the design is still a complete model, so this is STRONG with that caveat.

Best transferable idea: one roll per tick maps to a damage multiplier with a partial band (1 down to 0) and a critical band, so a resisted hit shows as a smaller number and a full resist ends the sustained effect; the caster's energy pays each tick and the effect ends when it runs out.
Decision (proposed): adapt - take the one-roll partial band and the per-tick upkeep; fix the defects: target defence missing, the success factor applied twice, the crit clamp, the one-call-site driver that is disabled, and the multi-target early return.
Acceptance: a player's sustained spell on a target shows a tick every tuned interval with damage at full, partial (smaller number) or zero ("resisted"), and the link ends when the caster's energy is spent; a server test asserts one factor per tick, the upkeep order, and that the second target in a multi-target cast still gets the spell when the first already has it.

## 1. Mechanism

- Creation (`magic_action_dot.cpp:92-159`): a DoT brick gives per-second hp, sap and stamina damage (`_DmgHp`, `_DmgSap`, `_DmgSta`), a damage type, an upkeep `_CostPerUpdate` and a brick power `_Power` (addBrick, 42-87). `apply` returns at once if the creation factor `successFactor <= 0` (109-114). It then loops over targets. If the target already has a Dot from this caster, the code returns from `apply` (133-139). Otherwise it creates a `CSLinkEffectDot`, storing `_DmgHp x successFactor x 4.0` for each of the three damages (144-153), and attaches it to the caster (`addLink`, 154) and the target (`addSabrinaEffect`, 155). The link energy is HP if the phrase has an HP cost, else sap (118-124).
- Update period: `_UpdatePeriod = 4.0` s (s_link_effect.cpp:33). The next update time is `now + period / gameTimeStep` (44).
- Per tick, `CSLinkEffectDot::update` (s_link_effect_dot.cpp:35-97) first calls `CSLinkEffectOffensive::update`. If that returns true, the link ends (37-38).
- Upkeep (`CSLinkEffect::update`, s_link_effect.cpp:55-73): read the caster's energy score; if it is non-zero and greater than `_CostPerUpdate`, subtract the cost and continue; otherwise the link ends (63-72).
- Resist roll (`CSLinkEffectOffensive::update`, 92-163): `skill = caster skill`; subtract the caster's `DebuffSkillMagic` param (122-125); cap the value at the brick power (128-129); chance from the level delta: `getSuccessChance(skill / 10)` (132) which clamps the delta to MIN/MAX and reads `_SuccessXpTable[MIDDLE - delta].SuccessProbability` (phrase_utilities_functions.cpp:312-318). One roll `rand(99)` (133). Factor from `getSucessFactor(chances, roll)` (135).
- Factor bands (phrase_utilities_functions.cpp:330-351): `critCut = CS x chances / (CS + S)`; if `critCut > roll` return 1.1 (critical). If `roll < chances` return 1.0 (success). Partial width `pSChance = PS / (PS+F+CF) x (100 - chances)`: if `pSChance > roll - chances`, return `(pSChance - d) / pSChance` (falls from 1 to 0). Failure width `(PS+F)/(PS+F+CF) x (100 - chances)`: if larger than `d`, return 0. Else return -1 (critical failure).
- Link rule (s_link_effect.cpp:137-152): factor > 0 keeps the link, factor is clamped to 1.0 when above 1 (141-144); factor <= 0 ends it, with the "total resist" message.
- DoT tick (s_link_effect_dot.cpp:53-93): `mult = _ResistFactor x MagicDmgAmpli/100` (53-57); `hp = _DmgHp x mult` through `applyDamageOnArmor` (62-63); sap and stamina are drained the same way and floored at 0 (75-93).
- Driver: the only caller of `CSEffect::update` is `CEntityBase::tickEffectUpdate` (entity_base.cpp:946-986), and its body is inside `/* ... */` (949-985). No other caller was found in `server/src` (grep for `update(` with a flag argument). So as shipped, the per-tick code does not run. Recorded as a defect, not a design choice.

## 2. Key functions

- `CSLinkEffectOffensive::update` (s_link_effect.cpp:92-163): the resist roll and the end rule.
- `CSLinkEffect::update` (s_link_effect.cpp:55-73): the upkeep.
- `CSLinkEffectDot::update` (s_link_effect_dot.cpp:35-97): the damage per tick, through armour, with sap and stamina drains.
- `CMagicActionDot::apply` (magic_action_dot.cpp:92-159): creation, miss gate, duplicate check, damage scaled at creation.
- `getSuccessChance` (phrase_utilities_functions.cpp:312-319) and `getSucessFactor` (330-351): the chance table lookup and the factor bands.

## 3. Numbers vs mechanism

| Mechanism | Effect | Formula | Number ranges | Cost | Cooldown / cast time | Caps | file:line |
|---|---|---|---|---|---|---|---|
| Sustained link (DoT) | damage each tick | per-second damage x 4.0 s x creation factor, then per tick x tick factor | period 4.0 s (static) | link upkeep per tick (brick data) | period 4.0 s | link ends when caster energy runs out | s_link_effect.cpp:33,44; magic_action_dot.cpp:144-153 |
| Upkeep | caster pays each tick | energy -= `_CostPerUpdate` if energy > cost, else end | cost is brick data (not read) | HP or sap per tick (HP if phrase has HP cost) | per tick | energy 0 ends the link | s_link_effect.cpp:63-72; magic_action_dot.cpp:118-124 |
| Effective skill | skill used for the roll | `min(skill - DebuffSkillMagic, brick power)` | skill values and debuff param not read | none | per tick | brick power is the cap | s_link_effect.cpp:122-129 |
| Chance | % chance from level gap | `SuccessXpTable[MIDDLE - clamp(skill/10)].SuccessProbability` | table is a sheet (not in box) | none | per tick | MIN and MAX delta clamp | phrase_utilities_functions.cpp:312-318; egs_static_success_table.cpp:191 |
| Roll | one roll per tick | `rand(99)` | range of rand not read | none | per tick | none | s_link_effect.cpp:133 |
| Factor bands | single factor | crit `1.1` if `critCut > roll`; success 1.0; partial `(pSChance - d)/pSChance`; failure 0; critical failure -1 | band weights from sheet (not in box) | none | per tick | link clamps above 1 to 1.0 | phrase_utilities_functions.cpp:330-351; s_link_effect.cpp:141-144 |
| Resisted tick | link ends | factor <= 0 ends the link, "total resist" message | n/a | none | n/a | n/a | s_link_effect.cpp:137-152 |
| Creation miss | no link | `successFactor <= 0` returns with "total miss" message | n/a | none | n/a | n/a | magic_action_dot.cpp:109-114 |
| Duplicate DoT | one per caster per target | returns from `apply` if the target already has one | n/a | none | n/a | one per caster per target | magic_action_dot.cpp:133-139 |
| Armour on DoT | damage reduced by armour | `applyDamageOnArmor(type, dmg)` | armour values not read | none | per tick | none read | s_link_effect_dot.cpp:63 |

Numbers that suit a fast mobile fight: the 4.0 s period is far too slow for a fast fight (use 0.5-1.0 s as a starting range, to be tested); the 0-99 roll and band shape transfer as-is.

## 4. TypeScript sketch

simplified: one sustain tick in donor order (upkeep, skill cap, roll, factor, damage) plus the factor band function. It changes four things on purpose: (1) the target's defence is used in the level gap (the donor's MagicDefense check is commented out at s_link_effect.cpp:110-115); (2) the crit factor is capped by an explicit `critCap` argument (donor clamps to 1.0 at s_link_effect.cpp:141-144); (3) the factor is applied once per tick, not also at creation (donor applies it at magic_action_dot.cpp:151-153 and again per tick at s_link_effect_dot.cpp:53); (4) it is a plain function the caller drives at a fixed step, because the donor's driver is commented out. It omits the sap and stamina drains, armour, the damage amplifier and the messages.

```ts
// Licence: AGPL-3.0 (donor). clean-room, shape only.
// clean-room
interface SuccessWeights {
  criticalSuccess: number;
  success: number;
  partialSuccess: number;
  failure: number;
  criticalFailure: number;
}

// One roll (0..99) -> a factor. Bands in order: critical success (above 1), success (1), partial (falls from 1 to 0), failure (0), critical failure (-1).
function successFactor(chances: number, roll: number, w: SuccessWeights): number {
  const critCut = (w.criticalSuccess * chances) / (w.criticalSuccess + w.success);
  if (critCut > roll) return 1.1;
  if (chances > roll) return 1.0;
  const total = w.partialSuccess + w.failure + w.criticalFailure;
  const partialWidth = Math.floor((w.partialSuccess / total) * (100 - chances));
  const d = roll - chances;
  if (partialWidth > d) return (partialWidth - d) / partialWidth;
  const failWidth = ((w.partialSuccess + w.failure) / total) * (100 - chances);
  if (failWidth > d) return 0;
  return -1;
}

interface Sustain { perSecDmg: number; upkeep: number; power: number; }
interface Caster { energy: number; skill: number; debuff: number; }

// simplified: one sustain tick, in donor order (upkeep, skill cap, roll, factor, damage). Changes from the donor:
// (1) the target's defence is used (the donor's MagicDefense check is commented out); (2) the crit factor is capped by an explicit critCap (donor caps at 1.0); (3) the factor is applied once per tick (donor also applies it when the link is created); (4) the tick is driven by the caller at a fixed step (donor's driver is commented out).
function tickSustain(
  s: Sustain,
  c: Caster,
  targetDefence: number,
  chancesOf: (levelDelta: number) => number,
  roll: number,
  critCap: number,
  tickS: number,
  w: SuccessWeights,
): { end: boolean; damage: number } {
  if (c.energy <= s.upkeep) return { end: true, damage: 0 };    // donor: energy at or below the upkeep ends the link
  c.energy -= s.upkeep;
  const skill = Math.min(c.skill - c.debuff, s.power);            // donor: debuff first, then the brick power caps the value
  const levelDelta = Math.trunc((skill - targetDefence) / 10);    // fixed: target defence used; donor divides by 10 as well
  const f = successFactor(chancesOf(levelDelta), roll, w);
  if (f <= 0) return { end: true, damage: 0 };                    // donor: any factor <= 0 ends the link
  const factor = Math.min(f, critCap);
  return { end: false, damage: Math.trunc(s.perSecDmg * tickS * factor) };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/mg007-ryzom-sustain-roll.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/sustain.ts` (new engine module for timed effects on a target: DoT, HoT, and CC links). The one roll and its factor bands belong in `src/fight/resist.ts` (shared with melee guard and block). Parity-checklist row 13 (specials); the per-tick damage ledger goes through the same damage step as row 1 (duel step).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the tick and the roll are server-side); "zones as data": tick period, upkeep and brick power are catalogue data

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch follows the described order and bands, not the lines.
- Driver disabled: `tickEffectUpdate` body is commented out (entity_base.cpp:949-985), so no sustained effect ticks in this snapshot. Do not copy the commented loop; write the driver in Frankendom's server tick (row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget"), with a per-tick budget on active links.
- Target resist missing: the roll uses only the caster's skill (s_link_effect.cpp:110-115 commented out, 123-129). Fix: compare attacker skill with the target's defence in the level gap, as the sketch does, and test both directions.
- Factor applied twice for a DoT: stored damage includes the creation factor (magic_action_dot.cpp:151-153), and each tick multiplies by a fresh factor (s_link_effect_dot.cpp:53). Fix: store per-second damage only and apply one factor per tick, as the sketch does.
- Crit clamp: `_ResistFactor > 1.0` is set to 1.0 (s_link_effect.cpp:141-144), so a critical result gives no bonus on a link. Either keep it on purpose (no crit on DoTs) or pass a `critCap` > 1 as data. The sketch takes the cap as data.
- Multi-target early return: in the duplicate check, `return;` (magic_action_dot.cpp:137) leaves `apply` for every target, not only the one that already has the DoT. Fix: `continue` to the next target. Receipt for line 137 is not written (quote under 15 characters); read directly.
- Any one failed roll ends the link (s_link_effect.cpp:137-152). For Frankendom this is a design choice: a fight with many enemies may want a partial failure to skip a tick, not end the spell. Decide per effect and say so in the catalogue row.
- Upkeep taken from HP or sap (magic_action_dot.cpp:118-124): the check at s_link_effect.cpp:66 subtracts only when the energy is greater than the cost, so the score cannot go below 0 through upkeep. The HP path was read, not tested in play.
- Level gap uses integer division by 10 (phrase_utilities_functions.cpp:312 call site `skillValue /10`, s_link_effect.cpp:132): a gap of -9 becomes 0. Acceptable as coarse steps; the sketch keeps `Math.trunc` to match.
- Data: the success table (SuccessChances, PartialSuccessMaxDraw, XpGain per level gap) and the band weights are sheet data not in the box. Frankendom must set its own numbers; do not cite Ryzom's values.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine); 3 (the roll and bands are shared with block and guard in the same engine)

## Pattern and data fields

pattern_tags: timer-wheel (per-tick link update), hit-aggregation (one roll, one damage ledger write per tick), clamp-and-report (factor clamped and reported), new:partial-band-factor (one roll to a damage multiplier with a partial band), new:upkeep-ends-link (link ends when caster energy is spent).
Data fields (in the sidecar JSON): tick_s, per_sec_dmg, upkeep, brick_power, crit_cap, success weights, chances table.
