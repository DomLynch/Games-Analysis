// Ownership-aware reward pools. Pool = the reward list for a zone table; ledger = what this character already got.
interface PoolRoll {
  pool: string[];                 // donor ItemComponentsNoFossilOrScarf (8 items)
  given: Set<string>;             // donor player.randomComponentsGiven (array with duplicates)
}

// Stage-19 shape: `draws` independent picks over the same weights (owned 1, unowned 2).
// The ledger is written only after all draws, so one stage can repeat an item.
function drawOwnershipWeighted(
  state: PoolRoll,
  draws: number,
  rand01: () => number,
): string[] {
  const weight = (item: string): number => (state.given.has(item) ? 1 : 2);
  const total = state.pool.reduce((sum, item) => sum + weight(item), 0);
  const picked: string[] = [];
  for (let d = 0; d < draws; d++) {
    let roll = rand01() * total;
    let chosen = state.pool[state.pool.length - 1];   // typing fallback; unreachable while rand01() < 1
    for (const item of state.pool) {
      roll -= weight(item);
      if (roll < 0) { chosen = item; break; }
    }
    picked.push(chosen);
  }
  for (const item of picked) state.given.add(item);
  return picked;
}

// Stage-2/3 shape: up to `count` distinct items from the pool minus the ledger. No ledger write here.
function offerNotGiven(
  state: PoolRoll,
  count: number,
  rand01: () => number,
): string[] {
  const left = state.pool.filter((item) => !state.given.has(item));
  for (let k = left.length - 1; k > 0; k--) {
    const j = Math.floor(rand01() * (k + 1));
    [left[k], left[j]] = [left[j], left[k]];
  }
  return left.slice(0, count);
}
