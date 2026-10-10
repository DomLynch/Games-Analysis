// Licence: GPL-3.0-or-later (donor ScummVM). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vec { x: number; z: number }
interface Floor { x1: number; x2: number; z1: number; z2: number; camera: string | null }
interface Region { camera: string; polygon: Vec[] }     // override camera zone

const BAND = 30;                                        // elastic margin and pin radius (data in practice)

function inPolygon(p: Vec, poly: Vec[]): boolean {      // even-odd crossing test
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

class CameraDirector {
  current: string | null = null;
  private anchor: Floor | null = null;
  private region: Region | null = null;
  private entryPin: Vec | null = null;                 // held while we stay within BAND of where we entered a region
  private exitPin: Vec | null = null;                  // blocks re-entering a region until we walk BAND away
  locked = false;                                      // manual camera or lock: director does nothing

  constructor(private floors: Floor[], private regions: Region[]) {}

  // One call per fixed logic step. floorIdx is the floor under the followed actor (-1 = none).
  step(pos: Vec, floorIdx: number): string | null {
    if (this.locked) return this.current;
    const d2 = (p: Vec) => (pos.x - p.x) ** 2 + (pos.z - p.z) ** 2;

    if (this.region) {
      if (this.entryPin && d2(this.entryPin) < BAND * BAND) return this.current;   // still held by the band
      this.entryPin = null;
      if (inPolygon(pos, this.region.polygon)) return this.current;               // still inside the region
      this.region = null;                                                          // left it
      this.exitPin = { ...pos };
      this.current = null;                                                         // force a fresh pick below
    }
    if (this.exitPin && d2(this.exitPin) > BAND * BAND) this.exitPin = null;
    if (!this.exitPin) {
      const hit = this.regions.find(r => inPolygon(pos, r.polygon));
      if (hit) { this.region = hit; this.entryPin = { ...pos }; this.current = hit.camera; return this.current; }
    }

    if (floorIdx < 0) return this.current;              // not on any floor: keep the current view
    const f = this.floors[floorIdx];
    if (f.camera === this.current) return this.current;
    if (this.current !== null && this.anchor &&         // elastic: stay while near the floor we switched on
        pos.x >= this.anchor.x1 - BAND && pos.x <= this.anchor.x2 + BAND &&
        pos.z >= this.anchor.z1 - BAND && pos.z <= this.anchor.z2 + BAND) return this.current;
    if (f.camera === null) return this.current;         // donor falls back to a temporary mode here; sketch just keeps the view
    this.current = f.camera;
    this.anchor = f;
    return this.current;
  }
}
export {}
