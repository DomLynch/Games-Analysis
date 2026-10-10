// Licence: Apache-2.0 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Grid { tileSize: number; offsetX: number; offsetY: number; }  // tile id = floor(pos / tileSize) + offset
export interface StreamState { loaded: Set<string>; busy: boolean; }
export type Step = { load?: string; unload?: string };

// Matches C# ToString("00"): sign first, then the absolute value zero-padded to two digits.
function pad2(n: number): string {
  const body = String(Math.abs(n)).padStart(2, "0");
  return n < 0 ? "-" + body : body;
}
export function tileName(tx: number, ty: number): string {
  return pad2(tx) + "_" + pad2(ty);
}

// Own tile, plus the neighbour on each edge the player is within `bandFraction` of, plus the corner when both edges are near.
export function wantedTiles(g: Grid, x: number, y: number, bandFraction: number): string[] {
  const tx = Math.floor(x / g.tileSize) + g.offsetX;
  const ty = Math.floor(y / g.tileSize) + g.offsetY;
  const fx = x / g.tileSize - Math.floor(x / g.tileSize);   // position inside the tile, 0..1
  const fy = y / g.tileSize - Math.floor(y / g.tileSize);
  let dx = 0; let dy = 0;
  if (fx < bandFraction) dx = -1; else if (fx > 1 - bandFraction) dx = 1;
  if (fy < bandFraction) dy = -1; else if (fy > 1 - bandFraction) dy = 1;

  const out: string[] = [tileName(tx, ty)];
  const add = (a: number, b: number): void => {
    const n = tileName(a, b);
    if (out.indexOf(n) < 0) out.push(n);
  };
  if (dx !== 0) add(tx + dx, ty);
  if (dy !== 0) add(tx, ty + dy);
  if (dx !== 0 && dy !== 0) add(tx + dx, ty + dy);
  return out;
}

// One action per call: start at most one load (and then stop), else remove at most one tile no longer wanted.
export function streamStep(g: Grid, x: number, y: number, bandFraction: number,
                           st: StreamState, canLoad: (t: string) => boolean): Step {
  if (st.busy) return {};
  const wanted = wantedTiles(g, x, y, bandFraction);
  for (const t of wanted) {
    if (!st.loaded.has(t) && canLoad(t)) {
      st.busy = true;
      return { load: t };
    }
  }
  for (const t of st.loaded) {
    if (wanted.indexOf(t) < 0) {
      st.loaded.delete(t);            // donor: unload is synchronous, busy is cleared at once
      return { unload: t };
    }
  }
  return {};
}

// Called when an async load finishes.
export function finishLoad(st: StreamState, tile: string): void {
  st.loaded.add(tile);
  st.busy = false;
}

export {};
