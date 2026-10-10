# FunkinCrew-Funkin (onboarding-first-5, cell OB005)

Donor: /mnt/frankendom-donors/FunkinCrew-Funkin (VPS, read-only). Depth: thin. Half read: client (source/funkin/**). Data half (week and level JSON, song charts, intro text, dialogue, art, audio) is not in the box: art/ and assets/ are empty git submodules.
Licence: code Apache-2.0 (LICENSE.md). Content is proprietary per docs/COMPILING.md. Inspiration from content is category-level only.
Checked (code read this turn): source/funkin/ui/title/TitleState.hx (intro, title, skip, menu hand-off), source/funkin/InitState.hx (startSong week mapping, line 519), MainMenuState.hx (menu items), StoryMenuState.hx and story/Level.hx (default level, unlock hook), data/story/level/LevelRegistry.hx, FreeplayState.hx (default song, character hint), charSelect/IntroSubState.hx and CharSelectSubState.hx (first-time flags), save/Save.hx (defaults), play/Countdown.hx, play/scoring/Scoring.hx (judgement windows, rank, results delays), play/PlayState.hx (hit path, health, practice), play/notes/NoteSplash.hx, play/ResultState.hx (timing lines), util/Constants.hx (health and rank constants), api/newgrounds/Medals.hx (two medal lines).
Not read: GameOverSubState.hx, Conversation.hx (dialogue, 691 lines), freeplay/backcards/NewCharacterCard.hx (only the class header), the week 1 tutorial chart and dialogue (upstream, not in box), introText (upstream; the example mod's introText.txt is empty in the box).

## 1. What the player sees and feels
Before any control, the screen is black and a 16-beat cold open runs on the title track's beat. Text lands on beats: "The Funkin Crew Inc", "presents", "In association with", a newgrounds mark that is shown only sometimes, one random line from the intro text, then the game name spelled word by word over beats 13 to 15. On beat 16 the screen flashes white and the title appears: a bumping logo, a dancing girlfriend sprite and a title line with two states (idle, and "confirm" on press). The first press makes a confirm sound, a white flash, a short haptic and, on Newgrounds builds, the "Start Game" medal. Two seconds later the main menu opens. Any Enter press during the intro skips it. On a phone the look is the same at 375 wide, with a swipe variant for the title's hue shader.

## 2. Onboarding items (the nine asks)
(1) First 90 seconds: the cold open above, then the title. No text explains controls. The first control the player meets is a menu. Length of the open is 16 beats; seconds depend on the title track BPM (not read).

(2) First fight and first hit feedback: the first "fight" is a rhythm song. The default level and default freeplay song are both the tutorial (Constants.hx line 220 DEFAULT_SONG; StoryMenuState.hx line 41; FreeplayState.hx line 223). The story list puts it first (LevelRegistry.hx line 29, the hard-coded base order). Countdown: five beats, "Before, 3, 2, 1, GO!, After", paced by a beat timer; the conductor starts five beats before the song (Countdown.hx line 60 and line 100). Judgement windows (PBOT1, Scoring.hx lines 124 to 198): perfect under 5 ms, sick up to 45 ms, good up to 90 ms, bad up to 135 ms, shit up to 160 ms, miss beyond 160 ms. Health starts at half of max (Constants.hx line 460). A miss costs 4 percent of max (line 502). Sick adds 1.5 percent (line 476; its comment says 1.0 percent, which is stale: the value is what runs). Shit costs 1 percent (line 492). A sick note alone triggers a splash (PlayState.hx lines 3142 and 3150). The splash is a pooled sprite with a random direction variant and a frame rate of 24 plus or minus 2 (NoteSplash.hx lines 10, 11, 46, 56). Rigging: from a full-start bar, about 12.5 consecutive misses empty it (1.0 divided by 0.08). A practice mode exists where death does not count (PlayState.hx line 1255; label at line 2437).

(3) First reward and celebration: the results screen (ResultState.hx). Rank comes from tallies (Scoring.hx line 388): a full sick clear is Perfect Gold; otherwise completion = (sick + good - missed) / total, with thresholds 1.00, 0.90, 0.80, 0.60 (Constants.hx lines 580 to 595). Each rank has its own timing table in 1/24-second frames (Scoring.hx lines 530 to 600): the music starts 0 to 95/24 s after, the character animation at 95/24 s for most ranks (ResultState.hx line 398), the rank flash at 107 to 186/24 s, the highscore reveal at 127 to 207/24 s. A clear-percent counter tweens over 58/24 s (ResultState.hx line 587). A strong vibration fires when the rank number tween ends. A sticker-style transition (StickerSubState import) and a vertical rank text backdrop frame it. No levelling or loot in the first minutes in the code read.

(4) First hub and services: the main menu lists story mode, freeplay, merch (web popup only), upgrade, options and credits (MainMenuState.hx lines 149 to 222). Story mode and freeplay are the first two services; there is no bank or shop in the first minutes. Character select has a one-time lights video: IntroSubState.hx line 27 skips it once the save's first-time flag is set, and CharSelectSubState.hx lines 426 to 435 plays the camera flash and intro sound only the first time. Save defaults: only the default character is "seen" (Save.hx lines 154 to 155).

(5) First meaningful choice: story or freeplay, then the difficulty. Difficulty defaults to normal and is remembered between visits (StoryMenuState.hx lines 107, 236 to 238, 517; Constants.hx line 177 DEFAULT_DIFFICULTY). Level lock is not enforced in the base code: Level.hx line 106 returns true by default, and the lock icon is an open TODO (StoryMenuState.hx line 303). Real week gating is therefore in data or script (not read).

(6) Pull-forward hooks: minute 5 is the results rank. Minute 10 is the freeplay hint that tells the player they can change character, plus the character unlock path: when there are newly available characters, checkNewChar starts a two-second timer that runs unLock() (CharSelectSubState.hx lines 445 to 450). Save.hx line 720 holds the per-character unlock switch; in the code read only the default character is unconditionally unlocked, and the others depend on data or script (not read). Minute 30 is the new-character card in freeplay (NewCharacterCard.hx, not read). Newgrounds medals are an outside pull (tutorial clear medal at Medals.hx line 272 onward; only in Newgrounds builds).

(7) Tutorial style: no overlay tutorial exists in the code. Teaching happens through the first song (chart upstream, not read) and through a one-line freeplay hint. Text is short. Skippable: Enter or the beat-16 cut skips the cold open. The tutorial is show-don't-tell by design, but that is not verified in the chart.

(8) Drop-off risks it avoids: no long text, a skippable intro, a default selection that drops the player straight into the tutorial song, practice mode that removes death. Risks it has: the first control lesson is only in the chart, not in the UI; the freeplay hint is dim grey and low contrast (FreeplayState.hx line 552, colour value 0xFF5F5F5F); locked weeks are invisible (lock icon TODO).

(9) Could be ours at 20 to 30 percent resemblance: a beat-timed cold open in which each beat reveals one word of our own name, a menu opening two seconds after the first press, and a results reveal paced by rank (a frame table per rank). The most transferable piece for us is the pre-fight count-in: a five-beat count shown by the client while the server has already moved the duel to engaged.

## 3. Why it works / is striking
- Readable at 375 wide: one word or one short line per beat, large centred text, the logo and one character as the only images.
- One signature behaviour: a count of beats that the player can feel before the first press.
- One signature effect: a white flash on each cut, and the splash reused with a small random frame-rate change so repeat hits differ.
- Could be made ours: yes, at 20 to 30 percent. Keep the beat-count cadence and the flash. Change the words, the sound family and the visuals.

## 4. The rule behind it
Order of the first 90 seconds: cold open (16 beats, skippable by Enter or by reaching beat 16), then title (wait for press), then confirm (flash, haptic, medal), then a 2-second delay to the menu, with a second Enter cutting the delay.

Pre-fight count: five steps (Before, 3, 2, 1, GO, After) on the beat timer. The conductor is set five beats before the song start.

Hit rule: each hit gets a window category from its absolute millisecond offset. Only the top category triggers the visual splash. Health moves by a per-category value, and a miss subtracts a fixed penalty.

Results rule: the rank decides the pace of the reveal through a fixed frame table per rank (delays in 1/24-second frames).

Data fields (designer-tunable; donor value shown because the donor code is Apache-2.0):
- sick_window_ms | ms | 45
- good_window_ms | ms | 90
- bad_window_ms | ms | 135
- shit_window_ms | ms | 160
- perfect_window_ms | ms | 5
- health_start_fraction_of_max | fraction | 0.5
- health_miss_penalty_fraction_of_max | fraction | 0.04
- health_sick_bonus_fraction_of_max | fraction | 0.015
- health_shit_penalty_fraction_of_max | fraction | 0.01
- countdown_steps | beats | 5
- splash_frame_rate | frames per second | 24
- splash_frame_rate_variance | frames per second | 2
- rank_threshold_excellent | fraction | 0.90
- rank_threshold_great | fraction | 0.80
- rank_threshold_good | fraction | 0.60
- results_bf_delay_frames | frames at 24 fps | 95
- results_clear_counter_frames | frames at 24 fps | 58
- cold_open_beats | beats | 16

## 5. For Frankendom
- 700 zones as data: not affected by this donor's content. The cold open is client presentation only.
- 100 Pit characters reused across zones: the donor's character data (CharacterData.hx, per the asset audit) is data-driven, but I did not read it here. Our equivalent is one character catalogue read by the first-fight screen; the donor's data schema is a pattern to check later, not a finding.
- Many-vs-one: the countdown is a one-to-one rhythm device. For a duel the count-in would be shown while the server has already moved the fight to engaged (state change), so the client shows the count and the server holds the truth. Parity row 4 (fight loop) and row 5 (controls) are the nearest rows; the HUD count is row 14.
- Server-verified: the donor has no server. Judgement and health are client-side. Do not copy that: our hit result must come from the server log, and the client only plays the flash and splash.
- Keep: the beat count-in, one flash per cut, a skip by any input, the short first line of text, a rank-paced results reveal.
- Change: no rhythm judgement windows (our duels are not on a beat); no client-side health; no practice mode that changes the ledger. If we want a practice-like first fight, it must be a non-ledger tutorial flag, handled on the server.

## 6. Five-minute look test (Dom, on a phone)
Build a phone prototype with three things, all in one screen:
1. A 16-step cold open of white text on black, each step timed to a steady beat, with one flash at the end. Tap to skip.
2. A five-step count-in ("Ready, 3, 2, 1, Go") over the duel ring, with the same flash on "Go".
3. A results card that reveals the rank after a short pause, the pause length set by rank.

Compare: does the first 90 seconds feel like a reward, with no menu hunt and no text wall? Score it 1 to 5 for "I want the next fight".

## 7. Licence / IP
Code: Apache-2.0 (LICENSE.md). Adaptation is allowed with attribution. Donor values in the data fields above are code constants and may be used under that licence.
Content: art, audio, charts, dialogue, intro text and week data are proprietary per docs/COMPILING.md, and their licence is outside the box. Do not reuse any of them. Inspiration from content is category-level only: "a beat-timed title sequence" and "a rank-paced results card" are fine; the words, art, names or sounds are not.
Third-party images in docs/readme_images and example_mods/testing123 have no licence: do not reuse.
This is what the files say, not a legal reading.

## 8. Gaps
- Not in the half I read: week 1 tutorial chart, dialogue, intro text, character data, and results animation data. Stated as not read, not as absent.
- Not read: GameOverSubState.hx, Conversation.hx, NewCharacterCard.hx, CharacterUnlockState.
- Half read: client only. The server half is not in the box (the game is client-side).
- The first-minute "time to first control" is unknown without the title track BPM.
