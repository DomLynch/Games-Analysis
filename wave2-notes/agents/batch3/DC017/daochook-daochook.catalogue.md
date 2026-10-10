# daochook-daochook (design catalogue, DC017)

Donor tree: /mnt/frankendom-donors/daochook-daochook/ (read over ssh only, nothing copied or run).
Asset audit used first: AU013 (`/private/tmp/p2/wave2-haiku/batch3/AU013/daochook-daochook.assets.md`). Not repeated here.
Receipts: `receipts.tsv` in this folder (verified with verify_receipts.py).

Donor type: a client-side Lua add-on framework (overlay windows, memory-reading helpers) for a commercial MMORPG client. It is not a game and ships no game content. The files read contain no creature, class, weapon, gear-set or zone names. The usable material is item-record shape, equipment slot taxonomy, one relative-difficulty rule and some window layouts.

Halves:
- Client add-on half (Lua): read in part. Read: addons/libs/daoc/1127101_1409/ (items, entities, player, buffs, data, game), addons/find/find.lua. Not read: the 11130_0 build folder (same file names), addons/libs/socket/, addons/packetlogger/.
- Binaries: daochook.exe, hook.dll, addons/libs/socket/ssl.dll. Not read.
- Server half: not in the box. The README states the work targets private servers; I did not look for one.
- Data-pack half (the user's own game client): not in the box. No matching data folder found in the box.

Licence note: code is GNU AGPL v3 (LICENSE line 1; README line 69-71). No game art, audio, models or maps in the tree. The only image (repo/daochook.png) is class C and not opened. Ideas below are taken as shape only. No code is reused.

## Counts (from grep and the files named)
- creatures: 0. No monster names or families in any file read.
- classes: 0. No class or race names. Realm fields only.
- weapons: 0 named. Item type ID band for weapons is 1-28 (ID numbers, not names).
- gear_sets: 0. Equipment slot names are slots, not sets.
- zones: 0. Map position only.

## 1. Creatures and beasts
None in the files read. The entity record (entities.lua ~290-330) holds name, title, health, level, realm and map position at run time. It carries no families or tiers.

The one enemy-related rule is target difficulty. It is an integer from -2 to +2. The add-on shows it by appending --- or +++ to the target name (entities.lua:504 comment, :506 function). That is the donor's whole enemy-tier idea.

Top 8 striking creatures: none. (creatures = 0.)

## 2. Classes, races, factions
None named. Realm fields exist: a realm id on each entity (entities.lua:304, 319), and local realm rank and realm skill points read from attribute slots (player.lua:36, 95, 101-106). These are progression counters. The rules that grant them were not read.

Progression shape: not visible in the files read beyond the counters.

## 3. Weapons
No weapon names or families. Item type band 1-28 is the weapon range (items.lua:395-396). Armour band is 31-38 (items.lua:397-398). House items are 49-71 (items.lua:399-400).

Stat line: weapons show DPS and speed. Type 16 shows a count in place of speed (find.lua:51-52). No elemental or set bonus appears in the files read.

Special properties: an item can carry up to two spell names, flagged by bits 0x08 and 0x10 (find.lua:179-186). These are on-item spells, not weapon families.

Visual tiers: the add-on does not draw items. The game does.

Top 5 striking weapons: none. (weapons = 0.)

## 4. Armour and gear
No sets and no material names. Gear tiers are fields on the item record (items.lua:418-422): condition, durability, quality (percent), bonus and bonus level. The find window shows Quality and Bonus as columns (find.lua:143-144).

Equipment slot taxonomy (slot names in items.lua:462-494; slot IDs in items.lua:41-62): head (ID 21, items.lua:54), body (25), neck (29), quiver (quiver1 = ID 14, items.lua:47), horse barding (ID 8, items.lua:41), plus hands, feet, jewel, cloak, legs and arms. This is the most reusable gear idea in the donor: a fixed slot list.

Top 5 striking gear items: none named. The slot list is the closest fit (see section 7).

## 5. Zones and dungeons
None. entities.lua:323-324 converts a world position into map x and y through daoc.game (game.lua body not read). No biome, dungeon or hazard names.

Top 5 striking zones: none. (zones = 0.)

## 6. Item and effect looks worth recreating
- Relative-difficulty name marks: a signed -2..+2 value shown as --- or +++ after the name (entities.lua:504, 506). Technique: a signed integer rendered as glyphs on a name string, shown only on the current target. Ref: addons/libs/daoc/1127101_1409/entities.lua:504-506.
- Item inspect tooltip: slot line, separator, name, level, up to five value lines, separator, then spell lines only if their flag is set (find.lua:164-186). Technique: sectioned card, optional section gated by bit flags. Ref: addons/find/find.lua:164-186.
- Searchable item table: a name filter, four columns with fixed widths (Slot, Quality, Bonus, Name), rows selectable across columns, hover card (find.lua:140-144). Technique: filter first, then table. Ref: addons/find/find.lua:139-165.
- Metallic, gold or glow looks: none. The add-on draws only ImGui text and tables. No shader or particle code in the files read.

## 7. Inspiration for Frankendom
Dom's rule: each idea below is a clearly distinct original, never a copy. Only the shape is taken from this donor.

1. Threat ticks (parity row 14, HUD): a five-step tick row above an enemy name showing its level against the hero, from -2 to +2. Keep: a signed five-step scale shown only on the current target. Change: our own glyphs, not text-only, with a non-colour cue so it reads for colour-blind players at 375 wide.
2. Loot inspect card (parity row 18, phone inspect flow): a sectioned card with a slot line, level, up to five value lines, then an optional spell block after a separator. Keep: sections, separators and the flag-gated spell block. Change: tap to inspect on the phone, plus a compare-to-equipped row, in our own layout.
3. Gear finder panel (parity row 15 and loot): name filter, fixed columns Slot, Quality, Bonus, Name, hover detail. Keep: the filter-then-table shape. Change: a card list on a 375-wide phone, no hover, a slot filter chip.
4. Fixed body-slot list (parity row 15, gear dressing): a fixed slot set (head, body, neck, hands, feet, cloak, legs, arms, jewel) plus mount and quiver slots as data. Keep: the slot set is data, not code. Change: our own slot names for the hero rig, and a companion slot in place of horse slots.
5. Per-build data folders (parity rows 20-21, catalogue as runtime source): one config per build id and a version-scoped module folder over a shared core (config/pointers/, addons/libs/daoc/<build>/). Keep: version data in one folder, shared code in another. Change: content packs for zones and creatures as catalogue data, not client builds.
6. Dev event feed (parity row 19, fight record): a rolling list of recent events in a dev-only window (addons/packetlogger/, name read only). Keep: a rolling recent-events list. Change: a dev toggle, category filters, and event IDs that link to the fight replay.
7. Banded item IDs (parity row 21): item type IDs grouped into bands (weapon 1-28, armour 31-38, house 49-71). Keep: numeric bands so a loader can tell categories apart. Change: our own band layout, with readable IDs in the catalogue.

## Not read
Binaries (daochook.exe, hook.dll, ssl.dll). The 11130_0 build modules. addons/libs/socket/. addons/packetlogger/ body. addons/example*/ bodies. config/pointers/*.ini bodies (per-build pointer tables; not described). config/boot/example.ini. The logo. Third-party library licence texts (not in the tree). The donor website (not fetched). Locale or string table: none found in the listing.
