# cuteshaun-lineage2-api: design catalogue (DC015)

Donor: /mnt/frankendom-donors/cuteshaun-lineage2-api (read-only, VPS)
Half read: data-pack half (generated JSON under data/generated/interlude, parser scripts, public API code, docs). The game-server half is not in this donor. Its matching halves in the box (named in the asset audit only, not read by me): elberacasa-Lineage2Elbera, ax-grymyr-l2dn-server, pmbstyle-L2Solo, NodeL2-NodeL2, realratchet-Lineage2JS, pier-oliviert-lineage; client halves shnok-l2-unity and gawric-Unity-Client-for-L2J.
Licence (as the files say): code MIT (LICENSE line 3). No asset or data licence in the tree. Community project, "Not affiliated with NCSoft" (README line 54). Audit class C: inspiration stays category-level.

Rule for every idea below: recreate as a clearly distinct original, never a copy. Each item names the trait KEPT and the trait CHANGED.

Counts (my own counts from the files): creatures 2541 Monster rows; classes 89; weapon rows 1217; armour sets 51; hunting-zone rows 209 (plus 19 regions). Receipts: receipts.tsv in this folder (verified).

## 1. Creatures and beasts

Data source: data/generated/interlude/npcs.json (monster rows carry npcType Monster). Names and stats are data, not art.

Families (keyword heuristic written by me, not a game field; 1407 rows did not match my keywords):
- orc, tribal and humanoid warrior/shaman/archer names: 212
- undead: 201
- insect and arachnid: 149
- beast: 131
- demon and dark: 111
- golem and construct: 110
- reptile and lizardfolk: 101
- angel and holy: 86
- eye and aberration: 27
- giant: 6

Tiers and escalation:
- Monster levels run 0 to 99; 414 rows in the 80s.
- aiAggro is true on 986 of 2541 monster rows (unit not read).
- Raid bosses: 208 rows, levels 20 to 80. A Raid Boss skill tag sits on 214 monster, raid or grand rows.
- Grand bosses: 15 rows, levels 50 to 87, HP up to 7.5M. One name repeats at several HP values (Antharas: 6.1M, 6.8M, 7.5M).
- Eight monster rows have HP at or above 300k (levels 55 to 87).
- Signature abilities are skill tags on each creature (weak-point, stat-stack and resist skills, see the top 8 list below), not scripts. Per-NPC skill lists run to 1 to 8 entries.

Top 8 most striking (reads at 375 wide: size, weakness glyph, one tag behaviour):
1. Colossal hunter beast. Why: radius and height fields are very large, so size reads. Keep: size as threat, high HP on a roaming monster. Change: a crystal or bone colossus with its own silhouette. Ref: npcs.json:263657 (id 22215).
2. Phased grand boss. Why: one name, several HP rows. Keep: HP tiers as difficulty. Change: one entity with phases and a phase cue. Ref: npcs.json:324155 (Antharas, id 29019).
3. Raid gate elite. Why: the tier is a skill tag on the creature. Keep: tier as a shared tag. Change: our own gate rule and reward. Ref: npcs.json:264579.
4. Huge aggro dragon. Why: a dragon-class monster with a large radius, run speed 180 and aiAggro 1000 (unit not read). Keep: a large pull range on a boss. Change: threat table with decay, not one number. Ref: npcs.json:327646 (id 29069).
5. Weak-point caster. Why: per-creature weakness skills for Sacred, Blunt, Fire, Wind and Archery. Keep: one weakness per creature, read by the damage formula. Change: a readable glyph at 375 wide. Ref: skills.json:204473.
6. Stat-stack elite. Why: HP and attack/defence modifier skills scale base stats on about 900 to 1100 rows each. Keep: base stats scaled by a named stack. Change: our own stack, short enough to inspect in the fight HUD. Ref: skills.json:211072.
7. Mage-proof elite. Why: full magic resist on 667 rows. Keep: a counter-class elite. Change: a visible tell before it resists. Ref: skills.json:175019.
8. Caster and archer pack. Why: AI type is a per-NPC field (DEFAULT 6071, MAGE 260, ARCHER 129, CORPSE 12 NPC rows). Keep: one field with a few presets. Change: our own presets. Ref: npcs.json:98215.

## 2. Classes, races and factions

- 89 class rows: 52 Fighter, 26 Mystic, 11 Priest.
- Races: Human 29, Elf 20, Dark Elf 20, Orc 13, Dwarf 7 rows.
- Promotion steps (professionLevel 0 to 3): 9, 18, 31, 31 rows. Nine rows have no parent id (read as base classes; not cross-checked).
- Progression shape: base class, then up to three promotions; a skill list per class (not counted further).
- Factions: not in this donor beyond NPC types (guards, siege sides, clan hall staff).

## 3. Weapons

Families (weaponType, row counts): SWORD 196, BLUNT 171, BIGBLUNT 157, DUAL 134, DAGGER 125, POLE 103, BOW 94, DUALFIST 75, BIGSWORD 64, ETC 46, PET 33, FIST 11, FISHINGROD 7, NONE 1.

Special properties: 408 weapon rows carry an item skill; 65 carry a crit proc (oncrit_skill with oncrit_chance); 72 carry an on-cast skill; 79 items carry enchant4_skill.

Tiers: grade none, d, c, b, a, s. Visual distinction: none in this donor. The API types grade as a string (src/lib/types.ts:14) and attaches no colour.

Top 5 striking:
1. Critical-anger sword (grade c, proc 10). Keep: crit proc as item data with a chance and a skill. Change: our own proc name and effect. Ref: items.json:209561.
2. Poison-crit sword (grade c, proc 15). Keep: an element on the proc. Change: element palette and effect. Ref: items.json:210043.
3. Cursed short blade (grade d, DAGGER, proc 50). Keep: a high-risk proc on a cheap item. Change: a lower chance with a clear tell. Ref: items.json:74988.
4. Drain-crit blade (grade c, proc 35). Keep: heal on crit as a readable proc. Change: heal size and VFX. Ref: items.json:210189.
5. Twin blades (DUAL, 134 rows, 54 at grade b). Keep: a pair as its own family. Change: pair silhouette and handle. Ref: items.json:58741.

## 4. Armour and gear

Weight classes (armorType): HEAVY 88, LIGHT 83, MAGIC 104 (robe). Blank on 802 of 1125 armour rows (not checked further). PET 34, NONE 14.

Material tiers (counts over all item rows; the order is my reading of the names): PAPER 2776, STEEL 2097, LIQUID 1998, FINE_STEEL 491, LEATHER 406, WOOD 236, CRYSTAL 171, CLOTH 166, BLOOD_STEEL 130, ORIHARUKON 119, MITHRIL 118, ADAMANTAITE 109, BONE 91, SILVER 76, GOLD 59, BRONZE 49, DAMASCUS 44, CHRYSOLITE 42, SCALE_OF_DRAGON 6.

Sets: 51. Pieces per set: 4 (22 sets), 3 (15), 5 (11), 2 (3). Ten families come as heavy, light and robe triplets (30 sets). Bonus is a skill id and level (e.g. 3500-1). The name Mithril Robe Set appears on two rows.

Top 5 striking:
1. Crystal triplet (Dark Crystal Heavy, Light and Robe). Keep: one set name, three weight variants. Change: our own palette and silhouette per variant. Ref: armor-sets.json:376.
2. Dragon-hide set (Draconic Leather). Keep: a dragon material as the top of a leather line. Change: our own hide texture and tier name. Ref: armor-sets.json:548.
3. Majestic triplet (heavy, leather, robe). Keep: material changes between variants. Change: our own material ladder. Ref: armor-sets.json:495.
4. Mithril Robe Set (name on two rows). Keep: nothing to copy; a data-key note. Change: use ids, not names, as keys. Ref: armor-sets.json:24.
5. Wooden starter set (three pieces: chest, legs, head). Keep: a few-piece starter so tier one reads. Change: our own look. Ref: armor-sets.json:4.

## 5. Zones and dungeons

- Hunting zones: 209 rows, types 1 (87), 2 (42), 3 (35), 7 (28), 5 (6), 4 (6), 6 (5); type 0 absent. Type meaning not decoded (parser header, scripts/parse-huntingzones.ts:14).
- Min level: 93 rows at 0 to 9 (unspecified), then a rising count per 10-level band up to 80.
- Regions: 19 named regions on an 11 by 16 cell grid (regions.json).
- Mode archetypes, by NPC type name only: DungeonGatekeeper 30, RiftInvader 132, SepulcherNpc 62, SiegeGuard 302 with CastleDoorman 69, ClanHallDoorman 40, FestivalMonster 110, FeedableBeast 63. The donor does not say which zone each belongs to.
- Hazards: none listed as data in this donor.

Spawn and respawn (zone data; relevant to parity row 23):
- spawns.json: 40878 rows, of which 37585 are monster rows. Respawn delays most often 15, 20, 25, 30, 40 and 60 s.
- Boss rows (206) carry 0, 129600 s (36 h) and 403200 s (112 h).
- 59 percent of all spawn rows have 0. The parser says some respawn timing lives in server code (scripts/parse-spawns.ts:22), so 0 is not proof of an instant respawn.
- periodOfDay is 0 (any) because the source has none.

Top 5 striking:
1. Rift invader district (npcs.json:233096). By name: a mode of NPC waves. Keep: mode from an NPC type and a spawn list. Change: our own waves and timer.
2. Sepulcher chamber (npcs.json:401425). Keep: gated rooms as data. Change: our own room shapes and gate rule.
3. Dungeon gatekeeper (npcs.json:381516). Keep: entry as an NPC with destinations. Change: our own cost and cue.
4. Feedable beast pen (npcs.json:214608). By name: a creature that changes state when fed. Keep: state change on a player action. Change: our own feed item and reward.
5. Grid region map (regions.json:5). Keep: coarse region grid as zone data. Change: our own cell size and names.

## 6. Item and effect looks worth recreating

- Two-density icons, pixelated: icons at 1x plus a 2x nearest-neighbour copy, shown with image-rendering pixelated (src/app/page.tsx:6; public/landing-icons/README.md:1). Use for crisp phone UI.
- Category-named icon grid: about 4002 icons named by category and index (public/icons/, for example accessary_angel_circlet_i00.png). Addressable by code.
- Motif emblems: one focal element each (public/landing-icons/eye-monster.png, forgotten-blade.png, blood-orchid.png, compass-pixel.png, gatekeeper.png). Names read; images not opened.
- No glow, aura or shader code in this donor (the web UI is static pages). The game client is not here.

## 7. Inspiration for Frankendom

1. Tiered warden set. Idea: one gear tier with heavy, light and robe variants under one set name. Keep: one name, three weights, each with its own piece list. Change: our own material, palette and silhouette.
2. Weak-point glyph. Idea: each creature shows one damage type it is weak to, as a glyph readable at 375 wide. Keep: one weakness read by the damage formula. Change: our own glyph and no copy of the attack-name table.
3. Phase guardian. Idea: one grand boss with HP phases and a visible phase cue, not several rows. Keep: HP tiers as escalation. Change: phases inside one entity.
4. Breach gatekeeper. Idea: an NPC gate that opens a timed rift district with invader waves. Keep: entry as an NPC, mode from spawn data. Change: our own waves and reward, kept in zone data (row 23 fields).
5. Proc blade ladder. Idea: crit-proc weapons across grades, chance and skill as item data. Keep: a proc is an item field. Change: fewer procs, each with a tell and one sound.
6. Colossus hunter. Idea: a roaming very large monster whose size and HP are its threat. Keep: size and HP as the readable threat. Change: our own silhouette and one signature attack.
7. Region grid zones. Idea: a coarse grid of region ids as the zone map. Keep: zone shape as ids. Change: our own cell size; zones as data on one runtime.
8. Two-speed respawn. Idea: fast respawn for common monsters (15 to 60 s) and slow for bosses, both as zone data. Keep: two tiers in one table. Change: our own numbers.

## Not read (summary; full list in the JSON)
- Server half (aCis) is not in this donor.
- The 16 datapack .dat name and group tables are binary and not decoded by me. The decoder under scripts/audit describes an encrypted format; I did not attempt decoding.
- Icon images (about 4002 PNG) and font licences: names only.
- Drop chance units, aiAggro units, spawn density by walk distance: not established.
- Quests, recipes, buylists, multisells, hennas: names only.
