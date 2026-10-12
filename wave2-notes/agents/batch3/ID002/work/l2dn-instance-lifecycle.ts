// Clean-room shape of an instance-world lifecycle (rules re-expressed in our own words; MIT donor, shape only here).
export type ExitKind = 'origin' | 'fixed' | 'random' | 'town';

export interface InstanceZoneData {
  durationS: number | null;   // null = no timer. 0 is rejected (donor treats 0 as "destroy at once")
  emptyGraceS: number;        // < 0 = never destroyed while empty; 0 = destroyed at once when empty
  ejectDeadS: number;         // 0 = dead players are not ejected
  warnAtS: number[];          // warning checkpoints before the end, e.g. [300, 60]
  exit: ExitKind;
}

export interface World {
  id: number;
  data: InstanceZoneData;
  endAt: number | null;       // ms epoch; null = no timer
  emptySince: number | null;  // set when the last player leaves
  allowed: Set<number>;       // player ids allowed to re-enter (per-party state)
  players: Set<number>;
  deadSince: Map<number, number>;
  warned: Set<number>;
  destroyed: boolean;
}

export type WorldEvent =
  | { kind: 'warn'; secondsLeft: number }
  | { kind: 'eject'; playerId: number }
  | { kind: 'destroy' };

export function newWorld(id: number, data: InstanceZoneData, allowed: number[], now: number): World {
  if (data.durationS !== null && data.durationS <= 0) {
    throw new Error('durationS must be null (no timer) or > 0');
  }
  return {
    id,
    data,
    endAt: data.durationS === null ? null : now + data.durationS * 1000,
    emptySince: null,
    allowed: new Set(allowed),
    players: new Set<number>(),
    deadSince: new Map<number, number>(),
    warned: new Set<number>(),
    destroyed: false,
  };
}

export function onEnter(w: World, playerId: number): void {
  w.players.add(playerId);
  w.emptySince = null;                       // re-entry cancels the empty grace
}

export function onLeave(w: World, playerId: number, now: number): void {
  w.players.delete(playerId);
  w.deadSince.delete(playerId);
  if (w.players.size === 0 && w.data.emptyGraceS >= 0) {
    w.emptySince = now;
  }
}

export function onDeath(w: World, playerId: number, now: number): void {
  if (w.data.ejectDeadS > 0) w.deadSince.set(playerId, now);
}

export function onRevive(w: World, playerId: number): void {
  w.deadSince.delete(playerId);
}

// Called on each server tick (or on each state change in tests). Pure: returns the events to send.
export function tick(w: World, now: number): WorldEvent[] {
  if (w.destroyed) return [];
  const events: WorldEvent[] = [];

  // 1. Warnings fire once each, when the remaining time reaches the checkpoint (not on a re-scheduled step).
  if (w.endAt !== null) {
    const remainingS = (w.endAt - now) / 1000;
    for (const s of w.data.warnAtS) {
      if (!w.warned.has(s) && remainingS <= s) {
        w.warned.add(s);
        events.push({ kind: 'warn', secondsLeft: s });
      }
    }
  }

  // 2. Dead players past their grace are ejected.
  if (w.data.ejectDeadS > 0) {
    for (const [pid, t] of [...w.deadSince.entries()]) {
      if (now - t >= w.data.ejectDeadS * 1000 && w.players.has(pid)) {
        w.players.delete(pid);
        w.deadSince.delete(pid);
        events.push({ kind: 'eject', playerId: pid });
      }
    }
  }

  // 3. Empty grace: destroy early only if the grace ends before the natural end.
  let destroyAt: number | null = w.endAt;
  if (w.players.size === 0 && w.emptySince !== null && w.data.emptyGraceS >= 0) {
    const graceEnd = w.emptySince + w.data.emptyGraceS * 1000;
    if (w.endAt === null || graceEnd < w.endAt) {
      destroyAt = destroyAt === null ? graceEnd : Math.min(destroyAt, graceEnd);
    }
  }

  // 4. Destroy at the chosen time: eject everyone still inside, then remove.
  if (destroyAt !== null && now >= destroyAt) {
    for (const pid of w.players) events.push({ kind: 'eject', playerId: pid });
    w.players.clear();
    w.destroyed = true;
    events.push({ kind: 'destroy' });
  }
  return events;
}

export {};
