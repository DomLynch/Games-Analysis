# afritz1-OpenTESArena (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/World/ChunkManager.cpp` (with `ChunkUtils.cpp`, `EntityChunkManager.cpp`, `CitizenUtils.cpp`) | Licence: MIT (`LICENSE.txt`: "The MIT License (MIT)", Copyright 2016-2026 The OpenTESArena Developers) | C++ | symbol `ChunkManager::update`, `EntityChunkManager::populateChunkEntities`, `CitizenUtils::getMaxCitizenCountForScene`

Checked: Read in full: `ChunkManager.cpp` 1-134, `ChunkManager.h`, `ChunkUtils.cpp` 1-155, `ChunkUtils.h` 1-59, `CitizenUtils.cpp` 1-130 (through `getCitizenCountInChunk`; the file may continue, not read), `CitizenUtils.h` 34. Read in full: `EntityChunkManager.cpp` 1051-1333 (`populateChunkEntities`, `populateChunk`), 2124-2226 (`updatePrePhysicsStep`), 2339-2402 (`queueEntityDestroy`). Read in part: `GameState.cpp` 1120-1200 and 1708-1735, `Game.cpp` 804-935 (tick, chunk update at 921-923), `VoxelChunkManager.cpp` 812-880, `MapDefinition.cpp` 43-80, `SpecializedChunkManager.h` 130-220, `MapLogic.cpp` 252-268. Not read: the rest of `MapLogic.cpp` transition code, the voxel generation inside `VoxelChunkManager::populateChunk`, the default value of the chunk-distance option. Callers checked: `ChunkManager::update` has two callers (`Game.cpp` 923 per tick, `GameState.cpp` 1172 on scene change); `populateChunk` has one caller (`EntityChunkManager.cpp` 2170). Candidates opened for this topic: `ChunkManager.cpp`, `ChunkUtils.cpp`, `CitizenUtils.cpp`, `EntityChunkManager.cpp`, `MapDefinition.cpp`, `MapLogic.cpp`, `GameState.cpp`, `VoxelChunkManager.cpp`; the hint file `VoxelTriggerDefinition.h` is a data struct (sound, lore text, key ID, XYZ) with no streaming or spawn logic, read and not used. Confidence: high on the streaming window and the citizen cap; medium on transitions (only the scene-change rebuild was read). Not a camera cell, so no camera_scope.

Best transferable idea: Keep a square window of zone chunks around the player, diff it into load and free lists, and cap the population as a function of how much of the world is loaded, filling only the missing share as each chunk enters.
Decision (proposed): adapt - the window diff and the loaded-area cap fit zones as data, but the donor only acts on chunk load, has no respawn timer or despawn grace, and does not save kills, so respawn must move to a server timer in the ledger.
Acceptance: A server test kills an enemy in zone A, walks out and back inside the respawn timer, and asserts the enemy is still dead; after the timer, and with the player in the zone, a fresh spawn appears and the live count for zone A never exceeds its cap.

## 1. Mechanism

- Streaming window. `ChunkManager` keeps the active chunk positions: the square of (2d+1) by (2d+1) chunks centred on the player's chunk, with d the chunk-distance option. Chunks are 64 voxels per side. Each `update` call first checks whether the centre or the count changed; if neither did, it returns at once (76-79). Otherwise it lists every old chunk outside the new square as freed (81-88), lists every square cell that was not active as new (93-104), and rebuilds the active list (106-119). `endFrame` clears the new and freed lists (122-126). Order: freed first, then new, both in the same frame.
- Who calls it. The game tick calls `update` with the player's chunk and the option each tick, while the scene is simulating and the map is valid (`Game.cpp` 877, 921-923). A scene change clears the manager and calls `update` once so the scene is ready on the first frame (`GameState.cpp` 1168-1172).
- Consumers of the lists, in the entity pass (`EntityChunkManager.cpp` 2137-2170). Freed chunks first: every entity in the chunk is queued for destroy with no chunk notify (2137-2144), and the chunk is recycled (2146). Then each new chunk: a chunk is spawned (2153), then populated from the level data (2170). Voxel chunks get the same two steps (`VoxelChunkManager.cpp` 817-842).
- Wilderness zone per chunk. On the wilderness map, each new chunk asks `MapDefinitionWild::getLevelDefIndex` which level definition it uses, reading a 2D index buffer (`MapDefinition.cpp` 56-63). Chunks outside the buffer return 0 (70); the seed fallback is an open todo (67). Other map types use the same active level for every chunk (`EntityChunkManager.cpp` 2157-2168).
- Fixed placements. Static entities (enemies, containers, NPCs, and so on) are not rolled. Each placement definition holds fixed world positions from the level data (1067, 1090), and a position spawns in a chunk only when its voxel falls in that chunk's writing range (1094). The writing range is the chunk's share of the level (1064).
- Citizen population cap. Only in `populateChunk`, which is only reached from the new-chunk path (2170). For a city or wilderness with citizen generation data (1191), the scene cap is floor(5 x 30 x loaded chunks / 4) (`CitizenUtils.cpp` 45-46). The count of loaded chunks is the entity manager's list, and it already includes the chunk being populated because `spawnChunk` pushes it first (`SpecializedChunkManager.h` 134, then 2153 before 2170). Per new chunk: target = min(cap minus current citizens, 30) (1216-1218); the target splits into target/2 male and the rest female (1219-1220). Each citizen tries up to 30 random voxels in the chunk that must be empty above a floor voxel (1195-1211); if none is found, that citizen is skipped (1240-1243). The current count is `citizenEntityInstIDs`: added in `initializeEntity` (1043) and removed on destroy (2384).
- Despawn and no save. When a chunk leaves the window, its entities are destroyed and the chunk goes back to the pool and is removed from the active list (`SpecializedChunkManager.h` 147-159). Nothing is saved: the todo at line 153 reads "save chunk changes". A slain enemy therefore comes back when its chunk is loaded again.
- Scene change. Changing scene clears every chunk manager and repopulates the whole window at once (`GameState.cpp` 1170-1182). There is no streaming across a transition. `MapLogic::handleMapTransition` takes a voxel ray hit and a transition definition (`MapLogic.cpp` 252-257); I did not find its caller in `src/World` or `src/Game`.
- Timing. The window update runs inside the variable-step tick, which uses a clamped frame delta (`Game.cpp` 877-935). No fixed step is shown for this path (not read beyond 935).

## 2. Key functions

- `ChunkManager::update`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/World/ChunkManager.cpp` 46-120. Window diff with the early return, freed list, new list, rebuild.
- Window math: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/World/ChunkUtils.cpp` 15-26 (side 1+2d, count side squared) and 67-74 (square test, `isWithinActiveRange`).
- Entity pass: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 2124-2170 (freed destroy, new spawn and populate, both before the per-entity update).
- Population: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 1051-1190 (level placements in the writing range) and 1191-1282 (citizen cap, gender split, voxel search, spawn).
- Scene cap: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/CitizenUtils.cpp` 42-47.
- Destroy queue: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 2339-2386 (flag, remove from chunk and type cache).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Square window of radius d around the player's chunk; diff into load and free lists | Side 2d+1; d option range 1..32 (theirs, `Options.h` 93-94); chunk 64 voxels (theirs, `ChunkUtils.h` 8) |
| Recompute only when the centre or count changes | Rule (theirs, `ChunkManager.cpp` 76-79) |
| Scene population cap scales with loaded chunks | floor(5 x 30 x chunks / 4) (theirs, `CitizenUtils.cpp` 46); at d=1 (9 chunks) that is floor(1350/4) = 337 (computed from the formula, not run) |
| Per-chunk spawn max | 30 (theirs, `CitizenUtils.h` 34; the donor comment says "Arbitrary.") |
| Gender split | Half male, rest female (theirs, `EntityChunkManager.cpp` 1219-1220) |
| Spawn voxel search | 30 tries; voxel must be empty above a floor (theirs, 1195, 1199-1203); then skip (1240-1243) |
| Respawn timer, despawn grace | None in this donor: refill happens only when a chunk loads (`EntityChunkManager.cpp` 2150-2170) |

## 4. TypeScript sketch

simplified: the sketch recomputes the window on every call (the donor returns early when the centre and count are unchanged); it omits the chunk pool, the voxel-side population, the placement positions, citizen names, directions and colours, the 30-try voxel search (it assumes every planned citizen finds a voxel), and the destroy queue (it returns the free list instead). It treats negative headroom as 0, where the donor's loops do nothing. It does what the donor does with the new chunk: the cap counts the chunk being populated (`keptChunks + i + 1`). The `export {}` line used for the typecheck is not in the block.

```ts
// Licence: MIT (donor afritz1-OpenTESArena). Shape adapted; sketch written from the described mechanism.
type ChunkPos = { x: number; y: number };
type Spawn = { male: number; female: number };

// Square window of (2r+1)^2 chunks around the centre chunk (donor ChunkUtils isWithinActiveRange).
function inWindow(c: ChunkPos, centre: ChunkPos, radius: number): boolean {
  return Math.abs(c.x - centre.x) <= radius && Math.abs(c.y - centre.y) <= radius;
}

// Which loaded chunks fall outside the window (free), and which window cells are not loaded yet (load).
function diffWindow(active: ChunkPos[], centre: ChunkPos, radius: number): { load: ChunkPos[]; free: ChunkPos[] } {
  const free = active.filter((c) => !inWindow(c, centre, radius));
  const load: ChunkPos[] = [];
  for (let y = centre.y - radius; y <= centre.y + radius; y++) {
    for (let x = centre.x - radius; x <= centre.x + radius; x++) {
      if (!active.some((a) => a.x === x && a.y === y)) load.push({ x, y });
    }
  }
  return { load, free };
}

// Scene cap: 5/4 of (per-chunk max x loaded chunks), integer division as in the donor.
function sceneCitizenCap(loadedChunks: number, perChunk: number): number {
  return Math.floor((5 * perChunk * loadedChunks) / 4);
}

// One streaming step. Citizens in freed chunks are assumed already removed (citizensKept).
// Each new chunk fills toward the scene cap, at most perChunk, half male and the rest female.
function planStep(active: ChunkPos[], centre: ChunkPos, radius: number, citizensKept: number, perChunk: number) {
  const { load, free } = diffWindow(active, centre, radius);
  const keptChunks = active.length - free.length;
  let citizens = citizensKept;
  const perNewChunk: Spawn[] = [];
  load.forEach((_, i) => {
    const loadedSoFar = keptChunks + i + 1; // the new chunk counts itself, as the donor's spawnChunk() runs first
    const headroom = sceneCitizenCap(loadedSoFar, perChunk) - citizens;
    const target = Math.max(0, Math.min(headroom, perChunk));
    const male = Math.floor(target / 2);
    perNewChunk.push({ male, female: target - male });
    citizens += target; // assumes every planned citizen finds a voxel
  });
  return { free, load, perNewChunk };
}

const demo = planStep([{ x: 0, y: 0 }], { x: 1, y: 0 }, 1, 0, 30);
console.log(demo.free.length, demo.load.length, demo.perNewChunk);
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: cap, refill on chunk or zone entry, respawn timer, despawn grace, with the numbers as zone data). Parity-checklist row 23 (zone population). Against row 23 the donor has a cap and refill-on-load, and no respawn timer and no despawn grace.
- Client-side streaming diff (load and free lists for the window) is not a server concern; it would sit in the client zone loader and is noted here only as the shape the server follows.
- Reuse tag: adapt-shape (MIT, afritz1-OpenTESArena: code may be adapted; this sketch is written from the mechanism, not copied)
- Brief rule served: row 23 zone population; zones as data on one runtime (the cap and the per-chunk max are zone fields, not engine constants).

## 6. Gaps and risks

- The donor refills only when a chunk loads (`EntityChunkManager.cpp` 2170 is the only populate path). A citizen who dies, or leaves the scene, is not replaced until a chunk reloads. Frankendom row 23 needs an explicit respawn timer and a despawn grace timer on the server, both as zone data. The donor has neither.
- Kills and changes are not saved. Freed chunks destroy their entities (`EntityChunkManager.cpp` 2143) and the recycle has an open todo to save changes (`SpecializedChunkManager.h` 153). Against server-verified kills and one ledger, this must not be copied: a kill is a ledger record that exists independently of the streaming window.
- The cap scales with how many chunks are loaded (`CitizenUtils.cpp` 46), so a bigger window raises the population of the whole scene. Frankendom's cap must be per zone (zones as data), not a function of window size or client settings.
- Integer division floors the cap (337 at distance 1), the per-chunk target is min(headroom, 30), and a failed voxel search skips a citizen silently (1240-1243). A server budget test must count the spawns that actually happened, not the planned ones.
- The wilderness lookup returns 0 outside the defined index (`MapDefinition.cpp` 70) and the seed fallback is a todo (67). Frankendom zones should reject an undefined position, not default to zone 0.
- Timing: the donor's window update runs in a variable-step tick with a clamped delta (`Game.cpp` 877-935). It is not a fixed step and is not a server-tick model. Only the count logic transfers to a fixed-step server tick (row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- Scene change is a full rebuild with no streaming across it (`GameState.cpp` 1170-1182). The transition code past `MapLogic.cpp` 268 was not read, so the zone-transition rules here are not verified end to end.
- Licence is MIT, so code may be adapted; the sketch is still written from the mechanism. The donor is C++ with Jolt physics; none of the physics or entity-type code is needed for the count logic.
