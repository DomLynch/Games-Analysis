# angband-angband (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/angband-angband/src/player-calcs.c` | Licence: GPL-2.0 or the "Angband licence" (dual; file header and docs/copying.rst) | C | symbol `calc_blows`

Checked: Symbol `calc_blows` at 1703-1735 (read in full), with its two call sites in `calc_bonuses` (2305 weapon, 2318 unarmed; grep shows no other callers in src). Also read: the STR and DEX blow tables (548-592, 594), the 12x12 `blows_table` (889-911, checked row by row against the sketch), the heavy-weapon gate (2251, 2298-2304), the stat-index mapping (2063-2072), skill assembly (1905, 2240-2249), stat-to-combat terms (2217-2236), HP and mana (1493-1574), melee to-hit and crit (`player-attack.c` 88-109, 196-219, 399-432, 763, 807), and the class and constants data (`lib/gamedata/class.txt` 144-187, 1391-1607; `constants.txt` 219-265). camera_scope: not applicable (not a camera cell). Confidence: high on the blow path and the hit and crit formulas; medium on level-50 numbers (hand-computed from the formulas, not run). Not read: where `calc_bonuses` is triggered, `calc_shapechange` (2031, extra blows from shapes), the spell and school code, and the monster-side attack. The donor has no player stamina, poise or stun (grep of src and lib/gamedata; the only "stagger" is monster movement at `mon-move.c` 1067-1071).

## 1. Mechanism

- One function, `calc_blows`, turns the stat sheet and one weapon into blows per turn, stored in hundredths (100 = one blow). It runs from `calc_bonuses`, once for the wielded weapon (2305) and once for bare hands (2318, weight 0).
- Order of steps:
  - (a) Weight floor. `div` = weapon weight in tenths of a pound, floored at the class `min-weight` (1715). Warrior floor 30, Mage 40, Rogue 20, Blackguard 100 (class.txt 150, 186, 1391, 1607).
  - (b) Strength row. `str_index = adj_str_blow[STR index] * class strength-multiplier / div` (1718-1719), then clamped to 11 (1722). `adj_str_blow` runs from 3 (STR 3) to 240 (18/220+) (548-592). Multiplier: Warrior 5, Mage 2, Rogue 4 (class.txt 151, 187, 1392).
  - (c) Dexterity column. `dex_index = min(adj_dex_blow[DEX index], 11)` (1725). `adj_dex_blow` runs from 0 (DEX 3-9) to 11 (18/220+) (594).
  - (d) Energy per blow. `blow_energy = blows_table[str_index][dex_index]` (1728). Values run from 100 (one blow per turn, weakest corner) down to 15 (strongest corner).
  - (e) Count. `blows = min(10000 / blow_energy, 100 * max-attacks)` (1730). Class max-attacks: 4 to 6 (Warrior 6, class.txt 149; Mage 4, class.txt 185).
  - (f) Bonus and floor. Returns `max(blows + 100 * extra_blows, floor)` (1733-1734). Bonus blows are added after the cap. The floor is 100 (one blow), or 200 when the donor's percent-damage birth option is on. Extra-blow sources seen: object modifiers (1974), bloodlust `timed / 20` (2209). Shape extra blows (2031) not read.
  - (g) Heavy-weapon gate, in `calc_bonuses` and not in `calc_blows`. If the STR hold value (`adj_str_hold`, 2251) is below weapon weight / 10, then `to_h += 2 * (hold - weight/10)` (a negative number) and `heavy_wield = true` (2298-2300). Then `calc_blows` is not called (2304) and `num_blows` keeps its default of 100 (1900). So a too-heavy weapon gives one blow and ignores bonus blows. `num_blows` is written in only three places (1900, 2305, 2318).
- Worked examples (hand-computed from the tables, not run):
  - Warrior, STR 18/100 (adj 120), DEX 18/50 (band 4), 1.2 lb dagger (weight 12, floor 30 applies): div 30; 120 * 5 / 30 = 20, clamped to row 11; `blows_table[11][4]` = 22; 10000 / 22 = 454, so 4.54 blows per turn (cap 600).
  - Warrior, STR 18/10 (adj 30), DEX 18/50 (band 4): a 1.2 lb dagger gives row 5, energy 33, so 303 (3.03 blows). A 4.0 lb weapon gives row 3, energy 42, so 238 (2.38 blows). Heavier weapons cost blows at the same stats.
  - Mage, STR 3 (adj 3), DEX 3 (band 0), 4.0 lb staff: 3 * 2 / 40 = 0, row 0, energy 100, so 1 blow.

## 2. Key functions

- `calc_blows`: `/mnt/frankendom-donors/angband-angband/src/player-calcs.c` 1703-1735. The whole blow count. (Read in full.)
- `blows_table`: same file, 889-911. The 12x12 energy table; the header comment (862-888) explains the P and D indexes.
- `adj_str_blow` 548-592 and `adj_dex_blow` 594 (table start). Stat-to-band tables.
- `calc_bonuses`: same file, 1877 on. Builds the whole stat sheet in one pass; calls `calc_blows` at 2305 and 2318; heavy-weapon gate at 2298-2304.
- Melee to-hit: `/mnt/frankendom-donors/angband-angband/src/player-attack.c` `chance_of_melee_hit_base` 88-94 (base chance), `chance_of_melee_hit` 104-109 (unseen halves), `hit_chance` 196-220 (P of hit), `test_hit` 174-178. Called from `py_attack_real` (717 on) at 763.
- Melee crit: same file, `critical_melee` 399-432. Called once, at 807, in the normal-damage branch and for weapon hits only (the comment before 807 says unarmed crits are excluded).

## 3. Numbers vs mechanism

Each row: name | what it does | formula | number ranges | caps | file:line.

| Stat or term | What it does | Formula | Number ranges | Caps | file:line |
|---|---|---|---|---|---|
| Stat index (STR, DEX, INT, WIS, CON) | Maps the stat value to a table index | 0 if use <= 3; use - 3 for 4-18; 15 + (use - 18) / 10 for 18/00-18/219; 37 for 18/220+ | 0-37 | 37 | 2063-2072 |
| STR blow band | Strength term of the blow count | adj_str_blow * class multiplier / max(weight, class min-weight) | 3-240 before division; row 0-11 | row 11 | 1718-1722; 548-592 |
| DEX blow band | Dexterity term of the blow count | adj_dex_blow[DEX index] | 0-11 | 11 | 1725; 594 |
| Blow energy | Cost of one blow in hundredths of a turn | blows_table[row][col] | 15-100 | table limits | 1728; 889-911 |
| Blows per turn | Attacks per turn | min(10000 / energy, 100 * max-attacks) + 100 * bonus blows; floor 100 | 1.00-6.00 blows (100-600) | class max-attacks (4-6) | 1730-1734 |
| Class strength multiplier | How much STR counts for blows | data per class | Mage 2, Warrior 5, Rogue 4 (others 3-5: Druid 3, Priest 3, Necromancer 3, Paladin 5, Ranger 4, Blackguard 5) | none | class.txt 151, 187, 464, 702, 971, 1230, 1392, 1498, 1608 |
| Class min weapon weight | Floor on the weight used for blows | max(weight, min-weight), tenths of a pound | 20-100 (Warrior 30, Mage 40, Rogue 20, Blackguard 100) | floor | class.txt 150, 186, 1391, 1607 |
| Class max attacks | Cap on blows per turn | data per class | 4-6 | cap | class.txt 149, 185 |
| Bonus blows | Extra blows from gear and timed effects | +100 per blow after the cap; bloodlust adds timed / 20 | count, not read per item | none found in the blow function | 1733; 1974; 2209 |
| Heavy weapon | Weapon too heavy for STR hold | if hold < weight / 10: 1 blow, to_h += 2 * (hold - weight/10) | 2 to-hit per pound over hold | to-hit only | 2298-2304; 456; 2251 |
| Melee to-hit base | Chance before target AC | skill + 3 * (to_h + weapon to_h + 2 if blessed) | skill about 0-300+; 3 per to-hit point | none | player-attack.c 88-94; player.h 90 |
| Melee skill | Base melee skill | race + class base, then + increment * level / 10 (integer) | Warrior 70 (+45 per 10 levels), Mage 35 (+15 per 10 levels) | none | 1905; 2246; class.txt 144, 180 |
| STR and DEX to-hit and to-dam | Stat bonus to attack | adj_str_th, adj_dex_th added to to_h; adj_str_td added to to_d | table values (not read per value) | none | 2234-2236; 272; 318; 364 |
| Hit roll | Chance a swing lands | to_hit floor 9; P(hit) = 0.12 + 0.83 * max(0, to_hit - 2*AC/3) / to_hit | 12% to 95% | always hit 12%, always miss 5% | player-attack.c 200-219 |
| Unseen target | Visibility penalty | chance / 2 when not visible | 50% | none | 104-109 |
| Melee crit chance | Chance a hit crits | crit when randint1(5000) <= weight + 5 * to_h + 1 * skill - 60 (+10 to_h if debuffed) | e.g. 12 + 0 + 295 - 60 = 247, about 4.9% | range 5000 | player-attack.c 399-417; constants.txt 219-242 |
| Melee crit power | Severity of a crit | power = weight + randint1(650); level by cutoffs 400, 700, 900, 1300 | see next row | none | player-attack.c 422-426; constants.txt 248 |
| Melee crit levels | Damage of a crit | new = add + mult * dmg. power < 400: x2 +5. 400-699: x2 +10. 700-899: x3 +15. 900-1299: x3 +20. 1300+: x4 +20 | as shown | none | player-attack.c 430; constants.txt 261-265 |
| Weight limit | Carry limit from STR | adj_str_wgt * 100 (table in deca-pounds) | table values (not read per value) | none | 408; 410; 1741-1746 |
| Encumbrance speed loss | Speed lost when carrying too much | if weight > limit / 2: speed -= (weight - limit/2) / (limit/10) (integer) | 1 speed per tenth of limit over half | speed clamp 0-199 (seen, not receipted) | 2224-2226 |
| Fear | Afraid state | to_h -= 20; to_a += 8; device skill scaled down | fixed | none | 2217-2218 |
| Max HP | HP per level from CON | player_hp[lev - 1] + adj_con_mhp[CON] * lev / 100; floor lev + 1 | table values (not read per value) | floor 1 per level | 1568-1574 |
| Mana | Pool from spell stat | msp += adj_mag_mana[spell stat] * levels / 100; levels = lev - spell_first + 1 | table values (not read per value) | levels clamp 0 | 1493-1498 |
| INT and WIS skills | Stat-driven skills | device += adj_int_dev; disarm magic += adj_int_dis; save += adj_wis_sav | table values | none | 2240-2243 |
| DEX skill | Disarm (physical) | disarm phys += adj_dex_dis | table values | none | 2240 |
| STR digging | Digging | digging += adj_str_dig, floor 1 | table values | floor 1 | 2244; 2248 |
| Stealth | Stealth skill | cap 30, floor 0 | 0-30 | 30 | 2249-2250 |

Not in this donor: a player stamina pool, poise, stun ladder, or regen. The blow count is free per turn.

## 4. TypeScript sketch

simplified: the sketch takes the two stat-table values (adj_str_blow, adj_dex_blow) and the class numbers as inputs, instead of the stat index tables. It leaves out the heavy-weapon gate (one blow and to-hit penalty), the bloodlust and gear sources of extra blows (passed in as one number), the percent-damage floor (passed in as minBlows100), and the unarmed path (pass weaponTenthLb 0). It keeps the donor order: weight floor, then strength row, then dexterity column, then the table, then the cap, then the bonus blows and the floor.

```ts
// Licence: GPL-2.0 or the Angband licence (donor, dual). clean-room sketch from the described mechanism; the table values are the donor's and are tuning data.
// clean-room
// Energy per blow in hundredths of a turn (100 = one blow per turn).
// Rows: strength band 0..11 (11 = clamp). Columns: dexterity band 0..11.
const BLOWS_TABLE: number[][] = [
  [100, 100, 95, 85, 75, 60, 50, 42, 35, 30, 25, 23],
  [100, 95, 85, 75, 60, 50, 42, 35, 30, 25, 23, 21],
  [95, 85, 75, 60, 50, 42, 35, 30, 26, 23, 21, 20],
  [85, 75, 60, 50, 42, 36, 32, 28, 25, 22, 20, 19],
  [75, 60, 50, 42, 36, 33, 28, 25, 23, 21, 19, 18],
  [60, 50, 42, 36, 33, 30, 27, 24, 22, 21, 19, 17],
  [50, 42, 36, 33, 30, 27, 25, 23, 21, 20, 18, 17],
  [42, 36, 33, 30, 28, 26, 24, 22, 20, 19, 18, 17],
  [36, 33, 30, 28, 26, 24, 22, 21, 20, 19, 17, 16],
  [35, 32, 29, 26, 24, 22, 21, 20, 19, 18, 17, 16],
  [34, 30, 27, 25, 23, 22, 21, 20, 19, 18, 17, 16],
  [33, 29, 26, 24, 22, 21, 20, 19, 18, 17, 16, 15],
];

interface BlowInputs {
  strAdj: number;            // strength stat value from the STR table (3..240), before the class multiplier
  dexBand: number;           // dexterity value from the DEX table (0..11)
  weaponTenthLb: number;     // weapon weight in tenths of a pound; 0 when unarmed
  minWeightTenthLb: number;  // class floor on weapon weight
  strMul: number;            // class strength multiplier
  maxAttacks: number;        // class cap on blows per turn
  extraBlows: number;        // whole bonus blows from gear or timed effects
  minBlows100: number;       // floor in hundredths of a blow (100 = one blow)
}

// Returns blows per turn in hundredths. Pure function of the stat sheet and the weapon.
function blowsPerTurn(i: BlowInputs): number {
  const div = Math.max(i.weaponTenthLb, i.minWeightTenthLb);
  const pRow = Math.min(Math.floor((i.strAdj * i.strMul) / div), 11);
  const dCol = Math.min(i.dexBand, 11);
  const energy = BLOWS_TABLE[pRow][dCol];
  const base = Math.min(Math.floor(10000 / energy), 100 * i.maxAttacks);
  return Math.max(base + 100 * i.extraBlows, i.minBlows100);
}

// Worked case from the tables: multiplier 5, max 6, weapon 12 (1.2 lb), floor 30; strAdj 120, dexBand 4. Expect 454.
const example: number = blowsPerTurn({
  strAdj: 120, dexBand: 4, weaponTenthLb: 12, minWeightTenthLb: 30,
  strMul: 5, maxAttacks: 6, extraBlows: 0, minBlows100: 100,
});
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS passed (no errors). The table was compared row by row with `player-calcs.c` 889-911 (12 of 12 rows equal).

## 5. Lands in

- TARGET `src/fight/stats.ts` (new): the derived attack rate from the stat sheet, read by the duel step. Parity-checklist row 21 (catalogue fields): the class multiplier, min weight, max attacks and bonus-blow step are catalogue fields, and the table is an engine constant.
- Reuse tag: adapt-idea (GPL-2.0 or Angband licence; clean-room, shape only, no line translated)
- Brief rule served: 1 (one engine: the stat sheet and attack rate live in the fight module, the client only shows them); rule 7 (licence: clean-room); SK-FOCUS 2 and 9 (stamina and level curves: gaps noted below).

## 6. Gaps and risks

- One engine: the donor is turn-based (energy per blow). A swing count only transfers if our duel step has a swing budget per time window. That is one place in `src/fight`, not per-weapon code.
- Stamina: the donor has no stamina, so blows are free. Frankendom's economy (checklist row 3) needs a per-swing cost for every blow; the donor gives none, so the cost is our design, not a port.
- Server verified: the blow count decides how many hit rolls a sequence has. The server rolls them; the client shows the rate only.
- Zones as data: the 12x12 table and the stat tables are engine constants. Class multipliers, min weight and max attacks are class catalogue fields, not zone data.
- Heavy weapon: the donor's rule is one blow plus a to-hit penalty, with no stagger, stamina or guard cost. If we keep the gate, we need the cost in our own rules.
- Crit power: power = weight + randint1(650). A 1.2 lb weapon (12) has power under 400 on about 60% of crit rolls (388 of 650), so it takes the lowest crit level most of the time. Heavier weapons crit harder; check this against the one damage ledger (row 1).
- Defect: no error found in `calc_blows`. The header comment (`player-calcs.c` 875) gives Rogue min-weight as 30, but `class.txt` 1391 gives 20. Data wins; fix: we take the data, not the comment.
- Not read: when `calc_bonuses` runs, shape extra blows (2031), and the monster side. Magic schools are not covered by this note.

Best transferable idea: a derived attack rate from a stat band and the weapon weight, divided by a per-class multiplier and capped per class, so a light weapon with good stats swings faster than a heavy one.
Decision (proposed): adapt — keep the stat-band and weight idea, but as a swing interval in src/fight, priced in stamina, with a small curve in class catalogue data instead of the 12x12 table.
Acceptance: server test: for a warrior with STR 18/10 and DEX 18/50, a 1.2 lb dagger gives 3.03 blows per turn (donor units) and a 4.0 lb weapon gives 2.38; a too-heavy weapon gives one swing with a to-hit penalty of 2 per pound over hold; the rate never exceeds the class max.

Reuse tag: adapt-idea (GPL-2.0 or Angband licence; clean-room, shape only)
Brief rule served: 1 (one engine); 7 (licence: clean-room)
