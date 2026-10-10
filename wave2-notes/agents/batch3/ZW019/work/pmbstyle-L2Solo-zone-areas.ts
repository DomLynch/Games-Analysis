// Licence: Apache-2.0 (donor). Re-expression of the zone-as-data shape in our own types; no donor lines copied.
// clean-room
interface ZoneBox {
  minX?: number; maxX?: number; minY?: number; maxY?: number;
  minZ?: number; maxZ?: number;
  belowZ?: number; aboveZ?: number;   // z band: strictly below / strictly above
}

interface ZoneArea {
  id: string;
  cell?: string;                      // optional grid-cell tag, e.g. "21_25"
  boxes?: ZoneBox[];                  // any box may match
  belowZ?: number;                    // extra requirement: z < belowZ
  tags: string[];
  spotCapacity?: number;
  localStarterRegions?: string[];
  localUntilLevel?: number;
}

interface Loc { x: number; y: number; z: number | null; }  // z may be unknown

function cellOf(x: number, y: number): string {
  return `${Math.floor(x / 32768) + 20}_${Math.floor(y / 32768) + 18}`;
}

function boxMatch(b: ZoneBox, p: Loc): boolean {
  if (b.minX !== undefined && p.x < b.minX) return false;
  if (b.maxX !== undefined && p.x > b.maxX) return false;
  if (b.minY !== undefined && p.y < b.minY) return false;
  if (b.maxY !== undefined && p.y > b.maxY) return false;
  if (b.minZ !== undefined && (p.z === null || p.z < b.minZ)) return false;
  if (b.maxZ !== undefined && (p.z === null || p.z > b.maxZ)) return false;
  if (b.belowZ !== undefined && (p.z === null || p.z >= b.belowZ)) return false;
  if (b.aboveZ !== undefined && (p.z === null || p.z <= b.aboveZ)) return false;
  return true;
}

function areaMatch(a: ZoneArea, p: Loc): boolean {
  const boxes = a.boxes ?? [];
  if (!a.cell && boxes.length === 0 && a.belowZ === undefined) return false; // unconstrained area never matches
  if (a.cell && cellOf(p.x, p.y) !== a.cell) return false;
  if (boxes.length > 0 && !boxes.some(b => boxMatch(b, p))) return false;
  if (a.belowZ !== undefined && (p.z === null || p.z >= a.belowZ)) return false;
  return true;
}

// Areas are ordered; the first match wins, so overlaps are settled by list order.
function resolveArea(areas: ZoneArea[], p: Loc): ZoneArea | null {
  return areas.find(a => areaMatch(a, p)) ?? null;
}

interface Spot { center: Loc; arrivalPoints: Loc[]; partitionedAreaId?: string; }

// Classify a hunting spot once. A party-only or catacomb area found among the arrival points wins over the centre.
function classifySpot(spot: Spot, areas: ZoneArea[]): ZoneArea | null {
  let fallback = resolveArea(areas, spot.center);
  if (spot.partitionedAreaId && fallback?.id === spot.partitionedAreaId) return fallback;
  for (const p of spot.arrivalPoints) {
    const a = resolveArea(areas, p);
    if (!a) continue;
    if (a.tags.includes('catacomb') || a.tags.includes('party_required')) return a;
    if (!fallback) fallback = a;
  }
  return fallback;
}

// Level gate for starter-region zones: local content is open to other regions only from localUntilLevel up.
function localForLevel(a: ZoneArea, starterRegion: string, level: number): boolean {
  const allowed = a.localStarterRegions ?? [];
  if (allowed.length === 0 || starterRegion === '' || level > (a.localUntilLevel ?? 0)) return true;
  return allowed.includes(starterRegion);
}

export {};
