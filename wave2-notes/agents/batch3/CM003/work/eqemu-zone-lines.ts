// Licence: GPL-3.0-or-later (donor, EQEmu). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pos { x: number; y: number; z: number }

// Donor sentinel: 999999 (or -999999) on an axis means "any" for a trigger, or "keep the current value" for an arrival.
const ANY = 999999;

interface Box { halfW: number; halfD: number; zBelow: number; height: number }

interface ZoneLine {
  id: number;
  x: number; y: number; z: number;             // trigger position
  targetZone: number;
  targetX: number; targetY: number; targetZ: number;
  box?: Box;                                   // present for a virtual zone box, absent for a physical line
}

interface Bind { zone: number; x: number; y: number; z: number }

function isAny(v: number): boolean {
  return v === ANY || v === -ANY;
}

// Squared planar distance; an axis marked ANY does not count. Both sentinel signs are handled on each axis.
function planarDistSq(p: Pos, l: ZoneLine): number {
  const dx = isAny(l.x) ? 0 : p.x - l.x;
  const dy = isAny(l.y) ? 0 : p.y - l.y;
  return dx * dx + dy * dy;
}

// Nearest physical line to the target zone within maxRange world units.
// Fix: the donor compares a true distance with a squared bound; here both are true distances.
export function nearestLine(lines: ZoneLine[], p: Pos, targetZone: number, maxRange: number): ZoneLine | null {
  let best: ZoneLine | null = null;
  let bestDist = Infinity;
  for (const l of lines) {
    if (l.targetZone !== targetZone || l.box !== undefined) continue;
    const d = Math.sqrt(planarDistSq(p, l));
    if (d < bestDist) {
      best = l;
      bestDist = d;
    }
  }
  return best !== null && bestDist <= maxRange ? best : null;
}

// Arrival point: a target axis marked ANY keeps the coordinate the player came from.
export function arrival(line: ZoneLine, from: Pos): Pos {
  return {
    x: isAny(line.targetX) ? from.x : line.targetX,
    y: isAny(line.targetY) ? from.y : line.targetY,
    z: isAny(line.targetZ) ? from.z : line.targetZ,
  };
}

// Virtual box: separate half sizes per axis (donor uses one width for both), strict bounds as in the donor,
// height band from zBelow under the box z up to height above it.
export function inVirtualBox(p: Pos, l: ZoneLine): boolean {
  const b = l.box;
  if (b === undefined) return false;
  return p.x > l.x - b.halfW && p.x < l.x + b.halfW
    && p.y > l.y - b.halfD && p.y < l.y + b.halfD
    && p.z >= l.z - b.zBelow && p.z < l.z + b.height;
}

// Gate and death travel: bind slot 0 is the home hub.
export function homeFor(binds: Bind[]): Bind {
  return binds[0];
}

export {};
