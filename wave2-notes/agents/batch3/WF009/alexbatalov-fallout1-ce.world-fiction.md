# alexbatalov-fallout1-ce: world-fiction design note (WF009)

Donor root (VPS, read-only): /mnt/frankendom-donors/alexbatalov-fallout1-ce/
Donor/Licence: Sustainable Use License 1.0 (LICENSE.md line 1). Personal, non-commercial and internal use only (LICENSE.md line 15). Restricted, so shape only and category level; no code or text is adapted. The game data (master.dat, msg files, .int scripts) is not in the repo and must be copied from the user's own install (README lines 17, 41, 43; not read here).
Half read: CODE ONLY (src/game). DATA PACK NOT IN BOX: town labels and rumour or sign text live in the .msg files (getmsg at worldmap.cc:996, not in box). The scripts that set and read the enemy and knowledge flags are in the data pack too (not in box). Server half: none in this repo. Paired data donor: alexbatalov-fallout2-ce is a sibling in DC005, not read for this topic.
Checked: read or grepped 4 source files (worldmap.cc, worldmap.h, game_vars.h, endgame.cc) and checked the licence lines 1 and 15 by receipt; the rest of the licence comes from the AU003 audit. Confidence high on the flag and table structure. Confidence medium on the time gate unit, which the code does not name here.

## 1. What the player sees and feels (375 wide)
- The world map shows towns as dots. A town is only shown once the player knows it: either by a first visit, or because a story flag for that town has been set.
- Each town has up to seven entrance sites. Each entrance has its own knowledge flag, so a town can open up one site at a time as the story moves.
- One town, the Vault 13 entrance, is revealed by time, not by a visit. Once a game-time threshold is passed, the entrance is known.
- Factions are flags: fourteen enemy flags, twelve for towns and factions plus two more. When the player angers a faction, the flag is set, and later text (the ending) reads it.
- Town labels and the text that goes with them are not in the code read. They come from the message files (not in box).

## 2. Why it works / is striking
- Readable at 375: a town is a dot, and a dot is either there or not. The fog is the signal.
- One signature behaviour: a town exists on the map because the player has a reason to know it. The map grows as the story goes on.
- One signature sound: none in the code read.
- Could be made ours at 20-30 percent resemblance: keep the visit-or-flag reveal and the per-site flags; change the town set, the flag names and the time gate.

## 3. The rule behind it (grammar, with data fields)
Town set and map lookup (src/game/worldmap.cc, src/game/worldmap.h):
- Twelve towns (TOWN_COUNT = 12, worldmap.h:30); city grid positions per town (city_location, worldmap.cc:370).
- Map-to-town table: 66 rows (xlate_town_table, worldmap.cc:418 to :484; MAP_COUNT enum at worldmap.h:103). The lookup is a bounds-checked index (worldmap.cc:3739).
- Hotspots: TownHotSpots[15][7] holds x, y, map index and a map file name per site (worldmap.cc:601). 42 site rows counted by grep. Each name is a literal file name such as the Vault 13 entrance map (worldmap.cc:603).

Reveal rule (UpdateTownStatus, worldmap.cc:2790 onward):
- Each town has one first-visit flag, cityXgvar[12], values 67 to 78 (worldmap.cc:386).
- Each town has up to seven site flags, ElevXgvar[12][7]; 43 non-zero entries in total (worldmap.cc:402).
- For each site, the site flag is copied from the game flag table (worldmap.cc:2803).
- If the town flag is 1, the town cell is marked and the first-visit bit is set (worldmap.cc:2809 to 2815).
- Time gate: if game_time() / 864000 is non-zero, the Vault 13 site is known (worldmap.cc:2819-2820). A second Vault 13 branch sits at :2825 under a condition not read.

Faction flags (src/game/game_vars.h:252-263 and :623-624):
- Twelve enemy flags for towns and factions (VAULT_13, SHADY_SANDS, JUNKTOWN, HUB, NECROPOLIS, BROTHERHOOD, ADYTUM, RIPPERS, BLADES, RAIDERS, CATHEDRAL, FOLLOWERS), plus REGULATOR and BLADE: fourteen flags.
- The ending reads them: a junktown invaded flag (endgame.cc:242) and a brotherhood enemy flag with an initiate state (endgame.cc:255).

Data fields (designer-tunable; donor value null because the licence is restricted):
- town_count: 12 (unit: towns; donor 12)
- site_slots_per_town: 7 (unit: sites)
- site_rows_total: 42 (unit: rows; counted by grep)
- known_rule: visited OR event flag (boolean)
- time_gate: 864000 (unit: game_time units; the unit is not read here; donor null)
- enemy_flag_count: 14 (unit: flags)

## 4. For Frankendom
- 700 zones as data: a zone is known when visited or when its event flag is set. The ledger holds one known bit per zone; the client draws the map dots from that bit. One ledger, server-verified.
- Faction map: one hostility flag per faction on the ledger, not one flag per entrance. Keep one per faction; use a zone-to-faction data table rather than hand-listed flag ids. Change: no per-site flag explosion.
- Ending or epilogue text chooses from ledger flags on the server, as the donor's endgame does.
- Engine: a faction hostility flag feeds aggro and target choice, so it belongs to the fight loop. Parity row 4 (fight loop: aggro, chase, leash). Map dots and known state are presentation: row 14 (HUD).
- Target file (proposed; does not exist yet): src/fight/faction-standing.ts. Row 4.
- Keep: visit-or-flag reveal; time-gated reveal for one place; per-faction flags as a short list.
- Change: our own faction set and names; a data table for zone to faction; the time gate in our tick units (fixed step, server clock); no legal-risk name list.

## 5. Five-minute look test (Dom on his phone)
- Build: the world map at 375 wide with the zones of one region hidden, then one zone shown by a visit and one shown by an event flag set in a test. A faction tint marks the zone whose faction is angered.
- Compare: fog on against fog off; the faction tint on one zone against the same zone untinted. Ask whether the map grows in a way the player can feel.
- Publish to /preview/ with no release rows; flag on the existing map screen.

## 6. Licence / IP
- Code: Sustainable Use License 1.0 (LICENSE.md line 1). It limits use to personal, non-commercial and internal purposes. Treat the donor as restricted: category level only, no code copied, no text copied.
- Content: the town names, message text, map files and scripts are in the user's own game data (not in the repo). Class D for us; inspiration only.
- Trait kept: visit-or-flag reveal per place, per-site flags, one time-gated reveal, faction flags read by the ending. Trait changed: our own towns, our own faction names and count, our own ledger keys. No legal conclusion.

## 7. Gaps
- Not read: the message files (labels, rumour and sign text, faction dialogue); the .int scripts that set and read the enemy and knowledge flags (data pack, not in box); worldmap.cc:2821-2826 second Vault 13 branch; the unit of game_time (not checked in this donor's code here); the rest of worldmap.cc beyond the reveal and lookup code; the 1701 and 1963 known-town checks except as named here.
- Half read: code only. The data pack is not in the box.
- Not present in this half: idle or ambient behaviour, death and respawn presentation, loot ceremony, walk density, 375-wide readability tests.
- Defects or doubts (keep the idea): the time gate uses a magic number with no name in the code read. Fix: a named constant in zone-clock data.

Best transferable idea: a town or zone is shown on the map only after a visit or an event flag, with one fixed time gate for one special place, and one hostility flag per faction read by the ending.
