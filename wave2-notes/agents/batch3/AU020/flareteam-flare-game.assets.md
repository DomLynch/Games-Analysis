# Asset audit: flareteam-flare-game (AU020)

Donor tree: /mnt/frankendom-donors/flareteam-flare-game (read-only, VPS). Game content for Flare: Empyrean Campaign, with the mods fantasycore, empyrean_campaign, alpha_demo, centered_statbars, devlab, minicore, minicore_alpha. About 2,800 files in total, 1.3 GB.

## Licence (what the files say)
- LICENSE.txt is Creative Commons Attribution-ShareAlike 3.0 Unported legal code (receipt 22).
- README: "All of the art and data files for Flare: Empyrean Campaign are released under CC-BY-SA 3.0." Later versions permitted (receipt 23).
- Fonts: "The Liberation fonts version 2 are released under the SIL Open Font License" (receipt 24). README also names Bona Nova SC, Noto and Marck Script under OFL 1.1.
- Engine: "The Flare engine is released under GPL version 3 or later." (receipt 25).
- Audio: the README blanket statement covers "art and data", and does not name audio. Per-file authorship of art and audio is pointed to an online wiki: "See the full credits listing including per-file attribution online:" (receipt 26). The repo does not contain per-file attribution. Audio is therefore unclear, class C.
- Credits thank "artists for releasing reusable open-licensed art" (receipt 27), and the credits list names artists per area.
- Content note: "depictions of violence, blood, and mild gore." (receipt 28).

## Rights-holder status
Community open-source game. README copyright line: Clint Bellanger, 2010-2013; "Contributors retain copyrights to their original contributions." Not a commercial game. No leak or clean-room statement. Per-file rights are not in the repo.

## Asset inventory (counts from find; sizes from PNG headers)
- Sprite sheets: mods/fantasycore/images (378 png: enemies, npcs, avatar, loot, powers, portraits, tilesets, cursors, menus, icons). mods/empyrean_campaign/images (36 png). PNG header sizes: enemies/skeleton.png 3886x2154; enemies/goblin.png 1316x3185; enemies/wyvern/wyvern_run.png 1402x2769; enemies/wyvern_fire/wyvern_fire_stance.png 1731x2004; enemies/minotaur/minotaur_run.png 1917x1654; tilesets/tileset_dungeon.png 2167x3999; tilesets/tileset_cave.png 2057x3037.
- Animation text: mods/fantasycore/animations (enemies and npcs, about 20 files), mods/minicore_alpha/animations (statue guardians, necromancer and others). Frame cells in coordinate form (receipts 29-30 cite the wyvern fire stance: frame cell 129x209 at sheet offset 1583,939, image path wyvern_fire_stance.png).
- Source art: art_src/ (357 png, 280 .blend, 14 .xcf, 35 jpg, 89 txt). Spells, characters, enemies, items, loot, tilesets, textures, interface, animation definitions. art_src/README.md says these are a historical reference (receipt 31); the newer HD source is in another repo named there.
- Wyvern source: art_src/characters/wyvern has the base and per-element diffuse maps (fire, water, air, earth) and a montage note file (receipt 33).
- Maps: tiled/ (160 .tmx, 28 tilesheets, 15 stamps). Exported text maps in mods/*/maps (137 files in empyrean_campaign). Biomes: grassland, dungeon, cave, snowplains, ruins, iron_labyrinth, plus alpha_demo and devlab.
- Music: mods/fantasycore/music (12 ogg: title, town, overworld, forest, cave, dungeon, magical, unrest, battle, boss, safe room, wind ambient).
- Sound effects: mods/fantasycore/soundfx (112 ogg: door, hit, die, melee attack, heartbeat, level-up, no-mana, plus enemy and environment folders). mods/empyrean_campaign/soundfx (4 ogg: environment and powers).
- Fonts: 10 ttf in fantasycore (Liberation Mono, Bona Nova SC, Noto Serif variants for SC, JP, KR, Thai, Devanagari), 1 ttf in empyrean_campaign (Marck Script).
- Text: empyrean_campaign quests (12 files), books (about 20), cutscenes; 645 txt in that mod in total. Lore is the donor's own. Only titles and premises summarised here.

## Class by group
- Sprite sheets and item art (fantasycore, empyrean): B (CC-BY-SA 3.0 blanket for art; attribution by name per CREDITS.txt).
- Source art (art_src): B (same statement; Blender 2.7-era files).
- Tilesets and Tiled maps: B.
- Music (12 ogg): C (audio not named in the README; per-file authors not in repo).
- Sound effects (116 ogg): C (same reason).
- Fonts: B (OFL 1.1; keep notices).
- Quests, books, cutscenes: B (CC-BY-SA blanket for data).
- Animation text: B.
- Best class for the donor: B for art, maps, fonts and text; C for audio.

## Inspiration (own words; no copied text)
- One creature in several elements: the wyvern appears as fire, water and air variants in fantasycore, and art_src keeps per-element diffuse maps (fire, water, air, earth) next to the base. Recreate with our own base body and four colour passes, not separate sheets.
- Eight-direction sprites from a turntable: render8dirs.py rotates a render platform 45 degrees per step and renders each pass (receipt 32 cites the loop). For our characters, one turntable and a fixed camera give eight consistent facings.
- One action set per creature: the wyvern has stance, run, swing, cast, dash attack, hit and die (receipt 29 cites the stance sheet). Copy the checklist so combat code treats every enemy alike.
- Behaviour sheets for a flying enemy: the montage note names hover, fly, sting, breathe, ram and hit as separate sheets (receipt 33 cites the montage line).
- Elemental statue guardians: fire, wind and ice variants defined from one template in minicore_alpha. A cheap family of three from one body.
- Biome sets with a Tiled template per area (grassland, dungeon, cave, snowplains, ruins, iron labyrinth). Copy the habit of one tile sheet and one template per zone.
- One music track per game state (title, town, overworld, cave, dungeon, boss, battle, safe room, unrest) plus a wind bed. Copy the state-to-track table with our own music.
- Mood: dark fantasy with violence, blood and mild gore by the README's own note. A dark palette with limited red and bruise tints fits without copying art.

## Briefs
1. Four-element winged beast. Why: one body in several colourways reads as a family. Keep: one base body with an element colour pass; one shared action set; a clear ember or frost hue per element. Change: a different body plan (not a winged lizard); our own palette ramps; armour plates or bone ornament in place of wings. Ref: mods/fantasycore/images/enemies/wyvern_fire/wyvern_fire_stance.png (not viewed); art_src/characters/wyvern/montage.txt; art_src/characters/wyvern/wyvern_diffuse_fire.png.
2. Statue guardian trio. Why: three elemental statues from one template make a shrine feel guarded by different powers. Keep: one template with three element colour passes; a stone body; a looped idle. Change: our own statue design and element set; a site-specific carving style. Ref: mods/minicore_alpha/animations/npcs/statue_guardian_fire.txt, statue_guardian_wind.txt, statue_guardian_ice.txt (names and animation definitions only, not viewed).
3. Undead core with role variants. Why: one core body with archer, mage and weak tiers gives a readable enemy ladder. Keep: one core body with role variants; a smaller weak tier; role shown by prop or pose. Change: our own undead design, not bones; our own props; a different tier ladder. Ref: mods/fantasycore/images/enemies/skeleton.png, skeleton_archer.png, skeleton_mage.png, skeleton_weak.png (not viewed).
4. Cave tile sheet. Why: one large tile sheet per biome keeps a zone's look in one place. Keep: one tile sheet per biome; a Tiled template per biome; tiles for walls, floor and water edges. Change: our own cave colour story; our own edge and wall rules; a different scale. Ref: mods/fantasycore/images/tilesets/tileset_cave.png (2057x3037 by PNG header, not viewed); tiled/cave/.

## Cross-link to our cell topics
- camera: render8dirs.py (eight-direction turntable).
- zones: tilesets and Tiled biome templates.
- spawns: enemy animation sets and the enemy list (spawn data not read).
- loot: images/loot and art_src/loot (not viewed).
- hud-ui: menus and icons in the mods (the default kit is in the engine donor).
- vfx: art_src/spells (fire, ice, lightning, spark, mist, runes, caltrops, and others) and empyrean soundfx/powers.
- animation: animations/*.txt frame definitions (strongest link).
- sound: soundfx and music folders (licence-unclear for audio).

## Not read
- Visual content of any PNG (sizes from headers only, nothing viewed by eye).
- Audio content (names and counts only).
- Per-file credits online (CREDITS.txt points to a wiki; not visited).
- art_src .blend files (binary).
- Quest, book and cutscene text beyond file names and the lines cited.
- The newer HD art source repo named in art_src/README.md (not in this tree).
