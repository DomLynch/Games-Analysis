# alexbatalov-fallout1-ce (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/actions.cc` | Licence: Sustainable Use License 1.0 (`LICENSE.md`; opening read only: use and change limited to internal business or non-commercial/personal use, distribution limited) | C++ (.cc, C-style) | symbols `pick_death`, `check_death`, `show_damage_to_object`, `action_blood`, `map_age_dead_critters`, `correctDeath`, `obj_fix_violence_settings`

Checked: read in full: `pick_death` (actions.cc 174-226), `check_death` (229-252), `show_damage_to_object` death branch (263-368, including the knockback and blood calls at 286, 295 and the prone-kill call at 368; the weapon block after it was not read), `action_blood` (145-171), death tables (declared at 68 and 79), attack call site (430-445). `map_age_dead_critters` (map.cc 1108-1214, including the blood-pool replacement at 1182-1211). `correctDeath` (intextra.cc 1920-1950) and `op_kill_critter_type` (1954-2030). `obj_fix_violence_settings` (object.cc 4838-4885). Violence enum (gconfig.h 104-108), default (options.cc 1817), damage types (proto_types.h 60-67). Callers: `pick_death` has one caller (actions.cc 280, inside `show_damage_to_object`). `show_damage_to_object` has seven call sites in the attack code (439-533); I read only the first (439-449). `map_age_dead_critters` has one caller (map.cc 1098, map load). `correctDeath` has two callers (intextra.cc 2005, 2745); I read 2005 only. (not read): how `attack->defenderDamage` is computed upstream; `item_w_damage_type`; where the DAM_DEAD flag is set; `critter_heal_hours` body; the blood-pool art; the meaning of proto flag 0x800; `obj_fix_violence_settings` callers at object.cc 526 and 3317. camera_scope: not a camera cell. Confidence: high on `pick_death` and `check_death` (read in full, order checked); medium on the scripted-kill path (read but not traced to every caller).

Best transferable idea: pick a severity variant from the hit's damage and damage type by a fixed rule table, drop one tier when the variant is missing, end on a standard fall, and gate the heavy variant by a player presentation setting.
Decision (proposed): adapt - Frankendom keeps the shape for the Pit finisher: tier by damage and damage type, fall back when the clip is missing, gate heavy presentation by a setting; the donor's code is not used (restricted licence), and the server sends the kill with damage and type, so the client picks the clip and never decides the kill.
Acceptance: a server-confirmed kill with damage 45 or more plays the heavy finisher clip for that damage type if the clip exists, otherwise the mid clip, and a minimal-setting client never plays the heavy clip; a server test asserts the kill event carries damage and damage type and that the kill outcome is the same whatever the client setting.

## 1. Mechanism

- Death is decided in the attack code, then presentation is chosen. `show_damage_to_object` (actions.cc 263) gets the damage and flags. When the victim is not prone and the death flag is set, it calls `pick_death` (280). It does not use a separate finisher; the death animation is the finisher.
- `pick_death` (174) order of rules, with the violence setting read from config first:
  (a) Melee-type attacks (punch, kick, thrust, swing, throw; 192-196): big-hole death only at maximum violence with the bloody-mess trait (197-199); otherwise a plain fall back.
  (b) One-shot normal-type gun shot (`ANIM_FIRE_SINGLE` and damage type normal): big-hole death at maximum violence if the trait is held or damage is at least 45 (203-205); otherwise a fall back.
  (c) Any other attack: if violence is above normal and (trait or damage >= 45) (209): take the heavy death for the damage type from `death_3` (210); if `check_death` at maximum violence does not keep it (211), use the mid death `death_2` (212). Else if violence is above minimal and (trait or damage >= 15) (214): mid death `death_2` (215). Else a fall back.
  (d) A fall back against a victim not hit from the front becomes a fall front (221-223).
  (e) Final: `check_death` with minimum violence none (225).
- `check_death` (229) keeps the wanted animation only if violence >= the animation's minimum and the art exists (235-237). Otherwise: a front hit gets a fall back (242); a back hit gets a fall back if the fall-front art exists, else a fall front (244-251; read literally, the code is odd here and the reason is not clear from the code).
- Blood is a bloody variant of the fall, not a separate effect. `action_blood` (145) swaps a fall back or fall front for its `_BLOOD` twin (156 region) when that art exists, and does nothing at violence none (150). It is called after a knockback or a pick-fall (286, 295) and for a prone victim that dies (368).
- Violence setting (object.cc 4838): when the fix path runs, gore-range death animations are replaced by standard falls. The range end depends on the setting: none covers up to the bloody fall front (4856-4858); minimal and normal stop earlier; maximum replaces nothing (4876-4877 replace with a fall back or a fall front).
- Corpses age on map load (map.cc 1108). Living non-robot critters heal for the hours away (1127). Past 6 days (144 game hours, 1134-1135), dead non-robot critters are removed, and each one leaves a blood-pool object on its tile (1184, 1196) with a random frame 0-3 (1201), plus 3 unless the kill type is rat or mantis (1205-1207), plus 6 if the proto flag 0x800 is set (1202-1203). Items on the corpse are dropped first, for normal critters (1185). Past 14 days, a specific misc object (pid 0x500000B) is also removed (1164). The meaning of 0x800 is not read.
- Scripted kill (intextra.cc 1954): with death frame 1, each victim gets the next animation from an 11-entry cycle (1957; the index wraps at 11, 2008), passed through `correctDeath` (1920), which returns a standard fall when violence is below maximum or the art is missing (1927-1932). Death frame 0 erases with no animation; any other value uses a back-fall. The routine stamps `lastVisitTime` (2027).

## 2. Key functions

- `pick_death`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/actions.cc` 174-226. Severity tiers by damage and type, violence and trait gates, art fallback.
- `check_death`: same file, 229-250. Keep the wanted art if allowed, else a front or back standard fall.
- `show_damage_to_object`: same file, 263-300 (death branch); 368 (prone kill). Chooses death, then blood.
- `action_blood`: same file, 145-171. Bloody fall variant swap, gated by violence.
- `map_age_dead_critters`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/map.cc` 1108-1214. Time-based corpse aging into blood pools.
- `correctDeath`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/int/support/intextra.cc` 1920-1950. Gore-or-standard choice for scripted kills.
- `obj_fix_violence_settings`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/object.cc` 4838-4885. Replaces gore animations when the setting is low.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A tier rule by damage: below the mid threshold a standard fall; from the mid threshold a mid variant; from the heavy threshold a heavy variant | 15 (mid, actions.cc:214) and 45 (heavy, actions.cc:209, 203) |
| Per-damage-type variant tables, one entry per type (7 types) | `death_2` (actions.cc:68), `death_3` (79); types 0-6 (proto_types.h:60-66) |
| Missing heavy art drops one tier to the mid variant | none (211-212) |
| Presentation is gated by a player setting with levels 0-3, default 3 | 0 none, 1 minimal, 2 normal, 3 maximum blood (gconfig.h:104-107; options.cc:1817) |
| A trait can raise severity regardless of damage | `TRAIT_BLOODY_MESS` (actions.cc:187) |
| A missing front/back art has a fixed fallback | front hit: fall back (242-243); back hit: fall back if fall-front art exists, else fall front (244-251) |
| Corpses age out after a time with a blood mark left behind | 144 game hours (1134); blood frame 0-3 +3 (non-rat/mantis) +6 (flag 0x800) (1201-1207) |
| Game hour length | `GAME_TIME_TICKS_PER_HOUR` = 60*60*10 (scripts.h:18) |

## 4. TypeScript sketch

simplified: keeps the donor order for the death choice: melee and single-shot rules first, then the heavy tier (with the drop to mid when heavy art is missing), then the mid tier, then the front/back fall fix, then the final art check. The donor reads the violence setting from config on each call; the sketch takes it as a parameter. The trait is a boolean argument; the caller computes single-shot-normal from the weapon. Omitted: the special PIDs that always explode, the knockback and fire-dance branches, the blood-variant swap (`action_blood`), the physics and sound calls, the corpse aging, the scripted-kill cycle, and the donor's odd back-hit fallback (the sketch uses the front-facing rule for both, a deliberate change; see Gaps). The tables are data passed in; the values shown are the donor's list of names.

```ts
// Licence: Sustainable Use License 1.0 (donor; restricted). Clean-room sketch of the mechanism; not a translation.
// clean-room
export const VIOLENCE_NONE = 0;
export const VIOLENCE_MINIMAL = 1;
export const VIOLENCE_NORMAL = 2;
export const VIOLENCE_MAX = 3;

export type Anim = string;

export interface DeathHit {
  damage: number;            // damage dealt by this hit
  damageType: number;        // index into the tables (0..6 in the donor)
  melee: boolean;            // punch, kick, thrust, swing or throw
  singleShotNormal: boolean; // one-shot gun with normal damage type (caller computes this)
  bloodyTrait: boolean;      // attacker has the bloody-mess trait
  hitFromFront: boolean;
}

export interface Victim {
  hasArt(anim: Anim): boolean; // art exists for this creature, facing and animation
}

export interface DeathTables {
  tier2: readonly Anim[]; // mid-severity death per damage type
  tier3: readonly Anim[]; // heavy-severity death per damage type
}

export interface DeathTuning {
  tier2Damage: number; // 15 in donor
  tier3Damage: number; // 45 in donor
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

export function pickDeath(hit: DeathHit, v: Victim, violence: number, tables: DeathTables, tune: DeathTuning): Anim {
  let death: Anim;
  if (hit.melee) {
    death = violence === VIOLENCE_MAX && hit.bloodyTrait ? 'bigHole' : 'fallBack';
  } else if (hit.singleShotNormal) {
    death = violence === VIOLENCE_MAX && (hit.bloodyTrait || hit.damage >= tune.tier3Damage) ? 'bigHole' : 'fallBack';
  } else if (violence > VIOLENCE_NORMAL && (hit.bloodyTrait || hit.damage >= tune.tier3Damage)) {
    death = tables.tier3[hit.damageType];
    if (checkDeath(v, death, VIOLENCE_MAX, violence, hit.hitFromFront) !== death) {
      death = tables.tier2[hit.damageType]; // heavy art missing: use the mid tier
    }
  } else if (violence > VIOLENCE_MINIMAL && (hit.bloodyTrait || hit.damage >= tune.tier2Damage)) {
    death = tables.tier2[hit.damageType];
  } else {
    death = 'fallBack';
  }

  if (!hit.hitFromFront && death === 'fallBack') {
    death = 'fallFront';
  }
  return checkDeath(v, death, VIOLENCE_NONE, violence, hit.hitFromFront);
}

export const DONOR_TABLES: DeathTables = {
  tier2: ['dancingAutofire', 'slicedInHalf', 'charred', 'charred', 'electrify', 'fallBack', 'bigHole'],
  tier3: ['chunksOfFlesh', 'slicedInHalf', 'fireDance', 'meltedToNothing', 'electrifiedToNothing', 'fallBack', 'explodedToNothing'],
};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copied to /tmp/VF007-fallout1-death.ts with `export {}` appended), exit 0.

## 5. Lands in

- TARGET `src/fight/finisher.ts`: the engine sends the kill with damage and damage type (server-verified); the client chooses the death clip from that. Parity-checklist row 9 (finishers).
- Frankendom side: not checked in this pass (no repo access here).
- Reuse tag: adapt-from-idea (restricted licence: Sustainable Use License 1.0; no code, shape only)
- Brief rule served: 1 (one engine: the kill is decided once by the server; the client only chooses presentation); server-verified kills (the variant follows the server's kill event)

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 limits use to internal business or non-commercial use and limits distribution. Clean-room, shape only; no code reuse.
- The blood here is a bloody variant of the death animation and a persistent blood-pool object left by corpse aging. The aging is time-based world logic over six and fourteen game days, which fits zone population and corpse despawn more than a fight; if Frankendom wants that, it is a separate row 8 or row 23 note, not written up in this cell.
- The thresholds 15 and 45 are absolute damage values on Fallout's damage scale. Frankendom's damage numbers differ, so the tiers must be data fields scaled to our damage, not copied.
- The bloody-mess trait changes severity regardless of damage. In Frankendom this can only be a presentation flag; it must never change the kill, the damage or the loot.
- The violence setting is a player preference. Frankendom must keep it client-only: the same server kill must give the same outcome at every setting.
- The donor's back-hit fallback in `check_death` looks inverted (a back hit returns a fall back when the front fall art exists). Not copied; the sketch uses one front/back rule for both. A test should pin whichever rule Frankendom picks.
- The donor computes the kill and the death choice in one local call. Frankendom must not let the client decide "dead"; the variant is chosen after the server's kill event.
- Scripted kills (intextra.cc 1954-2030) are a separate path with an 11-entry cycle; not in the sketch.
