# cmangos-mangos-classic: asset audit (AU010)

Root on VPS: /mnt/frankendom-donors/cmangos-mangos-classic/ (read-only, not copied)

## Licences (as the files say)
- Code: GNU GPL v2 (LICENSE, "Version 2, June 1991"; README line 65).
- README line 79 says the full licence is in a COPYING file. No COPYING file is in the root; only LICENSE exists.
- README lines 96-103: third-party libraries under dep/ have other licences, which must be obeyed.
- Game content: COPYRIGHT.md line 7 names World of Warcraft content as Blizzard Entertainment's copyright and trademark. Line 28: the project is not affiliated with Blizzard. Lines 15-16: the project frames its use as fair use for non-commercial demo content.

## Rights-holder status
Educational, non-commercial, non-profit fan emulator project (COPYRIGHT.md). The repo's own file says the game content belongs to Blizzard. The origin of the SQL dumps and the warden binaries is not stated. No clean-room claim is made. No leak claim is made in the files read.

## Asset inventory
- The repo ships no client art, audio, models or maps. No PNG, audio or model files in the game tree except the items below.
- sql/ (about 25 MB, 1,515 .sql files): mangos.sql (527 KB), characters.sql (52 KB), realmd.sql (15 KB). Game-derived data. Class C.
- sql/base/dbc/original_data (six MySQL dumps: Spell.sql about 8.5 MB, WorldStateExpression.sql about 453 KB, DungeonEncounter.sql about 62 KB, UnitCondition.sql, CombatCondition.sql, SpellCone.sql). Class C.
- src/game/Anticheat/module/warden_modules: 73 binary .bin modules. Origin not stated. Class C. Not opened.
- contrib/recastdemomod/dep/font/DroidSans.ttf and 4 PNG screenshots (dep/recastnavigation, contrib). Class C pending (licence text for the font not read; recast library copyright line only).
- doc/*.txt and README-type files: GPL repo docs. Class B (copyleft).

## Best class
C. The only game-derived content is Blizzard-owned per the repo's own COPYRIGHT.md. No class A or B asset verified. There is no art to class.

## Inspiration (own words; mechanics only, no numbers or names)
- Cone-shaped area effects as a data table (SpellCone.sql; table shape only).
- Boss encounters as a phase table (DungeonEncounter.sql; table shape only).
- Ability gating by condition rows (CombatCondition.sql, UnitCondition.sql).
- Offline navmesh per zone for cheap monster pathing (contrib/mmap; names only; recastnavigation library).
- Companion bots limited to learned skills (README_PLAYERBOT.txt line 8).
- A market that restocks on its own (doc/AuctionHouseBot.txt line 1).

## Briefs (see .assets.json for full fields)
- Fan-cut breath (SpellCone.sql).
- Phased guardian encounter (DungeonEncounter.sql).
- Learned-skills companion (README_PLAYERBOT.txt).

## Cross-link to our cell topics
- spawns, zones: the offline navmesh pipeline is worth a look for zone and pathing design.
- loot: the auction-house bot is an economy idea, not an art asset.
- camera, hud-ui, vfx, animation, sound: no asset of ours to reuse. The shape of the cone telegraph may inform vfx design, and nothing else in the repo is visual.

## Receipts
Receipts: receipts.tsv in this folder (rows for cmangos; all verified with verify_receipts.py).

## Not verified
Listed in cmangos-mangos-classic.assets.json under not_read. In short: no binary opened (warden modules, font, PNG); SQL read by table line only; the COPYING file was not found; the recast licence not read in full.
