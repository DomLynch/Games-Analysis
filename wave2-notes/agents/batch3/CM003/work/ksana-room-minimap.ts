// Licence: MIT (donor, KsanaDock). Sketch written from the described mechanism; not a translation of the donor lines.
interface Vec2 { x: number; y: number }

// A room is an axis-aligned rectangle given by its centre and full size (rows in the map data).
interface Room { id: string; name: string; centre: Vec2; size: Vec2 }

// Inclusive point-in-rectangle test, as in the donor.
export function inRoom(p: Vec2, r: Room): boolean {
  const left = r.centre.x - r.size.x / 2;
  const right = r.centre.x + r.size.x / 2;
  const top = r.centre.y - r.size.y / 2;
  const bottom = r.centre.y + r.size.y / 2;
  return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
}

// First match in list order, as in the donor. The shipped map has no overlapping rooms (checked from its rectangles).
export function currentRoom(rooms: Room[], p: Vec2): Room | null {
  for (const r of rooms) {
    if (inRoom(p, r)) return r;
  }
  return null;
}

export type Compass = "E" | "NE" | "N" | "NW" | "W" | "SW" | "S" | "SE";

const SECTORS: readonly Compass[] = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];

// Eight 45-degree sectors centred on the compass points.
// Fix: screen y points down, so north (up on the map) is negative y. The donor labels +y as north.
export function compass(from: Vec2, to: Vec2): Compass {
  const deg = (Math.atan2(-(to.y - from.y), to.x - from.x) * 180) / Math.PI;
  const norm = ((deg % 360) + 360) % 360;
  const idx = Math.round(norm / 45) % 8;
  return SECTORS[idx];
}

export interface MinimapRow { name: string; distancePx: number; direction: Compass }

// Minimap list: every room, nearest first. Distances are pixels (the donor's text says metres).
export function minimapRows(rooms: Room[], from: Vec2): MinimapRow[] {
  return rooms
    .map((r) => ({
      name: r.name,
      distancePx: Math.hypot(r.centre.x - from.x, r.centre.y - from.y),
      direction: compass(from, r.centre),
    }))
    .sort((a, b) => a.distancePx - b.distancePx);
}

export {};
