// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Guard call-in: a criminal act opens a candidate window (re-armed by each new act); a witness or a call
// spawns guards for that target, reusing idle guards near it before spawning new ones; idle guards leave.

export interface Pos {
  x: number;
  y: number;
}

export interface Guard {
  id: number;
  focus: number | null; // target id this guard answers, or null when idle
  pos: Pos;
  idleMs: number;       // time spent idle, used for despawn
  post: Pos | null;     // spawner post; null when the guard has none
  parked: boolean;      // true once a post guard has returned to its post
}

export interface Candidate {
  targetId: number;
  expiresAt: number;    // ms timestamp; re-armed on every new offence
}

export interface GuardConfig {
  candidateWindowMs: number; // zone data: donor 15000
  guardRadius: number;       // zone data: donor 15 tiles to count guards on a target
  idleDespawnMs: number;     // engine constant: derived 42000 from donor idle timer
  guardCap: number;          // zone data: not in donor, added by us as a cap
}

function chebyshev(a: Pos, b: Pos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export class GuardDispatch {
  private candidates = new Map<number, Candidate>();
  private guards: Guard[] = [];
  private nextId = 1;

  constructor(private cfg: GuardConfig) {}

  // A criminal act or a murderer seen in a guarded zone. Returns guards spawned now.
  // simplified: the donor picks the nearest human NPC within 8 tiles as the witness; here the caller passes witnessNearby.
  markCandidate(targetId: number, pos: Pos, now: number, witnessNearby: boolean): number {
    const existing = this.candidates.get(targetId);
    if (existing) {
      // donor restarts the 15 s timer; it does not call guards a second time from this path
      existing.expiresAt = now + this.cfg.candidateWindowMs;
      return 0;
    }
    this.candidates.set(targetId, { targetId, expiresAt: now + this.cfg.candidateWindowMs });
    if (!witnessNearby) return 0;
    this.candidates.delete(targetId);
    return this.callGuards(targetId, pos, 1, false);
  }

  // Donor BaseGuard.Spawn: reuse idle guards near the target first, count guards already on it, spawn the rest.
  // simplified: the donor's range query is not read; Chebyshev distance is used here. Spawn placement is not read.
  callGuards(targetId: number, pos: Pos, amount: number, onlyAdditional: boolean, post: Pos | null = null): number {
    let want = amount;
    for (const g of this.guards) {
      if (chebyshev(g.pos, pos) > this.cfg.guardRadius) continue;
      if (g.focus === null) {
        g.focus = targetId;
        g.idleMs = 0;
        want--;
      } else if (g.focus === targetId && !onlyAdditional) {
        want--;
      }
    }

    const onTarget = this.guards.filter((g) => g.focus === targetId).length;
    const room = Math.max(0, this.cfg.guardCap - onTarget);
    const spawn = Math.min(Math.max(want, 0), room);
    for (let i = 0; i < spawn; i++) {
      this.guards.push({ id: this.nextId++, focus: targetId, pos: { ...pos }, idleMs: 0, post, parked: false });
    }
    return spawn;
  }

  // Advance time. Expired candidate windows close; idle guards accumulate idle time and leave when it reaches the limit.
  tick(now: number, dtMs: number): void {
    for (const [id, c] of this.candidates) {
      if (now >= c.expiresAt) this.candidates.delete(id);
    }
    this.guards = this.guards.filter((g) => {
      if (g.focus !== null || g.parked) return true;
      g.idleMs += dtMs;
      if (g.idleMs < this.cfg.idleDespawnMs) return true;
      if (g.post === null) return false; // no post: the guard leaves
      g.pos = { ...g.post };             // post guard: returns to its post and stays there
      g.parked = true;
      return true;
    });
  }

  guardCount(): number {
    return this.guards.length;
  }
}

export {};
