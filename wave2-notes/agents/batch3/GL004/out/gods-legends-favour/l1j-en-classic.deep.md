# l1j-en-classic (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Karma.java` (with `model/Instance/L1MonsterInstance.java`, `utils/CalcExp.java`, `clientpackets/C_NPCAction.java`, `model/Instance/L1PcInstance.java`, `model/Instance/L1MerchantInstance.java`) | Licence: GPL-2.0-or-later (repo `COPYING` is GPL version 2; `L1Karma.java` header: "either version 2, or (at your option) any later version") | Java | symbol `L1Karma` (karma ladder; `add`, `getLevel`, `getPercent`)

Checked: Read in full: `L1Karma.java` (85 lines). `L1MonsterInstance.java` aggression gate (140-160) and `giveKarma` (572-593). `CalcExp.java` exp award karma and lawful split (515-540). `C_NPCAction.java` NPC branches for the betrayal reset and the karma purchase (1028-1080). `L1PcInstance.java` `addKarma` and `getKarmaLevel` (1029-1036, 1627-1633). Grep of karma callers across `src/l1j/server` (narrow, first 40 hits). Not read: `Config.RATE_KARMA` values; the methods that call `giveKarma` (lines 530 and 558 of `L1MonsterInstance.java`; the enclosing death path was not read); `L1GuardianInstance.java` 312 (grep only); the merchant service bodies in `L1MerchantInstance.java` (grep only); `ExpTable` penalty; persistence in `MySqlCharacterStorage.java` (grep only). Callers: `L1Karma.add` is called through `addKarma`; I read the three award sites and the NPC site, not every caller. Confidence: high on the ladder, level, percent, award and betrayal arithmetic; medium on when kills call `giveKarma` (I did not read the death path). camera_scope: not applicable.

## 1. Mechanism

- Karma is one signed integer per character, clamped to -15500000..15500000 on every write (`L1Karma.set`, L1Karma.java 35-37, with the range at 27). `add` goes through the clamped setter (39-41).
- The level is the sign times the number of thresholds reached, capped at eight steps. Thresholds (KARMA_POINT, 24-25): 10000, 20000, 100000, 500000, 1500000, 3000000, 5000000, 10000000, 15500000. The loop breaks at eight (53-62, cap at 56). `getPercent` gives progress toward the next step as `100 * (karma - lower) / (upper - lower)` (82-83), with integer division.
- Awards from kills (`L1MonsterInstance.giveKarma`, 580-593): the monster's own karma is the award. If the player's karma LEVEL sign is non-zero (level 0, i.e. |karma| < 10000, gets no multiplier) and differs from the monster's karma sign, the award is multiplied by five (589-590). The result is scaled by `Config.RATE_KARMA` and added (592). Zero monster karma returns with no award (583-584).
- Awards from exp (`CalcExp.AddExp`, 517-533): a dead player gets nothing (519-521). The lawful axis changes on its own, scaled by a rate and a second multiplier for chaotic players (523-529). Karma changes by the exp karma value times the karma rate, times five when the award sign matches the player's current karma sign (531-533).
- Aggression gate (`L1MonsterInstance`, 149-150): a monster whose karma is negative skips a player whose karma level is 1 or higher, and a monster whose karma is positive skips a player whose level is -1 or lower. So monsters of one alignment do not pick targets of the other alignment (the target loop continues past these players).
- Purchase reduction (`C_NPCAction`, 1057-1074): an NPC branch takes 1, 10 or 100 of a fixed item and adds -100, -1000 or -10000, each times the karma rate. There is no sign check in these branches.
- Betrayal reset (`C_NPCAction`, 1041-1042, NPC id 80049 by the enclosing branch at 1039): when karma is at or below -10000000, it is set to 1000000 once, and a message is sent.
- Merchant service gates: many merchant branches check the karma level (for example `L1MerchantInstance.java` 914, 936, 960, 984, 1008 and 1233; 1032 is not a karma check); the bodies were not read.
- Tick: none. Awards happen at kill and exp events. There is no decay in the files read.

## 2. Key functions

- `L1Karma.set`, `add`, `getLevel`, `getPercent`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Karma.java` 23-85 (read in full).
- `L1MonsterInstance.giveKarma`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1MonsterInstance.java` 580-593 (read).
- `CalcExp.AddExp`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/utils/CalcExp.java` 517-533 (read to 540).
- NPC karma branches: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/clientpackets/C_NPCAction.java` 1039-1080 (read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Signed alignment value, clamped band, level by threshold ladder capped at eight steps | Range plus or minus 15500000; steps 10000 to 15500000 (theirs, L1Karma.java 24-27, 53-56) |
| Progress toward the next step, integer | Percent of the step (theirs, 82-83) |
| Award by the target's own value, times five when the signs oppose and the player's level sign is non-zero | Factor 5 (theirs, MonsterInstance 589-590); factor 5 for aligned exp award (theirs, CalcExp 533) |
| Scaled award added to the signed value | Karma rate `Config.RATE_KARMA` (theirs, 592, 533, 1058-1074) |
| Aggression skip by sign and level | Level 1 and -1 cut-offs (theirs, MonsterInstance 149-150) |
| Purchase reduces the value by a fixed amount for a fixed item count | 1, 10, 100 items for -100, -1000, -10000 (theirs, C_NPCAction 1057-1074) |
| Reset to a fixed value at a trigger | Trigger -10000000 and reset 1000000 (theirs, C_NPCAction 1041-1042) |

## 4. TypeScript sketch

simplified: the sketch keeps the ladder (clamp, signed level, percent), the award with the opposite-sign factor and a carry, the purchase tiers and the betrayal reset. It omits: the exp-path award and the lawful axis, the aggression gate, the merchant gates, the guardian path, the NPC ids, and the messages. It reorders one step: the purchase moves karma toward zero and never crosses it (a fix, see the defects). The donor's exp-path factor is "aligned" and its monster-path factor is "opposite"; the sketch uses one flag, `oppositeSign`, and states that choice.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Numbers marked "donor" are the donor's values (L1Karma.java 24-27, C_NPCAction.java 1041-1074).

export {};

const KARMA_MAX = 15500000;                                        // donor: KARMA_RANGE
const KARMA_STEPS = [10000, 20000, 100000, 500000, 1500000, 3000000, 5000000, 10000000, 15500000]; // donor: KARMA_POINT
const BETRAY_TRIGGER = -10000000;                                   // donor: C_NPCAction.java 1041
const BETRAY_RESET = 1000000;                                       // donor: C_NPCAction.java 1042

export interface Soul { karma: number; carry: number; }            // carry = fraction of a point owed (fix, see note)

export function clampKarma(v: number): number {
  return Math.max(-KARMA_MAX, Math.min(KARMA_MAX, v));
}

// Signed level: sign of karma times the number of steps reached, capped at 8 (donor getLevel, L1Karma.java 43-68).
export function karmaLevel(k: number): number {
  const mag = Math.abs(k);
  let level = 0;
  for (const step of KARMA_STEPS) {
    if (mag >= step) { level++; if (level >= 8) break; } else break;
  }
  return k < 0 ? -level : level;
}

// Percent toward the next step (donor getPercent). Same single integer division as the donor, written as an explicit floor.
export function karmaPercent(k: number): number {
  const lvl = Math.abs(karmaLevel(k));
  if (lvl === 0) return 0;
  const mag = Math.abs(k);
  const lo = KARMA_STEPS[lvl - 1];
  const hi = KARMA_STEPS[lvl];
  return Math.floor((100 * (mag - lo)) / (hi - lo));
}

// Award from a kill or an exp event. Opposite-sign karma of the monster is worth five times (caller sets oppositeSign false when the player's level is 0), and so is an aligned award
// when the exp path uses it (donor: L1MonsterInstance.java 589-592; CalcExp.java 531-533 aligned x5).
// Fix (donor defect): the rate is applied with a carry, so a fractional rate does not silently drop small awards.
export function awardKarma(soul: Soul, amount: number, rate: number, oppositeSign: boolean): number {
  const scaled = amount * (oppositeSign ? 5 : 1) * rate + soul.carry;
  const whole = Math.trunc(scaled);
  soul.carry = scaled - whole;
  soul.karma = clampKarma(soul.karma + whole);
  return whole;
}

// Purchase of karma reduction (donor: C_NPCAction.java 1057-1074, tiers 1, 10 and 100 items for -100, -1000, -10000).
// Fix (donor defect): the donor has no sign check, so a lawful player can buy their own karma down. Here a purchase moves karma only toward zero.
export function purchaseReduction(soul: Soul, tier: 0 | 1 | 2, items: number, rate: number): boolean {
  const cost = [1, 10, 100][tier];
  const points = [100, 1000, 10000][tier] * rate;
  if (items < cost || soul.karma === 0) return false;
  // Move toward zero and never cross it in one purchase.
  soul.karma = soul.karma > 0 ? Math.max(0, soul.karma - points) : Math.min(0, soul.karma + points);
  return true;
}

// Betrayal reset (donor: C_NPCAction.java 1041-1042): at or below the trigger, karma becomes a fixed value.
export function betray(soul: Soul): boolean {
  if (soul.karma > BETRAY_TRIGGER) return false;
  soul.karma = BETRAY_RESET;
  return true;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 gl004-karma-l1j.ts` on the VPS (copy at /tmp/gl004-karma-l1j.ts): exit 0.

Defects in the donor, each with the fix (the idea is kept):
- D1, fractional rates drop small awards: `(int)(karma * Config.RATE_KARMA)` at MonsterInstance 592, CalcExp 533 and the purchases at C_NPCAction 1058-1074 cast to int after the multiply, so a fractional rate cuts a small award to zero. fix: carry the fraction (`awardKarma`); the purchase path needs the same carry, not shown in the sketch.
- D2, purchase can push a lawful player's karma down: C_NPCAction 1058-1074 add a negative amount with no sign check. fix: move toward zero only and never cross it (`purchaseReduction`). If the design wants a purchase to lower lawful karma, that is a data choice; the donor does not say which.
- D3, the five-times rule has two directions: the monster path tests the monster's sign against the player's level sign (589), the exp path tests the award sign against the player's karma sign (531-532). They are not the same rule. fix: pick one rule and name it in the data (not in the sketch).
- D4, the betrayal reset is a fixed number in an NPC branch (C_NPCAction 1041-1042, NPC id 80049). fix: the trigger and the reset are catalogue data on a patron-switch row.

## 5. Lands in

- TARGET `src/fight/favour.ts` (new module, shared with the Daggerfall and TrinityCore notes): the signed favour value, the level ladder, the award on kill and the purchase tiers as server rows. Aggression by sign and level belongs to the AI brain (parity row 2), not this note.
- Parity-checklist row 18 (loot roll and XP award): the karma award on kill and exp is an award rate. The brief hint for this group is row 13; the mechanism here is an award, so row 18 fits better.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only; sketch written from the mechanism)
- Brief rule served: rules 1-2 (one ledger: the signed value is a row, the server applies every award and purchase); GL focus items 1, 3 (switch as a thresholded reset), 5 (level-gated services), 10 (partly: the exp award is skipped for the dead).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- The karma value is a single signed meter. Frankendom's favour is per god or per realm; a one-meter design is a simpler case of the same ladder, and the per-god rows still need their own ledger rows.
- The kill award uses the monster's karma as the award amount. In Frankendom, the award amount must be a catalogue field on the creature, and the kill must be server-verified before the award (kills are server-verified).
- The betrayal reset is a one-way switch at a threshold. It needs an anti-abuse rule on the server (one switch per cooldown or per reset row), which the donor does not have.
- The purchase tiers spend a fixed item. Frankendom's economy needs the item and count as data rows and the server must consume the item and apply the change in one transaction.
- The aggression gate by karma sign and level (MonsterInstance 149-150) is an AI rule. It fits the AI brain row, not the favour module.
- No decay was found in the files read. A favour that never decays must be set as a design choice in Frankendom, not inherited from the donor.
- Blessings, curses, shapeshifting, summons, oaths, relics, mounts, temples and faction standing were not read in this donor (see the GL table), so most of items 2, 4 and 6 to 14 are not covered.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later). Brief rule served: rules 1-2 and GL focus items 1, 3, 5, 10 (partly).

Best transferable idea: a single signed alignment meter with a fixed threshold ladder, an award that is multiplied when it moves against the player's standing, and a one-way reset at a far threshold that a player can trigger.
Decision (proposed): adapt - the signed ladder, the level and percent readouts and the one-way reset at a threshold fit the favour and patron-switch rows; the donor's two different five-times rules, its unchecked purchase and its int truncation are replaced by one rule, a toward-zero purchase and a carried award (D1 to D3), with the reset as data (D4).
Acceptance: a server test checks that a kill whose award opposes the player's non-zero level sign grants five times the base award, that a purchase tier of 10000 points moves karma from 5000 toward zero without crossing it, and that a player at -10000000 or below is reset to 1000000 once and not again within the cooldown row; the level readout matches the ladder at each step.

GL table (gods-legends-favour; "not read" where I opened no code for the item):

| # | name | effect | formula | number ranges | gain/loss events | decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | Favour (karma) | signed alignment meter per character, level readout and percent to next step | clamp(k + d, -15500000, 15500000); level = sign times steps reached, cap 8 | plus or minus 15500000; steps 10000..15500000 | kill award (monster karma, times 5 on opposing sign when the player's level sign is non-zero, times rate); exp award (times 5 when aligned); purchases of -100, -1000, -10000 | none found in files read | L1Karma.java 24-27, 35-41, 53-62, 82-83; MonsterInstance 580-593; CalcExp 531-533; C_NPCAction 1057-1074 |
| 2 | Blessings and curses | not read in this donor | n/a | n/a | n/a | n/a | not read |
| 3 | Patron choice and switching | one-way reset: at or below -10000000 karma becomes 1000000, once per trigger in the branch; no god-anger or apostasy cost found in the branch | trigger and reset as constants | trigger -10000000; reset 1000000 | the NPC action | none | C_NPCAction.java 1039-1044 |
| 4 | Divine domains as tags | not read; alignment is a single sign axis; no domain tags seen in the files read | n/a | n/a | n/a | n/a | not read |
| 5 | Boons at thresholds | karma level gates many merchant services (checks at 914, 936, 960, 984, 1008, 1233; 914-1284 in grep); level gates aggression by sign (MonsterInstance 149-150) | level >= 1, level <= -1, level == n | level -8..8 | level change | none | MerchantInstance (grep only); MonsterInstance 149-150 |
| 6 | Legend signature powers | not read | n/a | n/a | n/a | n/a | not read |
| 7 | Shapeshifting | not read in this donor | n/a | n/a | n/a | n/a | not read |
| 8 | Avatars and summons | not read in this donor | n/a | n/a | n/a | n/a | not read |
| 9 | Fate, luck, oaths | not read | n/a | n/a | n/a | n/a | not read |
| 10 | Underworld and death rules | exp award skipped while dead; the death path that calls giveKarma was not read | dead player: return | n/a | exp event while dead blocked | n/a | CalcExp.java 519-521; MonsterInstance 530, 558 (callers not read) |
| 11 | Divine mounts | not read | n/a | n/a | n/a | n/a | not read |
| 12 | Relics and artifacts | not read | n/a | n/a | n/a | n/a | not read |
| 13 | Temples and shrines | not read | n/a | n/a | n/a | n/a | not read |
| 14 | Pantheon factions and realm pride | alignment is a two-axis value: karma (signed meter) and lawful (separate, changed by exp with a chaotic multiplier); no faction standing read | lawful: add = -(lawful * RATE_LA), times RATE_CHAO_LA when lawful is below zero | rates from config (not read) | exp event | none found | CalcExp.java 523-529 |

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
MINOR. Ladder, clamp, getPercent, CalcExp 517-533, aggression gate 149-150, 80049 betrayal 1041-1042, purchases 1057-1074, GPL2+ header and the three int-cast defects verified.
- Kill-award rule misstated: x5 needs pcKarmaLevelSign != 0 as well (L1MonsterInstance 589-590); level-0 players get no multiplier.
- 'L1MerchantInstance 1032' is not a karma check (real: 914, 936, 960, 984, 1008; 1233 for 80065).
- Missed: giveKarma goes only to the player passed from the kill path (L1MonsterInstance 530 and 558, last attacker), not every damage dealer; in the exp path signum(0)==signum(0) counts karma 0 vs player karma 0 as aligned (x5 on a zero award, harmless).

Fixed 2026-10-12: kill-award rule, merchant line numbers (text, parity table, mapping row) and the acceptance sentence corrected; sketch code unchanged (only a comment), so no typecheck run.
