// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface Checksum { rng: number; objs: number; objIds: number; events: number; evIds: number }
export interface Batch { checksum: Checksum; cmds: string[] } // cmds are opaque command strings; checksum taken before they run
export interface Lane { id: number; batches: Batch[] }        // batches queued for future NWFs, oldest first

export function sameChecksum(a: Checksum, b: Checksum): boolean {
  return a.rng === b.rng && a.objs === b.objs && a.objIds === b.objIds && a.events === b.events && a.evIds === b.evIds;
}

export class NwfQueue {
  private lanes: Lane[] = [];

  // cmdDelay: a batch sent during NWF n runs at NWF n + cmdDelay (donor: 3, GameServer.cpp:542)
  constructor(readonly cmdDelay: number) {
    if (cmdDelay < 1) throw new Error("command delay must be at least 1");
  }

  addPlayer(id: number): void {
    if (!this.lanes.some((l) => l.id === id)) this.lanes.push({ id, batches: [] });
  }

  // Back-pressure: at most 2 * cmdDelay batches queued per player (donor: NWFInfo.cpp:49-50).
  offer(id: number, batch: Batch): boolean {
    const lane = this.lanes.find((l) => l.id === id);
    if (lane === undefined) throw new Error("unknown player");
    if (lane.batches.length >= 2 * this.cmdDelay) return false;
    lane.batches.push(batch);
    return true;
  }

  // An NWF may run only when every player has a batch for it; a missing batch means that player is lagging.
  ready(): boolean {
    return this.lanes.length > 0 && this.lanes.every((l) => l.batches.length > 0);
  }

  // Runs one NWF: takes one batch per player. A player whose checksum differs from the first player's is reported.
  execute(): { cmds: Map<number, string[]>; mismatched: number[] } {
    if (!this.ready()) throw new Error("NWF not ready");
    const ref = this.lanes[0].batches[0].checksum;
    const cmds = new Map<number, string[]>();
    const mismatched: number[] = [];
    for (const lane of this.lanes) {
      const b = lane.batches.shift();
      if (b === undefined) throw new Error("unreachable: ready() checked");
      if (!sameChecksum(b.checksum, ref)) mismatched.push(lane.id);
      cmds.set(lane.id, b.cmds);
    }
    return { cmds, mismatched };
  }
}

export interface Pacer { lastMs: number; gfMs: number }

// Returns true when one game frame should run now. Advances by exactly one GF, not to "now" (donor: GameClient.cpp:1321).
export function paceOneGf(p: Pacer, nowMs: number): boolean {
  if (nowMs - p.lastMs < p.gfMs) return false;
  p.lastMs += p.gfMs;
  return true;
}

// Lag cap after a frame: up to maxLagGf frames of lag are carried; beyond that, simulation time is dropped (donor: GameClient.cpp:1390-1397).
export function capLag(p: Pacer, nowMs: number, maxLagGf = 5): void {
  const frame = nowMs - p.lastMs;
  if (frame >= p.gfMs && frame > maxLagGf * p.gfMs) {
    p.lastMs += frame - (p.gfMs - 1); // skip simulation time so the lag is just under one GF
  }
}
