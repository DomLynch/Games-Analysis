# EQEmu (magic-spells-powers, cell 3)

Donor: `/mnt/frankendom-donors/EQEmu/zone/spells.cpp` | Licence: GPL-3.0 (LICENSE.md: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"; clean-room, shape only) | C++ | symbol `Mob::ResistSpell`, `Mob::ResistPhysical`, `Mob::CastedSpellFinished` (concentration roll), `Mob::GetActSpellCasttime`

Checked: Read end to end: `Mob::ResistSpell` (spells.cpp 5282-5607, every branch of the chance build, the caps, the roll, the partial effect), `Mob::ResistPhysical` (5609-5640, the positive branch fully and the level term for the negative branch), the cast timer hand-off (spells.cpp 117-121, 459), the concentration roll at cast end (`CastedSpellFinished` head 1405-1410, channel block 1498-1557), `attacked_count` reset (1206), melee count and stun interrupt (attack.cpp 4455-4475), `Mob::GetActSpellCasttime` (mob.cpp 5257-5274), `IsPartialResistableSpell` (common/spdat.cpp 775-810), the caller that acts on the effect percent (spells.cpp 4450-4490), and the rule defaults (common/ruletypes.h 450-498). The spell data row fields are read from the struct in common/spdat.h (1619-1724); the table values themselves (the spell file or DB import) were not read. Candidate files opened: 6 (spells.cpp, attack.cpp, mob.cpp, spdat.cpp, spdat.h, ruletypes.h). Confidence: high on the resist and partial-effect order and numbers (read in full, 1 read path); high on the concentration roll; medium on the stun-interrupt rate (depends on whether `Random::Int` is inclusive; not read). Not read: `Mob::IsImmuneToSpell` (5042), `CalcFearResistChance` body, `TrySpellEffectResist`, `GetResist` (the per-type resist sources), `IsResistableSpell` body, the effect bodies for charm, mesmerise, fear and root (spell_effects.cpp), `pets.cpp`, the reagent and focus item paths, the spell data import (`utils/scripts/import_spells.pl`), the `Timer` class units. camera_scope: n/a (magic cell).

Best transferable idea: a resisted damage spell still lands a fraction: the resist roll sets a chance, a roll that misses it still deals 100 minus 150 times the gap over the chance, so only the bottom third of the resisted band is a full block.

Decision (proposed): adapt - keep the signed level-gap term, the per-spell resist modifier with min and max caps, and the partial effect for damage spells; drop the charisma steps and the 200-point roll range as they are, and resolve the roll server-side in the engine's damage step on the one ledger.
Acceptance: A damage spell with resist chance 100 deals 25 percent of its damage on a roll of 50 and nothing on a roll of 33 or less; a server test asserts `effectPercent(100, 50, true) == 25` and `effectPercent(100, 33, true) == 0`, and that a non-partial spell at the same chance is a full block (these numbers are the non-NPC case: the donor's NPC-target partial shifts at spells.cpp 5569-5593 are not in the sketch).

## 1. Mechanism

- Entry (`ResistSpell`, spells.cpp 5282). Returns 100 for no caster, 0 for an invalid spell or a magic-immune target (`MagicImmunity` special ability). A "casting from range immunity" special returns 0 unless the caster is in combat range (5295-5301, read; magic immunity 5303-5306).
- Resist modifier (5317-5331). The spell's `pvp_resist_base` is used when both sides are clients, else `resist_difficulty` (5317-5319). A caster's focus resist subtracts twice its value (5326-5328); a target's incoming focus resist subtracts its value.
- Fear (after 5330): fear spells get an extra roll against the target's fear resist chance (`CalcFearResistChance`). A success returns 0.
- Pre-roll checks (5347 onward): with no charm tick, the target's special resist-type effects and the sanctification-style chance bonus can each return 0 (not read in full).
- Level term (5389-5433, non-physical types): difference = target level minus caster level. An NPC target at level 67 or above has its difference replaced by (66 minus caster level), floored at 0 (5402-5406). Difference is floored at -9 for NPC targets (5420-5421), and for a client or bot at level 21 or more the difference is capped at 15 (5415-5418). Term = difference squared over two, negated when the difference is negative (5425-5428). A NPC target more than 20 levels above the caster gets a term of 1000 (5433), which makes that target resist almost every spell (see section 6). An extra damage term for NPCs at level 17 or more (from 5437, read, not receipted).
- Charisma (5456-5490; charm, mesmerise and fear only, `CharismaCheck`). Fear: below CHA 100 costs 20; from 100 to 255 adds `(CHA - 100) / 8` (5469-5475). Other spells: at CHA 75 or more, subtract `(min(CHA, 255) - 75) / 10` (5480-5485); below 75, add `((75 - CHA) / 10) * 6` (5488).
- A caster with the `CastingResistDifficulty` special ability adds its parameter to the resist modifier (5323-5324).
- Harmony spells on a non-charisma cast use a flat target resist of 15 (5496-5497).
- Chance (5500-5517): `chance = level term + resist modifier + target resist` (5500, 5514, 5515). Per-spell caps: clamp to `max_resist` when non-zero (5519-5521), and to `min_resist` when non-zero (5524-5526).
- Charm and root minimums (5531-5545): on a charm tick the chance is at least `((100 / CharmBreakCheckChance) / 66 * 100) * 2` (rule default 25, so about 12), and on a root tick at least `((100 / RootBreakCheckChance) / 22 * 100) * 2` (rule default 70, so about 12.99, truncated to 12).
- Roll (5549-5551). Integer roll from 0 to 200 (or the soft-cap value when the rule is on, default off). Roll above the chance: full effect, 100 (5551-5552).
- Partial effect (5553-5607). Otherwise, if the spell is not partial-eligible (`IsPartialResistableSpell`), 0 (the full resist). If eligible: `partial = (150 * (chance - roll)) / chance` (5567). Partial at or below 0 gives 100; at or above 100 gives 0; otherwise `100 - partial` (5595-5604). The donor then adds NPC-specific shifts to `partial` before those ends (5569-5593, verified): +5 when the target is an NPC above the caster's level, at level 17 or more, with caster level 50 or less; plus (caster level - 25) when the target is an NPC at level 30 or more and the caster is below 50; -5 when the target is an NPC under level 15; and +1.5 x (level gap) when the CASTER is an NPC and the target is 20 or more levels above it. With none of these (a non-NPC target, NPC caster gap under 20) the effect falls linearly from 100 at the chance to 0 at one third of the chance. Partial-eligible = a spell whose FIRST non-blank effect slot is a current-HP damage (or a once-only HP change) with a negative base value, and not `no_partial_resist` (`spdat.cpp` 775-810; the loop returns false at the first non-blank slot that does not match, so a spell with a damage effect in a later slot is not eligible).
- The caller (spells.cpp 4459-4486): `spell_effectiveness` from `ResistSpell`; below 100, a 0 or a non-partial spell is a full resist message. Charm, mesmerise and fear pass `CharismaCheck` true (the call at 4459; the other call is at 4471).
- Physical type (`ResistPhysical`, 5609-5640): positive difference: fall-off value 3 for caster level 12 or less, else `caster_level / 4` (5629-5632). Above the fall-off, or at difference 15 or more, term `((diff * 10) + diff) * 2` (5634-5635); otherwise `diff * diff / 2` (5637). Negative difference: `-(diff * diff / 2)` (5640, read).
- Concentration at cast end (`CastedSpellFinished`, spells.cpp 1498-1557): the timer fires `CastedSpellFinished` (117-121). If the caster was hit by melee since the cast started (`attacked_count > 0`) or moved, a channel roll decides (1498-1510). Hits are capped at 15 (1511). Client chance: `30 + skill / 400 * 100 - 2 * hits`, then `+= chance * channelbonuses / 100` from item, spell and AA channel bonuses (1522-1525; the comment says a maximum of 93 at skill 252, before bonuses). Bards skip this block (the else-branch at 1498). NPC chance: `85 - hits` (1528). Movement: a move under 5 on each axis costs `25 * (dx² + dy²)` points (1544), and 5 or more on an axis sets the chance to 0 (1549). Roll `Real(0,100) > chance` interrupts unless the spell is `uninterruptable` (1555-1557).
- Hit counting (attack.cpp 4474-4475): non-spell hits (melee and similar) while casting add 1 to `attacked_count`; damage from a spell does not (comment at 4474).
- Stun interrupt (attack.cpp 4455-4460): a stun that the target does not resist, while casting (spell ids outside 859-1023), rolls `Int(0, 9) > 1` to interrupt (comment at 4457 says 90%).
- Cast time (`GetActSpellCasttime`, mob.cpp 5257-5274): for four classes (ranger, shadow knight, paladin, beastlord) a long non-beneficial cast (3000 or more, level above 50) adds 3 per level above 50 (up to 15 levels, +45) to the focus haste reduction (5263-5267); that SUM is then capped at 50 (5269); only after the cap is the separate uncapped `focusFcCastTimeMod2` reduction added (5270); then `cast * (100 - reduction) / 100` (5271), minus a flat amount (5272), floor 0 (5274). The timer is started with the cast time (spells.cpp 459; the unit is not confirmed in the read code, the 3000 threshold suggests milliseconds).

## 2. Key functions

- `Mob::ResistSpell`: `/mnt/frankendom-donors/EQEmu/zone/spells.cpp` 5282-5607.
- `Mob::ResistPhysical`: same file, 5609-5641.
- `Mob::CastedSpellFinished` (cast-end concentration roll): same file, 1405 onward; channel block 1498-1557.
- `Mob::GetActSpellCasttime`: `/mnt/frankendom-donors/EQEmu/zone/mob.cpp` 5257-5274.
- `IsPartialResistableSpell`: `/mnt/frankendom-donors/EQEmu/common/spdat.cpp` 775-810.
- Melee count and stun interrupt: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` 4455-4475.
- Rule defaults: `/mnt/frankendom-donors/EQEmu/common/ruletypes.h` 450-498.

## 3. Numbers vs mechanism

Reusable algorithm: one chance from three terms (level gap, spell modifier, target's resist), clamped by per-spell caps; one roll; a resisted roll still scales the effect linearly over the lower two thirds of the band; concentration is checked once when the cast ends, from hits taken and movement.

Game-specific constants: the level-gap squared over two (signed); the 150 partial factor; the 200 roll range; the charisma steps (75, 10, 6, and 100/8 for fear); the 25 and 70 break-check rules; the 85 NPC channel base; the 30 plus skill/400 client base; the 25-per-squared-unit movement cost; the 50 percent cast-reduction cap.

TABLE (name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line):

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Level term | shifts chance by level gap | sign(diff) * diff² / 2, diff = target - caster | diff -9 (NPC floor); client/bot at level 21+ capped at 15; NPC falloff at level 67 | none | none | NPC more than 20 levels above caster gets 1000 | spells.cpp:5402, 5420, 5425-5428, 5433 |
| Resist modifier | per-spell offset | `resist_difficulty` (PvE) or `pvp_resist_base` (both clients) | int16 field | none | none | focus resist costs 2 per point | spells.cpp:5317-5319, 5328; spdat.h:1665, 1692 |
| Charisma, charm and mesmerise | CHA lowers or raises the chance | CHA ≥ 75: -(min(CHA,255) - 75) / 10; CHA < 75: +((75 - CHA) / 10) * 6 | CHA 0-255 | none | none | cap 255 on the effect | spells.cpp:5480-5488; ruletypes.h:451-452 |
| Charisma, fear | CHA for fear | CHA < 100: -20; 100-255: +(CHA - 100) / 8 | CHA 0-255 | none | none | undead excluded | spells.cpp:5469-5475 |
| Chance | the resist chance | level term + modifier + target resist; min/max clamp | 0-200 scale | none | none | per-spell min_resist and max_resist (0 = none) | spells.cpp:5500-5526; spdat.h:1704-1705 |
| Charm break minimum | floor on charm-tick chance | `((100 / CharmBreakCheckChance) / 66 * 100) * 2` | rule 25 gives about 12 | none | per buff tick | floor only | spells.cpp:5533; ruletypes.h:454 |
| Root break minimum | floor on root-tick chance | `((100 / RootBreakCheckChance) / 22 * 100) * 2` | rule 70 gives about 12.99 (truncated) | none | per buff tick | floor only | spells.cpp:5542; ruletypes.h:462 |
| Roll | the die | `Int(0, 200)` (soft cap off by default) | 0-200 | none | per cast | soft cap rule off | spells.cpp:5549; ruletypes.h:497-498 |
| Partial effect | resisted damage still lands | roll > chance: 100; partial = 150 * (chance - roll) / chance; effect = 100 - partial, 0 at partial ≥ 100 | effect 0-100; 0 at roll ≤ chance / 3 | none | per cast | non-partial spells are full blocks; partial only for current-HP damage | spells.cpp:5551-5604, 4485; spdat.cpp:775-810 |
| Physical level term | melee-style resist | above fall-off: ((diff * 10) + diff) * 2; below: diff² / 2; fall-off 3 or caster / 4 | diff from -, to 15+ | none | none | falloff at caster level 12 | spells.cpp:5629-5637 |
| Concentration roll | keeps a cast alive to its end | client: 30 + skill/400*100 - 2*hits; NPC: 85 - hits; movement -25*(dx²+dy²) when both under 5; else 0 | skill 0-252 (93 at 252); hits 0-15 | none | checked once at cast end | hits capped at 15; uninterruptable spells skip | spells.cpp:1498-1557 |
| Melee hit counter | counts hits while casting | +1 per non-spell hit (melee and similar) while casting; spell damage does not count | count 0-15 (capped) | none | reset at cast clear | cap 15 | attack.cpp:4474-4475; spells.cpp:1206 |
| Stun interrupt | stun while casting | `Int(0, 9) > 1` interrupts (8 in 10 if inclusive; comment says 90 percent) | 0-9 | none | per stun | excludes spell ids 859-1023 | attack.cpp:4455-4460 |
| Cast time | cast length after focus | `cast * (100 - min(haste + classLevelReducer, 50) - uncapped) / 100 - flat`, floor 0 | haste plus class level reducer capped together at 50; the class reducer is up to 45 for four classes above level 50 on long non-beneficial casts; uncapped term added after the cap | none | the output is the cast timer | haste plus class reducer cap 50 | mob.cpp:5257-5274 |
| Cast time data | the base cast | `cast_time` field (units from the timer; see section 6) | uint32 | none | base | none | spdat.h:1619 |
| Recovery and recast fields | data only | `recovery_time`, `recast_time` (enforcement not read) | uint32 | none | data | none | spdat.h:1620-1621 |

Derived by hand (not run):
- Level term: caster 5, target 10 gives 25 / 2 = 12 (truncated). Target 5 below caster: -12. A 20-level gap gives 200.
- Partial at chance 100: roll 50 gives 25% effect; roll 40 gives 10%; roll 33 or less gives 0%.
- Concentration: a client at skill 252 with no hits or movement: 30 + 63 = 93% keep. Two melee hits: 89%. A NPC with no hits: 85%; five hits: 80%.
- A client who moves 1 unit on one axis while casting loses 25 points; 2 units on one axis loses 100 points (zero chance).

Which numbers suit a fast mobile fight: the partial factor of 150 with the one-third block band is good for damage spells (most hits land partly, a few are clean blocks). The level term is too steep for a duel: cap the gap at about ±5 levels to keep the squared term under 13. A channel check that is rolled once at cast end (not per tick) fits a server-verified fight.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the level term (signed, from the gap), the modifier and the target resist into one chance, then the min and max clamp; the roll; the partial effect with its zero and full ends; and the cast-end concentration roll. It also omits the NPC-target partial shifts (5569-5593), so the effect numbers match the donor only for non-NPC targets. It uses the signed movement difference (the donor takes the difference of absolute values, see section 6, defect 4) and omits the NPC-only floors and falloffs, the focus resist, the fear and charisma tables, the root and charm break minimums, the pre-roll special-ability checks, the physical-type term, the harmony override, the caster's range immunity, the stun interrupt and the melee-count bookkeeping (the caller supplies the count). The roll is an input, so the sketch is deterministic.
```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface ResistInput {
  targetLevel: number;
  casterLevel: number;
  resistDifficulty: number; // per-spell data field
  targetResist: number;     // the target's resist for this damage or effect type
  charismaMod: number;      // signed; charm, mesmerise and fear only (computed by the caller)
  minResist: number;        // per-spell cap, 0 = none
  maxResist: number;        // per-spell cap, 0 = none
  partialAllowed: boolean;  // damage spells only in the donor
}

// Signed level term: (difference squared) / 2, negative when the target is below the caster.
export function levelMod(targetLevel: number, casterLevel: number): number {
  const diff = targetLevel - casterLevel;
  const m = Math.trunc((diff * diff) / 2);
  return diff < 0 ? -m : m;
}

// Resist chance on a 0..200 scale, clamped to the spell's min and max when those are set.
export function resistChance(i: ResistInput): number {
  let chance = levelMod(i.targetLevel, i.casterLevel) + i.resistDifficulty + i.charismaMod + i.targetResist;
  if (i.maxResist !== 0 && chance > i.maxResist) chance = i.maxResist;
  if (i.minResist !== 0 && chance < i.minResist) chance = i.minResist;
  return chance;
}

// Effect strength in percent: 100 = full, 0 = fully resisted, in between = partial (damage spells only).
// roll is the caller's uniform integer in 0..200. Above the chance the spell lands in full.
export function effectPercent(chance: number, roll: number, partialAllowed: boolean): number {
  if (roll > chance) return 100;
  if (!partialAllowed) return 0;
  const c = Math.max(chance, 1);
  const partial = Math.trunc((150 * (c - roll)) / c);
  if (partial <= 0) return 100;
  if (partial >= 100) return 0;
  return 100 - partial;
}

export interface ChannelInput {
  isClient: boolean;
  channelingSkill: number;     // client skill, 0..252 in the donor's comment
  meleeHitsWhileCasting: number;
  dxFromCastPoint: number;     // signed: current x minus the x where the cast started
  dyFromCastPoint: number;     // signed: current y minus the y where the cast started
  uninterruptable: boolean;
}

// Checked once, when the cast timer ends. Returns true when the cast keeps going.
// Interrupts when the roll (0..100) is above the chance. Melee hits are capped at 15.
export function keepsConcentration(p: ChannelInput, rollPct: number): boolean {
  if (p.uninterruptable) return true;
  const hits = Math.min(p.meleeHitsWhileCasting, 15);
  let chance = p.isClient ? 30 + (p.channelingSkill / 400) * 100 - hits * 2 : 85 - hits;
  const dx = Math.abs(p.dxFromCastPoint);
  const dy = Math.abs(p.dyFromCastPoint);
  if (dx !== 0 || dy !== 0) {
    if (dx < 5 && dy < 5) chance -= (dx * dx + dy * dy) * 25;
    else chance = 0;
  }
  return !(rollPct > chance);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/MG002-eqemu-resist.ts) exits 0.

## 5. Lands in

- TARGET `src/fight/resist.ts` (new module): the resist chance from level gap, spell modifier and target resist, the per-spell caps, the roll, and the partial effect for damage spells; applied inside the engine's damage step. The cast-end concentration check goes in `src/fight/casting.ts` (same row).
- Parity-checklist row 13 (specials). The donor's roll is the server's, so the roll and the effect percent are computed server-side and the client shows the cue.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients; the resist roll is server-side); MG-FOCUS (c) status ladder entry, (d) resist and consent in PvP (PvP uses `pvp_resist_base`), (g) resistances per damage type and partial damage.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Defects (keep the idea, fix the defect):
  1. Charisma step (spells.cpp 5488): `((75 - charisma) / 10) * 6` rounds down before the ×6, so CHA 65 gives +6 but CHA 66-74 gives 0, and each 10 points is a step, not a slope. The comment says 10 CHA is worth 6. Fix: `((75 - charisma) * 6) / 10`, or a table.
  2. Stun interrupt (attack.cpp 4459 against the comment at 4457): the comment says 90 percent; `Int(0, 9) > 1` is 8 in 10 if the range is inclusive (not read). Fix: make the number a data field and match the comment.
  3. Root break minimum (spells.cpp 5538-5542): the comment says about 6 percent; the `* 2.0f` on line 5542 makes it about 13. Fix: decide whether the doubling is intended and correct the comment or the code.
  4. Channel movement (spells.cpp 1536-1537): `d_x = abs(abs(x) - abs(spellX))` takes the difference of absolute values, so a move from x = +3 to x = -3 counts as 0. Fix: `abs(x - spellX)` on signed coordinates.
  5. Stale partial comment (common/spdat.cpp 787): it says damage uses a 600 scale and others 200, but the roll is always 0-200 (spells.cpp 5549) and the partial eligibility returns true only for damage. Fix: update the comment.
  6. An NPC more than 20 levels above the caster gets a level term of 1000 (spells.cpp 5433): a hidden immunity, not a stated rule. Fix: make it an explicit immunity flag in the spell or zone data.
- Frankendom rulings: the donor rolls with the zone's random source on the server; in ours the roll must be server-side and once per hit (one ledger). The concentration check happens once at cast end, which fits the server tick (row 18 sub-line: server tick, fixed step); do not turn it into a per-tick flag.
- Caps for a fast duel: the level term needs a cap (as in section 3); a 20-level gap gives 200 and makes the chance meaningless.
- Not covered (not read): `IsImmuneToSpell`, `TrySpellEffectResist`, `GetResist`, the fear resist body, the charm, mesmerise, fear and root effect bodies (MG-FOCUS c, d), the summons and pets (`pets.cpp`, MG-FOCUS e), dragons (f), spell purchase and learning (h), reagent and focus items (i), the spell-data import script and the units of `cast_time` (section 1 notes it as ms only by inference), and the enforcement of `recast_time`.
- Resource pools (mana and stamina per row) are not in the read code; the cast-time and recovery fields are data only.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one combat core, two clients; server-side roll); MG-FOCUS (c) status ladder, (d) resist and PvP consent in the roll, (g) resistances and partial damage, cast-end concentration as one check.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: 1) Partial effect: note says 'read end to end ... every branch' and states effect falls linearly 100 -> 0 at one third of chance. Real code (spells.cpp:5569-5593) adds NPC-specific adjustments to partial_modifier: +5 if target NPC level>caster and level>=17 and caster<=50; + (caster_level-25) if target NPC level>=30 and caster<50; -5 if target NPC level<15; and +1.5*(level-caster_level) if the CASTER is an NPC and gap>=20. The note omits all four, so 'bottom third is a full block' holds only for non-NPC targets (and the hand-derived roll-33 -> 0 example). 2) Cast time: note formula `cast*(100 - min(haste,50) - uncapped)/100` and table '+45 on top' are wrong in structure: the class level reducer (level_mod*3, max 45, requires !good_effect) is ADDED to focusSpellHaste BEFORE the 50 cap (mob.cpp:5265-5269), so haste+level reducer together are capped at 50; only focusFcCastTimeMod2 (5261, 5270) is uncapped. 3) Level term: missed the client/bot clamp `IsOfClientBot() && level>=21 && diff>15 -> 15` (5415-5418); note's diff table says 'any'. 4) Missed `CastingResistDifficulty` special ability adding to resist_modifier (5323-5324). 5) IsPartialResistableSpell (spdat.cpp 775-810) inspects only the FIRST non-blank effect slot (returns false at 806 if it is not a negative CurrentHP/CurrentHPOnce), note says 'a spell whose effect is' which hides this. 6) Concentration: client chance also gets `+= chance*channelbonuses/100` (1525) and the whole block is skipped for bards (else-branch at 1498), neither noted. Verified OK: ResistSpell entry 5282-5307, modifier 5317-5332, fear 5336-5345, level term 5402-5434, charisma 5456-5491 and defect 1 arithmetic, harmony 15 (5496), charm/root minimums 12/12.99 (5533, 5542), roll 0..200 (5549), partial 150*(chance-roll)/chance (5567), 100/0 ends (5595-5604), ResistPhysical 5609-5644, concentration 1498-1557 (93 at skill 252, NPC 85-hits, 25*d^2, cap 15), defect 4 abs(abs()) (1536-1537), stun roll (attack.cpp 4459, 859-1023), attacked_count (4474-4475, reset 1206), rule defaults (ruletypes 450-498), GPL licence. Acceptance effectPercent(100,50,true)==25 and (100,33,true)==0 hold with the sketch (150*67/100 truncates to 100); a build that ALSO ported the NPC partial adjustments would no longer match those numbers for NPC targets.
Missed: NPC-target partial adjustments (5569-5593) and the client/bot level clamp (5415) are the missed mechanisms; they change the partial band in the common PvE case.

Fixed 2026-10-12 (Sonnet fixer): all six checker errors verified against spells.cpp, mob.cpp and spdat.cpp and corrected in place: NPC partial-effect shifts (5569-5593), cast-time cap structure (class reducer summed with haste before the 50 cap, uncapped term after), client/bot level clamp 15, CastingResistDifficulty, first-slot rule of IsPartialResistableSpell, channel bonuses and bard skip. Acceptance now states the non-NPC case, which the unchanged sketch satisfies. Also found: the NPC partial shifts (the common PvE case).
