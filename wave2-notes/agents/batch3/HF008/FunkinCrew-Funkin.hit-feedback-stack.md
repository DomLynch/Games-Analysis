# FunkinCrew-Funkin (Friday Night Funkin'): hit-feedback-stack (HF008)

Donor: /mnt/frankendom-donors/FunkinCrew-Funkin (read-only, VPS)
Licence: source code Apache 2.0 (LICENSE.md line 3, "licensed under the Apache 2.0 license"). Art, audio, charts and characters are upstream submodules, empty in the box, and docs/COMPILING.md line 13 calls downloaded content proprietary. Trademark: the name and logo (LICENSE.md line 6). So: code shape and numbers may be adapted with the Apache notice; no art, audio or name is used.
Checked: read the note-hit path in play/ (PlayState goodNoteHit, miss and ghost paths, stepHit camera bump, popUpScore), play/notes (NoteSplash, NoteVibrationsHandler, Strumline hit functions), play/components/PopUpStuff, play/character/BaseCharacter (hit and miss handlers), util/Constants and play/scoring/Scoring (the numbers). Confidence high on the order of operations, the numbers and the defects. A search of play/ for shake, flash, hitstop, freeze and FlxG.sound.play found no hit-time shake, flash, hit-stop or hit sound. Freeplay shake exists but is menu UI, not play.
Half read: client only. Single-player rhythm game: no server half in the box. Content half (art, audio) is upstream and absent.
Decision: adapt (idea). Defects below are fixed in our shape.

## 1. What the player sees and feels
A note reaches the line and the finger taps. The receptor on the strumline flashes its confirm pose, the note disappears, and a pooled splash bursts from that lane, with a random variant from the note style's set and a slightly jittered speed so no two splashes look identical. A rating word ("sick", "good", "bad", "shit") pops up near the middle of the screen, rises fast, and fades out one beat later. From ten hits in a row a combo number pops too. The character on the player's side swings the matching direction pose, and the spectator character reacts to combo. Nothing shakes, freezes or flashes. The song itself is the hit sound; the player hears the music continue. A miss is the audible event: the player's voice stem mutes and a short miss sound plays.

## 2. Why it works, or why it is striking
- Readable at 375 wide: the popup sits in the middle band, above the strumline, with a short fade; the splash is small and lane-coloured, so the strumline stays readable.
- One signature behaviour: the miss ducks the player's voice stem, and the next hit brings it back (PlayState popUpScore and goodNoteHit). Silence is the feedback for the mistake.
- One signature sound: the song itself on a hit; a random pick from a pool of three miss sounds on a miss (PlayState 3193), so a miss does not repeat the same sound.
- Could be made ours at 20 to 30 percent resemblance: yes. The popup rise-and-fade, the pooled splash with direction variants and frame-rate jitter, and the voice-duck on a miss all transfer. Our versions would use our own art and sounds.

## 3. The rule behind it
Order on one note hit (PlayState goodNoteHit, lines 3112 to 3163):
1. The input is read with its own timestamp, and the latency since then is measured now (3112). The judgement uses the note time minus the song position minus that latency (3118), so a late-arriving input is judged on when it was pressed.
2. The judgement and health change are computed, then a cancellable event is dispatched. If a script cancels, nothing below runs.
3. The strum confirm animation plays and the note is removed (hitNote, 3149).
4. The splash plays if enabled (3150): a pooled sprite, a random variant, frame rate 24 plus or minus 2 (NoteSplash lines 10, 11, 56). The sprite is killed when its animation ends.
5. The hold cover plays if the note is a hold.
6. The player's voice stem is restored (lines 3153 to 3155).
7. Score is applied, then the rating popup (3163). PopUpStuff: an upward velocity of 140 to 175 with gravity 550 (lines 51, 52), a fade of 0.2 s that starts one beat later (lines 61, 67). Combo number from 10 (PlayState 3378).
8. The character animations: the matching direction pose on the player and opponent (BaseCharacter onNoteHit). The spectator reacts to combo (sick or good, else drop).

Miss rule (onNoteMiss, PlayState 3190 to 3193): score -100, health -4 percent of max (Constants 502), the player's voice stem mutes (3192), a random miss sound at 0.5 to 0.6 volume (3193). The character plays a miss pose, and the miss pose doubles the sing hold time (BaseCharacter 436). Ghost tap (press with no note) is quieter: 0.1 to 0.2 (3235).

Haptics (NoteVibrationsHandler): each lane that is confirmed adds one quarter of max amplitude (line 59). The total is multiplied by 2.5, then clamped (line 64). Called in the input pass (PlayState 3105), and for holds from stepHit (PlayState 1863).

Camera bump (stepHit, PlayState 1834 onwards): every 4 beats (Constants 246), the main camera is set to 1.015 times and decays by 0.95 per frame (Constants 241, PlayState 1217 to 1228). The HUD camera gets a step of 3 percent of default, capped at 1.35 times default (1851, 1858). This is music-synced, not hit-driven.

Designer-tunable data fields (Apache code, donor values allowed):
- judge_sick_ms: 45 (Scoring 142), unit ms
- judge_good_ms: 90 (Scoring 148), unit ms
- judge_bad_ms: 135 (Scoring 154), unit ms
- judge_shit_ms: 160 (Scoring 160), unit ms; miss at 160 (Scoring 130)
- health_sick_pct_max: 1.5 (Constants 476), unit percent of max
- health_miss_pct_max: -4 (Constants 502), unit percent of max
- splash_fps: 24, variance 2 (NoteSplash 10, 11), unit frames per second
- rating_rise_gravity: 550 (PopUpStuff 51), unit px per s squared
- rating_rise_speed: 140 to 175 (PopUpStuff 52), unit px per s
- rating_fade_s: 0.2 (PopUpStuff 61), unit s
- rating_delay: one beat (PopUpStuff 67)
- combo_popup_min: 10 (PlayState 3378), unit hits
- haptic_per_lane: 0.25 (NoteVibrationsHandler 59), unit fraction of max
- haptic_gain: 2.5 (NoteVibrationsHandler 64), unit ratio
- haptic_pulse_s: 0.01 (NoteVibrationsHandler 64), unit s
- camera_bop_intensity: 1.015 (Constants 241), unit ratio
- camera_bop_every_beats: 4 (Constants 246)
- miss_voice_mute: 0 (PlayState 3192), unit volume
- miss_sound_volume: 0.5 to 0.6 (PlayState 3193), unit volume

## 4. For Frankendom
Target file: src/fight/hit-feedback.ts (proposed module; existing src/fight modules not checked against the repo). Parity row 10 (hit impact and hitstop). Presentation only.

How it maps to our shape:
- Server-verified: in the donor the judgement is local, and the feedback is simply the result. In ours the judgement (parry, hit, miss) is the server's, and the client sends an input timestamp. The donor's latency correction (step 1) maps to our parry or guard window, which belongs to row 3 (guard, parry, stamina), not row 10. Cross-link only.
- Miss as audio: the miss duck is the strongest idea here. A missed block or whiff ducks the player's own fight audio and plays one miss sound from a pool; a landed hit restores it. Keep this as the mistake signal, since the donor has no shake or flash to lean on.
- Many-vs-one (max 3 attackers): the donor stacks haptic amplitude per lane, but two lanes already saturate (see Defects). For three attackers the stack would saturate in the same way. Keep the per-hit add, with a cap that does not reach full at two hits.
- 700 zones as data: all these numbers are shared across zones. Zones do not change the feel.
- Camera, HUD and sound are client-only in our rulings: the bump is music or timer driven, so it is a client-only presentation of a server clock, not a hit reaction.

Keep: judgement from a latency-corrected time (cross-link row 3); the cancellable event before feedback; pooled splash with variant and frame-rate jitter; the miss duck and the next-hit restore; the popup rise-and-fade timed to one beat; the spectator reacting to combo tier; per-hit haptic adds with a cap.
Change: no hit reaction in the donor beyond the splash and popup, so ours needs a hit flash and shake from the other donor (Mindustry note), not copied from here. Our popup goes above the target, not centre-screen. Our miss sound is ours.

Defects found (keep the idea, fix the defect):
- D1: NoteVibrationsHandler line 91 uses == where it means =, and writes to a loop variable, so the hold-end reset to pressed does nothing. Fix: loop by index and assign: if the status is holdConfirm and the hold ended, set it to pressed in the array. Impact is small: the key release already resets to idle (Strumline 782), so the bug does not show in play.
- D2: the haptic gain is applied before the clamp, so two lanes (0.25 times 2 times 2.5 = 1.25) already reach full amplitude; a chord of two feels the same as a chord of four. Fix: set the gain so four lanes reach 1.0, or keep 2.5 and tune on a phone. This is a tuning defect, not a crash.
- D3: the comment on HEALTH_SICK_BONUS says plus 1.0 percent, but the value is 1.5 percent of max (Constants 476). Fix: correct the comment or the value.

## 5. Five-minute look test (Dom, on the phone)
Build one three-lane strum and a target creature at 375 wide. Compare four variants with the same splash and popup:
A. Donor: popup rise and fade, pooled splash, miss duck and miss sound, no shake.
B. Add the miss duck and pool, remove the splash.
C. Add haptic stack with gain 2.5 (donor) vs gain set so four hits reach full.
D. Triple hit: three attackers land in one tick; compare the popup and splash with the stack capped vs uncapped.
Dom judges: whether the miss duck reads as a mistake without a shake, and whether the triple hit reads as one moment. Target: src/fight/hit-feedback.ts, row 10.

## 6. Licence and IP
Apache 2.0 code: numbers, the judgement order and the patterns may be adapted with the Apache notice kept. Art, audio, fonts, charts and the title are not used. Miss sounds are not copied: ours are our own. Recreate as a distinct original: keep the trait "miss ducks the player's stem and the next hit restores it"; change the popup shape, the splash art and the sound.

## 7. Gaps
- Not read: art/ and assets/ (empty submodules); Countdown beyond line 257; GameOverSubState beyond the sound lines; NoteHoldCover; NoteStyle beyond isNoteSplashEnabled; the HapticUtil body beyond vibrate; the non-PBOT1 scoring systems; PopUpStuff combo tween beyond line 118; the Preferences options other than the zoom and haptics ones.
- Half read: client only. No server half in the box.
- Negative grep result: no hit shake, flash, hit-stop or hit sound in play/. Not proof that none exists anywhere in the donor; the freeplay and menu UI have shake and flash.
- Constants.hx line 476 comment mismatch (D3).
