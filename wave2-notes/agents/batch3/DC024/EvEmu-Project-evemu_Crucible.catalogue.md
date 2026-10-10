# EvEmu-Project-evemu_Crucible (design catalogue, cell DC024)

Donor: /mnt/frankendom-donors/EvEmu-Project-evemu_Crucible (a server emulator for a space MMO; the README calls it an educational project and says it is not for public servers).
Licence: code is LGPL-3.0 per the README licence block, but file headers conflict (LGPL-2-or-later, LGPL-2.1, plain GPL in one dependency). Data: the sql/base tables are game-derived dumps with no licence line, and a developer note cites a data dump as its source. Audit AU019 rates this class C.
Class C rule applied: inspiration stays category-level. No names, stat values, table rows, art codes or lore are copied. Recreate as clearly distinct originals only, 20-30 percent resemblance in mood only. Not legal advice.

## Halves read
- Server half: partly read. src/eve-server/npc: the state enums (NPCAI.h, SentryAI.h, DroneAI.h) and the signalling, target-lost and attack-gate code (NPCAI.cpp 533-548 and 660-690, plus grep hits elsewhere in the file). Folder listings only for dungeon, effects, fleet, missions, exploration, faction, standing.
- Data half: schema read for the dungeon editor, wormhole and skill migrations; sql/base read by file name and family count only (284 gzipped files, no bodies).
- Client half: not in the box.
- Paired half in the box: none. The EVE client is absent, so client-side ideas cannot be checked against code.

## Counts (what they mean)
- creatures: 6 NPC families by source file (NPC base, sentry, drone, security-patrol class, civilian, sleeper). Only the first three have their state sets read.
- classes: null. Race and career skill tables exist; their count was not recovered.
- weapons: 11 attribute families. Turrets, missiles, drones, plus eight electronic-warfare families, from the attribute category table in the effect note. These are families of module, not counted items.
- gear_sets: null (not counted).
- zones: 10 dungeon archetypes from the dungeon editor migration (rows of one INSERT; ids 1-10).

## 1. Creatures and NPC families (category level)
NPC families (src/eve-server/npc):
- NPC base AI: one state set with eight states: idle, chasing, following, engaged, fleeing, signalling, warp-out, warp-follow (NPCAI.h, state enum around lines 40-46).
- Sentry guardian: three states, idle, engaged, signalling (SentryAI.h:19-25).
- Drone swarm: about ten states, including approaching, pursuit, departing, fleeing and engaged; numbering follows the client (DroneAI.h:18-32).
- Security-patrol NPC class: exists; large source, not read beyond its name.
- Civilian traffic: a stub; the donor's TODO describes non-combatants moving point to point (not built).
- Dormant sleeper: a header stub; the name suggests a waking guardian, behaviour not read.

Top 8 most striking:
1. Pack-caller guardian. A guardian that switches to a call-for-help state while engaged, so a fight spreads through an area. Keep: three states, the call as its own state. Change: our call radius, who answers, a visible wind-up, a cooldown. Ref: src/eve-server/npc/SentryAI.h:24.
2. Fast-orbit caller. While signalling, the NPC orbits at twice its orbit speed, so motion is the tell. Keep: the caller moves faster during the call. Change: a posture and colour tell, plus a call length cap. Ref: src/eve-server/npc/NPCAI.cpp:541-546 (line 543 sets the speed).
3. Swarm cycle. Approach, pursuit and departure on a readable cycle. Keep: three visible phases. Change: the swarm returns to a den when its target drops, not to an owner. Ref: src/eve-server/npc/DroneAI.h:18-32.
4. Attack timer and leash check. Each attack waits on a timer and first checks the target is still in the zone. Keep: the gate and the zone check before each attack. Change: our leash radius per family and our drop or pull-back rule. Ref: src/eve-server/npc/NPCAI.cpp:688-690.
5. Target-lost fallback. When the target is lost, the NPC goes idle only if no targets remain; otherwise it takes the first remaining target. This is the many-on-one choice point. Keep: the fallback to the next target. Change: pick by threat or hate list (our rule), not list order; the donor's own TODO asks for the weakest. Ref: src/eve-server/npc/NPCAI.cpp:660-680 (todo at 677).
6. Faction-side wave. Groups enter from the side where their faction has presence, so they feel like they came from somewhere. Keep: spawn origin along the faction side. Change: our spawn grammar; with no faction presence, a random edge point (the TODO's own fallback). Ref: doc/code_and_design_notes/Alasiya_TODO:729 (not built).
7. Wave near a set-piece. Dungeon waves placed near set-piece objects, not mid-zone. Keep: spawn anchored to a set-piece. Change: our anchor types and placement rule. Ref: Alasiya_TODO:303 (not built).
8. Dormant sleeper. A group that sits still until the player is close. Keep: the category. Change: everything else; behaviour in the donor was not read. Ref: src/eve-server/npc/Sleeper.h (stub).

Boss pattern: not read. Elite pattern: not read. Escalation: a dungeon escalation path exists as a named function in the notes (Alasiya_TODO:527); behaviour not read.

## 2. Classes, skill trees and factions (category level)
- Race and career skill trees: three skill tables (base, career, race-keyed), contents not read. Idea: skill gates keyed by origin tables.
- Certificate tree: five table families (categories, certificates, classes, recommendations, relationships). Idea: achievement-like certificates linked to each other and to categories. Contents not read.
- Faction standings: a faction table and a standings table for NPC groups. The TODO says NPC-group standings should be static (Alasiya_TODO:155).

## 3. Weapons (module families, category level)
- Turret modules: an attribute family of their own (effect note attribute table).
- Missile launchers: an attribute family of their own.
- Drones (weapon side): an attribute family; the drone AI is in the server.
- Electronic-warfare families (eight): target-side disruption families, each its own attribute family. No damage; each alters a target's abilities.
- Effect application states: passive (fitted), active (activated), target, area, online, overload, dungeon, system (effectProcessing_data:25-40). Each module effect is tagged with the state that applies it.

Special properties: not read in detail. Visual distinctness of tiers: not read.

Top 5 striking (category level):
1. Application state per effect: an effect applies only in its state, so the state is the rule (effectProcessing_data:25-40). Keep: tagged effects. Change: our states (charging, aura, stance).
2. Overload-only effect: applies only while overloaded (effectProcessing_data:35). Keep: a risk state that gates a powerful effect. Change: our cost and an aura that shows the state.
3. Electronic-warfare as a family set: eight disruption families (attribute table). Keep: a set of disruption families. Change: our own families and counts.
4. Turret, missile and drone as three weapon families sharing one attribute system. Keep: one attribute system for many families. Change: our families.
5. Caller that speeds up (see creatures, item 2). Keep: motion tell. Change: our tell.

## 4. Armour, shields and gear tiers (category level)
- Three defence layers: shield, armour, structure (effectProcessing_data:96-98 as three attribute categories). Idea: ordered pools; a boost effect targets one pool.
- Gear sets and material tiers: not counted; not read in the files read.
- How tiers show: not read.

Top 5 striking (category level):
1. Three ordered pools (shield, armour, structure). Keep: the order and a boost to one pool. Change: our names and recharge rule.
2. Boost effect on a single layer (effect note example). Keep: boost targets one layer. Change: our boost rule.
3. Appearance layers as palettes (paperdoll tables). Keep: layers with palettes and per-slot restrictions. Change: our layers.
4. Restrictions per slot (paperdoll restriction table, names only). Keep: a slot can refuse some palettes. Change: our rules.
5. Overload state for gear (see section 3). Keep: state-gated effect. Change: our cost.

## 5. Zones and dungeons (category level)
Ten dungeon archetypes (dungeonEditor migration, rows 1-10): mission, four sensor-detected site types, wormhole, anomaly, unrated, escalation, rated. Ref: sql/migrations/20211118111620-dungeonEditor.sql:7-19.

Structure (same migration): dungeon template, then archetype, dungeon, rooms, room objects. A room object has a type, a group, a 3-axis pose and a radius (lines 69-82). The group's first digit gives a role (nine prefixes: decor, a beacon-type role, mining, obstacle, ship, base, gun, wreck, misc; two-letter labels not decoded). Ref: dungeonEditor.sql:51.

Other zone data: wormhole destination classes (wormhole_staticdata.sql:356); war combat zones with systems (two tables, names only); belt and anomaly spawns (TODO 324 and 340: spawn distance from the system edge, and a ship-group rework); escalating dungeon path (TODO 527).

Top 5 striking (category level):
1. Archetype as the zone field: one tag picks rules, spawn set and rewards. Keep: archetype field. Change: our archetypes (trail, gauntlet, shrine, escalation).
2. Room object as placed prop with pose and radius (dungeonEditor.sql:69-82). Keep: type, group, pose, radius record. Change: our prop grammar; the radius use was not read.
3. Role prefix on a group id (dungeonEditor.sql:51). Keep: role encoded in the id. Change: our role set.
4. Wormhole-style unstable zone with destination classes (wormhole_staticdata.sql:356). Keep: destination classes as data. Change: our links and our timers.
5. Escalating path (TODO 527). Keep: a path that gets harder along its length. Change: our escalation steps.

## 6. Item and effect looks worth recreating
- Overload and online glow tiers: an effect tagged to online or overload turns on only in that state, so the visual tier follows the state (effectProcessing_data:33-35). Technique: a state-tagged aura or glow.
- Room set-piece placement: type, group, 3-axis pose and radius per object (dungeonEditor.sql:69-82). Technique: placed set-pieces as data.
- Appearance as layered palettes: colour palettes, per-slot restrictions, modifier and sculpt locations (sql/base paperdoll tables, names only). Technique: layers, not full models.
- Wreck shot destroys loot: the donor's TODO says this is live behaviour and not built (Alasiya_TODO:316). Technique: a visible break on the wreck.
- Fleet aura: a leader's modifiers applied to the fleet's ships when formed or undocked (Alasiya_TODO:308). Technique: an aura shown on the squad.

No shader, bloom or particle code was read; none found in the files read.

## 7. Inspiration for Frankendom (originals, 8, category level)
1. Signal-the-pack guardian. Keep: watch, engage and call states, with the call as its own state. Change: our call radius, wind-up pose, who answers (family only), cooldown.
2. Fast-orbit tell. Keep: motion as the tell while calling. Change: posture and colour tell; a strafe, not an orbit; a length cap.
3. Swarm cycle. Keep: approach, pursuit, withdrawal. Change: den is a zone object; timings; reform after a set time.
4. Faction-side wave. Keep: spawn origin from the faction side. Change: our spawn grammar; a random edge point with no faction presence.
5. Archetype-tagged zones. Keep: one archetype field as the zone's data hook. Change: our archetypes and rules.
6. Three-pool durability. Keep: three ordered pools with a boost on one. Change: our names; recharge after a quiet period.
7. Overload-only effect. Keep: a powerful effect gated by a risk state. Change: our cost and visible state.
8. Fleet aura at engage. Keep: a leader aura as a modifier. Change: applied at engage, cached on the squad, removed on leader death (fixing the donor's late calculation TODO).

## Defects and gaps seen (keep the idea, fix the defect)
- NPCAI.cpp:677: the target-lost fallback takes the first remaining target; the donor's TODO wants the weakest. Fix: choose by threat or a hate list.
- NPCAI.cpp:668: warp-follow chance is commented out (feature missing). Fix: implement or delete the state.
- NPCAI.cpp:285: the fleeing state's comment asks whether the flee speed choice makes sense (design doubt, not a defect). Decide the rule.
- Alasiya_TODO:729 and :303: the faction-side and set-piece spawns are not built. Build as the originals above.
- effectProcessing_data: the author notes that argument categories are not used and can be ignored; a data gap to check before reuse.

## Fold-ins
- hud-ui: not read (client half absent).
- sound-music: not read (no audio in the box).
- progression: skill tables and certificate tree exist as data (names only); contents not read. No achievements read.
- loot: wreck loot destruction (TODO 316); no drop ceremony read.
- spawns and encounters: spawn-side rule (TODO 729), set-piece waves (TODO 303), spawn distance (TODO 340), belt spawn rework (TODO 324). Walk density: not read.
- idle and ambient vocabulary: not read beyond the signalling and orbit states.
- death and respawn: not read.
- boss intro and finisher: not read.
- readability at 375 wide: not read; no client code in the box.

## Not read
See the not_read list in EvEmu-Project-evemu_Crucible.catalogue.json (10 items). Main gaps: sql/base bodies (gzipped, class C, not opened), the security-patrol and civilian and sleeper bodies, most of NPCAI.cpp, the dungeon and fleet source folders, and most of the TODO file.
