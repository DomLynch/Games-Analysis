// Sketch: deed queue with one-tick delivery and per-deed range (src/fight/witness.ts, parity row 4).
// simplified: keeps the donor's queue swap at tick start, per-deed squared range check, and
// fallback to the NPC's own sense range. Omits: the donor's script reactions (perceptionProcess
// invokes script states; here the caller callback stands in for them) and the cadence of each NPC.
// Reorders: the donor's unset test is "range > 0"; here -1 means unset so a 0 range is honoured
// (fix: donor treats 0 as unset). The hearing gate is kept ON for quiet deeds (donor comments it out).
// Data fields (designer-tunable): deed kind id, range per kind (unit: world units, -1 = unset),
// senseRange per NPC (unit: world units), hears (bool per NPC).
export {};

interface Deed {
  kind: number;
  x: number;
  z: number;
  self: number;                 // id of the actor (never reports to itself)
  other: number;
  victim: number | null;
  quiet: boolean;               // true for quiet deeds that need hearing
}

interface Npc {
  id: number;
  x: number;
  z: number;
  senseRange: number;
  hears: boolean;
  aiNormal: boolean;            // false while the NPC is busy with a scripted state
}

export class DeedQueue {
  private pending: Deed[] = []; // filled during this tick, delivered next tick
  private rangeByKind: number[];

  constructor(kinds: number) {
    this.rangeByKind = new Array<number>(kinds).fill(-1);
  }

  setRange(kind: number, range: number): void {
    this.rangeByKind[kind] = range;
  }

  send(deed: Deed): void {
    this.pending.push(deed);
  }

  // Called once per tick. Takes last tick's deeds, delivers each to nearby eligible NPCs.
  deliver(nearNpcs: Npc[], report: (npc: Npc, deed: Deed) => void): void {
    const batch = this.pending;
    this.pending = [];
    for (const npc of nearNpcs) {
      if (!npc.aiNormal) continue;
      for (const deed of batch) {
        if (deed.self === npc.id) continue;
        if (deed.quiet && !npc.hears) continue;
        const r = this.rangeByKind[deed.kind] >= 0 ? this.rangeByKind[deed.kind] : npc.senseRange;
        const dx = npc.x - deed.x;
        const dz = npc.z - deed.z;
        if (dx * dx + dz * dz > r * r) continue;   // squared compare, as the donor does
        report(npc, deed);
      }
    }
  }
}
