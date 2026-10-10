# mangoszero-server (asset audit, AU033)

Donor path (VPS, read-only): /mnt/frankendom-donors/mangoszero-server/

## Licence (what the files say)
- LICENSE: GNU GPL version 3 text. README.md lines 151-165: "either version 3 of the License, or (at your option) any later version".
- Code headers: "Copyright (C) 2005-2026 MaNGOS" (src/game/References/ThreatManager.cpp line 7).
- Assets: no separate asset licence. README.md line 180: World of Warcraft and all related art, images and lore are copyright Blizzard Entertainment, Inc.
- Docs: no separate licence line found; the repo LICENSE is GPL-3. Class C (ambiguous).

## Rights-holder status
Community server project for Blizzard's vanilla WoW (README.md line 20: "MangosZero - Vanilla WoW server"). Game art, images and lore: Blizzard (README.md line 180). Code: MaNGOS copyright lines. The files do not say whether Blizzard licenses this project. Status: community server for a commercial game, client and data not in box.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Client game data (art, maps, audio, DBC) | none; README.md lines 84-85 say the tools read the user's client files | 0 | D |
| World and game database (SQL) | not in checkout (README.md line 24; submodule folders empty) | 0 | D |
| Docs (guides) | extra/doc/*.md, 21 files (EventAI.md 965 lines; ScriptCommands.md 216; SD3_SQL_guide.md 222; Spell.md 21) | about 1,500 lines in the four read | C |
| Extractor lists | src/tools/extractor/vessels.txt (20 lines), offmesh.txt (1 line) | 21 lines | C |
| Images and icons | src/tools/extractor/mangos-tools.jpg (23.5 KB), src/mangosd/mangosd.ico, src/tools/extractor/mangos-extractor.ico | 3 | C |
| Server code | src/ (about 765 .cpp, 670 .h, 39 .hpp) | many | B (GPL-3; clean-room, shape only) |

## Data first
The creature, item, loot and text tables live in the database, which is not in the checkout (README.md line 24 says MySQL or MariaDB). The code loads them; the tables themselves were not read. The client's DBC and map files are not in the box either.

## Which half was read
Server half, in part: ThreatManager.cpp (threat calculation, victim selection, taunt), UnitThreat.cpp line 164, LootMgr.cpp (roll signatures and bodies at two lines), CreatureEventAI files (names only), extra/doc/EventAI.md (intro). Data half (SQL): absent from the checkout (checked: submodule folders are empty). Client half: not in box. No paired donor for this box (Mag-nus is a different game client; Tibia is a different game).

## Inspiration (own words, shape only: GPL, clean-room)
- Aggro as a sorted threat list; the creature takes the top entry that is not a second-choice target. Refs: ThreatManager.cpp lines 410-413, 440-470.
- Hit threat is a flat base scaled by spell mods, a crit multiplier and the target's threat modifier, in a fixed order. Ref: ThreatManager.cpp lines 73-99.
- Taunt copies the leader's threat onto the taunter only when below it, as a temporary value that fades. Refs: ThreatManager.cpp lines 723-732; UnitThreat.cpp line 164.
- Group loot: one winner per group entry by roll. Refs: LootMgr.cpp lines 368 and 1209.
- Creature behaviour as event rows in data. Ref: extra/doc/EventAI.md (line 5 onward).
- Documented data formats as short contracts per table (SD3 text tables and SQL guide). Refs: extra/doc/SD3_Text-tables.md, SD3_SQL_guide.md (names only).

## Inspiration briefs
1. Pull-the-aggro swap (enemy target choice). Keep: sorted threat, top non-second-choice target, taunt copies and fades. Change: 3-attacker cap, swap tell (ring and sound), guard and parry feed threat. Ref: ThreatManager.cpp lines 410-470, 723-732.
2. Group loot pick (drop ceremony). Keep: one winner per group, own roll per entry. Change: visible roll reveal with rarity sound, contested beat for a shared item. Ref: LootMgr.cpp lines 368, 1209.
3. Boss phase rows (behaviour as data). Keep: event, condition and action rows; timer and health-band events. Change: our event names, phase bar at 375 wide, finisher beat on the last phase. Ref: extra/doc/EventAI.md.

Dom's rule for every brief: recreate as a clearly distinct original, never a copy.

## Cross-link to our cell topics
- spawns, zones: none read (no spawn code opened).
- loot: LootMgr roll groups (shape only).
- progression, hud-ui, sound, camera, vfx: nothing in this donor beyond the text above.
- animation: none read.

## Not read / unverified
- No client data, no database content, no art or audio exists in the box.
- ThreatManager.h, Unit::IsSecondChoiceTarget, LootMgr bodies, CreatureEventAI.cpp bodies: not read.
- Docs beyond EventAI intro: names only.
- Extractor lists and images: line counts and sizes only.
