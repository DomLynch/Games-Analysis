// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation.
type Owner = 'mine' | 'ally' | 'enemy';

interface TileView {
  city?: Owner;          // a city on the tile, by owner
  unit?: Owner;          // a unit visible on the tile, by owner
  borderOwner?: string;  // territory owner colour key
  relief?: string;       // terrain colour key when relief is on
  background: 'land' | 'ocean' | 'frozen' | 'unknown';
  knownUnseen: boolean;  // explored but not currently visible
}

interface Layers { cities: boolean; units: boolean; borders: boolean; relief: boolean; fog: boolean; }

// First match wins: city, unit, border, relief, background, unknown.
function cellColour(t: TileView, l: Layers): string {
  if (l.cities && t.city) return `city:${t.city}`;
  if (l.units && t.unit) return `unit:${t.unit}`;
  if (l.borders && t.borderOwner) return `border:${t.borderOwner}`;
  if (l.relief && t.relief) return `relief:${t.relief}`;
  if (t.background !== 'unknown') return `bg:${t.background}`;
  return 'unknown';
}

// Scale: the largest whole pixels-per-cell that fits, at least 1. Floors (donor rounds up).
function fitScale(panelW: number, panelH: number, mapW: number, mapH: number, iso: boolean): number {
  const k = iso ? 2 : 1;
  const s = Math.min(Math.floor(panelW / (mapW * k)), Math.floor(panelH / mapH));
  return Math.max(1, s);
}

// Wrap that also works for negative values (the donor loops; this is the same result).
function wrap(v: number, n: number): number {
  return ((v % n) + n) % n;
}

class Minimap {
  private store: string[][];     // backing store: one colour key per map cell
  private dirty = false;

  constructor(private w: number, private h: number, private layers: Layers) {
    this.store = Array.from({ length: h }, () => new Array<string>(w).fill('unknown'));
  }

  // Called once per changed cell. Cheap: no drawing here.
  update(x: number, y: number, t: TileView): void {
    this.store[y][x] = t.knownUnseen && this.layers.fog ? `fog:${cellColour(t, this.layers)}` : cellColour(t, this.layers);
    this.dirty = true;
  }

  // Called once per pass. Repaints only if something changed, then draws the view rectangle.
  flush(viewRect: { x0: number; y0: number; w: number; h: number }, wrapX: boolean, wrapY: boolean): string[] | null {
    if (!this.dirty) return null;
    this.dirty = false;
    const out: string[] = [];
    for (let y = 0; y < this.h; y++) {
      out.push(this.store[y].join(','));
    }
    const corners = [
      [viewRect.x0, viewRect.y0], [viewRect.x0 + viewRect.w, viewRect.y0],
      [viewRect.x0 + viewRect.w, viewRect.y0 + viewRect.h], [viewRect.x0, viewRect.y0 + viewRect.h],
    ].map(([x, y]) => [wrapX ? wrap(x, this.w) : x, wrapY ? wrap(y, this.h) : y]);
    out.push(`viewrect:${JSON.stringify(corners)}`);
    return out;
  }
}

export {};
