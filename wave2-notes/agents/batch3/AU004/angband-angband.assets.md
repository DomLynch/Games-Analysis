# angband-angband: asset audit (AU004)

Source: /mnt/frankendom-donors/angband-angband (read-only, VPS). Binaries were not opened; sizes and counts come from ls and find.

## Licences (as the files say)
- Code: GPL version 2, or the "Angband licence" (docs/copying.rst line 5; src/z-file.c header). The Angband licence permits copying "for educational, research, and not for profit purposes" (copying.rst line 10).
- Assets, per group (docs/copying.rst):
  - Adam Bolt 16x16 tiles: "may be redistributed and used for any purpose, with or without modification" (line 24).
  - David Gervais 32x32 tiles: Creative Commons Attribution 3.0 (lines 26).
  - Shockbolt 64x64 tiles: own licence, no modification without author permission, no use with other projects without permission, commercial games need a non-exclusive licence (lines 28, 40).
  - Sounds: Creative Commons Attribution 4.0, by Dubtrain (line 46).
  - Fonts: released under the GPL by their authors (line 48).
  - Not named in any licence line: old 8x8 and nomad 8x16 tiles, lib/icons, lib/screens, screenshots, and lib/gamedata text beyond the project dual licence.
- lib/gamedata headers say the dual licence applies and "Other copyrights may also apply" (copying.rst and file headers).

## Inventory (real paths)
- lib/tiles: adam-bolt/16x16.png (about 470 KB), gervais/32x32.png (about 1.3 MB), shockbolt/64x64.png (about 17.6 MB), old/8x8.png, nomad/8x16.png, each with .prf mapping files and lib/tiles/list.txt.
- lib/sounds: 213 mp3 files plus Makefile, about 3.3 MB. Prefixes: amb_ (ambience), mco_ (monster calls), plc_ (player combat), plm_ (player misc), id_ (identify cues).
- lib/fonts: 25 bitmap .fon and one .woff, about 288 KB.
- lib/gamedata: 45 .txt templates, about 1.3 MB. name: entries: monster.txt 624, object.txt 375, artifact.txt 138, ego_item.txt 107. Also terrain.txt, visuals.txt (28 colour indices), shape.txt, dungeon_profile.txt, vault.txt and others.
- lib/screens: news, dead, crown, retire text screens. lib/icons: 11 files. screenshots: title.png, game.png.

## Rights holder status
Open-source project. Copyright names Ben Harrison, James E. Wilson and Robert A. Koeneke (1997, copying.rst). Tile and sound credits are in docs/copying.rst and docs/thanks.rst. The files do not say whether the game derives from any commercial title. Some artifact names look Tolkien-derived (artifact.txt line 108); not assessed.

## Classes
- A: Adam Bolt 16x16 tiles; Gervais 32x32 tiles (attribution); Dubtrain sounds (attribution).
- B: fonts (GPL).
- C: Shockbolt 64x64 tiles; old and nomad tiles; gamedata text; screens; icons; screenshots.
- Best class: A for the named groups.

## Inspiration
- One world, several tile sizes, each with its own mapping file: swap the art layer without changing game code (lib/tiles/list.txt; lib/tiles/*/graf-*.prf).
- Named palette with 28 colour indices and a legacy flicker cycle used only for monsters (lib/gamedata/visuals.txt, line 10 onward).
- A readable glyph and colour per terrain type first (lib/gamedata/terrain.txt around lines 111-126).
- Monsters as compact data rows with flavour text and one signature attack (lib/gamedata/monster.txt, around line 1886).
- Sound families by prefix (amb_, mco_, plc_, plm_), reusable as a naming scheme.
- Depth-tiered ambience: bells and iron doors underground (lib/customize/sound.prf, lines 33-39).
- Player shapes as stat packages with messages (lib/gamedata/shape.txt).

## Briefs
1. Frost-drip swarm insect (own label): small, pale, cold-breath flyer. Ref: lib/gamedata/monster.txt line 1886.
2. Elemental dragon family (own label): one body plan, colour codes element. Ref: lib/gamedata/monster.txt line 2623.
3. Dark-fantasy 64px original tile set (own label): scale idea only; the donor set is restrictive. Ref: lib/tiles/shockbolt/64x64.png (not opened).
4. Bell and gong underground ambience (own label). Ref: lib/customize/sound.prf line 39; lib/sounds/amb_bell_*.mp3.

## Cross-links to our cell topics
- zones: lib/gamedata/dungeon_profile.txt and vault.txt (not read in full).
- spawns and loot: monster.txt, object.txt, ego_item.txt (counts only).
- hud-ui: lib/fonts and lib/screens.
- sound: lib/sounds and sound.prf are the most reusable audio layout.
- vfx and camera: no effect art found beyond tile sets.

## Not read
Image and audio files were not opened. The help folder and most of docs/ were not read. gamedata text was sampled, not reviewed, and no full lore or item text was taken.
