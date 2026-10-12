// Licence: GPL-3.0 with Electronic Arts additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const PULSE_START_PX = 4;        // donor: Map.SpecialRadarFrame = 4 (RADAR.CPP line 1511)
const ZOOMED_PX_PER_CELL = 6;    // donor: ZoomFactor = 6 (RADAR.CPP line 687)
const ZOOM_MAX_CELLS = 62;       // donor clamp on visible cells (RADAR.CPP line 695)
const ACTIVE_FRAME = 22;         // donor RADAR_ACTIVATED_FRAME (RADAR.H line 113)
const CLOSED_FRAME = 41;         // donor MAX_RADAR_FRAMES (RADAR.H line 114)

interface Cell { cx: number; cy: number; }

interface Minimap {
  frameW: number; frameH: number;        // minimap frame in px (donor RadIWidth, RadIHeight)
  insetX: number; insetY: number;        // map inset inside the frame, px (donor BaseX, BaseY)
  mapPxW: number; mapPxH: number;        // drawn map area, px (donor RadarWidth, RadarHeight)
  zoomPx: number;                        // px per map cell (donor ZoomFactor)
  windowX: number; windowY: number;      // top-left cell of the drawn window (donor RadarX, RadarY)
  mapW: number; mapH: number;            // whole zone, in cells
  viewW: number; viewH: number;          // tactical view, in cells
  viewX: number; viewY: number;          // tactical view top-left, in cells
  pulse: number;                         // bracket outset, px; counts down once per logic tick
  frame: number;                         // power animation frame, steps once per logic tick
}

type Hit = { kind: "miss" } | { kind: "absorb" } | { kind: "cell"; cell: Cell };

// Pointer px, relative to the frame's top-left -> hit.
// Donor: Click_In_Radar (RADAR.CPP lines 909-937). Fix: the donor tests only the upper bound on the
// frame (x < RadIWidth), so a point left of or above the frame passes that test; here both bounds are checked.
function hitTest(m: Minimap, px: number, py: number): Hit {
  if (px < 0 || py < 0 || px >= m.frameW || py >= m.frameH) return { kind: "miss" };
  const x = px - m.insetX;
  const y = py - m.insetY;
  // Inside the frame but off the drawn map: swallowed (donor returns -1, RADAR.CPP line 934).
  if (x < 0 || y < 0 || x >= m.mapPxW || y >= m.mapPxH) return { kind: "absorb" };
  return {
    kind: "cell",
    cell: { cx: m.windowX + Math.floor(x / m.zoomPx), cy: m.windowY + Math.floor(y / m.zoomPx) },
  };
}

// Jump the tactical view to a clicked cell (donor: TacticalClass::Action, no unit selected, RADAR.CPP lines 1494-1511).
// Donor subtracts half the view and clamps only the low edge; here the high edge is clamped too (fix).
function jumpTo(m: Minimap, c: Cell): void {
  let vx = c.cx - Math.floor(m.viewW / 2);
  let vy = c.cy - Math.floor(m.viewH / 2);
  vx = Math.min(Math.max(vx, 0), m.mapW - m.viewW);
  vy = Math.min(Math.max(vy, 0), m.mapH - m.viewH);
  m.viewX = vx;
  m.viewY = vy;
  m.pulse = PULSE_START_PX;
}

// Zoom factor for the window (donor: Zoom_Mode, RADAR.CPP lines 665-716, simplified; the 62-cell clamp is shown).
function visibleCells(frameW: number, zoomPx: number): number {
  return Math.min(Math.floor(frameW / zoomPx), ZOOM_MAX_CELLS);
}

// One logic tick (donor: RadarClass::AI, RADAR.CPP lines 1300-1301 for the pulse and 1311-1333 for the power animation).
// The animation steps one frame per tick toward its target; the caller supplies the target (ACTIVE_FRAME or CLOSED_FRAME).
function tick(m: Minimap, animTarget: number): void {
  if (m.pulse > 0) m.pulse -= 1;
  if (m.frame < animTarget) m.frame += 1;
  else if (m.frame > animTarget) m.frame -= 1;
}

export {};
