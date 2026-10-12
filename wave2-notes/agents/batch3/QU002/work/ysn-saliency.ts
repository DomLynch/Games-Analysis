// Licence: MIT (donor). Shape adapted from the saliency selection described in the donor; written fresh, not a line-by-line translation.
// Rng is a seeded stream owned by the server (one per player), replacing the donor's unseeded static Random.

type Rng = () => number;

interface LineCandidate {
  id: string;            // stable line id; the once guard and view count are keyed by it
  conditionsPassed: boolean;
  complexity: number;    // boolean operators in the condition + 1, +1 more if once; 0 when there is no condition
  once: boolean;         // true = never offered again after its first run
}

// Pick the next line for a dialogue beat. Order of steps follows the donor:
// 1) drop failing candidates; 2) least-viewed group; 3) highest complexity in that group; 4) seeded random pick.
function pickNextLine(cands: LineCandidate[], views: Map<string, number>, rng: Rng): LineCandidate | null {
  const viewsOf = (id: string): number => views.get(id) ?? 0;
  const live = cands.filter(c => c.conditionsPassed && !(c.once && viewsOf(c.id) > 0));
  if (live.length === 0) return null;

  const leastViewed = Math.min(...live.map(c => viewsOf(c.id)));
  const group1 = live.filter(c => viewsOf(c.id) === leastViewed);
  const topComplexity = Math.max(...group1.map(c => c.complexity));
  const group2 = group1.filter(c => c.complexity === topComplexity);
  const index = Math.floor(rng() * group2.length);
  return group2[Math.min(index, group2.length - 1)];
}

// Called once the line has actually run (the donor calls ContentWasSelected here).
function recordLineRun(c: LineCandidate, views: Map<string, number>): void {
  views.set(c.id, (views.get(c.id) ?? 0) + 1);
}

// Option gate: the server re-checks the pick. The donor VM only range-checks the index.
function acceptOptionPick(options: { id: string; enabled: boolean }[], pickedIndex: number): string {
  if (pickedIndex < 0 || pickedIndex >= options.length) {
    throw new Error("option index out of range");
  }
  const opt = options[pickedIndex];
  if (!opt.enabled) {
    throw new Error("option not available for this player");
  }
  return opt.id;
}

export {};
