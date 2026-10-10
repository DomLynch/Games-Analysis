# LanternEQ-LanternExtractor (design catalogue, DC033)

Donor: /mnt/frankendom-donors/LanternEQ-LanternExtractor/
Half read: TOOL side. C# extractor source (144 .cs files on disk) plus the data it ships: LanternExtractor/ClientData/animationsources.txt (249 lines), settings.txt (78 lines), EQ/Sound/EffSounds.cs and SoundConstants.cs.
Paired donor: LanternEQ-LanternUnityTools (CONSUMER side, in this box, own catalogue file in this folder). The Unity copy of animationsources.txt differs by one family (Invisible Man, line 164).
Not read: EQ/Wld/* (zone, object, character and equipment parsers), EQ/Archive/*, most of EQ/Sound/*, Infrastructure/* except EffSounds, the .sln and .csproj files. No binary files are in the repo.
Restricted note: none in this folder.

Licence (as the files say): code is MIT (LICENSE line 1 and line 3, "Copyright (c) 2024 LanternEQ"). README line 51 says the repo ships source code only, with no game assets. The animation map and settings have no licence line of their own and are EverQuest-derived, so they are class C: category-level inspiration only. Nothing here may be copied as an instance-level look.

Rights holder: EverQuest is a Daybreak trademark; README line 52 says the project is not affiliated.

## Counts (verified on the VPS in this session)
- Creature/model families in the rig map: 74 headers, 101 body-to-rig rows, 30 distinct rig codes (Unity copy; same rig set).
- Classes (class names in code): 0 found by grep in the .cs files.
- Weapons, gear sets, zones: not in this half. Left null in the JSON, not zero.

## 1. Creatures / beasts
- Families are data rows: one body code paired with one shared skeleton code. Rig sharing is the design fact. The most-shared humanoid rig covers 21 body rows, the second 16, and the dragon-type rig 4 (animationsources.txt lines 3-4 and 225-250).
- Escalation with level: not in this half (level data is not in the box).
- Signature abilities: not in this half (animation labels only; see the Unity catalogue for the animation code table).
- Boss or elite pattern: none in this half. The oversized-scale path is in the Unity code (RaceHelper.cs lines 96-149).
- Family-level note: 11 lines carry a "guess" or "verify" tag (grep count), so the map is partly unverified.

### Top 8 striking (family-level, own labels)
1. Dragon family on one skeleton. Four dragon-type families share one rig (animationsources.txt lines 225-226, 237-238, 243-244, 249-250). Why: one rig gives a whole dragon family. Keep: one skeleton for the family. Change: silhouette from wing and crown meshes, not palette.
2. Winged stone guardian. Gargoyle family (lines 59-60) shares its rig with an imp family (lines 68-69). Why: a winged humanoid with a still idle reads at 375 wide. Keep: the still winged idle. Change: jagged wings and an ember chest core.
3. Shelled crawler. Beetle family (lines 50-51) on a rig code that reads as spider (the rig is not opened). Why: low wide silhouette, quick scuttle. Keep: the low scuttle. Change: spiked ridge and a burrow-up attack.
4. Feline pack. Four cat families (lines 77-78, 95-96, 109-110, 161-162) share one feline rig. Why: one animation set gives four sizes. Keep: one feline rig. Change: markings and a pounce gap-closer.
5. Horned brute. Minotaur family (lines 80-81) on a shared rig code (the rig's body is not opened). Why: heavy stride and a horned head read at a distance. Keep: heavy stride. Change: antler spread, chain belt, dust ring on stomp.
6. Undead on living rigs. Skeleton (lines 92-93), zombie (lines 101-103), ghoul (lines 62-63), Iksar skeleton (lines 193-194) reuse humanoid rigs. Why: undead cost no new animation. Keep: shared rig with a different idle. Change: bone-gap silhouette and a rattle sound.
7. Winged beasts on one flight rig. Griffin (lines 71-72), sphinx (lines 125-126) and flying monkey (lines 199-200) share one rig code. Why: three families, one animation set (flight is inferred from the family names, not read). Keep: the flight rig. Change: wing shape and ground stance.
8. Wyrm and ghost dragon. Wurm (lines 190-191) and ghost dragon (lines 246-247) share a dragon rig. Why: a serpent and a spectre read as one family. Keep: shared rig. Change: a ghost trail and a ground-coil idle.

## 2. Classes / races / factions
- None in this half. The races, including playable race IDs, are in the Unity catalogue.
- Race or model codes are used as keys: 74 families here, 26 playable model codes in the Unity code.

## 3. Weapons
- Not in this half. Attack animation families are in the Unity code (AnimationType.cs). This half only ships the rig map.

## 4. Armour / gear
- Not in this half. No set or tier data in the read files.
- Gear visuals (equipment slots, tint, robes) are in the Unity catalogue.

## 5. Zones / dungeons
- Zone meshes can be exported as region groups or as one mesh (settings.txt lines 17-23). Each region mesh is a BSP region. Default is one combined mesh.
- Hidden geometry (invisible boundaries) is an export switch (settings.txt line 27).
- Biome list, dungeon archetypes, hazards: not in this half (zone list is in the Unity donor).

### Top 5 striking (structural)
1. Region-split zone meshes (settings.txt lines 17-19): the donor exports one mesh per BSP region; streaming or culling is our choice. Keep the split. Change: our own region size.
2. Hidden geometry as collision-only boundaries (settings.txt line 27). Keep: invisible walls as data. Change: a visible soft barrier at 375 wide.
3. Zone sound and music instances placed in the world (README lines 17-22 and EffSounds.cs line 12). Keep: sound as zone data. Change: our own placement tool.
4. Vertex-colour baked zone lighting (README line 17). Keep: a cheap baked look. Change: our own palette per zone.
5. Single-file zone export (settings.txt line 23 default off). Keep: the option to export one mesh per zone for phones. Change: nothing.

## 6. Item / effect looks worth recreating (with paths)
- Region-split and combined zone export: /mnt/frankendom-donors/LanternEQ-LanternExtractor/LanternExtractor/settings.txt lines 17-23. Technique: export option, one mesh or many. Use to plan zone streaming.
- Invisible collision boundaries: settings.txt line 27. Technique: export switch for hidden geometry.
- Sound instances with EMIT and LOOP types: /mnt/frankendom-donors/LanternEQ-LanternExtractor/LanternExtractor/EQ/Sound/SoundConstants.cs lines 5-6. Technique: emitter type on a placed sound. Shows as an ambient loop or a one-shot.
- Fixed 84-byte binary entry with position, radius and type: EQ/Sound/EffSounds.cs lines 12-16 and 60-64. Technique: flat record, no header. Good template for a fast zone-data file on phones.

## Per-topic fold-ins (Strategy rule)
- Sound-music: the EFF record carries a radius, a type and, for music, day and night loop counts and a fade-out in ms (EffSounds.cs lines 77-86). That is data-driven layering. Read more in the Unity catalogue.
- Spawns: not in this half.
- Idle and ambient: not in this half (the animation labels are in the Unity catalogue).
- Death and respawn, boss intro, readability at 375 wide: not in this half.

## Defects seen (keep the idea, fix the defect)
- EffSounds.cs lines 41-42 open a file and a BinaryReader and never close or dispose them. Fix: wrap both in using blocks. Decision: adapt (idea: flat binary sound records).

## Inspiration for Frankendom (category-level, never a copy)
1. Shared-rig dragon family: one skeleton, four silhouettes. Keep the one-rig family. Change the wing and crown silhouettes; no palette copy.
2. Winged ember guardian: keep the still winged idle; change to jagged wings and an ember core.
3. Shelled crawler for swarm fights: keep the low scuttle; change to a spiked ridge and a burrow-up attack.
4. Feline pack on one rig: four sizes, one animation set; change markings and add a pounce gap-closer.
5. Undead on living rigs: keep reuse of humanoid clips; change the bone-gap silhouette and rattle sound.
6. Winged beasts on one flight rig: keep one flight rig; change wing shape and ground stance.
7. Region-split zone streaming: keep split and cull by region; change region size to our tile grid.

## Not read
EQ/Wld/* (zone, object, character and equipment parsers), EQ/Archive/*, most of EQ/Sound/* (AudioInstance, MusicInstance and the sound bank in EffSndBnk.cs are not opened), Infrastructure/* except EffSounds, settings.txt beyond the lines cited, the .sln and .csproj files, the external wiki. The sqlite database, soundfont and music files are in the Unity donor and were not opened there either.

## Reuse tag
Reuse-first: the animation rig map and the zone region split are reusable shapes. No code from this donor is adopted.

## Brief rule served
Recreate as a clearly distinct original, never a copy. Each item above names the trait KEPT and the trait CHANGED.
