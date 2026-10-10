# azerothcore-azerothcore-wotlk (animation-rigs, cell 2)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Vehicle/VehicleDefines.h` (with `Vehicle.cpp`, `Vehicle.h`, `Maps/Map.cpp`, `Entities/Unit/Unit.cpp`, `Globals/ObjectMgr.cpp`) | Licence: GPL version 2 (`LICENSE` lines 1-2; source header `VehicleDefines.h` lines 5-6, "either version 2 of the License, or"; the rest of the header was not read) | C++ | symbol `Vehicle::RelocatePassengers` with `TransportBase::CalculatePassengerPosition`

Checked: Read in full: the transform pair in `VehicleDefines.h` 85-165; the `Vehicle` wrappers in `Vehicle.h` 79-92; `Vehicle.cpp` 36-50 (seat addon lookup), 411-468 (boarding offsets, entry move, facing), 546-569 (relocation); the two `Map.cpp` relocation sites (819-821, 843-845); `Unit.cpp` 15659-15673; `ObjectMgr.cpp` 4151-4199 (addon loader); the `vehicle_seat_addon` table definition. Not read: `Vehicle.cpp` 296-410 (install and the start of `AddPassenger`), the callers of `CalculatePassengerOffset` (world to local is not traced), the values in `VehicleSeat.dbc` (not in the repo), and the spline semantics of `MoveSplineInit`. Verified on the VPS by a numeric run (not shipped): the donor forward transform and its tan-based inverse round-trip to a maximum error of 1.4e-13 over 10,000 random cases, and the transpose form gives the same result. GPL, so clean-room only. Confidence: high on the transform and the order of operations; medium on how general the seat case is (only the seat path was traced).

Best transferable idea: store each attached part as a local offset plus a yaw offset, and recompute its world pose from the parent every time the parent moves or turns, so sockets and seats never lag behind their base.

Decision (proposed): adapt. Take the offset-and-relocate pattern and the single transform function for hero sockets (weapon or shield on a hand socket). Do not take the donor's yaw-only transform: the donor has no pitch or roll and its own comment admits the absolute position "must depend on vehicle pitch angle" (`Vehicle.cpp` 553). A hero socket has to follow the rig's full bone transform.

Acceptance: a player sees the shield stay on its hand socket through a full turn and a stagger, with no frame of drift. A client test checks that the socket's world position equals the parent's pose composed with the stored local offset, within 1e-3 units, after a 360-degree turn.

## 1. Mechanism

- Each seat has two local numbers from the donor's data. The attachment offset (x, y, z) comes from the seat record (`Vehicle.cpp` 415-417). The orientation offset comes from the seat addon, or zero if there is none (414). Both are stored on the rider when it boards (419).
- Order of boarding, as the code runs: the seat addon is looked up when the vehicle is built (`Vehicle.cpp` 45). On entry, the rider gets the local offset and orientation (414-419), and the entry move is sent with path transforms disabled, so the move target is the local offset (454-455). The facing is the orientation offset (464). Four seat ids (3566, 3567, 3568, 3570) are special-cased: their world position is computed through the base transform and they face away from the base centre (457-461). The code says why only in a comment ("did not found anything unique in dbc", 456).
- The transform (`VehicleDefines.h` 143-151): world yaw is the base yaw plus the stored offset, normalised (147). World x and y rotate the local planar offset by the base yaw (149-150). World z is the base z plus the local z, with no rotation (151). So there is no pitch or roll.
- While riding, the donor recomputes every rider from its stored local pose. `RelocatePassengers` (546-569) first reads each rider's local pose (561), turns it into world space with the base's current position and yaw (562), and only then applies each new pose (568). It is called from the player relocation path (`Map.cpp` 819-821), the creature relocation path (843-845), the orientation update (`Unit.cpp` 15660-15665) and the height update (15668-15673). So every move, turn or height change of the base carries the riders.
- The inverse (world to local, `VehicleDefines.h` 154-165) is a tan-based closed form. The numeric check on the VPS shows it round-trips to the forward transform, so the sketch uses the transpose of the same rotation instead.
- Seat addon load (`ObjectMgr.cpp` 4160-4199): a row for a seat id missing from the seat record is skipped (4180-4183); an orientation above two pi is reset to zero and logged (4187-4191); an unknown exit mode is skipped (4193-4197); the rest is stored (4199). The table is `vehicle_seat_addon`, with the orientation default 0 (`vehicle_seat_addon.sql` 25).

## 2. Key functions

- `TransportBase::CalculatePassengerPosition` (static overload, local to world): `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Vehicle/VehicleDefines.h` 143-152.
- `TransportBase::CalculatePassengerOffset` (static overload, world to local, tan-based): same file, 154-165.
- `Vehicle::CalculatePassengerPosition` wrapper, passing the base's live position and yaw: `Vehicle.h` 79-84.
- `Vehicle::AddPassenger` (the local offset and the entry move), boarding part: `Vehicle.cpp` 411-468 (the start of the function was not read).
- `Vehicle::RelocatePassengers`: `Vehicle.cpp` 546-569.
- Callers: `Maps/Map.cpp` 819-821 and 843-845; `Entities/Unit/Unit.cpp` 15660-15673 (enclosing functions named as in the file).
- Addon loader: `Globals/ObjectMgr.cpp` 4151-4199.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| World pose = parent position + planar offset rotated by parent yaw, plus parent height plus local height | No rotation of the height (`VehicleDefines.h` 151), the transform is yaw-only |
| Child yaw = parent yaw + stored offset, normalised to [0, 2 pi) | Orientation default 0 (`vehicle_seat_addon.sql` 25); values above 2 pi reset to 0 (`ObjectMgr.cpp` 4187-4191) |
| Recompute all children after any parent move, turn or height change | Called from `Map.cpp` 821 and 845 and `Unit.cpp` 15664 and 15672 |
| Local offset is the source of truth; world pose is derived | Seat attachment offsets from `VehicleSeat.dbc` (values not read; `Vehicle.cpp` 415-417) |
| Exit modes: none, offset, absolute destination | `VehicleDefines.h` 61-63 |
| Four seat ids face away from the base centre | Seat ids 3566, 3567, 3568, 3570 (`Vehicle.cpp` 457), reason not in code |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: local offset and yaw offset are stored, the world pose is derived from the parent, and every child is recomputed after the parent changes. It omits the pitch and roll that the donor lacks (so it is no better than the donor on that point), the vehicle entry and facing rules, the four special seat ids, the threat handover, the exit modes, the seat addon loader and its clamps, and the `MoveSplineInit` path. The inverse is the transpose of the same rotation, not the donor's tan-based closed form. The sketch was typechecked on the VPS with `export {}` appended, `--strict --target es2020`, and passed.

```ts
// Licence: GPL-2.0 (donor LICENSE). Clean-room sketch written from the described mechanism (local offset rotated by the base yaw, plus base position and height), not a translation of the donor lines.

interface Pose {
  x: number;
  y: number;
  z: number;
  o: number; // yaw in radians
}

interface Attachment {
  offset: { x: number; y: number; z: number }; // local offset from the base (seat or socket data)
  orientationOffset: number;                   // radians added to the base yaw for the rider or prop (0 = none)
}

// Keep yaw in [0, 2*pi).
function normalizeYaw(o: number): number {
  const twoPi = 2 * Math.PI;
  let r = o % twoPi;
  if (r < 0) r += twoPi;
  return r;
}

// Local attachment point to world pose. Rotate the planar offset by the base yaw, add the base position,
// add the height offset unchanged. No pitch or roll: the base is assumed level.
function attachmentToWorld(base: Pose, a: Attachment): Pose {
  const c = Math.cos(base.o);
  const s = Math.sin(base.o);
  const { x: lx, y: ly, z: lz } = a.offset;
  return {
    x: base.x + lx * c - ly * s,
    y: base.y + ly * c + lx * s,
    z: base.z + lz,
    o: normalizeYaw(base.o + a.orientationOffset),
  };
}

// World position to local offset, using the transpose of the same rotation. Yaw is returned relative to the base.
function worldToAttachment(base: Pose, world: Pose): { x: number; y: number; z: number; o: number } {
  const c = Math.cos(base.o);
  const s = Math.sin(base.o);
  const dx = world.x - base.x;
  const dy = world.y - base.y;
  return {
    x: c * dx + s * dy,
    y: -s * dx + c * dy,
    z: world.z - base.z,
    o: normalizeYaw(world.o - base.o),
  };
}

// Relocate every rider whenever the base moves or turns. Callers pass the riders' stored local attachments.
function relocateRiders(base: Pose, riders: Array<{ id: number; attach: Attachment }>): Array<{ id: number; pose: Pose }> {
  return riders.map((r) => ({ id: r.id, pose: attachmentToWorld(base, r.attach) }));
}
```

## 5. Lands in

- TARGET `origins/client/attach-point.ts` (new, pure transform used by the hero actor's sockets and by any rider seat; client-side, so the engine never reads it). Parity-checklist row 6 (hero actor/animation). Row 15 (gear dressing) is the other possible fit; row 6 is chosen because the socket sits on the hero's rig.
- today: not read (the Frankendom repo was not part of this pass).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only, shape of the transform, no donor lines)
- Brief rule served: one engine (a socket is derived from the rig, not stored as a second copy of the pose); zones as data (seat or socket offsets are data, not constants in the function)

## 6. Gaps and risks

- The donor transform is yaw-only: no pitch, no roll, no bone. Its own comment says the absolute position "must depend on vehicle pitch angle" (`Vehicle.cpp` 553). A hero socket on a turning, lunging or staggering hero needs the full rig transform. Do not port the yaw-only formula as the socket model.
- The donor's special case for four seat ids (`Vehicle.cpp` 457-461) has no recorded reason (456). Do not copy it; if a Frankendom seat needs a facing rule, it should be data.
- Gameplay ownership: a rider's position on a moving base is a visual fact. If a seat ever changes hit location or reach, that part must be server state in the engine, not this client transform.
- Order of updates: the donor relocates riders inside the base's own move or turn call (`Map.cpp`, `Unit.cpp`). Frankendom should recompute sockets once per frame after the rig pose is final, not in the middle of a move, or a socket can use a stale parent pose.
- Licence: GPL-2.0. Clean-room only, as above.
- Not read: the install and entry path in `Vehicle.cpp` 296-410, the callers of the world-to-local inverse, and the `VehicleSeat.dbc` values. Any claim about those is not made here.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: one engine (socket derived from the rig); zones as data (seat and socket offsets are data)
