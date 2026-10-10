# crawl-crawl (Dungeon Crawl Stone Soup): creature-grammar (CG001)

Donor root (VPS, read-only): /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/
Depth: full for the monster data and the derived-undead and population rules; thin for the rendering and spell halves.
Half read: both, in part. Data half: dat/mons/*.yaml (689 files, all counted; 4 to 8 read in full). Game-logic half: mon-flags.h, mon-pick-data.h, mon-death.cc (targeted lines only).
Not in the half I read: tile rendering (the tile lookup that resolves a monster's art), spell tables for the serpent variants, and audio (the tree has no audio files, per the asset audit AU011).

## 1. What the player sees and feels (375 wide)

Creatures are single tiles on a 32-pixel grid, read by silhouette and tint, not by detail. A family of eight same-stat creatures (the draconians) reads as one body in eight colours: each one has the same hit dice and hit points, and differs in colour, one resistance, and one damage or shape change. A boss that appears in four variants (the serpent line) looks the same size and has the same hit points in each, but its bite is a different element and its spell list changes. Uniques are flagged and some use a taller frame, so a big creature reads as bigger. When a creature dies, it can leave a derived undead of the same body with a prefix name, so a dead ogre can come back as a "zombie" version of itself.

## 2. Why it works / is striking

- Readable silhouette at 375: the 32-pixel base grid is a small, consistent size. Taller frames (17 files carry the tall-tile flag) read as bosses.
- One signature behaviour: the serpent variants each have a different bite element and a reach-2 bite on one variant (serpent-of-hell-dis.yaml); this is a behaviour change, not a new sprite.
- One signature sound or effect: none read. The data gives a shout field with 27 distinct values (roar, hiss, moan, buzz, screech, and more), which is a text or voice tag. No audio files exist in the tree.
- Could be ours at 20-30 percent resemblance: yes. The family-by-body rule and the one-trait-swap rule are generic design.

## 3. The rule behind it

### Family key: the genus field
- 689 monster files in dat/mons/. 255 carry a genus field; 55 distinct genus values. 434 have none (standalone creatures).
- Largest genus groups by file count: dragon 19, golem 15, plant 14, giant 14, jelly 13, wraith 11, snake 9, spider 8, fungus 8, draconian 8, hound 7, giant_lizard 7, frog 7, elemental 7.
- Derived-undead flags: M_NO_ZOMBIE (flesh cannot make zombies), M_NO_GEN_DERIVED (38 files flagged no_gen_derived, so they are never randomly generated as derived undead), MF_NAME_ZOMBIE (the prefix name replaces the family noun for an already-zombified monster). Flags in mon-flags.h lines 140-156 and 284-290.

### The 8-colour family (draconians): same stats, one trait swapped
Files: dat/mons/{black,green,grey,pale,purple,red,white,yellow}-draconian.yaml (genus: draconian).
- All eight: hit dice 14, hp_10x 980.
- Exp value varies 997 to 1054.
- One resist per colour: black elec 3 (black-draconian.yaml line 4 reads "resists: {elec: 3}"); green poison 1; pale steam 1; red fire 1; white cold 1; yellow corr 1. Grey and purple have no resist.
- Damage: 20 on seven of eight; grey is 25.
- Shape: black is winged-and-tailed; the other seven are tailed.
- Tile field: all eight carry "tile: program_bug" (black-draconian.yaml line 20). I did not read the tile lookup, so I cannot say whether that is an alias or a placeholder.
So a family of eight can differ by colour, one resist, one damage change and one shape flag, with the stat row shared.

### The ancestor set: one body, job overlay
- Three files (dat/mons/ancestor-elementalist.yaml, ancestor-hexer.yaml, ancestor-knight.yaml; genus line at ancestor-knight.yaml line 7). All hit dice 1, hp_10x 1, exp 1, the same glyph, and a different colour per file. The name is the job. This matches the job-overlay note in the asset audit.

### The serpent boss: four variants, one stat block
Files: dat/mons/serpent-of-hell.yaml, serpent-of-hell-cocytus.yaml, serpent-of-hell-dis.yaml, serpent-of-hell-tartarus.yaml. All carry species: serpent_of_hell and genus: dragon. Each has its own spells file (serpent-of-hell-dis.yaml line 20 reads "spells: serpent_of_hell_dis"). The dis variant has hp_10x 3230, hit dice 17, exp 6666 (I read the dis file in full; the other three I checked only for bite, spell and resist lines).
- Bite element swaps: fire, cold, drain, and a plain bite (the dis variant).
- Resists swap per variant (for example poison 1 on all four; fire 3 on the fire variant; cold 3 on the cold variant).
- Dis variant has reach 2 on its three bites.
So a boss is one body and one stat block, and four variants swap the bite element, the resists and the spell list. This is the boss-elite-pattern.

### Dragon genus as a stat ladder
- 19 files in the dragon genus. hit dice run from 4 (steam dragon) to 20. hp_10x runs from 275 (acid dragon) to 3230 (serpent variants). Each dragon has a different resist mix (fire 2 with cold -1 on one; poison 1 on most).

### Population tables: depth-banded weights
- mon-pick-data.h: population rows are {min depth, max depth, weight, shape, monster}. 1,062 rows match the row pattern: shape FLAT 532, FALL 174, SEMI 152, RISE 108, PEAK 96. Example row: {5, 15, 500, FLAT} for one creature (mon-pick-data.h line 1217).
- The shape names suggest a weight curve over depth. I did not read the code that applies the curves (mon-pick.cc, 300 lines, not read).
- Zombie population is a separate table (pop_generic_late_zombie, line 1211). Its comment says the table starts with depth-1 Crypt monsters because of how zombie picking works.

### Derived undead: same body, new prefix
- _make_derived_undead (mon-death.cc line 1551) builds a zombie-type copy from a dying creature. It calls name_zombie_from_mon (line 1609). I did not read the body of name_zombie_from_mon.
- Flag MF_NAME_ZOMBIE (mon-flags.h line 288) marks a creature whose name uses the zombie prefix.

### Tall-tile unique
- M_TALL_TILE flag (mon-flags.h line 140). 17 files have tall_tile (the serpent dis file has it at line 4).
- 99 files carry the unique flag.

### Data fields (designer-tunable)
- family_key: genus (donor: 55 values; unit: label).
- family_size: 8 (donor draconian; unit: count).
- trait_swap_per_variant: 1 resist plus 1 shape or damage change (donor pattern; unit: trait).
- boss_variant_count: 4 (donor serpent; unit: count).
- population_depth_band: min, max (unit: zone depth).
- population_weight: integer (donor values, e.g. 500 for one creature in one band; donor null because GPL data is not MIT/Apache/BSD).
- derived_undead_chance: not read (the rolling code was not read).
- tall_frame_flag: boolean (donor 17 of 689 files).

## 4. For Frankendom

- The genus field is our family key. Twelve families, each a shared stat row; a creature is a row with a colour, one resist, one shape flag. That is our version of the draconian eight.
- The boss rule: one Pit creature plus four variants, same stat row, each variant swapping the bite element, the resists and one spell. This is how 100 Pit creatures can carry 700 zones: a zone is a data row that picks a variant.
- The population table is our zone spawn table: rows of depth band plus weight plus creature, one row per (zone band, creature). Keep it as data (700 zones as rows), not code.
- Derived undead maps to "a fallen family member returns as a lesser variant", with a prefix name that replaces the family noun. Server-verified: the server emits the derive event; the client shows a prefix card.
- Keep: one stat row per family; one swapped trait per variant; the variant table; the tall-tile frame for uniques (ties to the 32x48 boss frame in the asset audit).
- Change: the 8-colour family uses an identical hit-dice row, which will read as copies in a 100-creature list. Vary the stat row by one step per variant. Do not use a placeholder tile name; ship real art for every variant. Do not add a free-form shout voice (we have no audio yet); use a text tag.

## 5. A 5-minute look test Dom can judge on a phone

Build one strip at 375 wide, from our own art, with two rows:
1. Eight recoloured mooks of one family, same silhouette, one trait icon each (a resist badge on six of them, one shape flag on one). Dom says whether they read as one family at a glance.
2. One boss in four variants at the same size: same silhouette, four element tints, one spell tag each. Dom says whether it reads as one boss with four elements, not four bosses.
No release rows; a preview page only.

## 6. Licence and IP

- Code: GPL v2 or later (LICENSE, and README.md states "Crawl is licensed as GPLv2+"). Do not paste code into a non-GPL repo; re-implement from the idea.
- Data under dat/ (monster yaml, vault maps, descriptions): covered by the general GPLv2+ statement only; there is no separate data licence. Use the ideas, never copy the yaml or names. Our names are original.
- Tiles: mostly CC0 with RLTiles public-domain tiles, some modified; per-tile authors are not in the repo; title art, icons and DejaVu fonts have no licence stated (asset audit AU011).
- Category-level only for any art cue: "a plated beetle", "a winged humanoid", never a specific tile or sprite.
- No legal conclusions.

## 7. Gaps

Not read: tile rendering and the tile lookup (625 of 689 yaml files have no tile line, and I did not read how those resolve); the spell tables for the serpent variants (in C++ source, not read); mon-pick.cc (300 lines) and the weight-curve code; name_zombie_from_mon body; dat/species (49 files, names listed only); dat/descript monster descriptions (not read); dat/jobs (not read); the other three serpent yaml files beyond bite, spell and resist lines; the speed field (254 files carry it; not tallied).

Half read: both, in part (data, plus targeted game-logic lines). Render and audio halves not read.
