# ryzom-ryzomcore (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/phrase_manager/` (the LIVE path: `s_link_effect.cpp`, `s_link_effect_dot.cpp`, `magic_action_dot.cpp`, `s_effect.cpp`, `s_effect.h`) with `egs_sheets/egs_static_success_table.h` | Licence: GNU AGPL v3 (COPYING:2 "Version 3, 19 November 2007"; README.md:5 "GNU Affero General Public License 3.0"); art assets CC-BY-SA 3.0 / FAL 1.3 (not used) | C++ | symbols `CSLinkEffectOffensive::updateOffensive` (s_link_effect.cpp:236), `CSLinkEffectDot::update` (s_link_effect_dot.cpp:40), `CStaticSuccessTable::getSuccessFactor` (egs_static_success_table.h:259)

Correction (2026-10-12): the first version of this note analysed `ryzom/server/src/sabrina/`, a legacy tree that is not built (server/src/CMakeLists.txt:50 `#sabrina`, under "no longer used maybe?"). That copy's "driver disabled" finding does not hold for the game. This version is rebuilt on the live `phrase_manager/` code.

Checked: Read in full on the live path: `s_link_effect.cpp` 25-439 (family tables, upkeep, offensive resist roll), `s_link_effect_dot.cpp` 40-179 (the DoT tick), `magic_action_dot.cpp` 165-485 (launch rolls, damage factor, link creation), `s_effect.cpp` 39-90 (timer callback), `s_effect.h` 39-115 (timer event, constructor arms the first update), `egs_static_success_table.h` 137-300 (the factor function), `egs_variables.cpp:229,239`. Not read: the success table data (a Georges sheet `magic_resist_link.succes_chances_table`, not in the box), the brick data, `CRandom::rand`, `getMagicResistance` internals, `incResistModifier` internals, focus item maths (`_Focus.getPowerFactor`). Confidence: high for the live link model, as code.

Best transferable idea: a sustained effect is a timer-driven link. Each tick the caster pays an upkeep and one roll maps to a damage multiplier with a partial band (full down to zero); a resisted tick ends the effect; each landed tick raises the target's resistance so spamming one effect gets weaker.
Decision (proposed): adapt - take the timer-driven link, the per-tick upkeep with range and death checks, the one-roll fade band and the rising target resistance; fix the donor defects: creation factor baked into stored damage and then a second roll per tick, the wear step that never runs, and a dead resist-bonus test.
Acceptance: a player's sustained spell shows a tick every tuned interval with damage at full, partial (smaller number) or zero ("resisted"), and the link ends when the caster's energy is spent, the caster dies, or the target leaves range; a server test asserts one factor per tick, the upkeep order, range end, and that the first tick pays but does not hit.

## 1. Mechanism

- Driver (live): every `CSEffect` arms a timer in its constructor, `_UpdateTimer.setRemaining(1, new CUpdateEffectTimerEvent(this, true))` (s_effect.h:101,113). `CUpdateEffectTimerEvent::timerCallback` (s_effect.cpp:39-65) calls `_Parent->update(this, applyEffect)`. For a non-stackable effect, `applyEffect` is false unless this effect is the one `lookForActiveEffect(family)` returns (s_effect.cpp:54-63), so only the strongest effect of a family deals its tick (the others still pay upkeep). The note's first version claimed the driver was disabled; that was the dead sabrina tree.
- Period: per family. `CSLinkEffect::getUpdatePeriod(family)` (s_link_effect.cpp:74-101) returns a server variable per family (Fear, Sleep, Stun, Root, Snare, Slow, Blind, Madness, Dot) else `DefaultUpdatePeriod`. `UpdatePeriodDot` default is 40 game cycles (egs_variables.cpp:239); with a 0.1 s cycle that is 4 s, and `magic_action_dot.cpp:307` multiplies by `CTickEventHandler::getGameTimeStep()` to get seconds. The same file gives a per-family "no link time" (s_link_effect.cpp:42-69; `NoLinkTimeDot` = 0, egs_variables.cpp:229) that adds time to a link that died.
- Upkeep and end checks (`CSLinkEffect::update`, s_link_effect.cpp:107-212), when the link still exists: end if the caster is gone (133-138); end if the target is out of range `_MaxDistance` (141-144); end if the caster player is dead (153-156); the price is `_CostPerUpdate`, divided by `1 + focusPowerFactor` when a magic focus item is held (162-166); energy at 0 or not above the price ends the link, else the price is subtracted (169-180). If not ended, the next tick is armed with the family period (194-198); if ended, `caster->removeLink` (202).
- Offensive checks (`updateOffensive`, 236-438): the target gains the anti-magic shield power -> end (250-255); `validateSpellTarget` fails (can happen in PvP or a duel) -> end (259-263).
- Resist roll (265-389), skipped on the first tick (`_FirstResist`, 276; the first pass sets `_ResistFactor = 1` at 387-388): resist value from the target by damage type for a DoT (`getMagicResistance(dot->getDamageType())`, 284), by family otherwise (289). Caster skill is the player's skill, or the creature's attack level (292-308); minus the `DebuffSkillMagic` param, plus the `OutpostMagic` param (310-315); capped at the brick power (318-319); a low-level boost `MagicSkillStartValue` and a consumable modifier for players (321-332). Roll `rand(99)` (336); factor from `getSuccessFactor(MagicResistLink, skill - resist, roll)` (337). The gap is the raw difference (the sheet table is clipped to a min/max delta), not divided by 10.
- Factor function (egs_static_success_table.h:259-283): clip the gap, read `chances` and `maxPartialDraw` for that gap; roll above `maxPartialDraw` -> 0; roll at or below `chances` -> `_MaxSuccessFactor`; otherwise a straight line from `_MaxPartialSuccessFactor` down to `_MinPartialSuccessFactor` between `chances` and `maxPartialDraw`. There is no critical-failure value and no separate crit band in the function; the sheet may set a max success above 1.
- After the roll: a landed tick (factor > 0) raises the target's resist modifier for that type (340-354). The XP report gap is set from the creature's XP level (356-383). Then factor > 0 keeps the link and a factor above 1 is clamped to 1.0 (393-399); factor <= 0 ends the link, with the resist message (410-413, 426-430). Every offensive tick also sends a small aggro event, -0.01 (416-424).
- DoT tick (`CSLinkEffectDot::update`, s_link_effect_dot.cpp:40-179): calls the offensive update first (42); the first update after creation returns without damage (45-49); skipped if `applyEffect` is false (51-54). HP damage is `_DmgHp x _ResistFactor` through `applyDamageOnArmor` (71-74). Sap and stamina are drained the same way and floored at 0 (110-161). Players with a vampirise value heal the caster by `damage x ratio`, capped by the target's HP and by `_Vampirise` (76-90). Aggro per score is `-damage / max`, floored at -1 (98-107, 123-132, 150-159). Death is checked on the HP change (167-171).
- Creation (`CMagicActionDot::launch`, magic_action_dot.cpp:165-318): returns if the cast success factor is <= 0 (185-190). Caster skill with the debuff, outpost buff and brick power cap (194-223). Per target: invulnerable -> factor 0 (267-270); else `getMagicResistance(_DmgType)`; the immune score -> factor 0 and `Immune` (276-280); else roll `rand(99)` against the `MagicResistDirect` table (284-285). A factor above 1 clamps to 1 (304-305). The stored per-target damage factor is `resistFactor x successFactor x period x timeStep`, times a PvP magic factor for player vs player (307-313).
- Creation (`apply`, 320-467): a new `CSLinkEffectDot` stores `_DmgHp x factor`, `_DmgSap x factor`, `_DmgSta x factor` (405-419). Normal casts: `actor->addLink(dot)` and `target->addSabrinaEffect(dot)` (442-443); if the resist was partial the cast breaks the other links (446-451). If `breakNewLink()` the link is added and removed at once, so the creation is a one-shot (430-439). A target out of the creature's reach gets "UNEFFICENT_RANGE" and no link (392-399). There is no duplicate-DoT test here; stacking is handled by the timer callback (strongest of the family applies).
- Link energy is sap (`SCORES::sap`, magic_action_dot.cpp:409), not HP.

## 2. Key functions

- `CUpdateEffectTimerEvent::timerCallback` (s_effect.cpp:39-65): the driver.
- `CSLinkEffect::update` (s_link_effect.cpp:107-212): range, death, upkeep, next tick.
- `CSLinkEffectOffensive::updateOffensive` (s_link_effect.cpp:236-438): shield, target validity, resist roll, resist growth, end rule.
- `CSLinkEffectDot::update` (s_link_effect_dot.cpp:40-179): damage through armour, sap and stamina drains, vampirise, aggro.
- `CMagicActionDot::launch` (magic_action_dot.cpp:165-318) and `apply` (320-467): creation roll, stored damage, link creation.
- `CStaticSuccessTable::getSuccessFactor` (egs_static_success_table.h:259-283): the fade band.

## 3. Numbers vs mechanism

| Mechanism | Effect | Formula | Number ranges | Cost | Cooldown / cast time | Caps | file:line |
|---|---|---|---|---|---|---|---|
| Sustained link (DoT) | damage each tick | stored base x creation factor, then x tick factor | period `UpdatePeriodDot` = 40 cycles (about 4 s), server variable | upkeep per tick (brick data) | period per family | link ends when caster energy runs out | s_link_effect.cpp:74-101,197; egs_variables.cpp:239; magic_action_dot.cpp:307 |
| Upkeep | caster pays each tick | price = cost / (1 + focus factor); energy -= price if energy > price, else end | cost is brick data (not read) | sap per tick for the DoT | per tick | energy 0 ends the link | s_link_effect.cpp:162-180; magic_action_dot.cpp:409 |
| Range and death | link ends | out of `_MaxDistance` or caster dead | spell range | none | per tick | none | s_link_effect.cpp:141-156 |
| Effective skill | skill used for the roll | skill - debuff + outpost buff, capped at brick power, floor `MagicSkillStartValue` for players | values not read | none | per tick | brick power | s_link_effect.cpp:310-332 |
| Chance | % chance from skill minus resist | `SuccessXpTable[MIDDLE - clip(gap)]` | sheet (not in box) | none | per tick | min/max delta clip | egs_static_success_table.h:265-270 |
| Roll | one roll per tick | `rand(99)` | range of rand not read | none | per tick | none | s_link_effect.cpp:336 |
| Factor band | single factor | roll > maxPartialDraw: 0; roll <= chances: max success; else line from max partial to min partial | weights from sheet (not in box) | none | per tick | link clamps above 1 to 1.0 | egs_static_success_table.h:259-283; s_link_effect.cpp:396-399 |
| Resisted tick | link ends | factor <= 0 ends the link, resist message | n/a | none | n/a | n/a | s_link_effect.cpp:410-430 |
| Resist growth | target resists more | landed tick raises the target's resist modifier for that type | amount not read | none | per tick | none read | s_link_effect.cpp:340-354 |
| Creation roll | gate and damage factor | `rand(99)` vs `MagicResistDirect`; factor x cast factor x period | sheet | none | at cast | immune -> 0 | magic_action_dot.cpp:267-313 |
| Armour on DoT | damage reduced by armour | `applyDamageOnArmor(type, dmg)` | armour values not read | none | per tick | none read | s_link_effect_dot.cpp:74 |
| Vampirise | caster heals | `min(dmg x ratio, target HP, _Vampirise)` | not read | none | per tick | `_Vampirise` | s_link_effect_dot.cpp:76-90 |
| One DoT per family | only strongest ticks | non-stackable effect applies only if it is the target's active one of that family | n/a | upkeep still paid | n/a | one active | s_effect.cpp:54-63 |

Numbers that suit a fast mobile fight: a 4 s tick is far too slow for a fast fight (use 0.5-1.0 s as a starting range, to be tested); the 0-99 roll and the fade-band shape transfer as-is.

## 4. TypeScript sketch

simplified: one link tick in donor order (range, death, upkeep, skip the first tick, skill cap, roll, factor, damage) plus the fade function. It changes on purpose: (1) damage is stored as a base rate and the factor is applied once per tick (the donor bakes the creation resist and success factor into the stored damage at magic_action_dot.cpp:307,415 and then rolls and multiplies again per tick, s_link_effect_dot.cpp:71-73); (2) the crit cap is an explicit data value (the donor clamps to 1.0 at s_link_effect.cpp:396-399); (3) the wear step is part of the caller's tick, because in the donor the inner `CCharacter *player` at s_link_effect.cpp:150 shadows the outer pointer, so the `player != NULL` wear block at 183-191 never runs; (4) the caller drives it at a fixed step. It omits sap and stamina, armour, vampirise, aggro and messages.

```ts
// Licence: AGPL-3.0 (donor). clean-room, shape only.
interface FadeRow { chances: number; maxPartialDraw: number; }
interface FadeShape { maxSuccess: number; maxPartial: number; minPartial: number; }

// One roll (0..99) -> a factor. Roll above maxPartialDraw: 0. Roll at or under chances: maxSuccess. Between: linear fade from maxPartial to minPartial.
function fadeFactor(row: FadeRow, roll: number, s: FadeShape): number {
  if (roll > row.maxPartialDraw) return 0;
  if (roll <= row.chances) return s.maxSuccess;
  const span = row.maxPartialDraw - row.chances; // > 0 here, because roll > chances and roll <= maxPartialDraw
  return s.maxPartial - ((s.maxPartial - s.minPartial) * (roll - row.chances)) / span;
}

interface Link {
  perSecDmg: number;       // base damage per second, NO roll factors baked in
  upkeep: number;
  power: number;           // brick power: caps the caster skill
  maxRange: number;
  firstTick: boolean;
  resistBonus: number;     // target resistance gained from successful ticks
}
interface Caster { energy: number; skill: number; debuff: number; dead: boolean; }

type TickResult = { end: boolean; damage: number };

function tickLink(
  l: Link, c: Caster, distance: number, targetResist: number,
  rowOf: (gap: number) => FadeRow, roll: number, shape: FadeShape, periodS: number,
  critCap: number,
): TickResult {
  if (distance > l.maxRange || c.dead) return { end: true, damage: 0 };
  if (c.energy <= l.upkeep) return { end: true, damage: 0 };      // donor: energy 0 or not above the price ends the link
  c.energy -= l.upkeep;
  if (l.firstTick) { l.firstTick = false; return { end: false, damage: 0 }; } // donor: first update pays but does not roll or hit
  const skill = Math.min(c.skill - c.debuff, l.power);
  const f = fadeFactor(rowOf(skill - targetResist), roll, shape);
  if (f <= 0) return { end: true, damage: 0 };                    // donor: factor <= 0 ends the link with a resist message
  l.resistBonus += Math.min(f, critCap);                          // donor: target resist modifier rises on each landed tick
  return { end: false, damage: Math.trunc(l.perSecDmg * periodS * Math.min(f, critCap)) };
}

export { fadeFactor, tickLink };
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copied to /tmp, deleted after): exit 0 (re-run 2026-10-12 for this rebuilt sketch).

## 5. Lands in

- TARGET `src/fight/sustain.ts` (new engine module for timed effects on a target: DoT, HoT, and CC links). The one roll and its fade band belong in `src/fight/resist.ts` (shared with melee guard and block). Parity-checklist row 13 (specials); the per-tick damage ledger goes through the same damage step as row 1 (duel step).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the tick and the roll are server-side); "zones as data": tick period per family, upkeep and brick power are catalogue data

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch follows the described order and bands, not the lines.
- Driver is live here, so there is no driver defect to fix in the idea. Frankendom still needs its own fixed-step server tick (row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget"), with a per-tick budget on active links.
- Factor applied twice for a DoT: stored damage includes the creation resist and cast success factor (magic_action_dot.cpp:307,415-417), and each later tick multiplies by a fresh factor (s_link_effect_dot.cpp:71-73). Fix: store the base rate and apply one factor per tick, as the sketch does; keep the creation roll only as a gate.
- Crit clamp: a factor above 1 is set to 1.0 (s_link_effect.cpp:396-399), so a max-success above 1 gives no bonus on a link. Either keep it on purpose or pass `critCap` as data; the sketch takes it as data.
- Wear never runs: the inner `CCharacter *player` (s_link_effect.cpp:150) shadows the outer `player` (147), so the degrade-items block (183-191) sees NULL. Fix: do not shadow; decide per tick whether a sustained spell wears the focus item, armour and shield.
- Dead test in creation: `if (targetInfos.ResistFactor > 1.0f) incResistModifier` (magic_action_dot.cpp:288-289) only fires when the sheet gives a max success above 1. Keep or drop on purpose.
- Any one failed roll ends the link (s_link_effect.cpp:410-430). For Frankendom this is a design choice: a fight with many enemies may want a partial failure to skip a tick, not end the spell. Decide per effect and say so in the catalogue row.
- The first update after creation pays upkeep but deals no damage and rolls nothing (s_link_effect_dot.cpp:45-49, s_link_effect.cpp:387-388). Fine as a wind-up; make it data.
- Upkeep subtracts only when energy is greater than the price, so the score cannot go below 0 through upkeep (s_link_effect.cpp:172-177). Read, not tested in play.
- A non-stackable second DoT of the same family still pays upkeep but deals nothing (s_effect.cpp:54-63, dot update returns at s_link_effect_dot.cpp:51-54). For Frankendom: end or refuse the weaker link instead of letting it drain the caster.
- Data: the success table (chances and partial draw per gap) and the max/partial weights are sheet data not in the box. Frankendom must set its own numbers; do not cite Ryzom's values.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine); 3 (the roll and bands are shared with block and guard in the same engine)

## Also found

Per-family update and no-link periods (s_link_effect.cpp:42-101); magic resistance by damage type with an immune score (magic_action_dot.cpp:274-280); focus item cutting the upkeep price (s_link_effect.cpp:162-166); range and death checks on every tick (141-156); vampirise heal on the DoT (s_link_effect_dot.cpp:76-90); aggro from DoT damage as a share of max score (98-107); target resist modifier rising on landed ticks (s_link_effect.cpp:340-354); anti-magic shield ends offensive links (250-255); PvP magic damage factor at creation (magic_action_dot.cpp:310-313); a partial resist at creation breaks the caster's other links (446-451).

## Pattern and data fields

pattern_tags: timer-wheel (per-tick link update on a game-cycle timer), hit-aggregation (one roll, one damage ledger write per tick), clamp-and-report (factor clamped and reported), new:partial-band-factor (one roll to a damage multiplier with a fade band), new:upkeep-ends-link (link ends when caster energy is spent, or on range or death), new:resist-growth (landed ticks raise target resistance).
Data fields (in the sidecar JSON): tick_s per family, per_sec_dmg, upkeep, brick_power, max_range, crit_cap, fade shape (max success, max partial, min partial), chances and max-partial-draw table, first_tick_delay.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: WRONG
Errors: Main claim false: note analysed the legacy ryzom/server/src/sabrina/ tree, which is not built (server/src/CMakeLists.txt:50 '#sabrina' under 'no longer used maybe?'). The live code is entities_game_service/phrase_manager/ (s_effect.h:39-147 CTimerEvent-driven CUpdateEffectTimerEvent; s_link_effect.cpp:107 update(CTimerEvent*,bool)). So 'driver disabled, per-tick code does not run, defect' is wrong for the live game; entity_base.cpp:949 comment itself says 'now use CTimer to manage events for effects'. Also false for live: period fixed 4.0 s (live: UpdatePeriodDot var = 40 ticks, egs_variables.cpp:239, per-family getUpdatePeriod), 'target resist missing' (live has target->getMagicResistance, s_link_effect.cpp ~276-289), upkeep has range test/focus-item price/death check (live s_link_effect.cpp:140-175), DoT has vampirise and aggro (s_link_effect_dot.cpp:76-107), creation DmgFactor includes resist (magic_action_dot.cpp:307). Line cites into sabrina/ (s_link_effect.cpp 33,44,55-73,92-163; dot 35-97; magic_action_dot 109-153; getSucessFactor 330-351; entity_base 946-986) are accurate for that dead copy; factor-band maths in phrase_utilities_functions matches.
Missed: Live implementation under entities_game_service/phrase_manager (timer-driven updates, per-family update/no-link periods, magic resistance by damage type, range check, focus item cost reduction, vampirise).
Fixed 2026-10-12 (Sonnet fixer): rebuilt every section on the live phrase_manager/ code (timer-driven updates, per-family period 40 cycles, resist by damage type, range/death/focus upkeep, vampirise, aggro, fade-band factor function with no crit/-1 bands); dropped the false 'driver disabled', 'target resist missing' and 'multi-target early return' defects; kept double-factor and crit-clamp defects (re-verified live); added the shadowed-variable wear defect; replaced the sketch and re-typechecked (exit 0); added Also found.
