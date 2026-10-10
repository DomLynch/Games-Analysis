# jynew-jynew (asset audit, AU027)

Donor: jynew-jynew (Unity 2020 wuxia RPG framework, Chinese-language project; a 3D remake and framework tribute to the classic DOS game). Tree: /mnt/frankendom-donors/jynew-jynew/ (top level: LICENSE, COMMUNITY_LICENSE_FOR_JYX2/, README.md, CONTRIBUTING.md, .gitignore, jyx2/). jyx2/ holds about 42,200 files: 22,212 .meta, 3,620 .png, 3,236 .cs, 2,438 .mat, 2,337 .prefab, 1,774 .FBX, 1,297 .lua, 1,228 .asset, 410 .unity, 185 .txt, 169 .mp3, 154 .wav, 142 .tga, 110 .exr, 84 .jpg. Read by listing, counting, grep and sed only. Donor is large; this note covers the licence layer, the mod data layer and the battle code.

## Licence (conflicting; class C)
- Root LICENSE (Chinese and English): not a standard open licence. It says no resources or code of the project may be used unless authorised by the project's public statement, and that unauthorised commercial use is prohibited (LICENSE lines 8-9). Those lines are the file's text, not a legal reading.
- COMMUNITY_LICENSE_FOR_JYX2/README.md line 6 says the community agreement covers folders with a COMMUNITY_LICENSE marker and overrides "this project's MIT licence". Line 7 limits use to this project and its mods, for any purpose, commercial or not.
- Code header: Lua files in jyx2/Assets/LuaScripts/Jyx2Battle say all code uses the MIT licence (DamageCaculator.lua line 5). Resource and third-party licences are said to be separate.
- So: code is labelled MIT in file headers, but the root LICENSE restricts code and resources. Conflicting, so class C for code too. Frankendom may read the mechanisms; no code is copied here.

## Licence markers in the tree (folder-level)
- COMMUNITY_LICENSE marker (community protocol, no use outside project and mods): jyx2/Assets/3D/, jyx2/Assets/3DScene/, jyx2/Assets/BuildSource/, jyx2/Assets/BuildSource/head/ (marker text: COMMUNITY_LICENSE_FOR_JYX2.md line 3). Class C.
- UNAUTH_ASSETS marker (the project says it does NOT hold a licence for the folder; default covers subfolders): jyx2/Assets/3rd/ (4,703 files), jyx2/Assets/VFX/ (7,633 files) and its packs EffectsPackage, Toon_Explosion_V1, Jyx2Effect, JMO Assets; jyx2/Assets/3D/juese, juese2, Jyx2Timeline/Animation, Animal pack deluxe; jyx2/Assets/BuildSource/Items (407 files), ModelWeapons, Musics, SoundEffect, sound; jyx2/Assets/Resources/TileWorldCreator. Marker wording at UNAUTH_ASSETS_FOR_JYX2.md line 3. Class C, and the file itself says no licence is held.
- No marker: jyx2/Assets/Mods/ (5,485 files), jyx2/Assets/Resources/ (804 files), jyx2/Assets/Plugins/ (5,968 files, TapTap SDK and other plugin files), jyx2/Assets/LuaScripts/, jyx2/Assets/Prefabs/, jyx2/TapSdkFiles/. These fall under the root LICENSE only: class C.

Rights-holder status: unknown from the repo for the underlying Jin Yong novel and the classic DOS game (README names the DOS game as the tribute source; it does not state who owns the rights). The project's own assets: community protocol and "unauthorised" statements on third-party folders. Unknown beyond that.

Halves read: the Unity client (jyx2/Assets, Lua battle logic, config readers). Server half: none (single-player Unity project). Data pack: the mod data (Mods/JYX2, Mods/SAMPLE, Mods/xiastart_roguelike, each with Configs/, Lua/, Maps/, Models/, Skills/) was listed, not opened. Paired donor in the box: none.

best_class: C. No folder is clearly class A or B. Shipped code, data and art are all either community-protected, unauthorised by the project's own marker, or under a conflicting root licence.

## Data first (tables that hold names and looks)
- Config workbooks: jyx2/Assets/Mods/JYX2/Configs/ has eight .xlsx workbooks (battle, game settings, characters, martial-arts skills, shop, bonuses, scenes, items). SAMPLE has seven, xiastart_roguelike has eight. Filenames are in Chinese: the names above are our translations. The workbooks are binary (.xlsx), so not opened.
- Config grammar: jyx2/Assets/Mods/JYX2/Configs/README.md defines the format. Cell A1 must read the marker word for the sheet to load (line 13). Row 2 is a Chinese description, row 3 the type, row 4 the field name, data from row 5 (line 16). Nested lists use separators per row. This is the best reference for our data grammar, not the art.
- Loader: jyx2/Assets/LuaScripts/Jyx2Configs/Jyx2ConfigMgr.lua (94 lines, not read beyond name), ItemHelper.lua (48), MapHelper.lua (68).
- Names and looks: character and item names are in the workbooks (not opened). Item icons: jyx2/Assets/BuildSource/Items (407 files incl. .meta, numbered PNG icons, unauthorised).

## Inventory (what is in the box, by kind)
- Models: about 4,838 files under 3D/ and 1,774 .FBX overall; unauthorised or community-protected. Not opened.
- Animation: 241 .anim in BuildSource/Animations, plus 502 .anim across the tree; there is a skill-animation standard doc (BuildSource/README_JYX2技能动画标准.doc, binary, not opened). Class C.
- Effects: 7,633 files under VFX (unauthorised packs). Class C.
- Scenes and maps: Mods/JYX2/Maps (136 .asset, 119 .unity, 58 .exr, 16 .lighting, 55 .png); plus 3DScene (8,423 files, community). Class C.
- Audio: BuildSource/Musics (24 mp3, unauthorised marker), BuildSource/SoundEffect (120 mp3, 2 wav, unauthorised), BuildSource/sound (79 wav, unauthorised). Class C.
- UI art: BuildSource/UI, Resources (97 png), Mods (245 png). Class C (root licence only for Mods and Resources).
- Battle code (Lua, 5 scripts in Jyx2Battle plus 3 in Jyx2Configs; 1,271 .lua under Mods): code header MIT, root licence restricts. Class C (conflict).
- Text: 185 .txt overall (readme and release notes); not read beyond the config README. No dialogue table opened.

## Battle code (read in part; mechanism only)
- DamageCaculator.lua (286 lines): the skill-result function (line 149) splits basic attacks from skill casts. Basic attack: a primary integer formula of attack against scaled defence, plus two small random jitters (line 177). If that is not positive, a weaker fallback formula based on attack (line 183). If still not positive, zero. Otherwise a stamina term and a hurt term are added (line 194). A caster with too little MP still does a small random chip hit (line 167).
- Cover shapes: RangeLogic.lua (187 lines) gets cast blocks from a shape and size (line 146). The shapes include point, line, cross, rectangle and rhombus, plus area. DamageCaculator.lua line 197 gives the distance rule: for point, line and cross, distance is the count of cells between the two; for area, it adds the enemy's distance to the impact point.
- AI cast chooser: AIManager.lua (840 lines) scores each candidate cast with a cover-shape function (line 442). Point casts score by a single check (line 447). Rectangle and rhombus casts add a sub-score per alive unit inside the shape (lines 459, 475), weighted and summed. The best score wins.
- Status effects: poison, medicine, detox and hidden-weapon helpers (DamageCaculator.lua from line 30): each is a skill minus a resistance, with integer division and a clamp at zero (line 30 onward; formula per helper not all read).

## Inspiration (creative notes, our own words)
- Layered damage fallback: a primary formula, then a weaker attack-only fallback, then zero, then small bonus terms. Keep the layered fallback so a hit never reads as zero without reason; ours is our own numbers in data, decided by the engine (row 1 duel step).
- Chip strike when out of mana: a caster without the resource still does a small random hit (DamageCaculator.lua line 167). Keep the no-dead-air hit; ours shows a visibly strained state, not a free damage number.
- Cover shapes as data: point, line, cross, rectangle, rhombus, area, with a clear distance rule (RangeLogic.lua line 146; DamageCaculator.lua line 197). Keep the shape taxonomy and the distance rule; ours uses arc and cone in 3D.
- Scored cast chooser: one score per candidate cast and target, summed over the shape, best score wins (AIManager.lua lines 442-475). Keep the scoring-per-shape; ours adds threat, leash and range terms (row 2 AI brain, row 4 fight loop).
- Spreadsheet config grammar: marker cell, description row, type row, name row, data rows, list separators (Configs/README.md lines 13-16). Keep designer-edited sheets with type checks; ours uses a validated JSON or CSV catalogue.
- Resistance-then-clamp status effects: poison, detox and medicine as skill minus resistance, integer, clamp at zero (DamageCaculator.lua line 30 onward). Keep the clamp-at-zero rule; ours is per tick under row 17 death and row 8 wounds.
- Battle logic split by responsibility: battle init, battle manager, AI, range and damage in separate files. Keep the split; ours is one engine in src/fight.

## Briefs (category-level for assets; mechanism for code)
Rule for all briefs: recreate as a clearly distinct original, never a copy. Top-striking criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance. No creature or item art is opened here; briefs are mechanism-level.
1. Shape strike (our own label; category: skill cover). Why: a readable shape on the ground tells the player where a blow lands. Keep: shape taxonomy and the distance rule. Change: arc and cone in 3D, telegraphed by a ground decal, cells replaced by continuous distance. Ref: /mnt/frankendom-donors/jynew-jynew/jyx2/Assets/LuaScripts/Jyx2Battle/RangeLogic.lua line 146; DamageCaculator.lua line 197.
2. Low-resource chip (our own label; category: fight feedback). Why: a near-empty caster still acts, which keeps the fight moving. Keep: a small random hit with no free win. Change: a strained state with a colour and sound cue, not a plain number. Ref: DamageCaculator.lua line 167.
3. Shape-scored cast pick (our own label; category: AI). Why: one number per candidate makes AI choices legible in tests. Keep: a per-target sub-score summed over the shape, best wins. Change: add threat and leash terms; per-tick budget per row 18. Ref: AIManager.lua lines 442-475.
4. Designer sheet with a marker cell (our own label; category: data). Why: designers edit rows without code, and bad rows fail loudly. Keep: marker cell, type row, data rows, nested lists. Change: JSON or CSV with a schema; no Chinese field names in the engine. Ref: Mods/JYX2/Configs/README.md lines 13-16.

## Cross-link to our topics
- camera: no camera code read in this donor. Not read.
- hud-ui: item icons (BuildSource/Items) are unauthorised; the layout is not read.
- vfx and sound: unauthorised packs (VFX, sound folders). Category-level references only.
- loot and progression: items and shop data are in workbooks (binary, not opened); names of the shop and bonus sheets are a reference for loot and progression rows 18 and 21.
- spawns: scenes and maps (Mods/JYX2/Maps) are binary and not opened.

## Not read
- The .xlsx workbooks (binary) and the .asset, .unity, .prefab, .mat, .anim, .FBX, .exr files (binary or scene data): listed by extension only.
- The Chinese skill-animation standard .doc (binary).
- Most Lua: DamageCaculator.lua lines 1-148 and 199-286 only in part; AIManager.lua beyond lines 442-475; RangeLogic.lua beyond line 146; ItemHelper, MapHelper and Jyx2ConfigMgr not opened beyond names.
- Mods/SAMPLE, Mods/xiastart_roguelike folders (listed by name only).
- All images, audio and models: not opened, counts only.
- The third-party plugin tree (Plugins, 5,968 files) and TapSdkFiles: listed only.
- No dialogue or story text was opened; quest and lore text is not summarised here.
