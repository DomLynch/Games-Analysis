# l1j-en-classic (Lineage 1 server emulator, GPL-2.0): creature-grammar (CG008)

Donor root (VPS, read-only): /mnt/frankendom-donors/l1j-en-classic/
Licence: GNU GPL version 2 for code and data (COPYING line 1; README.md line 115). The README says the project is clean-room and names the target client (README lines 6 and 84). Game-specific tables are not clearly cleared. Class C: shape only (see section 6).
Verdict: STRONG. The ordered move ladder, the family pack-wake and the leader-escort group rules were read in code and counted in data. Best transferable idea: a creature's moves are an ordered list, each with its own roll and HP trigger, and the first move that passes is used for that turn.
Depth: full for the npc, mobskill and mobgroup tables and the aggro-family link; thin for the summon and poly bodies.
Half read: both, in part. Data half: db/l1jdb_m10.sql (npc, mobskill, mobgroup tables). Server half: src/l1j/server/server/model/L1MobSkillUse.java (skillUse 104-160, the summon-cap branch 144-148, isSkillUsable 405-464), model/Instance/L1NpcInstance.java (setLink 370-371, serchLink 373-391), model/Instance/L1MonsterInstance.java (ReceiveManaDamage and receiveDamage, lines 260-310, in part), datatables/NpcTable.java (family mapping 118-140). The client half is absent by design (AU029). No paired donor exists in the box.
Checked: AU029 (asset audit) read first. Counts were recomputed for this note with a parser that handles escaped apostrophes. The mobskill statements that do not parse are listed in section 7.

## 1. What the player sees and feels (375 wide)

A boss does not fire at random. It runs down a numbered list of moves every turn. Each move has its own percent roll, and sometimes an HP threshold. The first move whose roll passes is the move used, so the player learns a pattern: an opening strike, a ranged shot at a set chance, then a summon slot that rarely fires, and a fallback melee at the bottom. Summoners drop small minions from that list.

A pack wakes together. A creature with the pack flag and a family tag joins the chase when a member of its family is hit, so one hit on a single member turns the whole family toward the player. Groups are placed as a leader with up to six kinds of escort, each with a count, so a patrol reads as one leader with a mixed escort. Many monsters share one sprite, so the body is reused and only the level, hit points and name change.

## 2. Why it works / is striking

- Readable at 375 wide: a pack that turns together is one clear beat; a leader with escorts is one readable silhouette group. Sprite size was not judged (no images opened).
- One signature behaviour: the ordered move ladder with per-slot rolls (L1MobSkillUse.java 127-133).
- One signature effect: the family wake (L1NpcInstance.java 373-391). No sound: the tree has no client, so no sound is judged.
- Could be ours at 20 to 30 percent resemblance: yes. Keep the ordered ladder, the family key and the escort group. Change the moves, the names and the numbers.

## 3. The rule behind it

### 3a. Creature rows and sprite reuse (npc table, 2,747 INSERT statements)
- Table `npc` has 64 columns (CREATE TABLE at db/l1jdb_m10.sql line 1544). Creature fields include gfxid (sprite), lvl, hp, ac, exp, agro flags, family (a string tag), agrofamily (the wake mode), ranged, tamable, picupitem, digestitem, and atkspeed.
- 2,747 statements parsed. 1,448 are monster-like (level above 0 and hp above 0). Those rows use 693 sprite ids: 2.09 rows per sprite. 399 sprites are used once, 294 by two or more.
- Non-monster rows share sprites heavily (one townsfolk sprite is on 133 level-0 rows). Raw sharing overstates monster reuse, so the monster-only figures above are the ones to use.
- Same sprite, several level bands: the zombie-type sprite 52 is on three rows. At level 6 the row has 45 hp (db line 20685), at level 14 it has 400 hp (line 23210), at level 18 it has 600 hp (line 23212). All three carry exp 37 and ac 8. Reward does not scale with level in this family. In a different faction-guard family the exp does rise with level. So the reward rule is hand-set per family, not a formula.
- Family counts (monster-only): zombie-type 29 monsters on 8 sprites, skeleton-type 33 on 12, orc-type 36 on 19, guard-type 94 on 21, dark-elf-type 72 on 26.

### 3b. Family wake (aggro link)
- A family string maps to an integer id (NpcTable.java 126-131). An unmapped family becomes 0. A row with the wake flag set and family 0 is reset to no wake (NpcTable.java 133).
- A hit on a monster (receiveDamage at L1MonsterInstance.java 303, or a mana hit) calls serchLink with the attacker and the family id (L1NpcInstance.java 373). The link loop walks the attacker's known objects. A known monster with wake mode 1 joins when its family id is the same (L1NpcInstance.java 379-380). A monster with wake mode 2 or more joins regardless. Group members with the same mob group id also join.
- In the data, wake mode is 0 (2,014 npc rows) or 1 (733 rows, all monsters). Mode 2 or more never appears in the data.

### 3c. Ordered move ladder (mobskill table, 793 statements)
- One row per move slot, keyed by monster id and slot number (db line 1514 for the table). Per-slot fields: TriRnd (percent roll), TriHp (fire when own hp percent is at or below this), TriCompanionHp, TriRange, TriCount (maximum uses), ChangeTarget, Range, SkillId, Summon id with min and max count, PolyId, and Type (1 to 4).
- 793 statements parsed over 455 monsters. 252 monsters have one slot; 138 have two; 40 have three; ten slots at most (two monsters).
- The engine walks the slots in order. A slot that is not usable is skipped. The first slot that performs ends the turn (skillUse, L1MobSkillUse.java 127-133). Each slot rolls on its own.
- Slot values in the data: TriRnd 100 on 174 slots, 50 on 155, 30 on 154, 20 on 85, 10 on 50. HP trigger is set on 16 slots only. Summon id is set on 49 slots. Type values run 1 to 4 (counts 263, 477, 49 and 4 slots; the constant names were not opened).
- Worked example: monster id 45649, a demon with ten slots. Slot 0 has no description, Type 2, roll 30 percent, skill id 10024. Slot 1 is a fireball, Type 2, roll 30 percent. Slots 2 to 8 are seven summon moves, Type 3, each at roll 2 percent (slot 2 is at db line 20181). Slot 9 is a range-1 move, Type 1, roll 100 percent (db line 20188). The fallback sits at the bottom of the list.
- Defect, keep the idea: the roll at L1MobSkillUse.java line 409 is `nextInt(100) + 1`, which gives 1 to 100, and line 410 fires only when `chance < TriRnd`. So TriRnd 100 fires 99 times in 100 (the fallback at the bottom of the ladder is skipped one turn in 100). TriRnd 2 fires once in 100 and TriRnd 1 never fires. Fix: `chance <= TriRnd`, or roll 0 to 99 and use `<`.
- Defect, keep the idea: when the servant-summon cap is reached, the branch at lines 144-148 counts the slot as used and returns true, so the turn is spent without a summon. This may be intended as a cooldown. Fix: make it an explicit data flag per slot, so the choice is on purpose.

### 3d. Mixed groups (mobgroup table, 94 rows, all parsed)
- Each group: a leader id, up to seven escort slots, each with an id and a count, and a flag that removes the group when the leader dies (db line 1488 for the table; example row 2 at db line 19737).
- Escort slots used per group: 65 groups use one escort kind, 14 use two, 3 use three, 8 use four, 2 use five, 2 use six. No group uses seven.
- The remove-on-leader-death flag is set on 8 groups; 86 do not set it.

### 3e. Designer-tunable data fields (donor values not used: GPL-2.0 data, shape only)
| name | unit | donor_value_or_null |
|---|---|---|
| move_slot_order | integer slot index | null |
| move_roll_percent | percent | null |
| move_hp_trigger_percent | percent of own hp | null |
| move_max_uses | count | null |
| move_summon_min, move_summon_max | count | null |
| move_range | tiles | null |
| wake_family_tag | string | null |
| wake_mode | 0, 1, or 2 | null |
| group_escort_kinds | count (max 7 slots) | null |
| group_escort_count | count per kind | null |
| group_remove_on_leader_death | boolean | null |
| reward_per_level | exp | null (set per family, no formula) |

## 4. For Frankendom: how it maps to our shape

- Ordered move ladder = the creature's ability list as data. Each family has an ordered list of moves with a roll and an HP trigger. The engine (src/fight) runs it in the AI brain (parity row 2). In many-vs-one, TriCount caps per-move uses, and a summon move counts against the three-attacker cap.
- Family wake = aggro link in the fight loop (parity row 4: aggro, chase, leash). One hit on a family member sets its zone kin to engage, but only three attack; the rest hold on the leash. The wake is a server event; the client shows it as a call.
- Escort groups = zone encounter rows: a leader and escorts with counts, placed within the spawn cap (row 23). The leader-death flag becomes a grace timer that scatters or despawns the escorts.
- 700 zones as data: the sprite is shared across zones and a zone row picks a family and an ordered list. The look comes from the sprite and a colour table, not new art.
- Keep: the ordered list with per-slot rolls and HP triggers; the family string key; the escort group table with a leader-death rule; sprite reuse by row.
- Change: fix the roll (`<=`) and set the fallback slot to a guaranteed rule; delete the unused wake mode 2; index family members once at zone load instead of scanning known objects on every hit (the scan is per hit and grows with known objects); collapse the empty base setLink (L1NpcInstance.java 370-371, real logic is in the overrides such as L1MonsterInstance.java 207) into one place; make the summon-at-cap case an explicit flag; set the reward per family on purpose, since the data does not scale it.

## 5. Five-minute look test (Dom on his phone)

- Target file: src/fight/aggro-link.ts (new module). Parity row 4 (fight loop: aggro, chase, leash).
- Build: one zone with a three-member family and a leader. Hit one member. Show (a) all family members engage at once, and (b) only three attack while the rest hold on the leash.
- Look at 375 wide: does the pack read as one wake (a) and does the three-attacker cap read clearly (b)?
- Judge: if the pack wake feels like a cheat, keep the wake but only for the members within a short range, and keep the cap at three.

## 6. Licence and IP

- Code and data: GPL-2.0 (COPYING line 1; README.md line 115). No code, SQL row or name is adapted. The repo says it is clean-room (README.md line 84), but the game tables are not cleared, so this is class C: shape only.
- Kept (trait): an ordered move list with a per-move roll and an HP trigger; a family string that wakes its kin on a hit; a leader with escorts and a leader-death rule.
- Changed (trait): all names, all moves, all numbers, all sprites and the group sizes.
- Recreated as a clearly distinct original: a bog-guardian with a four-move list (a strike, a shot at a set chance, a rare summon, and a sure fallback slash), and a patrol of one leader with two escort kinds. No legal conclusions.

## 7. Gaps

- Not read: the summon and poly bodies in depth (L1MobSkillUse.java 165-260); the Type constants 1 to 4 (L1MobSkill.java, not opened); the guardian and monster overrides beyond the lines cited; the boss-cycle code (belongs to world-events, not this topic).
- Client half absent by design: no sprites, sounds or animation clips in the box (AU029).
- Parsing: an early pass without escape handling dropped 44 npc and 4 mobskill lines whose names hold escaped apostrophes. The final pass handles escapes and NULLs: all 2,747 npc statements give 64 values and all 793 mobskill statements give 22. Only the final figures are used here.
- Half read: data plus server logic. The client is not in the box.
- Not read here: death and respawn presentation, loot reveal, idle and ambient behaviour (the table has no idle column; the aggro flags are the only idle-related fields).
- Readability at 375 wide: judged from data only, not by eye.
