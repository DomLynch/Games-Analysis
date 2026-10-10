# Check of zones-brainstorm.md against zones-digest.md

Checker: independent pass. Source read: the whole digest (60 notes, digest text plus its "checker" lines) and the whole brainstorm. Deep notes were opened only for DOOM. Digest gap excerpts are truncated at about 700 characters, so a few claims can only be checked against the digest's best_idea, decision and acceptance lines. Brainstorm file not edited.

Overall: attribution and licence tags are sound (every donor's class and mechanism matches the digest; no invented donors). The main failure is the "all numbers are my own" claim: 9 preset or sketch values equal a donor constant from a copyleft or restricted donor. Internal preset consistency has 5 problems. The DOOM P_LoadThings note is not in the brainstorm at all.

## A. Top 16 gems

| # | Verdict | Note |
|---|---|---|
| 1 | OK (minor) | RustDAoC, KsanaDock, L2Solo mechanisms all match. Minor: the RustDAoC acceptance resolves overlaps to the nearer centre; the brainstorm (following L2Solo) rejects overlap at load. A valid choice but the divergence is not stated. |
| 2 | OK | ModernUO: one timer, re-armed only when idle and room, fresh delay. Matches best_idea. |
| 3 | OK | SPD weighted live count, one spawn per cooldown, unseen and far-by-walk. l1j 3 s retry with new point: matches. Angband trickle out of sight: matches. |
| 4 | minor | EQEmu keep stepping then freeze, dhewm3 same-tick wake and skip brain, ClassicUO throttled sweep, deferred removal, per-pass cap: all match. "None gives the despawn" is mostly right but Evennia (idle collapse, though its cleanup is broken) and Daggerfall (immediate distance despawn) give partial despawn shapes; say "none gives a graceful despawn". |
| 5 | OK | CDDA budget, spend once, store, restore; Quake 2 baseline plus overlay plus unit wipe. Matches. |
| 6 | OK | l2dn (alive plus queued under cap, floor) and DOOM (bounded FIFO, one per tick, defer on occupied) match. |
| 7 | OK | OpenBOR band and OpenRA live-roster burst to minimum. Burst belongs to OpenRA, band to OpenBOR; the gem blends them but cites both. |
| 8 | OK | OpenRCT2 soft-cap divisor plus hard ceiling; "never for MAX_ATTACKERS" is the digest's own warning. |
| 9 | minor | Endless Sky gives the interval table, condition gate, global multiplier, pre-warm. The floor is NOT in the donor (digest lists the missing floor as its defect). The gem lists "and a floor" as if donor. Attribute the floor to us. |
| 10 | minor | DOLSharp whole-cell accept and edge exact check: matches. "Re-files on every move" is the digest's fix (the donor files lazily under the old cell), not the donor mechanism. OpenDAoC ring cull matches. |
| 11 | OK | 2004Scape shared delta, private to owner, full snapshot on first sight; LostCity reload box. Matches. |
| 12 | minor | claudecraft pairs and landing-clear: matches. Forge capture-first single entry: matches. Quake defer, fire once, clamped carry: matches, but "typed" is our change (the donor uses 16 untyped slots). |
| 13 | OK | ioq3 refcount plus send filter; dhewm3 gate graph as wake rule. Matches. |
| 14 | OK | Cubyz parity phases and normalised nearest centre, flare-game walk with key-before-door, Evennia lazy chain with exit budget. Matches. Note the digest says Cubyz is "not an exact fit" for row 23 (layout, not population). |
| 15 | OK | 0 A.D. max-weight owner, root connectivity, integer, recompute on change. Matches. |
| 16 | OK | Fallout 1 CE unique pool, Fallout 2 CE counters, pokemonAutoChess null mass. Matches. |

Honourable mentions and the lincity rejection: all OK (fheroes2, vcmi, OpenGothic, OpenMW, CnC and lincity-reject match their digest decisions).

Licence tags in the whole brainstorm (gems, table, sources lists): all 60 donors checked against the digest class. No mismatch. No Valve or Sustainable-Use donor exists in the digest; the tag line is just a general definition.

## B. Defect -> fix table

I checked all 60 rows, not only 12. Every defect is supported by the digest (gaps, checker or decision line). Specific notes:

| Row | Verdict | Note |
|---|---|---|
| 0 A.D. | minor | "ties go to lowest id by accident": digest says ascending order, strict `>`, lower id wins; "by accident" is the brainstorm's inference. "K derived by me": donor uses factor 8 (copyleft); do not reuse 8; state K as own value or leave it open. |
| 2004Scape | minor | Fix cap is `dynamicObjCap 128`. Donor is 129/130 (permissive, so allowed), but it is near the donor value while the file says numbers are its own. |
| CDDA | OK | "unload sets HP to 0": digest says the donor marks an unloaded monster dead in memory, decision says "HP-to-zero step". Fine. |
| Fallout 2 CE | OK | Q4(a) matches the cancelled-encounter gap. |
| Exult | OK | `missUsesLatch` and Q4(b) match. |
| ModernUO | OK | All three defects are in the digest checker line (lazy count, double arm). |
| DOOM | OK | 127 silent drop supported (see numeric section for the 127 problem in the fix). |
| ClassicUO / grace key | minor | Table says `lastPlayerSeenAt`, section 3.3 says `lastPlayerLeftAt`. Pick one field name. |
| Remaining rows (RustDAoC, Mindustry, Forge, Cytopia, OpenBOR, DFHack, DOLSharp, EQEmu, Xash3D, Ksana, LostCity, OpenDAoC, OpenGothic, OpenRA, OpenRCT2, OpenXcom, Cubyz, Barony, TESArena, F1 CE, isometric, Angband, l2dn, BAR, Crawl, cuteshaun, Daggerfall, dhewm3, KeeperFX, CnC, Endless Sky, Evennia, flare-engine, flare-game, freeciv, freeorion, gawric, gemrb, micropolis, Q2, Quake, fheroes2, ioq3, pokemonAC, l1j, claudecraft, lincity, OpenMW, Forgotten Server, L2Solo, vcmi) | OK | Defect and mechanism match the digest. |

## C. Numeric values that match a copyleft or restricted donor constant (shape only is allowed)

The brainstorm says "no donor constants". These equal digest constants:

| Brainstorm value | Where | Donor value | Donor class | Verdict |
|---|---|---|---|---|
| `minAwayTiles` 13 (P2) | 3.2, preset file | l1j: "player within 13 tiles" | copyleft | wrong |
| `retry_ms` 3000 | 3.2, preset file | l1j: "retry after 3000 ms / 3 s" | copyleft | wrong |
| `minAwayWalk` 12 | 3.2 | SPD: "at least 12 walk steps" | copyleft | wrong |
| `queueMax` 127 | 3.4 | DOOM: 127 entries (ring of 128) | restricted | wrong |
| `floor_s` 10, "floor 10 s" | 3.4, section 4 | l2dn: 10 s floor | restricted | wrong |
| `lookahead_s` 1.0 | 3.5 | OpenMW: position predicted one second ahead | copyleft | wrong |
| `defer_ms` 100 | 3.6 | Quake: 0.1 s defer | copyleft | wrong |
| layout `doors` 2, `mainPath_len` [10,20], `branch_len` [5,10] | 3.9 | flare-game acceptance: 2 doors, main path 10 to 20, branch 5 to 10 | copyleft | wrong (all three) |
| control source `weight` 10000, `radius` 140 | 3.10 | 0 A.D. acceptance: weight 10000, radius 140 | copyleft | wrong |
| `cap_hard` 6, E2 "cap 6" | 3.1 sketch, E2 | ModernUO acceptance: cap 6 | copyleft | minor (example value) |
| E12 "5000 objects, 1000 queries" | E12 | OpenDAoC acceptance: 5000 objects, 1000 queries | copyleft | minor (test fixture) |
| E1 ids 512 and 9999 | E1 | RustDAoC test ids | copyleft | minor (test inputs, harmless) |
| cap clamp max 24, `cap_hard` 24 | section 4 | Daggerfall: cap 24 | permissive | minor (allowed, but the "own numbers" claim is then false; credit or change) |
| E1 "9-zone table", E10 "300 frames" | E1, E10 | KsanaDock, gawric | permissive | minor (allowed) |

Fix for each wrong row: replace with a value computed from the stated formulas (`T`, `fightS`, `crossS`) or write "TBD from measurement". Examples: `minAwayTiles` = 0.65 x view tiles, rounded to an odd number other than 13; `retry_ms` = 25 x T; `queueMax` = 4 x cap; `floor_s` = fightS / 3; `lookahead_s` = 0.75 or derive from walk speed; `defer_ms` = 1 x T; layout lengths from a zone-size formula; control weights as symbolic `W`, `R` with the load rule `W x K >= R`.

## D. Preset consistency (section 4)

| Item | Verdict | Problem |
|---|---|---|
| Cap row | wrong | The zone is 1200 tiles, so formula gives 24, 48, 86, 60 and clamps P1 to P4 all to 24. The presets do not differ in cap, so `tilesPerMob` has no effect in the example. Use a zone where the clamp is not hit (for example 300 tiles: 6 / 12 / 21). |
| `cap_soft` | wrong | cap-2 / cap-3 / cap-4: the busy preset has the lowest soft cap, so its divisor starts earliest and it is the least crowded. Direction is inverted for a "busy" preset (and with all caps 24 the soft caps are 22 / 21 / 20). |
| Grace row | minor | The text formula says grace = k x crossS: 120 s / 60 s / 30 s. The table gives stages 60/240, 30/120, 15/45. The mapping (freeze = half, despawn = 2x) is not stated, and busy (45) breaks the 2x pattern (would be 60). |
| P2 `emptyPolicy` freeze | wrong vs ruling | Row 23 says despawn on empty with grace; Q1 itself says "Row 23 says despawn". The default preset P2 uses `freeze`, and its stages list includes a `despawn` stage at 120 s, which contradicts a `freeze` policy. Either P2 = despawn, or remove the despawn stage when policy = freeze. Same problem in the preset file sketch. |
| P3 `mode` band | minor | Band mode needs `band.min` and `band.max`; the table gives neither. P5 `wave-index` needs a wave table; not given. |
| P5 | minor | `state.on` = on (instance) with `emptyPolicy` despawn: state only makes sense with `store`. Grace "60 collapse" vs 3.9 default `collapseEmpty_s` 600. `layout.on` stays false in 3.9 while P5 sets mode lazy-chain; say P5 also sets `layout.on` true. |
| Pit frozen | OK | Pit is `"frozen": true`, presets leave it alone. But only the sketch shows this; add a line to the table so no preset can include the Pit in coverage by default. |
| Server-verified, MAX_ATTACKERS = 3 | OK | Hard limits are outside the parts (3 intro). No preset touches them. |
| One ledger | minor | 3.8 snapshot of living entities, and idea 6 (hate in snapshot), is a second store beside the ledger. State plainly that the snapshot is a ledger record type, not a separate store. Idea 15 (escort counted as a member of its start zone) conflicts with "live count derived from the ledger"; say it is a ledger flag. |
| Zones as data | OK | Zone record with optional blocks, preset as overlay. |

## E. Proposed rows 23a-23l against digest gap statements

| Row | Verdict | Note |
|---|---|---|
| 23a Zone table | OK | RustDAoC masking, Ksana silent fallback and L2Solo first-match gaps. |
| 23b Presence | OK | SPD single hero, l1j last attempt, Angband. |
| 23c Despawn stages | OK | EQEmu freeze not despawn, dhewm3, ClassicUO. The digest says no donor has the despawn; the row is ours. |
| 23d Respawn queue | OK | l2dn cap at queue time, DOOM occupancy and 127 drops. |
| 23e Transitions | OK | claudecraft 2D, no lock, no ledger entry; Quake. |
| 23f Streaming | minor | Digest marks gawric and OpenMW checks as client tests. Row 23 is a server test row; label the client-only checks as such or give them a separate client row. |
| 23g Visibility | OK | ioq3 refcount, dhewm3 wake. |
| 23h Zone state | OK | Quake 2 bad-snapshot abort, CDDA. |
| 23i Layout | minor | Digest says Cubyz is "not an exact fit" for row 23 (layout, not population). Use a new row number outside the population row. |
| 23j Zone control | minor | 0 A.D. gap: "Not population ... do not put it in the spawn module." Same: separate row. |
| 23k Determinism | OK | OpenRCT2 roll log, Barony per-spawn seed, unseeded RNG gaps in several donors. |
| 23l Spatial index | OK | DOLSharp stale cells, OpenDAoC 3D vs 2D. Xash3D is cited for enter/exit, which belongs in 23e (insideSet), not 23l. |

"Coverage / Pit excluded by explicit flag" proposal: consistent with the Pit-frozen ruling. OK.

## F. DOOM P_LoadThings break-versus-continue note

Not present. The brainstorm contains no mention of P_LoadThings, and grep over both files finds none. The DOOM deep note (id-Software-DOOM.deep.md line 13) only says P_LoadThings "skips some monster types unless the game is the commercial mode (318-332)". It does not say whether the skip is a loop `break` or `continue`. I have no copy of p_setup.c on this machine or the VPS (a find found nothing), so I cannot verify it.

From general knowledge of the original source (unverified here): the spawn=false path in P_LoadThings uses `break`, which leaves the whole things loop, not just that one thing. If the author means to record this, it must be marked as "from memory, verify against the donor file" and it must be flagged as a donor defect with the fix "skip one thing, continue the loop; count and log skipped things". It is shape-only (restricted donor), so no code or constants are copied.

## G. Corrected list (what to change in the brainstorm)

1. Replace the nine wrong constants in section C (13, 3000, 12, 127, 10, 1.0, 100, doors 2 / [10,20] / [5,10], 10000 / 140) with formula-derived or symbolic values; change the intro sentence from "all numbers are mine" to "numbers are formulas or placeholders; the following equal permissive-donor values: ...".
2. Gem 9: attribute the interval floor to Frankendom, not Endless Sky. Gem 10: say re-filing on every move is our fix. Gem 12: "typed" is ours. Gem 4: "none gives a graceful despawn".
3. Use one field name (`lastPlayerSeenAt` or `lastPlayerLeftAt`).
4. Preset table: pick a zone size where the clamp is not hit; fix `cap_soft` direction; state the freeze/despawn mapping; make P2 despawn (row 23) or remove the despawn stage under freeze; add band and wave values or mark them TBD; reconcile P5 state/policy/collapse values; add the Pit line.
5. State that the snapshot and escort count live in the one ledger.
6. Move 23i (layout) and 23j (control) out of the population row; mark 23f client checks; move Xash3D from 23l to 23e.
7. Add the DOOM P_LoadThings note only after checking the donor file; until then say "unverified".
8. Note that the RustDAoC acceptance (nearer centre) differs from the chosen overlap rule (reject at load).
