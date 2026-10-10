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
