# xoreos-xoreos (hit-feedback-stack, feel note, cell HF004)

Donor/Licence: /mnt/frankendom-donors/xoreos-xoreos (VPS). README lines 5-6 and COPYING line 1 say GNU GPL version 3 (or later). Clean-room, shape only. No code adapted. Donor numbers are not written into data fields (GPL donor).

Checked: Read src/engines/kotorbase/round.cpp (round timer, whole file), src/engines/kotorbase/module.cpp (combat-round begin and end hooks, lines 724-756), src/engines/kotorbase/creature.cpp (attack animation, executeAttack, computeWeaponDamage, handleDeath), src/engines/kotorbase/area.cpp (death call), src/engines/dragonage/types.h (event ids; dragonage/event.cpp is 68 lines and was not read in full), src/aurora/gff4fields.h (cutscene shake and VFX impact ids), src/aurora/gdaheaders.h and gdaheaders.cpp (GDA column-name hash table), plus narrow greps over src for shake, impact, flash, knockback, hitstop and damage. Confidence: high on the round order and the damage formula (read in full). Medium on the impact schema (names only, no values). Verdict: PARTIAL. Thin for this topic: the only feedback in the code is the attack-and-dodge beat, death, and schema names for shake and impact.

Half read: server-side and engine logic (kotorbase), plus the schema (aurora gff4 and GDA column names). The data half, meaning the game files that hold the values (GDA rows, cutscene assets), is not in the box. Not in the half I read: the rows themselves.

## 1. What the player sees and feels
The fight runs on a fixed beat: each combat round is three seconds. At the start of a round the attacker plays a weapon swing (the animation depends on the weapon type: baton, sword, staff, pistol, rifle, or a dual-wield variant) and the target plays a dodge at the same moment. Damage lands at the end of that round, so the player sees a wind-up, then a hit about three seconds later. When a creature dies it plays a die animation once and then holds a dead pose. There is no hit stop, no shake, no flash, no knockback and no hit particles in the code I read. On a 375-wide phone this reads as turn-by-turn rather than a fast duel.

## 2. Why it works and what is striking
- Readable: the swing and the dodge start on the same beat, so the eye can see who is attacking. (Judgement from the code, not played.)
- One signature behaviour: a beat-synced wind-up. The dodge is cosmetic in the code (see defects), so it is not a real signature yet.
- One signature sound: none in this code.
- Could be made ours at 20-30 percent resemblance: the beat-stagger idea yes. The three-second round no.
- Criteria: silhouette partly, behaviour partly, sound no, resemblance yes for the timing only.

Best transferable idea: show the wind-up on a beat and resolve damage on a later beat, with a floor that keeps a creature at 1 HP when the flag is set.

## 3. The rule behind it
Round controller (src/engines/kotorbase/round.cpp):
- Phase 0 ends when 3000 ms have passed (lines 36, 52). Phase 1 ends when 6000 ms have passed since the cycle start (37, 59), and then the cycle restarts at phase 0 and a heartbeat is raised (62).
- The phase boundary raises the end hook first, then the begin hook (module.cpp: notifyCombatRoundEnded resolves damage, notifyCombatRoundBegan sets the target and plays the swing and dodge at lines 735 and 740). So resolve comes before the next wind-up in the same tick.
- Timestamps come from the engine event manager (round.cpp 41, 61, 73), not from a fixed step.

Swing and damage (src/engines/kotorbase/module.cpp and creature.cpp):
- Begin hook (module.cpp 724-742): only creatures in combat whose attack round matches, within weapon range at begin, get the swing and the target gets a dodge.
- End hook (module.cpp 745-756): for each live creature in combat with an attempted target, executeAttack runs. There is no range check at the end.
- Damage (creature.cpp 861-880): weapon dice summed per die (computeWeaponDamage, line 1031) plus the ability modifier. Both hands are summed. Unarmed is 1 plus the strength modifier (line 871). No hit roll appears in this path.
- Floor: HP becomes the floor if the result is at or below it (lines 874-878). The floor is 1 when Min1HP is set (creature.cpp 316). The clamp also cancels combat.
- Death (creature.cpp 892-897, area.cpp 825-826): handleDeath sets dead, clears default animations, adds the dead pose at weight 100, plays die once, then the area raises user event 1007.

Schema for shake and impact (names, not values):
- Cutscene camera shake: ten ids, 5600 to 5609 (gff4fields.h 634-643): type, two deprecated, seed, frequency, noise type, correlated, roughness, ramp in, ramp out. Only the enum exists; nothing in src reads them.
- Per-ability shake and impact columns in GDA tables (gdaheaders.cpp): ShakeType (112), ImpactTimeout (121), SoundImpact (210), ShakeDuration (239), ShakeYFreq (278), ShakeDelay (524), ShakePitch (764), ImpactVFX (365), Impact_Table (548). The file holds 2205 hash-to-name rows. gdaheaders.h says it resolves a column hash back to its string, so these are column labels, not behaviour. The row values are game data and are not in the box.
- The event enum includes AttackImpact (dragonage/types.h 154). No reader for it was found in dragonage/*.cpp or *.h.

Designer data fields (no donor values, GPL donor). Names and units:
- combat_round_ms (ms, one wind-up window)
- resolve_beat (rounds, damage lands at the end of the window)
- min_hp_floor_flag (bool, a creature stays at 1 HP)
- attack_dice_per_weapon (count and die size)
- unarmed_base_plus_mod (int)
- shake_duration, shake_freq, shake_delay, shake_ramp_in, shake_ramp_out (ms, Hz, ms, ms, ms; the names from the schema)
- impact_timeout (ms)

## 4. For Frankendom
- Keep: telegraph before resolve (the swing and dodge are visible before the damage). The beat decides when damage lands, which the server can enforce.
- Keep: the minimum-HP floor as a flag per encounter. It fits first-fight and onboarding (a first loss that does not kill).
- Keep: die once, then hold the dead pose (death presentation, parity row 17).
- Change: the beat is three seconds. Fast duels need a wind-up of a fraction of a second, so make the window a data field, driven by the server tick (fixed step), not the engine clock.
- Change: resolve must re-check range at the end. The donor checks range only at the begin.
- Change: add a real hit roll before damage. The dodge plays today whether or not anything is rolled.
- Many-on-one (max 3 attackers): give each attacker a phase offset on one shared beat, so three incoming swings are readable one after another rather than all at once. This is the idea to test. The donor does not do it.
- Zones as data: the attack window, floor flag and dice are per encounter or per creature in data, not code.

Defects, each with the fix:
- D1 no hit roll (creature.cpp 861-880): damage is applied with no roll, and the dodge animation (module.cpp 740) plays regardless. Fix: roll the guard or parry (parity row 3) before damage in the same resolve step, and play the dodge only on a miss.
- D2 no range check at resolve (module.cpp 745-756): a swing still lands if the attacker has walked out of range after the begin check (module.cpp 729-731). Fix: re-check range at resolve; cancel and show a whiff if out of range.
- D3 engine clock for the beat (round.cpp 41, 61, 73): timing depends on the engine clock. Fix: drive the beat from the server tick with a fixed step (parity row 18 sub-line).

Parity row for the target: row 1 (duel step and sim). Target file (proposed): src/fight/duelStep.ts.

## 5. Five-minute look test (Dom, on his phone)
Build behind a presentation-only flag, for example feel.beat. No release rows and no lock. Publish two short clips of the same three-on-one fight at 375 wide:
- A: each attacker swings on its own timing, free-running (today's feel).
- B: the three attackers share one beat with a stagger, so each wind-up starts after the last.
Dom judges which one lets him read and dodge each incoming hit on a phone. He picks one. Nothing ships from the look test.

## 6. Licence and IP
GPL v3 or later (README lines 5-6; COPYING line 1). Clean-room, shape only. Keep the idea of a beat-synced wind-up and a minimum-HP flag. Do not copy the round code, the animation names, the schema or the values.

## 7. Gaps
- Not read: the game data rows that hold the values (not in the box), the cutscene shake consumer (none found), creature idle and ambient animation (not in the code read), loot reveal (not read), respawn (not read).
- Half read: engine plus schema. The data half is absent from the box.
- Dragon Age combat resolve: not found in dragonage/*.cpp or *.h. Only event ids exist.
- Hit particles, hit stop, shake and flash: grep over src found the schema names and the VFX impact length id (gff4fields.h 2551), but no reader. Not present in the code read.
- Walk density, readability (max enemies per frame) and the camera: not read.

Reuse tag: none found in this box for Frankendom's needs. The beat and floor-flag ideas are the reusable part.
Brief rule served: feel note with the rule as data fields; judged by reading the code, verdict PARTIAL.
