# Zones-and-world brainstorm (idea-mining lead)

**NOTHING IS BUILT.** This file is a design brainstorm from reading the 60-note zones digest (`/private/tmp/p2/brainstorm/zones-digest.md`). No code, no data files, no tests, no server change exist. Every field name, every number and every test below is a proposal. Nothing here has been run.

Rulings assumed (from the brief): zones are data; one engine; server-verified kills; MAX_ATTACKERS = 3 many-on-one; one ledger; the Pit is frozen; parity row 23 = zone population (cap, spawn chance, respawn s, grace s, coverage).

## How to read the licence and number rules

- Licence class tags: **[P]** permissive (MIT, BSD, Apache, Zlib), **[C]** copyleft (GPL, AGPL, CC-BY-SA, BSL, Valve, Sustainable-Use), **[R]** restricted or unclear (non-commercial, mixed, unclear).
- **[C] and [R] donors are shape-only.** I copy no constants and no code from them. Wherever a gem comes from a [C]/[R] donor and I give a number, the number is **my own derived tuning** (formula shown, based on the assumptions in the next paragraph), not the donor's.
- [P] donors could be adapted with their notice kept, but I still write everything fresh, and I still derive my own numbers because the donor's game feel is not ours.
- Tuning assumptions (mine, unverified, to be replaced by measurement): server step `T` = 100 ms; typical fight length `fightS` = 20 s; player walk speed such that a medium zone is crossed in about 20 s; a phone view shows about 200 walkable tiles. Every preset number below is a formula of these, so it can be re-derived when the real values are measured.
- Citation form: `Donor (class) - note file`. All note files live under `/private/tmp/p2/wave2-haiku/batch3/<batch>/out/zones-world/<donor>.deep.md`; I give the file name only.

---

## 1. Top gems (16)

Each gem keeps the idea. The donor defect it carries is fixed in section 2.

1. **Zone as one table row, one world frame, O(1) lookup, reject bad ids.** RustDAoC (C) - `latentcollapse-RustDAoC.deep.md`. Plus KsanaDock (P) - `KsanaDock-Microverse.deep.md` for one id and a null result outside every zone, and pmbstyle-L2Solo (P) - `pmbstyle-L2Solo.deep.md` for boxes with a z band and "overlap fails at load". This is the base for everything else: every other part keys on `zoneId`.
2. **One timer per zone that re-arms only when idle and the zone has room, with the delay re-drawn on every arm.** ModernUO (C) - `ModernUO.deep.md`. This is the simplest correct respawn director.
3. **Weighted live count, one spawn per cooldown, only in a cell no player can see and far by walking.** Shattered Pixel Dungeon (C) - `00-Evan-shattered-pixel-dungeon.deep.md`; the 3 s retry with a new point from l1j-en-classic (C) - `l1j-en-classic.deep.md`; the "trickle roll out of sight" from Angband (R) - `angband-angband.deep.md`.
4. **Grace in stages: keep stepping, then freeze, then (our rule) despawn.** EQEmu (C) - `EQEmu.deep.md` (keep stepping, then freeze); dhewm3 (C) - `dhewm-dhewm3.deep.md` (wake on the same tick a gate reopens; skip brain when frozen); ClassicUO (P) - `ClassicUO.deep.md` (throttled sweep, deferred removal, per-pass cap). Three donors each give part of the grace timer; none gives the despawn, so the final stage is ours.
5. **Spend the population budget once, store on exit, restore on re-entry.** Cataclysm-DDA (C) - `CleverRaven-Cataclysm-DDA.deep.md`; Quake 2 (C) - `id-Software-Quake-2.deep.md` (baseline first, snapshot overlaid on top, wipe at a unit boundary). Together they give "kills stay dead until the respawn clock says otherwise".
6. **Respawn queue where alive plus queued must stay under the cap, with a floor on the delay.** l2dn-server (R) - `ax-grymyr-l2dn-server.deep.md`; DOOM (R) - `id-Software-DOOM.deep.md` (bounded FIFO, one entry per tick, occupied spot defers rather than drops).
7. **Refill band (min, max) with a burst to the minimum.** OpenBOR (P) - `DCurrent-openbor.deep.md`; OpenRA (C) - `OpenRA-OpenRA.deep.md` (count the live roster, not a hook).
8. **Soft cap that divides the spawn chance above a target, plus a hard ceiling.** OpenRCT2 (C) - `OpenRCT2-OpenRCT2.deep.md`. Smooth density without a cliff. Only for population, never for MAX_ATTACKERS.
9. **Per-zone interval table with a condition gate, one global rate knob, pre-warm on entry, and a floor.** Endless Sky (C) - `endless-sky-endless-sky.deep.md`. The global knob is how Dom gets "cautious/standard/busy" with one number.
10. **Spatial grid that re-files on every move, with whole-cell accept and edge-cell exact check.** DOLSharp (C) - `Dawn-of-Light-DOLSharp.deep.md`; OpenDAoC (C) - `OpenDAoC-OpenDAoC-Core.deep.md` (ring cull). Needed for "who is near" in spawn gating, many-on-one candidates and visibility.
11. **Shared zone delta once per tick, private events to the owner only, full snapshot on first sight.** 2004Scape (P) - `2004Scape-Server.deep.md`; LostCity (P) - `LostCityRS-Engine-TS.deep.md` (window rebuilt only past an inner reload box). This is the streaming window.
12. **Paired portals as data, one shared transit recipe, landing clear of the trigger; one transfer entry that captures the leaver's state first.** claudecraft (P) - `levy-street-world-of-claudecraft.deep.md`; Forge (C) - `Card-Forge-forge.deep.md`; Quake (C) - `id-Software-Quake.deep.md` (defer the commit, fire once, clamped typed carry).
13. **Reference-counted gate edges and a server send filter by zone reachability.** ioq3 (C) - `ioquake-ioq3.deep.md`; dhewm3 (C) for the same graph used as a wake rule. This is the visibility part.
14. **Seeded layout: chunk centres by parity phase, nearest-centre by normalised radius; grid random walk with key-before-door; lazy chain with a budget of unexplored exits.** Cubyz (C) - `PixelGuys-Cubyz.deep.md`; flare-game (C) - `flareteam-flare-game.deep.md`; Evennia (P) - `evennia-evennia.deep.md`. Layout generation as a data seed, not a baked file.
15. **Zone control as influence with a max-weight owner and root connectivity.** 0 A.D. (C) - `0ad-0ad.deep.md`. Integer math on the server, recompute only on a source change.
16. **Once-per-character unique pool and per-entry counters in the ledger.** Fallout 1 CE (R) - `alexbatalov-fallout1-ce.deep.md`; Fallout 2 CE (R) - `alexbatalov-fallout2-ce.deep.md`. Plus the null-mass weighted table from pokemonAutoChess (C) - `keldaanCommunity-pokemonAutoChess.deep.md` (leftover probability = nothing spawns, a clean designer knob).

Honourable mentions: fheroes2 stochastic rounding growth (C, `ihhub-fheroes2.deep.md`); vcmi hinge-curve guard for a reward (C, `vcmi-vcmi.deep.md`); OpenGothic near/mid/far tiers (P, `OpenGothic.deep.md`); OpenMW prediction prefetch (C, `openmw.deep.md`); CnC region labels (C, `electronicarts-CnC_Remastered_Collection.deep.md`).

Rejected donor: lincity-ng river carver (C, `lincity-ng-lincity-ng.deep.md`) is rejected as a play mechanic by its own decision; I only keep it as an optional offline authoring helper (see novel idea N16).

---

## 2. Defect -> fix table

Every row keeps the donor mechanism. "Fix" is our rule. Tests named in section 7.

| Donor (class) - note | Defect | Fix in Frankendom |
|---|---|---|
| RustDAoC (C) - latentcollapse-RustDAoC | Id masked with 511, so id 512 returns zone 0 | Table lookup returns `null` for any unknown id; load fails if an id repeats or exceeds the table; test id 512 and id 9999 |
| ModernUO (C) - ModernUO | No despawn on empty; live count is lazy (sweep); group refill arms the timer twice | Grace despawn is ours (part 3); live count is derived from the ledger on every read; re-arm is one function called from one place |
| ClassicUO (P) - ClassicUO | Distance cull is client-only; eviction is creation order | Server hide never changes the ledger (hide and delete are different calls); grace keyed on `lastPlayerSeenAt` per zone |
| Shattered Pixel Dungeon (C) | Depth and cap are code switches; single-hero view; no despawn | Roster, cap, cooldown are zone data; visibility check against every connected player on the server; despawn grace added |
| 0 A.D. (C) | Integer falloff `weight*8/radius` can be 0, flooding the map; ties go to lowest id by accident; many weak sources beat one strong | Load-time rule `weight*K >= radius` (K derived by me); explicit tie rule (see Q5); `sumMode: "sum"|"max"` is a zone field |
| 2004Scape (P) | Eviction comment disagrees with code; soft cap; respawn scaled by total player count | One written eviction rule (oldest dynamic first) and a hard cap that counts static items; respawn never scales by global player count |
| Mindustry (C) | Shockwave kill bypasses the kill path; no respawn or despawn | Spawn side effects never kill; kills only via ledger; respawn and despawn are separate parts |
| Card-Forge (C) | Whole-zone snapshot at each checkpoint | Capture only the entity that moves (LKI); replacement pass is a hook list that may be empty |
| Cataclysm-DDA (C) | No respawn; unload sets HP to 0, which in our game would pay loot and XP | Store is a state change, never a death; respawn queue added; stored monsters keep hp and position |
| Cytopia (C) | Failed picks count against the cap; occupancy flag desyncs on load | Cap counts successful spawns only; occupancy is derived from the ledger, never from a flag; test covers a restart with existing spawns |
| OpenBOR (P) | Lock and bounds entries wait behind a full band; failed spawn consumes the entry | Lock and bounds apply independently of the band; a failed spawn stays due |
| DFHack (P) | Runtime zone expansion on dig; state in a plugin-global map | Zone edits only through the authoring tool and a server-versioned zone record; no runtime expansion |
| DOLSharp (C) | Moved object stays filed under its old cell | Re-file on every move, same tick; property test vs brute force |
| EQEmu (C) | Freeze not despawn; respawn runs while empty; stale `old_client_count` when no mob at departure | Explicit `emptyPolicy` (freeze or despawn); respawn gated on presence (or deferred); the departure edge is detected from the presence set, not from a per-mob loop |
| Xash3D (C) | Touch is level-triggered; brush tests origin only | Per-player `insideSet`, fire on change only; boundary says which point counts (position, not body box) |
| KsanaDock (P) | Two names per zone; silent fallback; skip origin | One `zoneId` only; missing rect fails load |
| LostCity (P) | Bit-grid index collision (`>>>5` takes 6 bits); first-in-list eviction contradicts comment | Do not port the bit grid; use the zone id; eviction rule as above |
| OpenDAoC (C) | Z skipped inside fully-enclosed cells; relocation lags one tick | Radius query is 3D (or explicitly 2D) everywhere, same rule inside and on the border; moves applied before queries in the tick |
| OpenGothic (P) | Tier hides hate and combat; no hysteresis; O(n) every tick | Hate/engaged state forces full tier at any distance; tier change needs a margin or hold time; tier pass on a slower cadence |
| OpenRA (C) | Hook-based counter drifts; max not clamped against min | Count the live roster; load fails if `min > max` |
| OpenRCT2 (C) | Soft cap spawns forever above target; inputs are park economics | Soft cap plus hard ceiling both in zone data; score is a plain data field (e.g. recent kills in zone), no economy |
| OpenXcom (C) | Weighted draw off-by-one; wave pause from a client UI | Own weighted pick with a fixed test (cumulative, strict `<`); pause applied server-side on a verified kill |
| Cubyz (C) | Radius not clamped for the neighbour check; window-edge chunks lose neighbours; f32 | Load-time check on radius against chunk size; generate with a margin ring, then crop; integer or double math |
| Barony (P) | Name-prefix zone lookup; base roll consumed before custom roll; one shared stream | Zone id key; one stated roll order; per-spawn seed = hash(zoneSeed, spawnIndex) |
| OpenTESArena (P) | Refill only on chunk load; kills not saved; cap scaled by loaded area | Server respawn timer; kills in ledger regardless of window; cap is per zone, not per loaded area |
| Fallout 1 CE (R) | Step count is also the clock; bitmask in a client save; dice curve is game feel | Server defines a "travel unit" event; record on the character in the ledger; tiers as explicit probabilities in zone data |
| Fallout 2 CE (R) | Wall-clock throttle; one-axis distance quirk; cancelled encounter still spends the counter | Server ticks only; distance rule stated and tested; cancel refunds or not by a stated flag (Q4) |
| isometric-city (P) | Economic demand; despawn on negative demand not on empty; `Math.random` | Demand = zone count vs cap; trigger = empty zone; seeded RNG per zone |
| Angband (R) | Compaction ignores engaged creatures; unseeded RNG | Engaged and boss are protected first; seeded RNG |
| l2dn-server (R) | Clock starts at corpse decay; cap checked at queue time only; provenance doubtful (L2J port) | Clock starts at the verified kill; cap re-checked at fire time; treat as shape-only |
| Beyond All Reason (C) | Silent invented fallback; nil-then-break retry; `math.random` | A zone with no layout for N fails loudly; retry budget per spawn; seeded RNG |
| Crawl (C) | Destructive wipe on re-anchor | Entities leaving a window are moved or ledgered, never deleted |
| cuteshaun-L2 (P) | One 10000 radius for every zone; anchors have no shape | Radius per zone in data; anchors for labels only, containment for legality |
| Daggerfall Unity (P) | Immediate despawn by distance; client forward-vector test on server would disagree between clients | Grace timer; the "not in front" test stays on the client, server uses range and line-of-sight proxy |
| dhewm3 (C) | Portal BSP graph; dormant = freeze only | Authored gate graph in zone data; despawn left to the empty-zone rule |
| KeeperFX (C) | `total_score` vs `manage_score` compare bug gives interval 0 | Maximum over one named field; test pins it |
| CnC Remastered (C) | Region label byte overflow; whole-map relabel | Per-zone relabel on gate or blocker change only; label width checked at load |
| Endless Sky (C) | No interval floor; zero-bound RNG fires every step; pre-warm skips population guard | Floor in code and data (`minIntervalTicks`); pre-warm goes through the same cap check |
| Evennia (P) | Cleanup removes no rooms (tag never set); collapse by age | Instance records its areas at creation; empty-with-grace collapse deletes by that record; test asserts gone |
| Exult (C) | No cap; failed roll uses the point; re-arm by client position | Cap added; `missUsesLatch` flag (Q4); re-arm from server positions |
| flare-engine (C) | Re-rolls on every load; no cap or respawn; no occupancy during placement | Population is persistent state, rolled once per zone lifetime (or per reset); occupancy checked; shortfall reported |
| flare-game (C) | Branch length draw uses min as the upper bound; keys form one linear chain | Draw in `[min, max]`; the key chain is a chosen option (`keyMode`) |
| freeciv (C) | No cap, no despawn, turn-based | Cap, despawn, per-tick attempt budget |
| freeorion (C) | Runtime spawner bypasses the table; one roll per zone per pass | One rule set for both; per-tick budget instead of per-pass |
| gawric-L2J-client (P) | No hysteresis; geodata never released | Load band smaller than release band; release with the zone |
| gemrb (C) | Mutable link chance; pointer hazard; global RAND | Chance is read-only zone data; server roll recorded with zone and cost |
| micropolisJS (C) | Economy valve numbers; lagged census | Valve is a clamped accumulator over zone-count inputs; reads live roster |
| DOOM (R) | No occupancy on items; corpses wait forever on an occupied spot; silent drops past 127 | Occupancy check, timeout then relocate; overflow logged, never silent |
| Quake 2 (C) | Binary dump; abort on bad file | Typed versioned snapshot; bad snapshot falls back to baseline |
| Quake (C) | 16 untyped slots; health floor | Typed carry record; floor is zone data or absent |
| fheroes2 (C) | 7-day clock; unseeded RNG | `growthEveryS` in data; seeded draw |
| ioq3 (C) | Per-entity full scan; off-by-one overflow branch | Per-zone entity lists; no overflow branch |
| pokemonAutoChess (C) | Void-on-repeat lowers the true rate | Publish effective rate in a test or use `onRepeat: "reroll"` flag |
| l1j (C) | Last attempt skips checks; non-monsters never leave loop | Final point is checked, or the spawn is skipped and retried; every kind uses the same loop |
| claudecraft (P) | 2D trigger ignores height; no arrival lock; no ledger entry | Optional floor band per portal; `arrivalLockMs`; transit written to the ledger once |
| lincity-ng (C) | Not a play feature | Offline authoring helper only, if ever |
| OpenMW (C) | Two centres in one frame; camera anchor does not apply | One centre; lookahead on movement not camera |
| Forgotten Server (C) | Global leash; no grace; clock from last spawn | Leash radius per zone; grace added; clock from verified removal |
| L2Solo (P) | Two zone models; first-match overlap | One model (boxes); overlap rejected at load |
| vcmi (C) | Hard-coded fallback; two-hinge formula not pinned | Named fallback field; formula as tested data; authoring time only |

---

## 3. Composable zone parts

Design rule: a zone is one data record. Each part below is an optional block with `"on": true|false`. A part that is off costs nothing and the other parts still work. The parts talk through the **one ledger** and a **per-zone event bus** (`kill`, `enter`, `leave`, `spawn`, `despawn`, `gateChanged`). No part reads another part's private state.

Common conventions (all are proposals):
- Time in server ticks or seconds; one unit per field, named in the field (`_s`, `_ticks`).
- RNG: `rng = hash(worldSeed, zoneId, partName, counter)`; every roll logged with its threshold (replay).
- Live count is **derived** from the ledger each time it is read; no cached counter (fixes OpenRA, ModernUO, Cytopia drift).
- Hard limits (MAX_ATTACKERS = 3, engaged protection) are outside the parts; no part can override them.

### 3.1 Spawn director
Purpose: decides when and what to add. Sources: ModernUO, Shattered, Mindustry, OpenRA, OpenBOR, Endless Sky, KeeperFX, freeorion, OpenRCT2.
```
"director": { "on": true, "mode": "timer|interval-table|wave-index|band",
  "cap_hard": 6, "cap_soft": 5, "soft_divisor_shape": "linear", 
  "band": {"min": 2, "max": 5},
  "roster": [ {"kind":"wolf","weight":3,"cap":4,"minLevel":0}, {"kind":"boar","weight":1,"cap":2} ],
  "nullMass": 0.15, "onRepeat": "reroll|void",
  "perTickBudget": 1, "rate_mult": 1.0, "minIntervalTicks": 20,
  "prewarm_s": 0, "rng": "zone" }
```
Behaviour: weighted pick among eligible roster entries (full entries leave the pool); `nullMass` is the empty outcome; one spawn per budget; `rate_mult` scales intervals but never below `minIntervalTicks`; `band.min` bursts to the minimum; `cap_soft` divides the roll chance above it; `cap_hard` is absolute.

### 3.2 Presence gate
Purpose: spawn and think only when it matters. Sources: Shattered, l1j, Angband, Daggerfall, Forgotten Server, Cytopia, OpenGothic, Endless Sky.
```
"presence": { "on": true, "needPlayerInZone": true, "minAwayTiles": 13, "minAwayWalk": 12,
  "noSpawnInViewOfAny": true, "retry_ms": 3000, "retryKeepsSpawnDue": true,
  "tier": {"near_tiles": 18, "far_tiles": 40, "hold_s": 2, "engagedAlwaysNear": true},
  "spawnWhileEmpty": "defer|allow" }
```
The server checks every connected player (not one hero). View is a server range proxy (the camera is client-only). Tier never affects hate, hits or kills.

### 3.3 Grace timer (empty-zone state machine)
Sources: EQEmu, dhewm3, ClassicUO, Forgotten Server, isometric-city, Daggerfall, Evennia.
```
"grace": { "on": true, "stages": [ {"after_s": 0,  "state":"active"},
  {"after_s": 30, "state":"frozen"}, {"after_s": 120, "state":"despawn"} ],
  "emptyPolicy": "freeze|despawn|store", "perSweepCap": 4, "protect": ["engaged","boss","carrying"],
  "reentryCancels": true }
```
State machine per zone, keyed on `lastPlayerLeftAt`. `store` writes the snapshot (3.7) instead of despawning, which is the "no data lost" option. A sweep removes at most `perSweepCap` creatures per pass, collected first and removed after the walk (deferred removal).

### 3.4 Respawn queue
Sources: l2dn (R), DOOM (R), ModernUO, Forgotten Server, l1j.
```
"respawn": { "on": true, "clockFrom": "verifiedKill", "delay_s": [40, 80], "floor_s": 10,
  "capCheckAt": "queue+fire", "queueMax": 127, "overflow": "logAndDrop",
  "occupiedSpot": "deferThenRelocate", "defer_timeout_s": 15,
  "gatePresence": true, "perTick": 1, "unique": {"once_per_character": false} }
```
Queue entries: `{slotId, dueAt}`. Alive plus queued stays at or below the cap, checked again at fire time. The clock starts from the verified kill record.

### 3.5 Streaming window
Sources: LostCity, OpenMW, gawric, OpenTESArena, 2004Scape, Crawl, Dawn-of-Light/OpenDAoC (grid).
```
"stream": { "on": true, "grid_tiles": 16, "load_ring": 1, "release_ring": 2,
  "lookahead_s": 1.0, "oneActionPerFrame": true, "sharedDelta": true,
  "fullSnapshotOnFirstSight": true, "reloadBox_tiles": 6, "dynamicObjCap": 128, "evict": "oldestDynamic" }
```
Client-side window per player; load ring smaller than release ring (hysteresis). The window never deletes server state. Shared per-tick buffer per zone; private events to the receiver only.

### 3.6 Transitions
Sources: claudecraft, Quake, Forge, gemrb.
```
"portals": [ {"id":"gate_a","aTrigger":{"x":10,"y":4,"r":1.5,"floor":0},"aLanding":{"x":12,"y":4},
  "bTrigger":{...},"bLanding":{...},"arrivalLock_ms":800,"defer_ms":100,"minWait_s":0,
  "carry":{"hpFloor":null,"strip":["zoneKey"],"summons":"remove"}, "ledgerEvent":"transit" } ]
```
One transfer function: guard, capture state, replacement hooks (may be empty), remove, add, event, triggers with captured state. Fire once; `insideSet` per player. A data test checks each landing is outside its own trigger.

### 3.7 Visibility (who is sent what)
Sources: ioq3, dhewm3, 2004Scape, LostCity.
```
"visibility": { "on": true, "gates": [ {"id":"g1","between":["A","B"],"initial":"open"} ],
  "refcount": true, "sendFilter": "reachableZones", "hideNeverDeletes": true }
```
Refcounted edges; a re-flood on change; a snapshot contains only entities in zones connected to the viewer's zone.

### 3.8 Persisted zone state
Sources: Quake 2, Cataclysm-DDA, Quake, fheroes2, Fallout.
```
"state": { "on": true, "snapshot": "typed-v1", "restore": "overlay-on-baseline",
  "onBadSnapshot": "baseline", "wipeOn": ["unitReset","version-bump"],
  "keep": ["position","hp","buffs","engagedWith"], "kills": "ledger-only" }
```
Kills are never in the snapshot; they are in the ledger. The snapshot holds living entities and their cells.

### 3.9 Layout generation
Sources: Cubyz, flare-game, Evennia, Beyond All Reason, DFHack (authoring), CnC (regions), vcmi (guards), OpenXcom (rect pick).
```
"layout": { "on": false, "mode": "authored|seeded-walk|lazy-chain|centres",
  "seed": 90210, "pieces": "rules/mine-pieces.json", "mainPath_len": [10, 20],
  "branch_len": [5, 10], "doors": 2, "keyMode": "before-door|anywhere", "uniquePieces": true,
  "exitBudget": 3, "reserveCoords": true, "variantByPlayerCount": {"1":"A","2":"B","4":"C"},
  "failOnMissingVariant": true, "regions": {"relabelOn":["gate","blocker"]}, "instance": {"collapseEmpty_s": 600} }
```
Authored zones are the default; generated layouts write the same zone record at build time (frozen by seed), so the runtime sees only data.

### 3.10 Zone control
Sources: 0 A.D.
```
"control": { "on": false, "sources": [ {"owner":"playerId","x":10,"y":5,"weight":10000,"radius":140,"root":true} ],
  "sumMode": "sum|max", "tieRule": "earlier-claim", "recompute": "onSourceChange",
  "effects": {"respawnMult": 0.5, "spawnTable":"friendly"} }
```
Integer weights on the server; connectivity to a root required. Control is its own part and never touches the spawn module directly; it only changes data fields (via effects) through the zone record.

---

## 4. Switchable presets Dom can try

A preset is a data overlay: one JSON file merged over each zone's defaults. Flipping it changes nothing else (no code). All numbers are **my derived starting values**, untested. Derivations: `fightS`=20; `crossS`=20 (zone crossing time).

- cap = `clamp(round(walkableTiles / tilesPerMob), 2, 24)`; `tilesPerMob` = 200/4 = 50 for quiet, 25 standard, 14 busy (one view of about 200 tiles should hold about 4 / 8 / 14 mobs).
- respawn delay = `[a, b] x fightS`: cautious `[4, 8]` = 80-160 s; standard `[2, 4]` = 40-80 s; busy `[1, 2]` = 20-40 s (floor 10 s).
- grace = `k x crossS`: cautious 6 (120 s), standard 3 (60 s), busy 1.5 (30 s).
- spawn chance per director roll: set so the expected refill from empty to the cap takes `cap x respawnMid`; chance = `1 / (respawnMid / rollEvery)`.

| Field | P1 cautious world | P2 standard world | P3 busy world | P4 persistent world | P5 lazy dungeon |
|---|---|---|---|---|---|
| `director.mode` | timer | timer | band | timer | wave-index |
| `tilesPerMob` | 50 | 25 | 14 | 25 | 20 |
| `cap_hard` (zone 1200 tiles) | 24 | 24 (clamp) | 24 (clamp) | 24 | 8 per instance |
| `cap_soft` | cap-2 | cap-3 | cap-4 | cap-3 | none |
| `rate_mult` | 0.5 | 1.0 | 2.0 | 1.0 | 1.0 |
| `respawn.delay_s` | [80,160] | [40,80] | [20,40] | [40,80] | none (clears) |
| `presence.minAwayTiles` | 20 | 13 | 9 | 13 | 10 |
| `grace.stages` (s) | 60 freeze / 240 despawn | 30 / 120 | 15 / 45 | 30 / 120 | 60 collapse |
| `grace.emptyPolicy` | despawn | freeze | despawn | store | despawn |
| `stream.release_ring` | 3 | 2 | 2 | 2 | 1 |
| `state.on` | off | off | off | on | on (instance) |
| `layout.mode` | authored | authored | authored | authored | lazy-chain |
| `director.nullMass` | 0.3 | 0.15 | 0.0 | 0.15 | 0.0 |
| Aim | calm, forgiving, easy to read on a phone | the default feel | crowded, fast loop, stress test of ledger | kills and positions stay until the clock says | procedural run, onward exit locks until cleared |

Sketch of the preset file (proposal):
```
{ "preset":"standard", "version":1,
  "defaults": { "director": {"on":true,"mode":"timer","tilesPerMob":25,"rate_mult":1.0,"minIntervalTicks":20},
                "presence": {"on":true,"minAwayTiles":13,"retry_ms":3000},
                "grace": {"on":true,"stages":[{"after_s":30,"state":"frozen"},{"after_s":120,"state":"despawn"}],"emptyPolicy":"freeze"},
                "respawn": {"on":true,"delay_s":[40,80],"floor_s":10} },
  "zones": { "forest_1": { "walkableTiles": 1200, "roster":[{"kind":"wolf","weight":3,"cap":10}] },
             "pit": { "frozen": true } } }
```
Per-zone fields override the preset; the Pit entry is frozen and every preset leaves it alone.

---

## 5. Novel ideas (20)

Marked with the donors whose shape they extend. All ours; none built.

1. **Preset slider as one number.** The three presets differ only through `rate_mult`, `tilesPerMob` and a grace factor; ship a single "world busyness" dial that interpolates those three and logs the value in every run. (Endless Sky knob, shape-only.)
2. **Heat-map respawn.** Respawn delay shortens in zones nobody entered in the last N minutes and lengthens where kills just happened, so empty corners fill and farmed spots rest. Uses the ledger kill log. (OpenRCT2 score, isometric-city dead band.)
3. **Dead band on zone demand.** `demand = players_in_zone / playersTarget`; below `lo` raise the cap, above `hi` lower it, between them hold. Cap moves by one per minute. (isometric-city, micropolisJS valve; demand is a count, not an economy.)
4. **Visible spawn telegraph.** When a spawn is allowed in view (e.g. a boss), show a short cue first; the spawn commits on the server only after the cue time. Avoids pop-in complaints without breaking the "refuse in view" rule. (l1j, Daggerfall client rule on the client side.)
5. **Last-seen ghosts on the map.** The streaming window drops a creature's mesh, but the client keeps a faint last-known marker for N s, so leaving and re-entering feels continuous. Marker is client only; ledger untouched. (ClassicUO hide-not-delete.)
6. **Snapshot the engaged state.** The snapshot keeps `engagedWith` and hate entries, so leaving mid-fight resumes with the fight state, and the "leave to heal" exploit is removed by a regen penalty that is also in the snapshot. (Quake 2, Forge LKI.)
7. **Respawn tickets.** Each kill leaves a ticket in the zone that can be spent by the director only on the same roster entry that was killed, so rare entries have rare returns, not a re-roll. (l2dn queue, Fallout counters.)
8. **Pity ramp on unique spawns.** A unique's per-roll chance rises each roll it misses and resets on spawn; the ramp is a data field and is logged. Once per character via ledger. (flare-game pity ramp tag, Fallout unique bitmask.)
9. **Population as a three-tier ring.** Spawn rule differs by ring from the zone entrance: ring 0 safe, ring 1 trickle, ring 2 full roster; ring radii are zone data. Gives difficulty gradient inside a zone without separate zones. (freeciv ring band, freeorion hop-distance guard.)
10. **Gate-linked wake.** Opening a gate (visibility part) wakes the creatures behind it on the same tick and starts a short "noise" grace; closing starts the freeze countdown. One gate event drives both the send filter and the AI sleep. (ioq3 and dhewm3 combined.)
11. **Co-op scaling by present count.** `variantByPlayerCount` selects a layout variant, and the director uses the same count to set `band.min` (never `cap_hard`), so more players create more arrivals but the hard cap and MAX_ATTACKERS stay fixed. (Beyond All Reason variant pick, OpenBOR player-count variant.)
12. **Region-scoped spawn pockets.** A sealed pocket in a zone is its own region; its roster and respawn are separate until a gate opens, then merge. Gives "vault" feel without a new zone. (CnC region labels.)
13. **Zone seasons.** A zone's roster table has a `season` condition that rotates on a real-day schedule (server clock); the Fallout daypart idea at a slower scale. Player returns, finds a new roster. (Fallout 2 daypart, Barony band table.)
14. **Guard-for-reward budget.** Any reward chest in a zone declares a value; the authoring tool computes a guard strength from a hinge curve and writes the guard into the zone roster. No runtime cost. (vcmi.)
15. **Escort route zones.** A creature group with a `route` of zone ids walks zone to zone through the portals, re-using the transit function; the director counts it as one member of its start zone until it leaves. Ambush check per leg is a probability in the portal data. (OpenXcom route, gemrb leg ambush.)
16. **Offline map brush.** A zone editor that paints a connected region from a seed (with a fringe cell), and optionally carves a "river" from a flood walk; output is frozen into zone data with the seed saved. (DFHack paint, lincity-ng carver as authoring only.)
17. **Territory as a pressure source.** The control part (0 A.D.) writes `respawnMult` and `spawnTable` into the zone record when a guild holds the zone; losing it reverts. Two parts, one field set, no coupling in code. (0 A.D.)
18. **Cap relief with a saving throw.** At the hard cap, the director may retire the weakest, farthest, unengaged creature to make room for a rare spawn, rolled against a "save" chance so the same one does not always go. (Angband relief, protect engaged.)
19. **Replay-able zone day.** Every roll is logged with threshold and seed. A debug tool replays a zone's day from the log and diffs it against the ledger. Doubles as the cheat check for kills. (OpenRCT2 logging, seeded RNG across donors.)
20. **Leaderless crowd pass.** For cheap crowds in busy zones, mid and far tier creatures share one step per group (a "flock") and split only when an engaged member exists. Reduces CPU for the busy preset. (OpenGothic tiers.)

---

## 6. Gaps in parity row 23 (what rows Lead should add)

Row 23 today = cap, spawn chance, respawn s, grace s, coverage. Proposed new rows (all proposals; Lead decides):

| New row | What it checks | Donor shape |
|---|---|---|
| 23a Zone table | One id per zone, no overlaps, unknown id returns null, boxes and z band, missing rect fails load | RustDAoC, KsanaDock, L2Solo |
| 23b Presence | Spawn refused in view of any player, far by walking, retry keeps spawn due, empty-zone defer | Shattered, l1j, Angband |
| 23c Despawn stages | Active, frozen, despawn, re-entry cancel, per-sweep cap, protected set | EQEmu, dhewm3, ClassicUO |
| 23d Respawn queue | Alive plus queued under cap at queue and fire, floor, occupied spot defer, overflow logged | l2dn, DOOM |
| 23e Transitions | Portal pairs, landing clear of trigger, fire once, arrival lock, carry record, ledger event | claudecraft, Quake, Forge |
| 23f Streaming | Load ring smaller than release ring, one action per frame, shared delta, first-sight snapshot, hide never deletes | LostCity, gawric, 2004Scape, ClassicUO |
| 23g Visibility | Gate graph refcount, send filter, wake on open | ioq3, dhewm3 |
| 23h Zone state | Snapshot restore, bad snapshot falls back, kills stay in ledger, wipe on version bump | Quake 2, Cataclysm-DDA |
| 23i Layout generation | Same seed same layout, load-time clamps, variant exists for the count, unique once, key before door | Cubyz, flare-game, Evennia, BAR |
| 23j Zone control | Tie rule stated, connectivity, integer falloff guard | 0 A.D. |
| 23k Determinism | Every roll logged with threshold; replay reproduces the population | OpenRCT2, Barony |
| 23l Spatial index | Grid results equal brute force; move re-files same tick; 3D vs 2D rule uniform | DOLSharp, OpenDAoC, Xash3D |

Also add to the existing row 23 text: "coverage" should say what it covers (zones with a population block vs total zones) and that frozen zones (the Pit) are excluded by an explicit flag, not by omission.

---

## 7. Experiment plan (headless server tests)

Principles: no browser; fixed seed; a fake clock the test advances; bots as plain objects calling the same server entry points as clients; every test prints the seed and the roll log on failure. Heavy runs go to the VPS per Dom's standing rule; small unit tests may run anywhere. All of this is a plan, not a result.

| # | Test | Method | Pass line |
|---|---|---|---|
| E1 | Zone lookup | Load a 9-zone table; resolve every spawn and a gap point; id 512 and 9999; two overlapping boxes | exactly one id per point; gap and unknown id -> null; overlap fails load |
| E2 | Timer re-arm | Cap 6, delay [lo, hi]; kill twice quickly | one timer armed; delay in range; no second arm |
| E3 | Cap invariants | 1000 ticks with random kills and leashes | live (derived) never above `cap_hard`; at most `perTickBudget` spawns per tick |
| E4 | Presence | Place 3 bots; run director 10,000 attempts | no spawn in view of any bot or nearer than `minAwayWalk`; failed placement retries and stays due |
| E5 | Grace | Last player leaves; step; re-enter at 0.5 x frozen time and again at 1.5 x | stage times exact; re-entry cancels; protected set untouched; sweep cap holds |
| E6 | Respawn queue | Kill all, hold a bot on the spawn point | alive+queued under cap at both checks; floor holds; deferred spawn relocates after timeout |
| E7 | Soft cap | Seeded zone at 1.5 x target vs at target | roll rate ratio matches the divisor formula within sampling error; hard ceiling blocks |
| E8 | State | Kill 3 of 5, leave, return | 3 stay dead (ledger), 2 at stored cells; bad snapshot -> baseline; store never records a death |
| E9 | Transit | Walk into portal; push back into trigger; knockback test | one transit; arrival lock holds; ledger one entry; landing check passes for all portals |
| E10 | Streaming | Walk back and forth over a ring edge 300 frames; sprint toward a border | no load or unload per crossing; lookahead loads early; first-sight snapshot then deltas only; hide does not change the ledger |
| E11 | Visibility | Shut and open gates; two gates on one edge | snapshot has only reachable zones; second gate keeps B visible; closing at count 0 throws |
| E12 | Grid | 5000 objects, 1000 random radius queries, moves across cell edges | equals brute force; moved object visible the same tick |
| E13 | Layout | Same seed twice; different window origin; adjacent-chunk spacing; missing variant | identical layouts; spacing rule holds; missing variant fails load |
| E14 | Determinism and replay | Run 10 simulated zone-days; replay from the roll log | populations equal at every checkpoint |
| E15 | Presets | Run P1..P5 with 20 bots for 10 simulated minutes | measure mean live, empty-zone fraction, spawns/min, ledger writes/s; no invariant breach; export a table for Dom |
| E16 | Engaged protection | Fill the cap, force compaction while 3 bots fight | MAX_ATTACKERS = 3 never exceeded; engaged and boss never retired; far hate holder still lands hits |

Phase order: E1 and E12 first (data and index), E2-E7 (population), E8-E11 (state and visibility), E13 (layout, last), E15 as the Dom-facing report.

Measurements to collect (so presets can be tuned from data, not from my guesses): median fight length, zone crossing time, kills per player per minute, average live count, time-to-refill from empty, ledger writes per second per zone.

---

## 8. Questions for Dom (max 6)

1. **Empty zone: freeze, despawn or store?** Donors differ (EQEmu freezes, Cataclysm and Quake 2 store). Which feel do you want as the default: creatures vanish and refill fresh (despawn), stay where they were (store), or keep standing still (freeze)? Row 23 says despawn.
2. **Should killed creatures stay dead until the timer even if the zone empties?** (Yes is my default: the ledger holds kills, the timer decides respawn.)
3. **Do you want procedural zones at all in the first slice?** Layout generation is the largest part and the least tied to the fight loop. I propose authored zones first and the layout part switched off.
4. **Two small rules for your call:** (a) when a unique encounter is cancelled, does it count as used? (b) when a spawn roll fails, does the spawn point stay used until the player leaves and returns (Exult style) or does it roll again on the next check?
5. **Zone control tie rule:** on a tie, earlier claim wins, lower player id wins, or neither (no owner)? (Only matters if the control part is switched on.)
6. **Preset naming and default:** is "standard world" (P2) the right default, and do you want the busy preset to be a live test option on the real server or only in headless runs?
