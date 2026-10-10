# exult-exult (onboarding-first-30min, thin)

Donor: /mnt/frankendom-donors/exult-exult/ (VPS, read-only). Paths below are relative to that root.
Licence: engine code GPL v2 (COPYING; README.md:6). The original Ultima VII data is not shipped: README.md:34 says the user must own the game. Shipped art, fonts, MIDI and SFX have credited authors and no licence text, so they are class C (AU020). Clean-room, shape only.
Checked (read, not just listed): exult.cc (launch intro gate, 1100-1125), game.cc (main menu, 640-760), gamewin.cc (init_gamedat and skip-intro flag, 1355-1375 and 2904-2918), gamemgr/bggame.cc (play_intro, the five intro scenes, desk scene, show_credits, new_game, 398-470, 1259-1420, 1954-1975, 1971-2000), actorio.cc:65, gamemgr/sigame.cc:277 (signature only), usecode/ucmachine.h:91 and usecode/ucinternal.cc:2673.
Confidence: high on the intro and menu flow (read in order). Low on the first 30 minutes of actual play, because the start state and scripts are not in the repo.

Half read: client code (engine, menu, Black Gate intro and character setup). The data half is not in the repo: INITGAME (the new-game state), the usecode that runs the opening scene, the first quest, the first fight and the first town. Not in the half I read: all of those. The Serpent Isle intro (gamemgr/sigame.cc:277) is the paired half in the box; only its signature was read.

## 1. What the player sees and feels (first 90 seconds)
On launch the intro runs unless the splash is skipped (exult.cc:1112-1116). Otherwise the title menu opens, and "Intro" is one menu item (game.cc:703-708). The Black Gate intro is a chain of five scenes. The desk scene alone is clipped to a 320x200 region (bggame.cc:1265):
1. Lord British title. A 1.5 s pause, then a fade in, a 2 s hold and a fade out (bggame.cc:472, 480).
2. A logo scene with a short frame loop (bggame.cc:489 onward; scene not fully read).
3. A guardian scene (bggame.cc:739; not read).
4. The desk scene. A monitor built from four shape parts. A hand hits the PC (hand loop at 60 ms per frame, bggame.cc:1334-1336, then a 1.3 s hold at 1339). A caption art shape is held for 3 s (bggame.cc:1343, 1345). The view then scrolls right across the monitor in 98 steps of 110 ms, about 10.8 s (bggame.cc:1350, 1363), with a second caption art shape from step 75 on (bggame.cc:1359-1361). After a 1.5 s hold (bggame.cc:1366) it scrolls down to a mouse and an orb.
5. The moongate scene. A 4 s hold (bggame.cc:1416), then the bushes are moved aside in a timed loop (bggame.cc:1417 onward; not read in full).

The player has no control during the chain. Any key or click skips the current scene (each scene catches UserSkipException, for example bggame.cc:484 and 1396). A break ends the whole intro (bggame.cc:440-445). The captions are art shapes (shape 0x15 and 0x16, bggame.cc:1343 and the caption at 1359-1361), not string-table text.

## 2. First fight, first kill, first hit feedback
Not in the half I read. The fight is in the usecode and the original data. Nothing in the repo stages a winnable first fight. Hit feedback is also not read (combat.cc and the usecode are outside this read).

## 3. First reward, loot, level or unlock
Here the donor has a real menu unlock. The Quotes item is hidden until a flag file exists (game.cc:656). The flag is written when the Credits sequence is watched through (show_credits at bggame.cc:1966-1967 writes it only if run() returns true). The Endgame item is shown when endgame.flg exists (game.cc:657; the writer was not traced). So the reward is a menu entry that appears after a finished sequence. No loot or level is read.

## 4. The first hub or town and service introduction
Not read: the start location and the town come from INITGAME and the usecode. The new-game step is the character setup in BG_Game::new_game (bggame.cc:1971). It asks for a name of up to 16 characters (bggame.cc:1992), a sex toggle, and two face picker slots (shape pairs, bggame.cc:2001-2030 region; not read in full), with four choice slots (bggame.cc:1998). It runs when "Journey Onwards" is picked (game.cc:715-732; game.cc:729 says new_game runs its own scene). Services are not introduced in this read.

## 5. First meaningful choice
The character setup is the only choice read: name, sex and face. It is set once, before the journey starts.

## 6. Pull-forward hooks at minutes 5, 10 and 30
Not read in the data. The only hook in the code is the Quotes unlock (section 3) and a first-scene flag: the Avatar stays hidden until the usecode opening scene has run (gamewin.cc:2913-2918, the bg_dont_render flag). skip_intro set to yes forces that flag true, which skips the opening scene (gamewin.cc:2907-2909). The opening scene itself is in usecode (not read).

## 7. Tutorial style
No tutorial text in the code read. Show-don't-tell: the intro is art and timing only, and every scene is skippable per scene. Text is baked into shape art, so it cannot be translated through the keyed text files. The file data/exultmsg.txt (1141 lines, wc -l) and data/quotes.txt (150 lines, wc -l) are the text files in the data half. Their loader was not traced; data/quotes.txt is a build input (data/Makefile.am:3).

## 8. Drop-off risks it has or avoids
- Has: the desk scene is clipped to 320x200 (bggame.cc:1265). On a 375 phone it letterboxes unless scaled to width.
- Has: no skip hint appears in the code read. The intro runs on every launch unless the splash is skipped (exult.cc:1112). How config/gameplay/skip_intro (gamewin.cc:2907, default no) relates to skip_splash was not traced.
- Avoids: each scene is skippable and short. The Quotes unlock rewards finishing the Credits sequence.
- Defect (keep the idea): the Quotes flag is written by the scene path without checking completion (game.cc:746, the scene branch of Credits), while show_credits checks it (bggame.cc:1966). fix: only write the flag when the scene ran to its end, as show_credits does.
- Defect: captions are shape art (0x15, 0x16), so they cannot be localised. fix: draw captions from a keyed text file with the menu font.

## 9. Could be ours at 20-30 percent, and the 5-minute look test
Could be ours at 20-30 percent: a short title sting over the ring, then a 3-scene chain where each scene is a single caption on a fixed frame, skippable by tap. The character setup is three fields only (name, sex, face). A menu item unlocks after the first win, not after credits.
5-minute look test on the phone: build the chain on the current opener with the caption drawn from text, not art. Compare two cuts: (a) 3 scenes, 8 s total, skip by tap; (b) no intro, the menu item unlocks after the first win. Dom judges which opener makes him want the first fight sooner.

## Frankendom mapping
- The opening scene flag maps to a per-player "first scene seen" flag on the server ledger, not on the client. The client only plays the scene.
- The character setup is one ledger row per character (one character, one ledger). Keep the three fields and drop the rest until the hub exists.
- The menu unlock maps to a server-verified milestone (row 17 death and respawn, row 18 XP award), with the client showing the menu entry.
- Keep: per-scene skip, art-free captions (keyed text), and the unlock after a finished sequence. Change: the ring opener replaces the Ultima opening, so no Ultima scene is copied.

## Gaps
- Not read: usecode scripts (the opening scene and first quest), INITGAME, the first fight, the first town, combat hit feedback, the logo and guardian scenes in full, the desk scene's hand animation, the character setup's face pickers, the SI intro (sigame.cc:277 onward), data/exultmsg.txt and data/quotes.txt loaders.
- Half read: client. The data half is absent from the repo.
- Idle or ambient behaviour, death and respawn, walk density: not read.
