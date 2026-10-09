# rathena-rathena (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/battle.cpp` | Licence: GPL-3.0 per repo LICENSE (battle.cpp header says only "Licensed under GNU GPL", no version) | C++ | symbol `battle_damage / battle_calc_*`

Checked: At 319. Verified: line 319 opens `battle_damage` (the doc comment sits above it, 300-318) and it ends at 365. Read in full: `battle_calc_attack` 6753-6796, `battle_calc_weapon_attack` start 5387-5480, `is_attack_critical` 3017-3155, `is_attack_hitting` 3228-3318, `battle_calc_base_damage` 2515-2635, `battle_calc_defense_reduction` 4720-4884, `battle_calc_attack_post_defense` 4894-4941. The rest of `battle_calc_weapon_attack` (5480-) was not read.

## 1. Mechanism

- Entry is `battle_calc_attack` (6753-6796): dispatches by attack type (weapon, magic, misc). If total damage is below 1 the result is a miss (when the level was plain defence, 6769-6770) and Weapon Blocking can trigger on it (6778-6785); otherwise the level becomes plain defence so additional effects still run.
- `battle_calc_weapon_attack` (5387-) builds the damage record, applies skill hooks, picks the elements, then in this order: a Lucky Dodge check for normal attacks (and one skill): `rnd()%1000 < flee2` returns early as a lucky dodge (5424-5430); the multi-hit check; the critical check (before hit, because criticals always hit, 5435-5445); the hit check (5450); and only for a hit against a non-immune target the base damage, skill ratio and so on (5452-5480). A failed hit sets the level to flee.
- Hit test `is_attack_hitting` (3228-3318): a critical always hits; perfect-hit, a fusion status, some target statuses and skills that ignore flee force a hit (3240-3253); otherwise hitrate = base (80 pre-renewal, 0 in renewal, 3259-3263) + attacker hit - target flee, where flee is reduced by the number of units targeting the target (config, 3265-3276), plus arrow, skill and mastery terms, clamped to the config minimum and maximum (3312), then `rnd()%100 < hitrate` (3317).
- Critical test `is_attack_critical` (3017-3155): from the attacker's critical stat (in tenths of a percent) plus race and arrow bonuses, minus twice the target's LUK (three times for a mob attacking a player), doubled against a sleeping target, reduced by the target's critical defence, then `rnd()%1000 < cri` (3030-3152). Some skills always or never critical. A critical bypasses the hit roll.
- Base damage `battle_calc_base_damage` (2515-2635): a player's maximum is the weapon attack and the minimum is DEX scaled by `(80 + 20 x weapon level)%`, capped at the maximum (2545-2555); bows scale the minimum by the maximum (2557-2561). A uniform roll `rnd()%(max-min)+min` is taken, or the maximum on a critical (2570-2573). Then an arrow bonus, a size correction from the weapon's size table (players only), the base attack stat added, weapon refinement damage added, and in renewal a critical x1.4 (2575-2632). Mobs use their own attack min and max (2535-2537).
- Defence `battle_calc_defense_reduction` (4720-4884): ignore-DEF bonuses and status effects lower the target's DEF, a penalty applies when many units target the same unit (4780-4798), then a VIT term is computed. For a player target pre-renewal the VIT term is `0.3 x VIT + random(0 .. VIT^2/150 - 0.3 x VIT - 1) + 0.5 x VIT` (4810-4812); for a mob it is `VIT + random(0 .. (VIT/20)^2 - 1)` (4831-4832); in renewal it is the soft DEF (4814, 4835). Pre-renewal: damage x (100 - DEF)% minus the VIT term, DEF capped at 100 (4872-4882). Renewal: damage x (4000 + DEF) / (4000 + 10 x DEF) minus soft DEF (4867), with a flat-subtraction variant for some skills (4847-4853).
- Post-defence (4894-4941): pre-renewal adds the refine bonus, floors damage at 1 (4912, 4931), then applies masteries; an aura-blade status adds flat damage. Final apply is `battle_damage` (319-365): it computes a walk delay (330), applies a coma kill or the damage immediately (`status_fix_damage`, 335-338), then additional effects and mob event hooks (339-362). The timed delay itself lives in `battle_delay_damage`, which calls this one (comment, 300-302; not read).
- Tick: per attack event, scheduled by a timer; the donor's sequence is fixed and ordered.

## 2. Key functions

- `battle_calc_attack`: the dispatcher, `battle.cpp` 6753-6796. Dispatch, miss and absorb mapping, blocking.
- `is_attack_hitting`: `battle.cpp` 3228-3318. Hit roll with flee, crit bypass and hitrate clamp.
- `is_attack_critical`: `battle.cpp` 3017-3155. Critical chance.
- `battle_calc_base_damage`: `battle.cpp` 2515-2635 (read in full). Uniform base roll, DEX-scaled minimum, size and base attack adds.
- `battle_calc_weapon_attack`: `battle.cpp` 5387- (first 90 lines read). Order: lucky dodge, multi-hit, critical, hit, damage.
- `battle_calc_attack_post_defense`: `battle.cpp` 4894-4941. Refine bonus, floor of 1, masteries.
- `battle_calc_defense_reduction`: `battle.cpp` 4720-4884. DEF and VIT reduction, pre-renewal and renewal branches.
- `battle_damage`: `battle.cpp` 319-365. Final apply and post-hit hooks.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit = base + attacker accuracy - defender evasion, clamped, then one roll | Base 80 pre-renewal, 0 in renewal (theirs, 3259-3263); clamp from config (theirs, 3312) |
| Critical bypasses the hit roll | Crit stat per character (theirs, data) |
| Base damage uniform in [min, max); crit takes max | Minimum = DEX x (80 + 20 x weapon level)% capped at the maximum (theirs, 2549-2555) |
| Armour as a fraction: damage x (100 - DEF)% (pre-renewal) | Renewal coefficient 4000 and 10 (theirs) |
| Flat soft-defence subtraction after the fraction | VIT term for a player target pre-renewal: 0.3 x VIT plus a random part plus 0.5 x VIT (theirs, 4810-4812) |
| Minimum damage floor of 1 after defence | Floor value 1 (theirs) |
| Flee penalty as more attackers target one unit | Penalty count and step from config (theirs) |

## 4. TypeScript sketch

simplified: omits the lucky dodge and the critical check order (critical is tested before hit in the donor), the flee penalty by attacker count, the size correction, base-attack and refine adds, the VIT random term, the renewal critical multiplier and every skill-specific branch. The hit roll here is a float comparison; the donor uses an integer `rnd()%100`. Pre-renewal DEF is capped at 100 in the sketch as in the donor.

```ts
// Licence: GPL-3.0 (donor, per repo LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Roll = () => number; // uniform in [0, 1)

// Hit chance: base plus attacker accuracy minus defender evasion, clamped to a configured range.
function hitRate(base: number, accuracy: number, evasion: number, clamp: [number, number]): number {
  const raw = base + accuracy - evasion;
  return Math.min(clamp[1], Math.max(clamp[0], raw));
}

// A critical bypasses the hit roll; otherwise one roll against the clamped rate.
function landsHit(crit: boolean, rate: number, roll: Roll): boolean {
  if (crit) return true;
  return roll() * 100 < rate;
}

// Base damage: uniform in [min, max); a critical takes the maximum.
function baseDamage(min: number, max: number, crit: boolean, roll: Roll): number {
  if (crit) return max;
  return min + Math.floor(roll() * (max - min));
}

// Defence, pre-renewal style: a fraction by (100 - def), then a flat soft term.
function defencePre(damage: number, def: number, softTerm: number): number {
  return Math.floor((damage * (100 - Math.min(def, 100))) / 100) - softTerm;
}

// Defence, renewal style: a rational fraction in the defence value, then a flat soft term.
function defenceRenewal(damage: number, def: number, softTerm: number): number {
  return Math.floor((damage * (4000 + def)) / (4000 + 10 * def)) - softTerm;
}

// Floor after defence.
function finalDamage(afterDefence: number): number {
  return Math.max(1, afterDefence);
}
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 1 (duel step / sim): the hit-rate-then-roll shape and the defence fraction are candidates for the damage step. Compare with the existing hit and damage code in `stepDuel` (`src/duel.ts` line 221, checked in worktree `frankendom-backend`, commit 46e670530) first. The critical-before-hit order and the floor-of-1 are the two small ideas.
- today: `src/duel.ts` (moving).
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and is not a line-for-line translation.
- Two formula families (pre-renewal and renewal) sit behind `#ifdef RENEWAL`. Pick one for Frankendom and do not mix them.
- Flee and accuracy are MMO stat tables. Frankendom's catalogue (checklist row 21) has none of them; nothing here maps without adding fields.
- `battle_damage` applies the damage at once and computes a walk delay; the timed delay is a separate function. Frankendom resolves inside the 60 Hz step, so no delay timer should be copied.
- The flee penalty by number of attackers and the VIT penalty by number of attackers are crowd rules like MAX_ATTACKERS = 3, but they are config-driven and unbounded; Frankendom's cap is a fixed ruling.
- Frankendom's floor of damage and posture rules are in the duel step (`src/duel.ts`, moving) already; do not add a second floor.
