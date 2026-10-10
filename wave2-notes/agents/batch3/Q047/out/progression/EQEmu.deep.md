# EQEmu (progression, cell 10)

Donor: `/mnt/frankendom-donors/EQEmu/zone/exp.cpp` (with `/mnt/frankendom-donors/EQEmu/zone/attack.cpp`, `/mnt/frankendom-donors/EQEmu/zone/hate_list.cpp`, `/mnt/frankendom-donors/EQEmu/common/features.h`) | Licence: GPL-3.0 (`/mnt/frankendom-donors/EQEmu/LICENSE.md`: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; per-file headers not read) | C++ (plus a Lua mod demo) | symbol `Group::SplitExp`

Checked: `Group::SplitExp` is defined at 1121 and closes at 1183 (read in full). `Client::GetExperienceForKill` 188-214 read in full; `EXP_FORMULA` read (`common/features.h` 222). `Client::GetEXPForLevel` 1001-1087 read in full. `Client::CalculateExp` 402-493 read in full. `Client::AddEXP` 495-570 read in full. `Client::SetEXP` read at 572-600, 613-640, 655-730 and 776-850 (the AA branch 730-776 and the death-loss message branch 640-655 not read; they do not change the level curve). `NPC::Death` read at 2470-2760 in full: the prologue 2470-2548 (a death returns early at 2492-2498 when `parse->EventBotMercNPC(EVENT_DEATH, ...)` returns non-zero, and at 2500-2504 for a zone-resume guard; the event dispatcher itself was not read), and 2556-2760 (buff fade, death packet, then the recipient and routing; no change to the killer in 2556-2588). `HateList::GetDamageTopOnHateList` 107-151 read; `GetHateDamageTop` read as the one-line wrapper in `zone/mob.h` 773. The Lua mod demo `utils/mods/classic_wow_experience.lua` read in full (159 lines). The file the cell hinted at is a Lua demo, so it is not the real implementation; the real one is `zone/exp.cpp`. Callers by grep: `Group::SplitExp` from `zone/attack.cpp` 2716 (grouped kill) and `zone/client.cpp` 5699 (LDoN chest, where the amount is `level*level*2625/10`); `Client::GetExperienceForKill` from `zone/attack.cpp` 2667. Not read: `Raid::SplitExp` (`zone/exp.cpp` 1185-1235), `GetHighestLevel()`, `GroupCount()`, `Mob::GetLevelCon` (`zone/mob_ai.cpp` 2156, signature only), and the rule defaults for `GroupMemberEXPModifier`, `FullGroupEXPModifier`, `GroupExpMultiplier`, `ExperiencePercentCapPerKill`, `HotZoneBonus` and `XPRate`. Camera scope: not a camera cell. Confidence: high for the group split and the kill formula (read end to end); medium for the recipient rule (the search is read, the wrapper is read, the 2556-2588 lines are not read).

Best transferable idea: Split a group kill's pool equally over the whole group, skip any member more than max(5, level/2) levels below the highest member, and cap each member's payout at a per-level formula, so a low-level member cannot take a large share of a high-level kill.
Decision (proposed): adapt - Frankendom's many-on-one fights need a level-gap gate and a per-member cap; we take both as data fields, and we do not take the donor's silent loss of an excluded member's share, which breaks the one-ledger rule unless Frankendom shows it in the fight record.
Acceptance: A server test asserts that a grouped kill by three players pays each member no more than (level + 3)^2 x 262.5, that a member more than max(5, level/2) levels below the highest member is paid nothing, and that a grey kill pays nobody.

## 1. Mechanism

- Recipient first (`NPC::Death`, `attack.cpp` 2470-2760). Before any XP, the death can end early: when `parse->EventBotMercNPC(EVENT_DEATH, ...)` returns non-zero the function returns `false` (2492-2498), and a resumed-from-zone-suspend NPC is set to zero HP and returns `false` (2500-2504). Neither path reaches the XP code. The killer is `GetHateDamageTop(this)`, computed at 2549, which is the same top-damage search as `HateList::GetDamageTopOnHateList` (`hate_list.cpp` 107-151). That search adds up damage per raid or group when the hitter is in one (135, 140), and otherwise uses the hitter's own `hatelist_damage` (144). The killing blow's damage is added to the hate list only later (2609), so it does not count toward who is credited. Then `give_exp = killer` (2615). A pet or summon is moved to its owner only if that owner is in the same group or raid (2618-2638).
- Pool (`Client::GetExperienceForKill`, `exp.cpp` 188-214). When the donor is built with `LUA_EQEMU`, a Lua hook can replace this first (190-198). Otherwise the pool is `EXP_FORMULA`, which is `level * level * 75 * 35 / 10` (`features.h` 222; about level^2 x 262.5, integer division), with the NPC's level. If the NPC's kill-exp modifier is 0 or more, the pool is multiplied by it and divided by 100 (204-208). The recipient's client calls this (`attack.cpp` 2667).
- Routing (`attack.cpp` 2679-2753). A raid goes to `Raid::SplitExp` (2681). A grouped client goes to `Group::SplitExp` with that pool (2714-2716). A solo client gets `AddEXP` with the con colour of the NPC against it (2749, 2753), unless the NPC is grey or has a client-bot owner (2750-2752).
- Group split (`Group::SplitExp`, `exp.cpp` 1121-1183), in this order:
  1. Merchants (1122-1124) and client-owned pets (1126-1128) pay nothing.
  2. `member_count = GroupCount()` (1130). The pool starts as the kill pool (1135). `highest_level` comes from `GetHighestLevel()` (1136; the body was not read, and the name suggests the highest member's level, which the sketch assumes).
  3. Group-size modifier, for 2 to 5 members: `1 + GroupMemberEXPModifier * (n - 1)` (1140-1141). For 6 members: `FullGroupEXPModifier` (1142-1143). For 1 member or 7 or more: 1.0.
  4. For 2 to 6 members the pool grows: `group_experience += exp * group_modifier * GroupExpMultiplier` (1147-1153; the multiplier term is used only when the rule is enabled, 1148-1158).
  5. Grey gate (1162-1165): the NPC's con against the highest member is computed (`Mob::GetLevelCon`, not read). If it is grey, the function returns and nobody is paid.
  6. For each member that is a client (1167-1182): `diff = member level - highest_level` (1169). The allowance is `max_diff = -(member*15/10 - member)` (1170), with a floor of 5 in magnitude (1172-1174). Since `floor(1.5m) - m` equals `floor(m/2)` for whole levels, the allowance is max(5, floor(m/2)) levels below the highest member. The member is eligible only if `diff >= max_diff` (1176).
  7. An eligible member gets `min(cap, share)` (1177-1179). `share = group_experience / member_count` (1178), with `member_count` counting all group members, so an ineligible member's share is not handed to anyone. `cap = (m + 3)^2 * 75 * 35 / 10` (1177), the kill formula for a level m+3 NPC. The award is passed to `AddEXP` (1179), which runs `CalculateExp` (`exp.cpp` 402-493): XP rate percent (406-409), AA share (417-420), the rule `ExpMultiplier` and hot-zone bonus added to the total modifier (424-450), zone multiplier (431-432), con scaling when the rule is on (455-460), per-level zone modifier (467-471), `FinalExpMultiplier` (473-475), character modifiers (477-479), then the per-kill percent cap (481-490). If the gain as a share of the current level's span is over the cap rule, the gain is set to `floor(span * cap / 100)` (486-488) and the function returns. Otherwise the new total is `GetEXP() + add_exp` (492).
- Level curve (`Client::GetEXPForLevel`, 1001-1087). The XP needed to be at level L is `(L-1)^3 * mod * 1000`, where `mod` depends on the target level L (1015-1050): 1.0 below 31; 1.1 for 31-35; 1.2 for 36-40; 1.3 for 41-45; 1.4 for 46-51; 1.5 at 52; 1.6 at 53; 1.7 at 54; 1.9 at 55; 2.1 at 56; 2.3 at 57; 2.5 at 58; 2.7 at 59; 3.0 at 60; 3.1 from 61 (1015-1044). The value is a total, not a step, and race and class penalties apply only when their rules are on (1052-1084).
- Level derivation (`Client::SetEXP`, 693-717). The character's total XP is `set_exp`. It climbs while `set_exp >= GetEXPForLevel(check_level)` (693-704, capped at 127, 695-697). It falls while `set_exp < GetEXPForLevel(check_level-1)` (706-716, floor 2, 708-710). At the max level (rule `MaxExpLevel` plus one, 781), the XP is clamped to the max level's threshold (832-836). The result is committed as one number, `m_pp.exp = set_exp` (848).

## 2. Key functions

- `Group::SplitExp`: `/mnt/frankendom-donors/EQEmu/zone/exp.cpp` 1121-1183. The group split.
- `Client::GetEXPForLevel`: `/mnt/frankendom-donors/EQEmu/zone/exp.cpp` 1001-1087. The closed-form level thresholds.
- `Client::CalculateExp`: `/mnt/frankendom-donors/EQEmu/zone/exp.cpp` 402-493. All the per-payout modifiers and the per-kill cap.
- `Client::GetExperienceForKill`: `/mnt/frankendom-donors/EQEmu/zone/exp.cpp` 188-214. The kill pool.
- `NPC::Death` routing: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` 2549-2615 (recipient), 2667-2753 (routing).
- `HateList::GetDamageTopOnHateList`: `/mnt/frankendom-donors/EQEmu/zone/hate_list.cpp` 107-151.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Kill pool: level squared times a fixed rate | `75 * 35 / 10` = 262.5 per level squared (theirs, `common/features.h` 222); NPC kill-exp percent (theirs, `exp.cpp` 204-208) |
| Group pool: a size bonus for 2 to 5 members, a separate value at 6, pool bonus only for 2 to 6 | Rules `GroupMemberEXPModifier`, `FullGroupEXPModifier`, `GroupExpMultiplier` (theirs, `exp.cpp` 1141, 1143, 1152; values not read) |
| Level-gap allowance: members far below the highest member get nothing | Floor of 5 levels (theirs, 1172); half the member's level, from `floor(1.5m) - m` (theirs, 1170) |
| Per-member cap: the kill formula for a level three higher | Offset 3 (theirs, 1177) |
| Equal share over the whole group | None (the division, theirs 1178) |
| Level thresholds: cubic, with band multipliers | `(L-1)^3 * 1000` (theirs, 1046-1050); bands 1.0 to 3.1 (theirs, 1015-1044) |
| Per-kill cap as a percent of the current level's span | Rule `ExperiencePercentCapPerKill` (theirs, 482; value not read) |
| Zone and level multipliers on each payout | Zone `zone_exp_multiplier` (theirs, 431-432); per-level `ExpMod` (467-469); hot-zone bonus additive (449; value not read) |
| Grey kills pay nobody | None (theirs, 1162-1164) |

Numbers computed by hand from the donor formula (not from a run): the threshold for level 30 is 29^3 x 1.0 x 1000 = 24,389,000 and for level 31 it is 30^3 x 1.1 x 1000 = 29,700,000. The step into level 31 is 5,311,000, against 2,437,000 for the step into level 30, so each band edge makes the next level about 2.2 times harder.

Lua demo (`utils/mods/classic_wow_experience.lua`, not the real implementation): `BaseXP(L) = 5L` plus 45 below level 60, 235 for levels 60-69, 580 for 70-79, and 1875 from 80 (lines 34-44). It scales by a level gap of 0.05 per level, capped at 1.0 (lines 14-24): a mob 20 levels above the killer pays double, a mob 20 below pays nothing. It also replaces `GetEXPForLevel` with a hand-typed table for levels 1 to 91 and sets `IgnoreDefault` (lines 49-157). This shows the donor's override path, not a balanced curve.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for a group kill: grey and empty checks first, then the group pool with its size modifier, then the per-member level-gap gate, then the equal share capped by the member's per-level cap. It takes the rule values as inputs (the donor reads them from rules, and their defaults were not read). It omits the rule toggles (`EnableGroupMemberEXPModifier`, `EnableGroupEXPModifier`), the pet-owner redirect, the raid branch, the solo branch, and the per-member `AddEXP` path (XP rate, AA split, zone and level multipliers, the per-kill percent cap). It also omits the `SetEXP` level loops. The threshold function uses doubles, while the donor uses 32-bit floats for the band multiplier, so very large levels can differ in the last digit.

```ts
// Licence: GPL-3.0 (donor, LICENSE.md). Clean-room sketch written from the described mechanism, not a translation.
// clean-room
export interface Member { id: string; level: number; }
export interface Award { id: string; exp: number; }
export interface GroupRules { memberStep: number; fullGroupMod: number; poolMultiplier: number; }

// Kill pool before the group step. Donor EXP_FORMULA = level^2 * 75 * 35 / 10 (about level^2 * 262.5).
export function killPool(npcLevel: number, killExpModPct: number | null): number {
  let ret = Math.floor(npcLevel * npcLevel * 2625 / 10);
  if (killExpModPct !== null && killExpModPct >= 0) ret = Math.floor(ret * killExpModPct / 100);
  return ret;
}

// Donor GetEXPForLevel: total XP at which a character is `level`. Closed form, not a sum of steps.
export function levelThreshold(level: number): number {
  const bands: Array<[number, number]> = [
    [31, 1.0], [36, 1.1], [41, 1.2], [46, 1.3], [52, 1.4], [53, 1.5], [54, 1.6],
    [55, 1.7], [56, 1.9], [57, 2.1], [58, 2.3], [59, 2.5], [60, 2.7], [61, 3.0],
  ];
  let mod = 3.1;
  for (const [limit, m] of bands) {
    if (level < limit) { mod = m; break; }
  }
  if (level <= 1) return 0;
  return Math.floor(Math.pow(level - 1, 3) * mod * 1000);
}

// One group kill. Grey kills (below the highest member's con) give the group nothing.
export function splitGroupKill(exp: number, members: Member[], grayCon: boolean, rules: GroupRules): Award[] {
  const n = members.length;
  if (n === 0 || grayCon) return [];
  let groupModifier = 1.0;
  if (n >= 2 && n <= 5) groupModifier = 1 + rules.memberStep * (n - 1);
  else if (n === 6) groupModifier = rules.fullGroupMod;
  let pool = exp;
  if (n >= 2 && n <= 6) pool += Math.floor(exp * groupModifier * rules.poolMultiplier);
  const highest = Math.max(...members.map(m => m.level));
  const share = Math.floor(pool / n);            // equal share over ALL members, eligible or not
  const out: Award[] = [];
  for (const m of members) {
    const diff = m.level - highest;
    const maxDiff = -Math.max(5, Math.floor(m.level * 15 / 10) - m.level); // level-gap allowance
    if (diff < maxDiff) continue;                // too far below the highest member: no share
    const cap = Math.floor((m.level + 3) ** 2 * 2625 / 10);  // per-member cap, level plus three
    out.push({ id: m.id, exp: Math.min(cap, share) });
  }
  return out;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/xp.ts`: the kill pool, the level thresholds and the group split, applied once per verified kill on the server. Parity-checklist row 18 (loot roll and XP award).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only; the sketch is written from the mechanism and was not translated line by line)
- Brief rule served: one engine (the split and the thresholds are engine logic, and the Lua override path is not copied); zones as data (zone multipliers and the hot-zone bonus become zone fields); server-verified kills (the recipient is chosen where the kill is verified).

## 6. Gaps and risks

- GPL-3.0: clean-room only. Constants and shape are cited; no code is carried over.
- Lost share: the equal share is divided by the whole group count (1130, 1178), so a member excluded by the level-gap gate loses its share instead of it going to the eligible members or being shown. Frankendom must choose and test one rule, and the fight record should say which one was used.
- Script override of death: a quest or plugin hook on `EVENT_DEATH` can end the death before any XP is paid (2492-2498). Frankendom's server-verified kill rule needs one place where a kill is final; a hook that can cancel it must be tested.
- Recipient rule: the group that gets the split is the group of the top-damage representative (2549-2615; `hate_list.cpp` 135-144), so one member's standing decides the whole group's XP. The killing blow is not counted toward that choice (2549 is before 2609). Frankendom must decide whether the final blow counts, and test it with MAX_ATTACKERS = 3.
- Per-payout modifiers: the zone multiplier, hot-zone bonus, per-level modifier and the per-kill cap run once for each member (`CalculateExp`), so one kill can pay different amounts to members. Frankendom needs one computation per member, recorded in one ledger entry.
- Level thresholds jump at the band edges (the step into level 31 is about 2.2 times the step into level 30, computed above). That is a design choice in the donor. Frankendom should keep the curve as zone-independent data with the band table written out, not as a formula with magic numbers.
- Floating-point: the donor's band multipliers and `base * mod` use 32-bit floats; the sketch uses doubles. Thresholds should be integer data in Frankendom, so the award is deterministic on the server.
- Level derivation is a loop that can also lower the level (706-716). The addendum's rulings do not list a death XP loss; if one is added, it must go through the same threshold function and be tested both ways.
- Not read: `Raid::SplitExp`, `GroupCount`, `GetHighestLevel`, `Mob::GetLevelCon`, the rule defaults, the `EventBotMercNPC` dispatcher (so what a script can return is unknown), and the `SetEXP` AA and death-loss branches. Any number in section 3 that depends on a rule default is the donor's shape only; do not copy it as tuning.
