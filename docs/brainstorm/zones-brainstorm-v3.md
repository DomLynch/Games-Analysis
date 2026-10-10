# Zones-and-world brainstorm (idea-mining lead) - v3 (Strategy verdict and reconciliation applied)

## Status after Strategy verdict (2026-10-10)

NOTHING IS BUILT. This file is a design brainstorm; no code, data file, test or server change exists because of it. Every field, number and test is a proposal.

What changed from v2:
- **Reordered (Strategy A2):**
  (a) FIRST: the row 23 text amendment (ZON-23-AMEND: `coverage` says what it covers; frozen zones such as the Pit are excluded by an explicit flag, not by omission) and the rows "kills stay in the value ledger on unload; a store is never a death" (ZON-23h1, test ZON-E8). Cheap, and they guard real money.
  (b) THEN: presence gate + grace timer + respawn queue as one engine module driven by zone data (ZON-23b, ZON-23c, ZON-23d; tests ZON-E4, ZON-E5, ZON-E6, ZON-E17, ZON-E18). Row 23 is partly live already (Zone 2 population, the ruin camp).
  (c) LAST: streaming and visibility (ZON-23f, ZON-23g; tests ZON-E10s, ZON-E10c, ZON-E11, ZON-E22). Phone-first with few players per zone means streaming buys little today; its numbers rest on unmeasured guesses.
- **Unscheduled (Strategy named no slot; Lead decides, RECONCILIATION-v3.md OPEN O6):** ZON-23e transitions, ZON-23i layout, ZON-23j zone control, ZON-23k determinism, ZON-23l spatial index. Note ZON-23l (who is near) is a dependency of (b).
- **Ledger ruling applied:** zone snapshots and transit records are NOT in the value ledger. They live in a separate zone store with their own tests. Kill rows and loot grants ARE in the ledger (value events).
- **Spawn-view proxy:** no longer a fixed 14-tile figure; computed from the zone row's `camera.limits` (section 0c, new part 3.11, test ZON-E17).
- **Timers:** one style, lazy deadline records `{start, stages}`; the background-sweep wording is dropped (Strategy W7).
- **Name rule:** the never-name restricted donor is removed ("a restricted donor").
- **Trade and market:** this doc assumes neither. (Strategy said parties and zones assume trade; no trade or market reference was found in this file.)
- **Still to measure before tuning:** T = 100 ms, 20 s fights, 20 s zone crossing, about 200 tiles per view. Measure on the live Zone 2.
- **Questions for Dom kept:** (1) empty zone = despawn (proposed default) vs store; (2) killed creatures stay dead until the timer even if the zone empties (proposed yes). Everything else waits.

- **Licence rule (Strategy A6):** [C], [R] and [?] donors are shape only; only [P] donors are adaptable with notice, and nothing from an [?] donor is adaptable until its tag is read in the digest. No tag was changed in v3; per-donor tag disagreements are listed as OPEN O1 to O3 in RECONCILIATION-v3.md.

### ID mapping (v2 label -> v3 id)

| v2 label | v3 id |
|---|---|
| Top gems 1 to 16 | ZON-G1 to ZON-G16 |
| Presets P1 to P5 | ZON-P1 to ZON-P5 |
| Novel ideas 1 to 20 (N1 to N20) | ZON-N1 to ZON-N20 |
| Parity row proposals 23a to 23l | ZON-23a to ZON-23l (23h is split into ZON-23h1 and ZON-23h2) |
| Tests E1 to E16 (E10s, E10c) | ZON-E1 to ZON-E16 (ZON-E10s, ZON-E10c); new in v3: ZON-E17 to ZON-E22 |
| Row 23 text amendment | ZON-23-AMEND |
| Questions 1 to 6 (Q1 to Q6) | ZON-Q1 to ZON-Q6 |
| Parts 3.1 to 3.10 | unchanged section numbers; new 3.11 Camera limits; new section 0c |
| Preset file key `preset` | `zonePreset` |
| `nullMass` | `none_weight` |

"Row 23" by itself still means the existing parity row 23 (zone population); it is not renamed.

---

v3 changes: the Strategy verdict of 2026-10-10 and RECONCILIATION-v3.md applied (see the status block). v2 changes: all items in `zones-brainstorm-check.md` section G applied. The DOOM `P_LoadThings` question was checked on the VPS donor (see section 2, DOOM row). Original `zones-brainstorm.md` is untouched.

**NOTHING IS BUILT.** This file is a design brainstorm from reading the 60-note zones digest (`/private/tmp/p2/brainstorm/zones-digest.md`). No code, no data files, no tests, no server change exist. Every field name, every number and every test below is a proposal. Nothing here has been run.

Rulings assumed (from the brief): zones are data; one engine; server-verified kills; MAX_ATTACKERS = 3 many-on-one (the engine constant; no zone field may alias it); the value ledger is the append-only book of currency, loot grants, XP and kill rows with `settle` as its only door, while zone snapshots and transit records live in a separate zone store (Strategy ruling); the Pit is frozen; parity row 23 = zone population (cap, spawn chance, respawn s, grace s, coverage).

## How to read the licence and number rules

- Licence class tags: **[P]** permissive (MIT, BSD, Apache, Zlib), **[C]** copyleft (GPL, AGPL, CC-BY-SA, BSL, Valve, Sustainable-Use), **[R]** restricted or unclear (non-commercial, mixed, unclear).
- **[C] and [R] donors are shape-only.** I copy no constants and no code from them. Wherever a gem comes from a [C]/[R] donor and I give a number, the number is **our own tuning**, derived by the formula shown (section 0b), and it was checked to differ from the donor's constant. The v1 file had nine values that equalled copyleft/restricted donor constants; all are replaced in v2.
- [P] donors could be adapted with their notice kept, but I still write everything fresh, and I still derive my own numbers because the donor's game feel is not ours.
- Strategy: measure these four assumptions on the live Zone 2 before tuning any preset number below.
- Tuning assumptions (mine, unverified, to be replaced by measurement): server step `T` = 100 ms; typical fight length `fightS` = 20 s; player walk speed such that a medium zone is crossed in about 20 s; a phone view shows about 200 walkable tiles. Every preset number below is a formula of these, so it can be re-derived when the real values are measured. Where a number below coincides with a **permissive** donor value (allowed, but not "ours"), it is disclosed: ZON-E1 uses a 9-zone table (KsanaDock [P] also has nine) and ZON-E10 uses 300 frames (gawric [P]); both are test fixtures only.
- Citation form: `Donor (class) - note file`. All note files live under `/private/tmp/p2/wave2-haiku/batch3/<batch>/out/zones-world/<donor>.deep.md`; I give the file name only.

## 0b. Our own tuning: derivations for every number that replaced a donor constant

All values are Frankendom tuning from the assumptions above, not donor values. Placeholders to be replaced by measurement.

| Field | v1 value (equalled a donor) | v2 value | Derivation (ours) |
|---|---|---|---|
| `presence.minAwayTiles` | 13 (l1j) | 14 (v3: fallback fixture only; the default is now computed, section 0c) | view side = sqrt(200) = 14.1 tiles; half-diagonal = 10; plus 4 tiles of margin = 14. Presets scale 1.5 / 1.0 / 0.7 = 21 / 14 / 10 |
| `presence.minAwayWalk` | 12 (SPD) | 21 | 1.5 x `minAwayTiles` (walking detours are longer than straight lines) |
| `presence.retry_ms` | 3000 (l1j) | 2500 | 25 x T (T = 100 ms): retry after 25 server steps |
| `respawn.queueMax` | 127 (DOOM) | 4 x `cap_hard` (40 for a cap of 10) | one cap's worth of kills per fight, four fights deep |
| `respawn.floor_s` | 10 (l2dn) | 7 | `fightS` / 3 = 6.7, rounded up |
| `stream.lookahead_s` | 1.0 (OpenMW) | 0.75 | 7.5 x T: time to load one ring (assumed 5 steps) plus 2.5 steps margin |
| `portals.defer_ms` | 100 (Quake) | 200 | 2 x T: one step to commit, one step of margin |
| `layout` pieces budget `S` | n/a | 18 | assumed pieces per generated zone (placeholder) |
| `layout.mainPath_len` | [10,20] (flare-game) | [9,16] | [0.5 S, 0.9 S] |
| `layout.branch_len` | [5,10] (flare-game) | [4,7] | [0.2 S, 0.4 S] |
| `layout.doors` | 2 (flare-game) | 3 | ceil(S / 8) |
| `control` load rule constant `K` | 8 (0 A.D.) | 4 | placeholder; tuned by measurement; rule is `W x K >= R` |
| `control` source `weight` / `radius` | 10000 / 140 (0 A.D.) | 60 / 12 tiles | R = 12 tiles (0.85 of the view side); W = 5 R, so W x K = 240 >= 12 |
| `director.cap_hard` (sketch) | 6 (ModernUO) | 10 | clamp(round(240 walkable tiles / 25), 2, 18) = 10 |
| Cap clamp maximum | 24 (Daggerfall [P]) | 18 | 6 x MAX_ATTACKERS (3). Clamp minimum 2 |
| `stream.dynamicObjCap` | 128 (2004Scape [P], near it) | 72 | 4 zones in a window x 18 (clamp maximum) |
| ZON-E12 fixture | 5000 objects / 1000 queries (OpenDAoC) | 4000 objects / 800 queries | 20 zones x 200 objects; queries = objects / 5 |
| ZON-E1 / ZON-E2 fixtures | ids 512, 9999 (RustDAoC); cap 6 (ModernUO) | ids N+256 (265 for N = 9) and -1; cap 10 | the donor masked an id with a power of two, so test one past that wrap; cap from the ZON-P2 formula |

---

## 0c. Spawn-view proxy from the camera (v3, replaces the fixed 14-tile figure)

v2 fixed `minAwayTiles` = 14 from an assumed 200-tile phone view. The camera doc has a VARIABLE framing: a distance band per zone (1.8 to 5.5 in preset A), widening per engaged attacker in preset B up to a hard maximum, vertical FOV up to a cap of 56 degrees, a pitch band, and at low pitch the top edge of the frame reaches the horizon. A fixed radius can therefore call a spawn "out of view" while the camera shows it. Conflict recorded as RC-04 in RECONCILIATION-v3.md.

Rule: the camera is client-only and the server never reads it live. Both read the zone row `camera` block (section 3.11). At zone load the server computes one worst-case number from that row; it is a proposal, unmeasured, and uses our own geometry:
```
H  = 0.5 x vFovCapDeg                         // half vertical FOV, from camera.limits
lateral_m = distMax x tan(H) x (375 / 812)    // portrait half-width at the hero's depth (same formula as the camera doc)
for each pitch theta in [pitchMin, pitchMax] (elevation of the camera above the hero, degrees):
    if theta - H <= 0:  forward_m = sightCapM                     // top edge reaches the horizon
    else: forward_m = min(sightCapM, distMax x sin(theta) / tan(theta - H) - distMax x cos(theta))
viewReach_m  = max(lateral_m, max over theta of forward_m)        // uses distMax, the HARD maximum, which already includes the preset B widening
minAwayTiles = ceil(viewReach_m / tileSizeM) + marginTiles        // marginTiles = 4 (v2's own margin); preset scales 1.5 / 1.0 / 0.7 apply to viewReach_m
minAwayWalk  = ceil(1.5 x minAwayTiles)
near_tiles   = minAwayTiles ; far_tiles = 2.2 x near_tiles        // the v2 fixture ratio 40 / 18; one relevance tier with hysteresis (Strategy W6)
```
Notes: (1) New zone fields `tileSizeM` (metres per tile) and `sightCapM` (author-set far limit) fix the unit mismatch between the camera doc (metres-ish world units) and this doc (tiles). (2) With the camera doc's preset A values the top edge reaches the horizon at rest (14 degree rest pitch is below half the FOV), so in practice `sightCapM` decides; this is why the 200-tile guess was fragile. (3) If a zone has no camera row, the v2 fixture (14 tiles, 21 walk) is the fallback. (4) The result is a circle around the hero: conservative, because it ignores that nothing is visible behind the camera.

---

## 1. Top gems (16)

Each gem keeps the idea. The donor defect it carries is fixed in section 2.

ZON-G1. **Zone as one table row, one world frame, O(1) lookup, reject bad ids.** RustDAoC (C) - `latentcollapse-RustDAoC.deep.md`. Plus KsanaDock (P) - `KsanaDock-Microverse.deep.md` for one id and a null result outside every zone, and pmbstyle-L2Solo (P) - `pmbstyle-L2Solo.deep.md` for boxes with a z band and "overlap fails at load". This is the base for everything else: every other part keys on `zoneId`. Divergence stated: RustDAoC's own acceptance resolves an overlap to the nearer centre; we follow L2Solo and reject overlap at load (a deliberate choice, not the RustDAoC rule).
ZON-G2. **One timer per zone that re-arms only when idle and the zone has room, with the delay re-drawn on every arm.** ModernUO (C) - `ModernUO.deep.md`. This is the simplest correct respawn director.
ZON-G3. **Weighted live count, one spawn per cooldown, only in a cell no player can see and far by walking.** Shattered Pixel Dungeon (C) - `00-Evan-shattered-pixel-dungeon.deep.md`; the 3 s retry with a new point from l1j-en-classic (C) - `l1j-en-classic.deep.md`; the "trickle roll out of sight" from Angband (R) - `angband-angband.deep.md`.
ZON-G4. **Grace in stages: keep stepping, then freeze, then (our rule) despawn.** EQEmu (C) - `EQEmu.deep.md` (keep stepping, then freeze); dhewm3 (C) - `dhewm-dhewm3.deep.md` (wake on the same tick a gate reopens; skip brain when frozen); ClassicUO (P) - `ClassicUO.deep.md` (throttled sweep, deferred removal, per-pass cap). Three donors each give part of the grace timer; none gives a graceful despawn (Evennia gives an idle collapse whose cleanup is broken, Daggerfall an immediate distance despawn), so the final graceful stage is ours.
ZON-G5. **Spend the population budget once, store on exit, restore on re-entry.** Cataclysm-DDA (C) - `CleverRaven-Cataclysm-DDA.deep.md`; Quake 2 (C) - `id-Software-Quake-2.deep.md` (baseline first, snapshot overlaid on top, wipe at a unit boundary). Together they give "kills stay dead until the respawn clock says otherwise".
ZON-G6. **Respawn queue where alive plus queued must stay under the cap, with a floor on the delay.** l2dn-server (R) - `ax-grymyr-l2dn-server.deep.md`; DOOM (R) - `id-Software-DOOM.deep.md` (bounded FIFO, one entry per tick, occupied spot defers rather than drops).
ZON-G7. **Refill band (min, max) with a burst to the minimum.** OpenBOR (P) - `DCurrent-openbor.deep.md`; OpenRA (C) - `OpenRA-OpenRA.deep.md` (count the live roster, not a hook).
ZON-G8. **Soft cap that divides the spawn chance above a target, plus a hard ceiling.** OpenRCT2 (C) - `OpenRCT2-OpenRCT2.deep.md`. Smooth density without a cliff. Only for population, never for MAX_ATTACKERS.
ZON-G9. **Per-zone interval table with a condition gate, one global rate knob, and pre-warm on entry. The interval floor is ours, not the donor's.** Endless Sky (C) - `endless-sky-endless-sky.deep.md` (table, gate, knob, pre-warm; the missing floor is its defect). The global knob is how Dom gets "cautious/standard/busy" with one number.
ZON-G10. **Spatial grid with whole-cell accept and edge-cell exact check.** DOLSharp (C) - `Dawn-of-Light-DOLSharp.deep.md` (the donor files an object lazily under its old cell; "re-file on every move, same tick" is our fix, not the donor mechanism); OpenDAoC (C) - `OpenDAoC-OpenDAoC-Core.deep.md` (ring cull). Needed for "who is near" in spawn gating, many-on-one candidates and visibility.
ZON-G11. **Shared zone delta once per tick, private events to the owner only, full snapshot on first sight.** 2004Scape (P) - `2004Scape-Server.deep.md`; LostCity (P) - `LostCityRS-Engine-TS.deep.md` (window rebuilt only past an inner reload box). This is the streaming window.
ZON-G12. **Paired portals as data, one shared transit recipe, landing clear of the trigger; one transfer entry that captures the leaver's state first.** claudecraft (P) - `levy-street-world-of-claudecraft.deep.md`; Forge (C) - `Card-Forge-forge.deep.md`; Quake (C) - `id-Software-Quake.deep.md` (defer the commit, fire once, clamped carry; the donor carry is 16 untyped slots, "typed" is our change).
ZON-G13. **Reference-counted gate edges and a server send filter by zone reachability.** ioq3 (C) - `ioquake-ioq3.deep.md`; dhewm3 (C) for the same graph used as a wake rule. This is the visibility part.
ZON-G14. **Seeded layout: chunk centres by parity phase, nearest-centre by normalised radius; grid random walk with key-before-door; lazy chain with a budget of unexplored exits.** Cubyz (C) - `PixelGuys-Cubyz.deep.md`; flare-game (C) - `flareteam-flare-game.deep.md`; Evennia (P) - `evennia-evennia.deep.md`. Layout generation as a data seed, not a baked file.
ZON-G15. **Zone control as influence with a max-weight owner and root connectivity.** 0 A.D. (C) - `0ad-0ad.deep.md`. Integer math on the server, recompute only on a source change.
ZON-G16. **Once-per-character unique pool and per-entry counters in the ledger.** Fallout 1 CE (R) - `alexbatalov-fallout1-ce.deep.md`; Fallout 2 CE (R) - `alexbatalov-fallout2-ce.deep.md`. Plus the null-mass weighted table from pokemonAutoChess (C) - `keldaanCommunity-pokemonAutoChess.deep.md` (leftover probability = nothing spawns, a clean designer knob).

Honourable mentions: fheroes2 stochastic rounding growth (C, `ihhub-fheroes2.deep.md`); vcmi hinge-curve guard for a reward (C, `vcmi-vcmi.deep.md`); OpenGothic near/mid/far tiers (P, `OpenGothic.deep.md`); OpenMW prediction prefetch (C, `openmw.deep.md`); region labels from a restricted donor (C; note file name withheld).

Rejected donor: lincity-ng river carver (C, `lincity-ng-lincity-ng.deep.md`) is rejected as a play mechanic by its own decision; I only keep it as an optional offline authoring helper (see novel idea ZON-N16).

---

## 2. Defect -> fix table

Every row keeps the donor mechanism. "Fix" is our rule. Tests named in section 7.

| Donor (class) - note | Defect | Fix in Frankendom |
|---|---|---|
| RustDAoC (C) - latentcollapse-RustDAoC | Id masked with 511, so id 512 returns zone 0 | Table lookup returns `null` for any unknown id; load fails if an id repeats or exceeds the table; test ids N+256 (265 for N = 9) and -1 |
| ModernUO (C) - ModernUO | No despawn on empty; live count is lazy (sweep); group refill arms the timer twice | Grace despawn is ours (part 3); live count is derived from the zone entity table (zone store) on every read; re-arm is one function called from one place |
| ClassicUO (P) - ClassicUO | Distance cull is client-only; eviction is creation order | Server hide never changes the zone entity table or the kill rows (hide and delete are different calls); grace keyed on `lastPlayerLeftAt` per zone (one field name used everywhere) |
| Shattered Pixel Dungeon (C) | Depth and cap are code switches; single-hero view; no despawn | Roster, cap, cooldown are zone data; visibility check against every connected player on the server; despawn grace added |
| 0 A.D. (C) | Integer falloff `weight*8/radius` can be 0, flooding the map; ties silently go to the lowest id (strict `>` in ascending order; never stated); many weak sources beat one strong | Load-time rule `weight*K >= radius` (K = 4 is our own placeholder, not the donor's factor; section 0b); explicit tie rule (see ZON-Q5; the donor's lower-id-wins comes from ascending order and strict `>`, never stated, which is why we state it); `sumMode: "sum"|"max"` is a zone field |
| 2004Scape (P) | Eviction comment disagrees with code; soft cap; respawn scaled by total player count | One written eviction rule (oldest dynamic first) and a hard cap that counts static items (`dynamicObjCap` 72, own derivation, section 0b); respawn never scales by global player count |
| Mindustry (C) | Shockwave kill bypasses the kill path; no respawn or despawn | Spawn side effects never kill; kills only via ledger; respawn and despawn are separate parts |
| Card-Forge (C) | Whole-zone snapshot at each checkpoint | Capture only the entity that moves (LKI); replacement pass is a hook list that may be empty |
| Cataclysm-DDA (C) | No respawn; unload sets HP to 0, which in our game would pay loot and XP | Store is a state change, never a death; respawn queue added; stored monsters keep hp and position |
| Cytopia (C) | Failed picks count against the cap; occupancy flag desyncs on load | Cap counts successful spawns only; occupancy is derived from the zone entity table, never from a flag; test covers a restart with existing spawns |
| OpenBOR (P) | Lock and bounds entries wait behind a full band; failed spawn consumes the entry | Lock and bounds apply independently of the band; a failed spawn stays due |
| DFHack (P) | Runtime zone expansion on dig; state in a plugin-global map | Zone edits only through the authoring tool and a server-versioned zone record; no runtime expansion |
| DOLSharp (C) | Moved object stays filed under its old cell (lazy filing) | Re-file on every move, same tick (our fix); property test vs brute force |
| EQEmu (C) | Freeze not despawn; respawn runs while empty; stale `old_client_count` when no mob at departure | Explicit `emptyPolicy` (freeze or despawn); respawn gated on presence (or deferred); the departure edge is detected from the presence set, not from a per-mob loop |
| Xash3D (C) | Touch is level-triggered; brush tests origin only (enter/exit belongs to transitions, row ZON-23e) | Per-player `insideSet`, fire on change only; boundary says which point counts (position, not body box) |
| KsanaDock (P) | Two names per zone; silent fallback; skip origin | One `zoneId` only; missing rect fails load |
| LostCity (P) | Bit-grid index collision (`>>>5` takes 6 bits); first-in-list eviction contradicts comment | Do not port the bit grid; use the zone id; eviction rule as above |
| OpenDAoC (C) | Z skipped inside fully-enclosed cells; relocation lags one tick | Radius query is 3D (or explicitly 2D) everywhere, same rule inside and on the border; moves applied before queries in the tick |
| OpenGothic (P) | Tier hides hate and combat; no hysteresis; O(n) every tick | Hate/engaged state forces full tier at any distance; tier change needs a margin or hold time; tier pass on a slower cadence |
| OpenRA (C) | Hook-based counter drifts; max not clamped against min | Count the live roster; load fails if `min > max` |
| OpenRCT2 (C) | Soft cap spawns forever above target; inputs are park economics | Soft cap plus hard ceiling both in zone data; score is a plain data field (e.g. recent kills in zone), no economy |
| OpenXcom (C) | Weighted draw off-by-one; wave pause from a client UI | Own weighted pick with a fixed test (cumulative, strict `<`); pause applied server-side on a verified kill |
| Cubyz (C) | Radius not clamped for the neighbour check; window-edge chunks lose neighbours; f32 | Load-time check on radius against chunk size; generate with a margin ring, then crop; integer or double math |
| Barony (P) | Name-prefix zone lookup; base roll consumed before custom roll; one shared stream | Zone id key; one stated roll order; per-spawn `eventKey` = spawnIndex under the shared seed scheme |
| OpenTESArena (P) | Refill only on chunk load; kills not saved; cap scaled by loaded area | Server respawn timer; kills in ledger regardless of window; cap is per zone, not per loaded area |
| Fallout 1 CE (R) | Step count is also the clock; bitmask in a client save; dice curve is game feel | Server defines a "travel unit" event; record on the character: a loot-grant row in the value ledger if the unique grants loot, otherwise a flag in the zone store; tiers as explicit probabilities in zone data |
| Fallout 2 CE (R) | Wall-clock throttle; one-axis distance quirk; cancelled encounter still spends the counter | Server ticks only; distance rule stated and tested; cancel refunds or not by a stated flag (ZON-Q4) |
| isometric-city (P) | Economic demand; despawn on negative demand not on empty; `Math.random` | Demand = zone count vs cap; trigger = empty zone; seeded RNG per zone |
| Angband (R) | Compaction ignores engaged creatures; unseeded RNG | Engaged and boss are protected first; seeded RNG |
| l2dn-server (R) | Clock starts at corpse decay; cap checked at queue time only; provenance doubtful (L2J port) | Clock starts at the verified kill; cap re-checked at fire time; treat as shape-only |
| Beyond All Reason (C) | Silent invented fallback; nil-then-break retry; `math.random` | A zone with no layout for N fails loudly; retry budget per spawn; seeded RNG |
| Crawl (C) | Destructive wipe on re-anchor | Entities leaving a window are moved or ledgered, never deleted |
| cuteshaun-L2 (P) | One 10000 radius for every zone; anchors have no shape | Radius per zone in data; anchors for labels only, containment for legality |
| Daggerfall Unity (P) | Immediate despawn by distance; client forward-vector test on server would disagree between clients | Grace timer; the "not in front" test stays on the client, server uses range and line-of-sight proxy |
| dhewm3 (C) | Portal BSP graph; dormant = freeze only | Authored gate graph in zone data; despawn left to the empty-zone rule |
| KeeperFX (C) | `total_score` vs `manage_score` compare bug gives interval 0 | Maximum over one named field; test pins it |
| a restricted donor (C) | Region label byte overflow; whole-map relabel | Per-zone relabel on gate or blocker change only; label width checked at load |
| Endless Sky (C) | No interval floor (so the floor is ours); zero-bound RNG fires every step; pre-warm skips population guard | Floor in code and data (`minIntervalTicks`); pre-warm goes through the same cap check |
| Evennia (P) | Cleanup removes no rooms (tag never set); collapse by age | Instance records its areas at creation; empty-with-grace collapse deletes by that record; test asserts gone |
| Exult (C) | No cap; failed roll uses the point; re-arm by client position | Cap added; `missUsesLatch` flag (ZON-Q4); re-arm from server positions |
| flare-engine (C) | Re-rolls on every load; no cap or respawn; no occupancy during placement | Population is persistent state, rolled once per zone lifetime (or per reset); occupancy checked; shortfall reported |
| flare-game (C) | Branch length draw uses min as the upper bound; keys form one linear chain | Draw in `[min, max]`; the key chain is a chosen option (`keyMode`) |
| freeciv (C) | No cap, no despawn, turn-based | Cap, despawn, per-tick attempt budget |
| freeorion (C) | Runtime spawner bypasses the table; one roll per zone per pass | One rule set for both; per-tick budget instead of per-pass |
| gawric-L2J-client (P) | No hysteresis; geodata never released | Load band smaller than release band; release with the zone |
| gemrb (C) | Mutable link chance; pointer hazard; global RAND | Chance is read-only zone data; server roll recorded with zone and cost |
| micropolisJS (C) | Economy valve numbers; lagged census | Valve is a clamped accumulator over zone-count inputs; reads live roster |
| DOOM (R) | No occupancy on items; corpses wait forever on an occupied spot; silent drops past the queue size. **Verified on the VPS donor (`/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_setup.c`, `P_LoadThings`, line 336-337): `if (spawn == false) break;` is a loop `break`, not `continue`. The first thing of a commercial-only monster type (types 64-69, 71, 84, 88, 89) in a non-commercial game ends the whole load loop, so every later thing in the lump is silently never spawned. The inner `break` at line 333 only leaves the `switch`.** | Occupancy check, timeout then relocate; overflow logged, never silent. For loading a zone's thing list: skip one entry and `continue`, count the skipped entries and log them, never stop the loop on the first unsupported kind. Shape-only: no DOOM code or constants copied. Queue size is `4 x cap_hard`, own tuning |
| Quake 2 (C) | Binary dump; abort on bad file | Typed versioned snapshot kept in the zone store (a separate store from the value ledger, with its own tests); kills are never in it; bad snapshot falls back to baseline |
| Quake (C) | 16 untyped slots; health floor | Typed carry record (our change); floor is zone data or absent |
| fheroes2 (C) | 7-day clock; unseeded RNG | `growthEveryS` in data; seeded draw |
| ioq3 (C) | Per-entity full scan; off-by-one overflow branch | Per-zone entity lists; no overflow branch |
| pokemonAutoChess (C) | Void-on-repeat lowers the true rate | Publish effective rate in a test or use `onRepeat: "reroll"` flag |
| l1j (C) | Last attempt skips checks; non-monsters never leave loop | Final point is checked, or the spawn is skipped and retried; every kind uses the same loop |
| claudecraft (P) | 2D trigger ignores height; no arrival lock; no ledger entry | Optional floor band per portal; `arrivalLockMs`; transit written once to the zone transit log (zone store, not the value ledger) |
| lincity-ng (C) | Not a play feature | Offline authoring helper only, if ever |
| OpenMW (C) | Two centres in one frame; camera anchor does not apply | One centre; lookahead on movement not camera |
| Forgotten Server (C) | Global leash; no grace; clock from last spawn | Leash radius per zone; grace added; clock from verified removal |
| L2Solo (P) | Two zone models; first-match overlap | One model (boxes); overlap rejected at load |
| vcmi (C) | Hard-coded fallback; two-hinge formula not pinned | Named fallback field; formula as tested data; authoring time only |

---

## 3. Composable zone parts

Design rule: a zone is one data record. Each part below is an optional block with `"on": true|false`. A part that is off costs nothing and the other parts still work. The parts talk through the **value ledger** (kill rows and loot grants only), the **zone store** (entity table, snapshots, transit log) and a **per-zone event bus** (`kill`, `enter`, `leave`, `spawn`, `despawn`, `gateChanged`). No part reads another part's private state.

Common conventions (all are proposals):
- Time in server ticks or seconds; one unit per field, named in the field (`_s`, `_ticks`).
- RNG (v3, Strategy W5): one shared `weightedPick(table, seed)` function serves spawn rosters, loot packs and shop stock; seed = `hash(worldSeed, zoneId, eventKind, eventKey)` with `eventKind` in {spawn, loot, stock, index}; every roll logged with its threshold (replay). The empty outcome is the table's `none_weight` (named `nullMass` in v2).
- Live count is **derived** from the zone entity table each time it is read; no cached counter (fixes OpenRA, ModernUO, Cytopia drift).
- Hard limits (MAX_ATTACKERS = 3, engaged protection) are outside the parts; no part can override them.

### 3.1 Spawn director
Purpose: decides when and what to add. Sources: ModernUO, Shattered, Mindustry, OpenRA, OpenBOR, Endless Sky, KeeperFX, freeorion, OpenRCT2.
```
"director": { "on": true, "mode": "timer|interval-table|wave-index|band",
  "cap_hard": 10, "cap_soft": 8, "soft_divisor_shape": "linear", 
  "band": {"min": 5, "max": 10},
  "roster": [ {"kind":"wolf","weight":3,"cap":4,"minLevel":0}, {"kind":"boar","weight":1,"cap":2} ],
  "none_weight": 0.15, "onRepeat": "reroll|void",
  "perTickBudget": 1, "rate_mult": 1.0, "minIntervalTicks": 20,
  "prewarm_s": 0, "rng": "zone" }
```
Level gap (v3, Strategy W9): roster entries use the ONE level-gap curve in zone data (`levelGap` table, catch-all row required on load; shared with XP, loot and aggro); `minLevel` stays a band floor only.
Behaviour: weighted pick among eligible roster entries (full entries leave the pool); `none_weight` is the empty outcome; one spawn per budget; `rate_mult` scales intervals but never below `minIntervalTicks`; `band.min` bursts to the minimum; `cap_soft` divides the roll chance above it; `cap_hard` is absolute.

### 3.2 Presence gate
Purpose: spawn and think only when it matters. Sources: Shattered, l1j, Angband, Daggerfall, Forgotten Server, Cytopia, OpenGothic, Endless Sky.
```
"presence": { "on": true, "needPlayerInZone": true, "viewProxy": {"from": "camera.limits", "marginTiles": 4, "fallbackTiles": 14},
  "minAwayTiles": "computed (fallback 14)", "minAwayWalk": "computed (fallback 21)",
  "noSpawnInViewOfAny": true, "retry_ms": 2500, "retryKeepsSpawnDue": true,
  "tier": {"near_tiles": "= minAwayTiles", "far_tiles": "2.2 x near (fallback fixture 18 / 40)", "hold_s": 2, "engagedAlwaysNear": true},
  "spawnWhileEmpty": "defer|allow" }
```
The server checks every connected player (not one hero). View is a server range proxy computed at zone load from the zone row's `camera.limits` (section 0c); the live camera is client-only and is never read. Tier never affects hate, hits or kills.

### 3.3 Grace timer (empty-zone state machine)
Grace formula (ours): total grace `G = k x crossS`; the frozen stage starts at `G / 2`, the final stage (despawn or store) at `G`.
Sources: EQEmu, dhewm3, ClassicUO, Forgotten Server, isometric-city, Daggerfall, Evennia.
```
"grace": { "on": true, "stages": [ {"after_s": 0,  "state":"active"},
  {"after_s": 30, "state":"frozen"}, {"after_s": 60, "state":"despawn"} ],
  "emptyPolicy": "freeze|despawn|store", "perSweepCap": 4, "protect": ["engaged","boss","carrying"],   // "engaged" = the engine's engaged set (the attacker slots), one definition shared with AI and camera
  
  "reentryCancels": true }
```
Evaluation rule (v3, Strategy W7): the grace stage is a deadline record `{start = lastPlayerLeftAt, stages}` read lazily when the zone is next observed (a player enters, or a director read touches the zone). There is no background sweep: one style, not mixed. `perSweepCap` survives only as the per-pass cap if a pruning pass is ever added. State machine per zone, keyed on `lastPlayerLeftAt`. `emptyPolicy` decides the final stage: `despawn` (default, row 23) ends in despawn; `store` ends in a stored snapshot; `freeze` stops at the frozen stage and has **no** final stage (a freeze policy must not list a despawn stage; load fails if it does). `store` writes the snapshot (3.7) instead of despawning, which is the "no data lost" option. A sweep removes at most `perSweepCap` creatures per pass, collected first and removed after the walk (deferred removal).

### 3.4 Respawn queue
Sources: l2dn (R), DOOM (R), ModernUO, Forgotten Server, l1j.
```
"respawn": { "on": true, "clockFrom": "verifiedKill", "delay_s": [40, 80], "floor_s": 7,
  "capCheckAt": "queue+fire", "queueMax": 40, "overflow": "logAndDrop",
  "occupiedSpot": "deferThenRelocate", "defer_timeout_s": 15,
  "gatePresence": true, "perTick": 1, "unique": {"once_per_character": false} }
```
Queue entries: `{slotId, dueAt}` (a deadline record, read lazily; a respawn due at T fires at T, not at T plus a restart); `queueMax` = 4 x `cap_hard`. Alive plus queued stays at or below the cap, checked again at fire time. The clock starts from the verified kill row in the value ledger (read only).

### 3.5 Streaming window
Sources: LostCity, OpenMW, gawric, OpenTESArena, 2004Scape, Crawl, Dawn-of-Light/OpenDAoC (grid).
```
"stream": { "on": true, "grid_tiles": 16, "load_ring": 1, "release_ring": 2,
  "lookahead_s": 0.75, "oneActionPerFrame": true, "sharedDelta": true,
  "fullSnapshotOnFirstSight": true, "reloadBox_tiles": 6, "dynamicObjCap": 72, "evict": "oldestDynamic" }
```
Client-side window per player; load ring smaller than release ring (hysteresis). The window never deletes server state. Shared per-tick buffer per zone; private events to the receiver only, decided by the one `visibleTo(viewer, entity)` predicate that chat routing and the loot-owner window also use (Strategy W8).

### 3.6 Transitions
Sources: claudecraft, Quake, Forge, gemrb.
```
"portals": [ {"id":"gate_a","aTrigger":{"x":10,"y":4,"r":1.5,"floor":0},"aLanding":{"x":12,"y":4},
  "bTrigger":{...},"bLanding":{...},"arrivalLock_ms":800,"defer_ms":200,"minWait_s":0,
  "carry":{"hpFloor":null,"strip":["zoneKey"],"summons":"remove"}, "transitLog":true } ]
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
Kills are never in the snapshot; they are kill rows in the value ledger. The snapshot holds living entities and their cells, and **the snapshot lives in the zone store, a separate store from the value ledger** (Strategy ruling: the ledger stays the book of value so the conservation fuzz stays meaningful).

### 3.9 Layout generation
Sources: Cubyz, flare-game, Evennia, Beyond All Reason, DFHack (authoring), a restricted donor (regions), vcmi (guards), OpenXcom (rect pick).
```
"layout": { "on": false, "mode": "authored|seeded-walk|lazy-chain|centres",
  "seed": 90210, "pieces": "rules/mine-pieces.json", "mainPath_len": [9, 16],
  "branch_len": [4, 7], "doors": 3, "keyMode": "before-door|anywhere", "uniquePieces": true,
  "exitBudget": 3, "reserveCoords": true, "variantByPlayerCount": {"1":"A","2":"B","4":"C"},
  "failOnMissingVariant": true, "regions": {"relabelOn":["gate","blocker"]}, "instance": {"collapseEmpty_s": 600} }
```
Layout generation is **not** part of the population row 23; it has its own row (section 6). Authored zones are the default; generated layouts write the same zone record at build time (frozen by seed), so the runtime sees only data.

### 3.10 Zone control
Not population; has its own row (section 6).
Sources: 0 A.D.
```
"control": { "on": false, "sources": [ {"owner":"playerId","x":10,"y":5,"weight":60,"radius":12,"root":true} ],
  "sumMode": "sum|max", "tieRule": "earlier-claim", "recompute": "onSourceChange",
  "effects": {"respawnMult": 0.5, "spawnTable":"friendly"} }
```
Integer weights on the server (load rule `W x K >= R`, K = 4 ours); connectivity to a root required. Control is its own part and never touches the spawn module directly; it only changes data fields (via effects) through the zone record.

### 3.11 Camera limits (data only; v3, Strategy W1)
Sources: the camera doc (CAM-A, CAM-B); LostCity reload-box hysteresis shape for the `{enter, leave}` pair. This part is DATA ONLY: the zone row carries it, the follow-camera module reads it, and the server reads it only to compute section 0c. It never feeds hits, kills or target choice.
```
"camera": { "on": true, "preset": "A",
  "limits": { "distMin": 1.8, "distDefault": 3.2, "distMax": 5.5, "pitchMin": -20, "pitchMax": 55, "vFovCapDeg": 56, "lockYaw": null },
  "hysteresis": { "enter": 1.6, "leave": 2.6 }, "deadZonePct": 12,
  "sightCapM": null, "tileSizeM": null }
```
The Pit row (`frozen: true`) has no camera block. Test: ZON-E17.

---

## 4. Switchable presets Dom can try

A preset is a data overlay: one JSON file merged over each zone's defaults. Flipping it changes nothing else (no code). All numbers are **our own derived starting values**, untested. Derivations: `fightS` = 20; `crossS` = 20 (zone crossing time); example zone = **240 walkable tiles** (chosen so that no preset hits the cap clamp and `tilesPerMob` visibly changes the cap).

- cap = `clamp(round(walkableTiles / tilesPerMob), 2, 18)`; clamp maximum 18 = 6 x MAX_ATTACKERS (ours). `tilesPerMob` = 200/4 = 50 quiet, 25 standard, 14 busy (a view of about 200 tiles holds about 4 / 8 / 14 mobs). For 240 tiles: 5 / 10 / 17.
- `cap_soft` = `round(softFrac x cap)`; busy zones must tolerate crowding, so the busy preset has the **highest** soft fraction: 0.6 cautious, 0.8 standard, 0.95 busy. Gives 3 / 8 / 16. Above the soft cap the roll chance is divided; the hard cap is absolute.
- respawn delay = `[a, b] x fightS`: cautious `[4, 8]` = 80-160 s; standard `[2, 4]` = 40-80 s; busy `[1, 2]` = 20-40 s; floor `fightS / 3` = 7 s.
- grace: total `G = k x crossS` with k = 6 / 3 / 1.5 = 120 / 60 / 30 s. **Frozen stage at G/2, final stage (despawn or store) at G.** So cautious 60 / 120, standard 30 / 60, busy 15 / 30.
- `emptyPolicy`: ZON-P1, ZON-P2, ZON-P3, ZON-P5 = `despawn` (row 23 default, ZON-Q1); ZON-P4 = `store`. A `freeze` policy is not used by any preset (it would have no final stage).
- `minAwayTiles` = viewReach (section 0c) x (1.5 / 1.0 / 0.7); the fallback fixture when a zone has no camera row is 14 x (1.5 / 1.0 / 0.7) = 21 / 14 / 10; `minAwayWalk` = 1.5 x that = 32 / 21 / 15.
- spawn chance per director roll: set so the expected refill from empty to the cap takes `cap x respawnMid`; chance = `1 / (respawnMid / rollEvery)`.
- band (ZON-P3): `band.min = round(0.5 x cap)` = 9, `band.max = cap` = 17. On a burst the director refills to 9 at once, then trickles to 17.
- waves (ZON-P5): wave n has `min(cap, MAX_ATTACKERS + n)` creatures for n = 0..4: `[3, 4, 5, 6, 7]`, the next wave starts when the previous one is cleared; the onward exit unlocks after the last wave. Instance cap 8 (= 160 walkable tiles per instance / 20).

| Field | ZON-P1 cautious world | ZON-P2 standard world (default) | ZON-P3 busy world | ZON-P4 persistent world | ZON-P5 lazy dungeon |
|---|---|---|---|---|---|
| `director.mode` | timer | timer | band (min 9, max 17) | timer | wave-index (waves 3,4,5,6,7) |
| `tilesPerMob` | 50 | 25 | 14 | 25 | 20 |
| `cap_hard` (240-tile zone) | 5 | 10 | 17 | 10 | 8 per instance (160 tiles) |
| `cap_soft` | 3 | 8 | 16 | 8 | none |
| `rate_mult` | 0.5 | 1.0 | 2.0 | 1.0 | 1.0 |
| `respawn.delay_s` | [80,160] | [40,80] | [20,40] | [40,80] | none (waves clear) |
| `respawn.floor_s` | 7 | 7 | 7 | 7 | n/a |
| `presence.minAwayTiles` (fallback fixtures; v3 computes from the camera row) | 21 | 14 | 10 | 14 | 10 |
| `grace.stages` (s: frozen / final) | 60 / 120 | 30 / 60 | 15 / 30 | 30 / 60 | 30 / 60 (collapse) |
| `grace.emptyPolicy` | despawn | despawn | despawn | store | despawn |
| `stream.release_ring` | 3 | 2 | 2 | 2 | 1 |
| `state.on` | off | off | off | on (needed by `store`) | off (instance collapses; nothing stored) |
| `layout.on` / `mode` | off / authored | off / authored | off / authored | off / authored | **on** / lazy-chain (`collapseEmpty_s` = 60, equal to the grace final stage) |
| `director.none_weight` | 0.3 | 0.15 | 0.0 | 0.15 | 0.0 |
| Pit (`frozen: true`) | excluded | excluded | excluded | excluded | excluded |
| Aim | calm, forgiving, easy to read on a phone | the default feel | crowded, fast loop, stress test of ledger | kills and positions stay until the clock says | procedural run, onward exit locks until cleared |

The Pit is `frozen: true`: every preset leaves it alone and it is excluded from the coverage count by that explicit flag, never by omission.

Sketch of the preset file (proposal):
```
{ "zonePreset":"standard", "version":1,   // namespaced: socialPreset, economyPreset and cameraPreset are separate keys in other docs
  "defaults": { "director": {"on":true,"mode":"timer","tilesPerMob":25,"rate_mult":1.0,"minIntervalTicks":20},
                "presence": {"on":true,"minAwayTiles":14,"retry_ms":2500},
                "grace": {"on":true,"stages":[{"after_s":30,"state":"frozen"},{"after_s":60,"state":"despawn"}],"emptyPolicy":"despawn"},
                "respawn": {"on":true,"delay_s":[40,80],"floor_s":7} },
  "zones": { "forest_1": { "walkableTiles": 240, "roster":[{"kind":"wolf","weight":3,"cap":6}] },
             "pit": { "frozen": true } } }
```
Per-zone fields override the preset; the Pit entry is frozen and every preset leaves it alone.

---

## 5. Novel ideas (20)

Marked with the donors whose shape they extend. All ours; none built.

ZON-N1. **Preset slider as one number.** The three presets differ only through `rate_mult`, `tilesPerMob` and a grace factor; ship a single "world busyness" dial that interpolates those three and logs the value in every run. (Endless Sky knob, shape-only.)
ZON-N2. **Heat-map respawn.** Respawn delay shortens in zones nobody entered in the last N minutes and lengthens where kills just happened, so empty corners fill and farmed spots rest. Uses the ledger kill log. (OpenRCT2 score, isometric-city dead band.)
ZON-N3. **Dead band on zone demand.** `demand = players_in_zone / playersTarget`; below `lo` raise the cap, above `hi` lower it, between them hold. Cap moves by one per minute. (isometric-city, micropolisJS valve; demand is a count, not an economy.)
ZON-N4. **Visible spawn telegraph.** When a spawn is allowed in view (e.g. a boss), show a short cue first; the spawn commits on the server only after the cue time. Avoids pop-in complaints without breaking the "refuse in view" rule. (l1j, Daggerfall client rule on the client side.)
ZON-N5. **Last-seen ghosts on the map.** The streaming window drops a creature's mesh, but the client keeps a faint last-known marker for N s, so leaving and re-entering feels continuous. Marker is client only; ledger untouched. (ClassicUO hide-not-delete.)
ZON-N6. **Snapshot the engaged state.** The snapshot (a zone-store record) keeps `engagedWith` and hate entries, so leaving mid-fight resumes with the fight state, and the "leave to heal" exploit is removed by a regen penalty that is also in the snapshot. (Quake 2, Forge LKI.)
ZON-N7. **Respawn tickets.** Each kill leaves a ticket in the zone that can be spent by the director only on the same roster entry that was killed, so rare entries have rare returns, not a re-roll. (l2dn queue, Fallout counters.)
ZON-N8. **Pity ramp on unique spawns.** A unique's per-roll chance rises each roll it misses and resets on spawn; the ramp is a data field and is logged. Once per character via a loot-grant row in the value ledger. (flare-game pity ramp tag, Fallout unique bitmask.)
ZON-N9. **Population as a three-tier ring.** Spawn rule differs by ring from the zone entrance: ring 0 safe, ring 1 trickle, ring 2 full roster; ring radii are zone data. Gives difficulty gradient inside a zone without separate zones. (freeciv ring band, freeorion hop-distance guard.)
ZON-N10. **Gate-linked wake.** Opening a gate (visibility part) wakes the creatures behind it on the same tick and starts a short "noise" grace; closing starts the freeze countdown. One gate event drives both the send filter and the AI sleep. (ioq3 and dhewm3 combined.)
ZON-N11. **Co-op scaling by present count.** `variantByPlayerCount` selects a layout variant, and the director uses the same count to set `band.min` (never `cap_hard`), so more players create more arrivals but the hard cap and MAX_ATTACKERS stay fixed. (Beyond All Reason variant pick, OpenBOR player-count variant.)
ZON-N12. **Region-scoped spawn pockets.** A sealed pocket in a zone is its own region; its roster and respawn are separate until a gate opens, then merge. Gives "vault" feel without a new zone. (region labels from a restricted donor.)
ZON-N13. **Zone seasons.** A zone's roster table has a `season` condition that rotates on a real-day schedule (server clock); the Fallout daypart idea at a slower scale. Player returns, finds a new roster. (Fallout 2 daypart, Barony band table.)
ZON-N14. **Guard-for-reward budget.** Any reward chest in a zone declares a value; the authoring tool computes a guard strength from a hinge curve and writes the guard into the zone roster. No runtime cost. (vcmi.)
ZON-N15. **Escort route zones.** A creature group with a `route` of zone ids walks zone to zone through the portals, re-using the transit function; the director counts it as one member of its start zone until it leaves, recorded as a flag in the zone entity table (the live count stays derived from that table). Ambush check per leg is a probability in the portal data. (OpenXcom route, gemrb leg ambush.)
ZON-N16. **Offline map brush.** A zone editor that paints a connected region from a seed (with a fringe cell), and optionally carves a "river" from a flood walk; output is frozen into zone data with the seed saved. (DFHack paint, lincity-ng carver as authoring only.)
ZON-N17. **Territory as a pressure source.** The control part (0 A.D.) writes `respawnMult` and `spawnTable` into the zone record when a guild holds the zone; losing it reverts. Two parts, one field set, no coupling in code. (0 A.D.)
ZON-N18. **Cap relief with a saving throw.** At the hard cap, the director may retire the weakest, farthest, unengaged creature to make room for a rare spawn, rolled against a "save" chance so the same one does not always go. (Angband relief, protect engaged.)
ZON-N19. **Replay-able zone day.** Every roll is logged with threshold and seed. A debug tool replays a zone's day from the log and diffs it against the kill rows in the value ledger and the zone store. Doubles as the cheat check for kills. (OpenRCT2 logging, seeded RNG across donors.)
ZON-N20. **Leaderless crowd pass.** For cheap crowds in busy zones, mid and far tier creatures share one step per group (a "flock") and split only when an engaged member exists. Reduces CPU for the busy preset. (OpenGothic tiers.)

---

## 6. Gaps in parity row 23 (what rows Lead should add)

Row 23 today = cap, spawn chance, respawn s, grace s, coverage. Proposed new rows (all proposals; Lead decides):

**Population rows (extend row 23):**

| New row | What it checks | Donor shape |
|---|---|---|
| ZON-23a Zone table | One id per zone, no overlaps (rejected at load), unknown id returns null, boxes and z band, missing rect fails load | RustDAoC, KsanaDock, L2Solo |
| ZON-23b Presence | Spawn refused in view of any player, far by walking, retry keeps spawn due, empty-zone defer | Shattered, l1j, Angband |
| ZON-23c Despawn stages | Active, frozen, despawn, re-entry cancel, per-sweep cap, protected set | EQEmu, dhewm3, ClassicUO |
| ZON-23d Respawn queue | Alive plus queued under cap at queue and fire, floor, occupied spot defer, overflow logged | l2dn, DOOM |
| ZON-23e Transitions | Portal pairs, landing clear of trigger, fire once (insideSet, fire on change only), arrival lock, carry record, transit log entry (zone store) | claudecraft, Quake, Forge, Xash3D |
| ZON-23f Streaming (server checks only) | Shared delta, private events to owner only, first-sight snapshot, hide never deletes from the ledger | LostCity, 2004Scape, ClassicUO |
| ZON-23g Visibility | Gate graph refcount, send filter, wake on open | ioq3, dhewm3 |
| ZON-23h1 Kills across unload (Strategy order a, first) | Kill rows stay in the value ledger across zone unload, store, restore and restart; a store is never a death (no loot or XP paid); the respawn clock reads the kill row | Quake 2, Cataclysm-DDA |
| ZON-23h2 Zone snapshot (zone store; after order b) | Snapshot restore, bad snapshot falls back to baseline, wipe on version bump; the snapshot never holds kills | Quake 2, Cataclysm-DDA |
| ZON-23k Determinism | Every roll logged with threshold; replay reproduces the population | OpenRCT2, Barony |
| ZON-23l Spatial index | Grid results equal brute force; move re-files same tick; 3D vs 2D rule uniform | DOLSharp, OpenDAoC |

**Separate non-population rows (NOT part of row 23; Lead assigns numbers; labels kept from v1):**

| Row | What it checks | Donor shape |
|---|---|---|
| ZON-23i Layout generation (own row) | Same seed same layout, load-time clamps, variant exists for the count, unique once, key before door | Cubyz, flare-game, Evennia, BAR |
| ZON-23j Zone control (own row) | Tie rule stated, connectivity, integer falloff guard (`W x K >= R`) | 0 A.D. |

**Client-only checks (a client test row, not a server row 23):** load ring smaller than release ring (hysteresis), one action per frame, lookahead loads early, last-seen marker. Sources: gawric, OpenMW, OpenTESArena.

ZON-23-AMEND (Strategy order a, first): also add to the existing row 23 text: "coverage" should say what it covers (zones with a population block vs total zones) and that frozen zones (the Pit) are excluded by an explicit flag, not by omission.

---

## 7. Experiment plan (headless server tests)

Principles: no browser; fixed seed; a fake clock the test advances; bots as plain objects calling the same server entry points as clients; every test prints the seed and the roll log on failure. Heavy runs go to the VPS per Dom's standing rule; small unit tests may run anywhere. All of this is a plan, not a result.

| # | Test | Method | Pass line |
|---|---|---|---|
| ZON-E1 | Zone lookup | Load a 9-zone table; resolve every spawn and a gap point; ids 265 (N+256) and -1; two overlapping boxes | exactly one id per point; gap and unknown id -> null; overlap fails load |
| ZON-E2 | Timer re-arm | Cap 10, delay [lo, hi]; kill twice quickly | one timer armed; delay in range; no second arm |
| ZON-E3 | Cap invariants | 1000 ticks with random kills and leashes | live (derived) never above `cap_hard`; at most `perTickBudget` spawns per tick |
| ZON-E4 | Presence | Place 3 bots; run director 10,000 attempts | no spawn in view of any bot or nearer than `minAwayWalk`; failed placement retries and stays due |
| ZON-E5 | Grace | Last player leaves; step; re-enter at 0.5 x frozen time and again at 1.5 x | stage times exact; re-entry cancels; protected set untouched; sweep cap holds |
| ZON-E6 | Respawn queue | Kill all, hold a bot on the spawn point | alive+queued under cap at both checks; floor holds; deferred spawn relocates after timeout |
| ZON-E7 | Soft cap | Seeded zone at 1.5 x target vs at target | roll rate ratio matches the divisor formula within sampling error; hard ceiling blocks |
| ZON-E8 | State | Kill 3 of 5, leave, return | 3 stay dead (ledger), 2 at stored cells; bad snapshot -> baseline; store never records a death |
| ZON-E9 | Transit | Walk into portal; push back into trigger; knockback test | one transit; arrival lock holds; transit log has one entry; landing check passes for all portals |
| ZON-E10s | Streaming (server) | Walk back and forth across a zone border 300 times; two bots in one zone | first-sight snapshot then deltas only; private events reach only the owner; hide does not change the ledger |
| ZON-E10c | Streaming (client row, separate) | Walk back and forth over a ring edge 300 frames; sprint toward a border | no load or unload per crossing; lookahead loads early; one action per frame |
| ZON-E11 | Visibility | Shut and open gates; two gates on one edge | snapshot has only reachable zones; second gate keeps B visible; closing at count 0 throws |
| ZON-E12 | Grid | 4000 objects, 800 random radius queries, moves across cell edges | equals brute force; moved object visible the same tick |
| ZON-E13 | Layout | Same seed twice; different window origin; adjacent-chunk spacing; missing variant | identical layouts; spacing rule holds; missing variant fails load |
| ZON-E14 | Determinism and replay | Run 10 simulated zone-days; replay from the roll log | populations equal at every checkpoint |
| ZON-E15 | Presets | Run ZON-P1..ZON-P5 with 20 bots for 10 simulated minutes | measure mean live, empty-zone fraction, spawns/min, ledger writes/s; no invariant breach; export a table for Dom |
| ZON-E16 | Engaged protection | Fill the cap, force compaction while 3 bots fight | MAX_ATTACKERS = 3 never exceeded; engaged and boss never retired; far hate holder still lands hits |

**New tests added in v3 (from Strategy B first tests; all proposals):**

| # | Test | Method | Pass line |
|---|---|---|---|
| ZON-E17 | View proxy follows the camera row (RC-04) | Load three zones with different `camera.limits` (short boom, default, long boom); compute `viewReach_m`; project the frame footprint at `distMax` with 3 engaged attackers (preset B hard max) | `minAwayTiles` grows monotonically with `distMax`; the projected footprint lies inside the proxy circle; a zone with no camera row uses the fallback 14 |
| ZON-E18 | Lazy deadline survives restart (Strategy W7) | Kill a creature with respawn due at T; restart the writer at T/2; advance the fake clock | the respawn fires at T, not at T plus restart time; the grace stage is the same with no sweep running |
| ZON-E19 | One weighted pick (Strategy W5) | Same seed and same zone row twice; roster with `none_weight` 0.15 over 10,000 picks | identical spawn sets and loot packs; empty outcome rate within sampling error of 0.15 |
| ZON-E20 | One relevance tier (Strategy W6) | No player within `far_tiles` for `grace_s`, then one player enters | NPC think rate 0 and spawns paused while away; both restored inside one tick of entry |
| ZON-E21 | Level-gap curve (Strategy W9) | Gap 10, gap 0, over-strong foe | gap 10 gives 0 XP and no rare slot; gap 0 full; over-strong foe excluded from the aggro scan |
| ZON-E22 | Receiver predicate (Strategy W8) | Owner and a second player near a loot pile | owner sees the pile at t; the second player sees nothing until t + window, then sees it |

Phase order (v2, superseded by the Strategy order in the status block): ZON-E1 and ZON-E12 first (data and index), ZON-E2-ZON-E7 (population), ZON-E8-ZON-E11 (state and visibility), ZON-E13 (layout, last), ZON-E15 as the Dom-facing report.

Measurements to collect (so presets can be tuned from data, not from my guesses): median fight length, zone crossing time, kills per player per minute, average live count, time-to-refill from empty, ledger writes per second per zone.

---

## 8. Questions for Dom (max 6)

ZON-Q1. **Empty zone: freeze, despawn or store?** Donors differ (EQEmu freezes, Cataclysm and Quake 2 store). Which feel do you want as the default: creatures vanish and refill fresh (despawn), stay where they were (store), or keep standing still (freeze)? Row 23 says despawn.
ZON-Q2. **Should killed creatures stay dead until the timer even if the zone empties?** (Yes is my default: the ledger holds kills, the timer decides respawn.)
ZON-Q3. **Do you want procedural zones at all in the first slice?** Layout generation is the largest part and the least tied to the fight loop. I propose authored zones first and the layout part switched off.
ZON-Q4. **Two small rules for your call:** (a) when a unique encounter is cancelled, does it count as used? (b) when a spawn roll fails, does the spawn point stay used until the player leaves and returns (Exult style) or does it roll again on the next check?
ZON-Q5. **Zone control tie rule:** on a tie, earlier claim wins, lower player id wins, or neither (no owner)? (Only matters if the control part is switched on.)
ZON-Q6. **Preset naming and default:** is "standard world" (ZON-P2) the right default, and do you want the busy preset to be a live test option on the real server or only in headless runs?
