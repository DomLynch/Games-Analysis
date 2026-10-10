// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Member {
  id: string;
  chance: number;   // percent; 0 means an equal-chance member
}

export interface PoolState {
  maxLimit: number;          // population cap for this pool (zone data)
  spawned: Set<string>;      // members counted as spawned, including dead ones waiting to respawn
}

// Refill one pool. dueId is the member whose respawn timer just fired (undefined on first spawn).
// rng returns a value in [0, 1). canCreate says whether the member's area is loaded right now.
export function refillPool(
  pool: PoolState,
  members: Member[],
  dueId: string | undefined,
  rng: () => number,
  canCreate: (id: string) => boolean,
): string[] {
  if (dueId !== undefined) pool.spawned.delete(dueId);   // the due member leaves the count first
  const count = pool.maxLimit - pool.spawned.size;
  if (count <= 0) return [];

  let candidates = members.filter((m) => !pool.spawned.has(m.id));
  if (candidates.length === 0) return [];

  const picked: Member[] = [];

  // One chance roll per refill: subtract each chanced candidate's chance from a 0..100 roll.
  let roll = rng() * 100;
  for (const m of candidates) {
    if (m.chance > 0) {
      roll -= m.chance;
      if (roll < 0) {
        picked.push(m);
        candidates = candidates.filter((c) => c !== m);
        break;
      }
    }
  }

  // Fill the remaining slots with a random subset of the rest.
  const remaining = count - picked.length;
  if (remaining > 0 && candidates.length > 0) {
    const rest = [...candidates];
    while (rest.length > remaining) rest.splice(Math.floor(rng() * rest.length), 1);
    picked.push(...rest);
  }

  const created: string[] = [];
  for (const m of picked) {
    pool.spawned.add(m.id);                 // marked first, as in the donor
    if (canCreate(m.id)) created.push(m.id);
  }
  return created;
}

export {};
