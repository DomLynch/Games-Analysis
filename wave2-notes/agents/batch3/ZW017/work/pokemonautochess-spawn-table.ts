// Licence: GPL-3.0 per the LICENSE file (package.json says BSD-3-Clause; treated as copyleft). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type SpawnTable<T extends string> = Partial<Record<T, number>>;

// Per-entry chances. With totalWeight given, the mass left over is "nothing spawns".
// Without it, the weights are normalised and an entry always comes up when the table is not empty.
function pickWeighted<T extends string>(table: SpawnTable<T>, totalWeight?: number): T | null {
  const entries = Object.entries(table) as [T, number][];
  const total = totalWeight ?? entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [item, weight] of entries) {
    if ((r -= weight) < 0) return item;
  }
  return null;
}

export class SpawnRun<T extends string> {
  private readonly seen = new Set<T>();

  constructor(
    private readonly zoneTables: Map<number, SpawnTable<T>>,
    private readonly festival: boolean = false
  ) {}

  // Rolled once per zone visit. An entry already seen in this run is voided, not rerolled,
  // so its share of the chance is lost for the rest of the run.
  rollZone(zone: number): T | null {
    const table = this.zoneTables.get(zone);
    if (table === undefined) return null; // zone has no table: nothing spawns
    let pick = pickWeighted(table, this.festival ? undefined : 1);
    if (pick !== null && !this.festival && this.seen.has(pick)) pick = null;
    if (pick !== null) this.seen.add(pick);
    return pick;
  }
}

export {};
