# smogon-pokemon-showdown (design catalogue, DC051)

Donor: `/mnt/frankendom-donors/smogon-pokemon-showdown` (VPS, read only). Battle simulator, data tables, rule overlays, text.
Which half: I read the **sim** half (battle queue, damage chain, modifier stack, PRNG) and the **data** half (species, items, tags, type chart, random-battle sets, text README, rule overlays). The **server** half (3.1 MB) was not read beyond folder names. The **client** repo (art, sound, UI) is linked from the README but is NOT in this box, so there are no sprites, sounds, shaders or camera code to read here.

Licence: code is MIT (`LICENSE` line 1: "The MIT License (MIT)"; copyright line 3). The species names, stats, move and item names and the text tables carry no licence in the box. The text README says text is "official where possible" and cites PokeAPI for translations (PokeAPI's licence is not in the box). Class C: inspiration in mood and shape only, never names or copied data. Code mechanisms may be adapted under MIT with the notice kept.

Rule for every idea below: recreate as a clearly distinct original, never a copy. Our own names, our own numbers, our own art. Roughly 20-30 percent resemblance in mood only.

## 1. Creatures and beasts

Counts (grep or parse, verified in this pass):
- 1518 keyed entries in `data/pokedex.ts` (top-level keys). 397 lines carry a `baseSpecies` pointer, so most of the table is forms (regional, Mega, Gigantamax, battle-only).
- 92 lines set `forme: "Mega"`; 34 entries carry `canGigantamax`.
- Tags (`data/pokedex.ts`, 160 entries carry a tags array): Sub-Legendary 46, Restricted Legendary 27, Mythical 26, Paradox 16 (plus True Past 16 and Pokestar 17 overlapping), Ultra Beast 11, one Past Unobtainable.
- Base-stat total, one parse of 1481 entries with a stat block (approximate, forms included): under 300 about 161; 300-399 about 300; 400-499 about 421; 500-599 about 406; 600-699 about 146; 700 and up about 47; one outlier entry above 1100.
- Evolution level field (`evoLevel`), one parse: most sit at 20-39 (about 273 entries), with a few at 50-60.

Families (by type, from one parse of `types` arrays; approximate, includes forms): 18 normal types, most common Water (about 208 mentions), Grass (178), Normal (171), Flying (155), Psychic (150); least common Ice (74). Type list lives in `data/typechart.ts` line 1 (19 keys: 18 types plus Stellar).

Escalation with level: random-battle sets give each species one `level` value between 64 and 100 (`data/random-battles/gen9/sets.json`, 509 species keys). Most species sit in the high 70s to late 80s. Level is a per-species field, not a curve.

Boss and elite pattern: no boss table in the box. The nearest pattern is the tag system: Legendary tiers are a tag, not a class. Gigantamax and Mega are alternative forms of an existing entry.

Top 8 striking (own labels):

1. **Temper Titan (top-tier phase).** A separate entry with a stat total far above the rest of the table (about 1125, HP 255 and defence 250; `data/pokedex.ts` 17252-17264). Why striking: a single form dwarfs the whole roster. Keep: a temporary top-tier phase as its own data entry with a pointer to the base creature. Change: our phase starts at a HP threshold, lasts a fixed turn count, and has a ground-shake tell; it is not an unobtainable entry.
2. **Variant-form swap.** Each base creature can have a Mega entry with its own stats and a `forme` tag (92 lines). Why: the transformation is data, one table entry. Keep: forme as an entry plus a base pointer. Change: swap is a state change mid-fight (engage is a state change), once per fight, costs a turn.
3. **Single-field extra form.** One field on the base entry unlocks an extra visual form and a signature move (34 entries; `data/pokedex.ts` 45). Keep: one flag gives a form. Change: our flag is a fight-meter threshold and the signature is a ground slam.
4. **Sub-Legendary tier.** 46 species carry a tier tag (`data/tags.ts` 42 defines the label). Why: tier is one tag that drives filters and presentation. Keep: tier as a tag. Change: tier sets spawn cap and reward in zone data (row 23 and row 18), with our own labels.
5. **Ultra-beast family.** 11 entries share one group tag (`data/pokedex.ts` 15302; `data/tags.ts` 50). Why: a small alien-looking family with its own tier. Keep: group tag. Change: our void family, own silhouette and palette.
6. **Past and future pair.** 16 Paradox entries plus True Past and Pokestar tags (`data/pokedex.ts` 18869, 18882 show the Paradox tag). Why: a pair that shares a body and differs by era. Keep: a pair sharing a family. Change: one creature with two modes picked at engage, one use per duel.
7. **Role card per creature.** Each species has 1-3 role cards (205 with one, 238 with two, 66 with three) with a move pool (10 roles, 879 role entries; `data/random-battles/gen9/sets.json` 6, 12). Why: a creature's behaviour is a short list of named stances. Keep: role lists per creature. Change: our stance names, shown as a telegraph before the stance changes (rows 2 and 7).
8. **One item, one forme.** A held item maps one base species to one Mega forme (`data/items.ts` 25). Why: a single map, no code per creature. Keep: the item-to-forme table. Change: a gear socket with a charge rather than a permanent swap.

## 2. Classes, races and factions

No classes, races or factions in the box. The closest analogues:

| label (ours) | source | size | role | signature mechanic | progression |
|---|---|---|---|---|---|
| Element | `data/typechart.ts` 1 | 19 keys (18 types + Stellar) | matchup | one damage-taken table per defending type | fixed, no progression |
| Battle role | `data/random-battles/gen9/sets.json` 6 | 10 roles | move-pool archetype | role name picks the move pool | per species level 64-100 |
| Rule overlay | `data/mods/` | 47 folders | rule-set theme | overlay replaces scripts and conditions | per format, not per player |

Battle roles, counts from one grep (set entries): Bulky Attacker 134, Fast Attacker 133, Setup Sweeper 128, Bulky Setup 118, Bulky Support 109, Wallbreaker 83, Fast Support 58, Fast Bulky Setup 43, Tera Blast user 38, AV Pivot 35.

## 3. Weapons

No weapon table in the box (grep for weapon families found none in `data/`). The nearest is held items (below). Weapon families: 0. Top 5 striking: none to list; I did not invent weapons.

## 4. Armour and gear

Items: 583 keyed entries in `data/items.ts` (top-level keys). Field counts (lines with that key): Mega-stone-style 93 (`megaStone`), Z-crystal 35 (`zMove`), plate 34 (`onPlate`, type-boosting items), memory 17 (`onMemory`), drive 4 (`onDrive`), berry 77 (`isBerry`), poke ball 28 (`isPokeball`); 282 items carry a `fling` field.

Tiers: none as a power ladder. Items are grouped by purpose, not tier. No rarity, no set bonus table found in the box (not checked beyond these field names). Visual tier: none in the box, since art is in the client repo.

Top 5 striking (gear-like):
1. **Socket for a forme.** Mega stones map one species to one forme (`data/items.ts` 25). Keep the map. Change: a socket with a charge, shown on the gear dressing (row 15).
2. **One-use power charm.** Items with a `zMove` field (35 lines; the field is read, its effect is not). Keep: one use per fight. Change: charge meter instead of a consumable slot.
3. **Type plate.** Plates set a move type (34 entries). Keep: a per-element tint item. Change: our element palette and a visible glow (see look 3 below).
4. **Element-swap disc.** Items with an `onMemory` field (17 lines). Keep: a change-of-element socket. Change: only in the Pit, not in zones.
5. **Thrown item.** The `fling` field gives an item a throw power (282 entries). Keep: an item has a use value beyond holding it. Change: a throw is a fight action with a stamina cost (row 3).

## 5. Zones and dungeons

No maps, biomes or dungeons in the box. Zone-like data is rule overlays and random-battle format folders:
- `data/mods/` has 47 rule overlays (folder names only read, plus three read in full detail).
- `data/random-battles/` has 20 format folders (gen1 to gen9 plus champions, factory and themed folders).
- `data/formats-data.ts` has about 1430 keyed entries and `data/rulesets.ts` about 162 (counts by key pattern, not every entry read).

Biome list: none. Hazards: rule-based, read through overlay names only (`sim/dex-conditions.ts` names only, not read).

Top 5 striking (rule-overlay archetypes):
1. **Random-roulette.** The overlay picks a generation at battle start (`data/mods/randomroulette/scripts.ts` 9: `this.gen = this.random(1, 10);`). Keep: encounter-time random pick from a list. Change: zone pick at spawn, shown as a banner, not a battle format.
2. **Monkey's Paw.** A status overlay (`data/mods/monkeyspaw/conditions.ts` 3, 18): confusion length is rolled between a minimum and 6 unless a luck flag is set. Keep: a luck flag that changes a timer roll. Change: a visible luck tell and a fixed cap for a fast duel.
3. **Sharing-is-caring overlay.** Overlay swaps rules for groundedness (`data/mods/sharingiscaring/scripts.ts` 4-8 region, `isGrounded`). Keep: one rule file per zone overriding a shared base. Change: zone data field, not a script.
4. **Passive-aggressive overlay.** Overlay with its own items and moves files (folder listing only). Keep: rule themes as folders. Change: our zone themes as data with a fight modifier.
5. **Biomechmons overlay.** Overlay with items and moves files (folder listing only, not read). Keep: a theme folder that bundles a few overrides. Change: our biome as data (row 23 coverage).

## 6. Item and effect looks worth recreating

No art, shaders or particles in the box (client repo not present). These are data-level looks:

| label | technique | ref |
|---|---|---|
| Forme swap as data | separate entry with a base pointer; art lives in client | `data/pokedex.ts` 51 (Mega forme), 17252 (titan form) |
| Form flag | one field on the base entry | `data/pokedex.ts` 45 |
| Placeholder battle text | bracket placeholders with grammar modifiers, one template per message | `data/text/README.md` 38 |
| Element tint | one damage-taken table, one tint per type | `data/typechart.ts` 1 |
| Charge socket | item-to-form map, no code per creature | `data/items.ts` 25 |

## 7. Inspiration for Frankendom

Each original is a clearly distinct idea, not a copy of any Pokemon creature, name or art.

1. **Temper Titan.** A boss enters a temporary maximum-stat phase at a HP threshold. Keep the separate form entry with a base pointer and the stat ceiling. Change: a ground-shake tell, a fixed turn count, and a fight-only form (never a permanent entry). Rows 4 and 17.
2. **Two-Era Twin.** One fighter with two modes sharing a body, chosen once at engage. Keep the paired family tag. Change: silhouettes that differ at 375 px, one use per duel. Rows 1 and 13.
3. **Stone Socket.** A held gear socket where one item unlocks one form for the fight. Keep the item-to-form map. Change: a charge cost and a visible socket in the gear dressing. Rows 15 and 18.
4. **Duel Tie Shuffle.** An action queue sorted by order, then priority, then speed, with a seeded random tie among equal actions. Keep the sort and the seeded tie. Change: tie keyed to latency bucket, shown as a tell in the fight replay. Rows 1 and 19.
5. **Narrow Damage Band.** A random band from 85 to 100 percent applied after crit and before type. Keep the order of steps and the narrow band. Change: band per weapon class, a faint bar on the hit impact instead of a hidden roll. Row 10.
6. **Role Card Boss.** Each enemy has two to four named stance cards chosen at spawn. Keep the role list per creature. Change: our own stance names, shown as a telegraph. Rows 2 and 7.
7. **Tier Badge Spawns.** A tier tag (sub-legendary, mythical, ultra-beast) controls spawn cap and grace timer in zone data. Keep the tag-to-tier mapping. Change: our tier names and numbers. Row 23.
8. **Fixed-point Modifier Stack.** Named multipliers in integer steps with one rounding per step, in a fixed event order. Keep integer maths and one rounding. Change: 1000ths scale and a cap of three entries for the 375 px readout. Row 18 (buff stack).

## Sim mechanics read (checked in this pass)

- Action queue: sorted by order (lower first), then priority (higher first), then speed (higher first); ties among equal actions are placed at a random index (`sim/battle-queue.ts` 18-21, 390-401). The full comparator in `sim/battle.ts` 408 also adds subOrder and effectOrder after speed. The audit's earlier summary left those two out; this is corrected here.
- Modifier stack: each step is converted to a 4096ths integer, multiplied, rounded once with a half step, and shifted back (`sim/battle.ts` 2309-2322, function `chain`).
- Damage: crit multiplies first (`sim/battle-actions.ts` 1736-1742), then the random factor `100 - random(16)` percent is applied (`sim/battle.ts` 2397), then STAB and type. Crit divisor table is fixed (`sim/battle-actions.ts` 1614).
- PRNG: a seeded generator documented as emulating a cartridge generator; with a seed plus decisions the input log replays a fight (`sim/prng.ts` 5-8).

## Not read

Server half (except folder names). Client repo (absent from box). `sim/dex-conditions.ts` and most of `data/conditions.ts` (names only). Translation bodies in `data/text/*/` and `translations/*/` (folder counts only: 8 text languages, 11 translation languages plus an English template). Random-battle set bodies beyond the first entries and the role counts. Learnset and move bodies. Mod folders other than the three read (monkeyspaw, randomroulette, sharingiscaring). `config/` (names only). `databases/` (names only).

## Reuse tag

Shape and mechanisms only (MIT code may be adapted with the notice kept). Creature and item content: class C, category level and our own labels only.

## Brief rule served

Every idea above is kept at mechanism level and recreated under our own names; the traits kept and changed are listed per item.
