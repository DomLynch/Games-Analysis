# Gap check ZW (zones and world structure)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: 57 (ZW001 to ZW019, three per group).

## Summary for Dom
1. Zones as data are built and good: 15 typed groups, layering, seeded zone generator, connection checks, a camp generator and the "45 s across, 15 s dead stretch, 10 s first fight" rules. What is missing is everything that RUNS a zone: no live spawn director, no respawn timer, no despawn or freeze when empty, no saved zone state, no zone-to-zone travel code, and presence knows only the one 300 m town square with two hard-coded zones. Nothing is ready for 700+ zones on the server side yet.
2. Counts by donor note: REUSE 4, ADD 38, SKIP 15 (57 in all).
3. The 38 ADDs collapse into six builds (below): G1 zone population director (21 notes), G4 per-zone presence and lookup for 700+ zones (8), G3 one zone-transfer path (3), G5 travel risk (3), G2 zone state save and restore (2), G6 authoring guard curve (1).
4. Top 3 additions: (a) G1, one server director in a new origins/server/world-spawns.ts that reads the zone's spawn table, counts the live roster (no hook counter), spawns only out of sight with a server-side range, queues respawns with a jittered delay, and freezes (not deletes) NPCs after a grace period when the zone is empty; (b) G4, replace the hard-coded two-zone lookup with a registry built from zone data, overlaps refused at load, one presence instance family per zone id; (c) G3, one function that moves anyone between zones, snapshots first, lands outside the trigger, checked by a data test.
5. Licence note: nearly all donors are copyleft (GPL, CC-BY-SA, AGPL-style), so shape and ideas only and no donor numbers are in this file. Fallout 1 and 2 CE carry a restricted "Sustainable Use" licence and DOOM's is unclear: ideas only. Numbers may be named only for MIT/BSD/Apache/Zlib donors (2004Scape, LostCity, Microverse, OpenGothic, OpenTESArena, isometric-city, l2dn, daggerfall-unity, lineage2-api, world-of-claudecraft, OpenBOR, Barony, evennia, DFHack, gawric, L2Solo); I use none. Every number must come from our own tests and mobs.md section 4.

## What we have today (shared by all rows)
- Zone params: origins/world/schema.ts (spawns.respawnSeconds at line 76-78, rules.safe at 111; README table in origins/world/README.md). Layering and link checks: origins/world/resolve.ts:150-167 (a two-way link must be answered). Seeded zone generator: origins/world/generate.ts.
- Zone rules (pure checks): origins/world/zone-rules.ts (checkZone line 46, openerSpot line 38, MAX_ACROSS_M line 11).
- Camp generator: origins/mobs/populate.ts populateZone (line 20): budget from density x area, 0 in safe zones (line 22), 40-try bounded placement (line 48), opener camp (line 57), dead-stretch fill (line 71). It runs once, pure, deterministic. It places and does not run anything.
- Real zones: Concord pit-yard and exchange (origins/world/concord.ts), Region 1 data (per its header comment: Exchange square and quarter, five Frontier zones, two towns) in origins/region1/world.ts with gate, road and portal connections (lines 27, 41, 90, 141, 159, 174). Region crossing uses contracts portals: origins/region1/content.ts:182 and 208 (world connections only link inside one region; origins/world/README.md "Not done").
- Zone lookup: origins/presence/zones.ts zoneAt (line 35) from the Concord frame, but only the two ids 'pit-yard' and 'exchange' (line 14) and a 300 m square (interest.ts RULES.zoneCm line 6). Saved location: origins/server/location.ts serve (held state wins, exchange saves rejoin at the gate) fed by presence's observation; trade area = exchange zone.
- Presence: origins/presence/interest.ts: 16 m cell grid (line 8, cellOf line 35), layers with soft cap 80 and fill-first join (line 51-55), empty layer closed after 5 min (line 140), distance tiers send 10/5/2 Hz (line 10). Players only; no NPCs, no creatures.
- Specs only, no code: respawn slots with a jittered window and area cap (docs/specs/origins/mobs.md section 4, slot with downUntil at line 428, respawn timing at 443). `origins/server/world-spawns.ts`, `origins/server/zone-sync.ts` and `src/fight/transfer.ts` (named by the notes) do not exist; I ran ls on all three.
- Nothing for: per-zone live state, a spawn director, despawn or freeze, a zone transfer function, zone graph reachability, route encounters. The "700+ zones" target is a note in docs/state/lead.md:314; no code is sized for it.

## Gap table
Lands in = nearest real file; "new" = does not exist yet.
| Donor note | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| ZW001 shattered-pixel-dungeon | One timer, weighted live cap, unseen placement | populate.ts generates camps once | No live cap or timer | ADD G1 | new origins/server/world-spawns.ts |
| ZW001 0ad | Zone owner from weighted influence falloff | living-world.md towns are data records (rulers by NPC), not tile maps | A tile-ownership grid fits no ruling | SKIP (zone control is town data) | none |
| ZW001 2004Scape | One shared zone delta per tick, snapshot on entry | interest.ts per-player sends | No per-zone shared buffer | ADD G4 | origins/presence/interest.ts |
| ZW002 Mindustry | Spawn table records: begin, spacing, capped scaling | populate.ts rows and budget | No timed table | ADD G1 | new origins/server/world-spawns.ts |
| ZW002 Cataclysm-DDA | Spend budget once, store on exit, restore | None | No zone state store | ADD G2 | new migration beside 202610070009_origins_character_location.sql |
| ZW002 Card-Forge | One move function: capture, replace, remove, add | location.ts serve only | No transfer function | ADD G3 | new (note names src/fight/transfer.ts, absent); nearest origins/server/location.ts |
| ZW003 Cytopia | Per-zone table, cap counts only successes | None | Cap is not live | ADD G1 | world-spawns.ts |
| ZW003 openbor | Refill between min and max live count | None | No refill band | ADD G1 | world-spawns.ts |
| ZW003 DFHack | Paint zone bounds by region flood fill | Zone sizes are numbers, layout is (u,v) | Authoring tool only; runtime expand breaks zones as data | SKIP | none |
| ZW004 DOLSharp | Fixed cell grid, whole-cell accept | interest.ts cell grid (line 35) | Already there | REUSE | origins/presence/interest.ts |
| ZW004 EQEmu | Grace then freeze NPCs when zone empty | Layer close at 5 min (interest.ts:140) | No NPC freeze, no spawn timer | ADD G1 | world-spawns.ts |
| ZW004 xash3d | Four-level box tree for trigger queries | Cell grid is enough | Not needed at our entity counts | SKIP | none |
| ZW005 OpenDAoC | Cell ring query, queued relocation per tick | interest.ts cells | Same as DOLSharp | REUSE | origins/presence/interest.ts |
| ZW005 LostCityRS | Zone window with reload box, shared events | None per zone | No window or hysteresis | ADD G4 | origins/presence/interest.ts |
| ZW005 Microverse | One authored box per zone, null outside | zoneAt (zones.ts:35) | Only two hard-coded ids | ADD G4 | origins/presence/zones.ts |
| ZW006 OpenGothic | Near, mid, far NPC tiers, near-only perception | Tiers for player sends (interest.ts:10) | No NPC tier; combat must stay server-side | ADD G1 | world-spawns.ts (tier in zone data) |
| ZW006 OpenRA | Keep live count between min and max by roster | None | Count the roster, not a hook counter | ADD G1 | world-spawns.ts |
| ZW006 OpenRCT2 | Spawn chance from park attractiveness score | None | A score has no meaning here; G1 table covers rate | SKIP | none |
| ZW007 OpenXcom | Zone as rectangles, bounded retry placement | zones.ts rectangles (line 14); populate.ts 40 tries (line 48) | Exists in shape | REUSE | origins/mobs/populate.ts |
| ZW007 Cubyz | Seeded zone centres, nearest-by-radius classify | Zones are authored | Procedural map not planned | SKIP | none |
| ZW007 Barony | Band table, substitute lower tier, not reroll | MobRow level bands | No substitution gate | ADD G1 | origins/mobs/row.ts |
| ZW008 OpenTESArena | Window diff; cap scales with loaded area | None | Cap is per zone live area | ADD G1 (cap part), G4 (window part) | world-spawns.ts |
| ZW008 Fallout 1 CE | Zone risk tier rolled every N travel steps | None | No travel steps; restricted licence | ADD G5 (ideas only) | new, with the travel build |
| ZW008 Fallout 2 CE | Zone frequency by time band, entry counters | None | Same as above | ADD G5 (ideas only) | same |
| ZW009 isometric-city | Dead band between spawn and despawn, age grace | None | No hysteresis | ADD G1 | world-spawns.ts |
| ZW009 angband | Trickle spawn, relax cap by removing far weak | None | Engaged creatures protected | ADD G1 | world-spawns.ts |
| ZW009 l2dn | Respawn queue per point, alive plus queued under cap | mobs.md 4.4 spec only | No queue code | ADD G1 | world-spawns.ts |
| ZW010 Beyond-All-Reason | Start-zone polygons per team count | None | Duel/team starts are not zones | SKIP | none |
| ZW010 crawl | Generate terrain from coordinates, small window | Zones are authored | No endless wilderness planned | SKIP | none |
| ZW010 lineage2-api | Name a spot by nearest anchor in radius | landmarks in layout | No anchor labelling | ADD G4 (labels only) | origins/presence/zones.ts |
| ZW011 daggerfall-unity | One spawn per tick, unseen, cap from size | density x area in populate.ts:22 | No per-tick spawn | ADD G1 | world-spawns.ts |
| ZW011 dhewm3 | NPCs stay awake while gates open, freeze after | None | Needs gate connectivity | ADD G1 | world-spawns.ts |
| ZW011 keeperfx | Interval, weighted pick, active-count cap | None | Same director | ADD G1 | world-spawns.ts |
| ZW012 CnC Remastered | Label connected regions; spawn only in anchor's | stand callback (populate.ts:20) | No region labels | ADD G1 | origins/mobs/populate.ts |
| ZW012 endless-sky | Interval table with gate, global multiplier | None | Needs interval floor | ADD G1 | world-spawns.ts |
| ZW012 evennia | Lazy zone chain, lock exits until cleared | None | Instanced dungeons not planned | SKIP | none |
| ZW013 exult | Spawn latch set even on failed roll | None | Our respawn is a timer, not a latch | SKIP | none |
| ZW013 flare-engine | Roll groups once per map load | populateZone is pure and once (populate.ts:20) | Same shape | REUSE | origins/mobs/populate.ts |
| ZW013 flare-game | Random-walk room layout from key=value rules | Zones are authored data | Not needed | SKIP | none |
| ZW014 freeciv | Ring-band sampler from owner's anchors | Camps cluster on landmarks (populate.ts) | No owner anchors | SKIP | none |
| ZW014 freeorion | Per-kind location rule, one kind per zone | MobRow rows | Generation-time rule covered by rows | SKIP | none |
| ZW014 Unity-Client-L2J | Preload band, one load per frame | None (no client yet) | Client streaming for 700 zones | ADD G4 | new client loader |
| ZW015 gemrb | Roll encounter per route leg, first hit | None | Only if routes exist | ADD G5 | with the travel build |
| ZW015 DOOM | Bounded FIFO respawn queue, one per tick | mobs.md 4.4 spec | No queue code | ADD G1 | world-spawns.ts |
| ZW015 micropolisJS | Clamped demand valve per zone type | None | City economy, no fit | SKIP | none |
| ZW016 Quake | Snapshot once at exit, restore at arrival | None | One typed record needed | ADD G3 | new, nearest origins/server/location.ts |
| ZW016 Quake 2 | Save live entities on leave, overlay baseline | None | Kills stay dead, unit wipe | ADD G2 | new migration |
| ZW016 fheroes2 | Grow camps by expected rate, stochastic round | None | Camps respawn, they do not grow | SKIP | none |
| ZW017 ioquake3 | Send only entities in connected zones | None | Needs zone graph and gate counts | ADD G4 | origins/presence/interest.ts |
| ZW017 pokemonAutoChess | Weighted table with explicit empty mass | None | One table field | ADD G1 | world-spawns.ts |
| ZW017 l1j | Unseen point, retry 3 s, min plus jitter | schema respawnSeconds 300 (schema.ts:78), no jitter | No jitter, no retry | ADD G1 | origins/world/schema.ts + world-spawns.ts |
| ZW018 openmw | Recentre only past half cell plus margin | None | Hysteresis for client window | ADD G4 | client loader |
| ZW018 lincity-ng | Carve water by priority flood | None | Runtime carver is a second source of truth | SKIP | none |
| ZW018 claudecraft | Transition pairs: radius and landing, one recipe | Portals at region1/content.ts:182,208; gate links resolve.ts:158 | No server move, no landing-outside-trigger test | ADD G3 | origins/region1/load.ts (test) + new transfer fn |
| ZW019 forgottenserver | Points hold one monster each, presence gate | None | Leash radius to zone data | ADD G1 | world-spawns.ts |
| ZW019 L2Solo | Box zones, first match; overlaps refused | Two-zone quads only | Overlap check at load | ADD G4 | origins/world/resolve.ts |
| ZW019 vcmi | Guard strength from reward value curve | loot tiers in schema | Authoring-time only | ADD G6 | origins/world/generate.ts |

## Merged additions (one build each)
- G1 Zone population director. 21 notes (shattered, Mindustry, Cytopia, openbor, EQEmu, OpenGothic, OpenRA, Barony, OpenTES cap, isometric-city, angband, l2dn, daggerfall, dhewm3, keeperfx, CnC, endless-sky, DOOM, pokemonAutoChess, l1j, forgottenserver). One module on the server tick: spawn table per zone as data (rows, weights, empty mass, interval, min and max live count). Rules: count the live roster, never a hook counter; at most one spawn per tick; spawn only out of sight by a server distance band (the camera is client-only); alive plus queued respawns stay under the cap; respawn = base plus jitter, with retry; empty zone keeps NPCs for a grace period, then freezes them, never deletes; combat state and hate stay out of the tier so far NPCs still land hits; every spawn and kill goes through the one ledger and kills are server-verified; a spawn side effect never kills a player. Build on populateZone for placement and mobs.md section 4 for slots. Add jitter and spawn-table fields to schema.ts group 9.
- G4 Per-zone presence and lookup for 700+ zones. 8 notes. Build a zone registry from zone data (replace the two hard-coded ids in zones.ts:14), refuse overlaps and missing boxes at load, nearest-anchor labels for unlabelled ground, presence instances keyed by zone id with the existing cells, one shared delta per zone per tick, window with hysteresis on the client, optional reachability filter by gate edges. Unknown position returns null, never a silent default.
- G3 One zone-transfer path. 3 notes. One function for every zone-to-zone move: snapshot the mover once as a typed record (not a death), defer past the trigger, land outside the trigger, no logout escape (held state wins, as location.ts serve already does). Add a data test that every landing sits outside its own trigger and every link is answered (extend resolve.ts:158 to cross-region portals).
- G2 Zone state save and restore. 2 notes. A store of live NPCs per zone on leave, overlaid on the fresh baseline on entry, so a kill stays dead and nothing re-rolls. A store is not a kill, so it pays no loot or XP. Needs a migration; wipe on a season boundary.
- G5 Travel risk. 3 notes, ideas only (restricted licences). Only if routes exist: server rolls once per leg, first hit wins, per-zone tier and time band as data, rare entries spent from a ledger counter. Park until a route graph is real.
- G6 Guard strength curve. 1 note. Authoring-time check in generate.ts, not runtime.

## Could not verify
- No `docs/` parity-checklist file was found by grep, so "row 23" (zone population) is only quoted from the notes, not from our repo.
- I did not read the full text of mobs.md section 4 beyond lines 428-447, nor the Region 1 spec, so whether the slot spec says anything on freeze or grace is unverified.
- The notes' "today" lines say Frankendom's code was not read; I did not re-read donor source. Checker-findings blocks (15 notes) were only counted, not read.
- I did not check donor licence files; licences are as stated in each note. pokemonAutoChess conflicts internally (GPL-3 file, BSD in package.json): treated as GPL.
- I did not open origins/server/handlers.ts or the supabase migrations beyond the file names, so any existing per-zone table is unseen (grep for zone_state found none).
