// Clean-room sketch from the described mechanism (donor is GPL-3.0-or-later; no lines translated).
export interface OnDeathSpawn {
  actor: string;
  probability: number;           // donor Probability (percent); the donor's test is `roll > probability`
  deathType?: string;            // donor DeathType; undefined = any death
  ownerMode: "victim" | "killer" | "neutral";
  neutralOwner: string;          // donor InternalOwner
  requiresCreeps: boolean;       // donor RequiresLobbyCreeps
  spawnAfterDefeat: boolean;     // donor SpawnAfterDefeat
  offset: { x: number; y: number };
}

export interface Death {
  damageTypes: string[];
  attackerOwner: string;
  victimOwner: string;
  victimDefeated: boolean;
  location: { x: number; y: number };
  inWorld: boolean;
}

export class OnDeathSpawner {
  private pendingKiller: string | null = null;

  // roll returns 0..99 from the shared (synced) random source.
  constructor(private cfg: OnDeathSpawn, private roll: () => number, private creepsEnabled: boolean) {}

  // Donor Killed(): gates, then record the attacker. Nothing is spawned yet.
  onKilled(d: Death): void {
    if (this.cfg.requiresCreeps && !this.creepsEnabled) return;
    if (!d.inWorld) return;
    if (this.roll() > this.cfg.probability) return;   // spawns when roll <= probability
    if (this.cfg.deathType !== undefined && !d.damageTypes.includes(this.cfg.deathType)) return;
    this.pendingKiller = d.attackerOwner;
  }

  // Donor RemovedFromWorld(): only after a recorded kill; the spawn is queued to the frame end.
  onRemoved(d: Death, queueFrameEnd: (spawn: () => void) => void): void {
    if (this.pendingKiller === null) return;
    if (d.victimDefeated && !this.cfg.spawnAfterDefeat) return;

    let owner: string;
    if (this.cfg.ownerMode === "victim") {
      // Falls back to the neutral owner when the victim is defeated.
      owner = d.victimDefeated ? this.cfg.neutralOwner : d.victimOwner;
    } else if (this.cfg.ownerMode === "killer") {
      owner = this.pendingKiller;
    } else {
      owner = this.cfg.neutralOwner;
    }

    const at = { x: d.location.x + this.cfg.offset.x, y: d.location.y + this.cfg.offset.y };
    queueFrameEnd(() => spawnActor(this.cfg.actor, owner, at));
  }
}

declare function spawnActor(actor: string, owner: string, at: { x: number; y: number }): void;

export {};
