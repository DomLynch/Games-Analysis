# ACEmulator-ACE (encounter-templates, EN005)

Donor: ACEmulator-ACE, an Asheron's Call server emulator in C#. Tree: /mnt/frankendom-donors/ACEmulator-ACE/ (VPS, read only).
Licence: GNU AGPLv3 (LICENSE, lines 1-2, as recorded in AU002). No licence line on the content SQL or the icons. Client DAT files are not in the box. Class C: shape only, category-level inspiration.

Checked: spawn-point code (Source/ACE.Server/Entity/Landblock.cs 269-330), generator system (Source/ACE.Server/WorldObjects/WorldObject_Generators.cs, all 707 lines read in order), generator profile (Source/ACE.Server/Entity/GeneratorProfile.cs 104-235, 352-354, 526-563), tunables (Source/ACE.Server/Managers/PropertyManager.cs 574, 651, 652), encounter model (Source/ACE.Database/Models/World/Encounter.cs 19-34), weenie names (Source/ACE.Server/Factories/Enum/WeenieClassName.cs, 41,884 names). Confidence: high on order of operations in the code I read. Medium on play feel: no encounter rows and no generator values are in the box, so nothing here was run.
Half read: server (code) and names. The data half (encounter rows, generator profile rows) is not in the box. The schema in Database/Base/WorldBase.sql is recorded in DC003 as CREATE TABLE only and was not re-read here.

## 1. What the player sees and feels
On a phone at 375 wide, the donor's outdoor encounters are fixed spawn points. Each point holds a small generator that keeps creatures near one cell of the landblock. When a member is killed or picked up, its slot stays empty for a set time, then the point refills near the same spot, so a cleared place stays a place and comes back as a gap, not a pop. A generator built to self-destruct disappears when its last member is gone. Buildings remove spawn points at load time, so the world does not fill walls or doorways. The weenie names show the shapes the designers used (camp, patrol, ambush). The creatures themselves are not in the box, so the look is not read.

## 2. Why it works, or is striking
- Readable at 375 wide: not read in game. The shapes are named in the enum: names ending campgen 438, campgen_xp 58, patrolgen 3, ambushgen 4, patrolcampgen_xp 1, lairgen 0, escortgen 0 (WeenieClassName.cs). Silhouette and threat colour are not in the box.
- One signature behaviour: a generator with automatic destruction removes itself when its count hits zero (WorldObject_Generators.cs 562-577). The flag comes from data that is not read.
- One signature sound or effect: none read (no sound or effect rows; EmoteManager.cs matched 'encounter' once and was not read).
- Could be made ours at 20-30 percent resemblance: yes. The rule "refill after a delay from the same cell; the site dies with its last member" is clean and needs no creature data.

## 3. The rule behind it
Order of operations as the code does it:
a. Landblock load (Landblock.cs 269-330, run in a Task): for each encounter row of this landblock, create the weenie, place it at cell_x * 24 and cell_y * 24, clamped 0.5 to 191.5 (line 282), adjust to outside, destroy it if the cell has a building (line 295).
b. Global override, off by default (line 301): when on, every profile's regen interval becomes the global encounter_regen_interval and every profile's delay becomes encounter_delay (lines 303, 322). This flattens per-point data.
c. Generator tick (WorldObject_Generators.cs 655-687): roll one profile against the total of the cumulative probabilities of profiles that are not maxed and are available (line 120); a probability of -1 means always spawn (lines 157, 193).
d. Spawns are queued with the time they were queued and spawn on the next heartbeat once that time has passed (GeneratorProfile.cs 173-198). Scatter inside the generator radius (line 354).
e. When a member leaves by the profile's WhenCreate event, the profile is unavailable for Delay seconds (GeneratorProfile.cs 563). Delay is 0 for a chest; otherwise the profile's delay, falling back to profile 0 (lines 110-113).
f. When the count reaches zero and automatic destruction is set, the generator destroys itself (WorldObject_Generators.cs 572-576). No grace timer.

Designer-tunable fields are listed in the JSON file (data_fields). Donor values are not copied (AGPL code).

## 4. For Frankendom
- 700 zones as data: an encounter row becomes a zone-data spawn point. Keep the fixed cell per point. Move the building rule into the zone data as a no-spawn flag per cell, not a runtime lookup.
- 100 Pit characters reused across zones: a profile holds a list of creature ids drawn from the catalogue, so one shape serves many zones.
- Many-vs-one: a camp of up to 3 members fits MAX_ATTACKERS = 3. ACE has no attacker cap; the cap must come from our engine.
- Server-verified: ACE spawns from a background Task and an action queue at landblock load. Keep the queue idea (spawn happens on the server tick). Change: one activation point per zone, not a background task.
- Row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer, engine logic in origins/server/world-spawns.ts): caps = profile max_create; respawn = profile delay; despawn on empty = automatic destruction. ACE has no grace timer on destruction. Add one (data field: grace_s).
- Row 17 (death and respawn): a slot freed by death starts the profile delay. This is the clean rule for our respawn.

## 5. Five-minute look test (Dom, on a phone)
Build one sandbox zone with three camp points (three members, one leader each), two patrol points, and one self-destructing camp. Set respawn to 60 s and grace to 10 s for the first pass; 300 s for the second. Dom walks it for five minutes at 375 wide and judges: does a camp read as one group; does a cleared camp show a visible gap, not a pop; does an emptied camp leave cleanly. These are our test values, not donor values.

## 6. Licence and IP
AGPLv3 code: clean-room, shape only. No art, sound or content is used. Do not copy the weenie names; use our own shape words (camp, watch, ambush). Donor README (line 19, as recorded in AU002) says the project is for educational and non-commercial use. No legal conclusion is drawn here.

## 7. Gaps and half read
- Not read: encounter rows and generator profile rows (not in the box); WorldBase.sql encounter table (schema only per DC003, not re-read); VerifyWalkableSlope (GeneratorProfile.cs 438-462) and placement in Spawn (236-320); EmoteManager idle emotes; corpse decay; loot reveal; sound and effects.
- Walk density: not measurable. The rows that set it are not in the box. The mechanism: one spawn point per encounter row, refill after the profile delay, default encounter_regen_interval 600 s and encounter_delay 1800 s when the override is on (PropertyManager 651-652).
- Idle and ambient behaviour: not read.
- Death and respawn presentation: the timing rule above only. The client-side death view was not read.
- Readability at 375 wide: not measured (no creature rows).

Best transferable idea: a spawn point is a slot that refills from the same cell after a delay, and the site disappears when its group is wiped out.
Reuse tag: not checked against other lanes (FEEL reader, no repo search).
Brief rule served: encounter-templates feel note, walk density, row 23.
