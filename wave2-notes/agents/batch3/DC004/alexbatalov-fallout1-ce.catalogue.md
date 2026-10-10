# Design catalogue: alexbatalov-fallout1-ce (DC004)

Root on VPS: /mnt/frankendom-donors/alexbatalov-fallout1-ce/ (paths below are relative to it).
Rule for every brief: recreate as a clearly distinct original, never a copy. Inspiration is mood and mechanism only, about 20-30 percent resemblance. Class C donor: inspiration stays at category level (for example "a plated beetle boss"), never an instance-level look.

## Which half was read
- **Engine/client half (read):** src/game/ (138 files) and the headers listed below. src/ also has audio, movie, platform and plib folders (not read).
- **Data pack half (not read, not in the box):** master.dat, critter.dat and the data folder that README lines 17, 41 and 43 tell the user to copy from their own install. The PRO (prototype) and MSG (text) files that hold the creature, item and map values sit in that pack. I read only the enums and struct shapes in the engine, not the values.
- Server half: none in this repo.

## Licence (as the files say)
- Code: Sustainable Use License 1.0 (LICENSE.md line 1). Line 15: use is for internal business or non-commercial or personal use.
- Rights holder: fan re-implementation (README line 3). README line 9: you must own the game to play.
- Class for us: code under a non-commercial licence, so inspiration only. Original game data: class D, not used.

## Counts (declared in engine; values not read)
- creatures: 15 kill-type categories (src/game/proto_types.h:101-117), plus 3 body types (proto_types.h:94-98).
- classes: none. Fallout has no class enum in the engine. Archetype shapes: 7 primary stats (stat_defs.h:64), 18 skills (skill_defs.h:31), 16 traits (trait.h:29), 64 perks (perk_defs.h:7-70), and 3 tagged skills by default (skill_defs.h:9).
- races: 2 human variants and 2 genders (proto_types.h:20-24 and :88-92).
- weapons: 13 ammo calibers plus none (proto_types.h:70-86), 7 damage types (:59-66), 4 attack modes (item.h:11-17), and about 20 melee and unarmed hit modes (combat_defs.h, HIT_MODE_* near :40-66).
- gear sets: none found. A grep for "set bonus" or "armor set" over src/game/*.cc and *.h returned 0 files. Armour is an item type (proto_types.h:26-34).
- zones: 4 world terrains (worldmap.h:107-110), 3 elevations (map_defs.h:6).

## 1. Creatures and beasts
- Families (engine enum, names are category words only): human (man, woman, child), mutant brute (super mutant), undead humanoid (ghoul), domestic beast (brahmin), giant scorpion (radscorpion), rat, hovering creature (floater), hybrid (centaur), robot, canine (dog), giant mantis, clawed predator (death claw), walking plant. proto_types.h:101-117.
- Body types drive the animation set: biped, quadruped, robotic (proto_types.h:94-98).
- Escalation with level: values are in the PRO data (not read). Shape: the engine tracks radiation effects over 8 stat slots and levels from mild to fatal (critter.h:36-44; critter.cc:58 rad_stat; :77 rad_bonus).
- Boss or elite pattern: not in the engine files read. Not read.
- Combat AI: message types for run, move, attack, miss and hit (combatai.h:14-20).

### Top 8 creature briefs (category level)
1. **Mutant brute** (label: plated brute). Why: a big biped with a readable chest silhouette at 375 wide. Keep: heavy biped, one-line signature roar. Change: our own armour plates and palette, a different head. Ref: src/game/proto_types.h:105.
2. **Giant scorpion** (label: tail-stinger). Why: a low wide silhouette with a raised tail, readable at a glance. Keep: quadruped low body and raised tail. Change: our own shell pattern and a hooked stinger. Ref: src/game/proto_types.h:108.
3. **Giant mantis** (label: blade-arm). Why: long limbs and a bladed front pair, a strong mid-fight silhouette. Keep: long bladed front limbs. Change: our own limb count and colours. Ref: src/game/proto_types.h:114.
4. **Clawed predator** (label: raptor-lizard). Why: a fast, big-clawed quadruped. Keep: a fast quadruped with large claws. Change: our own head and hide pattern. Ref: src/game/proto_types.h:115.
5. **Walking plant** (label: thorn walker). Why: a non-animal silhouette, a plant on legs. Keep: plant body type with a slow gait. Change: our own bloom and a glow in the heart. Ref: src/game/proto_types.h:116.
6. **Hovering creature** (label: hover drifter). Why: a floating silhouette with no legs, good for a flying read. Keep: no-leg body with a hover bob. Change: our own shape and a lamp-like glow. Ref: src/game/proto_types.h:110.
7. **Robot** (label: steel sentry). Why: the robotic body type is its own class of animation. Keep: robotic body type as its own animation class. Change: our own sparks and a steel palette. Ref: src/game/proto_types.h:97 and :112.
8. **Hybrid rider** (label: half-beast). Why: a human-animal hybrid with a four-leg lower body. Keep: hybrid lower body. Change: our own proportions and a cloth mantle. Ref: src/game/proto_types.h:111.

## 2. Classes, races and progression
- Classes: none in the engine.
- Progression shape: 7 SPECIAL-style primary stats (stat_defs.h:64), 18 skills (skill_defs.h:31) with 3 tagged at start (skill_defs.h:9), 16 traits (trait.h:29) and 64 perks (perk_defs.h). Tag-skill effects are in skill.cc (949 lines) and were not read.
- Races: 2 human variants (proto_types.h:88-92). Race is a look, not a class.
- Factions: elevator names group the locations (elevator.h:6-18), for example the Brotherhood locations. Faction logic not read.

## 3. Weapons
- Families: ammo calibers (13 real plus none, proto_types.h:70-86): rockets, flamethrower fuel, two energy-cell tiers, rifle, pistol and shotgun calibers.
- Damage types (7): normal, laser, fire, plasma, electrical, EMP and explosion (proto_types.h:60-66).
- Attack modes (4 plus none): unarmed, melee, throw, ranged (item.h:11-17).
- Special property: a big-gun flag (proto_types.h:182).
- Visual distinctness of tiers: not in the engine. Per-weapon art is in the data pack (not read).

### Top 5 weapon briefs (category level)
1. **Energy lance** (label: beam carbine). Why: a laser damage type with an energy-cell ammo tier. Keep: beam shot and a glowing core. Change: our own beam colour and a charge hum. Ref: src/game/proto_types.h:61 and :71-74.
2. **Plasma spitter** (label: plasma launcher). Why: plasma damage has its own type. Keep: a slow glowing ball. Change: our own bloom and a different recoil. Ref: src/game/proto_types.h:63.
3. **Flame thrower** (label: fire wand). Why: fuel ammo tied to fire damage, a sustained-stream silhouette. Keep: fuel-fed stream. Change: our own flame palette and a pilot light. Ref: src/game/proto_types.h:62 and :72.
4. **Rocket** (label: tube launcher). Why: explosion damage with a rocket caliber, a bold mid-fight silhouette. Keep: explosion radius. Change: our own tube shape and smoke trail. Ref: src/game/proto_types.h:66 and :71.
5. **Shock rod** (label: arc baton). Why: electrical damage as a close-range effect. Keep: short arc and crackle. Change: our own arc colour and a glove. Ref: src/game/proto_types.h:64.

## 4. Armour and gear
- Families: armour is an item type (proto_types.h:26-34), with containers, drugs, weapons, ammo, misc and keys. No set bonuses found.
- Material tiers: 8 materials (glass, metal, plastic, wood, dirt, stone, cement, leather), proto_types.h:48-55. Material affects how the object sounds and breaks; per-item values are in the data pack.
- Power armour: a special item ID (proto_types.h:121). The look is in the data pack, not read.
- Ammo tiers: 13 calibers (proto_types.h:70-86).
- How the game shows tiers: not in the engine files read.

### Top 5 gear briefs
1. **Power frame** (label: powered frame). Why: a special item ID makes one armour a class of its own. Keep: a single special armour that changes the player silhouette. Change: our own frame and a hiss on equip. Ref: src/game/proto_types.h:121.
2. **Metal over leather** (label: layered plate). Why: material as an armour tier. Keep: material as a visible tier. Change: our own metal ladder with gold-plated top step. Ref: src/game/proto_types.h:49-55.
3. **Big-gun flag** (label: heavy weapon tag). Why: an extended flag marks a weapon as heavy. Keep: heavy flag as a rule. Change: our own two-hand pose. Ref: src/game/proto_types.h:182.
4. **Radiation stat table** (label: hot stat ladder). Why: 8 radiation effects rise with level, a readable stat trade-off. Keep: effect ladder over levels. Change: our own hazard tiers and colours. Ref: src/game/critter.cc:58 and :77.
5. **Tagged skill kit** (label: starting kit). Why: 3 tagged skills give a starting identity. Keep: a small tag set at start. Change: our own skill names and gear link. Ref: src/game/skill_defs.h:9.

## 5. Zones and dungeons
- World terrains (4): desert, mountain, city, coast (worldmap.h:107-110).
- Random encounter table: worldmap.cc:2099 sets the terrain variable from WorldEcounTable indexed by world position (table contents not read).
- Elevations (3): ground and two levels (map_defs.h:6).
- Elevators (12 or more IDs): grouped by location (elevator.h:6-18).
- Hazards: radiation levels, from mild to fatal (critter.h:36-44).
- Dungeon archetypes: map files are in the data pack. Not read.

### Top 5 zone briefs
1. **Mountain pass** (label: ridge road). Why: a mountain terrain gives a strong skyline. Keep: mountain as a terrain type. Change: our own ridge and a cloud layer. Ref: src/game/worldmap.h:108.
2. **Coast** (label: tide shelf). Why: a coast terrain with a shoreline effect. Keep: coast as a terrain. Change: our own shoreline shimmer. Ref: src/game/worldmap.h:110 and src/game/cycle.h:7.
3. **Glow elevator** (label: lit lift). Why: an elevator with its own glow frames, a lit vertical shaft. Keep: glow upper and lower levels. Change: our own glow colour and shaft. Ref: src/game/elevator.cc:78-79.
4. **Desert flats** (label: dune belt). Why: desert terrain, a flat warm read. Keep: desert as a terrain. Change: our own haze and sand palette. Ref: src/game/worldmap.h:107.
5. **Radiation zone** (label: hot ground). Why: radiation levels with a stat effect, a readable hazard. Keep: level ladder. Change: our own hazard glow and sound. Ref: src/game/critter.h:36-44.

## 6. Item and effect looks worth recreating
- Palette colour cycling: five palette cycles (slime, shoreline, two fire rates, monitors). Technique: colour ranges rotate in the palette, not sprites. Ref: src/game/cycle.h:6-10 and src/game/cycle.cc:186 (cycle_colors).
- Light levels: a max, min and night-vision bonus. Technique: a light scale per tile. Ref: src/game/light.h:6-10.
- Elevator glow: two glow frame indices. Technique: a lit frame swapped on the lift. Ref: src/game/elevator.cc:78-79.
- Light from projectiles: a projectile emits light for its flight. Ref: src/game/actions.cc:745.
- Light from animated owner: animation light follows the owner. Ref: src/game/anim.cc:1552.
- Visible light thresholds in combat: three cut-offs (26214, 39321, 52428) change hit odds. Ref: src/game/combat.cc:3310-3316.
- Automap glow entries: glow tags in the automap table. Ref: src/game/automap.cc:102 and :117-118.
- Palette fade: fade by colour table, from the audit (AU003). Ref: src/game/palette.h:12.

## 7. Inspiration for Frankendom (originals, 5-10)
1. **Plated brute**. Idea: a big biped with plate silhouette. Keep: heavy biped, readable chest. Change: our own plates, palette and head.
2. **Tail-stinger**. Idea: a low wide quadruped with a raised stinger. Keep: low body and raised tail. Change: our own shell and hook.
3. **Blade-arm mantis**. Idea: a long-limbed insect with bladed front pair. Keep: long bladed front limbs. Change: our own limb count and colours.
4. **Hover drifter**. Idea: a legless floating creature with a lamp glow. Keep: no-leg hover. Change: our own shape and glow colour.
5. **Powered frame**. Idea: one special armour that changes the silhouette. Keep: a single special armour. Change: our own frame and equip effect.
6. **Lit lift**. Idea: a vertical shaft with glow frames. Keep: upper and lower glow. Change: our own glow colour.
7. **Colour-cycle shoreline**. Idea: palette ranges that rotate for water and fire. Keep: colour cycling technique. Change: a glow shader, not palette rotation.
8. **Light-band combat**. Idea: visible light thresholds change hit odds. Keep: three light thresholds. Change: our own phone-readable light meter.

## Licence note
As the files say: code under the Sustainable Use License 1.0 (LICENSE.md line 1), with non-commercial and internal-use terms (line 15). README line 9: you must own the game to play. Not a legal conclusion.

## Not read
- PRO and MSG values (creature stats, item stats, names, map data): data pack not in the box.
- src/game/skill.cc, trait.cc, perk.cc, item.cc and critter.cc bodies beyond the lines cited.
- src/game/worldmap.cc (3771 lines) beyond the terrain lookup line.
- art.cc (1219 lines) beyond the names used; the art file list is in the data pack.
- combatai.cc and combat.cc bodies beyond the quoted lines.
- src/audio_engine.cc, movie_lib.cc, platform/, plib/ folders.
- Launcher icons (os/android, os/ios, os/windows, os/macos) and third_party folders.
