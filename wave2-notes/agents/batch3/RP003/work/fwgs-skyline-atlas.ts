// Licence: GPL-3.0-or-later (donor atlas.c). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SkylinePage {
  readonly size: number;     // page side in pixels (donor caps this at ATLAS_MAX_SIZE 1024)
  readonly top: number[];    // per column: the lowest free row in that column
  maxUsed: number;           // highest row used so far (upload only this many rows)
}

export const PAGE_MAX = 1024;

export function newPage(size: number): SkylinePage {
  // fix: donor Atlas_Init never checks size against its 1024 cap; a larger size indexes past its fixed array
  if (!Number.isInteger(size) || size <= 0 || size > PAGE_MAX) throw new RangeError("page size out of range");
  return { size, top: new Array<number>(size).fill(0), maxUsed: 0 };
}

// Place a w x h block at the lowest possible row; ties go to the leftmost x.
export function place(page: SkylinePage, w: number, h: number): { x: number; y: number } | null {
  if (w <= 0 || h <= 0 || w > page.size) return null; // fix: donor can return success with uninitialised x, y when h = 0 and nothing fits
  let bestY = Infinity;
  let bestX = -1;
  let x = 0;
  while (x + w <= page.size) {
    let windowTop = 0;
    let blocker = -1;
    for (let j = 0; j < w; j++) {
      const t = page.top[x + j];
      if (t >= bestY) { blocker = j; break; }   // this column is no better than the best so far
      if (t > windowTop) windowTop = t;
    }
    if (blocker < 0) {
      bestX = x;
      bestY = windowTop;
      if (bestY === 0) break;                   // cannot sit lower than the floor
      x += 1;
    } else {
      x += blocker + 1;                         // every start up to the blocker also contains it
    }
  }
  if (bestX < 0 || bestY + h > page.size) return null;
  for (let j = 0; j < w; j++) page.top[bestX + j] = bestY + h;
  if (bestY + h > page.maxUsed) page.maxUsed = bestY + h;
  return { x: bestX, y: bestY };
}

export {};
