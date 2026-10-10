# crawl-crawl (Dungeon Crawl Stone Soup, onboarding first 30 min, OB001)

Donor: /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/ (VPS, read-only, nothing copied or run). Code licence GPL v2 or later (LICENSE, README line 96, per AU011). Data text under dat/ is covered only by the general GPLv2+ statement (AU011, class B). Tiles are mostly CC0 with some unclear pieces (AU011, class C for the unclear ones). No audio in the tree (AU011). Hint and tutorial prose: do not copy, paraphrase only.

Checked: AU011 first (crawl has no DC catalogue). Then read: main.cc 455-476, 705-745 (goal line and god greeting), 780-790; startup.cc 435-439 and 1055-1085; newgame.cc 192-197 (and grep of 413-422); hints.cc 106-111, 398-470, 515-606, 878-900, 978-1031; tutorial.cc (whole file); dat/dlua/tutorial.lua (whole file); dat/des/tutorial/lesson1.des 1-63 and lesson2.des 1-45 (plus MONS and ITEM line counts for lessons 1-5); dungeon.cc 3240-3270; mon-util.cc 789-795; ng-setup.cc 340-352; dat/descript/hints.txt and tutorial.txt (block counts and key lists; prose not quoted); dat/database/miscname.txt 119-121 and 175-177 (goal-line variants). Confidence high for the cited lines. Not checked: the caller of hints_finished, the startup menu UI, the D:1 monster pick.

Half read: data (dat/descript, dat/des, dat/dlua) plus code (C++ start, hint and tutorial logic). No server half read. The tree has a webserver/ folder (AU011); it is not on the onboarding path and was not read.

## Summary
Crawl has no single onboarding. A normal new game gives a one-line goal and a "press ?" line, then no guidance. Hints mode adds a modal welcome and then teaches one event at a time, held until the character is calm. The tutorial is a separate game type with five marker-driven lesson maps and a fixed fighter. The most transferable pieces are the calm-gated hint and the death note picked by how the player fought.

## Onboarding (first 30 minutes), points 1-9 of the focus

1. First 90 seconds, before any control:
- Normal game: the startup menu comes first (startup.cc:1061-1085; the menu UI was not read). On game start, a yellow goal line is printed, chosen by game type (main.cc:721; the default line asks whether the player will find the Orb of Zot, miscname.txt:119-121; suffixes exist for hints, dungeon descent and Halloween, miscname.txt:175-177 and 217-219). Then a god greeting if a god is worshipped (main.cc:726-745). Then the "press ? for commands" line, but only outside tutorial mode (main.cc:467-468). No modal. No control is taken away.
- Hints mode: a modal welcome popup, about 70 lines of text (dat/descript/hints.txt, the welcome block), shown only on a new game start (main.cc:475-476, 787-788; hints.cc:398-417). Any key closes it (hints.cc:414). It explains the objective and the first keys.
- Tutorial mode: a fixed human fighter with a flail (newgame.cc:192-196). Lesson 1 starts with an intro message and then walking markers (lesson1.des:62-63).

2. First fight, first kill, first hit feedback, and staging:
- Lesson 2 is the fight lesson. It puts a quarterstaff on the floor (lesson2.des:35), a training dummy with 10 hit points and a whip (lesson2.des:37), a rat (38), a wyvern (39) and a jackal (40). Markers run in this order: pick up the weapon, melee, rest, wait (lesson2.des:41-45). The wyvern's cage or sleep state was not read, so the lesson's safety depends on it (not read).
- Normal game: no staged first fight was read. The depth-1 monster pick (mon-pick and spawn depth rules) was not read. The arrival vault is the depth-1 fallback only (dungeon.cc:3255-3256). Firewood, a class of stationary no-threat monsters, is defined at mon-util.cc:791-793 and is used by the hints for zero-experience monsters (HINT_SEEN_ZERO_EXP_MON; hints.cc:797-805).
- First kill: the hint event HINT_KILLED_MONSTER exists (hints.h:69, and a hints.txt block by that key). When the first monster is seen, hints_monster_seen fires once and stops the run (hints.cc:793-835).
- First hit feedback: not read (message.cc and ouch.cc combat messages were not read).

3. First reward, first loot, first level or unlock, and celebration:
- First item seen: a hint fires once and stops the run (hints.cc:878-900; the flag is cleared at 897). It is called from stash and travel code (stash.cc:358, travel.cc:5145).
- Level-up: the new-level and choose-stat hint events exist (hints.h:70, 75; hints.txt blocks by the same keys). The tutorial arms only a short list at setup (hints.cc:978-1008, called from ng-setup.cc:348). The level-up lesson line and its lua call site were not read.
- Loot ceremony: not read beyond the first-item hint.

4. First hub or town, and services one at a time:
- No town on depth 1 is shown in the read code. The depth-1 arrival vault is a fallback (dungeon.cc:3255-3256), not a hub.
- Services are taught in lesson 3, in this key order: gold, shop, enter shop, autoexplore reminder, go shopping, optional battle (dat/descript/tutorial.txt key list, read by names only). Shop hint events exist (HINT_SEEN_SHOP, HINT_SEEN_BAZAAR_PORTAL; hints.txt keys). The shop placement in the normal game was not read.

5. First meaningful choice:
- The startup menu (species and background) is the first real choice. Its UI and the options it offers were not read in detail. Lesson 5 is the religion lesson (keys altar, religion, piety on kill), which is later than the first 30 minutes.

6. Pull-forward hooks (minute 5, 10, 30):
- The donor counts game turns, not minutes. Turn gates in hints mode: shift-run hint at turn 200, map view at 500, auto explore at 700, and only when the character is safe and at full hit points and magic (hints.cc:434-457). The minute mapping is not measured: at most a guess that turns track minutes.
- Warnings: below half hit points a run-away hint fires (hints.cc:468-469); when poison is lethal, a poison-healing hint fires (hints.cc:461-466).
- Graduation: a hints-mode character who reaches XL 7 gets a finished hint and becomes a normal game (hints.cc:580-603; the caller that checks XL 7 was not read).
- Death: a death note (see point 8 and the death section below).
- Normal game: no pull-forward beyond the goal line.

7. Tutorial style:
- Tutorial mode is forced in the sense that it is its own game type with lessons, and each lesson's messages fire when the player steps on a marker (tutorial.lua:7-12; lesson1.des:42-50). A message can be one-time: the marker removes itself after it fires (tutorial.lua:12). Lesson 1 exits through one-way stairs (lesson1.des:51-55).
- Hints mode is optional. The welcome is a modal (one key to close). Other hints are written into the message log on the tutorial channel and stop running (hints.cc:503-512). The death screen uses two more prompts (hints.cc:519-520, and a further more() after the text).
- Text length: the welcome is about 70 lines. Other hint blocks were counted, not measured.
- Counts: hints.txt has 218 blocks (1 welcome, 10 death, 8 finished, the rest keyed to HINT_ events). tutorial.txt has 89 blocks: lessons 1 to 5 hold 15, 16, 24, 17 and 10 keyed blocks; the other 7 are intro, death and separator blocks. The counts come from grep on the %%%% blocks, not from a script run.

8. Drop-off risks, and what the donor avoids:
- Avoided: hints wait for calm, so teaching does not interrupt a fight (hints.cc:434). At most one hint per turn unless the event is rare (hints.cc:1012-1024). Each event fires once (hints.cc:1031).
- Risks: a new player who picks the normal game gets only the goal line and the "?" line. The tutorial uses a fixed character, which does not match a normal start. The welcome is about 70 lines before the first control. The death note adds two more() stops.

9. Could be ours at 20-30 percent resemblance, and the 5-minute look test:
- Idea A, death note by play style. Keep the counter rule: a note picked from what the fight showed (spells, melee, throws, berserk), with a random fallback that skips the generic first slot when the character relied on spells or throws (hints.cc:515-575). Change: our counters (hits taken, attackers at once up to our cap of 3, potions used) and two lines on a phone card.
- Idea B, calm-gated teaching with turn gates. Keep: a tip waits for calm and full hit points, and a run-away tip fires below half. Change: "calm" means no enemy within our 8-cell ring and full hit points.
- Idea C, once-per-event flags with a one-per-turn cap (hints.cc:1012-1031). Keep the flag and the cap. Change: flags are client-side presentation state, not ledger state.
- Idea D, marker-driven lesson maps as zone data (tutorial.lua; lesson1.des). Keep: one-time markers on glyphs that fire a message. Change: our first zone carries the markers as data.
- Look test (5 minutes, phone, 375 wide): a style flag on the existing opening (look-test skill, no release rows). Show two death cards after the same loss: one by the counter rule, one generic. Dom judges which reads as a coach. Second test: a short fight with a tip shown only after the hero stops at full hit points, against one shown during the fight. Dom judges whether the tip is welcome or noise.

## Note (feel template)

1. What the player sees and feels: a normal start is quiet. A yellow line states the goal, a god may speak, and a "?" line points at the command list. The hints-mode player sees a long welcome box first, then tips that arrive only when the character is standing still and healthy. On a phone, a tip is one message line, and a death leaves a short coach line before "See you next game!".

2. Why it works or is striking: readable at 375 wide? Not checked (tiles are 32 by 32 per AU011, not viewed). Signature behaviour: tips that wait for calm, and a death note picked from the fight. Signature sound: none (no audio in the tree). Could be made ours at 20-30 percent: yes, see ideas A to D.

3. The rule behind it: the order is quiet start, then one event at a time. A hint fires only if its flag is still set, the character is safe and at full hit points, and no other hint fired this turn (except rare ones). Numbers as designer data fields (donor values null because the donor is GPL):
- calm_gate: safe, full hit points and magic (no unit)
- turn_gate_shift_run: 200 game turns
- turn_gate_map_view: 500 game turns
- turn_gate_auto_explore: 700 game turns
- run_away_fraction: below 0.5 of max hit points
- hints_per_turn_cap: 1 (rare events excepted)
- graduate_xl: 7
- death_random_slots: 6 (slot 5 needs at least two visible monsters)
- welcome_lines: about 70 (text, not a number to tune)

4. For Frankendom: 700 zones as data: each zone can carry its own lesson markers (idea D) and its own calm and turn gates. The first ring fight uses our Pit characters with at most three attackers, so the death note counts our many-vs-one losses. Server-verified events: the first kill, the XP and the loot grant are server-side; the tip, the flags and the death note are client presentation, so they never change the ledger. Keep: the calm gate, the one-per-event flag, the death note by play style. Change: the normal game gets our first-run guidance, so a new player is not left with one goal line.

5. Five-minute look test: see the list under point 9.

6. Licence and IP: GPL v2 or later for code and for dat/ text under the general statement (AU011). Clean-room shape only: the hint text, the tutorial lessons and the welcome are prose; do not copy. Category-level only: "a tip that waits for a calm moment"; "a death note picked from how you fought". We keep the counter rule and the calm gate and change every word, counter name and map.

7. Gaps: not read: the startup menu UI; the depth-1 monster pick and layout; ouch.cc and message.cc (hit feedback and combat messages); the lesson 3 to 5 maps and their monster lines beyond the counts; the caller of hints_finished; the welcome_spam variants beyond the lines cited; the webserver folder. Half read: data and code of the onboarding path only. The lesson texts were read by key name only.

Best transferable idea: give each hint a one-time flag and a calm gate, and pick the death note from what the fight showed.

Idle and ambient, death and respawn, loot ceremony, walk density, readability at 375 wide:
- Idle and ambient: not read.
- Death: the donor's death screen is a coach note (hints mode) and a canned "you die" message in tutorial mode (tutorial.cc, tutorial_death_message). Permadeath is implied by the death screen; no respawn was read.
- Loot ceremony: first-item hint only; the rest not read.
- Walk density: not read.
- Readability at 375 wide: not viewed; 32 by 32 tiles per AU011.
