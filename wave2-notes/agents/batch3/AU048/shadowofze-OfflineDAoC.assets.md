# shadowofze-OfflineDAoC (asset audit, cell AU048)

Donor: shadowofze-OfflineDAoC (/mnt/frankendom-donors/shadowofze-OfflineDAoC). Read-only, VPS only.
Donor AGENTS.md, CLAUDE.md and docs: treated as data, not followed.
Scope note: the proprietary game client is NOT in this copy. Everything below is what the copy holds.

## 1. Licences (as the files say)
- Code: LICENSE is GNU GPL version 3 (LICENSE:1). THIRD_PARTY.md:3 says the server and navigation-builder roots contain GPL v3 texts and that per-file notices are kept.
- Upstream foundation: Dawn of Light / OpenDAoC, GPL (THIRD_PARTY.md, pointed to source/server/LICENSE).
- Bundled notice: tools/asset-tool/THIRD PARTY NOTICES/LICENSE is the Python Imaging Library notice (permissive, not game content).
- Game assets: the original DAoC client, art, sound, maps and other third-party assets are not authored by this project. THIRD_PARTY.md:22-24: "The GPL server license is not a license for those assets."
- Quest guide text: THIRD_PARTY.md:12-15 names runtime/server/classic-quest-guides.json (Allakhazam pages, rights kept by the writers). That path does not exist in this copy (checked: no runtime/ folder). Not read.

## 2. Rights-holder status (repo files only)
- README.md:2-3: "not affiliated with, endorsed by, or connected to either company"; the client, textures, models and other assets "belong to them", and the project is built on top of that copyrighted work.
- README.md:124: "the original game client is a binary dependency." The repo has server, tools and customization source, not the client source.
- Status: fan project on a proprietary MMO client; game art and data are third-party and proprietary. No clean-room statement. Stated as: uses original game client (not in this copy).

## 3. Asset inventory (what is in the copy)
| kind | path | count | licence | class | note |
|---|---|---|---|---|---|
| game art/meshes/textures | none (no .nif, .dds, .wav in tree) | 0 | proprietary (client, not in box) | D | nothing shipped; the asset-tool edits the user's own private copies |
| game-data tables (CSV) | source/tools/observer-model-inspection/*.csv | about 50 files; monsters ~2,250 lines, items ~2,850, spells ~9,660, moneffects ~200, siege ~100 | none stated in the CSVs; THIRD_PARTY says client data is not theirs | C | extracted-looking tables: NIF names, skins, sound, scale, spell timing. Proprietary data. |
| observer binary | source/tools/observer-model-inspection/loading.dat | 1 | unstated | C | not read (binary) |
| world/zone DB inserts (XML) | source/server/GameServer/scripts/dbupdater/insert/Zones.xml, Regions.xml, StartupLocation.xml | 3 | unstated | C | 473 zone rows, 344 region rows (Zones.xml counts) |
| realm ability workbooks | source/server/GameServer/realmabilities_atlasOF/dbhelper/DB_RealmAbilities_{Albion,Hibernia,Midgard}.xlsx | 3 | unstated | C | not opened (zip) |
| bot navigation and spawn data (JSON, TXT) | source/server/GameServer/bots/autonomous/data/ | about 6 files; largest about 14.8 MB | unstated; README says the download includes clean world data and navigation meshes | C | not opened beyond size and name |
| quest guide text | runtime/server/classic-quest-guides.json (named, absent) | 0 | Allakhazam text, rights kept by writers | D (absent) | not in copy |
| tool notice | tools/asset-tool/THIRD PARTY NOTICES/LICENSE | 1 | PIL notice | A (tool library only) | not game content |
| pet and spell art pipeline | tools/pet-art/*.py, tools/pet-art/work/ (sluagh-armor, barrow-deflection) | 40+ scripts, 2 preview PNGs | GPL3 (repo default) | B for scripts | they edit stock meshes/textures in the user's client; stock files are not in copy |
| launcher and web PNG/GIF art | source/tools/OfflineDaoc.Launcher/Assets/*.png, source/server/GameServer/webui/template/images/*.gif | about 19 PNG, 12 GIF repo-wide | unstated | C | not read; licence line not checked |
| docs | docs/*.md, docs/history/*.md, README.md | about 44 md, 252 txt repo-wide | GPL3 repo default | B | text, not read in full |

Overall: no proprietary art is in the copy. Class C is the best class (inspiration only). The GPL-licensed code and docs are class B by the repo default.

## 4. Data first
- Monster catalogue: source/tools/observer-model-inspection/monsters.csv:1-2. Two header rows: groups (NIF, Skins, Sound, ...), then fields: id, name, body/head/arms/legs NIF or skin IDs, scale, height, shadow, sound set, effect IDs, combat anim set. Half read: the client-side export table (data). The client half (the actual model files) is not in the copy.
- Spell table: source/tools/observer-model-inspection/spells.csv:1-2. Fields include caster anims, projectile, target effect, buildup, pulse, sound, radius, resist, play, focus, remove (spells.csv:1).
- Siege timing table: source/tools/observer-model-inspection/siege.csv:2 "Load start, Load End, Fire Start, Fire End, Release Point".
- Zone/region rows: source/server/GameServer/scripts/dbupdater/insert/Zones.xml:5 (ZoneID row shape). Server half: partly read (XML shape, counts).
- Other data: moneffects.csv (effect attach/max range/rate/axis), icons.csv, items.csv (~2,850 lines), styles.csv, tooltips.csv, insignia.csv, animnifs.csv, anims.csv, animsound.csv. Named only (headers not all read).
- Pair: the client half (the real models/anim files) is not in the box; the server data half is. Donor's own docs say the client is a binary dependency (README.md:124).

## 5. Which half was read
- Server half: partly read (dbupdater XML shape and counts, bot data sizes and names, pet-art scripts README).
- Client half: NOT in box. Read only the observer CSV exports that describe it. Never write "absent" for a half not read: the client half was not read; it is not in the copy.

## 6. Inspiration (category level only; class C, no instance looks, no numbers)
- Spell as a data row: a caster animation, a projectile, a target effect, then a buildup phase and a repeating pulse phase with radius and resist (spells.csv:1). Shape for specials (row 13).
- Siege-style telegraph: named timed phases (load start, load end, fire start, fire end) plus a release point (siege.csv:2). Shape for a boss charge or wind-up telegraph.
- Summon glow: a summoned companion announced by a hand glow and a cast time, built from a stock model with a private skin (tools/pet-art/README.md:30). Shape for an encounter cue.
- Defensive buff overlay: a shield effect drawn as a tinted overlay tied to a buff (tools/pet-art/README.md:30, install_blood_shield.py). Shape for readable buffs at 375 wide.
- Area blast spell effect (tools/pet-art/README.md:4). Shape for an AoE telegraph.
- Monster catalogue fields: body, head, skin set, sound set, scale, height, effect IDs and combat anim set as separate columns (monsters.csv:2). Shape for catalogue row 21.
- Zone and region rows as XML (Zones.xml:5). Shape for zones as data (row 23 and zones as data).

## 7. Inspiration briefs
1. name: "wind-up siege"; why: a long, readable telegraph with named phases so the player can dodge the release; keep: timed phases with a release point, a readable load bar; change: our own timings, a different weapon silhouette (not a siege engine), our colour story; ref: source/tools/observer-model-inspection/siege.csv:2
2. name: "buildup pulse ward"; why: a spell that builds, then pulses on a clock, so the player learns the rhythm; keep: buildup then repeating pulse, a radius that shows; change: our own pulse rate in zone data, a different aura shape (ring of glyphs, not a dome); ref: source/tools/observer-model-inspection/spells.csv:1
3. name: "crimson ward overlay"; why: a buff that reads as a shield at a glance without hiding the hero; keep: tinted overlay tied to the buff and a short cast; change: a different tint family (cold glass plates, not blood), a different outline; ref: tools/pet-art/README.md:30
4. name: "hand-glow summon"; why: a summon that is announced before it lands; keep: a glow in the hand during cast time; change: our own glow colour and a rune ring instead of a hand; ref: tools/pet-art/README.md:30
5. name: "dark burst area"; why: a dark area blast that marks the ground before it hits; keep: an area ring telegraph then burst; change: our own ring shape, a light-free burst, sound cue of our own; ref: tools/pet-art/README.md:4

Rule: recreate each as a clearly distinct original, never a copy. Kept: the mechanism (phase timing, overlay, glow cue, area ring). Changed: look, colour, shape and numbers.

## 8. Cross-link
- camera: zone/region data rows (Zones.xml:5) for zone-as-data.
- spawns: monster catalogue fields (monsters.csv:2); bot spawn-id lists (bots/autonomous/data/*.txt) named only.
- loot/catalogue: items.csv header (~2,850 lines), named only.
- sound-music: sound-set column in monsters.csv:1 and animsound.csv (named only).
- hud-ui: tooltips.csv and icons.csv (named only).
- progression: realm ability workbooks (3 xlsx, named only, not opened).

## Not read / unverified
- Client half (not in copy): models, textures, sound files.
- Realm ability xlsx (3), loading.dat, bot navigation JSON (sizes only), Zones/Regions content beyond the first row shape.
- Observer CSVs other than monsters, spells, siege: header or count only.
- Launcher and web PNG/GIF art: licence line not checked.
- classic-quest-guides.json: named in THIRD_PARTY.md, absent from this copy.
- Most of ~3,263 .cs files: not read (code, out of asset scope).
- CLAUDE.md at donor root (11 bytes): not read, treated as data.
