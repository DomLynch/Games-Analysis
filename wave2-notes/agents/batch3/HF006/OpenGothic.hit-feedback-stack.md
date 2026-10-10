# OpenGothic (hit-feedback-stack, HF006)

Donor: /mnt/frankendom-donors/OpenGothic. Code licence: MIT (LICENSE line 1 "MIT License", line 3 "Copyright (c) 2019 Try"). Asset licence: none in the box; the README says Gothic 2 data must come from the user's own install (AU039 cites README.md:25). Rights holder of the game content: not named in the repo files.

Half read: both halves that exist in this one codebase, meaning the simulation (common/world, common/game) and the presentation calls it makes (common/graphics, sound and particle lookups). The data pack (Daedalus scripts, sound and particle tables, stumble and fall clips) is not in the box. Donor pairing: none found for this topic.

Depth: thin. The hit path is read end to end in code; the feel itself is mostly data that is not in the box.

## 1. What the player sees and feels
A blow connects and a short impact sound plays with a particle puff placed halfway between attacker and victim. The victim jolts into a stumble clip that faces away from the blow, and whatever move it had queued is dropped on the spot, so a counter-attack is lost. A hit whose damage type is FLY (a data-side damage flag) throws the victim into a long fall clip that skids in the direction of the blow. A knockout clears the victim's weapons, shield and torch and leaves it at one HP, with a groan; a death uses a different voice line. On a 375-wide phone the readable beat is the stumble side plus the puff. Missing from the hit path: a hit-stop freeze, a camera shake on a melee hit, and a red flash on the victim.

## 2. Why it works, and is it striking?
- Readable beat at 375 wide: one puff, one sound, one stumble clip per hit. The stumble side is chosen from the attacker's bearing (Npc::takeDamage), so the player reads which way the blow came from.
- Signature behaviour: the victim's queued fight move is cancelled on hit (FightAlgo::onTakeHit clears the queue and the move tree; the AI wait is set to zero). That is the stagger that matters in a 1v1 duel.
- Signature sound: the impact sound key is built from scheme, weapon material, and armour material, then falls back to a metal, wood or stone particle key. One lookup covers many weapon and armour pairs.
- Could be ours at 20-30 percent resemblance: yes for the lookup with fallback, the cancel-on-hit, the HP-written-last order, and the bearing-based stumble side.
- Not found here: any hit-stop. Time scaling exists only as a script effect (see section 3).

## 3. The rule behind it
Order of operations inside one hit (Npc::takeDamage, common/world/objects/npc.cpp):
1. Victim already down (unconscious or dead): the hit is ignored (npc.cpp:2015 region, isDown check).
2. Block or jump-back check. A blocked hit plays a block effect and does not reach the core path (npc.cpp:2030-2035).
3. Core path: the side is set from the attacker bearing (npc.cpp:2056, cos test on angleDir, which returns degrees at npc.cpp:471-476). Perception event fires, then fghAlgo.onTakeHit() (npc.cpp:2077) and implFaiWait(0) (npc.cpp:2078).
4. Damage value is computed (DamageCalculator::damageValue, not read).
5. Impact sound and particle are played (npc.cpp:2083, owner.addWeaponHitEffect(...).play()). This runs before the HP write, so a killing blow still shows the impact; it is skipped only when the victim was already down or the hit is a spell.
6. If the victim is still up and the body state allows interrupt: the animation is interrupted and a stumble clip is set, A or B by side (npc.cpp:2100-2102), unless the damage type is FLY.
7. FLY damage: MoveAlgo::accessDamFly (movealgo.cpp:496-520). It needs state Run, Falling or InAir and not lying or dead. It sets the fall-deep clip, zeroes rotation, and sets fallSpeed to the normalised vector (dx, len*0.5, dz) times 0.75 (movealgo.cpp:512-516), then state InAir.
8. HP is written last (npc.cpp:2113, changeAttribute). The down and death handling runs inside that call (not read).
9. Victim voice: when the hit mask allows and the victim is neither unconscious nor dead, a random one in two plays the "AARGH" voice (npc.cpp:2124-2125). Defeat or murder perception fires instead when the victim goes down or dies.

Knockout path (GameScript side, Npc::onNoHealth, npc.cpp:595-620): weapon, shield and torch are dropped (npc.cpp:597-599), the victim's HP is set to 1 for a knockout (npc.cpp:611), and the unconscious or dead state is started. The voice is "AARGH" for a knockout and "DEAD" for a death.

Script-driven screen effects (common/game/globaleffects.cpp, four types): time.slw (a world time scale, applied in GameSession::tick through World::scaleTime, gamesession.cpp:306), screenblend.scx (colour overlay, optionally a texture animation), morph.fov (a sine-like projection squash), and earthquake.eqk (a shake). The script call path (GameScript::wld_playeffect, gamescript.cpp:1638-1644) returns early with a log line "effect not implemented" when the projectile, damage type, damage or effect level argument is non-zero. The hit path above never calls these effects.

Data fields (MIT, so donor values may be adapted; all values from code, not from the data pack):
| name | unit | donor value | where |
|---|---|---|---|
| hit_sound_range | world units | 2500 | world.cpp:778 |
| victim_voice_chance | probability | 0.5 | npc.cpp:2124 |
| knockout_hp_left | HP | 1 | npc.cpp:611 |
| fall_knock_speed | speed factor | 0.75 | movealgo.cpp:516 |
| fall_vertical_share | ratio | 0.5 | movealgo.cpp:513 |
| quake_update_interval | ms | 10 | globaleffects.cpp:81 |
| quake_amp_floor | ratio | 0.25 (cap 1.0) | globaleffects.cpp:93 |
| morph_period_a / _b | ms | 5000 / 9000 | globaleffects.cpp:66-67 |
| morph_amp_scale | ratio | 0.075 | globaleffects.cpp:60 |
| fx_fallback_suffixes | key | _METAL, _WOOD, _STONE | world.cpp:782-788 |

## 4. For Frankendom
- Shape: the impact decision (blocked, hit, knock, fly, knockout, damage value) belongs in the engine (src/fight) so the server verifies it. The client only presents the resulting event. HP is written last in the same tick; the queued-move cancel happens in the engine, not the camera.
- Keep: cancel-on-hit for the victim's queued move (row 4 fight loop); the impact sound and puff keyed by a table with fallbacks, so 100 Pit characters share one family-level default and only override where needed (row 12); the stumble side from the attacker's bearing; the fall vector from the blow (row 10).
- Change: no time scaling inside the engine. OpenGothic's time.slw changes world time; for us any hit-stop is a client-only pause of the victim's pose for presentation, and the server tick never pauses.
- Many-vs-one (max 3 attackers): one victim can take up to three hits in a tick. Cap concurrent impact puffs per victim at 3, and sum any shake with a clamp.
- Zones as data: the impact key table lives in zone-independent data, so 700 zones do not each carry sound lists.
- Also seen (not this topic's core): idle and ambient animation not read; death presentation is the knockout path above (weapons and torch drop, groan, then the body state); loot ceremony and walk density not read.

## 5. Five-minute look test
Target: src/fight/hit-impact.ts (new file; the engine emits the hit event, the client reads it). Row 10 (hit impact and hit stop).
Build: on the existing fight scene, a style flag (for example ?feel=impact) with three hit kinds: light, blocked, heavy. Each shows (a) a stumble toward the side picked from the attacker bearing, (b) the victim's queued second swing cancelled, (c) a 60 ms client-only pose pause on heavy only, (d) a 50 percent groan.
Phone check at 375 wide: is the stumble side readable at a glance; does the cancelled counter feel like a stagger and not lag; does the 60 ms pause read as weight. Compare with the flag off. No release rows, no lock; Deploy publishes it to /preview/.

## 6. Licence and IP
Code is MIT: adaptation is allowed if the copyright and licence notice are kept (LICENSE). Gothic 2 content is not in the box and its rights holder is not named in the repo, so keep the inspiration to the category level. Sound and particle keys (CS_, CPFX_ names) are data keys from the game pack: we keep the scheme idea and name our own keys. Do not copy any clip, sound or particle name.

## 7. Gaps
- Not in the box: all Daedalus scripts, sound and particle tables, stumble and fall clips, world and visual tables. Not read (data pack absent).
- Read in part only: FightAlgo::onTakeHit (fightalgo.cpp:228-233), changeAttribute and the down handling inside it (not read), DamageCalculator::damageValue (not read), MdlVisual::interrupt (mdlvisual.cpp:783-787, clears the held item and resets the state item; skeleton internals not read), GlobalEffects::addSlowTime and the screen blend draw path (read, not tested).
- Earthquake trigger volumes: TODO only (common/world/triggers/earthquake.cpp:12). Not implemented.
- Not found on the hit path (grep over common, game and shader for shake, hitstop, flash, knockback, blood, impact): no hit-stop, no hit flash, no melee camera shake.
- Tempest submodule is empty in the box, so the Vec3 default constructor (used as "Vec3 sh;" at common/camera.cpp:745) is not verified.
- Half read: engine code (both halves in one codebase), data pack absent.

## Defects (keep the idea, fix the defect)
- morph.fov: speed and baseX/baseY are parsed (globaleffects.cpp:225-226) and never read; the period is hard-coded to 5000 and 9000 ms (globaleffects.cpp:66-67). Decision: adapt. Fix: period = base / speed; use baseX and baseY as the centre.
- screenblend.scx: frame index is taken modulo fps, not modulo frame count (globaleffects.cpp:116-117). With fps greater than the number of frames the index runs past the vector. Decision: adapt. Fix: frame %= frames.size().
- earthquake.eqk: origin = i.last (globaleffects.cpp:96) overwrites rather than adds, so with two quakes only the last counts. Decision: adapt. Fix: origin += i.last, then clamp the sum.
- earthquake.eqk: std::rand() drives the shake offset (globaleffects.cpp:86-88). It is presentation only, so it does not break the sim, but it is not replayable. Fix: use a presentation RNG and keep it off the sim path.
- addEarthQuake (globaleffects.cpp:239) and addMorphFov (globaleffects.cpp:221) call std::stof with no try and throw on bad script input. addScreenBlend and addSlowTime are guarded. Fix: wrap in try/catch as addSlowTime does.

## Reuse tag
Adapt (idea): the impact order, the cancel-on-hit, the lookup with fallback, and the stumble side. Clean-room for the code.

## Brief rule served
Hit feedback as one ordered system: decision, then sound and puff, then reaction, then HP last, with every number as a data field.
