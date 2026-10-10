# xu4-engine-u4 (asset audit, cell AU059)

Donor: /mnt/frankendom-donors/xu4-engine-u4/ (VPS only, read-only)
Half read: the engine (src/, Makefile, android/) in part, and the Ultima IV data pack (module/Ultima-IV, module/U4-Upgrade, module/render). The paired half is the original game data, which is not in the repo.
Data first: config.b is the data table (creatures, armours, weapons, tile rules, a 16-entry palette, music and sound lists). maps.b, vendors.b and graphics.b hold the map, shop and atlas definitions.

## 1. Licence

- Code: GNU GPL version 3. COPYING line 2: "Version 3, 29 June 2007".
- Assets: mixed and mostly not stated.
  - module/Ultima-IV/Credits line 1: "Some assets utilize copyrighted material, the use of which is hereby acknowledged."
  - Music (module/Ultima-IV/music/minstrel): credited to Markus Brenner, MIDI files (C) 1998. Line 8. No licence line.
  - One sound, sound/stone_falling.ogg: credited to freesound user bolkmar, "Wav file (C) 2020", with CC BY 3.0 (line 12). Class A with credit.
  - U4-Upgrade art (image/vutne): credited to Vanja Utne, "KOA files (C) 2015" (U4-Upgrade/Credits line 8). No licence line.
  - The Credits files are short: 9 lines for U4-Upgrade, and only the vutne folder is credited. The vga folder has no credit line.
- The original Ultima IV data: README line 77 says a copy of Ultima 4 for DOS must be present. Line 78: the original is "closed-source freeware". Not in the repo.

## 2. Asset inventory (paths and counts)

| Group | Path | Count | Note |
|---|---|---|---|
| Game data tables | module/Ultima-IV/config.b, maps.b, vendors.b, graphics.b; module/U4-Upgrade/*.b | 35 creature rows in config.b | Boron-style data |
| Tile and UI PNG (EGA) | module/Ultima-IV/image/ega/ | 35 PNG | dungeon walls, doors, ladders, traps, hud |
| U4-Upgrade PNG | module/U4-Upgrade/image/vutne/ (9), image/vga/ (37) | 46 PNG | vutne credited, vga not |
| Music (OGG) | module/Ultima-IV/music/minstrel/ | 9 OGG | castles, combat, dungeons, fanfare, merchants, rule_britannia, shrines, townes, wanderer |
| Sound (OGG and .rfx) | module/Ultima-IV/sound/ | 34 files | spell precast, flash, fizzle; combat hits; UI click and tick |
| Shaders and fonts | module/render/shader/, module/render/font/ | 9 shader entries, 8 font entries | world, shadowcast, msdf, hq upscalers, gui |
| Docs | doc/ | 14 files | spell list and file-format notes |

## 3. Rights-holder status

Fan engine project. The original game data is not in the repo and must come from the user's own copy of the original, which the README calls closed-source freeware. Credits name individual rights holders for the music and for vutne art. The repo does not say whether the ega/ and vga/ images are original-derived conversions or new work. Status: "fan project, original data proprietary, per-asset credits partial".

## 4. Classes per group

- Game data tables: C.
- ega/ PNG: C (licence not stated).
- U4-Upgrade vutne/ PNG: C (credited, no licence line).
- U4-Upgrade vga/ PNG: C (no credit line).
- Music OGG (minstrel): C (credited, no licence line).
- Sound: stone_falling.ogg is A with credit (CC BY 3.0). The other 33: C.
- Shaders and fonts: C (licence not stated).
- Docs: C (not stated; not needed as assets).
- Overall best class: C. One CC BY 3.0 sound is usable with credit.

## 5. Inspiration (category level, own words)

Rule for this donor: the original data is proprietary, so every item below stays at category level. No constants, colour values or exact looks are given here. Paths are for a human to check.

- Data-driven terrain rules (DATA FIRST: config.b line 132). Each terrain row sets walk, swim and sail flags, a speed class and an optional status effect. One terrain is a slow terrain with a damage-over-time status (line 136). Shape to copy for zone-as-data (rows 20-21) and terrain speed modifiers.
- Encounter fields on each creature row (config.b line 48 onward; a sea-vessel row at line 73 has an encounter size). Each row also sets movement mode (fixed or wandering), whether it can step onto the player, and whether it refuses to attack. Shape for spawn data (row 23).
- Roaming hazards (config.b lines 80-81): two entries whose rows set wandering movement, a not-attack flag and can-move-onto-avatar. The engine's attackability test is creature.cpp line 54; how these row flags map onto it was not read. Reads as weather rather than an enemy. Idea for a telegraphed roaming hazard (vfx, threat readability).
- Three named cast cues (module/Ultima-IV/sound/spell_precast_dos.ogg, spell_flash_dos.ogg, fizzle.rfx). Roles are inferred from the file names; the audio was not played. Fit for specials (row 13) and combat sound cues (row 12).
- Context-named music (module/Ultima-IV/music/minstrel/). One bed per place or state, plus a fanfare. Fit for music layering by biome and border crossfades (sound-music topic).
- Shadowcast occluders (src/gpu_opengl.cpp line 1514; module/render/shader/shadowcast.glsl). A GPU path takes occluder shapes for 2D line-of-sight. Idea for dark zones or the Pit (camera, vfx).
- Depth-keyed dungeon dressing (module/Ultima-IV/image/ega/dung0ma.png, dung1ma_door.png, dung3ma_door.png). The art set changes by depth. Idea for zone dressing variants.

## 5b. Inspiration briefs

Rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait kept and the trait changed. Full entries are in xu4-engine-u4.assets.json under "briefs".

1. Roaming storm ring. Keep: a roaming hazard with wandering movement, a not-attack flag, and the ability to carry the player off line. Change: a telegraphed spinning ring with a ground shadow and a slow tick sound; a storm, not water. Ref: module/Ultima-IV/config.b lines 80-81.
2. Mire slows and stings. Keep: one terrain row that carries a speed class and a status effect. Change: poison shown as a green ring on the feet with a drip sound, a different terrain. Ref: module/Ultima-IV/config.b line 136.
3. Three-beat cast cue. Keep: separate audio for cast start, a flash, and a failed cast (roles inferred from file names). Change: length and pitch by spell school; a visual tell on failure. Ref: module/Ultima-IV/sound/spell_precast_dos.ogg; spell_flash_dos.ogg; fizzle.rfx.
4. Depth-keyed dressing. Keep: one dressing set per depth. Change: one tile set with a colour band per depth. Ref: module/Ultima-IV/image/ega/dung0ma.png (path only, not opened).

Top-striking criteria applied: silhouette at 375 wide, one signature behaviour (the hazard drift, the mire status, the failed cast), one signature sound (the three-beat cast). Resemblance target 20-30 percent.

## 6. Cross-link to our topics

- camera: shadowcast occluders (src/gpu_opengl.cpp line 1514).
- zones: terrain rules as data (config.b line 132); dungeon dressing by depth.
- spawns: encounter fields and movement flags (config.b line 48 onward).
- loot: none found in the parts read.
- hud-ui: 16-entry palette table and layouts (config.b line 442; layouts section near line 513). Layouts not read.
- vfx: shadowcast; roaming hazard.
- animation: tile animation not read.
- sound: music by context; three-beat cast cue; hit and block cues in module/Ultima-IV/sound/.

## Not read

- All PNG, OGG, WAV, RFX and TXF files: names and counts only. Nothing opened, played or sized.
- config.b beyond the cited lines and the armour and weapon tables; maps.b, vendors.b and graphics.b bodies (headers only).
- U4-Upgrade .b files (listing only).
- src/ except creature.cpp lines 54-62 (isAttackable) and the signature at line 304, and gpu_opengl.cpp line 1514.
- doc/U4Spells.md and other doc/ text beyond names.
- The original Ultima IV data: not in the repo.
