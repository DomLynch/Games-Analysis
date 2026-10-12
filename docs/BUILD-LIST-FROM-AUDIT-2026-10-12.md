# Build list from the audit (analyst draft), 2026-10-12

> UPDATE 2026-10-12 (Dom approved): rulings U6, U38, U41, U42, S5 are WITHDRAWN (older written Dom rules apply: barter-only player trade, no death penalty, no skill gain by use). B29 (quest counters) must use non-kill objectives (guardian, event, travel) because Region 1 bans kill-N. Items shaped by those rulings (B27 trade wiring, death/respawn items) must follow the older rules.

Draft for Dom and Strategy/Lead. Analysis only: nothing here is an assignment, and the order is NOT final. Strategy and Lead do the real ranking. Not committed.

## Summary (10 lines)
1. Inputs read: all 51 gap-check files, RULINGS-FOR-DOM-2026-10-12.md, PASS2-SUMMARY-2026-10-12.md. Frankendom checkout read only to confirm a few claims (marked "confirmed by me").
2. By my count the files list about 208 merged additions (some files give lettered clusters, not G ids). They fold into 72 items (B1 to B72). 71 are in the ranking column; B63 (parties/guilds) is deferred by Dom and kept out of it.
3. Items are grouped BY AREA below. The column "analyst suggestion" is my ordering by: playable loop first, then dependency, then small and safe first. It is a suggestion only.
4. Every item carries three tags: layer (Engine / Core / Modes), as-data (yes/no), phone-first (yes/no/risk). Layer tags are my reading of Dom's 10-10 ruling as quoted in the brief (Core = account, items, bank, career, scorecard, leaderboards, world sim; Core is priority one). I did not find that ruling in a file, so treat my layer calls as guesses.
5. Analyst top 5: B1 server tick safety, B2 zone registry for 700+ zones, B3 per-site seeds in the camp builder, B4 spawn and respawn director, B5 stack-first item placement.
6. Next five: B6 take-one loot edge cases, B7 inventory actions on the writer, B8 per-account action limit, B9 wire the metal currency, B10 finish the quest reward claim.
7. Critical path in one line: B1 tick safety -> B2 zone registry -> B4 spawn director -> B6 loot intake -> B7 inventory on writer -> B9 metal wiring -> B10 reward claim -> B11 talk and journal screen.
8. 19 questions are Dom's; six of them gate items here: U1, U12 (vendor/market), U38, U40, U41, U42 (death), S39, S41, S43 (enemy chase values), S50, S52 (chat), S68 (replay keeping), B1/B2 (launch size, children), L3 (TRELLIS.2 licence).
9. Four things look wrong or in conflict and need a person before building (see "Verify before building"): quest kill counters vs the Region 1 ban on kill-N, S5 skill-ups vs "no skill gain by use", U38 reclaim delay vs "no death penalty", and trade money (U6) vs "no currency in player trades".
10. Every landing path is the gap-check's. Where a gap-check says the file does not exist I write "(proposed)". Nothing in `src/fight/`, `origins/server/world-spawns.ts`, `origins/client/` exists (I confirmed the first two).

How to read an item: **size** small = under a day, medium = a few days, large = a week or more (my guesses). **Rulings** = ids from RULINGS; "pending Dom" means one of the 19 not yet answered; "ruled" means Strategy ruled it 10-12.

---

## Area 1: World and zones (the sim that runs a zone)

### B1. Server tick safety and per-tick creature budget
Analyst rank 1 | Layer Engine | as-data: no (caps live as zone/config fields) | phone-first: yes (server only)
- What: cap catch-up steps and drop the backlog instead of bursting, clamp the time step, and give any server creature work (spawn checks, timers) a count budget per tick, near often / far rarely.
- Why: the spawn director must not run on a tick that can burst and stall the presence service.
- Rests on: Q G6 (TK2, TK3); SP "drop on overrun" (colyseus, OpenDAoC). Landing: `origins/presence/server.ts:46-62` (exists).
- Rulings: U32 (one step size), U23 (slow down, skip enemy work, never end the fight), B6 (skip a phone's updates, kick after 10 s; ruled), B3 (load test on the VPS; ruled), S31.
- Size: small to medium. Depends on: nothing. Phone risk: none.

### B2. Zone registry and "which zone am I in" for 700+ zones
Analyst rank 2 | Layer Core | as-data: yes (built from zone rows) | phone-first: yes
- What: replace the two hard-coded ids (`pit-yard`, `exchange`) with a lookup built from zone data, refuse overlaps at load, nearest-landmark query, one presence instance family per zone id; unknown position returns null.
- Why: today the server cannot tell where anyone is outside the 300 m Concord square, so no Region 1 zone can run.
- Rests on: ZW G4 (8 notes); CM H; ID (reads place from presence); SP.
- Rulings: none found that block. B1 launch size (pending Dom) sets how many layers matter.
- Landing: `origins/presence/zones.ts:14` (exists) reading `REGION1_WORLD` (`origins/region1/world.ts:182`, per CM).
- Size: medium. Depends on: nothing. Phone risk: none.

### B3. Per-site seed and shuffled family rotation in the camp builder
Analyst rank 3 | Layer Core | as-data: yes | phone-first: yes
- What: one seed per camp site so one site can be re-derived alone, a named "empty" share, a counted shuffled rotation of creature families per zone, strongest-on-rim/leader-in-centre ordering, camp size scaled by party size.
- Why: the director (B4) and the server verifier must re-derive one camp without rebuilding the zone; today changing one camp shifts all later ones.
- Rests on: PR (Cubyz, SPD+CDDA, Angband, Barony; all small ADDs). Landing: `origins/mobs/populate.ts` (exists, site loop ~line 61). PR says `world-spawns.ts` "lives on an unmerged Combat branch (combat/zone-rows)" (see verify list).
- Rulings: P5 (every zone stores seed and grammar version), S69 (separate random streams), P11; all ruled.
- Size: small. Depends on: nothing. Phone risk: none.

### B4. Spawn and respawn director
Analyst rank 4 | Layer Core | as-data: yes (spawn table, delay, jitter, caps as zone fields in `schema.ts` group 9) | phone-first: yes (server; client drawing of server creatures is not covered by any note)
- What: one server module on the tick that reads a zone's spawn table, counts the live roster, spawns one creature per tick out of sight, queues respawns with a jittered delay, and freezes (never deletes) creatures after a grace period when the zone is empty.
- Why: this is "a zone that runs": today a zone is placed once and nothing respawns (the only respawn is a 90 s client constant in the preview).
- Rests on: ZW G1 (21 notes), Q G1, EN G1, DC G6, ID G1 (timers), PR; spec `docs/specs/origins/mobs.md` section 4. Proposed file `origins/server/world-spawns.ts` (does not exist, confirmed by me).
- Rulings: S31 (timers in steps), S69, S75 (one ordered timer queue), U26 (server step), S45 (scent only with a player in the zone). None pending Dom.
- Size: large. Depends on: B1, B2, B3. Phone risk: none server-side. Reuse the boss restart rule in `origins/boss/boss.ts`, do not rewrite.

### B18. World clock `worldTimeAt`
Analyst rank 18 | Layer Core | as-data: yes (day length, phases as world data) | phone-first: yes
- What: one pure function giving day, dusk, night and moon from server time, as written in `living-world.md` section 10.3.
- Why: NPC routines (B23), events (B31), patron perks and weather all wait on it; the spec exists but no code does.
- Rests on: LO (wesnoth), WE G2, WL001 clock, QU G3 dependency. Landing (proposed): `origins/world/clock.ts`.
- Rulings: S62 (schedules as time windows). Note: S31 says AI timers are in steps, the world clock is wall-clock-derived (one-shard.md section 1); keep them separate.
- Size: small. Depends on: nothing. Phone risk: none.

### B24. One zone-to-zone transfer path
Analyst rank 24 | Layer Core | as-data: yes (landing points from zone landmarks) | phone-first: yes
- What: one function for every zone move: snapshot the mover once, defer past the trigger, land outside it, no logout escape; plus a data test that every landing is outside its own trigger and every link is answered (extend `origins/world/resolve.ts:158` to cross-region portals). Includes the "door channel" (starts in range, cancelled by range, fires once).
- Why: without it zones are islands.
- Rests on: ZW G3, ID G4 (veloren door channel).
- Rulings: U29 (reconnect within 60 s), U30 (server decides position). Size: medium. Depends on: B2. Phone risk: none.

### Other World/zone items

| Id | Item | Rests on | Rulings | Size | Depends | Layer / data / phone | Analyst rank |
|---|---|---|---|---|---|---|---|
| B31 | Event ledger and banner, rift scheduler (`rollRifts`), zone event flag (one fire-once row, server end time, flag gates a spawn row and a talk line) | WE G1, G3; Q G2; LO group A; DC G6 | S31, S75 | medium | B18, B4 | Core / yes / yes (banner at 375 wide: risk of clutter) | 31 |
| B36 | Zone state save and restore (kills stay dead on leave/enter; a store pays nothing) | ZW G2 | none found | medium (needs a migration, wipe at season end) | B4 | Core / yes / yes | 36 |
| B56 | Zone-run (instance) registry: hard life, empty grace, staged run with hand-off | ID G1, G3; DC G9 | none; party size not ruled | large | B4, B24 | Core / yes / yes | 56 |
| B62 | Zone draw list / chunk streaming (client) | RP G4, CP (wowser, roBrowser) | none | large | client must draw zones first (nothing does) | Engine / yes / risk | 62 |
| B71 | Travel risk on routes; lore codex; witnessed world news; guard-strength curve check at authoring | ZW G5, G6; LO (ryzom codex, veloren news) | none | G6 small, rest parked | route graph must exist | Core / yes / yes | 71 |

---

## Area 2: Economy and items

### B5. Stack-first item placement
Analyst rank 5 | Layer Core | as-data: no (rules in `inventory.ts`; stack sizes already item data) | phone-first: yes
- What: a matching stackable tops up an existing stack before it needs a free slot, partial top-up, remainder stays at source.
- Why: today a full pack refuses a matching pickup.
- Rests on: IV G1 (7 notes). Landing: `origins/inventory/inventory.ts` (exists).
- Rulings: U15 (offer 1 from a stack of 100; ruled). Size: small. Depends on: nothing. Phone risk: none.

### B6. Take-one loot edge cases (bind, overflow, trade) as one item
Analyst rank 6 | Layer Core | as-data: yes (loot tables already carry take-one and collect) | phone-first: yes
- What: one loot-intake plan that reports requested / placed / leftover before any write: take-one is all-or-nothing and the claim stays open if the pack is full; collect lists place what fits; leftover never goes on the floor or becomes gold; plus the bind rule (take-one loot not tradable in v1, one bind-after-pickup rule if wanted later) and the trade edges (unique worn copy, partial stacks, shop-bought vs looted provenance).
- Why: "loot into inventory" is the middle of the loop and today a full pack has no story; trading take-one loot would defeat take-one.
- Rests on: IV G2 (10 notes) and IV "Could not verify"; ET G2 (shop gear keeps provenance `shop`, consumables stay bound, `economy.ts:75-76`); TR (trade settle refuses whole if it does not fit, `trading.md:82-83`); AU G7 (drop container/pop); Q G4 (grey gate, global pool, rare cap in the roller). Landing: `origins/inventory/inventory.ts`, `origins/encounters/encounters.ts` `intoBackpack` (exists, confirmed by me in tests).
- Rulings: U10 (no trade of take-one loot v1), U14 (quest stays claimable until room), U15, U8 (take worn copy off first), U41 (PvP killer takes one item). All ruled except U41 (pending Dom). OPEN, not in RULINGS: where a held leftover lives (open claim row vs a pending location kind; `Location` has no pending kind, `items.ts:135`).
- Size: medium. Depends on: B5. Phone risk: none for logic; the take-one screen exists (`src/loot-panel.ts`).

### B7. Inventory actions on the writer, plus a phone pack grid
Analyst rank 7 | Layer Core | as-data: no (ops are code; slot counts are data) | phone-first: risk (virtual grid for 1,000 bank slots)
- What: writer handlers for move, split, merge, deposit, withdraw, equip, unequip, loot award; one transaction each; bank needs place from presence.
- Why: the inventory rules exist and are tested, but only consume and apply_upgrade are reachable (`handlers.ts:68-72`), so a player cannot touch their items.
- Rests on: IV G4 (Cubyz, otclient, dhewm3, L2Solo). Landing: `origins/server/handlers.ts`, `holdings.ts` (exist); pack grid is a new client file (proposed).
- Rulings: U28 (same command twice applies once, 15 s), U30, U24, U22. Size: medium to large. Depends on: B5, B6, B8. Phone risk: grid, 44 px targets.

### B9. Wire the metal currency (faucets, sinks, one reason per flow)
Analyst rank 9 | Layer Core | as-data: yes (reasons, caps) | phone-first: yes
- What: apply the drafted migration `202610070007_origins_metal.sql` (only on a GO), add one writer path that credits Bounty and loot metal in the same batch as the kill, name every flow, and decide what happens at the balance cap (the draft aborts the whole batch, which would also lose a same-batch item).
- Why: nothing pays metal today; the economy half of the loop is dark.
- Rests on: ET G1. Landing: `origins/server/metal.ts` (proposed, beside `upgrade.ts`).
- Rulings: U47 (metal goes through `settle()` with a closed reason, no separate store; ruled), U1 (who pays market fee; pending Dom), U12 (shop floor price; pending Dom). Needs Strategy and Lead GO to apply the migration.
- Size: medium. Depends on: B7 (batch), the GO. Phone risk: none.

### B16. NPC vendor (buy, sell-back, stock)
Analyst rank 16 | Layer Core | as-data: yes (stock, markup, minimum price as rows) | phone-first: risk (shop list at 375)
- What: add `vendor` to `SERVICE_KINDS` (`economy.ts:278`), one shared price quote, server recomputes, room check before charge, item and metal in one batch, sell-back never above 25 percent, refill on shop open.
- Why: the first place metal is spent; without sinks the faucet floods.
- Rests on: ET G2 (16 notes), TR ADD 2 (Open-RSC/Trinity stock price). Landing (proposed): `origins/server/vendor.ts` and a quote module beside `economy.ts`.
- Rulings: U9, U11 (shared stock, zone timer), U12 (pending Dom), U10. Sell-back daily cap number is OPEN with Stats (`trading.md:323`).
- Size: medium. Depends on: B9, B7. Phone risk: shop list layout.

### B17. Equip swap and exclusion table
Analyst rank 17 | Layer Core | as-data: yes (exclusion table) | phone-first: yes
- What: swap in one step (displaced piece takes the freed slot), two-hander vs off-hand rule run by the server, one-step undo.
- Why: today `equip` refuses an occupied slot (`inventory.ts:529-543`).
- Rests on: IV G3 (7 notes). Rulings: U8. Size: small to medium. Depends on: B7. Phone risk: none.

### Other Economy/items items

| Id | Item | Rests on | Rulings | Size | Depends | Layer / data / phone | Analyst rank |
|---|---|---|---|---|---|---|---|
| B27 | Player trade wiring: server module that opens, changes, accepts, settles (pure rules and SQL exist) | TR ADD 1 (7 notes); ET (trade left to TR) | U2 to U9, U11, U13, U15; see conflict on trade money in verify list | medium to large | B7, B6 | Core / no / risk | 27 |
| B61 | Zone tax into a town counter (needs its own table, not an account) | ET G3 | none found | medium | B9, B16 | Core / yes / yes | 61 |
| B64 | Housing plot upkeep, interior instance, donor-defect tests | HS (4 upkeep notes merged) | none; housing is a later step | medium to large | B9 | Core / yes / yes | 64 |
| B66 | Gear wear and repair | CR (5 notes merged) | U39 (no wear until repair exists; ruled) | medium | gear must enter `stepDuel` first | Core / yes / yes | 66 |

---

## Area 3: Career, scorecard, leaderboards and account

### B72. Scorecard, career and leaderboard hooks (new)
Analyst suggestion: slot near 26 (Core is priority one) | Layer Core | as-data: partly (board views and card rows are data/SQL) | phone-first: risk (card at 375)
- What: one bundle of small hooks the notes support: a duel-rating board as a SQL view next to `season_board_summary` (tie-break by earlier `created_at`, verified rows only); level-gap scaling on a duel result kept behind `PVP_REWARDS` (false); a faucet/sink totals query for Stats; aggregate-only win-rate counts; a post-fight card that stacks rows; the next-goal line after a win; a once-only discovery award on first visit; a boss-defeat history line; the first-bad-tick name on a failed replay shown to staff.
- Why: career, scorecard and boards are Core; these are the places donor ideas touch them, and none is wired.
- Rests on: PV (EQEmu board, ModernUO level gap, TrinityCore pairing result, ACE zero-sum Elo tweak: draw counts 0 today, floor breaks zero-sum), SC (record views), DT (G2 first-bad-tick), AN (counters), HU/OB G2 (next-goal line; `hud.ts:18` already carries the next opponent), ET G1 (faucet/sink report), WE G5 (boss record line), WF G5 (card rows), OB G4 (discovery row), QU G6 (CP award). Landing: `src/net/duel-antifarm.ts`, `supabase/migrations` + `docs/state/backend.md:659-675`, `src/victory-headline.ts` (nearest; `src/scorecard.ts` named but not opened by the gap-check).
- Rulings: B15 (aggregate win-rates only; ruled), B13 (90-day retention; pending Dom), S68 (keep every PvP fight; pending Dom), U47. Note PVP_REWARDS is false by ruling.
- Size: medium (many small pieces). Depends on: B9 for faucet totals; B21 for the replay piece. Phone risk: card and board layout.

### Other Career/account items

| Id | Item | Rests on | Rulings | Size | Depends | Layer / data / phone | Analyst rank |
|---|---|---|---|---|---|---|---|
| B58 | Character appearance table with server clamp and seeded pick; refuse-with-a-reason build validator; stat budget later | CH (Veloren+Crawl+ModernUO; OpenEnroth) | none; Origin 50-point step not built | small to medium (needs a migration on `origins_characters`) | none | Core / yes / risk | 58 |
| B67 | Ranked duel pairing in a rating window that widens with wait; Elo tweaks | PV (TrinityCore, ACE) | none; PvP pays nothing yet | medium | B72 | Modes / no / yes | 67 |
| B69 | Origin stat pools (VIG/END), one ordered stat stack, carried weight cost | SK (ryzom, wesnoth, LostCity) | S4, S5, S6, S10 (pending Dom); parked by SCOPE | medium | stat allocation un-parked | Core / yes / yes | 69 |

---

## Area 4: Combat and enemies

### B13. Enemy chase state machine (suspect, hunt, search, return)
Analyst rank 13 | Layer Core (world sim) | as-data: yes (leash, memory clock, "never breaks off" as row fields) | phone-first: yes
- What: build chase, leash, give-up, return-and-refill on the existing `Mode` in `origins/preview/mobs.ts`, clocks in ticks, creature untargetable while returning.
- Why: today a creature only wanders and faces you in a ring; nothing chases or resets.
- Rests on: AI G1 (crawl, Brogue, cmangos, veloren, BehaviorTree); spec `mobs.md` 2.3 to 2.7 and section 8 (preview flag first).
- Rulings: S28 to S31, S36, S38, S40, S44 to S46 (ruled). Values pending Dom: S39 (memory time by tier), S41 (flee gap), S43 (frozen turns).
- Size: large. Depends on: B4 (server creature state). Phone risk: none server-side.

### B26. Damage ledger and loot rights (group fights)
Analyst rank 26 | Layer Core | as-data: no | phone-first: yes
- What: one ledger of server-verified damage per creature fight; minimum share; loot rolled once per eligible player.
- Rests on: Q G3 (LT3, AG4), DR ModernUO. Landing: shape of `origins/boss/boss.ts` Contributor.
- Rulings: attribution rule is OPEN (`server-save-schema.md:43`), not in RULINGS. Basic solo loop does not need it (one claimant per creature already exists, ID). Size: medium. Depends on: B4. 

### Other Combat/enemy items

| Id | Item | Rests on | Rulings | Size | Depends | Layer / data / phone | Analyst rank |
|---|---|---|---|---|---|---|---|
| B40 | Player death in open zones: reclaim delay 30/60/120 s, idle ghost release, killer takes one item (PvP zones), keep rules, ally revive "Downed", staged death beat | DR (EQEmu, ModernUO, TrinityCore, Veloren, Daggerfall); DR004/005 | U38, U40, U41, U42 pending Dom; U39, U43 to U45, S79, P3, P15 ruled | large | B6, B26, B41 | Core / yes / yes | 40 |
| B41 | Open-PvP hostile flag with quiet-period timer, combat tag, respite; server engage gate with level band and reason string | RF002 (+ACE, l1j), PV (Open-RSC) | U41 pending; flag shape in `feuds.md` section 9 unchecked | medium | B2 | Core / yes / yes | 41 |
| B43 | Elite and boss tiers (two multipliers), wider look pool, element overlay with a non-colour cue, one swapped ability with a pre-swing cue, pack beats | CG G1 to G4; DC G3, G4 | none | medium | B4 | Core / yes / risk (375 silhouette) | 43 |
| B44 | Ambush and patrol shapes on the mob row; approach radii, back-off, circle band | EN G2, AI G2, DC G6 | S42, S46, S45 (ruled) | medium | B13 | Core / yes / yes | 44 |
| B45 | Group assist (a hit pulls the camp, capped) and pressure events | EN G3, WE G4 | S45 ruled; needs `MAX_ATTACKERS` in code (see verify) | medium | B13, B44 | Core / yes / yes | 45 |
| B46 | Phased bosses (health gates change move set, cue shown), reinforcements at a visible spot capped at 3, health-banded move weights | DC G1, MG11 (TrinityCore), BS (DOOM, Warzone, veloren) | S29 ruled | medium | `origins/boss/boss.ts`; cap of 3 | Modes / yes / yes | 46 |
| B48 | Status badge from a server event (presentation); immunity data on creature rows; per-target status ledger (sim change) | SE G1, G3, G2 | S1 (stun ladder) ruled; G2 needs Combat and Dom to rule that a status may touch the duel, and a RECORD_VERSION bump | G1 small, G3 small, G2 large | G2 blocked | Modes / yes / yes (badge size risk) | 48 |
| B59 | Target stickiness for the pack token | AI G3 | S32, S33, S34, S35 ruled | small | combat-study 2A token (not built) | Modes / no / yes | 59 |
| B60 | Spell rows with cost, resist step with partial damage, interrupt lockout curve, summon cap, non-lethal damage over time, breath cone, focus pool | MG (OpenEnroth, EQEmu, ModernUO, flare, wesnoth, veloren, swgemu) | S15 to S27 ruled; S17 (item charges, no second bar) conflicts with a focus pool | large | CC ladder #2161 (in lead.md, not in this commit) | Modes / yes / risk | 60 |
| B70 | Live-server fight intake gate, lag compensation window (deferred: no live server fight exists) | AC G4; NW skips (Valve, Colyseus, Nakama) | U21, U33 to U37 apply only when world fights run on the server | large | live server fights | Engine / no / yes | 70 |

---

## Area 5: Quests and NPCs

### B10. Finish the quest reward claim
Analyst rank 10 | Layer Core | as-data: yes (rewards on stage rows) | phone-first: yes
- What: loot and faction-standing rewards (refused with 501 today, `story.ts:78-83`); bag-space check before any write, all or nothing; feed "encounter cleared" and standing into the condition facts (`story.ts:68-75`) so those conditions can be true.
- Why: "a quest reward that pays" is in the loop definition; today only CP rewards pay.
- Rests on: QU G6 (ModernUO, DOLSharp, EQEmu); RF/GL (standing write blocker).
- Rulings: U14, U16, U17, U18, U20, S60, S61 (ruled). Size: medium. Depends on: B6 (bag check), B7. Phone risk: none.

### B11. Talk and journal screen
Analyst rank 11 | Layer Engine (client UI) | as-data: no (reads server rows) | phone-first: risk
- What: first tap completes a line, second advances; panel reads server rows, sends only the line pick.
- Why: quest and talk engines are built and tested but `src/` imports none of them, so no player can use a quest.
- Rests on: QU G7 (Funkin, otclient, OpenBOR). Rulings: S63, S66, S67. Size: medium. Depends on: nothing (server side exists). 

### B23. NPC routine runtime
Analyst rank 23 | Layer Core | as-data: yes (routine rows, idle routes) | phone-first: yes
- What: pure `routineAt(character, minuteOfDay)` over the existing `Routine` rows, idle route on a seeded per-NPC stream.
- Rests on: QU G3 (OpenGothic, LostCity, Daggerfall). Landing (proposed): `origins/world/routine.ts`.
- Rulings: S47, S62 (ruled). Size: small to medium. Depends on: B18.

### Other Quests/NPC items

| Id | Item | Rests on | Rulings | Size | Depends | Layer / data / phone | Analyst rank |
|---|---|---|---|---|---|---|---|
| B28 | Onboarding after fight 1: hint ladder, next-goal line, Exchange service tour, zone arrival lines; plus FIX: write the first-loss done flag when the lesson ends, not starts (`src/main.ts:1283`) | OB G1 to G4 | none | fix small; rest medium | quests/talk working (B11) | Core / yes / yes | 28 |
| B29 | Quest objectives and timers (counters, deadlines) fed only by server-verified kills | QU G1 | U16 to U20, S60; CONFLICT with Region 1 "no kill-N" (verify list) | medium to large | B26 maybe | Core / yes / yes | 29 |
| B30 | Quest flag writer; daily board as a derived view | QU G5, G2 | none | small / medium | B10 | Core / yes / yes | 30 |
| B42 | Faction standing ledger: kill hits to rival/ally factions, derived standing, spend to advance boss ladder, witness reactions | GL A,B,C; RF001; QU G6; WF G4 | decay conflicts with progression rule "no decay" (needs a ruling) | medium | B10 (write path) | Core / yes / yes | 42 |
| B55 | World text: name pools and place grammar, signs, rumours and barks, zone cards, discovery cards | WF G1 to G5; QU G4 | no free text (`living-world.md:72`); legends public-domain only | medium | B18, B2 | Core / yes / yes (375 label length) | 55 |
| B65 | Pets, taming, companions, mounts | PM (EQEmu, ModernUO, veloren, AAEmu, ACE, ryzom) | P14 to P16 parked | large | B13 | Core / yes / yes | 65 |

---

## Area 6: Netcode and integrity

### B8. Per-account action limit on the writer
Analyst rank 8 | Layer Engine | as-data: yes (wait per op as data) | phone-first: yes (phones share carrier IPs, so per-account matters)
- What: keyed by account then op; refusal returns a typed RATE_LIMITED and writes nothing; staff exempt; also covers trade-open and duel-challenge later.
- Why: B7 opens many new actions; nginx limits only per IP.
- Rests on: AC G2 (OpenRCT2, SpacetimeDB, nakama, OpenTTD). Landing: `origins/server/server.ts`, `errors.ts` (exist).
- Rulings: U22, U24, U28, U13 (ruled). Size: small to medium. Depends on: nothing.

### B20. Presence movement budget and strikes that survive a reconnect
Analyst rank 20 | Layer Engine | as-data: yes (thresholds) | phone-first: yes (a laggy phone is logged, not dropped)
- What: travel credit never exceeds real elapsed time (fix the 100 ms floor), rolling ratio, log-only tier before hard tier, abusive seconds before a close.
- Why: the gap-check suspects packet spam beats the speed budget. I confirmed the 100 ms floor in `interest.ts` (`Math.max(100, ...)`); the exploit itself is untested, write the test first.
- Rests on: AC G1. Rulings: U30, U24, U25 (ruled). Size: small to medium. Depends on: nothing.

### B21. Replay fingerprint covers all sim state; first bad checkpoint named
Analyst rank 21 | Layer Engine | as-data: no | phone-first: yes (no phone cost)
- What: make `hashDuel` include `duel.roll.hits` and `duel.gambit.draws` (confirmed by me: `rollback.ts:30` hashes only tick, fighters, finish, while `Duel.roll`/`Duel.gambit` are separate fields, `duel.ts:90`); replay and verifier name the first mismatching tick; a test that fingerprint key order is stable.
- Rests on: DT G1, G2, G3. Needs `npm run fingerprint:update`, a PR note, and the SIM_DIGEST/RECORD_VERSION rule (changes every stored hash).
- Rulings: S70, S71, S73, S74 (ruled); S68 pending Dom. Size: small (G1, G3), small to medium (G2). Depends on: nothing.

### Other Netcode/integrity items

| Id | Item | Rests on | Rulings | Size | Depends | Layer / data / phone | Analyst rank |
|---|---|---|---|---|---|---|---|
| B32 | Account flag ledger and review queue; per-account cheat-signal ledger; sticky taint refused at award time; no auto-ban | AC G3, NW G3 | U13, S49 | medium | B8, B20 | Core / yes / yes | 32 |
| B33 | Socket flood cool-off (timed IP refusal after repeated flood closes); per-message-class budget (build when chat arrives) | NW G1, G2 | U22 | small / small | G2 waits for B25 | Engine / yes / yes | 33 |
| B34 | Presence send backpressure and shedding, changed-only deltas, explicit enter/leave; note: writer spawns a psql process per call, first thing to break at 1k (a finding, not a donor addition) | SP (ioq3, SpacetimeDB, Trinity, Teeworlds, swgemu) | B1 launch size, B4, B5, B6 (ruled) | medium | B1 | Engine / no / risk (slow phone sockets) | 34 |

---

## Area 7: Presentation (camera, HUD, VFX, audio)

### B12. Enemy plate and lock-on rules
Analyst rank 12 | Layer Engine | as-data: no (rules in `origins/mobs/info.ts`) | phone-first: risk (375 wide)
- What: a health bar for the world enemy shown when targeted, hurt, or hunting you, hidden at full health, red when it targets you; lock-on picks in range, in cone, nearest, tie by id; first tap selects, second engages.
- Why: today there is no enemy bar in the open world; the rule is written (`mobs.md:129`) and not built.
- Rests on: HU G2, G3. Rulings: none found. Size: medium. Depends on: nothing. Owner per mobs.md: Expansion rules, Characters art.

### B14. World camera: shoulder rig with wall pull-in, fight framing, `?cam=A|B` preview
Analyst rank 14 | Layer Engine | as-data: yes (presets as zone-row data on the shared follow module) | phone-first: risk (hero must stay in frame at 375x812)
- What: one pure camera module with a shoulder offset, fast-in/slow-out wall pull-in, near-wall fade; framing for engaged foes; preview flag with a test that the Pit camera output is byte-identical.
- Why: the zone camera is ten inline lines with no wall test and Dom ruled it open and critical.
- Rests on: QC G1, G2, G3 (G4 per-zone limits row after the README line is fixed).
- Rulings: U46 (zone camera is not frozen; the Pit camera freeze stays; the README line at `origins/world/README.md:59-61` should be reworded). Dom's six camera questions (`docs/patterns/camera-OPEN-QUESTIONS-for-dom.md`) are still unanswered and are not in RULINGS; G3 tuning needs his answers to questions 1 and 4. G2 needs an engaged-foe export from combat (not present).
- Size: medium to large. Depends on: nothing for G1.

### B15. Zone map (minimap) with bearing line
Analyst rank 15 | Layer Engine | as-data: yes (zone size and landmarks) | phone-first: risk (repaint cost, 44 px targets)
- What: one uniform fit of the zone box to the square, cached base layer, changed-cell repaint, server-filtered reveal, tap to centre, hit pings; "forge, 12 m, north-east" line.
- Why: there is no minimap anywhere; with 700+ zones players need to navigate.
- Rests on: HU G4 (18 notes), CM I, J. Landing (proposed): `origins/world/minimap.ts` plus a panel beside `origins/preview/ui.ts`; per-player filter next to `origins/presence/interest.ts`.
- Rulings: none found. Size: medium. Depends on: B2.

### B19. Phone stick: dead zone ramps from zero; press counter for taps in recovery
Analyst rank 19 | Layer Engine | as-data: no | phone-first: yes (this is the phone feel)
- What: rescale the 0.12 dead zone so output ramps from 0 (five notes agree), full speed at about three quarters throw; fire as a press counter so a tap during a long recovery is not lost (test first: two taps in one tick).
- Rests on: IN (SRB2, veloren, flare, Barony, teeworlds), GM001. Landing: `src/input.ts` `moveStick`, `src/duel.ts` buffer (exist).
- Rulings: none. Size: small. Depends on: nothing. Hold-vs-move latch only if tap-to-move is built.

### B22. Phone guard rails: one effects budget, a draw-call ceiling, one quality table, a frame cap, a quality ladder
Analyst rank 22 | Layer Engine | as-data: yes (budget and tier tables are data) | phone-first: yes (this is the phone protection)
- What: a table summing every effect pool with a drop counter (VF G1); a release row that fails above a draw-call and triangle ceiling per tier (RP G1); one quality-tier table (RP G2); a frame pacer with a lower cap when unfocused (CP); a ladder that drops fast and recovers slow and never touches telegraphs (CP).
- Why: pools are sized separately today and nothing adds them up; Low Power Mode is detected but not set.
- Rests on: VF G1, RP G1, G2, CP (Mindustry+Luanti, levy-street). Landing: `src/quality.ts`, `src/perf-beacon.ts` (exist); `src/frame-pacer.ts`, `src/quality-governor.ts` (proposed). Run the checks on CI/VPS, not the Mac.
- Rulings: B7 (30 fps in Low Power Mode), B8, B9, B10, B11 (all ruled). Size: small to medium (each piece small). Depends on: nothing.

### Other Presentation items

| Id | Item | Rests on | Rulings | Size | Depends | Layer / data / phone | Analyst rank |
|---|---|---|---|---|---|---|---|
| B37 | Town crowd LOD, animation-rate LOD, shadow-caster cap, name label pool (launch gate S2: 40 animated geared characters at 30 fps) | RP G3 | B10 (test devices) | medium | B22 | Engine / yes / risk | 37 |
| B38 | Sound basics: cue priority steal, per-cue cooldown table, zone ambience bed player (zone data already names "wind", nothing plays it) with one-shot director, creature growl distance gain, creature voice kits | SM rows 1, 2, 4, 5, 9b; AU G1, G10 | music parked by owner | small each; ambience medium (needs an asset) | none | Engine / yes / yes | 38 |
| B39 | Corpse timeline in Origins (nameplate off, fade, gone, by ticks); damage-scaled blood and per-creature blood kind | VF G3, G2 | gore is presentation only (GAME_SPEC) | small to medium | B4 | Engine / yes / yes | 39 |
| B49 | Hit feedback with many attackers: one merged presentation per victim per tick, hit sound table by family, named pre-hit cue, hurt-state read, knock weight | HF G1 to G5; CG G3 | none | medium | many-on-one fights (duel is a pair today) | Engine / yes / risk | 49 |
| B50 | Bar layers (lagging ghost, trail, tick marks), floating hit-number style; multi-enemy readouts parked | HU G1, G5; AU G9; AR G6 | none | small to medium | check `hud.ts` first | Engine / no / risk | 50 |
| B51 | Weather and time-of-day look: zone clock moves light, crossfading weather, storm flash (never within 500 ms of a boss telegraph) | WL (3 ADDs), DC G2, AU G5 | none | medium | B18 | Engine / yes / risk (particle cap) | 51 |
| B52 | Animation polish: clip hand-off blend, cue pass, idle variety (mobs move in lockstep today), layered clip masks and cloth bones, foot placement deferred | AR G1 to G6 | none | small (G3) to large (G4) | G4 gated on pose stress test | Engine / yes / yes | 52 |
| B54 | Asset sets: Origins biome ground textures (the region file asks for an `ash` preset that does not exist), prop kit, item/status icons, bodies for giant/quadruped/drake, weather particles, gear look ladders, weapon trails | AU G2 to G7; DC G5, G7, G8 | L3 pending Dom (TRELLIS.2 / nvdiffrast); licence class A to D per AU | large | none | Engine / yes / risk (texture budget) | 54 |
| B47 | Boss staging: timed walk-in with gold name and skip, boss-kill slow-to-landing, typed finale card, per-opponent head/torso/legs damage table | BS (DevilutionX, xoreos, OpenGothic, openbor, Quake, dhewm3) | none | small to medium | none | Modes / yes / yes | 47 |

---

## Area 8: Social and chat

### B25. Chat intake gate, visibility/block gate, report with chat copy
Analyst rank 25 | Layer Core (guess) | as-data: yes (budgets, bands, reasons as data) | phone-first: risk (chat UI at 375, keyboard)
- What: one intake for every chat path (refused lines cost no budget, warn then timed mute, staff exempt), one visibility gate (staff, block, privacy, friends-only; unknown mode fails closed), report that copies the reporter's last server-stamped lines; chat is also launch gate S4 (open).
- Why: chat has to be protected from day one and nothing exists (no `origins/chat`).
- Rests on: CT G1 to G3, NW G2, AC G2, GM001/002/004, PG G4 (routing only; party/guild parts deferred).
- Rulings: S48, S49, S51, S53 to S59 ruled; S50 (mute lengths) and S52 (30-minute new-character delay) pending Dom; B2 (do children play) pending Dom and shapes this.
- Size: medium to large. Depends on: B8. Phone risk: yes.

---

## Area 9: Tooling, replay and authoring

| Id | Item | Rests on | Rulings | Size | Depends | Layer / data / phone | Analyst rank |
|---|---|---|---|---|---|---|---|
| B35 | One bounded telemetry module (label cap, drop counter), rate-limited client error reporter, byte-capped zone log with live tail | AN (Nakama+Lichess, RuneLite, SpacetimeDB, Evennia) | B12, B13 (pending Dom), B14 (pending Dom), B2 (children, pending Dom) | small to medium | none | Engine / no / yes | 35 |
| B53 | One asset-licence manifest and credits page; a test fails on a new asset with no row | AU G8 | none | small | none | Engine / yes / yes | 53 |
| B57 | Row inheritance layers for legend and mob rows; pack publish gate; pack order resolver; content-bundle hash pin | MD (OpenRA, 0ad, openmw, wesnoth, luanti), GM001 | P2 (one template row for many zone families; ruled) | medium; hash pin small | none | Engine / yes / yes | 57 |
| B68 | Per-viewer views of one fight record (spectator, coach, delayed read), spectator queue, title-screen AI-vs-AI fight, replay speed, coach stance pick and one-instruction counter | SC, CO | wagers not authorised (GAME_SPEC 185); coach is post-beta; S68 pending Dom | medium | B21 | Modes / no / yes | 68 |

---

## Deferred by Dom

- **B63 Parties, guilds, friends feed (PG G1 to G5), plus party entry and landing (ID G2).** Deferred 2026-10-10. Not ranked. The gap-check (PG.md) records what exists (party is a key and a cap of 4; friend-join in presence; `guild-vault` location kind) and what each idea would add so the work is ready when Dom says go. ID G2 also needs a ruling on party size. Chat routing for party/guild (PG G4) is not built until then; B25 covers zone/world chat only.

---

## Dependency chain (critical path to a playable loop)
1. B1 tick safety (small to medium) then B2 zone registry (medium); B3 per-site seeds (small) can run alongside.
2. B4 spawn director (large) needs B1, B2, B3. This is "a zone that runs".
3. B5 stack placement (small) then B6 take-one loot edge cases (medium): loot into the pack.
4. B8 per-account limit, then B7 inventory on the writer: the player can touch items.
5. B9 metal wiring: needs the GO on migration 0007; then B16 vendor and B17 equip swap.
6. B10 quest reward claim, then B11 talk and journal screen: a quest reward that pays.
Eight-item path: B1, B2, B4, B6, B7, B9, B10, B11. Client-side drawing of server creatures is on the path but no gap-check covers it (see below).

## Quick wins (small, low risk)
- B1 (tick cap), B3 (site seeds), B5 (stack-first), B18 (world clock), B19 (stick rescale and press counter), B20 (movement budget, test first), B21 (fingerprint and key-order test), B53 (licence manifest).
- Small pieces inside larger items: first-loss flag fix (B28, `src/main.ts:1283`); content hash pin (B57); idle variety (B52 G3); guard-curve check in `generate.ts` (B71); cue priority and per-cue cooldown (B38); status badge and immunity fields (B48 G1, G3); refuse-with-a-reason character create (B58); `QUEST flag writer` (B30).

## Blocked or deferred
- Waiting on Dom (the 19): B9 and B16 on U1, U12; B40 on U38, U40, U41, U42; B13 values on S39, S41, S43; B25 on S50, S52; B21/B68/B72 on S68 (retention); B35/B72 on B13 retention and B14 alerts; B25 and B35 on B2 (children); B54 on L3; B69 on S10.
- Waiting on something else: B9 on a GO to apply migration 0007; B14 tuning on Dom's six camera answers; B42 on a ruling about decay; B48 G2 on Combat plus Dom plus a RECORD_VERSION bump; B66 held by U39 until a repair system exists; B60 depends on CC ladder #2161; B62 waits for the client to draw zones; B70 waits for a live server fight (U21, U33 to U37 apply only then); B64, B65, B67, B68, B69 are later steps or parked (P14 to P16, post-beta coach, wagers not authorised).
- Freezes named in the inputs: the Pit camera freeze (does not block the zone camera, U46); the SIM_DIGEST/RECORD_VERSION guard and the hash-pinned mob kit (any sim-visible change needs a bump, hits B21, B48 G2, B60). I found no release freeze named in the inputs.
- Deferred by Dom: B63 (above).

## Not covered by any note
- Pathfinding internals: no note says how a creature walks around an obstacle. `origins/world` holds no collision or walkable data (AC); only `canStand` exists in the preview (QC). B13 and B44 need this and have no donor shape.
- Group tactics beyond the single-holder pack token and the approach radii (flanking, formations, focus fire).
- Closed-engine replay file formats (named in PASS2-SUMMARY).
- How server-owned creatures reach the client: presence carries players only and the wire is an 8-byte pose (AC, ZW), so B4 has no sending story.
- Client drawing of a zone at all (no `origins/client`; RP, CP say the same).
- Staff tools for reports, flags and the review queue (B25, B32 write rows; no note covers a staff screen).
- A parity-checklist row for quests, trade and chat (PASS2-SUMMARY says Lead should add).

## Verify before building
Confirmed by me against the checkout at commit 517b32248 (read-only):
- `origins/server/world-spawns.ts` and `src/fight/` do not exist.
- `MAX_ATTACKERS` has no hit in `src` or `origins`; it appears only in `docs/state/lead.md:142` (queue line for #2129). Items B45, B46, B49 assume it.
- `hashDuel` (`src/net/rollback.ts:30`) omits `Duel.roll` and `Duel.gambit` (`src/duel.ts:90`): B21 is real.
- `World.move` uses `Math.max(100, ...)` as the time floor (`origins/presence/interest.ts`): the B20 concern is real, the exploit is untested.
- `intoBackpack` exists in `origins/encounters` (used in its tests), so the IV.md "not found" note is wrong and Q.md is right.
- Region 1 spec says no fetch, collect-N or kill-N (`docs/specs/origins/region1-ash-frontier.md:212`, `:223`; `living-world.md:12`): B29 conflicts with it.

Still unverified by anyone:
- PR.md says `world-spawns.ts` lives on an unmerged Combat branch (`combat/zone-rows`). Check it before building B4. I saw many `combat/*` branches but did not confirm that name.
- Whether #2129 (attacker cap) and #2161 (CC ladder) are on trunk; only lead.md mentions them.
- Parity-checklist rows (17, 18, 21, 23) quoted by many notes: no such file found by grep.
- Whether the scripted first loss is live for real players, vs the brief that the first fight is won (OB). `?tutorial=1` approval state also unknown.
- `mobs.md` section 4 on freeze/grace for the director (only lines 428 to 447 were read).
- Metal migration 0007 soundness beyond the lines read; balance-cap outcome undefined.
- Where a held loot leftover lives (open claim vs new location kind).
- Whether `hud.ts` already has hit numbers or a health-drain animation (AR G6, AU G9, HU G1); whether a hurt voice exists (HF).
- CHARACTER-RECIPE tools (fit script, pose stress test) are not in the checkout, so B52 G4 rests on the recipe text alone.
- Whether the Origins greybox walker is the camera the real client will use (QC).
- Writer DB path spawns a `psql` process per call; no measured tick or load result is in the repo (SP).

Conflicts between rulings and notes that a person must settle:
- S5 (skill-ups by random roll per use: yes) vs `progression-proposal.md:318` "no skill or stat gain by use" (SK treats all gain-by-use as SKIP).
- U38 (reclaim delay after death) and U41/U42 vs "no death penalty" and "recoverable failure, no full-loot" (DR, GL).
- U6 (trade money checked at completion) vs TR's statement that the owner ruled no currency in player trades.
- S17 (item charges, no second bar) vs the focus-pool item in B60.
- Region 1 "no kill-N" vs B29 objectives.
- `origins/world/README.md:59-61` still says "Camera: frozen" (U46 says reword it).
