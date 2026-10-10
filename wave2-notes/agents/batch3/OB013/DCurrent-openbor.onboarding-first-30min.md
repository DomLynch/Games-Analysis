# DCurrent-openbor (onboarding-first-30min, cell OB013)

Donor: `/mnt/frankendom-donors/DCurrent-openbor` | Licence: 3-clause BSD-style for the engine code (LICENSE lines 1-2 name the copyright holders; line 7 "Redistributions of source code"). Adapt allowed with the BSD notice kept. Art and game content: no licence stated, so inspiration only, no art reuse. | Half read: ENGINE (engine/openbor.c main loop, menus, playgame, hit resolution, death config). The data pack half (media/, scenes, levels.txt, scripts, sprites) is not in this repo: media/ holds only `_DUMMY`.

Checked: Verdict PARTIAL for onboarding (the first-run content is absent from the box, and the engine has no game content of its own), and STRONG for the hit-pause rule (item 2 of the onboarding brief). Opened and read engine/openbor.c: openborMain (boot, intro loop, main menu), choose_mode and playgame (difficulty, lives, continues), the join path (join slot, join scripts), hit resolution (around lines 31700-31745), the bounce and quake block (around 32378-32381), death sequence blink flags (around 36120-36245), and playscene (52558). Candidate files for PARTIAL, listed in verdict.txt: engine/openbor.c (read), media/ (listed: only `_DUMMY`), engine/translation.txt (counted: 178 msgid lines; header read), data/levels.txt (named by the code, not in the repo). Confidence: high for what the engine does; no claim about the first 90 seconds of any shipped module.

Best transferable idea: the victim's hit stun is unconditional, but the attacker's recovery pause is gated by a window, so combos cannot freeze the attacker on the ground.

## 1. Mechanism (what the player sees and feels, 375 wide)

- Boot: a hold loop runs for up to six seconds before the logo; any button or Esc ends it early. Then the logo scene plays. Then the intro scene plays, and it replays every 20 seconds (the next replay time is set 20 seconds after each play). Any menu input pushes that next replay 20 seconds out.
- Title: "PRESS START" blinks in the first half of each second while the intro is up. Any button goes to the main menu.
- Main menu: five items in this order: Start Game, Options, How To Play, Hall Of Fame, Quit. How To Play plays a scene file and restores the music afterwards.
- Start Game: a Choose Mode card (New Game, Load Game, Back). New Game opens a Game Mode list read from the level-set file. If the module has only one set, that set loads without the list.
- Drop-in join: during play, a slot whose player has a name joins on any button press. Each slot has its own join script, and a joinall script runs for all slots. Join resets that player's lives to the level-set value.
- Lives and continues: a level set sets lives (default 3 if zero) and continues. A global default of five continues exists.
- Hit feel: on a landed hit the target always freezes for the attack's pause value, and the attacker freezes only if its pause window has ended (or it is in the air). A flash is spawned at the target, and a combo timer starts. Landing from a bounce sets a quake of four, plays the fall sound and rumbles the pad when the option is set.
- Death: a dying entity can blink through its death sequence. Blink flags come from the model's death config, and a no-blink flag turns it off. Players switch to a player blink action.

## 2. Why it works / is striking

- Readable at 375 wide: the engine does not decide sizes (data pack). The menu loads three font slots (menu/font1, font2, font3) on a fixed cell grid (the audit names the three GIF sheets). Not verified at 375.
- One signature behaviour: the attacker's recovery pause is gated by a window on the ground. In the air the window is bypassed unless the `equalairpause` flag is set, so air juggles keep stacking pause by default.
- One signature sound: the fall sound plus a pad rumble on landing (rumble value is 100 times the vertical velocity divided by two, integer maths).
- Could be ours at 20-30 percent resemblance: a hit that stuns the victim for a fixed window and gives the attacker a short recovery window that does not renew while it runs.

## 3. The rule behind it

Per landed hit, in this order (engine/openbor.c, lines 31716-31742):
1. Flash spawns at the target (31716).
2. Combo timer: owner's combo time = now + combo delay (31719).
3. Attacker pause, gated: if the attacker's pause window has ended, or it is in the air and the air flag is off, then add pause to its movement timers and animation (31722-31733). It sets the window to now + pause.
4. Victim pause, always: add pause to the victim's timers and animation (31736-31742).

Numbers as designer data fields (donor value null: the numbers come from the module data pack, not in the box):
- pause_add: unit = engine ticks on the same clock as the game timer (inferred: the intro idle timer is `game_speed * 20`, so game_speed is ticks per second; the pause values are script arguments, data not read).
- air_bypasses_pause_window: boolean (true when equalairpause is off; default value not read).
- flash_on_hit: boolean.
- combo_delay: ticks (the combo delay constant is not read).
- bounce_quake_strength: 4 (level quake value, bounce only; unit not read).
- intro_idle_seconds: 20 (engine constant, seconds, by `game_speed * 20`).
- splash_max_seconds: 6 (engine constant, seconds, by `game_speed * 6`).
- lives_default_when_zero: 3; continues_global_default: 5 (engine constants).

## 4. For Frankendom

- Shape match: the fight is one engine (src/fight), and the victim/attacker pause split matches our hit-stop row. Server-verified hits send the pause values; the client only shows the freeze and the flash.
- Keep: the unconditional victim stun and the windowed attacker recovery on the ground. Make the air case an explicit rule (ours: decide per fight, not by accident). With MAX_ATTACKERS = 3, a window that cannot renew matters more than in a one-on-one game.
- Change: the donor writes the pause into four timer fields by hand (31733-31742), and one line carries the comment "UT: temporary solution" (31733). In our engine, pause should live in one field per entity, set on the server tick.
- Defect review (per brief, keep the idea): the hand-synced timers are the defect (fix: one pause field, read by movement, animation and think); the air bypass is a default, not a bug (fix: explicit flag in data). The quake applies on bounce only, not on each hit, so do not copy it as hit shake.
- Target: `src/fight/hit-pause.ts` (proposed, does not exist), row 10 (hit impact / hitstop). The server tick sub-line: fixed step, input intake, per-tick NPC budget.
- Boot and menu flow: no fight row. Keep the idle-attract loop and the one-button start as client presentation only.

## 5. Five-minute look test (phone)

Two quick mocks, 375 wide:
- Hit pause: a tap-to-hit prototype where the victim freezes for a tunable short window and the attacker freezes only once its window has expired on the ground; test three rapid hits in a row and watch whether the attacker freezes on each one.
- Attract loop: logo, then a 20-second replay of the intro that any tap pushes back, with a blinking PRESS START. Compare the reset with our current title.

## 6. Licence / IP

- Engine code: BSD-style. Code may be adapted if the copyright notice is kept (LICENSE line 1 names the holders). The engine code is re-expressed here as a sketch, not copied.
- Content: the README says the original game used assets from a third-party series (README line 21, per the audit). No art, sprite or scene is reused here. Do not use any art that traces to that line.
- No legal conclusion is drawn.

## 7. Gaps

- Not read: the data pack (no scenes, levels.txt, scripts, sprites, sounds in the repo); the logo and intro scene files (named by the code, absent); engine/source/openborscript/ scripting (only the file size was read); join scripts (named, absent); the Hall Of Fame code path; the Options screens beyond their names.
- Half read: engine only. The data pack and a module folder were not found in the box by folder name (not opened).
- First fight and first kill: staged by module data, not read. No first-kill gate in the engine.
- Death and respawn presentation: death config flags read (blink); respawn and continue screens not read. Loot reveal: not in the engine half. Walk density: not read. Idle animation vocabulary: not read (data). Readability at 375 wide: not verified.
- Minute 5, 10, 30 timings: not in this half.
