# ryzom-ryzomcore (design catalogue, DC048)

Donor: /mnt/frankendom-donors/ryzom-ryzomcore (read on the VPS, read-only).
Licence (as the files say): source code GNU AGPL v3 (README.md line 5). Art: CC-BY-SA 3.0 and FAL 1.3 per the same README line, but no art packs are in the box. Config files: "public domain samples" (README line 55), which files that covers is not stated. Treat code as AGPL: shape only, clean-room. I am not making a legal claim.

Halves read: DATA half (ryzom/client/data/gamedev tables, ryzom/common/data_common, ryzom/common/data_leveldesign) and CODE half in part (ryzom/common/src/game_share enums; ryzom/server/src/ai_service/family_behavior.cpp; entities_game_service weapon_damage_table.cpp, death_penalties.cpp, egs_variables.cpp, creature.cpp in parts). The matching server data half (ryzom/server/data_shard) is in the box as scripts and 3 mirror dataset files; read only as a listing.
Important: creature, item and zone SHEETS are not in the box. All 28 .zone files (fauna and npc property sets), all 64 families files and all 6 continent files are 0 bytes. Stats, creature abilities and dungeon data cannot be read here.

Checked: 60 Ryzom receipts in receipts.tsv, all pass verify_receipts.py (quote present on the cited line). Confidence high for the enums and the energy and damage code. Medium for the creature behaviour read from code (only parts of creature.cpp were read).

Rule for every idea below: recreate as a clearly distinct original, never a copy. Each entry names the trait KEPT and the trait CHANGED.

## 1. Creatures and beasts

Families (game_share/people_pd.h, enum TPeople):
- 32 fauna families in ids 7 to 48. Kitin is one family with 8 subtypes (ids 28-35). Mektoub is one family with 2 forms (packer and mount, ids 38-39). Kami is listed as fauna (id 25).
- 6 flora families in ids 68 to 73.
- Goo twins: a corrupted variant slot for every fauna family (ids 74-115, 42 slots) and every flora family (ids 135-140). The offset is fixed at +67 (fauna id 7 maps to 74, flora 68 maps to 135). The naming table in people_pd.cpp (line 129 for GooHachtaha) lists the goo variants by name.
- Classification types (TClassificationType in people_pd.h, from line 263): 19 classes including degenerated, dog, runner, horse, bird, land and flying kitin, fish, ryzomian, great ryzomian, pachyderm, shellfish, kami, karavan.
- Size classes: 3 (small, homin, big), creature_size.cpp line 48 area.

Escalation:
- Family energy has 4 level bands: 0-25, 25-50, 50-75, 75-100 (family_behavior.cpp lines 98-118). A family's spawn target is energy-based, not a fixed table (see section 7).
- Season gating: a family that is not valid for the current season despawns (family_behavior.cpp around lines 509-520; season enum season.h 55-58: Spring, Summer, Autumn, Winter).

Idle and combat vocabulary (game_share/mode_and_behaviour.h lines 36-59): NORMAL, COMBAT, COMBAT_FLOAT, ALERT, EAT, REST, HUNGRY, SIT, SWIM, MOUNT_NORMAL, DEATH. Two creature attack slots (CREATURE_ATTACK_0 and _1, lines 284-287). 150 emote slots (lines 289-290).

Boss pattern: designed, not built. The outpost state machine (family_profile_tribe.cpp lines 143-170) switches a boss flag on for the two war states. COutpostInfo::spawnBoss (line 139) has an empty body, and bossGroups (line 241) only sets a flag and is marked "not implemented yet".

### Top 8 striking creature ideas

1. Insect swarm family with walkers and flyers.
   - Why: one family, 8 subtypes, and a land and flying split (people_pd.h 88, 97, 275). Readable at 375 wide if the flyers have a clear silhouette.
   - Keep: one family with sub-forms; walker versus flyer as a class.
   - Change: our silhouettes and wing shapes; our swarm count.
   - Ref: /mnt/frankendom-donors/ryzom-ryzomcore/ryzom/common/src/game_share/people_pd.h (lines 88-97, 275). Invasion variant as zone data: fauna_zone_properties/activity_food_kitin_invasion.zone (0 bytes, not read).
2. Corrupted twin of every species.
   - Why: a goo variant exists for each fauna and flora family, so the roster doubles with one rule (+67 offset).
   - Keep: one corrupted twin per species, driven by data.
   - Change: our own twin rule (per zone, as data, not a fixed id offset); our own colour and silhouette.
   - Ref: people_pd.h lines 142 (GooArma = 74), 135-140; people_pd.cpp line 129.
3. Pack beast with separate mount and packer forms.
   - Why: one species with two role forms (a load carrier and a rideable form) gives two readable uses from one model.
   - Keep: role-based variants of one species.
   - Change: our forms, saddle and load; our names.
   - Ref: people_pd.h lines 100-102 (Mektoub, MektoubPacker, MektoubMount). Forms are ids only; their look is not in the box.
4. Plant predator set (six flora families).
   - Why: six stationary flora families that the names suggest are attackers (behaviour not read). Stationary threats read well at a fixed camera.
   - Keep: a plant family as a stationary threat with its own silhouette.
   - Change: our behaviour (we do not copy any plant attack); our art.
   - Ref: people_pd.h lines 133-138. Behaviour: not read.
5. Herd tied to zone food and rest.
   - Why: a herd exists only while its eat and rest zone activities exist. If the food activity leaves the zone, the herd despawns. The zone is the ecosystem.
   - Keep: herd presence depends on zone resources; the zone decides.
   - Change: our zone data fields and our herd rules.
   - Ref: /mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/ai_service/family_behavior.cpp lines 455-476 (haveActivity food and rest, despawnBots).
6. Timed invasion waves by family.
   - Why: each main family has an invasion activity variant (frahar, gibbai, goo, kitin, cute). A wave is a zone activity swap, not a script.
   - Keep: a wave is a zone data swap with a start and end.
   - Change: our wave timing, our roster and our messages.
   - Ref: fauna_zone_properties/activity_food_gibbai_invasion.zone and siblings (all 0 bytes; the file names are the only evidence).
7. Outpost boss that appears in war states (designed, not built).
   - Why: four outpost states (tribe, tribe in war, guild in war, guild in peace) decide whether fight groups and a boss are present. The state table is good; the boss spawn is empty.
   - Keep: state-driven boss presence in a contested outpost.
   - Change: we build the boss spawn that this donor left empty. Fix: implement spawnBoss and bossGroups (see the defect list).
   - Ref: /mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/ai_service/family_profile_tribe.cpp lines 139-141, 159-162, 241-243.
8. Spire guard wanderer (low confidence).
   - Why: a kami-tied wander activity sits next to a kami spire animation. Only the name is known; the zone file is 0 bytes.
   - Keep: a faction-tinted wanderer near a faction landmark.
   - Change: everything beyond the name. Unverified.
   - Ref: npc_zone_properties/activity_kami_wander.zone (0 bytes, not read); client/data/gamedev/auto_animations_list.txt line 99.

## 2. Classes, races and factions

| Entry | Role | Signature mechanic | Progression shape | Ref |
|---|---|---|---|---|
| Fyros, Matis, Tryker, Zorai (playable peoples) | race and home land | not in box (stats in sheets) | skill tree, see below | people_pd.h 56-59; pvp_clan.h (BeginCivs block, from line 42) |
| Kami and Karavan (cults) | PvP faction | faction relation in PvP zones | faction points (pvp_zone.cpp, not read in full) | pvp_clan.h 38-39 |
| Skill tree (225 skills, roots SC, SF, SH, SM) | build | letter-coded branches with E and M suffixes (for example SCAHB, SCAHBE, SCAHBEM) | XP per skill; quality gates weapons | skills.h line 27; skills.cpp table; skills.cpp 272-274 (names are a stub returning Unknown) |
| Death penalty | risk | XP debt after death, repaid over time | debt grows per death, resorbs by wall-clock time | death_penalties.cpp 44-112 |
| Spell bricks (AU) | caster build | one root verb plus modifier bricks | per brick family | client/data/gamedev/bricks_client.txt |

Skill names are not in the box: getSkillCategoryName (skills.cpp line 272) returns "Unknown". The four root codes are read from the code only; their names are not confirmed.

## 3. Weapons

Weapon classes (game_share/weapon_types.h lines 27-39): HANDS (unarmed), HEAVY, MEDIUM, LIGHT (melee), LIGHT_GUN, MEDIUM_GUN, HEAVY_GUN (ranged). Seven classes in total.

Item types (game_share/item_type.h lines 36-58): 10 melee (dagger, sword, mace, axe, spear, staff, two-hand sword, two-hand axe, pike, two-hand mace), 6 ranged, 6 ammunition, plus shield and buckler.

Tiers and damage:
- Each weapon carries a quality value (its recommended skill). Damage comes from a table indexed by weapon quality and by the attacker's skill (server weapon_damage_table.cpp). Below quality: a blend of a linear ramp and an exponential curve (line 69). At or above quality: an extension whose slope decays by SmoothingFactor 0.8 each step (line 79; egs_variables.cpp lines 87 and 90 set MinDamage 25, step 1, exponent 2, smoothing 0.8). Skill range 0 to 250.
- No-weapon fighting: a damage factor 0.35 and a latency of 30 ticks (egs_variables.cpp lines 92-93).

Special properties: enchanting with spell crystal items. Each weapon shows a Sap Load (charge capacity). Applying a crystal wipes the previous enchantment and sets the charge to 0 (interf_info_item_misc_en.html line 18-21; interf_info_item_m_weapon_en.html line 30).

Visual distinctness of tiers: not in the box (weapon models and textures are not present). The tiers are readable only through the quality number and the item type.

### Top 5 striking weapons (criteria: readable at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance)

1. Pike: a long melee item (item_type.h line 44). Keep the long reach silhouette; change the length and the attack arc.
2. Two-hand blades, axes and maces (item_type.h lines 42-45): three heavy silhouettes. Keep the two-hand rule; change the head shape.
3. Gun ladder LIGHT_GUN to HEAVY_GUN (weapon_types.h lines 37-39): one progression read as three sizes. Keep the three-step ladder; change the mechanic (ours is ranged-first).
4. Crystal enchant with a sap charge readout: a consumable that writes a glow onto the weapon and shows a charge pair. Keep the charge readout; change the glow colour and the consumable name.
5. Quality number as the tier readout: the weapon's recommended skill is the tier. Keep the quality-as-tier rule; change the curve (ours can be simpler).

## 4. Armour and gear

Armour sets (item_type.h lines 60-75): three weight sets (LIGHT, MEDIUM, HEAVY), each with five slots (boots, gloves, pants, sleeves, vest) = 15 items, plus HEAVY_HELMET (line 75). Shields and bucklers are off-hand (lines 58-59).
Clothes: the help page names four armour categories: Clothes, Light, Medium, Heavy (interf_info_item_armor_en.html line 32).
Jewellery: six slots (ANKLET, BRACELET, DIADEM, EARING, PENDANT, RING; item_type.h lines 76-81).

How tiers are shown: the quality value (the help page says a higher quality gives more protection), weight, bulk, hit points (items degrade with use and are destroyed at 0), and per-type dodge and parry penalties. Protection is split by damage type: slashing, piercing, blunt (damage_types.h lines 30-32). Ten damage types in total (the seven elemental types follow at lines 33-40).
Material tiers and colour tiers: not in the box.

### Top 5 striking gear ideas

1. Heavy helmet as the single helmet slot (item_type.h line 75): one readable head silhouette per tier.
2. The three armour weight sets as a silhouette ladder: light, medium, heavy (item_type.h lines 60-74). Keep the ladder; change the proportions.
3. Spell crystal consumable (interf_info_item_misc_en.html line 18): a glowing item that changes a weapon.
4. Off-hand shield and buckler pair (item_type.h lines 58-59): two readable off-hand sizes.
5. Diadem and pendant accessories (item_type.h lines 78, 80): small glow slots for rings and necklaces. Their look is not in the box.

## 5. Zones and dungeons

Named continent and area entries (game_share/continent.h lines 28-54): 22 before UNKNOWN.
- 4 home lands: FYROS, ZORAI, TRYKER, MATIS.
- 5 other regions: BAGNE, NEXUS, ROUTE_GOUFFRE, SOURCES, TERRE.
- 4 islands (one per home land).
- 5 newbie areas (one per home land, plus NEWBIELAND).
- 4 other: CORRUPTED_MOOR, KITINIERE (an insect-named region), INDOORS, TESTROOM.
Biome descriptions are not in the box (the continent HTML files are 0 bytes).

Seasons: Spring, Summer, Autumn, Winter (season.h lines 55-58), which gate families.

Zone kinds in the server: PvP versus zones between two clans with faction points (pvp_zone.cpp, outline only); PvP safe zones (pvp_safe_zone.cpp); outposts with four states (section 1); ambush zones (activity_ambush.zone, 0 bytes).

Dungeon archetypes: none in the box. There is no dungeon data.

Hazards (server variables):
- Goo path: a distance setting (default 1.0) at which the character takes 100 percent damage from the goo path (egs_variables.cpp line 499).
- Angry invisible kami punishment while foraging (egs_variables.cpp line 139).
- Ecosystem resistance penalty per ecosystem (egs_variables.cpp line 275).

### Top 5 striking zone ideas
1. Kitin-named region as an insect nest zone (continent.h line 54).
2. Corrupted moor as a goo-spread zone (continent.h, name only; the goo path damage in egs_variables.cpp line 499 is the mechanic).
3. Outpost as a state-driven contest zone (section 1 item 7).
4. Seasonal zone where families change with the season (season.h 55-58).
5. Goo path: distance-based hazard band (egs_variables.cpp line 499).

## 6. Item and effect looks worth recreating

| Label | Technique | Ref |
|---|---|---|
| Ambient waterfalls (ten pairs of A and B cycles) | looping animation per waterfall | client/data/gamedev/auto_animations_list.txt line 75 (TR_waterfall_01_A) and siblings |
| Brazier and lantern loops (interior and exterior) | looping flame animation | auto_animations_list.txt line 4 (brazero-ext1) and lanterne entries |
| Faction spires (kami and karavan) | faction-tinted landmark animation | auto_animations_list.txt lines 99 (GE_PVP_spire_kami) and 100 (GE_PVP_spire_karavan) |
| Raw source glow: green phosphorescent glow and a green name over it | glow as a read-out of a resource node | client/data/gamedev/html/help/how_to_findrawmaterialsources_en.html line 19 |
| Extraction danger shown by glow colour and a risk bar | glow colour shift as a risk read | how_to_extractrawmaterialsfromasource_en.html line 32 |
| Sap charge on an enchanted weapon | charge pair readout | interf_info_item_m_weapon_en.html line 30 |
| Spell brick effects by texture id (9000-10003) | one texture id per brick family | client/data/gamedev/families.txt lines 2-15; bricks_client.txt line 5 |
| Creature idle states: eat, rest, hungry, alert, sit | idle animation vocabulary | common/src/game_share/mode_and_behaviour.h lines 36-59 |

Textures and model files are not in the box. The look entries describe technique only.

## 7. Inspiration for Frankendom

Each original is a clearly distinct design, not a copy. Keep and change are stated per item.

1. Tainted Twin: every species in one zone can spawn as a corrupted twin with its own silhouette.
   - Keep: a twin per species, set as data.
   - Change: a per-zone rule, our own colour and shape, no fixed id offset.
2. Swarm Flyers: one insect family with walkers and flyers, and an invasion wave swap.
   - Keep: sub-forms in one family; walker versus flyer; a zone-level wave swap.
   - Change: our silhouettes and counts; our wave timing.
3. Hardening Brute: a brute that gains resistance to each crowd-control effect it takes while it is in a fight, reset when the last attacker leaves.
   - Keep: resist builds per hit; reset on disengage (creature.cpp lines 1926 and 2036).
   - Change: add a cap (the donor's add has none in that function); our numbers and effect names.
4. Herd Budget: grazers spawn to an energy target per zone with a 1 percent hysteresis band, and a herd leaves when its food or rest activity leaves the zone.
   - Keep: energy target, hysteresis, zone activity check (family_behavior.cpp lines 521-532, 455-476).
   - Change: fix the reversed check at line 413 (see defects); our data fields; our rates.
5. Pack-or-Mount Beast: one species, two role forms (carrier and ride).
   - Keep: role variants of one model.
   - Change: our forms, our saddle and load art.
6. Outpost Warband: contested outposts gain a boss in war states and lose it at peace.
   - Keep: state table with boss presence (family_profile_tribe.cpp 159-170).
   - Change: build the boss spawn (empty in the donor, see defects).
7. Crystal Charge: a consumable enchant that writes a glow and a charge readout onto a weapon, wiping the previous one.
   - Keep: consumable, charge readout, wipe rule (interf_info_item_misc_en.html lines 18-21).
   - Change: our glow colour, our consumable name.
8. Glow-Read Node: a resource node whose glow colour gives the danger read before the player touches it.
   - Keep: glow colour as the risk read (how_to_extractrawmaterialsfromasource_en.html line 32).
   - Change: our palette and our risk rule.

## Defects found (keep the idea, fix the defect)

- family_behavior.cpp line 413: `if (grpDynBase || grpDynBase->getDiscardable())` uses || where the sibling check at line 554 uses &&. With a null grpDynBase this dereferences null (the code has an nlassert only in non-final builds). fix: use && as line 554 does.
- family_behavior.cpp line 362: the comment says cubic (^3), but three squarings at lines 362-364 give ^8. fix: write the intended exponent in the comment or code.
- creature.cpp lines 1926 and onward: resist modifiers grow with no cap in the add. fix: clamp to a per-family maximum.
- death_penalties.cpp line 58 and egs_variables.cpp line 53: the variable text says the gain divides by (1 + death index), but the code does not divide. fix: decide, then make code and text agree.
- family_profile_tribe.cpp lines 139-141 and 241-243: outpost boss spawn is empty and marked not implemented. fix: implement spawnBoss and bossGroups (idea kept).

## Not read

- ryzom/server/src/ai_service: family_profile.cpp, family_profile_tribe.cpp lines 175-245 and 300-700 (outline only), the rest of family_behavior.cpp beyond lines 336-592.
- ryzom/server/src/entities_game_service/creature_manager: creature_manager.cpp (666 lines), sabrina_actor_creature.cpp (352), harvestable.cpp, creature.cpp except the parts cited above.
- weapon_craft_parameters.cpp (978 lines), zone_manager.cpp, pvp_zone.cpp beyond its outline, pvp_safe_zone.cpp.
- ryzom/server/data_shard scripts (ags_*.script) and mirror_sheets (3 dataset files).
- ryzom/common/data_common chat and r2 lua (109 files), database.xml content.
- ryzom/common/data_leveldesign class_doc (73 non-empty html files, only var_creature.html read) and npc event_type and action_type docs (113 non-empty files, not read).
- Client interfaces_v3 xml and lua, html help beyond the lines cited.
- Creature, item, zone and texture SHEETS: not in the box. Art packs: not in the box.
- snowballs2 sample game.
- Half pairing: the server half is partly read; the client half is read; the data_shard listing is the only server data read.
