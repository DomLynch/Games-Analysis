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
