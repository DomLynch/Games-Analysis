# angband-angband (onboarding first 30 min, cell OB002)

Donor/Licence: GPL version 2, or the Angband licence (dual; `docs/copying.rst` line 5, per AU004). Not OSI-clean for reuse: clean-room, shape only. Asset groups are mixed (AU004 classes A/B/C); nothing here copies art, sound, names or lore text.
Checked: `src/ui-birth.c` (birth loop 1599-1640, quickstart 103-135, menus), `src/player-birth.c` (player_outfit 584-625, gold 693), `src/gen-cave.c` (town_gen 2680-2740), `src/game-world.c` (is_daytime 125-131), `src/ui-store.c` (random_hint 121, prt_welcome 139-160), `src/cmd-cave.c` (display_feeling 1725-1775, feeling texts 1687-1721), `src/ui-death.c` (death_screen 374-421), `src/player.c` (level-up message 238), `lib/gamedata/{class,monster,store,hints,world,constants}.txt`, `lib/screens/news.txt`, `src/list-options.h`. Confidence: high on counts and the feeling/quickstart/town rules; medium on the first-30-minute narrative (no full run-through, no sounds, no combat code).
Verdict: STRONG (two mechanisms, both real and read: the two-stage level feeling and the day/night town population with a zero-XP town). Best transferable idea: a zone arrives with a threat line at once and a loot line only after a set number of tiles explored, so the first minute gives a reason to look around.
Decision: adapt (idea). No donor values are copied (donor licence is not MIT/Apache/BSD), so every number below is our own designer-tunable field.

## 1. What the player sees and feels (first 90 seconds, then first 30 minutes)
- Start: a splash screen with a title block, a short in-world blurb, and a one-line hint that help is one key away (`lib/screens/news.txt` line 22). The exact first-frame order was not traced (`src/ui-display.c` 2387-2460 is the splash code).
- If a previous character exists, a quickstart prompt appears: use as is, redo, change name and history, or open birth options (`src/ui-birth.c` 111, gate 1621). A new player goes race, class, stat roll, name, accept history (y/n), confirm. No tutorial string was found in `src/` or `lib/` (grep for tutorial, intro, welcome, first-time returned only birth, hint and feeling code).
- The player stands in a small town (66 x 22 grids, `lib/gamedata/constants.txt` lines 110 and 113). Daytime is the first half of each day cycle (`src/game-world.c` 125-131). Four townsfolk appear by day and eight at night (`constants.txt` 24 and 27; `src/gen-cave.c` 2689), placed three grids away (`src/gen-cave.c` 2731).
- The town residents are weak. There are 16 depth-0 monster entries in `lib/gamedata/monster.txt`; every one has experience 0 (awk count, not receipted). Beggars and a drooling idiot have no damage blow; a scrawny cat and a scruffy dog hit for 1d1 (line 262); a mean mercenary hits for 1d10 with 23 HP (lines 452, 465); a singing drunk drops gold only (line 428). So the first fight earns gold, not XP.
- Starting kit comes from the class table (`lib/gamedata/class.txt` 154 for the warrior potion; the kit list is in `src/player-birth.c` 584-625). With the start-kit option off, the hero gets only food and light (`src/player-birth.c` 612). Starting gold is 600 (`constants.txt` 201). Unspent point-buy points convert to gold at 50 each (`src/player-birth.c` 693).
- The first level-up is a text line, "Welcome to level N." (`src/player.c` 238). No sound or visual celebration was read.
- The first hub is the town shops: eight store entries in `lib/gamedata/store.txt` (lines 21 general, 54 armour, 90 weapon, 136 book, 153 alchemy, 183 magic, 215 black market, 223 home). All are open from the start; no one-at-a-time introduction was found. Shopkeeper greetings are random: half of greetings say nothing, and when a hint exists a third of the rest quote one (`src/ui-store.c` 146-160).
- Hints: 99 lines in `lib/gamedata/hints.txt`, each on one line and under 80 characters (line 8 states the rule). Example topic: Word of Recall (line 35). These are the only in-game tips found.
- Minute 5 hook: the dungeon arrival. The monster feeling is given at once and is worded by danger, from the most dangerous wording down to the calmest (nine real tiers after a placeholder; `src/cmd-cave.c` 1707-1721, check at 1751). The object feeling is held back until the player has seen enough squares (`src/cmd-cave.c` 1726 comment; 1752 check; `constants.txt` 119 sets 10 squares). The object feeling has 11 tiers from "wondrous power" to "cobwebs" (`src/cmd-cave.c` 1687-1699).
- Minute 10 and 30 hooks: 128 level records (`lib/gamedata/world.txt`: Town then Angband 1 to 127, line 6 for the first step). Connected stairs are on by default (`src/list-options.h` 76-77). Shop stock turns over (turnover 0 to 9 per store, `store.txt`; the bookseller is 0).
- Death: a tombstone-style screen with a menu of information, messages, file dump, scores, item examine, history, spoilers, new game, quit (`src/ui-death.c` 356-421; quit confirm line 411). There is no respawn path in the read code: this donor looks permadeath (inferred from the menu; the death path was not traced).

## 2. Why it works / is striking
- Readable at 375 wide: the danger word is one short line on arrival, so the player reads it in one glance and does not need a HUD bar.
- One signature behaviour: the feeling line arrives early and the loot line arrives late, so curiosity is spent in a set order.
- One signature sound: not read (sound prefixes only, AU004).
- Could be ours at 20-30 percent resemblance: yes. The town fight is harmless by data, the feeling text is ours, and the level is data.

## 3. The rule behind it
Rule A, two-stage level feeling (`src/cmd-cave.c` 1729-1775):
1. On arrival, the monster tier is shown at once (tier = danger of the level, 1 to 9 in this donor).
2. The object tier is shown only after `feeling_need` squares have been seen; the combined line picks a joining word ("and" or "yet") from the two tiers (`cmd-cave.c` 1764-1770).

Rule B, town population by time (`src/gen-cave.c` 2689-2735): residents = day count when day, else night count; placed at a set distance from the arrival square.

Rule C, shopkeeper hint chance (`src/ui-store.c` 146-158): skip half the time; otherwise a hint if hints exist with a one-in-three roll; else a level-based welcome.

Data fields (designer-tunable, donor values NOT copied):
| name | unit | donor_value_or_null |
|---|---|---|
| town_residents_day | count | null |
| town_residents_night | count | null |
| town_spawn_distance | grids | null |
| feeling_need_squares | squares | null |
| monster_feeling_tier | 0-9 per zone | null |
| object_feeling_tier | 0-10 per zone | null |
| starter_gold | gold | null |
| point_leftover_gold | gold per unspent point | null |
| hint_skip_chance | percent | null |

## 4. For Frankendom
- 700 zones as data: each zone carries the two feeling tiers and the town/residents numbers. The threat tier is set server-side from zone data; the client only shows the line. This maps to parity row 23 (zone population) for the residents and to row 18 (loot roll and XP) for the object tier.
- 100 Pit characters reused across zones: the town residents can be the same 100-character pool, drawn at a day or night count (data, not new art).
- Many-vs-one: the town residents are weak and few (max 3 attackers in our rule), so the first fight is a teaching fight, not a risk. That fits the MAX_ATTACKERS = 3 ruling.
- Keep: the two-stage reveal; the harmless, zero-XP first fight; day and night counts; hints under 80 characters.
- Change: no permadeath unless we rule it (row 17 death/respawn is ours to set); no ASCII text screens; the hint line goes on the shop greeting only if it reads in two seconds at 375 wide.
- Single ledger: the quickstart prompt is useful only if it keeps one character and one ledger. Keep "use as is" and "redo"; drop "change history" unless a character history exists in our data.

## 5. 5-minute look test (Dom, on phone)
Build one 375-wide mock with no engine: (a) the arrival card: a threat line on the first screen; (b) a second line that appears only after ten tiles are walked; (c) a town square with four harmless residents (beggar, cat, dog, drunk) at three tiles, gold-only drop, zero XP shown as a number; (d) a single hint line on the first shop visit. Compare it with the current Pit intro for: first hit in under 10 seconds, whether the threat line makes him want to look around, and whether the loot line feels like a reward or a delay. Pass if he can name the threat without reading twice.

## 6. Licence and IP
- Code and most game data: GPL v2 or the Angband licence, dual (`docs/copying.rst` line 5; file headers say "Other copyrights may also apply", AU004). Shape only, clean-room.
- Art and sound: mixed (AU004 classes A, B, C). Nothing reused.
- Names: the town residents and the shopkeepers carry names from other works in the donor data (not reproduced here; checked only as categories). Our own names for all of them.
- No legal conclusion is drawn.

## 7. Gaps
- Not read: combat code (`src/player-attack.c`, `src/mon-attack.c`), so no hit-stop, flash, shake or knockback order was recorded. Hit feedback in the first fight is therefore not described.
- Not read: sound files and `lib/customize/sound.prf` beyond AU004; no sound ordering.
- Not read: the depth-1 monster list (15 entries counted, none read in full), item generation (`src/obj-make.c`), and the store stock logic (`src/store.c`).
- Not read: the help files beyond their names (`lib/help/*.txt`), and the point-based stat roller in full.
- Half read: data pack (`lib/gamedata`) plus the game logic in `src/` in part. There is no server half in this single-process donor. Mark: "half read: both" (data and client-side logic; server does not exist here).
- Unverified: whether death is permanent in play (menu read; respawn path not traced).
