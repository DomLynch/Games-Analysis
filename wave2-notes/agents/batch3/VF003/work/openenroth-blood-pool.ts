// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const SPLAT_SOURCES_PER_PASS = 64;  // live splat sources per render pass
const DECAL_POOL_SIZE = 1024;       // baked decals kept per level; oldest is overwritten
const LANDING_LIFT = 30;            // a splat sits this many units above ground
const WATER_FADE_REAL_S = 30;       // only water/shore decals fade, over this many real seconds
const TICKS_PER_REAL_SECOND = 128;  // game timer ticks per real second

type CorpseState = "alive" | "dying" | "dead";

interface Corpse {
  x: number; y: number; z: number;
  radius: number;
  state: CorpseState;
  bloodFlag: boolean;   // catalogue row: does this monster bleed on landing
  splatDone: boolean;   // one splat per corpse
}

interface Source { x: number; y: number; z: number; radius: number; }

interface Decal { x: number; y: number; z: number; radius: number; fadeStartS: number | null; }

interface GroundPatch { x: number; y: number; z: number; }

// Game ticks to real seconds. (The donor accessor named ...MillisecondsFloat returns seconds.)
function realSecondsFromTicks(ticks: number): number {
  return ticks / TICKS_PER_REAL_SECOND;
}

class BloodPool {
  private sources: Source[] = [];
  private decals: Array<Decal | undefined> = new Array(DECAL_POOL_SIZE);
  private nextDecal = 0;
  dropped = 0;

  constructor(private readonly bloodOn: boolean, private readonly radiusMultiplier: number) {}

  // Called from the world update, once per corpse per pass.
  landed(c: Corpse, groundZ: number): void {
    if (c.splatDone) return;
    if (c.state !== "dead" && c.state !== "dying") return;
    if (c.z >= groundZ + LANDING_LIFT) return;
    if (!c.bloodFlag) return;      // flag off: corpse stays unmarked
    c.splatDone = true;
    if (!this.bloodOn) return;     // setting off: marked done, no splat
    if (this.sources.length >= SPLAT_SOURCES_PER_PASS) { this.dropped++; return; }
    this.sources.push({ x: c.x, y: c.y, z: groundZ + LANDING_LIFT, radius: c.radius * this.radiusMultiplier });
  }

  // Called from the render pass with ground patches near the sources. Each hit is baked into the pool once.
  bake(patches: GroundPatch[], nowS: number, waterOrShore: (p: GroundPatch) => boolean): void {
    for (const s of this.sources) {
      for (const p of patches) {
        if (Math.hypot(p.x - s.x, p.y - s.y) > s.radius) continue;
        this.decals[this.nextDecal] = {
          x: p.x, y: p.y, z: p.z, radius: s.radius,
          fadeStartS: waterOrShore(p) ? nowS : null,
        };
        this.nextDecal = (this.nextDecal + 1) % DECAL_POOL_SIZE;
      }
    }
    this.sources = [];
  }

  // Draw-time alpha: permanent decals stay at 1; water/shore decals fade linearly from their bake time.
  alpha(d: Decal, nowS: number): number {
    if (d.fadeStartS === null) return 1;
    const a = 1 - (nowS - d.fadeStartS) / WATER_FADE_REAL_S;
    return Math.min(1, Math.max(0, a));
  }
}
