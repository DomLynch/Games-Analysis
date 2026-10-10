# Asset audit: dkfans-keeperfx (AU016)

Path on VPS (read-only): /mnt/frankendom-donors/dkfans-keeperfx/

## Licence (what the files say)
- Code licence: GNU GPL v2. LICENSE line 1 is "GNU GENERAL PUBLIC LICENSE"; README.md:103 says "This project is licensed under the [GNU General Public License v2.0](LICENSE)."
- Third-party code in tree, licences per file: dr_mp3.h says "Choice of public domain or MIT-0" (deps/dr_mp3.h:2); binser.lua carries a "Copyright (c) 2016-2019 Calvin Rose" notice (config/fxdata/lua/external/binser.lua:4); inspect.lua has an inline MIT LICENSE block (inspect.lua:23). base64.lua says "See end of file for license information" (not read to the end). deps/CUnit-2.1-3/COPYING and deps/centitoml/README.md exist (not read).
- Asset licence: no separate asset licence file. Original Dungeon Keeper art, sound and data are NOT in the repo. docs/files_required_from_original_dk.txt line 1 says the files "need to be added to KeeperFX from original Dungeon Keeper CD", and README.md:18 says the game "requires a copy of the original game files as proof of ownership".
- Map and campaign text files: 82 files under levels/ and campgns/ carry a "Copying and copyrights" header that names the GNU General Public License (24 under levels/, 58 under campgns/; e.g. campgns/twinkprs/map00207.txt:13). 155 other .txt files in those folders have no such header (not all read).

## Asset inventory
- Repo-shipped images: res/keeperfx_icon016 to 512 (8 PNG icons, 320 KB total for res/), docs/assets/readme-banner.png (1 PNG). Several CUnit wxWidget XPM icons in deps/CUnit-2.1-3 (8 files).
- Maps: levels/classic (about 10 map*.txt + classic_cfgs, classic_crtr), levels/deepdngn, levels/legacy (about 924 KB total for levels/). Maps are REM-commented text scripts, not binary.
- Campaigns: campgns/ (about 1.9 MB): campaign .cfg files, map00001-style .txt levels, per-campaign *_crtr folders with creature override .cfg files (e.g. dzjr06lv_crtr, 30+ creature cfgs), and *_lnd credits .txt folders.
- Config: config/creatrs/ (36 creature .cfg files, plain stats), config/fxdata/ (toml/cfg data plus lua scripts under config/fxdata/lua, about 46 .lua files). Numeric game data only.
- Language: lang/ (about 6.7 MB): gtext_*.po and .pot translation catalogues in about 16 languages (136 .po, 24 .pot files in the tree). Not read beyond the file names.
- Sounds, music, sprite archives (.dat, .tab): none found by extension in the tree.
- Source: about 253 .c files in src/ (code, not assets). Repo-wide, 351 .h and 46 .lua files (code).

| group | path | count_hint | licence | class | note |
|---|---|---|---|---|---|
| Original DK sprites, sounds, music, data | not in repo; user supplies from original CD (docs/files_required_from_original_dk.txt) | n/a | original game files, not licensed here | C (not present) | Do not take; list only |
| Repo icons and banner | res/*.png, docs/assets/readme-banner.png | 9 PNG | no per-file licence; project LICENSE is GPL v2 | B (inferred from repo-wide GPL, not stated per file) | Treat as GPL v2 share-alike if reused |
| Classic and campaign maps with GPL header | levels/*, campgns/* (82 files with header) | 82 files | GPL v2 (header text) | B | Keep the header if reused; some say "based on Bullfrog script" (campgns/keeporig/map00001.txt:6) |
| Maps without GPL header | 155 .txt files | 155 | not stated (not read) | C | Unclear |
| Credits text | campgns/*_lnd/*credts.txt | several | not stated | C | Lists original game team names (campgns/keeporig_lnd/dkcredts.txt:10); do not reproduce |
| Translations | lang/*.po, *.pot | 160 | not stated (not read) | C | Strings are game text; unclear origin |
| Creature and rule configs | config/creatrs/*.cfg, config/fxdata/*.cfg|toml | 36 + about 20 | not stated | C | Numeric values; use as design pattern only |
| Lua scripts | config/fxdata/lua/** | about 46 | GPL v2 for project; binser/inspect/base64 third-party | B for project scripts; third-party per file | Code |
| Third-party deps | deps/ (dr_mp3, CUnit, glad, centitoml) | n/a | per file (see above) | code | Not art |

## Rights-holder status (repo files only)
- Fan project and open-source remake. src/player_compchecks.c:2 says "Free implementation of Bullfrog's Dungeon Keeper strategy game." README.md:21-22 says the project began as a decompilation and that the codebase has since been remade and rewritten.
- Uses original game data from the user's own copy (README.md:18), so the original art and data are proprietary-origin (class C).
- Original rights holder named in the credits file as Bullfrog Productions Ltd. (campgns/keeporig_lnd/dkcredts.txt:10). Current owner is not stated in the repo files; README.md:19 names EA and GOG as digital sellers only.

## best_class
B for the GPL-headed maps and project icons and scripts (share-alike conditions: keep GPL v2 and notices). C for everything from the original game (not in repo), translations, credits and unheaded maps. Nothing in the repo is class A.

## INSPIRATION (own words)
- Palette-style texture animation: a table lists frame sequences per tile type (water, lava, gold, dirt near water). Each cycle is about eight frames, and some frames repeat to vary dwell time, so a gold seam glints unevenly (config/fxdata/textureanim.toml:13, :17, :25, :30). Recreate with our own frame lists and uneven hold times.
- Team recolour from one base sprite: a GUI table gives one base set plus per-player colour variants (red, blue, green, yellow, white, neutral, purple, black) (config/fxdata/spritecolors.toml:2-3). Make one master set and swap palettes per team rather than drawing eight sets.
- Creatures as readable stat sheets: each creature is a block of named values (health, armour, fear, hunger, lair size, base speed, clipbox XY and Z) (config/creatrs/dragon.cfg:10-25). A good template for our own creature design sheets.
- Clipbox as a first-class value: creature size is split into a body box and a tall Z value (config/creatrs/dragon.cfg:24-25). Useful for collision and camera framing decisions.
- Campaign override folders: each campaign can ship its own creature configs in a sibling *_crtr folder (campgns/dzjr06lv_crtr). Good modding pattern for seasonal or zone-specific monsters.
- Text maps with REM headers: levels are plain text scripts with an author and version header (levels/classic/map00206.txt:1-10). Easy to diff and to hand-author; a model for our zone or encounter scripts.
- Lua hooks for triggers and classes (config/fxdata/lua/classes, triggers): game rules are exposed as scripts. Ref for an event-hook design.

## Briefs
- label: Gold glint seam (own label)
  why: a bright metal seam that shimmers unevenly reads as precious without extra geometry
  keep: short frame loop; repeated frames to vary the hold time
  change: our own metal ramp (warm bronze, not gold); different loop length; a specular sweep instead of frame swaps
  ref: config/fxdata/textureanim.toml:25-30
- label: Team-colour kit (own label)
  why: one master sprite set serves every team, so the art budget stays small
  keep: base set plus palette variants per team
  change: our own team hues and trim motifs; add a shape-level badge per team so colour is not the only cue
  ref: config/fxdata/spritecolors.toml:2-3
- label: Armoured brute (own label)
  why: very high health, high armour and low movement make a large, slow threat that reads as a boss
  keep: high health with low base speed and a tall clipbox
  change: our own silhouette (horned head, no wings); different fear and hunger profile; our own palette
  ref: config/creatrs/dragon.cfg:10, :22, :24-25
- label: Eight-frame lava loop (own label)
  why: a hot floor that cycles through a short loop reads as moving without costly effects
  keep: eight-frame loop with a glow edge
  change: our own ember ramp and crust pattern; a pulse of light on the nearby walls
  ref: config/fxdata/textureanim.toml:17
- label: Stat-sheet creature template (own label)
  why: named numeric fields make each creature easy to tune and to compare
  keep: attribute block per creature with a clipbox line
  change: our own field names and value ranges; add a sound and a colour cue field
  ref: config/creatrs/dragon.cfg:1-25

## Cross-link to our cell topics
- vfx and animation: palette-style frame loops and uneven hold (config/fxdata/textureanim.toml).
- loot and spawns: campaign creature override folders (campgns/*_crtr).
- hud-ui: team-colour GUI sets (config/fxdata/spritecolors.toml).
- camera and zones: clipbox and level text scripts (config/creatrs/dragon.cfg:24-25; levels/classic/map00206.txt).
- sound: sounds not in repo; config/fxdata/sounds.cfg exists (not read).
