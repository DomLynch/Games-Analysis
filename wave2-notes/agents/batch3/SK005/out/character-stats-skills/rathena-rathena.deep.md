# rathena-rathena (character-stats-skills, cell 3)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/status.cpp` | Licence: GPL-3.0 (the box's LICENSE file is GNU GPL v3; db/re/statpoint.yml and db/re/job_stats.yml headers say "version 3 of the License, or (at your option) any later version"; the status.cpp header says only "Licensed under GNU GPL") | C++ (with YAML data) | symbol `status_calc_misc`, `status_calc_maxhp_pc`, `status_calc_maxsp_pc`, `status_calc_pc_sub`, `pc_need_status_point`, `PlayerStatPointDatabase::pc_gets_status_point`

Checked: Read in full: `status_calc_misc` (status.cpp 2600-2720, both the renewal and pre-renewal branches, the "#else" at 2700 and "#endif" at 2720); `status_calc_maxhp_pc` and `status_calc_maxsp_pc` (3511-3610); `status_calc_weight` (3653-3700, the max-weight block); `status_base_amotion_pc` (2355-2414, pre-renewal branch and the start of the renewal ASPD branch); `status_calc_critical` start and `status_calc_flee2` start (7504-7516, 7724-7736); the luck deltas in the status-change apply block (6128-6160); the PC pipeline entry and its order up to the misc call (3754-3800, 4330-4410); pc.cpp status-point code (8755-8763, 8794-8830, 8840-8860, 8894-8905, 9358); the overweight state update (pc.cpp 3026-3045); job-stat parsing for BonusStats and the prefix sum (pc.cpp 14115-14175, 14314-14334); the job_stats.yml header and the first BonusStats rows; statpoint.yml header and four level rows. Not read: the BaseHp value table and the non-table HP formula (only the HP_SP_TABLES parse is read, pc.cpp 14142-14170); the rate multipliers at status.cpp 4413-4446 (seen by grep only); the body of `status_calc_critical` and `status_calc_flee2` after their first few status-change checks; the renewal ASPD bonus body (2370-2398 read partly); the regeneration effect of the overweight state (only the flag is set, pc.cpp 3044-3045); STR's melee ATK (`status_base_atk`, 2424). Searched: no crowd-control ladder and no stamina or fatigue economy in the files read; I did not search the whole tree for them. Confidence: high on the hit, flee, crit, flee2, max HP and SP formulas and on the stat point cost (all read); medium on the order of the rate multipliers (grep only). Three separate compile switches select the formula variants (RENEWAL for derived stats, RENEWAL_STAT for stat point cost, RENEWAL_ASPD for ASPD); the build defaults were not read, so the notes below give both variants.

## 1. Mechanism

- Attributes are stored on the character (str, agi, vit, int, dex, luk; the renewal build adds pow, sta, wis, spl, con, crt). `status_calc_pc_sub` (status.cpp 3754) builds the PC's status in order: it resets the rates to 100 (from 3783), adds skill-based bonuses to base stats (e.g. `base_status->con += skill;` at 4330), computes weapon attack (renewal: `status_weapon_atk`), max HP and max SP (through the two job tables), AP, respawn values, and then calls `status_calc_misc(sd, base_status, base_level)` at 4405. The rate multipliers (hit_rate, flee_rate, critical_rate, flee2_rate) are applied after that call (4413-4446; grep-seen).
- `status_calc_misc` (2600) does not reset a PC's derived fields (2604 comment: "players need to stack with previous bonuses"). It adds the level and attribute terms onto whatever bonus is already there, then caps each field into `1 .. SHRT_MAX` (hit, flee) or `0 .. SHRT_MAX` (def2, mdef2, patk, smatk, res, mres).
- Renewal branch (2617-2699): hit = bonus + level + dex + luk/3 + 175 + 2 con (2641-2643); flee = bonus + level + agi + luk/5 + 100 + 2 con (2646-2648); def2 = bonus + (level + vit)/2 + agi/5 (2654); patk = bonus + pow/3 + con/5 (2667); smatk = bonus + spl/3 + con/5 (2671); res = bonus + sta + (sta/3)*5 (2675); mres = bonus + wis + (wis/3)*5 (2679); hplus = bonus + crt (2683); crate = bonus + crt/3 (2687).
- Pre-renewal branch (2700-2720): hit = bonus + level + dex (2706); flee = bonus + level + agi (2710); def2 = bonus + vit (2714).
- Luck in the status-change apply block (6128-6160): when luk differs from the base luk, crit is recomputed as base crit + 3 x (luk - base luk) in renewal, or + (luk - base luk) x 10/3 (C integer division) in pre-renewal (6141, 6143); flee2 is base flee2 + (luk - base luk) (6157). So luck only moves crit and perfect dodge by its change from the base value. `status_calc_critical` then returns at least 10 when there are no status changes (7506-7507). A Katar weapon doubles crit (6146-6149, read).
- Max HP (3511-3561): job base HP for the level, times (1 + vit/100) when vit > 0 (3521-3524), times 1.25 for upper and fourth classes, times 3 for the taekwon ranker class; then + the equipment VIT points one each (3534), then flat and percent bonuses, then the rate bonus. Max SP (3562-3610) is the same shape with the job base SP and int (3572-3575).
- Attack motion (ASPD). Pre-renewal (2405-2413): base delay from the job table (dual wield: (w1 + w2) x 7/10), then `amotion -= amotion * (4 * agi + dex) / 1000` (2410, integer), then + bonus aspd_add. Renewal (2359-2399): `temp = dex^2/5 + agi^2 x 0.5` for most weapons (2384), `sqrt(temp) x 0.25 + 196` (2387), then an agi-scaled term from status_calc_aspd and skill values, minus min(job base ASPD, 200) (2398).
- Stat points. Each level grants total points from `db/re/statpoint.yml` (pc.cpp 9358 sets the total for the level at load; `pc_gets_status_point` returns the difference between two levels, 8755-8757). Raising a stat by one point costs `PC_STATUS_POINT_COST(low)` (8798-8803): renewal `2 + (low-1)/10` below 100 and `16 + 4 x ((low-100)/5)` at 100 and up; pre-renewal `1 + (low+9)/10`. `pc_need_status_point` sums the cost of each point from the current value up to the target (8809-8828).
- Job stat bonuses. `BonusStats` in job_stats.yml lists per-job-level increments (for example level 5 Agi +1, level 6 Vit +1, level 8 Str +1, level 9 Int +1 in one job group at lines 95-102). At load they are turned into running totals (pc.cpp 14321-14330): each job level stores the sum of all bonuses up to that level, so the lookup is one array read.
- Carry weight (status.cpp 3663 and 3678 on): max weight = job MaxWeight + STR x 300, plus MC_INCCARRY and ALL_INCCARRY at 2000 per skill level, plus riding (10000), dragon (5000 + 2000 x skill), the knowledge percent and mado gear (15000). Overweight is two states: SC_WEIGHT50 at `natural_heal_weight_rate` and SC_WEIGHT90 at `major_overweight_rate` (pc.cpp 3028-3030, the thresholds are config values not read). The state sets `regen.state.overweight` (pc.cpp 3044-3045); what that does to regen was not read.

## 2. Key functions

- `status_calc_misc`: `/mnt/frankendom-donors/rathena-rathena/src/map/status.cpp` 2600-2720. Every derived combat value for a PC; the first `#ifdef RENEWAL` at 2617 splits the two builds.
- `status_calc_maxhp_pc` / `status_calc_maxsp_pc`: `/mnt/frankendom-donors/rathena-rathena/src/map/status.cpp` 3511-3561 and 3562-3610.
- `status_calc_pc_sub`: `/mnt/frankendom-donors/rathena-rathena/src/map/status.cpp` 3754 (entry; order read to 4410).
- Luck deltas: `/mnt/frankendom-donors/rathena-rathena/src/map/status.cpp` 6128-6160 (inside the status-change apply, `SCB_CRI` and `SCB_FLEE2` flags).
- `status_base_amotion_pc`: `/mnt/frankendom-donors/rathena-rathena/src/map/status.cpp` 2355-2414.
- `pc_need_status_point` and `pc_gets_status_point`: `/mnt/frankendom-donors/rathena-rathena/src/map/pc.cpp` 8755-8828.
- Overweight state: `/mnt/frankendom-donors/rathena-rathena/src/map/pc.cpp` 3026-3046.

## 3. Numbers vs mechanism

The table is the catalogue view (SK focus): name | what it does | formula | number ranges | caps | file:line. Donor numbers are given as read; data-file values are marked. Renewal (R) and pre-renewal (P) rows say which build.

| Name | What it does | Formula | Number ranges | Caps | file:line |
|---|---|---|---|---|---|
| STR (carry) | Carry capacity | max weight = job MaxWeight + STR x 300 | job MaxWeight 28000 for the swordman line (job_stats.yml:107); default 20000 per header | none in function | status.cpp:3663 |
| STR (melee ATK) | Weapon ATK from STR | in status_base_atk, not read | - | - | status.cpp:2424 (not read) |
| AGI (flee, R) | Dodge | flee = bonus + level + agi + luk/5 + 100 + 2 con | level 50 with agi 40, luk 30: 196 | capped 1..SHRT_MAX | status.cpp:2646-2648 |
| AGI (flee, P) | Dodge | flee = bonus + level + agi | level 50 with agi 40: 90 | capped 1..SHRT_MAX | status.cpp:2710 |
| AGI (ASPD, P) | Attack delay | amotion -= amotion x (4 agi + dex) / 1000 (integer); base from job table | base 1000, agi 20, dex 30: amotion 890 (example, not donor data) | none in function | status.cpp:2410 |
| AGI (ASPD, R) | Attack speed | temp = dex^2/5 + agi^2 x 0.5 (default weapon), then sqrt x 0.25 + 196, plus agi-scaled term, minus min(base ASPD, 200) | dex 50, agi 50: temp base 206.46 (example) | none in function | status.cpp:2384-2398 |
| VIT (max HP) | Health | job base HP x (1 + vit/100); x1.25 upper; + equip VIT points | VIT 50: x1.5 (arithmetic) | none in function | status.cpp:3521-3534 |
| VIT (def, P) | Physical defence | def2 = bonus + vit | - | cap 0..SHRT_MAX | status.cpp:2714 |
| VIT (def, R) | Physical defence | def2 = bonus + (level + vit)/2 + agi/5 | - | cap 0..SHRT_MAX | status.cpp:2654 |
| INT (max SP) | Mana or focus | job base SP x (1 + int/100); x1.25 upper; + equip INT points | INT 50: x1.5 (arithmetic) | none in function | status.cpp:3572-3575 |
| DEX (hit, P) | Accuracy | hit = bonus + level + dex | level 50, dex 60: 110 | cap 1..SHRT_MAX | status.cpp:2706 |
| DEX (hit, R) | Accuracy | hit = bonus + level + dex + luk/3 + 175 + 2 con | level 50, dex 60, luk 30: 295 | cap 1..SHRT_MAX | status.cpp:2641-2643 |
| LUK (crit, R) | Critical chance | base crit + 3 x (luk - base luk) | +5 luk over base: +15 | floor 10 (no status changes); Katar x2 | status.cpp:6141, 7507, 6144-6148 |
| LUK (crit, P) | Critical chance | base crit + (luk - base luk) x 10/3 (C integer) | +5 luk over base: +16 | floor 10 | status.cpp:6143 |
| LUK (perfect dodge, flee2) | Dodge chance above normal | flee2 = base flee2 + (luk - base luk) | +1 per point of change | floor 10 when there are no status changes | status.cpp:6157, 7724 |
| CON (R) | Concentration: adds to hit, flee, patk, smatk | hit and flee + 2 con; patk and smatk + con/5 | - | - | status.cpp:2642, 2647, 2667, 2671 |
| POW (R) | Power: patk | patk = bonus + pow/3 + con/5 | - | cap 0..SHRT_MAX | status.cpp:2667 |
| SPL (R) | Spell: smatk | smatk = bonus + spl/3 + con/5 | - | cap 0..SHRT_MAX | status.cpp:2671 |
| STA (R) | Stamina: res (damage reduction) | res = bonus + sta + (sta/3) x 5 | - | cap 0..SHRT_MAX | status.cpp:2675 |
| WIS (R) | Wisdom: mres | mres = bonus + wis + (wis/3) x 5 | - | cap 0..SHRT_MAX | status.cpp:2679 |
| CRT (R) | Critical: hplus and crate | hplus = bonus + crt; crate = bonus + crt/3 | - | cap 0..SHRT_MAX | status.cpp:2683, 2687 |
| Stat point cost (R) | Points for the next point of a stat | 2 + (low-1)/10 below 100; 16 + 4 x ((low-100)/5) from 100 | 1 to 100 total 639; 99 to 100 costs 11; 100 to 101 costs 16 | none in function | pc.cpp:8798-8800 |
| Stat point cost (P) | Points for the next point of a stat | 1 + (low+9)/10 | 1 to 100 total 639; 99 to 100 costs 11; 100 to 101 costs 11 | none in function | pc.cpp:8803 |
| Status points per level | Total points at a base level | difference of table totals (pc_gets_status_point) | total 48 at level 1; 420 at 50; 1273 at 99; 4099 at 200 (db/re/statpoint.yml:36, 134, 232, 434) | level 201 total equals 200 | pc.cpp:8755-8757, 9358 |
| Job bonus stats | Stat increments tied to job level | running total stored at load (prefix sum) | level 5 Agi +1, 6 Vit +1, 8 Str +1, 9 Int +1 in one job group (job_stats.yml:95-102) | - | pc.cpp:14321-14330 |
| Overweight | Carry state | states at natural_heal_weight_rate and major_overweight_rate | config values not read | - | pc.cpp:3028-3030 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor formulas for the stat point cost (both builds), the luck-as-delta crit with the floor of 10, the renewal hit and flee, max HP, and pre-renewal attack motion with integer truncation. It omits: the fields that the PC stacks before the misc call (bonus terms are a parameter), the status-change flags and Katar doubling, the flee2 path, the defence, magic and resist fields (CON, POW, SPL, STA, WIS, CRT), the job-table lookup (base HP and SP are parameters), the taekwon x3 case, the flat and percent equipment bonuses after VIT, the rate multipliers after the misc call, the renewal ASPD term, and the overweight states. It also uses a single caller-supplied base crit, not the donor's per-class base.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Stat point cost to raise a stat from `low` to the next point. Renewal rises steeply from 100; pre-renewal does not.
function statPointCost(low: number, renewal: boolean): number {
  if (renewal) return low < 100 ? 2 + Math.trunc((low - 1) / 10) : 16 + 4 * Math.trunc((low - 100) / 5);
  return 1 + Math.trunc((low + 9) / 10);
}

// Points to move a stat from `from` to `to` (to > from). Sums the cost of each single point.
function pointsToRaise(from: number, to: number, renewal: boolean): number {
  let sp = 0;
  for (let low = from; low < to; low++) sp += statPointCost(low, renewal);
  return sp;
}

// Luck is a delta: only luck above the base value adds crit (renewal 3 per point, pre-renewal 10/3).
function critFromLuck(baseCrit: number, luk: number, baseLuk: number, renewal: boolean): number {
  const delta = luk - baseLuk;
  const crit = renewal ? baseCrit + 3 * delta : baseCrit + Math.trunc(delta * 10 / 3);
  return Math.max(10, crit);
}

// Renewal hit and flee from level and stats (PC branch). Pre-renewal is level + dex and level + agi.
function hitRenewal(level: number, dex: number, luk: number, con: number, bonusHit: number): number {
  return Math.min(32767, Math.max(1, bonusHit + level + dex + Math.trunc(luk / 3) + 175 + 2 * con));
}
function fleeRenewal(level: number, agi: number, luk: number, con: number, bonusFlee: number): number {
  return Math.min(32767, Math.max(1, bonusFlee + level + agi + Math.trunc(luk / 5) + 100 + 2 * con));
}

// Max HP: job base x (1 + vit/100), then upper class x1.25, then flat equipment VIT points.
function maxHpPc(baseHp: number, vit: number, upperClass: boolean, equipVit: number): number {
  let d = baseHp;
  if (vit > 0) d *= 1 + vit * 0.01;
  if (upperClass) d *= 1.25;
  d += equipVit;
  return Math.max(1, Math.trunc(d));
}

// Pre-renewal attack motion: base delay, cut by (4*agi + dex) / 1000 with integer division, plus raw bonus.
function amotionPre(baseDelay: number, agi: number, dex: number, aspdAdd: number): number {
  let amotion = baseDelay;
  amotion -= Math.trunc(amotion * (4 * agi + dex) / 1000);
  return amotion + aspdAdd;
}
```

Checks on the sketch (run): typechecks with `tsc --noEmit --strict --target es2020` on the VPS (no errors). Hand-computed with the same formulas: pointsToRaise(1, 100, true) = 639 and pointsToRaise(1, 100, false) = 639; statPointCost(99, true) = 11, statPointCost(100, true) = 16, statPointCost(100, false) = 11; hitRenewal(50, 60, 30, 0, 0) = 295; critFromLuck(10, 35, 30, true) = 25; amotionPre(1000, 20, 30, 0) = 890.

## 5. Lands in

- TARGET `src/fight/derived-stats.ts` (new, engine): the attribute-to-derived functions (hit, flee, crit with the luck delta, max HP, attack motion) and the stat point cost. Computed on the server once per change; the client reads the result.
- Parity-checklist row 21 (catalogue fields): stat names, the per-level points table, the job bonus prefix sums and the per-type HP/SP values are catalogue fields, not constants in the function.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room, shape only).
- Brief rule served: 1 (one engine: derived stats computed in one place, once per change); rule 4 (server-verified) applies to where the value is computed; rules 7-9 n/a.

## 6. Gaps and risks

- Licence is GPL-3.0 (or later): clean-room only. The sketch is written from the mechanism.
- Three compile switches (RENEWAL, RENEWAL_STAT, RENEWAL_ASPD) give three balance variants. Mixing them is a bug risk: for example, stat cost matches up to 100 and then diverges. Frankendom must pick one set of formulas and record it in the catalogue.
- Luck as a delta (status.cpp 6141, 6143, 6157): a stat is worth its change from the base, so gear and buffs add their change only. That fits "one ledger" if base luck is stored once. It also means a debuff below base lowers crit (negative delta), which the donor allows and the floor of 10 (7507) limits.
- Hit and flee constants (+175, +100, luk/3, luk/5) are the donor's tuning. Frankendom should keep the shape and move each constant to catalogue data with a default, not copy them.
- Pre-renewal ASPD is integer-truncated (2410) and the renewal ASPD is float (2384-2387). Frankendom runs in integer ticks; choose one rounding and state it in the server test.
- No stamina economy and no crowd-control ladder were found in the files read; Frankendom's stamina and stance stay under parity row 3.
- Carry weight: the overweight state sets a status (pc.cpp 3044-3045) whose effect on regen was not read. In a fast duel, weight probably should not feed the fight; if it stays, it must be a zone or catalogue value, not a constant.
- Per-type HP and SP values come from job tables (base_hp[level], base_sp[level]) whose values were not read; the level curve is data in the donor and must stay data in Frankendom.
- Stat point totals: the donor's per-level table is cumulative (statpoint.yml), so a level curve is a data table; Frankendom should store totals per level and compute the difference, the same as pc_gets_status_point.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room, shape only)
Brief rule served: 1 (one engine computes derived stats once); rules 7-9 n/a

Best transferable idea: Keep attributes as a cumulative point-cost table, and derive every combat chance from its attribute plus a delta over the base value, so gear and buffs add only their change, computed once on the server.
Decision (proposed): adapt - the luck-as-delta crit, the cumulative stat point curve and the job-level prefix sums fit the duel and the catalogue; the donor's hit and flee constants, the three balance switches and the overweight states do not.
Acceptance: A server test asserts the total cost to take one stat from 1 to 100 matches the chosen curve (639 in both donor builds), that 100 to 101 costs more on the renewal curve than on the pre-renewal curve, and that a debuff below base luk lowers crit with a floor of 10.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: None found. Verified: status_calc_misc renewal PC formulas (hit 2641-2643 incl. luk/3+175+2con, flee luk/5+100, def2 (level+vit)/2+agi/5, patk, smatk, res, mres, hplus, crate) and pre-renewal (level+dex, level+agi, vit); PC_STATUS_POINT_COST both variants and pc_need_status_point loop; hand sums 639 (both builds), 99->100 = 11, 100->101 = 16 (R) / 11 (P) are right; statpoint.yml totals 48/420/1273/4099 and level 201 = 200 value; luck delta crit 3x (R) and x10/3 (P) at 6141/6143, flee2 delta 6157, Katar x2 after the cap, floor 10 in status_calc_critical/flee2; max HP vit/upper 1.25/taekwon x3/equip VIT; pre-renewal amotion formula (dual wield *7/10) and renewal ASPD dex^2/5 + agi^2*0.5 (bow family uses /7, note says 'most weapons'); max weight job + STR*300 (3663) and bonuses; overweight states pc.cpp 3028-3030; BonusStats prefix sum 14321-14330; job_stats MaxWeight 28000 at line 107; GPL v3. Worked examples (196, 295, 890, 206.46) recompute correctly.
Missed: Renewal mdef2 (INT + level/4 + (dex+vit)/5, status.cpp ~2661-2662) is the INT-defence rule and is absent from the table; the luck delta also only applies when base cri/flee2 is non-zero (the b_status->cri guard at 6137).
