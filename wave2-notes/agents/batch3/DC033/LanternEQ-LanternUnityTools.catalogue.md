# LanternEQ-LanternUnityTools (design catalogue, DC033)

Donor: /mnt/frankendom-donors/LanternEQ-LanternUnityTools/
Half read: CONSUMER side. Unity importer and runtime code (139 .cs under Assets/Scripts/Lantern/EQ and 50 under Assets/Scripts/Infrastructure/EQ), the EQ shader and HLSL files, plus the data that ships in the repo: Content/ClientData (animationsources.txt, music_tracks_used.txt, 8 zone list files), StreamingAssets/ClientData (RaceSounds.csv, Music/music_tracks.txt).
Paired donor: LanternEQ-LanternExtractor (TOOL side, own catalogue in this folder). Its animationsources.txt has one fewer family (Invisible Man is only in this copy, line 164). Line numbers below are for this copy unless marked Extractor; this copy is +3 after line 164.
Not read: most of the 189 .cs files (about 25 opened), shader bodies beyond EQSimpleLitForwardPass.hlsl and EQInvisible.shader, the sqlite database (Database/lantern_server.db, 76,374,016 bytes, NOT opened: EverQuest-derived server data of unclear origin, so class C), the soundfont (synthusr_samplefix.sf2, not opened), plugin binaries, PDFs, EmojiOne sprites, the MusicImporter body, the IMusicInvoker implementer (none exists in the repo, see below).
Restricted note: none in this folder.

Licence (as the files say): code is MIT (LICENSE line 1, copyright line 3, 2024 LanternEQ). Third-party: DryWetMidi (MIT), MeltySynth (MIT per its LICENSE line 1). README line 40 says source code only. The shipped data (RaceSounds.csv, zone and music lists, animation map, soundfont, sqlite database) has no licence line and is EverQuest-derived: class C, category-level inspiration only.

## Counts (verified on the VPS)
- Creature/model families in animationsources.txt: 75 headers, 102 body-to-rig rows, 30 distinct rig codes.
- Playable race entries (PlayerRaceId enum): 13. Race-flag entries (RaceIdDb enum): 16. Playable model codes (RaceHelper switch): 26.
- Distinct race IDs in RaceSounds.csv: 184 (225 data rows, 43 rows marked "Copied from", variant IDs 0 to 3).
- Animation enum entries (AnimationType): 79 (values 0 to 79). Name table: 81 entries. Mapping table: 78 entries.
- Class names in code: 0 (grep over Assets for the usual class names).
- Armour slots (Equipment2dSlot): 7. Held-item slots (Equipment3dSlot): 5. Body types (BodyType): 2.
- Zone descriptors (ZoneHelper): 126 (Antonica 50, Kunark 26, Velious 17, Faydwer 14, Odus 9, Planes 5, Other 4, Custom 1).
- Named gear sets: 0 found.
- Shader files: 4 .shader and 6 .hlsl under Content/Shaders/EQ; 17 .shader across all Assets.
- Music tracks: 83 in Content/ClientData/music_tracks_used.txt, 68 in StreamingAssets/ClientData/Music/music_tracks.txt. (The earlier audit's "83-line track list" is the used-tracks file.)
- Zone list lines: all 124, then 56 / 18 / 31 / 3 / 12 / 5 / 22 for the per-expansion files. The per-file sum (147) does not match the 126 descriptors. Not reconciled; treat both as unverified until someone checks.

## 1. Creatures / beasts
- Families are shared rigs. The humanoid core rig covers 21 body rows, the second humanoid rig 16, and the dwarf-type rig 10. The dragon-type rig covers 4 families (animationsources.txt lines 228-229, 240-241, 246-247, 252-253).
- Creature size is data, not art: RaceHelper keeps a height increment and a scale increment per race ID, with a default for everything else (RaceHelper.cs lines 96-149). The default is 0.625 height and 0.2 scale. Three giant kinds get height 20; those three plus a launch get scale 1.0. A ship gets scale 2.0 and a floating-eye type gets 3.0 height and 0.05 scale.
- Escalation with level: not in this donor.
- Signature abilities: not in this donor (animation labels only). Idle, social and damage codes are in AnimationType.cs and AnimationHelper.cs, see section 6.
- Boss or elite pattern: no explicit boss flag. The oversized scale path is the closest thing.
- Hidden-name monsters: RaceHelper.cs lines 171-182 hide the nameplate for two race IDs. The comment names three kinds and line 178 says one case is commented out ("an unknown flag is set"). So the skeleton-type case is excluded on purpose.
- Animation fallback chain: AnimationHelper.cs lines 180-189. A walk falls back to run, idle stand to passive stand, idle sit to passive sitting, and so on. Missing clips degrade to a close one instead of a T-pose.

### Top 8 striking (own labels; recreate as originals)
1. Ambush monster with a hidden nameplate (RaceHelper.cs lines 171-182). Why: the player only learns its name when it moves. Keep: the hidden-name flag as data. Change: a visible tell (a shimmering chest) and a reveal on the first hit.
2. Oversized monster scale path (RaceHelper.cs lines 96-149). Why: three giant kinds share one scale path with big height and scale numbers. Keep: scale as a per-kind data field with a default. Change: our own silhouette and a ground-shake stomp.
3. Invisible-body attacker (Invisible Man family, this copy lines 164-165; EQInvisible.shader line 80 returns a zero colour). Why: a collision-only attacker that is felt, not seen. Keep: collision with no visible mesh. Change: a heat shimmer or sound tell.
4. Posed tentacle object (AnimationHelper.cs lines 176-177, "pos" and "drf", the second is marked "tentacle pose"). Why: an animated object that holds a pose. Keep: a pose as a data key for objects. Change: our own plant or cave form.
5. Dragon family on one skeleton (animationsources.txt lines 228-229, 240-241, 246-247, 252-253). Why: four dragon-type families, one skeleton. Keep: one rig. Change: wing and crown silhouettes, own breath effect.
6. Humanoid core rig reuse (21 and 16 rows on two humanoid rigs). Why: many humanoid families for the cost of one animation set. Keep: shared humanoid clips. Change: silhouettes and idles.
7. Feline pack on one rig (four cat families). Why: four sizes from one set. Keep: one feline rig. Change: markings and a pounce gap-closer.
8. Undead on living rigs (skeleton, zombie, ghoul, Iksar skeleton families). Why: undead reuse humanoid clips. Keep: the shared clip set. Change: bone-gap silhouette and rattle sound.

## 2. Classes / races / factions
- Classes: none in this donor (0 class names found).
- Playable races (PlayerRaceId, 13 entries): twelve numbered base races (IDs 1 to 12) plus one further race (ID 128). Role: a playable model with its own body rig (RaceHelper.IsPlayableRaceModel, 26 codes). Mechanic: gender chooses the body variant (GenderId, 3 values; a neutral value exists). Progression: none in this donor.
- Race-gated items and spells: RaceIdDb is a 16-flag bitmask (RaceIdDb.cs lines 9-24). A race is a power of two (RaceHelper.cs line 163 shifts the ID by one). Keep: the bitmask for restrictions. Change: our own class or race mask, one ledger.
- Factions: none in this donor.
- Known fragility: the bit shift assumes the flag order matches the ID order past race 12 (not verified against data).

## 3. Weapons (attack families, not named weapons)
- 14 attack animation families (AnimationType.cs lines 7-17 and 51-53): kick, piercing, two-handed slash, two-handed blunt, one-handed slash, off-hand slash, bash, hand-to-hand, archery, swim attack, round kick, flying kick, rapid punches, heavy punch.
- Held-item slots: MainHand, OffHand, Shield, Helm, Ranged (Equipment3dSlot.cs lines 9-13). A shield is its own slot, not an off-hand; a ranged item is its own slot.
- Special properties (elemental, set bonus): none in this donor.
- Tiers: none in code. Named weapons and damage tiers are not in this donor.

### Top 5 striking (structural)
1. Two sound slots per held item (Equipment3dHandler.cs lines 28-29: primary and secondary equipment sound). Keep: a sound pair per weapon. Change: our own layering.
2. Separate ranged slot (Equipment3dSlot.cs line 13). Keep: ranged items as their own slot. Change: our bow and crossbow silhouettes.
3. Kicks and punches as weapon-free attack families (AnimationType.cs lines 51-53). Keep: a no-weapon combo set. Change: our own monk-like stance.
4. Archery as a separate attack family (line 15). Keep: a ranged animation set. Change: a draw-and-hold read.
5. Swim attack as its own family (line 16). Keep: a water-only attack. Change: our own water hazard.

## 4. Armour / gear
- Armour slots (Equipment2dSlot.cs lines 5-11): chest, leg, hand, upper arm, foot, forearm, head. Seven slots.
- Body types (BodyType.cs lines 5-6): normal and robe. A robe is a cloth silhouette variant.
- Per-slot tint: Equipment2dHandler.cs lines 438-460 applies a colour through a property block to every material that is not the base mesh material (line 458). Keep: tint without a new material. Change: our own dye palette.
- Shared attach points: several held slots can share one attach point (Equipment3dSlot.cs line 5).
- Material tiers (cloth to plate, mythic metals, gold plating, crystal): none in code. The only gold in the code is currency (EqConstants: 100 copper per gold), not a look.
- Gear shows its tier only through the texture or skin it wears (not read: Skins.cs, SkinTextures.cs).

### Top 5 striking (structural)
1. Invisible collision material (EQInvisible.shader line 80). The pass draws nothing; collision is separate. Keep: collision with no visible skin. Change: a heat or dust tell.
2. Robe body type (BodyType.cs line 6). Keep: a cloth variant for the same body. Change: our robe and hood shapes.
3. Helm and body tint through a property block (Equipment2dHandler.cs line 458). Keep: tint by block, not by material. Change: our palette.
4. Shared attach points across slots (Equipment3dSlot.cs line 5). Keep: several items on one socket. Change: our socket names.
5. Per-object sunlight value for single-colour objects (VertexColorSetter.cs lines 63-68, shader lines 77-83). Keep: one lighting number per object instead of per-vertex colour. Change: our light model.

## 5. Zones / dungeons
- Zone descriptors: 126, in 8 continent or expansion groups (ZoneHelper.cs line 21 starts the table). The zone is the content unit.
- Biome list, dungeon archetypes: not in this donor (names only, and the names are EverQuest places, so not copied here).
- Hazards: trap damage and drowning or burning are animation-driven damage codes (AnimationHelper.cs lines 26-27 and 110-111).
- Boats: four race IDs are boats or ships (RaceHelper.cs lines 51-63). A moving boat is a traversal object with its own scale and height (lines 106-109).
- Ambient sound radius: a 3D sound's max distance is its radius times one world-scale constant (SoundTrigger3d.cs line 42).

### Top 5 striking (structural)
1. Boat as a traversal platform (RaceHelper.cs lines 51-63 and 106-109). Keep: a moving platform with its own scale. Change: our deck and rail design.
2. Expansion-grouped zone sets (8 groups, ZoneHelper). Keep: zones grouped as content eras. Change: our own tiers.
3. Animation-driven hazard damage (AnimationHelper.cs lines 26-27). Keep: hazard damage tied to a clip. Change: our own hazard look.
4. Radius-scoped ambience (SoundTrigger3d.cs line 42). Keep: one radius for trigger and range. Change: a border crossfade (see defects).
5. Planar group (5 zones, the "Planes" group). Thin: category only; no look data read.

## 6. Item / effect looks worth recreating (with paths)
- Lit forward light (EQSimpleLitForwardPass.hlsl lines 85-88): light = clamp(directional x ambient + max(ambient x day-night tint, vision colour) + vertex light + realtime light + global ambient, 0, 1). Technique: a day-night tint with a vision floor, so night never goes black. Keep the floor. Change the tint.
- Dynamic sunlight (EQSimpleLitForwardPass.hlsl lines 77-83): a per-object ambient value replaces vertex colour. Technique: one number per object.
- Vertex-colour baked lighting applied on first visible (VertexColorSetter.cs lines 24-32 and 104). Technique: apply on OnBecameVisible, so off-screen objects cost nothing. Keep. Change the bake.
- Sky dome follows the camera with a fixed rotation (SkyController.cs lines 162-171). Technique: the sky is anchored to the camera, so it stays around the viewer.
- Day length as data (SkyController.cs lines 154-156): a 4 s clip is played at speed 4 divided by seconds per day. Technique: one animation, any day length.
- Sky resync (SkyController.cs lines 121-124): the sky clip is nudged back if it drifts more than 0.01 in normalised time. Technique: cheap drift fix.
- Per-slot tint through a property block (Equipment2dHandler.cs lines 438-460).
- Audio falloff curve (AudioHelper.cs lines 92-123): a 27-key volume curve over normalised distance, one per sound class. Technique: a baked rolloff, not a formula.

## Sound and music (per-topic fold-in)
- Layering: 3D emitters (SoundTrigger3d.cs) with a cooldown loop; 2D day and night loops with their own clip and volume (SoundTrigger2d.cs lines 13-15, 22-27, 50-54); day-night switch (SoundTrigger2d.cs lines 56-69). Music: enter starts, exit stops (MusicTrigger.cs lines 34-41). Music data holds day and night track index, play counts and a fade-out in ms (MusicData.cs lines 8-13).
- Stingers: none in this donor.
- Ambience beds per biome: none; ambience is placed per zone by data.
- Border crossfades: none. Exit is a hard stop (see defects).
- Race sound sets (RaceSounds.csv): 16 sound slots per race (Idle 1 and 2, Jump, Get Hit 1 to 4, Gasp 1 and 2, Death, Drown, Walking, Running, Attack, S Attack, T Attack), a loop flag, and a note column (RaceSounds.csv line 1). Variants by gender and copies from a base row (43 copied rows).

## Idle, ambient and death vocabulary (where seen)
- Idle codes: stand, stand with arms at sides, sit (AnimationType.cs lines 32, 78 and 79).
- Social codes: 28 (s01 to s28, AnimationType.cs lines 33-37 and 48-76): cheer, mourn, wave, rude, yawn, nod, dance, bow and so on.
- Death: a damage-death clip (AnimationType.cs line 22), a dead state (CharacterAnimationState.cs line 10), and an importance value of 6, the largest in AnimationImportance.cs line 11.
- Death sound slots per race: death and drown (RaceSounds.csv line 1).
- Respawn presentation, boss intro, finisher staging, readability at 375 wide: not in this donor.

## Defects seen (keep the idea, fix the defect; decision: adapt the idea)
1. SkyController.cs line 138: SetEnabledSky calls the sky animation for group 1 instead of the group it just enabled. Fix: pass skyIndex.
2. VertexColorSetter.cs line 87 fills missing vertex colours with random RGB at alpha 0. The comment at line 83 says they should be black. Fix: Color(0, 0, 0, 0).
3. VertexColorSetter.cs line 118 and line 124: FindMeshFilters appends to the lists without clearing, so a second call duplicates entries. Fix: clear first.
4. AudioHelper.cs line 127: Mathf.Min(value * maxVolume, value * maxVolume * multiplier) makes multiplier a no-op for multiplier of 1 or more (the min is always the unscaled value; line 43 forces multiplier to 1 below 3). Fix: Mathf.Clamp01(value * maxVolume * multiplier).
5. SoundTrigger2d.cs lines 32-33 compare the AudioClip object to a bool (clip == _isDay) instead of testing the day flag. Not compiled here; the operator behaviour is an inference. Fix: test the day flag directly.
6. Randomised cooldown is in the data (Sound2dData.cs line 14 CooldownRandom; EffSounds.cs line 95 in the extractor) but both triggers ignore it ("TODO: Random", SoundTrigger3d.cs line 32, SoundTrigger2d.cs line 45). Fix: wait = cooldown + random up to CooldownRandom.
7. MusicTrigger.cs line 41 stops music at once on exit. Fade-out ms is in the data (MusicData.cs line 12), but no class in the repo implements IMusicInvoker (only the interface, IMusicInvoker.cs). The fade may live in a runtime not in this donor. Unverified either way. Fix: fade over FadeOutMs.
8. RaceHelper.cs line 175 comment names three hidden-name kinds; the code tests two IDs and comments out the third (line 178). Intent unclear. Check against data before changing.
9. AudioHelper.cs NPC audio distances (lines 52-90, size classes 1 to 10) are not monotonic (size 6 is 287 units, size 7 is 167). Intent unclear. Check against data before changing.

## Inspiration for Frankendom (category-level, never a copy)
1. Ambush mimic: a creature with a hidden nameplate until it hits. Keep the hidden-name flag as data; change the visual tell and the reveal.
2. Oversized brute with a scale tier: keep the per-kind scale path with a default; change the silhouette and add a ground-shake stomp.
3. Border-crossfaded zone music: keep the trigger-owned cue and the day and night split; change to a 2 to 3 second crossfade with a priority table (dungeon over hub over zone), per the fade data.
4. Race sound set with variant rows: keep the base row plus copied variants keyed by gender; change to our own sound design and a pool that avoids repeats.
5. Vision-floor night lighting: keep the floor so night never goes black; change the tint to our palette.
6. Boat platform: keep the moving platform with its own scale; change the deck and rails.
7. Race-gated loot mask: keep the 16-flag bitmask for restrictions; change to our class and race mask on one character ledger.

## Not read
Most of the 189 .cs files, shader bodies beyond the lit forward pass and EQInvisible.shader, EQUnlit and EQSky bodies, the sqlite database (not opened, class C), the soundfont (not opened), plugin binaries and PDFs, EmojiOne sprites and terms, MusicImporter body, Skins.cs and SkinTextures.cs, the IMusicInvoker implementer (none found in repo).

## Reuse tag
Reuse-first: the lit-light formula, the per-race scale table and the sound trigger split are reusable shapes. No code from this donor is adopted.

## Brief rule served
Recreate as a clearly distinct original, never a copy. Each item names the trait KEPT and the trait CHANGED. Class C data stays at category level.
