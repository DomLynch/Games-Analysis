# openmw (creature-grammar, cell CG010)

Donor/Licence: /mnt/frankendom-donors/openmw. Code GPLv3 (README.md:9 per AU039; LICENSE is the GPL v3 text). Morrowind data is not in the box, so this is shape only, clean-room. No GPL code or GPL-derived numbers are carried into our tree.

Checked: read the levelled-list picker (apps/openmw/mwmechanics/levelledlist.cpp, 81 lines, all of it), the levelled-list loader and flag enums (components/esm3/loadlevlist.cpp and .hpp), the creature record (components/esm3/loadcrea.cpp and .hpp), creature mechanics and sound lookup (apps/openmw/mwclass/creature.cpp, lines 140, 301, 315, 599, 614-626, 619, 853), spawn-point respawn (apps/openmw/mwclass/creaturelevlist.cpp, 84-94), pack spawn (apps/openmw/mwworld/worldimp.cpp, 3606-3622), random clip choice (apps/openmw/mwmechanics/character.cpp, 321-333), and the CS default GMST table (apps/opencs/model/world/defaultgmsts.cpp, 1666-1667, 1958). Confidence: high on the mechanism as written; the creature data and meshes are not in the box, so no creature counts exist here.

Verdict: STRONG for the mechanism (read end to end, numbers explained, self-contained). Depth thin: zero creature records in the box.

Best transferable idea: one base creature record with a link to its variants (scale and sound set by base id), plus a spawn that picks a tier from a levelled list by player level and rolls a pack of 1 to N.

Half read: client (engine code). The data half (Morrowind ESM records, meshes, clips, sounds) is not in the box and was not read. No paired data donor exists in this batch (OpenGothic is a different game and also lacks data).

## 1. What the player sees and feels
Nothing here is seen directly: the clips and meshes are not in the box. What the code decides is what the player meets. When a rest is interrupted, the game places a small pack (1 up to a game-setting count) about 220 units from the player, and each member is picked from a levelled list keyed to the player's level (worldimp.cpp:3606-3621; the call site is waitdialog.cpp:272). A placed creature-list point puts one creature from its own list at that point (creaturelevlist.cpp, insertObjectRendering). Early on the player meets the low tier; when the player's level passes a tier's threshold, only the highest eligible tier appears (unless the list is flagged to use every eligible tier). The list places a different record as the player levels, so a family can change tier without a new model when the tiers are variants. A variant reuses its base's voice set when it has none of its own, so a re-skinned creature still sounds like its family.

## 2. Why it works / is striking
- Readable silhouette or beat at 375 wide: (not read here; meshes absent). The mechanism gives one clear tier cue per spawn, not a per-frame change.
- One signature behaviour: the variant link (CNAM names the base record, creature.cpp:599 keys sounds on it) plus a tier pick that only ever takes the highest eligible rung.
- One signature sound: the sound lookup falls back to the base id, then to any creature sharing the same model (creature.cpp:614-626). A new skin inherits a voice without new sound records.
- Could be made ours at 20-30 percent resemblance: yes. The rule is structure (base plus variants, tier ladder, pack roll), not any creature.

## 3. The rule behind it
1. Family: one base record. A variant record carries CNAM (components/esm3/loadcrea.cpp:116 stores mOriginal). Its stats live in its own record (no field merge in the code read). Scale is a multiplier on the reference scale (creature.cpp:853; XSCL parsed at loadcrea.cpp:154).
2. Voice: the sound generator is looked up by base id first (creature.cpp:599), then by a creature that shares the same model and has a different base (creature.cpp:619-626), then by a generic set with no creature id (creature.cpp:614-626 fallback block).
3. Tier pick (levelled list): roll chance-none first (levelledlist.cpp:33). Compute the highest list level that is at or below the player level (levelledlist.cpp:40). Candidates are every eligible entry if the all-levels flag is set, otherwise only entries at that highest level (levelledlist.cpp:51). One candidate is picked uniformly (levelledlist.cpp:56). If the pick is another list, recurse (levelledlist.cpp:76-78).
4. Flag bits: creature lists use bit 0x01 (loadlevlist.hpp:68); item lists use bit 0x02 (loadlevlist.hpp:91). The code reads the creature bit for creature lists (levelledlist.cpp:47).
5. Pack: count = 1 + roll(iNumberCreatures) (worldimp.cpp:3611); each member is one tier pick (worldimp.cpp:3615); placed 220 units out (worldimp.cpp:3621). This runs when a rest is interrupted (waitdialog.cpp:272), so it is an ambush on rest, not a field spawn.
6. Respawn at a spawn point: the point regrows a creature only after the death stamp plus the lesser of two corpse delays has passed (creaturelevlist.cpp:93-94). A point whose creature was removed (count 0) regrows at once (creaturelevlist.cpp:84).
7. Natural attacks: three min/max pairs per creature (loadcrea.hpp:70). The swing's attack type picks the pair (creature.cpp:301). Damage is linear in swing strength with no random term (creature.cpp:315). Deterministic per strength, which suits server verification.
8. Idle variety: a clip group is chosen by counting the numbered clips that exist and rolling one (character.cpp:321-333). A creature with two attack clips gets two; no table is needed.

Data fields (designer-tunable; donor values null because GPL):
- creature.level | int | null
- creature.attack_pair[0..2].min, .max | hp per hit | null
- creature.base_id (CNAM) | ref id | null
- creature.scale (XSCL) | multiplier | null
- creature.blood_type | 6-bit int | null
- levelled.chance_none | percent 0-100 | null
- levelled.entry.level | int | null
- levelled.all_levels | bool | null
- spawn.pack_max (game setting iNumberCreatures) | creatures | null (CS default 1, defaultgmsts.cpp:1958, not the game value)
- spawn.pack_distance | units | null (220, worldimp.cpp:3621)
- spawn.respawn_grace (fCorpseRespawnDelay, fCorpseClearDelay) | game time | null (CS defaults 72, defaultgmsts.cpp:1666-1667)

## 4. For Frankendom
- 700 zones as data: a zone names a levelled list per archetype plus a pack cap and a respawn grace. None of that is in code.
- 100 Pit characters reused across zones: one base row per character, a variant row per zone (CNAM link), with scale and a sound set chosen per variant. This is the reuse rule the brief asks for.
- Many-vs-one: pack_max becomes data per zone and is clamped to MAX_ATTACKERS = 3, so a pack never exceeds three attackers.
- Server-verified: the tier pick and pack roll happen once at spawn on the server, the chosen base id is sent, and the client only presents it. Keep the one-time pick; do not re-roll per frame.
- Keep: base plus variant link, scale multiplier, highest-eligible-tier pick with a chance-none roll, the bounded pack roll, sound fallback by base id.
- Change: add a depth cap to the recursive list pick (levelledlist.cpp:76-78 has none); build the sound fallback map once at load instead of scanning every creature and sound generator per request (creature.cpp:614-626); replace the Morrowind numeric flags with named fields; make the three attack pairs a per-swing choice that the server resolves.
- Fight rulings: engage is a state change and kills are server-verified. The tier and pack happen at spawn, which is zone population (parity row 23). The swing damage (creature.cpp:315) is a fight step (row 1).

Defects to fix when we adapt (keep the idea, fix the defect):
- Recursive levelled pick has no depth cap (levelledlist.cpp:76-78). fix: pass a depth counter, stop at a small limit (for example 4), and log it.
- Sound fallback rescans the whole creature and sound store on every request (creature.cpp:614-626). fix: index base id to sound set at load.
- A missing list entry logs a warning and returns none (levelledlist.cpp, the nonexistent-item branch), so that pack member is simply dropped and the pack comes out short. fix: re-pick from the remaining candidates so the pack keeps its size, and keep the log line.

## 5. Five-minute look test
Target: src/fight/creature-family.ts (proposed module), parity row 7 (creature actor and clips).
What to build: one base creature (a generic hound-like body with a simple silhouette) and three variants that change only colour set, scale (0.85, 1.0, 1.2) and one glow accent, all three sharing the base's voice set. Render a 2-second idle loop and a 375-wide still of each.
What Dom compares on his phone: (a) do the three read as one family at 375 wide in the still, (b) is the scale step visible in a pack of three next to the player, (c) does the glow accent read in a fight-camera frame without hiding the silhouette.
Pass: the three read as a family and the scale step is visible in a pack of three. Fail: any variant reads as a different creature, so drop the colour change first.

## 6. Licence and IP
Code: GPLv3. Shape only; no code, identifiers, or numbers from the code are copied. The Morrowind data and art are not in the box and we use none of them. Named creatures and Morrowind names are not used; the note keeps every idea at category level (a hound family, a three-tier ladder, a pack of up to three).

## 7. Gaps
- Creature records, meshes, clip names, sound files: not in the box (not read).
- Morrowind GMST values for iNumberCreatures and the corpse delays: not in the box (not read). Only the CS defaults were read.
- Creature death animation and corpse presentation: not read beyond creaturelevlist.cpp and the note at creature.cpp:149.
- Idle selection: the idle-state code path was read in outline (character.cpp idle-group mapping at 249-261 and the storm idle at 1181); the random-idle timing was not found in the code read, so no ambient-idle cadence is claimed.
- Walk density and encounter templates: not this topic (see encounter-templates).
- Half read: client only. Data half not in the box.

Reuse tag: adapt (idea). Decision: adapt (idea), defects fixed in the adapted version.
Brief rule served: creature-grammar: one family, many variants, a tier ladder, a bounded pack.
