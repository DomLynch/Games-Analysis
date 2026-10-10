# angband-angband - encounter-templates (EN001)

Donor root: /mnt/frankendom-donors/angband-angband/ (VPS, read-only). Asset audit read first: AU004/angband-angband.assets.md (code GPL 2 or the Angband licence; the Angband licence is for non-profit copying per docs/copying.rst line 10). Data files are lib/gamedata/*.txt.

## 1. What the player sees and feels
Most of a level is corridors and rooms. Then a room is full of one kind of thing: a pit where a ring of fire dragons sit in a hall with an inner room, a nest of mixed beasts with no order to them, a kobold den, an ant nest, a zoo, a plague pit. The pit's theme is visible from the door: every monster shares one trait (all breathe fire, all are animals, all are undead). The player walks in, sees a crowd of one flavour, and the room's ground may hold a few items. On 375 wide, the readable thing is a single theme with a count, not a list.

## 2. Why it works / is striking
- Readable theme: each pit has one signature trait (a breath element, a flag like ANIMAL or UNDEAD, a base family). The player reads the theme in one glance.
- One signature behaviour: a pit is a theme filter plus a ban list. Dragons that all breathe the same element, but never the opposite one, so the room has one clear counter.
- One signature sound or effect: not read (sound files exist in lib/sounds with depth-tied ambience per AU004, but not opened).
- Could be ours at 20-30 percent resemblance: yes. The theme-filter idea is the strongest transferable piece.

## 3. The rule behind it (data, not code)
a) Pit and nest templates: lib/gamedata/pit.txt. 40 entries: 26 room:1 (pit, ordered by level), 8 room:2 (nest, mixed), 6 room:3 (other, for thematic placement in any room). Each entry sets a `mon-base` list, optional `flags-req`, `flags-ban`, `spell-req`, `spell-ban`, `color` and `mon-ban`, and an `alloc:rarity:average level` line (for example Orc pit `alloc:1:25`). Acid dragons (line 93) require the acid breath and ban the electric breath, with dragon and ancient dragon bases. Creepy crawlies (nest) bans blink, confuse and slow, so the swarm stays fair.

b) Pit engine: source/gen-room.c `build_pit` (line 2780 on). Interior 9 rows by 15 columns (`int height = 9;` line 2787, `int width = 15;` line 2788), an inner room 5 by 11 behind one closed door, 16 monsters picked with `get_mon_num(depth+10, depth)` (line 2832), sorted by level. Each square has an object chance equal to the pit's obj-rarity, a percent (pit.txt line 40 header).

c) Group escorts: lib/gamedata/monster.txt, 433 `friends:` lines and 49 `friends-base:` lines. Format from the file header (line 177): chance : number in xdy : name. Engine: source/mon-make.c `place_friends` (line 1283 on). `level_difference = depth - monster level + 5`. At 0 or less, no group (non-unique) (line 1300). Below 10, the group size is `total * level_difference / 10` with a probabilistic extra from the remainder (line 1305 comment). Donor's own comment (monster.txt line 179): half the group at natural depth, full complement five levels deeper.

d) Vault and room stamps: lib/gamedata/vault.txt, 161 entries: Greater 27 + 13 new, Lesser 14 + 12 new, Medium 14 + 15 new, Interesting room 66. Symbols per cell: `1` is monster 50 percent, object 25 percent or trap 6.25 percent (line 43 legend); `2`, `6`, `0`, `8` set how far out of depth the monster is (up to 5, 11, 20 and 40 levels). Interesting rooms with rating 0 include Akela's Pack (line 2140), Party of adventurers (line 2178), Zoo (2597), Kobold den (2672), Giant's Armoury (2698). lib/gamedata/room_template.txt has 415 template names in types 1 to 3.

e) Level profiles: lib/gamedata/dungeon_profile.txt, 9 profiles (town, labyrinth, cavern, classic, modified, moria, lair, gauntlet, hard centre). Line 88: classic `params:11:50:200:2` (block size 11, aim for 50 rooms, unusual 200, max rarity 2). Line 187: lair `params:1:50:500:2` with min-level 20 and alloc 1. Line 132: `room:monster pit:0:11:33:5:1:2:12` (pit flag 1, level 5, rarity 2, cutoff 12).

## 4. For Frankendom
- 700 zones as data: a zone's template list is a weighted table keyed by depth band, like the profile's room list. A row is (template, weight, min depth, rarity tier, cutoff).
- 100 Pit characters: use the theme filter. Every template picks its members by tags (element, family, flags) from the 100, with a ban list for unfair combinations (no slow or confuse in a swarm). The filter is data, so a new zone reuses the 100 without new art.
- Many-vs-one: the pit's 16 members are too many for phone duels. Keep the theme and the order (sorted by level, lowest first) but cap the on-screen attackers at 3 and queue the rest, as in our rule.
- Out-of-depth rule: a friend group is scaled by how far its level sits from the zone depth. Keep it; it turns one monster row into several zones.
- Server-verified: the server picks the template and the group size. The client gets `pit_entered(theme, count)` and presents the theme. The loot roll from object chance is one ledger row per drop.
- Keep separate from spawn caps: the pit or friend size decides what forms in a room; the zone spawn cap decides the total on the map.

Keep: theme-filter templates with ban lists, depth-scaled group size, a per-cell probability table for stamps (the 50/25/6.25 split is a density knob), rarity plus cutoff rows for the room list.
Change: 16-member pits become 3-active plus a queue. Angband's names (Akela, Zoo, Giant's Armoury) and its monster names are not ours. The donor's legacy flicker palette (visuals.txt) is out of scope.

## 5. Five-minute look test (Dom, on his phone)
Make one stub room with three themes shown at 375 wide: a fire pit (dragons that all breathe fire, no cold), a swarm of crawlers (no slow), and an animal den. Walk in and answer: could you read the theme from the door, did the crowd feel like one thing, did three attackers at a time feel right? Then show the same room with 2 active and 4 active and pick.

## 6. Licence and IP
Code: dual licence, GPL version 2 or the Angband licence (docs/copying.rst line 5). The Angband licence allows copying for educational, research and not-for-profit use (line 10). Assets: AU004 class A/C; not used here. Rule for us: inspiration stays category-level. Use 'a hall of one element with a counter', 'a den of small swarming things', 'a room of one theme'. Do not copy the 40 pit names, the monster rows, the vault maps, or the 'DRL' and '-ES-' tagged room names. No legal conclusions drawn.

## 7. Gaps
- Half read: data plus engine. Read: lib/gamedata/pit.txt (header and lines 1-200 of 389), vault.txt (header and counts, Interesting room names), dungeon_profile.txt (header and lines 84-109 and 186-200), monster.txt friends header and a sample (lines 175-183, 257), room_template.txt counts only. Engine: src/gen-room.c `build_pit` (2780 to 2850), src/mon-make.c `place_friends` (1283 to 1312).
- Server half: none found. The top-level listing shows no server directory; not searched further.
- Not read: pit.txt lines 200 to 389; vault layouts beyond one sample (Birds of a feather, 5x5 block of B symbols); room_template.txt bodies; the friends role suffix values (the header says roles are appended to the line end; not counted); src/gen-room.c beyond build_pit; sound.prf and lib/sounds; the rating-0 flag on the 66 interesting rooms was seen for the first 15 only.
- Unexplained name suffixes ('-DRL', '-ES-') in room names: not explained in the files read.
- Code comment mismatch: place_friends says 'More than 4 levels OoD' but the arithmetic (`depth - level + 5 <= 0`) gives five or more levels out of depth. Read the arithmetic, not the comment.
- No 'walk density' number per level in the parts read. Closest knobs: rooms aimed per profile (50), per-cell chances in stamps, per-square object rarity in pits. None is a monsters-per-20-seconds figure.
