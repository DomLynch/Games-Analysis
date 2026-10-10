// Licence: MIT (donor, cuteshaun-lineage2-api, Copyright (c) 2026 Andrii Tsapko). Adaptable; this sketch is a rewrite of the shape.
interface Anchor { id: number; x: number; y: number; minLevel: number; }
interface Spawn { x: number; y: number; }

const THRESHOLD = 10000;   // max 2D distance in game units (donor: LOCATION_NEAREST_DISTANCE_THRESHOLD)

// Nearest anchor by squared 2D distance, ties to the lowest id, null beyond the threshold.
// Assumes anchors are sorted by id ascending, so a strict "<" already keeps the lowest id on a tie.
function resolveZone(anchors: Anchor[], x: number, y: number): Anchor | null {
  if (anchors.length === 0) return null;
  const limit2 = THRESHOLD * THRESHOLD;
  let best: Anchor | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;
  for (const a of anchors) {
    const dx = a.x - x;
    const dy = a.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = a; }
  }
  return best !== null && bestD2 <= limit2 ? best : null;
}

// A group's home zone: the most frequent resolved zone among its spawns, ties to the lowest id.
// Spawns that resolve to nothing are skipped; no resolved spawn gives null (the field is omitted).
function homeZone(anchors: Anchor[], spawns: Spawn[], overrideZoneId?: number): Anchor | null {
  if (overrideZoneId !== undefined) {
    const forced = anchors.find((a) => a.id === overrideZoneId);
    if (forced) return forced;
  }
  const counts = new Map<number, { zone: Anchor; count: number }>();
  for (const s of spawns) {
    const z = resolveZone(anchors, s.x, s.y);
    if (!z) continue;
    const hit = counts.get(z.id);
    if (hit) hit.count += 1;
    else counts.set(z.id, { zone: z, count: 1 });
  }
  let best: Anchor | null = null;
  let bestCount = -1;
  let bestId = Number.POSITIVE_INFINITY;
  for (const { zone, count } of counts.values()) {
    if (count > bestCount || (count === bestCount && zone.id < bestId)) {
      bestCount = count;
      bestId = zone.id;
      best = zone;
    }
  }
  return best;
}

export {};
