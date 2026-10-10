# alexbatalov-fallout1-ce (combat-sim, cell 3)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combat.cc` | Licence: Sustainable Use License, Version 1.0 (`/mnt/frankendom-donors/alexbatalov-fallout1-ce/LICENSE.md`: it permits use or modification "only for your own internal business purposes or for non-commercial or personal use", and distribution only "free of charge for non-commercial purposes"). Class: restricted; clean-room, shape only. | C | symbols `determine_to_hit_func`, `compute_attack`, `attack_crit_success`, `compute_damage`, `apply_damage`, with `roll_check` in `src/game/roll.cc`

Checked: The hint was `INFERRED`, so I searched for the topic words (hit, to_hit, damage, critical, roll). The real implementation is `src/game/combat.cc` for the hit, critical, damage and death steps, `src/game/roll.cc` for the d100 check and the random source, `src/game/item.cc` for the weapon damage roll, and `src/game/actions.cc` for knockback. Read in full: `determine_to_hit_func` (3223-3354), `compute_attack` (2781-2945), `attack_crit_success` (3045-3100), `compute_damage` (3357-3460), `death_checks` and `check_for_death` (3463-3553), `apply_damage` (3476-3541), `combat_attack` (2478-2549, to the action call), `roll_check` and `roll_check_critical` (66-108), `roll_random` (111-127), `ran1` (130-149), `item_w_damage` (1052-1080), `action_knockback` (108-142), `show_damage_to_object` (263-352). Read in part: the player crit table (only the head row, 1385-1393, and the opening line of the per-kill table at 119); `combat_anim_finished` (4075-4106). Not read: `attack_crit_failure` (3103-3189), `compute_spray` and `check_ranged_miss`, `combat_is_shot_blocked` (its out value is used at 3273-3274 but the function was not read), `stat_level`, `skill_level`, `item_w_skill_level`, `item_w_range`, the crit table rows other than the head row, turn order and initiative (1956-2036, 2213-2337). Confidence: high on the hit roll, the crit gate, the damage order and the death rule; medium-high on the knockback path (read to the stand-up branch, not to its end).

Best transferable idea: Resolve a hit as one d100 under a capped accuracy number, let the margin above the roll decide a second crit roll, then mitigate damage as a flat threshold first and a percent resistance second.

Decision (proposed): adapt - take the two-roll shape (hit under accuracy, crit from the margin) and the flat-then-percent mitigation order into `src/fight/hit.ts`, with Frankendom's own numbers as engine data; reject the day-gated crits (time since game start, not a duel rule), the perk and location tables as copied values, and the animation-driven knockback (the donor moves the defender in the presentation layer).

Acceptance: A server test with a seeded stream: an accuracy of 120 is capped to 95 and misses about 5 percent of 10,000 swings; a raw roll of 10 with threshold 3 and resistance 20 percent deals 6; with crits disabled no swing reports a crit.

## 1. Mechanism

- Order of work for one attack (`combat_attack` 2478-2549): a one-in-four punch can become a kick (2483-2487); `compute_attack` runs (2493); a script hook may add a damage bonus and clamp it (2497-2506); the action is sequenced (2529); action points are spent (2526-2537). Damage itself is applied by `apply_damage` at the end of the combat animations for single targets (`combat_anim_finished`, 4106), and by the report functions in `actions.cc` (`report_explosion` at 1714 and `report_dmg` at 1934; the callers of `report_dmg` were not read). So the roll and the damage number are fixed when `compute_attack` runs, but health changes when the animation ends.
- Range gate: if the weapon's range is less than the distance, no attack is made (2796-2797).
- Accuracy (`determine_to_hit_func`, 3223-3354): the start is the weapon skill (3237) or the unarmed skill (3232). Ranged weapons: the range term uses the distance minus perception times two (3254-3255, with the long-range perk changing the factor to four at 3249-3250). It is floored at minus two times perception (3256-3257). The player's sharpshooter perk reduces range by two per level (3261). Then the modifier is -4 per tile of range, or -12 per tile if the attacker is blind and the range is zero or more (3264-3268). A blocked shot subtracts ten times the block modifier (3273-3274, the block function not read). The player's one-hander trait gives -40 for a two-handed weapon and +20 otherwise (3278-3284). Each point of strength short of the weapon's minimum costs 20 (3287-3289). The accurate perk gives +20 (3292-3294). Target armour class is subtracted (3297). Location: ranged weapons take the full location penalty, melee takes half (3299-3303). A multihex target gets +15 (3305-3307). Player attacks in low light lose 40, 25 or 10 (3309-3318). A script bonus is added (3320-3322). An attacker who is blind loses 25 (3324-3326). A defender knocked out or down gives +40 (3328-3330). Enemies (team differs from the player's) lose 20 on easy and gain 20 on hard (3332-3343). The result is capped at 95 (3345-3347); there is no floor, only a debug message below -100 (3349-3350).
- Location penalties (`hit_location_penalty`, 104-113): head -40, left arm -30, right arm -30, torso 0, right leg -20, left leg -20, eyes -60, groin -30, uncalled 0.
- The d100 check (`roll_check`, roll.cc 66-76): `delta = difficulty - d100`. Delta below zero is a failure. Delta of zero or more is a success.
- Critical gate (`roll_check_critical`, roll.cc 82-108): both critical outcomes exist only after the first in-game day (`gameTime / GAME_TIME_TICKS_PER_DAY >= 1`, 90 and 99; the constant's value was not read). Failure becomes a critical failure with chance `-delta / 10` percent (92-94). Success becomes a critical success with chance `delta / 10 + modifier` percent (101-103). The modifier passed in by `compute_attack` is the attacker's critical-chance stat minus the location penalty (2820-2821), so a head shot (penalty -40) gets +40 to the crit modifier.
- Melee and perk checks in `compute_attack` (2832-2861): on a success, Slayer makes it a critical success (2835-2837 and again 2850-2852); Silent Death, when sneaking, not from the front and with the defender's last attacker not the player, sets the damage multiplier to 4 (2839-2844 and 2854-2859). Two blocks repeat the same checks; both set the same values, so the repetition has no visible effect in this code. Sniper (ranged) turns a success into a critical when a d10 is at most the luck stat (2866-2870).
- Jinxed trait: half of the failures (a d2 roll of 1) become critical failures (2825-2829).
- Result switch (2879-2895): critical success takes its multiplier from the crit table and then falls through to a normal hit; a success sets the hit flag and calls `compute_damage` with the multiplier (default 2, 2814); a failure on ranged weapons runs the ranged miss check; a critical failure runs `attack_crit_failure` (not read).
- Crit effect (`attack_crit_success`, 3045-3100): a special object (pid 16777224) returns multiplier 2 at once (3048-3050). Otherwise the crit is flagged (3052), then d100 plus the attacker's better-criticals stat (3054-3056) is banded: up to 20 effect 0, up to 45 effect 1, up to 70 effect 2, up to 90 effect 3, up to 100 effect 4, above 100 effect 5 (3059-3071). The effect is a table row for the hit location and effect; the player's table (1385) or the per-kill-type table (119) for others. The row gives a damage multiplier, flags, and a massive-crit stat check: if the defender fails a stat check with the row's modifier, the massive flags and message are added (3087-3092). Cripple flags pick a random cripple (3094-3097). The row's multiplier is returned (3099).
- Player head row (1387-1392): effects 0 to 4 have multiplier 3; effect 5 has multiplier 6 and a massive check on endurance with modifier -2 that adds death.
- Damage (`compute_damage`, 3357-3460), per round (bursts have several rounds, 3432-3447): raw = `item_w_damage` (3433), which is a roll (see below) plus the ranged bonus of two per perk level for the player's ranged attacks (3411-3415). Then `raw *= multiplier`, `raw /= 2`, so the default 2 is x1 and a critical table value of 3 is x1.5, 6 is x3 (3434-3435). Then `raw *= difficulty percent`, `raw /= 100`, where enemies get 75 on easy and 125 on hard (3417-3437). Then the damage threshold, a flat subtraction (3438). If still positive, the damage resistance percent is taken from what remains (3440-3441). Totals are added per round and never negative (3443-3445). Threshold and resistance come from the target's stats for the damage type (3396, 3399); penetrate sets threshold to zero (3393-3395); the finesse trait adds 30 to the target's resistance when the player is the attacker (3401-3405); a bypass flag zeroes both except for EMP (3392-3409).
- Weapon roll (`item_w_damage`, item.cc 1052-1080): a weapon's roll is `roll_random(min, bonus + max)`, where bonus is the melee damage stat for melee and unarmed weapons only (1064-1073, 1079). With no weapon, the roll is `roll_random(1, meleeStat + 2)` (1075-1076, 1079).
- Knockback (3449-3459): only for an explosion, no weapon, or a melee weapon (3451), and not for a multihex target (3450). Distance is damage over ten, or damage over five with the knockback perk (3453-3455). In `show_damage_to_object` (actions.cc 263-352) a killing fall with knockback moves the defender back (284-286); a knocked-out or knocked-down hit with knockback moves it back (332-333); any other hit with knockback pushes it back and then stands it up (344-352). `action_knockback` (108-142) walks tiles from the defender in the hit direction up to the distance and stops before a blocking object (119-125, then an animated straight move, 137-138).
- Death (`check_for_death`, 3544-3553): when damage is above zero and hit points minus damage is zero or less, the dead flag is set. The special pid 16777224 is exempt (3546).
- Random source (roll.cc 130-175): `ran1` is a Park-Miller style generator with a 32-entry shuffle table (132-148). It is seeded from the timer at start (154). `roll_set_seed` sets a seed for a run (159-167). `roll_random(min, max)` is `min + ran1(max - min + 1)` (111-127).

## 2. Key functions

- `determine_to_hit_func`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combat.cc` 3223-3354. Accuracy from skill, range, cover, traits, strength, armour class, location, light, knockdown and difficulty, capped at 95.
- `compute_attack`: same file 2781-2945. Range gate, to-hit, d100 roll, perk changes, result switch, ranged miss, death checks.
- `attack_crit_success`: same file 3045-3100. Crit banding, table lookup, massive crit, multiplier.
- `compute_damage`: same file 3357-3460. Per-round damage: multiplier, difficulty, threshold, resistance, knockback distance.
- `apply_damage` and `check_for_death`: same file 3476-3553.
- `roll_check`, `roll_check_critical`, `roll_random`, `ran1`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/roll.cc` 66-173.
- `item_w_damage`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` 1052-1080.
- `action_knockback`, `show_damage_to_object`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/actions.cc` 108-142, 263-352.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit is a d100 under an accuracy number, with the accuracy capped | Cap 95 (`combat.cc` 3345); no floor |
| Crit from the margin: a second d100 at margin/10 plus a crit stat | Divisor 10 (`roll.cc` 101); crit stat plus the location penalty (2820-2821) |
| Fumble from the margin below zero: a second d100 at (-margin)/10 | Divisor 10 (`roll.cc` 92) |
| Penalty table per location (head -40 and eyes -60 at the extreme) | `hit_location_penalty` (`combat.cc` 104-113); melee takes half (3302) |
| Range penalty per tile, with a perception-based zero point | -4 per tile (3267), -12 when blind (3265), zero at twice perception (3255) |
| Flat threshold first, percent resistance second | Threshold and resistance per target stat (3396, 3399, 3438, 3441) |
| Crit effect bands | Bands at 20, 45, 70, 90, 100 (3059-3067) with multipliers from a table (1387-1392 for the head row) |
| Damage multiplier with a halving divisor | Default 2 then halved (2814, 3435): x1; sneak 4 (2843): x2 |
| Difficulty percent on enemy damage | 75 easy, 125 hard (3424, 3427); enemy accuracy -20 / +20 (3337, 3340) |
| Knockback distance from damage | Damage over 10 (3455), over 5 with a perk (3453) |
| Weapon roll with a stat added to the top | `roll_random(min, bonus + max)` (item.cc 1079) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: cap accuracy, d100 roll, fumble or crit from the margin (only when crits are enabled, which stands in for the day gate), then a weapon roll with the stat added to the top, multiplier with the halving, difficulty percent, flat threshold, then percent resistance. It omits the range, cover, location, light, trait, strength, perk, script and knockdown terms (all folded into `accuracy` by the caller), the crit tables and their flags and massive checks (the crit multiplier is a placeholder), the burst rounds, the critical-failure effects (reported as `fumble` with no effect), the knockback, the death check, the special-object exemptions and the action-point cost. The donor's zero floor is kept: a hit that deals zero is still reported as a hit, as in the donor (the hit flag is set before damage is computed).

```ts
// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch of the shape only; no donor line is reproduced.
export interface Dice {
  // uniform integer in [0, n)
  below(n: number): number;
}

export interface Attacker {
  accuracy: number;        // skill and modifiers, before the cap
  critChance: number;      // added to the margin above the roll
  minDamage: number;
  maxDamage: number;
  meleeStat: number;       // added to the top of the damage roll
  critMultiplier: number;  // from a crit table in the real game; placeholder here
}

export interface Defender {
  damageThreshold: number; // flat, subtracted first
  damageResistance: number; // percent, taken from what remains
}

export interface Swing {
  outcome: 'miss' | 'hit' | 'crit' | 'fumble';
  damage: number;
}

const ACCURACY_CAP = 95;

export function resolveHit(a: Attacker, d: Defender, dice: Dice, critsEnabled: boolean, difficultyPercent: number): Swing {
  const accuracy = Math.min(a.accuracy, ACCURACY_CAP);
  const roll = dice.below(100) + 1;              // d100
  const delta = accuracy - roll;                 // margin above the roll

  if (delta < 0) {
    const fumble = critsEnabled && dice.below(100) + 1 <= Math.trunc(-delta / 10);
    return { outcome: fumble ? 'fumble' : 'miss', damage: 0 };
  }

  const crit = critsEnabled && dice.below(100) + 1 <= Math.trunc(delta / 10) + a.critChance;
  const multiplier = crit ? a.critMultiplier : 2;   // 2 means x1 after the halving below

  const raw = a.minDamage + dice.below(a.maxDamage + a.meleeStat - a.minDamage + 1);
  let dmg = Math.trunc((raw * multiplier) / 2);
  dmg = Math.trunc((dmg * difficultyPercent) / 100);
  dmg -= d.damageThreshold;
  if (dmg > 0) {
    dmg -= Math.trunc((dmg * d.damageResistance) / 100);
    if (dmg > 0) {
      return { outcome: crit ? 'crit' : 'hit', damage: dmg };
    }
  }
  return { outcome: crit ? 'crit' : 'hit', damage: 0 };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hit.ts` (new module, engine duel step): `resolveHit` is the one place a swing is rolled and mitigated; the caller passes the accuracy already built from skill and gear, and the mitigation numbers are per target. Parity-checklist row 1 (duel step / sim).
- today: not checked. This reader did not open the Frankendom repo.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, restricted; clean-room, shape only)
- Brief rule served: 1 (one engine: one d100 per swing, resolved on the server); rules 7-9 n/a

## 6. Gaps and risks

- Licence: the donor is under the Sustainable Use License 1.0, which allows only internal business or non-commercial use and free non-commercial distribution. Only the shape is taken. No donor line, table or message is reproduced.
- Day gate: crits and fumbles exist only after the first in-game day (`roll.cc` 90, 99). That is a campaign rule, not a duel rule. Frankendom should use a config flag, and the sketch's `critsEnabled` is that flag.
- Multiplier encoding: the donor writes a default of 2 and halves it (2814, 3435), so the visible multiplier is x1. Frankendom should store multipliers as plain numbers (1.0, crit multipliers) and not copy the halving.
- Knockback is a presentation step: the donor moves the defender with an animated move from the presentation layer (`actions.cc` 137-138, 346). In Frankendom the server owns position; a knockback distance would have to be a server-side displacement that the client plays, not a client decision. Do not copy the layer split.
- Timing: the donor applies health when the combat animation ends (`combat.cc` 4106), so damage waits for the animation. Frankendom's server tick must resolve the swing on the tick and send the result; the animation is a client view of it.
- Random source: `ran1` is shared and seeded from the clock by default (roll.cc 154); `roll_set_seed` (159) exists. Frankendom needs one seeded stream per fight for replay (row 19), not a process-wide generator.
- Redundancy: the Slayer and Silent Death checks appear twice (2832-2847 and 2848-2861). Both set the same values, so there is no double effect here, but Frankendom must not copy the duplication.
- Unidentified special case: pid 16777224 forces a crit multiplier of 2 (3048-3050) and is exempt from death (3546). What that object is was not identified; do not copy the exemption.
- Critical failure: `attack_crit_failure` (3103-3189) was not read, so the effects of a critical failure are unknown here. The sketch reports `fumble` with no effect.
- Many-on-one: this file has no hate list, target choice or attacker cap. MAX_ATTACKERS = 3 and many-on-one logic are not covered by these functions.
- Not read: `combat_is_shot_blocked` (cover modifier), `attack_crit_failure`, the crit table rows other than the head, `compute_spray`, `check_ranged_miss`, the initiative and turn order.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** to-hit chain and 95 cap (combat.cc 3345), no floor, roll_check/roll_check_critical (delta, /10, day gate at roll.cc 90/99), crit modifier = crit stat - location penalty (2821), crit bands 20/45/70/90/100 (3059-3071), pid 16777224 special cases, damage order (mult, /2, difficulty %, threshold, then % resistance, 3433-3441), item_w_damage, knockback /10 or /5, ran1/seed, hit_location_penalty table, head crit row, licence text: all verified.

**Missed:** jinxed only converts ROLL_FAILURE (2825-2829) and burst weapons bypass roll_check via compute_spray (2817-2818), both partially covered; nothing important missed
