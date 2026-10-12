# colyseus-colyseus (analytics-telemetry-observability, cell 2)

Donor: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Stats.ts` (main), with `MatchMaker.ts` (health check, sweep, CCU hooks) and `utils/Utils.ts` (constants) | Licence: MIT License, "Copyright (c) 2015-2026 Endel Dreyer" (`/mnt/frankendom-donors/colyseus-colyseus/LICENSE`) | TypeScript | symbols `persist`, `fetchAll`, `healthCheckProcessId`, `startSweptCheck`

Checked: Read end to end: `core/src/Stats.ts` (all 106 lines). `core/src/MatchMaker.ts` read at 156-170, 176-192, 672-684, 1104-1222, 1325-1345, 1366-1388 (and, after the checker pass, `restoreIfSwept` 1222-1255; not read: the room-creation path, the presence driver). `utils/Utils.ts` 44-51 by grep (constants). `database/src/services/AnalyticsService.ts` (all), `database/src/plugins/analytics.ts` (all), `admin/src-backend/system/endpoint.ts` (all), `admin/src-backend/dashboard/widgets.ts` at 218-245, 334-368, 435-462 (not read: liveRooms and recentUsers bodies). Licence line read. Confidence: high on `Stats.ts`, the probe dedupe and the sweep/restore handshake; no periodic probe exists anywhere in `packages/`. Parity hint was row 4 (fight loop); the counters here are per-process population counts, so I used row 23 (zone population). The health probe is server ops and has no row of its own.

## 1. Mechanism

- Each process keeps two local integers: `roomCount` (rooms it hosts) and `ccu` (clients connected). `MatchMaker.ts` increments/decrements them on room create (680), room dispose (1378), client join (1332) and client leave (1340).
- Publishing is coalesced (`Stats.ts` 31-54). Every change calls `persist()`. If more than `persistInterval` = 1000 ms has passed since the last write (line 46), it writes at once: `hset('roomcount', processId, "roomCount,ccu")` (48). Otherwise it cancels the pending timer (51) and sets a new one for 1 s later (52). So the last value in a burst is written after the burst ends.
- Heartbeat: `setAutoPersistInterval` (89-98) writes every 60 s if nothing was written for 60 s (line 90). Its FIXME (`MatchMaker.ts` 181-184) says it exists because a live process can be excluded by mistake after a failed probe; it comes back on its next write.
- Global count: `fetchAll` (13-29) reads the whole hash with `hgetall` and returns one row per process. Its own process is read from local memory (20); the others are parsed from `"roomCount,ccu"` (23). `getGlobalCCU` sums `ccu` (79-82). The read is not cached (TODO at line 14).
- Sweep (`startSweptCheck`, `MatchMaker.ts` 1201-1220): every 5 s (`SWEPT_CHECK_INTERVAL`, 5000 ms default) it calls only `restoreIfSwept()` (1209) and skips a tick if the last one is still running (1205). `restoreIfSwept` (1226-1233): a stalled process that finds its own "swept" receipt deletes it, then `restoreMissingRoomCaches` (1235-1255) re-creates the listings of its rooms that are missing from the driver. This is the self-heal for a process a peer excluded by mistake.
- Liveness probes are NOT periodic. `healthCheckAllProcesses` (1109-1123, probes every process with no live presence channel) runs once at boot (176); `healthCheckProcessId` (1130-1184) also runs when a seat reservation times out on IPC (979, 1037). The probe is an IPC request with a 2 s timeout (`REMOTE_ROOM_SHORT_TIMEOUT`, `Utils.ts` 44). The remote side answers `true` to any `healthcheck` request (162-164). A dead process therefore leaves the sum only when a boot check or a failed seat reservation probes it, not at the next 5 s sweep.
- Stats writes are skipped while the matchmaker is `SHUTTING_DOWN` (`Stats.ts` 37-39).
- Dedupe: `_healthCheckByProcessId` (1129) holds one in-flight promise per process id. A second caller gets the same promise (1135-1136). The entry is deleted in `finally` (1179), so a finished probe is not reused.
- On a failed probe (1158-1171): exclude the process from the counts (`excludeProcess`, 1164), remove its rooms, then write a "swept" receipt with a 600 s TTL (1171). The receipt is written after the removal, with a comment saying why.

## 2. Key functions

- `persist`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Stats.ts` 35-54. The coalesced write, with a trailing timer.
- `fetchAll`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Stats.ts` 13-29. Reads the shared hash; the local process uses memory.
- `getGlobalCCU`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Stats.ts` 79-82. Sum over processes.
- `setAutoPersistInterval`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Stats.ts` 89-98. 60 s heartbeat.
- `healthCheckAllProcesses`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/MatchMaker.ts` 1109-1123. Chooses which processes to probe.
- `healthCheckProcessId`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/MatchMaker.ts` 1130-1184 (map at 1129). Probe with timeout, dedupe, and cleanup on failure.
- `startSweptCheck`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/MatchMaker.ts` 1201-1220. Fixed-interval sweep with a re-entry guard; its body is `restoreIfSwept` (1226-1233), not a probe.
- Admin health: `/mnt/frankendom-donors/colyseus-colyseus/packages/admin/src-backend/system/endpoint.ts` 20-37. One-row select, returns latency; 503 on failure.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Write at most once per window; trailing write for the last change | Window 1000 ms (theirs, `Stats.ts` 33) |
| Periodic heartbeat so a removed process rejoins | 60 s (theirs, `Stats.ts` 90) |
| Probe with a short timeout, then mark dead | 2000 ms (theirs, `utils/Utils.ts` 44; env override `COLYSEUS_PRESENCE_SHORT_TIMEOUT`) |
| Sweep on a fixed interval (restore-if-swept check), skip if still running | 5000 ms (theirs, `utils/Utils.ts` 50) |
| Receipt that stops a stale process restoring its rooms | 600 s TTL (theirs, `utils/Utils.ts` 51) |
| Global count cache | none; open TODO (theirs, `Stats.ts` 14) |

Suitability: the 1 s write window and 60 s heartbeat are fine for a small Node server, since writes happen on join and leave, not per tick. The 2 s probe is too slow for a 20 Hz game: a process can miss 40 ticks before it is declared dead. Suggestion, not donor: 300-500 ms probe timeout for a zone process. The 5 s restore sweep is fine; the probe itself is event-driven, not periodic.

## 4. TypeScript sketch

simplified: the donor writes through a presence driver and reads the whole hash on every call. This sketch takes a `HashStore` interface in place of presence. It fixes two donor defects: the immediate-write branch leaves a pending trailing timer alive (cleared here), and the global sum has an open TODO to cache (cached here for `cacheMs`). It also guards the probe against a synchronous throw so the in-flight entry is always removed. It omits the PM2 metric export, the room removal that follows a failed probe, the swept receipt, the restore-if-swept handshake and the non-overlapping sweep interval.

```ts
// Licence: MIT (donor, colyseus-colyseus; LICENSE "MIT License", (c) 2015-2026 Endel Dreyer). Shape adapted; written fresh, not a line translation.

export interface PopulationRow { roomCount: number; ccu: number }

// Stands in for the shared presence hash (donor: presence.hset / presence.hgetall).
export interface HashStore {
  hset(key: string, field: string, value: string): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
}

export class PopulationCounter {
  roomCount = 0;
  ccu = 0;
  private lastWrite = Number.NEGATIVE_INFINITY;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly store: HashStore,
    private readonly processId: string,
    private readonly intervalMs = 1000,   // ms: donor persistInterval = 1000
    private readonly now: () => number = () => Date.now(),
  ) {}

  // Call after every change to roomCount or ccu. Writes at most once per intervalMs.
  // A change inside the window schedules a trailing write, so the last value is always stored.
  publish(force = false): void {
    const t = this.now();
    clearTimeout(this.timer); // fix: donor's immediate branch does not clear the pending timer
    this.timer = undefined;
    if (force || t - this.lastWrite > this.intervalMs) {
      this.lastWrite = t;
      this.store.hset("roomcount", this.processId, `${this.roomCount},${this.ccu}`).catch(() => undefined);
      return;
    }
    this.timer = setTimeout(() => this.publish(), this.intervalMs);
  }
}

// Sum over all processes. Donor reads the hash on every call (TODO: cache). Here the sum is cached for cacheMs.
export class GlobalPopulation {
  private cached: { at: number; total: PopulationRow } | undefined;

  constructor(
    private readonly store: HashStore,
    private readonly cacheMs: number,     // ms: proposed 1000 (donor: none)
    private readonly now: () => number = () => Date.now(),
  ) {}

  async total(): Promise<PopulationRow> {
    const t = this.now();
    if (this.cached !== undefined && t - this.cached.at < this.cacheMs) {
      return this.cached.total;
    }
    const all = await this.store.hgetall("roomcount");
    const total: PopulationRow = { roomCount: 0, ccu: 0 };
    for (const value of Object.values(all)) {
      const [rooms, ccu] = value.split(",").map(Number);
      if (!Number.isFinite(rooms) || !Number.isFinite(ccu)) continue;
      total.roomCount += rooms;
      total.ccu += ccu;
    }
    this.cached = { at: t, total };
    return total;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// One liveness probe per peer at a time. A probe that fails or times out returns false.
export class ProbeGate {
  private inFlight = new Map<string, Promise<boolean>>();

  constructor(
    private readonly ping: (peerId: string) => Promise<void>,
    private readonly timeoutMs: number,   // ms: donor REMOTE_ROOM_SHORT_TIMEOUT, default 2000
  ) {}

  probe(peerId: string): Promise<boolean> {
    const existing = this.inFlight.get(peerId);
    if (existing !== undefined) return existing;

    const attempt = async (): Promise<boolean> => {
      await Promise.resolve(); // yield first, so the map entry below is set before the finally runs
      try {
        await withTimeout(this.ping(peerId), this.timeoutMs);
        return true;
      } catch {
        return false;
      } finally {
        this.inFlight.delete(peerId);
      }
    };

    const p = attempt();
    this.inFlight.set(peerId, p);
    return p;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/an001-colyseus-counter.ts`).

## 5. Lands in

- TARGET `origins/server/population-counter.ts` (new): `PopulationCounter` runs in each zone process and is called on every zone join, leave, zone create and dispose. `GlobalPopulation` feeds the per-zone population caps and the "all zones" totals. `ProbeGate` is the liveness probe for other server processes.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). Hint was row 4; not used, because counting clients per process does not change aggro, chase or leash.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, this sketch was written fresh)
- Brief rule served: 1 (one engine: the counter is a read-only view of the zone runtime); rule 3 (kills stay server-verified; population never decides a kill)

Best transferable idea: publish per-process counters through one coalesced write (at most one per second, with a trailing write for the last change), and probe peers with one in-flight check per id and a short timeout, so a dead zone process can be probed and dropped from the population sum without any blocking call, and a falsely excluded one restores its own listings from a swept receipt.
Decision (proposed): adapt — keep coalesced writes, the trailing write, the per-id probe dedupe, the sweep guard and the swept-receipt restore handshake (`restoreIfSwept`); add a periodic probe, since the donor has none; use a 300-500 ms probe timeout for a 20 Hz zone process, not 2 s, and add a cached global sum.
Acceptance: a test runs a join burst of 500 clients within 1 s and asserts at most 2 counter writes in that second and a final write within 1 s of the last join; a test kills one fake zone process's ping and asserts its probe returns false within 500 ms and its count is absent from the total once the periodic probe (added; the donor probes only at boot and on seat-reservation timeout) has run; a second test stalls a process, lets a peer exclude it and write a receipt, and asserts the next 5 s sweep re-creates its room listings.

## 6. Gaps and risks

- Defect (fix: clear the timer): on the immediate-write branch the pending trailing timer is not cleared (`Stats.ts` 46-49), so a stale timer fires later and writes again. Harmless but wasteful. Fix: clear the timer on every call (sketch `publish`).
- Defect (fix: cache it): `fetchAll` reads the whole hash on every call (`Stats.ts` 14-16). At many processes this is a read on each join. Fix: cache the sum for about 1 s (sketch `GlobalPopulation`).
- Defect (fix: drop the workaround): the FIXME (`MatchMaker.ts` 181) says a healthy process can be excluded by mistake. Recovery is the next write (up to 60 s later) plus the swept-receipt restore (`restoreIfSwept`, 5 s sweep) that re-creates its room listings. Fix: keep the receipt handshake, add a short heartbeat, and have the sweep treat an excluded id as live only after it writes again.
- Defect (fix: lower the timeout): a 2 s probe (`Utils.ts` 44) lets a 20 Hz zone miss 40 ticks before the sweep acts. Fix: 300-500 ms.
- Probe meaning: the remote side answers `true` (`MatchMaker.ts` 162-164) if its IPC handler responds. That shows the event loop is free within the timeout, not that zones are healthy. Frankendom should check tick lateness too.
- Cost on the admin dashboard: totals runs one `count(*)` per table on every load (`widgets.ts` 234), with no cache. Fine for a small game DB, costly at scale. Not a game-path issue.
- Analytics: `AnalyticsService.track` is one insert per event (`AnalyticsService.ts` 31), with no batching and no sampling. The doc comment says reporting is out of scope. Thin for funnels; not a fit for Frankendom's per-event volume without a queue in front (see the Nakama note for a bounded queue).
- Per-widget isolation works: a failing widget returns its error and the others still render (`widgets.ts` 451, 460). Good shape for Frankendom's admin panels.
- Not read: the presence driver implementations, `liveRooms` and `recentUsers` widgets. The restore handshake itself was read after the checker pass; races inside the driver are not verified.

Reuse tag: rewrite-from-idea (MIT)
Brief rule served: 1 (one engine: counters are a view), 3 (kills stay server-verified)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Error (confirmed in donor): the 5 s sweep only calls `restoreIfSwept()` (MatchMaker.ts 1209); probes run at boot (176) and on seat-reservation ipc_timeout (979, 1037), none periodic. "Dead process drops out at the next sweep (5 s)" was wrong in mechanism, Best idea and Acceptance.
- Missed: the swept-receipt restore handshake (1222-1255) is the real 5 s sweep and the self-heal for a falsely excluded process; stats writes are skipped while SHUTTING_DOWN (Stats.ts 37-39).
- Stats.ts, Utils.ts constants, dedupe, 600 s receipt and MIT claims verified.

Fixed 2026-10-12: mechanism, key-function line, numbers table, Best idea, Decision, Acceptance and FIXME gap rewritten to match the real sweep/probe split; restore handshake added; "not read" lines updated. Sketch unchanged (it does not model the sweep), so no typecheck rerun.
