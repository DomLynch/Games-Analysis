# dhewm-dhewm3 (design catalogue, DC018)

Donor tree: /mnt/frankendom-donors/dhewm-dhewm3/ (read over ssh only; nothing copied, nothing run).
Asset audit used first: AU015 (`/private/tmp/p2/wave2-haiku/batch3/AU015/dhewm-dhewm3.assets.md`). Not repeated here.
Half read: engine and game code only (neo/game, neo/game/ai, neo/d3xp/ai, neo/d3xp/script, neo/idlib headers used for types). There is no data pack in the box: base/ holds 3 .cfg files, and the tree has 0 .map, 0 .pk4, 0 .md5mesh, 0 .tga, 0 .wav or .ogg, 0 .gui and 0 .script files. The game data is the user's own copy (README.md line 48, per AU015). No paired donor: id-Software-DOOM in the box contains linuxdoom-1.10, which is not the Doom 3 data; it was read only as a folder listing.
Licence note: GNU GPL (COPYING.txt line 1) with the Doom 3 GPL source additional terms and an excluded-code clause (README.md lines 225-227). Game data is under the id and Activision EULA (AU015). Clean-room, shape only: we take the mechanisms, never the code.
Receipts: `receipts.tsv` in this folder (verified with verify_receipts.py).

## Counts
- creatures: 0 data entries. No monster definitions are in the tree. Behaviour is script-driven in the original game; the script compiler and interpreter are here (neo/d3xp/script/Script_Compiler.cpp, Script_Interpreter.cpp, Script_Thread.cpp), but no .script files are.
- classes: 0 data classes. One player entity class in code (idPlayer, neo/game/Player.h line 209).
- weapons: 0 data entries. One weapon class in code (idWeapon, neo/game/Weapon.h line 64; weapon data is in .def files that are not in the tree), plus four projectile types (section 3).
- gear_sets: 0.
- zones: 0 maps. Zone logic is entity code (doors, movers, triggers): idDoor, idPlat, idMover_Binary, idTrigger_Hurt and the like (neo/game/Mover.h lines 373, 440, 286; Trigger.h line 219).

## 1. Creatures and beasts
None in the data. What the code does give is the AI primitives that a monster script calls (neo/game/ai/AI.cpp, 5099 lines; the state machine itself is in the absent scripts). Relevant primitives, read by name and in part:
- MoveToCover (AI.cpp 1934-1982): finds a cover spot with the area-awareness system (AAS), treating the threat's box as an obstacle (`idAASFindCover findCover( hideFromPos );` at line 1952).
- MoveToAttackPosition (1834), TestMelee (4270), AttackMelee (4327), GetAimDir (3972), Pain (3206), WanderAround (2012), EntityCanSeePos (2297): named only, bodies not read.
- Vagary AI (neo/d3xp/ai/AI_Vagary.cpp, 150 lines): an AI that throws props at the player (section 3 and 6).
Families, tiers, escalation, bosses: not in this donor.

Top 8 striking: none (no creature data). top_creatures is empty.

## 2. Classes, races, factions
One player class in code (idPlayer, Player.h line 209). No progression data. No factions. Not read: any progression or stat code in Player.cpp.

## 3. Weapons and projectiles
Weapon data is absent. Code shows four projectile families (neo/game/Projectile.h): idProjectile (base), idGuidedProjectile (line 136), idSoulCubeMissile (line 168, a guided subclass), idBFGProjectile (line 204) and idDebris (line 239).
Guided projectile (Projectile.cpp, `idGuidedProjectile::Think` from line 1337):
- Seek point: eye height of an actor, minus 12 units (line 1323); with no target it uses a point 2 seconds ahead along the current velocity (GetSeekPos, around lines 1318-1329).
- Turn limit: the heading change is clamped per axis to `turn_max` (lines 1376-1384). `Launch` sets it to the `turn_max` spawn value (default 180) divided by `USERCMD_HZ`, so it is a per-tick limit (line 1438).
- Wobble: a random angle, re-rolled every 200 ms (line 1358), scaled by `frac = dist / clamp_dist`, capped at 1 (lines 1367-1373). `Launch` sets `clamp_dist` from a spawn value (default 256, line 1439). The wobble shrinks as the missile closes.
- Burst: when `dist < burstDist`, it stops steering (`unGuided = true`) and speeds up by `burstVelocity` (lines 1390-1392).
Tier visuals: none in data. Top 5 striking (mechanisms, not art):
1. Guided seeker bolt with decaying wobble (above). Why: a missile that looks alive and then commits. Keep: turn-rate limit, wobble that shrinks with distance, burst at close range. Change: our speed numbers, our trail, a visible lock cue.
2. Burst finish (unguided, faster, last few metres). Why: a clear end-of-flight beat. Keep: the switch to unguided at a set distance. Change: sound and screen flash.
3. Soul-cube style guided subclass (idSoulCubeMissile). Why: an exotic weapon class is a subclass of the guided one. Keep: subclassing. Change: our effect. (Code not read beyond the class declaration.)
4. BFG-style projectile class (idBFGProjectile). Why: a large projectile class exists. Keep: nothing yet; not read.
5. Debris class (idDebris). Why: spawned debris after impact. Keep: spawn-on-impact shape. Change: our materials. (Not read.)

## 4. Armour and gear
No data. Code has item classes: idItem (neo/game/Item.h line 43), idItemPowerup (line 100: a timed power-up), idObjective (line 117), idPDAItem (line 145), idMoveableItem (line 152). Not read: the powerup logic and any tiering. No gear sets, no material tiers, no tier visuals in this donor.

Top 5 striking: none with data. Mechanism-only candidate: the timed powerup item class (idItemPowerup, Item.h line 100); not read.

## 5. Zones and dungeons
No maps in the box. Zone logic is entity code: doors and movers (Mover.h 373, 440), hurt triggers (Trigger.h 219), force fields (Misc.h 244), beams and earthquake and shaking effects (Misc.h 518, 583, 611), liquid volumes (Misc.h 558). Not read beyond class declarations.
Top 5 striking: none with data.

## 6. Item and effect looks worth recreating
- Guided projectile wobble that shrinks with distance (Projectile.cpp 1367-1373). Technique: the random error is scaled by distance to target, so the missile wobbles far away and commits near the target. Ref: Projectile.cpp lines 1358-1373.
- Thrown-prop attack (AI_Vagary.cpp 66-150). Technique: the AI scans for a nearby movable prop, rejects hidden ones, ones too near, and ones behind it, then checks a ballistic path to the player with PredictTrajectory (AI_pathing.cpp 1458); it throws the prop and enables its damage for 2.5 seconds (line 148). Ref: AI_Vagary.cpp lines 86, 96, 104-110, 129-148.
- Stencil shadows: the README says depth-fail stencil shadows were restored in 1.5.1 (README.md lines 204-210, per AU015). This is a renderer technique; not read in code.
- Smoke and fx: neo/game/SmokeParticles.cpp (422 lines) and neo/game/Fx.cpp (794 lines); not read beyond headers.
- Decal splats: idFuncSplat (neo/game/Misc.h line 416). Not read.
- GUI anchor layouts: docs/GUIs.md and docs/img (per AU015): anchor sets per screen shape, letterbox test. Ref: docs/img/d3gui-cst-tl-wide.png.

## 7. Inspiration for Frankendom (originals, not copies)
1. "Seeker bolt with a fading wobble": a homing shot with a turn-rate cap, wobble that shrinks as it closes, and an unguided burst at close range. Keep: turn cap, distance-scaled wobble, burst. Change: our speeds, trail and lock cue.
2. "Thrown-prop volley": an enemy that throws a nearby crate or barrel at the player after a trajectory check, with a short damage window. Keep: the feasibility check and the timed damage window. Change: our props, a telegraph and a tell sound.
3. "Cover-seek enemy": after a ranged shot the enemy moves to the nearest tile out of the player's sight line, treating the player as an obstacle. Keep: nearest hidden spot and the threat as obstacle. Change: our grid search (no AAS), and a peek-and-fire cycle.
4. "Anchored HUD kit": anchor sets per screen shape with a letterbox test (from AU015). Keep: one variant per screen shape. Change: our grid and bottom-anchored panels for touch.
5. "Two-state toolbar pair": on and off icons that differ in fill (AU015). Keep: two-state pair at one size. Change: a colour or badge cue, not fill alone.

## Defects and notes seen in code
- AI_Vagary.cpp 137: `vel = ( viewAxis[ 0 ] * physicsObj.GetGravityAxis() ) * speed;` is a vector-by-matrix product in the no-enemy branch. For a standard gravity axis it may reduce to the forward vector; not run. Fix: use the forward axis directly.
- Projectile.cpp 1245 and 1244: the constructor sets `clamp_dist` and `turn_max` to 0, and line 1368 divides by `clamp_dist`. `Launch` (lines 1438-1439) sets both before the first Think, so it is safe on the normal path. Risk: a missile that Thinks before Launch divides by zero. Fix: guard the divide.
- AI_Vagary.cpp 86: `RandomInt( numListedEntities )` returns 0 for an empty list (idlib/math/Random.h 79-82), so no crash; noted only.

## Cross-links
- hud-ui: AU015 anchor sets and the toolbar pair; GUI scripting (docs/GUIs.md).
- vfx: stencil shadows (README only).
- AI brain (row 2 of the parity list): primitives in AI.cpp; state machine in absent scripts.
- camera, zones, spawns, loot, animation, sound: no data in this release.

## Not verified
- Creature, weapon, item and zone data: none in the box (AU015).
- AI.cpp state logic beyond the named primitives; Weapon.cpp (3200 lines); Player.cpp; Item.cpp; Fx.cpp; SmokeParticles.cpp bodies.
- Script compiler and interpreter bodies (neo/d3xp/script): listed, not read.
- The ImGui font licences and the full Doom 3 EULA text (AU015).
- id-Software-DOOM (linuxdoom-1.10): folder listing only.
- No `_RESTRICTED-NOTE.txt` in this donor (AU015).
