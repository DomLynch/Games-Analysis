# gtker-wow_messages (design catalogue, DC028)

Donor tree: /mnt/frankendom-donors/gtker-wow_messages/ (read over ssh only, nothing copied or run).
Asset audit used first: AU024 (`/private/tmp/p2/wave2-haiku/batch3/AU024/gtker-wow_messages.assets.md`). Not repeated here.
Receipts: `receipts.tsv` in this folder (rows for this donor are verified with verify_receipts.py).

**Half read:** data pack only. I read the wowm definitions under `wow_message_parser/wowm/world/` (enum blocks by line, plus item_sets, pet_common, social, spell and enums folders). The box has no DBC, CSV or SQL game tables, so names, stats and looks for real content are absent from it. Present but not read: `examples/vanilla_client`, `examples/vanilla_server`, `examples/tbc_server`, `examples/wrath_server` (names only), the generated `wow_world_messages` and `wow_login_messages` crates, `ember_output/*.json`, `intermediate_representation.json` (AU024 says head only).

**Important limit:** this donor has no visual data (no models, textures, sounds, maps). Anything about looks here is enum or name level. "Striking" picks below are ranked by name and design-transfer value only. Silhouette at 375 px, sound and behaviour were not checked, because nothing in the box shows them.

**Licence (as the files say):** code is "MIT OR Apache-2.0" (Cargo.toml line 14; README contribution section). The protocol definitions describe a commercial game, and the repo does not say who holds those rights. Use shape and naming only. Dom's rule: recreate as a clearly distinct original, never a copy.

## Counts (from enum blocks; the file has one block per client version)
- creatures: 40 (CreatureFamily, latest 3.3.5 block, NONE excluded).
- classes: 10 (latest Class block). Races: 21 (latest Race block), listed in section 2.
- weapons: 21 weapon subclass values (latest ItemClassAndSubClass block).
- gear_sets: 509 named item sets (latest ItemSet block, 510 entries incl. NONE). Plus 8 quality tiers, 11 armour subclasses, 29 inventory slots.
- zones: 135 maps (latest Map block). Plus about 2307 sub-zone "Area" entries (latest block, NONE excluded).

## 1. Creatures and beasts
- Families: 40 values in the CreatureFamily enum. These are pet and beast families (the enum is used for pet and creature-query data), not a bestiary. Grouping below is mine, from the names:
  - Four-legged runners and brutes: wolf, cat, bear, boar, gorilla, rhino, hyena, raptor, tallstrider, devilsaur, ravager, core hound, spirit beast.
  - Arthropods, crawlers and serpents: crab, crocolisk, scorpid, spider, silithid, wasp, worm, turtle, serpent.
  - Fliers and gliders: carrion bird, bat, bird of prey, dragonhawk, sporebat, nether ray, moth, chimaera, wind serpent.
  - Demon and void summons: felhunter, voidwalker, succubus, doomguard, felguard, imp, warp stalker.
  - Undead and constructs: ghoul, remote control (mechanical).
- Escalation with level: not in this box (level scaling lives in server data that is not here).
- Creature rank (elite, boss and so on) is a numeric field in the creature query response. The enum of values is not in the box (smsg_creature_query_response.wowm:14).
- creature_type is a numeric id that points to a DBC table not in the box (smsg_creature_query_response.wowm:11).
- Pet behaviour (this is the only creature behaviour data in the box):
  - Stance: passive, defensive, aggressive (pet_common.wowm:1-5).
  - Command: stay, follow, attack, dismiss (pet_common.wowm:9-14).
- Boss pattern: none in the box.

Top 8 (picked by name and transfer value only; labels are my own):
1. **Hive crawler** (SILITHID, pet_common.wowm:122). Why: a swarm insect that suits many small units. Keep: ground-hugging crawl and swarm count. Change: our own shell, legs and no hive lore.
2. **Ray glider** (NETHER_RAY, pet_common.wowm:116). Why: a flat, low glider that should read well at 375 px. Keep: low gliding pass over ground. Change: our fins, colours and path.
3. **Spore drifter** (SPOREBAT, pet_common.wowm:115). Why: a floating support creature. Keep: slow drift and puff effects. Change: our own spore look.
4. **Multi-head beast** (CHIMAERA, pet_common.wowm:119). Why: a multi-part silhouette. Keep: several heads on a wide body. Change: our head count and shapes.
5. **Burrowing worm** (WORM, pet_common.wowm:123). Why: an ambush from the ground. Keep: emerge-from-ground ambush. Change: our emerge animation and sound.
6. **Tethered construct** (REMOTE_CONTROL, pet_common.wowm:110). Why: a construct that a player controls, so stance rules apply. Keep: controllable construct with stance. Change: our look and controls.
7. **Corpse shambler** (GHOUL, pet_common.wowm:121). Why: slow undead family for a grind feel. Keep: slow shamble. Change: no shared look.
8. **Winged drake-hawk** (DRAGONHAWK, pet_common.wowm:112). Why: a flyer with a mount-like silhouette. Keep: fast aerial pass. Change: our design entirely.

## 2. Classes, races and factions
- Classes (latest block): warrior, paladin, hunter, rogue, priest, death knight, shaman, mage, warlock, druid. Source: enums/class.wowm (block at line 16, death knight at line 22).
  - Role and signature mechanic: not in these files. Only the resource type is here.
  - Resource types (Power enum, latest block): mana, rage, focus, energy, happiness (pet), health, rune, runic power. Which class uses which resource is server data, not read.
  - Progression: the Talent enum has 432, 579 and 892 entries across the three version blocks (talent ids; no tree grouping visible in these lines). Level cap: not here.
  - Expansion steps: vanilla, the Burning Crusade, Wrath of the Lich King (character_screen/smsg_auth_response.wowm:101-102).
- Races: 21 in the latest block (enums/race.wowm:54-75). Mix of playable factions and non-playable types (skeletal, broken, vrykul, tuskarr, taunka and others). No role or stat data attached.
- Factions: a Faction enum with 191 / 323 / 402 entries per version block (world/faction/faction.wowm). Names only, not read.

## 3. Weapons
- Families (21 weapon subclass values, latest block; enums/item_class_and_sub_class.wowm:197-320):
  - One-handed: axe, mace, sword, dagger, fist, exotic, miscellaneous.
  - Two-handed: axe, mace, sword, polearm, staff, exotic.
  - Ranged and throwing: bow, gun, crossbow, wand, thrown, spear.
  - Tool-weapon: fishing pole. One entry is marked obsolete.
  - The 1.12 and 2.4.3 blocks also have 21 values each.
- Special properties: no per-weapon element or proc in these enums. The separate SpellSchool enum has seven schools: normal, holy, fire, nature, frost, shadow, arcane (spell/spell_common.wowm:35). Set bonus is item-set membership (section 4), not a weapon field.
- Tiers: no weapon tier list. Quality tiers apply to all items (section 4).
- Top 5 (name-based):
  1. **Wand** (WAND, enums/item_class_and_sub_class.wowm:235). Why: a slim focus item that reads at small size. Keep: slim magic focus. Change: our glow and shape.
  2. **Polearm** (POLEARM). Why: long reach silhouette. Keep: reach. Change: our head shape.
  3. **Thrown weapon** (THROWN). Why: a throw animation with a clear arc. Keep: throw arc. Change: our animation.
  4. **Fishing pole** (FISHING_POLE). Why: an unusual tool silhouette. Keep: odd-category shape. Change: our item type.
  5. **Exotic two-hander** (TWO_HANDED_EXOTIC). Why: a category for unusual two-handed items. Keep: the category idea. Change: our forms.

## 4. Armour and gear
- Armour subclasses (11, latest block, enums/item_class_and_sub_class.wowm:246-256): misc, cloth, leather, mail, plate, buckler (obsolete), shield, libram, idol, totem, sigil. Material tiers run cloth to plate in enum order. No mythic metal tier in the enum.
- Quality tiers (ItemQuality, latest block, social/social_common_3_3_5.wowm:491): poor, normal, uncommon, rare, epic, legendary, artifact, heirloom (8 values). Colour codes are not in the box; the client draws them, and that is not read.
- Bind rules (Bonding): no bind, binds on pick up, on equip, on use, quest item (two quest values). enums/bonding.wowm:1-19.
- Inventory slots (InventoryType): 29 values, from non-equip to relic (enums/inventory_type.wowm:3).
- Item sets: 172 named sets in the 1.12 block, 373 in the 2.4.3 block, 509 in the 3.3.5 block (item/item_sets.wowm:1, 350, 1102). Sets grow by expansion block.
- How the game shows tiers: only the enum and display strings are here; the on-screen treatment is client-side and not in the box.
- Top 5 (name-based):
  1. **Heirloom tier** (HEIRLOOM, social_common_3_3_5.wowm:491 block). Why: a tier above artifact. Keep: a top tier with its own name. Change: our tier name and look.
  2. **Artifact tier** (ARTIFACT). Why: special one-off tier. Keep: special tier idea. Change: our rules.
  3. **Named set** (ItemSet, 509 entries). Why: a set of pieces that name one theme. Keep: set grouping by theme and expansion. Change: our set themes.
  4. **Relic slot** (RELIC, InventoryType). Why: a dedicated slot for a special item. Keep: slot kept apart from the rest. Change: our slot name.
  5. **Shield** (SHIELD subclass, plus its own sheath sound family in section 6). Why: a second-hand item with its own cues. Keep: separate sound family. Change: our shield look.

## 5. Zones and dungeons
- Instance types (InstanceType, external/instance_type.wowm:2-9): normal, group instance (5-player), raid instance, battleground, world zone, battleground (second value). Source: instance_type.wowm:5 and :7.
- Map list: 135 entries (latest block) covering continents, dungeons, raids, battlegrounds and test maps (enums/map.wowm:397).
- Battlegrounds and arenas: 8 battleground types, including arena types (battleground/smsg_battlefield_list.wowm:28).
- Weather: four kinds (fine, rain, snow, storm), plus a change-type enum with two values (world/smsg_weather.wowm:1).
- Sub-zones: about 2307 Area entries in the latest block (enums/area.wowm:8187). This is the granularity for ambience and music changes.
- Hazards: no hazard list in these enums. Water states exist as aura types (water breathing, water walk).
- Top 5 (name-based):
  1. **Raid instance** (RAID_INSTANCE, instance_type.wowm:5). Why: large group encounter zone with its own rules. Keep: a distinct zone type. Change: our scale and rules.
  2. **Open world zone** (WORLD_ZONE, instance_type.wowm:7). Why: the default world. Keep: zones as data. Change: our layout.
  3. **Arena** (ARENA in battlefield list, smsg_battlefield_list.wowm:28 block). Why: a small bounded zone for fast duels. Keep: small bounded arena. Change: our arena shape and rules.
  4. **Storm weather** (WeatherType, smsg_weather.wowm:1). Why: weather as a zone state. Keep: weather kinds. Change: our weather set.
  5. **Zone ambience layer** (ZONE_AMBIENCE, sound_type.wowm:28). Why: ambience as its own category per zone. Keep: separate ambience and music layers. Change: our beds and crossfades.

## 6. Item and effect looks worth recreating (technique, reference)
- **Sheath sockets:** eight sheath positions: none, main hand, off hand, large weapon left and right, hip weapon left and right, shield. Technique: named socket per slot, and the weapon moves to its socket when sheathed. Ref: queries/smsg_item_query_single_response.wowm:1-10.
- **Sheath sounds by material:** three families: shield, metal weapon, wood weapon. Technique: a material cue on sheath. Ref: external/item_env_types.wowm:2-6.
- **Aura state looks:** shapeshift (MOD_SHAPESHIFT 36), transform (56), scale (61), feign death (66). Technique: swap the model or scale the mesh while the state is active. Ref: spell/smsg_periodicauralog.wowm:70, 92, 97, 102.
- **Hit feedback:** hit-result flags (miss, absorb, resist, critical, glancing, crushing) and spell-miss results (miss, resist, dodge, parry, block, evade, immune, deflect, absorb, reflect). Technique: one popup label per result class. Ref: combat/smsg_attackerstateupdate.wowm:1-21 and spell/spell_common.wowm:11.
- **Emote and idle library:** 175 emote values in the 3.3.5 block: 101 prefixed one-shot and 73 prefixed looping states (counted by prefix). Technique: one-shot plays and returns; state loops until cancelled. Ref: social/social_common_3_3_5.wowm:3.
- **Sit and stand states:** ten values, including three chair heights (social/social_common.wowm:453-460). Technique: seat-height offsets per chair class.
- **Pet stance UI:** stance and command sets listed in section 1 (pet_common.wowm:1-14).
- **Monster facing:** normal move, stop, face spot, face target, face angle (movement/smsg/smsg_monster_move.wowm:1-9). Technique: turn-to-face states for creatures.
- **Loot distribution ceremony:** free for all, round robin, master loot, group loot, need-before-greed (social/social_common.wowm:1-7). Technique: a roll screen per mode.
- **Sound categories:** 26 values, including zone music, zone ambience, narration music, water liquid, footsteps, armour foley, and weapon impact and miss. Technique: separate buses per category, layered per zone. Ref: external/sound_type.wowm:2-28.

## 7. Inspiration for Frankendom (originals; recreate as distinct, never a copy)
1. **Sheath socket rig.** Keep: one named socket per sheath slot, with the weapon moving to it on sheathe. Change: our socket names, positions and a fight-ready swap rule.
2. **Material sheath clicks.** Keep: three material cue families (shield, metal, wood). Change: our cue sounds and count.
3. **Summon stance panel.** Keep: a small stance set (passive, defensive, aggressive) plus stay, follow, attack. Change: our names and a two-button layout that works at 375 px.
4. **Idle emote library with loop split.** Keep: one-shot versus looping state. Change: our own set of 20-30 animations.
5. **Bounded arena zone.** Keep: a small bounded zone type with its own rules, as zone data. Change: our arena shape; it suits fast duels and many-on-one.
6. **Loot mode picker.** Keep: need-before-greed, round robin and master loot as group settings. Change: our labels and roll screen.
7. **Hit result labels.** Keep: critical, glancing, crushing, absorb, resist and miss as separate labels. Change: our palette and wording.
8. **Shapeshift status.** Keep: a status that swaps the model or scales it for a time. Change: our effect and timing.

## Fold-ins by topic (Strategy)
- sound-music: section 6 sound categories (layering, zone ambience, zone music as separate categories). Border crossfades are not in the box.
- loot: distribution modes and quality tiers (section 4, section 6).
- spawns and encounters: creature rank field exists, but no walk-density or spawn data is in the box.
- idle animation vocabulary: emote one-shot versus state split (section 6).
- death and respawn presentation: a dead stand state and a ghost aura type exist (social_common.wowm:453-460, AuraType). No presentation data.
- readability at 375 wide: not checked (no art in box).

## Not read
- examples/* code halves (names only); generated crates; ember_output JSON; intermediate_representation.json (beyond AU024); wowm_language docs.
- Message bodies (only the enum blocks and a few header lines were read).
- Counts for Skill, Faction, Area and Map were taken from line-block awk counts, not individually checked.
