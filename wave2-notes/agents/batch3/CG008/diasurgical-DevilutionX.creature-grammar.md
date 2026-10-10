# diasurgical-DevilutionX (Diablo-style port, Sustainable Use License): creature-grammar (CG008)

Donor root (VPS, read-only): /mnt/frankendom-donors/diasurgical-DevilutionX/
Licence: Sustainable Use License 1.0, non-commercial only (LICENSE.md line 1; use limit at line 15). Assets fall under it by location (README.md line 82) and carry a Blizzard copyright notice (README.md line 86). Not an OSI licence. Clean-room, category-level use only (see section 6).
Verdict: STRONG. The data table and three AI functions were opened and the numbers are checked. Best transferable idea: one small tier integer (0 to 3) drives several behaviour formulas, so one family body and one tier ladder give many creatures.
Depth: full for the creature table and the tier rules; thin for the rest of the monster AI.
Half read: both, in part. Data half: assets/txtdata/monsters/monstdat.tsv (all 112 rows counted with python) and unique_monstdat.tsv (header and 2 rows only). Engine half: Source/monster.cpp (FallenAi 2314-2373, SneakAi 2526-2578, SnakeAi 2669-2723, population 3705-3736), Source/engine/random.cpp (FlipCoin 105-109). The multiplayer and server path (dvlnet) is not in the half I read. No paired donor exists in the box. OpenDiablo2 is a separate reimplementation and was not read.
Checked: AU015 (asset audit) and DC018 (catalogue) read first. Counts were recomputed from monstdat.tsv for this note. The catalogue claims for the Storm, Counselor, Bat, Rhino and Gargoyle AI bodies were not re-checked here.

## 1. What the player sees and feels (375 wide)

A creature family is one body in up to four tiers. The tiers are tints of the same sprite sheet, so a player learns the shape once and reads the tier by colour. The base tier is plain and each higher tier is a differently tinted version of the same figure. Families come in small groups: a level holds a set of spawn slots, placed as one creature, a pair or trio, or a group of three to five, depending on depth.

The tier also changes what the creature does. A fallen creature, when it finishes a stand animation and a one-in-four roll succeeds, calls every kin within a radius of 4 tiles at tier 0 up to 10 tiles at tier 3: they stop wandering and turn on the player for a timed spell, and the caller heals a little. A hider fades out when the player is at range and fades back in when the player comes close, then strikes when adjacent. A sway-and-lunge creature wiggles side to side and then lunges when it is exactly two tiles away with a clear line. On screen these are three distinct beats: a call ring, a fade, and a sideways wobble before a lunge.

## 2. Why it works / is striking

- Readable at 375 wide: the 2-tile lunge is one clear beat, and the call-ring is one clear beat. Sprite size was not judged by eye (no images were opened).
- One signature behaviour per family: the sway-and-lunge (SnakeAi), the kin call (FallenAi), the fade with a dead band (SneakAi).
- One signature sound: none. The tree has no audio files (AU015). The sound-effect name table (assets/txtdata/sound/effects.tsv) has 813 rows with nothing behind them, so no sound is judged.
- Could be ours at 20 to 30 percent resemblance: yes. Keep the one-integer tier, the shared body and the single signature per family. Change the names, the tints and every number.

## 3. The rule behind it

### 3a. The family key and the tier
- Each creature row (monstdat.tsv, 112 base rows) names a sprite set (column assetsSuffix), an AI tag (column ai), a tier index (column intelligence, 0 to 3), an optional palette variant (column trnFile), and a stat row (hit points, damage, level, depth band, availability).
- 112 rows sit on 34 sprite sets. 24 sets carry exactly four rows (96 rows). One set carries seven rows. Nine sets carry a single row, mostly bosses or one-off creatures.
- 22 of the 24 four-row families use tier indices exactly 0, 1, 2, 3. The other two repeat a tier number (spear family 0, 2, 2, 3; black knight family 0, 0, 1, 1). See the defect list in section 3d.
- 70 of 112 rows name a palette variant, from 66 distinct files. 42 rows use the base palette.
- Depth bands of one family overlap, so the tiers run in a line down the dungeon. The zombie-type family runs depth 1-2, 2-3, 2-4, 3-5 (monstdat rows 2 to 5).

### 3b. What the tier does (formulas read from monster.cpp)
- Kin call (FallenAi): on the last stand frame, a one-in-four roll (FlipCoin(4), line 2334). The caller heals 2t+2 hit points (line 2339). Every kin of the same AI within radius 2t+4 tiles (line 2342) is set to attack for 30t+105 ticks (line 2357). Here t is the tier.
- Fade hider (SneakAi): fade distance is 5-t tiles (line 2532). The hider fades in when the player is closer than 5-t (line 2554), and fades out when the player is 6-t or more away (line 2557). Between those two values nothing changes: a one-tile dead band. Adjacent strike chance is (4t+10) percent (line 2571), so 10, 14, 18 or 22 percent.
- Sway and lunge (SnakeAi): the sway pattern is six steps, 1, 1, 0, -1, -1, 0 (line 2671). The sway step runs when the monster is in its Delay mode, or when a 0-99 roll is at least 35-2t (line 2684). As written, the roll alone fires on 65+2t percent of ticks. The lunge fires at exactly two tiles with a clear line (line 2678, the test is distance at least 2 and under 3), and it reuses the same charge missile id that other families use (line 2679).

### 3c. Spawn density (level population, monster.cpp 3713-3735)
- Spawn slots per level = walkable tiles in the 80 by 80 core divided by 30 (line 3713). Multiplayer adds half again.
- Group size: one creature on depth 1 or on a coin flip (lines 3730-3731, FlipCoin with the default 2, which is 1 in 2 by random.cpp 108); two to three on depth 2 and in the crypt (line 3732); three to five otherwise.
- Initial placement only was read. Respawn and despawn were not read, so the row-23 caps and grace timers are not checked here.

### 3d. Defects to keep the idea and fix
- Defect: the spear family (monstdat rows 6 to 9) has tier 2 twice and no tier 1. The black knight family (rows 95 to 98) has tier 0 twice and tier 1 twice. Because the tier number drives the call radius, the heal, the fade distance and the strike chance, a duplicate tier means two creatures in a family act the same. Fix: renumber each family to 0, 1, 2, 3 and add a load-time check that each family has one row per tier.
- Ambiguity, not a proven defect: the sway roll (line 2684) reads as "sway on 65+2t percent of ticks", which may not be the intent. Fix: write the intended percent as a named data field and set it on purpose.

### 3e. Designer-tunable data fields (donor values not used: licence is non-commercial)
| name | unit | donor_value_or_null |
|---|---|---|
| tier_index | integer 0-3 | null |
| sprite_set | string key | null |
| palette_variant | string or none | null |
| hp_min, hp_max | hit points | null |
| damage_min, damage_max | hit points per hit | null |
| level | power value | null |
| depth_min, depth_max | dungeon level index | null |
| availability | Always / Retail / Never | null |
| call_chance | 1 in N | null |
| call_radius_base, call_radius_per_tier | tiles | null |
| call_heal_base, call_heal_per_tier | hit points | null |
| call_timer_base, call_timer_per_tier | ticks | null |
| hide_distance_base | tiles | null |
| hide_dead_band | tiles | null |
| strike_chance_base, strike_chance_per_tier | percent | null |
| sway_roll_base, sway_roll_per_tier | roll threshold | null |
| spawn_divisor | walkable tiles per slot | null |
| group_size_by_depth | range per depth band | null |

## 4. For Frankendom: how it maps to our shape

- 700 zones as data: a zone row names a depth band and a list of families. A family is one sprite set with four tier rows. A zone at depth 9 picks tier 2 of a family; it does not need a new creature.
- 100 Pit characters reused across zones: the Pit and the zones draw from the same family rows. The tier comes from the zone or the arena rank, as one integer.
- Many-vs-one: a group of three to five exceeds MAX_ATTACKERS = 3. The engine admits three attackers and the rest wait in the hate list, per the Frankendom rulings. The call (kin rally) is a target-setting rule, so it belongs in the engine, not the client.
- Server-verified events: the call, the fade-in, the fade-out and the lunge are state changes decided by the engine on the server, with a seeded roll per tick. The client draws the call ring, the fade and the lunge telegraph from those events.
- Keep: the one integer that drives several formulas; one shared body per family; the fade dead band; the two-tile lunge trigger; spawn density from walkable area.
- Change: move every constant (1 in 4, radius, timer, heal, strike percent, sway roll) into family data; fix the two broken tier ladders; add a visible rear-up before the lunge (a telegraph, not a fix); the call should show a ring, not only a heal.
- Row 4 (fight loop: aggro, chase, leash) is where the call and the lunge belong. Row 23 covers the spawn caps; this donor's initial placement is the only part read.

## 5. Five-minute look test (Dom on his phone)

- Target file: src/fight/ai-tier.ts (new module). Parity row 2 (AI brain).
- Build: one four-tier family from one sprite set, with four palette swaps. Tier 3 gets a call ring of radius 2t+4 tiles, with the timer and heal as data.
- Look at 375 wide: (a) the four tiers side by side, can you tell the tier at a glance? (b) one tier-3 call, with and without the ring, does the ring make the escalation readable?
- Judge: if the tier does not read at a glance, keep the palette swap but add a size step, and do not add a new sprite.

## 6. Licence and IP

- Code: Sustainable Use License 1.0, non-commercial only (LICENSE.md line 1). This is not open source. No code is adapted. Ideas and shapes only.
- Assets: Blizzard copyright notice and no stated origin for in-tree art (README.md lines 86 and 88; AU015). Art and names stay out. The family-by-tier shape is the only thing taken.
- Kept (trait): one tier integer drives several formulas; a kin call with radius and timer per tier; a fade with a dead band; a two-tile lunge trigger; spawn density from walkable area.
- Changed (trait): our names, our tints, our numbers, our call ring and telegraphs, server-side seeded rolls.
- Recreated as a clearly distinct original: a plated beetle family with a four-tier body, whose top tier calls its kin, and a two-tile lunge with a rear-up telegraph. No legal conclusions.

## 7. Gaps

- Not read: the multiplayer and server path (dvlnet); the client art and sound (absent from the tree); the body of the Rhino, Bat, Storm, Counselor, Gargoyle and Butcher AI (the catalogue lists them, not re-checked).
- Half read: data plus client engine logic. The matching other half is not in the box.
- Not read in this pass: death and respawn presentation, loot reveal ceremony, idle and ambient animation beyond the sway and the fade. Idle vocabulary seen: the sway runs in stand mode, and the hider fades while idle.
- Readability at 375 wide: judged from the data only, not by eye.
- unique_monstdat.tsv (100 rows): header and two rows read; not counted here.
- Respawn and despawn in the population code: not read.
