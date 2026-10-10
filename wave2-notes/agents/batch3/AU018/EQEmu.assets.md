# Asset audit: EQEmu (AU018)

- Code licence: GPL-3.0 (LICENSE.md line 3, "Version 3, 29 June 2007").
- Asset licence: no separate licence for the SQL content or binaries in the repo. README says the project does not claim ownership of the original game or its assets.
- Rights-holder status: emulator of a commercial MMO; README names Daybreak Game Company and the original creators as owners of the game and its assets. README also says ProjectEQ world data is included; not confirmed in the tree.
- Best class: C (the only substantive non-code content is game-derived SQL with unclear status). Art and audio: none (D).

## Inventory (VPS: /mnt/frankendom-donors/EQEmu/)
- No art, models, textures, audio or maps found by extension. utils/defaults/Maps is empty.
- utils/sql is 16 MB: 362 SQL files. 170 files contain INSERT INTO. 33 mention npc_types. None insert into an items table (grep). Mostly schema migrations and rule_values toggles.
- Utility binaries: utils/EQExtractor2 (DLLs), utils/xmltojson and utils/scripts/build/should-release (EXE). Not opened.
- Code: about 970 .h, 815 .cpp, 109 .hpp, 42 .cs. GPL-3.0.

## Inspiration
- Data-first design: NPC, spawn, loot and rules as SQL tables with named rule toggles. Build our tuning as named toggles with notes.
- Companions (mercenaries and bots) carry their own spell lists per class. Recreate as hireable companions with our names and roles.
- Salvage recipes break gear into components; recreate as a salvage loop with our own materials.
- Augment rules show slot-based add-ons; recreate with our own socket shapes.
- Bot bard songs are out-of-combat buffs; recreate as companion buff loops with our audio.

## Briefs
1. Hireable companion (ref: utils/sql/git/optional/2013_02_18_Merc_Spells.sql).
2. Salvage loop (ref: utils/sql/git/optional/2013_04_09_SalvageCleanOld.sql).
3. Socketed add-on gear (ref: utils/sql/git/optional/2014_03_17_EnforceAugmentRules.sql).
Note: these are mechanics, not visuals. The donor has no visual item or creature art to brief.

## Cross-link
- spawns and loot: the SQL holds NPC and spawn data; structure only, no content reuse.
- hud-ui: none. vfx, animation, sound, camera: nothing in this repo.

## Not verified
Full SQL content, binaries, lua bodies. The ProjectEQ world data claim is unconfirmed in the tree.
