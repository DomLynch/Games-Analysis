# Design catalogue: alexbatalov-fallout2-ce (DC005)

Rule for every idea below (Dom, 2026-10-11): recreate as a clearly distinct original, never a copy. Inspiration is mood and mechanic only, about 20-30 percent resemblance. Names here are our own labels, not the donor's names.

## Which half was read, and what is missing
- Read: the engine source half, `src/*.h` headers (enums and constants) and selected `.cc` files for looks (lips, light, palette, cycle, movie, worldmap, automap, critter, combat).
- Not in the box: the game data pack (`master.dat`, `critter.dat`, `patch000.dat`, and the `data` folder). Root listing of `/mnt/frankendom-donors/alexbatalov-fallout2-ce` shows `CMakeLists.txt`, `CMakePresets.json`, `LICENSE.md`, `os`, `README.md`, `src`, `third_party` only. The AU003 audit says the data is user-supplied and proprietary (class D).
- Sibling in the box: `alexbatalov-fallout1-ce` (AU002 audit), same kind of re-implementation, also without the data pack. Not read here.
- Restricted note: none in the donor root.

So: creatures, classes, weapons and gear are read only as enum names and categories. No stats, no tiers, no prototype counts exist in this repo. The catalogue says so in each section rather than inventing numbers.

## 1. Creatures and beasts

Source: `src/proto_types.h` lines 106-126, the `KILL_TYPE` enum. This is 19 creature families used by the engine for kill tracking and perk bonuses. Names only; no stats, no sprites, no spawn tables are in the repo.

Families (own words, mapped to the enum):
- Human adults: man, woman, child (lines 107-109), 3 entries
- Mutant: super mutant (110)
- Undead: ghoul (111)
- Livestock: brahmin, a large herd beast (112)
- Giant scorpion: radscorpion (113)
- Rodent: rat (114)
- Drifting creature: floater (115)
- Hybrid: centaur (116)
- Machine: robot (117)
- Dog (118)
- Mantis-like insect (119)
- Apex claw beast: death claw (120)
- Plant (121)
- Lizard: gecko (122)
- Alien (123)
- Giant ant (124)
- Boss slot: big bad boss (125)

Body types (`proto_types.h` lines 100-102): biped, quadruped, robotic. Three body plans, which is a useful design shape for our creature list.

Escalation: the repo does not say how these families scale with level. Only the family list. The boss slot (line 125) is the only family named as a boss.

Escalation and elite pattern: not readable from this repo. Marked not read.

### Top 5 striking (name-level only, stats not in repo)

Striking criteria applied to names only: readable silhouette, one signature behaviour (guessed from name only and marked as such), one sound or effect (not read). Each pick is a family slot, not a verified creature.

1. **Apex claw beast** (label: Apex claw). Family slot at line 120. Name suggests a top predator. Keep: apex predator slot. Change: silhouette and attacks, our own.
2. **Boss slot** (label: Boss slot). Family slot at line 125. Keep: a dedicated boss family for kill bonuses. Change: our boss design.
3. **Blade-limbed insect** (label: Blade mantis). Family slot at line 119. Name suggests raptorial forelimbs. Keep: insect silhouette with blade limbs. Change: colour and limb count.
4. **Drifting creature** (label: Drift floater). Family slot at line 115. Name suggests a floating body. Keep: hovering read. Change: our body.
5. **Machine enemy** (label: Machine enemy). Family slot at line 117, and body type robotic (line 102). Keep: robotic body plan as a separate read from organic. Change: our design.

## 2. Classes, races and stats

No classes in this engine. The character model is:
- Seven primary stats (`src/stat_defs.h` lines 23-29): strength, perception, endurance, charisma, intelligence, agility, luck.
- Sixteen traits, two selectable at a time (`src/trait_defs.h` lines 11-26, `TRAITS_MAX_SELECTED_COUNT` 2 at line 7). Examples by name: fast metabolism, bruiser, small frame, one-hander, finesse, kamikaze, heavy handed, fast shot, bloody mess, jinxed, good natured, chem reliant, chem resistant, sex appeal, skilled, gifted.
- Eighteen skills (`src/skill_defs.h` lines 13-30): small guns, big guns, energy weapons, unarmed, melee, throwing, first aid, doctor, sneak, lockpick, steal, traps, science, repair, speech, barter, gambling, outdoorsman.
- 119 perks (`src/perk_defs.h` lines 7-125, `PERK_COUNT` at line 126).

Progression shape: perks are the main levelled reward. Traits are a starting choice. Skills rise by points.

Faction note: no factions in the engine source. Encounter and reaction logic is in `src/reaction.h` (not read in depth).

## 3. Weapons

No weapon prototypes in the repo, so no weapon tiers or stats. What the source does give:
- Attack modes (`src/item.h` lines 10-14): unarmed, melee, throw, ranged (4 real modes plus none).
- Item types (`src/proto_types.h` lines 27-34): armour, container, drug, weapon, ammo, misc, key (7).
- Damage types (`src/proto_types.h` lines 60-66): normal, laser, fire, plasma, electrical, EMP, explosion (7). Each has a damage-threshold stat (`src/stat_defs.h` lines 41-46).
- Ammo and fuel calibres (`src/proto_types.h` lines 70-89): about 18 real types, including rocket, flamethrower fuel, two energy-cell grades, and a needler type.
- Weapon perks (`src/perk_defs.h`): long range, accurate, penetrate, knockback, scope range, fast reload, night sight, flame, enhanced knockout.

Top 5 striking (from the enum and perk names only, no visuals read):
1. Seven-damage palette (label: Seven damage tints). Keep: one tint per damage type. Change: our colours and feedback shape.
2. Scope and night-sight perks (label: Night scope). Keep: scope range and night sight as perks. Change: our look.
3. Penetrating shot (label: Piercing shot). Keep: a weapon perk named for penetration (`perk_defs.h` line 67; effect not read). Change: our own rule and effect.
4. Knockback perk (label: Knockback). Keep: a weapon perk named for knockback (`perk_defs.h` line 68; effect not read). Change: our push angle and distance.
5. Flame perk (label: Flame boy). Keep: a flame weapon perk. Change: our flame look and sound.

Tier visuals: not readable here.

## 4. Armour and gear

No armour prototypes in the repo. Armour tiers appear through perks instead, which is a usable ladder:
- Powered armour (`src/perk_defs.h` line 69)
- Combat armour (line 70)
- Advanced armour I and II (lines 75-76)
- Dermal impact armour (line 81) and dermal impact assault enhancement (line 82)
- Phoenix armour implants (line 83) and phoenix assault enhancement (line 84)
- Vault city inoculations (line 85) as a non-armour health perk

Material types (`src/proto_types.h` lines 48-55): glass, metal, plastic, wood, dirt, stone, cement, leather (8). These are the material tags for item and scenery, and may drive sound and damage text.

Top 5 striking (name-level from the perk and material enums):
1. Powered armour (label: Powered frame). Keep: a heavy frame tier. Change: our look.
2. Phoenix implant tier (label: Phoenix implants). Keep: an implant tier with a separate assault upgrade (perk pair, `perk_defs.h` lines 83-84). Change: our name and effect.
3. Dermal tier (label: Dermal skin). Keep: a tier name suggesting skin armour, as a separate line from frames (`perk_defs.h` lines 81-82; effect not read). Change: our look.
4. Metal material tag (label: Metal tag). Keep: a material tag in the item enum (effect not read). Change: our material list.
5. Vault inoculation (label: Vault inoculation). Keep: a city-issued health perk. Change: our name and cost.

Gear sets and colour: not readable from the repo.

## 5. Zones and worldmap

Source: `src/worldmap.h` (city and encounter enums, lines 19-71), `src/map_defs.h` (elevations, line 6), `src/worldmap.cc` (not read in depth).
- Random encounter biomes (`worldmap.h` lines 53-56): desert, mountain, city, coast. Four biome types.
- Special encounter entries (lines 58-70): 13 named one-off encounters. Names are not reused here.
- Caravan encounters (line 71) as a travelling set.
- Ghost-town city entry (line 47).
- Elevations per map: 3 levels (`map_defs.h` line 6).
- Map enum (`src/worldmap.h`, enum starts line 79) runs at least to id 137 (line 217, MAP_SAN_FRAN_CHINATOWN). Full map count not read.

Dungeon archetypes: not in this repo. They are in the data pack.

Top 5 striking (name-level):
1. Biome encounter table (label: Biome encounters). Keep: random encounters set per biome. Change: our biomes and content.
2. Ghost town (label: Ghost town). Keep: an abandoned settlement as a zone type. Change: our look.
3. Caravan trail (label: Caravan trail). Keep: a travelling encounter set. Change: our route and encounters.
4. Three-level map (label: Three-level map). Keep: a fixed elevation count per map. Change: our level count.
5. Coast encounter (label: Coast encounter). Keep: a coast-only encounter set. Change: our coast content.

## 6. Item and effect looks worth recreating

- Lip-sync by phoneme (`src/lips.h` line 10): 42 phoneme mouth slots, with speech markers keyed to audio (`SpeechMarker` struct in lips.h). Technique: timed mouth-shape table. We can use 8 to 12 of our own shapes.
- Automap that keeps view options in the save (`src/automap.h` lines 17-18).
- Palette fade in about 700 ms (`src/palette.cc` around line 48, comment). Technique: a timed palette fade for scene change.
- Colour cycle (`src/cycle.h` line 12): a speed-factor cycle for palette animation.
- Global light and per-tile light (`src/light.h` lines 6-7 bounds; `src/light.cc` functions around lines 42-134). Technique: ambient plus per-tile intensity, so one tint layer handles the whole scene.
- Movie frames with per-frame effects (`src/movie_lib.cc` line 535, `src/movie_effect.cc`). Technique: cutscene container with effects. We use a standard video format.
- Sound effects cache by fixed list (`src/sound_effects_list.cc`, `src/sound_effects_cache.cc`, names only).

## Inspiration for Frankendom

1. **Eight-to-twelve-shape talker** (own name). A talking head with our own mouth shapes and speech markers timed to audio. Keep: marker timing. Change: shape count and our face.
2. **Seven damage tints** (own name). Each damage type gets its own hit flash and sound. Keep: the damage-type split. Change: our colours and feedback.
3. **Biome encounter table** (own name). Random encounter sets per biome (desert, mountain, city, coast). Keep: biome-based encounters. Change: our biomes and creatures.
4. **Armour perk ladder** (own name). Heavy frame, combat frame, two advanced grades, skin armour, then implants with an assault upgrade. Keep: the ladder shape as perks. Change: our names and effects.
5. **Automap with saved view** (own name). A map that remembers its zoom and marker state in the save file. Keep: view state saved. Change: isometric view and our markers.
6. **Family bounty** (own name). A bonus per creature family, using our families. Keep: per-family kill bonus. Change: our families and bonus.
7. **Palette fade transition** (own name). A 700-ms palette fade between zones. Keep: timed palette fade. Change: our timing and colours.

## Licence note
Code: Sustainable Use License 1.0 (`LICENSE.md` line 1). The licence limits use to internal business or non-commercial, personal use (line 15, as the AU003 audit records). README line 117 points the source to this licence. Assets: no separate licence; the repo ships no game art, audio, maps or text except launcher icons (`os/` folder, status unclear). README line 11 says the user must own the game to play. The original publisher is not named in the files read. This summarises the files, not a legal opinion.

## Not read
- The game data pack (absent from the box; user-supplied and proprietary).
- Launcher icon pixels (`os/android`, `os/ios`, `os/windows`, `os/macos`); third-party zlib, fpattern and sdl2 readme and licence text.
- Most `.cc` bodies beyond the listed look files: `critter.cc`, `combat.cc`, `combat_ai.cc`, `item.cc`, `proto.cc`, `worldmap.cc`, `color.cc`, `light.cc` bodies beyond the function list, `art.cc`, `tile.cc`.
- Any creature stats, sprites, spawn tables, weapon or armour prototypes, dialogue or lore.
- `src/sfall_*` mod hooks (not content).
- `README.md` beyond the quoted lines.
