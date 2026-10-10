# otland-forgottenserver (assets audit, AU042)

Donor/Licence: server emulator (TFS, C++ and Lua). Code licence GPL-2.0 (root LICENSE). No separate asset licence file.
Rights holder: unknown from the files (README: fork of OpenTibia Server). Asset class: C overall (game data with no licence statement); D for art and audio (none present).
Other half: the client (sprites, sounds) is not in this donor. Client-named donors that exist in the box and were NOT opened: edubart-otclient, opentibiabr-otclient, OTCv8-otclientv8, mattyx14-TheForgottenTibiaClient. README links OTClient (mehah/otclient), which is not one of those names.

## Asset groups
- Creature data: data/monster/monsters/*.xml, 1166 files. Stats, attack channels, defences, elements. Looks are numeric client IDs, so the sprites are not here. Class C.
- Items: data/items/items.xml (15101 entries) and items.otb (binary, not opened). Class C.
- World: data/world/forgotten.otbm (3.4 MB binary, size only), forgotten-spawn.xml (362 spawn blocks), forgotten-house.xml. Class C.
- System XML: data/XML/outfits.xml, stages.xml, vocations.xml, groups.xml, mounts.xml. Class C.
- Lua logic: about 601 .lua files under data/. Class C, code.
- Art, audio, fonts: none found by extension search of the whole tree. Class D.

## Data first (cited tables)
- Creature table: data/monster/monsters/*.xml (one file per creature). Boss flag, channel rolls and elements are read from these.
- Item table: data/items/items.xml. Armour and slot fields are read from here.
- Spawn table: data/world/forgotten-spawn.xml. Centre, radius, per-member spawntime.
- Outfit table: data/XML/outfits.xml.

## Inspiration
1. Boss as a rotation of tells: abyssador.xml gives five attack channels, each with its own interval and roll, plus a re-target roll (lines 5, 22, 25). Keep the separate rolls; change the wind-up and channel names.
2. Timed slow as a readable tell: the speed channel (line 22) applies speedchange -400 for duration 2500 at chance 20. Make the status a distinct ring and sound.
3. Self-protection on a roll: healing (line 39) and invisibility (line 45) defences. Keep rare healing; add a telegraphed glow and sound.
4. Damage typing as data: the elements block (line 50) gives per-type percentages. A creature can be weak or strong to one damage type with no code change.
5. An item that comes alive: animated_sword.xml uses an item look (line 4, look typeex 26883) with experience 0 and a short melee plus energy/manadrain mix. Keep the idea; change silhouette, palette and attack set.
6. Spawn clusters as data: forgotten-spawn.xml (line 3, radius 5; line 4 member with spawntime 60). A direct data model for row 23 (cap, respawn, coverage).
7. Gold-plated armour as a stat line: 'golden armor' (items.xml lines 3834-3836) is weight, armour 14 and body slot. The gold look is client-side and not in the box. Make the gold a palette and specular task for an artist.
8. Cosmetic unlock table: outfits.xml (lines 4, 69, 101) lists looks by sex type with premium and unlocked flags. A model for cosmetic collections.

## Briefs (recreate as clearly distinct originals; never copies)
- Multi-channel tyrant boss (own label): keep five timed channels and a rare telegraphed heal; change silhouette, palette and channel names. Ref: data/monster/monsters/abyssador.xml.
- Sentient blade (own label): keep the item-as-creature look and a fast melee tempo; change silhouette (hooked polearm), palette and attack set. Ref: data/monster/monsters/animated_sword.xml.
- Scatter pack spawn block (own label): keep a centre with a small radius and per-member respawn; change pack size, cap and make it a patrol path. Ref: data/world/forgotten-spawn.xml.

Readability at 375 px, sound, and silhouette: not read (no sprites or audio in this donor).

## Not read
See the .assets.json not_read list (binary map and OTB, most creature and Lua files, src/ beyond the listing, client half).
