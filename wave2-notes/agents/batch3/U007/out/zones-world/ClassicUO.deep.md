# ClassicUO (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/World.cs` (with `Game/Map/Map.cs`, `Game/Map/Chunk.cs`, `Game/Scenes/GameScene.cs`) | Licence: BSD-2-Clause (LICENSE.md and the `// SPDX-License-Identifier: BSD-2-Clause` header in each file; BSD 2-Clause License, Copyright (c) 2025, andreakarasho) | C# | symbols `World.Update`, `Map.ClearUnusedBlocks`, `Map.GetChunk2`

Checked: Topic read as world streaming and zone population on the client: what stays loaded around the player and what is dropped. Opened in full: `World.Update` (World.cs 255-394), `Map.ClearUnusedBlocks` and `Map.GetChunk2` (Map.cs 58-101, 247-268), `Chunk.Create` and `HasNoExternalData` (Chunk.cs 36-52, 474-492), `Chunk.Destroy` (373-445), `GameObject.Distance` (GameObject.cs 32-62), the cleanup cadence (GameScene.cs 716-730), constants (Constants.cs 25-40, 78-84), clock (GameController.cs 58-64, 380-392; Time.cs). Also read: HouseManager.cs 25-80, WorldMapGump.cs 1355-1470 (zone JSON classes), PacketHandlers.cs 893-906 and 6434-6435 (RangeSize assignments only). Not read: `Chunk.Load` body, `Mobile.Update`, the Chunk pool constant beyond its value (Constants.cs:100), the macro view-range code (grep only). ClassicUO.Renderer (the hint's other tree) grepped for zone, chunk and cull: no streaming code, only GPU face culling. Callers: `ClearUnusedBlocks` has one caller (GameScene.cs:726, grep); `World.Update` caller read: GameScene.cs:752 only. Confidence: high on the cull and eviction rules as written; medium on how far they transfer, since this is a client render cache with no spawn logic. camera_scope: not a camera cell.

## 1. Mechanism

- Clock: the game runs on a variable step. `IsFixedTimeStep = false` (GameController.cs:61) and each frame sets `Time.Ticks` from the elapsed game time in milliseconds (GameController.cs:388). Every timer below compares against this millisecond clock, not against a frame count.
- Entity cull (`World.Update`, World.cs 255-388), run once per frame from the in-game branch of GameScene (GameScene.cs:752). A cull pass is allowed only when `_timeToDelete < Time.Ticks` (World.cs:294), and it sets the next pass 50 ms ahead (World.cs:298). Between passes the loop still updates every object; only the removal is throttled.
- Mobiles (World.cs 303-313): each mobile updates, then if the pass is due and `mob.Distance > ClientViewRange` it is destroyed (World.cs:305-307, no forced removal). A destroyed mobile is queued in `_toRemove` (World.cs:310-312) and dropped from the dictionary only after the walk (World.cs:349). This keeps the dictionary from being changed while it is enumerated.
- Items (World.cs 357-372): an item is culled only if it is lying on the ground (`item.OnGround`) and is out of range (World.cs:359). A multi (house) is removed only if `HouseManager.TryToRemove` agrees (World.cs:363), which keeps a house whose footprint is still in range. Other items go straight to `RemoveItem` (World.cs:370). Removed items are dropped from `Items` after the walk (World.cs:384).
- Distance (GameObject.cs 32-62): the player is distance 0 (GameObject.cs:43). A mobile that has queued movement steps is measured from its last step tile (GameObject.cs:53). Otherwise it is measured from its own tile. The result is Chebyshev distance, `max(|dx|, |dy|)`, from `World.RangeSize` (GameObject.cs:61). `RangeSize` is set from server packets (PacketHandlers.cs:903-904 and 6434-6435), so the view centre is the server-reported player tile.
- Range: `ClientViewRange` defaults to `MAX_VIEW_RANGE` = 24 (World.cs:109; Constants.cs:81). The minimum is `MIN_VIEW_RANGE` = 5 (Constants.cs:80). Macros can change it (grep only, MacroManager.cs 1351-1400, not read in full).
- Terrain chunks (Map.cs 58-101 and 247-268): `GetChunk2` loads a chunk on demand and sets `chunk.LastAccessTime = Time.Ticks` on every return (Map.cs:96). `Chunk.Create` writes a future stamp, `Time.Ticks + 3000` (Chunk.cs:49), but the stamp is overwritten at Map.cs:96 on the same call, so the future stamp has no effect in that path.
- Chunk eviction (`ClearUnusedBlocks`, Map.cs 247-268): cutoff = now - 3000 ms (Map.cs:250). The scan walks `_usedIndices` in list order, which is creation order; an access does not move a chunk to the back. A chunk is evicted only if its last access is older than the cutoff (Map.cs:260) and `HasNoExternalData()` is true. That check fails on any object that is not `Land` or `Static`; the multi exemption is commented out, so a chunk holding a multi is kept (Chunk.cs:482). Eviction stops after 50 chunks in one pass (Map.cs:265-266).
- Cadence of the eviction: `GameScene.Update` calls `ClearUnusedBlocks` only when `_time_cleanup < Time.Ticks` (GameScene.cs:724-726), then sets the next run 500 ms ahead (GameScene.cs:727). The first run is 5000 ms after the scene is built (GameScene.cs:47).
- Destroy path (Chunk.cs 406-413): destroying a chunk unlinks its node from `_usedIndices` (Chunk.cs:410) and clears `Node`, so the list does not accumulate stale entries. The chunk object goes to a pool capped at `PREDICTABLE_CHUNKS` = 300 (Constants.cs:100); the enqueue is at Chunk.cs:421 (the branch around it is not read in full).

## 2. Key functions

- `World.Update`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/World.cs` 255-394. Throttled entity cull with deferred removal.
- `Map.ClearUnusedBlocks`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Map/Map.cs` 247-268. Age-gated chunk eviction with a per-pass cap.
- `Map.GetChunk2`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Map/Map.cs` 58-101. On-demand load and access stamp.
- `GameObject.Distance`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/GameObjects/GameObject.cs` 32-62. Chebyshev distance from the server-reported view centre.
- `GameScene.Update` cleanup gate: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Scenes/GameScene.cs` 724-727.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cull by Chebyshev distance from a server-given centre, with a per-client range clamped to a min and max | Range 5 to 24 tiles, default 24 (Constants.cs:80-81; World.cs:109) |
| Throttled sweep: work at most every T ms, but update every object every frame | 50 ms cull pass (World.cs:298) |
| Deferred removal: mark destroyed, collect, remove after the walk | None (pattern) |
| Items culled only when on the ground; multis gated by their own test | Multi test via HouseManager.TryToRemove (World.cs:363) |
| Age-gated eviction: evict only if idle longer than a grace time and holding no non-terrain data | Grace 3000 ms (Constants.cs:32) |
| Per-pass eviction cap so one sweep stays cheap | 50 per pass (Constants.cs:37) |
| Sweep cadence separate from the cull cadence | 500 ms (GameScene.cs:727); first run after 5000 ms (GameScene.cs:47) |
| Clock in ms from elapsed game time, variable step | `IsFixedTimeStep = false` (GameController.cs:61) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (throttle gate, distance test, mark, collect, remove after the walk; a chunk sweep with a grace cutoff and a per-pass cap). It omits the paperdoll and container side effects of `RemoveItem`, the house footprint bonus, the step-based distance for moving mobiles, the pool that `Chunk.Destroy` feeds, the `HasNoExternalData` scan over tiles (the sketch takes a flag), and the `Chunk.Load` read. It also drops the donor's zero-distance return for the player, which it covers with `isPlayer`. The chunk map is kept in insertion order, as the donor is, so an access does not move an entry.

```ts
// Licence: BSD-2-Clause (donor). Shape only; written from the described mechanism.
// clean-room

const SWEEP_MS = 50;           // donor: World.Update, _timeToDelete = Time.Ticks + 50
const VIEW_MIN = 5;            // donor: Constants.MIN_VIEW_RANGE
const VIEW_MAX = 24;           // donor: Constants.MAX_VIEW_RANGE
const CHUNK_SWEEP_MS = 500;    // donor: GameScene.Update, _time_cleanup = Time.Ticks + 500
const CHUNK_GRACE_MS = 3000;   // donor: Constants.CLEAR_TEXTURES_DELAY
const CHUNK_EVICT_CAP = 50;    // donor: Constants.MAX_MAP_OBJECT_REMOVED_BY_GARBAGE_COLLECTOR

interface Entity {
  id: number;
  kind: "mobile" | "item";
  tileX: number;
  tileY: number;
  onGround: boolean;
  isPlayer: boolean;
  destroyed: boolean;
}

// Chebyshev distance from the view centre (donor: GameObject.Distance).
function chebyshev(e: Entity, cx: number, cy: number): number {
  return Math.max(Math.abs(e.tileX - cx), Math.abs(e.tileY - cy));
}

class EntityCuller {
  private nextSweep = 0;
  private viewRange = VIEW_MAX;

  setViewRange(r: number): void {
    this.viewRange = Math.min(VIEW_MAX, Math.max(VIEW_MIN, r));
  }

  // Returns the ids dropped this tick. Destroyed entities are collected and removed
  // after the walk, so the map is not mutated while it is being iterated.
  sweep(now: number, cx: number, cy: number, entities: Map<number, Entity>): number[] {
    const doSweep = this.nextSweep < now;
    if (doSweep) this.nextSweep = now + SWEEP_MS;

    for (const e of entities.values()) {
      if (doSweep && !e.isPlayer && chebyshev(e, cx, cy) > this.viewRange) {
        // Mobiles are always eligible; items only when lying on the ground.
        if (e.kind === "mobile" || e.onGround) e.destroyed = true;
      }
    }

    const dropped: number[] = [];
    for (const e of entities.values()) {
      if (e.destroyed) dropped.push(e.id);
    }
    for (const id of dropped) entities.delete(id);
    return dropped;
  }
}

interface Chunk {
  lastAccess: number;     // ms, stamped on every access
  hasExternalData: boolean;
}

class ChunkCache {
  // Insertion order, as the donor's _usedIndices list; an access does not move the entry.
  private chunks = new Map<string, Chunk>();
  private nextSweep = 0;

  touch(key: string, now: number, make: () => Chunk): Chunk {
    let c = this.chunks.get(key);
    if (!c) {
      c = make();
      this.chunks.set(key, c);
    }
    c.lastAccess = now;
    return c;
  }

  // Called every frame; does real work at most every CHUNK_SWEEP_MS.
  sweep(now: number): number {
    if (this.nextSweep > now) return 0;
    this.nextSweep = now + CHUNK_SWEEP_MS;

    const cutoff = now - CHUNK_GRACE_MS;
    let evicted = 0;
    for (const [key, c] of this.chunks) {
      if (c.lastAccess < cutoff && !c.hasExternalData) {
        this.chunks.delete(key);
        if (++evicted >= CHUNK_EVICT_CAP) break;
      }
    }
    return evicted;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/zones-world-streaming.ts`, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`: the zone population rule, as a server step. Parity-checklist row 23 (zone population: caps, respawn, despawn on empty with a grace timer). The donor has no server; this is client-side streaming, so it informs the shape of row 23's grace and sweep, not its caps or respawn.
- The client side (hiding entities beyond the view range) belongs in the render layer, not the engine. Row 23 is the one row cited here.
- Reuse tag: adapt-shape (BSD-2-Clause; code may be adapted; sketch written from the mechanism)
- Brief rule served: zones as data (the grace, cap and sweep numbers become zone-data fields for row 23); one ledger (the client cull must not change server-known state).

Best transferable idea: sweep for despawn on a throttled timer, collect destroyed entries and remove them after the walk, and evict only after a grace period with a per-pass cap.
Decision (proposed): adapt — the grace-and-cap sweep shape fits the server's zone despawn-on-empty step (row 23); the donor's distance cull is a client render concern and must never delete server-known state (one ledger).
Acceptance: a server test: a zone with no players for its grace period despawns its idle creatures, at most N per sweep, and a creature whose zone regains a player within the grace is kept; a client test: an entity 25 tiles away leaves the draw list within 50 ms and returns from server state when it re-enters range.

## 6. Gaps and risks

- BSD-2-Clause: code may be adapted. The sketch is still written from the mechanism, not copied.
- The donor's distance cull is client-only. It deletes local objects, but the server still knows them. Frankendom's ledger must not change when a client hides an entity. Hiding and deletion must stay separate.
- No spawn logic here. The donor has no population caps, no respawn timer and no creature despawn-on-empty grace. Row 23's caps and respawn are not covered by this donor; only the sweep and grace shape is.
- The eviction scan is in creation order, not least-recently-used order. For memory that is fine; for a zone despawn the rule must be keyed on last player presence, not on insertion order.
- Time here is wall-clock milliseconds on a variable step (GameController.cs:61, 388). A server tick must be fixed-step (row 18 sub-line "server tick: fixed step"). The 50 ms and 500 ms constants are client cadences and must not be copied to the server tick.
- Pooling hazard: `Chunk.ClearForReload` documents a double-ownership bug that `Destroy` would cause if a live slot were pooled (Chunk.cs:445 and its doc comment just above it). Any pooled entity in Frankendom must unlink from its owner before it is released.
- Zone data in the donor (WorldMapGump.cs 1364-1373, 1370) is label, colour and polygon for the world-map overlay only. It has no spawn, rule or danger fields, so it gives no zone-as-data model beyond that. Thin on the zones-as-data point.
