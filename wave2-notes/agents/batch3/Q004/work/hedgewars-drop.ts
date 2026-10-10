// Clean-room sketch from the described mechanism (donor is GPL-2.0 only; no lines translated).
export interface Item { name: string; weight: number; utility: boolean; }

export interface DropRules {
  everyNth: number;        // donor: cCaseFactor (1 in N per round; 0 = off)
  maxLive: number;         // donor: cMaxCaseDrops
  healthPercent: number;   // donor: cHealthCaseProb (percent)
  healthAmount: number;    // donor: cHealthCaseAmount
  items: Item[];           // weights from the scheme's probability levels
}

export type Box = { kind: "health"; amount: number } | { kind: "ammo" } | { kind: "utility" };

// Rand returns 0..n-1 (donor GetRandom(m) = GetNext mod m).
// Donor SpawnBoxOfSmth: gates, then a 1-in-N roll, then the class split.
export function rollBox(
  rules: DropRules, liveBoxes: number, invulnerable: boolean,
  blocked: boolean, rand: (n: number) => number,
): Box | null {
  if (blocked || rules.everyNth === 0 || liveBoxes >= rules.maxLive) return null;
  if (rand(rules.everyNth) !== 0) return null;

  let ammoW = 0, utilW = 0;
  for (const it of rules.items) { if (it.utility) utilW += it.weight; else ammoW += it.weight; }
  const total = ammoW + utilW;

  // Donor starts with t = 0 and h = 1, so when every weight is zero the health branch is taken.
  let t = 0, h = 1, a = ammoW;
  if (total !== 0) {
    if (!invulnerable) {
      h = rules.healthPercent * 100;                        // out of 10000
      t = rand(10000);
      a = Math.floor((10000 - h) * ammoW / total);          // ammo gets its share of the rest
    } else {
      h = 0;                                                // no health box when invulnerable
      t = rand(total);
    }
  }

  if (t < h) return { kind: "health", amount: rules.healthAmount };
  if (t < a + h) return ammoW > 0 ? { kind: "ammo" } : null;
  return utilW > 0 ? { kind: "utility" } : null;
}

// Donor GetAmmo / GetUtility: weighted item pick, run when the box is collected.
export function rollItem(items: Item[], utility: boolean, rand: (n: number) => number): Item | null {
  const pool = items.filter((i) => i.utility === utility);
  const total = pool.reduce((s, i) => s + i.weight, 0);
  if (total <= 0) return null;
  let t = rand(total);
  for (const it of pool) {
    if (t < it.weight) return it;
    t -= it.weight;
  }
  return null;
}

export {};
