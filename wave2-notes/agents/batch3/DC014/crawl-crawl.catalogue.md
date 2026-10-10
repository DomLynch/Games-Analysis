# crawl-crawl (Dungeon Crawl Stone Soup): design catalogue (DC014)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/` (read-only on the VPS). Source tree is `.../crawl-ref/source/` below. Code licence GPLv2+ (per the asset audit AU011, README line 96; not re-read here).
Half read: **both halves are in this one repo**. Engine = `source/*.cc|*.h` (read for the spawn, colour, gear and branch mechanisms). Data pack = `source/dat/` (yaml monster, species and job tables; `des` vault files; `descript` text; counted, not read in full). No separate server or client half. No paired donor found: the box root holds no other Crawl folder.
Rule: recreate as a clearly distinct original, never a copy. Trait KEPT and trait CHANGED are named on every brief. Mood resemblance only, about 20-30 percent. Labels below are our own. No lore text, no stat blocks, no art colour codes are copied.
Silhouette judgement is from the shape and flag fields, not from pixels (no tile PNG was viewed).

## Counts (all verified by ls, grep or wc on the VPS, this session)
| Item | Count | How counted |
|---|---|---|
| Creatures | 676 | 689 yaml in `dat/mons/`, minus 13 `TEST*`, `sensed-*`, `player-*` helper files. Includes some scenery objects (statues, bushes, boulders), not separated. |
| Classes (backgrounds) | 28 | `dat/jobs/*.yaml`, 6 categories |
| Species (races) | 35 | `dat/species/*.yaml` minus 13 `deprecated-*` (7 base + 8 draconian colours + 20 others) |
| Weapons (base rows) | 61 | `Weapon_prop[]` rows, `source/item-prop.cc` 500-854 (some rows are version-guarded legacy) |
| Armour (base rows) | 23 | `Armour_prop[]` rows, `item-prop.cc` 116-311 (includes shields, orbs, barding) |
| Gear sets | 10 | dragon-scale tiers, `item-prop.cc` 285-303. No set-bonus system was seen in the reads (not searched). |
| Artefacts (unrand) | 153 | `source/art-data.txt`: 155 `NAME:` rows, 2 are DUMMY placeholders |
| Zones (branch rows) | 60 | `source/branch-data.h`. Some ids repeat across portal rows (for example two Depths, two Gauntlet, two Necropolis, two Gulch rows), so the distinct count is not taken. |

## 1. Creatures and beasts
Family grouping by name pattern (overlapping, approximate; not a code taxonomy):
- Dragons, drakes, wyverns, hydras: about 23 files. Named dragons: 14 files (acid, bone, base, fire, golden, ice, iron, komodo, pearl, quicksilver, shadow, steam, storm, swamp).
- Draconians: 15 files (base, knight, monk, scorcher, shifter, stormcaller, annihilator, plus 8 colours).
- Undead (zombies, skeletons, ghouls, wraiths, liches, vampires, mummies, ghosts): about 30.
- Demons, fiends, imps, devils, hell creatures: about 36.
- Humanoid races and beast kin (elves, merfolk, nagas, centaurs, trolls, ogres, orcs, goblins, kobolds, gnolls, spriggans, tengu, minotaurs): about 73.
- Constructs, crystals, statues, orbs: about 34 (ironbound 6, jade crystals 4).
- Arachnids and insects: about 29. Plants and fungi: about 20. Reptiles, amphibians, jellies, slimes: about 38. Elementals: 8. Golems: 5.

Holiness tags (tag lines, one file can carry several): nonliving 135, undead 79, demonic 73, plant 27, holy 11, natural 6. 99 files carry the `unique` flag; 189 carry `flies`; 52 carry a `tile_variance` (cycle 14, mod 19, random 9, water 10). Body shape is humanoid 286, misc 114, quadruped 45, orb 36, winged quadruped 26, snake 25.

Hit-dice escalation: normal creatures run from 0 to about 30. Four TEST and god-wrath entries carry an outlier value and are excluded from the read.

How escalation is driven (engine, `source/mon-pick-data.h` and `source/random-pick.h`):
- Population is a depth table per branch: rows of `min depth, max depth, weight, shape, monster`. Shapes: FLAT (full chance across range), SEMI (50 percent at the ends), PEAK (0 percent just outside, about 20 percent at the ends), RISE and FALL (linear ramps).
- Example: the fire dragon row is FLAT over depths 0-5 with weight 295 (`mon-pick-data.h` line 20). Dragons are an early-depth population in that table, not a late reward.
- Out-of-depth: 14 in 100 chance per placement. Span equals the depth (capped at 5 from depth 5 on); depth 1 has none. Only upward fuzz is applied (`mon-place.cc` 205-235).
- Bosses: named uniques (99 files) and the guardian sphinx row (depths 0-13, SEMI, `mon-pick-data.h`). Vault placement lives in `dat/des/` (not read in depth).

Spawns over time (`mon-place.cc` 255-291, `timed-effects.cc` 432-443): the timed spawner returns early unless the player is on an orb run, in the Abyss or in Pandemonium. Normal levels get no timed wanderers; population is fixed at generation. Abyss uses rate 5 (double with a passive) and ramps after depth 5. Orb runs use 18 (36 with a passive).

Top 8 most striking (silhouette from shape tag, one signature behaviour, one effect):
1. **Giant winged elemental** (label: Elemental wyrm). Why: winged giant quadruped, one element per body, breath as the signature spell, FLAT early population. Keep: winged quadruped silhouette, one element per colour, breath as a spell with a clear telegraph. Change: body proportions (not a dragon), element set, breath shape and telegraph timing. Ref: `dat/mons/fire-dragon.yaml` (shape line 21, spells line 16); `source/mon-pick-data.h:20`.
2. **Skeletal winged flyer** (label: Bone wyrm). Why: undead tag on a giant flyer reads as a skeleton at a glance. Keep: undead holiness, winged silhouette, large-scale size. Change: no see-invisible requirement, our own bone pattern and wing construction. Ref: `dat/mons/bone-dragon.yaml` (holiness line 7).
3. **Undead caster immune to mind magic** (label: Hollow sovereign). Why: "will invuln" makes it a pure damage check, a clear read for a boss. Keep: undead caster, uncancelable will, speech on alert. Change: our own abilities and silhouette (robes to armour). Ref: `dat/mons/lich.yaml` (holiness, will invuln).
4. **Clan of colour variants of one body** (label: Clan of eight drakes). Why: one body, eight colour variants, each with one breath type as a "fake mutation". Keep: palette plus one trait per variant. Change: our breath types, clan names, silhouettes per clan. Ref: `dat/species/draconian-red.yaml` (line 40, combustion breath); `dat/mons/*draconian*.yaml` (15 files).
5. **Construct warrior with a spell specialism** (label: Iron warden). Why: six ironbound variants each carry one spell set (frostheart, thunderhulk and others), so one body reads as several roles. Keep: construct silhouette, one role per variant. Change: our crafting flavour and spell names. Ref: `dat/mons/ironbound-thunderhulk.yaml`, `dat/mons/ironbound-frostheart.yaml`.
6. **Crystal elemental avatars** (label: Shard elemental). Why: four elemental crystal forms (names carry the element); the fire form is flagged unblindable and avatar (the other three flags not checked). Keep: one crystal identity per element, unblindable. Change: shape (faceted shard, not a face), element palette. Ref: `dat/mons/jade-crystal-fire.yaml` (flags line), plus the ice, earth and air files.
7. **Tall many-headed unique** (label: Hydra of the mere). Why: unique, tall_tile flag (17 files carry it), fast regen, a clear boss read. Keep: tall boss frame, regeneration as the pressure. Change: head count, regen rule (for example regen stops while hit), our frame size. Ref: `dat/mons/lernaean-hydra.yaml` (flags line 3).
8. **Moving orb hazard** (label: Rolling ember). Why: orb shape, projectile and insubstantial flags, random sprite variance, no threat flag: it reads as a hazard, not a target. Keep: ball silhouette that is a hazard, random tile variance. Change: our telegraph and colour (no copy of the orb art). Ref: `dat/mons/orb-of-destruction.yaml` (flags, tile_variance: random).

Boss and elite pattern: named elites take signature gear drops. Two named monsters drop dragon-scale armour by a weighted table (`source/mon-gear.cc` 2090-2092). Seraphs are given pearl or fire scales (`mon-gear.cc` 2138). Keep the "elite drops its own gear type" link. Change the drop tables to our tiers.

Not read: monster AI (`mon-behv.cc`, `mon-act.cc`), dragon breath effects (`spl-*.cc`), death and corpse presentation (`mon-death.cc`), boss intros, vault placement `.des` files.

## 2. Classes, races and factions
Backgrounds (28, six categories). Signature is read from the job yaml (spell list and skill keys), not from play code. Entries with no spell list show their skills only; their mechanic is not read.
- Warrior (5): Brigand (fighting, dodging, stealth, throwing, weapon); Fighter (armour, shields); Gladiator (throwing); Hunter (stealth, weapon); Monk (dodging, weapon). Progression: skill-led, no spells.
- Zealot (3): Berserker (fighting, weapon, dodging); Chaos Knight (armour, weapon); Cinder Acolyte (one fire spell, scorch).
- Adventurer (3): Artificer (evocations, armour); Delver (stealth, weapon); Wanderer (no skills listed).
- Mage (10): Air, Earth, Fire, Ice Elementalist (element conjurations, element spells such as shock, sandblast, foxfire, freeze); Alchemist (poison and sticky-flame spells); Conjurer (magic dart, searing ray, prism); Forgewright (grapnel, spike launcher, clockwork bee, golem and lightning-spire spells); Hedge Wizard (blink, imp call, grave claw, cloud); Necromancer (soul splinter, grave claw, drain, animate dead, agony curse); Summoner (summons: mammal, imp, familiar, crocodile, seismosaurus egg).
- Warrior-mage (4): Enchanter (hibernation, confusing touch, dance, gloom); Hexslinger (jinxbite, sigil of binding, cause fear, bullseye); Reaver (kiss of death, momentum strike, hailstorm, rending blade); Warper (blink, beckoning, teleport other, piledriver, electric charge).
- Metamorph (3): Mystic (fire, earth, air, ice and shapeshifting skill; spells include ice thorns, sirocco, dragon veins); Shapeshifter (unarmed, shapeshifting); Stalker (stealth, shapeshifting, weapon).
Progression shape: each job has a category priority and recommended species; skills rise with use (not traced in code).

Races (species, 35): Difficulty tiers Simple 9, Intermediate 9, Advanced 9 (includes base draconian counted as Simple), 8 draconian colour variants with no tier field. Notables: Demigod (Advanced), Djinni, Felid, Formicid, Gale Centaur, Naga, Octopode, Mummy, Poltergeist, Revenant, Vine Stalker. Mutations appear in 43 species files (the `mutations:` key). Draconians: each colour variant adds one breath as a fake mutation.

Factions and gods: not read (god and religion data is in `dat/descript/gods.txt`, counted only).

## 3. Weapons
Base table (61 rows, `item-prop.cc` 500-854) grouped by the code's own headers:
- Maces and flails (club, whip, mace, flail, morningstar, great mace, dire flail, eveningstar, giant clubs, sacred scourge).
- Short blades (dagger, rapier, short sword, athame, quick blade, cutlass, falchion, scimitar line).
- Long blades (long sword, great sword, double and triple sword, blessed variants).
- Axes (hand axe, war axe, broad axe, battleaxe, executioner's axe).
- Polearms (spear, trident, halberd, partisan, glaive, bardiche, trishula, lajatang).
- Staves (magical staves use their own stats row).
- Ranged (bows, crossbows, slings, blowgun, hand cannon). The code lowers hand-cannon weight on purpose, so it appears late.
Special properties: each base weapon has a weighted brand list (the `*_BRANDS` tables). Whip example: normal most common, then venom and electrocution, then draining, freezing, flaming, vampirism (`item-prop.cc` 505-520, brand line 516). So a base weapon is a family with a weighted elemental roll, not a fixed element.
Visual tiers: each weapon has an item tile (in `rltiles/item/weapon/`, not viewed). Artefacts get their own tile folder (`art-data.txt` line 36).

Top 5 striking (one signature each):
1. **Weighted-brand whip** (label: Lash of many humours). Keep: one base shape with a weighted elemental roll. Change: our brand set and our weights (no copy). Ref: `item-prop.cc` 505-520.
2. **Twin-blade double sword with set spread** (label: Twinned blade). Keep: double and triple sword as a line of heavier forms. Change: silhouette and attack pattern. Ref: `item-prop.cc` Weapon_prop rows (double, triple).
3. **Dark maul line** (label: Ember maul). Keep: great mace weight class for heavy visual read. Change: our glow and tip. Ref: `art-data.txt` artefact rows for great mace (colour token shown in section 6).
4. **Ranged weight throttle** (label: Late-game cannon). Keep: a designed late-appearance weight for a strong ranged tool (code comment, `item-prop.cc` 311-312). Change: our unlock rule. Ref: `item-prop.cc` 311-312.
5. **Artefact tile per weapon class** (label: Named blade line). Keep: each artefact has its own tile and colour token (`art-data.txt` 10 and 36). Change: our naming and palette. Ref: `art-data.txt`.

## 4. Armour and gear
Base body ladder (armour base rows, `item-prop.cc`; the three numbers per row are AC, EV penalty and shop price, per the `armour_def` comments at line 57 onward):
- Animal skin (AC 2, EV 0, price 3) at `item-prop.cc` 118.
- Robe (AC 2, EV 0, price 9), leather (AC 3, EV -40, price 20), ring mail (AC 5, EV -70, price 40), scale mail (AC 6, EV -100, price 40), chain mail (AC 8, EV -140, price 60), plate (AC 10, EV -180, price 180) are the next rows in the same table (plate is at `item-prop.cc` 147).
- Crystal plate (AC 14, EV -230, price 600) at `item-prop.cc` 149. This is the top of the base ladder.
- Shields: buckler (AC 3), kite (AC 8), tower (AC 13).
Material tiers in plain terms: cloth (robe), hide and leather, mail rings, plate, crystal plate. Mythic metals appear through artefact colour tokens (section 6), not as separate base types.

Dragon-scale ladder (`item-prop.cc` 285-303, one row per scale type; columns: AC, EV penalty, shop price, one property):
- Steam (AC 5, EV 0, price 375): steam resist.
- Acid (AC 6, EV -50, 400): corrosion resist.
- Swamp (AC 7, EV -70, 450): poison resist.
- Quicksilver (AC 9, EV -70, 500): willpower.
- Fire (AC 8, EV -90, 500): +2 fire resist, cold weakness.
- Ice (AC 9, EV -110, 500): +2 cold resist, fire weakness.
- Pearl (AC 10, EV -110, 1000): negative-energy resist.
- Storm (AC 10, EV -150, 650): electricity resist.
- Shadow (AC 11, EV -150, 575): stealth.
- Golden (AC 12, EV -230, 800): fire, cold and poison resist.
Each tier trades AC up against an evasion cost, and most carry exactly one property (golden carries three; fire and ice pair a resist with a weakness). Shop price is not monotonic in AC: pearl (AC 10) is the most expensive at 1000.
Mapping: monsters carry hides by species (`_monster_hides`, `item-prop.cc` 1347-1360; the dragon rows at 1352-1356).

Top 5 striking (one signature each):
1. **Dragon-scale ten-tier set** (label: Scale ladder). Keep: AC up, evasion down, one property per tier. Change: our tier count, our names and property set, no set bonus needed. Ref: `item-prop.cc` 285-303.
2. **Trade-off ladder** (label: Plate-or-agility curve). Keep: base body ladder where each step costs evasion (EV -40 to -230). Change: our curve and the stealth or speed trade. Ref: `item-prop.cc` 118-149.
3. **Boss-drop scale type** (label: Warlord's scale). Keep: a named elite drops one scale type from a weighted table. Change: our tables and our elite names. Ref: `source/mon-gear.cc` 2090-2092.
4. **Plain and ornate armour pair** (label: Plain and gilded pair). Keep: the plain-for-play, ornate-for-display pattern (AU011 names the acid dragon armour and its art variant in `rltiles/item/armour/`, not viewed). Change: our trim and palette.
5. **Shield as a heavy class** (label: Tower bulwark). Keep: a tower shield as the heaviest shield (AC 13, large EV cost, from the base table). Change: our silhouette and our cost numbers. Ref: `item-prop.cc` (tower shield row, base table).

## 5. Zones and dungeons
Branch rows (60) each carry: parent branch, depth range, floor colour, rock colour, ambient noise (normal, quiet or loud), a monster die size, rune, travel shortcut, and an escape feature (`source/branch-data.h` 16-80 header and rows).
Biome archetypes (names from the branch enum, `source/branch-type.h`):
- Water: Swamp (loud ambient, die size 8 at line 81), Shoals (loud, line 90).
- Lair and monster-den branches: Lair, Snake pit, Spider nest, Slime pits (quiet, die size 7, line 117), Orc and Elf halls, Dwarf.
- Undead and bone: Crypt, Tomb (quiet, line 155), Necropolis, Ossuary.
- Deep and vault: Vaults, Blade, Depths (with Zot as a sub-branch), Forest.
- Hell: Vestibule and four hell branches (Dis, Gehenna, Cocytus, Tartarus). A hell die-size constant of 6 exists (`branch.h` 45); which hell rows use it was not checked.
- Endless and special: Abyss (spawn rate ramp), Pandemonium, Ziggurat (its item colour follows the zig ladder, section 6), Labyrinth, Bazaar, Trove.
- Portal zones (`dat/des/portals/`, 15 files): Arena, Bailey, Bazaar, Crucible, Desolation, Gauntlet, Gulch, Ice cave, Necropolis, Ossuary, Sewer, Trove, Volcano, Wizlab, Ziggurat. Sewer is a portal zone, not an undead one.
Hazards seen in code: lava and deep and shallow water (the vortex colour function names them, `colour.cc` 279-300), and a per-branch escape feature. Traps are data in `dat/des/traps/` (not read).
Ambient sound: each branch has a noise level (`branch.cc` 275-285: normal 0, quiet negative, loud positive). This is the only audio hook seen in this read; it is a loudness offset, not a music or bed file (no audio files in the tree, per AU011).
Dungeon archetypes: vault stamps are ASCII maps in `dat/des/` (arrival rooms in `dat/des/arrival/`, altars in `dat/des/altar/`). Counted in AU011, not read here.

Top 5 striking:
1. **Shoals** (label: Tide flats). Loud ambient and water hazard. Keep: a loud water zone that reads as hazard. Change: our water rules and fog. Ref: `branch-data.h` line 90.
2. **Swamp** (label: Reed fen). Loud, die size 8, poison-leaning. Keep: loud, dense fen. Change: our swamp palette and vines. Ref: `branch-data.h` line 81.
3. **Slime pits** (label: Ooze cellar). Quiet, die size 7: a zone where sound drops out, a pressure cue. Keep: quiet-as-threat. Change: our cue. Ref: `branch-data.h` line 117.
4. **Abyss ramp** (label: Rising void). Spawn rate 5 and a ramp after depth 5 (`timed-effects.cc` 443-446). Keep: pressure that grows with time in the zone. Change: our rate and cap. Ref: `mon-place.cc` 271-291.
5. **Ziggurat colour ladder** (label: Milestone spire). The ziggurat item's colour changes as milestones complete. Keep: visible progress through colour. Change: our milestones and tokens. Ref: `items.cc` 4167 and 4294.

## 6. Item and effect looks worth recreating
1. **Per-cell animated element colour (waves, disjunction, orb pulse)**: colour is a function of position and time, not a texture. Waves: a band moves with turn count mod 20 (`colour.cc` 165-175). Disjunction: a radial swirl phase (`colour.cc` ~200-236, `get_disjunct_phase`). Orb glow: a ring that ripples outward from the player, bit 4 of (frame minus 2/3 of distance) (`colour.cc` 299-304). Ref: `source/colour.cc`.
2. **Hashed colour variance**: each cell's colour is seeded from birth time, position, frame and depth (`colour.cc` 51), so a random look stays stable across frames. Ref: `colour.cc` 47-55.
3. **Four-phase elemental cycle**: a creature or cell cycles earth, air or lightning, magma, ice every 200 elapsed units (`colour.cc` 176). Ref: `colour.cc` 174-195.
4. **Milestone colour ladder**: one item colour climbs bone, shimmer blue, magic, flash, jewel at 1, 3, 9 and 27 completed milestones (`items.cc` 4164-4172, used at 4294). Ref: `source/items.cc`.
5. **Metallic and gold tokens**: artefact colour tokens include gold (7 artefacts), silver (5) and iron (2) in `art-data.txt` COLOUR rows (for example line 998 for shimmer blue). Steel appears in the gem colour map (`items.cc`). These are palette tokens, not separate materials. Ref: `source/colour.h` 40-45; `source/art-data.txt`.
6. **Aura refresh**: a monster aura re-sets a short status each tick (base duration 1 in the table) and overrides a shorter one rather than stacking (`mon-aura.cc` 238). Hostile auras stop when the source stands in a sanctuary (`mon-aura.cc` 215). The phalanx barrier aura is adjacent-only and protects only its summoner. Ref: `source/mon-aura.cc`.
7. **Tile variance as idle motion**: 52 monster files set `tile_variance` to cycle, mod, random or water (`dat/mons/README.md` for the field; `dat/mons/orb-of-destruction.yaml` for random). Ref: `dat/mons/README.md`.
8. **Tall boss frame**: 17 monsters carry `tall_tile` so bosses read as bigger (`dat/mons/lernaean-hydra.yaml`). The 32-pixel base grid is from AU011.

## 7. Inspiration for Frankendom (originals, not copies)
1. **Scale Ladder** (ten-tier scale set). Keep: AC up, evasion down, one property per tier. Change: our tier names, property set, price curve, and a visible tier bump on the hero (not a copy of any scale name).
2. **Milestone Relic** (an item that changes colour as zones are cleared). Keep: thresholds at 1, 3, 9, 27 completions. Change: our milestones (zone clears, bosses), our palette, and a sound cue on each step.
3. **Ripple Ward** (an orb or relic that pulses in rings from the hero). Keep: phase delayed by distance, so the pulse travels. Change: 3D rings sized for 375 px, and a slower pulse for calm states.
4. **Clan of Breath** (one humanoid body, several colour clans, each with one breath element). Keep: one body, colour as trait. Change: our elements, our silhouettes per clan, and our breath telegraph.
5. **Depth Table** (per-zone encounter tables with FLAT, SEMI, PEAK, RISE and FALL weights). Keep: distribution shapes per monster and depth. Change: our weights, our zone data fields (cap, respawn, grace), and row 23 of the parity checklist. This is the spawn-density idea, not a copy.
6. **Halo Sight** (a see-through halo at the hero for occluders). Keep: radial alpha falloff, radius cap. Change: an elliptical iso falloff and a fade time we tune for the fight camera (row 11).
7. **Palette Dye** (recolour gear by the red channel into a 32-entry palette, with a grey-only hue mode and a ghost mode). Keep: one shader, grey-only hue, ghost mode at 0.5x or 1.5x brightness. Change: our palette and ghost look. Ref: crossuo `ShaderData.h` (listed in the crossuo catalogue), not crawl.
8. **Refresh Aura** (a boss aura that refreshes rather than stacks, suppressed in a safe zone). Keep: refresh, not stack; sanctuary suppression. Change: our aura radius, our safe-zone rule, our status names.

Dom's rule applied to each: clearly distinct original; KEEP and CHANGE named above.

## Licence note
Code GPLv2+. Data in `dat/` is covered by the same general GPLv2+ statement (per AU011). Tile art is mostly CC0 or public domain per LICENSE and `rltiles/license.txt` (per AU011). Use shape and mechanism only. No text, art, or lore is copied. Class for art and lore: A or B (per AU011), mechanics are clean-room.

## Not read / unverified
- Monster AI, combat, breath spells, death, corpse and respawn presentation (not read).
- Tile PNGs (not viewed). Silhouettes are judged from shape and flags.
- `dat/descript/` text (counted only: 2,558 description text rows in monsters.txt, 1,954 in items.txt, 230 in egos.txt, 956 unrand rows). Not read in full.
- `dat/des/` vault stamps and `dat/dlua/` layouts (counted or listed only).
- Gear sets: no set-bonus system found (not read in depth).
- Hit-dice outliers and the 13 helper files were excluded from counts.
- Accidental VPS write: during the count step I wrote two scratch files to `/tmp` on the VPS (a listing and a monster list). Both were removed in the same command. Nothing else was written on the VPS.
