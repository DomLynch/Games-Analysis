# azerothcore-azerothcore-wotlk (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/scripts/Northrend/zone_dalaran.cpp` (AI `npc_mageguard_dalaranAI::MoveInLineOfSight`, lines 301-344) | Licence: GPL-2.0 (`/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/LICENSE`, line 1 "GNU GENERAL PUBLIC LICENSE", version 2, June 1991) | C++ | symbol `npc_mageguard_dalaran`

Checked: Hint file `e2e/suites/world/dalaran/trespasser_e2e_test.go` read in full (203 lines); it is the test and states the rule. Donor code read: `zone_dalaran.cpp` 220-352 (guard AI, watch range, building lists, eject decision) and `GridNotifiers.cpp` 127-142 (what calls the AI). Files opened: 3 (the test, zone_dalaran.cpp, GridNotifiers.cpp), plus `AreaDefines.h` checked by grep only (the constants at lines 151, 162, 175; not read as a file). Not read: the trespass spell 54028 / 54029 effect (the ejection itself; `grep` in `data/sql/base/db_world` found no effect row for it, only a disables row). The ejection destination is taken from the test's own comments and assertion (test lines 53-54, 187), not from donor data. Confidence: high on the detection and decision path; medium on the outcome. Depth: thin. camera_scope: n/a (not a camera cell).

## 1. Mechanism

- A guard NPC stands in one quarter of a city. The guard's AI is called for a unit through `CreatureUnitRelocationWorker`, which calls `c->AI()->MoveInLineOfSight_Safe(u)` when the creature is AI-enabled and can see the unit (`GridNotifiers.cpp` 136-138). The donor's test says this fires on relocation (test lines 171-172). The notifier's other callers were not read.
- Order of checks inside `MoveInLineOfSight` (`zone_dalaran.cpp` 301-344):
  (a) the unit must be in the Dalaran zone (303);
  (b) the unit must be within 40 yards of the guard (306, with `GUARD_WATCH_RANGE` at 244);
  (c) a non-combat pet is skipped (309);
  (d) the rules come from the unit's player owner, or the player itself; no player means no action (312, 314);
  (e) exemptions: GM, being teleported, or a rider above Z 670 in a vehicle (314); a disguise aura from the two quest disguises (316);
  (f) faction gate: the Silver Covenant guard acts only on Horde owners (332); the Sunreaver guard acts only on Alliance owners (337);
  (g) ground test on the unit's own position: its area id is the quarter's area id, OR its building group is in the quarter's list (327-339, with `IsInsideWMOGroups` at 268-279);
  (h) cast the trespass spell on the unit (334 or 340);
  (i) turn back to the home facing (343).
- The ground test is the core idea. The area id covers only the open courtyard. Building interiors report the plain Dalaran zone id, so the donor also lists building group ids (comment 246-258). Neutral buildings are in neither list on purpose, so a hostile visitor is welcome in them.
- Rules come from the owner, but position comes from the unit (320-326), so a pet sent into a quarter is ejected on its own footing.

## 2. Key functions

- `npc_mageguard_dalaranAI::MoveInLineOfSight`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/scripts/Northrend/zone_dalaran.cpp` 301-344. The full decision path above.
- `IsInsideWMOGroups`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/scripts/Northrend/zone_dalaran.cpp` 268-279. Reads the map's area info at the unit's position and tests the building group id against a list.
- Trigger: `CreatureUnitRelocationWorker`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Grids/Notifiers/GridNotifiers.cpp` 127-142 (call at 138).
- Test contract: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/e2e/suites/world/dalaran/trespasser_e2e_test.go` 43-117 (both directions: restricted ground must eject, public ground must not) and 124-203 (pet inside, owner outside).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor numbers |
|---|---|
| District = open-ground area ids OR building ids; neutral buildings left out on purpose | Silver Enclave: 11 building group ids (`zone_dalaran.cpp` 259-261); Sunreaver: 7 (263-265); area ids 4740 Silver Enclave, 4616 Sunreaver, 4395 Dalaran (`AreaDefines.h` 175, 162, 151) |
| Guard coverage radius | 40.0 yards (`zone_dalaran.cpp` 244) |
| Owner-based exemptions | GM; being teleported (314); rider above Z 670 (314); disguise auras (316) |
| Faction gate | Silver Covenant acts on TEAM_HORDE (332); Sunreaver acts on TEAM_ALLIANCE (337) |
| Trigger | On relocation notification (`GridNotifiers.cpp` 138; callers not read); `UpdateAI` is empty (`zone_dalaran.cpp` 346), so there is no timer |
| Side effect after a check | Facing reset to home (343) |

## 4. TypeScript sketch

simplified: the sketch takes the trespasser's area id and building id as already-resolved inputs (the donor calls `GetAreaInfo` itself and reads the owner through `GetCharmerOrOwnerPlayerOrPlayerItself`). It merges the two donor guards into one `District` record (the data shape Frankendom wants). It keeps the donor's check order (zone, coverage, non-combat pet, owner exemptions, faction, ground). It omits the spell cast, the facing reset, the disguise aura lookup detail, and the donor's `IsWithinDist` third argument (not read); it uses 3D distance. It does not model the relocation trigger, which is the donor's defect (see section 6).

```ts
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
```

Typecheck: copied to the VPS as `/tmp/CM010-azerothcore-district-guard.ts`, `npx -p typescript tsc --noEmit --strict --target es2020` exit 0. Local copy: `/private/tmp/p2/wave2-haiku/batch3/CM010/work/azerothcore-district-guard.ts`.

## 5. Lands in

- TARGET `origins/server/zone-districts.ts` (new, proposed): district records as zone data, and the guard eject decision run on the server as a state change (teleport to the gate). Parity-checklist row 23 (zone population: the coverage number and the zone data fields).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: zones as data (one runtime, district data per zone); eject decided on the server; the client only shows the warning.

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism, not translated.
- Defect 1, relocation-only trigger: the check runs on relocation notifications (`GridNotifiers.cpp` 138) and `UpdateAI` is empty (`zone_dalaran.cpp` 346). The donor's own test says a stationary unit is not re-evaluated: "A stationary unit is never re-evaluated" (test line 171). A player who stops inside a quarter is not checked again until it moves. Fix: also check every visitor within watch range on each server tick, and on zone entry. Acceptance covers this.
- Defect 2, hard-coded building lists: the 18 group ids come from one WMO model (WMOID 5164, comment at 252) and sit in C++ source. A patch or a new building breaks the list silently. Fix: keep the ids in zone data and keep the sweep the donor used (comment 256-258) as a dev tool.
- Defect 3, magic number: Z 670 is inline in the check (314). Fix: `highVehicleZ` as a data field (the sketch does this).
- Defect 4, side effect in a rule: the check resets the guard's facing (343). Harmless here, but the rule should not write state. Fix: keep the rule pure; facing belongs to the guard's idle state.
- The ejection outcome is not read: the trespass spell effect and destination are not in the donor data we opened. Acceptance must not assume the donor's destination.
- Frankendom has no WMO groups in the browser world. The data field becomes "building ids from our map data". The explicit neutral list (buildings in neither list) must be kept, or every interior becomes restricted.
- An eject here is a state change, not a kill, so it sits outside the one ledger's kill rules. It should still be server-verified.

Best transferable idea: a restricted district is a list of open-ground area ids plus a list of building ids (neutral buildings left out on purpose), checked against the visitor's own position inside a 40-yard guard radius with owner-based exemptions, and asserted in both directions by a test.
Decision (proposed): adapt. Take the membership shape (area ids plus building ids, explicit neutral exclusions, owner rules, coverage radius as data); drop the WMO numbers and the relocation-only trigger.
Acceptance: a rival-faction player who walks into any building tagged to the enclave is moved to the gate within 10 s on the server; the same player on the public street is not moved; a server test asserts both directions and a player who stops inside the range is still moved within one tick.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: zones as data; server-verified state change; the client only shows the warning.
