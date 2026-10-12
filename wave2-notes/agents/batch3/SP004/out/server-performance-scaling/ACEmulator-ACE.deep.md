# ACEmulator-ACE (server-performance-scaling, cell 38)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/WorldManager.cs` (with `Managers/LandblockManager.cs`, `Entity/LandblockGroup.cs`, `Entity/Landblock.cs`, `ACE.Common/Performance/RateLimiter.cs`) | Licence: GNU AGPL version 3 (the repo `LICENSE` file is the AGPL v3 text; I read its header only, and did not read a per-file licence header) | C# | symbol `LandblockManager.Tick` (265) and `WorldManager.UpdateWorld` (322)

Checked: Read in full: `WorldManager.cs` UpdateWorld (322-396) and UpdateGameWorld (401-419); `RateLimiter.cs` (all, 6-57); `LandblockManager.cs` Tick (265-284), TickPhysics default and parallel branches (302-363), TickSingleThreadedWork (417-426), UnloadLandblocks (690-760), landblock load and group-add lines (490-505); `LandblockGroup.cs` Add, Remove, RecalculateBoundaries, DoTrySplit, TrySplit, TryThrottledSplit, ShouldBeAddedToThisLandblockGroup (85-291); `Landblock.cs` intervals (96-120), heartbeat block (514-554), SetActive (1107-1120), group guard in AddWorldObjectInternal (820-832). Read by grep only: `ProcessPendingLandblockGroupAdditions` (193-263), `LandblockGroupSplitHelper.cs` (only line 37). Not read: `Landblock.Tick` body outside the heartbeat, `Landblock.Unload` (so whether unsaved state is flushed on unload is (not read)), `ActionQueue.cs`, `DelayManager`, `PlayerManager.Tick`, `ShardDatabaseWithCaching` (signatures only), `ServerPerformanceMonitor` internals (signatures only). Confidence: high on the rate gate, the tick order, dormancy and unload, and the split rule; medium on group merge (not read in full); the parallel branch is read but was not run. camera_scope does not apply (server donor).

## 1. Mechanism

- One loop, two rates. `UpdateWorld` (`WorldManager.cs` 329-392) runs every iteration: PlayerManager.Tick, inbound client queue, ActionQueue, DelayManager (356-373), then `UpdateGameWorld()` (375-377), then `NetworkManager.DoSessionWork()` (379-381). Input and sessions are drained on every pass. Only the world (landblocks and houses) is gated.
- The gate. `updateGameWorldRateLimiter = new RateLimiter(60, 1 s)` (313). `UpdateGameWorld` returns at once if `GetSecondsToWaitBeforeNextEvent() > 0` (403-404); otherwise it registers the event and runs `LandblockManager.Tick` (411) and `HouseManager.Tick`.
- Rate limiter arithmetic. Target spacing is period divided by count, 1/60 s (`RateLimiter.cs` 25). Wait is `spacing × registered − elapsed` (41). When the loop falls behind, the wait goes negative and the world runs at once, so it catches up in bursts within the period. The counter restarts when the period has passed (50-54), which forgives the remaining debt and restarts the window from now.
- Sleep. The loop sleeps only when the world did not update (388): 10 ms when no session is connected, else 1 ms (389).
- Landblock tick order (`LandblockManager.cs` 265-284): TickPhysics, TickMultiThreadedWork, TickSingleThreadedWork, then UnloadLandblocks.
- Groups. A `LandblockGroup` is a set of loaded landblocks that stay together when their Chebyshev gap is below a spacing: 4 while both are active, 3 when either is dormant (`LandblockGroup.cs` 36, 38, 274-285). A newly loaded landblock is queued (`LandblockManager.cs` 502) and placed by that rule. Groups are split only on unload, by `DoTrySplit` (177-225): seed with one landblock, pull in every remaining landblock within spacing, repeat until no change, and split off the result if it is not the whole group.
- Split throttle. `TryThrottledSplit` runs only when `NextTrySplitTime` has passed (261-266). The retry interval is 5 min (`TrySplitInterval`, 42). A group of 200 or more that did not split retries after 1 min (248-249).
- Parallel physics, off by default. Groups are ordered by object count descending, then by average tick cost (`LandblockManager.cs` 312), and run with `Parallel.ForEach` only if `MultiThreadedLandblockGroupPhysicsTicking` is on (308, 317). The flag defaults to false (`ThreadConfiguration.cs` 68). Otherwise each group is ticked in turn on one thread (345-352).
- Cross-landblock moves are deferred. During physics, objects that changed landblock are collected (325, 350), and after the pass each one is relocated on one thread (355-362).
- Dormancy and unload. The heartbeat runs every 5 s (`Landblock.cs` 99, 516). A landblock with no keep-alive object and no permaload (532) becomes dormant after 1 min idle (113, 534-546). The first dormant pass destroys spell projectiles (536-544). After 5 min idle it is queued for destruction (118, 548-549). `UnloadLandblocks` runs on the world thread at the end of each tick (283, 690-760), removes the landblock from its group and re-checks the split (709-740).
- Keep-alive. A world object with weenie class 80007 ("Landblock KeepAlive weenie (ACE custom)") keeps the landblock alive (`Landblock.cs` 649, 671-676).
- Wake. `SetActive` sets the last active time and clears dormancy (1111-1114). For outdoor landblocks it also marks the adjacent ones active (1116-1119). Nothing in this method changes group membership.
- Runtime guard. While groups tick in parallel, adding an object from a different group is refused and logged (`Landblock.cs` 822-832; the donor's own comment, 826-832, says this happens rarely and the object is dropped).
- Profiling hooks. `ServerPerformanceMonitor.RestartEvent` and `RegisterEventEnd` bracket each phase (`WorldManager.cs` 358-381, `ServerPerformanceMonitor.cs` 213, 223), and cumulative buckets are kept per event (245).

## 2. Key functions

- `WorldManager.UpdateWorld` (loop): `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/WorldManager.cs` 322-396.
- `WorldManager.UpdateGameWorld` (rate-gated world step): same file, 401-419.
- `RateLimiter` (all): `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Common/Performance/RateLimiter.cs` 6-57.
- `LandblockManager.Tick` and `TickPhysics`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/LandblockManager.cs` 265-284 and 302-363.
- `LandblockManager.UnloadLandblocks`: same file, 690-760.
- `LandblockGroup.DoTrySplit`, `TryThrottledSplit`, `ShouldBeAddedToThisLandblockGroup`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/LandblockGroup.cs` 177-225, 261-267, 270-291.
- Landblock heartbeat (dormancy and unload): `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Landblock.cs` 514-554; `SetActive` at 1111-1120.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rate-gated world step with ungated input and a short idle sleep | World gate 60 per second (`WorldManager.cs` 313); idle sleep 10 ms with no session, else 1 ms (389) |
| Rate limiter: spacing is period over count; counter resets after the period | Spacing 1/60 s (`RateLimiter.cs` 25); reset after the period (50-54) |
| Shard by spacing, narrower when dormant | 4 when active, 3 when either is dormant (`LandblockGroup.cs` 36, 38) |
| Throttled split retry | 5 min (42); 1 min for a group of 200 or more that did not split (248-249) |
| Idle-based dormancy and unload with keep-alive | Heartbeat 5 s (`Landblock.cs` 99); dormant 1 min (113); unload 5 min (118); keep-alive weenie 80007 (649) |
| Parallel group tick | Off by default (`ThreadConfiguration.cs` 68, 70) |

For a phone and a small Node server: the 60 Hz world gate is above what a Node world tick needs; the fight step should stay at the tick rate chosen by the fight (30 Hz in the OpenDAoC note). The 1 min and 5 min idle thresholds are the useful part, as zone data per zone. Dormancy is a load-shedding rule: a zone with no players stops being worked on, and then it is unloaded.

## 4. TypeScript sketch

simplified: The sketch keeps the donor shape: shards by Chebyshev spacing (narrower when a cell is dormant), largest shard first, cross-shard moves applied once after the pass, and an idle heartbeat that marks dormancy and returns unload candidates, with keep-alive cells never dormant. It omits: merging several shards when one cell joins more than one (the donor merges; the sketch takes the first shard it joins), the split step (the sketch does not split shards after an unload), the parallel `Parallel.ForEach` path (the sketch is serial, as the donor is by default), the post-unload group removal and re-check, the adjacent-cell wake (`SetActive` marks neighbours active for outdoor landblocks), spell-projectile cleanup on dormancy, the runtime cross-group guard, and the profiling calls. Permaload and keep-alive are merged into one flag.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Cell {
  readonly cx: number;
  readonly cy: number;
  dormant: boolean;
  keepAlive: boolean;   // a keep-alive object or permaload stops dormancy and unload
  lastActiveMs: number;
}

export interface Shard {
  readonly cells: Set<Cell>;
}

export interface Mover {
  readonly id: number;
  readonly from: Cell;
  readonly to: Cell;
}

export const SPACING_ACTIVE = 4;          // cells join a shard when the Chebyshev gap is below this
export const SPACING_DORMANT = 3;         // narrower spacing when either cell is dormant
export const DORMANT_MS = 60_000;         // idle this long: dormant
export const UNLOAD_MS = 300_000;         // idle this long: unload

function gap(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.cx - b.cx), Math.abs(a.cy - b.cy));
}

function joins(shard: Shard, c: Cell): boolean {
  for (const m of shard.cells) {
    const need = m.dormant || c.dormant ? SPACING_DORMANT : SPACING_ACTIVE;
    if (gap(m, c) < need) return true;
  }
  return false;
}

// Place a new cell in the first shard it joins, or start a new shard.
// (The donor also merges several shards when one cell joins more than one; not sketched.)
export function placeCell(shards: Shard[], c: Cell): void {
  const hit = shards.find((s) => joins(s, c));
  if (hit) {
    hit.cells.add(c);
    return;
  }
  shards.push({ cells: new Set<Cell>([c]) });
}

// One world pass. Shards are ticked largest first. A cell that crosses into another shard is recorded and
// applied after the pass, on one thread, so no shard reads another shard's cells mid-pass.
export function tickShards(
  shards: Shard[],
  tickCell: (c: Cell, moved: Mover[]) => void,
  relocate: (m: Mover) => void,
): void {
  const ordered = [...shards].sort((a, b) => b.cells.size - a.cells.size);
  const moved: Mover[] = [];
  for (const s of ordered) {
    for (const c of s.cells) tickCell(c, moved);
  }
  for (const m of moved) relocate(m);
}

// Mark a cell active (a player or activity touched it).
export function activate(c: Cell, nowMs: number): void {
  c.lastActiveMs = nowMs;
  c.dormant = false;
}

// Heartbeat: returns the cells to unload. Keep-alive cells are never marked dormant.
export function heartbeat(cells: readonly Cell[], nowMs: number): Cell[] {
  const toUnload: Cell[] = [];
  for (const c of cells) {
    if (c.keepAlive) continue;
    const idle = nowMs - c.lastActiveMs;
    if (idle > DORMANT_MS) c.dormant = true;
    if (idle > UNLOAD_MS) toUnload.push(c);
  }
  return toUnload;
}

export {};
```

Typecheck: the block above (with `export {}`) was saved as `work/ace-shards-dormancy.ts`, copied to the VPS and run with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (the zone population logic, per the addendum): the idle-based dormancy, the keep-alive flag and the unload of a zone with no players. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The idle timers are the grace timers that row 23 names.
- The shard tick (grouping by spacing, largest first, deferred cross-zone moves) is a server-tick concern, not a population one. It has no row of its own here; if it is built, it sits under row 18 (sub-line "server tick: fixed step, input intake, per-tick NPC budget") as a new file `origins/server/zone-shards.ts`. That second file is a proposal, not in the addendum.
- Reuse tag: rewrite-from-idea (AGPL-3.0 copyleft; clean-room only)
- Brief rule served: 1 (one engine: a dormant zone is data, not a second world); zones as data (rule 3 in the Frankendom context)

## 6. Gaps and risks

- Copyleft: clean-room. The sketch is written from the mechanism.
- Defect (the donor's regroup rule): grouping is decided at load and at split time (`LandblockManager.cs` 502; `LandblockGroupSplitHelper.cs` 37 uses dormancy at split time). A wake clears `IsDormant` (`Landblock.cs` 1114) and does not regroup. So two cells that were separated while one was dormant (spacing 3) can end up at distance 3 with both active, in different groups, and possibly on different threads. The donor's own rule (`WorldManager.cs` 342) says adjacent landblocks always run on the same thread. This is a conflict between code and comment, and it is not run. Fix: re-run placement for a cell on wake, and add a test that wakes a dormant cell at distance 3 from an active one and asserts one shard.
- Dropped work (the donor's guard): a cross-group add during parallel ticking is refused and logged (`Landblock.cs` 822-832). Under the one-ledger ruling a dropped action is a lost change. Fix: queue it to the post-pass relocation list (the design already exists at 355-362) and never drop.
- Rate limiter catch-up: after a stall the world runs several ticks at once, and the debt is forgiven at the period boundary (`RateLimiter.cs` 41, 50-54). For a duel this means time jumps. Fix: use the drop-on-overrun rule of the OpenDAoC pacer for the fight step, and keep this gate only for zone work.
- Dormancy drops state: the first dormant pass destroys spell projectiles (`Landblock.cs` 536-544). A zone with a fight in progress must never go dormant; the keep-alive flag must be set by an active fight (our rule). What is saved at unload is not known: `Landblock.Unload` was not read, so whether unsaved state is flushed is (not read). Row 23 grace timers and respawn timers must survive an unload.
- Thresholds: 1 min dormant and 5 min unload (`Landblock.cs` 113, 118) are fixed in the donor. For us they are zone data, and a zone with a boss or a spawn timer must not unload before its respawn is due.
- Threads: the parallel path is off by default and the Node server is single-threaded. Shards are a design for a later worker-per-shard step; do not parallelise before the regroup defect above is fixed and tested.
- Scale: the donor's groups grow by spacing and are split only on unload, with a split cost of about O(n²) per pass over the group's members (`ShouldBeAddedToThisLandblockGroup` is called for each remaining member, per pass, `LandblockGroup.cs` 189-200; estimated from the loop shape, not timed). At 700+ zones this needs a count, not a scan.
- Ruling check: "one ledger" and "server-verified kills" are not affected by dormancy, as long as no kill is decided in a dormant zone. "Zones as data": the idle thresholds and keep-alive belong in zone data.

Best transferable idea: decide zone lifecycle from idle time (dormant at 60 s, unload at 300 s, keep-alive never unloads) and tick zones in spacing-based shards largest first, applying every cross-shard move once after the pass instead of inside it.
Decision (proposed): adapt. Keep the zone heartbeat with idle-based dormancy and unload, the keep-alive flag, the spacing-based shards (narrower when dormant) and the deferred cross-shard handoff (idea). Fix the wake-without-regroup gap and never drop a handoff; take the fight step's timing from the OpenDAoC drop-on-overrun pacer; make the idle thresholds per-zone data.
Acceptance: a server test loads 700 zone records, idles two zones past 60 s (dormant) and one past 300 s (unload), and asserts that a keep-alive zone is never unloaded, that a zone woken from dormancy joins a neighbour at distance 3 into one shard, and that every cross-shard move is applied exactly once after the tick pass.

Reuse tag: rewrite-from-idea (AGPL-3.0 copyleft; clean-room only)
Brief rule served: 1 (one engine; a dormant zone is data, not a second world); zones as data
