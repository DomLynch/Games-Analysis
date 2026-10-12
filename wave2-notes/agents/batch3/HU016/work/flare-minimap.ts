// Licence: GPL-3.0-or-later (engine donor, MenuMiniMap.cpp); data file under CC-BY-SA 3.0 (game donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type MapMode = "normal" | "2x" | "hidden";

interface Unit {
  x: number;
  y: number;
  hp: number;
  ally: boolean;
  inCombat: boolean;
  corpseCollision: boolean;
}

interface Hero { x: number; y: number; }

type DotKind = "hero" | "ally" | "enemy" | "corpse";
interface Dot { x: number; y: number; kind: DotKind; }

// Donor: visible radius = max(map w, h) * 0.7071 (the half-diagonal of the map square), used as a tile distance.
function visibleRadius(mapW: number, mapH: number): number {
  return Math.max(mapW, mapH) * 0.7071;
}

// Donor cycle: mode++, then anything above "2x" resets to normal. From "2x" the key therefore
// goes back to normal and never reaches "hidden". FIX: cycle through all three modes.
function nextMode(m: MapMode): MapMode {
  const order: MapMode[] = ["normal", "2x", "hidden"];
  return order[(order.indexOf(m) + 1) % order.length];
}

// Zoom in pixels per tile for a mode; null when the map is hidden. The 2x surface is a separate pre-render, not a scale.
function zoomFor(m: MapMode, baseZoom: number): number | null {
  if (m === "hidden") return null;
  return m === "2x" ? 2 * baseZoom : baseZoom;
}

// Hero-centred window: top-left corner in map pixels (donor: zoom * hero - size / 2, integer halving).
function windowOrigin(zoom: number, hero: Hero, w: number, h: number): { x: number; y: number } {
  return { x: zoom * hero.x - Math.trunc(w / 2), y: zoom * hero.y - Math.trunc(h / 2) };
}

// Unit dots: the hero always; living allies and engaged foes (in combat) within the radius;
// dead bodies that still block movement within the radius. With fog on, a living unit beyond the
// fog mask radius is not drawn. FIX: the donor skips the fog test for bodies, so a body in
// unexplored ground showed on the map; here bodies follow the same fog rule as living units.
function unitDots(hero: Hero, units: Unit[], radius: number, fogOn: boolean, maskRadius: number): Dot[] {
  const out: Dot[] = [{ x: hero.x, y: hero.y, kind: "hero" }];
  const dist = (x: number, y: number): number => Math.hypot(x - hero.x, y - hero.y);
  for (const u of units) {
    if (fogOn && dist(u.x, u.y) > maskRadius) continue;
    if (dist(u.x, u.y) > radius) continue;
    if (u.hp > 0) {
      if (u.ally) out.push({ x: Math.trunc(u.x), y: Math.trunc(u.y), kind: "ally" });
      else if (u.inCombat) out.push({ x: Math.trunc(u.x), y: Math.trunc(u.y), kind: "enemy" });
    } else if (u.corpseCollision) {
      out.push({ x: Math.trunc(u.x), y: Math.trunc(u.y), kind: "corpse" });
    }
  }
  return out;
}

// A tile is drawn only when fully uncovered by fog (donor: the dark layer value must be 0).
function tileVisible(fogOn: boolean, darkLayerValue: number): boolean {
  return !fogOn || darkLayerValue === 0;
}

export {};
