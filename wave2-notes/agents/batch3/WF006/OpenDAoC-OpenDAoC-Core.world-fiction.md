# OpenDAoC-OpenDAoC-Core (world-fiction, cell WF006)

Donor: OpenDAoC-OpenDAoC-Core. Code licence: GNU GPL v3 per LICENSE and README.md:41. Conflict: root gpl.txt is GPL v2 text and the per-file header says v2 or later (AU038). Unresolved, so treat as GPL: clean-room, shape only, no donor numeric values. Content: zone, realm, guard, keep and title text belongs to the emulated game; rights unknown.

Checked: gameutils/Faction.cs (full), gameutils/FactionMgr.cs (partial), serverrules/AbstractServerRules.cs (call site), ai/brain/StandardMob/StandardMobBrain.cs (target rule), gameobjects/GameNPC.cs (standing word, examine), keeps/AbstractGameKeep.cs (level timer, upgrade time, reset), keeps/Managers/Player Manager.cs (broadcasts), keeps/Managers/GuardTemplateManager.cs (guard naming), ECS-Services/TimerService.cs (timer stop rule), gameobjects/GamePlayer.cs (realm title), scripts/titles/RealmRanksTitle.cs, GlobalConstants.cs (realm names), scripts/quests/Albion/epic/Academy50.cs (rumour speech). Data: scripts/dbupdater/insert/Zones.xml, Regions.xml, StartupLocation.xml (counts); language/EN/Zones.txt, World.txt, Keeps/Keeps.txt, Keeps/Managers.txt, Keeps/Guards.txt, GameObjects/GameNPC.txt, PlayerRealmTitles.txt (keys). Confidence: high on the code paths read; the donor's keep-upgrade design is a comment and I say so. Half read: server (GameServer code) and data (XML and language keys). Client half is not in the box. The companion database (keep rows, live faction seeds) is not in the box.

## 1. What the player sees and feels
A zone-entry message names the zone (World.txt key; the send site was not read). Examine a monster or guard and the line carries one standing word: friendly for your own realm; for another realm, the word follows how that NPC's faction currently feels about you, from friendly through neutral and hostile to aggressive. Keep fights are announced to the whole server in one line: a keep captured, claimed, razed or released by a realm or guild. Guards carry their place in their name: a commander takes the zone's name, a rogue guard is named as a renegade of a realm, a tower has its own captain. Realm rank titles change every ten realm levels. At 375 wide the examine word is the single thing to read; the broadcast is one chat line.

## 2. Why it works or is striking
- Readable at 375 wide: one standing word on examine. It can be read in a glance and it changes without a bar.
- Signature behaviour: a kill of one faction's member moves its friends and enemies one step each, so the world's temper towards you drifts with what you have killed.
- Signature effect: a single server-wide line when a keep changes hands. The text names the realm and the keep.
- Could be made ours at 20-30 percent resemblance: the commander who carries his zone's name; a standing word on examine; a faction that warms to you when you hit its rivals.

## 3. The rule behind it
Rule A, faction standing (Faction.cs). Each faction keeps one aggro value per player, between minus 100 and plus 100 (lines 14-15, 124), starting from the faction's base value. When a member of faction F is killed by a player (AbstractServerRules.cs line 1052), each friend faction of F gets +1 added to its aggro toward the killer (line 91), so friends turn colder to you, and each enemy faction gets -1 (line 94), so enemies turn warmer. The standing word is set by the value's band: above 75 aggressive, above 50 hostile, above 25 neutral, else friendly (line 139 onward). An NPC of a faction attacks a player only when that player's standing is aggressive, and attacks an NPC of an enemy faction (StandardMobBrain.cs lines 536-537). Same-realm NPCs always read as friendly on examine (GameNPC.cs line 2202).
Rule B, keep control and clock (AbstractGameKeep.cs, Player Manager.cs). Keeps belong to a realm. Capture, claim, raze, release and relic moves each have a broadcast template with the realm and keep slots (Player Manager.cs line 42; Keeps.txt). A tower below 75 percent health pushes the keep's level change back by five minutes (lines 993-994). The upgrade time function (line 1026) holds a design comment: upgrade time from level 5 to 10 scales with relics held, in steps. The body returns zero (line 1037). The timer service stops any timer whose callback returns zero or less (TimerService.cs line 125). So as read, the level-change callback does not re-arm itself; re-arm elsewhere not read.
Rule C, naming (GuardTemplateManager.cs, language keys). Guard name = role class plus model realm plus zone: the commander name interpolates the zone description (line 1029; Managers.txt line 4), a rogue guard uses a renegade template (Managers.txt line 6), and realm-specific role names sit in 28 realm branches (case eRealm lines). 37 SetGuardName keys and 6 guard-examine keys in the language files.
Rule D, realm rank titles (GamePlayer.cs line 3592; RealmRanksTitle.cs line 71). Rank index = realm level divided by 10. Title key = realm, gender, rank. PlayerRealmTitles.txt holds 90 realm-rank keys (3 realms x 2 genders x 15 ranks) plus 3 starter and unknown keys (93 total, counted). Fallback is a hard-coded table; if that fails the title reads "Unknown Rank" (GamePlayer.cs catch block).
Rule E, zones as data (Zones.xml, Regions.xml). Zones.xml: 473 rows, ZoneID values from 0 to 499 with gaps; each row has a grid box (offset x, offset y, width, height), water level, diving and lava flags, and reward fields (experience, realm points, bounty points, coin). Realm is 0 in every seed row (counted). Regions.xml: 344 rows, with housing and diving flags. StartupLocation.xml: 136 rows. Zone text: 316 description keys and 316 screen-description keys (Zones.txt; counted).
Rule F, rumour as quest speech (Academy50.cs lines 1187 and 1344). NPCs in quest scripts carry rumours as dialogue lines that point the player at the next task. Bracketed words in that speech read as keywords; I did not find server-side parsing of them, so the client probably renders them (not verified).

Data fields (designer-tunable; donor values not used: GPL):
- faction.base_standing | points, -100 to +100 | null. Our start: 0
- faction.kill_friend_step | points per kill | null. Our start: +1
- faction.kill_enemy_step | points per kill | null. Our start: -1
- faction.band_edges | points | null. Our start: 25, 50, 75
- faction.change_chance | percent | null. Our start: 100 (no roll) unless Dom wants the roll as a named dial
- keep.level_change_delay_tower_low | seconds | null. Our start: 300 when a tower is under 75 percent
- keep.upgrade_time_by_relics | hours per relic count | null. Donor comment shape only; our starts set by Economy lane
- guard.name_template | text id | null
- realm_title.rank_size | realm levels per rank | null. Our start: 10
- zone.realm_seed | realm id | null. Our start: set per zone (donor seeds all to 0)

## 4. For Frankendom
- One engine: standing lives on the server, per player per faction. The client only shows the examine word and the broadcast line. That is the server-verified event shape we want.
- Many-vs-one: the faction rule decides who attacks whom in a group. A pack that is aggressive to one player is a hate-list decision in the engine, not in the client. The kill step (plus one friends, minus one enemies) is the fast version of the hate list. Keep it small and clamped.
- 700 zones as data: Zones.xml shows a zone as one row with a box, flags and rewards. Ours can add a realm or faction seed and a guard-name template per zone; the 100 Pit characters can be reused across zones with names from the template.
- Walk density: a commander name tells the player where they are without a sign. A guard per zone is a row 23 spawn with a zone-named template.
- Titles: realm level divided by ten is a clean progression table. Title keys by realm and gender are data, not code. Ours may use the same index for the Pit titles, lane permitting.
- Parity rows: row 14 (HUD) for the examine word; row 18 (kill to ledger, one-ledger rule) for the kill step; row 23 for guards and zone ownership; server tick sub-line for the keep clock.
- Keep: standing word on examine, one step per kill, a band ladder, zone name line on entry, one broadcast line per capture.
- Change: fix the 20 percent gate and the message rule (below); make the keep upgrade clock real data; zone realm and faction seeds set per zone, not all zero; never let the client run the clock.

Defects found in the donor (keep the idea, fix the defect):
- Util.Chance(20) at Faction.cs line 113 gates the standing change. Reading it as a 20 percent roll (the Util body is not read), four calls in five change nothing, but the relationship message at line 131 is sent on every call. Fix: send the message only when the stored value changes, and either remove the roll or name it as a designer dial (faction.change_chance).
- The clamp at plus or minus 100 (line 124) also sends the message when nothing changes. Fix: same as above.
- Keep upgrade time (line 1026) returns zero after a design comment; the relic table is not implemented, and the timer stops on zero (TimerService.cs line 125). Fix: implement the relic-count table as keep data and return the real interval; re-arm the timer on each level step.

## 5. Five-minute look test (Dom, on the phone)
Build one flag in a Pit zone scene: a rival-faction guard with the examine word, plus a broadcast line when a test keep changes hands. Show the word as it moves: friendly, then neutral, then hostile, after a fixed number of kills (for example 3, 6, 9). Compare two shapes on a 375-wide phone: (A) the single word, (B) a three-step bar with the same word under it. Judge: can the word be read in one glance, does a kill feel like it moved the world, does the broadcast line read as news. Engineering check, not Dom's: 20 kills with the roll on and off; count messages sent against standing changes.

## 6. Licence and IP
Code: GPL (v3 per LICENSE, v2 text in gpl.txt; unresolved). Clean-room, shape only; no adapted code and no donor numbers as values. Content: the three realm names, guard names, rank titles, zone names and keep text all come from the emulated game with unknown rights. Keep category level only: "three realms with ranks by gender", "a commander named after his zone", "a standing word on examine". Do not use any donor name, title or realm name.

## 7. Gaps
- Not read: the database companion (keep rows, live faction seeds, zone rows beyond the seed), 316 zone text pairs (keys counted, text not read), 199 named mob files (AU038 read 3; not read here), FactionMgr.cs beyond its header, KeepManager and KeepBonusManager, Util.Chance body, GameNPC.cs beyond the examine path, most of AbstractGameKeep.cs outside the lines above.
- Half read: server (GameServer code) and data (XML and language keys). Client absent. No paired donor.
- Walk density in the donor: not measured (no spawn-count data read here).
- Idle and ambient animation vocabulary: not read.
- Death and respawn presentation, loot reveal, boss staging: not in this topic.
- Readability at 375 wide: judged by the examine word length only, not on a screen.
- Signage: no sign object in the GameServer code I read (only consignment). Client art absent.
- Three-line story per zone: not found. The zone entry is one line; the nearest is NPC quest speech (Rule F). Gap, not a finding.
