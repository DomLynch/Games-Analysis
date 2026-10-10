// Licence: GPL-3.0 (donor, ModernUO). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type RoomState = "inSequence" | "inProgress" | "completed";

interface Mob {
  deleted: boolean;
}

interface RoomConfig {
  playersPerSpawn: number; // donor: PlayersPerSpawn = 5 (zone data in Frankendom)
  minSpawnCount: number; // donor: floor of 1 (engine constant)
}

// One room of a ring of rooms. Players in the dungeon set the population; a room opens only after its predecessor clears.
class Room {
  state: RoomState = "inSequence";
  creatures: Mob[] = [];
  next: Room | null = null;

  constructor(
    private readonly cfg: RoomConfig,
    private readonly playersInDungeon: () => number,
    private readonly spawnOne: () => Mob | null,
  ) {}

  // donor ComputeSpawnCount: ceil(players / PlayersPerSpawn), never below the floor
  computeSpawnCount(): number {
    return Math.max(Math.ceil(this.playersInDungeon() / this.cfg.playersPerSpawn), this.cfg.minSpawnCount);
  }

  // donor HasCompleted: empty list is never complete; otherwise every listed creature must be deleted
  hasCompleted(): boolean {
    if (this.creatures.length === 0) return false;
    return this.creatures.every((m) => m.deleted);
  }

  // donor State setter: a change runs Update, which spawns in full when InProgress and stops otherwise
  setState(s: RoomState): void {
    if (this.state === s) return;
    this.state = s;
    if (s === "inProgress") {
      this.fullSpawn();
    } else {
      this.stop();
    }
  }

  // donor FullSpawn (traps omitted): drop the old population, then spawn to the current target
  fullSpawn(): void {
    this.creatures = [];
    const n = this.computeSpawnCount();
    for (let i = 0; i < n; i++) this.spawnCreature();
  }

  private spawnCreature(): void {
    const m = this.spawnOne();
    if (m !== null) this.creatures.push(m);
  }

  // donor Stop: forget the population and the region (traps omitted); the timer is not modelled here
  stop(): void {
    this.creatures = [];
  }

  // called once per second while InProgress (donor Slice)
  slice(): void {
    if (this.state !== "inProgress") return;

    // top up only: entries already in the list (including dead ones) count against the target
    const n = this.computeSpawnCount();
    for (let i = this.creatures.length; i < n; i++) this.spawnCreature();

    if (this.hasCompleted()) {
      this.setState("completed");
      const nx = this.next;
      if (nx !== null) {
        if (nx.state === "completed") this.recurseReset();
        nx.setState("inProgress");
      }
    }
  }

  // donor RecurseReset: walk the ring back to InSequence, stopping at the first room already InSequence
  recurseReset(): void {
    if (this.state !== "inSequence") {
      this.setState("inSequence");
      this.next?.recurseReset();
    }
  }
}

export {};
