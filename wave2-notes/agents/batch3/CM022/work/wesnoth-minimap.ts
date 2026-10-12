// Licence: GPL-2.0-or-later (donor; src/minimap.cpp header and COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rgb = { r: number; g: number; b: number };

// Three-state visibility, in donor order: a shrouded hex is never "fogged" (black, void terrain); fog dims it.
type Vis = 'shroud' | 'fog' | 'clear';
function visibility(shrouded: boolean, fogged: boolean): Vis {
  if (shrouded) return 'shroud';
  return fogged ? 'fog' : 'clear';
}

// Cell size in pixels from the larger map side. Terrain off or colour-coding off gives 4.
function cellPx(maxSide: number, drawTerrain: boolean, coding: boolean): number {
  if (!drawTerrain || !coding) return 4;
  if (maxSide > 60) return 8;
  if (maxSide > 40) return 16;
  return 24;
}

// Hex top-left on the minimap. Columns alternate: odd columns sit at y * cell, even columns half a cell higher.
function hexRect(x: number, y: number, cell: number): { x: number; y: number; w: number; h: number } {
  const q = Math.floor(cell / 4);
  const odd = x % 2 === 1;
  return {
    x: Math.floor((x * cell * 3) / 4) - q,
    y: y * cell + q * (odd ? 1 : -1) - q,
    w: cell,
    h: cell,
  };
}

// Fill width is three quarters of the cell, so neighbouring columns meet.
function fillWidth(cell: number): number { return Math.floor((cell * 3) / 4); }

// Colour of a terrain hex made of one or more underlying terrains.
// Each underlying colour is darkened by 50 when fogged and lightened by 50 when reachable, then blended in turn.
function terrainColour(underlying: Rgb[], fogged: boolean, reachable: boolean): Rgb | null {
  if (underlying.length === 0) return null;
  let col: Rgb | null = null;
  for (const base of underlying) {
    const t: Rgb = {
      r: fogged ? Math.max(0, base.r - 50) : base.r,
      g: fogged ? Math.max(0, base.g - 50) : base.g,
      b: fogged ? Math.max(0, base.b - 50) : base.b,
    };
    const u: Rgb = reachable
      ? { r: Math.min(255, t.r + 50), g: Math.min(255, t.g + 50), b: Math.min(255, t.b + 50) }
      : t;
    if (col === null) {
      col = u;
    } else {
      // Donor blend: col - (col - tmp) / 2, integer maths.
      col = {
        r: col.r - Math.trunc((col.r - u.r) / 2),
        g: col.g - Math.trunc((col.g - u.g) / 2),
        b: col.b - Math.trunc((col.b - u.b) / 2),
      };
    }
  }
  return col;
}

// Village colour relative to the viewer. Neutral uses the range's shadow value (third hex of the "white" range).
type Owner = { kind: 'neutral' } | { kind: 'mine' } | { kind: 'enemy' } | { kind: 'allied' };
interface VillagePrefs { mine: Rgb; enemy: Rgb; allied: Rgb; neutral: Rgb }
function villageColour(owner: Owner, prefs: VillagePrefs): Rgb | null {
  switch (owner.kind) {
    case 'neutral': return prefs.neutral;
    case 'mine': return prefs.mine;
    case 'enemy': return prefs.enemy;
    case 'allied': return prefs.allied;
  }
}

// A village in shroud or fog is not drawn; a unit in fog, or invisible to an enemy, or hidden, is not drawn.
function villageDrawn(vis: Vis): boolean { return vis === 'clear'; }
function unitDrawn(fogged: boolean, enemyInvisible: boolean, hidden: boolean): boolean {
  return !(fogged || enemyInvisible || hidden);
}

// Fit the raw minimap into a box, keeping its aspect ratio, centred. Returns the rect actually used.
function fitRect(raw: { w: number; h: number }, box: { x: number; y: number; w: number; h: number }) {
  const ratio = Math.min(box.w / raw.w, box.h / raw.h);
  const w = Math.trunc(raw.w * ratio);
  const h = Math.trunc(raw.h * ratio);
  return {
    x: box.x + Math.trunc((box.w - w) / 2),
    y: box.y + Math.trunc((box.h - h) / 2),
    w,
    h,
  };
}

export {};
