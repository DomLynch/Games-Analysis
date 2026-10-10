# Feel note: ax-grymyr-l2dn-server, topic world-events (WE008)

Donor: /mnt/frankendom-donors/ax-grymyr-l2dn-server (VPS, read-only). Paths below are under .../ax-grymyr-l2dn-server/L2Dn/ unless shown in full.
Licence: code MIT (LICENSE.txt line 1 "MIT License"). Datapack notices conflict (admin/help/license.htm names GPL v3 or later; admin/help/license2.htm says the datapack belongs to its owners and cannot be distributed without consent), so datapack values are class C with donor_value null. Code constants are MIT, so donor values are recorded for them. README calls the repo an unofficial emulator, and one enum file carries an NCSOFT copyright string (asset audit AU005). Inspiration stays category-level: no names, looks or ids reused.
Half read: SERVER (L2Dn.GameServer.Scripts/AI/Areas, L2Dn.GameServer.Model InstanceManagers, Model/Actor, Model/Zones, Utilities; DataPack XML for the cited tables). DATA: partly (CursedWeapons.xml, RaidbossSpawns.xml lines 4 and 303, TimedHuntingZoneData.xml). CLIENT: not in the box (no client folder in the tree, per DC006). Paired donor: none in the box.
Checked: about 20 files opened in full or in part (listed in the JSON paths). Two Balok candidate files and the rest of the Balok packets were checked by grep for writers; candidate list in verdict.txt. Confidence high on order and constants read; medium on the runtime of SchedulingPattern and Rnd.get (not run, read only). Receipts (A1-A6, 49 rows) are in the shared receipts.tsv, all verified with the gate script.

Cells (verdict in brackets):
- A1 Kill-site avenger, three area scripts [STRONG]
- A2 Companion-reactive hive [STRONG]
- A3 Cursed relic with a shrinking timer [STRONG]
- A4 Scheduled raid-boss clock and grand-boss store [STRONG, one defect that breaks a path]
- A5 Timed hunting zone time bank [STRONG]
- A6 Balok boss-war ledger [PARTIAL, shell with no writers]

Best transferable idea (one line per cell):
- A1: a kill that rolls for a replacement body that hunts the killer for five minutes.
- A2: a companion hit on a hive monster sets a buff, and a kill can call an avenger that goes for the companion.
- A3: a rare drop whose timer shrinks with each kill the carrier makes, with a coin flip on the carrier's death.
- A4: a dead boss shows DEAD until a clock runs out; most clocks are a random window, a few are a fixed weekly slot.
- A5: a per-zone time bank that survives leaving and resumes on re-entry.
- A6: a personal rank and capped top list over one shared score, with the writers still missing.

---

## A1. Kill-site avenger (Cemetery, FieldOfMassacre, LairOfAntharasPytan) [STRONG]
Decision: adapt (idea). Target: src/fight/kill-avenger.ts (proposed name, repo not checked). Row: 23 (zone population: spawn on a trigger, despawn after a timer).

### 1. What the player sees and feels
- You kill one of the listed monsters. Now and then the body is gone, and a new guard-type NPC stands on the same spot and turns to you (or to your pet if one landed the kill).
- On a 375-wide phone the change is one new body where you were already looking, with no HUD cue. It despawns after five minutes (Cemetery.cs:41).
- The three scripts differ only in the roll and the list of monsters: 10 percent in the cemetery script (Cemetery.cs:39), 10 percent in the massacre field (FieldOfMassacre.cs:38), 5 percent in the lair (LairOfAntharasPytan.cs:24).

### 2. Why it works / is striking
- Readable at 375: one new silhouette where the kill was. No menu or icon needed.
- One signature behaviour: the corpse is replaced, so the kill site becomes the ambush.
- One signature sound or effect: none in this code path (the spawn effect is not read).
- Could be made ours at 20-30 percent resemblance: yes. Keep the replace-and-hunt, the roll and the timer. Change the look, the list and the spawn cue.

### 3. The rule behind it
Order, on each kill of a listed monster:
1. Roll (getRandom(100) against a threshold; Cemetery.cs:39).
2. On success, spawn the avenger at the kill location with a 300000 ms lifetime (Cemetery.cs:41).
3. Set its attack desire: the killer, or, if a summon landed the kill, the first servitor, else the pet, else the killer (Cemetery.cs:47).
4. Delete the killed body (Cemetery.cs:49).

Data fields (designer-tunable):
- avenger_chance: 0.10 (cemetery and massacre), 0.05 (lair). Unit: probability per kill. Donor value 0.10 and 0.05 (code constants, MIT).
- avenger_life_ms: 300000. Unit: ms. Donor value 300000 (MIT code).
- kill_list: monster ids per zone. Unit: id list. Donor value null (datapack data).

### 4. For Frankendom
- Shape: one server roll per kill, one spawn with a timer, one attack desire. The engine owns it; the client only shows the new body.
- Many-vs-one: the avenger joins the killer's hate list and counts against MAX_ATTACKERS = 3. If three attackers are already on the player, the avenger waits.
- 700 zones as data: the chance, life and kill list are zone fields. The three scripts become one table, not three copies.
- Keep: the per-kill roll, the body replacement, the five-minute hunt. Change: the copy-paste (three files of the same 40 lines), and the defect below.
- Defect: Cemetery.cs:49 and FieldOfMassacre.cs:51 call npc.deleteMe() outside the null check on the spawn. If addSpawn returns null, the monster is deleted and no avenger appears (silent loss). Fix: delete only when spawnBanshee is not null; otherwise leave the body. The LairOfAntharasPytan.cs:37 call has the same shape.

### 5. A 5-minute look test
- Build: one zone flag on a test creature family at 10 percent, with the avenger on the same kill spot and a 5 s wait before it attacks.
- Dom kills 20 of the same monster on a phone at 375 wide, once with the flag on at 10 percent and once at 0 percent. He counts the avenger appearances and says whether it reads as a threat before it attacks.

### 6. Licence and IP
- Code MIT: the logic may be adapted with its notice. Names, looks and ids are not reused.

### 7. Gaps
- Not read: whether the reward and drop run before deleteMe; the spawn effect; PlainsOfDion.cs and PlainsOfGlory.cs (not opened).

---

## A2. Companion-reactive hive [STRONG]
Decision: adapt (idea). Target: src/fight/hive-reaction.ts (proposed). Row: 4 (fight loop: aggro, chase).

### 1. What the player sees and feels
- Your companion hits the hive's buff monster. The monster then gives the pet a random buff from two (BeeHive.cs:51-59), if the pet is fed and not already buffed.
- Killing a hive monster has a coin flip (BeeHive.cs:81) to call an avenger onto the kill spot for two minutes (BeeHive.cs:35). It goes for your pet if you have one (BeeHive.cs:109), otherwise for you.
- On a 375-wide phone: the companion gets a visible change (effect not read), and the avenger arrives with a summon animation (BeeHive.cs:108).

### 2. Why it works / is striking
- Readable: the companion is the trigger, so the swarm's reaction is tied to a unit the player already watches.
- One signature behaviour: the swarm answers the companion, not the player.
- One signature effect: the avenger spawns with a summon animation. This is the only explicit spawn cue in the donor code read.
- Could be ours at 20-30 percent: yes. Keep the companion-triggered buff and the two-minute avenger. Change the buffs and the monsters.

### 3. The rule behind it
On a summon's hit on the buff monster: if the pet is alive, fed and not already buffed, pick one of two buffs at random (BeeHive.cs:51, 59).
On a kill of a hive monster (eight ids in two level bands):
1. Reward branch first if the killer owns a pet and the target is the buff monster: 0.1 percent for one item, else 1 percent for another (BeeHive.cs:72, 76). Pet owners do not get the avenger from these kills (the branch returns).
2. Otherwise, skip if the killer already has a visible avenger (BeeHive.cs:86).
3. Otherwise a 50 percent coin flip (BeeHive.cs:81). The avenger type depends on the band (isLow, BeeHive.cs:92) and on whether the killer has a pet (BeeHive.cs:98 and 102).
4. Two-minute life; attack desire on the pet, else the killer (BeeHive.cs:109).

Data fields:
- avenger_chance: 0.5. Unit: probability per kill. Donor value 0.5 (MIT code).
- avenger_life_s: 120. Unit: s. Donor value 120 (MIT code).
- reward_rate_low / reward_rate_box: 0.001 and 0.01. Donor values as code constants (MIT).
- buff_skill_ids: two, data. Donor value null.

### 4. For Frankendom
- Shape: a companion action (hit) changes the monster's state; a kill rolls a timed reaction. Both are server-side state; the client shows the buff and the avenger.
- Many-vs-one: the avenger targets the pet through the same hate list; it counts toward MAX_ATTACKERS = 3.
- Keep: the companion-triggered buff, the coin-flip avenger, the timer. Change: the per-killer cap, which is held in engine state, not a scan (defect below).
- Defect: BeeHive.cs:86 checks for an existing avenger by scanning visible monsters (World.getInstance().getVisibleObjects). A player who moves out of view can start a second avenger. Fix: store the live avenger id on the player state and check that.

### 5. A 5-minute look test
- Build: a companion-triggered buff on one monster family and a two-minute avenger on a 50 percent roll.
- Dom hits the hive monster 10 times with the pet out, watches whether the buff reads at 375 wide, then kills one and watches the avenger; then repeats with no pet.

### 6. Licence and IP
- Code MIT. Creature names, buff ids and the item ids are not reused.

### 7. Gaps
- Not read: the buff effects (skill ids 48197 and 48198, not opened); the summon animation code; the client half (not in the box).

---

## A3. Cursed relic with a shrinking timer [STRONG]
Decision: adapt (idea), with the level defect fixed in the sketch. Target: src/fight/relic-carrier.ts (proposed). Row: 18 (loot roll and XP award).

### 1. What the player sees and feels
- Very rarely, a dark sword drops where a monster dies. The carrier is transformed: doTransform (CursedWeapon.cs:276) schedules the transform after 500 ms (CursedWeapon.cs:293). The callers were not all read.
- While they carry it, every kill they make cuts the relic's life by three minutes (CursedWeapon.cs:477). At each stage of ten kills the skill tier goes up (CursedWeapon.cs:259).
- The relic starts with a 300-minute life (CursedWeapon.cs:333). If the carrier dies, a coin flip decides whether it vanishes or drops where they fell (CursedWeapon.cs:436).
- On a 375-wide phone: one carried item and one countdown. The countdown is the story.

### 2. Why it works / is striking
- Readable: a single carried item and a single number.
- One signature behaviour: the timer shrinks with the carrier's kills, so the carrier is racing it.
- One signature effect: the transform on pickup (presentation not read).
- Could be ours at 20-30 percent: yes, as a zone-wide bounty that every creature in the zone hunts.

### 3. The rule behind it
Order, on each monster kill (not Defender, Guard, GrandBoss, FeedableBeast or FortCommander; CursedWeaponsManager.cs checkDrop):
1. If the relic is not active, roll Rnd.get(100000) < dropRate (CursedWeapon.cs:327). The data sets dropRate = 1 (CursedWeapons.xml:5), so the chance is 1 in 100000 per eligible kill.
2. On success: drop at the kill site, set life to 300 min (CursedWeapon.cs:333), start a poll every 36 s (CursedWeapon.cs:334: durationLost times 12000 ms).
3. Each carrier kill: kills + 1 (CursedWeapon.cs:477 cuts life by 3 min); tier = 1 + kills div stage (CursedWeapon.cs:259), capped at the skill's max level (cap logic in giveSkill and getLevel).
4. Carrier death: if Rnd.get(100) <= 50 (CursedWeapon.cs:436) the relic ends; else it drops and the carrier's reputation and PK count are restored.

Data fields:
- drop_per_100k: 1. Unit: chance per 100000 eligible kills. Donor value null (datapack, class C).
- life_min: 300. Unit: minutes. Donor value null.
- life_cut_per_kill_min: 3. Donor value null.
- stage_kills: 10 (CursedWeapons.xml:8). Donor value null.
- vanish_pct_on_death: 50 (CursedWeapons.xml:4). Donor value null.
- poll_period_s: durationLost × 12 (code constant). Donor value: 12 per unit (MIT code).

### 4. For Frankendom
- Shape: a drop roll on a kill, a timed item with per-kill shrink, a death coin flip. All server-side; the client shows the carry and the countdown.
- Many-vs-one: a carrier is a target for every creature in the zone; the hate list gives this for free. MAX_ATTACKERS = 3 caps who can hit at once.
- Keep: the shrink per kill, the stage ladder, the death coin flip. Change: the level formula (defect below), and the bookkeeping (replace the PK count with our own ledger).
- Defects, with fixes:
  (a) Level off by one. giveSkill uses level 1 + kills div stage (CursedWeapon.cs:259); getLevel returns kills div stage with no plus one (CursedWeapon.cs:622). Fix: one function used by both.
  (b) The poll is labelled in minutes but runs at 12 s per unit, so it checks every fifth of a unit. Fix: label the value in seconds, or state the fifth on purpose.
  (c) giveSkill throws InvalidOperationException if the skill row is missing (CursedWeapon.cs, giveSkill). A kill can crash. Fix: fall back to the last valid tier and log.
  (d) dropRate = 1 with the comment "100000 for 100%" is correct but easy to misread. Fix: name the field drop_per_100k.

### 5. A 5-minute look test
- Build: the relic at 1 in 100 for the test only, a 60-minute life and a stage of 5 kills, on one zone.
- Dom carries it through 15 kills on a phone at 375 wide, watches the countdown and the tier change, then dies once and reads whether the vanish or drop is clear.

### 6. Licence and IP
- Code MIT, datapack class C. The item and skill names are not reused. The mechanism is kept; the look is ours.

### 7. Gaps
- Not read: skill max level and skill effects; the drop function (Attackable.dropIt); the transform code; the restore path for reputation and PK count.

---

## A4. Scheduled raid-boss clock and grand-boss store [STRONG, one defect that breaks a path]
Decision: adapt (idea) with the pattern defect fixed in the sketch. Target: src/fight/boss-respawn.ts (proposed). Row: 23 (zone population: respawn timer).

### 1. What the player sees and feels
- A raid boss that is down shows DEAD until its clock runs out, then it returns. The server sends boss-status packets (ExRaidBossSpawnInfoPacket and RequestRaidBossSpawnInfoPacket exist; the handler was not read).
- Most bosses come back in a random window: 24 hours plus or minus 12 hours (RaidbossSpawns.xml:4). Two bosses are on a fixed weekly slot instead: 19:00 on Monday and Thursday for one, and Tuesday and Friday for the other (RaidbossSpawns.xml:303-304).
- On a 375-wide phone the boss screen shows one status word per boss and one time, which is enough.

### 2. Why it works / is striking
- Readable: status word plus time. The player does not need to watch the map.
- One signature behaviour: a dead boss keeps a clock that everyone can read; the weekly slot makes the boss an appointment.
- One signature effect: none in the code read.
- Could be ours at 20-30 percent: yes. Keep the status word, the window, and the weekly slot as data.

### 3. The rule behind it
On death (Npc.cs:953 calls updateStatus on every NPC death; it returns early for NPCs that are not DB spawns):
1. Status becomes DEAD (DBSpawnManager.cs:178).
2. If the spawn has a weekly pattern, the next time comes from the pattern (DBSpawnManager.cs:187). Otherwise the delay is a random draw between min and max, where min and max come from the spawn's delay plus or minus its random interval (Spawn.cs:455-458, floor 10 s), each times a config multiplier (DBSpawnManager.cs:194-196; Config.Npc.cs:97, default 1.0).
3. The respawn is scheduled on the thread pool (DBSpawnManager.cs:210). The current HP and MP reset to max (DBSpawnManager.cs:200).
4. Status reads DEAD while a respawn is pending and the NPC is gone (DBSpawnManager.cs:429).
5. Grand bosses keep a status number and a respawn time in the database, written every five minutes (GrandBossManager.cs:74). An unknown boss reads -1 (GrandBossManager.cs:79).

Data fields:
- respawn_base_h: 24 (RaidbossSpawns.xml:4). Donor value null.
- respawn_random_h: 12 (RaidbossSpawns.xml:4). Donor value null.
- respawn_floor_s: 10 (Spawn.cs:458). Donor value 10 (MIT code).
- multiplier_min, multiplier_max: 1.0 (Config.Npc.cs:97). Donor value 1.0 (MIT code).
- store_interval_min: 5 (GrandBossManager.cs:74). Donor value 5 (MIT code).
- weekly_slots: a pattern string per boss. Donor value null (datapack).

### 4. For Frankendom
- Shape: a server clock per boss; the boss-watch reads it. The clock survives a restart (the stored time is re-scheduled at boot).
- 700 zones as data: each boss's base, random window and slot are zone fields.
- Keep: DEAD while waiting, the persisted clock, the weekly slot. Change: the defects below.
- Defects, with fixes:
  (a) The weekly path breaks. SchedulingPattern.next() throws NotImplementedException (SchedulingPattern.cs:16). The file's own comment says it is a stub (SchedulingPattern.cs:3), and the full L2J-style implementation is commented out in the same file. The two weekly bosses call next() when they die (DBSpawnManager.cs:187), so the death path throws there. What catches it was not read. Fix: restore the commented implementation or a tested parser, and add a test for the two patterns.
  (b) The weekly path overwrites a pending respawn without cancelling it (DBSpawnManager.cs:204-210). Fix: cancel the old future first.
  (c) Min and max multipliers are applied separately (DBSpawnManager.cs:194-195). If a pair of multipliers ever gives min above max, Rnd.get draws from an inverted range (Rnd.get not read). Fix: one shared multiplier, or clamp min to max.

### 5. A 5-minute look test
- Build: a two-minute window on one boss in a test zone, a status word on the boss screen, and one weekly slot set to ten minutes from now (after the fix).
- Dom kills the boss on a 375-wide phone, watches DEAD, then ALIVE when the clock runs out, and checks the weekly slot.

### 6. Licence and IP
- Code MIT. Boss names, ids and the map positions are not reused; the clock is kept as an idea.

### 7. Gaps
- Not read: Rnd.get; the ThreadPool scheduler; the boss-status packet handler; the death code before Npc.cs:953; what catches the pattern exception; grand-boss AI.

---

## A5. Timed hunting zone time bank [STRONG]
Decision: adapt (idea). Target: src/fight/zone-timebank.ts (proposed). Row: 23 (zone as data, entry and exit rules; the nearest row).

### 1. What the player sees and feels
- Entering a timed hunting zone starts a bank. The data has one such zone: an hour to start, five hours at most added, a ten-hour reset delay, and an entry fee of 10000 (TimedHuntingZoneData.xml:5-10).
- The bank runs while you are inside. Leave with time left and the rest is kept; come back and it resumes (TimedHuntingZone.cs:40-43).
- If the bank is empty on entry you are sent to town (TimedHuntingZone.cs:91).
- On a 375-wide phone: a time bar and one number, not a timer on the map.

### 2. Why it works / is striking
- Readable: a bar and a number.
- One signature behaviour: time you did not use is saved for later, so the bank has a value of its own.
- One signature effect: none in the code read.
- Could be ours at 20-30 percent: yes. A zone-wide bank for a farming zone with a reset delay.

### 3. The rule behind it
On enter (TimedHuntingZone.cs:40-43):
1. Read the remaining bank for this zone.
2. If above zero, start the countdown from now plus the remaining time, set the zone flags (PvP or no-PvP by zone), and broadcast.
3. If zero, send the player to town (TimedHuntingZone.cs:91).
On exit: clear the zone flags, and one second later send the client an exit packet if the player is no longer in any timed zone (TimedHuntingZone.cs:159).

Data fields:
- initial_s: 3600 (TimedHuntingZoneData.xml:5). Donor value null.
- reset_delay_s: 36000 (TimedHuntingZoneData.xml:6). Donor value null.
- max_added_s: 18000 (TimedHuntingZoneData.xml:7). Donor value null.
- entry_fee: 10000 (TimedHuntingZoneData.xml:10). Donor value null.
- exit_packet_delay_ms: 1000 (TimedHuntingZone.cs:159). Donor value 1000 (MIT code).

### 4. For Frankendom
- Shape: a per-player, per-zone ledger of time. One ledger, server-verified; the client shows the bar.
- 700 zones as data: the bank size and reset are zone fields.
- Keep: the bank that survives leaving, the town fallback. Change: nothing in the rule yet; the reset and refill are not read.

### 5. A 5-minute look test
- Build: a three-minute test bank in one zone.
- Dom enters, fights, leaves, returns; then runs the bank to zero on a 375-wide phone and checks the town fallback.

### 6. Licence and IP
- Code MIT; datapack class C. The zone name and map position are not reused.

### 7. Gaps
- Not read: the reset and refill code; the timed-zone packets; the zone shape file (zones/timed_hunting.xml).

---

## A6. Balok boss-war ledger [PARTIAL]
Decision: adapt (idea) only after the writers exist. Target: src/fight/event-ledger.ts (proposed). Row: 18 (loot roll and XP award: points per kill).

### 1. What the player sees and feels
- Server packets exist for a war panel, a personal rank, a top list of up to 150 (BalrogWarShowRankingPacket.cs:14), a reward claim, and a teleport to the boss area for 50000 (ExBalrogWarTeleportPacket.cs).
- In this donor, nothing writes the score, the war state, the stage or the reward flag. A player sees an empty war.

### 2. Why it works / is striking
- The ranking readout and the personal rank are a clear ledger at 375 wide.
- It is PARTIAL because the event has no writers. The shape is useful; the flow is not there.

### 3. The rule behind it
- Points per monster come from config (default 10); the scorpion-type kill counts times ten (BattleWithBalokManager.cs:26).
- Personal rank = 1 plus the number of players with more points (BattleWithBalokManager.cs:46 has a TODO on ties).
- Reward is claimed once; the claim count is 30 when the stage is below 4, else 1 (ExBalrogWarGetRewardPacket.cs:28-35).

Data fields:
- points_per_monster: 10 (config default). Donor value 10 (MIT code).
- scorpion_multiplier: 10. Donor value 10 (MIT code).
- top_list_size: 150. Donor value 150 (MIT code).

### 4. For Frankendom
- Keep: one shared score per event, a personal rank with a capped top list. Change: write the score on kills and set the stage from data.

### 5. A 5-minute look test
- Build: a three-row ranking overlay on a test event with scripted points.
- Dom reads it at 375 wide and says whether the rank is clear.

### 6. Licence and IP
- Code MIT. Names are not reused.

### 7. Gaps
- By grep on the VPS (L2Dn tree): no caller of addPointsForPlayer, setInBattle(true), setGlobalStage, setGlobalPoints or setReward; BALOK_AVAILABLE_REWARD is read and cleared to -1 but never set to 1. Not read: the war's scripts and the stage data.
