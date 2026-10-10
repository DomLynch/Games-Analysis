# endless-sky-endless-sky (catalogue, DC022)

Donor: /mnt/frankendom-donors/endless-sky-endless-sky/ (VPS, read-only over ssh).
Asset audit used first: AU018 (endless-sky-endless-sky.assets.md).
Dom's rule for every item below: recreate as a clearly distinct original, never a copy. Keep the mood, change the names, silhouettes, colours and numbers. This is inspiration, not a legal opinion.

## Licence and halves read

- Code: GPL-3.0-or-later (copyright file, 'Files: *'). Clean-room, shape only.
- Data text under data/: GPL-3+ per AU018. Read for shape and structure, nothing copied.
- Assets (images, sounds): mixed per path (CC0, public domain, CC-BY, CC-BY-SA, Unsplash). Look only; do not copy sprites or sounds.
- Halves: this is a single-player game, so there is no server or client split in the box. I read the DATA PACK (data/*.txt, the game's own content tables) and the ENGINE SOURCE for the mechanisms (source/Engine.cpp, Ship.cpp, Personality.cpp, System.cpp for the spawn period). No paired donor was searched for.
- Restricted note: none at the donor root.

## Counts (grep on the VPS, 2026-10-11)

- Ship blocks: 917 'ship' definitions (351 base hulls, 566 variant blocks). Largest culture folders by base hull: human 88, kahet 34, korath 33, avgi 27, gegno 25.
- Creature-tagged blocks: 11 with noun "creature", 2 with noun "entity" (vyu-Ir in data/rulei/rulei ships.txt).
- Blocks with the 'never disabled' flag: 70.
- Outfits: 881 'outfit' definitions. Unique names: 82 guns, 91 turrets, 38 shield, 57 generator, 135 engine (category/series lines, overlap not checked).
- Governments: 127 entries (factions, sub-factions, indigenous lifeform groups).
- Fleets: 223 top-level fleet definitions.
- Hazards: 30 definitions; 187 hazard placements in map systems.
- Systems: 685 system entries; 613 planets; 17 unique haze sprites.
- Harvest families (minables): 34 (metals, plants, crystals, water droplets, integral trees).
- Effects: 59 top-level in effects.txt; 319 'effect' blocks in all data.
- Personality lines: 1466 across data; 'timid' appears in over 100 of them.

## 1. Creatures and beasts

Families, from the data (tagged noun "creature" or "entity"):
- Lumbering beasts: Subsidurial (one hull, never disabled, three mouth guns, blood leak). data/drak/indigenous.txt:14.
- Void sprites: adult and infant pair, looping 'rewind' sprites, never disabled. data/drak/indigenous.txt:62 and 120.
- Ember Waste family: Ember Waste Node (largest creature, cloak), Embershade (shielded), Embersylph (small, one absorption organ turret). data/drak/indigenous.txt:166, 223, 264.
- Vyrmeid swarm: three tiers. A docile solar feeder (hull 400, data/vyrmeid/vyrmeid.txt:26), a spinning boomerang (B, hull 1420, :85), and an explode-on-death body (C, hull 860, :126 and :138; description says it explodes on death).
- Astral Cetacean: rare large creature, hull 11000 (data/vyrmeid/vyrmeid.txt:181, :193).
- vyu-Ir: entity, hull 49000 (data/rulei/rulei ships.txt:15 and :27).
- Mythic-beast hull names, a tier ladder: Quarg Guivre (utility), Quarg Drake and Quarg Wardragon (light warship), Quarg Wyvern (medium), Quarg Hydra (heavy warship), Quarg Lindwyrm (heavy freighter). data/quarg/quarg ships.txt:15, 66, 117, 170, 222, 275.
- Aberrant (Ka'het) family: 13 named hulls: 6 interceptors, 5 light warships, 2 medium warships (data/kahet/aberrant ships.txt). Organo-metallic in the description.
- Remnant: 17 base hulls, mostly bird names (data/remnant/remnant ships.txt).

Boss and elite pattern: no boss tag. The pattern is hull size plus 'never disabled' (Quarg Hydra hull 80000 at data/quarg/quarg ships.txt:283; Ember Waste Node hull 19600 at data/drak/indigenous.txt:175). Engine: a never-disabled ship has minimum hull 0 (source/Ship.cpp:4647-4648), so it is only over when destroyed.

AI behaviour as data: personality tokens (source/Personality.cpp:70-121). Examples: 'timid' (source/Personality.cpp:80), 'heroic' = daring plus hunting (source/Personality.cpp:121), nemesis, escort, vindictive, coward, pacifist, secretive, surveillance, harvests, plunders, frugal, forbearing, marked, tracked, target.

### Top 8 striking creatures (readable at 375 px, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance)

1. Slow wall beast. Ref: data/drak/indigenous.txt:14 (Subsidurial). Why: a slow, heavy body with three mouth guns and a blood leak reads as a wall at phone size. Keep: never disabled, so it must be destroyed; slow mass. Change: name, mouth guns become crystal crest spines, the blood leak becomes our own colour.
2. Growth pair. Ref: data/drak/indigenous.txt:62 and :120 (Void Sprite adult and infant). Why: the juvenile hull is 2800 against the adult's 9600, so growth is obvious at a glance. Keep: juvenile-to-adult silhouette jump, the looping idle frames (rewind). Change: the body shape and the growth trigger.
3. Cloaked guardian. Ref: data/drak/indigenous.txt:166 and :197 (Ember Waste Node, cloak 0.05). Why: the largest creature hides near smaller ones; the dim cloak is a readable tell. Keep: cloak as a tell and a shield-heavy body. Change: reveal on hit, not on a timer; shape and colour.
4. Death-burst swarm member. Ref: data/vyrmeid/vyrmeid.txt:126 (Vyrmeid C). Why: a docile swarm where one member bursts on death, a surprise for the attacker. Keep: the explode-on-death surprise. Change: crystal shards instead of solar bodies; burst radius set by our rules.
5. Spinning defender. Ref: data/vyrmeid/vyrmeid.txt:73 (Vyrmeid B). Why: constant rotation as a defence against small hits; a clear silhouette. Keep: spin as the defence tell. Change: the spin speed and what it blocks.
6. Head-count ladder. Ref: data/quarg/quarg ships.txt:117 (Drake), :222 (Wyvern), :275 (Hydra). Why: tier steps add guns and turrets (Hydra: three culverin guns, two stratospear turrets and one ribault turret, from its gun and turret lines). Keep: light to medium to heavy ladder with the same family look. Change: names and silhouette.
7. Self-heating attacker. Ref: data/kahet/aberrant ships.txt:46 (overheat damage threshold 0.7 on the Chomper). Why: a creature that hurts itself when it runs hot. Keep: overheat damage with hysteresis (source/Ship.cpp:5068-5072). Change: our own heat meter and the look of the glow.
8. Rare long-hauler. Ref: data/vyrmeid/vyrmeid.txt:181 (Astral Cetacean, hull 11000). Why: a rare, large body that travels where small ships cannot; a strong 'rare' tell. Keep: rarity and size as the signal. Change: body, colours, sounds.

## 2. Classes, races and factions

No player classes. The player's roles are ship categories and culture factions.

Ship category ladder (categories.txt): Interceptor, Light Warship, Medium Warship, Heavy Warship, Superheavy, plus freighters, transports, fighters and drones. Progression is by buying the next hull. Licences gate some gear (21 files have licence blocks; Gegno Civilian and Gegno Driller gate the Burrower).

Culture and faction folders (names and ship lists read; mechanics read only where noted):
- Human and Coalition (human/, coalition/): 88 and 22 base hulls. Mission-heavy (human/human missions.txt is 741 KB, not read). Coalition fleet variants read at data/coalition/coalition.txt:100.
- Kahet and Ka'het (kahet/): 34 hulls, aberrant organo-metallic, never disabled, overheat.
- Korath (korath/): 33 hulls, Husk-Slice and Korath Fire-Lance beams.
- Gegno (gegno/): 25 hulls, licensed mining drills.
- Avgi (avgi/): 27 hulls, beam weapons, power-beaming hazard.
- Hai (hai/): 17 hulls, with an Unfettered sub-faction.
- Remnant (remnant/): 17 hulls, mostly bird names, spatial rift hazards.
- Quarg (quarg/): 6 hulls, mythic-beast ladder.
- Drak (drak/): 6 hulls plus the indigenous creatures, organ turrets.
- Vyrmeid (vyrmeid/): creature swarm, three hull tiers.
- Bunrodea (bunrodea/): 8 hulls, energy-hungry Mandible Cannon.
- Incipias (incipias/): 6 hulls, cloud names.
- Pug (pug/): 4 hulls. Sheragi (sheragi/): 3 hulls including a superheavy.
- Successors, Wanderers, Rulei, Iije: named, not read beyond the file list.

## 3. Weapons

Families: guns (82 unique names), turrets (91), secondary weapons, hand-to-hand, anti-missile, ammunition. Damage keys in the data: hull damage and shield damage, plus status channels: slowing (56 lines), corrosion (52), heat (30), ion (22), scrambling (21), fuel (17), disruption (11), energy (5), burn (5), discharge (3).

Special family: organ and mouth weapons (Absorption Organ, Astral Mouth, Plankton Mouth, Mandible Cannon, Burrower drill). These are the 'beast' weapons.

Tiers: the outfit index and the cost, plus named variants (Augmented, Prototype). Visual distinctness per tier is by projectile sprite and hit effect (seeker impact, blaster impact, circle defense, and others).

### Top 5 striking weapons

1. Husk-Slice (data/korath/korath weapons.txt:756, burst count 17 at :776). Why: a 17-shot beam burst with very high speed; the description says it is weak on shields and cuts hull. Keep: shield-versus-hull split (shield 6.3, hull 16.7). Change: name and beam look.
2. Mandible Cannon (data/bunrodea/bunrodea weapons.txt:70, burst count 2 at :91). Why: a paired burst that trades energy for reach. Keep: the burst pair and the energy draw trade-off. Change: name and projectile.
3. Astral Mouth (data/vyrmeid/vyrmeid.txt:241, burst count 10 at :253). Why: ten rapid bites with a negative hit force, which pulls the target in. Keep: pull-in bite. Change: the bite look and count.
4. Absorption Organ (data/drak/indigenous.txt:306). Why: a slow-turning organ turret with energy, shield and ion damage. Keep: slow turret turn as a readable tell. Change: all names and shapes.
5. Burrower (data/gegno/gegno outfits.txt:900, licence Gegno Driller at :906, hit effect burrow at :918). Why: a mining drill that also prospects and needs a drill spar port and licences. Keep: a gathering weapon gated by licence. Change: our own gather rules.

Gun damage ladder numbers were not extracted reliably (not read in full).

## 4. Armour and gear

No armour in the sense of worn sets. Gear tiers are ship outfits:
- Systems Core (Tiny, Small, Medium, Large): a size-named ladder.
- Generator (Candle Class, Furnace Class, Inferno Class): a heat-named ladder.
- nGVF-AA to nGVF-EE Fuel Cell: an alphabetical ladder of five.
- Numbered cells: C3 Scrap Cell, C7 Brawl Cell, C17 Warzone Core, C27 Campaign Core.
- Quarg Hydra loadout names: Quasar Core, Antimatter Core, Quantum Vacuum Battery, Aegis Shield Generator, Central Repair Hub (data/quarg/quarg ships.txt:275 block).

How tiers are shown: by size and by name. Hull look is by culture sprite set. Death looks are by culture and size: quarg and pug tiny, small, medium, large and huge explosion sets, and final explosion small, medium and large (effects list in data/effects.txt).

### Top 5 striking gear items

1. Systems Core ladder (Tiny to Large). Keep the four-size ladder. Change the naming.
2. Generator class ladder (Candle, Furnace, Inferno). Keep the heat-by-name idea. Change the names and the colour per tier.
3. nGVF fuel cell ladder (AA to EE). Keep five steps with a letter tier. Change the look.
4. Quarg explosion sets by size (tiny to huge). Keep five sizes per faction. Change the blast look and the radius.
5. Quarg Hydra loadout (Quasar Core, Antimatter Core). Keep a named end-game core per hull. Change the names.

## 5. Zones and dungeons

Biomes from systems: haze sprites (17 unique, e.g. haze-red, haze-tear, haze-blackbody, haze-coal, haze-dark-nebula), attributes (bright star, notable star, shrouded (37 lines), hidden (29), ember waste, wormhole), belts and asteroid fields (3086 asteroid lines, 1146 minable lines), stars (o to m, plus giants), black holes with accretion disks, neutron stars and magnetars.

Dungeon archetypes: derelicts and boardable derelicts (data/human/derelicts.txt, not read), Predecessor spatial rifts, Ember Waste base, Patir black holes, Magic Asteroid governments (three variants, names only).

Hazards: 30 definitions. Each has a duration or constant strength, a range or 'system-wide' flag, and weapon-style damage keys.

### Top 5 striking zones

1. Ember Waste (data/map systems.txt:2495 attributes, :2512 base heat hazard weight 100; data/hazards.txt:14 base heat, :21 base storm). Why: the whole system is weather. Keep: weather as the zone's identity, with heat and storm as two layers. Change: our biome and palette.
2. Predecessor spatial rifts (data/hazards.txt, Intense: duration 300 to 1500, strength 1 to 3, system-wide; Weak not read). Why: a timed, system-wide threat that comes and goes. Keep: duration and strength rolled per trigger. Change: visuals and the damage.
3. Accretion disk per star (data/hazards.txt, e.g. Chanai Black Hole Accretion Disk, range 600, damage dropoff 120 to 400). Why: a ring of falloff around a centre. Keep: range-based falloff. Change: names and maths.
4. Avgi beamed power (data/hazards.txt, Avgi Beamed Power, range 300, energy damage -90, sign not checked). Why: a field that moves energy. Keep: a beam zone. Change: the effect.
5. Rulei gravity well (data/hazards.txt, range 200, gravitational, hit force -7). Why: a pull zone. Keep: a pull field with falloff. Change: the look and the pull.

## 6. Item and effect looks worth recreating

- Status sparks per damage channel: each has its own sprite, frame rate, lifetime, spin and drift. Ion spark (data/effects.txt:30), scramble spark, disruption and discharge (static sprite), slowing (slowing sprite, lifetime 17, spin 30), corrosion (lifetime 60, drifts with negative velocity, data/effects.txt:77), burning (drifting), leakage (nano spark). Technique: one distinct spark per status, each with its own motion.
- Target rings (source/Engine.cpp:1213-1218): outer ring is shields and is solid, inner ring is hull and is dashed for ships, and the disabled ring is dashed too. Colour is set by relation (flagship, friendly, hostile, neutral) and by ring type. Technique: shape encodes the channel so it reads without colour. Readability at 375 px is the point.
- Frame strips: hit sparks with ^0 to ^4 frames and thruster glow with +0 to +2 frames (AU018, images/effect/).
- Looping idle creatures: the 'rewind' flag on void sprite and node sprites (data/drak/indigenous.txt:67, :124, :170).
- Blood leak and blood effect: lifetime 61, random spin 5 (data/drak/indigenous.txt, effect "blood").
- Remnant leak sparkle: short-lived, fast-flung spark (data/effects.txt:145).
- Jump drive: a no-repeat sprite at 12 frames per second, lifetime 10 (data/effects.txt, effect "jump drive").
- Shaders in shaders/: outline, ring, fog, starfield, batch, sprite. Names only, GLSL bodies not read.

## 7. Inspiration for Frankendom

Each original keeps a mood trait and changes the look and numbers. Engine rows cited are from the Frankendom parity checklist.

1. Mythic-tier beast ladder. Keep: light, medium, heavy hulls in one family with more guns per tier (Quarg Drake, Wyvern, Hydra). Change: our names, silhouettes and tier steps. Row 7 (creature actor).
2. Never-disabled brute. Keep: it must be destroyed; a slow, heavy body. Change: a stagger stance that a finisher can break, not a disable threshold. Rows 9 and 3.
3. Explode-on-death swarm. Keep: a docile group where one member bursts on death. Change: crystal shards and our own burst radius. Rows 8 and 10.
4. Juvenile-to-adult pair. Keep: a visible growth jump in silhouette and a looping idle. Change: the growth trigger, tied to zone time. Rows 7 and 23.
5. Overheat self-harm. Keep: a creature takes hull damage when it runs too hot, with hysteresis (on at max, off below 90 percent). Change: our own heat meter and a clear glow tell. Rows 2 and 4.
6. Reinforcement cap by strength ratio. Keep: no reinforcement when allies outnumber enemies by more than twice (source/Engine.cpp:2043). Change: map it onto MAX_ATTACKERS = 3 and zone population. Rows 4 and 23.
7. Weighted variant fleets. Keep: weighted compositions (coalition fleets use weights 20, 20, 30, 20, 10, 5, 5, 5; data/coalition/coalition.txt:29-31). Change: our compositions and weights. Row 23.
8. Timed weather with rolled strength. Keep: a hazard rolls its duration and strength when it triggers (data/hazards.txt:15, duration 1 to 200 for the heat layer). Change: a readable warning colour and our biome. Rows 14 and 16.

## Not read

- data/human/human missions.txt, data/kahet/kahet missions.txt, the jobs, news, hails, dialog, persons, names, culture conversation files and all narrative text (listed by name only).
- data/_deprecated and data/_ui (names only). data/map planets.txt (counted, not read in full).
- images/ and sounds/ (only the AU018 audit counts).
- shaders/ GLSL bodies (names only).
- source/: only the regions cited above. Fleet.cpp and System.cpp beyond the period lines were not read.
- Gun cost and damage ladder numbers: not extracted reliably.
- Flags 'inscrutable', 'quantum keystone', 'gaslining': names only.
