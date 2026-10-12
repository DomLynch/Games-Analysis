# Gap check AN (analytics, telemetry, observability) - 2026-10-12 - Frankendom repo commit 8d6ae33a9

## Summary for Dom
- 6 donor notes, all "adapt". After merging two that propose the same file: 0 REUSE-as-is, 4 ADD, 1 SKIP, 1 merged into another ADD.
- Frankendom already counts and logs on the presence server (one stats line a minute, a refused-reason counter, a health endpoint, join and message rate limits), so the new work is small add-ons, not a new system.
- Top 3 additions: (1) one bounded metric/telemetry module with a label cap and drop counter (Nakama + Lichess merged); (2) a rate-limited client error reporter (RuneLite idea); (3) a byte-capped zone log with a live tail (SpacetimeDB idea).
- Skip: the Colyseus zone-population counter, because there is one presence process and its per-layer counts already exist.
- Evennia's input lock: only the log-once part is worth taking, and the presence server already closes noisy sockets.

## Table
| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| AN001 heroiclabs-nakama | Bounded event queue, drop and count, label cap | Presence keeps plain counters and a `refused` map reset every minute (origins/presence/server.ts:65-67); no queue, no label cap | No bounded buffer or per-tick drain; counters are not capped by label | ADD (merged with lila) | `origins/server/telemetry.ts` does not exist; origins/server/ has no telemetry file. Nearest real home: new file there, hooked from origins/presence/server.ts (the counts object) |
| AN002 lichess-org-lila | Metric store with series cap, wait timer in finally | Same presence counters and `/origins/presence/health` JSON (server.ts:84-90); no `/metrics` text endpoint, no wait timer | No series cap, no drop counter, no timed-wait helper | ADD (same module as nakama; one note, one file) | Same `origins/server/telemetry.ts` (new). Keep it read-only on game state. AGPL: clean-room, no donor numbers |
| AN001 clockworklabs-SpacetimeDB | Byte-capped zone log with snapshot-then-follow tail | Presence logs a line via an injected `log` (console.log) each minute (server.ts:35,66); the origins writer uses console.error (origins/server/server.ts:46) | No in-memory tail, no byte cap, no rotation, no sink-error count | ADD (small; low priority) | `origins/server/zone-log.ts` does not exist; new file in origins/server/ or origins/presence/. BSL donor: clean-room, shape only, no donor numbers |
| AN001 colyseus-colyseus | Coalesced counter writes, peer probe with timeout | Single presence process; per-layer player counts in `world.stats()` (origins/presence/interest.ts:143); `world-full` cap at server.ts:149 | Multi-process probing only matters with more than one zone process, which does not exist | SKIP (one process; revisit if zones split) | n/a (proposed `origins/server/population-counter.ts` does not exist) |
| AN002 evennia-evennia | Bounded rejected-input record, log once on lock | Presence closes a socket on message rate (4008) and teleport (4009) and counts refusals by reason (server.ts:192-196, 66); client duel intake has a 429 message (src/net/transport.ts:35) | No per-player record of repeated rejected fight commands, no log-once rule | ADD (only the counting and log-once part; no silent player-facing lock) | `src/fight/intake-throttle.ts`: src/fight/ does not exist (fight code is flat in src/, e.g. src/duel.ts, src/net/pvp.ts). Real nearest: the server input path in origins/presence/server.ts or origins/server/handlers.ts |
| AN002 runelite-runelite | First error sent, cool-down grows, reports dropped count | Client sends an anonymous per-fight perf beacon, silent on failure (src/perf-beacon.ts:1-8); chunk-load errors reload a bar (src/chunk-recover.ts:30); server returns a generic 500 and logs it (origins/server/server.ts:46) | No client error reporter, no global error hook, no storm cool-down | ADD (reuse perf-beacon transport and its no-identity rule) | `origins/client/error-report.ts`: origins/client/ does not exist. Real nearest: src/perf-beacon.ts (client, transport to Supabase); a table would be a Backend migration in supabase/migrations/ |

## Merges
- Nakama and Lichess both propose `origins/server/telemetry.ts`: build once (queue, label cap with drop counter, per-minute series count, timed wait with finally).
- The Evennia and RuneLite notes are the same shape (first-send, then suppress, count what was dropped): share one small rate-limit helper.

## Not verified
- Whether the origins writer has any rate limit on its ops (only grep for 429 and cooldown was run; not read in full).
- Whether anything outside origins/ and src/ (scripts/, tests/) already counts telemetry.
- No tests were opened to confirm the presence counters are pinned.
