# Anuken-Mindustry (onboarding-first-5, cell OB005)

Donor: /mnt/frankendom-donors/Anuken-Mindustry (VPS, read-only). Depth: full for the hint and objective engine; thin for the tutorial content itself. Half read: client and shared logic (core/src, core/assets/bundles). Server half (server/) not read. Map data (core/assets/maps/serpulo/groundZero.msav, binary) not read.
Licence: code GPL-3.0 (LICENSE). Assets have no licence statement (per AU004). Clean-room, shape only: no donor values, no copied strings.
Checked this turn (code read): ui/fragments/HintsFragment.java (full, 405 lines), game/Objectives.java (full, 155 lines), game/MapObjectives.java (MapObjective base at line 180, plus ResearchObjective 297, BuildCountObjective 425, TimerObjective 516 and their neighbours), content/SectorPresets.java (groundZero, line 22 to 30), type/SectorPreset.java (lines 25 to 26), core/Logic.java (lines 270 to 290, the grace timer and starting items), game/Saves.java (getTotalPlaytime, line 237), game/EventType.java (line 37), bundle.properties (hint and objective strings, lines 813, 822 to 828, 834 to 868, 2339 to 2378), ui/dialogs/SettingsMenuDialog.java (line 407, hints pref), input/Binding.java (line 94).
Grep only (not read in full): HudFragment.java line 788 (a comment about tutorial sound), PlanetDialog.java lines 417 to 420, MenuFragment (not found by grep for tutorial).
Not read: groundZero.msav (where the objective graph and its text most likely live; not confirmed), server/ module, Fx.java, turret and bullet effects, launchers.

## 1. What the player sees and feels
Phone-first note first: the donor is a desktop-first hint system. Its tutorial sector is groundZero (SectorPresets.java line 22), always unlocked, difficulty 1, capture after 10 waves (lines 23 to 25). The core starts with a loadout of items (Logic.java lines 277 to 283; addStartingItems at SectorPresets line 24). The first wave timer is set to two wave spacings (Logic.java line 272), scaled by campaign difficulty.
For the first eight seconds of total playtime nothing is said. Then one small dark box appears on the left edge with one or two lines of text and a Skip button (HintsFragment.java line 59 gate, lines 118 to 137 display). The text is short, for example "use WASD to move", with a click variant on desktop and a tap variant on mobile (lines 351 to 352). The box fades out over 0.6 s while sliding up 200 units (foutTime at line 31; the fade is in hide(), lines 150 to 158). On a phone there is no movement hint: the move hint and shoot hint are desktop-only (line 170 and line 179).

## 2. Onboarding items (the nine asks)
(1) First 90 seconds: the player is on the map with starting items and a long first-wave timer. No text before the first hint. The first hint arrives only after 8000 ms of total save playtime (HintsFragment.java line 59), and only when the game is in play and no cutscene runs (same line). If the player has already moved by then, the move hint's complete test is already true, so it is dropped silently (lines 60 to 62 and line 108). It is not marked as done, so a later session may still show it.

(2) First fight and first hit feedback: the shoot hint shows when enemies exist on Serpulo and completes when the player is shooting (HintsFragment.java lines 179 to 181). The wave HUD line reads that enemies are approaching in a countdown (bundle string "objective.enemiesapproaching"). Rigging: difficulty 1 (SectorPresets line 26), ten waves to capture, starting items, and a long first wave. The hit feedback (bullets, flash, sound) is in Fx.java and the bullet classes, not read.

(3) First reward and celebration: sector capture and tech unlocks. Sector gates are five objective types in Objectives.java: Research, Produce, SectorComplete, OnSector, OnPlanet, each with a display string (requirement.* in the bundle, 7 lines at lines 822 to 828). The launch hint appears once groundZero is captured and completes when the planet dialog opens (HintsFragment.java around line 211 onward). EventType.java line 37 declares tutorialComplete, but grep found no code that fires it in core/src. No celebration animation was found in the code read.

(4) First hub and services: the planet/sector map is the hub. Services are introduced one at a time by the hint queue, each only when its context happens: the launch hint (planet), the core upgrade hint (when a foundation can be afforded, line 276), the factory control hint (when a factory exists), the unit control hints (when units exist), the preset difficulty hint (campaign sector with threat 0.5 or more, line 294). The research pointer is missing: bundle has hint.research (lines 2351 to 2352) but no DefaultHint entry uses it, so the research pointer never fires in core/src.

(5) First meaningful choice: the code gives no choice on groundZero. Objectives can steer the first build: BuildCountObjective (MapObjectives.java line 425) completes when a placed count reaches a target. Which block to build is set by the map objective list (groundZero.msav, not read).

(6) Pull-forward hooks: minute 5 is the launch hint after capture (the next sector is visible on the planet map). Minute 10 is the preset difficulty hint on a harder sector and the core upgrade hint. Later in a run (not tied to a minute mark) the guardian hint fires when a boss with armour 4 or more appears and salvo is unlocked, and tells the player that guardian units are armoured (line 261, bundle hint.guardian). Timing against minutes 5, 10 and 30 is not in the code; it depends on the map's waves. A rumour-style hint: a "high threat" label on a sector (bundle hint.presetDifficulty) tells the player a harder place exists before they go there.

(7) Tutorial style: optional, show-don't-tell, one line at a time. Each hint ends when the action is seen, not when the text is read (the complete test in each DefaultHint). The Skip button marks the hint as done for good (HintsFragment.java lines 129 to 133, which call complete() at line 140, which calls finish()). Text length: one to two lines, wrapped at 270 units on mobile and 400 on desktop (line 126). Players can switch all hints off with the hints setting (line 45, SettingsMenuDialog line 407). Objectives (MapObjectives) are the only forced-looking guide, and their text is map data (not read).

(8) Drop-off risks: avoids long text, avoids locking the player out, and avoids showing hints during cutscenes. Risks: the done flags are stored in global settings with a name key ("<hint>-hint-done", lines 337 to 346 and 397 to 402), not per save, so a new save on the same install sees no hints. The phone path has no first movement hint. The research pointer is dead text. The sector preset's startWaveTimeMultiplier of 3 (SectorPresets line 29) has no reader in core/src (the only mention is the field at SectorPreset.java line 25), so the intended longer first-wave grace may not run. server/ and the map rules are not read, so it may be wired elsewhere; this is a question, not a finding.

(9) Could be ours at 20 to 30 percent resemblance: a one-at-a-time hint queue. Each hint has a "show when" test (its context) and a "done when" test (the player did the thing), a fixed priority, a delay gate, a Skip, and a done flag. For us the done test must come from a server-verified event (engage, first hit, first kill, first loot) and the client only draws the box. The phone version needs its own move hint (tap or swipe to guard).

## 3. Why it works / is striking
- Readable at 375 wide: a single box, one or two lines, a fixed corner.
- One signature behaviour: the box vanishes the moment the action is done, so the tutorial costs nothing once learned.
- One signature rule: each service appears only when its context exists, so the first hub is not a wall of buttons.
- Could be made ours at 20 to 30 percent: yes. The box, the queue and the Skip are the transferable parts; the wording and the objective graph are ours.

## 4. The rule behind it
Hint queue (HintsFragment.java):
- Each frame, when no hint is on screen, the queue takes the first hint (by enum order) whose show test is true (lines 105 to 115).
- If a hint's done test is already true when it is picked, it is removed without showing (lines 60 to 62, 108).
- Only one hint is on screen at a time. Its done test is checked each frame; when true, it completes and the next waits (lines 49 to 50, 140 to 146, 150 to 158).
- Gate: the whole queue waits for 8000 ms of total save playtime, and never shows during a cutscene (line 59).
- Done is stored per hint name in settings (lines 337 to 346), so a hint is shown at most once per install unless the settings are reset.
- Platform: each hint is valid on desktop or mobile or both (valid(), line 373).

Objective graph (MapObjectives.java):
- A MapObjective (base at line 180) has a done-flag set, a parent list, flags added or removed on done, a markers list, and an optional logic script run on done (done(), line 208). An objective runs only when its parents are complete (dependencyFinished at line 217, qualified at line 233).
- Thirteen objective classes: research, produce, item, core item, build count, unit count, destroy units, timer, destroy block, destroy blocks, command mode, flag, destroy core.
- Timer: counts up by delta time and completes at duration times the rules' objective timer multiplier (TimerObjective, line 516 onward).

Data fields (designer-tunable; donor value null because the donor is GPL-3.0 and the value is not copied):
- hint_first_show_playtime_ms | ms | null (donor: 8000)
- hint_fade_out_s | s | null (donor: 0.6)
- hint_slide_up_units | units | null (donor: 200)
- hints_visible_at_once | count | null (donor: 1)
- hint_box_width_desktop_units | units | null (donor: 400)
- hint_box_width_mobile_units | units | null (donor: 270)
- first_wave_grace_wave_spacings | multiple | null (donor: 2 default, applied by Logic.java)
- sector_first_wave_multiplier_declared | multiple | null (donor: 3 declared on groundZero, reader not found)
- capture_wave_groundzero | waves | null (donor: 10)
- difficulty_groundzero | rating | null (donor: 1)
- objective_timer_multiplier | multiple | null (rules value, not read)

## 5. For Frankendom
- Mapping: the hint queue is HUD (client-only, parity row 14). Its done tests read the server's state (engage, first hit, first kill, first loot), not the local input, except for controls, which are row 5 and stay on the client.
- Zones as data: the objective list is per zone in the donor (map file). Ours is zone data with a list of done events, not a script.
- Many-vs-one: not in the donor's onboarding. For us the first duel is one vs one; the first two-enemy fight is where "max three attackers" can be taught with a hint that appears when a second attacker arrives.
- Server-verified: done tests must be server events. The client shows the box.
- Keep: one visible hint, done-when, Skip, per-install done flag (for the tutorial only), context-gated services, the 8-second-type delay before the first hint.
- Change: a phone-first first move hint (tap or swipe to guard); a per-save done flag (not per install); wire the first-fight grace as data and check it actually applies.

## 6. Five-minute look test (Dom, on a phone)
Build a 375-wide ring fight with three hints in order: (a) "Tap to guard" appears after 8 seconds of play, done when the server logs a guard; (b) "Hold to power a strike" appears when the first strike is available, done on a strike; (c) "A second attacker is coming" appears when the second enemy engages, done on the first hit taken. Each hint has a Skip, one is visible at a time, and the box fades in 0.6 s.
Compare: does each hint vanish the moment you do the thing? Score 1 to 5 for "I know what to do next" after the first fight.

## 7. Licence / IP
Code: GPL-3.0 (LICENSE, full text). Clean-room: the mechanism is kept at shape level (show test, done test, queue, Skip, done flag). No donor values, strings or code are copied into our tree.
Assets: no asset licence statement found (per AU004). Inspiration from the sprites, maps and sounds is category-level only. The hint text is paraphrased here, not copied.
This is what the files say, not a legal reading.

## 8. Gaps
- Not in the half I read: server/ module (may hold the server side of objectives or the grace timer), groundZero.msav (objective graph and first-wave data, binary).
- Grep only: HudFragment.java line 788 (a comment about muting a sound on the tutorial), PlanetDialog.java lines 417 to 420 (a comment about tutorial starting sectors).
- Not read: Fx.java and bullet effects (hit feedback visuals and sound), launchers.
- Half read: client and shared logic. Data (map file) not read.
- Unverified: whether startWaveTimeMultiplier is consumed by server/ or the map rules.
