// Licence: GPL-2.0 (donor). Clean-room: written from the described mechanism, not a translation.
interface Vec2 { x: number; y: number }
interface Rect { left: number; top: number; right: number; bottom: number } // right and bottom exclusive
interface Unit {
  id: number;
  zone: string;
  pos: Vec2;
  turnedOff: boolean;
  sunlightVulnerable: boolean;
  stunned: boolean;
}
interface Zone {
  id: string;
  bounds: Rect;
  localTime: number;          // only the zone the player stands in advances
  landing: Vec2[];            // border squares where arriving units may be placed
  free: (p: Vec2) => boolean; // can a unit stand here
}

const cdiv = (a: number, b: number): number => Math.trunc(a / b); // C++ int division truncates
const LANDING_BLOCK_RADIUS = 10; // donor level.cpp 347, Rectangle::centered(Vec2(0, 0), 10)

// Border point on the side of the zone that faces the direction of travel.
function projectOnBorders(area: Rect, d: Vec2): Vec2 {
  const w = area.right - area.left;
  const h = area.bottom - area.top;
  const cx = cdiv(area.left + area.right, 2);
  const cy = cdiv(area.top + area.bottom, 2);
  if (d.x === 0) return { x: cx, y: d.y > 0 ? area.bottom - 1 : area.top };
  const offY = cdiv(cdiv(d.y * w, 2), Math.abs(d.x));
  if (cy + offY >= area.top && cy + offY < area.bottom)
    return { x: d.x > 0 ? area.right - 1 : area.left, y: cy + offY };
  const offX = cdiv(cdiv(d.x * h, 2), Math.abs(d.y));
  return { x: cx + offX, y: d.y > 0 ? area.bottom - 1 : area.top };
}

const dist = (a: Vec2, b: Vec2): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// Landing square nearest the entry border, then a widening fallback: the radius-10 block around it,
// then every landing square. Returns the first free candidate (donor: closest reachable via BFS).
const key = (p: Vec2): string => `${p.x},${p.y}`;

function pickLanding(zone: Zone, travelDir: Vec2, taken: Set<string>): Vec2 | null {
  if (zone.landing.length === 0) return null; // donor takes landing[0] unchecked (level.cpp 337)
  const ok = (p: Vec2): boolean => zone.free(p) && !taken.has(key(p));
  const entry = projectOnBorders(zone.bounds, travelDir);
  let best = zone.landing[0];
  for (const p of zone.landing) if (dist(p, entry) < dist(best, entry)) best = p;
  const block: Vec2[] = []; // donor: Rectangle::centered(center, radius 10); exact inclusive extent not read
  for (let dy = -LANDING_BLOCK_RADIUS; dy <= LANDING_BLOCK_RADIUS; dy++)
    for (let dx = -LANDING_BLOCK_RADIUS; dx <= LANDING_BLOCK_RADIUS; dx++)
      block.push({ x: best.x + dx, y: best.y + dy });
  for (const candidates of [[best], block, zone.landing]) {
    const hit = candidates.find(ok);
    if (hit) return hit;
  }
  return null;
}

interface TransferResult { moved: Unit[]; left: Unit[]; switchedZone: boolean }

// Move a party from its zones into `dest`. Members already there are skipped; members that
// are turned off, cannot land, or are sunlight-vulnerable by day are left behind after one
// confirmation (declining cancels the whole transfer). Returns null when the player declines.
function transferParty(
  team: Unit[],
  dest: Zone,
  travelDir: Vec2,
  isDay: boolean,
  confirmLeave: (left: Unit[]) => boolean,
): TransferResult | null {
  const left: Unit[] = [];
  const moved: Array<{ unit: Unit; spot: Vec2 }> = [];
  const taken = new Set<string>();
  for (const u of team) {
    if (u.zone === dest.id) continue;
    // Fix: the donor runs its turned-off test and its landing/sunlight test as two plain
    // ifs (player.cpp 851-858), so a turned-off member that also fails the second test is
    // listed twice. Here each member lands in exactly one list.
    const spot = u.turnedOff ? null : pickLanding(dest, travelDir, taken);
    if (u.turnedOff || spot === null || (u.sunlightVulnerable && isDay)) {
      left.push(u);
      continue;
    }
    taken.add(key(spot));
    moved.push({ unit: u, spot });
  }
  if (left.length > 0 && !confirmLeave(left)) return null;
  for (const { unit, spot } of moved) {
    unit.zone = dest.id;
    unit.pos = spot;
  }
  return { moved: moved.map((m) => m.unit), left, switchedZone: moved.length > 0 };
}

// Each tick while the controller's zone is the one the player is in, pull back any
// member who wandered into another zone (stunned members are skipped).
function recallStragglers(team: Unit[], controllerZone: string, currentZone: string, pull: (u: Unit) => void): void {
  if (currentZone !== controllerZone) return;
  for (const u of team) if (u.zone !== currentZone && !u.stunned) pull(u);
}

// Only the current zone's clock advances; the others stay frozen until entered again.
function advanceClock(zones: Map<string, Zone>, currentId: string, dt: number): void {
  const z = zones.get(currentId);
  if (z) z.localTime += dt;
}

export {};
