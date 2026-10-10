# crawl-crawl (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/attack.cc` (with `melee-attack.cc`, `actor.cc`, `attack.h`, `defines.h`, `player.cc`, `fight.cc`) | Licence: GPL version 2 or any later version (LICENSE lines 6-8; "Certain pieces come with different licenses, all compatible with the GPL" at line 10) | C++ | symbol `attack::test_hit`

Checked: Read in full: `attack.cc` 95-134 (handle_phase_damaged), 159-316 (to-hit pre-roll, post-roll, calc_to_hit), 698-725 (inflict_damage), 982-1095 (calc_damage, test_hit, apply_defender_ac); `melee-attack.cc` 1935-2030 (the hit roll and hit/dodge branch), 5200-5215; `actor.cc` 340-400 (apply_ac); `fight.cc` 88-125 and 250-300 (hit-chance display, mirror formula); `player.cc` 6920-6960; `monster.cc` 3325-3345 (first half of monster evasion only). Not read: the start of `melee_attack::attack()` (1791-1934), `handle_phase_hit` body (843-891, only line 892 read), `mon_to_hit_base`, `apply_mon_damage_modifiers`, the monster half of evasion, `ranged-attack.cc` (the second caller of `test_hit`, line 125), `random.cc` / `random2avg`. Confidence high on the resolution order and the numbers for melee; medium on monster inputs. Camera: not applicable. Depth is thin only because the melee prelude and monster inputs are not read.

## 1. Mechanism

- Each melee swing resolves in three steps: a to-hit roll that becomes a margin against the defender's evasion, then (on a hit) a damage roll, then armour soak, then `hurt()`.
- Hit roll, attacker side. The player's pre-roll is `15 + dex/2`, plus fighting and weapon skill terms, weapon enchantment and hit property, slaying, minus 5 while vertigo lasts, plus a mutation term (attack.cc 175 and the surrounding block). The player's roll is `maybe_random2(mhit)` (attack.cc 298). Monsters use `calc_mon_to_hit_base()` (melee-attack.cc 5200, base not read) plus weapon plus and hit property plus slaying (attack.cc 228-232), and roll after modifiers: `maybe_random2(mhit + 1)` (attack.cc 304).
- Post-roll modifiers (attack.cc 243-288): the attacker's inaccuracy penalty, a to-hit bonus, confusion -5 (attack.h 18). If the defender is not visible: the player gets -6 (attack.cc 263), a monster gets `mhit * 35 / 100` off (attack.cc 265). If visible: backlight +5 (attack.h 16) and umbra -3 unless the attacker has night vision (attack.h 17); translucent skin on a player defender gives -2 per level (attack.h 19).
- Evasion side. `ev = defender->evasion(true, attacker)` (melee-attack.cc 1954). Phase-shift adds `PHASE_SHIFT_EV_BONUS` when the attacker cannot see invisible (1956-1958, constant not read). A player's evasion is `div_rand_round(_player_evasion(100, ...), 100)` (player.cc 6922), minus 10 when the attacker is invisible and `include_temp` is set (player.cc 6925-6926).
- The test is `test_hit(to_hit, ev, randomise)` (attack.cc 1040-1070, called at melee-attack.cc 1960 with `randomise = !attacker->is_player()`). Order inside it: (a) a player defender with autododge gets -1000, an automatic miss (attack.cc 1044-1045); (b) if randomise, `ev = random2avg(2*ev, 2)` (1048); (c) if `to_land >= AUTOMATIC_HIT` it returns true at once (1049-1050); (d) with chance `x_chance_in_y(MIN_HIT_MISS_PERCENTAGE, 100)` (1052), the margin is a coin flip of +/- AUTOMATIC_HIT (1053), a forced hit or a forced miss; (e) otherwise `margin = to_land - ev` (1055); (f) a blind player may get margin -1 (block from 1057 onward; its chance function is not read). The hit is `margin >= 0` (melee-attack.cc 2010).
- Overrides in the melee path: a successful stab sets a forced hit (melee-attack.cc 1974-1976), and a Wu Jian momentum attack forces a hit (1982). A shield block is checked before the hit branch (`attack_shield_blocked`, attack.cc 1096, not read).
- On a hit, `handle_phase_hit()` (melee-attack.cc 843) calls `calc_damage()` (892), then `handle_phase_damaged()` (attack.cc 95-134) which calls `inflict_damage()` (114, body 698-725), which calls `defender->hurt()` (712). A miss goes to `handle_phase_dodged()` (not read).
- Damage, monster attacker (attack.cc 984-1009): if the monster uses a weapon or throws, `random2(damage_max)` (991) plus slaying; then `damage += 1 + random2(attk_damage)` (1003); then `apply_mon_damage_modifiers` (1005, not read); then `apply_defender_ac(damage, damage_max)` (1008).
- Damage, player attacker (attack.cc 1010-1034): base is weapon damage or unarmed base; `stat_modify_damage(potential * 100)` (1018); `damage = div_round_near(random2(potential+1), 100)` (1019); weapon skill (if a weapon); fighting skill; misc; slaying; stab; final multipliers; `apply_defender_ac(damage)` (1028); post-AC multipliers; `max(0, damage)` (1031).
- Armour soak. `apply_defender_ac` (attack.cc 1072-1085) calls `defender->apply_ac(damage, damage_max, ac_rule)` (1075) with `ac_rule` defaulting to `ac_type::normal` (attack.h 157). In `actor::apply_ac` (actor.cc 353-396): `ac = max(armour_class, 0)` (355); normal rule: `saved = random2(1 + ac)` (366); for the normal rule only, a general-damage-reduction floor `saved = max(saved, min(gdr * max_damage / 100, div_rand_round(ac, 2)))` (386); result `max(damage - saved, 0)` (396). The other rules (proportional, half, triple) are not used by monster melee in this path and are not analysed.
- Tick: none. Each swing is one synchronous call; there is no per-frame loop in this mechanism.

## 2. Key functions

- `attack::test_hit` (margin): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/attack.cc` 1040-1070. Callers: `melee-attack.cc` 1960 (read) and `ranged-attack.cc` 125 (not read). The ranged path is not claimed.
- `attack::calc_to_hit` / `calc_pre_roll_to_hit` / `post_roll_to_hit_modifiers`: `attack.cc` 159-316. Read in full.
- `attack::calc_damage`: `attack.cc` 982-1038. Monster branch 984-1009, player branch 1010-1034 (both read). Melee override: `melee-attack.cc` 5268-5274 forwards to the base.
- `attack::apply_defender_ac` and `actor::apply_ac`: `attack.cc` 1072-1085; `actor.cc` 353-396. Read in full.
- The melee decision: `melee_attack::attack()`, `melee-attack.cc` 1950-2014 (read from 1935 onward; prelude not read).
- The displayed chance (mirror, not used in the roll): `fight.cc` 250-290, `mon_to_hit_pct`. Its callers were not read; it appears to be the on-screen percentage.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit when the attacker's roll minus the defender's evasion is zero or more | `AUTOMATIC_HIT` 1500 as the sure-hit margin (theirs, defines.h 141) |
| A small share of rolls is forced to hit or miss by a coin flip | `MIN_HIT_MISS_PERCENTAGE` 5 (theirs, defines.h 147): 5 percent of rolls, half forced hit and half forced miss (derived: 2.5 percent each) |
| Player to-hit base scales with a stat | `15 + dex/2` (theirs, attack.cc 175) |
| Penalties and bonuses on the roll | Confusion -5 (attack.h 18), backlight +5 (attack.h 16), umbra -3 (attack.h 17), translucent skin -2 per level (attack.h 19), invisible defender -6 for player (attack.cc 263), monster loses 35 percent of mhit (attack.cc 265), invisible attacker -10 on evasion (player.cc 6926) |
| Armour soaks a uniform draw from 0 to ac | `random2(1 + ac)` (theirs, actor.cc 366) |
| General damage reduction is a floor on the soak, normal rule only | `min(gdr*max_damage/100, div_rand_round(ac,2))` (theirs, actor.cc 386) |
| Result floored at zero | `max(0, ...)` (theirs, attack.cc 1031 and actor.cc 396) |

## 4. TypeScript sketch

simplified: the sketch keeps the order roll, evasion, margin, forced band, damage, armour, and does not hit-check the monster's randomised evasion beyond the two-roll average (the donor's `random2avg` was not read, so the two draws are a stand-in). It omits: the player branch and all its skill, slaying, stab and multiplier steps; stab and Wu Jian forced hits; shield block; the invisibility, blindness, backlight, umbra and confusion modifiers; phase-shift; monster damage modifiers; the reaping and blood side effects; `hurt()` and death. It uses `Math.round` where the donor uses `div_rand_round(ac, 2)`, and `Math.max(1, 2*ev)` to avoid an empty range (the donor's behaviour at `ev <= 0` was not read). The random draws are passed in, so a seeded run replays exactly.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
export interface Defender {
  evasion: number;      // scaled to whole points before the roll
  armour: number;       // armour points
  gdrPercent: number;   // general damage reduction, 0..100
}

export const AUTOMATIC_HIT = 1500;      // a margin this large is a sure hit
export const FORCED_BAND_PERCENT = 5;   // share of rolls forced to hit or miss (coin flip)

// rng(n) returns an integer in [0, n).
export function resolveHit(
  toLand: number, ev: number, randomiseEv: boolean, rng: (n: number) => number,
): { hit: boolean; margin: number } {
  if (toLand >= AUTOMATIC_HIT) return { hit: true, margin: AUTOMATIC_HIT };
  if (randomiseEv) {
    const span = Math.max(1, 2 * ev);
    ev = Math.floor((rng(span) + rng(span)) / 2); // stands in for the donor's two-roll average
  }
  let margin: number;
  if (rng(100) < FORCED_BAND_PERCENT) margin = (rng(2) ? 1 : -1) * AUTOMATIC_HIT;
  else margin = toLand - ev;
  return { hit: margin >= 0, margin };
}

// Monster weapon damage: one roll of the weapon range plus one roll of the attack's flat damage.
export function monsterDamage(weaponMax: number, attkDamage: number, rng: (n: number) => number): { dealt: number; max: number } {
  return { dealt: rng(weaponMax) + 1 + rng(attkDamage), max: weaponMax + attkDamage };
}

// Normal armour rule: a uniform soak from 0..ac, floored by general damage reduction, then subtracted.
export function applyArmour(damage: number, d: Defender, maxDamage: number, rng: (n: number) => number): number {
  const ac = Math.max(d.armour, 0);
  const gdrFloor = Math.min(Math.floor((d.gdrPercent * maxDamage) / 100), Math.round(ac / 2));
  const saved = Math.max(rng(1 + ac), gdrFloor);
  return Math.max(damage - saved, 0);
}

// One monster melee attack: to-hit margin first; damage and armour only on a hit.
export function monsterMelee(
  toLand: number, weaponMax: number, attkDamage: number, d: Defender, rng: (n: number) => number,
): { hit: boolean; margin: number; dealt: number } {
  const { hit, margin } = resolveHit(toLand, d.evasion, true, rng);
  if (!hit) return { hit, margin, dealt: 0 };
  const raw = monsterDamage(weaponMax, attkDamage, rng);
  return { hit, margin, dealt: applyArmour(raw.dealt, d, raw.max, rng) };
}
```

## 5. Lands in

- TARGET `src/fight/hit.ts` (new module: the to-hit margin, the forced band, the seeded roll) and `src/fight/damage.ts` (the armour soak and damage roll, the one place health changes). Parity-checklist row 1 (duel step / sim).
- today: `src/combat.ts` (moving).
- Reuse tag: rewrite-from-idea (GPL-2.0 or later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: a hit is one margin, to-hit minus evasion, with a small slice of rolls forced to hit or miss, and armour takes a uniform soak before health moves.
Decision (proposed): adapt — the margin test is the right shape for the duel step, but the per-roll randomness (randomised evasion, a coin-flip band, uniform armour soak) must draw from a seeded per-fight RNG logged in the fight record, or server-verified kills and replay (row 19) cannot reproduce a hit. Keep the forced band as a tunable, or drop it.
Acceptance: a server test replays a seeded fight record and asserts every hit, miss and damage value is identical, and an independent recount of the margin formula over 10,000 seeded rolls matches the engine's hit count.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line was translated.
- Monster to-hit base (`mon_to_hit_base`), monster evasion beyond its first half, `apply_mon_damage_modifiers`, `handle_phase_dodged`, `attack_shield_blocked` and the blind-miss chance were not read. The sketch takes `toLand`, `ev` and `weaponMax` as inputs, so these are zone-data numbers for us, not donor logic.
- The donor's randomness is roll-by-roll and unseeded from the game's point of view. Frankendom's one ledger and server-verified kills need a seeded RNG per fight; the sketch takes `rng` as a parameter to make that explicit.
- Order matters for the ledger: the donor applies armour before health and rolls the margin before damage. Frankendom must pick one order and test it; this sketch follows the donor order.
- The stab and Wu Jian forced hits are donor character features with no counterpart in the duel rulings; do not port them as a general rule.
- Frankendom's MAX_ATTACKERS = 3 does not change this resolution: it is one attacker to one defender, so the many-on-one logic belongs to the hate list (row 4), not here.
- The donor's blood, reaping and death handling (`hurt`, `Killed`) are outside this note; health loss here is only the value handed to `hurt()`.

