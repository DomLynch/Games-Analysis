# alexbatalov-fallout2-ce (progression, cell 2)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/stat.cc` | Licence: Sustainable Use License 1.0 (LICENSE.md; non-commercial or internal use only, not an open-source licence; restricted) | C++ | symbol `pcAddExperienceWithOptions`

Checked: the hint file `src/skill.cc` was NOT read; the XP and level code is in `stat.cc`. Read in full: `stat.cc` 650-830 (threshold table, `pcAddExperienceWithOptions`, level-up loop, HP grant), `stat_defs.h` 19 (cap). Read: `critter.cc` 917-925 (kill value), `actions.cc` 1730-1800 (per-attack kill XP and payout), `combat.cc` 2854-2885 (`_combat_give_exps`), 4835-4874 (kill XP accumulated during damage), 2800-2822 (end of combat; start of `_combat_over` at 2755 not read), 1945-1960 and 2566-2575 (accumulator declaration and reset), `proto.cc` 500-512 (default value; header at 483). Grep only: `party_member.cc` 1454 (`_partyMemberIncLevels`, not read), `interpreter_extra.cc` 463-469 and `inventory.cc` 4476 (other callers). Confidence: high on the level table and level-up grant; high on the per-attack kill XP path; medium on the accumulated path, which I could not finish reading (see section 6, the possible double credit). Licence read from LICENSE.md: copyright licence for non-commercial/internal use, with notice and patent terms. Clean-room, shape only.

Best transferable idea: pay kill XP once per foe killed by the hero's own attack (sum only foes that were alive before that attack), then level up from a closed-form threshold table, granting a HP bump per level at the moment it is reached.
Decision (proposed): adapt - the closed-form level table and the kill-value award fit a duel and a server ledger; the level-up HP grant and the combat-end accumulator do not fit as written (mid-fight HP change, and a possible second credit for the same kill).
Acceptance: a server test: one foe worth 60 XP killed by the hero's attack, with Swift Learner rank 1, credits 63 XP once (a second foe already dead before the attack adds nothing); the level-up (HP grant) is applied when the fight ends, not mid-fight; XP 999 is level 1 and XP 1000 is level 2.

## 1. Mechanism

- Threshold table: the XP needed to reach a level is closed-form (`pcGetExperienceForLevel`, stat.cc 662-674): for odd L it is 1000 x (L/2) x L, for even L it is 1000 x (L/2) x (L-1), with integer division in L/2. So level 2 needs 1000, level 3 needs 3000, level 4 needs 6000, level 5 needs 10000. At the cap (99, stat_defs.h 19) it returns -1.
- Award (`pcAddExperienceWithOptions`, stat.cc 731-799), in order: (a) new XP = current XP + award (736); (b) add the Swift Learner bonus: rank x 5 x award / 100, integer division (737); (c) clamp to the stat's minimum and maximum (739-745; the values were not read); (d) store the XP (747); (e) while level < 99 and XP >= the threshold for level+1 (749-752), level up: set the level (754), grant HP (771-778), and, if the caller asked for it (a2), level the party members (788-790); (f) report `xpGained = new - old`, which includes the bonus (794-796).
- HP grant per level: `endurance / 2 + 2`, plus 4 per Lifegiver rank (771-772); the max-HP bonus grows by that amount (775), and current HP moves by the same delta (777-778).
- Kill value (`critterGetExp`, critter.cc 920-924): the victim proto's `experience` field. The default in `proto_critter_init` is 60 (proto.cc 508); other monsters' values were not read.
- Kill XP in one attack (`actions.cc` 1730-1797): the code records which targets were already dead (1731, 1738), resolves damage (1741-1743), then for the main target and each extra target: if the hero was the source and the target died in this attack and was not dead before, add its kill value (1748-1763; amounts at 1751 and 1764). Living targets get the hero recorded as the one who last hit them (1754, 1767). At the end, if the source is the hero, `_combat_give_exps(xp)` runs (1795-1796).
- `_combat_give_exps` (combat.cc 2857-2875): ignores zero and hero-dead cases, then calls `pcAddExperience` so the level logic in (a)-(f) runs.
- Second path: during damage application (`_damage_object`, combat.cc 4821), a critter that dies with `whoHitMe` equal to the hero or to a hero-team member adds its kill value to `_combat_exps` (4862-4870). That total is paid out at combat end (combat.cc 2816) and reset at combat start (2572).

## 2. Key functions

- `pcAddExperienceWithOptions`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/stat.cc` 731-799. XP add, Swift Learner, clamp, level loop, HP grant.
- `pcGetExperienceForLevel`: stat.cc 662-674. The closed-form threshold table.
- `critterGetExp`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/critter.cc` 920-925. Kill value from the proto.
- Per-attack XP: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/actions.cc` 1730-1800 (the function that resolves one attack; header not read).
- `_combat_give_exps`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat.cc` 2857-2885 (payout; ignores zero and dead-hero, then `pcAddExperience`).
- `_damage_object`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat.cc` 4821-4874 (accumulator at 4862-4870).
- `_combat_over`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat.cc` 2755 (header); payout at 2816 (read at 2800-2822 only).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Closed-form threshold table: XP to reach level L from L alone | Step 1000 (theirs, stat.cc 670 and 672); odd and even branches |
| Level loop: climb while the total covers the next threshold, stop at the cap | Cap 99 (theirs, stat_defs.h 19) |
| HP per level = base term + rank term, applied to max and current | Base term endurance / 2 + 2 (theirs, stat.cc 771); 4 per Lifegiver rank (theirs, stat.cc 772) |
| Bonus percent on the award, per rank, integer division | 5 percent per Swift Learner rank (theirs, stat.cc 737) |
| Kill value is a per-victim data field, summed over foes killed by this attack | Default 60 (theirs, proto.cc 508); per-monster values not read |
| Pay once: only foes not dead before the attack | Mechanism (actions.cc 1750, 1763) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order that matters: the Swift Learner bonus is added to the award, the total is compared with the next threshold in a loop, and each level grants the HP bump. It omits the message and sound calls, the party-member level-up call (a2), the clamp to the stat's min and max (not read), the separate current-HP clamp in the donor (the sketch just adds; the donor adjusts current HP through `critterAdjustHitPoints`, whose clamping was not read), `pcSetExperience` (which recomputes the level without an HP grant and removes HP on a drop), and the combat-end accumulator (combat.cc 4870 and 2816), which I did not copy because of the possible double credit (section 6). The kill-value sum is written as a pure function over the foes of one attack.

```ts
// Licence: Sustainable Use License 1.0 (donor; restricted, non-commercial). Clean-room sketch written from the described mechanism, not a translation of the donor lines.

const LEVEL_CAP = 99;
const XP_STEP = 1000;

// Total XP at which a hero reaches `level`: level 2 needs 1000, level 3 needs 3000, level 4 needs 6000.
// Returns -1 at the cap, meaning no further level.
function xpForLevel(level: number): number {
  if (level >= LEVEL_CAP) return -1;
  const half = Math.floor(level / 2);
  return level % 2 === 1 ? XP_STEP * half * level : XP_STEP * half * (level - 1);
}

interface Hero {
  level: number;
  xp: number;
  maxHp: number;
  hp: number;
  endurance: number;
  lifegiverRank: number;
  swiftLearnerRank: number;
}

// Kill XP for one attack: foes this attack killed that were alive before it.
interface FoeKill {
  valueXp: number;        // per-foe data value
  wasDeadBefore: boolean;
}

function xpFromAttack(kills: FoeKill[]): number {
  let xp = 0;
  for (const k of kills) {
    if (!k.wasDeadBefore) xp += k.valueXp;
  }
  return xp;
}

// Add XP (Swift Learner adds 5 percent of the award per rank, integer division), then level up while the total covers the next threshold.
// Returns the XP actually gained, including the bonus.
function awardXp(h: Hero, award: number): number {
  const before = h.xp;
  h.xp = before + award + Math.floor((h.swiftLearnerRank * 5 * award) / 100);
  while (h.level < LEVEL_CAP && h.xp >= xpForLevel(h.level + 1)) {
    h.level += 1;
    const hpPerLevel = Math.floor(h.endurance / 2) + 2 + 4 * h.lifegiverRank;
    h.maxHp += hpPerLevel;
    h.hp += hpPerLevel;
  }
  return h.xp - before;
}

// Example: one foe worth 60 XP killed this attack; a second foe was already dead.
const hero: Hero = { level: 1, xp: 0, maxHp: 30, hp: 30, endurance: 5, lifegiverRank: 0, swiftLearnerRank: 1 };
const gained = awardXp(hero, xpFromAttack([
  { valueXp: 60, wasDeadBefore: false },
  { valueXp: 60, wasDeadBefore: true },
])); // 60 + 3 bonus = 63, level 1
awardXp(hero, 1000); // +1050 with bonus: xp 1113, level 2
```

## 5. Lands in

- TARGET `src/fight/level.ts` (new module): hero level, XP total and the level-up HP grant, fed one award per fight from the server ledger. Parity-checklist row 18 (loot roll and XP award). The level-up HP grant is applied at fight end (row 18 sub-line), not mid-fight.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, restricted; clean-room shape only)
- Brief rule served: one ledger (one XP credit per foe killed this attack, summed server-side); kills server-verified; row 18.

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 limits use to non-commercial or internal business purposes and restricts distribution. Treat as clean-room, shape only; do not copy code or the stat text.
- Possible double credit (not run; read only): a kill can be paid twice if the hero's earlier non-lethal hit already set `whoHitMe` (actions.cc 1754). The per-attack path credits it immediately (1751 or 1764, paid at 1796). The damage path adds it to `_combat_exps` at death (combat.cc 4862-4870), paid again at combat end (2816). I did not read whether `_combat_over` or the attack path clears `whoHitMe`, so this is a question for a test, not a fact. Do not port the combat-end accumulator until a test shows one credit per kill.
- Mid-fight level-up: the donor grants HP at the moment of the level-up (stat.cc 771-778), reached through `_combat_give_exps` (combat.cc 2875) from the attack at actions.cc 1796, so the max HP changes while the fight is still running. A max-HP change mid-fight alters the fight in progress. Defer the grant to fight end, in one ledger write.
- Multi-foe kills: with MAX_ATTACKERS = 3, one attack can kill several foes. The sum counts only foes that were alive before the attack (the donor's rule). Keep that rule and test it with three foes.
- Level cap 99 and the threshold step 1000 are Fallout values. For duels, make both zone or progression data with defaults, not constants.
- Swift Learner is a perk multiplier (5 percent per rank). Frankendom has no perks in the duel; keep the bonus as a data field with default 0.
- Not read: `_partyMemberIncLevels` (party_member.cc 1454), the XP min and max descriptors (stat.cc 739-745 read, values not read), `critterGetBaseStatWithTraitModifier` (endurance), `pcSetExperience` in full (802-830, partly read), `skill.cc` (the hint file).

Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, restricted; clean-room shape only)
Brief rule served: one ledger (one XP credit per foe killed this attack); kills server-verified; row 18 (loot roll and XP award).


## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** Threshold formula (stat.cc 662-674), Swift Learner rank*5*xp/100 (737), HP endurance/2+2 + 4/Lifegiver (771-772), cap 99, critterGetExp, per-attack kill XP only for foes not already dead (actions.cc 1731-1796), default experience 60 (proto.cc 508): verified. Small: _combat_exps is also reset after payout in _combat_over (combat.cc 2819), not only at combat start (2572) as stated; pcAddExperience passes a2=true (stat.cc 727) so party levelling is the default, note only says 'if the caller asked'.

**Missed:** level-up also sets DUDE_STATE_LEVEL_UP_AVAILABLE (perk/skill point gate) and plays sound; kill XP path in _damage_object also skips when script overrides (scriptOverrides) and increments kill counts
