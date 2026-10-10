# freeorion-freeorion

Donor root: /mnt/frankendom-donors/freeorion-freeorion/

## Licences (as the files say)
- Source code: GPL v2 (README.md: "The FreeOrion source code is licensed under the terms of GPL v2").
- Assets: CC-BY-SA 3.0. README.md line 149: "game assets are licensed under the terms of CC-BY-SA-3.0 and game content...". default/COPYING line 1: "Artistic or creative content is licensed under the Creative Commons" (CC-BY-SA 3.0). Line 4 lists artwork, music, sounds, text that determines how art or sound is displayed, and game content including in-game text. Line 6: game content scripts are also GPL v2. Line 9: everything else GPL v2.
- Third-party: GG/ library under LGPL 2.1 (GG/COPYING line 1). Roboto font: Apache 2.0 text (default/data/fonts/LICENSE.Roboto line 3). DejaVu: "DejaVu changes are in public domain" (LICENSE.DejaVu line 1); full terms not read.
- Class: B overall (share-alike conditions on reuse of art, sound, stringtables and content scripts).

## Rights holder
- Open-source community project. Contributors named in default/credits.xml (by name and task). No commercial owner stated. Per-asset authorship not checked.

## Asset inventory (data pack: default/)
- Art: default/data/art/ 4447 files incl. .import sidecars. Folders: icons/ 2015, planets/ 1688, stars/ 206, galaxy_decoration/ 98, hulls_design/ 86, species/ 52, nebulae/ 40, misc/ 60, encyclopedia/ 36, fields/ 18, cursors/ 12.
- Monster icons: default/data/art/icons/monsters/ 68 files (e.g. kraken-2.png 512x512 by IHDR; kraken-4.png, kraken-5.png). Nest icons: icons/specials_huge/ 100 files incl. kraken-nest.png (128x128 by IHDR), juggernaut-nest.png, snowflake-nest.png.
- Hazard overlays: default/data/art/fields/ (ion_storm.png, void_rift.png, molecular_cloud.png, nanite_swarm.png, meteor_blizzard.png, accretion_disc.png, star_forming_nebula_1 to 3).
- Sound: default/data/sound/ 84 files incl. .import (42 OGG; e.g. newturn.ogg, alert.ogg, combat/ subfolder).
- Fonts: default/data/fonts/ (Roboto, DejaVuSans).
- Text: default/stringtables/ 16 language files; en.txt is 23038 lines.
- Content scripts (data first): default/scripting/species/ 51 files (SP_ABADDONI.focs.py, SP_ACIREMA.focs.py, SP_ANCIENT_GUARDIANS.focs.py); default/scripting/ship_hulls/monster/ 32 files; default/scripting/monster_designs/; default/scripting/monster_fleets.inf (217 lines).
- Monster families (ship_hulls/monster): Kraken 1 to 3 plus Black and White Kraken; Juggernaut 1 to 3 plus Bloated; Snowflake 1 to 3 plus Psionic; Krill 1 to 4; Guard variants; Floater; Tree; Cosmic Dragon; Dampening Cloud; Drone; Strong Monster; Nebulous; Immobile Factory.
- 3D models: none in the data pack. A whole-tree find returned 3 files, not opened.

## Halves
- Read: the data pack (default/).
- Other half in the box: C++ engine (client/, server/, UI/, universe/, network/, combat/, Empire/, util/, parse/, python/AI). Not read.

## Inspiration (own words)
- Monster families use numbered tiers (Kraken 1 to 3, Juggernaut 1 to 3, Snowflake 1 to 3, Krill 1 to 4). The player reads the tier from the silhouette.
- A monster body hands itself over to a ship design on turn 1 (SH_JUGGERNAUT_1_BODY.focs.txt effects block). Authoring the body and its ship form separately.
- Hull slots (external, core, internal) define weak points for targeting.
- Nest icons show a spawner as a world object.
- Krill are described as appearing in systems with asteroid belts (en.txt:14226 for SP_KRILL_SPAWNER).
- Translucent field overlays mark hazards (fields/ion_storm.png).

## Briefs (Dom's rule: recreate as a clearly distinct original, never a copy)
- Spawner nest. Keep: stationary, spawns a family on a timer. Change: hive tower or egg cluster, spawn on player action. Ref: icons/specials_huge/kraken-nest.png.
- Three-stage grower. Keep: three stages in one family. Change: each stage a different silhouette. Ref: SH_JUGGERNAUT_1_BODY.focs.txt; SH_JUGGERNAUT_2 and 3 (names only). Note: tier 2 and 3 triggers not read.
- Asteroid-belt swarm. Keep: spawns only near one terrain type. Change: drone swarm with another movement pattern. Ref: en.txt:14226; SH_KRILL_1_BODY.focs.txt.
- Crystal snowflake boss. Keep: crystal silhouette, tier numbering. Change: glassy or salt crystal, palette, sound. Ref: SH_SNOWFLAKE_1_BODY.focs.txt; SH_PSIONIC_SNOWFLAKE_BODY.focs.txt.
- Hazard overlay. Keep: translucent overlay, distinct colour per hazard. Change: sand or dust, different shape and motion. Ref: fields/ion_storm.png.

## Cross-link to our cell topics
- Zones: fields/ overlays; planets/ variety.
- Spawns: monster_fleets.inf; krill spawn rule text.
- VFX: field overlays.
- Animation: nest growth stages (icons only; animation not read).
- Sound: 42 OGG event sounds.
- HUD and UI: stringtables and species portraits (species/).

## Not read
- Binary PNG and OGG contents (names, counts, two IHDR sizes).
- species/*.focs.py bodies (names only).
- Monster hull bodies beyond SH_JUGGERNAUT_1_BODY (names only for others).
- en.txt beyond the one entry.
- LICENSE.DejaVu full text; godot/ and godot4/ addons.
