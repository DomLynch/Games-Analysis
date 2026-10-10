# Clancey-WowUnreal: asset audit (AU009)

Scope: VPS tree /mnt/frankendom-donors/Clancey-WowUnreal/. Read-only. Not legal advice; this records what the files say.

## Licences (as the files say)
- Code: unclear. README line 583 says "See [LICENSE](LICENSE) for details." SPEC links the same. No root LICENSE file exists in the tree. The only licence file present is Source/ThirdParty/StormLib/LICENSE: MIT, "Copyright (c) 1999-2013 Ladislav Zezula" (line 3).
- Content/ (Unreal assets): no licence stated anywhere in the repo.
- Asset statement: README line 571 says "WowUnreal does NOT ship any Blizzard Entertainment assets." agents.md line 153 and SPEC.md line 17 say the same.

## Rights-holder status (repo files only)
Reads original game data at runtime. The user supplies WoW 3.3.5a MPQ files (README line 43, "Original WoW MPQ files (user-supplied)"). The README calls WoW a Blizzard Entertainment trademark and says the project is not affiliated. The repo calls itself an educational and research project covering protocol reverse engineering. No project copyright holder is named.

## Asset inventory
- Content/__ExternalActors__ and Content/__ExternalObjects__: 508 .uasset files, grouped under Variant_Combat, Variant_Platforming, Variant_SideScrolling and ThirdPerson. Binary Unreal packages; not opened. The folder names match Unreal Engine template level names; the repo does not say where these came from.
- Content/Materials: M_WowCharacter, M_WowSimpleObject, M_WowTerrainRuntime (3 .uasset). Not opened.
- Content/Maps: 10 .umap test and viewer levels (StreamingTest, TerrainTest, NetworkTest, MobTest, UITest, ModelViewer, CharacterTest, WmoTest, WowWorld, AnimationTest). Not opened.
- Content/ total: about 6.3 MB.
- Mismatch: README line 354 lists Content/Characters, Content/World and Content/UI. Only Materials and Maps exist.
- Source/ThirdParty: StormLib (MIT, code); lua (only a Makefile seen in the listing); pugixml (pugiconfig.hpp seen).
- Config: five .ini files. Scripts: two .py and several .sh.
- Code: about 670 .c, .h and .cpp files, including vendored StormLib and Lua C sources; 32 .txt files sit under Source/.
- Game data: none in repo; the user supplies MPQ data.

## Classes by group
- Unreal level and object packages: C (origin and licence not stated).
- Materials: C.
- Maps: C.
- StormLib: A (MIT; keep the notice; library only).
- Scripts, configs, test Lua: C (repo licence unclear; code).
- Game data: D (not in repo).
- best_class: C. No usable art in the repo with a stated licence.

## Inspiration (own words)
- Armour as texture layers: one body texture per character, equipment textures composited onto body regions by item type (WOW_BODY_ARMOR_IMPLEMENTATION.md, region table near line 36). Our version: our own body paint and armour layers.
- Armour as mesh toggles: equipment shows or hides mesh sections rather than adding meshes (same doc, Part 3). Our version: per-piece section toggles.
- Shore-fade water: depth-based transparency (specs/water.md line 28), with a shore blend from a depth map. Our version: painted or computed depth mask, our own hue.
- Horizon-matched fog: fog colour equal to horizon colour (specs/sky-atmosphere.md line 35); sun and moon from time of day.
- Character composite: base skin, face and underwear baked into one texture; hair laid onto scalp for under-helm wear (specs/character.md, composite section).
- UI from layout files: XML-style layout parsed into a frame tree, with Lua hooks (specs/ui-framexml.md). Our HUD: layout file plus scripts, our own widget set.

## Inspiration briefs
1. Layered plate chest. Why: armour reads as a real overlay; a gear change costs one texture rebuild. Keep: region map per armour class; overlays on a shared body; section toggles. Change: our region set (separate pauldrons); our silhouette via toggles; our trim motif. Ref: WOW_BODY_ARMOR_IMPLEMENTATION.md.
2. Shore-fade lake. Why: depth fade makes water read as water. Keep: clear shallows; deep dark water; shore fade by depth. Change: our hue and foam pattern; per-biome shallows colour. Ref: specs/water.md line 28.
3. Horizon-matched dusk. Why: fog hides the seam with the sky. Keep: fog equal to horizon; sun from time; gradient bands. Change: per-biome colour set; our moon and star layout; our clouds. Ref: specs/sky-atmosphere.md line 35.

## Cross-link
- zones: terrain material, sky spec (specs/sky-atmosphere.md, specs/terrain-lod.md).
- vfx: water spec (specs/water.md).
- animation: M2 animation spec (specs/m2-animation.md).
- hud-ui: FrameXML spec (specs/ui-framexml.md).
- loot and equipment look: armour overlay doc.
- camera, spawns, sound: specs exist (specs/audio.md) but no non-code assets to look at in the repo.

## Not read or not verified
- The 511 .uasset and 10 .umap binaries: names, counts and one magic-byte check only; not opened in Unreal.
- .txt, .md and .sh files: not read beyond grep hits.
- specs/character.md, terrain-lod.md, m2-animation.md, audio.md: cross-link only, not read in detail.
- lua and pugixml licence files: none found; not read further.
- .cpp and .h sources: grep for copyright and licence strings only.
