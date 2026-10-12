# Analytics and telemetry design brief (AN)
Date 2026-10-12. Status: **parked until before launch. Nothing here is started.** Repo read-only at commit 8d6ae33a9.

## 1. Goal
Know whether Frankendom is healthy and fun, from numbers alone, without spying on players. We count things (ticks, fights, refusals, errors), never people. No names, no account ids, no IPs, no chat text in any metric.

## 2. What we have today
- Presence stats line once a minute, with a refused-reason counter that resets: `origins/presence/server.ts:39-41, 66-67`.
- Health JSON at `/origins/presence/health`, with tick times on loopback only: `server.ts:73-90`. Tick ring of 40,000 samples: `server.ts:18`, `ticks.ts`.
- Per-IP and per-socket limits: `server.ts:16, 135-139, 190-196`.
- Anonymous per-fight perf beacon, silent on failure, no user id: `src/perf-beacon.ts:1-8, 63-85`; table `supabase/migrations/202609280001_perf_beacons.sql`.
- Duel connection metrics (path, rollbacks, stalls, round trip), no user id/IP, 60 rows a minute cap, 90-day delete: `supabase/migrations/202609300001_duel_metrics.sql:1-12`.
- Writer logs errors with `console.error`: `origins/server/server.ts:46`.
- Missing: no label cap, no drop counter, no client error reporter, no zone log tail, no fight or economy counters.

## 3. Metric list (every threshold is **proposed**)
| Area | Metric | How measured | Who reads | Alert (proposed) |
|---|---|---|---|---|
| Server health | tick time p99 and max | existing tick ring | Dom, ops | p99 over 25 ms or max over 50 ms (the spec target in `ticks.ts:1`) |
| Server health | refused joins by reason | existing `refused` map | ops | any one reason over 100 a minute |
| Server health | players per layer | `world.stats()` | Dom | any layer over 80 (the soft cap) |
| Server health | telemetry dropped | new drop counter | ops | over 0 for 5 minutes in a row |
| Client performance | fps p50 and p5 per device class | perf beacon | Dom | p5 under 30 on phones |
| Client performance | time to first fight | beacon `first_fight_s` | Dom | median over 10 s |
| Client performance | client errors, first-of-storm | new reporter, count of drops | Dev | over 20 distinct a day |
| Fight/game balance | win rate by weapon and kit | settled fights, aggregated counts only | Dom | any weapon over 60 percent over 200 fights |
| Fight/game balance | median duel length | settled fight record | Dom | outside 20 to 60 s |
| Fight/game balance | rollbacks a minute, stalls a minute | `duel_metrics` | Dev | median over 10 rollbacks a minute |
| Economy and trading | trades per day, refused trades by reason | writer counters | Dom | refusals over 30 percent of tries |
| Economy and trading | currency made minus spent per day | writer counters | Dom | drift over 20 percent in 7 days |
| Safety/moderation | reports filed, mutes issued | counters (chat is not built yet) | Dom | reports over 2 percent of active players a day |
| Safety/moderation | repeat rejected fight commands (counts only) | log-once record, spec says no auto-ban from one timing signal (`GAME_SPEC.md:187`) | Dom | review list only, no action by machine |
| Onboarding funnel | page load, first fight started, first fight finished, voluntary rematch after a loss | counters per step | Dom | finish rate under 70 percent |

## 4. Privacy rules and the drop counter
- No personal data in a metric: no account id, name, IP, chat text or exact position. Beacon rows already follow this (`perf-beacon.ts:1-8`).
- Label cap: each metric name holds a fixed number of label values (proposed 50); a new value past the cap is refused and counted.
- Retention (proposed): per-fight rows 90 days, matching `duel_metrics`; minute counters 30 days; zone log in memory only, byte-capped.
- Opt-out for kids: **the specs say nothing about children or age**, so no rule is cited. See question 2.
- The spec says Phase 0A has "no D1 analytics" and no fake match history (`GAME_SPEC.md:48`); this brief stays inside that until Dom lifts it.
- Drop counter: telemetry goes into a bounded buffer, a fixed number drained per tick. When full, the event is dropped and `dropped` goes up. Telemetry never blocks, never throws, never changes a fight result. A test must prove a full queue gives the identical outcome.

## 5. Dashboards Dom would look at (max 4)
1. **Is it up?** Players online, tick p99, refused joins a minute, layers over 80, telemetry dropped.
2. **Does it run on phones?** fps p50, fps p5, time to first fight, client errors a day, share of devices capped at 30 Hz.
3. **Are fights fair and fun?** Duel median length, win rate spread by weapon, voluntary rematch rate after a loss, rollbacks a minute, relay share.
4. **Economy and safety.** Trades a day, refused trade rate, currency made vs spent, reports filed, mutes issued.

## 6. Build order (parked until before launch)
1. One telemetry module: bounded queue, label cap, drop counter, timed wait with `finally`. Donor AN001 heroiclabs-nakama and AN002 lichess-org-lila (merged). Lands in new `origins/server/telemetry.ts`, hooked from `origins/presence/server.ts` (counts, line 39). Clean-room, no donor numbers (lila is AGPL).
2. Client error reporter: first error sent, cool-down, dropped count. Donor AN002 runelite-runelite. Lands beside `src/perf-beacon.ts` (reuse its send function, line 77) with a Backend table in `supabase/migrations/`.
3. Fight and funnel counters on the same module: settled-fight counts, trade refusals. Donor AN001/AN002 module above. Lands in `origins/server/handlers.ts` and `origins/server/encounter-verify.ts`.
4. Rejected-command counter, log once. Donor AN002 evennia-evennia. Lands in `origins/presence/server.ts` (near line 192; the gap-check's `src/fight/` path does not exist). Counting only, no silent player lock.
5. Byte-capped zone log with live tail. Donor AN001 clockworklabs-SpacetimeDB (BSL: shape only). Lands in new `origins/server/zone-log.ts`. Low priority.

## 7. What we are NOT doing
- No per-player profiles, no session replay, no ad or third-party trackers.
- No auto-bans from telemetry (`GAME_SPEC.md:187`).
- No Prometheus stack or full metrics server; one JSON endpoint is enough.
- No zone-population counter across processes (Colyseus idea skipped: one presence process).
- No retention analytics before the spec allows it.

## 8. Open questions for Dom
1. Where do the 4 dashboards live? Recommend: a private page reading the Supabase tables plus the health JSON.
2. Do kids play? If yes, we need an age rule; the specs have none. Recommend: no analytics beyond anonymous counts for anyone, so no opt-out is needed.
3. Keep 90-day retention? Recommend yes, same as `duel_metrics`.
4. Who gets alerts? Recommend: one daily summary to Dom, pages only for "server down".
5. Are fight win-rates counted from the first public test? Recommend: yes, aggregated only, never per player.

## 9. Sources
Gap-check: `docs/gap-check/AN.md`, `SP.md`, `CT.md`. Donor notes: `/private/tmp/p2/wave2-haiku/batch3/AN001` and `AN002` (nakama, lila, SpacetimeDB, runelite, evennia, colyseus; Decision and Acceptance lines). Repo: `src/perf-beacon.ts`, `origins/presence/server.ts`, `origins/server/handlers.ts`, `supabase/migrations/202609280001_perf_beacons.sql`, `202609300001_duel_metrics.sql`, `GAME_SPEC.md:48, 166, 187`, `docs/specs/origins/launch-gates.md` (S4).
