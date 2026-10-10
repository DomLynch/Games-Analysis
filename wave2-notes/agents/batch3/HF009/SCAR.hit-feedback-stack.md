# SCAR (hit-feedback-stack, cell HF009)

Donor: /mnt/frankendom-donors/SCAR (VPS, read-only). Licence: MIT (LICENSE line 1 "MIT License"; copyright line 3, 2023, max-su-2019). One licence for the repo. Keep the notice if any file is copied. Nothing is copied here.
Checked: src/ (grep for hit stop, shake, flash, knockback, stagger, particle, blood, recoil, HitFrame, sound: the only hits are a TrueHUD flash API and a PrecisionAPI stagger enum name; no feedback code). Nemesis_Engine/mod/scar/1hm_behavior/#0085.txt (event-name table: header line 2; names at lines 3, 5, 31, 39, 40, 48, 54, 88, 136). Nemesis_Engine/mod/scar/blockbehavior/#0076.txt (event-name table, lines 1-25). Nemesis_Engine/mod/scar/0_master/#0106.txt (master event table, line 2). Clip trigger arrays across the templates (4 files, grep). docs/ and README.md: grep for HitFrame, hit frame, preHit, hit stop: no matches. The earlier asset audit (AU047/SCAR.assets.md) was used for context. Candidate files opened: 4 template files plus the grep of src/ (listed in verdict.txt). Confidence: high that the box holds no hit-feedback code and no hit-frame timing; medium on what the event names do (their meaning is not documented here).
Half read: data (Havok behaviour event-name tables and the four clip trigger arrays). The client half (SKSE plugin source) was searched for hit feedback and has none. No server half and no paired donor in the box. Clip timing (hkaAnimation, the .hkx files) is not in the box.

## 1. What the player sees and feels
Nothing in this box. SCAR is a Skyrim plugin that chooses attacks from an animation's annotations (AU047). Hits are shown by the game and by the animation clips, which are not here. The only feedback vocabulary is the event names in the behaviour templates: a pre-hit frame, a hit frame, a second hit frame, recoil and stagger starts and stops, a block-hit stop and a block-hit start, and 61 sound-play names in the 1hm template (shield block, shield bash, kill sounds, body fall, dirt scuff).

## 2. Why it works, and is it striking
- Readable beat at 375 wide: not measured here. A named pre-hit frame is the right shape for a telegraph, but where it falls on the clip is not in the box.
- Signature behaviour: none observable from the box.
- Signature sound: sound-play events, names only. No sound files.
- Could be made ours at 20-30 percent resemblance: the idea yes (a named cue event on each attack, separate from damage); the content no.
Verdict: PARTIAL. Real as event names, but the mechanism (where the frames fall, what they do, how long they last) is not in the box.

## 3. The rule behind it
What the box does show:
- The event-name tables list names only. The table order is not timing. #0085 declares 461 event names (line 2), and a raw count of hkcstring lines between the tags gave 463; not reconciled. #0106 declares 1217 event names (line 2). #0076 declares 39 (line 2).
- The hit-related names in #0085 include preHitFrame (line 40), HitFrame (line 39), 2_HitFrame (line 88), NPCHitFrame (line 136), recoilStart (line 31), recoilStop (line 3), staggerStart (line 54), staggerStop (line 5), blockHitStop (line 48) and blockHitStart (line 50). 10 names in #0085 contain "Hit" and 61 are SoundPlay names.
- Clip trigger arrays (where an event is given a local time on a clip) appear in 4 template files. All 4 hold one trigger each, at localTime 0.000000, on the event SCAR_UpdateDummy. None places a hit or pre-hit event. So the hit-frame timing is not in the box.
- Not shown: which frame HitFrame or preHitFrame sits on, how far apart they are, and what blockHitStop does. Do not read blockHitStop as a freeze.

Data fields (names only; donor values null because timing is not in the box):
- hit_cue_offset: frames before the hit frame, for a pre-hit cue (donor: not in box).
- hit_frame_index: which frame is the damage frame (donor: not in box).
- second_hit_offset: frames between HitFrame and 2_HitFrame (donor: not in box).
- sound_event_name: event naming a sound on the clip (donor: name only).
- block_hit_stop_ms: ms of freeze on a blocked hit (donor: name only; effect not read).

## 4. For Frankendom
Target: src/fight/hit-feedback.ts, parity row 10 (hit impact and hit stop). Keep the idea of a named cue event on each attack, separate from the damage, fired a fixed number of frames before the damage frame. Change: our own event names; the cue fires on our rig clip (parity rows 6 and 7); the damage frame stays server-verified; the cue is client only.

## 5. Five-minute look test (Dom, on his phone at 375 wide)
One creature attack in one zone, two builds behind a style flag: (A) no cue; (B) a 100 ms cue (a ground ring and a short sound) placed before the damage frame. Dom judges whether the strike can be read and dodged before it lands at 375 wide, in three attacks each. Pair with the hit-feedback look test in the openmw note.

## 6. Licence and IP
MIT for code and for the Nemesis text templates. No art or audio is in the box. Event names are not copied into our files: we keep the idea and name our own events.

## 7. Gaps
- Not read: src/SCARActionData.h, src/Hook_AttackStart.h, src/main.cpp, src/LoadGame.cpp, src/DataHandler.h, src/Function.h, src/DebugAPI/*, src/TrueHUD/TrueHUDAPI.h body, src/PrecisionAPI/PrecisionAPI.h body, src/OpenAnimationReplacer/API/*. Of the 49 template text files in the behaviour folders (AU047 count), only #0085, #0076 and #0106 were opened, plus grep matches in the others.
- Not in box: clip timing (hkaAnimation, .hkx), the meaning of preHitFrame, HitFrame and blockHitStop (no code or doc in this box uses them), sound files, screenshots (binary).
- Half read: data (event-name tables, four trigger arrays). Client source searched, no feedback code.
- Not checked for death and respawn, loot ceremony, idle or ambient animation, walk density, or 375 readability beyond the reach-arc telegraph noted in AU047 (a debug overlay, src/Function.cpp:113-143).

Reuse tag: idea only, MIT source (notice kept if copied; none copied). Brief rule served: ordered feedback (a named cue before the damage frame, on the attack timeline).
Best transferable idea: put a named pre-hit cue on each attack, a fixed number of frames before its damage frame, and let the cue, not the damage, carry the telegraph.
