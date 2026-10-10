# nonameentername-openfight (asset audit, cell AU037)

Donor: OpenFight, a C++/SDL fighting game with a Godot wrapper. Tree: /mnt/frankendom-donors/nonameentername-openfight/ (524 files on the VPS, read-only).

Code licence: GNU Lesser General Public License v3 (LICENSE line 1). Single root LICENSE. Treated as shape-only for adaptation, as for other GPL-family donors.
Asset licence: none stated. The root LICENSE is the only licence file; the repo does not say whether it covers data/ or images/. data/notes gives sprite conversion commands from .pcx files but names no source. The 200 Godot .import sidecars are generated.
Rights-holder status: unknown. The sprite folder is named after a character from a commercial fighting game; the repo gives no source or owner for the frames.
Best class: C. Sprites and frame data are unclear-provenance; no audio or text exists in the box (ROADMAP.md lines 9 and 11 list health and sound as not done).

Half read: engine (src/libopenfight, most files in part or in full), data pack (data/*.yml in part), presentation (src/platform: file list only). Paired donor in this batch: none.

## Asset groups
- Character sprite frames: data/ryu/ (143 PNG frames, 288 files with .import). Class C.
- Character data: data/ryu/ryu.yml (2533 lines), data/ryu/moves.yml (74 lines). Class C for data; the state machine and motion notation are read in part.
- Effect sprites: data/fireball, fireball_collision, collision, ground_collision (110 files). Class C.
- Backgrounds: data/background.png, solar.png, fire.png. Class C, not opened.
- Screenshots: images/openfight-1 to 4.png. Class C, not opened.
- Config: data/config.yml (key bindings only). Class D.
- Audio and text: none in the box. Class D.

## Inspiration
- Motion commands: moves are typed as direction sequences with a release marker and a hold marker, and the button is the last element; a special is a contiguous match in a short history (moves.cpp:11-12, 69-109). Re-express in our own notation. Shape only.
- Input window: each key change opens a 10-frame window; the queue holds 20 changes (playerAgent.h:19-20; playerAgent.cpp:41-65). Shape for the input buffer topic.
- Hit acceptance: the hit is a state transition on the defender, and the spark only spawns if the defender accepts it (actions.cpp:45-48; player.cpp:158-164). Fits row 3 hitstun eligibility.
- Combo gate: a combo needs the victim's hurt flag, which clears when the hurt animation ends (player.cpp:101, 151-152).
- Facing mirror: one collision box, flipped by facing when computing edges (collisionBox.cpp:29-36).
- Projectile as its own object, checked every tick, reports done on first overlap (player.cpp:158-161).
- Pushback on overlap: stepper recoils half a step, the other fighter moves twice the step (player.cpp:245-251). Only the non-inverted sign was checked.
- Frame delay of 0 holds a frame (animation.cpp:113).

Defects to fix, not copy:
1. Uninitialised Actions pointer read in doAction (player.cpp:203, 209-210). Fix: nullptr.
2. get(current_state) dereferenced without null check (player.cpp:132, 269). Fix: guard.
3. Opponent dereferenced without null check (player.cpp:101, 120). Fix: guard.
4. The 4-argument CollisionBox constructor builds a temporary instead of delegating (collisionBox.cpp:4). Fix: delegate in the initialiser list.
5. Trigger priority differs between passes: last match in passes 1-2, first match in pass 3 (moves.cpp:81, 109). Fix: one rule.
6. PlayerAgent::update swaps the caller's array in place (playerAgent.cpp:35). Fix: copy first.

## Briefs
- Ember bolt (own label): a ranged bolt that ends on first contact. Keep: separate object, first-overlap end, facing offset. Change: travel speed, lifetime, wind-up tell, new design (data/fireball/fireball.yml:3).
- Accepted-hit spark (own label): a two-frame spark only on accepted hits. Keep: short life, spawn on acceptance. Change: procedural spark, sound cue, hit-stop, different colour and shape (data/collision/collision.yml:3,19; actions.cpp:45-48).
- Step-shove on guard (own label): pressing into a guard shoves the defender. Keep: recoil by half, shove by twice the step, only while overlapping. Change: depends on guard and stamina (row 3), capped so no one is pushed off the stage (player.cpp:245-251).

Each brief is a distinct original to be built from our own art and numbers; no trait is copied from the donor's sprites.

## Cross-links
Camera: none in the box. HUD: no health bar (ROADMAP line 9). VFX: effect sprites exist, not opened. Animation: frame delay and state machine are the useful parts. Sound: none (ROADMAP line 11).

## Not read
Frame PNG content; most of ryu.yml; graphics, texture, sprite, camera, keyState, configuration and yaml sources; platform files; godot-cpp (empty directory).
