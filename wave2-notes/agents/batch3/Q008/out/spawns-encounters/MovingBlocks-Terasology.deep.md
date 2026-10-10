# MovingBlocks-Terasology (spawns-encounters, cell 1)

Donor: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/logic/players/PlayerSystem.java` | Licence: Apache-2.0 (LICENSE file: "Version 2.0, January 2004"; header `SPDX-License-Identifier: Apache-2.0` on PlayerSystem.java) | Java | symbol `PlayerSystem.update` / `onRespawnRequest` / `respawnPlayer`

Checked: The list's hint file, `DeathScreen.java`, is only the death-screen button that sends `RespawnRequestEvent` (grep-read, line 35). The mechanism is the respawn queue in `PlayerSystem.java` 62-96 and 200-255, read in full, except `PlayerFactory.findSpawnPositionFromLocationComponent` (not read), the per-frame loop that calls `update()` (not read), and `RelevanceSystem` (not read). This checkout has no monster or encounter director: `modules/` is empty (0 .java files), and a grep for spawn classes in `engine/` found only player spawn (`FixedSpawner`, `AbstractSpawner`, `Spawner`) and `SpawnPrefabAction`. Confidence: high that the respawn queue is real and read correctly; medium that it covers the topic, since the donor has no encounter spawner at all.

Best transferable idea: When a respawn is requested for a place that is not loaded yet, hold it in a pending list, widen the load area while it waits, and release it on each update once the place is ready.
Decision (proposed): adapt - Frankendom needs the wait-for-zone gate, but not the chunk streaming it depends on. Keep the gate and the per-zone watch radius (zone data); drop the view-distance widening until zones stream.
Acceptance: A server test kills a hero in a zone that is not loaded and asserts no placement and the death screen stays up; after the zone is marked loaded the hero is placed within one server tick and the pending queue is empty; a second case disconnects a queued hero and asserts no queue entry remains.

## 1. Mechanism

- A respawn request enters `onRespawnRequest` (226-236). It reads the character's world position. If that position is already relevant (`isBlockRelevant`, 229), it calls `respawnPlayer` at once (230).
- Otherwise it widens the client's relevance region to `ViewDistance.LEGALLY_BLIND` (232) and appends the request to `clientsPreparingToRespawn` (233-234). The request waits.
- `update(float delta)` (70) runs the queue on every call. For each waiting entry (88-95), if its position is now relevant (`worldProvider.isBlockRelevant`, 91), it calls `respawnPlayer` (92) and removes the entry. There is no interval, timer, retry cap or timeout in this loop.
- `respawnPlayer` (238-255), in order: compute the spawn position from the location component through `PlayerFactory` (243-244, the factory is not read); add `AliveCharacterComponent` (246); send `CharacterTeleportEvent` (247); reset the client's relevance to its own view distance (251-253); send `OnPlayerRespawnedEvent` (254).
- A second handler on the same event, `setSpawnLocationOnRespawnRequest` (205-222), annotated `PRIORITY_CRITICAL` (205), sets the character's position from `StaticSpawnLocationComponent` if present, otherwise from `worldGenerator.getSpawnPosition` (212-219), and resets the rotation (220). The sibling `onRespawnRequest` is annotated `PRIORITY_TRIVIAL` (224). The order of the two handlers follows from those annotation names; the event dispatch code was not read.
- `isBlockRelevant(Vector3ic)` in `WorldProviderWrapper` (29-31) calls the core, where it returns `chunkProvider.isChunkReady` for the chunk containing the position (`WorldProviderCoreImpl.java` 178-180). So "relevant" here means "the chunk is loaded and ready".
- Disconnect (200-203) only calls `removeRelevanceEntity`. That handler does not remove a queued entry from `clientsPreparingToRespawn`.

## 2. Key functions

- `PlayerSystem.update`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/logic/players/PlayerSystem.java` 70-96. The poll over the pending lists.
- `PlayerSystem.onRespawnRequest`: same file, 224-236. The immediate-or-queue decision.
- `PlayerSystem.respawnPlayer`: same file, 238-255. The respawn itself.
- `PlayerSystem.setSpawnLocationOnRespawnRequest`: same file, 205-222. Runs first (CRITICAL) and sets the target position.
- `ViewDistance.LEGALLY_BLIND`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/world/viewDistance/ViewDistance.java` 15. The waiting watch radius, 5 x 5 x 5 chunks.
- Ready check: `WorldProviderWrapper.java` 29-31 and `WorldProviderCoreImpl.java` 178-180, both under `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/world/internal/`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hold a spawn or respawn until the place is loaded, then release it on a poll | None (no timer, no retry cap, no timeout in the donor) |
| Widen the load or watch area while the request waits | 5 x 5 x 5 chunks (theirs, ViewDistance.java 15, `LEGALLY_BLIND`) |
| Ready test | Chunk ready for the position (theirs, WorldProviderCoreImpl.java 179) |
| Poll rate | Every `update` call, no interval (theirs, PlayerSystem.java 70-95) |
| Immediate path when already ready | Skip the queue (theirs, PlayerSystem.java 229-230) |

## 4. TypeScript sketch

simplified: the sketch keeps the three steps of the donor: immediate respawn when ready, otherwise widen the watch radius and queue, then release queued entries on each update. It omits the CRITICAL handler that sets the target position first, the `PlayerFactory` recompute of the spawn position (not read; the sketch passes the queued position through), the reset of the client's relevance to its own view distance, the teleport, alive and respawned events, and the disconnect path (the donor does not remove queued entries there either). It does not reorder anything.

```ts
// Licence of donor: Apache-2.0. Clean-room sketch written from the described mechanism, not a translation.
type Vec3 = { x: number; y: number; z: number };

interface PendingRespawn {
  playerId: string;
  spawnAt: Vec3;
}

interface RespawnWorld {
  isReady(p: Vec3): boolean;                              // zone/chunk loaded at this position
  setWatchRadius(playerId: string, chunks: Vec3): void;  // widen the load area while waiting
  respawn(playerId: string, spawnAt: Vec3): void;        // place the hero, make it alive
}

// Donor: ViewDistance.LEGALLY_BLIND, 5 x 5 x 5 chunks
const WAITING_WATCH_CHUNKS: Vec3 = { x: 5, y: 5, z: 5 };

class RespawnQueue {
  private pending: PendingRespawn[] = [];

  constructor(private world: RespawnWorld) {}

  request(playerId: string, spawnAt: Vec3): void {
    if (this.world.isReady(spawnAt)) {
      this.world.respawn(playerId, spawnAt);
      return;
    }
    this.world.setWatchRadius(playerId, WAITING_WATCH_CHUNKS);
    this.pending.push({ playerId, spawnAt });
  }

  // Called once per update step; no timer, no retry cap.
  update(): void {
    const stillWaiting: PendingRespawn[] = [];
    for (const p of this.pending) {
      if (this.world.isReady(p.spawnAt)) {
        this.world.respawn(p.playerId, p.spawnAt);
      } else {
        stillWaiting.push(p);
      }
    }
    this.pending = stillWaiting;
  }

  get size(): number {
    return this.pending.length;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population layer). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The waiting watch radius is zone data; the ready gate is an engine rule. The poll runs inside the existing server tick, so it needs no row of its own. (Frankendom side not read in this pass.)
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, but this note uses the idea only and the sketch is clean-room)
- Brief rule served: 1 (one engine: the ready gate sits in the engine, not in the client); zones as data (the watch radius is a per-zone field); rules 7-9 n/a

## 6. Gaps and risks

- No timeout and no retry cap. A hero whose chunk never loads waits forever. Frankendom needs a grace timer and a fallback (for example, respawn at a fixed safe point after N seconds).
- Disconnect leaves queued entries in place in the code read here (`onDisconnect`, 200-203, does not touch the queue). Whether a stale entry is harmless was not read. Under the one-ledger ruling the queue entry must be removed when the player leaves.
- "Relevant" is a chunk-loaded check. Frankendom has no chunk streaming, so the ready predicate has to be a zone-loaded check that the engine owns; the donor does not show how that maps.
- The donor recomputes the spawn position inside `respawnPlayer` (through `PlayerFactory`, not read). The sketch uses the queued position. Frankendom must pick one source of truth for the spawn point.
- Server-verified kills: `onRespawnRequest` (226-236) checks only whether the position is relevant. It does not check that the character is dead, as read. The request comes from the death screen's button (DeathScreen.java 34-35). Frankendom must validate the death on the server before any respawn.
- Not covered by this donor: monster or encounter spawn caps, despawn-on-empty and the grace timer. `modules/` is empty in this checkout, so those rules are not in what was read. Row 23 needs a different donor for them.
- The `update` driver (which calls every `UpdateSubscriberSystem` each frame) was not read, so the poll rate in real time is not stated here.
