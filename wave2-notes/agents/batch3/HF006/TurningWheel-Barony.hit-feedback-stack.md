# TurningWheel-Barony (hit-feedback-stack, HF006)

Donor: /mnt/frankendom-donors/TurningWheel-Barony. Code licence: BSD 2-Clause (LICENSE.txt line 3 "licensed under the BSD 2-Clause License:", line 5 copyright "Turning Wheel LLC"). Game art, sound and music are not in the repo; README.md line 13 says a purchased copy of the game is needed (AU053). Third-party licence texts in the root not read.

Half read: both, meaning the single codebase (entity logic in src/entity.cpp, src/actarrow.cpp, src/actmonster.cpp, src/actplayer.cpp, and the camera and HUD code in src/game.cpp and src/interface/). The data pack (sound IDs as files, sprites, and the damage-number curve JSON) is not in the repo. Donor pairing: AU053 names OpenGothic as a paired donor; I read no shared code between them, so I treat Barony as unpaired.

Depth: full for the melee, arrow and shake paths. Thin for the damage-number curve values, which are data.

## 1. What the player sees and feels
A melee blow lands on a monster or a player. The victim's HP drops at once, a short damage sound plays, and a number pops over the victim and drifts up and down (a sprite pop when the number is a special effect). Heavier or charged blows pop larger; a weak blow pops smaller. A blocked or guarded blow pops a guard or miss marker with no number. If the victim is the local player, the camera jolts: bigger for a hit, smaller for a block. Knockback is not on every hit: a hit on a webbed, greased, golem-smashed or rebounding target knocks the target back, and some arrows knock back. A knocked monster ramps up to its own run speed in the knock direction; a knocked player slides and the slide decays. Blood is a floor decal and a few gib sprites on a bleed roll.

## 2. Why it works, and is it striking?
- Readable beat at 375 wide: one pop whose size encodes the tier, one sound, one shake whose size encodes block versus hit. Three readable levels from one rule.
- Signature behaviour: the knock lock. A victim cannot be re-knocked for 30 ticks (0.6 s), so a crowd cannot chain knocks. This is the anti-stack rule that matters for many-vs-one.
- Signature sound: sound 28 for most hits (the game names it "Damage.ogg" in a comment), 776 for a frying-pan block, 407 to 409 for a whip (entity.cpp:16032-16043).
- Could be ours at 20-30 percent resemblance: yes for the knock lock, the tier rule from weapon multiplier and charge, the additive per-hit shake with a clamp, and the decay steps.

## 3. The rule behind it
Order inside one melee hit, Entity::attack (entity.cpp, function starts at line 10097). Source order is read as execution order; not traced at runtime.
1. Damage applied at once: oldHP is saved, then modHP(-damage) (entity.cpp:13136-13137).
2. Special weapon effects: artefact swords, the axe slow, the shillelagh bonus (entity.cpp:13818-13897).
3. Knockback, only if the target is not already in the knockback state and one of: webbed, greased, golem smash, rebounding, or a gnome with a pick. setEffect(EFF_KNOCKBACK, true, 30) is the lock (entity.cpp:13903). Base multiplier 0.7 (13905), plus 0.3 if the target cannot move (13943). A monster gets its velocity set directly and a knockback velocity of 0.05 (13950), and its hit timer raised to at least HITRATE-12 when it is not already swinging (13956-13958).
4. Shake for a local player (entity.cpp:15336-15421): damage above zero gives +0.1 (scaled) on x and +10 px on y (15414-15415); a zero-damage block gives +0.05 and +5 (15419-15420); a golem smash gives +0.2 and +20 on the primary target (15402-15403) and +0.1 and +10 on a secondary target (15408-15409). A small moth scales the shake by 0.4 (15339).
5. Damage tier (entity.cpp:15579-15596): if the weapon multiplier is at least 1.15 or the swing is charged, the tier is STRONGER (STRONGEST when charged as well); if the multiplier is at most 0.85, WEAKER.
6. Enemy HP bar update, then addEnemyToList (interface.cpp:13739-13784). The damage taken is set to oldHP minus new HP, clamped to minus max HP (interface.cpp:13781). spawnDamageGib is called with that value (interface.cpp:13784), so each hit spawns its own pop; pops are not summed.
7. Pop physics (actgib.cpp:1379-1470): a random horizontal kick of up to 0.45 units per tick (rand % 10 divided by 20); vertical start -0.5, or -0.4 for the stronger tiers (actgib.cpp:1399, 1403). The stronger tiers use a per-frame size curve (actgib.cpp:881-889) loaded from the data pack's "dmg_number_anim_curve" (GameUI.cpp:26673-26686). The curve values are not in the box.
8. Impact sound: 28 by default; 776 for a frying-pan block; 407 to 409 for a whip (entity.cpp:16032-16043).
9. Bleed roll may add blood gibs and a floor decal (entity.cpp:16049-16100; spawnBlood at monster_shared.cpp:443-466 places a decal on a free tile with random height and yaw).

Shake decay, per game tick (game.cpp:1030-1090). x: a smoothed value (shakex2 = (shakex2 + shakex) * 0.8, game.cpp:1048), shakex steps down by 0.01 per tick and snaps to zero under a threshold (game.cpp:1052-1059). y: shakey2 = (shakey2 + shakey) * 0.9 (game.cpp:1049), shakey steps by 1 px per tick (game.cpp:1076, 1080). The cap is the /shake_max cvar, default 15, so x is capped at 0.15 and y at 15 px (game.cpp:1044-1046).

Arrow hit (actarrow.cpp): damage above zero spawns a gib, plays sound 28 and adds the local player shake of 0.1 and 10 (actarrow.cpp:1109-1116); a blocked arrow adds 0.05 and 5 (actarrow.cpp:1186-1187). The arrow knockback path needs the knockback quiver type and a proc, then the same lock of 30 ticks (actarrow.cpp:1472) and a knock velocity of 0.01 for monsters (actarrow.cpp:1491).

Knock physics: a monster's knockback velocity grows by 1.1 per call (actmonster.cpp:14395) and adds to velocity up to its own run speed (actmonster.cpp:14365-14388). A player's knock velocity decays by 0.95 per refresh, 0.8 if drag is high, and halves with cleats (actplayer.cpp:4721-4743).

Data fields (BSD, so donor values may be adopted; unit in brackets):
| name | unit | donor value | where |
|---|---|---|---|
| tick_rate | ticks/s | 50 | input.cpp:5 |
| knock_lock | ticks | 30 | entity.cpp:13903 |
| knock_base_mult | ratio | 0.7 | entity.cpp:13905 |
| knock_immobile_add | ratio | 0.3 | entity.cpp:13943 |
| knock_start_melee_monster | velocity | 0.05 | entity.cpp:13950 |
| knock_start_arrow_monster | velocity | 0.01 | actarrow.cpp:1491 |
| knock_growth_monster | ratio per call | 1.1 | actmonster.cpp:14395 |
| knock_decay_player | ratio per refresh | 0.95 (0.8 high drag; x0.5 cleats) | actplayer.cpp:4721-4743 |
| hit_timer_floor | ticks | HITRATE-12 = 33 | entity.cpp:13958 |
| HITRATE | ticks | 45 | monster.hpp:731 |
| shake_hit | x units, y px | 0.1, 10 | entity.cpp:15414-15415 |
| shake_block | x units, y px | 0.05, 5 | entity.cpp:15419-15420 |
| shake_golem_primary | x units, y px | 0.2, 20 | entity.cpp:15402-15403 |
| shake_scale_small_moth | ratio | 0.4 | entity.cpp:15339 |
| shake_max | cvar | 15 (x cap 0.15) | game.cpp:1044-1046 |
| shake_smooth | ratio | 0.8 (x), 0.9 (y) | game.cpp:1048-1049 |
| shake_decay_step | per tick | 0.01 (x), 1 px (y) | game.cpp:1059, 1076 |
| tier_stronger_mult | ratio | 1.15 | entity.cpp:15581 |
| tier_weaker_mult | ratio | 0.85 | entity.cpp:15593 |
| pop_vel_z | units/tick | -0.5 (-0.4 stronger tiers) | actgib.cpp:1399, 1403 |
| hit_sound_id | id | 28 (776 block; 407-409 whip) | entity.cpp:16032-16043 |
| dmg_number_curve | per-frame percent | not in box | GameUI.cpp:26676 |

## 4. For Frankendom
- Shape: the knock decision, its 30-tick lock, the damage tier and the HP write are engine state in src/fight, so the server verifies them. The shake, the pop, the sound and the decal are client presentation only.
- Keep: the 30-tick knock lock per victim (row 10; it stops knock chains with up to 3 attackers); knock only on special states (webbed, greased, golem smash, rebound), not on every hit; the tier rule from weapon multiplier and charge (row 10 and row 14 HUD); the additive, clamped shake per hit (row 11 fight camera); blocked means smaller shake and no knock.
- Change: our own numbers as data; no knock on every hit; pops capped at 3 per victim so three attackers do not bury the screen at 375 wide; the sound ID becomes our keyed table (row 12).
- Zones as data: the tier thresholds and the shake and knock numbers are per-weapon data, so 700 zones share one table. The 100 Pit characters reuse one knock rule and override only the mass or immobility flag.
- Also seen: death presentation in this path is the knock and gib spawn; the death-cause enum (MainMenu.cpp:9325 region, KilledBy::DEATH_KNOCKBACK) is a kill-message type, not read further. Idle and ambient behaviour, loot ceremony and walk density are not part of this topic and were not read.

## 5. Five-minute look test
Target: src/fight/hit-impact.ts (new file; the engine decides and the client presents). Row 10 (hit impact and hit stop).
Build: on the existing fight scene, a style flag (for example ?feel=ladder) with three hits: a block, a normal hit, and a charged hit. Each shows the pop size for its tier, the camera shake at 0.05, 0.1 and 0.2 scaled to the phone, and a knock only for a webbed target.
Phone check at 375 wide: can the three tiers be told apart by size alone; does the charged hit feel heavier than a normal one; does the 30-tick lock stop a second knock from landing in a three-attacker crowd. Compare with the flag off. No release rows, no lock; Deploy publishes it to /preview/.

## 6. Licence and IP
Code is BSD 2-Clause: adaptation is allowed if the notice is kept (LICENSE.txt). Game art, sound and the number curve are not in the repo, and the rights holder of the game assets is not named in the repo files (AU053), so keep the inspiration to the category level. Sound IDs are indices into a pack we do not have; we keep the idea (keyed sounds, one ID per tier) and name our own keys. Do not copy any sprite, sound or wording.

## 7. Gaps
- Not in the repo: game art, sprites, sounds, music, the damage-number curve JSON, and the sprite sheets for pops and gibs. Not read.
- Read in part: entity.cpp hit block (ranges quoted above; the rest not read), actgib.cpp gib and pop behaviour (the spawn and the damage-pop step; the gib spray not read), actmonster.cpp attack state machine (only the hit-timer assignments and the knock velocity function read), the arrow path in actarrow.cpp (lines near 1100-1190 and 1466-1550), and the cvar and camera code in game.cpp (1030-1090).
- Not found: any hit-stop or freeze on hit. The flag gameloopFreezeEntities is read in game.cpp (lines 1384, 1725, 3242, 3405) and is never set to true anywhere in src (grep), so it is not a hit freeze.
- Not found: a red flash on the victim. The "flash" hits are HUD bar end-caps and the cursor blink (ui/GameUI.cpp, menu.cpp).
- Stale timing comments: actmonster.cpp:7291 says "120 ms reaction time" and :7311 says "melee 240ms", but the constants at 50 ticks per second give 660 ms (HITRATE-12) and 780 ms (HITRATE-6). Comments and constants disagree.
- Half read: one codebase (both halves in code), data pack absent.

## Defects (keep the idea, fix the defect)
- Y shake has no snap to zero: x snaps (game.cpp:1052-1056), y does not (game.cpp:1074-1081). Reading suggests the y term keeps stepping across zero for a few ticks after a shake ends. Not run. Decision: adapt. Fix: snap y to zero when |shakey| is under 1 and |shakey2| is under 0.5.
- Monster knock velocity grows by 1.1 per call with no ceiling (actmonster.cpp:14395), and only the player path zeroes it (actplayer.cpp:4749). It is bounded in practice by the 30-tick lock on the path at actmonster.cpp:10215, but the other two call sites (actmonster.cpp:5272, 6380) are not bounded by that lock (not read in full). Decision: adapt. Fix: cap at 1.0 and zero it when the lock ends.
- Timing comments disagree with the constants (see gaps). Decision: adapt. Fix: derive the milliseconds from the tick rate, and correct the comments.

## Reuse tag
Adapt (idea): the 30-tick knock lock, the tier rule from weapon multiplier and charge, the additive clamped shake, and the knock only on special states. Clean-room for the code and the numbers as our own data.

## Brief rule served
Hit feedback as one ordered system: damage, knock (locked), tier, pop, shake and sound, with every number as a data field and the knock decision in the engine.
