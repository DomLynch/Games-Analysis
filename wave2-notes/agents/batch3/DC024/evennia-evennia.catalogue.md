# evennia-evennia (design catalogue, cell DC024)

Donor: /mnt/frankendom-donors/evennia-evennia (Evennia MU* framework, with the EvAdventure and tutorial_world contribs as the game content)
Licence: BSD 3-Clause (LICENSE.txt); contributions under the same licence (docs Licensing.md, from the audit). Knave-derived rules are Creative Commons Attribution per evadventure/README.md line 21, credited to Ben Milton and not verified against Knave. Class A (audit AU019).
Rule for every idea below: recreate as a clearly distinct original, never a copy. Target 20-30 percent resemblance in mood only. Not legal advice.

## Halves read
- Server half: read. evennia/contrib/tutorials/evadventure (npcs, ai, dungeon, objects, equipment, rules, characters, chargen, combat_base, combat_twitch, combat_turnbased, rooms) and tutorial_world (mob, rooms, objects by class line).
- Data half: in-repo text and tables. The chargen tables were counted by AST (no entries copied). build.ev read by grep count only. Game text read in part.
- Client half: evennia/web/static/webclient is in the repo. Read: file list, font declaration line, grep for touch and mobile support. The 21 JS files were not read beyond grep.
- Paired half in the box: none. There is no other donor with the client or data for this game.

## Counts (honest, and what they mean)
- creatures: 2 (two hostile mob classes: EvAdventureMob and the tutorial Mob). The repo has no named creature types, no bestiary table and no tier table.
- classes: 0 (classless Knave ruleset; no class or race tables).
- weapons: 4 families (melee, throwable, rune stone, bare hands). The chargen table offers 3 equal-damage starting weapons.
- gear_sets: 0 named sets. Gear slots: body, shield, helmet and weapon hand. Quality has four states.
- zones: 8 zone types (see section 5).

## 1. Creatures and beasts
Honest note: there are no beasts or named creatures in this repo. What is here is creature behaviour, which is what Frankendom can use.

Creature families (file: npcs.py, tutorial_world/mob.py):
- EvAdventureMob (hostile): HP = 4 x hit dice; all six abilities equal the hit dice; fixed armour; morale 7-9 per NPC. Intent table each tick: hold 0, attack 0.85, stunt 0.05, item 0, flee 0.05 (npcs.py line 261 and onward).
- Tutorial Mob (state machine): idle, patrol, aggressive, hunt, dead states on a ticker. Paces: patrol 6 s, attack 2 s, hunt 1 s, dead 100 s; health 20 (mob.py 122-128, 144).
- Talkative NPC, shopkeeper and quest giver: immortal, non-combat (npcs.py). Shopkeeper sells at value x 1.0 and buys from the player at value x 0.5 (shops.py 100, 174, 384).

Top 8 most striking (criteria: one signature behaviour, a readable tell, could be ours at 20-30 percent):
1. Morale-gated mob. Why: one 2d6 check against a per-creature morale value, a cheap fear beat. Keep: morale number and the check. Change: the donor defines the check (rules.py 259-271) but no caller in the contrib invokes it, so the trigger is ours. Ref: evadventure/rules.py:271.
2. One-number stat block. Why: one hit-dice value sets HP and every ability, so a creature reads as tougher at a glance. Keep: one number drives HP. Change: separate HP, damage and speed per family. Ref: evadventure/npcs.py:89.
3. Four-state patrol mob. Why: slow wander, fast attack, fastest hunt on one ticker reads as mood. Keep: one ticker per state with its own pace. Change: our paces; the hunt ticker name is a defect (see defects). Ref: tutorial_world/mob.py:125-128, 282, 326.
4. Intent table as personality. Why: a weighted roll each tick, so weights make a species feel cautious or brave. Keep: the table. Change: per-family weights and stunts aimed at allies. Ref: evadventure/npcs.py:258-264.
5. Look-around idle line. Why: a 1-in-100 tick line ("the enemy looks about.") makes a standing creature live with no animation budget. Keep: rare idle text on a tick roll. Change: idle clip variants per family. Ref: tutorial_world/mob.py:159, 307.
6. Flee away from where it came. Why: the flee step never doubles back into the room just left, so a chase reads as running. Keep: exclude the previous room. Change: flee toward a home point. Ref: evadventure/npcs.py ai_flee.
7. Magic gate on armour. Why: non-magic hits are divided by 100 (damage_resistance) so the player must find the right tool. Keep: a per-creature damage gate a weapon must pass. Change: resistance per family and a visible glancing-hit cue. Ref: tutorial_world/mob.py:122, 407.
8. Timed return after death. Why: a body stays down for 100 s then the creature returns at full health; a pause and a reset. Keep: a death state with its own timer. Change: our death presentation and zone-tied return. Ref: tutorial_world/mob.py:128, 157.

Boss pattern: none in the repo. Elite pattern: none. Escalation by level: none for creatures (depth escalation exists for rooms, see section 5).

## 2. Classes, races and factions
- Classless knave (the only character type). Role: one build; role comes from weapons, armour and three rune-stone spells (README "Magic (three spells)"). Mechanic: six abilities from the lowest of three d6 (chargen.py:64). Progression: XP threshold 1000 x level (characters.py:304); level-up adds one to up to three abilities, capped at 10 (characters.py:329). Defect: the HP re-roll on level-up reads max_hp, which is not defined (characters.py:335).
- Races and named factions: none. NPC allegiance is three-state: hostile, neutral, friendly (evadventure/enums.py).

## 3. Weapons
Families (evadventure/objects.py):
- Melee weapon: STR attack against armour; 1d6; a critical hit rolls damage twice; a critical miss costs one quality point; quality 0 is broken (objects.py 181-263).
- Throwable: WIS attack against DEX; 1d6; a weapon and a consumable at once (objects.py 270-282).
- Rune stone (spell): INT attack against DEX; 1d8; two-handed; one use, refreshed by resting, not deleted (objects.py 285-309).
- Bare hands: STR attack against armour; 1d4; never breaks (objects.py 345-373).

Special properties: no elements and no set bonuses. Critical success doubles the roll (objects.py 243-245). The main special is the rune stone as a carried spell.

Visual distinctness of tiers: text only. The name gets a suffix: (chipped), (damaged), (broken!). No colour or model change in the repo.

Top 5 striking:
1. Rune stone as carried spell: a spell is an item in the two-hand slot, refreshed by rest. Keep: spell = item. Change: refresh per room or per kill; our carrier (glyph, charm).
2. Wear as name suffix: quality shows in the name, three steps then broken (objects.py 202-206). Keep: state in the name. Change: a visible model state and colour.
3. Throwable that is also a consumable: one object with two type tags (objects.py 278). Keep: dual tags. Change: our throw rule.
4. Bare hands as a real weapon with its own stats (objects.py 345-357). Keep: a fallback that is a weapon. Change: our fallback damage and a stance.
5. Critical doubling: a crit adds a second roll rather than a multiplier (objects.py 245). Keep: a second roll on crit. Change: a visible crit beat (hitstop plus a sound cue).

## 4. Armour and gear
- Slots: body, shield, helmet, weapon hand, two hands, backpack (enums.py WieldLocation). Capacity: constitution + 10 (equipment.py 87). Defence: body base 1 plus shield and helmet bonuses (equipment.py 129-153).
- Material tiers: none in the repo. No metals, golds or crystals.
- How tiers show: the weapon quality suffix only; armour total in the text sheet.
- Treasure tag: an item can be both a helmet and a treasure (objects.py docstring, lines 16-17). The example is a gold helmet that is both worn and sold.
- Chargen gear: four armour options, four helmet-or-shield options, three starting weapons, and a backpack roll (chargen.py 103-127; tables in random_tables.py).

Top 5 striking:
1. Slot budget as the weight system: a pack of slots, big gear takes more slots (equipment.py 63-87). Keep: slot size per item. Change: stance or hand penalty rather than a count.
2. Filler effect that eats slots: mud or slime fills slots and blocks items until cleaned (objects.py 96-110; equipment.py 23-26 docstring). Keep: effects that fill slots. Change: slow attack timing instead of blocking.
3. Helmet and shield as bonuses on a base armour (equipment.py 146-152). Keep: layered bonuses. Change: our layers.
4. Treasure-and-worn dual tag (objects.py 16-17). Keep: dual tags for sell value and wear. Change: rarity from the same tag.
5. Chargen gear rolled from a table, then edited (chargen.py 102-127). Keep: start kit rolled from tables. Change: our tables and our kit.

## 5. Zones and dungeons
Zone types (8 counted):
1. Dungeon entrance hub (dungeon.py 443-489): exits open branches; each exit is re-armed with a 50 percent roll on a 5-minute tick (439, 457); a branch collapses after a week without a new room (459, 418).
2. Generated dungeon rooms (dungeon.py 162-347): grid rooms made on first entry; radial depth from the entrance (295) picks a name tier 1-10 (178-189), then dark rooms. A branch-wide budget opens up to two unexplored exits. A room stays blocked until its not_clear tag is removed (107, 138).
3. Non-lethal PvP arena (rooms.py 87-100): fights without death; a losing character is knocked out (characters.py 258-262).
4. Weather outdoor room (tutorial_world/rooms.py 360-400): ticker 50-70 s; a weather line on 20 percent of ticks.
5. Unsafe bridge (rooms.py 536, 637-683, 736): five positions as a counter; fall check 5 percent on look at positions 0-2 (673).
6. Dark room (rooms.py 898, 979-1010): carried light source needed; four search tries, each 90 percent nothing found, then the find branch.
7. Teleport room and intro/outro rooms: class lines only (rooms.py 448, 1105, 1176). Behaviour not read.
8. Dungeon collapse: everyone in the branch is moved to the start room with a message (dungeon.py 256-274). The branch's rooms are not actually found for deletion (defect).

Hazards: falling off the bridge; dark rooms; blocked exits; PvP. No environmental damage, no poison tiles, no timed hazards in the files read.

Top 5 striking:
1. Doorway branch: each door opens a private branch, shared by people who take the same door within a short window (dungeon.py 6-9). Keep: shared branches and generated rooms. Change: per-party window; our theme.
2. Depth as difficulty: radial distance from entrance sets the room tier (dungeon.py 295, 178). Keep: radial depth as the dial. Change: our tiers and spawn tables.
3. Five-step bridge (rooms.py 536, 673). Keep: a short position counter with a risk band. Change: roll on each step, not on look.
4. Dark-room search gate (rooms.py 898): tries before the find branch. Keep: a few tries before a reveal. Change: our reveal rule.
5. Non-lethal arena (rooms.py 87-100). Keep: a flag per room. Change: our knock-out rule and winner reward.

## 6. Item and effect looks worth recreating
- Room mini-map from exits (rooms.py 55-84): a small grid with a centre mark, one symbol per cardinal exit, a second mark for the room beyond; a different mark for non-cardinal exits. Hidden for screen-reader users (rooms.py 63). Technique: draw the map from the graph, not from a stored picture.
- Health as words (characters.py 27-47): eight labels from Perfect to Collapsed. Technique: bucket the percent into words; works at 375 wide with no bar.
- Blocked-path footer (dungeon.py 116-124): red status text added to the room text while locked.
- Non-lethal footer (rooms.py 96-100): yellow one-line rule.
- Light gating (tutorial_world/objects.py 316 LightSource; rooms.py 979-1010): room lit flag plus a carried source.
- Ambient idle lines: creature 1 in 100 per tick (mob.py 307); weather 1 in 5 per tick (rooms.py 398). An empty room still moves.
- Glow, aura, shader: none. The repo has no visual effects.

## 7. Inspiration for Frankendom (originals, 8)
1. Doorway branch. Keep: rooms generated on first entry; a shared branch for those who take the same door; a collapse that returns players to the hub. Change: window per party; collapse keeps loot; fix the defect that the timer refreshes only on new rooms (refresh on any traversal).
2. Spell as carried item. Keep: one-use item, two-handed, refreshed by rest. Change: refresh per kill; a visible charge state on the model.
3. Load that slows the hand. Keep: fixed slot budget and filler effects. Change: slot pressure slows attacks rather than blocking items.
4. Depth-tiered rooms. Keep: radial depth as the difficulty input. Change: our biome sets and spawn tables.
5. Five-step bridge. Keep: a short counter and a middle risk band. Change: per-step risk, our ends.
6. Morale break. Keep: per-creature morale and a two-dice check. Change: our trigger (hurt, ally loss), retreat to a home point.
7. Death roll with lasting scars. Keep: one roll at zero health; mostly survive with a cost. Change: cost lasts until a shrine visit or a fight; our list of costs.
8. Non-lethal arena. Keep: per-room lethal flag; one-line footer. Change: our knock-out rule and reward split.

## Defects seen in the donor (keep the idea, fix the defect)
Each is a real line in the donor. Receipts are in receipts.tsv.
- npcs.py:283 reads self.nbd (typo for ndb): the combat branch would fail. Fix: use ndb.
- npcs.py:291 match arm is named combat, but the probability key is attack (261). Fix: rename the arm to attack.
- npcs.py:6 imports only choice, while npcs.py:292 calls random.choice. Fix: import random.
- npcs.py:297-301 NPC stunt sends stunt and defense keys and no target, while combat_base.py:170-171 reads stunt_type, defense_type and target. Fix: align the keys and add the target.
- npcs.py item key (lower in ai_combat): combat_twitch.py:46 names the use key, not item. Fix: rename.
- dungeon.py:107 and :270: rooms only get the not_clear tag; delete() searches rooms by branch key and finds none, so rooms leak. Fix: tag each new room with the branch key in new_room.
- dungeon.py:219: branch timestamp default is evaluated at import. Fix: default to None and set on creation.
- dungeon.py:284 and :418: last_updated moves only when a new room is made, so a busy branch of known rooms can collapse. Fix: refresh on register_exit_traversed.
- dungeon.py:380: a no-op expression (self.location.room_generator). Fix: delete.
- dungeon.py:448 docstring says every 5 minutes; code (439) is a 50 percent roll per tick. Fix: make the docstring match or the code match.
- objects.py:109 sets the filler type to ObjType.QUEST.value (a string), then objects.py:49 calls .value on each type. Fix: use the enum, not .value.
- objects.py:258 builds a normal miss message, but only the critical-miss branch sends it (263). Fix: send on all misses.
- equipment.py:204 helmet line reads the BODY slot. Fix: read HEAD.
- characters.py:335 reads self.max_hp, which is not defined (hp_max is). Fix: use hp_max.
- rules.py:61 and :63 chained comparison (0 < n > max) accepts zero dice. Fix: 1 <= n <= max.
- tutorial_world/mob.py:282 hunt ticker names do_hunt; the method is do_hunting (326). Fix: rename. Latent: only when a builder enables hunting.
- rooms.py:673: the bridge fall rolls on look, not on step, so a player who does not look cannot fall. Design note, not a crash; decide the rule.
- morale_check (rules.py:259) is never called. Design gap.

## Fold-ins
- hud-ui: minimap (rooms.py 55-84), screen-reader suppression (rooms.py 63), blocked and rule footers. Touch: none. Grep of the webclient js for touchstart, touchend and mobile found no matches (grep only; JS not read).
- sound-music: one audio file in the repo (webclient media notification.wav, 3624 bytes, not played). No layering, stingers or biome beds. The only ambience is text on ticks.
- progression: XP 1000 x level; level-up +1 to three abilities, cap 10; no talent trees, no achievements or titles.
- loot: treasure tag (objects.py 123-130); mob loot hooks exist in characters.py 122-155 (not read). No drop ceremony in the repo.
- spawns and encounters: no spawn director. Mobs are placed by builders. Dungeon rooms are generated by walking. Walk density by arithmetic (not measured): a weather line about every 5 minutes per room (ticks 50-70 s, 20 percent); a creature idle line about every 10 minutes at patrol pace (1 in 100 ticks of 6 s).
- idle and ambient vocabulary: "the enemy looks about.", "the enemy changes stance." (mob.py 159); weather lines (rooms.py 390-400).
- death and respawn: PC at zero HP rolls a death table of eight results (rules.py 283-323; random_tables.py 618-627): two dead, six survive with one ability down by 1d4 and a small heal. Non-lethal rooms restore full HP and print a yield line (characters.py 258-262). Mobs: body 100 s, then full return. Defeated players are moved to a holding room with "falls to the ground" (mob.py 149-151).
- boss intro and finisher: none.
- readability at 375: text only. No silhouettes. Targeting: NPC attacks pick a random enemy (npcs.py 292); the tutorial mob picks the first character in the room (mob.py _find_target). Relevant to the many-on-one rulings (row 4 target selection) and MAX_ATTACKERS = 3: the donor has no cap; turn-based rounds let every combatant act in random order (combat_turnbased.py 377).

## Not read
See the not_read list in evennia-evennia.catalogue.json (11 items). Main gaps: most of combat_turnbased and the turn menus, the loot hooks, the webclient JS bodies, the 803 docs pages (only Licensing.md read in the audit), and any bestiary (none exists).
