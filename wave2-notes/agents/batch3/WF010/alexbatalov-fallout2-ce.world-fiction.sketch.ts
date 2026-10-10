// Sketch: weighted pick for a death or epilogue card (src/fight/death-card.ts, parity row 17).
// simplified: keeps the donor's gated, cumulative-weight pick and its inclusive roll (0..total).
// Omits: the donor's special-ending index (a fixed slot chosen by one flag) and its timeout movie.
// Reorders: the donor counts index only for enabled rows; here the chosen row is the row itself,
// so a disabled row can never be returned (the donor could return a disabled row).
// Data fields (designer-tunable): weight (percent), flagBelow {flag, value} (enabled while flag < value),
// zoneKnown / zoneNotKnown (zone id), minLevel (int), line (card text key).
export {};

interface CardRow {
  key: string;
  weight: number;                       // data field: weight, unit percent
  flagBelow?: { flag: string; value: number };
  zoneKnown?: string;
  zoneNotKnown?: string;
  minLevel?: number;                    // unit: character level
}

interface Ctx {
  flags: Record<string, number>;
  knownZones: Set<string>;
  level: number;
}

function enabled(row: CardRow, ctx: Ctx): boolean {
  if (row.flagBelow !== undefined && (ctx.flags[row.flagBelow.flag] ?? 0) >= row.flagBelow.value) return false;
  if (row.zoneKnown !== undefined && !ctx.knownZones.has(row.zoneKnown)) return false;
  if (row.zoneNotKnown !== undefined && ctx.knownZones.has(row.zoneNotKnown)) return false;
  if (row.minLevel !== undefined && ctx.level < row.minLevel) return false;
  return true;
}

// roll01 is a uniform number in [0, 1). Returns null when no row is enabled
// (the donor fell back to row 0 here, which may be disabled).
export function pickCard(pool: CardRow[], ctx: Ctx, roll01: number): CardRow | null {
  const live = pool.filter(r => enabled(r, ctx));
  const total = live.reduce((s, r) => s + r.weight, 0);
  if (live.length === 0 || total <= 0) return null;
  const chance = Math.floor(roll01 * (total + 1)); // inclusive 0..total, like randomBetween(0, total)
  let acc = 0;
  for (const row of live) {
    acc += row.weight;
    if (acc >= chance) return row;
  }
  return live[live.length - 1];
}
