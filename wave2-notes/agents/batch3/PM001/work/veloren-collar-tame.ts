// Licence: GPL-3.0 (donor LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Collar tame: no roll. Refuse at the owned-pet cap; otherwise the nearest wild, eligible creature within the radius becomes owned.
const MAX_PETS = 3;
const TAME_RADIUS = 5; // tiles; compared as squared distance, as the donor does

type Alignment = "wild" | "npc" | { owner: number };
interface Creature { id: number; x: number; y: number; kind: string; alignment: Alignment; }

// Eligible kinds are data (the donor hard-codes a match; the comment in the donor says quadrupeds only, the code also allows birds and crustaceans).
const TAMEABLE_KINDS = new Set<string>(["wolf", "deer", "bird", "crab"]);

interface UseResult { tamed: number | null; collarConsumed: boolean; }

// Use a collar. Refused (collar kept) at the cap or when no candidate is in range.
function useCollar(ownerId: number, ox: number, oy: number, ownedCount: number, world: Creature[]): UseResult {
  if (ownedCount >= MAX_PETS) return { tamed: null, collarConsumed: false };
  let best: Creature | undefined;
  let bestD2 = Infinity;
  for (const c of world) {
    if (c.alignment !== "wild" || !TAMEABLE_KINDS.has(c.kind)) continue;
    const d2 = (c.x - ox) ** 2 + (c.y - oy) ** 2;
    if (d2 < TAME_RADIUS * TAME_RADIUS && d2 < bestD2) { best = c; bestD2 = d2; }
  }
  if (!best) return { tamed: null, collarConsumed: false };
  best.alignment = { owner: ownerId };
  return { tamed: best.id, collarConsumed: true };
}

// Pet tuning applied when a creature becomes owned: stays near its owner and wakes to threats less readily.
interface PetTuning { idleWander: number; aggroRange: number; patrolOrigin: null; }
function petTuning(): PetTuning { return { idleWander: 0.25, aggroRange: 0.25, patrolOrigin: null }; }

const herd: Creature[] = [
  { id: 1, x: 0, y: 0, kind: "wolf", alignment: "wild" },
  { id: 2, x: 4, y: 0, kind: "wolf", alignment: "wild" },
  { id: 3, x: 3, y: 0, kind: "dragon", alignment: "wild" },
];
console.log(useCollar(9, 0, 0, 2, herd).tamed, useCollar(9, 0, 0, 3, herd).collarConsumed, petTuning().aggroRange);
export {};
