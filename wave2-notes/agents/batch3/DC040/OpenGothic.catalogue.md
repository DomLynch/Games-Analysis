# OpenGothic (design catalogue, DC040)

Donor: /mnt/frankendom-donors/OpenGothic
Licence: MIT for the code (LICENSE:1, copyright line LICENSE:3). Game assets and scripts are not in the box; the README says the user needs a Gothic 2: Night of the Raven install (README.md:25). Asset class C per AU039, so inspiration stays category-level.
Half read: the engine half (common/game, common/world, common/gamemusic.h, shader/water). Data half (Gothic 2 scripts, world files, item and creature records) is NOT in the box: the donor folder has no asset directory, game/ holds only main.cpp, and lib/ZenKit is an empty submodule dir. Paired data donor in this batch: none (AU039 found none).
Not a source of exact looks, names or stats. Everything below is mechanism and shape.

Dom's rule for every idea here: recreate as a clearly distinct original, never a copy. Keep the mood, change the names, numbers and look.

## 1. Creatures / beasts
- Creature records: 0 in box (no creature table; they come from the script data).
- Mechanism only: a monster flag changes the damage roll. In G2, regular monsters with no weapon talent always deal full damage (damagecalculator.cpp:150-152, comment at :151).
- Fight behaviour comes from per-tactic move lists in script data (fightalgo.cpp:33-41, 92-103). Not read: common/game/definitions/fightaidefinitions.h (the table itself is script data).
- One named behaviour in a code comment: a wolf jumps back often when close, but only when attacked in the original; the code therefore gates the jump on close range and facing (npc.cpp:1602-1604).
- Families and tiers: none in box.
- Top creature-like behaviours (no creature instances, so these are behaviour patterns, not creatures):
  1. Reactive skirmisher (wolf-style jump-back)
     - Why: a short hop back that reads as a predator sizing you up; it reads at 375 wide as a quick backward shape.
     - Keep: jump back only when the player is in close range and in front of it (npc.cpp:1604).
     - Change: our own cone (the donor uses 90 degrees, fightalgo.cpp:318) and our own cadence; no wolf model or name.
     - Ref: common/world/objects/npc.cpp:1602-1604; common/game/fightalgo.cpp:318.
  2. Counter-strafe after being hit
     - Why: a hit clears the queued moves and queues one counter-move (fightalgo.cpp:228-233, 37-41). The enemy looks reactive without new animation.
     - Keep: the hit flag and a single counter-move from its own list.
     - Change: our move names and the counter choice.
     - Ref: common/game/fightalgo.cpp:37-41, 228-233.

## 2. Classes / races / factions
- Class and race records: 0 in box. Guild numbers index per-guild ranges (fightalgo.cpp:239-258), but the guild table is script data (not read).
- Weapon state picks the fight branch: fist, one-hand, two-hand, bow, crossbow, mage, unarmed (fightalgo.cpp:348-360 and the branch at :53-81).
- Progression: none in box.

## 3. Weapons
- Families: 0 weapon records in box (item data is script data; item.cpp not read).
- Damage flags named in code, 8 of them: barrier, blunt, edge, fire, fly, magic, point, fall (touchdamage.cpp:37-44). Each weapon carries a damage-type mask (damagecalculator.cpp:189-193).
- Talent split: one-hand and two-hand (damagecalculator.cpp:143-146).
- Reach: weapon length is added to the attack range (fightalgo.cpp:345, 349-352).
- Visual tiers: not in box.
- Top 5 striking mechanics (no weapon instances):
  1. Glancing blow on a missed talent roll
     - Why: a failed hit roll does not miss; it lands as a graze that is about a tenth of the damage (damagecalculator.cpp:160-161). Players feel the swing connect.
     - Keep: a graze tier instead of a plain miss.
     - Change: no integer division trick; our own graze ratio, float maths with a floor of 1; rename the roll (the donor's name, critChance, is misleading: the branch runs when the roll is at or above the hit chance).
     - Ref: damagecalculator.cpp:139, 160-161.
  2. Ranged chance with a reference range
     - Why: full chance up to a reference distance, then a linear fall to zero at max range (damagecalculator.cpp:75-82).
     - Keep: the two-segment falloff.
     - Change: our ranges and per-weapon chance.
  3. Per-type protection with an immune sign
     - Why: protection is subtracted per damage flag and floored at zero; a negative value means immune (damagecalculator.cpp:117-118). One number per flag makes armour readable.
     - Keep: sign means immune.
     - Change: our 4-flag set, not the 8 above.
  4. Attack range from base plus weapon reach, squared
     - Why: attack range, close-up and walk range are base plus weapon reach (fightalgo.cpp:246-259), compared as squared distance (fightalgo.cpp:275).
     - Keep: the three-tier range set and squared compare.
     - Change: our constants.
  5. Hit flags split by damage type
     - Why: each masked flag in a hazard calls the damage routine once (touchdamage.cpp:47-51). Weapons and hazards share the flag language.
     - Keep: shared flag language between weapons, hazards and armour.
     - Change: one hit per tick per target (see defects below).

## 4. Armour / gear
- Gear sets: 0 in box.
- Material tiers: not in box. Protection per flag is the only tier shape visible in code (damagecalculator.cpp:117-118).
- Fall protection is a separate protection slot (damagecalculator.cpp:47, 51).
- How the game shows tiers: not read (UI under common/ui not read).
- Top 5 striking: covered in section 3 (protection with immune sign is the gear item). No materials, looks or colour tiers in box.

## 5. Zones / dungeons / hazards
- Biomes and dungeon archetypes: none in box (zone data is in world files).
- Trigger types in code: 14 (common/world/triggers/*.cpp): abstracttrigger, codemaster, cscamera, earthquake, messagefilter, movercontroler, movetrigger, pfxcontroller, touchdamage, trigger, triggerlist, triggerscript, triggerworldstart, zonetrigger. Only touchdamage.cpp read in full. earthquake.cpp and zonetrigger.cpp not read.
- Hazards read: touch damage by flag with a repeat delay (touchdamage.cpp:29-54); fall damage from speed and a per-guild height table (damagecalculator.cpp:38-58).
- Top 5 striking (mechanics): repeat-timed hazard tick; fall damage from measured height; per-flag hazards; zones as triggers rather than hard-coded; a fall threshold that subtracts protection.

## 6. Item and effect looks worth recreating
- Water swell: directional Gerstner sum; phase from the tick count; amplitude floor max(10, half of max) (gerstner_wave.glsl:18-19, 32). Technique: sum of a few waves, one time term, a minimum amplitude so calm water still moves.
- Music tag grid: one daytime bit and three mode bits (standard, fight, threat) combine into a tag set; a theme is set from a tag set (gamemusic.h:20-34). Technique: state grid for music, two by three.
- Sky: look-up table with a multiple-scattering term (shader/sky/sky_multi_scattering.frag; the audit cites :15 and :58, not re-read by me).
- Not read: all other shader bodies (shader/ has 29 top-level entries, the water folder is the only one read).

## 7. Inspiration for Frankendom
1. Reactive skirmisher
   - Idea: an enemy that backs off with a short hop only when close and facing you, so it reads as calculated.
   - Keep: close range plus facing gate for the hop.
   - Change: our cone, our cadence, our creature.
   - Ref: npc.cpp:1602-1604.
2. Glancing blow tier
   - Idea: a failed hit roll becomes a graze, not a miss.
   - Keep: the graze tier.
   - Change: float maths with a floor of 1, our ratio, our roll name.
   - Ref: damagecalculator.cpp:160-161.
3. Counter-move after a hit
   - Idea: a hit clears the planned moves and queues one counter.
   - Keep: clear-then-counter.
   - Change: our move list.
   - Ref: fightalgo.cpp:228-233.
4. Three-tier range set, squared compare
   - Idea: attack, close-up (0.75 of base) and walk ranges from base plus reach, compared squared.
   - Keep: three tiers and squared compare.
   - Change: our constants.
   - Ref: fightalgo.cpp:272-305, 287.
5. Protection with immune sign
   - Idea: armour is a number per damage flag, and a negative number means immune.
   - Keep: sign means immune; floor at zero.
   - Change: our flag set.
   - Ref: damagecalculator.cpp:117-118.
6. Repeat-timed hazard
   - Idea: a zone hazard ticks with a repeat delay, not every frame.
   - Keep: repeat timer.
   - Change: one hit per tick per target.
   - Ref: touchdamage.cpp:29-54.
7. Water swell with a floor
   - Idea: a few directional waves, a tick phase, and a minimum amplitude.
   - Keep: the sum and the floor.
   - Change: our wave directions, count and palette.
   - Ref: gerstner_wave.glsl:18-19, 32.
8. Two-by-three music grid
   - Idea: time of day times fight mode gives six music tag sets.
   - Keep: the grid.
   - Change: our zone names and cue set.
   - Ref: gamemusic.h:20-34.

## Defects to fix when we adapt (keep the idea, fix the defect)
- RUN_BACK sets no move: the case assigns MV_NULL with a TODO (fightalgo.cpp:117-119). Fix: give it a real move or drop it from the lists. How the loop handles MV_NULL after line 1632 was not read.
- Hazard hits: one hit per masked flag per tick (touchdamage.cpp:47-51). If several flags are set, damage stacks. Fix: take the largest flag per tick, or sum on purpose and say so.
- Repeat timer: repeatTimeout is compared with tickCount and multiplied by 1000 (touchdamage.cpp:32, 54). The unit of tickCount was not read. Fix: state the unit in our tick code.
- Misleading name: critChance is the hit roll in G2 (damagecalculator.cpp:139, 160). Fix: rename.

## Licence and clean-room note
MIT code may be adapted with the notice kept, but we recreate from the shape only. No shader or code copied. No asset in box to copy (game data is user-supplied).

## Not read
- Gothic 2 data (absent from the box).
- lib/ZenKit (empty), common/game/definitions/*.
- common/world/objects/item.cpp (weapon and armour fields).
- npc.cpp except lines 1572-1632 and 1602-1604.
- common/world/triggers/earthquake.cpp and zonetrigger.cpp (names only).
- common/ui, common/graphics (HUD and visuals), common/sound (playback).
- Shader bodies other than shader/water/gerstner_wave.glsl.
