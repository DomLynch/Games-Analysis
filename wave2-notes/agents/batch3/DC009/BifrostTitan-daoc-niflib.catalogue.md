# BifrostTitan-daoc-niflib (design catalogue, DC009)

Donor: /mnt/frankendom-donors/BifrostTitan-daoc-niflib/ (C++17 port of a NIF model/effect parser, 45 files, no asset files)
Licence (as the files say): source headers say GPL-2.0-or-later (src/ni_particle_controller.cpp:1). No LICENSE file in the repo. Upstream named as dol-leodagan's niflib.net (README.md:3). Treat as GPL: clean-room, shape only, no code copied. Not a legal opinion.
Half read: the DATA-FORMAT READER (parser for NIF records). The game art and effect files it parses are NOT in the box. No server half. Paired donor in the box: BifrostTitan-DAoC-Client-Lib (DC008), which reads the DAoC client data layer and names nifs.csv as a runtime input (per AU006 audit; I did not read that donor).
Dom's rule: recreate as a clearly distinct original, never a copy. Keep the mechanism shape; change names, numbers and art.

## Counts
- creatures: 0. No creature content in this repo (parser only).
- classes: 0. No class or race data.
- weapons: 0. No weapon data.
- gear_sets: 0. No gear data. Material fields exist (see looks), but no item or tier table.
- zones: 0. No zone data.

## 1. Creatures / beasts
None. The repo has no creature families, tiers, or boss patterns. The only creature-adjacent records are skinning and morph headers (include/niflib/ni_skinning.h, ni_morph.h). Names only, bodies not read.

## 2. Classes / races / factions
None in this repo.

## 3. Weapons
None. Families, tiers and special properties are not in this donor.

## 4. Armour / gear
None as sets or tiers. What exists is a material record that could carry a tier look (see section 6, L1).

## 5. Zones / dungeons
None. No biome, dungeon or hazard data.

## 6. Item and effect looks worth recreating
- L1 Metal sheen from one material record. NiMaterialProperty reads ambient, diffuse, specular, emissive, glossiness and alpha as one record (src/ni_properties.cpp:20-25; include/niflib/ni_properties.h:30-35). A metal or gilded look is a set of numbers on a flat material, not a special shader. Ref: src/ni_properties.cpp:20-25.
- L2 Glow only where painted. NiTexturingProperty has separate gloss and glow map slots after base, dark and detail (src/ni_textures.cpp:131-135; include/niflib/ni_textures.h:72-77). A gloss map says where the surface shines; a glow map adds self-light only where it is painted (engraved runes, cracks, gem cores). Ref: src/ni_textures.cpp:134-135.
- L3 Particle burst as one record. NiParticleSystemController holds speed, random speed, two direction-and-angle pairs, size, an emit start and stop window, emit rate, lifetime with random spread, and a start-position spread (include/niflib/ni_particles.h:88-107; src/ni_particle_controller.cpp:17-42). Sparks, embers and hit motes can be authored as one small data record.
  - Defect (keep the idea, fix the defect): src/ni_particle_controller.cpp:72 `if (num_particles > 65535)` tests a value read as uint16 (src/ni_particle_controller.cpp:70), so the check can never fire. fix: check against our own per-emitter particle budget and clamp or reject with an explicit error.
  - Note: many fields in this record are named unknown_*. Do not copy the field list; use only the named fields.
- L4 Pulsing glow on a material. NiMaterialColorController and NiAlphaController are controller classes (include/niflib/ni_animation.h:56 and :86). By name, they animate a material colour or alpha over time, which would give a pulse. Controller bodies NOT read; the pulse mechanism is inferred from the class names only.
- L5 Named type registry. The factory registers each block type by name with a constructor lambda (src/nif_object_factory.cpp:301-307). Idea for our effect and look lookups: look up by name, and fail loudly on an unknown name (README.md:16 "Unknown block types fail explicitly").

Not verified: the particle record's byte layout beyond the named fields; any runtime use of L4 controllers; any shader code (none in repo).

## Top 5 striking
None. The donor has no creature, weapon, gear or zone content to rank. Striking candidates are effect and material looks (L1, L2, L3), listed in section 6.

## Inspiration for Frankendom
1. Gilded Relic material (client-only look). Keep: one flat material record with specular and glossiness numbers, plus a glow map painted only on engraved lines. Change: our own tier palette and our own maps; no donor values.
2. Ember Burst emitter record (client VFX). Keep: the record shape (speed, random speed, direction cone, emit window, lifetime spread, emit rate). Change: named fields only, a hard per-emitter particle cap with an explicit error, and a stop when the emitter is off screen.
3. Pulse aura for elites (client VFX). Keep: a colour or alpha track on the material. Change: the pulse follows the boss phase from the engine state, not a fixed clock.
4. Effect registry by name (data loader). Keep: name lookup, one constructor per type. Change: unknown names fail at load with a clear message; no silent fallback.
5. Edge-glow rune plate (gear tier marker). Keep: glow map limited to engraved lines. Change: the tier colour and the rune shapes are our own.

All five are client-side look ideas (VFX and material), so none touch the engine rulings.
Brief rule served: a distinct original; the traits kept are the shape of the mechanism, the traits changed are names, caps, numbers and art.
