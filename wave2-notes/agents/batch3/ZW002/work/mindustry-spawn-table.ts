// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpawnGroup {
  unitType: string;
  begin: number;         // first wave index the group can appear in (default 0)
  end: number;           // last wave index (default Infinity = never)
  spacing: number;       // appear every Nth wave (default 1)
  unitAmount: number;    // base count per spawn point (default 1)
  unitScaling: number;   // waves per +1 unit (default Infinity = never)
  max: number;           // cap per spawn point per wave (default 40)
  shields: number;       // shield points at the first wave
  shieldScaling: number; // shield points added per wave
  spawnPoint: number;    // -1 = any spawn point, otherwise only this point id
}

export interface SpawnPoint { id: number; x: number; y: number; }
export interface Spawn { unitType: string; x: number; y: number; shield: number; }

// units this group adds at ONE spawn point for one wave index (0 when off-cycle)
export function groupCount(g: SpawnGroup, wave: number): number {
  const spacing = g.spacing === 0 ? 1 : g.spacing;
  if (wave < g.begin || wave > g.end || (wave - g.begin) % spacing !== 0) return 0;
  const steps = Math.floor((wave - g.begin) / spacing);
  const extra = g.unitScaling > 0 ? Math.floor(steps / g.unitScaling) : 0;
  return Math.min(g.unitAmount + extra, g.max);
}

export function shieldAt(g: SpawnGroup, wave: number): number {
  return Math.max(g.shields + g.shieldScaling * (wave - g.begin), 0);
}

const SPREAD = 16; // 2 tiles of 8 world units each

// one wave: every group that counts this wave, at every spawn point it is allowed on
export function planWave(groups: SpawnGroup[], points: SpawnPoint[], wave: number, multiplier: number, rand: () => number): Spawn[] {
  const out: Spawn[] = [];
  for (const g of groups) {
    const base = groupCount(g, wave);
    if (base === 0) continue;
    const perPoint = Math.max(1, Math.round(base * multiplier)); // difficulty scales the count, never below 1
    for (const p of points) {
      if (g.spawnPoint !== -1 && g.spawnPoint !== p.id) continue;
      for (let i = 0; i < perPoint; i++) {
        const a = rand() * 2 * Math.PI;
        const r = rand() * SPREAD;
        out.push({ unitType: g.unitType, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, shield: shieldAt(g, wave) });
      }
    }
  }
  return out;
}

// true if a player at (px, py) is inside any spawn point's drop zone
export function inDropZone(px: number, py: number, points: SpawnPoint[], radius: number): boolean {
  return points.some(p => Math.hypot(p.x - px, p.y - py) < radius);
}

export interface WaveTimer { wave: number; wavetime: number; waiting: boolean; }

// once per server update, dt in ticks (variable step). Spawns with the counter as it was, then advances it.
export function tickWave(t: WaveTimer, dt: number, spacing: number, spawn: (waveIndex: number) => void): void {
  if (!t.waiting) t.wavetime = Math.max(t.wavetime - dt, 0);
  if (t.wavetime <= 0) {
    spawn(t.wave - 1);
    t.wave++;
    t.wavetime = spacing;
  }
}

export {};
