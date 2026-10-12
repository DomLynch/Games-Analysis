// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Offset { dx: number; dy: number; d2: number }

export const MAX_R = 5;      // donor common/fc_types.h:87 (CITY_MAP_MAX_RADIUS)
export const MIN_R2 = 1;     // donor common/city.h: (CITY_MAP_MIN_RADIUS * CITY_MAP_MIN_RADIUS + 1) with min radius 0
export const MAX_R2 = 26;    // donor common/city.h:85: (CITY_MAP_MAX_RADIUS * CITY_MAP_MAX_RADIUS + 1)

// All offsets inside the largest footprint, nearest first; ties by dx then dy (donor comparator, common/city.c 343-360).
const ORDER: Offset[] = (() => {
  const out: Offset[] = [];
  for (let dx = -MAX_R; dx <= MAX_R; dx++) {
    for (let dy = -MAX_R; dy <= MAX_R; dy++) {
      const d2 = dx * dx + dy * dy;
      if (d2 <= MAX_R2) out.push({ dx, dy, d2 });
    }
  }
  return out.sort((a, b) => a.d2 - b.d2 || a.dx - b.dx || a.dy - b.dy);
})();

export function tilesFor(r2: number): Offset[] {
  return ORDER.filter(o => o.d2 <= r2);
}

export interface Hub {
  r2: number;                      // stored squared radius (starts at the base)
  occupant: Map<string, string>;   // "dx,dy" -> service id on that slot
  idle: string[];                  // services with no slot left (donor: specialists)
}

export interface RadiusChange { changed: boolean; displaced: number; idled: number }

const key = (o: Offset): string => `${o.dx},${o.dy}`;

// Donor: city_map_update_radius_sq. Base plus summed effect bonuses, clamped; no change if the tile count is the same.
export function setRadius(hub: Hub, baseR2: number, bonuses: number[]): RadiusChange {
  const sum = bonuses.reduce((s, b) => s + b, 0);
  const want = Math.min(MAX_R2, Math.max(MIN_R2, baseR2 + sum));
  if (want === hub.r2) return { changed: false, displaced: 0, idled: 0 };

  const oldTiles = tilesFor(hub.r2);
  const newTiles = tilesFor(want);
  if (oldTiles.length === newTiles.length) {
    // donor returns before storing, so the stored radius keeps its old value
    return { changed: false, displaced: 0, idled: 0 };
  }

  hub.r2 = want;

  if (newTiles.length > oldTiles.length) {
    // grow: no service moves; new slots start empty
    return { changed: true, displaced: 0, idled: 0 };
  }

  // shrink: services on removed slots are lifted, then refilled nearest free slot first; the rest go idle
  const newKeys = new Set(newTiles.map(key));
  const displaced: string[] = [];
  for (const o of oldTiles) {
    if (newKeys.has(key(o))) continue;
    const k = key(o);
    const who = hub.occupant.get(k);
    if (who !== undefined) {
      displaced.push(who);
      hub.occupant.delete(k);
    }
  }

  let idled = 0;
  for (const who of displaced) {
    const slot = newTiles.find(o => !hub.occupant.has(key(o)));
    if (slot !== undefined) {
      hub.occupant.set(key(slot), who);
    } else {
      hub.idle.push(who);
      idled++;
    }
  }
  return { changed: true, displaced: displaced.length, idled };
}
