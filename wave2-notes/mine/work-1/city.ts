// Licence: MIT (donor). Own code written from the described mechanism.
interface Cell { id: string; protection: number } // 0..100
interface Incident { cellId: string; remaining: number }

export interface DirectorConfig {
  cap: (population: number) => number;   // donor: max(2, floor(pop/500))
  chanceByCoverage: (avg: number) => number; // donor: 0.4/.25/.15/.08
  floorWeight: number;                    // donor: 0.1
  doubleChance: number;                   // donor: 0.3
  lifetimeS: number;                      // donor: 20 default
}

export const defaultConfig: DirectorConfig = {
  cap: (p) => Math.max(2, Math.floor(p / 500)),
  chanceByCoverage: (a) => (a < 20 ? 0.4 : a < 40 ? 0.25 : a < 60 ? 0.15 : 0.08),
  floorWeight: 0.1,
  doubleChance: 0.3,
  lifetimeS: 20,
};

export function directorAttempt(
  cells: Cell[], live: Map<string, Incident>, population: number,
  cfg: DirectorConfig, rnd: () => number,
): Incident[] {
  if (cells.length === 0) return [];
  const cap = cfg.cap(population);
  if (live.size >= cap) return [];
  const avg = cells.reduce((s, c) => s + c.protection, 0) / cells.length;
  const base = cfg.chanceByCoverage(avg);
  const made: Incident[] = [];
  const n = rnd() < cfg.doubleChance ? 2 : 1;
  for (let i = 0; i < n; i++) {
    if (live.size + made.length >= cap) break;
    if (rnd() > base) continue;
    const pool = cells.filter(
      (c) => !live.has(c.id) && !made.some((m) => m.cellId === c.id) &&
        rnd() < Math.max(cfg.floorWeight, 1 - c.protection / 100),
    );
    if (pool.length === 0) continue;
    made.push({ cellId: pool[Math.floor(rnd() * pool.length)].id, remaining: cfg.lifetimeS });
  }
  return made;
}

export {}
