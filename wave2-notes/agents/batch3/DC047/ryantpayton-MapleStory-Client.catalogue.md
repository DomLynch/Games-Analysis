# ryantpayton-MapleStory-Client (HeavenClient) (catalogue, DC047)

Donor: /mnt/frankendom-donors/ryantpayton-MapleStory-Client (VPS, read-only). Asset audit read first: AU046 (ryantpayton-MapleStory-Client.assets.md).
Paths below without a prefix are under the donor root.
Licence (as the files say): code is GNU AGPL v3 (LICENSE line 1). Data/ItemData.cpp header repeats the AGPL. README says the project is free and open-source (its own statement; the AGPL governs). Game content is NOT in the repo: the README says the user converts the official client's WZ files to NX and supplies them. No asset licence is stated. The owner of the game data is not stated in the repo.
Class: code is AGPL, so we use the SHAPE only (clean-room). Game content is class D here (absent). Inspiration stays CATEGORY-LEVEL and shape-only. This is a design read, not legal advice.
Checked: 41 receipts (note M) in receipts.tsv, all verified against the VPS quotes. Confidence: high on the damage-number layout, the mob stance, death and flinch code, and the job-tier code. Medium on the two possible defects marked below (runtime order not checked).

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Each entry names the trait KEPT and the trait CHANGED.

## Halves read (the pair is named; "absent" is never used for an unread half)
- Client half (this repo): C++ sources read: Gameplay/Combat (DamageNumber, Combat, Mob-facing code), Gameplay/MapleMap (Mob, MapMobs, MapInfo), Character (Job, Look/Afterimage, Inventory/Weapon.h), Data (JobData, WeaponData, ItemData header), Audio/Audio.cpp (UI table), Constants.h, DamageNumber.h. Listed only: Gameplay/Physics, Net (64 files), IO (142 files), Graphics, Util.
- Server half: NOT in this repo. README points to a separate server project (HeavenMS). The box has no such folder. Checked: /mnt/frankendom-donors/Elem8100-MapleNecrocer is a C# GM and WZ tool (its README first line), not a game server, so it is not the pair.
- Data pack (NX game files): NOT in the repo. Util/NxFiles.h names the files (String, Mob, Item, Map, Skill, Character, Sound, UI and others), none are present. Item, mob, skill, map and string values are therefore absent from the box.

## 1. Creatures / beasts
Counts: 0 creature records in the box (mob records come from NX, absent). The code has a creature STANCE vocabulary and behaviour rules, read below. Listed as behaviour archetypes, not creature families, because no mob names or stat tiers exist here.
Stance vocabulary (Mob.cpp lines 55-73): stand, move, jump, hit1, die1 per mob; a flying mob uses its fly clip for stand and move (line 62). The clip names are the vocabulary; the clip contents are NX.
Behaviour archetypes read in code (top 5; fewer than 8 because the box has no creature records):
1. Edge Patroller (ground mob). Why: walks a ledge and turns at each edge once. Keep: edge turn gated once per edge (Mob.cpp line 192). Change: add a short look-around at the edge (idle beat). Ref: Gameplay/MapleMap/Mob.cpp lines 192-198.
2. Flinch-threshold brute. Why: only a hit that clears the creature's pushed value makes it flinch (hit stance and a stun counter). Keep: threshold relative to the creature. Change: a tier list of stagger levels, not one value. Ref: Mob.cpp line 567 (flinch gate), line 44 (pushed read from data), line 570 (stun set).
3. Fade-out shade. Why: a death mode that fades instead of playing a die clip. Keep: the kill mode is chosen by a code (instant, die clip, fade). Change: our default is a dissolve with a respawn ring. Ref: Mob.cpp lines 393-407 (kill switch: case 1 at 400, case 2 at 405-406).
4. Flying mob. Why: a flyer swaps stand and move to its fly clip, so no ground logic runs for it (no edge turn). Keep: the clip swap. Change: flyers hover in a band. Ref: Mob.cpp lines 60-62; line 192 is skipped for canfly.
5. Touch crawler. Why: a body-attack mob hits by touch for 80 to 100 percent of its watk value. Keep: a touch damage range read from the creature's own value. Change: our telegraphed touch with a wind-up. Ref: Mob.cpp line 47 (touchdamage flag), line 582 (minattack from watk * 0.8).

## 2. Classes / races / factions
- Class records in the box: 0 named classes (job names come from NX, absent). Race records: none. Faction records: none.
- Job tiers (code, Character/Job.h and Character/Job.cpp): five levels, BEGINNER, FIRST, SECOND, THIRD, FOURTH. The tier is decided by the numeric job id: 0 is BEGINNER; a value ending in 00 is FIRST; ending in 0 is SECOND; ending in 1 is THIRD; anything else is FOURTH (the tier tests are at Job.cpp lines 39 and 43). Advancement order: BEGINNER to FIRST to SECOND to THIRD to FOURTH (Job.h get_next_level).
- Skill ownership: a skill belongs to a job when the skill id divided by 10000 matches one of the job's sub-job ids (Job.cpp line 64, can_use).
- Progression shape: tier by advancement, skill gate by id prefix. The skill tree itself is NX (JobData.cpp reads the skill list per job from NX; absent).
- Progression rule worth keeping: one number tells you the tier, another tells you what you may use.

## 3. Weapons
- Families: 17 entries in the weapon category enum (Character/Inventory/Weapon.h lines 26-45): sword 1H, axe 1H, mace 1H, dagger, wand, staff, sword 2H, axe 2H, mace 2H, spear, polearm, bow, crossbow, claw, knuckle, gun, and cash (170). Item records are NX (absent), so no tiers or stats are in the box.
- Category code is the equip id divided by 10000 (Data/WeaponData.cpp line 28).
- Two-handed flag (WeaponData.cpp line 30): staff, sword 2H to polearm (range 140 to 144), and crossbow. Bow (145) is NOT in that rule (see possible defects).
- Special properties (elemental, set bonus): none in the box.
- Visually distinct tiers: not in the box (equip looks come from NX).
- Top 5 striking (from the enum and the two-handed rule only; looks not read):
1. Polearm reach (two-handed, range 144). Why: a long, readable two-handed silhouette. Keep: category-level reach. Change: our own polearm model and a longer wind-up.
2. Crossbow (146). Why: a two-handed ranged silhouette that is different from the bow. Keep: the two-handed ranged rule. Change: a reload beat.
3. Staff (138). Why: a two-handed magic silhouette. Keep: the two-handed magic rule. Change: our own orb glow.
4. Dagger (133). Why: a one-handed category (not in the two-handed rule), so it sits apart from the long two-handed silhouettes. Keep: the one-handed category. Change: our own twin-blade read.
5. Cash category (170). Why: a separate category for premium items (only the enum, no data). Keep: a separate category id range. Change: our cosmetics store lane (if we ever have one).

## 4. Armour / gear
- Gear sets: 0 (no equipment records in the box; equip data is NX).
- Gear tiers: not in the box. Equip slots and the equip-id prefix rule are read only as far as the weapon category (section 3).
- Material look: not in the box.
- Top 5 striking: not applicable (no gear data).

## 5. Zones / dungeons
- Zone records in the box: 0 (map data is NX, absent).
- Zone data fields the loader reads (Gameplay/MapleMap/MapInfo.cpp): background music path (line 37), cloud flag, field limit value, hide-minimap flag (line 43), map mark, swim flag, town flag, seat list, ladder and rope list, and walls and borders from VR bounds (line 28 for walls). Meaning of each value is not in the box.
- Biomes, dungeon archetypes and hazards: not in the box.
- Top 5 striking: not applicable (no zone records). The field list is the zone-as-data shape worth copying.

## 6. Item / effect looks worth recreating
- Stacked damage numbers (Gameplay/Combat/DamageNumber.cpp and Combat.cpp).
  - Layout: each digit has an advance from a fixed table (lines 129-160 region, getadvance); the first digit adds a bonus, and critical digits add more (the switch starts at line 146; critical adds 8 on the first digit and 4 on the rest). Between digits the advance is the average of the two neighbours (lines 58, 114-116). The whole string is shifted left by half its total width (line 68).
  - Bob: every second digit sits 2 px off the baseline (line 106).
  - Rise and fade: a fixed upward speed per update (line 78); opacity starts at 1.5 (line 79) and loses a fixed step per update (lines 181-182). With the 8 ms step (Constants.h line 29) and a 500 unit fade (DamageNumber.h line 53), it takes about 94 updates, about 0.75 s if each update is 8 ms (my arithmetic, not a stated value).
  - Critical rows are 36 px tall, normal rows 30 px (line 189). Hits stack upward from the head position: each row steps by the row height (Combat.cpp line 397). Each hit has its own attack delay (Combat.cpp lines 369-375).
  - Three charsets: normal, critical, and a top-layer colour; a miss draws an M glyph (line 72).
- Afterimage trail (Character/Look/Afterimage.cpp).
  - Draws only from a frame key on (line 65): a frame gate, not a timer. The first frame is taken from the animation data (lines 45-53; line 52 sets firstframe). See possible defects.
- Stance clips (Mob.cpp line 73, die1 clip; line 72, hit1 clip): a creature is a set of named clips selected by one stance value.
- Named UI sound table (Audio/Audio.cpp line 77 onward): UI sounds are fetched by name from one UI group (22 registrations, UI, Game and Item groups; line 79 for the first).
- Map flags: hide minimap (line 43), walls and borders (lines 28-29).
- Not read: Graphics/ (GraphicsGL, Sprite, Animation bodies), EffectLayer, Text, SpecialText; shader code (none in the repo).

## 7. Inspiration for Frankendom (originals, our names, shape-only)
Each item names the parity row from the Lead ruling (rows 1-23).
1. Stacked Sparks (row 14 HUD, row 10 hit impact). Damage digits laid out with averaged neighbour advances, a 2 px bob on alternate digits, critical rows taller, and multi-hit numbers stacked upward from the head. Keep: the layout rule and the stacking. Change: our own font, our crit colour, a 0.75 s rise and fade of our own tuning. Fix in our build: step the stack by the next row's height, not the current row's (see defects).
2. Flinch Threshold (row 10 hit impact, row 4 fight loop). A hit makes the creature flinch only when it clears the creature's own pushed value, and a flinch is cancelled by a turn at an edge. Keep: the threshold read from the creature's data. Change: a tiered stagger list; our own hit-stun clip.
3. Edge Patroller (row 7 creature actor, row 23 spawn idle). A ground creature turns once per edge; a stunned creature turning at an edge drops out of its flinch. Keep: the once-per-edge gate and the flinch cancel. Change: a look-around beat at the edge.
4. Tier Gate by Id (row 21 catalogue fields, row 13 specials). A tier comes from one numeric job id and skills are gated by an integer division of the skill id. Keep: id-encoded tiers and the id-prefix skill gate. Change: an explicit tier table in our data instead of digit tricks (the id-ends-in-1 rule is fragile).
5. Three Deaths (row 17 death and respawn). The kill mode is chosen by a code: instant removal, die clip then the dead flag at clip end, or a fade. Keep: the presentation is a per-kill choice, and the dead flag waits for the clip to end. Change: our default is a dissolve with a respawn ring.
6. Frame-Gated Trail (row 6 hero actor, row 9 finishers). A trail that starts drawing at a frame key from the animation data, not a timer. Keep: the frame gate. Change: take the lowest frame key as the start (see defects).

## Possible defects (keep the idea, fix the defect)
- Afterimage.cpp lines 45-53: the loop sets firstframe on every numeric key (line 52), so the LAST key in the iteration order wins. If the animation keys are in ascending order, the trail starts at the highest frame. The audit cited line 47, which is not the assignment. Idea kept (frame-gated trail). Fix: take the minimum key. Confidence: medium (runtime key order not checked).
- Combat.cpp line 397: place_numbers steps the head by the CURRENT row's height, so a normal row followed by a critical row steps 30 px, not 36. Idea kept (stacked rows). Fix: step by the next row's height, or use one fixed row height. Confidence: high on the code, low visual impact.
- WeaponData.cpp line 30: bow (145) is not in the two-handed rule. Idea kept (two-handed flag). Fix: confirm against the NX item data and add 145 if bows are two-handed in the data. Confidence: medium (NX data not in the box).
- DamageNumber: FADE_TIME (500) is not the effective fade time, because opacity starts at 1.5 (line 79). Idea kept (over-full start to hold the number readable). Fix: rename the constant or document the effective duration.

## Not read / unexpected
- Not read: Net/ packet code (64 files), IO/ UI code (142 files), Gameplay/Physics bodies (listed only), most of MapleMap (except Mob, MapMobs, MapInfo), Character/Look and Inventory logic beyond Afterimage and Weapon.h, Graphics/ bodies, includes/NoLifeNx, includes/bass24 licence text (bass.txt), includes/freetype full licence text, all NX files (absent), Data/*.cpp bodies beyond the JobData constructor and the WeaponData constructor and the ItemData header.
- Unexpected: the README calls this the "continued Journey MMORPG client" in the code header, and the server half is a separate project that is not in the box. Spawns are server-driven: MapMobs.cpp (line 49) adds a mob from a server spawn queue, reactivates an existing one, or sets its control mode. The spawn caps, respawn timers and despawn grace are therefore NOT in this client (parity row 23 engine logic lives on the server side, not here).
- Not located: idle animation vocabulary beyond the stance clips; zone or biome records; drop ceremony; loot rarity colours; minimap and world map code; touch UX; accessibility.
- Frankendom fold-ins: sound-music (only the named UI table shape is in the box; no sound files), progression (job tiers only; no talents or achievements), loot (not read), spawn walk density (server, not in box), readability at 375 wide (not read).

## Files
- Receipts: /private/tmp/p2/wave2-haiku/batch3/DC047/receipts.tsv (rows with note M, all verified).
- Donor files are on the VPS under /mnt/frankendom-donors/ryantpayton-MapleStory-Client/.
