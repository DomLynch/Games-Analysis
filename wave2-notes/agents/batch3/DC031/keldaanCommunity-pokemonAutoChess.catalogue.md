# keldaanCommunity-pokemonAutoChess (design catalogue, reader DC031)

Donor/Licence line: code GNU GPL v3 (LICENSE line 2). Art, sprites, portraits, icons, sounds and the species names are, per the files, all rights to The Pokemon Company (README line 5; policy.md line 14: "All rights to The Pokemon Company"). Class C for art and names; code is GPL, so use the shape of an idea only (clean-room). Dom's rule applies: recreate as a clearly distinct original, never a copy. Species names, sprite art and sounds are NOT to be used in Frankendom. Not a legal opinion.

Checked: data tables first (app/models/precomputed/pokemons-data.csv, app/types/enum/*.ts, app/config/game/synergies.ts, app/config/game/shop.ts, app/models/pve-stages.ts, app/types/EvolutionRules.ts), then the mechanism code (app/core/effects/synergies.ts lines 78-103, 137-153, 249-265, 453-476, 795-812; app/core/evolution-logic/count-evolution-handler.ts 1-60; app/core/terrain.ts; app/core/design.ts 84-101), then the client draw code (app/public/src/game/animation-manager.ts, components/board-manager.ts, components/item-container.ts, components/loading-manager.ts). 86 receipts in receipts.tsv (both donors), all pass verify_receipts.py.

Confidence: high on counts (counted from the data tables with python3, read-only). Medium-high on the effect bodies I opened. Lower on the synergy bodies I did not open (listed under Not read).

## Halves
- Server half: READ in part. app/core (effects, evolution, terrain, design, pve-stages, shop config). Rooms, matchmaking, services listed only.
- Client half: READ in part. app/public/src/game (animation manager, board manager shiny and reward lines, item container, loading manager). Pages and components listed only (pages/component/wiki/ read by grep, not in depth).
- Data half: READ. pokemons-data.csv (1,175 species rows), enum tables, synergy thresholds, PvE stages, weather map, dungeon enum.
- Paired half: both server and client halves are in the same box (app/ and app/public/src/). No separate paired donor needed.

## Counts (counted from the data, read-only)
- Armour sets: 0 (none in the box). Item families for gear are in section 4.
- Species rows: 1,175 (pokemons-data.csv, header on line 1). Rarity categories: 9 (common through legendary, plus special, hatch, ultra, unique). Evolution stages per species: 1 to 4 (671 at 3 stages, 429 at 2, 40 at 4, 35 at 1). Tier column 1 to 4.
- Type tokens: 31 distinct (the same 31 names as the Synergy enum).
- Families (the Family column): 532 distinct.
- Synergy (class) ladders: 31 traits. 16 have four steps and 15 have three (app/config/game/synergies.ts lines 179-210).
- Evolution rule types: 7 (app/types/EvolutionRules.ts line 8).
- Statuses: 29 (app/types/enum/Status.ts). Effects: 177 members (app/types/enum/Effect.ts). Passives: 202 (app/types/enum/Passive.ts). Abilities: 566 enum members (app/types/enum/Ability.ts), 536 distinct ability names in the species table.
- Items: 358 enum members (app/types/enum/Item.ts). Of these: 12 shiny-class items (line 645), 30 synergy gems (line 712), 26 memory discs (line 367), 16 wands (line 926), 12 technical items in three metal tiers of 4 (lines 952-972), 46 dishes (line 994), 24 berry items (line 571), 9 synergy stones (line 700). Craft recipe keys: 55 (lines 507-564).
- Weather states: 13 (app/types/enum/Weather.ts line 6). Emotions: 20 (app/types/enum/Emotion.ts).
- Dungeon map entries: 143 (app/types/enum/Dungeon.ts lines 160-305; counted by grep between those lines).
- PvE scripted stages: 11 (app/models/pve-stages.ts line 42).
- Expedition: 4 types, 6 ranks (app/types/enum/Expedition.ts lines 7-20).
- Wanderer kinds: 5 types, 2 behaviours (app/types/enum/Wanderer.ts).

## 1. CREATURES / BEASTS
Families and tiers (from the species table, counted):
- Rarity ladder (nine categories) sets the shop cost: RarityCost in app/config/game/shop.ts line 20 maps 0 (special), 1, 2, 3, 4, 5 (ultra), 9 (hatch), 10 (unique), 20 (legendary). Cost is the escalation axis.
- Evolution stages: 1 to 4 per species line. Most lines are 3 stages (671 species rows), so a family is a three-step line with a Tier column of 1 to 3.
- Types (a species can carry up to four): the largest counts are psychic (151), normal (148), water (132), field (131), flying (124). The smallest are baby (22) and fossil (48).
- Boss pattern: scripted PvE stages (app/models/pve-stages.ts) with a fixed board, a statBoosts table and a rewards list. Stage 1 is a two-unit line-up with a 1/40 shiny chance (line 50). The turn-24 stage is a three-unit row (name at line 192) with HP +100 in its statBoosts. The final stage (name at line 333) is a four-unit finale: three units on one row and one unit on another row, with statBoosts HP 200, DEF 15, SpDef 15, ATK 10, AP 50 and four held-item slots.
- Escalation with level: the count-evolution rule (copies on the board reach numberRequired) and the held-item exclusion (blocker item) (count-evolution-handler.ts lines 34-37). Carry-over of permanent stats on evolve (helper imported, not read).

Top 8 most striking (labels are mine):
1. Trio vanguard encounter. Why: a three-unit row boss with a shared stat boost; it should read as one group at a glance (judgement; not measured at 375 wide). Keep: fixed row line-up plus boss stat table as data. Change: our creatures, our names, a different formation. ref: app/models/pve-stages.ts lines 192-200.
2. Four-unit finale with one unit off the row. Why: the off-row unit makes the finale read as a leader. Keep: leader on a separate row. Change: our layout and stat numbers. ref: app/models/pve-stages.ts lines 333-357.
3. Ember stacker. Why: attack climbs on every landed hit, so a fight visibly escalates. Keep: per-hit stacking by tier. Change: add a cap (the code has none in the class body read). ref: app/core/effects/synergies.ts lines 137-153 (addAttack at line 148).
4. Kill-growth beast. Why: each kill grows attack and ability power by tier; the class also tracks a boosted-HP amount. Keep: growth on kill. Change: cap it per fight and tie it to our hate list. ref: app/core/effects/synergies.ts lines 78-103.
5. Last-stand surge. Why: a one-shot surge below 30% HP (+40 speed, +40% base attack, +30 shield), then a timed revert after 3000 ms. Keep: one-shot threshold trigger and a timed revert. Change: the shield should also decay (the revert block only undoes speed and attack, not the shield; treat that as a defect). ref: app/core/effects/synergies.ts lines 453-476.
6. Focus lifesteal healer. Why: lifesteal fraction set by which self-buff is present (25, 35 or 50 per cent, checked in code order), and it skips retaliation and self-damage. Keep: gating lifesteal by a self-buff and excluding retaliation. Change: our buff names and numbers. ref: app/core/effects/synergies.ts lines 249-265.
7. Three-copy merge evolver. Why: a line grows into its next stage when enough copies stand on the board, and a held item blocks one copy from counting. Keep: merge-by-count evolution and the held-item blocker. Change: our item name and our count. ref: app/core/evolution-logic/count-evolution-handler.ts lines 29-37.
8. Shiny variant creature. Why: the shiny flag picks a separate animation set per tint, with a per-species opt-out (shinyUnavailable). Keep: flag-selected art set and a per-species opt-out. Change: our variant is a shader glow on the same art, not a second art set. ref: app/public/src/game/animation-manager.ts lines 65-80; app/public/src/game/components/board-manager.ts line 1100.

## 2. CLASSES / RACES / FACTIONS (synergies = the class system)
31 traits; each has a ladder of 2-4 counts (app/config/game/synergies.ts lines 179-210). Table-level shape: one-line role, signature mechanic, progression.
- Fire: attack climbs on each hit (FireHitEffect, synergies.ts 137-153). Ladder 2/4/6/8. Progression: more fire units, bigger per-hit climb.
- Human: lifesteal gated by a self-buff (synergies.ts 249-265). Ladder 2/4/6.
- Wild: low-HP surge (synergies.ts 453-476). Ladder 2/4/6/9.
- Monster: kill-growth (synergies.ts 78-103). Ladder 2/4/6/8.
- Flying: incoming-hit reduction in two levels (FlyingProtectionEffect, synergies.ts 289-300; levels set by effect name). Ladder 2/4/6/8.
- Water: ladder 3/6/9 (config/game/synergies.ts line 183); effect body not read.
- Electric, Psychic, Dark, Poison, Dragon, Field, Steel, Ground, Fighting, Bug, Flora, Rock, Ghost, Fairy, Ice, Fossil, Sound, Artificial, Baby, Light, Amorphous, Gourmet, Normal, Aquatic: ladders read; effect bodies not read (see Not read).
- Weather pairing: 12 of the 31 traits map to a weather state (app/types/enum/Weather.ts lines 50-66), normal maps to neutral.
Other named groups (not read beyond names): 4 PvE group encounters; expeditions (4 types) and wanderers (5 types) are listed under zones.

## 3. WEAPONS
- Families: no weapon classes in the box. The closest are the 16 wands (app/types/enum/Item.ts lines 926-944), each a distinct on-hit or on-cast effect.
- Special properties: the pounce wand deals a splash of 30 per cent of the incoming hit on a crit or a 10 per cent chance, then sets a cooldown field to 250 (unit not checked) (app/core/effects/synergies.ts lines 795-812; the first 18 lines read, splash target not read).
- Tiers: none visible; wands are one tier.
Top 5 striking:
1. Pounce wand. Why: a crit or a 10 per cent chance adds a splash of 30 per cent of the hit, rate-limited by a cooldown field. Keep: a cooldown on the splash. Change: our splash target and visual. ref: synergies.ts 795-812 (shockDamageFactor at line 809).
2. Long wand, guiding wand, warp wand, tunnel wand (16 wands total). Why: a catalogue of distinct effects on one slot. Keep: one slot, many named effects. Change: our names and our effects. ref: app/types/enum/Item.ts lines 926-944.
3. Two-edged wand. Why: a wand that cuts both ways. Keep: symmetric effect idea. Change: effect body not read; name only. ref: Item.ts line 926-944.
4. Switcher wand. Why: a wand that swaps positions (name only). Keep: positional swap as an encounter tool. Change: effect not read. ref: Item.ts lines 926-944.
5. Confuse and slumber wands. Why: two status-applying wands (names only). Keep: status wands as a family. Change: effects not read. ref: Item.ts lines 926-944.

## 4. ARMOUR / GEAR
- Sets: no armour sets. Gear is held items and crafted stones.
- Material tiers: three metal tiers of technical items (bronze, silver, gold, four each; app/types/enum/Item.ts lines 952-972). Crafted stones from two components (ItemRecipe, lines 507-564, 55 recipes).
- Shiny (gold-themed) items: 12 (ShinyItems, line 645). On a reward drop, a shine sparkle sprite rises with the item on a tween (board-manager.ts lines 1588-1600). The item container gives shiny items their own cell class (item-container.ts line 76).
- How tiers show: the shine sparkle (shiny items only); the metal tiers show by name, not by a visual that the code read showed.
Top 5 striking:
1. Shine-on-drop. Why: a reward rises with a sparkle sprite and tween, a visible reward moment. Keep: a rising reward with a sparkle. Change: our sparkle shader (see section 6). ref: board-manager.ts lines 1588-1600.
2. Bronze, silver, gold technical items. Why: a three-step metal ladder in one family. Keep: metal ladder with four per tier. Change: our metals and our names. ref: app/types/enum/Item.ts lines 952-972.
3. Shiny item class. Why: a separate class for gold-plated items. Keep: class-based look for special items. Change: no gold palette copy; use a glow and a bevel. ref: Item.ts line 645; item-container.ts line 76.
4. Synergy gems (30) and memory discs (26), keyed to traits. Why: items that map one trait to one item family. Keep: trait-keyed item families. Change: our trait names. ref: Item.ts lines 367-395 (discs), 712-745 (gems).
5. Two-component crafting. Why: a recipe that takes two base components and returns a stone (ItemRecipe, app/types/enum/Item.ts lines 507-564). Keep: two-input crafting. Change: our inputs and names. ref: Item.ts lines 507-564.

## 5. ZONES / DUNGEONS
- Biomes and dungeon archetypes: 143 dungeon map entries (app/types/enum/Dungeon.ts lines 160-305), with a music enum (Dungeon.ts line 1) and music credits (line 306). The loading manager skips the town map when it loads a dungeon (loading-manager.ts line 122).
- Procedural terrain: fractal noise into three cell types (wall above 0.66, ground above 0.33, water below; app/core/design.ts lines 96-101). The noise is a seeded generator (app/core/terrain.ts line 180), but the seed is never passed in: Terrain is built with frequency and persistance only (design.ts lines 84-88; terrain.ts lines 31-33). Defect: the map is not reproducible; the fallback (line 40) uses time and random. Fix: pass a seed from the zone data.
- Weather: 13 states (Weather.ts line 6). WeatherEffects maps 12 of them to an effect; PassivesAssociatedToWeather lists 10 entries (nine weather states plus neutral mapped to the airlock passive; Weather.ts lines 37-48).
- Expeditions: 4 types (rescue, exploration, battle, delivery) x 6 ranks (E to S). The hash is deterministic per player and the number of expeditions done (Expedition.ts line 26). Good pattern for seeded quest offers.
- Scripted stage zones: 11 (pve-stages.ts line 42).
Top 5 striking:
1. Three-cell noise terrain. Why: one noise field with two thresholds gives wall, ground and water. Keep: thresholded fractal noise for three cell types. Change: fix the seed (see above) and keep thresholds in zone data. ref: app/core/design.ts lines 84-101; app/core/terrain.ts lines 31-33, 114, 154.
2. Weather paired to a trait. Why: each trait has its own weather that also grants a passive. Keep: trait-weather pairing. Change: our trait and weather names. ref: app/types/enum/Weather.ts lines 37-66.
3. Expedition offer deck. Why: four types by six ranks with a deterministic seed per player and count. Keep: deterministic offers. Change: our ranks and types. ref: app/types/enum/Expedition.ts lines 7-27.
4. Scripted stage table. Why: one table of stages with a board, stat boosts, rewards and a shiny chance. Keep: data-driven encounter table. Change: our stages. ref: app/models/pve-stages.ts lines 42-360.
5. Dungeon catalogue by enum. Why: 143 map entries keyed by one enum, music attached. Keep: enum-keyed catalogue. Change: our 10-ish archetypes. ref: app/types/enum/Dungeon.ts lines 1, 160-305.

## 6. ITEM / EFFECT LOOKS worth recreating
- Shiny as a separate animation set (animation-manager.ts line 65 and line 78 opt-out; board-manager.ts line 1100). Technique: a per-variant art set chosen by one boolean, with a per-species opt-out.
- Shine sparkle on reward drop (board-manager.ts lines 1588-1600). Technique: a looping sparkle sprite plus a tween that rises 48 px and spreads items 70 px apart. Numbers are layout only.
- Animation frame rates as constants: pokemon animations at 36 fps and effects at 20 fps (animation-manager.ts lines 26-27). Technique: separate frame rates for character and effect layers.
- Region tint on board sprites (board-manager.ts lines 357-483, getRegionTint with a colour-blind option). Technique: a per-region tint with an accessibility switch.
- Status enum of 29 (app/types/enum/Status.ts) for status icons; 20 emotions (Emotion.ts) for idle and pose variety.

## Inspiration for Frankendom (originals; each distinct from the donor)
1. Last Ember Surge (from the last-stand surge, section 1 item 5). Idea: a once-per-fight burst below 30 per cent HP. Keep: one-shot threshold, timed revert (3000 ms via a delayed command). Change: the shield also decays; our numbers; an ember aura shader instead of any donor visual.
2. Trio Vanguard boss (section 1 item 1). Idea: three units on a row with one shared boss stat table, plus a leader on a second row. Keep: data-driven boss board. Change: our creatures, our formation and names; no species.
3. Kill Ledger beast (section 1 item 4). Idea: each kill raises attack and max HP, capped per fight. Keep: growth on kill. Change: a hard cap and a visible tally.
4. Brood Line evolution (section 1 item 7). Idea: three copies merge into the next stage carrying permanent stats; a held Anchor item blocks one copy. Keep: merge-by-count and blocker item. Change: our item and our lines.
5. Focus Drinker lifesteal (section 1 item 6). Idea: lifesteal of 25, 35 or 50 per cent set by a self-buff, excluding retaliation and self-damage. Keep: gating and exclusions. Change: our buff names and numbers.
6. Trait Weather Pairs (section 5 item 2). Idea: each trait is paired with a weather that adds a passive. Keep: pairing as data. Change: our traits and our weather set.
7. Seeded Cut Terrain (section 5 item 1). Idea: three cell types from one noise field with thresholds, reproducible from a zone seed. Keep: thresholds as zone data. Change: fix the seed plumbing (the donor defect), add our own biome names.
8. Shine Drop (section 4 item 1). Idea: a reward rises with a sparkle and tween. Keep: rise plus sparkle. Change: our glow shader; this is the reward-ceremony step for the loot row.

## Briefs / Dom rule
Recreate as a clearly distinct original, never a copy. Trait kept and trait changed are listed per item above.

## Licence and rights note
- Code: GPL v3 (LICENSE line 2). Clean-room, shape only.
- Art, sprites, portraits, icons, sounds and species names: the files state all rights to The Pokemon Company (README line 5; policy.md line 14). Do not reproduce any of them.
- Music: not in the box (README line 22 says a script fetches it).
- Credits (credits.json, credit_names.txt): personal names, not reproduced.
- Translations: 14 locale folders; the strings were not read (count only).

## Not read
- Synergy effect bodies beyond the ones named above (electric, psychic, dark, poison, dragon, field, steel and others; synergies.ts 1-1040 read only at the lines named).
- Wand effects beyond the pounce wand (first 18 lines).
- Ability files under app/core/abilities/ (about 535 files; not opened).
- precomputed-pokemons.ts loader (not read).
- Rooms, matchmaking, services (listed only).
- Client pages and components beyond the grep matches (pages/component/wiki/, profile/, bot-builder/).
- Image contents of sprites, portraits, tilesets (sizes only, from the earlier audit).
- Sound and video contents.
