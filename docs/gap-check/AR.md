# Gap check AR (animation rigs: shared rig, clip sets, retargeting, cloth bones)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: 57 (AR001 to AR020). Also read: Games-Analysis docs/boss-briefs/CHARACTER-RECIPE.md.

## Summary for Dom
1. Frankendom already plays animation well on the shared rig. One mixer per body holds every clip as a weighted role (src/characters.ts:433-436); the sim picks the pose, the renderer eases the weights (716-722); walk/jog/run blend by speed (gaitWeights, 93-101) and clip speed follows ground speed over a per-rig stride (708-710). Attack timing (windup/active/recovery ticks and the clip contact time) is engine data (src/moves.ts:13, 23-31); the clip is warped so contact lands on that tick (src/blade.ts:6). So most donor ideas about "who decides the hit" are already how we work.
2. Counts by donor note: REUSE 35, ADD 16, SKIP 6. The 16 ADDs collapse to six builds (G1 to G6 below). Nearly all are client polish; none touch the sim or kills.
3. Cloth bones and retargeting are NOT covered by any donor note and are the real weak spot: CHARACTER-RECIPE.md step 5 calls cloth bones "NEW" and names the tabard hem as the known tear. The code shows no cloth chains (the only "skirt/robe" work is rigid-skinned geometry in scripts/build-warrior.mjs:490-510, 770-777). The recipe's `tools/` scripts (fit, pose stress test) are not in this checkout; treat them as unverified here.
4. Top 3 additions: (a) G4 layered clip masks (upper body / lower body / cloth chains), the nearest donor shape to what cloth bones need; (b) G1 clip hand-off blend from a frozen pose (no pop on interrupts); (c) G3 per-creature idle variety (random phase and jitter) so zone mobs stop moving in lockstep (origins/preview/mobs-view.ts:87 starts every body's Idle at time 0).
5. Licence note: most donors are copyleft (GPL, AGPL, Valve SDK terms, a restricted-use licence); clean-room shape only, no donor numbers in this file. MIT/BSD/Apache/zlib donors (2004Scape, OpenBOR, CPR, SCAR, ZenKit, OpenTESArena, Barony, daggerfall-unity, fonline, GOAP, l2 client, claudecraft, otclient, pinball, Funkin) may be named; Teeworlds datasrc clip values are CC-BY-SA, not copied.

## What we have today (shared by all rows)
- Clip roles: `Role` type and role tables, src/characters.ts:44, per-weapon clip maps 49-71, quadruped map 76-85 (seven clips, any strike = Bite). ONE_SHOT roles clamp when finished, 91 and 448.
- Mixer and weights: characters.ts:433-436 (all roles played at weight 0, Idle 1), combat role vs locomotion fade 714-722 (snaps on parry/deflect to stay in sync with hit-stop).
- Locomotion: gaitWeights 93-101, strafe clips and backward play (timeScale -1) 705-710, stride from rig userData 415-417.
- Bone-level layers done in code, not masks: guard tilt/arm/spine eased and undone before each update (735-736), aimBone/aimed rotation (466, 1035-1055), shield carry (461-500), stances (src/stance-pose.ts:16), lean (520).
- Attachments: weapon nodes `WeaponDrawn`/`SwordSheathed`/`SwordDrawn` on the rig (characters.ts:441); loot pieces re-skinned to the body skeleton, `gripBone` fit (572-595); gore marks ride the struck bone (src/gore.ts:173).
- Engine timing: src/moves.ts:13 Timing {windup, active, recovery}, PATHS table with clip + `source` contact; mob move choice layer src/mobkit.ts (trigger, cooldown, chain window checked against engine window, `rollUnit` not dice).
- Hit-stop and camera knock: src/hit-impact.ts:15-21. Foot dust at foot plants: src/foot-dust.ts. Dropped weapon on death: src/dropped-weapon.ts:1-6. Finisher scenes as additive clips: characters.ts:30-44, src/finishers.ts.
- Origins mobs: origins/preview/mobs-view.ts:85-87 Idle/Walk actions, damped blend 131-133, bodies far from hero update a quarter as often with carried time 134-135. Wire carries a one-byte `anim` per pose (origins/presence/wire.ts:3, 9).
- Rig families: docs/specs/origins/body-families.md:6-16 (hero-family rig for humanoids and giants, new quadruped rig, wraith/skeleton rigs); scripts/character/quadruped_rig.py exists.
- Not present: foot IK, clip-event cue pass, mask-based layering, cloth/secondary bones, per-instance idle phase, a hand-off blend from a frozen pose.

## Gap table
| Donor note | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| AR001 2004Scape | One clip slot, strict-priority, cleared each tick | One combatRole from sim pose, characters.ts:714; sim holds stagger/recovery | None; donor itself says it cannot hold across ticks | REUSE | characters.ts:714 |
| AR001 CombatPathingRevolution | Clip event switches a named engine window | Windows are engine data, moves.ts:23-31 | Clip-named cues for cosmetics only | ADD (G2) | new file near characters.ts |
| AR001 OpenBOR | Per-entity speed factor scales frame delays | stride timeScale characters.ts:708-710; hit-stop hit-impact.ts:15 | None | REUSE | as left |
| AR002 EQEmu | Server cue per actor, weapon picks clip | Sim pose drives clip; wire `anim` byte wire.ts:3 | None (cue never decides hit) | REUSE | wire.ts:9 |
| AR002 Xash3d | Freeze old pose, blend out; strip root motion | Weight lerp only (716-722), no frozen-pose hand-off | Interrupt pops are masked by weight snaps only | ADD (G1) | characters.ts:714-722 |
| AR002 Funkin | Hold pose while input held, then release | Held charge parks at chamber, characters.ts:372 | Rhythm-specific | SKIP | n/a |
| AR003 LostCity | Same one-slot priority arbiter | As AR001 | None | REUSE | characters.ts:714 |
| AR003 ModernUO | Re-send cast pose pulses until disturbed | Charged pose held by sim state, 372 | Pulse re-send only for one-shot clips; ours loop/clamp | SKIP | n/a |
| AR003 OpenGothic | Combo windows as clip data, rewind on chain | PATHS timings + chain window moves.ts:23, mobkit.ts:19-27 | None | REUSE | moves.ts |
| AR004 OpenRA | One body clip slot all events write | Role table + one mixer, characters.ts:44, 433 | None | REUSE | characters.ts |
| AR004 OpenRCT2 | Action owns clip length and contact frame | PATHS `source` contact + windup ticks, moves.ts:17-23 | None | REUSE | moves.ts |
| AR004 OpenTTD | Tick-phased ambient loops, lazy active list | Banner sway on time, arena.ts:557 | Already cosmetic | SKIP | n/a |
| AR005 OpenXcom | One step clock for gait, footstep, tween | Gait clip rate from speed/stride 708-710; dust at foot plants foot-dust.ts:6 | Separate detectors, same visible result | REUSE | foot-dust.ts |
| AR005 Return-To-The-Roots | Clip clock with finish-now call | Weight snap on parry, 721; hit-stop dt 0 | None | REUSE | characters.ts:721 |
| AR005 SCAR | Attack option: window, weight, chance, cooldown | mobkit.ts KitRow trigger/cooldown/chance via rollUnit, 8-27 | None | REUSE | mobkit.ts |
| AR006 Barony | Step joints to windup targets per tick | Authored skeletal clips | Per-limb sprite model | SKIP | n/a |
| AR006 Half-Life | Cycle by distance; strafe by facing angle | Strafe clips + reverse play 705-710 | None | REUSE | characters.ts:706 |
| AR006 Source SDK | Fire clip events when playback crosses them | No cue pass; cues timed from sim | Dust/sound cues not tied to clip phase | ADD (G2) | new file near characters.ts |
| AR007 ZenKit (MIT) | Compact 3-field quaternion keys | Meshopt GLB path, scripts/check-glb-compression.mjs | Rejected in note | SKIP | n/a |
| AR007 OpenTESArena (MIT) | Hit at clip fraction, reach checked then | Engine contact tick + reach, moves.ts:17-23 | None | REUSE | moves.ts |
| AR007 Fallout2-CE | Cut chains still land forced effects | Sim ledger decides, clips cosmetic (finishers.ts:4-7) | None | REUSE | finishers.ts |
| AR008 L2Dn (MIT) | Per-creature idle roll, state-gated, min gap | One Idle at time 0 (mobs-view.ts:87), fixed phase .4 at characters.ts:449 | No idle variety clips or timing | ADD (G3) | origins/preview/mobs-view.ts |
| AR008 AzerothCore | Attach parts by offset from parent pose | Weapon nodes on bones; gripBone fit characters.ts:441, 595 | None | REUSE | characters.ts:595 |
| AR008 Beyond-All-Reason | Per-layer threads with cancel masks | Bone-offset layers in code (735-736), no masks | Layers are hand-coded per effect | ADD (G4) | characters.ts (layer table) |
| AR009 GOAP (Apache) | Write animator on change; freeze on pause | dt 0 during hit-stop, characters.ts:721 | None | REUSE | as left |
| AR009 fonline (MIT) | Two-slot crossfade, per-bone snap set | Weight lerp 716-722 | Per-bone snap rule (goes with G4) | REUSE | characters.ts:722 |
| AR009 daggerfall-unity (MIT) | Damage marker inside attack frame list | `source` contact in PATHS | None | REUSE | moves.ts |
| AR010 dhewm3 | Foot-to-floor ease, analytic leg IK | None; Pit floor flat | Needed only on uneven Origins zones | ADD (G5, defer) | new file near characters.ts |
| AR010 KeeperFX | Priority clip list; cycle rate from distance | gaitWeights + stride 93-101, 708 | None | REUSE | characters.ts |
| AR010 C&C Remastered | Effect follows object by stored offset | Gore marks ride bone, gore.ts:173 | None | REUSE | gore.ts |
| AR011 Endless Sky | Rate-capped, arc-clamped look-at | aimBone/aimed rotation eased, characters.ts:466, 1035 | Arc clamp / rate cap not verified | REUSE | characters.ts:466 |
| AR011 Exult | Clip rules and windup table as data | Role maps + PATHS | None | REUSE | moves.ts |
| AR011 Flare | Attack on named active frame; hold windup | PATHS contact + warp, blade.ts:6 | None | REUSE | blade.ts |
| AR012 pinball (MIT) | Restart clip on phase entry; reverse-play | Guard raise eased 780; backward gait 705 | None | REUSE | characters.ts:780 |
| AR012 freeciv | Hit as queued HP drain on copies | Unverified (see below) | Possibly missing | ADD (G6) | src/hud.ts (unverified) |
| AR012 L2 client (Apache) | Cycle = fixed over attack speed; hit fraction | Engine timings per move, moves.ts:23-31 | None | REUSE | moves.ts |
| AR013 GemRB | One master clock; one-shots return to stance | ONE_SHOT table 91; clamp 448 | None | REUSE | characters.ts:91 |
| AR013 Hedgewars | Beat sequencer: step, wait, lock, skip | Finisher scenes with beats (finishers.ts, characters.ts:955) | None | REUSE | finishers.ts |
| AR014 Quake 2 | Attack as frame-indexed event in clip table | PATHS windup/active/recovery per move | None | REUSE | moves.ts |
| AR014 Quake | Shared clock plus per-creature random phase | Fixed phase .4 for opponents, characters.ts:449 | Same phase for same-kind mobs | ADD (G3) | mobs-view.ts:87 |
| AR014 fheroes2 | Weighted idle phrase queue per creature | None | No idle variety | ADD (G3) | mobs-view.ts |
| AR015 ioq3 | Per-actor clip clock, one backlerp weight | Mixer weights, 433-436 | None | REUSE | characters.ts |
| AR015 pokemonAutoChess | Hit at share of attack length; flight time | Engine ticks; no ranged creature | Projectile flight not needed | SKIP | n/a |
| AR015 claudecraft (MIT) | Walk/run hysteresis and latch on speed | Smoothed speed ease + continuous blend, 702-704 | None | REUSE | characters.ts:702 |
| AR016 lila (AGPL) | Dropped props settle on a fixed step | Dropped weapon prop, dropped-weapon.ts:1 | Armour scatter not built (optional) | REUSE | dropped-weapon.ts |
| AR016 lichess mobile | Restarting fade-rise popup, counter roll | Unverified | Possibly missing | ADD (G6) | src/hud.ts (unverified) |
| AR016 lincity | Aftermath pose by progress; jittered loops | Death clamps final pose; no jitter | Jitter only | ADD (G3) | mobs-view.ts |
| AR017 OpenMW | Per-body-group clip winner by priority | No groups; arm/leg handled by code offsets | Blocks lift only the arm | ADD (G4) | characters.ts |
| AR017 otclient (MIT) | Per-instance clock with jitter and carry | Shared clock, per mob only skip carry 134-135 | Phase jitter | ADD (G3) | mobs-view.ts |
| AR017 Orbiter | One 0..1 state drives windowed parts | Guard raise eased `raise`, 780 | None | REUSE | characters.ts:780 |
| AR018 ryzom | Weighted slots, ramps, masks per bone | Weights only, no masks | Mask tables per move | ADD (G4) | characters.ts |
| AR018 ScummVM | Fade-in clip; rate from move speed | Weights + timeScale 708-710 | None | REUSE | characters.ts |
| AR018 SuperTuxKart | Frozen-pose hand-off; one-value scrub | Lean/stance weights 520; no frozen hand-off | Hand-off only | ADD (G1) | characters.ts:714 |
| AR019 Teeworlds (zlib) | Base clip + additive locomotion channels | Clips fully weighted, no additive base | Layering (go with G4) | ADD (G4) | characters.ts |
| AR019 Veloren | Gait phase from distance; non-mesh control bones | Clip rate from speed/stride 708; no control bones | Control-bone idea feeds cloth bones | REUSE | characters.ts:708 |
| AR019 Wesnoth | Clip time zero is the impact | Contact warp `swingProgress`, blade.ts:6 | None | REUSE | blade.ts:6 |
| AR020 xoreos | One channel; distance update skip with carry | mobs-view.ts:134-135 does exactly this | None | REUSE | mobs-view.ts |

## Merged additions (one build each)
- G1 Clip hand-off blend. Notes: Xash3d, SuperTuxKart. Freeze the outgoing pose at the switch, blend to the live pose over a short catalogue-set time; weight snaps on parry/deflect stay. Client only; hit-stop (dt 0) must freeze the blend too.
- G2 Clip cue pass. Notes: CombatPathingRevolution, Source SDK. Fire dust/sound/spark cues when playback crosses a clip marker, fix the loop-wrap miss; cues are cosmetic, hits stay on the engine tick.
- G3 Idle variety. Notes: L2Dn, Quake, fheroes2, otclient, lincity. Random start phase per mob, small per-cycle jitter, weighted idle phrases, played only when alive and not fighting; seeded off the client, never the engine.
- G4 Layered clip masks (also the home for cloth bones). Notes: Beyond-All-Reason, OpenMW, ryzom, Teeworlds. Bone-index mask tables in catalogue, weighted slots with ramps, one time unit. Cloth chains (tabard, skirt, cloak, straps) become a mask layer with their own small bone chains; Veloren's non-mesh control bones are the shape to copy. Gate: CHARACTER-RECIPE pose stress test passes before a boss ships.
- G5 Foot placement (defer). Note: dhewm3. Only if Origins zones get uneven ground; client only, off in the Pit.
- G6 Hit numbers / health drain. Notes: freeciv, lichess mobile. Draw from the server-confirmed hit event only, previous value passed in, never derived on the client. Check first whether hud.ts already does this.

## Could not verify
- The recipe tools (`tools/fit_tmax_to_knight_rig.py`, pose_stress_test.html, render_server.py) and docs/boss-briefs are not in this checkout, so the 65-bone count, the 37 animations and the fit step are taken from CHARACTER-RECIPE.md only.
- Whether hit numbers or a health-drain animation already exist (G6): a grep matched hud.ts, main.ts and scene.ts for popup-type words but I did not open them.
- Whether aimBone has an arc clamp or rate cap (AR011 Endless Sky); I saw it eased, not clamped.
- Whether the sim attack speed comes from a stat (AR012 L2 client); I saw fixed per-move ticks only.
- Rows AR019 Teeworlds/Veloren/Wesnoth lack a "Best transferable idea" line in the notes; the idea column is from their Mechanism sections.
- Donor-note "Today" lines say the Frankendom repo was not read, so none of their proposed target paths exist; targets above are the nearest real files.
