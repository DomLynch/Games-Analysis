// Licence: LGPL-3.0 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const REVEAL_SIDE = 88;     // revealed-cell grid per side (donor: 88 x 88 bit masks)

interface LocationImage { w: number; h: number; pixel(x: number, y: number): number }

// Zoom is a plain factor: screen px per world unit = zoom / 65536, so world units per px = 65536 / zoom.
// Outdoor zoom is clamped to 512..2048, indoor to 256..4096 (donor Game.cpp 108 and 111).
function clampZoom(zoom: number, outdoor: boolean): number {
  return outdoor ? Math.min(2048, Math.max(512, zoom)) : Math.min(4096, Math.max(256, zoom));
}

// Zoom in and out double or halve, then clamp (donor Game.cpp 1439 and 1446).
function zoomIn(zoom: number, outdoor: boolean): number { return clampZoom(zoom * 2, outdoor); }
function zoomOut(zoom: number, outdoor: boolean): number { return clampZoom(Math.floor(zoom / 2), outdoor); }

// World -> screen px around the minimap centre (north-up: +y world is up on screen).
function worldToScreen(
  cx: number, cy: number, wx: number, wy: number, partyX: number, partyY: number, zoom: number,
): { x: number; y: number } {
  return {
    x: cx + ((wx - partyX) * zoom) / 65536,
    y: cy - ((wy - partyY) * zoom) / 65536,
  };
}

// Party-centred crop of the location image into a screen rect (donor: GameUI_DrawMinimap).
// Image px per screen px is imageWidth / zoom. Fix: a sample outside the image is left transparent
// (the donor indexes the row and column with no bounds check).
function sampleMinimap(
  img: LocationImage, rectW: number, rectH: number, partyX: number, partyY: number, zoom: number,
): number[] {
  const pxPerScreen = img.w / zoom;
  const centreX = (partyX + 32768) * img.w / 65536;   // world -32768..32767 to image px
  const centreY = (32768 - partyY) * img.w / 65536;   // north is up in the image
  const left = centreX - (rectW / 2) * pxPerScreen;
  const top = centreY - (rectH / 2) * pxPerScreen;
  const out: number[] = new Array(rectW * rectH).fill(0);
  for (let y = 0; y < rectH; y++) {
    for (let x = 0; x < rectW; x++) {
      const sx = Math.floor(left + x * pxPerScreen);
      const sy = Math.floor(top + y * pxPerScreen);
      if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue; // fix: transparent off the image
      out[y * rectW + x] = img.pixel(sx, sy);
    }
  }
  return out;
}

// Object mark size: larger marks above zoom 512 and 1024 (donor UIGame.cpp 1435 and 1471).
function markStyle(zoom: number): { objects: 'large' | 'small'; actors: 'large' | 'small' } {
  return { objects: zoom > 512 ? 'large' : 'small', actors: zoom > 1024 ? 'large' : 'small' };
}

// Discovery reveal: the party's grid cell, 512 world units per cell (donor OutdoorTerrain.h worldToGrid).
function worldToGrid(wx: number, wy: number): { x: number; y: number } {
  return {
    x: (Math.floor(wx) >> 9) + 64,
    y: 63 - (Math.floor(wy) >> 9),
  };
}

interface Reveal { partial: Uint8Array; full: Uint8Array } // one byte per cell here; the donor packs 8 cells per byte

// Donor: UpdateDiscoveredArea, called once per drawn frame. Cells within radius 10 become partly known,
// cells within radius 7 become fully known. Fix: the donor loops -10..9, so its east and south edge is cut.
function revealAround(r: Reveal, gx: number, gy: number): void {
  for (let i = -10; i <= 10; i++) {
    for (let j = -10; j <= 10; j++) {
      const d2 = i * i + j * j;
      const y = gy + i - 20;       // the donor's fixed 20-cell offset into the 128-cell grid
      const x = gx + j - 20;
      if (d2 > 100 || x < 0 || y < 0 || x >= REVEAL_SIDE || y >= REVEAL_SIDE) continue;
      r.partial[y * REVEAL_SIDE + x] = 1;
      if (d2 <= 49) r.full[y * REVEAL_SIDE + x] = 1;
    }
  }
}

export {};
