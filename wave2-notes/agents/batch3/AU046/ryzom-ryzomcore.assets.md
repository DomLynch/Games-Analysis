# ryzom-ryzomcore (Ryzom Core, NeL engine): assets (AU046)

Donor: /mnt/frankendom-donors/ryzom-ryzomcore (read on the VPS, read-only)
Halves: CLIENT data half read (ryzom/client/data/gamedev, ryzom/common/data_common, ryzom/common/data_leveldesign listing) plus the snowballs2 sample game (client and server position code). The SERVER half (ryzom/server; nelns/) is in the box and NOT read. The commercial game's own server is not in the box.

## Licences (as the files say)
- Source code: GNU AGPL v3. README.md line 5: "released under the terms of the GNU Affero General Public License 3.0 (GNU/AGPLv3) for the source code." COPYING line 1 is the AGPL title. nel/COPYING and snowballs2/COPYING are the AGPL text too.
- Art: README.md line 5: "The art assets are dual-licenced under the Creative Commons Attributions-ShareAlike 3.0 (CC-BY-SA) and Free Art License 1.3 (FAL 1.3)."
- Config: README.md line 55: "Configuration files are implied to be public domain samples, as they may contain sensitive data". Which files this covers is not listed in the file.
- Art asset groups the README covers are NOT in this box (see inventory). So the art licence line describes files I could not find here.

## Rights-holder status (repo files only)
- README line 49: "All original source code is copyright (C) 2001-2022 Winch Gate Property Limited."
- README line 15: "The Ryzom Core repository is maintained by the community independently. It is not officially affiliated with the commercial game". Contributor copyright is kept by authors (README lines 55-57, not summarised further).
- README line 37: the owner released "the full game client and server, as well as a substantial amount of graphics assets, were released as open source." The README's history section describes disputes with the owner about the community model (lines 39-45). I record that as the file says; I did not check it.
- Status: owner-released open source, community-maintained; the README does not describe a leak or decompile.

## Asset inventory (paths, counts from find; not opened unless said)
- Game art packs (models .shape, textures .dds, .tga for the world, audio .ogg): NOT in the box. Checks: no .dds or .ogg anywhere in the tree; 0 .png/.tga/.dds under ryzom/client/data; the texture files that families.txt names (root_bricks.tga, power.tga, area.tga) are not in the tree.
- Tool and editor images: the tree has 347 png, 58 tga, 137 bmp, 313 ico, 62 gif, 56 cur (all folders, by extension). Most sit under ryzom/tools/ (editor and installer icons, e.g. ryzom/tools/client/client_config_qt/resources/*.png) and studio/, web/. Not opened.
- NeL logo set: nel/resources, nelns/resources, snowballs2/resources (nel.png, nel.bmp, nevraxpill.ico, custom.ini). Engine logo.
- NeL sample models: 12 .shape placeholder files (nel/samples/pacs/shapes/cylinder.shape, arena.shape, rectangle.shape; nel/samples/3d/cluster_viewer/shapes/sphere01-08.shape, box02.shape). Plain primitives. Not opened (no binary read).
- NeL sample sounds: 6 .wav (nel/samples/sound/.../base_samples/beep.wav and tuut.wav, in four folders). Beeps. Not opened.
- Game DATA tables (text, the main thing worth reading):
  - ryzom/client/data/gamedev/bricks_client.txt: 54 lines (header + 53 rows). Counted by column 3: 8 ROOT, 27 KEY, 18 SUFFIX. Each row has a name, an id, a family, a syllable and an effect description.
  - ryzom/client/data/gamedev/families.txt: 15 lines (families: root, spell_power, effect_area, casting_time, range, characteristic, virulence, healing, and more).
  - ryzom/client/data/gamedev/formulas.txt: 9 lines (brick id to flag columns).
  - ryzom/client/data/gamedev/interfaces_v3/: 73 xml, 23 lua, 5 txt, 1 css (HUD, map, taskbar, trade, keys, help, loading tips).
  - ryzom/common/data_common/chat/: bs_combat.txt (40 lines, combat feed templates), bot_chat.txt (33 lines), chat_static.cdb and others.
  - ryzom/common/data_common/: 109 lua files (r2 scenario UI), database.xml (DB schema), msg.xml.
  - ryzom/common/data_leveldesign/: 28 .zone files and 262 .html (level-design; not opened).
- snowballs2 (NeL sample game): code, cfg and txt only. No art in that tree (its client/data holds a .gitkeep only). Snowball trajectory code is in server/position/snowballs/position/physics.cpp.

## Data first (names and looks)
- The names and effect text of spells live in ryzom/client/data/gamedev/bricks_client.txt (the brick table, columns name, id, type, family, syllable, effect, texture id, specific text). The look of a spell brick is a texture id; the texture files are not in the box.
- Feed and combat text: ryzom/common/data_common/chat/bs_combat.txt (keys like BS_YOU_ATTACK_E, with colour-prefix strings).
- HUD actions: ryzom/client/data/gamedev/interfaces_v3/map.xml (landmark and search actions).

## Asset classes per group
- Game art packs (README says CC-BY-SA 3.0 and FAL 1.3): class D here, ABSENT from the box. If the packs were obtained elsewhere, that is not this donor; I did not search for them.
- Tool and editor images: class C. README's art line does not say whether tool icons count as "art assets"; unclear, so C.
- NeL sample .shape and .wav: class B by location (nel/COPYING is AGPL). I did not check each sample folder for its own licence file. Mark as "not verified per folder".
- Game data text tables (bricks, families, formulas, interfaces, chat, data_common lua): class B (AGPL on the source tree). The README's line on configuration files as public domain samples may cover some of them; the file does not say which.
- snowballs2 code and cfg: class B (AGPL).

## Inspiration (own words; the mechanisms, not any look)
- Syllable-built spells: a spell is a root verb plus modifier bricks (a power level, a range, an area size). The bricks table has 8 roots, 27 modifiers and 18 suffix bricks, and each brick has a short made-up syllable (bricks_client.txt lines 2-53). Worth copying as a composition rule for a combat-ability builder: pick one verb, then one or more modifiers, and show the result as a readable word. Our own syllables and a 3-slot picker.
- Viewpoint combat feed: one message key per event with separate text for "you attack", "X attacks you" and "X attacks Y", plus a colour prefix per line type and placeholders for the entity names (bs_combat.txt lines 5-7). Clean shape for a combat log at 375 wide.
- Lob projectile: the flight is a fixed-duration function of time from start to end. Horizontal position is a linear blend, and a sine lift adds height that grows with the square of the throw distance (physics.cpp lines 32-35). A lob that reads as a throw without a physics sim.
- Map landmark actions as a data list: the map's landmark and search actions are rows of id, label key and handler (map.xml lines 12-32). Good shape for a data-driven world-map action row (hud-ui topic).
- Snowball lift defect: the derivative in evalSpeed (physics.cpp lines 43-44) does not divide the lift term by the flight time, and its horizontal speed comes from a separate _Speed. Keep the lift idea; fix: derive speed and lift derivative from the same flight duration, and clamp to the arc end.

## Briefs
See the .assets.json "briefs" array. Rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.

## Cross-links
- Spell composition (bricks): combat-ability builder (specials, row 13), progression (build diversity).
- Combat feed (bs_combat): hud-ui and combat feedback (row 14, row 10).
- Lob arc: projectile and combat-sim topics; also the spell-visual FX topic.
- Map landmark actions: hud-ui (minimap and world map).
- The data_leveldesign zone files: spawns and encounters topic (not read).

## Not read
- ryzom/server and nelns/ (server half); ryzom/client/src and ryzom/common/src (code only listed); nel/src and nel/samples code; studio/src, web/ (php); the 28 .zone files and 262 .html in data_leveldesign; interfaces_v3 xml and lua except the lines quoted for map.xml; bs_combat.txt beyond lines 5-7; bot_chat.txt; the 109 data_common lua files; .shape and .wav contents (not opened, by rule).
