# OpenDiablo2-OpenDiablo2 (design catalogue, DC039)

Donor tree: /mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/ (read over ssh only, nothing copied or run). Paths below are relative to that root.
Asset audit used first: AU038 (`/private/tmp/p2/wave2-haiku/batch3/AU038/OpenDiablo2-OpenDiablo2.assets.md`). Not repeated here.
Receipts: `receipts.tsv` in this folder (rows for this donor verified with verify_receipts.py).

## Licence and class
- Code: GNU GPL v3 (LICENSE line 1; README badge). Assets: no asset licence in the box; README line 29 says the project ships no game content, and the user must own the commercial game.
- Class C. Nothing game-owned is in the box, so inspiration stays at category level. Clean-room, shape only.
- Dom's rule: recreate as a clearly distinct original, never a copy. Each brief below names what is KEPT and what is CHANGED. Resemblance target is 20-30 percent in mood only. This is inspiration, not legal advice.

## Which half was read
- Client engine (Go): read the data loaders (d2core/d2records, d2common/d2resource, d2common/d2enum), item and affix logic (d2core/d2item), map generator (d2core/d2map/d2mapgen), NPC path motion (d2core/d2map/d2mapentity), audio envelope (d2core/d2audio), asset palettes and draw effects (d2core/d2asset, d2core/d2render, d2common/d2fileformats/d2pl2). Read only in part: d2game (menus and HUD names).
- Data pack (the user's game tables such as monstats.txt, Levels.txt, Sets.txt): NOT in the box. Table names are cited from the loader (d2common/d2resource/resource_paths.go). No numbers from the tables are claimed.
- Server half: not in this repo. README names a successor project (AbyssEngine), not in the box. No paired donor is present.
- Locale strings (string.tbl and friends): referenced by path only (resource_paths.go:216-218), not in the box, so no entry counts.
- Not read: d2networking server code, d2script, d2term, tests.

## 1. Creatures and beasts
Data first: monstats.txt (MonStatRecord, d2core/d2records/monster_stats_record.go:13) with side tables monstats2, monpreset, MonPlace, monai, monmode, monsounds, monseq, Montype, monlvl and monumod (resource_paths.go:335-337 and 451-458). Not in the box, so family and tier counts are NOT claimed (counts.creatures = null).

What the code defines (verified in the loaders):
- Families: each monster row has a super-group column (MonType) and a NextInClass link (monster_stats_record.go:38). The comment says the chain is used for map-placed monsters picked by area level.
- Difficulty swap: each level lists monsters per difficulty, with Nightmare and Hell columns (level_details_record.go:22 onward; MonsterID1Nightmare at :33).
- Champion and unique slots: umon columns per level (level_details_record.go:64). Critters are client-side only (:77).
- Attack elements: 12 element tags on attacks (fire, lightning, cold, poison, magic, life drain, mana drain, stamina drain, stun, random, burn, freeze), per monster_stats_record.go:149 and :165.
- Animation vocabulary: 16 modes, including death, neutral idle, walk, get-hit, two attacks, block, cast, four skills, dead, knockback and run (d2common/d2enum/monster_animation_mode.go:10-25). Knockback is tagged with the same token as get-hit (line 23, "GH"), a token collision.
- Super uniques: a boss row with a fixed hardcoded index and 43 documented modifier IDs (0 to 42) in the record comment (monster_super_unique_record.go, lines 26 to 83). Modifiers change stats or add death payloads. The file marks several as buggy or untested in newer versions, so only the shape is recorded here.
- Minion groups per super unique: MinGrp and MaxGrp (monster_super_unique_record.go:88).
- Idle loop: a walking NPC pauses on each path node and repeats its idle animation 3 to 7 times before moving on (d2core/d2map/d2mapentity/npc.go:35-36 and :126).

Top 8 striking (readable silhouette at 375 wide, one signature behaviour, one signature effect):
1. Stone-hide bruiser. Why: a heavy body that takes much less physical damage and gets more defence (super unique modifier 28, monster_super_unique_record.go:69). Keep: a modifier stack on one body, shown as a visible change. Change: resistance only while standing guard, dropping after a short move, not a flat stat. Ref: d2core/d2records/monster_super_unique_record.go:69.
2. Blink-and-mend. Why: warps away when hit and heals while away (modifier 26, :67). Keep: warp-then-heal as one rule. Change: one blink per 20 s, healing shown as a wisp orb on the ground that can be broken. Ref: monster_super_unique_record.go:67.
3. Leash-linked brood. Why: when the leader dies, all minions die at once (modifier 15, :56). Keep: a death link on a group. Change: minions stagger and fall apart over 1.5 s, and a spawn slot stays free for the next wave (row 23). Ref: monster_super_unique_record.go:56.
4. Shard burst. Why: no corpse; the body shatters into ice pieces on death (modifier 35, :76). Keep: no-corpse death with a burst. Change: a short cone of shards with a slow of 1.5 s and its own sound. Ref: monster_super_unique_record.go:76.
5. Chill blast. Why: explodes on death and chills nearby fighters (modifier 33, :74). Keep: death explosion that slows. Change: slow applies only inside a small ring, not to the whole zone. Ref: monster_super_unique_record.go:74.
6. Charged-bolt spitter. Why: releases bolts when hit (modifier 20, :61). Keep: counter-fire on being struck. Change: bolts only on every third hit, to keep the duel readable. Ref: monster_super_unique_record.go:61.
7. Aura bearer. Why: gets a random offensive aura (modifier 30, :71). Keep: a random aura chosen from a list at spawn. Change: aura chosen from our three duel auras, and shown as a ring under the feet. Ref: monster_super_unique_record.go:71.
8. Mana thief. Why: steals mana and heals itself on hit (modifier 25, :66). Keep: a drain that heals the drainer. Change: drain stamina, not mana, and heals a fixed share. Ref: monster_super_unique_record.go:66.

Also seen (no look): 12 element tags per attack (monster_stats_record.go:149, :165) map cleanly to Frankendom's hit types; a per-attack element is a data field, not code.

## 2. Classes, races and factions
- Seven hero classes (d2common/d2enum/hero.go:8 "Hero is used for different types of hero's"). Race: none in the box. Roles from the donor names are not used here (names are proprietary); roles are not verified because skills.txt is not in the box.
- Progression shape (charstats loader, d2core/d2records/charstats_record.go): per class, start stats, life, mana and stamina per level, per vitality and per energy point, mana regen seconds (:19), walk and run speed, stamina drain on run, block factor (:38), 10 base skill slots (:44), 3 skill tabs (:48), and 10 starting-item slots (:53-55).
- Faction data: monster alignment is enemy, friend or neutral (d2common/d2enum/monster_alignment_type.go:8-16); neutral is for critters. Monster combat type is melee or ranged only (monster_combat_type.go:8-11).
- Summoned allies: a monster may carry up to two minion IDs (monster_stats_record.go:81 for minion1).

## 3. Weapons
- Weapon attack shapes: 14 classes, from hand-to-hand, bow, crossbow, staff, one- and two-handed swing and thrust, to combo pairs (d2common/d2enum/weapon_class.go, first entry at :14). These drive the animation set; they are not item tiers.
- Item fields per weapon row (d2core/d2records/item_common_record.go): hit-effect class (:21: sound and graphic effect per attack), movement speed penalty (:53), gem sockets (:67), gem upgrade chain (:17), and per-difficulty upgrade rows (:25-26 and the code columns at :42-44).
- Special properties: unique items (d2core/d2records/unique_items_record.go) and set items (set_record.go), and runewords with an ordered rune list (runeword_record.go:20).
- Visual tiers: none by sprite, except the unique copy with a palette shift (unique_items_record.go:14). Otherwise tiers are shown by name colour (see section 4).

Top 5 striking:
1. Ordered runeword. Why: runes socket in a fixed order and the order makes the item (runeword_record.go:20). Keep: order as a rule players can read. Change: order shown as a ghost-slot row on the phone inspect screen. Ref: d2core/d2records/runeword_record.go:20.
2. Gem upgrade chain. Why: a gem points to a better gem (item_common_record.go:17). Keep: a chain of three steps. Change: our own gem families and a visible colour step. Ref: d2core/d2records/item_common_record.go:17.
3. Difficulty upgrade codes. Why: the same base item has a per-difficulty upgrade (item_common_record.go:25-26). Keep: one base, three tiers as data. Change: tiers by zone depth, not difficulty. Ref: item_common_record.go:25.
4. Palette-shifted unique. Why: the unique copy changes the held and ground sprite colour (unique_items_record.go:14). Keep: one palette shift per unique. Change: our own tint ramp and an animated sheen. Ref: d2core/d2records/unique_items_record.go:14.
5. Hit-effect class. Why: each weapon row picks a sound and effect set for hits (item_common_record.go:21). Keep: an effect class per weapon. Change: our own sound family per class. Ref: item_common_record.go:21.

## 4. Armour and gear
- Quality tiers: nine in order, low, normal, superior, magic, set, rare, unique, crafted, tempered (d2common/d2enum/item_quality.go:8-16). Each has modifier rows with min and max and applicability flags (d2core/d2records/item_quality_record.go).
- Set bonus: three tiers per set (PartialA, PartialB, Full) (d2core/d2records/set_record.go:25-27). Set-item rarity within one base item (set_item_record.go:21).
- Unique items: up to 12 fixed properties (unique_items_record.go:8), a version tag, a rarity weight, a level, and three behaviour flags: ladder only (:32), drops more than once (:33) or single copy that cannot be traded (:36). When a single-copy unique would drop again, the code is meant to drop a durable rare instead (comment on :33).
- Material and look: no material field. Layers come from a composite file per body; the code marks shadow per layer (d2core/d2asset/composite.go:301).
- Tier display: name colour only. Unique is gold, set green, rare yellow, magic blue, crafted orange (d2core/d2ui/color_tokens.go:31-35; name colour chosen in d2core/d2item/diablo2item/item.go:138-153). Rare vs magic is decided by affix count, not by the quality field (item.go:146-152).
- Drop odds: a base weight of 1024 and per-quality frequencies from the treasure class table (item_factory.go:21; modifier roll at :163-188). Treasure picks: a NoDrop weight sits in the same roll, so a pick can come up empty (item_factory.go:199-202).

Top 5 striking:
1. Drop-once with a durable replacement. Why: the single-copy rule has a fallback item (unique_items_record.go:33). Keep: a rule that keeps a rare drop from being empty. Change: the replacement is a named rare with its own stat line. Ref: unique_items_record.go:33.
2. Three-tier set bonus. Why: partial bonus at two tiers, full bonus at all (set_record.go:25-27). Keep: partial and full. Change: our own thresholds (2, 4, 6) and a visible set aura. Ref: set_record.go:25.
3. Nine-step quality ladder. Why: quality is an ordered enum (item_quality.go:8-16). Keep: an ordered ladder that controls colour and roll odds. Change: our own names and fewer steps (five). Ref: d2common/d2enum/item_quality.go:8.
4. Layered gear over one body. Why: each equipped part is a composite layer with its own shadow flag (composite.go:301). Keep: layers composed per frame. Change: a fixed layer order tuned for the 375 px fight camera (row 15). Ref: d2core/d2asset/composite.go:301.
5. Affix count sets rarity colour. Why: the name colour follows how many affixes the item rolled (item.go:146-152). Keep: count as the rule. Change: our own count thresholds and a sound per tier. Ref: d2core/d2item/diablo2item/item.go:146.

## 5. Zones and dungeons
- Data first: LevelTypes, Levels.txt (LevelDetailRecord, d2core/d2records/level_details_record.go), LvlPrest (level_presets_record.go), LvlMaze, LvlSub, LvlWarp (resource_paths.go:287-293). Not in the box.
- Preset map flags per row: Populate, Logicals, Outdoors, Animate, KillEdge, FillBlanks, AutoMap, Scan (d2core/d2records/level_presets_record.go:8-27).
- Level details per row: act (level_details_record.go:101), quest flags that gate portals (:110), automap layer ID, size per difficulty, world offsets (:131), monsters per difficulty and uniques and critters.
- Generated zone in code: one act-1 overworld (d2core/d2map/d2mapgen/act1_overworld.go). A town stamp sits on one edge (branch on E1, S1 or W1 at :54). Fence borders per edge use three random variants (:129). A den of evil sits near centre with a 10-tile jitter (:278). Then 25 fill stamps are placed by rejection sampling (:319-329).
- Biomes and fills in that generator: grass field, stone fill (two families), cottage clusters (six variants), fallen camp (four variants), pond, and two swamp fills (act1_overworld.go:294-315). Border families: tree, wall and water borders, bridges and underground passage entrances (d2core/d2map/d2mapgen/d2wilderness/wilderness_tile_types.go:6-30).
- Zone sound: a sound-environment row per zone with song, day ambience, night ambience, event and reverb values (d2core/d2records/sound_environment_record.go:7 and loader).
- Shrines: type (none, recharge, booster, magic), duration in frames, reset in minutes, rarity 1 to 3 (d2core/d2records/shrine_record.go:7-15).
- Hazards: not read in depth (state and overlay tables are not in the box).

Top 5 striking:
1. Edge hub with a field outward. Why: the town is pinned to one edge and the wilderness grows from it (act1_overworld.go:54). Keep: hub on the edge, field outward. Change: a terraced cliff field, not flat grass. Ref: d2core/d2map/d2mapgen/act1_overworld.go:54.
2. Den placed by centre plus jitter. Why: the boss-type den is always near the middle (act1_overworld.go:278). Keep: a fixed anchor with a small random offset. Change: the den sits at the far end of the longest path from the hub. Ref: act1_overworld.go:278.
3. Rejection-sampled scatter. Why: 25 stamps placed by random tries with an empty-area test (act1_overworld.go:319-329). Keep: a stamp list, an empty test, a random try. Change: a try cap and an attempt budget (see defects). Ref: act1_overworld.go:319.
4. Night ambience row. Why: the data has a night ambience and night event per zone (sound_environment_loader.go:16-18) but the code never reads them. Keep: a day and night pair per zone. Change: switch by in-game clock. Ref: d2core/d2records/sound_environment_loader.go:16.
5. Shrines that reset. Why: a shrine has a duration and a reset timer (shrine_record.go:14-15). Keep: a timed buff object that comes back. Change: resets on a zone timer, not wall clock. Ref: d2core/d2records/shrine_record.go:14.

## 6. Looks worth recreating
1. Palette transform bank. Technique: one base palette plus precomputed colour remap tables for light levels (32), inventory variations (16), three alpha-blend tiers, additive and multiplicative blends (256 each), 111 hue variations and tone shifts (d2common/d2fileformats/d2pl2/pl2.go:13-22; additive bank at :17, hue at :19). Keep: a bank of remaps picked by index. Change: our own small bank (for example 8 tints) for the fight camera.
2. Unique and set sprite tint. Technique: a palette-shift index per unique, applied to the held and ground sprite (unique_items_record.go:14-15); set and unique inventory art can differ (item_common_record.go:36-37). Keep: one tint per unique. Change: our own colour ramp.
3. Status tint with priority. Technique: each state has a colour priority (0-255), a palette-shift index, and a light radius colour; the highest priority wins when two states overlap (d2core/d2records/states_record.go:67-74 and :69). Keep: priority and one visual per status. Change: our own priority list tied to our status set.
4. Draw effects. Technique: transparency at 25, 50 and 75 percent by alpha offset, and a modulate that uses the lighter composite (d2core/d2render/ebiten/ebiten_surface.go:200-209). Keep: the transparency ladder. Change: our own fade times. Note: burn and the two modulate-2x variants are empty cases (see defects).
5. Hover highlight. Technique: a brightness push of 2 while hovered or selected (d2core/d2map/d2mapentity/animated_entity.go:29 and :47). Keep: brightness, not outline. Change: add a rim tint for the fight camera.
6. Missile look. Technique: missile flicker and diameter, and a transparency mode (d2core/d2records/missiles_record.go:25-26 and :138). Keep: flicker on projectiles. Change: our own flicker rate per element.
7. Sound fades. Technique: each sound has a fade-in and a fade-out (frames), converted to a linear volume ramp per second (d2core/d2audio/sound_engine.go:80-98, rate at :85). Keep: separate fade-in and fade-out per sound. Change: our own durations per cue.
8. Ambient random pan. Technique: an ambient event picks a random stereo pan from -1 to 1 (d2core/d2audio/sound_environment.go:65). Keep: random pan for ambient one-shots. Change: pan by a visible source position.

## 7. Inspiration for Frankendom (originals, clearly distinct)
1. Tidewall Guard: an elite that is hard to dent while it holds its ground and loses that cover the moment it steps. Keep: a stance-linked damage reduction (super unique modifier 28). Change: the reduction comes from a visible guard pose and ends after 0.5 s of movement. Ties to parity row 3.
2. Lantern Wisp Mender: a caster that blinks a short hop when struck low and heals only while its orb is intact. Keep: blink-then-heal (modifier 26). Change: one blink per 20 s; the orb is on the ground and can be broken by a hit, so the duel stays readable.
3. Brood Tether: a leader whose minions stagger apart when it falls, with a free spawn slot kept. Keep: death link on a group (modifier 15). Change: no instant vanish; minions fall over 1.5 s. Ties to row 23 (spawn caps).
4. Glacier Husk: dies with no corpse and bursts into shards that slow a small ring. Keep: no-corpse death and a chill burst (modifiers 33 and 35). Change: the slow is local, 1.5 s, and has its own sound cue.
5. Gilt Relic: unique gear with one palette-shifted copy and an animated sheen, rarity by affix count. Keep: one tint per unique and count-based rarity (item.go:146). Change: our own ramp, our own thresholds, and a drop sound per tier. Ties to row 15.

## Fold-ins (from Strategy's topic list)
- hud-ui: a globe widget (d2game/d2player/globeWidget.go, not read), help overlay and key binding menu (files present, not read), automap fade option (d2game/d2player/escape_menu.go:225). Minimap and touch and lock-on forgiveness: not read.
- sound-music: per-zone environment row and fades (section 5 and 6). Beds per biome and border crossfades: not in the code read.
- progression: seven classes with per-level growth (section 2). Talent-tree shape: skilltree.go present in d2game/d2player, not read.
- loot: drop ceremony via a per-unique drop sound and drop frame (unique_items_record.go, DropSound and DropSfxFrame fields). Rarity by colour and sound: colour only, no sound. Phone inspect: not read.
- spawns: per-level monster lists by difficulty and critters (level_details_record.go:22-78). Walk density (what appears every 20 s): not in the box.
- idle and ambient: 16 animation modes and a 3-to-7 repeat idle on path stops (npc.go:35-36).
- death and respawn presentation: not read.
- boss intro and finish staging: super unique minion groups (MinGrp/MaxGrp, monster_super_unique_record.go:88). Staging itself not read.
- readability at 375 wide: rarity is text colour, no world glow. Measured nothing.

## Defects seen (keep the idea, fix the defect)
1. Magic suffix table taken from the prefix table. item.go:357 `suffixes := ...Magic.Prefix`. Fix: use the suffix table. Idea kept: one prefix and one suffix on magic items.
2. Affix pool built by iterating a Go map. item_factory.go:332. The match list order changes between runs, so one seed can give different affixes. Fix: sort the keys before picking.
3. Affix cap gate reads codes not yet written. item.go:359-373: prefix codes are assigned after pickRandomAffixes returns, so the gate counts stale values. The loop bound is the only real limit. Fix: count the picks made so far. The prefix-count test is also applied to the suffix pass.
4. Unbounded placement loop. act1_overworld.go:319 `for numPlaced < 25`. If the area is full it never ends. Fix: an attempt cap.
5. Inclusive loop over an exclusive edge. map_generator.go:55-56 uses `<=` on Bottom() and Right(), which are Top+Height and Left+Width (rectangle.go:18). One extra row and column are checked. Fix: use `<`.
6. Night ambience and night event loaded but never used in d2core, d2game or d2common. Fix: pick the row by clock.
7. Empty draw-effect cases. ebiten_surface.go:211-214: burn and modulate-2x variants apply nothing. Fix: implement or remove.
8. Copy error in the effect comments. draw_effect.go:29 and :33 quote the same colormap range for three effects. Fix: correct the ranges.
9. Treasure class recursion has no depth limit. item_factory.go:265. A cyclic table would recurse forever (not tested). Fix: cap the depth.
10. Token collision. Knockback and get-hit share the "GH" token (monster_animation_mode.go:23). Fix: unique token or a note.

## Not verified and not read
- Every numeric table (monstats, levels, sets, uniques, treasure classes, states, shrines) is absent. Counts for creatures, gear sets and zones are null.
- AnimData.d2 and BadData.d2 test fixtures (d2common/d2fileformats/d2animdata/testdata) not parsed. rh.exe at the root (5.4 MB, Windows binary) not read, not run.
- Images and the font (docs/diablo.woff) not opened. Lexer and parser bodies not read.
- Server, networking and script code not read.
