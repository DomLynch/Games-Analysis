# openmw (hit-feedback-stack, cell HF009)

Donor: /mnt/frankendom-donors/openmw (VPS, read-only). Donor licence: GPLv3 for the code (README.md:9; LICENSE is the GPL v3 text, per AU039). Assets are mixed (AU039). Every number and name below is shape only, clean-room; donor_value is null throughout.
Checked: files/data/scripts/omw/combat/interface_local.lua (handler chain, attack record); files/data-mw/scripts/omw/combat/local.lua (onHit, applyArmor, spawnBloodEffect, applyStagger); files/data-mw/scripts/omw/combat/common.lua (damage helpers, pickRandomArmor, armour rating, difficulty); apps/openmw/mwmechanics/character.cpp (prepareHit, text-key hit path, refreshHitRecoilAnims); apps/openmw/mwclass/npc.cpp (Npc::hit damage formula and Lua hand-off); apps/openmw/mwclass/creature.cpp (hit entry and Lua hand-off only, grep-read); files/data/l10n/OMWCombat/en.yaml. Keyword search for hitstop, shake, flash, knockback, stagger across apps/openmw/mwrender, apps/openmw/mwgui, apps/openmw/mwworld, character.cpp and the Lua script folders. Confidence: high on the order of operations and the rules quoted; medium on "absent" (only the paths named were searched; components/ and the rest of apps/ were not searched).
Half read: client (engine C++ hit path plus the local Lua combat scripts). The global-side scripts were not read. The Morrowind data half (GMST values, ESM records, hit clips) is not in the box.

## 1. What the player sees and feels
A swing winds up and a swish plays as the blow is prepared, before the hit frame. If the blow lands, the victim plays a health-damage sound, a blood puff appears at the impact point (one of three blood models, tinted by the victim's blood type), and the victim either takes a short hit recovery or is knocked down. Armour adds its own hit sound by armour type. A miss plays a separate miss sound only when the attacker is the player. There is no freeze, no shake and no screen flash in this code. The impact is carried by sound, blood and the victim's own hit animation, which is a random choice from the hit group.

## 2. Why it works, and is it striking
- Readable beat at 375 wide: the victim's stagger is the only visual cue, so a knockdown reads by animation alone. Good for one-on-one; weak for many-on-one unless the sound and blood carry the rest.
- One signature behaviour: a stagger roll that is separate from damage. A big hit can still fail to knock down, and a small hit can knock down. This is the most transferable part.
- One signature sound: the armour-type hit sound, chosen from the armour the victim wears. Named sound cues, not sound files, are in the box.
- Could be made ours at 20-30 percent resemblance: yes. The ordered chain with early stop and the separate stagger roll are the parts to keep.
Verdict: STRONG for the ordering and the stagger roll. The donor has no hit stop, shake or flash, so those three parts of the topic are not covered by this donor.

## 3. The rule behind it (order of operations, numbers as data)
Order, as the code runs it:
1. Wind-up ends: prepareHit (character.cpp:1246) plays the swish (character.cpp:1265) and sets the hit ready. The hit key is the text key "hit". If the animation has no hit key, the hit fires at prepare time (character.cpp:1134-1136).
2. Hit key: the C++ side computes raw damage from the weapon's min and max by attack strength (npc.cpp:620) and passes the result to Lua as an attack record (npc.cpp:675).
3. Lua onHit (local.lua:99-122), only when the attack is successful: (a) armour step (applyArmor): armour reduces health damage, condition and skill are updated, an armour-type sound plays (local.lua:41 and :47); (b) difficulty scaling (local.lua:106); (c) if health damage is above zero: "Health Damage" sound (local.lua:110), then blood at the hit position (local.lua:113); (d) stagger (local.lua:117).
4. Failed attack: no armour, no stagger; the player's miss sound plays (local.lua:120).
5. Stagger roll (applyStagger, local.lua:81-96): knockdown only if raw health damage is above zero, the agility term is at most the raw damage, and the knockdown term is at most a random 0-99 roll (local.lua:90-91). Otherwise hit recovery (local.lua:94). Knockdown sets knocked-down (local.lua:92).
6. Lock duration: no timer. refreshHitRecoilAnims (character.cpp:381) keeps the victim in its hit state while the hit animation plays (character.cpp:410), then clears it. A random clip from the hit group is chosen (character.cpp:460). The stagger lasts the clip length.
7. Handler chain: addOnHitHandler appends handlers; a handler that returns false skips the rest (interface_local.lua:62 doc; dispatch at :142).

Data fields (designer-tunable; donor value null because GPL):
- knockdown_agility_mult: multiplier on victim agility; donor GMST fKnockDownMult (local.lua:83); value not in box.
- knockdown_odds_base: percent, 0-100; donor GMST iKnockDownOddsBase (local.lua:88); value not in box.
- knockdown_odds_mult: per agility point, scaled by 0.01 in code; donor GMST iKnockDownOddsMult (local.lua:86); value not in box.
- stagger_roll_range: integer 0-99 (local.lua:90), donor code, not a licensed value.
- blood_on_player: boolean, default false (common.lua:45).
- blood_variants: 3 models, random pick (local.lua:58).
- armour_hit_sound: one of 4 cues by armour class (local.lua:41-47).
- raw_damage_formula: min + (max - min) times strength (npc.cpp:620).
- hit_stop_ms, shake_px, flash_ms, pre_hit_cue_ms: NEW fields. The donor has none of hit stop, shake or flash. Values are set by Dom at the look test; no donor value.

Armour and damage helpers used by the chain (for the armour lane, not this topic): damage is reduced by damage / (damage + armour) with a floor (common.lua:169-170); a 10 percent roll sends a hit to the shield slot, which is redistributed when no shield is worn (common.lua:176, 180).

String table: files/data/l10n/OMWCombat/en.yaml has 9 keys: a page title, a page description, a group title, and name plus description for 3 settings (unarmed creature armour damage, shield-hit redistribution, blood on player). These are settings text, not hit cues.

## 4. For Frankendom
Target: src/fight/hit-feedback.ts, parity row 10 (hit impact and hit stop). The server verifies the hit and any kill (ruling). The attack event carries raw damage, post-armour health damage, successful flag, hit position and attacker id. The client plays the cue chain from that event.
Keep: the order (sound before blood before stagger); one ordered chain with early stop; one attack record for every hit; stagger as its own roll.
Change:
- The stagger roll moves out of the victim's local script into the engine. In the donor it runs in the victim's client script (local.lua:81-96). In our shape the knockdown is server state, and the client only presents the knockdown or recovery named in the event.
- The lock is the hit clip length in the donor. Ours should also tie to the rig clip (parity rows 6 and 7), but the length should come from data, so zones and bosses can differ.
- Add the three missing effects (hit stop, shake, flash) on the client only, with the new fields above. Client-only means the server never waits for them.
- Many-on-one: three attackers can land three hits on one target. Each hit runs the chain once; stagger should not stack a longer lock per hit. The donor does not say how this is handled (no multi-attacker stagger logic was read).

## 5. Five-minute look test (Dom, on his phone at 375 wide)
One hero against one creature in the arena, same fight three times, behind a style flag (no release rows):
- A (donor-like): swish, hit sound, blood puff, hit-recovery clip only.
- B: A plus a knockdown on some landed hits, decided by the server event.
- C: B plus a 60 ms freeze on the hit frame, 2 px shake, and an 80 ms white flash. These three values are new and unset in the donor; Dom sets them.
Judge: which version tells him a hit landed without hiding the next attack, in three fights each. Compare the telegraph before the hit with and without the pre-hit cue (pre_hit_cue_ms, new).

## 6. Licence and IP
Code is GPLv3. Textures, MyGUI layouts and Lua scripts have no licence file of their own and are GPL-covered by default (AU039). We take the shape only: no Lua, no C++, no sound names as shipped. Our own sound names and our own numbers. Name kept: the order and the stagger roll. Trait changed: the roll moves to the engine, and the three visual effects are added.

## 7. Gaps
- Not read: components/ (record readers), the rest of apps/ (combat core, world hit paths), the global Lua scripts, the body of Creature::hit (only its entry point and Lua call were seen), death handling in character.cpp (hitStateToDeathState near line 107).
- Not in box: Morrowind ESM (GMST values, weapon damage ranges, hit clips, blood meshes).
- Keyword search for hit stop, shake, flash found none in the paths named; not searched in components/ or the rest of apps/.
- Looked for death and respawn presentation, loot ceremony, idle or ambient animation, walk density and 375 readability: none is in this topic's read. The donor's idle head bob is a camera item (AU039 and DC040), not part of this topic.
- Half read: client only. The paired server half is not in the box.

Reuse tag: shape only (GPLv3). Brief rule served: ordered feedback (ordering, stagger roll, client-only presentation).
Best transferable idea: one ordered on-hit chain where sound, blood and stagger are separate steps, and a handler can stop the rest.
