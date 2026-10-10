// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rand = () => number;

interface LootEntry { item: string; weight: number; minTier: number; } // item "" = no drop
interface SlotRoll { slot: string; table: LootEntry[]; oneInN: number; } // oneInN 1 = always rolled
interface CreatureLoot { slots: SlotRoll[]; goodOneInN: number; }       // 1-in-N quality upgrade

interface Carried {
  slot: string;
  item: string;
  good: boolean;
  droppedBy?: number;    // dropper id, set on death
  originPlayer?: boolean; // true only when the player (or pet) made the kill
}

function oneIn(n: number, rand: Rand): boolean {
  return n <= 1 || Math.floor(rand() * n) === 0;
}

function pickWeighted(table: LootEntry[], tier: number, rand: Rand): string | null {
  const eligible = table.filter(e => e.minTier <= tier && e.weight > 0);
  const total = eligible.reduce((s, e) => s + e.weight, 0);
  if (total === 0) return null;
  let r = rand() * total;
  for (const e of eligible) {
    r -= e.weight;
    if (r < 0) return e.item || null;
  }
  return null;
}

// Spawn: rolled once when the creature is created. Tier comes from depth.
function rollSpawnLoot(spec: CreatureLoot, depth: number, rand: Rand): Carried[] {
  const tier = 1 + Math.floor(depth / 2);
  const carried: Carried[] = [];
  for (const s of spec.slots) {
    if (!oneIn(s.oneInN, rand)) continue;
    const item = pickWeighted(s.table, tier, rand);
    if (item === null) continue;
    carried.push({ slot: s.slot, item, good: oneIn(spec.goodOneInN, rand) });
  }
  return carried;
}

// Death: everything carried falls to the floor in the order given (weapons last, so they land on top).
// Hard-reset monsters lose their gear. Killer origin is set only when the player made the kill.
function dropOnDeath(carried: Carried[], dropperId: number, playerKill: boolean, hardReset: boolean): Carried[] {
  if (hardReset) return [];
  return carried.map(c => ({ ...c, droppedBy: dropperId, originPlayer: playerKill }));
}

// Pickup for a monster standing on a floor item.
// Blocked when the monster is neutral/friendly, or the player has seen the item and the monster cannot steal,
// unless this monster dropped the item itself.
function mayPickUp(
  item: Carried & { seenByPlayer: boolean },
  monsterId: number,
  hostile: boolean,
  canSteal: boolean,
): boolean {
  const blocked = (!hostile || (item.seenByPlayer && !canSteal));
  return !blocked || item.droppedBy === monsterId;
}

export {};
