# flutter-team-archive-pinball (I/O Pinball, Flutter)

Donor root: /mnt/frankendom-donors/flutter-team-archive-pinball/

## Licences (as the files say)
- Code: MIT. LICENSE line 1 "MIT License", line 3 "Copyright (c) 2021 Very Good Ventures". packages/pinball_components/sandbox/LICENSE is the same MIT text.
- Assets: no file states an asset licence. The MIT LICENSE does not say whether it covers art, fonts, audio or strings. Class C (unclear).
- Rights holder (README.md:14): "Built by Very Good Ventures in partnership with Google" for Google I/O 2022. No file names who owns the mascot designs (Dash, Sparky, Dino, Android). Status: unknown beyond the README wording.

## Asset inventory
- 2D art (PNG): packages/pinball_components/assets/images/ (about 114 files with fonts). Large PNGs by IHDR: dino/animatronic/head.png 2035x1422; sparky/animatronic.png 1800x1400; dash/animatronic.png 1950x900; android/spaceship/saucer.png 1295x618. Pixel style not verified.
- Mascot jaw layers: dino/animatronic/head.png and mouth.png.
- UI art: packages/pinball_ui/assets/images/ (button 5 files, dialog 1); assets/images/loading_game/io_pinball.png (618x270); art/readme_header.png (about 1.3 MB).
- Fonts: PixeloidSans, PixeloidSansBold, PixeloidMono (packages/pinball_components/fonts and packages/pinball_ui/fonts). No licence file in the box.
- Audio: packages/pinball_audio/assets/sfx/ 15 MP3 (creature cues such as dino, sparky, dash, android, google; flipper; bumper_a/b; kicker_a/b; launcher; rollover; two voice-over clips). Music: packages/pinball_audio/assets/music/background.mp3.
- Text: lib/l10n/arb/app_en.arb, 55 keys each with a description (e.g. "tapAndHoldRocket": "Tap Rocket", line 23).
- Level or board data: none found as data files; the board is built in Dart (packages/pinball_components/lib/src/components/).

## Halves
- Read: the Flutter client (packages/*, lib/).
- Other half in the box: functions/ (Firebase), firestore.rules, storage.rules. Not read.

## Inspiration (own words)
- Mascot heads are two layers (static head plus jaw), driven by behaviour components: chomp, spit, swivel and mouth-open (chrome_dino/behaviors/).
- Table walls drawn as open jaws make the boundary part of the creature (dino/top_wall.png; dino_walls.dart).
- A cabinet machine reacts through a sensor when the ball touches it (sparky_computer_sensor_ball_contact_behavior.dart).
- The saucer runs a visible state cycle (android_spaceship/cubit/android_spaceship_cubit.dart).
- Skill-shot and multiball blink as a telegraph before a reward (skill_shot_blinking_behavior.dart; multiball_blinking_behavior.dart).
- A separate glow sprite on the ball gives speed read (ball/flame_effect.png).

## Briefs (Dom's rule: recreate as a clearly distinct original, never a copy)
- Jaw-gate boundary. Keep: hinged jaw on a timer, readable wall silhouette. Change: a horned gate, different palette, side hinge. Ref: dino/top_wall.png; dino_walls.dart.
- Spitting arcade serpent. Keep: chomp then spit, a short telegraph. Change: armoured slug or plant pod, spore cloud, timer-driven attack. Ref: chrome_dino_spitting_behavior.dart.
- Cabinet mascot head. Keep: oversized head that reacts to hits. Change: mechanical face, asymmetric eyes, different colour ramp. Ref: sparky/animatronic.png; sparky_animatronic.dart.
- Telegraphed skill-shot blink. Keep: steady blink rhythm. Change: pulse ring or sweeping light. Ref: skill_shot_blinking_behavior.dart.

## Cross-link to our cell topics
- Camera: camera_zoom.dart (zoom behaviour; not read in depth).
- VFX: ball/flame_effect.png; score_component_scaling_behavior.dart (pop-in scale).
- Animation: jaw-split mascot layers.
- Sound: 15 creature and event cues; copy the layering idea, not the clips.
- HUD and UI: pixel fonts and button and dialog art.

## Not read
- Binary PNG, MP3, TTF contents (names, counts and IHDR sizes only).
- Component bodies beyond class lines; functions/; sandbox/ beyond its LICENSE; web/; test/.
