// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const ZONE_UNIT = 8192;   // world units per grid cell
const ZONE_SPAN = 65536;  // a zone's local extent (u16 local range)
const LUT_SIZE = 512;     // zone ids are 9 bits

interface ZoneRow { id: number; region: number; ox: number; oy: number; } // offsets in grid cells

// Zone id from an entity packet: low byte, plus the 9th bit from flags 0x04.
function zoneIdFromPacket(zoneByte: number, flags: number): number {
  return (zoneByte & 0xff) | ((flags & 0x04) << 6);
}

class ZoneFrame {
  private readonly byId: (ZoneRow | undefined)[] = new Array(LUT_SIZE);
  private readonly rows: ZoneRow[];

  constructor(rows: ZoneRow[]) {
    this.rows = [...rows].sort((a, b) => a.id - b.id);
    for (const r of this.rows) {
      if (!Number.isInteger(r.id) || r.id < 0 || r.id >= LUT_SIZE) {
        throw new Error(`zone id out of range: ${r.id}`);
      }
      this.byId[r.id] = r;
    }
  }

  // Explicit range check: an id >= LUT_SIZE returns undefined, it does not alias onto another zone.
  get(id: number): ZoneRow | undefined {
    if (!Number.isInteger(id) || id < 0 || id >= LUT_SIZE) return undefined;
    return this.byId[id];
  }

  // World position from zone-local coordinates. Unknown zone: local coordinates pass through.
  worldFromLocal(id: number, lx: number, ly: number, z: number): [number, number, number] {
    const r = this.get(id);
    if (!r) return [lx, ly, z];
    return [r.ox * ZONE_UNIT + lx, r.oy * ZONE_UNIT + ly, z];
  }

  // Zone under a world point in one region. Among the zones whose rectangle holds the point,
  // the nearest centre wins; a tie keeps the lower id (rows are sorted by id).
  zoneAt(region: number, x: number, y: number): number | undefined {
    let best: number | undefined;
    let bestD2 = Infinity;
    for (const r of this.rows) {
      if (r.region !== region) continue;
      const x0 = r.ox * ZONE_UNIT;
      const y0 = r.oy * ZONE_UNIT;
      if (x < x0 || x >= x0 + ZONE_SPAN || y < y0 || y >= y0 + ZONE_SPAN) continue;
      const dx = x - (x0 + ZONE_SPAN / 2);
      const dy = y - (y0 + ZONE_SPAN / 2);
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = r.id; }
    }
    return best;
  }
}

export {};
