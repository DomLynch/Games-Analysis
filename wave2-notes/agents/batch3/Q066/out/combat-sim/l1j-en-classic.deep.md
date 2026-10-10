# l1j-en-classic (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Attack.java` | Licence: GPL-2.0 (COPYING is GNU GPL version 2, "Version 2, June 1991"; the source header says "GPLv2. See license.") | Java | symbol `L1Attack` (`calcHit`, `calcDamage`, `commit`) with `L1PcInstance.receiveDamage` for the receive side

Checked: The hint file `S_UseAttackSkill.java` is only a packet sender (used by `L1Attack.actionNpc` to show the animation); it is the wrong file. The mechanism is in `L1Attack.java`, read end to end for player and NPC melee and bow swings: constructor (268-333), `calcHit` (341-375), PC hit (495-543), NPC hit (624-709), `calcDamage` (733-745), PC base damage (750-856), PC-vs-PC damage (857-922), PC-vs-NPC damage (924-939), NPC-vs-PC damage (943-1037), defence and damage helpers (1073-1240), `commit` (1367-1464), counter barrier (1465-1550), and `L1PcInstance.receiveDamage` (2253-2390). Callers read: `L1PcInstance.onAction` (2148-2185), `L1MonsterInstance.onAction` (249-257), `L1NpcInstance` attack (546-566). Not read: `L1WeaponSkill` (weapon-skill damage), `getDamageReductionByArmor`, `getDmgup`, doll and cooking modifiers, `death()`, `calcNpcNpcDamage` (1040-1072), the NPC `receiveDamage` (`L1MonsterInstance` 282), `calcProbabilityMagic`, the poison and chaser helpers, and the `Config` flags (e.g. `SOFT_AC`, `ELEMENTAL_ENCHANTING`). Confidence: high on the order of operations and the numbers for player and NPC melee and the bow path; medium on the NPC-vs-PC branch only as far as the damage function (the NPC target picker was not read).

Best transferable idea: Resolve each swing as one server roll with a fixed miss band and a fixed hit band, then a stat comparison, then flat armour reduction, and treat zero-or-less after reduction as a miss.

Decision (proposed): adapt - keep the shape (fixed bands on one roll, flat armour soak, zero after reduction is a miss) in `src/fight/hit.ts`, but use Frankendom's own curve and constants; reject the Lineage skill list, the 5-95 percent comment (the code does not do that, see section 6), the wall-clock magic limiter and the bare-hand override.

Acceptance: A server test with a seeded dice source runs 10,000 duel swings per attacker and defender pair and asserts that natural 1 never hits, natural 20 always hits, a swing whose damage is zero or less after reduction records a miss (not a zero-damage hit), and that the same seed replays the same swing list.

## 1. Mechanism

- Shape: one `L1Attack` object per swing. Its order of work is `calcHit()` (decides hit or miss), then `calcDamage()` only inside the hit branch, then `action()` (packets), then `commit()`. `commit()` applies `_damage` only when `_isHit` is true (1367-1370). Callers agree on this order: the monster's `onAction` (249-257), the player's `onAction` (2164-2185) and the NPC swing (546-564) all call `calcDamage` inside `if (attack.calcHit())`. The player's `onAction` runs `action` and `commit` even on a miss (2184-2185).
- Safe zones and non-PvP targets: the player's `onAction` runs `action()` only, with no roll and no damage (2148-2157).
- Counter barrier: the order differs by attacker. For a player swinging at a player target it is checked after a successful `calcHit` and before damage (`L1PcInstance` 2167-2173). For an NPC swing it is checked BEFORE `calcHit` (`L1NpcInstance` 548-556, `calcHit` at 558), so no hit roll is made. If it triggers, the swing returns early and the attacker takes the counter damage instead (`commitCounterBarrier`, 1511-1525). The trigger probability function was not read.
- PC attacker, PC or NPC defender. Preconditions in `calcHit` (341-375): range is the tile distance above weapon range plus one (343-353; range -1 uses the screen); a bow needs an arrow, except Sayha's bow, which has no arrow and instead adds a roll of 1 to 15 (355, 806-807), and a gauntlet needs a sting (357); line of sight must hold (359); some sword blades are disabled (362-364).
- Attack value and the d20 bands: `natural = nextInt(20) + 1`. Attack value = natural + hit value - 10 (PC-vs-PC, 507), plus a skill adjustment: target has UNCANNY_DODGE -5 (478-479), MIRROR_IMAGE -5 (481), RESIST_FEAR +5 (482-483). Bands on the attack value: at or below hit value minus 9 (natural 1 with no adjustment) is a miss (521); at or above hit value plus 10 (natural 20) is a hit (522). Otherwise hit when the attack value is greater than the defender value (529).
- Defender value, PC target: AC 0 or more gives 10 - AC (516). Negative AC gives 11 + a random number below trunc(1.5 x |AC|) (513, 518). So good armour (negative AC) is a random band, not a fixed number.
- Defender value, NPC target: 10 - NPC AC (635), with no random branch.
- After the bands: Kiringku forces 100 (532-533), an immune target gets 0 (536), and a missing buff gets 0 for NPC targets (651-652). Then one d100 roll: `_hitRate >= rnd` (543). Because `_hitRate` is only ever 0 or 100 at that point, the d100 roll always passes or always fails. The only other random test is the bow ER check: hit only if `getEr() < d100` (540-541, 729).
- NPC attacker, PC defender (`getNpcHitRate` 659-682, `calcNpcPcHit` 684-709): hit value = NPC level + hit-up (661). Attack value = nextInt(20) + hit value - 1 (666), so the d20 band runs from hit value to hit value plus 19. Fumble band: at or below hit value (672), so natural 1 misses. Critical band: at or above hit value plus 19 (673), so natural 20 hits. Defender value (670): 10 - AC for AC 0 or more, else 11 + a random number below |AC| (scale 1.0, not the 1.5 used when a PC attacks a PC at 513). Immune target gives 0 (695). Then the d100 roll, after the immune check at 695; the ranged check at 702 comes first. A ranged NPC (get_ranged of 10 or more) at distance 2 or more gets the ER check instead (702-706).
- Damage, PC melee base (`calcPcBaseDamage`, 750-856): weapon roll is 1 to the weapon's large or small maximum, chosen by target size (752, 761). Claw weapons have a double chance to roll the maximum (754-757); bare hands and bows do 0 base (754-760); Soul of Flame sets it to the maximum for non-ranged swings. Then add the weapon's add-damage and enchant (weaponTotal). Material bonus (NPC targets only). Edoryu doubles on a chance (773-776). Element enchant added (1157-1177). Double-brake 33 percent doubles Edoryu and Claw (781-786). Great Sword of Destruction 75 percent sets a drain of max(1, dmg/4 + 1) to the attacker's HP, and that same amount is also added to the weapon damage (788-789, 1239-1242). Then the damage-up stat is added to the stat bonus: `_statusDamage` is the DEX table for bows and the STR table for everything else (323). A bow adds a roll from 1 to the arrow's damage value (797-808; halved against hard-skin targets). A gauntlet adds a roll from 1 to the sting's damage value (809). Fire buffs roll 33 percent (1073-1103): the named fire buff amounts (4, 4, 6, 5) are split off and added back unscaled, while the rest is multiplied by 1.5. Burning Slash adds 10 once. Weapon-skill damage added (`L1WeaponSkill`, not read). Bare hands are overwritten to an integer 1 or 2 (825-827), which also overwrites any weapon-skill damage added above it. Armour and cooking and doll modifiers are added last (not read).
- Damage, PC vs PC (857-922): base with small size, no material bonus, dice dagger allowed (858). Minus target armour reduction (860) and each doll's reduction. Cooking effect checks start at 868; one cooking set subtracts 5 (889) and a second set subtracts 5 more (894). REDUCTION_ARMOR subtracts `(max(level, 50) - 50) / 5 + 1` (902). DRAGON_SKIN subtracts a level-table value (905). PATIENCE subtracts 2 (907-908). IMMUNE_TO_HARM halves (910-911). A prevent-damage list (barrier, ice lance, blizzard, breath, earth bind) sets damage to 0 (914-915). Damage of zero or less makes the swing a miss (917-919). Returns `(int) dmg` (921).
- Damage, PC vs NPC (924-939): base with the NPC template's size and hard-skin flag and the material bonus (929). Minus the NPC template's damage reduction (931). Prevent list gives 0 (933-934). Zero or less is a miss (936).
- Damage, NPC vs PC (943-1037): `nextInt(level) + STR/2 + 1` (946), plus pet extras and the NPC's damage-up (not read), then undead at night times 1.1 (955-956), then times leverage over 10 (959; the leverage field defaults to 10 at 154, so the multiplier is 1.0 by default). Then minus `calcPcDefense()` (960) which is `nextInt(acDefMax + 1)` with `ac = max(0, 10 - AC)` (1107-1109) and `acDefMax` from the class: Knight `ac / 2` (`L1KnightClassFeature.java` 28-30), Wizard `ac / 2`, or `ac / 5` when `Config.SOFT_AC` (`L1WizardClassFeature.java` 29-35). A broken NPC weapon halves the damage (962-963). Then the same armour, doll, cooking, REDUCTION_ARMOR, DRAGON_SKIN, PATIENCE and IMMUNE_TO_HARM terms as above (966-1017). Prevent list gives 0 (1020-1021). Pets are halved when the castle is not at war (1028-1031). Zero or less is a miss (1033-1034).
- There is no separate critical-hit roll in the melee path. The only critical is the natural-20 band on the hit roll.
- Commit: for a player target, drains MP and HP, damages the weapon, then `receiveDamage(attacker, damage, false)` (1420-1437). For an NPC target, drains, then `receiveDamage(attacker, damage)` (1442-1460). The melee path always uses the boolean overload, so the MR-halving overload (`receiveDamage(attacker, int, int)`, 2397-2405) is not on the melee path.
- Receive, PC (2253-2390): sets last-aggressive time; then, only if the call is magic (`isMagicDamage`, called only from `L1Magic` 838/840), a repeated-hit limiter (2268-2312). Then, if damage is above zero: removes invisibility, pink name handling, guards retarget. MORTAL_BODY: 23 percent chance (2340) to hit the attacker back for `max(35, (-AC)/2)` (2345-2348) against a player, or 30 against an NPC (2354). Items 145 or 149 equipped multiply by 1.5 (2369-2370). ILLUSION_AVATAR multiplies by 1.2 (2372-2373). New HP = current minus `(int) damage` (2376), capped at max (2377-2379). At zero or less: GM goes to max HP, others call `death(attacker)` (2380-2384).
- Magic repeat limiter (2268-2312, magic path only): for a magic hit of damage 0 or more, the interval since the last magic hit (`_oldTime`, wall clock `System.currentTimeMillis`, 2269-2270) is read in 100 ms steps. Under 2000 ms, damage is cut by 3 percent per step (`10 / 3` is 3 in Java integer division): 1900-1999 ms is one step (3 percent), 0-99 ms is twenty steps (60 percent). From 2000 ms there is no cut. `_oldTime` is set on every magic hit with damage 0 or more (2319).

## 2. Key functions

- `L1Attack.calcHit`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Attack.java` 341-375. Preconditions, then dispatch to the PC, NPC and NPC-vs-NPC rolls.
- `L1Attack.calcPcPcHit`: same file 495-543. d20 bands, defender value (random for negative AC), then the d100 and bow ER check.
- `L1Attack.getNpcHitRate` and `calcNpcPcHit`: same file 659-709. NPC attack value, bands, immune, d100, ranged ER.
- `L1Attack.calcPcBaseDamage`: same file 750-856. Weapon roll, bonuses, stat table, buffs, fist override, armour modifier.
- `L1Attack.calcPcPcDamage`: same file 857-922. Subtractions in order, prevent list, zero-or-less miss.
- `L1Attack.calcNpcPcDamage`: same file 943-1037. Monster base, defence roll, armour and effect subtractions, castle-war pet halving, zero-or-less miss.
- `L1Attack.calcPcDefense`: same file 1106-1110. Random defence from zero to a class limit.
- `L1Attack.commit`: same file 1367-1370 (hit gate), 1420-1437 (player target), 1442-1460 (NPC target).
- `L1PcInstance.receiveDamage(L1Character, double, boolean)`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1PcInstance.java` 2253-2390. Magic limiter, mortal body, item and buff multipliers, HP clamp, death.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One d20 roll; natural 1 misses and natural 20 hits, otherwise compare attack value with defence value | Band edges at hit value minus 9 and plus 10 for PC (521-522); hit value minus 1 for NPC attacks with bands at hit value and plus 19 (672-673). The donor's own comment says 5 to 95 percent (492-493); the code does not do that (section 6). |
| Armour gives a random defence roll up to a fraction of (10 - AC) | Knight limit `ac / 2`; Wizard `ac / 2` or `ac / 5` with `SOFT_AC` (`L1KnightClassFeature.java` 28-30; `L1WizardClassFeature.java` 29-35) |
| Negative AC is a random band, positive AC is a fixed value | Scale 1.5 for a PC attacking a PC target (513), 1.0 for an NPC attacking a PC target (670); a PC attacking an NPC target has no random branch (635) |
| Flat reduction then zero-or-less is a miss | Subtractions per effect; PREVENT_DAMAGE list sets 0 (914-915) |
| Stat table for damage | STR table built by a static loop (183-215): one step per 2 STR up to 22, per 3 at 23-28, per 2 at 29-32, per 1 at 33-34, per 4 from 35. DEX table (220-251) starts at 1 at DEX 15. |
| Repeat-hit damage falls as the interval shrinks | 100 ms steps, 3 percent each, 2000 ms window, 60 percent floor (2273-2312) |
| Mortal body reflect | 23 percent (2340); reflect `max(35, -AC/2)` (2345-2347) |
| Crit as a fixed band, not a multiplier | Natural 20 is a hit band, no damage multiplier (522, 673) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (natural roll, fixed bands, defence comparison, base roll plus stat bonus, flat reduction, zero-or-less miss). It omits the skill adjustments to the attack value (UNCANNY_DODGE, MIRROR_IMAGE, RESIST_FEAR), so fumble and crit are tested on the natural roll rather than the adjusted value (identical when there is no adjustment). It omits the immunity lists, the bow ER second roll, the NPC-vs-PC monster path (which uses scale 1.0, not the sketch's 1.5, on negative AC; 670), the fire and claw and double-brake and destruction terms (the destruction return value is also added to damage), the bow-needs-arrow and gauntlet-needs-sting gates, the element term, the cooking, doll and armour split (folded into `flatReduction`), the magic repeat limiter, mortal body and the item and buff multipliers. Nothing is reordered except that the sketch returns a miss before the damage roll when the swing misses, which the donor also does through `commit`.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface Dice {
  // uniform integer in [0, n)
  below(n: number): number;
}

export interface Striker {
  hitValue: number;       // skill and gear to-hit, combined into one number
  weaponMax: number;      // weapon roll is 1..weaponMax
  statBonus: number;      // flat damage from the stat table
}

export interface Target {
  ac: number;             // lower is better (negative is good armour)
  flatReduction: number;  // armour and effect reduction, subtracted from raw damage
}

export interface Swing {
  hit: boolean;
  damage: number;
  natural: number;
}

export function resolveSwing(s: Striker, t: Target, dice: Dice): Swing {
  const natural = dice.below(20) + 1;                 // the d20, 1..20
  const attackValue = natural + s.hitValue - 10;
  let hit: boolean;
  if (natural === 1) {
    hit = false;                                      // fixed miss band
  } else if (natural === 20) {
    hit = true;                                       // fixed hit band
  } else {
    const defenceValue = t.ac >= 0
      ? 10 - t.ac
      : 11 + dice.below(Math.trunc(-1.5 * t.ac));     // negative AC: random band
    hit = attackValue > defenceValue;
  }
  if (!hit) return { hit: false, damage: 0, natural };

  const raw = dice.below(s.weaponMax) + 1 + s.statBonus;
  const after = raw - t.flatReduction;
  if (after <= 0) return { hit: false, damage: 0, natural };   // zero after reduction is a miss
  return { hit: true, damage: Math.trunc(after), natural };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hit.ts` (new module, engine swing step): the one place a swing is decided and its damage computed; `resolveSwing` lives here, `damage` (flat reduction, zero-or-less miss) is applied by the same step. Parity-checklist row 1 (duel step / sim).
- today: not checked. This reader did not open the Frankendom repo, so the current location of any combat helper is unknown here.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine: the swing is resolved once, server side); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- The donor's comment (492-493) says the melee hit rate runs from 5 to 95 percent. The code does not do that: the bands set the rate to 0 or 100 (529, 644, 680), and the final d100 then always passes or always fails (543, 656, 708). A Frankendom curve must be written out and tested on its own terms, not copied from the comment.
- Bare-hand damage is overwritten to an integer 1 or 2 (825-827), so fist swings ignore the weapon-skill and stat terms added above that line. Do not copy that.
- Dragon-skin reduction (1622-1636): the last tier check is written `reduction >= 72` (1633), but `reduction` is 3 at that point, so it never fires. As written, levels 72 and 73 get 3. The intended value (4) is inferred from the pattern of the other tiers; the code does not state it. A donor bug; do not copy it.
- The magic repeat limiter uses the wall clock (2269-2270). Frankendom needs tick counts (row 18 server tick), not wall time, or a replay will diverge. Its shape (cut repeats on a fast interval) is worth a test against the duel's burst rules, not a port.
- The donor's RNG is `ThreadLocalRandom` on the server. Frankendom needs a seeded dice source for replay (row 19 fight record), which the sketch takes as a parameter.
- The donor's team, pet and castle-war rules have no place in this sketch; only the band and the flat-reduction shape transfer. Leverage (field at 154, `setLeverage` at 165-167) is a per-attack multiplier and would be a data field, not a constant.
- Frankendom's rulings: MAX_ATTACKERS = 3 is not enforced here (the donor has no attacker cap in this function). Hate lists and target choice are not in this file, so nothing here handles many-on-one. The kill is not server-verified here; `death()` was not read.
- Counter barrier: the counter damage is applied to the attacker by the same damage path, with its own two-handed formula (1531-1535) and immune halving (1539-1540). Not a transfer target for the duel; noted only.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) Counter barrier order wrong for NPC swings: note says checked 'after a successful roll and before damage (... 548-556 for NPC swings)'; in L1NpcInstance the COUNTER_BARRIER test (548-556) runs BEFORE attack.calcHit() (558). Only the player-target path (L1PcInstance 2167-2173) is after calcHit. (2) Table row 'Scale 1.5 for PC targets (513), 1.0 for NPC targets (670)' is mislabelled: line 670 is the NPC ATTACKER vs PC target (scale 1.0, getNpcHitRate); PC-attacks-NPC (635) has no random branch. Mechanism text 'Defender value as for PC (670)' hides that the scale is 1.0 not 1.5. (3) Great Sword of Destruction: calcDestruction (1239-1242) both sets _drainHp AND its return value is ADDED to weaponTotalDamage (788-789); note only says it drains HP. (4) Bow needs arrow except Sayha's bow (355, 806-807, 15-roll) and gauntlet needs a sting (357); not mentioned. Verified OK: d20 bands/fumble/critical (521-522, 636-637, 672-673), negative-AC random band (513, 518), d100 always-pass (543), ER check (540, 729), STR/DEX tables (183-251), damage chain order 750-856, subtractions and numbers in PvP/NvP (889, 894, 902, 907-911, 917-921), NPC damage 946/955-963/1028-1034, fire buff 4/4/6/5 and 1.5x (1073-1103), fist 1-2 (826), commit 1367-1464, receiveDamage mortal body 23%/35/30, 1.5x items 145/149, 1.2x illusion avatar, magic limiter steps, dragon-skin bug (1633), Knight/Wizard ac/2 and ac/5, GPLv2.

**Missed:** calcPcBaseDamage also overwrites damage for Kiringku (828-831) and adds Chainsword foe-slayer +20/40/60 (833-845) after the fist override; not covered (note lists those as unread).
