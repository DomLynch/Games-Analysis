# Elem8100-MapleNecrocer (design catalogue, DC021)

Donor: /mnt/frankendom-donors/Elem8100-MapleNecrocer/ (VPS, read-only)
Class: D for game content (asset audit AU018). Nothing usable from the game content: the repo is a C# viewer for MapleStory client data and carries no game data. Viewer techniques only.
Dom's rule: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.
Licence: see section 8.

## Halves read
- Read: the viewer half (C#): MapleNecrocer/Client/Particle (emitter, particle items, render), MapleNecrocer/DamageSkinForm.cs, MapleNecrocer/Client/ToolTip.cs, the form list, and README and LICENSE.
- Data half: absent by design. The viewer reads WZ nodes that the user supplies (for example UI/UIToolTip.img). No WZ files are in the repo, and the WzComparerR2 folder is a WZ reader library, not data.
- Paired donor candidate in the box (name only, not read, not my donor): ryantpayton-MapleStory-Client. Whether it carries data is unknown.

## Counts (verified in the box)
- Creatures: 0. No mob or NPC data. The viewer has forms for them (MobForm.cs, NpcForm.cs) but no data files.
- Classes: 0. Races, jobs and class trees: not in the box.
- Weapons: 0. No item data.
- Gear sets: 0. No gear data.
- Zones: 0. No map data. The viewer loads maps only from user-supplied WZ.
- Viewer forms: 33 *Form.cs files (count from the file listing), each a viewer for one content family (mob, NPC, pet, mount, effect ring, chat ring, cash effect, damage skin, familiar, medal, chair, morph, reactor, skill, soul effect, totem effect, world map, and others).

## 1. Creatures / beasts
None in the box. The mob, NPC, pet, mount and familiar forms are viewers, not data. Nothing to rank.

Top creatures: none. Striking-creature list left empty rather than padded.

## 2. Classes / races / factions
None in the box.

## 3. Weapons
None in the box.

## 4. Armour and gear
None in the box. The tooltip frame is a UI piece, not gear (section 6).

## 5. Zones and dungeons
None in the box. The README says the viewer supports map skeleton animation and a particle system (README.md:1-10); that is a feature claim, and the map data is user-supplied.

## 6. Item and effect looks worth recreating (viewer techniques, not game art)
- Particle emitter: each particle draws position, start and end size, start and end colour, start and end spin and angle from base value plus random variance (Client/Particle/ParticleEmitter.cs:92-98). The default emission rate is 200 (ParticleEmitter.cs:63). Copy the data layout; the NextVar helper was not read.
- Tooltip frame: a segmented frame built from corner and edge pieces (nw, ne, and the rest), placed by offset (Client/ToolTip.cs:66-67, 90-91). A nine-slice frame to rebuild with our own ornament.
- Damage numbers: a named style pack is picked from a list at runtime and loads its own number images (DamageSkinForm.cs:28-29). Recreate as skinnable number styles.

## 7. Inspiration for Frankendom (viewer-level only; class D)
1. Segmented panel frame: keep separate corner and edge pieces so any ornament fits. Change the ornament, palette and corner caps. Ref: Client/ToolTip.cs:66-91.
2. Drifting ambient motes: keep colour and size variance with a slow fall. Change the motion curve and colours per zone. Ref: Client/Particle/ParticleEmitter.cs:92-98.
3. Skinnable hit numbers: keep named style packs swapped at runtime. Change the typography and the crit and miss shapes. Ref: DamageSkinForm.cs:28-29.
4. Asset browser per content family: one small viewer per family (mob, NPC, pet, effect). Keep the pattern for our own asset browser. Change the content families to ours. Ref: MapleNecrocer/*Form.cs (33 files).

## 8. Licence
- Code: MIT. LICENSE line 1 "The MIT License (MIT)"; line 3 "Copyright © 2023 Elem8100".
- Adaptation: MIT code may be adapted with the notice kept. The emitter, frame and skin patterns are code-level ideas we may adapt.
- Assets: no game art or game data in the repo. Small UI icons (4 PNG under 5 KB, origin not stated, one name looks game-derived), one .ico, a WzComparerR2-credited shader (PngEffect.fx), and 20 third-party DLLs have no per-file licence in the repo. Treat them as class C: do not reuse. Credit: README credits Kagamia's WzComparerR2.
- Rights holder: fan or unofficial viewer; the game-data owner is not named in the repo.

## 9. Not read
- WzComparerR2 libraries and the 20 DLLs: not read (licence and class noted from AU018).
- Most *Form.cs files: named only, not opened.
- ParticleRandom and the NextVar helper: not read.
- No audio, music, fonts, maps or 3D models exist in the repo (AU018); nothing to read there.
- Sound, camera, spawns and loot: nothing in this repo.
