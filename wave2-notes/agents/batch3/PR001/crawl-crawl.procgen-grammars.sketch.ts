// Licence: Crawl is GPLv2+ (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

interface Rng {
  // true with probability x / y
  chance(x: number, y: number): boolean;
}

// n trials, each succeeding with pct / 100.
function binomialPct(rng: Rng, trials: number, pct: number): number {
  let count = 0;
  for (let i = 0; i < trials; i++) if (rng.chance(pct, 100)) count++;
  return count;
}

interface Budget { good: number; bad: number; maxProps: number; }

// Quality points and bad properties are two binomial draws; good points = quality + bad (less any fixed ones).
// Distinct properties are capped at 4, with an extra one at 1/20 and another at 1/40.
function rollBudget(rng: Rng, fixedBad = 0, fixedGood = 0): Budget {
  const quality = 1 + binomialPct(rng, 6, 21);
  const bad = fixedBad < 2 ? binomialPct(rng, 2 - fixedBad, 21) : 0;
  const good = Math.max(quality + fixedBad + bad - fixedGood, 0);
  const maxProps = 4 + (rng.chance(1, 20) ? 1 : 0) + (rng.chance(1, 40) ? 1 : 0);
  return { good, bad, maxProps };
}

interface Option { glyph: string; weight: number; }

// Weighted glyph roll: each option that wins its chance (weight / running total) becomes the pick, so the last winner stands.
// fixed = true freezes the first roll on this chooser (scope of the freeze not traced in the donor); fixed = false rolls per cell.
function makeGlyphChooser(rng: Rng, options: Option[], fixed: boolean): () => string {
  let frozen: string | null = null;
  return (): string => {
    if (frozen !== null) return frozen;
    let cumulative = 0;
    let chosen = options.length > 0 ? options[0].glyph : "";
    for (const o of options) {
      cumulative += o.weight;
      if (rng.chance(o.weight, cumulative)) chosen = o.glyph;
    }
    if (fixed) frozen = chosen;
    return chosen;
  };
}
