# swgemu-Core3 (asset audit, cell AU051)

Donor: `/mnt/frankendom-donors/swgemu-Core3/` (VPS only, read-only).
Half read: **server data pack** (`MMOCoreORB/bin/scripts`, `MMOCoreORB/sql`, `bin/conf`) plus the licence files. `MMOCoreORB/src` (server C++) was **not read**, only the file counts were taken. The matching client half (the `.tre` archives) is **not in the box** and the repo says the user must supply it.
Paired donor in the box: `swgemu-engine3` (the engine Core3 links against). No client-data donor for the same game in this cell.

## 1. Licences (as the files say)
- `README.md` licence section: "GNU Affero General Public License" (line 171). `COPYING` is AGPL v3 text (line 1).
- The Lua data scripts under `MMOCoreORB/bin/scripts` do **not** say AGPL. 18,274 of 30,521 `.lua` files carry a "GNU Lesser General Public License" header. Example: `bin/scripts/commands/credits.lua` lines 6 to 8 say LGPL "either version 2 of the License". 0 files matched "GNU Affero" in that folder.
- The other 12,247 `.lua` files did not match either licence string. I did not check what else they say.
- Code licence: AGPL v3 (repo) and LGPL headers (scripts) conflict. Class C for anything the conflict touches.
- Asset licence: no separate asset licence file. No CC/CC-BY/CC0 text in the data folders.

## 2. Asset inventory (what is really here)
- **No client art, models, textures or audio** in the repo. `bin/conf/config.lua` lists `.tre` client archives (for example `default_patch.tre`, line 152). `README.md` line 21: the user needs the `.tre` files from their own client. Art, audio and models: class D (absent).
- **Creature templates (Lua data)**: `bin/scripts/mobile/`, 6,499 files; 35 at the top level, 105 in `mobile/dantooine`. Schema file `mobile/creatures.lua` (86 lines). Example: `mobile/dantooine/bol.lua` (grazing beast).
- **Object templates (Lua)**: `bin/scripts/object/`, 17,485 files (shared templates, buildings, weapons, armour, etc.). Only the names were read.
- **Loot tables (Lua)**: `bin/scripts/loot/`, 2,857 files (`groups` 656, `items` 2,197).
- **AI behaviour trees (Lua)**: `bin/scripts/ai/`, about 12 files (`herd.lua`, `villageRaider.lua`, `cityPatrol.lua`, `deathWatch.lua`, `enclaveSentinel.lua`, `escort.lua`, `pet.lua`, `static.lua`, `templates.lua`, `default.lua`, `crackdown.lua`, `eventControl.lua`, `herd.lua`).
- **SQL data dumps**: `sql/datatables.sql` (2.25 MB, 171 INSERT INTO; tables such as `appearance_appearance_table` at line 25, client-region and command tables), `sql/swgemu.sql` (1.8 MB, 47 INSERT INTO), `sql/mantis.sql` (27 KB, not read).
- **Docs spreadsheets and images**: `doc/` has 5 `.xls` (client strings reference, item types, loot groups, client object types, crc tables), 6 `.png` (AI state and behaviour diagrams, movement path chart), 3 `.zip` (strings insert, PHP status, crafting). None opened.
- **Terrain and navmesh**: `bin/terrain/` (`mustafar_height.tga`, `test_terrain.trn`), `bin/navmeshes/` (1 file). Not opened.
- **String table**: the creature names are keys such as `@mob/creature_names:bol` (`mobile/dantooine/bol.lua` line 2). The text itself is not in the repo (client string files). Entry count: not done.

## 3. Rights-holder status (repo files only)
- Fan project. The README says the SWGEmu team wrote the server "from scratch" by reverse-engineering (README line 9).
- The repo does not say who owns the Star Wars Galaxies stats, names or templates in the data pack. Data origin: **unknown**.

## 4. Best class
**C** for the data pack (licence conflict, unclear origin of game data). **D** for art, audio, models (absent). Inspiration only.

## 5. Inspiration (own words; category-level, not copied)
- **Herd wanderer**: a herd leader pulls a loose group between five generated patrol points set 50.0 from home (unit not stated in the file), waits 8 to 15 s on arrival, then rests (`ai/herd.lua` lines 18, 23, 36; line 36 is a second wait of 5 to 10 s under the same selector, and I did not read the full branch). The behaviour tree is data, not code. Recreate as a leader-led drift between spawn-anchored points.
- **Body-drop ledger**: each beast carries separate meat, hide and bone yields (`bol.lua` lines 16 and 18 show two of the three). A kill reads as a small resource ledger. Recreate as per-family yields with our own resource names.
- **Hue-index skins**: one model with a short list of hue indices gives many colour variants (`bol.lua` line 30). Recreate with our own palette ramps, one model per family.
- **Social flags as a bitmask**: a pack flag and a herd flag sit in one field (`bol.lua` line 25). Recreate as flags on our creature template so a pack member pulls its neighbours into a fight.
- **Social key**: creatures share a `socialGroup` string (`ancient_graul.lua` line 3). Recreate as a family key in zone data.
- **Nine-slot resistance vector**: each creature has nine resist values (`bol.lua` line 14). The slot order is not read. Recreate as a short per-damage-type vector so weapon choice matters.
- **Look-first reflex**: the raider tree is a selector whose first branch looks for a target (`ai/villageRaider.lua` lines 1 to 3). Recreate as an aggro reflex with a readable wind-up before the charge.

## 6. Inspiration briefs
Dom's rule for every brief: recreate as a clearly distinct original, never a copy. KEPT and CHANGED traits are named below.

1. **Grazing herd beast (own label)**. Why: a low, heavy, head-down silhouette reads calm, which suits a herd that drifts. Silhouette at 375 wide: wide body, short legs, lowered head (idea; no art in this donor to confirm). Signature behaviour: the group grazes as one cluster (flags in data). Signature sound: none in this donor (ours to design). Kept: PACK and HERD flags; one model with several hue skins. Changed: armoured back plates instead of plain hide, longer neck, palette ramp of our own, leader marked by a crest. Ref: `bin/scripts/mobile/dantooine/bol.lua` lines 25, 29, 30.
2. **Patrolling herd leader (own label)**. Why: a group that wanders then stops to rest is a readable calm-before-fight beat. Kept: dwell of 8 to 15 s on arrival at a patrol point (`herd.lua` line 18), then move on. Changed: the pause has a head-up scan, and zone data sets the dwell numbers. Ref: `bin/scripts/ai/herd.lua` lines 18, 23, 36.
3. **Reflex raider (own label)**. Why: a short look-first tree gives a clear first beat. Kept: look for a target first. Changed: a visible wind-up before the charge and our own aggro radius. Ref: `bin/scripts/ai/villageRaider.lua` lines 1 to 3.

## 7. Cross-link to our cell topics
- spawns / encounters: herd patrol and social keys (`ai/herd.lua`, `bol.lua` line 25) are worth a look for walk density and pack behaviour.
- loot: `bin/scripts/loot` (2,857 files) and the body-drop ledger above.
- camera, zones, hud-ui, vfx, animation, sound: no assets in this donor beyond data. Nothing to take for those.

## Not read
- `MMOCoreORB/src` (server C++): counts only.
- Most of the 6,499 mobile files, 17,485 object files, 2,857 loot files: counted, not opened.
- `sql/mantis.sql`, `sql/updates/`, most of `datatables.sql` (header and one CREATE TABLE only).
- `doc/` spreadsheets, images, zips; `bin/terrain`, `bin/navmeshes` binaries.
- `ai/` files other than `herd.lua` (first 30 lines) and `villageRaider.lua` (first 3 lines).
- `creatures.lua` beyond the first 30 lines.
- `custom_scripts/`, `screenplays/`, `docker/`, `linux/`, `wsl2/`.
- The 12,247 Lua files with no matched licence string: their own text not checked.
