# wesnoth-wesnoth (design catalogue, DC060)

Donor: /mnt/frankendom-donors/wesnoth-wesnoth/ (Battle for Wesnoth, C++ engine in src/, WML data in data/core and data/campaigns).
Halves read: DATA pack only (data/core/units, data/core/macros, data/core/terrain.cfg, data/core/macros/items.cfg, po/wesnoth-units/wesnoth-units.pot). Engine half (src/) NOT read in this pass. Server half (src/server) is in the same box and was NOT read. No other donor is paired.
Licence: code GPL v2 or later (COPYING). Art and music mixed: per AU057, copyrights.csv tally of 396 rows is 343 GPL v2+, 48 CC BY-SA 4.0, 5 CC0; unit art has no registry rows. Not a legal reading.
Dom's rule for every item below: recreate as a clearly distinct original, never a copy. Mood only, about 20-30 percent resemblance. Each brief names the trait KEPT and the trait CHANGED.

Counts (from file lists and grep of data files, not hand-counted):
- 327 [unit_type] records in data/core/units, split: monsters 63, undead 27, drakes 17, wose 5, bats 3, gryphons 3 (creature families, section 1); humans 52, dunefolk 31, elves 22, dwarves 18, merfolk 16, orcs 12, nagas 11, saurians 10, goblins 7, trolls 7, ogres 2 (playable classes, section 2); boats 20 and fake 1 (not counted).
- 284 top-level [terrain_type] blocks in data/core/terrain.cfg (section 5).
- 17 distinct weapon specials in data/core/macros/weapon_specials.cfg (section 3).
- 11 OBJ_ item macros in data/core/macros/items.cfg (section 4).

## 1. Creatures and beasts

Families and tiers (level, HP from the unit file):
- monsters/ (63 records, level 0 to 5). Beasts, insects, sea, spirits, dragons. HP runs from 13 (Fire Wisp) to 142 (Yeti, level 4). Insect line: Giant Ant Egg (level 0), Ant (0), Ant Soldier (1), Ant Firebomb and Firebane (2), Ant Queen (3, leadership), Ant Fire Queen (3, leadership). Dragons: Fire Dragon (level 5, 101 HP, leadership), Skeletal Dragon (level 4, 98 HP). Sea: Caribe line (skirmisher), Kraken (3, 85 HP), Sea Serpent (3), Tentacle (1, regenerates_8).
- undead/ (27 records, level 0 to 4). Four ladders:
  - Ghoul line: Ghoul (L1, 33 HP) to Necrophage (L2, 47) to Ghast (L3, 65).
  - Walking Corpse (L0, advances to Soulless L1).
  - Skeleton lines: Skeleton (L1, 34) to Revenant (L2, 47) to Draug (L3, 68), or Skeleton to Deathblade (L2, 39). Skeleton Archer (L1, 31) to Bone Shooter (L2, 42) to Banebow (L3, 55). Skeleton Rider (L1) to Bone Knight (L2, 58). Death Squire (L2) to Death Knight (L3, 63).
  - Spirit lines: Ghost (L1, 18 HP) to Wraith (L2, 25) to Spectre (L3, 33); Ghost to Shadow (L2, 24) to Nightgaunt (L3, 35).
  - Undead also includes a Necromancer tree of human units (Dark Adept to Dark Sorcerer to Lich or Necromancer).
- drakes/ (17 records). Burner (L1) to Fire Drake (L2) to Inferno Drake (L3). Burner to Drake Flare (L2) to Drake Flameheart (L3). Fighter (L1) to Warrior (L2) to Blademaster (L3). Clasher (L1) to Thrasher (L2) to Enforcer (L3); Clasher to Arbiter (L2) to Warden (L3). Glider (L1) to Sky Drake (L2) to Hurricane Drake (L3). Armageddon Drake (L4, no advance).
- wose/ (5 records). Sapling (L0) to Wose (L1) to Elder (L2) to Ancient (L3). Wose Shaman (L2, no advance). Every stage carries ambush and regenerates_8.
- bats/ (3) and gryphons/ (3): listed only, not read.

Escalation with level: each step is a bigger body and a new unit name, for example Skeleton 34 HP, Revenant 47, Draug 68. At max level units use the default AMLA: its description says max HP +3 and max XP +20 percent (data/core/macros/amla.cfg line 29); max_times is 100 (line 27). A separate heal-and-raise effect set (AMLA_EFFECTS_HEAL_AND_RAISE_XP, lines 1-21, includes heal_full at line 11) exists in the same file; whether the default AMLA applies it was not checked.

Signature abilities (count of abilities_list lines across data/core/units, including playable races): skirmisher 17, leadership 17, submerge 12, regenerates_8 9, heals_8 with cures 9, ambush alone 4 and ambush with regenerates 5, steadfast 4, heals_4 5, burrow 1, teleport 1, feeding 2.

Boss or elite pattern: a level 5 monster (Fire Dragon) with leadership and a ranged breath; a queen (Ant Queen, level 3) with leadership that spawns eggs; a level 4 undead dragon (Skeletal Dragon). Scenario-level boss scripting (campaign files) was NOT read.

Top 8 most striking (labels are mine):

1. Label: breath-and-bite great drake (monsters/Fire_Dragon.cfg).
   Why: three attacks on one 101 HP body, with a ranged fire breath (4 strikes of 14, marksman, line 83) and melee bite and tail. Its resting idle uses uneven frame durations (line 38), so the body looks like it breathes.
   Keep: split melee and ranged attacks on one unit; uneven rest-idle timing.
   Change: a breath cone that hits a line of tiles, not one target; a battle-cry instead of leadership.
   Ref: /mnt/frankendom-donors/wesnoth-wesnoth/data/core/units/monsters/Fire_Dragon.cfg lines 38, 52, 83.

2. Label: hatchling clutch (monsters/Ant_Egg.cfg).
   Why: a 0-move egg with 32 HP that threatens by proximity. It hatches when an enemy starts their turn next to it (line 84), or when a neighbouring egg is broken (line 123). A hatch grants 12 XP as a new unit (line 112).
   Keep: eggs as units that act by rule, not by timer.
   Change: hatch on a visible countdown on the tile, so the player can read it before it happens.
   Ref: /mnt/frankendom-donors/wesnoth-wesnoth/data/core/units/monsters/Ant_Egg.cfg lines 84, 112, 123.

3. Label: bone wyrm (monsters/Skeletal_Dragon.cfg).
   Why: a level 4 undead dragon, 98 HP, cost 160. Its jaw (15 x3) carries drains (line 40), its claws do 27 x2 with no special.
   Keep: a drain on one attack only, so the unit has a clear bite to read.
   Change: drain becomes a bone-mark debuff that wears off after a few turns.
   Ref: /mnt/frankendom-donors/wesnoth-wesnoth/data/core/units/monsters/Skeletal_Dragon.cfg lines 32-48.

4. Label: ink-and-tentacle deep horror (monsters/Kraken.cfg).
   Why: a tentacle attack of 10 strikes of 5 with swarm (line 31), and an ink ranged attack of 3 x 8 with poison (line 40). Swarm means the strike count falls as HP falls, so the threat visibly shrinks.
   Keep: swarm, strike count scaled by HP fraction (weapon_specials.cfg lines 146-147 describe it).
   Change: ink leaves a lingering cloud on tiles instead of a status.
   Ref: /mnt/frankendom-donors/wesnoth-wesnoth/data/core/units/monsters/Kraken.cfg lines 24-40.

5. Label: ambush leaper (monsters/Shadow_Jumping_Spider.cfg).
   Why: level 3, 72 HP, ambush (line 29), fangs 3 x 10 with drains (line 91). It waits hidden and strikes from cover.
   Keep: hidden until adjacent; drain on fangs.
   Change: the ambush is a leap from a ledge with a telegraph frame, so it reads at 375 px.
   Ref: /mnt/frankendom-donors/wesnoth-wesnoth/data/core/units/monsters/Shadow_Jumping_Spider.cfg lines 29, 83-91.

6. Label: sapling-to-ancient growth ladder (units/wose/ five files).
   Why: four stages, one per level, all with the same ability pair ambush and regenerates_8 (line 17 in each file). The unit grows, it does not change identity.
   Keep: one growth ladder with a fixed ability set at every stage.
   Change: read stage by silhouette height and bark colour, not by a new name per stage.
   Ref: /mnt/frankendom-donors/wesnoth-wesnoth/data/core/units/wose/Wose_Sapling.cfg line 17; Wose.cfg, Elder.cfg, Ancient.cfg line 17.

7. Label: burrowing beetle (monsters/Horned_Scarab.cfg).
   Why: level 1, 36 HP, with burrow (line 17) and two attacks, bite 2 x 8 and horn 1 x 14 pierce. A cheap early unit that hides in the ground.
   Keep: burrow as a hidden state on an early unit.
   Change: burrowing shows a dust burst and a short rumble, then the unit emerges from the same tile.
   Ref: /mnt/frankendom-donors/wesnoth-wesnoth/data/core/units/monsters/Horned_Scarab.cfg lines 17, 37-53.

8. Label: frost-fist giant (monsters/Yeti.cfg).
   Why: level 4, 142 HP, the largest HP in monsters/. Fist is 2 strikes of 32 impact (file lines 39-42). Not receipted in this pass; values read from the file.
   Keep: a single big impact body that a player must step around.
   Change: the fist slam leaves a frost patch on the tiles around the target.
   Ref: /mnt/frankendom-donors/wesnoth-wesnoth/data/core/units/monsters/Yeti.cfg lines 8, 35-42.

Undead trait (data/core/macros/traits.cfg line 50 onward): undead, elemental and mechanical traits are immune to drain, poison and plague. Undead trait is a musthave trait.

## 2. Classes, races and factions

One line each (role, signature mechanic, progression shape):
- Humans (52): Loyalist, Outlaw, Mage, Woodsman, Peasant. Sergeant to Lieutenant to General uses leadership. Mage of Light and Mage White heal and cure. Assassin and Duelist use skirmisher. Fugitive uses concealment. Progression: L0 to L5 trees.
- Elves (22): Archer, Fighter, Shaman, Druid, Ranger. Ranger to Avenger uses ambush. Captain and Marshal use leadership. Progression: L1 to L3, with several L3 dead ends.
- Dwarves (18): Fighter, Thunderer, Guardsman, Miner. Guardsman to Stalwart to Sentinel uses steadfast. Progression: L0 to L3.
- Orcs (12): Grunt, Archer, Assassin, Leader. Leader to Ruler to Sovereign uses leadership. Progression: L1 to L3.
- Goblins (7): Spearman (L0), Wolf Rider (L1), Rouser (L1, leadership). Shorter ladders.
- Trolls (7): Whelp (L1) to Troll (L2) to Warrior (L3); all use regenerates_8. Progression: regeneration as the signature.
- Ogres (2): Young Ogre (L1) to Ogre (L2). Smallest tree.
- Saurians (10): Skirmisher (L1), Ambusher (L2), Flanker (L3) use skirmisher. Augur to Oracle to Prophet use heals_4; Soothsayer to Seer use heals_8 with cures.
- Merfolk (16): Citizen (L0) to many L1 to L3 branches. Hoplite uses steadfast. Diviner uses illumination with heals.
- Nagas (11): Fighter, Guard, Ophidian, Myrmidon. Progression: guard shield line.
- Dunefolk (31): the largest playable race by records. Captain uses leadership. Skirmisher, Strider, Harrier and Sky Hunter use skirmisher; Falconer and Sky Hunter add diversion. Herbalist (L1) uses heals_4 and regenerates_4 to Apothecary (L2, heals_8) to Luminary (L3, heals_8 with cures and regenerates_4).
- Wose (5): all wose share ambush and regenerates_8 (section 1).
- Undead (27) and drakes (17): also playable, listed in section 1.

## 3. Weapons

Families: unit attack records (name, type, range, damage, number, specials_list) plus 17 distinct weapon specials in data/core/macros/weapon_specials.cfg: unwieldy, berserk, backstab, plague, slow, petrifies, marksman, magical, honed, swarm, charge, guard, drains, firststrike, poison, stun, arcane. Damage types seen in unit files: blade, pierce, impact, fire.

Special properties worth noting:
- Berserk: fights until one side dies or 30 rounds pass (weapon_specials.cfg line 23; value=30 at line 25).
- Charge: double damage on offence, but double damage taken from the counter (line 157).
- Drains: heals half the damage dealt, rounded down (line 185; value=50 at line 183).
- Swarm: strike count scales with HP fraction (line 146).
- Marksman, magical, firststrike, poison, stun, petrifies: flags, not visuals.
- Set bonus: none seen in the data read.

Visual tiers: no weapon tiers. Attack icons are per attack (for example attacks/axe-undead.png on Skeleton). Tier shown by unit sprite, not read per tier.

Top 5 striking (one signature each):
1. Storm Trident (items.cfg 537): pickup that gives merfolk a ranged lightning attack, 14 x 2, magical. Other races cannot wield it. Own per-direction lightning animations (LIGHTNING_ANIMATION macro, items.cfg 522).
2. Sceptre of Fire (items.cfg 578): ranged fireball, 15 x 4, magical, with a fireball animation and a fire sound.
3. Charge (weapon_specials.cfg 157): double damage both ways when attacking, a clear risk trade.
4. Berserk (weapon_specials.cfg 23): fight to the end or thirty rounds.
5. Jaw drains on Skeletal Dragon (monsters/Skeletal_Dragon.cfg line 40): one attack that heals the attacker.

## 4. Armour, gear and items

Gear sets: none. Armour, helmets and sets are not in the data read.
Gear tiers: none. The closest tier is level 0 to 5 advancement with AMLA (section 1).
Items: 11 OBJ_ item macros in data/core/macros/items.cfg, for example OBJ_POTION_HOLY (line ~302), OBJ_RING_REGENERATION (line ~401), OBJ_STAFF_SPEED (line ~481), OBJ_TRIDENT_STORM (line 537), SCEPTRE_OF_FIRE_EFFECT (line 578). A pickup asks the unit whether to take it and has a race or attack filter.
Item imagery: image files under data/core/images/items/, for example armor-golden.png and bow-crystal.png (names only, not opened).

Top 5 striking:
1. Storm Trident pickup (items.cfg 537): race-locked pickup that adds a new attack.
2. Sceptre of Fire (items.cfg 578): an effect macro that adds a ranged attack and an animation.
3. Arcane imbue (items.cfg 306-311): the SET_WEAPON_ARCANE macro appends an arcane special to a unit's weapons (mode=append). The holy potion macros take an ARCANE parameter (items.cfg line 270); the exact potion-to-macro link was not traced.
4. Heal-and-raise AMLA effect set (data/core/macros/amla.cfg line 11, heal_full=yes): full HP plus extra max XP, in one macro.
5. Undead trait (data/core/macros/traits.cfg line 57): immunity to drain, poison and plague as a trait.

## 5. Zones and dungeons

Biome list (from terrain.cfg editor_group tags, a block can carry several groups): castle 22 plus combos; cave with obstacle 19; water 15; flat 14; embellishments with obstacle 14; village 12 plus combos; forest 9; cave 9; desert 4 plus combos; rough 4; frozen, forest and other combos.
Terrain families: deep and shallow water with reefs and kelp (submerge values 0.3 to 0.5), grass and dirt, desert with oasis, hills and mountains, cave floor and cavewall variants, mushroom groves (lit and unlit), lava and lava chasm, castle, villages (about 29 village ids plus an overlay).

Dungeon archetypes: cave areas with cavewall variants, lit mushroom patches and lava; underground cave village (underground_village, terrain.cfg line 2062).

Hazards:
- Lava (id=lava, line 1317): unwalkable, light 25, max light 35 (lines 1322-1323). Help text (data, not engine) says the glow gives lawful units an attack bonus and removes it from chaotic units (line 1325).
- Lava chasm (id=lava_chasm, line 1304): same light values (lines 1309-1310).
- Cave lit patches: the help text for the cave variant says the same alignment bonus (line 3267).
- Deep water and quagmire: submerge values 0.4 to 0.5 (for example deep water at lines 27-38).

Top 5 striking:
1. Lit mushroom grove (fungus_beam, terrain.cfg around line 1111, light 25): glowing ground as a light source.
2. Lava field (terrain.cfg line 1317): unwalkable with a glow and alignment-based combat effect (help text, line 1325).
3. Cave village (underground_village, terrain.cfg line 2062): a settlement type that reads as underground.
4. Oasis (oasis, terrain.cfg line 352): heals=8 (line 358).
5. Kelp forest (sea_kelp, terrain.cfg line 133): submerge 0.45 with swamp alias.

Zone population (spawn caps, respawn, walk density): NOT read. Campaign and scenario files were not read; no walk-density data was seen in the data/core files read.

## 6. Item and effect looks worth recreating

- Per-tile light values: fungus_beam and lava carry light=25 and max_light=35 (terrain.cfg 1118, 1322-1323). Technique: a per-tile light value feeding a glow pass. Ref: data/core/terrain.cfg.
- Egg hatch as an animation: the hatch event plays an animate_unit with flag=hatching before advancing the unit (Ant_Egg.cfg, event starting line 84). Ref: data/core/units/monsters/Ant_Egg.cfg.
- Lightning per direction: a LIGHTNING_ANIMATION macro generates one animation per direction and sound (items.cfg 522-535), used three times inside OBJ_TRIDENT_STORM (items.cfg 537-576). Ref: data/core/macros/items.cfg.
- Recruit fade-in: Skeleton recruit_anim fades alpha from 0 to 1 over 300 ms while the dying frames play in reverse (Skeleton.cfg lines 24-33). Ref: data/core/units/undead/Skeleton.cfg.
- Rest-idle uneven timing: Fire Dragon rest frames have per-frame durations (line 38). Ref: data/core/units/monsters/Fire_Dragon.cfg.
- Per-unit death sound: die_sound on the unit record (Skeleton.cfg line 18). Ref: data/core/units/undead/Skeleton.cfg.
- Team colour ramp: four values per colour range (team-colors.cfg; covered in AU057).

## 7. Inspiration for Frankendom (originals, not copies)

1. Name: Clutch Nest. Idea: a zone-data nest that holds several egg units; eggs hatch when an enemy steps next to them, and a broken egg hatches its neighbours. Keep: proximity hatch and neighbour chain. Change: a visible countdown on the tile and a fixed cap of 3 eggs. Frankendom link: zone population row 23 (cap, respawn, grace as zone data).
2. Name: Breath Wyrm. Idea: a level 5 drake with a melee pair and a ranged breath, with an idle that breathes. Keep: split melee and ranged on one unit. Change: a breath cone, not a single-target shot; a battle-cry instead of leadership.
3. Name: Swarm Horror. Idea: a sea unit whose strike count falls with HP. Keep: strike count scaled by HP fraction. Change: ink becomes a lingering zone tile, not a status.
4. Name: Growing Thicket. Idea: a four-stage plant ladder that keeps one ability set and grows. Keep: one ability set across the ladder. Change: stage read by silhouette height, no new name per stage.
5. Name: Bone Mark. Idea: undead drain on one attack only. Keep: drain on one attack. Change: drain becomes a mark that wears off in a few turns.
6. Name: Lit Grove. Idea: a glowing mushroom terrain as a light source. Keep: per-tile light values. Change: light helps both sides; no alignment split.
7. Name: Storm Pickup. Idea: a race-locked pickup that adds a ranged attack. Keep: race lock and an attack added on pickup. Change: the attack chains to a second target.
8. Name: Ambush Leap. Idea: a hidden predator that strikes from cover. Keep: hidden until adjacent. Change: a visible leap telegraph for readability at 375 px.

Licence note: code GPL v2 or later; the ideas above are clean-room shapes, written from the data, not copied text. Do not reuse names, art or sound from this donor.

Brief rule served: recreate as a clearly distinct original, never a copy. Each item names the trait kept and the trait changed.

## 8. Not read

Engine half (src/): all of it in this pass, including attack resolution and the server half (src/server). Campaign and scenario files (data/campaigns) and maps. Full text of the 27 undead and 17 drake files beyond the fields listed. Sprite and sound files. Locale strings: po/wesnoth-units/wesnoth-units.pot has 895 msgid lines (including the header entry); po/ holds 38 entries (language files and build scripts). Grammar of the strings: English source text with _ "..." macros, one message per attribute. No quotes taken.
