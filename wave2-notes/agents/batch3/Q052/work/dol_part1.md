# Dawn-of-Light-DOLSharp (progression, cell 10)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/serverrules/AbstractServerRules.cs` (`OnNPCKilled`, with `gameobjects/GamePlayer.cs` `GainExperience` and level code, `gameobjects/GameLiving.cs` tables, `serverproperty/ServerProperties.cs` defaults) | Licence: GPL-2.0 (repo LICENSE is the GNU GPL version 2 text; per-file headers and `gplheader.txt` not read) -> copyleft, clean-room only | C# | symbol `AbstractServerRules.OnNPCKilled`

Checked: Read in full: `OnNPCKilled` (AbstractServerRules.cs 1042-1326; the realm and bounty block 1128-1179 read but not detailed), `GetExperienceForLiving` (604-646, table and formula), `GamePlayer.GainExperience` override (4864-4998), `GetExperienceNeededForLevel` and the XP-to-level table (4664-4725, 4775-4830), `GameLiving` XP value and grey-con table (1314, 1362, 1474-1526, 1547-1560), base `GainExperience` (4514-4516), tuning defaults (ServerProperties.cs 835-860, 1944), and `GameTrainer.cs` 154-162. Callers: I read only the NPC-kill caller (1324); grep found other `GainExperience` callers (player-kill paths 1454 and 1665, `OnLivingKilled` and `OnPlayerKilled`, not read; GM and `/level` commands; guild XP; death XP loss at GamePlayer.cs 1631-1634), so the claims below about the whole pipeline hold for these callers only where I say so. Not read: `OnLivingKilled` (player-kill XP, 1335-1465), `GameNPC.IsWorthReward` (3896), `ZoneBonus.GetXPBonus`, the body of `OnLevelSecondStage` (5238-5245 partly), the outpost-bonus constants (1287-1303 read, not checked against defaults), `Lord.ExceedXPCapAmount` (grep only). Confidence: high on the kill split, caps, camp counter and GainExperience order; medium on the level-up path (one `Level++` site read; no other level-raising site was searched for).

Best transferable idea: Split a kill's XP by damage share, cap each award at a percent of the monster's level value, and give a camp bonus that decays with repeat kills of the same spawn and resets after a quiet period; then grant the XP through one function that applies rates to the base only and keeps the XP at or above the level floor.

Decision (proposed): adapt - the damage-share split, the cap and the timed camp bonus fit Frankendom's server-verified kills (the server holds the damage ledger and computes the award once), but the camp counter must step once per kill, not once per gainer as in the donor (line 1257 runs inside the per-gainer loop, so a four-person kill drains it four times); the grouped full-value rule (line 1189) is rejected unless designed on purpose, because it can pay each grouped member a full NPC value regardless of damage share.
Acceptance: A server test kills one NPC with four in-range group members who each dealt damage, and asserts that the NPC's camp counter drops by exactly one 0.05 step and that each member's award equals base + camp + 12.5% x 4 with base capped at 125% of that member's table value.

## 1. Mechanism

- Gate: if the NPC is not worth reward (charmed recently, `IsWorthReward`), the function only tells the damage dealers "no experience" and returns (1054-1063).
- First pass over the damage ledger (`XPGainers`): total damage is summed; only active players within `MAX_EXPFORKILL_DISTANCE` (16384 units, WorldMgr.cs 59) count as in range (1078). Each group gets a count of its in-range members (1087-1090). `isGroupInRange` is true if any grouped in-range player other than the killer is present (1085). The highest-level grouped in-range player is recorded, and that player's con to the NPC is computed once before the loop (1106-1108).
- NPC values: `ExperienceValue` (= the monster XP table for the NPC's level, GameLiving.cs 1314), realm points, bounty points, and an exceed-cap multiplier (1100-1103).
- Second pass, once per gainer (loop 1111-1326; the camp-bonus decay sits inside this loop): pets are credited to their owner (1116-1121); out-of-range or inactive gainers are skipped (1123); the damage share is `damage / totalDamage` (1127). Realm and bounty points are paid in this loop (1128-1179, not detailed here).
- Base XP (1181-1189): a gainer who is not in a counted group gets `floor(NPC value x damage share)`. A gainer in a counted group gets the full NPC value (1189).
- Cap (1200-1242): `expCap` = monster XP value for the player's level x 125% (`XP_Cap_Percent`, default 125; 1200-1204). If the player is in a group and another grouped member is in range, the group cap percent applies (1206-1209). Challenge code (1230-1233): if the highest grouped player cons below the NPC (`highestConValue < 0`), the cap is replaced by the monster XP value for the level implied by that con. The cap is multiplied by the exceed-cap multiplier (1239), and `xpReward` is clamped to it (1241-1242).
- Camp bonus (1246-1271): `fullCampBonus` = `MAX_CAMP_BONUS` (0.55 default). If the NPC's spawn tick is more than 1800000 ms ago, the percent is 0.55 and the NPC's camp counter is set to 0.95 (1249-1252). Otherwise the percent is 0.55 x the counter, and the counter drops by 0.05 while it is at least 0.05 (1256-1257). Dungeon kills get x1.20 (1262-1264). The percent is set to 0 below 0.01 and capped at 0.55 (1265-1269). `campBonus` = `floor(xpReward x percent)` (1270). The counter therefore decays per gainer, not per kill.
- Outpost bonus (1281-1303): within 16000 units of a keep, the owning guild gets 20% and the owning realm gets 10% (the realm case only on GST_Normal servers), plus a keep-wide 5% or 3% experience bonus, all of `xpReward / 100` times the percent (1283-1302).
- Group bonus (1305-1311): `groupExp` = `floor(0.125 x xpReward x members in range)` for a grouped gainer (1310).
- Sum and death (1318-1321): `xpReward += campBonus + groupExp + outpostXP` (1318); a dead gainer gets 25% (1320-1321).
- Award (1324): `GainExperience(NPC, xpReward, campBonus, groupExp, outpostXP, sendMessage, allowMultiply=true, notify=true)`.
- Grant (`GamePlayer.GainExperience`, 4864-4998): (a) refuse if `GainXP` is off (4866). (b) If `allowMultiply`: subtract the group, camp and outpost parts so only the base is multiplied (4873-4875); the zone bonus is granted separately with rate applied (4878-4887); the base is multiplied by `RvR_XP_RATE` in RvR zones or `XP_RATE` elsewhere (4890-4894); the ToA XP-points percent is added (4896-4900); the hard cap is `GetExperienceForLiving(Level) x 500%` (`XP_HardCap_Percent` default 500; 4902-4906); the parts subtracted in (b) are added back after the cap (4907-4909). (c) Champion XP (4914). (d) Catacomb classes below level 20 get x1.5 unless `ALLOW_CATA_SLASH_LEVEL` (4924-4935). (e) Base event fires (4938). (f) Floor (4940-4950): on a second stage hero the floor is `1 + XP-to-current-level + (XP-to-next-level - XP-to-current-level) / 2`; otherwise the floor is XP-to-current-level; a gain that would leave XP below the floor is raised so XP lands on the floor (this is how a death loss is capped). (g) `Experience += expTotal` (4976). (h) Level step (4978-4996): only for a gain that is zero or more; at level 5+ without class advancement no level is raised (4981-4987); at levels 40 to 49 with XP at the second-stage floor, the hero enters second stage (4989-4992); otherwise, if XP reaches XP-to-next-level, `Level++` runs once (4994-4996).
- Level table (GamePlayer.cs 4711-4725): XP to reach level n is `XPForLevel[n-1]`: 50 for level 2, 250 for level 3, ..., 169999950 for level 50, with a sentinel 999999999950 above the cap (4679-4699, table 4711-4765). `MaxLevel` is 50 (4673).
- Grey con (GameLiving.cs 1474-1560): `NoXPForLevel[source level]` gives the highest target level that is grey to a source of that level (e.g. 6 at source level 10, 13 at 20, 35 at 50); above the table the test is a con of -3 or lower (1553-1558). This table is used for aggro and targeting (StandardMobBrain.cs 734; GameNPC.cs 3918, 3928). The XP path read above does not use it.
- Caller behaviour seen: a trainer calls `GainExperience(Other, 0)` with the comment "//levelup" (GameTrainer.cs 154), so a zero-XP call is the trigger for a level step that was missed; the free-level XP for a trainer is the XP difference between the next two levels (GameTrainer.cs 160-162), granted through the two-argument overload, which does not multiply (GameLiving.cs 4538-4541).

## 2. Key functions

- `AbstractServerRules.OnNPCKilled`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/serverrules/AbstractServerRules.cs` 1042-1326. Damage ledger to XP, RP and BP awards.
- `AbstractServerRules.GetExperienceForLiving`: same file, 604-646. Monster XP per level: table lookup for levels inside the table (609-610); beyond the table, the formula (612-646) with constants chosen by level band: level 35 and up: k1 = 20, increment 0.2, base 35; 20 to 34: k1 = 15, increment 0.3334, base 20; 10 to 19: k1 = 10, increment 0.5, base 10; below 10: k1 = 0, increment 1, base 0; value = 2^(k1 + (level - base) x increment) x 5 (621-646, read).
- `GamePlayer.GainExperience` (override): `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/GamePlayer.cs` 4864-4998. Rates, hard cap, floor, store, one-step level-up.
- `GamePlayer.GetExperienceNeededForLevel`, `GetExperienceAmountForLevel`, `XPForLevel`: same file, 4679-4699 and 4711-4765.
- `ExperienceForCurrentLevelSecondStage` and `LevelPermill`: same file, 4804-4806 and 4818-4823.
- `GameLiving.NoXPForLevel` and `IsObjectGreyCon`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/GameLiving.cs` 1474-1560.
- `GameLiving.XPForLiving` (monster table), `ExperienceValue`, base `GainExperience`: same file, 1362, 1314, 4514-4541.
- Tuning: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/serverproperty/ServerProperties.cs` 835-872 (rates) and 1944 (camp).
- `WorldMgr.MAX_EXPFORKILL_DISTANCE`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/WorldMgr.cs` 59.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Damage-share split of the NPC's XP, in range only | NPC value from the monster table (GameLiving.cs 1314); range 16384 units (WorldMgr.cs 59) |
| Grouped gainers get the full NPC value (donor rule, flagged in section 6) | Group bonus 0.125 per in-range member x base (AbstractServerRules.cs 1310) |
| Per-kill cap: percent of the monster XP value for the gainer's level | 125% solo (1200-1204, default 125 at ServerProperties.cs 835); 125% in a group (1209, default at 841) |
| Challenge cap: cap from the con-equivalent level when the top grouped member cons below the NPC | Con threshold below 0 (1230); the cap uses the level from con (1233) |
| Camp counter: decays per repeat kill, resets after a quiet window | Full bonus 0.55 (ServerProperties.cs 1944); window 1800000 ms (1249); counter 0.95 reset (1252); decay 0.05 (1257); floor 0.05 (1257) |
| Context multiplier on the camp bonus | Dungeon x1.20 (1263-1264); clamp 0.01 floor and 0.55 ceiling (1265-1269) |
| Dead gainer gets a quarter | 25% (1320-1321) |
| Rate multiplier on base only; hard cap after; extras added after | XP rate 1.0 default (ServerProperties.cs 859); hard cap 500% (4902; default 853) |
| XP never falls below the current level's start (second-stage midpoint at 40+) | Floor = XP to reach the level (4940-4950); second-stage midpoint formula (4806) |
| One level step per gain call; zero-XP call as the trigger | Level cap 50 (4673); XP table (4711-4765) |
| Grey con by source level | NoXPForLevel table, 51 entries (1474-1526); 6 at level 10, 13 at level 20, 35 at level 50 |
| Monster XP per level | Table 1362 for levels below its length, formula 2^(k1 + (level - base) x inc) x 5 above it (AbstractServerRules.cs 621-646) |

## 4. TypeScript sketch

simplified: keeps the donor's order (gate, damage share or full value for grouped gainers, cap, challenge cap, camp per gainer, group bonus, dead quarter; then rates, hard cap, extras after the cap, floor, store, one-step level-up) but omits realm points, bounty points, the outpost bonus, the exceed-cap multiplier, the pet-to-owner mapping, the champion XP, the catacomb x1.5, the zone bonus, the ToA XP-points percent, the GainExperience event (so the donor's pre-floor event value is not modelled) and the class-advancement path beyond the level-5 gate; the monster XP table and the con-to-level conversion are passed in as functions instead of being reproduced; the 51-entry XP-to-level table is copied from the donor; the camp counter steps once per gainer, as the donor does, which section 6 rejects.

```ts
