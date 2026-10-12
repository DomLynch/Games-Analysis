# veloren-veloren (server-performance-scaling, cell 1)

Donor: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/entity_sync.rs` (with `server/src/sys/subscription.rs`, `common/src/region.rs`, `common/src/comp/presence.rs`, `common/src/clock.rs`, `server-cli/src/main.rs`, `server/src/lib.rs`) | Licence: GNU GPL version 3 (LICENSE line 1-2: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"); copyleft, clean-room only | Rust | symbol `Sys::run` (entity_sync.rs, the send gate at 276-296)

Checked: Read in full: entity_sync.rs 66-108 and 130-300 (region loop, send gate) and 396-416 (last-value update); subscription.rs 60-240 (subscription update and region join); region.rs 55-65, 250-310 (region size, key, region_in_vd); presence.rs 1-20 (fuzz constants); comp/presence.rs 94-165 (view-distance debounce); clock.rs 1-200 (clock); server-cli main.rs 290-330 (the server loop); lib.rs 165-200 and 790-930 (tick order). Callers: `Sys::run` runs through `run_sync_systems` (server/src/sys/mod.rs:51); I read the one call site (lib.rs:911) and not the dispatcher. Camera: not applicable (server topic). camera_scope: n/a. Confidence: high on the send gate, the subscription rule and the clock. Medium on the prepared-message reuse (read, not run). Not read: client-side handling of CompSync and of the force-update counter; any per-tick work cap (none found by grep for budget, throttle, shed, backpressure in server/src, common/src).

## 1. Mechanism

- Frame. The server runs at a fixed target of 30 ticks per second (`TPS`). Each `Server::tick` increments a tick counter (lib.rs:793), runs the state tick (877), handles events, updates the region map, applies terrain, runs the sync systems (911), then ticks the world (916). The sync is one pass per server tick.
- Clock. The loop sleeps only the remainder of the target dt after busy work (clock.rs:149-150). If the work overruns, there is no sleep and no catch-up: the game dt is `average_dt + (real - game) * 0.05`, capped at 0.2 s (clock.rs:51, 53, 174-175). Game time is clamped to real time (163). So a slow tick makes game time run slower than real time, bounded by the cap, instead of bursting to catch up.
- Interest. The world is a grid of 512-block regions keyed by `pos >> 9` (region.rs:62, 252). A client subscribes to the regions within its view distance (subscription.rs:173 and 224 call `regions_in_vd`, which tests each candidate region with `region_in_vd`; region.rs 268-300). The subscription is recomputed only when the client moves past a fuzzy chunk border or its view distance changes (subscription.rs:88-90). Newly subscribed regions send `CreateEntity` for each entity in them (180; the donor marks this with a TODO to batch at 200). Fuzz constants: chunk 2, region 16 (presence.rs:7, 9).
- Send rate. For each region, for each subscribed client, for each entity in the region: a voxel-collider object is always sent (271); the client's own body follows its own rule; any other entity gets a distance `d` from the client body (279), and its position, velocity and orientation are sent only when `(tick + entity.id) % period == 0` (280, 284-294). Periods by distance: over 500 blocks 32 ticks, over 300 blocks 16, over 200 blocks 8, over 120 blocks 6, over 64 blocks 3, over 24 blocks 2, otherwise every tick. The per-entity phase (its id) spreads the sends across the period. The send is the full absolute `Pos`, not a delta.
- Staleness. After every sync the last-value record is replaced for every entity (412), whether or not it was sent. An unsent change is not queued; the next send for that entity carries the current absolute value. Worst case, a client sees an entity's position up to 32 ticks (about 1.07 s at 30 Hz) late. A stationary entity is still re-sent every period.
- Batching. Tracked non-physics components for a region are packed once into an EntitySync and a CompSync message, prepared with `client.prepare` (229-233), and the same prepared bytes are sent to every subscriber in that region (242). Per-client physics go in a separate package per client (250-300). The donor marks the Left/Delete path as unbatched (207).
- Same stagger elsewhere: the wind update is sent to one in 30 clients per tick (weather/tick.rs:172).

## 2. Key functions

- `Sys::run` (entity_sync.rs 66-108 setup; 138-236 region loop; 271-300 send gate; 396-416 last-value update): the one place where entity state is sent to clients each tick.
- Send gate block: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/entity_sync.rs` 276-296 (distance, phase, band period).
- Subscription update: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/subscription.rs` 82-200 (fuzzy chunk check, region removal, region join).
- `region_in_vd` and `regions_in_vd`: `/mnt/frankendom-donors/veloren-veloren/common/src/region.rs` 268-300 (not all lines quoted).
- Clock: `/mnt/frankendom-donors/veloren-veloren/common/src/clock.rs` 124-177 (sleep remainder, dt nudge, cap).
- View-distance debounce: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/presence.rs` 101-165 (a reversal within 300 ms of the last change is deferred; the same direction applies at once).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Send period by distance band, far entities less often | Bands 500 / 300 / 200 / 120 / 64 / 24 blocks, periods 32 / 16 / 8 / 6 / 3 / 2 / 1 ticks (theirs, entity_sync.rs 283-295) |
| Per-entity phase so sends spread out | `tick + entity.id` (theirs, entity_sync.rs 280); note the donor comment: "Note this doesn't account for dt" (lib.rs 172), so periods are in ticks, not seconds |
| Fixed-rate tick with sleep for the remainder | 30 ticks per second (theirs, server-cli main.rs 49, 299) |
| Game dt tracks real time without bursting | Nudge 0.05 (clock.rs 51), dt cap 0.2 s (clock.rs 53) |
| Region grid for interest | 512 blocks, `REGION_LOG2 = 9` (theirs, region.rs 62) |
| Hysteresis on subscription edge | Chunk fuzz 2, region fuzz 16 (theirs, presence.rs 7, 9) |
| Debounce on view-distance direction reversal | 300 ms (theirs, comp/presence.rs 103) |

## 4. TypeScript sketch

simplified: the sketch keeps the band table and the phase rule only. It omits the region subscription, the fuzzy chunk border, the physics-versus-tracked split, the per-client packages, the prepared-message reuse, and the staleness bookkeeping (last-value replacement). It reorders nothing: the voxel and always-send case is a flag supplied by the caller. Periods are in ticks, as in the donor; Frankendom should convert to seconds (see section 6).

```ts
// Licence: GPL-3.0 (donor LICENSE). clean-room: written from the described rule, not a translation of the donor lines.
// clean-room
export interface Vec3 { x: number; y: number; z: number }

// Distance bands in blocks. Checked from the farthest band inwards; the first band
// whose distance the target is beyond sets how many server ticks pass between sends.
const BANDS: ReadonlyArray<{ beyond: number; everyTicks: number }> = [
  { beyond: 500, everyTicks: 32 },
  { beyond: 300, everyTicks: 16 },
  { beyond: 200, everyTicks: 8 },
  { beyond: 120, everyTicks: 6 },
  { beyond: 64, everyTicks: 3 },
  { beyond: 24, everyTicks: 2 },
];

export function sendPeriodTicks(distance: number): number {
  const d2 = distance * distance;
  for (const band of BANDS) {
    if (d2 > band.beyond * band.beyond) return band.everyTicks;
  }
  return 1; // within 24 blocks: every tick
}

// Each entity has its own phase (its id added to the tick counter), so the sends for
// many entities spread across the period instead of all landing on the same tick.
export function sendThisTick(
  tick: number,
  entityId: number,
  client: Vec3,
  target: Vec3,
  alwaysSend: boolean, // e.g. voxel-collider objects, or the client's own body
): boolean {
  if (alwaysSend) return true;
  const dx = client.x - target.x;
  const dy = client.y - target.y;
  const dz = client.z - target.z;
  const period = sendPeriodTicks(Math.sqrt(dx * dx + dy * dy + dz * dz));
  return (tick + entityId) % period === 0;
}
```

Typecheck: copied to the VPS at /tmp/SP001-veloren-send-bands.ts and run `npx -y -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `origins/server/entity-sync.ts` (proposed new module next to the zone population code; the name is not checked against the Frankendom repo). The gate is server-side only; the client renders what it receives.
- Parity-checklist row 18 (the row is "loot roll and XP award"; the server tick has no row of its own, so this cites the sub-line "server tick: fixed step, input intake, per-tick NPC budget", which the send gate belongs under).
- today: no equivalent file in Frankendom known to this read (not checked).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, server-verified kills: the send cadence changes only what clients see, never the outcome); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch is written from the rule.
- Frankendom rulings: kills and hits must be decided on every tick. Only the send cadence is banded. A hit at tick N must resolve at tick N; a test should assert that a banded-out NPC still takes damage on the tick it is hit.
- Fight participants: the donor sends an entity within 24 blocks every tick. Frankendom's fight has MAX_ATTACKERS = 3, so the always-full-rate set is small. Keep those entities always-send rather than banded.
- Ticks, not seconds: the donor counts periods in ticks and says so (lib.rs 172). If TPS changes, the send rate changes. Frankendom should state periods in seconds and convert to ticks once.
- No backpressure: the outbound channel per connected peer is unbounded (network/src/participant.rs:162), and `send_fallible` discards errors (server/src/client.rs:155). A slow phone client grows memory without limit. Frankendom needs a per-client queue budget and a drop or coalesce rule.
- No per-tick work cap: the region loop is clients times entities per region (entity_sync.rs 138-300); grep for budget, throttle, shed found nothing for the sync path. The "per-tick NPC budget" sub-line in row 18 is not covered by this donor.
- Shared package force counter (read, not run): the region package's CompSync is built with the force-update counter of the first subscriber (entity_sync.rs 233-236) and reused for every subscriber. Do not copy that shortcut for per-player data; check the client's use of the counter before relying on it.
- Load behaviour: when a tick overruns, the donor does not catch up (clock.rs 149-150) and game time slows, capped at 0.2 s. Frankendom's fight must not change speed with load: decide whether the fight runs on a fixed step with a budget or drops work, and test it.
- Unbatched events: the Left and CreateEntity paths send one message per entity (donor TODOs at entity_sync.rs 207 and subscription.rs 200). Do not copy that for many-on-one events.

Best transferable idea: Send far entities' state every N ticks with a per-entity phase (N from distance bands), and keep fight participants at full rate, since a send cadence changes only what clients see.

Decision (proposed): adapt - keep the banded cadence and per-entity phase for far zone NPCs; keep the fight set (player plus up to MAX_ATTACKERS = 3) always-send; state periods in seconds; add the per-client queue budget the donor lacks.

Acceptance: a server test with 60 NPCs placed 0-600 blocks from one player counts sends per entity over 30 s: NPCs within 24 blocks sent every tick (30 Hz), NPCs beyond 500 blocks every 32 ticks, and a hit landed on a banded-out NPC still resolves on the tick it lands.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine; server-verified kills); row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget"
