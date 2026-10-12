# Server performance and scaling - design brief (2026-10-12)

Status: **parked until before launch.** Nothing here is started. Repo read at commit 8d6ae33a9 (read-only).

## 1. Goal
Keep the town (presence server) smooth for 100 players now, and know exactly what to change to reach 1,000 and 10,000 at once. Three jobs: never let a slow tick snowball, never let a slow phone eat server memory, and stop paying database cost per player. We do it by measuring first and building only what the numbers demand.

## 2. What we have today
- Tick every 100 ms (10 Hz): `origins/presence/interest.ts:12`. The ticker is aimed at the wall clock, polls every 25 ms: `origins/presence/server.ts:46-62`. No drop of late ticks, no counter for them.
- Layer size: 80 soft, 100 hard (`interest.ts:13-14`). Default 8 layers (`origins/presence/main.ts:23`, `PRESENCE_MAX_LAYERS`), so about 640 joinable. One Node process.
- Interest: 16 m grid, 40 m radius, nearest 40, send rate 10/5/2 Hz by distance, per-entity phase (`interest.ts:9-13`, `seenBy`). Packet is about 12 bytes per entity, one packet per client per tick (`origins/presence/wire.ts`).
- Tick timing is recorded (40,000 samples, `server.ts:18`, `origins/presence/ticks.ts`); spec target: longest under 50 ms, p99 under 25 ms. No measured result is in the repo.
- Limits per connection: 8 sockets per IP, 30 joins/min, 30 msgs/s, 64-byte message, 30 s idle (`server.ts:16`).
- No send backpressure: every packet is written straight to the socket (`server.ts:55`).
- Saved location: sent on leave and every 60 s (`origins/server/location.ts:4`); the presence-side sender was not found, so unverified.
- Every database call from the writer starts a `psql` process (`origins/server/db.ts:15-33`); an open can start up to 51. No pool. This breaks first.
- Duels are client-run and server-replayed (`origins/server/encounter-verify.ts`): no live server fight loop, no server NPCs. Duel relay is a separate process (`scripts/duel-relay.mjs:33`).
- Everything (presence, writer, verifier, relay) sits on one VPS (`docs/specs/origins/one-shard.md` section 6).

## 3. Budgets
Every number is **proposed, needs a load test** unless marked measured. Nothing is measured yet. Bytes use the one-shard spec's own estimate (12 bytes per entity, worst 3.6 KB/s per client), not donor figures.

| Budget | 100 concurrent | 1,000 | 10,000 |
|---|---|---|---|
| Players per layer | 80 soft / 100 hard (proposed, needs a load test) | same | same |
| Layers | 2 | 13 | 125 |
| Processes / hosts | 1 process | presence on its own host, 2-4 processes | many hosts, add at 80% of one host's measured cap (Dom ruling) |
| Tick rate | 10 Hz (proposed, needs a load test) | 10 Hz | 10 Hz; layers share nothing, so no change |
| Bytes per client per second, worst case | 3.6 KB/s down, under 1 KB/s up (proposed, needs a load test) | same | same; total out about 36 MB/s worst (proposed, needs a load test) |
| Persistence writes per second (location, every 60 s) | about 2 | about 17 | about 170; needs batching, not one `psql` each (proposed, needs a load test) |
| CPU per tick, per process | p99 under 25 ms, max under 50 ms (existing spec target) | same, per process; layers per process set by the test | same, per process |
| Outbound queue per socket | skip a viewer's tick when its socket backlog is over a set size (size proposed, needs a load test) | same | same |
| Dropped ticks | counted; target zero in normal play (proposed, needs a load test) | same | same |

Chat and packs (from CT.md and MD.md): chat text is not in the pose wire yet; its budget must be separate from the pose budget, so a chat flood cannot slow movement. Packs are Dom-only publish before beta, loaded once at start, not per tick, so they add no tick cost; the cost is memory and start time.

## 4. Build order (all parked until before launch)
1. **Load test first.** 100-bot run, then find one host's player limit (the existing cluster/bot test, `origins/presence/cluster.ts`). Replaces every "proposed" above. Source: gap-check SP.md scaling section; no donor.
2. **Drop-on-overrun ticker with a cap on catch-up and a dropped-tick counter.** From SP002 colyseus (cap of 5 steps, drop the backlog; MIT) and SP004 OpenDAoC (shape only). Lands in `origins/presence/server.ts:46-62`.
3. **Per-socket send backpressure and shedding rule.** From SP003 ioq3 and SP002 SpacetimeDB (shape only): check `sock.writableLength` before the write at `origins/presence/server.ts:52-58`, skip that viewer for this tick, count it, close a socket that stays stuck.
4. **Database path: pool or batch the location write and stop one `psql` per call.** Not a donor idea; found by gap-check SP. Lands in `origins/server/db.ts:15-33` and `origins/server/location.ts`. This is the real 1k blocker.
5. **Enter/leave events and changed-only sends.** From SP004 swgemu, SP001 Trinity, SP003 teeworlds (changed-only part), shape only, clean-room. Lands in `origins/presence/interest.ts` (`seenBy`, per-player seen set) and `origins/presence/wire.ts` (a leave record). Low priority; only if the test shows bandwidth matters.
6. **Split presence to its own host, then more hosts.** One-shard.md section 5 first scaling step. From SP004 ACE we keep only idle unload, which already exists as `World.sweep` (`interest.ts`).

Already have, reuse as is: nearest-first cap and banded rates (SP001 Veloren, SP003 LostCityRS shape) in `interest.ts`.

## 5. What we are NOT doing, and why
- No server fight loop, NPC gate, or timer wheel (SP001 EQEmu, SP002 ModernUO): no server NPCs or fight timers exist. Revisit only if server NPCs are built.
- No acked-base delta snapshots (SP003 teeworlds): our packets stand alone and WebSocket is reliable.
- No encode-once fan-out (SP002 SpacetimeDB): viewers differ and cost is small at 100 per layer.
- No zone shards (SP004 ACE): one single-threaded process, small layers.
- No Supabase Realtime for movement (Dom ruling, one-shard.md section 5): limits and cost.
- No player-chosen layers, no queue as the main answer: capacity is bought ahead (Dom ruling).
- No donor code or numbers for GPL, AGPL or BSL donors; shape only, clean-room.

## 6. Metrics to read (names only; see the analytics brief, docs/gap-check/AN.md)
`maxTickMs`, tick p50/p99/max (`ticks.ts`), dropped-tick count (new), send-skipped count (new), packets and bytes per layer per minute, players per layer, layers open, refused-by-reason counts, location-write count and latency (new), database call latency (new), socket count.

## 7. Open questions for Dom
1. Who sets the player target for launch day? Recommend: plan for 1,000 at once, buy hosts for 10,000 only when the test shows 80% of one host.
2. Does presence move to its own host before beta? Recommend: yes, before the load test, so the test reads a clean box.
3. May the location write drop to every 120 s to halve database cost? Recommend: yes, plus on leave; nothing pays from it.
4. When a phone cannot keep up, skip its updates or kick it? Recommend: skip first, kick after 10 s stuck.
5. Do we load-test with bots on the VPS or on a rented box? Recommend: a separate rented box, so test traffic does not compete with the server.

## 8. Sources
Gap-check: SP.md, CT.md, MD.md, AN.md. Donor notes: SP001 (Veloren, TrinityCore, EQEmu), SP002 (colyseus, SpacetimeDB, ModernUO), SP003 (ioq3, teeworlds, LostCityRS-Engine-TS), SP004 (OpenDAoC, swgemu-Core3, ACEmulator). Repo: `docs/specs/origins/one-shard.md`.
