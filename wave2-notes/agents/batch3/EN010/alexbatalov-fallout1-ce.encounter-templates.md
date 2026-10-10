# alexbatalov-fallout1-ce (encounter-templates, cell EN010)

Donor: alexbatalov-fallout1-ce, a fan re-implementation of the first isometric RPG (C, src/ on the VPS at /mnt/frankendom-donors/alexbatalov-fallout1-ce/).
Licence: Sustainable Use License 1.0 (LICENSE.md line 1). Line 15 limits use to internal business or non-commercial or personal use. Ideas and shape only for us. No code, no constants and no data copied.
Verdict: PARTIAL (the world-map walk roll and the rare-event gate were read in full; the encounter groups, formations and data are not in this half). Decision: adapt (idea), with the defect fixed in the sketch.
Checked: read src/game/worldmap.cc walk and roll loop (1420-1680), tables (250-340), encounter map names (497-530), map loading for encounters (2090-2160), travel to a town and the day constant (3670-3735), the timed-event check (2440-2500); src/game/worldmap.h 107-110. Grep of src/ for ambush, lair, escort and camp gave one hit, a debug string in the world map (2488), which is a timed event not an encounter. Confidence high on the order of operations and on the shared-counter defect; medium on the play feel, which is not measured.
Best transferable idea: a walk roll on a fixed step count that a survival stat stretches, plus a stat-gated rare event that each character can only get once per save.

Half read: engine only (src/game/worldmap.cc and worldmap.h). Data pack (master.dat, critter.dat, data folder, including the encounter map files and the message text) is not in the box, so the map contents and the encounter groups are not read. Sibling donor alexbatalov-fallout2-ce has the richer encounter pipeline (formations, telegraph, detection); read its note first for shapes.

## 1. What the player sees and feels (375 wide)
On the world map most of the walk is quiet. The walk rolls for an encounter once every block of steps, and the block gets longer as the survival skill rises (so a skilled walker meets fewer encounters per distance). When an encounter comes, the scene drops into one of a few small map scenes for that terrain (desert, mountain, city, coast). A rarer special scene can replace it, and each special can appear only once in a save. Walking to a known town by the automatic travel does not roll for encounters at all, so the long, safe walk is a real choice.

## 2. Why it works and why it is striking
- Readable at 375: the decision is made on the step count, so the player learns the rhythm of the walk rather than a number.
- One signature behaviour: a rare special that is gated by a stat sum and can happen only once per save.
- One signature sound or effect: none seen in the roll lines read (1561-1620). Sound layer not read.
- Could be made ours at 20-30 percent resemblance: yes. The fixed-step roll, the stat-stretched interval and the once-only specials carry over; the donor's scenes and text do not.

## 3. The rule behind it
Read in order (src/game/worldmap.cc):
1. Each walk step adds one to a mile counter (1562). When it reaches the day block size, it resets, the roll runs and the party heals a day's rest on the way (1562-1565, 3708-3712 in the travel loop).
2. Block size: 60 plus 60 times the survival skill divided by 100 (capped at 100). Game time per step is the day constant (864000 ticks) divided by the block size (3729-3730). The Pathfinder perk shortens the time per step (3733). So one roll is about one game day of walking at any skill (arithmetic; the day constant's definition in this half not read, but the sibling donor defines the same value at scripts.h 21).
3. Chance roll: the cell's chance class (four classes, from a 30 by 28 table of 840 cells; class counts 29, 215, 502 and 94) sets a three-dice threshold (1572-1587). Roll under the threshold means an encounter. Arithmetic for the thresholds used: about 5, 9, 26 and 38 percent. No town means no roll (1570 is inside the not-in-town check).
4. Rare gate (1601-1603): only after an encounter is chosen, the code takes a three-dice sum, adds Luck and two per Explorer rank, subtracts five, and needs 18 or more to pass. With no Explorer that is a raw dice sum of 23 minus Luck or more. Arithmetic: about 0.5 percent of encounters at Luck 5, about 9 percent at Luck 8, about 26 percent at Luck 10.
5. Special pick (1609-1618): a d100 over six bands with widths 30, 20, 20, 10, 10 and 10 (SpclEncRange at 256). Each band can fire once per game (a six-bit mask, saved with the game; 63 means all used, after which only generic scenes fire). A used band re-runs the whole gate.
6. Map: a special scene, or one of the terrain's random scenes picked uniformly among those that exist (2099-2160). Terrain has 4 types; random scenes per terrain are 3, 2, 1 and 2 (8 in all); special scenes are 6.

Data fields (designer-tunable; donor values null under SUL):
| name | unit | donor_value |
|---|---|---|
| steps_per_roll_base | steps | null |
| steps_per_roll_skill_gain | steps per skill point | null |
| time_per_step | ticks (day divided by steps_per_roll) | null |
| chance_threshold_by_class | dice sum (class 0 to 3) | null |
| rare_gate_level | dice sum plus Luck plus 2 per Explorer | null |
| special_band_weights | percent (six bands) | null |
| special_once_per_save | bool per band | null |
| encounter_map_pick | uniform over existing scenes | null |

## 4. For Frankendom
- Walk density knob: keep a per-step counter with a stat-stretched interval (higher survival, fewer rolls). Our row 23 spawn logic can own it, with the interval as zone data.
- 700 zones as data: each zone or terrain class owns its scene list and its special list; the 100 Pit characters are reused across zones, never per-zone stat blocks.
- Rare specials: keep the stat-gated rare roll and the once-per-save band. In our ledger this is one row per character per special, server-verified.
- Auto-travel: keep "travel to a known waypoint rolls nothing" (time still passes, the roll does not run). This is cheap and reads well on a phone.
- Change: replace the three-dice threshold with a designer probability table, so the rare rate is set directly (a three-dice bell curve makes the tuning coarse). Use fixed server ticks instead of the step loop's frame timing.
- Defect (keep the idea, fix the defect): the special band loop uses the same counter as the movement loop. In src/game/worldmap.cc the movement loop is `while (v109 < 2)` at line 1426 and its step is `v109++` at 1639, and the special band loop is `for (v109 = 0; v109 < 6 && v142 == 0; v109++)` at 1609. After a special is chosen, the movement counter sits past its limit, so the second movement pass of that frame is skipped. Fix: a separate index variable for the band loop.

Sketch: not written for this cell. The encounter sketch in alexbatalov-fallout2-ce.encounter-templates.md (typechecked) covers the pick, the condition join and the walk gate that this donor's roll would sit under.

## 5. Five-minute look test (Dom, on his phone)
Flag: walk-density knob on the existing world walk. Preview only (/preview/, no release rows, no lock).
Build: a roll every N steps with N as a visible setting (60 and 120 for the test); each roll shows the existing encounter scene, with no telegraph.
Walk for three minutes at N=60, then three minutes at N=120. Judge: does a three-minute walk feel like the right number of meetings on a 375-wide screen, and does the slower setting feel empty?
Target file: origins/server/world-spawns.ts. Ruling row: 23 (zone population: spawn caps, respawn, despawn). The roll runs on the server; the scene is client-only.

## 6. Licence and IP
Code: Sustainable Use License 1.0 (LICENSE.md line 1). Line 15 limits use to internal business or non-commercial or personal use. Shape and mechanism only for us. The donor's scene names, special scene names and text are not used or quoted. No legal conclusion; this summarises the file.

## 7. Gaps
- Not read: the data pack (encounter map files, the messages, critter and item stats). Absent from the box.
- Not read: the encounter scene scripts and any encounter group; the formations and any ambush, camp, patrol, lair or escort shapes are not in this engine half (the grep found only the debug string at 2488, a timed event).
- Not read: the scripts that run inside scenes; the combat code; the sound layer.
- Half read: engine only. The sibling donor (alexbatalov-fallout2-ce) has the formations and the telegraph; its note covers them.
- Timed world event (the countdown that ends a world-map sequence, 2440-2500): a world event, not an encounter; not covered here.
- Idle and ambient, death and respawn, loot ceremony, boss staging: not read in this half.
- Walk density in seconds: not measurable from the code; the roll is in steps and game time.

Reuse tag: encounter-ambush (rare specials), walk-density, scheduler (step-count roll), fast-travel roll skip.
Brief rule served: depth on the mechanism, half stated, defect with a fix, look test named.
