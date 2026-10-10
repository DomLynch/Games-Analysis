// Licence: GPL-2.0 and CC-BY-SA-3.0 (donor default/COPYING; game content scripts are dual-licensed). Clean-room shape written from the mechanism, not a translation of the FOCS.
interface Row {
  id: string;
  chance: number;   // 1 = deterministic
  unlocked: boolean; // a row that does not apply does not claim the site
  grants: string;
}

interface Site {
  state: "intact" | "depleted";
  gateOwned: boolean; // progression gate (donor: the owner must have the excavation tech)
}

// One excavation for one site. Rows are tried in order; the first row whose roll passes claims the site.
// If no row claims it, the fallback "empty" result is reported. The site is depleted either way.
function excavate(site: Site, rows: Row[], rng: () => number): string | null {
  if (site.state !== "intact" || !site.gateOwned) return null;
  let result = "empty";
  for (const r of rows) {
    if (!r.unlocked) continue;
    if (rng() >= r.chance) continue;
    result = r.grants;
    break;
  }
  site.state = "depleted";
  return result;
}

// Example wiring: ship 0.2, building 0.25, weapon tech 0.5 (if not owned), then a sure tech (if not owned), then empty.
const rows: Row[] = [
  { id: "ship", chance: 0.2, unlocked: true, grants: "dragonTooth" },
  { id: "building", chance: 0.25, unlocked: true, grants: "neutronium" },
  { id: "weapon", chance: 0.5, unlocked: true, grants: "weapon4" },
  { id: "shield", chance: 1, unlocked: true, grants: "multispecShield" },
  { id: "krill", chance: 1, unlocked: true, grants: "krillSpawn" },
];

let seed = 11;
const rng = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const tally = new Map<string, number>();
for (let i = 0; i < 1000; i++) {
  const site: Site = { state: "intact", gateOwned: true };
  const got = excavate(site, rows, rng);
  if (got !== null) tally.set(got, (tally.get(got) ?? 0) + 1);
}

export {};
