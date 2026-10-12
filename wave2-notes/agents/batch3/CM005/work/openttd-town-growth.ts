// Clean-room sketch. Donor: OpenTTD (GPL version 2, file header). Written from the described mechanism, not a translation.
type Rng = () => number;
type Zone = 0 | 1 | 2 | 3 | 4; // 0 edge, 1 outskirt, 2 outer suburb, 3 inner suburb, 4 centre (donor order)
type Layout = "original" | "better" | "grid";

interface Spec { name: string; availability: number; weight: number; minYear: number; maxYear: number }
interface TownState {
  cx: number; cy: number; houses: number; funded: boolean; stations: number; larger: boolean;
  layout: Layout; growing: boolean; counter: number; rate: number;
}

// Zone radii as squared tile distances. Small towns read a table row per four houses (the donor table is
// passed in, not copied). Large towns use the donor's formula: edge, outskirt, outer suburb, inner suburb, centre.
function zoneRadii(houses: number, table: number[][]): number[] {
  if (houses < table.length * 4) return table[Math.floor(houses / 4)];
  const mass = Math.floor(houses / 8);
  return [mass * 15 - 40, mass * 9 - 15, 0, mass * 5 - 5, mass * 3 + 5];
}

// Innermost zone whose squared radius still exceeds the squared distance: the donor loops edge to centre and
// keeps the last match. A funded town has a centre disc of squared radius 25 regardless of the table.
function zoneOf(t: TownState, x: number, y: number, radii: number[]): Zone {
  const d2 = (x - t.cx) ** 2 + (y - t.cy) ** 2;
  if (t.funded && d2 <= 25) return 4;
  let z: Zone = 0;
  for (let i = 0; i < 5; i++) if (d2 < radii[i]) z = i as Zone;
  return z;
}

// House pick: a spec is eligible when its availability mask covers every bit of the tile's zone set.
// Weighted roll over the eligible pool; each tried spec is removed from the pool whether or not it builds.
function pickHouse(specs: Spec[], tileBits: number, year: number, rng: Rng, tryBuild: (s: Spec) => boolean): Spec | null {
  const pool = specs.filter((s) => (s.availability & tileBits) === tileBits && year >= s.minYear && year <= s.maxYear);
  for (;;) {
    const total = pool.reduce((a, s) => a + s.weight, 0);
    if (pool.length === 0 || total <= 0) return null;
    let r = Math.floor(rng() * total);
    let i = 0;
    while (i < pool.length - 1 && pool[i].weight <= r) {
      r -= pool[i].weight;
      i++;
    }
    const pick = pool[i];
    pool[i] = pool[pool.length - 1];
    pool.pop();
    if (tryBuild(pick)) return pick;
  }
}

// Growth rate in ticks: table by funding and active station count, shifted by the setting, halved for
// large towns, divided by a house band. The donor then converts to game ticks (not read).
const GROW_TABLE: number[][] = [
  [120, 120, 120, 100, 80, 60], // funded
  [320, 420, 300, 220, 160, 100], // normal
];
function normalRate(t: TownState, shift: number): number {
  let m = GROW_TABLE[t.funded ? 0 : 1][Math.min(t.stations, 5)] >> shift;
  if (t.larger) m = Math.floor(m / 2);
  return Math.floor(m / (Math.floor(t.houses / 50) + 1));
}

// Road-walk budget. The donor runs this many steps plus one (do ... while (--iterations >= 0)).
function walkBudget(layout: Layout, houses: number): number {
  if (layout === "better") return 10 + Math.floor((houses * 2) / 9);
  if (layout === "grid") return 10 + Math.floor((houses * 1) / 9);
  return 10 + Math.floor((houses * 4) / 9);
}

// Grid layouts: a road runs along a line when the offset from the centre is a multiple of the spacing (3 or 4).
function gridRoads(dx: number, dy: number, spacing: number): { roadY: boolean; roadX: boolean } {
  return { roadY: dx % spacing === 0, roadX: dy % spacing === 0 };
}

// Original and better layouts: a house beside a new road is allowed when a road is not allowed here, or on a 60% roll.
function houseBesideRoad(roadAllowed: boolean, rng: Rng): boolean {
  return !roadAllowed || rng() < 0.6;
}

// Per game tick: count down; at zero try one growth step. Success resets to the rate; failure waits up to the
// rate, capped at cap - 1 (the donor's TOWN_GROWTH_TICKS - 1; the value was not read).
function tickTown(t: TownState, grow: () => boolean, cap: number): void {
  if (!t.growing) return;
  let i = t.counter - 1;
  if (i < 0) i = grow() ? t.rate : Math.min(t.rate, cap - 1);
  t.counter = i;
}

export {};
