# DCurrent-openbor: hit-feedback-stack (HF001)

Donor: /mnt/frankendom-donors/DCurrent-openbor (VPS, read only). Engine half only.
Depth: thin. The order and formulas were read in full from the engine. The tuned numbers are absent: media/ holds only _DUMMY, so there is no module data pack with real hit values.
Half read: client (engine: engine/openbor.c, engine/openbor.h, engine/source/openborscript/). Data pack (module scripts that set the per-move values): not in this repo (not read).
Asset audit: /private/tmp/p2/wave2-haiku/batch3/AU014/DCurrent-openbor.assets.md (class C, no art used here).

## 1. What the player sees and feels

When a punch lands, a small flash sprite pops on the contact spot, and the hit sound plays with its pitch dropping as the attack gets heavier, so a big hit sounds lower and more solid. Both fighters pause for a few frames, the attacker only if it is not already in a pause or is airborne, so a combo does not freeze the attacker over and over. A freeze attack locks the target in place and can tint it into a frozen palette. A landing bounce shakes the whole screen for a few frames. A move with a frame-based quake gives a rhythmic screen shake, with repeated offsets over several frames.

## 2. Why it works, or why it is striking

- Readable at 375 wide: a contact flash plus a short pause is one clear beat, with no animation needed.
- One signature behaviour: the attacker's pause is gated (only if not already paused, or airborne), which keeps multi-hit combos from freezing forever.
- One signature sound: the hit sound drops in pitch with damage, a cheap and strong heaviness cue.
- Could be ours at 20-30 percent resemblance: keep the gated attacker pause and the damage-to-pitch curve, change the flash shape, palette and sound set.

## 3. The rule behind it

Order for one hit (openbor.c, the normal-hit branch, 31690-31745; hit sound at 31931):

1. The hit is first tested for block (didblock), then counter, then takedamage (31690-31692).
2. On a normal hit: the didhit script runs, hit_count goes up, lasthit is set, all just before the flash.
3. Contact flash: spawn_attack_flash(target, attack, flash.model_hit, ...) at 31716. The spawn is skipped when no_flash is set (30818).
4. Combo timer is set on the owner, just after the flash.
5. Attacker pause, only when the attacker is not already paused (pausetime < _time) or is in the air (31722). It adds pause_add to toss_time, nextmove, nextanim, nextthink and pausetime (31724-31733).
6. Target pause, always: pause_add is added to toss_time, nextmove, nextanim and nextthink (31736-31742). Because this is always added, each extra hit on a target adds more freeze.
7. Hit sound at 31931, speed set by the formula below.
8. Freeze and palette effects: checkdamageeffects (37003-37060). If the attack freezes and the target is not already frozen, set frozen=1, and set freezetime = _time + freezetime only if freezetime is currently 0 (37050). A forcemap remaps the palette for maptime.

Hit-sound playback speed (play_hit_impact_sound, 31953-32010):
- speed = 100 - (attack_force - 5), clamped to 60 to 100 (defines at 31956-31958; formula at 32006).
- With noslowfx set, speed is always 100.
- Read as: light hits play at near-normal pitch, the heaviest hits drop to 60 percent speed.

Shake:
- Bounce: level->quake = 4 on a bounce, unless the model sets QUAKE_CONFIG_DISABLE_SCREEN (32381; enum at openbor.h 3138-3143).
- Frame quake from the animation: quakeframe has framestart, repeat, v (openbor.h 2546-2552; parsed at openbor.c 20709-20713). Each repeat sets level->quake to v. When v is negative, the sign flips on even repeat counts (28162-28181). When v is positive the sign stays positive.

Data fields (designer-tunable; donor value only because BSD-3):

| name | unit | donor_value_or_null |
|---|---|---|
| hitstop_attacker_ticks | engine _time ticks (unit not verified) | null (pause_add per collision; no tuned values in repo) |
| hitstop_target_ticks | engine _time ticks (unit not verified) | null (pause_add, always added) |
| hitsound_speed_base | percent | 100 (openbor.c 32006) |
| hitsound_speed_offset | damage points before the slope starts | 5 (PLAYBACK_SPEED_MODIFIER, openbor.c 31958; formula at 32006) |
| hitsound_speed_per_damage | percent of playback speed per damage point | 1 (openbor.c 32006, the subtraction) |
| hitsound_speed_min | percent | 60 (openbor.c 31956) |
| freeze_ticks | engine _time ticks | null (freezetime per attack; two command forms use different units, see below) |
| bounce_quake_px | px | 4 (openbor.c 32381) |
| quakeframe_v | px | null (per animation; values absent) |

Unit trap found: the freeze time has two script forms. The int form (openbor.c 19792) stores the raw integer. The float form (20027 and 20152) multiplies by global_config.game_speed. Our schema must pick one unit and convert once.

Attack tuple: the collision command has two argument layouts in this engine. Layout A (19925-19935): attack_force, attack_drop, no_block, no_flash, pause_add as args 5 to 9. Layout B (20085-20090): attack_force, no_block, no_flash, pause_add as args 5 to 8. The same field means a different argument slot. For our data schema, use one named tuple, not positional args.

Other feel fields in the attack struct (openbor.h 2290-2330): no_flash, pause_add, freeze, freezetime, flash (layer_adjust, layer_source, z_source, model_hit, model_block), forcemap, maptime, hitsound, blocksound. Nine feel-related fields in total.

Blink: invincibility after a hit or rise can blink the model (openbor.h 3621-3622 makeinv and riseinv; e->blink set at openbor.c 27527). The blink is a flash-as-state cue, not a hit flash.

## 4. For Frankendom

- Server verified: freeze is entity timer state in this donor (pausetime, nextmove, nextthink, toss_time are all simulation timers). So the freeze belongs to the server event: the hit event carries attacker_stop_ticks and target_stop_ticks, and clients do not guess.
- Gated attacker pause: keep it. In a three-on-one fight, a grounded attacker's pause is not extended by a later hit while it is still paused; an airborne attacker still extends it (openbor.c 31722). Our rule: attacker pause only if not already in stop, unless the attacker is airborne. This keeps fast duels from locking up.
- Target pause stacks in this donor (always added). For max three attackers, do not copy the stacking. Cap the target freeze per window, and take max, not sum.
- Damage to pitch: keep the curve (heavier hit, lower speed, clamped), with our own clamp numbers.
- 700 zones and 100 Pit characters: feel is one shared table keyed by hit kind (clean, block, counter, freeze, bounce) and weapon class. The per-move values live with the character data, not the zone.
- Change: one unit for all freezes, one named tuple for the attack, our own flash sprite and palette, and the freeze length comes from the server event.

## 5. Five-minute look test (for Dom, on the phone)

Flag on the existing dummy duel, published to /preview/ with no release rows. Three switchable modes:
- A: no contact flash, no pause, no pitch change (baseline).
- B: contact flash, gated attacker pause (proposed 4 ticks), target pause (proposed 6 ticks), damage-to-pitch curve, bounce quake 4 px (donor value) on heavy only. The 4 and 6 are our starting guesses, not donor values.
- C: B with three attackers hitting one target in turn, to show the cap against stacking.
Dom judges: does the damage pitch read as heavier without a number, and does the three-on-one freeze read as impact or as lag.

## 6. Licence and IP

- Code: 3-clause BSD. LICENSE line 1: "Copyright (c) 2003, Roel van Mastbergen & Senile Team"; line 2 names the OpenBOR Team. engine/LICENSE carries the same text.
- Assets: no licence stated for the art in the engine tree. The audit (AU014) classed it C. The README (line 21, per the audit) says the original game used art from another company's series. We use no art from this donor.
- Use: we take the ideas (gated pause, damage-to-pitch, frame quake) and write our own code. No code copied, so the BSD notice is not triggered. Category-level only: "a pause gated on attacker state".

## 7. Gaps

- Not read: the module data pack (absent). All real per-move values are missing.
- Not read in full: spawn_attack_flash body beyond the no_flash check (30800-30830).
- Not traced: the knock-back velocity source (animation velocities, attack_drop, dropv). The dropv command (openbor.c 20103) sets smartbomb fields; its use for attacks was not traced.
- Not verified: the _time unit (engine _time is uint64, openbor.c 593; the tick length was not found).
- Not read: engine source beyond these functions; tools/ binaries; tests/.
- Half read: client (engine only).
