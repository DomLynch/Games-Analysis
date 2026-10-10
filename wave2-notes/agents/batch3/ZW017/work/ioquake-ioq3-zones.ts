// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Reference-counted portal edges between zones. A door adds 1 to each side when it opens and
// removes 1 when it shuts, so two doors on one edge both have to be shut before the edge closes.
export class ZoneGraph {
  private count: number[][];
  private reachOf: number[];   // per zone: id of its connected group; equal ids = connected

  constructor(readonly zones: number) {
    this.count = Array.from({ length: zones }, () => new Array<number>(zones).fill(0));
    this.reachOf = new Array<number>(zones).fill(-1);
    this.flood();
  }

  openPortal(a: number, b: number): void {
    this.count[a][b]++;
    this.count[b][a]++;
    this.flood();
  }

  closePortal(a: number, b: number): void {
    if (this.count[a][b] <= 0) throw new Error("closePortal: negative reference count");
    this.count[a][b]--;
    this.count[b][a]--;
    this.flood();
  }

  connected(a: number, b: number): boolean {
    return this.reachOf[a] === this.reachOf[b];
  }

  // Recomputed on every portal change, not per query, so a query is a compare.
  private flood(): void {
    this.reachOf.fill(-1);
    let id = 0;
    for (let z = 0; z < this.zones; z++) {
      if (this.reachOf[z] !== -1) continue;
      const stack: number[] = [z];
      this.reachOf[z] = id;
      while (stack.length > 0) {
        const cur = stack.pop()!;
        for (let n = 0; n < this.zones; n++) {
          if (this.count[cur][n] > 0 && this.reachOf[n] === -1) {
            this.reachOf[n] = id;
            stack.push(n);
          }
        }
      }
      id++;
    }
  }
}

// An entity sits in its zone; a door-like entity may straddle two zones (zoneB = -1 if only one).
export interface Entity { id: number; zone: number; zoneB: number; }

// What a client in clientZone is sent: entities in any zone connected to it through open portals.
export function visibleFrom(g: ZoneGraph, clientZone: number, ents: Entity[]): number[] {
  const out: number[] = [];
  for (const e of ents) {
    if (g.connected(clientZone, e.zone) || (e.zoneB >= 0 && g.connected(clientZone, e.zoneB))) {
      out.push(e.id);
    }
  }
  return out;
}

export {};
