# SCAR (asset audit, cell AU047)

Donor: /mnt/frankendom-donors/SCAR (read on VPS, read-only)
Which half: client. This is a Skyrim SKSE/VR plugin (C++ source under src/) that runs inside the player's game. The data half is the Havok-graph text templates under Nemesis_Engine/mod/scar and the JSON action table carried inside animation annotations (documented in docs/EN). No server half exists in this box. Paired donor in box: none.

## Licences (as the files say)
- Code and repo: LICENSE line 1 "MIT License", line 3 "Copyright (c) 2023 max-su-2019". One licence file, covers the repo as a whole. No separate asset, image or data licence file exists.
- Credits: README.md line 72 thanks MikeNike "for allowed me including his elder soul moveset as default animaitons pack". That moveset is not in the box, and the repo states no licence for it.
- Author line: Nemesis_Engine/mod/scar/info.ini says name=SCAR, author=Maxsu & Monitor, site=Null.

## Rights-holder status (repo files only)
Community mod (SKSE plugin) for a commercial game. The repo contains no game data. Game-owner status is not stated in the repo: unknown.

## Asset inventory
- No art, models, textures, audio, fonts, maps or levels in the box. Checked by extension: 50 txt, 15 h, 13 cpp, 5 md, 3 json, 3 jpg/JPG, 1 pdb, 1 ini (no dds, nif, wav, png, hkx).
- Docs screenshots: docs/images/ (3 files: "SCAR Action Data.jpg", "Scar Angle Range 01.JPG", "Scar Angle Range 02.JPG"). Origin not stated; not opened (binary).
- Nemesis behaviour templates: Nemesis_Engine/mod/scar/ holds 49 text files (0_master 2, 1hm_behavior 22, blockbehavior 23, defaultfemale 1, defaultmale 1). Havok XML-like text with event-name string tables (e.g. 0_master/#0106.txt, a hkbBehaviorGraphStringData table). Text data, not art.
- Behaviour injector: BehaviorDataInjector/SCAR_BDI.json, one entry (int "SCAR_AttackVariants" in projectPath Actors, value 0).
- Debug symbols: SCAR.pdb, 35.9 MB. Not opened (binary, build artefact).
- Empty submodules: extern/DKUtil and extern/CommonLibSSE are not checked out in the box.

## Class per group
- Docs screenshots: C (origin not stated; repo MIT does not name images).
- Nemesis text templates and BDI json: A as text under MIT (keep the copyright notice). Not art.
- Art, audio, models, fonts, maps: D (none in box).
- Overall best_class: D for usable game content. Nothing here can be dropped into Frankendom's art or audio pipeline.

## Data first (where the names and numbers live)
The action table is data, not code. Each candidate attack is a JSON string in an annotation of the animation clip, prefixed "SCAR_ActionData" (src/DataHandler.cpp:53; docs/EN/Developers Manual For SCAR 2.0+.md lines 24, 70-71). Keys: IdleAnimation or AttackData, Type (RA, RPA, LA, LPA, BA, BPA, DA, DPA, IDLE), MinDistance, MaxDistance, StartAngle, EndAngle, Chance, TriggerStartTime, TriggerEndTime, WeaponLength, CoolDownTime, CoolDownAlias, ConditionsAlias, VariantID. The annotation time is the priority ("weight"). Read: src/SCARActionData.cpp lines 9-54 (parse), 182-295 (perform).

## Mechanism (what the code does, in order)
1. Animation event "SCAR_ComboStart" fires while the actor is attacking and has a combat target (src/Hook_AttackCombo.cpp:40-41). Its payload is a percent chance; empty payload means always continue (Hook_AttackCombo.cpp:7-13).
2. The clip is found by scanning the active graph nodes for a clip whose annotations start with the prefix (src/DataHandler.cpp:87-118).
3. Candidates are sorted by annotation time, highest first (Hook_AttackCombo.cpp:22; SCARActionData.cpp:297-300). The first one that passes all checks runs; the rest are skipped.
4. Per candidate: must be inside its clip time window (SCARActionData.cpp:191); attack type must match the attacker's current attack type unless IDLE (SCARActionData.cpp:195-199); chance roll first (SCARActionData.cpp:212), then range.
5. Range is a sector test in the attacker's frame: 2D distance band (min..max plus target and attacker bound radii), an angle window with wrap, and a height overlap (src/Function.cpp:56-110; target bound added at line 61; height at 92; angle at 102).
6. Cooldown: alias-shared or own recovery time for attack-data entries (SCARActionData.cpp:112, 254); no cooldown for idle entries without an alias (SCARActionData.cpp:231).
7. Variant: an optional VariantID sets an int graph variable before the animation plays (SCARActionData.cpp:172, 272). Docs describe pairing this with Open Animation Replacer folders.
8. Engine delay reproduced: after a finished attack, pathing attackers wait fCombatAttackAnimationDrivenDelayTime (default 1.5) (src/Hook_AttackStart.cpp:13-16).
9. Debug overlay (off in VR, needs TrueHUD): outer arc green, inner arc red, line to target yellow (src/Function.cpp:113-143).

Defect seen (not asset): from_json clamps "Chance" to -180..180 (src/SCARActionData.cpp:32), a copy-paste range for a 0-100 percent field. No visible effect for 0-100 values; flagged only.

## Inspiration (category-level, own words)
- A ranked list of attack options in one clip, with per-option chance and per-option range band; first pass wins. Good shape for an AI brain row 2 (many-vs-one target picks).
- A chance roll per candidate and then a range test, so a 30 percent heavy attack and a 100 percent light attack can share one clip (Developers Manual lines 24, 70-71).
- Reach as a sector test in the attacker's own frame: distance band plus facing window plus height overlap. Readable and cheap.
- Two cooldown models: a shared alias that several options respect, and an own timer. Fits zone or boss rules.
- The reach arc telegraph idea (outer reach, inner dead zone, line to target), drawn in debug. Could be a real enemy telegraph at 375 wide if drawn as ground marks.
- Windup-window gating: a heavy option only valid between two local times of its clip.

## Inspiration briefs
1. Reach-arc telegraph (effect). Why it works: the player reads danger as a ground sector before it lands. Keep: an outer sector for reach, an inner ring for the dead zone, a line to the target. Change: our own palette and a ground fill that pulses during windup; a camera-facing fade, not a debug overlay. Ref: src/Function.cpp:113-143; docs/images/Scar Angle Range 01.JPG (not opened).
2. Chance-stacked action ladder (AI). Why it works: one creature can mix a rare heavy move and a frequent light move without extra states. Keep: ordered options, each with a chance and a range band; first pass wins. Change: options are zone/creature data rows, not strings in animation files; each option carries a telegraph tag. Ref: src/SCARActionData.cpp:182-295; docs/EN/Developers Manual For SCAR 2.0+.md:24.
3. Windup-gated heavy strike (boss move). Why it works: a heavy move can only fire inside a short slice of its wind-up, so a fast dodge matters. Keep: a clip-time window that gates the move. Change: window measured in our rig's frames, with a sound cue when it opens and a different impact sign. Ref: src/SCARActionData.cpp:191; docs/EN/Developers Manual For SCAR 2.0+.md:185-186.

Rule (Dom): recreate each as a clearly distinct original, never a copy. Kept traits and changed traits are listed above.

## Cross-link to our topics
Attack-choice and cooldown rules map to row 2 (AI brain) and row 4 (fight loop). The reach arc maps to row 14 (HUD) and the telegraph ideas to row 8 (wounds and decals) only if drawn as ground marks. No camera, zone, spawn, loot or sound assets exist in this donor.

## Not read
- src/SCARActionData.h, src/Hook_AttackStart.h, src/main.cpp, src/LoadGame.cpp, src/DataHandler.h, src/Function.h, src/DebugAPI/*, src/TrueHUD/TrueHUDAPI.h, src/PrecisionAPI/PrecisionAPI.h, src/OpenAnimationReplacer/API/* (not read).
- The three JPG screenshots (binary, not opened). SCAR.pdb (binary, not opened).
- docs/CN/Moveset适配教程.md, docs/EN/How To Patch Moveset For SCAR.md (not read). docs/EN/Developers Manual For SCAR 2.0+.md and docs/EN/Apply Randomization For SCAR.md: grep matches only, not read in full. The Apply Randomization file is marked outdated at line 3.
- Nemesis templates beyond the header line of #0106 (not read).
