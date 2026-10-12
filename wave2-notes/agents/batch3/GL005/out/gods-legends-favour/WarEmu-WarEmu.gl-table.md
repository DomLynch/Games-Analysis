# WarEmu-WarEmu (gods-legends-favour, cell 3): GL table

Donor root: `/mnt/frankendom-donors/WarEmu-WarEmu/` (C#, server half: `WorldServer`, `Common`; client event constants in `Common/Database/SystemData.cs`). Licence unclear as a repo (see the note): clean-room, shape only.

| name | effect | formula | number ranges | gain/loss events | decay | file:line |
|---|---|---|---|---|---|---|
| 1. Favour/piety resource | Renown: a standing that grows from player kills and ranks up. No spending found | per player kill: (victim rank x 4 + victim level x 6) x rate; party: each in-range member gets it divided by the in-range count, rounded down | rate 1 (config); rank thresholds are database rows (values not in repo); party range 100 (units not read) | gain: player kills only (Player.cs 478-479). Loss: none found | none found | WorldMgr.cs 627-656; Group.cs 308-327; Player.cs 478-479, 616-634; WorldConfigs.cs 50 |
| 2. Blessings and curses as timed rows | Not in donor (grep: no blessing, curse or boon) | (not read) | (not read) | (not read) | (not read) | (grep only) |
| 3. Patron choice and switching | Not found. Realm is a fixed field per character (Order or Destruction), no switch path read | (not read) | realm ids by faction range (Unit.cs 681-686; the second branch's value not read) | (not read) | (not read) | Realm.cs 36-44; Unit.cs 676-686 |
| 4. Divine domains as tags | Not in donor as domain tags. Units carry a faction split: faction group, faction tier, realm from the group range | FactionId = new / 8; Faction = new % 8; Rank = Faction / 2 | 8-15 gives Order (read); the 16-23 branch exists, its realm value not read | (not read) | (not read) | Unit.cs 676-686 |
| 5. Boons at favour thresholds | Ranks at thresholds: rank-up moves to the next threshold row and sets the rank. Items and loot gated by renown | rank up when stored + gain > threshold; loot needs MinRenown <= (corpse level + 4) x 2 | rank rows from the database; MinRenown is an item byte | rank-up event (gain carried) | none | Player.cs 616-634; LootsMgr.cs 132; ItemsInterface.cs 696 |
| 6. Legend signature powers | Not in donor as named powers. The ability system exists (handler classes); not read for signature powers | (not read) | (not read) | (not read) | (not read) | World/Abilities/Handlers/ (names only, grep) |
| 7. Shapeshifting | Not found by grep (transform, shapeshift, polymorph) | n/a | n/a | n/a | n/a | (grep only) |
| 8. Avatars and summons | Not read | (not read) | (not read) | (not read) | (not read) | (not read) |
| 9. Fate, luck, oaths | Not read. Loot gate by renown is the only chance-free rule seen | (not read) | (not read) | (not read) | (not read) | LootsMgr.cs 132 |
| 10. Underworld and death rules | Death sets a 600-second auto-resurrect timer. The renown award is made in the death path. Resurrect ability has target checks (dead, alliance) | timer 600 s | 600 s | (not read) | timer | Player.cs 470-484; ResurrectsTargetHandler.cs 53-57 (grep) |
| 11. Divine mounts as rewards | Mount script exists. Not read | (not read) | (not read) | (not read) | (not read) | WorldServer/World/Scripting/Creatures/WorldMountsScript.cs (file exists, not read) |
| 12. Relics and artifacts | Not found by grep (relic) | n/a | n/a | n/a | n/a | (grep only) |
| 13. Temples and shrines as zone rows | Not found by grep (shrine, altar). Zone respawn and taxi rows exist as database tables | n/a | n/a | n/a | n/a | Common/Database/World/Maps/Zone_Respawn.cs, Zone_Taxi.cs (names only) |
| 14. Pantheon factions and realm pride | Realm (Order and Destruction) with two bonus columns stored as strings, no use found in WorldServer. Chapter rank field exists as data. Titles are client event ids only | bonus columns are strings "0" | "0" default | (not read) | (not read) | Realm.cs 41-42, 113-121; Chapter_Info.cs 50; SystemData.cs 166 (event id only) |
