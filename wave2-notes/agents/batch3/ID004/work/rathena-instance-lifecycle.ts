// Licence: GPL-3.0 (donor). Clean-room: written from the described mechanism, not a translation.
type Mode = 'char' | 'party' | 'guild' | 'clan';
type Reason = 'live-timeout' | 'enter-timeout' | 'user-request';

const TICK_RATE = 20;                 // Frankendom server ticks per second (donor uses wall-clock ms)
const DEFAULT_LIMIT_S = 3600;         // donor instance_db default TimeLimit (instance.cpp 102)
const DEFAULT_IDLE_S = 300;           // donor instance_db default IdleTimeOut (instance.cpp 119)
const BUILD_INTERVAL_TICKS = 60 * TICK_RATE; // donor INSTANCE_INTERVAL 60000 ms (instance.cpp 36)

interface DbEntry { id: string; limitTicks: number | null; idleTicks: number | null; } // null = infinite
interface Instance {
  id: number;
  dbId: string;
  mode: Mode;
  ownerId: number;
  state: 'queued' | 'busy';
  users: number;
  keepDueTick: number | null; // hard lifetime, set when the instance is built (sketch fix)
  idleDueTick: number | null; // empty grace: running only while nobody is inside
}

class InstanceService {
  private nextId = 1;
  private queue: number[] = [];
  private pendingDue: number | null = null; // one build slot at a time (donor: overwritten timer)
  private instances = new Map<number, Instance>();
  private owners = new Map<string, number>(); // `${mode}:${ownerId}` -> live instance id

  constructor(
    private db: Map<string, DbEntry>,
    private build: (inst: Instance) => boolean,   // creates the zone copy; false = failed
    private unbuild: (inst: Instance) => void,    // despawns the copy's content
  ) {}

  // Create: one live instance per owner; queue it; build now only if nothing is pending.
  create(dbId: string, mode: Mode, ownerId: number, now: number): number | 'unknown-db' | 'owner-busy' {
    const entry = this.db.get(dbId);
    if (!entry) return 'unknown-db';
    const key = `${mode}:${ownerId}`;
    if (this.owners.has(key)) return 'owner-busy';
    const id = this.nextId++;
    const inst: Instance = { id, dbId, mode, ownerId, state: 'queued', users: 0, keepDueTick: null, idleDueTick: null };
    this.instances.set(id, inst);
    this.owners.set(key, id);
    this.queue.push(id);
    if (this.pendingDue === null && this.queue.length === 1) this.buildFront(now);
    return id;
  }

  // Once per tick: fire the single pending build, then expire timers.
  tick(now: number): void {
    if (this.pendingDue !== null && now >= this.pendingDue) {
      this.pendingDue = null;
      this.buildFront(now);
    }
    for (const inst of [...this.instances.values()]) {
      if (inst.keepDueTick !== null && now >= inst.keepDueTick) this.destroy(inst.id, 'live-timeout');
      else if (inst.state === 'busy' && inst.idleDueTick !== null && now >= inst.idleDueTick)
        this.destroy(inst.id, 'enter-timeout');
    }
  }

  // A player enters a copy: the empty grace stops; a player leaving to empty starts it again.
  userJoined(id: number): void {
    const inst = this.instances.get(id);
    if (!inst) return;
    inst.users += 1;
    inst.idleDueTick = null;
  }

  userLeft(id: number, now: number): void {
    const inst = this.instances.get(id);
    if (!inst) return;
    inst.users = Math.max(0, inst.users - 1);
    const entry = this.db.get(inst.dbId);
    if (inst.users === 0 && inst.state === 'busy' && entry && entry.idleTicks !== null)
      inst.idleDueTick = now + entry.idleTicks;
  }

  destroy(id: number, reason: Reason): boolean {
    const inst = this.instances.get(id);
    if (!inst) return false;
    if (inst.state === 'queued') {
      const at = this.queue.indexOf(id);
      if (at >= 0) this.queue.splice(at, 1);
      if (this.queue.length === 0) this.pendingDue = null; // nothing left for the pending slot
    } else {
      this.unbuild(inst);
    }
    void reason; // the caller tells players why (donor: IN_DESTROY_* notify)
    this.owners.delete(`${inst.mode}:${inst.ownerId}`);
    this.instances.delete(id);
    return true;
  }

  get(id: number): Instance | undefined {
    return this.instances.get(id);
  }

  private buildFront(now: number): void {
    const id = this.queue.shift();
    if (id === undefined) return;
    const inst = this.instances.get(id);
    if (!inst) return; // destroyed while queued
    const entry = this.db.get(inst.dbId);
    if (!entry || !this.build(inst)) {
      this.destroy(id, 'user-request');
    } else {
      inst.state = 'busy';
      inst.keepDueTick = entry.limitTicks === null ? null : now + entry.limitTicks;
      inst.idleDueTick = entry.idleTicks === null ? null : now + entry.idleTicks;
    }
    // Next build waits one interval; the slot is only set when someone is still queued.
    this.pendingDue = this.queue.length > 0 ? now + BUILD_INTERVAL_TICKS : null;
  }
}

// Defaults for a copy that does not set its own limits.
const defaultEntry = (id: string): DbEntry => ({
  id,
  limitTicks: DEFAULT_LIMIT_S * TICK_RATE,
  idleTicks: DEFAULT_IDLE_S * TICK_RATE,
});

export { InstanceService, defaultEntry };
