# 0ad-0ad (onboarding first 30 min, OB006)

Donor: 0ad-0ad (RTS, historical civilisations). Donor tree read over ssh from /mnt/frankendom-donors/0ad-0ad (read only).
Licence: code GPL v2 or later; binaries/data is GPL v2+ per LICENSE.txt line 18 (as recorded in AU001). Tutorial scripts sit under binaries/data, so they are GPL code: clean-room, shape only. No string text is reused here.
Checked: opened the two tutorial scripts in full (introductory_tutorial.js 445 lines, starting_economy_walkthrough.js 462 lines), the shared goal engine maps/scripts/Tutorial.js (113 lines), the session message and panel code (gui/session/messages.js, tutorial_panel.xml), the main menu entry (gui/pregame/MainMenuItems.js), and the tutorial map header and player blocks in introductory_tutorial.xml. Map entity counts are awk counts (template line paired with the next Player line), not checked in the engine. Confidence: high on the goal flow, medium on the entity counts.
Receipts: receipts.tsv in this folder (verified, 41 of 41 quotes present).
Half read: data and client (maps/tutorials, maps/scripts, gui). Server half (the C++ engine under source/) NOT read: "not in the half I read" for anything engine-side such as hit feedback, combat numbers or the reward celebration.
Decision: adapt (idea).

## Onboarding (what the player meets in the first 30 minutes)

1. FIRST 90 SECONDS. Main menu > Learn to Play > Tutorial (MainMenuItems.js line 15) loads maps/tutorials/introductory_tutorial with CheatsEnabled true (line 22). Nothing forces it: a narrow grep of gui/ and maps/scripts/ found no first-run hook. Once in, the player is in a 0 A.D. skirmish with a Civic Center, three Female Citizens, a Gerousia and one javelineer (XML player 1 block, awk count). The first panel is a 'Welcome' goal with no action; it has a Ready button (Tutorial.js lines 63 and 75). Only then comes the first action: left-click a Female Citizen, right-click a berry bush (introductory_tutorial.js line 6). The player sees the instruction before any control is needed.
2. FIRST FIGHT, FIRST HIT, FIRST KILL. There is no early fight. The enemy (Player 2, athen) has an empty AI field (XML line 71, the same for player 1 at line 54). The attack is scripted: it launches when the Forge's infantry tech finishes (goal 20 text at line 282; LaunchAttack call at line 285). LaunchAttack sends the enemy's citizen-soldier units to attack the player's first tower or Civic Center. The fight is therefore winnable by build order, not by a rig in the first minutes. The rig is later: RemoveChampions (line 425) keeps 6 enemy champions (keep = 6, line 429) and kills the rest once the player has queued two rams. The map lists 65 champion entities for player 2 (30 ranged, 23 infantry, 12 marine; awk count, not checked in engine). That kill is server-side and silent. Hit feedback and first-kill presentation are in the engine half: not read.
3. FIRST REWARD, FIRST UNLOCK. The first 'unlock' is the Town Phase: goal 14 asks the player to advance with the II icon, IsDone checks phase_town_generic (lines around 'advance to Town Phase'). The celebration (sound, card, stinger) is not in the scripts read; not read in gui/session beyond messages.js.
4. FIRST HUB. The hub is the Civic Center. Buildings arrive one per goal, each gated by a build order on that building class: house (goal 5), storehouse (goal 6), farmstead (goal 8), field (goal 10), barracks (goal 13), outpost (goal 16), tower (goal 18), forge (goal 19), market and temple (goal 22), arsenal (goal 25). Services are introduced one at a time, in build order.
5. FIRST MEANINGFUL CHOICE. Food or wood first (goals 2 and 3). The tutorial tells the player which unit is faster at which resource but does not reward a particular choice.
6. PULL-FORWARD HOOKS. Pull is goal-gated, not time-gated, so there are no minute marks. The visible next goals are: train a batch of Hoplites (goal 4), build Houses (goals 5, 11), the enemy attack (goal 20), find and destroy the enemy Civic Center (goal 26). The second tutorial (starting_economy_walkthrough.js, 32 goal blocks) keeps the same pattern.
7. TUTORIAL STYLE. Optional at entry, forced once started: one goal at a time, each with a Ready button or an action gate. A wrong batch order is punished by resetting the production queue and showing an orange warning (line 35; messages.js line 393). The panel keeps every earlier goal on screen (messages.js line 402), so text piles up. Show-and-tell is mixed: the text says what to click, then waits. Skip is the Quit button at the end (messages.js lines 410-412).
8. DROP-OFF RISKS. (a) The panel is a fixed 760-unit box (tutorial_panel.xml line 2), not a 375-wide layout. (b) Text accumulates in one panel, so the screen fills over 27 goals. (c) The batch-train rule resets a queue that the player may have intended; a new player can be stuck in that loop. (d) The enemy army is trimmed by the script at the siege stage, so a player who notices the 65 champions may feel the game lied; the trim is never shown on screen.
9. TRANSFERABLE IDEA (20-30 percent resemblance). Keep the ordered goal list with a Ready gate on reading steps and an action gate on doing steps. Keep the orange warning line for a wrong action. Change the reset: the server should reject the bad order and the HUD should say why, not wipe the player's state. For our first fight: the first ring duel has one goal at a time, and the gate is a server-verified event (first hit landed, first win), never a click count.

## Rule behind it (designer-tunable DATA FIELDS)

- goal: {id, text_key, gate: "ready" | "action" | "event", gate_event, on_wrong: "warn" | "reset", warning_key}. Donor values: none recorded (GPL donor, numbers are structure only).
- enemy_script: {attack_trigger: "tech_finish:infantry_hack_1" (goal 20), attack_targets: ["tower", "civic_centre"], trim_keep_count: 6 (line 429), trim_trigger: "ram_count >= 2" (lines 'ramCount > 1')}. Unit: count. Donor value null (GPL).
- panel: {max_lines_kept: null, width_units: 760 (line 2), height_units: 254 (line 2: 38 to 292)}. Donor value null.
- map_start: {player_units: 6 (1 CC, 1 Gerousia, 3 Female, 1 javelineer; counted), starting_resources: {food 2000, wood 2000, stone 5000, metal 5000} (XML lines around 64)}. Unit: count and resource units. Donor value null (GPL).

## For Frankendom

- Ring fight first: keep the 0ad goal engine idea (ordered, one goal at a time) but gate every doing-step on a server event, not a client click. The client only shows the goal and the warning.
- Our rule "kills are server-verified": the 0ad trim (RemoveChampions) is a silent server kill. Ours should be explicit encounter data (enemy count, keep count) and recorded in the fight record (parity row 19). Do not hide it.
- Hub: one building or service per goal, in the order the player reaches it, is the right shape for the town hall (bank, shop, trainer). Keep it, but drop the Ready gate on services the player has already used.
- Change: no full-panel text pile. Show one goal, dismissed on the next gate.

## 5-minute look test (Dom, on phone, 375 wide)

Build a throwaway panel with three goals: (1) 'Ready' on a reading step, (2) an action step gated on the first server hit, (3) a warning line in orange when the wrong action is tried. Compare with a version where the text stacks like the 0ad panel. Judge: which one reads at 375 wide without covering the fight, and which one teaches the next step in one glance.

## Gaps
- Not read: C++ engine (source/) for hit feedback, combat numbers, reward effects, phase-up celebration. Half read: data and client only.
- Not read: the tutorial map body (XML entity list beyond header and counts), the 27 goal texts beyond the first lines, gui/text/tips (47 files, loading-screen tips).
- Entity counts are awk counts and not checked against the engine.
- Minutes are not measured; the goal flow has no time gates.
