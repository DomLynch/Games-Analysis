// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type TierId = "jacket" | "combat" | "body";

interface ArmourTier {
  base: number;     // points granted when this tier is taken with nothing held
  max: number;      // cap on held points
  normal: number;   // share of each hit this tier absorbs (protection)
}

const TIERS: Record<TierId, ArmourTier> = {
  jacket: { base: 25, max: 50, normal: 0.3 },
  combat: { base: 50, max: 100, normal: 0.6 },
  body: { base: 100, max: 200, normal: 0.8 },
};

// One equipment slot: at most one tier is held, with a point count.
interface ArmourSlot {
  tier: TierId | null;
  points: number;
}

// Returns true when the pickup is taken. false means the item stays on the floor.
function pickupArmour(slot: ArmourSlot, item: TierId): boolean {
  const incoming = TIERS[item];
  if (slot.tier === null) {
    slot.tier = item;
    slot.points = incoming.base;
    return true;
  }
  const held = TIERS[slot.tier];
  if (incoming.normal > held.normal) {
    // Better tier: convert the held points by old/new protection, add the new base, cap at the new max.
    const converted = Math.trunc((held.normal * slot.points) / incoming.normal);
    slot.tier = item;
    slot.points = Math.min(incoming.base + converted, incoming.max);
    return true;
  }
  // Same or worse tier: convert the incoming base by new/old protection and add it to the held points.
  const added = Math.trunc((incoming.normal * incoming.base) / held.normal);
  const next = Math.min(slot.points + added, held.max);
  if (slot.points >= next) return false; // already at the cap: refuse, the item stays
  slot.points = next;
  return true;
}

// Shard: +2 points. Fix: the donor adds 2 with no cap; here the held tier's max applies and a full slot refuses.
function pickupShard(slot: ArmourSlot): boolean {
  if (slot.tier === null) {
    slot.tier = "jacket";
    slot.points = 2;
    return true;
  }
  const held = TIERS[slot.tier];
  if (slot.points >= held.max) return false;
  slot.points = Math.min(slot.points + 2, held.max);
  return true;
}

// Each hit: the slot absorbs ceil(normal x damage) points, never more than it holds.
function absorb(slot: ArmourSlot, damage: number): number {
  if (slot.tier === null || slot.points <= 0) return 0;
  let save = Math.ceil(TIERS[slot.tier].normal * damage);
  if (save >= slot.points) save = slot.points;
  slot.points -= save;
  return save;
}

export {};
