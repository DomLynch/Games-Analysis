// Licence: MIT (donor LICENSE, 2025 amilich): code may be adapted. This sketch is written from the described mechanism, not copied from the donor lines.
const MAX_LEVEL = 5;               // service building level cap (donor: SERVICE_MAX_LEVEL 5)
const RANGE_PER_LEVEL = 0.2;       // +20% range per level above 1 (donor: SERVICE_RANGE_INCREASE_PER_LEVEL 0.2)
const UPGRADE_COST_BASE = 2;       // upgrade cost = base cost * 2^level (donor: SERVICE_UPGRADE_COST_BASE 2)
const COVERAGE_CAP = 100;          // per service kind, summed coverage is capped at this value

type ServiceKind = "police" | "fire" | "health" | "education";
interface ServiceDef { kind: ServiceKind; range: number; }
interface PlacedBuilding { kind: string; x: number; y: number; level: number; built: boolean; abandoned: boolean; }
type CoverageGrid = number[][];
type Coverage = Record<ServiceKind, CoverageGrid>;

// Range is in grid tiles. The donor's power plant and water tower are boolean coverage and are not in this table.
const DEFS: Record<string, ServiceDef> = {
  police_station: { kind: "police", range: 13 },
  fire_station: { kind: "fire", range: 18 },
  hospital: { kind: "health", range: 24 },
  school: { kind: "education", range: 11 },
  university: { kind: "education", range: 19 },
};

function emptyGrid(size: number): CoverageGrid {
  return Array.from({ length: size }, () => new Array<number>(size).fill(0));
}

// Level 1 gives the base range; each level above adds 20 percent; the result is floored to whole tiles.
function effectiveRange(base: number, level: number): number {
  return Math.floor(base * (1 + (level - 1) * RANGE_PER_LEVEL));
}

// Each built, non-abandoned service adds a linear falloff disc: 100 at its tile, 0 at its range edge.
// Overlapping discs sum, capped at COVERAGE_CAP for each service kind.
function computeCoverage(size: number, buildings: PlacedBuilding[]): Coverage {
  const cov: Coverage = { police: emptyGrid(size), fire: emptyGrid(size), health: emptyGrid(size), education: emptyGrid(size) };
  for (const b of buildings) {
    if (!b.built || b.abandoned) continue;
    const def = DEFS[b.kind];
    if (!def) continue;
    const r = effectiveRange(def.range, b.level);
    const r2 = r * r;
    const grid = cov[def.kind];
    for (let y = Math.max(0, b.y - r); y <= Math.min(size - 1, b.y + r); y++) {
      for (let x = Math.max(0, b.x - r); x <= Math.min(size - 1, b.x + r); x++) {
        const dx = x - b.x;
        const dy = y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const d = Math.sqrt(d2);
        const add = Math.max(0, (1 - d / r) * 100);
        grid[y][x] = Math.min(COVERAGE_CAP, grid[y][x] + add);
      }
    }
  }
  return cov;
}

// Upgrade one service building if it is built, not abandoned, below the cap, and affordable.
// The caller recomputes coverage afterwards (the donor recomputes the whole grid).
function tryUpgrade(b: PlacedBuilding, baseCost: number, money: number): { level: number; cost: number } | null {
  if (!b.built || b.abandoned || b.level >= MAX_LEVEL) return null;
  const cost = baseCost * Math.pow(UPGRADE_COST_BASE, b.level);
  if (money < cost) return null;
  b.level += 1;
  return { level: b.level, cost };
}

// Target building level from land value, average service coverage at a tile, age and a demand boost.
function targetLevel(landValue: number, serviceAvg: number, age: number, demandBoost: number): number {
  return Math.min(5, Math.max(1, Math.floor(landValue / 24 + serviceAvg / 28 + age / 60 + demandBoost)));
}

export {};
