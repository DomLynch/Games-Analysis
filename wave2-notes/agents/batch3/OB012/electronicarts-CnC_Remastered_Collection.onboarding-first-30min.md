# electronicarts-CnC_Remastered_Collection (onboarding-first-30min, thin)

Donor: /mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/ (VPS, read-only). Paths below are relative to that root.
Licence: GPL v3 with additional terms (LICENSE.md:1; no trademark or publicity rights granted, per AU017). Game data is not in the repo. Map editor licence text conflicts with TIBERIANDAWN/License.txt (per AU017). Clean-room, shape only.
Checked (read, not just listed): TIBERIANDAWN/INTRO.CPP, TIBERIANDAWN/INIT.CPP (Play_Intro), TIBERIANDAWN/STARTUP.CPP (first-run intro flag), TIBERIANDAWN/SCENARIO.CPP (Start_Scenario, Read_Scenario, win/lose), TIBERIANDAWN/SIDEBAR.CPP (buildable sweep), REDALERT/INTRO.CPP (Choose_Side), REDALERT/INIT.CPP (scenario pick), REDALERT/TACTION.CPP and TACTION.H (text trigger, action list), REDALERT/RULES.CPP (MessageDelay), CnCTDRAMapEditor/Model/BriefingSection.cs (data schema).
Confidence: medium on the engine flow (read line by line). Low on any mission content, because the mission and tutorial data files are not in the repo.

Half read: client/engine code only. Data pack not present: mission INI (for example SCG01EA.INI, named in REDALERT/INIT.CPP:920), TUTORIAL.INI (loaded at REDALERT/INIT.CPP:3554), and the VQA movies and audio. So the first fight, the briefing content and the tutorial text are NOT read. Not in the half I read: the donor's own mission scripts.

## 1. What the player sees and feels (first 90 seconds)
In this tree the sides intro is switched off. TIBERIANDAWN Play_Intro returns on its first line, and Choose_Side hard-codes GDI with no choice. The Red Alert Choose_Side also hard-codes the house and no longer plays a choice movie.

The one live first-run path is in Select_Game. On the first launch after install (the CONQUER.INI flag, section 3), a machine with 12 MB or more of RAM skips the title menu and selects New Game (TIBERIANDAWN/INIT.CPP:988-989). A machine under 12 MB plays the INTRO2 movie first (INIT.CPP:820-827). So a new player on a normal machine goes straight into a new game with no title choice.

Then the scenario's own movie or briefing plays, then the map. No control is offered before the briefing. In the Red Alert tree, a tutor line can appear as a non-modal overlay line at a trigger time, not as a modal popup. A lost mission shows a lose movie, then a Yes/No prompt to replay the same scenario.

## 2. Why it works, or is striking
- Readable at 375 wide: NOT tested. An RTS map with a sidebar and many units is not a 375 phone layout. Only the briefing card and single overlay line transfer.
- One signature behaviour: the brief-then-act order, with the brief skippable and the next text line timed by a rule value (MessageDelay).
- Signature sound: EVA speech is a trigger action (REDALERT/TACTION.H, TACTION_PLAY_SPEECH). Its audio is not read.
- Could be made ours at 20-30 percent: a one-card brief before the first duel, then one text line tied to an event, then one new service card when its unlock is met.

## 3. The rule behind it
Order of the scenario start (TIBERIANDAWN/SCENARIO.CPP:68-130):
1. Read the scenario (Read_Scenario). Tutor flags reset for scenarios under 5 (SCENARIO.CPP:221-225).
2. Play IntroMovie for scenarios under 20, unless the player is on scenario 1 and not GDI (SCENARIO.CPP:93-94). Since Choose_Side always picks GDI, scenario 1 always plays it. The code comment (SCENARIO.CPP:88-90) says no intro movie on scenario 1, which the code does not do for GDI, so trust the code, not the comment.
3. Play the briefing movie, or if the VQA is missing, show the briefing text in game (SCENARIO.CPP:106-130 region; not read line by line).
4. Play the action movie, then the map runs.

Text tutor rule (REDALERT/TACTION.CPP:371-372): the TACTION_TEXT_TRIGGER action adds TutorialText[n] to the message list with delay Rule.MessageDelay times TICKS_PER_MINUTE. The default MessageDelay is 0.6 minutes (REDALERT/RULES.CPP:166).

Services one at a time (TIBERIANDAWN/SIDEBAR.CPP:1984-1992): the sweep removes any sidebar item that cannot be built even in theory, and any current production of it is dropped. The code that adds an item back when its prerequisite appears was not read. The sweep is the removal half of the rule for "bank, then shop, then trainer, one at a time".

First-run flag (TIBERIANDAWN/STARTUP.CPP:564-568, 583): CONQUER.INI key Intro/PlayIntro defaults to Yes. Any value other than No sets Special.IsFromInstall (STARTUP.CPP:566-568). The key is written back to No on read, regardless of whether the intro then plays. So IsFromInstall is true on the first launch and false after. This flag is live, because it gates the Select_Game path in section 1 (INIT.CPP:820 and 988). It also gates a first-run ESC lock: STARTUP.CPP:604-605 sets BreakoutAllowed to false, then INIT.CPP:827 sets it to true right before INTRO2 plays. So the lock does not hold for the one movie it is meant to guard (not traced further).

Win and lose (TIBERIANDAWN/SCENARIO.CPP:441, 653-660): win plays WinMovie; lose plays LoseMovie, then asks the player to replay the same scenario.

Data fields (designer-tunable; donor values are null because the licence is GPL, so nothing is copied):
- message_delay: minutes, donor value null (reference only: 0.6 in REDALERT/RULES.CPP:166)
- briefing_skip_after: seconds, null
- tutor_lines_per_mission: count, null
- sidebar_reveal_rule: enum (prerequisite-met), null
- first_run_intro_lock: bool, null
- loss_replay_prompt: bool, null

## 4. For Frankendom
- The first fight is zone data, not client code. A fixed encounter record (spawn list, one opponent, attacker cap 3) sits in the zone file. Spawn and despawn rules are parity row 23; the duel itself is row 4 (aggro, chase, leash). Engage is a state change and the kill is server-verified.
- Tutor lines and the brief card are client presentation driven by a server event (HUD, parity row 14). The event ID selects the text, as TACTION_TEXT_TRIGGER selects TutorialText[n]. Keep the text keyed by ID.
- Services one at a time: the bank, shop and trainer appear in the town as their unlock becomes true, the same as the sidebar sweep. This maps to the one-ledger rules.
- Loss: keep the Yes/No replay prompt, it is a clean death presentation (row 17).
- Change: null-check the tutor text (see defects), and do not carry the dead Choose_Side code. Frankendom's opening, the gladiator ring fight, is already the story, so there is no side choice to add.

Defects in the donor, with fixes (keep the idea, fix the defect):
- Play_Intro returns at once (TIBERIANDAWN/INIT.CPP:1775), so the intro body below it is dead. fix: call the brief from the live scenario-start path, and delete the dead body.
- The first-run flag is written to No on read (STARTUP.CPP:583), not when the intro finishes. If the player quits during INTRO2 the intro is never seen again. fix: write the flag after the movie completes.
- The first-run ESC lock is set false (STARTUP.CPP:605) and then set true before INTRO2 plays (INIT.CPP:827), so it does not guard the movie. fix: set the lock immediately before the movie and clear it after, or drop it.
- A first launch on a 12 MB or more machine skips the title menu (INIT.CPP:988-989). That is a sharp, invisible choice the player never sees. fix: show the title menu once, with New Game as the default focus.
- Tutor text is passed straight through with no null check (REDALERT/TACTION.CPP:372; TutorialText is NULL for any index missing from TUTORIAL.INI, per INIT.CPP:3556-3563). fix: fallback string, and warn at load for missing IDs. How Add_Message treats NULL is not read.
- TutorFlags is reset (SCENARIO.CPP:224-225) but never read in the TIBERIANDAWN tree (GLOBALS.CPP:303, EXTERNS.H:196 only). fix: shown-once tracker keyed by message ID, or delete.
- The IntroMovie comment (SCENARIO.CPP:88-90) disagrees with the code (SCENARIO.CPP:93-94). fix: write the rule as data and test it.

## 5. The 5-minute look test (Dom, phone)
Build client-only on the current ring opener, no release rows:
1. A 4-second brief card: one line over a static frame of the ring, tap to skip.
2. The first duel. One overlay line appears at 36 s only if the player has not yet landed a hit. Compare with an overlay on the first miss instead.
3. After the first win, one town card: "bank is open", shown only when the first coin is looted.
Dom checks: does the card block a duel, does the overlay land at a useful moment, and does the bank card feel like a reward. The 36 s is a starting value for our tuning, not a value copied from the donor.

## 6. Licence and IP
Code is GPL v3 with additional terms (LICENSE.md:1; AU017). No adaptation of code. Only categories are kept: a one-card brief before a mission, text overlays keyed to events, and a sidebar that shows only buildable items. Recreate as an original: keep the timed overlay, change the wording, the look and the trigger.

## 7. Gaps
- Not read: the mission INI and TUTORIAL.INI (not in repo), the VQA and audio, TRIGGER.CPP body (1483 lines, grep only), REINF.CPP (696 lines), TEAMTYPE.CPP (977 lines), HELP.CPP (403 lines), MAPSEL.CPP (1274 lines), ENDING.CPP, Add_Message NULL handling.
- Walk density, idle or ambient behaviour, loot reveal and boss intro: not present in an RTS engine path that I read (no walking, no loot reveal in these files). Not verified beyond the files named.
- Death and respawn: only the lose movie and replay prompt, read at SCENARIO.CPP:653-660.
- Readability at 375 wide: not tested, not run.
- Half read: client only. The data half is absent from the repo.
