// Licence: GPL-2.0 (donor header: "terms of the GNU General Public License, version 2"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = "enemy" | "boss" | "monitor" | "spring" | "player";

interface Body { x: number; y: number; z: number; height: number; }
interface Candidate extends Body { id: number; alive: boolean; kind: Kind; }
interface Seeker extends Body { facing: number; radius: number; }  // facing in radians

interface LockOpts {
  bullet: boolean;               // true: aimed shot (long reach, narrow cone); false: homing
  rangeUnits: number;            // data: reach, donor uses 2x base for bullet
  coneHalfRad: number;           // data: horizontal half-cone (donor: 30 deg bullet, 90 deg homing)
  maxElevationRad: number;       // data: vertical half-cone, bullet only
  stepUnits: number;             // data: homing only, highest a target may sit above the seeker's z
  allowKinds: Set<Kind>;         // data per ability (donor: three call sites differ here)
  sight: (from: Body, to: Candidate) => boolean;
}

function wrapRad(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// Nearest valid target in the seeker's cone. Cheap tests first, sight last.
function lockOn(me: Seeker, all: Candidate[], o: LockOpts): Candidate | null {
  let best: Candidate | null = null;
  let bestDist = 0;
  for (const c of all) {
    if (!c.alive || c.kind === "player" || !o.allowKinds.has(c.kind)) continue;

    const h = Math.hypot(me.x - c.x, me.y - c.y);                 // horizontal distance
    const dz = (me.z + me.height / 2) - (c.z + c.height / 2);     // centre-to-centre height
    if (o.bullet) {
      if (Math.abs(Math.atan2(dz, h)) > o.maxElevationRad) continue;
    } else if (c.z > me.z + o.stepUnits) {
      continue;                                                  // too far above the seeker
    }
    const d = Math.hypot(h, dz);                                   // 3D distance
    if (d > o.rangeUnits) continue;
    if (best && d > bestDist) continue;                            // equal distance passes, so a later candidate wins a tie

    const ox = me.x + Math.cos(me.facing) * me.radius;             // cone origin: one radius ahead of the seeker
    const oy = me.y + Math.sin(me.facing) * me.radius;
    const off = wrapRad(Math.atan2(c.y - oy, c.x - ox) - me.facing);
    if (Math.abs(off) > o.coneHalfRad) continue;

    if (!o.sight(me, c)) continue;
    best = c;
    bestDist = d;
  }
  return best;
}
export {};
