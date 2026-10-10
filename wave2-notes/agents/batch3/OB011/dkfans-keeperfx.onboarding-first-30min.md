# dkfans-keeperfx (onboarding-first-30min, OB011)

Donor: KeeperFX (/mnt/frankendom-donors/dkfans-keeperfx/), a remake of Bullfrog's Dungeon Keeper. Licence: GNU GPL v2 (LICENSE line 1; README.md:103). Map scripts and the string template carry GPL headers (campgns/keeporig/map00001.txt lines 9 to 14; lang/gtext_eng.pot header). Original Dungeon Keeper art, sound and maps are NOT in the repo (docs/files_required_from_original_dk.txt). Depth: full. Half read: data (campaign scripts and string table) plus the engine code that defines what the script commands do.

Checked: campgns/keeporig.cfg; campgns/keeporig/map00001.txt (read in full), map00002.txt and map00003.txt (trigger lines via grep); campgns/campgn_order.txt; lang/gtext_eng.pot (guitext entries 0 to 60 with designer notes; 1,124 guitext references total); src/lvl_script_commands.c (tutorial_flash_button_process, command table); src/lvl_script_commands_old.c (command_add_tunneller_party_to_level body; likely not the live handler, so its argument meanings are not verified); src/gui_frontbtns.c lines 246 to 250 (click clears the flash); src/creature_states_combt.c line 270; src/main.cpp line 892 (default turns per second); src/config_keeperfx.c line 895. Not read: the live handler for ADD_TUNNELLER_PARTY_TO_LEVEL (its argument meanings are not verified), gui_set_button_flashing body, the compiled gtext .dat (built from .po files not in lang/ except the template), map layouts (not in repo), intro/outro media (not in repo).

Half read: data. Engine code was read only to confirm what a few script commands do.

## 1. What the player sees and feels
The first level opens with a single objective on screen at turn 0 and the Treasury build button already flashing until the player clicks it. The player starts with 2,500 gold, seven creature slots, a Fly available at once (a pool of three Flies, map00001 line 38), the Treasury room, and the Slap and Hand powers. Lair, Garden and Imp are locked. The first hint line arrives at turn 125 (roughly 6 seconds at the default 20 turns per second). The camera-controls hint arrives only after the Treasury is built and turn 175 is passed. The player is told the next goal in one line at a time and sees the next locked item unlock when the last step is done. Map layout is not in the repo, so the first screen's geometry is not known (not read).

## 2. Why it works / is striking
- One goal on screen, a flashing button that points at the control, and the flash clears when the player clicks that control (gui_frontbtns.c lines 246 to 247). Show, don't tell, at 375 wide: a flashing button is a readable beat without text.
- The hint text is short: most lines are one or two sentences (pot notes for guitext 5, 11, 18, 19). Fits a phone toast.
- Enemies are capped and scripted: first-wave enemies are capped to level 1, and the first wave cannot flee when wounded (fear_wounded 0 per script; creature_states_combt.c line 270 says that threshold is a percent of base health). The first fight is a fight to the end.
- The Lord is named as the rival before he arrives: the line after the first win says his party will soon be here (guitext 18 note; the hook is in map00001 lines 190 to 203).
- Could be ours at 20 to 30 percent: a one-goal ladder, a flashing control until tapped, and a named rival line after the first win.

## 3. The rule behind it
A progress ladder in one player-scoped state value (FLAG0). Each step is a state test, not a clock. Level 1 values in map00001: 0 at start; 1 when the treasury has 9 tiles (line 88 to 91); 3 when the lair has 9 tiles (lines 113 to 116); 4 when the garden has 9 tiles (lines 161 to 166); 5 when the player holds 7 creatures (lines 173 to 176); 6 when the first wave is beaten (lines 190 to 193); 7 when the Lord arrives (lines 200 to 205); win when no good-side creatures remain (lines 212 to 216).
Timers (game turns) are short pauses inside a stage: 600 turns to a hint line, 800 turns to the first wave (lines 181 to 187), 500 turns after the first win to the Lord (line 201). Gold gates are cumulative counters: hints at 1,000, 5,000 and 9,000 gold mined (lines 101 to 111); the lair unlocks at 9,000.
Safety net: if the player runs out of imps, the script gives a power back and shows a hint (lines 220 to 224).
Creature cap grows with the campaign: 7 creatures in level 1 (map00001 line 36), 14 in level 2 (map00002 line 50), 8 at start then 12 later in level 3 (map00003 lines 45 and 173).

Data fields (designer-tunable; donor values null because GPL, shape only):
- start_gold: unit gold; donor_value null (level 1: 2500)
- creature_cap_stage1: unit creatures; null (7)
- hint_turn_first: unit game turns; null (125)
- hint_turn_camera: unit game turns; null (175)
- first_wave_timer: unit game turns (absolute timer value; the hint fires at 600); null (800)
- lord_delay_after_first_win: unit game turns; null (500)
- gold_hint_thresholds: unit gold mined; null (1000, 5000, 9000)
- enemy_level_cap: unit level; null (1)
- enemy_strength_knight: unit stat; null (30); enemy_armour_knight: null (30)
- fear_wounded_pct: unit percent of base health; null (0)
- turns_per_second_default: unit turns per second; null (20; main.cpp line 892; config may override)

## 4. For Frankendom
- Map to our shape: the ladder is per player, server-side. A ladder value (say 0 to 7) lives in the player's one ledger. The client shows the flash, the banner and the line. The engine decides the step.
- The first fight in our ring: one attacker, capped to the first zone's enemy level, no flee when wounded (scripted first fight only). Ladder to two and three attackers (our MAX_ATTACKERS = 3). The fight is the first lesson, so it is won by design.
- Town hall services one at a time: bank first, then shop, then trainer, each unlocked by a ladder step and flashed until visited. Keep the flash-until-clicked rule.
- Keep: one goal on screen; the flash clears on the real control; counted triggers (kills, gold, loot) rather than clock; a named rival line after the first win; one-line hints.
- Change: do not gate on "exactly the cap" (see drop-off risk a below); do not use turn-count pauses as the main pacing (use server ticks and a grace timer); replace gold gates with kill and loot gates; keep text to one line at 375 wide.

## 5. The 5-minute look test
Make two 90-second ring clips at 375 wide. A: first fight with three attackers at once and no hint. B: one attacker, the attack control flashing until the first tap, one line after the first kill, then a "champion approaches" banner with a 10-second timer, then two attackers. Dom judges: did the first tap come without reading, was the first kill readable, and does the champion line make him want the next fight.

## 6. Licence and IP
Code and scripts are GPL v2 (LICENSE; README.md:103). Map scripts and string template carry GPL headers. Original Dungeon Keeper content is not in the repo. Clean-room only: take the shape (state ladder, flash-until-click, capped first fight, named rival line) and write our own scripts, our own hint text and our own ladder values. Do not copy script lines, strings or level layouts, and do not reproduce the string text. No legal conclusion is drawn.

## 7. Gaps
- Not read: the live handler for ADD_TUNNELLER_PARTY_TO_LEVEL (argument meanings not verified); gui_set_button_flashing (the meaning of -1 as "until clicked" is inferred from the click-clear code and the script usage); the compiled gtext .dat; map layouts; intro and outro media.
- The clock: the script counts game turns, not seconds. At the default 20 turns per second (main.cpp line 892; config_keeperfx.c line 895 can override), hint 125 is about 6 seconds. The real pace is set by gold and room builds. The minute 5, 10 and 30 marks are not known from the script.
- Half read: data (plus engine checks for a few commands).

Best transferable idea: a state ladder where each step is a counted player action, not a clock, with the current goal flashed on the real control until the player taps it.

## Onboarding items (per ONBOARDING-FOCUS)
1. First 90 seconds: one objective line and the Treasury button flashing at turn 0; first hint at turn 125 (about 6 s at default speed); camera hint only after the Treasury is built and turn 175 is passed. No control is explained before the flash. (map00001 lines 75 to 86.)
2. First fight and first hit feedback: the first wave arrives when the player has 7 creatures and turn 800 is reached after the turn-600 hint (lines 181 to 187). It is one thief party plus one tunneller, enemies capped to level 1, with a fear rule that stops them fleeing when wounded. The hit feedback in the game is the Slap power, which the hint says harms the player's own creatures (guitext 5 note and text; not quoted). The engine hit feedback was not read.
3. First reward, first unlock: the first creature (Fly) is available at turn 0 (line 41); the Bug follows once the Lair is built and a creature exists (lines 151 to 155); the Imp power unlocks when the garden is built (line 163). Unlocks are announced through an objective line each time; no reward ceremony beyond the line.
4. First hub: the dungeon is the hub. Services are rooms, introduced one at a time by ROOM_AVAILABLE (Treasury at start, line 43; Lair after 9,000 gold, line 111; Garden after the first bug, line 159). The campaign land view with clickable markers is the world hub between levels (keeporig.cfg lines 29 and 32, LAND_VIEW_START and LAND_MARKERS).
5. First meaningful choice: level 1 is linear. The only choice is which creature to pick up or slap. Level 3 puts a choice of rooms on the table (Research is locked at line 71 and unlocked at line 151).
6. Pull-forward at 5, 10, 30 minutes (state-gated, not clock-gated): the locked Lair (after 9,000 gold); the locked Garden; the rival line after the first win (guitext 18 note); the Lord arrival line (guitext 19 note; the same objective is reused in another level). The rival is named by title in the notes.
7. Tutorial style: forced in level 1 (objectives always shown; hints fire on state; seven flash-button calls, map00001 lines 76, 112, 160, 164, 184, 189, 223). Hint lines are one or two sentences. No skip command was seen in map00001 (not searched exhaustively).
8. Drop-off risks: (a) the level 1 gate needs seven creatures, which is the full cap (line 36 cap; line 174 and line 202 require 7), so the player cannot run short; (b) the lair waits on 9,000 cumulative gold mined, and between the mining hints the player has no goal beyond digging; (c) the first wave waits on the timer and a flag, so a stalled player sees no new hint for a long time; (d) the imp fallback only fires when imps reach zero.
9. Could be ours at 20 to 30 percent: the one-goal ladder with a flash that clears on the real control, the capped first fight with a named rival line after the win, and counted-action gates. Look test: section 5 above.

## Receipts
See receipts.tsv in this folder (note dkfans-keeperfx).
