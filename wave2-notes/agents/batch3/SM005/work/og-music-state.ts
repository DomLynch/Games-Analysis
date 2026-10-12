// Licence: MIT (donor, root LICENSE, Copyright (c) 2019 Try). Shape adapted and rewritten here; no donor line is copied.
export type Mode = "std" | "fgt" | "thr";
export type Embellish = "none" | "fill" | "break";

// Fight state -> music mode. Engaged or dead: a drawn weapon is fgt, no weapon is thr. Otherwise std.
export function modeOf(engaged: boolean, dead: boolean, weaponDrawn: boolean): Mode {
  if (!engaged && !dead) return "std";
  return weaponDrawn ? "fgt" : "thr";
}

// Day runs from 04:00 to 21:00 inclusive (clock minutes from midnight).
export function isDay(clockMin: number): boolean {
  return clockMin >= 4 * 60 && clockMin <= 21 * 60;
}

// Theme names are zone_DAY|NGT_STD|FGT|THR. Fallback order: the zone, then the default zone;
// night then day; the mode, then the weaker mode (thr -> fgt -> std).
export function themeCandidates(zone: string, defZone: string, day: boolean, mode: Mode): string[] {
  const dayOrder = day ? ["DAY"] : ["NGT", "DAY"];
  const modeOrder: string[] = [mode.toUpperCase()];
  if (mode === "thr") modeOrder.push("FGT");
  if (mode !== "std") modeOrder.push("STD");
  const out: string[] = [];
  for (const z of [zone, defZone]) {
    for (const d of dayOrder) {
      for (const m of modeOrder) out.push(`${z}_${d}_${m}`);
    }
  }
  return out;
}

export function pickTheme(candidates: string[], has: (name: string) => boolean): string | null {
  for (const c of candidates) if (has(c)) return c;
  return null;
}

// Embellishment on a mode change: into std from a fight = break; into fgt from thr = fill; else none.
export function embellishFor(cur: Mode, next: Mode): Embellish {
  if (next === "std") return cur !== "std" ? "break" : "none";
  if (next === "fgt") return cur === "thr" ? "fill" : "none";
  return "none";
}

// Hand-off from the game thread to the audio thread: the latest request wins, the audio side takes it once.
export class PendingTheme<T> {
  private pending: T | null = null;
  set(v: T): void { this.pending = v; }
  take(): T | null {
    const v = this.pending;
    this.pending = null;
    return v;
  }
}

// Ambient emitter with a random repeat delay, a radius gate and a day/night variant.
export interface Emitter {
  x: number; y: number; z: number;
  radius: number;
  delayMs: number;      // base repeat delay
  delayVarMs: number;   // random extra, uniform in [0, delayVarMs)
  nextAt: number;       // ms, game clock
  dayFrom: number;      // clock minutes
  dayTo: number;        // clock minutes, end exclusive
}

// Plays only when the listener is inside radius + 800 units (squared-distance compare).
export function inRange(e: Emitter, lx: number, ly: number, lz: number): boolean {
  const d = e.radius + 800;
  const dx = e.x - lx;
  const dy = e.y - ly;
  const dz = e.z - lz;
  return dx * dx + dy * dy + dz * dz < d * d;
}

export function scheduleNext(e: Emitter, nowMs: number, rnd: () => number): void {
  e.nextAt = nowMs + e.delayMs + (e.delayVarMs > 0 ? Math.floor(rnd() * e.delayVarMs) : 0);
}

export function variantFor(e: Emitter, clockMin: number, dayName: string, nightName: string): string {
  return clockMin >= e.dayFrom && clockMin < e.dayTo ? dayName : nightName;
}

export {};
