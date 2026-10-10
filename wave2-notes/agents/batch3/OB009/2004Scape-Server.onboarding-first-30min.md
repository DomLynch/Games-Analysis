# 2004Scape-Server (onboarding-first-30min, OB009)

Donor: 2004Scape-Server (/mnt/frankendom-donors/2004Scape-Server, VPS). Depth: full for the tutorial island and its first hand-offs. Half read: server and data pack (scripts, configs, interfaces). Client half under public/client was not read.
Checked: read the tutorial scripts, configs, login, level-up, combat XP, the server side-tab handler and the tutorial zone check. Confidence high on the step order and gates (read in code). Medium on the minute mapping (no timer in the files; minutes are inferred from step order only). Opened more than 3 candidate files for each claim below.

## 1. What the player sees and feels
New character, first 90 seconds: the screen shows a character design panel first, then a plain text box in a small room tells them to click the flashing-arrow guide and to rotate the view with the arrow keys. Nothing is asked of them before that box. Clicking the guide starts a chain of short instructors, each in its own room behind a door that refuses entry with a one-line reason. Most steps flash the icon of the tab the player must open next (backpack, skills, music, quests, prayer, friends, magic). Pages are at most four lines; the text box is a few short sentences per page. The first fight is a giant rat with a tiny health bar, a dagger in hand and a sentence telling them to sit and watch their own health bar drop. The first kill is scripted to advance the tutorial. Lumbridge is reached last, by a yes/no offer from the final instructor.

## 2. Why it works / is striking
- Readable at 375 wide: one flashing tab icon at a time, a hint arrow over the next target (NPC or tile), one short text box. The data sets the box to 450 px wide with 4 lines; the interface file puts the title box at 480 px, so the box as built does not fit 375 wide (we keep the 4-line page rule, not the width).
- One signature behaviour: the forced step where a locked door says what to do before it lets you through.
- One signature sound/effect: a short synth attack, hit and death cue per creature. The tutorial rat names its three cues in its NPC config (tutorial.npc lines 280-282); the synth files themselves were not decoded (asset audit AU002).
- Could be ours at 20-30 percent resemblance: a guide who offers "skip the tutorial" once, a tab that pulses until opened, a rat that cannot kill you at 1 hit point.

## 3. The rule behind it
The tutorial is a numbered state machine (tutorial.constant: 69 named states, 0 to 670; e.g. the combat start state is 360). Every step is: (a) state gate at the door or NPC, (b) a text proc that writes pages and sets a hint, (c) a side-tab flash, (d) advance on the event (talk, click, kill, cast). Order of operations for the first fight:
1. The survival stage hands out an axe and a tinderbox (tutorial.rs2 lines 147-150).
2. The combat stage arms the rat with the dagger; the rat's stats are tuned in the NPC config (tutorial.npc lines 258-285). Its hit points are tiny and its three melee defence values are pushed far below zero, so almost every swing lands.
3. The rat's attack routine does zero damage when the player is already at 1 hit point (tut_giant_rat.rs2 lines 43-44). The roll path only runs above 1 hit point.
4. The rat's death queues the step advance (tut_giant_rat.rs2 lines 9-12 and 111-115).
5. XP during the tutorial is capped: the grant returns once the base level is 3 (tutorial.rs2 line 291; combat XP routes at skill_combat/scripts/combat.rs2 lines 117-141).
6. Completion gives the starter kit: 18 item grants and 25 coins in the bank, then a stat reset (tutorial.rs2 lines 296-332; the reset proc is at player/scripts/stat.rs2 line 71, body beyond the first loop not read).

Level-up ceremony (levelup/scripts/levelup.rs2): the row for the stat supplies the message; a fireworks spotanim plays; a jingle plays, with a second jingle and a second dialog when the new level is in the unlock set for that skill (lines 33, 46-62); the dialog waits on a pause button. Per-skill unlock lists are in levelup/configs/levelup_unlocks.* (attack unlock levels are a list of uneven milestones; numbers are data, not copied here).

Tunable data fields are in the JSON file (xp cap level, damage floor hit points, page width and lines, rat hit points, rat defence penalty, state count, kit grant count, bank coins, unlock milestones).

## 4. For Frankendom
- Map: 700 zones as data means the onboarding is data too: one zone (the arena or the starter town) holds an onboarding state table (step id, gate, hint, text page, advance event). The state machine belongs in the engine as data rows; the client only draws pages and hint arrows. Server-verified: each advance is a server event; the client cannot skip a step by itself.
- First fight: the rat's rig is an engine rule for the onboarding zone (hit points, defence penalty, damage floor at 1). Ruling: one engine, kills server-verified, MAX_ATTACKERS = 3 (one enemy in the first fight, so the 3-cap is never reached). Parity rows: 1 duel step, 3 guard/parry/stamina (the defence penalty), 18 loot roll and XP award (the XP cap), 17 death/respawn (the rig and the kill advance). Target file: src/fight/<module>.ts (module to be picked by Lead; not chosen here).
- Keep: the tutorial state machine as data; the flashing tab (one at a time); the 4-line page cap; the locked door with a one-line reason; the XP cap during onboarding; the 1-hit-point damage floor for the first fight; the one-time skip offer; the starter kit granted at the end.
- Change: the donor's side-tab gate is loose (see Drop-off below). Pass the tab id into the trigger and require the flashing tab. Keep the 4-line page but size the box for 375 wide. Move the skip offer from the first sentence to after the first win, so a new player sees the fight first.

Donor defect, to fix in our version (not a reason to drop the idea):
- defect: the side-tab click handler runs the tutorial trigger for any tab from 0 to 13 (src/network/game/client/handler/TutorialClickSideHandler.ts lines 12-18) and the trigger does not receive which tab was clicked. Several states advance on any tab click (tutorial.rs2 lines 143-149). fix: pass the tab id into the trigger; advance only when it matches the flashing tab.
- defect: an unhandled state shows a dead-end message to the player (tutorial.rs2 line 264) with no recovery. fix: default to the nearest earlier state and log it.

## 5. Five-minute look test (Dom, phone, 375 wide)
Build one screen with three tests, each a 60-second run:
A. Donor-style: a 4-line text box with a continue button and a flashing tab icon that stays until opened.
B. Ours: a one-line coach mark pinned to the tab icon, plus a hint arrow over the target, no full text box.
C. The rat: first fight with 1 hit point of safety vs. normal, shown as two runs back to back.
Compare: which one Dom reads without stopping; whether the flashing icon is found within 3 seconds; whether the rat fight feels won by skill rather than by luck.

## 6. Licence / IP
- Code: MIT (LICENSE line 1 reads "MIT License"; README line 62 says MIT). Code constants and logic here may be adapted under MIT: the XP cap level, the damage floor, the page width and line count.
- Game-derived data (NPC configs, state tables, texts, unlock lists, item and stat numbers, scripts for dialogue): rights unknown, the repo says nothing about provenance (asset audit AU002). Class C. Inspiration stays category-level: a guide who offers a skip, a rat-class first enemy, a flashing tab. Do not copy dialogue, names, numbers or step lists. Donor values for game-data numbers are set to null in the JSON.
- No legal conclusions. The text pages are paraphrased; no page is quoted beyond a short title.

## 7. Gaps
- Read: tutorial scripts (tutorial.rs2, tutorialstep.rs2, tut_chatbox_steps.rs2, tut_doors_and_gates.rs2, tut_giant_rat.rs2, tut_chicken.rs2, tut_banker.rs2, guide scripts runescape_guide.rs2, quest_guide.rs2, financial_advisor.rs2, magic_instructor.rs2 in part), configs (tutorial.constant, tutorial.npc 258-286, tutorial_island.dbrow, tutorial.varp), login.rs2, levelup scripts, combat XP lines, server side-tab handler and tab-flash message model.
- Not read: tutorial_text.if and player_kit.if beyond their first lines (player_kit.if is 1277 lines); tutorial.loc (17 entries) and tutorial.obj (4 entries) by content; area_lumbridge (scripts only partly: NPC list read; no bank string found in that folder by grep; the castle bank was not located); the quest_cook quest (not confirmed as the first quest); skill scripts for fishing, cooking and smelting bodies; combat_damage_player (so whether a single hit can take a player from 2 hit points to 0 is not checked); the death screen and respawn presentation to the player; the client's send logic for side-tab clicks (client half is the other donor).
- Not measured: time per step; walk density in the tutorial; loot reveal ceremony beyond the rat's drops (bones and raw meat with a drop-duration field); the idle animation vocabulary (walk and ready animation names only).
- The minute mapping (5, 10, 30) is by step order only.
- Half read: server and data. The web client (public/client) is not read, so the matching client for this server is not checked here.

## Onboarding checklist (per brief items 1-9)
1. First 90 seconds: character design panel, then one text box (guide room). Flashing-arrow guide and the rotate-view hint. Source: tutorial.rs2 lines 49-54; tut_chatbox_steps.rs2 line 4.
2. First fight and first kill: giant rat, rigged (section 3). Source: tutorial.npc lines 258-285; tut_giant_rat.rs2 lines 1-125.
3. First reward and level: starter kit on completion; level-up ceremony with fireworks, jingle and an unlock dialog. Source: tutorial.rs2 lines 296-332; levelup/scripts/levelup.rs2.
4. First hub: the guide room, then a chain of rooms (survival, cooking, music, quests, mining, combat, bank, financial advisor, prayer, magic). Each service is introduced alone behind a gate. Source: tutorial.rs2 lines 66-256; tutorial.constant.
5. First meaningful choice: the skip offer (yes or no) at the guide; the mainland offer (yes or no) at the magic instructor. Source: runescape_guide.rs2 lines 11-17; magic_instructor.rs2 lines 70-74.
6. Pull-forward: minute 5 the tabs flash and a stat tab opens after XP; minute 10 the quest guide explains the colour states of the quest list and the star markers on the minimap, and the music tab promises unlocked tunes; minute 30 the financial advisor names three ways to earn (combat, quests, trading), and the mainland choice closes the tutorial. Source: quest_guide.rs2 lines 14-24; tut_chatbox_steps.rs2 lines 96-102 and 281; magic_instructor.rs2 lines 64-74.
7. Tutorial style: forced, with a skip offered only when map_production is false (runescape_guide.rs2 line 11). Show-don't-tell: flashing tab icons and hint arrows (set_hint_* procs). Page cap four lines at 450 px (tutorialstep.rs2 line 39). The 74 single-line step texts average about 160 characters (longest about 252), counted with awk on single-line calls only.
8. Drop-off risks it has: about 67 steps before the open world; forced walks between rooms; a loose side-tab gate; a dead-end fallback message; text-heavy pages. Risks it avoids: each gate says what to do; the rat cannot kill at 1 hit point; XP capped during the tutorial so the start does not overshoot.
9. Could be ours at 20-30 percent resemblance: section 5 look test, plus the ideas in section 4.

Also seen (where the donor has it):
- Idle and ambient: walk and ready animation names per NPC (for example the rat's wander range is set as a field); no idle-behaviour script was read.
- Death and respawn: the rat drops bones and raw meat for a set duration; the respawn field is set; no player death screen was read.
- Loot reveal: drop-with-duration on the ground, no reveal ceremony read.
- Walk density: not measured.
- Readability at 375 wide: the text box is 480 px in the interface file (not 375-friendly); the page cap is 450 px and 4 lines.

Not read (summary): see section 7.
