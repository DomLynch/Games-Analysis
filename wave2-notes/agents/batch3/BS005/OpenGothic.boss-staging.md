# OpenGothic (boss-staging, cell 1)

Donor: OpenGothic (VPS /mnt/frankendom-donors/OpenGothic). Licence: MIT (LICENSE line 1 "MIT License", line 3 "Copyright (c) 2019 Try"). Code may be adapted with the copyright notice kept. Game data is NOT in the donor: the Gothic scripts, music definitions and world files are loaded from the player's own game install.

Checked: read common/world/worldsound.cpp 215-340 (tickSoundZone, setMusic, the 5 s gate and fallback loop); common/world/worldobjects.cpp 442-460 (isTargeted, isTargetedBy); common/gamemusic.cpp 55-100 and 270-330 (transition embellishment); common/gamemusic.h (tag bits); common/world/triggers/cscamera.cpp 1-160 (spline, playback, auto-untrigger); common/world/objects/npc.cpp 470-520 (resetPositionToTA dragon branch); common/world/world.cpp 390-402 and 510-520; common/game/constants.h 60. Confidence: high on the music tier and transitions (read end to end); medium on dragons (only the guild constant and the corpse/reset path were read). Not read: common/game/fightalgo.cpp (364 lines) and fightaidefinitions.cpp (105 lines), the combo fight AI; common/camera.cpp main follow camera (1037 lines); gamescript.cpp (Daedalus calls).

Half read: client engine only. OpenGothic is a single-player client, so there is no server half in this donor. The data half (Daedalus .DAT, music theme definitions, .ZEN worlds) is not in the donor.

## 1. What the player sees and feels (375 wide)
The music changes on its own, with no HUD cue. While you walk a zone, the calm track plays. When a monster that is actually swinging at you has a weapon drawn, the track moves to a fight tier. If you put your weapon away while it is hunting you, the tier is a lower "threat" tier. If you die, the music also goes to a combat tier. Going back to calm plays a closing break and going from threat up to fight plays a fill, so the change is a short punctuation, not a cut. The music follows the attack, not the aggro: a monster that merely notices you does not start the fight track until it swings. By the code, the change can lag up to 5 s behind the first swing, because the check runs on a 5 s poll.

A boss-intro camera exists too: a cutscene camera follows a timed spline of keyframes and can keep the player movable or not, then hands control back after a delay.

## 2. Why it works / is striking
- Readable beat at 375 wide: the tier is a single flag and the player hears it before reading any HUD. Audio carries the threat when the screen is full (not measured on a device).
- One signature behaviour: the fight tier is "something is attacking me now and has a weapon drawn". That test is cheap and exact (isTargetedBy: target is the player, AI normal, weapon drawn, in an attack state).
- One signature sound: the break and fill stingers chosen by the from/to pair of tiers, not by the track.
- Could be made ours at 20-30 percent: yes. Use calm / threat / fight tiers, driven by server "attack started" and "attack ended" events, and play a break or fill on each change.

## 3. The rule behind it
Order of operations (tickSoundZone, worldsound.cpp 215-340):
1. Gate: no re-check until 5 s have passed (worldsound.cpp:227 `nextSoundUpdate = owner.tickCount()+5*1000`).
2. isFgt = some NPC is currently attacking the player (isTargeted) OR the player is dead (worldsound.cpp:242).
3. Tier: only when isFgt. Unarmed player gives Thr, armed gives Fgt. Otherwise Std (worldsound.cpp:246-249).
4. Combine with day or night (4:00 to 21:00 is day, worldsound.cpp:241).
5. If zone and tags are unchanged, return (no change).
6. Pick the theme by name: zone_DAY|NGT_STD|FGT|THR. Fallback order: the zone, then the default zone; day or night, then day; the mode, then Fgt for Thr, then Std. At most 12 lookups per change (2 zones x 2 dayparts x 3 modes; count from the loop).

isTargeted (worldobjects.cpp:442-457) returns true only when an NPC has the player as target, is in AI-normal policy, has a weapon drawn, and is in an attack state.

Transitions (gamemusic.cpp 74-80, same rule again at 310): going to Std from any other tier plays BREAK; going from Thr to Fgt plays FILL; going from Fgt to Thr plays nothing.

Cutscene camera (cscamera.cpp 88-114, 154): keyframes carry a time. Position is a Hermite segment between keys. Between a slow key and a non-slow key the segment is eased with exponent 1.005 (almost linear). Object-attached cameras are skipped (cscamera.cpp:109). The auto-untrigger delay is the last-key delay in seconds (cscamera.cpp:114).

Designer-tunable data fields (donor value only because donor is MIT):

| name | unit | donor_value |
|---|---|---|
| tier_poll_interval | ms | 5000 |
| tier_source | enum | attack-state (not aggro) |
| cutscene_ease_exponent | exponent | 1.005 |
| cutscene_end_delay | s | per file (null) |
| tier_transition_break / fill / none | enum | BREAK / FILL / NONE |

Our starting values, not donor: tier change pushed on attack start and end (poll 0 ms), a 0.5 s debounce before dropping from fight to calm, and dead-player tier kept.

## 4. For Frankendom
- Keep: tier from attack state; break and fill stingers keyed by the pair of tiers; a zone's theme set with a fixed fallback chain (zone, then default); the cutscene spline for an intro with a movable flag.
- Change (defect): the 5 s poll. Fix: drive the tier from the engage and attack-start events the server already verifies (Lead ruling: engage is a state change). Push the tier to the client on change; do not poll.
- Many-vs-one: our attacker count is capped at 3 (MAX_ATTACKERS). The tier can take the count of attackers as a data field (for example fight tier 1, 2, 3 attackers) instead of a yes or no.
- The dead-player tier is worth keeping as the death beat (data field death_tier).
- 700 zones as data: each zone names its theme id; the fallback chain is the grammar, so a missing theme still plays.
- The cutscene camera is client-only (the engine never reads it). It is a boss-intro candidate: 3 to 4 keys, a movable flag, an end delay.

## 5. A 5-minute look test Dom can judge on his phone
Build one zone with a single enemy in the Pit-style arena.
- Walk up with weapon drawn: calm track, then the enemy swings: break then fight track. Note the delay.
- Put the weapon away while the enemy hunts: threat track.
- Compare: the 5 s poll (as donor) against the event-driven change. Dom listens on phone speaker or headphones and says whether the change reads as the enemy noticing him.

## 6. Licence and IP
MIT, code may be adapted with the notice kept. The Gothic game content (scripts, music, dialogue, names) is not in the donor and is not reproduced here. Only category-level ideas (a fight tier that follows attacks) are taken.

## 7. Gaps
- Not read: fight AI combo logic (fightalgo.cpp, fightaidefinitions.cpp), main follow camera (camera.cpp), Daedalus script calls (gamescript.cpp).
- Idle and ambient behaviour, walk density, loot reveal ceremony: not in the code read.
- Readability at 375 wide: not assessed on a device.

## Dragons and big creatures (MG011, fold-in)
Half read: engine only. The dragon AI, breath and fight scripts are Daedalus data and are not in the donor, so they cannot be read here.

| name | effect | formula | number ranges | cost | cooldown or cast | caps | file:line |
|---|---|---|---|---|---|---|---|
| Dragon guild | marks a dragon NPC, Gothic 2 only (g2 check) | guild == GIL_DRAGON (47) | one constant | none | none | none | common/game/constants.h:60, common/world/objects/npc.cpp:480 |
| Dragon corpse on reset | a dead dragon is not skipped by the routine reset; it is moved to its routine point. Other dead NPCs without mission items return early and stay where they fell | isDead and no mission items and not dragon returns early | n/a | none | runs when the clock is set | n/a | common/world/objects/npc.cpp:478-484 |
| Reset trigger | the routine reset runs when the world time is set | World::setDayTime calls WorldObjects::resetPositionToTA | n/a | none | on time jump | n/a | common/world/world.cpp:390-402 |
| Dragon Island skip | triggers that fail on one world are skipped by name | return on known names | n/a | none | n/a | n/a | common/world/world.cpp:510-519 |
| Breath, flight, mounts, taming | not located in the engine code read | n/a | n/a | n/a | n/a | n/a | (not read: scripts absent) |

Read for our use: a dead boss that stays as a corpse and returns to its lair point on a zone reset is a clean respawn rule, and the donor shows one way to do it (a per-kind exception on the reset path). Set the corpse return as zone data, not code.

Breath as a beam cone is not in this donor; for that see the Veloren note (its overheat beam).

## Reuse tag
Reuse: adapt (MIT) for the tier rule and the cutscene spline shape; event-driven, not the 5 s poll.

## Brief rule served
Boss-staging feel: the music and camera make the boss read as a threat before a single swing. Served by the tier rule (attack-state, stingers) and the intro spline.

## Best transferable idea
A three-tier music state driven by "something is attacking me now and has a weapon out", with a break or fill stinger chosen by the from and to tier.
