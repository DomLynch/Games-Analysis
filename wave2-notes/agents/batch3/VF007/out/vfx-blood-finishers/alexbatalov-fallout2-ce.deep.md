# alexbatalov-fallout2-ce (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/actions.cc` | Licence: Sustainable Use License 1.0 (`LICENSE.md`; opening read only: use and change limited to internal business or non-commercial/personal use, distribution limited) | C++ (.cc, C-style) | symbols `_pick_death`, `_check_death`, `_action_blood`, `_map_age_dead_critters`, `_correctDeath`, `_obj_fix_violence_settings`

Checked: read in full: `_pick_death` (actions.cc 183-257: weapon and perk thresholds 185-205, species and melee group 223, tier choice 239-246, back-hit fix 252, final check 256), `_check_death` (260-281). `_map_age_dead_critters` (map.cc 1091-1200 read; the blood-pool block 1170-1190). `_correctDeath` (interpreter_extra.cc 2332-2360) and the scripted kill loop (2384-2420). `_obj_fix_violence_settings` (object.cc 5094-5135, range cases from 5110). Aging gate (worldmap.cc 2834-2836; the parse at 2674; flag at worldmap.h:12). Callers: `_pick_death` has one caller (actions.cc 313). `_map_age_dead_critters` has one caller (map.cc 1068, map load). `_correctDeath` has two callers (interpreter_extra.cc 2412 and 3388); I read 2412 only. (not read): callers of `_obj_fix_violence_settings`; the body of `_critter_heal_hours`; how `weaponGetDamageType` and `weaponGetPerk` decide; the parse context around worldmap.cc 2674 beyond the flag line; where the DAM_DEAD flag is set. camera_scope: not a camera cell. Confidence: high on `_pick_death` and `_check_death` (read in full, order checked); high on the aging gate and blood-pool frame; medium on the scripted-kill path (read but not traced to every caller). The list hint was "INFERRED", not a file; the file was found by grep for blood, gore and death terms.

Best transferable idea: a severity variant is chosen from damage and damage type through a base rule table, and the table is overridden per weapon or perk before the rule runs, so a flame weapon or a fire perk changes the thresholds as data rather than as code.
Decision (proposed): adapt - Frankendom takes the per-weapon threshold overrides as data on the weapon (a fire kill can carry its own mid and heavy thresholds), applied in a fixed order (base, weapon, perk, weapon divisor), feeding the same tier choice as the Fallout 1 note; the code is not used (restricted licence) and the server sends the kill with damage, type and the weapon tags.
Acceptance: a server-confirmed fire-type kill from a weapon tagged with mid 5 and heavy 15 plays the heavy fire clip at damage 15 if the clip exists; a server test asserts that the thresholds apply in the order base, weapon, perk, weapon divisor, and that the kill outcome is the same at every client setting.

## 1. Mechanism

- The death choice is made in `_pick_death` (actions.cc 183), called once per killing hit from the attack path (313). It starts with base thresholds: mid 15 and heavy 45 (185-186).
- Thresholds are then overridden in this order (not read as one block; it is in the function body):
  (a) Molotov cocktail: mid 5, heavy 15, and the damage type becomes fire (190-193; the animation is also set to fire-single at 194, which keeps it out of the melee group).
  (b) Pyromaniac perk for the player with fire damage: mid 1 and heavy 1 (197-199).
  (c) Flameboy weapon perk: both thresholds divided by 3 (202-204; integer division).
- Melee group: kicks, thrusts, swings, punches with normal damage type, and throws that are not explosions (223-227). Only the bloody-mess trait with maximum violence changes the death, to big hole (228-229). Otherwise the default fall back stays.
- Fire-single normal shots (232-235): maximum violence with the trait or damage at or above heavy gives big hole; otherwise the fall back stays.
- Other attacks: if violence is above minimal and (trait or damage >= mid) (239), then if violence is above normal and (trait or damage >= heavy) (240), take the heavy death for the damage type (241); keep it only if `_check_death` at maximum violence keeps it (242), else use the mid death (243). Otherwise the mid death directly (246).
- A fall back against a victim not hit from the front becomes a fall front (252-253).
- Final: `_check_death` with minimum violence none (256).
- `_check_death` (260): keeps the wanted animation only if violence >= minimum and the art exists (264-266). Otherwise a front hit gets a fall back (271); a back hit gets a fall back if the fall-front art exists, else a fall front (as in the Fallout 1 donor; read literally).
- Blood is the bloody fall variant (`_action_blood`, 157), swapped in after a knockback or pick-fall (319) and for a prone victim that dies (440), gated by violence.
- Violence setting (object.cc 5094): the gore range is replaced by standard falls by setting: none up to the bloody fall front (5110-5112), minimal up to fire dance, normal up to sliced in half; maximum replaces nothing (5131 replace with a fall back or fall front).
- Corpse aging on map load (map.cc 1091): gated first by a per-map flag `MAP_DEAD_BODIES_AGE` (worldmap.cc 2834-2836; the flag value is 0x02 in worldmap.h:12; set from the world map config key `dead_bodies_age`, worldmap.cc 2674). Living non-robot critters heal for the hours away unless flagged no-heal (1109-1110). Past 6 days (1117), dead non-robot critters without the no-heal flag are removed; each becomes a blood-pool object (0x5000004) on its tile (1170), after its items are dropped unless flagged no-drop (1165-1166). Past 14 days the misc object 0x500000B is also removed (1147).
- Blood-pool frame (1180-1186): random 0-3, plus 6 for a flat critter (flag CRITTER_FLAT, obj_types.h:100 = 0x800), else plus 3 unless the kill type is rat or mantis.
- Scripted kill (interpreter_extra.cc 2384-2420): with death frame 1, each victim takes the next animation from a list of blood-variant falls and gore anims, cycled by `ftIndex` (2393, 2412), through `_correctDeath` (2332): standard falls below maximum violence or when art is missing (2336).

## 2. Key functions

- `_pick_death`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/actions.cc` 183-257. Base thresholds, weapon and perk overrides, melee group, tiers, fallbacks.
- `_check_death`: same file, 260-281. Keep the wanted art if allowed, else a standard fall.
- `_action_blood`: same file, 157-180. Bloody fall swap, gated by violence.
- `_map_age_dead_critters`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/map.cc` 1091 onward (read to 1200). Per-map gated corpse aging into blood pools.
- `wmMapDeadBodiesAge`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc` 2834-2836. The per-map flag test.
- `_correctDeath`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/interpreter_extra.cc` 2332-2360.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Base severity thresholds: mid at 15, heavy at 45 | 15 (actions.cc:185), 45 (186) |
| A weapon can override both thresholds | molotov mid 5, heavy 15 (191-192) |
| A perk can set both thresholds to 1 for fire | pyromaniac, fire type only (198-199) |
| A weapon perk divides both thresholds by 3 | flameboy, integer division (203-204) |
| Thresholds apply after the base; order is base, weapon, perk, divisor | the order of the blocks (190, 197, 202) |
| Tier tables per damage type, normal and heavy | `gNormalDeathAnimations` (actions.cc:55), `gMaximumBloodDeathAnimations` (66) |
| Corpses age only on maps with the flag | flag 0x02 (worldmap.h:12); set from config key `dead_bodies_age` (worldmap.cc:2674) |
| Aging thresholds in game hours | 6 * 24 = 144 (map.cc:1117); 14 * 24 = 336 (the second branch) |
| Blood-pool frame offsets | +6 flat (1181-1182); +3 non-rat/mantis (1184-1186); random 0-3 (1180) |
| Hour length | `GAME_TIME_TICKS_PER_HOUR` (defined in the donor's scripts header; value not read) |

## 4. TypeScript sketch

simplified: keeps the donor order for the death choice: threshold overrides first (molotov, then the pyromaniac fire rule, then the flameboy divisor), then the melee group (a punch counts only with the normal damage type; a molotov is treated as fire-single), the single-shot-normal rule, the mid and heavy tiers with the drop from heavy to mid when heavy art is missing, the back-hit fix, and the final check. Omitted: the special-death critters, the knockback and fire-dance branches, sound and physics, item drops and object creation, healing, and the scripted kill. The aging and blood-pool functions are the donor's rules as plain functions; the flag is an input.

```ts
// Licence: Sustainable Use License 1.0 (donor; restricted). Clean-room sketch of the mechanism; not a translation.
// clean-room
export const VIOLENCE_NONE = 0;
export const VIOLENCE_MINIMAL = 1;
export const VIOLENCE_NORMAL = 2;
export const VIOLENCE_MAX = 3;

export const DAMAGE_TYPE_NORMAL = 0;
export const DAMAGE_TYPE_FIRE = 2;
export const DAMAGE_TYPE_EXPLOSION = 6;

export type Anim = string;
export type AttackKind = 'punch' | 'kick' | 'thrust' | 'swing' | 'throw' | 'fireSingle' | 'other';

export interface KillHit {
  damage: number;
  damageType: number;
  attackKind: AttackKind;
  hitFromFront: boolean;
  attackerIsPlayer: boolean;
  bloodyTrait: boolean;      // attacker is the player and has the bloody-mess trait
  molotov: boolean;          // thrown weapon is the molotov cocktail
  flameboy: boolean;         // weapon carries the flameboy perk
  pyromaniac: boolean;       // attacker is the player with the pyromaniac perk
}

export interface Victim {
  hasArt(anim: Anim): boolean;
}

export interface DeathTables {
  tier2: readonly Anim[]; // mid-severity death per damage type
  tier3: readonly Anim[]; // heavy-severity death per damage type
}

export interface Thresholds { mid: number; heavy: number; }

// Donor order: molotov sets fire and its own thresholds; pyromaniac fire sets both to 1; flameboy divides by 3.
export function thresholdsFor(hit: KillHit, base: Thresholds): { thresholds: Thresholds; damageType: number } {
  let mid = base.mid;
  let heavy = base.heavy;
  let damageType = hit.damageType;
  if (hit.molotov) {
    mid = 5;
    heavy = 15;
    damageType = DAMAGE_TYPE_FIRE;
  }
  if (hit.attackerIsPlayer && hit.pyromaniac && damageType === DAMAGE_TYPE_FIRE) {
    mid = 1;
    heavy = 1;
  }
  if (hit.flameboy) {
    mid = Math.trunc(mid / 3);
    heavy = Math.trunc(heavy / 3);
  }
  return { thresholds: { mid, heavy }, damageType };
}

// Keep the variant only if the violence setting allows it and the art exists; otherwise a standard fall.
export function checkDeath(v: Victim, anim: Anim, minViolence: number, violence: number, hitFromFront: boolean): Anim {
  if (violence >= minViolence && v.hasArt(anim)) {
    return anim;
  }
  if (hitFromFront) {
    return 'fallBack';
  }
  return v.hasArt('fallFront') ? 'fallBack' : 'fallFront';
}

export function pickDeath(hit: KillHit, v: Victim, violence: number, tables: DeathTables, base: Thresholds): Anim {
  const { thresholds, damageType } = thresholdsFor(hit, base);
  const bloody = hit.bloodyTrait;
  // Donor sets the molotov's animation to fire-single as well as its damage type.
  const kind: AttackKind = hit.molotov ? 'fireSingle' : hit.attackKind;

  const isMeleeGroup = kind === 'kick' || kind === 'thrust' || kind === 'swing'
    || (kind === 'punch' && damageType === DAMAGE_TYPE_NORMAL)
    || (kind === 'throw' && damageType !== DAMAGE_TYPE_EXPLOSION);

  let death: Anim = 'fallBack';
  if (isMeleeGroup) {
    if (violence === VIOLENCE_MAX && bloody) {
      death = 'bigHole';
    }
  } else if (kind === 'fireSingle' && damageType === DAMAGE_TYPE_NORMAL) {
    if (violence === VIOLENCE_MAX && (bloody || hit.damage >= thresholds.heavy)) {
      death = 'bigHole';
    }
  } else if (violence > VIOLENCE_MINIMAL && (bloody || hit.damage >= thresholds.mid)) {
    if (violence > VIOLENCE_NORMAL && (bloody || hit.damage >= thresholds.heavy)) {
      death = tables.tier3[damageType];
      if (checkDeath(v, death, VIOLENCE_MAX, violence, hit.hitFromFront) !== death) {
        death = tables.tier2[damageType];
      }
    } else {
      death = tables.tier2[damageType];
    }
  }

  if (!hit.hitFromFront && death === 'fallBack') {
    death = 'fallFront';
  }
  return checkDeath(v, death, VIOLENCE_NONE, violence, hit.hitFromFront);
}

// Corpse aging on map load. The flag is per map (the world map record), not per zone code.
export function agingStage(hoursAway: number, mapAgesBodies: boolean): number {
  if (!mapAgesBodies || hoursAway === 0) {
    return 0;
  }
  if (hoursAway > 14 * 24) {
    return 2; // corpses and the fourteen-day misc object
  }
  if (hoursAway > 6 * 24) {
    return 1; // corpses become blood pools
  }
  return 0;
}

// Blood pool frame: a random 0-3, plus 6 for flat critters, else plus 3 unless rat or mantis.
export function bloodPoolFrame(roll0to3: number, flatCritter: boolean, ratOrMantis: boolean): number {
  if (flatCritter) {
    return roll0to3 + 6;
  }
  return ratOrMantis ? roll0to3 : roll0to3 + 3;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copied to /tmp/VF007-fallout2-death.ts with `export {}` appended), exit 0.

## 5. Lands in

- TARGET `src/fight/finisher.ts`: the engine sends the kill with damage, damage type and weapon tags (server-verified); the client picks the death clip and applies the threshold overrides from the weapon data. Parity-checklist row 9 (finishers).
- Frankendom side: not checked in this pass (no repo access here).
- Reuse tag: adapt-from-idea (restricted licence: Sustainable Use License 1.0; no code, shape only)
- Brief rule served: 1 (one engine: the kill is decided once by the server; the client only chooses presentation); server-verified kills (the variant follows the server's kill event, including the weapon's threshold overrides)

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 limits use to internal business or non-commercial use and limits distribution. Clean-room, shape only.
- The threshold overrides are weapon and perk data in the donor, but the order matters: molotov first, then the pyromaniac rule (which only fires after the molotov's fire type), then the flameboy divisor. A test should pin that order.
- Integer division by 3 (flameboy) makes small thresholds collapse (for example 5 becomes 1). Frankendom must decide the rounding per field rather than inherit it.
- Corpse aging to blood pools is world logic keyed to game hours and a per-map flag. It belongs to zone data (despawn and corpse rules, row 23 or row 8) and is not written up as a finisher; the per-map flag is a zone-data field, not an engine constant.
- The back-hit fallback in `_check_death` is the same as in the Fallout 1 donor and looks odd when read literally. Not copied.
- The bloody-mess trait and the pyromaniac perk change presentation only in Frankendom. They must never change the kill, the damage, or the loot.
- The violence setting is a player preference. Frankendom keeps it client-only: the same server kill must give the same outcome at every setting.
- Callers of `_obj_fix_violence_settings` were not read. The function's use in the donor's other paths is not confirmed.
