# Parity rows for Lead, v3 (combined and de-duplicated, Strategy order)

For: Lead Dev. Source: the four v3 brainstorms in this folder and the Strategy verdict section D (`/Users/domininclynch/Developer/Games-Analysis/docs/strategy/donor-library-strategy-verdict-2026-10-10.md`). Conflicts and rulings behind these rows: `RECONCILIATION-v3.md`.

**NOTHING IS BUILT.** Every row and test below is a proposal. No row exists in the checklist because of this file, no test has been written or run, and Lead numbers the rows. "Row N" means the existing checklist row; ids like CAM-T01 are the v3 doc ids.

How to read: PR-01 to PR-10 are Strategy's D1 to D10 in Strategy's order (section 1). Section 2 holds the win-test rows (first tests of Strategy's B wins) and the zones order. Section 3 holds rows that wait. Section 4 is the de-duplication log. Nothing copies a donor constant: every number mentioned is our own tuning, as derived in its source doc.

## 1. Strategy order D1 to D10

| Id | Strategy | Text | Test | From doc | When |
|---|---|---|---|---|---|
| PR-01 | D1 | **Pit isolation, one row for all three docs.** With every camera preset, every social module and every economy switch on and off, the Pit fight snapshot and the Pit camera still are byte-identical to the frozen snapshot. `?cam=` is ignored in Pit scenes. The zone preset files leave the `frozen: true` Pit entry alone. No economy hook (stake, wager, rake) is reachable from Pit code, except the row 18 server-reward path once the Pit moves to server rewards, which must pass through `settle` | CAM-T01 (every preset A..E, every post effect, `?cam=`), PAR-E1 (social modules on and off), ECO-R15 (no economy hook reachable from Pit code), and the zones Pit flag from ZON-23-AMEND. One matrix run, one frozen-snapshot compare | camera, parties, economy, zones | Now. Cheap; guards the freeze |
| PR-02 | D2 | **`settle` is the only balance writer, plus request-id idempotency.** | ECO-T12: grep lint "no balance write outside settle" passes with an empty exception list. ECO-T16: the same `requestId` twice, then 10,000 interleaved retries, has exactly one effect; a replay test rebuilds balances from rows | economy (ECO-R1) | Now |
| PR-03 | D3 | **MAX_ATTACKERS = 3 never exceeded, and no other cap can alias it.** | ZON-E16 (fill the cap, force compaction while 3 bots fight: never more than 3 attackers; engaged and boss never retired; a far hate holder still lands hits). PAR-E2 plus the 3.1 test (`party.cap` and `seat.attacker_seats` cannot alias: changing one never changes the other). CAM-T23 (the camera reads the engine constant; no literal 3). Existing cap test (4 wolves, the 4th never lands a hit) | zones, parties, camera | Now. Small; protects the central ruling |
| PR-04 | D4 | **Kills stay in the value ledger across zone unload; a store is never a death.** No loot or XP is paid by a store; the respawn clock reads the kill row | ZON-23h1 and ZON-E8: kill 3 of 5, leave, return: the 3 stay dead (kill rows), the 2 sit at stored cells, a bad snapshot falls back to baseline, store records no death, no ghost payout | zones | Now (Strategy order a) |
| PR-05 | D5 | **World camera rows.** (a) No `camera.position` / `lookAt` in `origins/` (World's #2126 adds this lint tonight; this row only tracks it). (b) Camera limits come only from the zone row | CAM-T21 (a) and (b). First test of win W1 is CAM-T20: two zones with different `camera` rows render different distance and elevation in a headless still; the Pit still is byte-identical with every preset flag set (covered by PR-01) | camera (zones part 3.11 supplies the row) | Now, with presets A and B |
| PR-06 | D6 | **Price function property grid.** `buy >= value`, `sell <= min(floor(vendor sell cap x value), buy - 1)`, `sell >= 1`, each ratio applied exactly once | ECO-T3 (grid over items x index bounds x stock bounds x discounts, including the clamp corner where the natural buy is below par) | economy (ECO-R2) | Only once shops exist |
| PR-07 | D7 | **Row 23 text amendment.** `coverage` says what it covers (zones with a population block vs total zones); frozen zones (the Pit) are excluded by an explicit flag, not by omission | ZON-23-AMEND: the coverage count equals zones-with-population / zones-total with the Pit reported as `frozen: true`, excluded by flag | zones | Now (Strategy order a) |
| PR-08 | D8 | **Conservation fuzz.** Total of all accounts, sinks included, equals genesis + minted - burned at every step, per asset class (coin, xp, item); every refusal leaves the state hash unchanged; fault injected inside the transaction rolls back | ECO-FUZZ (headline test, section 7 of the economy doc) with the three variants (concurrency, bigint oracle, mutation test) | economy | With the first shop; costlier |
| PR-09 | D9 | **Recipient routing from server membership.** A forged party id reaches nobody; the party line never reaches an outsider socket | PAR-E8 (forged channel or party id, muted or ignoring listener, 5th line inside the window rejected to sender only) | parties | Only when chat exists |
| PR-10 | D10 | **Loot credits coin through `settle` with reason `kill_loot`.** Expected coin per fight equals the wage | ECO-R9 plus the CI lint ECO-N6 (expectation over the loot table within 3 percent of the wage W) | economy | With the first shop |

## 2. Win-test rows and the zones order (Strategy B and A2)

Strategy's first test for each win, in B order. Rows already covered above are marked "merged".

| Id | Win | Text | Test | From doc | When |
|---|---|---|---|---|---|
| PR-11 | W1 | The zone row carries camera limits and a `{enter, leave}` hysteresis pair | merged into PR-05 (CAM-T20) | camera, zones | with PR-05 |
| PR-12 | W2 | One engaged set drives AI, camera framing and later party sync | CAM-T22: 4 wolves engage; framing width scales to 3 and never includes the 4th; the 4th never lands a hit (existing cap test). CAM-T12 extension: hero and 3 attackers inside the HUD safe frame at 375 wide | camera | preset B |
| PR-13 | W3 | One damage ledger decides hate, XP share, loot rights and party credit at the death event | ECO-T18: three attackers deal 50, 30, 20; XP and loot eligibility sum to exactly 100 percent; one `kill_record` row with three shares | economy (parties PAR-E5 follows later) | after PR-02, before shops |
| PR-14 | W4 | One ledger primitive with the conservation fuzz | merged into PR-02 and PR-08 | economy | see PR-02, PR-08 |
| PR-15 | W5 | One weighted-pick table for spawns, loot packs and shop stock | ZON-E19: same seed and zone row twice gives the same spawn set and loot pack; `none_weight` yields nothing at the stated rate. ECO-T19: the same for shop stock | zones, economy | with presence work |
| PR-16 | W6 | One relevance tier with hysteresis gates spawns, AI think rate and later streaming | ZON-E20: no player within `far_tiles` for `grace_s` gives think rate 0 and spawns paused; one player entering restores both inside one tick. ZON-E17 (view proxy follows the camera row) belongs here | zones | Strategy order b |
| PR-17 | W7 | Every timer is `{start, stages}` read lazily | ZON-E18: a respawn due at T survives a writer restart and fires at T, not at T plus restart | zones (economy ECO-N11 and ECO-T8 agree) | Strategy order b |
| PR-18 | W8 | One per-viewer receiver predicate for loot ownership, then chat and presence | ZON-E22: owner sees the pile at t; a second player sees nothing until t + window, then sees it | zones (chat side is PR-09) | Strategy order c |
| PR-19 | W9 | One level-gap curve in zone data | ZON-E21: gap 10 gives 0 XP and no rare slot; gap 0 gives full; an over-strong foe is excluded from the aggro scan | zones (parties PAR-E5 reads it later) | with PR-13 |
| PR-20 | W10 | One fixed-step accumulator shared by server loop, camera and AI cadence | merged into CAM-T02: camera state after 1 s at 30 Hz and 60 Hz within 5 percent. The client camera never feeds the server sim | camera | Phase 0 |

Zones order after (a) = PR-04, PR-07:

| Id | Order | Row | Test | When |
|---|---|---|---|---|
| PR-21 | (b) | ZON-23b presence: spawn refused in view of any player (view = computed proxy, not 14 tiles) and far by walking; retry keeps the spawn due; empty-zone defer | ZON-E4, ZON-E17 | after PR-04, PR-07 |
| PR-22 | (b) | ZON-23c despawn stages: active, frozen, despawn, re-entry cancels, protected set untouched (lazy evaluation) | ZON-E5, ZON-E18 | with PR-21 |
| PR-23 | (b) | ZON-23d respawn queue: alive + queued under cap at queue and fire time, floor, occupied spot defers then relocates, overflow logged | ZON-E6 | with PR-21 |
| PR-24 | (c) | ZON-23f streaming (server checks): shared delta, private events to the owner only, first-sight snapshot, hide never deletes. Client-side checks are a separate client row (ZON-E10c) | ZON-E10s, ZON-E10c | last |
| PR-25 | (c) | ZON-23g visibility: gate graph refcount, send filter, wake on open | ZON-E11, ZON-E22 | last |
| PR-26 | after (b) | ZON-23h2 zone snapshot (zone store, not the value ledger): restore, bad snapshot falls back, wipe on version bump, snapshot never holds kills | ZON-E8 (snapshot half) | after PR-23 |

## 3. Rows that wait

| Group | Rows | Why they wait |
|---|---|---|
| Unscheduled zones rows (OPEN O6) | ZON-23a zone table (ZON-E1), ZON-23e transitions (ZON-E9), ZON-23i layout (ZON-E13), ZON-23j control, ZON-23k determinism (ZON-E14), ZON-23l spatial index (ZON-E12; a dependency of PR-21) | Strategy placed only (a), (b), (c). Lead decides whether 23a and 23l ride with (b) |
| Economy, with the first shop | ECO-R2 vendor and price function, ECO-R3 sinks and fees, ECO-R7 craft payment, ECO-R8 item instance state (only the non-trade part is live), ECO-R10 death cost, ECO-R11 replay of ledger rows, ECO-R12 catalogue field additions, ECO-R13 HUD wallet, ECO-R14 hold-to-confirm, ECO-R16 row 23 sibling economy block, ECO-R17 stamina is not currency (can be a lint at any time) | No shop exists. ECO-R4 inflation guard is INFERRED with no digest support (Strategy C), so it is not proposed |
| Economy, shelf (OFF) | ECO-R5 player trade, ECO-R6 market and auction, ECO-N9 duel wager, ECO-T5, ECO-X4, preset ECO-E2 | Trade and market stay OFF (Dom's standing word) |
| Parties, deferred (after Proof 3) | PAR-E2 (roster, except the cap/alias half already in PR-03) and PAR-E3 to PAR-E7, PAR-E9 to PAR-E12, matchmaking, guild ranks and perks, presence and friends, chat rate limit and shadow mute, mute/ignore, moderation. Rows needing a Dom decision first: guilds at launch, reserve bench, global lobby | Game has no parties, guilds or chat; thinnest evidence of the four topics |
| Camera, experiments | CAM-T09 look-ahead, CAM-T10 stepGlide, CAM-T14 picking with lean, CAM-T15 lateral leash (presets C, D, E) | Experiments; Dom plays A and B first |
| Camera, with A/B | CAM-T02 to CAM-T08, CAM-T11 to CAM-T13, CAM-T16 | Phase 0 to 2 of the camera plan |

## 4. De-duplication log

- PR-01 merges the Pit isolation test stated three times (CAM-T01, PAR-E1, ECO-R15) and adds the zones `frozen` flag.
- PR-02 merges ECO-T12, ECO-T16 and Strategy W4's first test (lint with an empty exception list; same request id twice has one effect).
- PR-03 merges ZON-E16, PAR-E2 / the 3.1 alias test, the existing cap test, and CAM-T23 (the camera's literal 3). Strategy cited parties "E12" for this in its D3 text; in the v2 parties doc E12 is the fuzz; the alias test sits in 3.1 and E2.
- PR-05 merges the D5 lints with W1's first test (CAM-T20). PR-11 and PR-14 are merges; PR-20 reuses CAM-T02.
- ECO-T8 (expiry on a fake clock) and ZON-E18 test the same lazy-deadline rule in two stores; both stay, one rule.
- Not merged on purpose: PR-13 (ECO-T18) and parties XP conservation (PAR-E5): the first fixes the one-record rule, the second tests party pooling on top of it, and parties is deferred.
