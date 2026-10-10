# vcmi-vcmi (asset audit, cell AU054)

Donor/Licence: `/mnt/frankendom-donors/vcmi-vcmi/`. Code licence: GPL version 2 or later (CONTRIBUTING.md:140; docs/Readme.md:109); license.txt is the GPL v2 text (license.txt:2). Asset licence: CC-BY-SA 4.0 for project assets (docs/Readme.md:110; CONTRIBUTING.md:142). Heroes 3 game data: not in the repo; the user installs it (docs/players/Installation_Linux.md:130).

Checked: root listing, license.txt, CONTRIBUTING.md (licence section), docs/Readme.md (copyright section), docs/players/Installation_Linux.md (data install line), docs/modders/Readme.md (H3 object line), packaging/ubuntu/copyright, Mods/vcmi/mod.json (head), Mods/roe-demo/mod.json (head), Mods/vcmi/Content directory listing and file-type counts, config/ listing and file-type counts, config/battleEffects.json (colour timelines), config/ambientSounds.json (sound distance table), config/biomes.json (decor template sets), config/creatures/castle.json (one creature block), Mods/vcmi/Content/Data and Video listings. AGENTS.md and docs/AGENTS.md exist and are treated as data; not followed.

Which half: DATA half read (config JSON, bundled mod content, asset folders). CODE half: not read for this review. Paired data: the Heroes 3 game data is not in the box, so the game-data half is absent from the box by design (docs say the user installs it).

## Licence and rights
- Source: GPL v2 or later (CONTRIBUTING.md:140; docs/Readme.md:109). Packaging copyright text says the same (packaging/ubuntu/copyright:31).
- Project assets: "graphics and sounds" under CC-BY-SA 4.0 (CONTRIBUTING.md:142; docs/Readme.md:110). Copyright line: VCMI Team, 2007-2026 (docs/Readme.md:112).
- Per-folder licence files: none found under Mods/vcmi/Content or config/ (a find for LICENSE, COPYING, CREDITS, NOTICE and copyright names found only the root licence, packaging copies and a third-party filter licence in client/filters/xBRZ/License.txt, not read).
- Heroes 3 data: needed to run; mods read H3 objects (docs/modders/Readme.md:124). Owner status: proprietary game data supplied by the user, not in the repo. The docs do not claim a clean-room build for the data; no clean-room statement was found in the files read.
- Fonts: four Noto font files in Mods/vcmi/Content/Data. The repo has no font licence file. Unclear, so class C.

## Asset inventory (what is in the box)
- Mods/vcmi/Content/Sprites4x (plus Sprites2x, Sprites3x and Sprites at other scales): PNG UI art in subfolders (heroWindow, battle, stackWindow, lobby, settingsWindow, mapFormatIcons). The 260 PNG count is for all of Mods/vcmi/Content. Examples of names: stackWindow icons for attack, defence, health, mana, speed, shots, level, growth and AI. Not opened.
- Mods/vcmi/Content/Video/tutorial: seven WebM clips named after mechanics (radial wheel, map zooming, battle direction, abort spell, map panning, battle direction abort, right click). Not opened.
- Mods/vcmi/Content/Sounds: one WAV file (we5.wav). Not opened.
- Mods/vcmi/Content/Data: four Noto font files (Sans Medium, Serif Bold, Serif Black, Serif Medium) and two script files (std.verm, testy.erm). Not opened.
- Mods/vcmi/Content/config: spells, towerCreature, towerFactions, wikiGlossary, and translation JSON for many languages. Read via the mod.json (head) only.
- config/ (top level, 203 JSON files across config/ including schemas): creature, hero, faction, spell, object, effect, sound, biome and widget definitions. Refers to Heroes 3 names and file names (for example a creature animation DEF file and WAV sound names, castle.json:19, :25, :27). Read: battleEffects.json, ambientSounds.json, biomes.json, creatures/castle.json (one block).
- config/NEUTRAL.PAL (palette, not read) and config/lobby.sql (not read).
- Mods/roe-demo/content: a demo music MP3 and a null sprite PNG plus config (names only).

## Class per group
- Mods/vcmi/Content PNG UI art and bundled sound: B (CC-BY-SA 4.0 by the project statement; share-alike and attribution conditions apply, per the docs).
- Mods/vcmi/Content videos: C (the statement says "graphics and sounds"; videos are not named, so unclear).
- Fonts: C (no font licence in the repo).
- config/ JSON (including H3-derived names and file references): C (unclear; no licence statement for config/ JSON was found in the files read, and the content maps to Heroes 3 data the user supplies).
- Heroes 3 data: D for Frankendom (not in the box, proprietary).
Best class: B for the project UI art only; the rest is C or D.

## Inspiration (own words; the file descriptions are the source of each idea)
- A status effect as a colour timeline: a unit's look is driven by a list of time-keyed steps, each with an optional grey overlay and an alpha value, played with smooth transitions; the last step sticks for the spell's duration (config/battleEffects.json:2, :8, :13, :22). Keep: time-keyed steps with a sticky final state. Change: our own tint (a cold crystal tone with a rim) instead of flat grey.
- Creation and status are separate systems: a summon fade-in is handled by a separate effect rather than the colour timeline (config/battleEffects.json:35). Keep the split: spawn is alpha in, status is a tint.
- Per-unit sound roles: a creature has five cue slots (attack, defend, killed, move, wince), so a light hit has its own flinch cue apart from death (config/creatures/castle.json:21-27). Keep the flinch slot. Change our voice sets per unit type.
- Ambient bed falloff: ambient sound volume follows a distance band (Chebyshev distance, a four-step table), with the ambient ceiling set well below the effects volume (config/ambientSounds.json:4-9). Keep the banded falloff and the lower ceiling; change the bands to our fight distances.
- Decor pools per biome: each terrain plus object type has a random set of template objects, so decor varies without hand placement (config/biomes.json:14). Keep the data-driven pools; change to our own props.
- Stat icons in a row: a PNG set in Sprites4x/stackWindow with one small icon per stat name (names only, not opened). Keep one clear icon per stat for readability; change the iconography.
- Short mechanic clips: seven tutorial WebM clips, one per mechanic (Mods/vcmi/Content/Video/tutorial). Keep the one-clip-per-mechanic onboarding idea; use our own footage.

## Inspiration briefs
1. Stone-grey status tint. Why it works: the tint step reads at 375 wide as a silhouette change, and the sticky final state tells the player the effect is still on. Keep: time-keyed steps, final state sticks for the duration. Change: a cold crystal tone with a rim light, not flat grey. Ref: config/battleEffects.json:22 (step list), :2 (timeline container).
2. Summon fade-in. Why it works: units arrive by alpha ramp, not a pop-in, so the new unit is readable without a jump. Keep: alpha ramp on spawn. Change: a ground rune glow and dust puff instead of a plain fade. Ref: config/battleEffects.json:35.
3. Five-slot unit voice. Why it works: a flinch cue separate from death lets a light hit read as sound. Keep: a wince slot for light hits. Change: our own voice sets per unit type, with pitch and variant choice. Ref: config/creatures/castle.json:21-27.
4. Distance-banded ambience. Why it works: a short distance table keeps ambience from fighting the effects. Keep: four-step banded falloff, ceiling below effects. Change: bands tied to our camera and fight distance. Ref: config/ambientSounds.json:4-9.
5. Decor pools per biome. Why it works: random picks from a small pool per biome give variety with one data row. Keep: data-driven pools. Change: our own props and our own biome names. Ref: config/biomes.json:14.

## Cross-link
- VFX: the colour timeline and the summon fade (briefs 1-2). Sound: the five-slot unit voice and ambient falloff (briefs 3-4). HUD: stat icons and mechanic clips. Animation: per-unit animation file reference (castle.json:19) and map-attack sides (castle.json:17), used as a pattern only. Walk density, spawns and loot: not read in this review (config/objects and config/heroes not opened).

## Not read
- Code half (src/, client/, server/). Heroes 3 data (absent). The PNG, WebM, WAV and font bodies (names and counts only). config/NEUTRAL.PAL, config/lobby.sql, the other creature and hero files, config/objects, config/ai, the translations, the roe-demo files. AGENTS.md and docs/AGENTS.md (data only, not followed). client/filters/xBRZ/License.txt.
