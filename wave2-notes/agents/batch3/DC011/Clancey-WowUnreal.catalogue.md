# Clancey-WowUnreal (catalogue, DC011)

Donor/Licence: /mnt/frankendom-donors/Clancey-WowUnreal/. Code licence unclear: README.md:583 links a LICENSE that is not in the tree. The only licence file present is Source/ThirdParty/StormLib/LICENSE (MIT). Content/ packages (508 external actor and object packages, 3 materials, 10 maps) have no stated licence or origin (AU009). Asset audit class C. Inspiration from Content/ stays category-level; ideas below come from code and specs, in own words. Recreate as a clearly distinct original, never a copy.

Half read: client (UE5 modules: WowUI, WowUnreal, WowWorld, WowData loaders, WowNetwork packet handler and entity structs, WowAssets equipment). The paired server half is in the box: azerothcore-azerothcore-wotlk (named only; not read by DC011). Data pack (user-supplied WoW 3.3.5a MPQ, README line 43 per AU009) is not in the repo.

Data first: no game data tables in the repo. DBC binaries are user-supplied. The repo holds the DBC schemas as code: 32 table wrappers under Source/WowData/Public/Formats/Dbc/ (33 headers including DbcStore.h; the matching .cpp set is in Source/WowData/Private/Formats/Dbc/). No string table or locale file in the repo. UI global strings live in code (Source/WowUI/Private/LuaApi/LuaGlobals.cpp), not counted here.

Counts (records present in the repo): creatures 0, classes 10 (playable class table, read), weapons 0, gear_sets 0, zones 0. Map type codes: 5 (schema comment). Race names read: 7 ids (4, 5, 6, 7, 8, 10, 11).

## 1. Creatures / beasts
- None in the repo. No creature families, tiers, bosses or elite patterns.
- Loader shapes only: CreatureDisplayInfoDbc and CreatureModelDataDbc wrappers (Source/WowData/Public/Formats/Dbc/CreatureDisplayInfoDbc.h, CreatureModelDataDbc.h). Records not read.
- Rank field in WowEntity.h:996 is talent rank (0-5), not a creature tier. Do not read it as one.
- Death presentation (not creature content): on death a corpse-reclaim timer is set on the death screen (Source/WowUnreal/WowDeathManager.cpp:132-138); spirit release is at line 110.
- Top 8: none. The repo has no creature content to judge.

## 2. Classes / races / factions
- Classes (10, WowCharacterCreateWidget.cpp:18-20): Warrior 1, Paladin 2, Hunter 3, Rogue 4, Priest 5, Death Knight 6, Shaman 7, Mage 8, Warlock 9, Druid 11.
- Role and signature mechanic per class: not in the repo (spell data is a Spell.dbc wrapper; not read).
- Progression shape: talents are learned by rank through SendLearnTalent (Source/WowNetwork/Private/WowConnectionManager.cpp:1408-1424); talent rank 0-5 (WowEntity.h:996).
- Races (read): Undead 5, Tauren 6, Gnome 7, Troll 8, Blood Elf 10, Draenei 11 (WowCharacterCreateWidget.cpp:13-14); Night Elf 4 and Undead/Tauren/Gnome/Troll also in WowCharacterSelectWidget.cpp:16-18. Ids 1-3 not read in this file.
- Race silhouette rule: the character preview scales by race, tallest for Tauren, tall for Draenei, shortest for Gnome (Source/WowUnreal/WowCharacterPreview.cpp:137-147). This is a readability rule, worth keeping.
- Factions: AreaTable team field (neutral, Horde, Alliance codes; Source/WowData/Public/Formats/Dbc/AreaTableDbc.h:17).

## 3. Weapons
- No weapon records or families in the repo.
- Hand grips are attachment points: RightHand = 1 (main-hand grip), LeftHand = 2 (off-hand grip) (Source/WowAssets/Public/WowEquipmentManager.h:21-24). Weapon mesh and tier looks: not read.
- Top 5: none meet the test (no weapon data).

## 4. Armour / gear
- Quality tiers: six, numbered 0-5 from poor to legendary (Source/WowNetwork/Public/WowEntity.h:67). The colour function (Source/WowUI/Private/WowInventoryManager.cpp:131-141) and the loot window ladder (Source/WowUI/Private/Widgets/SWowLootWindow.cpp:107-114) use the same six steps. Colours are set in code; not quoted here.
- Gap (defect): the inventory sets Quality from a fixed default, not from data (WowInventoryManager.cpp:165 `Slot.Quality = Slot.ItemEntry != 0 ? 1 : 0;`, with a comment at line 164 that quality is not in update fields). So bag and equipment tints do not show real tiers yet. The packet handler documents a per-item quality byte in one record layout (WowPacketHandler.cpp:1414 comment; that handler not read in full), so the data path for real quality exists. Keep the idea; fix: read quality from the item record.
- Armour look: equipment overlays composite a texture onto body regions by slot type; table of eight slot types (WOW_BODY_ARMOR_IMPLEMENTATION.md:41-48), including CHEST/SHIRT, ROBE, PANTS, GLOVES, BOOTS, BRACERS, BELT and TABARD.
- Geoset toggles: equipment changes which mesh sections show, not added meshes (same doc, Part 3, from line 50; group 8 for wristbands at line 59).
- Gear sets and material tiers (cloth to plate, mythic metals): none in the repo.
- Item display: ItemDisplayInfo wrapper (model names, textures, geoset groups per slot) (Source/WowData/Public/Formats/Dbc/ItemDisplayInfoDbc.h, not read).
- Top 5 striking: (1) per-slot texture overlay on one shared body; (2) section toggles for pieces; (3) six-step quality ladder on slot border and name; (4) quality from the loot packet; (5) model plus texture per slot from the display record.

## 5. Zones / dungeons
- Biome list: none in the repo.
- Map types (schema comment, Source/WowData/Public/Formats/Dbc/MapDbc.h:9): normal, instance, raid, battleground, arena. Dungeon and raid archetypes are therefore just codes; no dungeon data. MaxPlayers field at MapDbc.h:15.
- Area record (AreaTableDbc.h:7-17): parent zone, explore flag, area level, music id (ZoneMusicID, line 13), ambience id (line 12), intro music (line 14), team.
- Zone music day and night pair (ZoneMusicDbc.h:9-10): SoundDay and SoundNight ids.
- Liquids (LiquidTypeDbc.h:7-12): flags, type, sound id, spell id (liquid effect). Water types 0-3 (clear to deep), magma and lava types 4-7 (emissive, no transparency), slime types 8-11 (opaque, slight glow) (specs/water.md:20-40).
- Sky per zone (specs/sky-atmosphere.md:25-45): 18 colour bands as stated in the spec (line 27). Note: the wowrust DBC struct holds 16 time slots (see the wowrust catalogue, dbc.rs:109), while this spec says 18. The real count is not in the repo, so keep our own count.
- Hazards: magma and lava (emissive), slime (opaque, slight glow), liquid spell id field.
- Top 5 striking: (1) per-zone sky band with horizon-matched fog (specs/sky-atmosphere.md:35); (2) magma pool with an animated HDR glow for bloom (WowWaterMaterial.cpp:151-153); (3) shore-fade water by depth (specs/water.md:28); (4) zone music day and night pair with an ambience id per area (AreaTableDbc.h:12-13); (5) faction-owned area flag (AreaTableDbc.h:17).

## 6. Item and effect looks worth recreating
- Quality colour on the item slot border and name (Source/WowUI/Private/SWowBagWindow.cpp:30 comment; same idea in SWowLootWindow.cpp).
- HDR emissive hazard for bloom (Source/WowWorld/Private/WowWaterMaterial.cpp:151-153).
- Depth-faded water with shore blend (specs/water.md:28).
- Horizon-matched fog (specs/sky-atmosphere.md:35).
- Armour overlay on a shared body (WOW_BODY_ARMOR_IMPLEMENTATION.md:32-48).
- Music A/B crossfade on a 20 Hz tick, two music components plus one ambience component (Source/WowWorld/Private/WowAudioManager.cpp:14-38, crossfade at line 47-58).
- Minimap zoom clamp 50 to 500 yards with a zone name label (Source/WowUnreal/UI/SWowMinimap.h:49-60).

## 7. Inspiration for Frankendom (8 originals)
1. Layered Plate Overlay (row 15, gear dressing). Idea: armour is a texture overlay on a shared body, so a gear change costs one texture rebuild. Keep: overlay per slot on one body; section toggles for pieces. Change: our own region set (separate pauldrons); our silhouette by toggles; our trim motif. Ref: WOW_BODY_ARMOR_IMPLEMENTATION.md:32-48.
2. Six-Step Shine (row 18 loot roll; loot fold-in: drop ceremony, rarity colour and sound). Idea: six rarity steps shown on slot border and name. Keep: six steps; border and name tint; grey-to-top ramp. Change: our step names and hues (not copied); a sound stinger per step (the donor has none); a pulse only on the top two steps. Ref: SWowLootWindow.cpp:107-114.
3. Magma Bloom Pool (row 16 colour grade; zone data). Idea: a hazard pool with an animated emissive glow that blooms. Keep: HDR emissive tint, animated. Change: our palette; our pulse pattern; damage from a zone data field. Ref: WowWaterMaterial.cpp:151-153.
4. Dusk Band Sky (row 16). Idea: a per-zone colour band by time of day, fog equal to horizon. Keep: horizon-matched fog; time-driven bands. Change: our band count and palette; our moon and star layout; our clouds. Ref: specs/sky-atmosphere.md:35.
5. Shore-Fade Lake (row 16; zone data). Idea: depth fade makes water read as water. Keep: clear shallows, dark deep water, fade by depth. Change: our hue and foam pattern; per-biome shallows colour. Ref: specs/water.md:28.
6. Crossfade Stingers (sound fold-in; row 12 combat sound cues). Idea: two music players crossfade on a fixed tick, with a day and night pair per zone. Keep: A/B crossfade; day and night pair per zone. Change: a combat-entry stinger; our own tracks; our fade length. Ref: WowAudioManager.cpp:14-58.
7. Read Zoom Minimap (row 14 HUD; hud-ui fold-in). Idea: minimap zoom clamped to a fixed range, with the zone name shown. Keep: clamped range; zone name label. Change: our range; pinch zoom for touch (touch UX fold-in). Ref: SWowMinimap.h:49-60.
8. Corpse Reclaim Clock (row 17 death and respawn). Idea: a visible timer on the death screen before the corpse can be reclaimed, so a loss has a known length. Keep: timer on the death screen; spirit release first. Change: our timer length as zone data; our death-screen layout. Ref: WowDeathManager.cpp:110, 132-138.

Licence note: unclear (README.md:583 points to a missing LICENSE). Content/ origin not stated. Clean-room, shape only. StormLib is MIT and is library code only; not used here.

## Not read or not verified
- The 508 .uasset and 10 .umap binaries (names only, per AU009). Not opened.
- Source/WowAssets/Private/WowEquipmentManager.cpp, WowAnimationController.h, specs/character.md, specs/m2-animation.md, specs/terrain-lod.md, specs/ui-framexml.md (only the AU009 summary used).
- Spell.dbc, Talent.dbc and CreatureDisplayInfo/CreatureModelData records (wrappers named, records not in repo).
- WowCharacterCreateWidget.cpp lines 1-12 and 15-17 (not read in full); WowCharacterSelectWidget.cpp race lines 1-15 and 19+.
- Not checked: whether any creature, weapon or zone data exists in the MPQ-derived pipeline outside this repo.

Brief rule served: each original above is a recreation at 20-30 percent resemblance in mood only; the KEPT and CHANGED traits are named in each item.
