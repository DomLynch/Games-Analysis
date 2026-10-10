# Design catalogue: angband-angband (DC005)

Rule for every idea below (Dom, 2026-10-11): recreate as a clearly distinct original, never a copy. Inspiration is mood and mechanic only, about 20-30 percent resemblance. Names here are our own labels, not the donor's names.

## Which half was read
- Data half: `lib/gamedata/*.txt` (monster, object, ego_item, artifact, class, p_race, terrain, vault, pit, trap, dungeon_profile, visuals, shape, monster_spell). Read by counts, field extraction and key entries. This is the matching data pair for the code in `src/`.
- Code half: `src/` not read in depth (only `src/z-file.c` header via the AU004 audit).
- Art and sound: names, sizes and prefixes only (AU004). No image or audio pixels or waveforms were opened.
- Restricted note: none found in the root listing. Asset class per AU004: A for Adam Bolt 16x16 tiles, Gervais 32x32 (attribution), Dubtrain sounds (attribution); C for Shockbolt 64x64 tiles and gamedata text. So inspiration from the C groups stays at category level.

## 1. Creatures and beasts

Counts (from `lib/gamedata/monster.txt`): 624 `name:` entries, of which 623 are monsters and 1 is the player. 101 flag lines carry UNIQUE. Depth bands for the 623 monsters: depth 0-9: 140, 10-24: 141, 25-49: 208, 50-79: 103, 80 and up: 31. Base templates in `lib/gamedata/monster_base.txt`: 56.

Families (base template, entry count from `grep '^base:' monster.txt`):
- person 54 (human and townsfolk types)
- dragon 30 and ancient dragon 29 (59 dragon-type entries in total)
- humanoid 22, orc 18, troll 16, kobold 6, yeek 5
- zephyr hound 21 (pack breathers, depth 15 to 74)
- elemental 20, vortex 13
- wraith 19, ghost 15, zombie 9, skeleton 9, vampire 6, lich 7
- major demon 18, minor demon 9
- spider 16, canine 16, feline 7, reptile 10, snake 10
- jelly 14, mold 9, mushroom 9, worm 11
- golem 13, giant 11, eye 11, quylthulg 10, hybrid 10, creeping coins 5, mimic 4, lurker 2
- Animals and insects: ant 10, bat 9, centipede 8, killer beetle 8, insect 7, bird 7, hydra 8

Escalation shape: the dragon line is a four or five step growth ladder (see top creature 5). Hounds, vortices and eyes escalate by element and by how many eyes or heads. Uniques sit at the top depths and are named individually.

Boss and elite pattern: uniques carry the UNIQUE flag (101 flag lines). The field extract shows them at every depth band from about 5 upward, with clusters at depths 5-30 (named captains and lesser uniques) and 50 and up (named apex dragons, demons and wraiths). Uniques named in the file are not reused here. Escorts use `friends` lines (fire hound, 4609).

### Top 8 striking (own labels)

Striking criteria: readable silhouette at 375 px, one signature behaviour, one signature sound or effect, and could be ours at 20-30 percent resemblance. Sound per monster is not read (monster message lines were not opened), so the sound note is the sound family only.

1. **Coin-hoard mimic** (label: Coin-hoard mimic). Creeping coin family in five metal tiers: copper (monster.txt line 1588, depth 4), silver (1992, depth 6), gold (3063, depth 10), mithril (3682, depth 13), adamantite (6326, depth 27). Why: a pile of treasure that stands up and bites is an instant read. The metal tier is the colour and rarity signal. Signature: a touch with poison (3682 has HIT and TOUCH:POISON blows, read in full). Keep: treasure disguise, metal ladder, poison touch. Change: our own silhouette (pile with legs), our own tier metals.

2. **Metal guardian statue** (label: Metal guardian). Golem ladder: iron (monster.txt 5461, depth 22), mithril (7105, depth 30, read in full). Mithril golem: four heavy blows, immune to cold, fire and poison, drops only gold (DROP_2, ONLY_GOLD). Why: a statue that is worth killing for its loot. Keep: statue body, immunities, gold drop. Change: our silhouette and tier names. Ours could be a stone-to-metal ladder with a different drop.

3. **Elemental hound pack** (label: Storm hound pack). Zephyr hound family: 21 entries, one per element (light 3986, dark 4009, clear 4130, fire 4609, cold 4634, energy 4658, earth 4987, air 5011, water 5056, and higher tiers to aether 13418 at depth 74). Fire hound read in full (4609): depth 18, friends `100:2d7:Same` (pack of 2 to 14), BR_FIRE breath, light radius 2 (glow), fire-resist and cold-weak flags. Why: a pack that glows in one element and breathes it. Keep: pack summon, element colour, breath, glow radius. Change: pack shape, our element set, our breath look.

4. **Whirling elemental vortex** (label: Swirl vortex). Vortex family: fire vortex (5324, depth 21, read in full: ENGULF:FIRE blow, BR_FIRE, light 2), water (5343), cold (5361), energy (7055, depth 29), nexus (8976), plasma (8995), shardstorm (9038), time (9201), shimmering (9219), chaos (11517), aether (12168). Why: a spinning mass that changes element with depth. Keep: spinning body, engulf attack, element-coloured glow. Change: our body shape and our element list.

5. **Dragon growth ladder** (label: Hatchling-to-wyrm line). Five tiers across the dragon family: baby (baby blue dragon, monster.txt 2623, depth 9, read in full: hit-points 88, two claws and a bite, BR_ELEC breath, drops gold), young (depth 29-32), mature (depth 39-43), ancient (depth 50-53, e.g. ancient multi-hued 11492, read in full: BR_ACID, BR_COLD, BR_ELEC, BR_FIRE, BR_POIS breath, ATTR_MULTI shimmer, depth 53), great wyrms (depth 70-82, storm, ice, swamp, hell, bile, thunder, chaos, law, balance, many-colours). Why: four visible growth stages and a shimmering top tier. Keep: one body plan per element, colour = element, multi-hued apex, the shimmer. Change: our stage names, fewer stages (three is enough), our apex colour cycle.

6. **Watcher-eye line** (label: Many-eyed watcher). Eye family: floating eye (694, depth 1), radiation eye (1432, depth 3), disenchanter eye (1834, depth 5), bloodshot eye (2149, depth 7), evil eye (4754, depth 18), spectator (6790, depth 28), gauth (8841, depth 36), beholder (9474, depth 40, read in full: four gaze blows with exp drain, charge drain and int loss, a bite, a spell list including blind, confuse, darkness, mind blast, four bolt spells), undead beholder (10504, depth 45), beholder hive-mother (12714, depth 67). Why: each tier adds more eyes and gaze effects, so the silhouette grows. Keep: eye-count escalation, gaze effects as status. Change: body shape (not a sphere), our own gaze set.

7. **Summoning mound** (label: Summon mound). Quylthulg family, 10 entries: quylthulg (5104, depth 20, read in full: BLINK and S_MONSTER spells, no attacks, stationary body), nexus (7566, depth 32), rotting, demonic and draconic (depth 45), greater demonic, greater draconic, greater rotting (depth 71), master (13607, depth 76), and a unique at depth 79 (13794). Why: a pulsing mound that does nothing but summon, which reads at a glance. Keep: stationary summoner, blink, summon. Change: our summon theme and silhouette.

8. **Item-disguise mimic line** (label: Item mimic). Four mimics at depth 18-35, each shows as an item glyph: potion mimic (4683, glyph !, depth 18), scroll mimic (5294, glyph ?, depth 21), ring mimic (6954, glyph =, depth 29), chest mimic (8466, glyph ~, depth 35). Why: the glyph is the disguise, so the player reads it as loot until it bites. Keep: item disguise, one per item class. Change: our item classes and the reveal animation.

Full family list and counts are above. Other creatures listed only from the extract (name, base, depth, glyph) and not read in full: giant and hill families, the troll tiers, the ghost tiers.

## 2. Classes, races and factions

Source: `lib/gamedata/class.txt` (9 classes) and `lib/gamedata/p_race.txt` (11 races). Hit dice and max attacks are from the file. Magic realm is the book title in `equip:` lines, not the spell text.

Classes (role, signature mechanic, progression shape):
- Warrior: front-line melee, hit die 9, up to 6 blows per turn, no spell book. Shape: more blows with level.
- Mage: arcane caster, hit die 0, 4 max blows, book from start, bolt and utility spells. Shape: spell list grows.
- Druid: nature caster, hit die 2, book from start, shape-change spells. Shape: spell list plus forms.
- Priest: prayer caster, hit die 2, prayer book. Shape: spells plus support.
- Necromancer: shadow caster, hit die 2, shadow book. Shape: spells, dark-themed.
- Paladin: prayer caster from level 1 (magic line first field 1), hit die 6, 5 blows. Shape: melee with spells.
- Rogue: book caster, magic line first field 5 (read as the level spells start), hit die 4, 5 blows. Shape: stealth and thievery with late spells.
- Ranger: nature caster, magic line first field 3, hit die 5, 5 blows. Shape: archery and nature spells.
- Blackguard: shadow caster from level 1, hit die 8, 5 blows, magic line first field 1 with weight 600. Shape: melee with dark power.

Races (kind: race, stat package from `obj-flags` and `skill-stealth`):
- Human (hit die 10, no flag). Baseline.
- Half-Elf (die 10, sustain Dex). Dunadan (die 10, sustain Con).
- Elf (die 9, sustain Dex), High-Elf (die 10, see invisible).
- Hobbit (die 7, hold life, best stealth of the set at 4).
- Gnome (die 8, free action).
- Dwarf (die 11, protect blindness).
- Half-Orc (die 10, no flag).
- Half-Troll (die 12, sustain Str and regeneration, stealth -2).
- Kobold (die 8, stealth 3).

Faction and class-mechanic note: this game has no factions in the files read. The races are stat packages (a sustain or a resist each), which is a good model for our hero kits.

## 3. Weapons

Families (object.txt type counts): sword 14, hafted 14, polearm 16, bow 5, ammunition (arrow 3, bolt 3, shot 3), digger 3. Total weapon-type objects: 61.

Tiers: sword line runs dagger, rapier, short sword, cutlass, tulwar, scimitar, long sword, broad sword, bastard sword, katana, zweihander, executioner's sword, then an ego-blade. Polearm line runs awl-pike, halberd, trident, pike, axes, lance, scythe, glaive, to the lucerne hammer at the top. Ammo has a mithril tier in arrow, bolt and shot.

Special properties: brands in brand.txt (10 entries = 5 elements in two tiers: acid, lightning, fire, cold, poison). Slays in slay.txt (11 entries: evil creatures, animals, orcs, trolls, giants, demons, dragons, undead, in two tiers). Ego items in ego_item.txt (107 entries) use "of ..." suffixes and parenthesis names, e.g. flame, frost, acid, lightning, venom, slay sets, and free action. Artifacts in artifact.txt (138 entries) are unique named items; names not reused here.

Visual distinctness of tiers: tiers differ by name and by the material word (metal, mithril, adamantite), not by a visual layer in the files. Look-layer details are in section 6.

Top 5 striking (own labels, from the file):
1. Chain-of-glaives (label): the polearm line, which ends with a heavy hammer-axe entry. Keep: reach and weight as the read.
2. Ring-blade set (label): the blade ladder from dagger up to executioner-class blades, ending in a chaos-blade entry. Keep: tier names as rising steps.
3. Brand ladder (label): the five-element brand set (acid, lightning, fire, cold, poison) in two tiers. Keep: one element per tier as a property on a common weapon.
4. Mithril ammo (label): mithril arrows, bolts and shot as a light ammo tier. Keep: a metal word marking the top light tier.
5. Disruption mace (label): a hafted entry named for disruption. Keep: a named special on a common weapon class.

Dom's rule: all five are our own labels. Keep the named trait; change the silhouette and the effect.

## 4. Armour and gear

Gear counts (object.txt): soft armour 5, hard armour 12, dragon armour 12, shield 6, helm 4, crown 4, cloak 4, boots 6, gloves 5. Total gear-type objects: 58.

Material tier ladder (names, in order, from object.txt): soft leather, studded leather, hard leather, leather scale mail, metal scale mail, chain mail, augmented chain, bar chain, metal brigandine, partial plate, metal lamellar, full plate, ribbed plate, mithril chain, mithril plate, adamantite plate. Shields: wicker, small metal, leather, large metal, knight's, mithril. Helms: hard leather cap, metal cap, iron helm, steel helm. Crowns: iron, golden, jewel-encrusted, massive iron.

Material looks: named metals show as the tier name (mithril, adamantite, gold). The files do not give colour or shader per material in the object file; colour is read from the glyph colour field and the visuals file (section 6).

Dragon scale mail: 12 colour-named sets (black, blue, white, red, green, multi-hued, shining, law, gold, chaos, balance, power). Each is a single item at a high cost, one per dragon colour. This is a colour-coded set, a strong fit for our element-coded gear idea.

Top 5 striking (own labels):
1. Element scale set (label): twelve scale-mail colours, one per element or alignment. Keep: colour equals element. Change: our own names and our own element list.
2. Mithril-shod kit (label): the mithril tier across boots, gauntlets, shield, arrows. Keep: one metal word across slots.
3. Adamantite plate (label): top plate, the heaviest tier. Keep: top tier reads as heavy.
4. Iron crown set (label): crown tiers (iron, golden, jewel, massive iron). Keep: head-slot rank by metal.
5. Seeker ammo (label): cheap low-tier ammo named by its function. Keep: function name on the cheapest tier.

## 5. Zones and dungeons

Dungeon profiles (lib/gamedata/dungeon_profile.txt, 9 names): town, labyrinth, cavern, classic, modified, moria, lair, gauntlet, hard centre. Behaviour of each profile not read in depth.

Vault and room archetypes (lib/gamedata/vault.txt, 161 entries): interesting room 66, greater vault 40 (27 and 13 new), medium vault 29 (14 and 15 new), lesser vault 26 (14 and 12 new). Room templates in room_template.txt (415 entries) not sampled in detail.

Monster pits (lib/gamedata/pit.txt, 40 entries): family pits such as orc, troll, giant, five or more dragon colour pits, demon, jelly, animal, undead, ant, kobold, creepy crawly, minor demon, spellcaster, archer, naga, thief, warrior, dark dwarf, eye, ogre, serpent, golem, insect, reptile, elemental and more. Pits are the best dungeon-archetype idea in the file.

Terrain (lib/gamedata/terrain.txt, 25 entries): shops (general, armoury, weapon smith, bookseller, alchemy, magic, black market, home), open floor, doors, stairs, rubble (plain and passable), magma and quartz veins (with and without treasure), granite and permanent walls, and lava.

Hazards (lib/gamedata/trap.txt, 40 entries, 39 traps plus "no trap"): doors and webs, trap doors, pits (plain, spiked, poison), summoning and necromancy runes, dragonsong rune, hellhole, teleport rune, fire and acid marks, dart traps (slow, strength, dex, con loss), gas traps (blind, confuse, poison, sleep), alarms, explosions, mind-blast traps, rock fall and earthquake (ancient mechanism), flash and mana-drain traps.

Ambience by depth (lib/customize/sound.prf, lines 33-39): dungeon levels 1-20 use an iron door and metal bell ambience. Town day and night use different ambience.

Top 5 striking zones (own labels):
1. Monster pit (label: Family pit): one room, one family. Keep: family theme. Change: our families.
2. Lava-vein cavern (label: Lava vein): lava and magma veins as hazard terrain. Keep: lava as terrain hazard.
3. Labyrinth profile (label: Maze level): labyrinth dungeon profile. Keep: maze layout; change the look.
4. Set-piece vault (label: Set-piece vault): medium and greater vault entries. Keep: vault as a bounded set piece.
5. Bell-tower depth band (label: Bell depth): depth ambience, bells at mid depth. Keep: depth tone change.

## 6. Item and effect looks worth recreating

- Monster colour flicker (ATTR_FLICKER, 46 monster entries). Technique: palette cycle that only creatures use (visuals.txt lines 39-56: "only monsters have the ability to flicker"). Ref: lib/gamedata/visuals.txt lines 39-56; monster.txt (grep ATTR_FLICKER).
- Multi-hued shimmer (ATTR_MULTI, 24 monster entries, e.g. ancient multi-hued dragon). Technique: colour rotates through the element set. Ref: lib/gamedata/monster.txt line 11492.
- Clear monster (ATTR_CLEAR, 6 entries). Technique: transparency. Ref: lib/gamedata/monster.txt (grep ATTR_CLEAR).
- Monster light radius (light field, e.g. fire hound and fire vortex with light 2). Technique: glow that moves with the creature. Ref: monster.txt lines 4609, 5324.
- Tile sets with separate mapping files (lib/tiles/list.txt; adam-bolt 16x16, gervais 32x32, shockbolt 64x64, old 8x8, nomad 8x16). Technique: swap the art layer per set, keep the game code. Ref: lib/tiles/list.txt and lib/tiles/*/graf-*.prf (names only).
- Dragon colour series (object.txt dragon armour, 12 colours). Technique: one shape, many colours. Ref: lib/gamedata/object.txt (dragon armor entries).
- Ambient bells and iron doors (sound.prf lines 33-39, sound files amb_bell_*, amb_door_iron). Technique: depth-tiered sound bed. Ref: lib/customize/sound.prf line 39, lib/sounds/amb_bell_*.mp3 (names only, audio not opened).
- Sound families by prefix (amb_, mco_, plc_, plm_, id_). Technique: naming scheme for sound packs. Ref: lib/sounds (names only).

## Inspiration for Frankendom

Each original keeps one named trait and changes the rest. All are our own names. None copy a donor name.

1. **Hoard mimic** (own name). A treasure pile that stands up in five metal tiers, poison touch, depth-gated. Keep: the disguise and metal ladder. Change: silhouette and attacks.
2. **Metal sentinel line** (own name). Four statue guardians, each heavier metal, immune to two elements, drops gold on death. Keep: immunities and gold drop. Change: our metals and silhouette.
3. **Element hound pack** (own name). A pack of up to 12 that share one element and breathe it. Keep: pack summon and glow. Change: our element set and pack shape.
4. **Three-stage wyrm** (own name). Hatchling, adult, apex, one body plan, colour equals element. Apex shimmers through the element set. Keep: colour-as-element and the shimmer. Change: stage count (three not five), names, and breath.
5. **Watcher line** (own name). A small watcher that grows more eyes and gaze effects to a boss. Keep: escalation by eyes. Change: body shape and gaze effects.
6. **Summon mound** (own name). A stationary pulsing summoner that blinks and summons, with a late greater tier. Keep: stationary summoner. Change: summon theme and look.
7. **Item mimic line** (own name). Four mimics each disguised as an item glyph, one per item class. Keep: glyph disguise. Change: our item classes and reveal.
8. **Element scale set** (own name). Twelve colour-named armour sets, one per element. Keep: colour equals element. Change: our names and element list.

## Licence note
Code: GPL version 2, or the Angband licence (docs/copying.rst line 5). Assets per group (docs/copying.rst): Adam Bolt 16x16 tiles permit use for any purpose (line 24); Gervais 32x32 tiles are CC BY 3.0 (line 26); Shockbolt 64x64 has its own licence with limits (lines 28, 40); sounds are CC BY 4.0 by Dubtrain (line 46); fonts are GPL (line 48). Old 8x8 and nomad 8x16 tiles, icons, screens and gamedata text are not named in a licence line. Several artifact and unique names look Tolkien-derived (artifact.txt line 108 area; not assessed). This is a summary of what the files say, not a legal opinion.

## Not read
- Image and audio files (pixels and waveforms); lib/tiles and lib/sounds are names and sizes only.
- Full entries for all 623 monsters; 8 read in full (3682, 7105, 4609, 5324, 5104, 2623, 11492, 9474), the rest from the field extract (name, base, depth, glyph, colour letter).
- Monster message and sound text; blow_effects.txt, projection.txt, monster_spell.txt (names and counts only, 91 spell names).
- room_template.txt contents; dungeon profile internals; shape.txt beyond names (9 shapes: normal, fox, Pukel-man, bear, eagle, bat, warg, vampire, werewolf).
- Full lore and item text. Sampling only, no copied text.
- src/ code (only the z-file.c header via the audit).
- help folder and most of docs/.
