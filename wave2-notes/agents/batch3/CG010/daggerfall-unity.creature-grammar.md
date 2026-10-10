# daggerfall-unity (creature-grammar, cell CG010)

Donor/Licence: /mnt/frankendom-donors/daggerfall-unity. Code MIT (LICENSE line 1 "MIT License"; line 3 "Copyright (c) 2009-2023 Daggerfall Workshop"). Assets/Licenses/Daggerfall Unity.txt line 3 names a different holder and year range, also MIT; the conflict is recorded as is (AU013). Assets are class C per AU013 (game-like text and tables, unlicensed art). Code may be adapted (MIT), but per Dom's rule we keep the shape and write our own names and numbers. Donor values in the JSON are reference only.

Checked: Assets/Scripts/Utility/EnemyBasics.cs (2305 lines: animation tables 27-70, the Enemies array, all 62 row entries tabulated by ID, the corpse packing helper at 2222-2231); Game/Entities/EnemyEntity.cs (SetEnemyCareer, 240-320 and the city-watch level at 301); Game/Formulas/FormulaHelper.cs (556-668 damage, the metal gate at 576-580, the multi-strike loop at 636-659, weight at 2880-2895); Game/EnemyAttack.cs (186-200, 330-352 knockback); Internal/DaggerfallMobileUnit.cs (205-240 attack variants, 296-306 and 548-566 strike frame); Game/EnemySounds.cs (26-28, 92-118, 196-226 cadence); Game/EnemyDeath.cs (40-130 death); Assets/StreamingAssets/Tables/Quests-Foes.txt (schema line 3, 62 id,name lines); Assets/StreamingAssets/Text/Master Localization CSV Files/Internal_Strings.csv (enemyNames block, lines 250-337; enemyGroupNames at 338). Confidence: high on all numbers listed with receipts (60 receipts verified). The knockback closed form is my algebra from lines 343-344, checked by hand.

Verdict: STRONG. The mechanism is read end to end, the numbers are explained, and it is self-contained: a monster is one data row, and a variant is the same row with a new skin.

Best transferable idea: a monster is one data row (fixed level, HP range, damage range, up to three strikes, armour, metal gate, weight, frame rates); a variant is the same row with a new skin, sound and glow, so four creatures read as one set.

Half read: client (code and the tables as text). The data pack (sprites, sounds, MONSTER.BSA, quest records) is not in the box; the repo's Assets/StreamingAssets/GameFiles readme says the user supplies it. Server half: not applicable (single-player client).

## 1. What the player sees and feels
On a 375-wide phone a monster stands in a short idle loop at 4 frames per second, and while the player is within 16 units it barks on a random 3 to 9 second timer, mostly barks and sometimes steps. When it swings, the move set plays at 10 frames per second and the damage lands on a marked strike frame in the sequence, not on a timer. A multi-strike monster can land up to three strikes in one swing, and each strike can miss depending on the player's reflexes. Metal-gated foes shrug off weaker weapons: the blow does nothing and a text popup says so. When a monster dies, a popup names it, a body falls with a sound, and a lootable corpse appears in its last frame. The golem quartet is the clearest family read: four elemental golems with identical numbers, each with its own skin and move sound, and only the fire one glows.

## 2. Why it works / is striking
- Readable silhouette at 375 wide: (not verified here; the sprites are in the data pack, not the box). The rule that makes it readable is one clear strike frame per attack.
- One signature behaviour: the metal gate. A ghost takes only silver, a brute only mithril, and the gate is data.
- One signature sound or effect: the attack sound plays about half the time (EnemySounds.cs:111), so the voice is not constant; the bark-or-step cadence is 80/20 (EnemySounds.cs:213).
- Could be made ours at 20-30 percent resemblance: yes. The golem family pattern (same numbers, four skins, one glow) and the strike-frame marker transfer directly.

## 3. The rule behind it
1. Rows are the data. EnemyBasics.cs holds 62 rows: IDs 0-42 (43 rows; ID 39 is an empty placeholder, EnemyBasics.cs:1561) and IDs 128-146 (19 human and class rows). 61 rows carry fields. Eight affinity groups (Animal 6, Daedra 5, Darkness 10, Daylight 7, Golem 4, Human 19, Undead 7, Water 3; sum 61) and five behaviour groups (General 50, Flying 5, Aquatic 3, Spectral 2, Guard 1; sum 61).
2. Level. A monster's level is fixed by its row (EnemyEntity.cs:284). Rows 0-33 run from level 1 to 21. Rows 34-42 are all level 16. Class enemies follow the player's level (EnemyEntity.cs:299); city watch add 3 to 6 (EnemyEntity.cs:301).
3. Health. A uniform whole-number roll between MinHealth and MaxHealth at spawn (EnemyEntity.cs:285).
4. Armour. Row ArmorValue times five (EnemyEntity.cs:288).
5. Metal gate. MinMetalToHit per row. Across the 42 monster rows with a gate: none 24 rows; steel 1 (ID 1); dwarven 1 (ID 13); silver 7 (IDs 9, 10, 14, 18, 19, 23, 28); mithril 9 (IDs 22, 25, 26, 27, 29, 30, 31, 32, 33). A weapon below the gate deals zero damage (FormulaHelper.cs:576, popup at 580).
6. Multi-strike. Up to three strikes per swing (FormulaHelper.cs:636). Each strike passes a reflex chance of 50 minus 10 times (reflex minus 2) (FormulaHelper.cs:654), then a hit check; damage is summed.
7. Attack variants. Alternate strike sequences are picked by cumulative chance (DaggerfallMobileUnit.cs:222 onward).
8. Strike marker. A -1 entry in a strike frame list is the strike frame: damage applies there (DaggerfallMobileUnit.cs:555). One frost daedra set starts with it (comment at DaggerfallMobileUnit.cs:300).
9. Eight facings from five records. The move set draws five records and mirrors the rest with a flip (EnemyBasics.cs:45 is the north-east entry, record 3 flipped).
10. Knockback. Monsters are pushed only when their weight is above zero (EnemyAttack.cs:337). Speed is ((10 times damage) / weight) times (2 times damage minus the fixed-point term). The 256 factor cancels, so the closed form is speed = 40 times damage squared over (weight + 10 times damage), in classic units (my algebra from EnemyAttack.cs:343-344), with a floor of 15 in the same units (EnemyAttack.cs:347).
11. Golem family (IDs 35-38). The same numbers in all four rows: level 16 (EnemyBasics.cs:1449 for the fire row), health 25 to 130 (MaxHealth 130 at 1448 and 1481), damage 5 to 15, armour 6, no metal gate, weight 1000, soul value 30000. What changes: the skin (texture 290, 291, 292, 293 at 1434, 1467, 1498, 1529), the corpse frame, the move sound (iron at 1474), and a glow on the fire row only (1454).
12. Idle and cadence. Idle is a 4 frame-per-second set; rows without an idle set reuse the move set, as do flying and swimming rows (comment above the move array in EnemyBasics.cs). Animation rates: move 6 (EnemyBasics.cs:29), and the attack, hurt and idle rates in the same block.
13. Death. A popup names the foe (EnemyDeath.cs:80; the popup can be turned off by a setting). A lootable corpse is created with the corpse texture, equipment is unequipped, and a body-fall sound plays. Quest-tied foes wait for the quest system before the death completes (EnemyDeath.cs, the quest check in CompleteDeath).
14. Corpse texture packing. Archive and record are packed into one integer (EnemyBasics.cs:2224).
15. Names. The Quests-Foes.txt table has 62 id,name lines (schema at line 3). The enemyNames cell in Internal_Strings.csv is one block of about 88 lines, one name per line (lines 250-337), and enemyGroupNames holds the group names (from line 338). Names are not copied here.

Data fields (designer-tunable; donor values from MIT code, reference only):
- monster.level | level | 1 to 21 (rows 0-33); 16 (golem family)
- monster.hp_min, hp_max | hit points | 25, 130 (golem family)
- monster.dmg_min, dmg_max | hit points per hit | 5, 15 (golem family)
- monster.strike2, strike3 (min, max) | hit points per hit | not sampled
- monster.armour | armour points (code multiplies by five) | 6 (golem family)
- monster.metal_gate | weapon tier enum | silver (ID 18), mithril (ID 25), none (golem family)
- monster.weight | classic weight units | 1000 (golem family), 10000 (dragonling, ID 40)
- knockback.floor | classic speed units | 15
- strike.reflex_base | percent | 50
- strike.reflex_step | percent per reflex point above 2 | -10
- attract.radius | units | 16
- attract.delay_min, delay_max | seconds | 3, 9
- attract.bark_chance | probability | 0.8 (move 0.2)
- attack_sound.chance | probability | 0.5
- anim.fps.move, idle, attack, hurt | frames per second | 6, 4, 10, 4 (move, idle, attack, hurt)
- corpse.archive, corpse.record | ints | per row (golem family 405 with frames 0 to 3)

## 4. For Frankendom
- A catalogue row per monster (parity row 21 catalogue fields): level fixed per row, HP and damage ranges, up to three strikes, armour, metal gate, weight, frame rates, sound set, glow, skin.
- 100 Pit characters reused across 700 zones: a zone picks the skin, sound set and glow of a row. The golem family is the template: four variants of one row, same numbers, one swapped skin and one glow.
- Many-vs-one: three strikes per swing, capped at three; keep the cap in the same constant as MAX_ATTACKERS = 3, so the strike count and attacker count are one number.
- Metal gate: keep the zero-damage rule and move the feedback from a text popup to a short rune flash and sound on the client. The gate itself is engine logic, not presentation.
- Strike marker: the strike frame stays data in the clip list. The server applies damage on the tick that matches the marker, so the client shows the telegraph and the server decides the hit (parity row 7 for the clip, row 10 for hit impact and knockback).
- Knockback by weight: keep weight as a field; write the closed form.
- Keep: row-as-data, fixed monster level, uniform HP roll, armour times five, strike-marker frame, weight-based knockback, skin variants, 80/20 bark cadence, half-rate attack sounds.
- Change: one server random source for every roll (see defects), text popup to rune flash, our names and numbers, no empty placeholder rows.

Defects to fix when we adapt (keep the idea, fix the defect):
- Two random sources in one roll: the reflex check uses the classic generator (FormulaHelper.cs:657) and the damage roll uses the Unity generator (FormulaHelper.cs:659). fix: one server random stream, seeded per fight, every roll recorded for replay.
- Knockback is written with a 256 fixed-point factor that cancels (EnemyAttack.cs:343-344). fix: write the closed form 40 times damage squared over (weight + 10 times damage), keep the floor of 15.
- Placeholder row 39 has no fields (EnemyBasics.cs:1561). fix: validate at load that every row used by a spawn has its fields, and reject empty rows.

## 5. Five-minute look test
Target: src/fight/creature-family.ts (proposed module), parity row 7 (creature actor and clips).
What to build: one strike clip with a -1 strike frame, shown on three skins of one row (same numbers): a plain skin, a tinted skin, and a glowing skin. Show a 2-second loop per skin. On the strike frame, a short rune flash plays before the damage number appears. Also show one weapon below the metal gate: a rune flash with no damage, no text popup.
What Dom compares on his phone: (a) do the three skins read as one family at 375 wide in a still, (b) does the rune flash land before the damage number on the strike frame, (c) does the no-effect gate read as "blocked" without a text line.
Pass: (a) and (b) pass. If (c) fails, keep the flash and drop the sound.

## 6. Licence and IP
Code: MIT. Adapting the code is allowed, but this note keeps to shape: no code or identifiers are copied. Assets: class C per AU013. Quest text, tables and creature names are not copied; the note uses category labels only (a see-through flyer, a metal-gated brute, a golem family, a water-bound ambusher). The donor's own names for its creatures are not used. The numeric values in the JSON are from MIT code and are reference only; our tuning replaces them.

## 7. Gaps
- Data pack (sprites, sounds, MONSTER.BSA, quest records): not in the box (not read).
- Custom career templates (GetCustomCareerTemplate) and class enemy careers: not read.
- Affinity-specific rules beyond the names: not read. Undead, daedra and darkness rows were not checked for special logic.
- Weight in soul-trap or capture logic (WeaponManager.cs:580 gate read; the logic behind it not read).
- Strike sequences for rows other than the frost daedra example: not checked row by row (the field exists on each row).
- Respawn of monsters after death: not read (EnemyDeath.cs covers the death presentation only). Loot reveal ceremony beyond the lootable corpse marker: not read.
- Encounter density and spawner placement: other topic (encounter-templates).
- Half read: client only. Data pack not in the box.

Reuse tag: adapt (idea), defects fixed in the adapted version.
Brief rule served: creature-grammar: one family, many skins, a gate, a strike marker, and a bounded strike count.
