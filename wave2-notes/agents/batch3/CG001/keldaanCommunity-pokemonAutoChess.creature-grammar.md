# keldaanCommunity-pokemonAutoChess: creature-grammar (CG001)

Donor root (VPS, read-only): /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/
Depth: full for the creature grammar; not full for the whole game.
Half read: both. Server and shared data: app/config/game/*, app/models/*, app/types/enum/*, app/models/precomputed/*. Client: app/public/src/game/components/pokemon-animations.ts (the per-species animation table) plus header-level reads of pokemon-sprite.ts and abilities-animations.ts.
Matching half that exists in the box but I did not read: sprite and portrait art under app/public/src/assets (not read), and the battle-simulation bodies that run the attacks.

## 1. What the player sees and feels (375 wide)

A board of small creatures on a grid. A creature belongs to a family line of up to three visible stages. When three copies merge, the creature steps up a stage and reads as bigger and clearly tougher, so the growth is the first thing the eye learns. Each creature has its own basic attack motion, and its ranged or melee strike and its hit flash are keyed by element, so a whole type reads as one colour of hit. A creature can also appear in a mood variant (20 emotion slots, plus a shiny bit) that changes the face and portrait, not the stats. PvE turns end on an elite or boss: an existing creature from a line, tinted with a fixed mood, given a stat block and held items, sometimes standing next to two or three others.

## 2. Why it works / is striking

- Readable silhouette at 375: yes. The stage ladder is one visible step per merge, and the family shape is kept across stages.
- One signature behaviour: the basic attack animation is per species (30 basic-attack types, 54 ability types in the table), so a family can have its own motion.
- One signature sound or effect: the element-keyed hit sprite (18 keys) is the closest thing to a signature effect. No audio file was read; the data pack shows no sound table in the half I read.
- Could be ours at 20-30 percent resemblance: yes. The stage ladder, the element-keyed hit and attack sprite table, and the packed variant byte are generic design, not art.

## 3. The rule behind it

### Families and stages
- Species enum: 1,198 members in app/types/enum/Pokemon.ts (Pkm enum body).
- Family map: PkmFamily at app/types/enum/Pokemon.ts line 2494 maps about 1,197 entries onto about 540 family roots (my count from the map body).
- Data table: app/models/precomputed/pokemons-data.csv has 1,175 rows and 532 distinct Family values. Family sizes: 163 singletons, 215 pairs, 128 triples, a long tail to 18. Columns include Tier, Nb stages, Variant, Regional and Duo. I read the header and tallied columns; I did not read the Attack, Speed or Ability values row by row.
- Stage count (Nb stages column): 3 for 671 rows, 2 for 429, 4 for 40, 1 for 35.
- Tier column: 1 for 363, 2 for 358, 3 for 436, 4 for 18.
- Rarity: nine values (COMMON, UNCOMMON, RARE, EPIC, ULTRA, UNIQUE, LEGENDARY, HATCH, SPECIAL). Class counts in app/models/colyseus-models/pokemon.ts: 94 / 205 / 209 / 184 / 43 / 174 / 107 / 58 / 76 (sum 1,150).

### Stage stat ladder (computed, not copied)
- Each stage is its own class in app/models/colyseus-models/pokemon.ts (1,150 species classes parsed; stars field 1, 2 or 3, plus 18 at 4).
- Evolution pairs with a declared next stage: 397. Mean hp ratio from stage 1 to the next stage: about x2.12. Mean atk ratio: about x2.28 (n=283).
- Mean hp ratio from stage 2 to the next: about x1.65. Mean atk ratio: about x1.85 (n=111).
- Stage 2 to 3 steps are smaller than stage 1 to 2 in this tally. This is my computed tally (awk over the class blocks), not a value taken from a single table.

### Ability swap at the top stage
- Each class sets skill = Ability.X. 1,151 assignments, 541 distinct skills, 216 skills used once.
- The most shared skill is used by 22 species, then 18 (the default), then 10, 9, 8.
- The top stage of one line can drop the signature skill to the default. Example: the 3-star form sets skill to the default and comments out the earlier skill line (app/models/colyseus-models/pokemon.ts lines 466-467). So the family's skill can be removed at the top tier rather than swapped.

### Variant byte (mood and shiny)
- One byte per creature: shiny is the top bit, the low 7 bits are an emotion index (app/models/colyseus-models/pokemon-customs.ts line 19). Default (not shiny, normal) is byte 0 and is not sent.
- The emotion order is fixed (CollectionEmotions, app/types/enum/Emotion.ts line 41; a comment there says not to reorder).
- 20 emotion slots. Availability per species is a precomputed index: 2,358 keys (shiny keys are separate). Most keys have 16 or 17 of the 20 available; 488 keys have only one.

### Attack motion and hit sprite per species
- PokemonAnimations table: app/public/src/game/components/pokemon-animations.ts. 1,185 species entries (enum has 1,198 members).
- Basic attack animation: 30 distinct types. Most common: Attack (654), Shoot (243), Strike (117), Rotate (29), MultiStrike (17).
- Ability animation: 54 distinct types. Most common: Shoot (375), Charge (134), Attack (127), SpAttack (76), Rotate (49).
- attackSprite key: 39 distinct, built as ELEMENT plus MELEE or RANGE (most common: NORMAL_MELEE 96, PSYCHIC_RANGE 90, WATER_MELEE 73).
- hitSprite key: 18 distinct, keyed by element (most common: PSYCHIC_HIT 92, GRASS_HIT 77, WATER_HIT 72).
- A flag shinyUnavailable is set on 41 entries.

### Elite and boss pattern (PvE)
- app/models/pve-stages.ts: PVEStages keyed by turn. 11 stage entries (turns 1 to 40).
- A boss is an existing creature placed on a small board, with an emotion (DETERMINED or INSPIRED on the big stages), a statBoosts block, and held items.
- Boost sizes seen: hp +50 on the first multi-creature stage, up to hp +200, def and spe-def +5 to +15, atk +10, ap +50 on the last stage (pve-stages.ts line 343 holds "[Stat.HP]: 200,").
- Legendary-group stages put 2 to 4 creatures on one board.

### Synergy tiers (count thresholds)
- app/config/game/synergies.ts: SynergyTiers has 31 rows (lines 6-178). SynergyTiersThresholds (from line 179) gives the count per tier, for example [2,4,6,8] or [3,5,7,9] or [3,6,9]. The enum has 32 synergy members; I did not check which one has no tier row.

### Data fields (designer-tunable)
- stages_per_family: 3 (donor: 3-stage most common; unit: count).
- stage_hp_ratio: about 2.1 then 1.65 (donor null: GPLv3 code and third-party content, not MIT/Apache/BSD).
- stage_atk_ratio: about 2.3 then 1.85 (donor null).
- variant_bits: 8 (1 shiny bit + 7 emotion bits; unit bits).
- emotion_slots: 20 (unit count).
- top_stage_keeps_skill: boolean (donor does not keep it; our choice).
- boss_hp_boost: per zone (unit hp points, donor null).
- attack_motion_types: 30 basic, 54 ability in the donor (unit count; ours would be far fewer).
- element_sprite_keys: attack 39, hit 18 (unit count).

## 4. For Frankendom

- 12 families times 3 stages is 36 base forms. Recolour plus the variant byte multiplies that by 20 mood slots and a shiny bit with no new art. One sprite set per form, then the look is data.
- The element-keyed hit and attack table is the cheap way to make 100 creatures feel like 12 families: one hit look per element, one attack look per range type. The donor needs 18 hit keys and 39 attack keys; we should start with about 8 hit keys and 2 range types.
- Server-verified: the variant is one uint8 per creature on the server. The client maps byte to look. Fits many-vs-one (max 3 attackers) because the attack event is one short message.
- Boss or elite in a zone: a family's top stage, plus a stat block row, plus a mood tint, plus one swapped ability. That is a data row over an existing creature, so 700 zones can reuse the 100 Pit creatures.
- Keep: the 3-stage merge ladder, the element-keyed hit look, the packed variant byte, the boss-as-existing-creature rule, the rule that a stage change is visible.
- Change: do not drop the signature ability at the top tier (the donor's top-tier drop removes the family's identity). Use one swapped ability per elite instead. Do not use multi-creature legendary boards beyond our 3-attacker limit. Do not carry the 30-motion attack set; cap at about 8.

## 5. A 5-minute look test Dom can judge on a phone

Build one strip at 375 wide, from our own assets, with three things side by side:
1. One family of ours (an invented name): stage 1, stage 2, stage 3, same silhouette family.
2. The same stage 2 in two mood variants (shiny bit off and on), same stats, to show recolour without new art.
3. An elite version of stage 3: slightly larger, one element-keyed hit look changed, one swapped attack effect, a boss tint.

Dom answers two questions: does it read as one family at a glance, and does the elite read as that family's boss rather than a new monster. No release rows, no lock; this is a preview.

## 6. Licence and IP

- Code: GNU GPL v3 (LICENSE line 1). Do not paste code into a non-GPL repo; re-implement from the idea.
- Content: README.md line 5 says "All rights to The Pokemon Company" (the creature content is third-party IP). Species names, sprites, portraits, and the species-to-family mapping are restricted. Inspiration must stay at category level: "a three-stage line", "an element-keyed hit flash", "a mood variant byte". Never an instance (no species name, no sprite look, no family table copied).
- No legal conclusions. Our names, art and family table must be original.

## 7. Gaps

Not read: sprite and portrait assets (app/public/src/assets, not read); locale and name string tables (not read); the bodies of pokemon-sprite.ts (1,812 lines, header only), abilities-animations.ts (3,374 lines, header only), battle-manager.ts (1,466 lines, not read); the attack and ability implementations; the Attack, Speed and Ability columns of pokemons-data.csv (header and column tallies only); the sound half (no audio read); the mood-to-face mapping in the renderer.

Half read: both (server and data, plus the client animation table). The render and audio halves are not read.
No asset audit for this donor exists in batch3 (no AU file mentions it).
