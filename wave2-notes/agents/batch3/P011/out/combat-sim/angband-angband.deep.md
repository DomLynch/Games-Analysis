# angband-angband (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/angband-angband/src/player-attack.c` | Licence: dual, per the file header: "either: a) the GNU General Public License ... version 2, or b) the "Angband licence"" (not-for-profit copy and distribution with notice) | C | symbol `py_attack_real`

Checked: The list's hint was "INFERRED", so I searched for the melee path with grep (`test_hit`, `critical`, `make_attack_normal`, `py_attack`). `py_attack_real` (player-attack.c 717-891) is the player's melee blow and was read in full. Also read in full: `chance_of_melee_hit_base` (88-94), `chance_of_melee_hit` (104-110), `test_hit` (174-179), `hit_chance` (196-220), `critical_melee` (399-434), `melee_damage` (480-495), `is_debuffed` (293-299), `player_damage_bonus` (657-660), `blow_side_effects` and `blow_after_effects` (669-697). Monster side: `mon-attack.c` `chance_of_monster_hit_base` (336-340), `monster_critical` (497-522), `check_hit` (527-534), `adjust_dam_armor` (540-543). Constants read in `lib/gamedata/constants.txt` (219-265) and `src/player.h` (90). Not read: `make_attack_normal` (mon-attack.c from 548, the monster's full attack loop), `random_chance_check`, `damroll`, `randint1`/`randint0` internals, `improve_attack_modifier` (brands and slays), `o_melee_damage` (the percent-damage path), and `calc_bonuses` (where `state.to_d` and `state.to_h` come from). Confidence high on the player's order of operations and the numbers; medium on the monster side, which covers only the helpers.

## 1. Mechanism

- One melee blow against one monster, in this order (717-891):
  - (a) Fear check: afraid players cannot attack (751-755). The monster is woken (759) and the hold timer is cleared (760).
  - (b) Hit roll (763): `test_hit(chance_of_melee_hit(p, obj, mon), mon->race->ac)`. Miss means "You miss" and return (765-776). No damage.
  - (c) Base damage (803-805): `melee_damage` rolls the weapon dice, multiplies by a slay or brand multiplier if one was chosen, then adds the weapon's to-dam. Bare hands use 1.
  - (d) Critical (806-809): only with a weapon. `critical_melee` replaces the damage with `add + mult x damage` for the band that the power reaches, or leaves it alone.
  - (e) Splash and quake (815-818): splash = weight x damage / 100 (computed and passed on; the after-effect body read does not use it). Impact brand with damage over 50 triggers an earthquake.
  - (f) Fighter damage (826-828): `player_damage_bonus` (state.to_d) is added after the crit.
  - (g) Zero floor (841-846): damage at or below zero becomes 0 and the verb changes to "fail to harm".
  - (h) Messages, then confusion side effect (864), then `mon_take_hit` (868), then vampiric drain (drain = min(monster hp, damage)), then the post-effect check (887): an earthquake may remove the monster.
- Hit chance (`hit_chance`, 196-220): to-hit has a floor of 9 (204). The ratio is (to-hit minus two thirds of AC) over to-hit (207-211). That ratio is scaled to 83% of the range (215-216), then 12% is added as a guaranteed hit (219). A 5% guaranteed miss is the range left over (201, and the comment at 186-187). The roll is `random_chance_check` (not read).
- To-hit (88-94): `skill + (to_h + weapon to_hit + 2 if blessed) x 3`. An invisible target halves the melee chance (109).
- Crit (`critical_melee`, 399-434): chance = 1 x weight + 5 x (to_h + weapon to_hit, plus 10 if the monster is debuffed) + 0 x level + 1 x skill - 60, out of 5000 (410-417). A crit happens if `randint1(5000) <= chance`. Power = weight + randint1(650) (422-425). Bands: power below 400 gives x2 +5; below 700 gives x2 +10; below 900 gives x3 +15; below 1300 gives x3 +20; the rest gives x4 +20 (theirs, constants.txt 261-265). Damage = add + mult x damage (430).
- `is_debuffed` (293-299): true if the monster is confused, held, feared or stunned.
- Monster blows against the player (helpers only): `to-hit = max(level, 1) x 3 + effect power` (339). Hit test: `test_hit(to_hit, ac + to_a)` (533). Armour soak: `damage - damage x min(ac, 240) / 400` (542), so at most 60% is soaked. `monster_critical` (497-522) grades a monster blow into tiers 1-6 by damage (over 45 is tier 6, 516), only if the damage is at least 95% of the dice maximum (503), with a 2% super-charge loop (513).
- Tick: none. This is a one-shot resolution per blow, run for each attack (the caller was not read). Knockback: not in this path. The only push-like effect is the earthquake from the impact brand (688).

## 2. Key functions

- `py_attack_real`: `/mnt/frankendom-donors/angband-angband/src/player-attack.c` 717-891. The whole melee blow.
- `hit_chance`: same file 196-220. The hit percentage with the 12% guaranteed hit and the 5% guaranteed miss.
- `critical_melee`: same file 399-434. Crit chance, power and bands.
- `melee_damage`: same file 480-495. Dice, slay or brand, weapon to-dam.
- `chance_of_melee_hit_base`: same file 88-94. Skill plus bonus times 3.
- `is_debuffed`: same file 293-299.
- Monster side: `/mnt/frankendom-donors/angband-angband/src/mon-attack.c` 336-340 (`chance_of_monster_hit_base`), 497-522 (`monster_critical`), 527-534 (`check_hit`), 540-543 (`adjust_dam_armor`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit chance: a ratio of (to-hit minus defence) over to-hit, with a floor on to-hit, plus a guaranteed hit and a guaranteed miss band | Floor 9 (theirs, player-attack.c 204); guaranteed hit 1200 of 10000 (theirs, 200); guaranteed miss 500 of 10000 (theirs, 201); to-hit per plus 3 (theirs, player.h 90) |
| Crit chance as a linear mix of to-hit, skill, weight, with an offset, out of a range | Weight scale 1, to-hit scale 5, skill scale 1, offset -60, range 5000, debuff +10 (theirs, constants.txt 219-242) |
| Crit power as weight plus a random part, then bands | Random part 650 (theirs, 248); bands 400/700/900/1300 with multipliers 2/2/3/3/4 and adds 5/10/15/20/20 (theirs, 261-265) |
| Armour soak as a fraction of damage, with AC capped | AC cap 240 and divisor 400 (theirs, mon-attack.c 542) |
| Monster level scales hit chance | Level x 3 (theirs, mon-attack.c 339) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the player blow (hit roll, base dice plus weapon to-dam, crit on the weapon, fighter to-dam, zero floor), with the hit and crit numbers from the donor. It omits the fear and wake steps, slays and brands (`improve_attack_modifier`), the shape-specific blows, the impact-brand earthquake, the bloodlust and exertion effects, the confusion and vampiric side effects, the percent-damage path, the messages, and the monster's full attack loop (only its two helpers are kept). It assumes `random_chance_check` is a uniform roll over 10000 and `damroll` is a sum of uniform dice; neither was read. Weight units are whatever the donor's `object_weight_one` returns, which was not read.

```ts
// Licence: dual GPL-2.0 (option a) or "Angband licence" (option b) per player-attack.c header. Treated as GPL: clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Rng {
  int1(n: number): number; // 1..n
  int0(n: number): number; // 0..n-1
}

interface Fighter {
  skill: number;     // melee to-hit skill
  toH: number;       // to-hit from gear and bonuses
  toD: number;       // to-dam from gear and bonuses, added after the crit
  level: number;
  blessed: boolean;
}

interface Weapon {
  weight: number;    // as the donor's object_weight_one returns it (units not read)
  toH: number;
  toD: number;
  diceCount: number;
  diceSides: number;
}

interface Target {
  ac: number;
  visible: boolean;
  debuffed: boolean; // confused, held, feared or stunned
}

const BTH_PLUS_ADJ = 3;
const ALWAYS_HIT = 1200;   // out of 10000
const ALWAYS_MISS = 500;   // out of 10000

// Melee to-hit before the target is considered.
function meleeToHit(f: Fighter, w: Weapon | null): number {
  const bonus = f.toH + (w ? w.toH : 0) + (f.blessed ? 2 : 0);
  return f.skill + bonus * BTH_PLUS_ADJ;
}

// Hit chance out of 10000: a ratio of (to-hit minus two thirds of AC), then 83% of it, plus a guaranteed 12% hit.
function hitChance10k(toHitRaw: number, ac: number): number {
  const toHit = Math.max(9, toHitRaw);
  let num = Math.max(0, toHit - Math.trunc((ac * 2) / 3));
  num = Math.trunc((10000 * num) / toHit);
  num = Math.trunc((num * (10000 - ALWAYS_MISS - ALWAYS_HIT)) / 10000);
  return num + ALWAYS_HIT;
}

function testHit(toHit: number, ac: number, rng: Rng): boolean {
  // assumes a uniform roll over 10000; the donor's random_chance_check was not read
  return rng.int0(10000) < hitChance10k(toHit, ac);
}

// Melee crit: a chance from weight, to-hit, level and skill, then a power that picks a band.
const CRIT_BANDS = [
  { cutoff: 400, mult: 2, add: 5 },
  { cutoff: 700, mult: 2, add: 10 },
  { cutoff: 900, mult: 3, add: 15 },
  { cutoff: 1300, mult: 3, add: 20 },
  { cutoff: Infinity, mult: 4, add: 20 }, // last band catches the rest
];

function meleeCrit(f: Fighter, w: Weapon, dmg: number, rng: Rng, debuffed: boolean): { dmg: number; band: number } {
  let toH = f.toH + w.toH;
  if (debuffed) toH += 10;
  const chance = 1 * w.weight + 5 * toH + 0 * f.level + 1 * f.skill - 60;
  if (rng.int1(5000) > chance) return { dmg, band: -1 }; // no crit
  const power = 1 * w.weight + rng.int1(650);
  let band = 0;
  while (power >= CRIT_BANDS[band].cutoff && band < CRIT_BANDS.length - 1) band++;
  const b = CRIT_BANDS[band];
  return { dmg: b.add + b.mult * dmg, band };
}

function rollDice(count: number, sides: number, rng: Rng): number {
  let s = 0;
  for (let i = 0; i < count; i++) s += rng.int1(sides);
  return s;
}

// One melee blow, in donor order: hit roll, base dice plus weapon to-dam, crit on the weapon, fighter to-dam, zero floor.
function resolveMeleeBlow(f: Fighter, w: Weapon | null, t: Target, rng: Rng): { hit: boolean; damage: number; band: number } {
  let toHit = meleeToHit(f, w);
  if (!t.visible) toHit = Math.trunc(toHit / 2);
  if (!testHit(toHit, t.ac, rng)) return { hit: false, damage: 0, band: -1 };

  let dmg = w ? rollDice(w.diceCount, w.diceSides, rng) : 1;
  if (w) dmg += w.toD;
  let band = -1;
  if (w) {
    const c = meleeCrit(f, w, dmg, rng, t.debuffed);
    dmg = c.dmg;
    band = c.band;
  }
  dmg += f.toD;
  if (dmg <= 0) dmg = 0;
  return { hit: true, damage: dmg, band };
}

// Monster blow vs player: the monster's to-hit, then armour soaks part of the damage (AC capped at 240, out of 400).
function monsterToHit(monsterLevel: number, effectPower: number): number {
  return Math.max(monsterLevel, 1) * 3 + effectPower;
}

function armourSoak(damage: number, ac: number): number {
  return damage - Math.trunc((damage * Math.min(ac, 240)) / 400);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/strike.ts` (new module; the duel blow: hit roll, damage, crit, on the one engine). Parity-checklist row 1 (duel step / sim). The monster-side armour soak (`armourSoak`) belongs in the same module as the duel step, not in a zone file.
- today: `src/combat.ts` (not read here; moving to `src/fight/`).
- Reuse tag: rewrite-from-idea (GPL-2.0 option a; clean-room only)
- Brief rule served: one engine (the duel step is the whole fight); kills server-verified (the roll runs on the server). Rules 7-9 n/a.
- Best transferable idea: a hit chance built from a ratio of (to-hit minus defence) over to-hit with a guaranteed-hit floor and a guaranteed-miss band, and a crit that is a chance from weight and to-hit, then a power that picks a band.

## 6. Gaps and risks

- Licence: GPL-2.0 is one of the two options, so clean-room only. The sketch is written from the mechanism.
- The to-dam may be counted twice. `melee_damage` adds the weapon's to-dam (`object_to_dam`, line 490) before the crit, and `player_damage_bonus` adds `state.to_d` after it (659). If `state.to_d` already includes the weapon's to-dam (`calc_bonuses`, not read), the weapon's to-dam is counted twice. Do not copy the order until this is checked.
- The donor rolls on a global RNG. Frankendom must roll on the server, from a seeded per-fight stream, so the duel can be replayed (row 19).
- The weight term has no Frankendom counterpart. Weight must become a per-weapon data field in the catalogue (row 21), not a constant.
- The debuff term (+10 to-hit for a crit) keys on monster conditions. Frankendom's guard and stagger live in the duel step (rows 1 and 3), so the mapping must be made there, not copied.
- The donor's numbers (floor 9, 12% guaranteed hit, 5% guaranteed miss, crit bands) are the donor's balance. Frankendom must test its own.
- The monster-side attack loop (`make_attack_normal`, from line 548) was not read. The order of checks around `check_hit` and `adjust_dam_armor` for the whole monster blow is therefore unconfirmed.
- C integer division is reproduced with `Math.trunc` in the sketch. Frankendom must pick integer or float maths and test the rounding at the edges.
- Knockback: this melee path has none. The only push-like effect is the earthquake from the impact brand (688), whose handler was not read.
- The target has one blow against one monster per action; many-vs-one (MAX_ATTACKERS = 3) is not covered by this code.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** Gap bullet 'to-dam may be counted twice' is unfounded: player-calcs.c 1999-2007 adds obj->to_h/to_d to state only for slots that are NOT weapon/bow (`!slot_type_is(EQUIP_WEAPON) && !EQUIP_BOW`), so the weapon's to-dam (added in melee_damage 490) is not in state.to_d (added at 827). Note left it open and told readers not to copy the order; it is resolvable and the order is safe. 'Impact brand' is really OF_IMPACT flag (816). Verified OK: py_attack_real 717-891 order, fear 751-755, hit 763, melee_damage 480-493, crit 806-809, splash 815, bonus 827, zero floor 841-846, drain 867, hit_chance 196-220 (9, 1200, 500, 83%), chance_of_melee_hit_base 88-94 (BTH_PLUS_ADJ 3 at player.h 90), invisible half 109, critical_melee 399-434 (constants.txt 219-265: debuff 10, w1 t5 lvl0 skill1 off -60 range 5000, power 650, bands 400/700/900/1300), is_debuffed 293-299, monster side 336-340, 497-522, 527-534, 540-543, dual licence header.

**Missed:** py_attack (caller) with blows/energy not read, so blows-per-turn is absent; note says so. Nothing simpler missed in the files read.
