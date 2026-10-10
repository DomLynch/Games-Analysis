# ValveSoftware-halflife (asset audit, cell AU054)

Donor/Licence: `/mnt/frankendom-donors/ValveSoftware-halflife/`. Code licence: Half-Life 1 SDK LICENSE (LICENSE:4 Valve copyright). Asset licence: none separate; the same LICENSE covers the SDK as shipped.

Checked: root listing, LICENSE, README.md, game/ tree, utils/ file types, dlls/headcrab.cpp (jump and touch code), dlls/barnacle.cpp (ambush logic, defines and think), dlls/schedule.h (state names), utils/qcsg/hulls.txt (head), game/dmc/dmc.fgd (header). File-type counts over the whole tree.

Which half: the code half (dlls/, cl_dll/, engine-side headers) was read for two monsters and the schedule enum. The data half is the game/ folder, which holds only two entity definition files (.fgd). The game art, models and sounds are not in the box. The paired half (the retail game data) is not in the box.

## Licence and rights
- LICENSE: free to use and modify the SDK for a modified Valve game; distribution of the modified game "only for free" (LICENSE:13); commercial use asks you to contact Valve (LICENSE:38). This is Valve's own licence text, not a named open-source licence. The file says what it says; no legal reading is given here.
- Rights holder: "Half Life 1 SDK Copyright(c) Valve Corp." (LICENSE:4). Original company.
- Game assets: none in the box. Counts over the tree: 0 .mdl, 0 .wav, 0 .mp3, 0 .bsp, 0 .tga or .bmp.

## Asset inventory
- utils/sprgen/: three binary sprite files (s_light, s_explod, s_bubble). Tool samples. Not opened (binary).
- game/dmc/dmc.fgd and game/ricochet/ricochet.fgd: entity definition text for two mod setups; the dmc header says it is for Worldcraft 3.x and above (dmc.fgd:2 read). Class C.
- utils/qcsg/hulls.txt and utils/qrad/qrad.txt: plain-text collision hull rows (four rows) and tool documentation. Class C.
- dlls/, cl_dll/, common/, game_shared/, pm_shared/: code only; monster and weapon behaviour is written in code, not in data files.

## Class per group
- Tool sprites: C (SDK licence, binary, not read).
- Entity definition files: C (SDK licence).
- Hull text and tool docs: C.
- Game art, models, sounds, maps: D (not in the box).
Best class: C.

## Inspiration (category level; proprietary donor, so shape and mechanism only)
- Leaping parasite: a small crawler solves its jump speed from the height gap and gravity, then scales its sideways speed so it arrives at the target's height at the top of the arc (dlls/headcrab.cpp:236-244, :251). Hits only while airborne (:356) and clears its contact after one hit (:363). Keep the solved arc, the airborne-only hit and the single contact. Fix (defect): the distance cap scales the whole jump vector, including the vertical part, so the arc no longer lands on the target's height (:251). Fix: cap only the sideways part or lengthen the flight time. Our creature should be a different body plan with its own tell.
- Idle hop with no target: when it has no enemy, the crawler hops forward in a short arc (:256). A cheap idle beat.
- Idle chatter in combat: a low random chance each think to make a small sound while in the combat state (:371). Life in the fight without new animation.
- Ceiling or floor ambush plant: a fixed creature extends a tongue, touches prey, pulls it up at a fixed step per think (dlls/barnacle.cpp:184), then runs a kill timer. Defect: the file defines a kill delay (barnacle.cpp:27) and the code sets a different one (:196). Fix: one data field for the kill delay, read by both.
- Named schedule vocabulary: about 42 SCHED_ entries in one enum (dlls/schedule.h:34-45 region), including idle stand and walk, wake angry, alert face, small and big flinch, investigate sound, combat face and stand, and a fail state. Keep a short named set that the HUD and camera can read. Our own names for many-on-one combat.
- Fail fallback: when every schedule fails the crawler tries to jump (dlls/headcrab.cpp:542). Unpredictability that costs nothing.

## Inspiration briefs
1. Leaping parasite. Why it works: a low, fast hop that is telegraphed by the arc itself; the hit only counts on the way down. Keep: solved arc to the target height; airborne-only hit; one contact then off. Change: different body plan (not a crab), a crouch tell before the leap, a glow at the peak. Ref: dlls/headcrab.cpp:218-265 and :356-363.
2. Ceiling ambush plant. Why it works: a fixed trap that reads from far away and pulls prey up over several seconds. Keep: fixed position; steady pull per think; one kill timer that ends the pull. Change: vine or root look, a bloom cue as it pulls, a readable silhouette for the lifted target. Ref: dlls/barnacle.cpp:145-220 (pull and kill timer).
3. Named schedule set. Why it works: a small vocabulary of states the player can read from posture alone. Keep: idle, alert, flinch, investigate-sound, combat, fail. Change: our own state names; combat states written for our own attacker cap, not this donor's. Ref: dlls/schedule.h:34-45.
4. Combat chatter. Why it works: a rare random sound keeps a fight feeling alive. Keep: low chance per think in combat. Change: our own vocal set per creature type. Ref: dlls/headcrab.cpp:371.

## Cross-link
- Animation: the leap and idle hop are the animation-adjacent ideas. Sound: the combat chatter. Spawns and loot: none in this box. HUD and camera: none in this box (cl_dll read only by directory listing).

## Not read
- Retail data and art (not in the box). Sprite binaries (utils/sprgen). Most of dlls/ (monster bodies other than the two above). Full fgd files. utils/qrad docs. The Valve SDK third-party notices (not in this donor).
