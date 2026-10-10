# Creature grammar: CleverRaven-Cataclysm-DDA (CG002, topic creature-grammar)

Half read: DATA PACK (data/json/monsters, 69 files; data/json/monstergroups, 29 files). Engine half exists in the donor (src/monstergenerator.cpp) and was only spot-checked by grep (lines 388, 884), not read in full. Client half (gfx/ASCIITileset tile_config.json) not opened; the asset audit (AU010) covers it at file level only.

## 1. What the player sees and feels
A phone-sized fight where a zombie-type enemy is clearly "one of those" before the player reads its name. Across the 75 variants of one zombie base the body shape stays the same, but the tint, a scar or rust mark, a different lunge or grab, and a new name tell the player what is new. Tiers come from the same family: a plain walker can grow into a tougher, grabbing or shrieking form later, and the player reads that as "the family got worse", not as a new monster. The donor is a text-glyph game, so the "silhouette" is one symbol and one colour; we would need our own shape language.

## 2. Why it works / is striking
- Readable family at a glance: one base record (abstract) carries the body plan, speed class and default behaviour; children only list what differs.
- One signature behaviour per variant: most children override a single special attack or a single stat band, which is the "one swapped ability" idea.
- A signature sound or effect is not in this donor (no audio or VFX data in the half read). Not assessed.
- Could be made ours at 20-30 percent resemblance: yes, the base-plus-diff pattern and the weighted upgrade pool transfer; the ASCII glyph does not.

## 3. The rule behind it
Counts below are from parsing every monster JSON file (read-only, on the VPS). Classification of children into bands is my own, not the donor's.

- 1,205 MONSTER objects in 69 files. 33 are abstract bases. 1,172 are concrete. 814 concrete entries use "copy-from" to inherit from another record; 358 stand alone.
- 217 distinct copy-from roots. 40 roots have 5 or more children. The largest family base is the zombie base (75 children).
- Which keys children override (814 children): description 726, name 708, upgrades 451, extend 371, color 333, special_attacks 260, hp 254, speed 252, armor 222, melee_damage 155, zombify_into 100. Most overrides are name, text, colour and one stat band.
- Variant depth (my bands over the 814 children): 171 change only name, text or colour; 160 change only stats; 156 change one behaviour key; 327 change two or more behaviour keys. So roughly 21 percent are pure recolour or rename, and about 40 percent carry more than one behaviour change.
- Scale tier: 128 entries use "proportional" multipliers on a copy-from base. Example shape: hp 0.5, speed 1.1, morale 0.67 for a small form; a mega form multiplies hp by 10 and cuts speed to 0.25 (fish.json, line 1025 shows the small form).
- Look reuse: 129 concrete entries use "looks_like" to borrow another record's sprite. A variant can ship with no new art.
- Tier pool: upgrades are {"half_life": N, "into_group": GROUP}. The most common half_life values are 168 and 120 (22 each). Groups are weighted pools: GROUP_ZOMBIE_UPGRADE lists 23 candidate monsters with weights (zombie_upgrades.json line 7 shows weight 110 for the tough form). 360 monstergroup objects across 29 files.
- Names: of 75 zombie-base children, 56 names contain the family noun "zombie". The rest use a modifier plus a noun, e.g. a modifier word then a family word, sometimes with a tier word at the end. So the naming grammar is <modifier> <family noun> [tier noun].
- Colour spread: 690 of 1,172 concrete entries set their own colour, using 66 distinct colour names (light gray 126 and brown 75 are the most used). Symbols: 73 distinct; 449 concrete entries set their own symbol, the rest inherit.

Ours, as data (designer-tunable; donor values are NOT copied because the donor licence is CC BY-SA 3.0):

| field | unit | donor_value | our default to test |
|---|---|---|---|
| families | count | null | 12 |
| variants_per_family | count | null | 8 (about 100 total) |
| recolour_slots_per_family | count | null | 4 |
| scale_tiers | count | null | 3 (small, standard, large) |
| scale_small_mult | multiplier on sprite height and hp | null | 0.75 |
| scale_large_mult | multiplier on sprite height and hp | null | 1.3 |
| swapped_abilities_per_variant | count | null | 1 |
| swapped_attack_anim_per_variant | count | null | 1 (from a pool of 3 telegraphs per family) |
| elite_hp_mult | multiplier | null | 3.0 |
| boss_hp_mult | multiplier | null | 6.0 (not 10: duels must stay fast) |
| elite_spawn_chance | probability per spawn | null | 0.12, rolled on the server with the zone seed |
| upgrade_pool_size | count | null | 3 to 4 per family |
| name_mod_pool | count | null | 6 per family |

## 4. For Frankendom
- Map: the 12 families are the 12 base records. Each of the ~100 Pit characters is base + diff; a zone references a character by id (700 zones as data), so no zone needs its own creature.
- Many-vs-one: at most 3 attackers. Use the swapped attack animation as the telegraph so the player can read which of the three is about to hit.
- Server-verified: the server rolls family variant, palette slot, scale tier, swapped ability and elite roll from the zone seed, and sends the id. The client only presents it. Do not run the donor's time-decay upgrade (half_life) in a live duel; upgrade is decided at spawn.
- Elite and boss: a boss is a variant of the family with the elite multipliers, a palette cycle and a name card, not a new body. Donor uniques are a separate record but share the base (see the Angband note for the same idea).

Keep: base plus diff; weighted tier pool; recolour and scale as the main variety; one swapped ability per variant; naming as modifier plus family noun; sprite reuse through a look pointer.
Change: no half_life time upgrades in duels; no ASCII glyph; our telegraph replaces the donor's text messages; server decides everything the player sees as a variant.

## 5. Five-minute look test (Dom, on phone)
Build one family only. On a 375 wide frame at fight camera, show: (a) base, (b) the same body with two recolour slots and a different scale, (c) one variant with its swapped telegraph mid-wind-up, (d) the elite with a slow two-frame palette cycle and a name card. Dom judges: can he name the family in under a second; does the elite read as "same family, bigger"; does the telegraph show which attack is coming before it lands.

## 6. Licence and IP
Code: CC BY-SA 3.0 Unported (LICENSE.txt line 1). Art and content: CC BY-SA 3.0 project-wide per the README and LICENSE.txt; some bundled code is under other licences (README line 65). Share-alike applies to any copied content. So: inspiration stays category-level only (a family of walking dead with a tier ladder; a rust-marked variant). Do not copy names, descriptions, or tables. The idea-level recreation: "a four-variant insect family where one swapped ability marks the variant" is our category, not a donor instance. No legal conclusions.

## 7. Gaps
- Not read: engine src/monstergenerator.cpp in full (copy-from, proportional, looks_like application at lines 388 and 884 only); data/mods monster files (not searched by content); gfx/ tile config and sprites (AU010 file-level only); description-variant files (fungus_zombie.json staged text, read by audit only); the 33 abstract bases individually.
- Counts are from my own parse; they are not donor-stated numbers.
