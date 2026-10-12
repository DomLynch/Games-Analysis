// Licence: NetHack General Public License (donor, copyleft-style). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface DeathItem { id: string; cursed: boolean; }

type Placement = { kind: "pile" } | { kind: "monster"; monsterId: string };

interface PlacedItem { id: string; cursed: boolean; placed: Placement; }

interface DeathPile { persists: boolean; items: PlacedItem[]; }

// Chance that a death at this depth leaves a recoverable pile: 1 - 1/(1 + floor(depth/4)).
// Depth 1-3 never leaves one; 4-7 gives 1/2; 8-11 gives 2/3; 12-15 gives 3/4.
function pileChance(depth: number): number {
  if (depth <= 0) return 0;
  const k = 1 + Math.floor(depth / 4);
  return 1 - 1 / k;
}

// rand() returns a value in [0, 1). Every carried item is dumped (worn gear included).
// Each item is cursed with chance 0.8; with chance 1/8 it goes to a nearby monster that
// likes loot (uniform pick among candidates), otherwise it lies on the pile cell.
function rollDeathPile(
  depth: number,
  items: DeathItem[],
  nearbyLootMonsterIds: string[],
  rand: () => number,
): DeathPile {
  if (rand() >= pileChance(depth)) return { persists: false, items: [] };
  const out: PlacedItem[] = [];
  for (const it of items) {
    const cursed = it.cursed || rand() < 0.8;
    let placed: Placement = { kind: "pile" };
    if (rand() < 1 / 8 && nearbyLootMonsterIds.length > 0) {
      const i = Math.floor(rand() * nearbyLootMonsterIds.length);
      placed = { kind: "monster", monsterId: nearbyLootMonsterIds[i] };
    }
    out.push({ id: it.id, cursed, placed });
  }
  return { persists: true, items: out };
}

export {};
