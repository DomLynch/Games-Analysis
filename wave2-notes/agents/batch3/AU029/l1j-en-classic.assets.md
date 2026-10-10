# l1j-en-classic (asset audit, AU029)

Donor: l1j-en-classic, a Java server emulator for Lineage 1 (English, targets the final 2009 US client). Half read: SERVER (src/l1j, data, db, config, maps). The client half is absent by design. No paired donor for the client exists in this box.
Code licence: GNU GPL version 2 (COPYING line 1; README.md line 115).
Asset licence: no separate asset licence found. The data files sit under the same repo-wide GPL-2.0 statement (README line 115). No client art, sound or model files are in the box.
Rights-holder status (from files): self-described clean-room server emulator (README line 84). The README names the Lineage 1 target client (line 6) and refuses contributions that may breach copyright or trademark law. Game-specific tables are not clearly cleared, so class C.
Best class: C for the data (maps, SQL, XML, text); B for config and the game-rule XML under the GPL-2.0 statement; D for the absent client art and the unopened connector zip.
Checked: COPYING and README (licence, clean-room and target lines), db table headers and insert counts, npc table trait columns, BossCycle.xml head, L1BossCycle.java target and spawn-time methods, L1NpcInstance.java link methods, rates.properties head, maps listing.

## 1. Licences
- COPYING: GPL v2 text (line 1 title; line 59 repeats the title).
- README.md line 115: "Distributed under the GNU General Public License, version 2."
- Source headers (for example src/l1j/server/Config.java and ErrorLogHandler.java) carry GPL notices.
- No asset-specific licence line found.

## 2. Asset inventory
- Client art, sound and models: none in the box. Server only. Class D.
- maps/*.txt: 567 files, about 60 MB; each is comma-separated numeric rows. Meaning not verified. Class C.
- db SQL: db/l1jdb_m10.sql (CREATE TABLE npc at line 1544, mobskill at 1514, droplist at 656, boss_kills at 213). Insert statements: npc 2,747; droplist 11,004; mobskill 793; mobgroup 94; armor 624; weapon 331; etcitem 1,861. These are statements, not row counts. Class C.
- db/archive: archive.tar.bz2 (2.97 MB) and m7, m8, m9 folders. Not opened. Listed only.
- data/xml: 7 files (BossCycle, TreasureBox, GMCommands, Teleporter, ItemMaking, SingleItemMaking, Quest). Only BossCycle.xml read at its head. Class B (GPL-2.0 repo statement).
- data text: announcements, badnames, ingamenews (txt); idstate.dat (binary, not opened). Class C.
- config: 6 properties files; rates.properties sets per-location regen (RateHpRegen at line 7, RateHpCastle at line 10). Class B.
- tool: connector zip (Login_v240.zip, not opened or extracted) and a PHP and JS telnet tool (not read). Class D.

## 3. Rights-holder status
Self-described clean-room server. README line 84 says the project holds no information from the client, and README line 6 names the target client. No rights holder is named for the data tables.

## 4. Inspiration (my own words)
- Scheduled world-boss window: a base date and period set the cycle; start and end offsets set the window; the appearance is a random point inside it (L1BossCycle.java 215-258; BossCycle.xml line 13). Keep the daily window and the random appearance; add a sighting hint and a daily jitter.
- Defect, keep the idea: the cycle search steps the base date one period at a time, so cost grows with elapsed time (L1BossCycle.java 215-232). Fix: closed form from elapsed minutes modulo the period.
- Defect, keep the idea: calcSpawnTime draws a new random offset on every call (L1BossCycle.java line 256), so one boss can report a different time on each call. Fix: draw once per cycle and store it.
- Pack alert by family tag: each creature row has a family id and an agro-family mode; a link search over known creatures links the same family in mode 1 and all family members in other modes; mob group members are linked too (L1NpcInstance.java 373-389). Keep the tag and mode; use a hate list with a three-attacker cap per the Frankendom rulings.
- Defect, keep the idea: the base setLink body is empty (L1NpcInstance.java 370-371). Overrides exist in L1MonsterInstance.java line 207 and L1GuardianInstance.java line 97 (not read). Fix: keep link logic in one place.
- Creature traits as row columns: tamable, item pickup, digestion, ranged, agro and family flags on the npc row (l1jdb_m10.sql 1566-1582). Keep the flags as data; show them as silhouette marks.
- Rest-zone regen multipliers as data (rates.properties, RateHpCastle at line 10). Show rest zones with a campfire glow, not a number.
- Skill and drop rows keyed by creature (mobskill, droplist). Keep the keying; add a telegraph per skill and a loot ceremony.

## 5. Briefs
Four briefs in the json: Window boss, Pack-alert creature, Rest-ring shrine, Trait-marked creature. Each names the kept and changed trait. Clearly distinct originals only.

## 6. Cross-link
- spawns: boss window and pack alert; walk density not read.
- progression: none read.
- loot: droplist rows; the loot ceremony is an idea only.
- vfx and hud-ui: no client files, so no visual assets here.
- sound: none in the box.
- camera and animation: none in the box (server).
