# Reinisch-Warcraft-Arena-Unity (catalogue, DC047)

Donor: /mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity (VPS, read-only). Asset audit read first: AU045 (Reinisch-Warcraft-Arena-Unity.assets.md).
Paths below without a prefix are under Assets/ (for example Settings/..., Scripts/..., Rendering/...).
Licence (as the files say): code is the Unlicense (LICENSE line 1). Zenject is bundled under MIT (per AU045). Models, textures and sounds: README line 154 says they are copyrighted by Blizzard Entertainment, and the project calls itself a non-commercial, educational fan project. The owner of UI art, VFX, balance data and localisation is not stated.
Class for inspiration: C (assets). Inspiration stays CATEGORY-LEVEL (for example "a three-phase giant boss", "a ring hazard"), never an instance-level look. This is a design read, not legal advice.
Checked: 18 receipts (note R) in receipts.tsv, all verified against the VPS quotes by verify_receipts.py (the file also holds 41 MapleStory rows, all verified). Confidence: high on the boss graph, the six Bossfight action scripts read in full or most of the way (named below) and the balance records named below. Lower on anything listed under "Not read".

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Each entry names the trait KEPT and the trait CHANGED.

## Halves read (the pair is named; "absent" is never used for an unread half)
- Client half: Scripts/Client, 249 .cs files. Read: Client/Scenario/Behavior Graph/Actions/Bossfight (9 files listed; MeteorMazeAction, MeteorCorridorAction, RainOfStarsAction, DieBeamAction, DieBeamCloneAction and ActivateRandomWeakPoint read in full or most of the way). Not read: MeteorMazeActionSettings, MeteorCorridorActionSettings and PlayUnitSound bodies, and the rest of Client (UI, Effects, Sound, Input, Net).
- Server half: Scripts/Server, 5 .cs files. Listed only, not opened. Paired with the Client half in the same Unity project (no separate pair in the box).
- Core half: Scripts/Core, 371 .cs files. Not opened as code. Used only through the boss graph's node types and the balance records.
- Data pack: Settings (balance records and AI graphs). Read: Balance file names and counts; Units/Creatures and Units/Attributes (Ragnaros, Default Player); Classes (headers and two bodies); Maps (headers); AI/Unit/Behaviour Graphs (Ragnaros graph: node-type counts and blackboard values); AI/Map Scenario/Definitions (names). Spell records: names and counts only, bodies not read.
- Localisation and Audio: folder listing and names only (AU045 counts). No strings read.

## 1. Creatures / beasts
Counts: 4 creature-info records (Ragnaros, Steam Tank, Super Zombie, Wooden Dummy). Plus 1 vehicle record with 4 seat records. Plus two model-only transform forms (Sheep, Druid Cat) that come from spells, not creature records.

Families and tiers:
- Boss (one): the Ragnaros creature record. The boss graph (Settings/AI/Unit/Behaviour Graphs/Ragnaros Bossfight - Behaviour Graph.asset) has "Phase 1" to "Phase 4" text labels, and HP-ratio gates at 75, 50 and 25 percent (blackboard values, lines 8402-8424). The graph uses 6 "health ratio above" and 2 "health ratio below" condition nodes. Escalation is by phase: more weak points open per phase, and the attack set changes.
- Name mismatch: README line 18 features a Sirus boss, but no Sirus creature record exists (the only Sirus items are three voice files, Audio/Characters/Sirus/Sirus_Phase1-3.ogg). The graph is for the other boss.
- Summoned copies: "Die Beam Clone" copies that use the boss kit (DieBeamCloneAction.cs). The clones are real Creature units that rotate to face the target and then cast a beam together.
- Vehicle: Steam Tank (Settings/Balance/Units/Vehicles/Steam Tank/). One vehicle record, four seats (driver, gunner, two passengers).
- Other creatures: Super Zombie (record only); Wooden Dummy (record only; the dummies are also test scenario rigs).
- Transform forms: Sheep (polymorph: Rendering/Characters/Sheep; Settings/Balance/Spells/Polymorph Spell.asset, duration not read) and Druid Cat (Rendering/Characters/Druid Cat; Cat Form in the spell list).

Signature abilities (one line each, from the Bossfight scripts read and the spell file names):
- Meteor Maze: teleports the player to a random anchor, spawns maze rings one at a time with a sound for each, and drops a meteor when the player escapes the ring band or time runs out.
- Meteor Corridor: teleports the player into a corridor, pulls the camera to look at the anchor, fires a timed list of meteor attacks, and ends when the player leaves the band (a dot test on the forward vector, plus a min/max distance band).
- Rain of Stars: rings of impact points around the nearest alive player; impacts sorted by distance rank, with launch height ramping near to far, each on a random delay.
- Die Beam: warning sound, then one beam at the nearest alive player after a short wait.
- Die Beam Clone: spawns clones in a distance band around the player (preferred band first); the clones turn to face the player during the warning, then all fire.
- Slam: three chained records (slam, arrival impact, shockwave) so each beat can be tuned alone.
- Flame Strike: a spell record with an explosion companion record. Pyroblast: a boss spell record.
- Weak points: ActivateRandomWeakPoint picks N inactive weak-point hit boxes at random and gives them a damage limit and a damage multiplier. The graph calls the per-phase set "Phase Weakpoints".

Top 8 most striking (labels are ours):
1. Ember Colossus (the boss). Why: a readable giant with a phase ladder and weak points that open per phase; the name plate is scaled up (nameplateSizeModifier 3). Keep: HP-gated phases, telegraph-then-strike cadence, per-phase weak-point windows. Change: body, palette and element; not a lava-giant silhouette. Ref: Settings/AI/Unit/Behaviour Graphs/Ragnaros Bossfight - Behaviour Graph.asset line 257 (phase labels); Settings/Balance/Units/Creatures/Creature Info - Ragnaros.asset line 21.
2. Ring Snare (Meteor Maze). Why: a floor trap that states its escape rule before it fires. Keep: rings appear one at a time with a sound each; escape timer; a meteor on failure. Change: rising tide lines and a dune marker as the escape goal, not a meteor. Ref: Scripts/Client/Scenario/Behavior Graph/Actions/Bossfight/MeteorMazeAction.cs line 127 (escape test).
3. Echo Doubles (Die Beam Clones). Why: copies that read as threats before they fire, with a turn-to-face warning. Keep: spawn in a band around the target, turn during the warning, shared fire. Change: at most two echoes, staggered fire, and they fade in. Ref: Scripts/Client/Scenario/Behavior Graph/Actions/Bossfight/DieBeamCloneAction.cs lines 102 and 150.
4. Starfall Scatter (Rain of Stars). Why: a ring-shaped scatter that gives a clear outer-then-inner read. Keep: radial rings around the nearest player; near impacts first. Change: slow glyph pulses with a lock delay, not falling meteors, no fire. Ref: Scripts/Client/Scenario/Behavior Graph/Actions/Bossfight/RainOfStarsAction.cs lines 104 and 119.
5. Three-Beat Slam. Why: one attack that reads as three beats, each tunable alone. Keep: three chained records. Change: our own wind-up, stomp and ripple; no fire. Ref: Settings/Balance/Spells/Boss/Ragnaros Slam Spell.asset, Ragnaros Slam Shockwave Spell.asset, Ragnaros Slam Shockwave Arrival Spell.asset (names only).
6. Siege Tank (Steam Tank). Why: a vehicle with four named seat roles is a big, clear silhouette at 375 wide. Keep: the seat roles (driver, gunner, passengers). Change: our own mount with one gunner seat and one passenger seat. Ref: Settings/Balance/Units/Vehicles/Steam Tank/Vehicle Info - Steam Tank.asset; Vehicle Seat Info files (names only).
7. Critter Shift (Sheep). Why: a model swap as a status makes a dangerous target small and harmless for a moment. Keep: timed model swap as a status. Change: our own critter and tint; a visible timer on the health bar. Ref: Settings/Balance/Spells/Polymorph Spell.asset (record exists, body not read); Rendering/Characters/Sheep.
8. Weak-Point Shell (ActivateRandomWeakPoint). Why: plates that light up in a random subset read as a puzzle during the fight. Keep: random subset per phase, a damage limit and multiplier on open plates. Change: a visible glow pattern, and plates that close again. Ref: Scripts/Client/Scenario/Behavior Graph/Actions/Bossfight/ActivateRandomWeakPoint.cs line 48.

Timing (structure only, numbers not copied): the boss graph uses random wait windows between attacks, separate windows after the beam, the rain and the flame strike, and a longer window for a full attack sequence (Ragnaros Bossfight graph, blackboard values about lines 140-230).

## 2. Classes / races / factions
- Class records: 12 (Settings/Balance/Classes/Class Info - *.asset). Race records: none in the box. Faction records: 4 (Horde, Alliance, Neutrals, Friends).
- Mage: power types present; spell list present (about 40 references by grep, not parsed). The README calls it a World of Warcraft mage kit grouped fire, frost, arcane and support. Mechanic: held ice states (Frost Nova state, Ice Block) plus a proc (Hot Streak). Progression: none found in the box.
- Druid: power types present; spell list present (about 40 references, not parsed). Mechanic: shape-shift form (Cat Form) and finisher spells (Ferocious Bite, Rip) with a per-resource-consumed modifier. The resource is combo points by file name; not checked in the power record body.
- Warrior: power type present; the spell list is EMPTY in the data (Class Info - Warrior.asset line 21). The class is incomplete in this box.
- Nine other classes (Death Knight, Demon Hunter, Hunter, Monk, Paladin, Priest, Rogue, Shaman, Warlock): record present; power list empty (powerTypes: []); spell list not read.
- Power types (4): Mana, Rage, Energy, Combo Points. Shape: each resource has a base range and a total cap (Settings/Balance/Powers/Spell Power Type Info - Rage.asset has the base and total fields).
- Progression shape: none found in the box (no level or talent records). Not read: the player class logic in Scripts/Core/Entity/Player/Classes.

## 3. Weapons
- Families and tiers: none in the box. No weapon or item records. Arena damage comes from spells, so the closest thing is the projectile records.
- Projectiles (names only): Pyro Shot, Pyro Corridor Shot, and Die Beam (beam and shot), each with launch-info and projectile-info records (Settings/Balance/Projectiles/).
- Visually distinct tiers: not applicable.
- Top 5 striking: not applicable (0 weapon records). The projectile pairs are listed under section 6.

## 4. Armour / gear
- Gear sets: 0. Gear tiers: none. No equipment records.
- Material look: not applicable. The one tier-like pattern is the power resource (section 2).
- Top 5 striking: not applicable.

## 5. Zones / dungeons
- Counts: 12 scenario definitions (Settings/AI/Map Scenario/Definitions): Arena 1v1, 2v2, 3v3, 5v5; Boss; Sandbox; six TestDummy rigs (2 to 7). 7 map-definition records (Settings/Balance/Maps), all named Lordaeron. The 7 map definitions are lobby and footprint data, not 7 biomes.
- Biome list: one (Lordaeron) in the box.
- Dungeon archetypes: the scripted boss arena (one arena with timed hazards), the arena duel (scenario), the sandbox (free play), and the test-dummy rig (tuning).
- Hazards: meteor maze, meteor corridor, rain of stars, die beam and clones, flame strike, slam.
- Top 5 striking:
1. Boss arena. Why: one scripted arena with a phase ladder and a rotating hazard set. Keep: phases and hazard rotation. Change: our own arena shape. Ref: Settings/AI/Map Scenario/Definitions/Scenario Definition - Lordaeron - Boss.asset (name only); Settings/AI/Map Scenario/Scenario - Bossfight - Graph.asset.
2. Ring Snare arena. Why: a floor puzzle that is clearly read. Keep: anchor, rings, escape band. Change: tide lines. Ref: Settings/Balance/Spells/Scripted/MeteorMaze_LvL 1.asset line 15 (MazeRingEffects list).
3. Corridor run. Why: a directed set piece that moves the camera. Keep: escape band with a forward test, and a camera look-at on the anchor. Change: side walls, and a single camera pull. Ref: Scripts/Client/Scenario/Behavior Graph/Actions/Bossfight/MeteorCorridorAction.cs lines 129-130 (escape race) and the LookAt call in UpdateAsync.
4. Echo ring arena. Why: copies placed in a band around the player. Keep: band placement. Change: fewer echoes, staggered. Ref: DieBeamCloneAction.cs line 102.
5. Training rig. Why: six test-dummy scenarios give a tuning lane for each hazard. Keep: a rig per hazard. Change: our own rigs in the Pit. Ref: Settings/AI/Map Scenario/Definitions/Scenario Definition - Lordaeron - TestDummy 2.asset to TestDummy 7.asset (names only).

## 6. Item / effect looks worth recreating
- Frost held state vs burst: Rendering/Spell Visuals/Frost Nova State (held overlay) and Frost Nova (burst) are separate folders. Technique: a held overlay on the silhouette, separate from a one-shot burst.
- Ring telegraph: Settings/Balance/Spells/Scripted/MeteorMaze_LvL 1.asset line 15 (a list of ring effects, each placed at the anchor with a random yaw). Technique: a data list of ring effects sets the whole pattern.
- Spell visuals: 12 effect folders in Rendering/Spell Visuals (Amber, Beam, Cone of Cold, Deep Freeze, Frost Bolt, Frost Nova, Frost Nova State, Ice Barrier, Ice Block, Ice Lance, Living Bomb Area, Pyroblast).
- Shaders: 17 .shader files and 7 .shadergraph files across Assets (counted on the VPS; bodies not read).
- Boss sound: 74 Spell Sound Info records (Settings/Sound/Spell Sound Infos), including boss Meteor Maze 1 to 3 with explosions, Flame Strike and Pyroblast. Audio/Characters/Sirus has three phase lines.
- Weak-point glow: ActivateRandomWeakPoint.cs (activate on plates with a damage limit).
- Camera set piece: MeteorCorridorAction.cs (camera look-at on the anchor).
- Boss scale: nameplate scale 3 on the boss record (Settings/Balance/Units/Creatures/Creature Info - Ragnaros.asset line 21).
- Not read: shader code, particle prefabs, ring effect prefabs.

## 7. Inspiration for Frankendom (originals, our names, mood-only resemblance)
Each item names the parity row from the Lead ruling (rows 1-23).
1. Tide Ring Snare (row 13 specials, row 23 zone set piece). A floor trap of rings that appear one by one with a sound each, then a timed escape. Keep: telegraph before it fires; one escape rule per ring set. Change: rising tide lines; escape by reaching a dune marker; no meteor.
2. Starfall Scatter (row 13). Radial rings of slow glyph pulses around the nearest player, near impacts first. Keep: the ring read and the near-first order. Change: a lock delay; glyphs, not meteors; no fire.
3. Echo Doubles (row 7 creature actor, row 13). Up to two copies placed in a band around the target, turning to face it during the warning, firing staggered. Keep: placement band, turn-during-warning, shared fire. Change: copies fade in; staggered fire.
4. Ward Phases (row 4 fight loop, row 13). A giant with phase gates at three HP thresholds and weak-point plates that open per phase with a damage cap. Keep: the gate ladder and the per-phase weak-point window. Change: gates on ward stones as well as HP; our own body.
5. Critter Shift (row 7 creature actor, row 13). A timed model swap as a status, with a timer on the health bar. Keep: the swap as a held state. Change: our own critter and tint.
6. Corridor Pull (row 11 fight camera, row 23). A directed run with an escape band (forward test plus min and max distance) and one camera look-at on the anchor. Keep: the escape band and the single camera pull. Change: side walls; no repeated pulls.

## Possible defects (keep the idea, fix the defect)
- DieBeamCloneAction.cs line 194 picks the second-nearest location when no preferred band spot exists. Idea kept (spawn near the target, not on it). Fix: pick the nearest valid spot, or make the second-nearest an explicit setting. Confidence: medium (it may be deliberate).
- DieBeamCloneAction.cs sets ClassType.Warrior for every clone (clone creation block, lines around 117-125; the exact line was not receipted). Fix: take the class from the creature data.

## Not read / unexpected
- Not read: Server scripts (5 files), most Client and Core scripts, animation and localisation bodies, spell record bodies (except names), shader bodies, prefab bodies, audio, binary art, Packages and ProjectSettings.
- Unexpected: the README features a Sirus boss, but the boss graph and records are for the other boss, and no Sirus creature record exists. Grep for Sirus in Scripts found no match (AU045).
- Not located: death and respawn presentation. A self-resurrect AI and state machine exist by file name (Settings/AI/Unit/Unit AI Info - Self Resurrecting Player AI.asset; State Machine Animators/Self Resurrecting), not read. Idle animation vocabulary: 113 .anim files per AU045, not read.
- Frankendom fold-ins not covered by reading: minimap and world map, touch UX, stingers and biome beds (only the Soundtrack sound group name and one PlaySoundTrack node were seen), spawn walk density.

## Files
- Receipts: /private/tmp/p2/wave2-haiku/batch3/DC047/receipts.tsv (rows with note R, all verified).
- Donor files are on the VPS under /mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity/.
