# l1j-en-classic (magic-spells-powers, cell 3)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Magic.java` (with `model/skill/L1SkillUse.java`, `model/Instance/L1PcInstance.java`, and the skill table in `db/l1jdb_m10.sql`) | Licence: GNU GPL v2 (COPYING:2 "Version 2, June 1991"; README.md:115 "Distributed under the GNU General Public License, version 2.") | Java | symbols `L1Magic.calcProbabilityMagic` (171), `L1Magic.calcProbability` (264), `L1Magic.calcMagicDiceDamage` (659), `L1Magic.calcMrDefense` (738)

Checked: Read in full: `L1Magic.java` 171-265 (status landing roll), 264-388 (chance formula by skill group), 389-402 (damage entry), 416-515 (player-target damage reductions), 659-713 (dice, INT, element, crit), 738-785 (MR and element resist). Read in full: `L1SkillUse.java` 3090-3206 (target gating, PvP failure rule, counter magic) and 178-196 (overlap and timer lists). Read in part: `L1PcInstance.java` 1173-1186 (checkNonPvP top, not the rest); `L1Magic.java` 124-135 (safe-zone list) and 550-553 (wrapper only). Data: the `skills` table schema (db/l1jdb_m10.sql 1772-1800, includes mpConsume, hpConsume, itemConsumeId and Count, reuseDelay, buffDuration) and four rows (ShockStun 35707, Entangle 35771, EarthBind 35776, ThunderGrab 35811). Opened for the search: `L1SkillTimer*.java` and `L1SkillDelay.java` (names only), `L1MobSkillUse.java` (name match only). Cost columns come from the four data rows; the code that spends them is not read. Not read: `tryCounterMirror` (518-549), `calcNpcMagicDamage` (614-658), `isMissingSkillEffect` body, `getMr()` and the per-status resist getters (character stats), `runSkill` (1581-3070), cast delay and MP cost code (`setDelay` 1533, `isHPMPConsume` 1028). Confidence: high for the probability and damage formulas as code; high for the defect list (each checked against the code lines); medium for the PvP rule (checkNonPvP body only partly read). Numbers below are computed from the code and the four data rows; they are not in-game measurements.

Best transferable idea: a status spell is one roll against a chance built from the spell's base value, a level-gap term, and the target's resist, with a hard cap, and one shared damage pipeline (dice, stat coefficient, element, crit, flat reductions, then a magic-resist percentage) so every spell reads the same way.
Decision (proposed): adapt - take the one-roll chance shape, the per-status resist and the PvP exemptions; fix the defects in section 6 (the missing resist on several status spells, the integer ratio in Thunder Grab, the 90 cap on the "cannot be resisted" spells, the element quantisation) and do not copy the stat scale as it stands.
Acceptance: a status spell with a level gap of +10 against a target with a stated resist shows a chance that is the base plus the gap term minus the resist (the arithmetic is visible in the cast log), the chance never exceeds 90%, and a test asserts that Entangle-type spells subtract the resist like Earth Bind does.

## 1. Mechanism

- Status spells (`calcProbabilityMagic`, 171-251): GMs always land (175-176). In player-vs-player, if either player is in a safety zone, a skill in `NOT_IN_SAFE_ZONES` fails (checkZone 253-262, list 124-131). An Earth Bind on the target blocks everything except Weapon Break and Cancellation (209-213). Then `probability = calcProbability(skillId)` (214), capped at 90 (217-218), then one roll `rnd = nextInt(100) + 1` (216) and `isSuccess = probability >= rnd` (221).
- Chance by skill group (`calcProbability`, 264-387):
  - Group A, level-gap spells (Elemental Fall Down, Return to Nature, Entangle, Erase Magic, Area of Silence, Wind Shackle, Striker Gale, Pollute Water, Earth Bind, Dark Blind): `value + (int)((dice/10) x (gap/2))` (278-284), gap = attacker level minus target level (275). For a player attacker, `+ 2 x magic hit` (286-288).
  - Shock Stun: `value + 2 x gap` (289-291), plus `2 x magic hit` for a player attacker (293-295).
  - Counter Barrier: `value + max(0, (attackerLevel - max(60, targetLevel)) / 4)` (296-299), plus magic hit for a player attacker (301-303).
  - Guard Brake, Resist Fear, Horror of Death: fixed 100, "not affected by MR" (304-308), then the 90 cap applies (217-218).
  - Thunder Grab: `value x (attackerLevel / max(1, defenderLevel)) + rand(0..20)` (312-314), plus magic hit for a player attacker (316-318).
  - Phantasm: 30 unless the pair is player vs player (320-322); player vs player is `value + 2 x gap` plus magic hit (323-324).
  - Generic (all other skills): dice count = magic bonus + magic level (+1 for a wizard, -1 otherwise, for player attackers), at least 1 (327-333); chance = sum of that many dice of `dice` sides (334-336); `x leverage / 10` (337); `+ 2 x magic hit` for a player attacker (339-341); `- target MR` (343). Taming Monster: multiplied by 1.1 when the NPC is below 3/4 of max HP, 1.2 below 1/2, 1.3 below 1/4 (345-357).
  - Per-status resist for player targets only (360-385): Earth Bind (sustain), Shock Stun (2 x stun), Curse Paralyze (stone), Fog of Sleeping (sleep), Ice Lance / Freezing Blizzard / Freezing Breath (freeze), Curse Blind / Darkness / Dark Blind (blind).
- Shared damage pipeline (`calcMagicDiceDamage` 659-713, then `calcPcMagicDamage` 416-515, then `calcMrDefense` 738-761 via 396):
  1. dice sum of the skill's damage dice + fixed value (667-670); `+ weapon magic damage` for a player (672-679);
  2. coefficient `max(1 - element resist + charaInt x 3/32, 0)`, where `charaInt = max(INT + gear SP - 12, 1)` (680-688; gear SP is `getSp() - getTrueSp()`);
  3. weak-element NPC `x 1.2` (691-697);
  4. crit `x 1.5` if the skill level is at most 6 and a roll is at most 10 + crit stat (699-704);
  5. `+ original magic damage` stat, `+ 10` with Illusion Avatar (706-710);
  6. `x leverage / 10` (418);
  7. flat reductions: armour (420), dolls (423-426), cooking buffs `-5` from block one and `-5` more from block two (427-454), Reduction Armour `-((level-50)/5 + 1)` with level floor 50 (455-461), Dragon Skin (462-464), Patience `-2` (466-468);
  8. NPC on player: pets and summons `/16` outside war (469-488); Immune To Harm `/2` (489-491); immune target gives 0 (492-494); Counter Mirror gives 0 (496); clamp at 0 (498-500);
  9. magic resist (`calcMrDefense`, 396): for a player attacker (PC_PC or PC_NPC), it uses the target's MR minus the attacker's magic hit: `coefficient = 1 - 0.01 x floor((MR - hit)/2)` when MR is 100 or less (744-750), else `0.6 - 0.01 x floor((MR - hit)/10)` (752); for an NPC attacker (NPC_PC or NPC_NPC), a roll halves the damage when MR is at least the roll (756; the halving is the line after it).
  10. element resist (`calcAttrResistance`, 763-784): for a player target, `int(0.32 x |resist|)` with the sign, divided by 32 (776-782).
- Counter Magic (L1SkillUse 3193-3205): if the target has the effect, the effect is removed and the function returns true (what the caller does with that is not read). One-shot shield.
- PvP and consent (L1SkillUse 3154-3173): a player target is blocked if `checkNonPvP` is true, except the caster itself and clan-mates (3165-3170); otherwise the rule does not block. `checkNonPvP` (L1PcInstance 1173-1186) returns false in a combat zone (1186) and when war rules allow (not read in full).
- Monsters: skill-specific immunity by template flags (L1SkillUse 3177-3187): Turn Undead fails unless the undead type is neither 0 nor 2 and the IsTU flag is set; Erase Magic, Slow, Mana Drain, Mass Slow, Entangle and Wind Shackle fail unless the IsErase flag is set; Mana Drain also fails for any target that is not a monster (the flag is set for every monster). A failure here returns true from `isTargetFailure`.
- Skill data (db/l1jdb_m10.sql 1772-1800, four rows): `probability_value` and `probability_dice` are per skill, and each row also carries cost and timing fields. ShockStun: value 50, dice 0, mpConsume 15, reuseDelay 1500, buffDuration 3 (row 35707). Entangle: value 50, dice 30, mpConsume 20, item 40319 x1, buffDuration 64 (35771). Earth Bind: value 40, dice 30, mpConsume 10, item 40319 x2, buffDuration 16 (35776). Thunder Grab: value 50, dice 0; damage 40 with 5 dice of 8, hpConsume 35, mpConsume 0, buffDuration 2 (35811). The unit of reuseDelay and buffDuration was not checked.
- Special cases the formulas above skip: Cancellation always lands on self, clan and party mates, always lands in NPC cases, and fails in a safety zone in PvP (L1Magic 181-205). Final Burn damage is the attacker's current MP (417, 502-503) and Joy of Pain is missing HP / 5, minimum 5 (507-512), and Joy of Pain skips the MR step (396). Element resist applies to player targets only; an NPC target gets coefficient 1 plus the INT term.

## 2. Key functions

- `L1Magic.calcProbabilityMagic` (171-251): GM bypass, safe zone, Earth Bind block, chance, cap, roll.
- `L1Magic.calcProbability` (264-387): the per-group chance formulas and the per-status resist.
- `L1Magic.calcMagicDiceDamage` (659-713): dice, INT coefficient, weak element, crit, flat magic damage.
- `L1Magic.calcPcMagicDamage` (416-515): leverage and flat reductions for a player target.
- `L1Magic.calcMrDefense` (738-761) and `calcAttrResistance` (763-784): the two resist steps.
- `L1SkillUse.isTargetFailure` (3154-3191) and `isUseCounterMagic` (3193-3205): the gate and the one-shot shield.

## 3. Numbers vs mechanism

| Mechanism | Effect | Formula | Number ranges | Cost | Cooldown / cast time | Caps | file:line |
|---|---|---|---|---|---|---|---|
| Status land roll | spell lands or fails | chance >= rnd, rnd = 1..100 | chance cap 90 | per spell, see rows below (spend code not read) | per cast | 90 | L1Magic.java:214-221 |
| Level-gap status (Earth Bind, Entangle type) | chance from base and gap | value + trunc(dice/10 x trunc(gap/2)) + 2 x hit (player attacker) - resist (player target) | Earth Bind: 40 + 3 x trunc(gap/2) before hit and resist; Entangle: 50 + 3 x trunc(gap/2) | Earth Bind MP 10 + 2 of item 40319; Entangle MP 20 + 1 of item 40319 (data rows) | no reuseDelay; buffDuration 16 and 64 | 90 | L1Magic.java:278-288, 360-363 |
| Shock Stun | stun chance | 50 + 2 x gap + 2 x hit - 2 x stun resist (data row, values as read) | gap of +10 gives 70 before resist | MP 15 (data row) | reuseDelay 1500, buffDuration 3 (units not checked) | 90 | L1Magic.java:289-295, 365-367 |
| Thunder Grab | grab chance | 50 x trunc(attacker / target level) + rand(0..20) | attacker 40 vs target 50 gives 0 + rand (see section 6) | HP 35, MP 0 (data row) | buffDuration 2 | 90 | L1Magic.java:312-318 |
| Generic dice status | chance from magic level | sum of N dice (N = magic bonus + magic level +/- 1, min 1) x leverage/10 + 2 x hit - MR | N and dice from stats (not read) | none | per cast | 90 | L1Magic.java:327-343 |
| MR (target), player attacker | percent of damage kept | 1 - 0.01 x floor((MR - hit)/2) for MR <= 100; 0.6 - 0.01 x floor((MR - hit)/10) above | MR 50 with hit 0: x0.75; MR 100: x0.50; MR 150: x0.45; MR 200: x0.40; MR 300: x0.30 (computed here) | none | per hit | none read | L1Magic.java:738-761 |
| Element resist | element percent | int(0.32 x |r|) / 32, sign kept | r 50 gives 0.50; r 60 gives 0.594; r 100 gives 1.00 (computed here) | none | per hit | none read | L1Magic.java:763-784 |
| INT coefficient | damage scale | 1 - element + max(INT + gear - 12, 1) x 3/32, floor 0 | INT 20 gives +0.75; INT 40 gives +2.625 (computed here) | none | per hit | floor 0 only | L1Magic.java:680-688 |
| Crit | damage x1.5 | skill level <= 6 and roll <= 10 + crit stat | base 10% chance (BASE_CRIT_RATE) | none | per hit | level <= 6 only | L1Magic.java:699-704 |
| Armour and flat cuts | damage minus | armour; cooking -5 and -5; reduction armour -((lvl-50)/5 + 1); patience -2 | reduction armour at level 50: -1; at 100: -5 (computed here) | none | per hit | clamp 0 | L1Magic.java:420-468, 498-500 |
| Counter Magic | blocks one spell | removes the effect on the target and cancels the spell | one use | none | per use | one use | L1SkillUse.java:3194-3195 |
| Immune / safe zone | block | immune target gives 0; safe-zone skill list fails (PvP only) | list of 31 skills | none | per cast | none | L1Magic.java:124-131, 259, 492-494 |

Numbers that suit a fast mobile fight: the 90 cap, the one-roll chance and the MR percent band are good starting points. The INT coefficient (up to x3.6 at INT 40 with no resist) is a scale problem for a fast fight; a Frankendom spell should cap the stat term as data.

## 4. TypeScript sketch

simplified: three functions from the donor, with the donor's order kept for the chance (base, gap, hit, resist, cap, one roll) and the damage pipeline (dice, INT coefficient, element, weak element, crit, flat, leverage). Changes made on purpose: (1) the per-status resist is applied to every status spell (the donor skips Entangle, Wind Shackle, Erase Magic, Elemental Fall Down, Area of Silence, Striker Gale, Pollute Water and Return to Nature); (2) the level gap is halved as a double, not as an integer first (the donor's `levelDifference / 2`); (3) the MR band uses doubles, not integer division; (4) the element resist is r / 100 with no 1/32 quantisation; (5) the crit and flat steps are kept as donor order. It omits the safe-zone list, the Earth Bind block, Counter Mirror, the NPC-on-player halving, the taming revision and the cooking blocks.

```ts
// Licence: GPL-2.0 (donor). clean-room, shape only.
// clean-room

// 1. Status (mind, slow, stun, blind, entangle) land chance, percent, capped at 90, then one roll 1..100.
interface StatusSpell { probValue: number; probDice: number; }
interface StatusTarget { mr: number; resistStatus: number; }   // resistStatus: the per-status resist for this effect

function statusLandChance(sp: StatusSpell, attackerLevel: number, defenderLevel: number,
                          hitBonus: number, t: StatusTarget): number {
  const gap = attackerLevel - defenderLevel;
  let p = sp.probValue + (sp.probDice / 10) * (gap / 2);        // fixed: half-gap as a double (donor: gap / 2 is integer division first)
  p += 2 * hitBonus;                                            // player attackers only in the donor
  p -= t.resistStatus;                                          // fixed: applied to every status spell
  return Math.min(p, 90);                                       // donor cap; note the donor also caps the 100-value spells at 90
}

function landed(chance: number, roll1to100: number): boolean {
  return chance >= roll1to100;                                  // donor: probability >= rnd, rnd in 1..100
}

// 2. Damage pipeline for one spell hit, in donor order (before the magic resist step).
function spellDamage(rolls: number[], value: number, weaponAdd: number, intelligence: number,
                     attrResist: number, weakMul: number, crit: boolean, levelOk: boolean,
                     flat: number, leverageTenths: number): number {
  let d = rolls.reduce((a, b) => a + b, 0) + value + weaponAdd;
  const intAdj = Math.max(intelligence - 12, 1);                // donor floors the INT term at 1 (INT 12 and 13 both give 1)
  const coef = Math.max(1 - attrResist + intAdj * 3 / 32, 0);
  d = Math.trunc(d * coef);
  d = Math.trunc(d * weakMul);                                  // 1.2 on a weak-element NPC (donor, PC to NPC only)
  if (crit && levelOk) d = Math.trunc(d * 1.5);                 // low-level skills only, donor
  d += flat;
  return Math.trunc(d * leverageTenths / 10);
}

// 3. Magic resist: percentage kept, two bands. Fixed: no integer division on the MR terms.
function mrFactor(mr: number, hit: number): number {
  if (mr <= 100) return 1 - 0.01 * Math.floor((mr - hit) / 2);
  return 0.6 - 0.01 * Math.floor((mr - hit) / 10);
}

// Element resist: fixed to r / 100 without the 1/32 quantisation of the donor.
function attrFactor(resist: number): number {
  return resist / 100;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/mg007-l1j-spell-resolve.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/magic_resolve.ts` (new engine module: one roll for status spells, one damage pipeline for all spells, one magic-resist step). Status landing also feeds the CC ladder (Proof 3) and the one-ledger damage step. Parity-checklist row 13 (specials).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine: resolution is server-side, one shared pipeline for all spells); 4 (the fight loop: a status landing is a state change, not a client effect)

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch follows the order and the bands, not the lines.
- Missing resist on several status spells: the group-A branch (278-288) has no `- MR` and no per-status resist, and the switch at 360-385 has no case for Entangle, Wind Shackle, Erase Magic, Elemental Fall Down, Area of Silence, Striker Gale, Pollute Water or Return to Nature. Those spells ignore resist entirely in this donor. Fix: one resist term for every status spell (the sketch does this).
- Integer ratio in Thunder Grab: `_attacker.getLevel() / Math.max(1, defenseLevel)` (313) is integer division. An attacker of 40 against 50 gives 0, so the chance is only the rand(0..20) term; the comment (310-311) gives the formula as probability_value x (attacker level / defender level) + random(0-20); the 40 vs 50 example (50 x 40/50 = 40) is this note's own illustration, not in the donor. Fix: use a double ratio, and test the 40 vs 50 case.
- Cap on "cannot be resisted" spells: Guard Brake, Resist Fear and Horror of Death are set to 100 (308) and then capped at 90 (217-218). The comment says they are not affected by MR; the cap still makes them 90 at most. Decide on purpose: either exempt them from the cap or keep the cap and change the comment.
- Element resist quantisation: `int(0.32 x |r|) / 32` (776, 782) steps in 1/32, and the sign branch `resistFloor *= 1` (777-778) does nothing for positive resists. Fix: use r / 100 as a double (the sketch does).
- Integer division in MR: `(MR - hit) / 2` and `/ 10` are integer divisions (744, 746). Small, but the sketch uses doubles.
- Taming Monster: `_targetNpc` is used at 347-355 without a null check; the path is only correct for NPC targets. Not tested for a player target. Fix: guard it in the engine.
- INT scale: the coefficient reaches about x3.6 at INT 40 with no element resist (686, computed here). A fast mobile fight needs the stat term capped as data, with a per-spell max.
- INT floor: `max(INT + gear - 12, 1)` (681-682) gives the same bonus at INT 12 and 13. Quirk; the sketch keeps it.
- Cooking reductions: block one gives -5 for any of 21 cooking buffs (427-447), block two adds -5 for three more (450-453). Maximum -10 from cooking. Fine as a design; the catalogue should list it as data.
- PvP rule: a player target is blocked by `checkNonPvP` except self and clan (3165-3170). The body of `checkNonPvP` was only partly read (1173-1200), so the exact war and party rules are not confirmed. Frankendom's PvP flag rule (no control of a flagged-off player) should be written as its own rule, not copied.
- Counter Magic is a one-use shield removed on the first hostile spell (3194-3195). It is a clean "block one" effect and maps to a Frankendom buff with a use count.
- Frankendom rulings: the roll is server-side (the client only sends the cast), the damage ledger is the one damage step, and monster immunity flags (IsTU, IsErase) are catalogue data (zones as data).
- Data: the four skill rows give real values; the rest of the table is in the dump and was not read (not in this note).

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one engine, one pipeline); 4 (fight loop: landing is a state change)

## Pattern and data fields

pattern_tags: wait-gate (safe-zone and Earth Bind gates before the roll), clamp-and-report (cap at 90), hit-aggregation (one damage pipeline for all spells), new:one-roll-status-chance (one roll decides a status landing), new:counter-block (one-use block on the target).
Data fields (in the sidecar JSON): status_base, dice_per_gap, cap, per_status_resist, mr_band, element_resist_scale, int_term, crit_base, crit_level_cap, cooking_cut, counter_uses.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Cost column said none for Shock Stun, Earth Bind, Entangle and Thunder Grab although the data rows carry mpConsume (15, 10, 20, 0), hpConsume 35 for Thunder Grab, item costs, reuseDelay and buffDuration (rows 35707, 35776, 35771, 35811). Confirmed.
- The 50 x 40/50 = 40 example is the note's own, not in the donor comment (L1Magic 310-311). Confirmed.
- Missed: Cancellation special case (181-205), Final Burn (417, 502-503) and Joy of Pain (507-512, MR skip at 396) damage rules, element resist player-only. Confirmed.
- Verified OK by checker: licence, calcProbabilityMagic, safe-zone list (31), calcProbability groups, missing-resist defect, Thunder Grab integer division, damage pipeline, MR bands, isTargetFailure, counter magic.
Fixed 2026-10-12: cost and timing from the data rows added to the table and skill-data line, Checked line, Thunder Grab example attributed to the note, special cases added. Sketch unchanged.
