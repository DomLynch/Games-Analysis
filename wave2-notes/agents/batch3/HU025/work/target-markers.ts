// Licence: MIT (donor, Orbiter LICENSE and Pane.cpp header). Adapted shape, rewritten in TypeScript for Frankendom.
// Client-only HUD: positions come from the engine; the engine never reads these markers.

export interface Vec3 { x: number; y: number; z: number; } // camera space: +z is forward

export interface ScreenCfg {
  w: number;          // HUD width in px
  h: number;          // HUD height in px
  markerHalf: number; // marker half-size px (donor windowed value: max(20, H/25))
  focal: number;      // pinhole stand-in for the donor projection matrix (not read)
}

export interface Projected { x: number; y: number; front: boolean; inside: boolean; }

// Pinhole stand-in for Pane::GlobalToHomog. In front and inside the HUD rectangle means on screen.
export function project(d: Vec3, cfg: ScreenCfg): Projected {
  const cx = cfg.w / 2;
  const cy = cfg.h / 2;
  if (d.z <= 0) return { x: cx, y: cy, front: false, inside: false };
  const x = cx + (cfg.focal * d.x) / d.z;
  const y = cy - (cfg.focal * d.y) / d.z;
  const inside = x >= 0 && x <= cfg.w && y >= 0 && y <= cfg.h;
  return { x, y, front: true, inside };
}

export type Chevron = { pts: [number, number][]; behind: boolean };

// Off-screen arrow drawn at the HUD centre, pointing sideways toward the direction (donor OffscreenDirMarker shape).
// fix: a zero-length sideways direction returns null (the donor divides by len with no guard).
// fix: behind is set from the sign of d.z (the donor never reads z).
export function chevron(d: Vec3, cfg: ScreenCfg): Chevron | null {
  const len = Math.hypot(d.x, d.y);
  if (len < 1e-9) return null;
  const s = cfg.markerHalf * 0.6;
  const dx = (d.x / len) * s;
  const dy = (d.y / len) * s;
  const cx = cfg.w / 2;
  const cy = cfg.h / 2;
  const pts: [number, number][] = [
    [cx + 10 * dx, cy - 10 * dy],        // tip
    [cx + 7 * dx - dy, cy - (7 * dy + dx)], // wing
    [cx + 7 * dx + dy, cy - (7 * dy - dx)], // wing
    [cx + 8.5 * dx, cy - 8.5 * dy],      // notch (label anchor)
  ];
  return { pts, behind: d.z < 0 };
}

export type Marker =
  | { kind: 'ellipse+cross'; x: number; y: number }
  | { kind: 'cross'; x: number; y: number }
  | { kind: 'box'; x: number; y: number }
  | { kind: 'chevron'; pts: [number, number][]; behind: boolean }
  | { kind: 'none' };

// Velocity-style chain (donor HUD_Orbit prograde and docking relative velocity):
// primary on screen, else its opposite on screen (cross only), else the chevron.
export function velocityChain(v: Vec3, cfg: ScreenCfg): Marker {
  const p = project(v, cfg);
  if (p.inside) return { kind: 'ellipse+cross', x: p.x, y: p.y };
  const n = project({ x: -v.x, y: -v.y, z: -v.z }, cfg);
  if (n.inside) return { kind: 'cross', x: n.x, y: n.y };
  const c = chevron(v, cfg);
  return c ? { kind: 'chevron', pts: c.pts, behind: c.behind } : { kind: 'none' };
}

// Target chain (donor HUD_Docking target): box when on screen, else chevron.
export function targetChain(t: Vec3, cfg: ScreenCfg): Marker {
  const p = project(t, cfg);
  if (p.inside) return { kind: 'box', x: p.x, y: p.y };
  const c = chevron(t, cfg);
  return c ? { kind: 'chevron', pts: c.pts, behind: c.behind } : { kind: 'none' };
}
