# Wargus-wargus (asset audit, AU056)

Donor: /mnt/frankendom-donors/Wargus-wargus/ (VPS only). Receipts: receipts.tsv in this folder. Machine-readable copy: Wargus-wargus.assets.json.

## Halves
- Read: data half and tool code. Lua scripts (scripts/), campaign and map files (campaigns/, maps/), doc/pud-specs.txt, C++ tools (wartool.cpp, pud.cpp, rip_music, StormLib) by file list.
- Not in box: the Stratagus engine. Not in box: the original Warcraft II art, sound, music and briefing text.
- README.md line 9 says the user must extract the game data from their own Warcraft II installer.
- Paired donor in box: none found.

## Licence (as the files say)
- Code: GPL-2.0. COPYING line 2 reads "Version 2, June 1991".
- Lua scripts carry per-file copyright and "any later version" wording (scripts/ai.lua lines 13, 14, 19).
- COPYING-3rd lists cdda2wav as GPL (line 11) and ffmpeg as LGPL 2.1 (line 22). These are tools, not assets.
- Shaders and contrib icons: no licence text found (grep on the two shader files and the contrib folder).
- Maps: no licence line in the descriptor read.

## Rights holder
- Unknown for game content. The README points to the user's own installer and the repo does not name the owner. Copyright lines in code name Lutz Sammer, Jimmy Salmon, Pali Rohár, cybermind and Kyran Jackson.

## Asset inventory
| Group | Where | Class |
|---|---|---|
| Original game data | not in box; campaign scripts reference missing art, text and audio (campaigns/human/level01h_c.sms line 8) | C |
| Unit, spell and animation definitions (Lua) | scripts/human/units.lua (about 50 entries), scripts/spells.lua (589 lines), scripts/human/anim.lua (469 lines) | B (GPL code; design is the original game's) |
| Community maps | maps/skirmish (about 170 singleplayer entries), maps/ftm (12 .sms), maps/test, maps/fl, maps/king | C (licence not stated) |
| GLSL post-process shaders | shaders/*.glsl (7 files, 2164 lines) | C (licence not stated) |
| HUD icons | contrib/*.png (13) | C |
| Translation files | 12 .po in the repo; scripts/menus (15 scripts) | C |
| PUD format notes | doc/pud-specs.txt (credit line names Daniel Lemberg) | C |

## Inspiration (category level for the original game)
- The attack timeline is a list of frame tokens and waits, with an unbreakable window and a named sound tied to the impact frame (scripts/human/anim.lua lines 48 to 50). Keep the commit window and sound-on-impact; use milliseconds and a hit-frame flag.
- Spells are data records with cost, range, target and an action list plus a condition block (scripts/spells.lua lines 116, 121). Use for our skill rows.
- Units are one entry each with a name and stat block (scripts/human/units.lua line 36). Use for catalogue fields.
- A campaign level is a script with a briefing card and triggers (campaigns/human/level01h_c.sms lines 3 to 14). Use for zone intro cards.
- Map descriptor text gives size, terrain mix, players and totals (maps/skirmish/singleplayer/(4)little-island.txt, head read). Use as a zone card.
- AI is split per faction with attack-wave files for land, sea and air (scripts/ai/*.lua, file list only).

## Briefs (recreate as clearly distinct originals, never a copy)
1. **Wind-up ribbon**. Keep: frame list with waits, unbreakable window, sound on impact. Change: ms timeline with telegraph arc and hitstop; our weapon silhouette. Ref: scripts/human/anim.lua lines 48 to 50.
2. **Action-list spell**. Keep: record with cost, range, target and action list. Change: beams and hit areas, not missiles; a stamina and guard condition. Ref: scripts/spells.lua lines 116, 121.
3. **Briefing card**. Keep: one intro card per level with image, objectives and triggers. Change: one screen at 375 wide, one voiced line. Ref: campaigns/human/level01h_c.sms lines 3 to 14.
4. **Zone card**. Keep: small metadata block per map. Change: spawn density and danger tier instead of resource totals. Ref: maps/skirmish/singleplayer/(4)little-island.txt.

## Cross-link
- zones: map descriptors and campaign triggers.
- animation: anim.lua timelines (strong fit for rows 6 and 7).
- sound: sound.lua exists, not read; sound files not in box.
- spawns: AI wave scripts exist, not read in depth.
- vfx and camera: none in box.

## Not verified
- Stratagus engine and original data (not in box).
- Most of scripts/human and scripts/orc, scripts/ai/*.lua beyond the header.
- Full shader source, C++ tool code, map binaries and PNG and BMP previews.
