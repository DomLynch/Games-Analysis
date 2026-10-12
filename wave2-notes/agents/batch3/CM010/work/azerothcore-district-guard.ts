// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type Faction = "alliance" | "horde";
type XYZ = { x: number; y: number; z: number };

// Zone data: one record per guarded quarter. The id sets and numbers are data, not code.
interface District {
  zoneId: number;                    // city zone the quarter sits in
  owner: Faction;                    // faction whose quarter this is
  areaIds: ReadonlySet<number>;      // open-courtyard area ids
  buildingIds: ReadonlySet<number>;  // building group ids (interiors that report the plain zone id)
  watchRange: number;                // guard coverage radius, same units as positions
  highVehicleZ: number;              // a rider above this height is exempt
}

interface Guard {
  pos: XYZ;
  district: District;
}

interface Visitor {
  zoneId: number;
  pos: XYZ;                          // the trespasser's own position (a pet uses its own)
  areaId: number;
  buildingId: number | null;         // building at pos, resolved by the caller; null if none
  nonCombatPet: boolean;
  // Rules come from the owner; for a lone player the owner is the player.
  ownerFaction: Faction | null;      // null when there is no player behind the unit
  ownerIsGM: boolean;
  ownerTeleporting: boolean;
  ownerInVehicle: boolean;
  ownerZ: number;
  ownerDisguised: boolean;
}

function dist3(a: XYZ, b: XYZ): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Decide whether this guard casts the eject on this visitor.
// Order: zone, coverage, non-combat pet, owner exemptions, faction, then ground (area or building).
export function shouldEject(g: Guard, v: Visitor): boolean {
  const d = g.district;
  if (v.zoneId !== d.zoneId) return false;
  if (dist3(g.pos, v.pos) > d.watchRange) return false;
  if (v.nonCombatPet) return false;
  if (v.ownerFaction === null) return false;
  if (v.ownerIsGM || v.ownerTeleporting) return false;
  if (v.ownerInVehicle && v.ownerZ > d.highVehicleZ) return false;
  if (v.ownerDisguised) return false;
  if (v.ownerFaction === d.owner) return false;

  const onOpenGround = d.areaIds.has(v.areaId);
  const inBuilding = v.buildingId !== null && d.buildingIds.has(v.buildingId);
  return onOpenGround || inBuilding;
}
