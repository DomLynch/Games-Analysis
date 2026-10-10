// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism; not a translation.
interface ScrollDropTable {
  dropRatePct: number;                     // server-wide percent gate (donor default 25)
  minLevel: number;                        // mob level gate
  dungeonMultiplier: number;               // dungeon pool roll uses dropRatePct x this
  zonePools: Record<string, string[]>;     // zone key -> artifact ids (zone data)
  allArtifacts: string[];                  // pool used by the dungeon widen roll
}

interface ScrollDropInput {
  mobLevel: number;
  mobInDungeon: boolean;
  zoneKey: string;
  expansionOk: boolean;                    // mob and killer both in the scroll expansion
}

interface ScrollDrop { artifactId: string; page: 1 | 2 | 3; }

// Percent gate: true in pct out of 100 cases (pct 0 never, pct 100 always).
function percentGate(pct: number, rng: () => number): boolean {
  return Math.floor(rng() * 100) + 1 <= pct;
}

// Uniform integer 0..max inclusive.
function uniformInt(max: number, rng: () => number): number {
  return Math.floor(rng() * (max + 1));
}

function rollScroll(input: ScrollDropInput, t: ScrollDropTable, rng: () => number): ScrollDrop | null {
  if (!input.expansionOk) return null;
  if (input.mobLevel < t.minLevel || !percentGate(t.dropRatePct, rng)) return null;

  // Dungeons: a second, wider roll uses every artifact. Otherwise, or when that roll fails, use the zone pool.
  let pool: string[];
  if (input.mobInDungeon && percentGate(Math.trunc(t.dropRatePct * t.dungeonMultiplier), rng)) {
    pool = t.allArtifacts;
  } else {
    pool = t.zonePools[input.zoneKey] ?? [];
  }
  if (pool.length === 0) return null;

  const artifactId = pool[uniformInt(pool.length - 1, rng)];
  const page: 1 | 2 | 3 = input.mobLevel > 55 ? 3 : input.mobLevel >= 51 ? 2 : 1;
  return { artifactId, page };
}

export {};
