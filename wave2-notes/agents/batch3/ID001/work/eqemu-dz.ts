// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface DzCfg {
  removalDelayMs: number;      // a removed member is kicked this long after removal (zone data)
  emptyShutdownEnabled: boolean;
  emptyShutdownS: number;      // grace kept after the last member leaves while the zone is empty (zone data)
  sweepEveryMs: number;        // world sweep interval (rule, 6000 in the donor)
  leaderCooldownMs: number;    // minimum gap between leader changes (donor value not read)
}

interface Lockout { event: string; expireAt: number; durationS: number; replay: boolean; }

interface Dz {
  id: number;
  members: Map<string, { online: boolean; inZone: boolean }>; // roster ledger keyed by character id
  leaderId: string | null;
  durationS: number;
  expireAt: number;            // ms; the one expiry the world sweep and the zone timer both read
  earlyShutdownArmed: boolean; // empty grace is applied once
  leaderDirty: boolean;        // set when a leader change was blocked by the cooldown
  lastLeaderChangeAt: number;
  pendingKick: Map<string, number>; // removed character id -> ms when the zone kicks them
  lockouts: Lockout[];
}

export class DzRegistry {
  private byId = new Map<number, Dz>();
  private nextId = 1;

  constructor(private cfg: DzCfg) {}

  create(durationS: number, memberIds: string[], now: number): Dz {
    const dz: Dz = {
      id: this.nextId++, members: new Map(), leaderId: memberIds[0] ?? null, durationS,
      expireAt: now + durationS * 1000, earlyShutdownArmed: false, leaderDirty: false,
      lastLeaderChangeAt: Number.NEGATIVE_INFINITY, pendingKick: new Map(), lockouts: [],
    };
    for (const id of memberIds) dz.members.set(id, { online: true, inZone: false });
    this.byId.set(dz.id, dz);
    return dz;
  }

  addMember(dz: Dz, charId: string): void {
    dz.members.set(charId, { online: true, inZone: false });
    dz.pendingKick.delete(charId);               // re-added before the kick: no kick
  }

  removeMember(dz: Dz, charId: string, now: number): void {
    dz.members.delete(charId);
    dz.pendingKick.set(charId, now + this.cfg.removalDelayMs);
    if (charId === dz.leaderId) this.electLeader(dz, now);
  }

  // Leader rule: prefer a non-leader member who is in the zone, else any non-leader member. Blocked by a cooldown; retried later.
  electLeader(dz: Dz, now: number): void {
    if (dz.members.size === 0 || now - dz.lastLeaderChangeAt < this.cfg.leaderCooldownMs) {
      dz.leaderDirty = true;
      return;
    }
    const others = [...dz.members.keys()].filter(id => id !== dz.leaderId);
    const pick = others.find(id => dz.members.get(id)?.inZone === true) ?? others[0];
    if (pick !== undefined) {
      dz.leaderId = pick;
      dz.lastLeaderChangeAt = now;
      dz.leaderDirty = false;
    }
  }

  // Character ids whose removal kick is due. Called on each zone tick for that instance.
  dueKicks(dz: Dz, now: number): string[] {
    const due: string[] = [];
    for (const [charId, at] of dz.pendingKick) {
      if (now >= at && !dz.members.has(charId)) {
        due.push(charId);
        dz.pendingKick.delete(charId);
      }
    }
    return due;
  }

  // A joining member gets a fresh copy of the instance's replay timer, unless they already have one.
  joinLockouts(dz: Dz, charLockouts: Lockout[], now: number): Lockout[] {
    const replay = dz.lockouts.find(l => l.replay);
    if (!replay || charLockouts.some(l => l.replay)) return charLockouts;
    return [...charLockouts, { ...replay, expireAt: now + replay.durationS * 1000 }];
  }

  // World sweep, every cfg.sweepEveryMs. zonePlayers returns undefined when no zone runs the instance.
  sweep(now: number, zonePlayers: (dzId: number) => number | undefined): number[] {
    const gone: number[] = [];
    for (const dz of this.byId.values()) {
      if (dz.members.size === 0 && this.cfg.emptyShutdownEnabled && !dz.earlyShutdownArmed) {
        dz.earlyShutdownArmed = true;
        dz.expireAt = Math.min(dz.expireAt, now + this.cfg.emptyShutdownS * 1000); // reduce only, once
      }
      if (now < dz.expireAt) continue;
      if ((zonePlayers(dz.id) ?? 0) > 0) continue; // zone still has people; its own kick timers move them out
      gone.push(dz.id);
    }
    for (const id of gone) this.byId.delete(id);
    return gone;
  }
}

export {};
