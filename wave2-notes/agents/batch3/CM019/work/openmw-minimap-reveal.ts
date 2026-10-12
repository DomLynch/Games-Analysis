// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const RES = 32;                          // texels per map segment side (one exterior cell)
const EXPLORE_R = 0.17 * (RES - 1);      // reveal radius in texels (about 5.27)
const CELL_DIST = 1;                     // segments updated around the player (3 x 3)
const UNEXPLORED = 255;                  // alpha of a never-seen texel
const EXPLORED_BELOW = 200;              // alpha under this counts as explored

type Segment = Uint8Array;               // one alpha byte per texel (RES * RES)

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export function newSegment(): Segment {
  return new Uint8Array(RES * RES).fill(UNEXPLORED);
}

// Player at (u, v) in [0, 1] inside cell (cx, cy). Monotone reveal: a texel only ever gets lower alpha.
export function revealAround(segs: Map<string, Segment>, cx: number, cy: number, u: number, v: number): void {
  const r2 = EXPLORE_R * EXPLORE_R;
  const rUV = EXPLORE_R / RES;
  for (let mx = -CELL_DIST; mx <= CELL_DIST; mx++) {
    for (let my = -CELL_DIST; my <= CELL_DIST; my++) {
      let affected: boolean;
      if (mx === 0 && my === 0) {
        affected = true;
      } else {
        const affectsX = mx > 0 ? u + rUV > 1 : u - rUV < 0;
        const affectsY = my > 0 ? v + rUV > 1 : v - rUV < 0;
        affected = (affectsX && my === 0) || (affectsY && mx === 0) || (affectsX && affectsY);
      }
      if (!affected) continue;

      const seg = segs.get(`${cx + mx},${cy - my}`); // donor: texY = y + my * -1
      if (!seg) continue;

      for (let tv = 0; tv < RES; tv++) {
        for (let tu = 0; tu < RES; tu++) {
          const dx = (tu + mx * (RES - 1)) - u * (RES - 1);
          const dy = (tv + my * (RES - 1)) - v * (RES - 1);
          const ratio = clamp01((dx * dx + dy * dy) / r2);
          const i = tv * RES + tu;
          seg[i] = Math.min(seg[i], Math.floor(ratio * 255)); // keep the smaller alpha
        }
      }
    }
  }
}

// Query at normalised segment coordinates (nX, nY) in [0, 1].
export function isExplored(seg: Segment | undefined, nX: number, nY: number): boolean {
  if (!seg) return false;
  const tu = Math.trunc((RES - 1) * clamp01(nX));
  const tv = Math.trunc((RES - 1) * clamp01(nY));
  return seg[tv * RES + tu] < EXPLORED_BELOW;
}

export {};
