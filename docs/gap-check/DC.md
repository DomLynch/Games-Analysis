# Gap check DC (donor design catalogue: creatures, classes, weapons, gear, zones, looks)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: 127 `*.catalogue.md` in DC001 to DC064 (groups of about 2). Grouped by theme and licence class, not note by note.

## Summary for Dom
1. The 127 catalogue entries are idea lists (each idea says "keep X, change Y", own names) plus counts of creatures, weapons, gear and zones per donor. Nothing in the checkout cites a DC entry: grep for "DC0", "design catalogue" and "catalogue" in docs/, src/ and origins/ finds no use of these notes. So all 127 entries are untouched as entries.
2. Frankendom HAS used donors, but a different set: OpenMW, OpenGothic, ModernUO and EQEmu as clean-room behaviour specs (docs/specs/origins/README.md:3), plus a 23-tree creature scan (docs/research/origins-best-in-class.md:23, Part A) and an art-donor review (docs/research/legends-600-bodies-and-donors.md:149). About 20 of the 127 catalogue donors appear by name in that earlier research; the other ~100 are untouched at donor level too.
3. Counts (theme rows): REUSE 5, ADD 8, SKIP 2 (plus one SKIP sub-part: new weapon ids). The catalogue ideas collapse into 10 builds (G1 to G10). Top 3: (a) G1 tiered boss phases shown by a cue, not new combat rules; (b) G2 more zone weather and hazard states in the existing theme table; (c) G3 weak-point glyph and damage-type read on the existing creature info card.
4. Biggest pattern: most catalogue ideas are visual or data-row ideas that fit Frankendom's rulings (one engine, no dice, mob = data row on a few rigs). Ideas that settle fights by dice, hit chance, ranged combat or a second AI are SKIP.
5. Licence note: 61 of 127 donors are copyleft or share-alike (GPL, AGPL, LGPL, CC BY-SA) and 38 more have no licence, are leaked, non-commercial or conflicting. Only 28 have permissive code (MIT, Apache, BSD, Unlicense), and even those carry game data of unstated origin (class C), so ideas stay category-level and own-named. This file quotes numbers only for the permissive group.

## Licence classes (my reading of each note's licence line; not legal advice)
| Class | Count | Donors (short) | Use rule |
|---|---|---|---|
| A Permissive code (MIT, Apache, BSD, Unlicense) | 28 | OpenGothic, daggerfall-unity, afritz1-OpenTESArena, ClassicUO, evennia, smogon-pokemon-showdown, bearlikelion-WoWdot, wowserhq x2, daeken-OpenEQ, LanternEQ x2, Reinisch-Warcraft-Arena-Unity, DCurrent-openbor, BifrostTitan-DAoC-Client-Lib, dol-leodagan-DaocClientLib, gtker-wow_messages, cuteshaun-lineage2-api, esponges-daoc-web, eq-p99-tools-eq-client, gawric-L2J-client, pmbstyle-L2Solo, NodeL2, kcopelandmgmt-Shadowbane, mattyx14 and opentibiabr OTClient, simutrans (Artistic), SpacetimeDB demo (Apache; repo is BSL) | Shapes and numbers may be named. Game data inside is still class C (game-derived, no asset licence): inspiration only |
| B Share-alike content | 7 | 0ad (GPL code, CC BY-SA art), Cataclysm-DDA (CC BY-SA), flare-game, ryzomcore (AGPL + CC BY-SA), wesnoth, widelands, OpenXcom | Shape only, no copied files; an edited asset would have to be re-released share-alike |
| C Copyleft code, no usable assets | 54 | EQEmu, ModernUO, OpenMW, TrinityCore, OpenDAoC, veloren, rathena, vmangos, cmangos, azerothcore, crawl, Quake and Quake 2, ioq3, dhewm3, OpenRA, OpenRCT2, OpenTTD, scummvm, xoreos, xu4, keeperfx, and the rest (list in the donor folders) | Clean-room, idea and shape only, no donor numbers in this file |
| D No licence, restricted, leaked, non-commercial or conflicting | 38 | SWG-Source x4 (leaked), sven-n-MuMain, Danjb1-rsc-remastered, djhenry-eqoxide, DevilutionX and Fallout CE x2 (non-commercial), Kelsidavis-WoWee (no-commercial-game clause), Pokemon AutoChess (third-party IP), id DOOM (conflicting terms), WarEmu, Clancey x2, and others | Category-level ideas only; never copy a name, a look or a number |

## What we have today (shared by all theme rows)
- Creatures as data rows: `MobRow` (origins/mobs/row.ts:22) with source, role, behaviour, loot, level band, weight, rarity (row.ts:21, RARITY_WEIGHT row.ts:50), and tier ladders (`ladder`, `rung`). Four styles map to existing fighters (origins/mobs/styles.ts:6, 14). Behaviour kits and three modes shy/bold/ambusher (origins/mobs/kits.ts:10, 25), applied by src/mobkit.ts:1. Body families (9, six live) in docs/specs/origins/body-families.md:1-14.
- Bodies: 15 roster bodies (src/roster.ts:11: veteran, pitborn, goblin, nightborn, executioner, minotaur, wolf, wraith, werewolf, skeleton, dwarf, plaguedoctor, knight, witch, shieldmaiden). Legends (names per rung) in src/legends.ts:22.
- Weapons: 11 weapon ids (src/moves.ts:259; table at moves.ts:549). Weapon takeable slots src/loot.ts:17.
- Gear: 8 armour slots (src/loot.ts:12), pack 2 open of 5 (loot.ts:58), eight grade materials as factors only (src/grades.ts:1-7), rank tint on worn pieces (src/rank-tint.ts:1), two-multiplier gear stats (src/gear-stats.ts:1).
- Zones: arena themes keyed 1 to 11 plus a to d (src/arena-themes.ts:50, 89, rotation 162), each with weather of five kinds ash, embers, rain, dust, drips (arena-themes.ts:18-20). Origins zones as data in origins/region1/world.ts:1 and zone length rules in origins/world/zone-rules.ts:9-13.
- Bosses and tells: staged world boss state machine (origins/boss/README.md:1, boss.ts), boss tell visuals (src/boss-telegraph.ts), boss specials timing (src/special-boss-timing.ts).
- Looks and feel: hit impact (src/hit-impact.ts:1), gore decals (src/gore.ts:1), foot dust (src/foot-dust.ts:3), recessive grade (src/colour-grade.ts:1), per-fighter special effects (src/special-fx-*.ts).
- Readability: creature info card with seven danger bands and commonness (origins/mobs/info.ts:1, 9-17).

## Gap table (by theme; counts are of catalogue entries that carry this theme)
| Theme / donors | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| Creature families as data (about 60 entries: bestiary and monster-table donors such as OpenGothic-class, daggerfall-unity, DevilutionX, ModernUO, OpenXcom) | One body plan, many tiers and variants | MobRow ladder/rung (row.ts:22), body-families.md:1 | Few families live (6 of 9); catalogue only adds names and tier ideas | REUSE | origins/mobs/frontier-rows.ts (add rows, not code) |
| Rarity and "rare takes over a camp" | Rare variants replace common camps | RARITY_WEIGHT, `replaces`, `chance` (row.ts:50, 21-31) | None | REUSE | already in origins/mobs/row.ts |
| Boss with HP phases and visible phase cue (shattered-pixel, cuteshaun, OpenDAoC, AAEmu, CleverRaven) | Boss steps up at health gates, cued | Staged event machine, no phase-by-health code (grep "phase" in origins/boss/*.ts found none); tell visuals src/boss-telegraph.ts | Phase cue and per-phase move set for named bosses | ADD (G1) | origins/mobs/kits.ts for the move set, src/boss-telegraph.ts for the cue |
| Elite by scale, tint or aura (muonline, daoc-niflib, ACE) | Elite shown by size, colour pulse | Scale and tint are row parameters (body-families.md:1); rank tint src/rank-tint.ts:1 | Pulse aura for elites | ADD (G4) | src/rank-tint.ts |
| Weakness glyph and danger read (cuteshaun, daochook, ClassicUO) | One glyph shows what it fears | Danger bands and card (origins/mobs/info.ts:9-17); no weakness glyph | Weakness glyph on card | ADD (G3) | origins/mobs/info.ts |
| Weapon families and tier ladders (angband, ACE, crawl, 2004Scape, OpenXcom) | One property per weapon tier | 11 weapon ids (moves.ts:259); grades as factors only (grades.ts:7) | New weapon ids change combat; ladders of looks only | SKIP new ids (Combat decides); ADD look ladder (G5) | src/grades.ts |
| Armour set grids: base x element x tier (ACE, cuteshaun, 0ad variants) | Set name, three weights, tiers | 8 slots (loot.ts:12), 8 grades (grades.ts) | Weight variants (heavy/light/robe) under one set name | ADD (G5) | src/loot.ts, docs/briefs/armour-sets |
| Layered recolour and palette dye (ClassicUO, crossuo, Clancey) | One grey base, lookup recolour | Grades write factors on one material (grades.ts:1-7) | Already same shape | REUSE | src/grades.ts |
| Zone weather and hazard states (OpenTESArena, WoWdot, cmangos, 2003scape, ClassicUO, OpenDiablo) | Storm, sand, underwater, lava glow | 5 weather kinds (arena-themes.ts:20) | Sideways storm, visibility-limiting fog toggle, lava pool glow | ADD (G2) | src/arena-themes.ts (extend Weather kind union), src/arena.ts |
| Zone as data bundle, exits as rows (BifrostTitan, Shadowbane exporter) | Zone = folder of small tables | origins/region1/world.ts:1, schema.ts:36 | Zones already data | REUSE | origins/world/schema.ts |
| Biome encounter table (Fallout 2, Card-Forge, Cataclysm) | Encounter set per biome | MobRow weight per zone mix (row.ts:22) | Walking-time encounter director, shrine rule per dungeon | ADD (G6) | origins/encounters/encounters.ts |
| Hit, spell and trail VFX (WoWdot ribbon, DCurrent hit tint, OpenEQ glow, MapleNecrocer particles) | Additive trail, tint pulse, socket glow | hit-impact.ts:1, special-fx-*.ts | Additive weapon trail ribbon; per-damage-type tint | ADD (G7) | src/blade.ts, src/hit-impact.ts |
| Ranged, homing, cover-seek, dice or auto-attack combat (dhewm3, Swing Gate, Forge, Mindustry units) | Enemy shoots, hides, auto-swings | Ruled out: ranged stays out of the duel (origins/mobs/styles.ts:15 comment), one engine rule | Conflicts with rulings | SKIP | none |
| RTS, vehicle, sim, card, mech donors (OpenTTD, OpenRCT2, Warzone, Mindustry, Card-Forge, OpenRA, simutrans) | Units, vehicles, cards | Not our product | Almost no transfer beyond a few visual ideas | SKIP (keep ideas in G2/G7) | none |
| Class, race and faction lists (ACE, AAEmu, OpenTESArena, rathena, 2004Scape skills) | Class and race tables | 15 bodies, 10 career titles (src/career.ts:8), ruling 7 one progression | Not needed beyond progression specs | REUSE (existing progression specs) | docs/specs/origins/progression-proposal.md |

Totals above: REUSE 5, ADD 8, SKIP 2 plus one SKIP sub-part (new weapon ids).

## Merged additions (one build each)
- G1 Phased bosses: health gates change the move set and show a cue (telegraph burst, tint). Rules: gates are data on the boss row; cue only, no new combat rule; every phase passes through the existing legal() and stepDuel (src/mobkit.ts:1 header). Heal-a-fraction summoners belong to the same row.
- G2 Weather and hazard kinds: add storm (sideways drift), visibility fog toggle, underwater tint and lava glow to the existing Weather union. Rules: presentation only, no new draw call count beyond the one Points cloud (arena-themes.ts:18-20); phone budget first.
- G3 Weakness glyph on the creature info card: one glyph, readable at 375 wide. Rules: derived from row data, nothing hand-authored (info.ts:1 principle).
- G4 Elite pulse aura: size or colour pulse per phase, from the rank-tint path. Rules: grade stays a material change, never a mesh change (grades.ts:1-7).
- G5 Gear look ladders: three weights (heavy, light, robe) under one set name; metal-tier ladder as look only. Rules: no stat change before Origin (docs/SCOPE.md Beta section).
- G6 Encounter director and zone rules: a spawn timing rule for roaming and one rule modifier per dungeon, as zone data. Rules: server tick, seeded, no Math.random (origins/encounters/encounters.ts:1-3).
- G7 Weapon trail ribbon and damage-type tints: additive trail per weapon, hit tint per damage type. Rules: presentation only; sim untouched.
- G8 More mob rows and families from catalogue ideas (hound, boar, bear, serpent, spider, giant, hooved look-swap): own names, own art, through the body-family batch (docs/specs/origins/body-families.md:1).
- G9 Instance ladder: a room-by-room run where each room boss opens the next door (AAEmu, Forge). Rules: Origins zone data; kills server-verified.
- G10 Sound and cue pairs per verb (Danjb1, Fallout 2): success and failure cue per action. Rules: own synthesised cues; presentation only.

## Which donors Frankendom has used (evidence in the checkout)
- Clean-room behaviour specs: OpenMW, OpenGothic (with ZenKit), ModernUO, EQEmu (docs/specs/origins/README.md:3 and the table below it); named in code comments at origins/quests/journal.ts:5-6, origins/boss/README.md:9, origins/contracts/README.md:107-136.
- Part A creature scan (23 trees): daggerfall-unity, OpenGothic, OpenTESArena, openmw, exult, xu4, xoreos, OpenEnroth, OpenDiablo2, EQEmu, ModernUO, crawl, Cataclysm, wesnoth, rathena, otland-forgottenserver, ryzomcore, 0ad (docs/research/origins-best-in-class.md:23, licence table lines 55-80).
- Art-donor review (assets, mostly rejected or AMBER): 0ad meshes, flare-game, Ryzom, Quaternius/WoC (docs/research/legends-600-bodies-and-donors.md:149-189). No donor art is shipped.
- Untouched: all remaining catalogue entries, including the leaked SWG group (4), the DAoC group, the Lineage 2 group, the Shadowbane group, Mindustry, OpenRA, OpenRCT2, OpenTTD, Warzone, Card-Forge and the fallout, quake and id entries.

## Could not verify
- I read the licence line, creature count and top ideas of each note (grep extracts), not every section of all 127 notes; the 28/7/54/38 class counts are my reading of those lines, and 11 notes had no licence line near the top (classed from the donor's known licence or "unclear"). Treat the class as indicative.
- "25 of 127 donors named in earlier research" is from name greps in docs/research; donors in PINS.txt were not opened.
- No catalogue-consuming code or row exists, confirmed only by grep for "DC0", "design catalogue", "catalogue"; other spellings were not tried.
- I did not open origins/boss/boss.ts line by line; "no phase code" rests on a grep for "phase" in origins/boss/*.ts.
- Rows ignore Checker-findings blocks: only note headers and top ideas were read.
