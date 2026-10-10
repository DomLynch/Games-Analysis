// Licence: MIT (donor LICENSE, Copyright (c) 2025 KsanaDock). Adapted shape; not a line-by-line copy.
// One id per zone. The donor keys zones by Godot node name and shows the display name to the AI; this sketch keeps only the id.
export type ZoneId = string;

export interface ZoneRect {
  id: ZoneId;          // zone id (donor: Area2D node name, RoomManager.gd:27)
  name: string;        // display name only (donor: room_name export, RoomArea.gd:3)
  description: string; // donor: room_desc export, RoomArea.gd:4
  cx: number;          // centre x, px (donor: Area2D origin + CollisionShape2D position, RoomManager.gd:20)
  cy: number;          // centre y, px
  w: number;           // full width, px (donor reads shape.extents * 2, RoomManager.gd:23)
  h: number;           // full height, px
}

export interface ZoneRegistry {
  zones: Map<ZoneId, ZoneRect>;
}

// Built once at load, like the donor's deferred _init_rooms (RoomManager.gd:10-12).
export function buildRegistry(authored: ZoneRect[]): ZoneRegistry {
  const zones = new Map<ZoneId, ZoneRect>();
  for (const z of authored) {
    if (zones.has(z.id)) throw new Error(`duplicate zone id: ${z.id}`); // added: donor overwrites silently
    if (!(z.w > 0 && z.h > 0)) throw new Error(`zone ${z.id} has no rectangle`); // added: donor falls back to 100x100
    zones.set(z.id, z);
  }
  return { zones };
}

// Point-in-zone: centre +/- half size, inclusive edges, first match in insertion order (RoomManager.gd:30-35, 38-50).
export function zoneAt(reg: ZoneRegistry, x: number, y: number): ZoneRect | null {
  for (const z of reg.zones.values()) {
    if (z.cx === 0 && z.cy === 0) continue; // donor guard: a zone centred on the origin never matches (RoomManager.gd:40)
    const left = z.cx - z.w / 2;
    const right = z.cx + z.w / 2;
    const top = z.cy - z.h / 2;
    const bottom = z.cy + z.h / 2;
    if (x >= left && x <= right && y >= top && y <= bottom) return z;
  }
  return null; // corridor or gap: no zone (AIAgent then shows an unknown location)
}

export {};
