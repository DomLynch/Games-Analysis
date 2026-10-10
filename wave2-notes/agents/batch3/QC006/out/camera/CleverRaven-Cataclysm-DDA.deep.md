# CleverRaven-Cataclysm-DDA (camera, cell 14)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/game.cpp` (function `game::calc_driving_offset`, lines 1363-1466) | Licence: Creative Commons Attribution-ShareAlike 3.0 Unported (`LICENSE.txt` header, read: "Cataclysm is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License"); clean-room, shape only | C++ | symbol `game::calc_driving_offset`

Checked: camera_scope: world camera (a look-ahead camera that leads the player's vehicle in the direction of travel; the lead idea transfers to a 3D third-person camera, the grid tile stepping does not). The hint was INFERRED, so I searched `view_offset`, `camera`, `center`, `edge_scroll` and `update_map` by grep. Read in full: `game.cpp` 1363-1466 (`calc_driving_offset` and `set_driving_view_offset`), `ranged.cpp` 4004 (view centre), `do_turn.cpp` 700-716 (per-turn call), `map.cpp` 1228-1244 (per-move call), `vehicle_move.cpp` 1186-1190 and 1792-1798 (move and face vectors), `cata_utility.h` 245-256 (`inverse_lerp`), `vehicle.h` 88 (400 per tile), `options.cpp` 2140-2143 (option). Other camera code read by grep and not used as the mechanism: `ranged.cpp` 3204-3260 and 3700-3716 (target view shift, snap to target), `ranged.cpp` 3660-3669 (`toggle_snap_to_target`), `game.cpp` 2480-2530 (mouse edge scroll), `cata_tiles.cpp` 1600-1615, `veh_utils.cpp` 455-470. Not read: `vehicle::player_in_control`, `vehicle::skidding`, `cruise_velocity` set-up, `Character::sight_range`. Confidence: high on the order of operations and the numbers; medium on the low-speed sign behaviour (derived by hand from the code, not run). The comment at `game.cpp:1448-1449` says the step is "per draw event"; the calls are per game turn (`do_turn.cpp:713`) and per vehicle move (`map.cpp:1241`), so the code steps once per call, not per frame.
Best transferable idea: Lead the camera along the travel direction by an amount that scales with speed between a dead zone and full speed, clamp it to a safe margin, glide toward it at a fixed rate and snap when close.
Decision (proposed): adapt - take the speed-scaled, margin-clamped look-ahead and the glide-then-snap; do not copy the integer tile steps, the one-step-per-turn timing or the corner squeeze as they are; a lead of zero in the Pit camera and in a fixed fight.
Acceptance: While the hero runs at full speed the world camera leads along the travel direction by up to a data lead (default about a third of the frame), and while stopped it sits centred on the hero; the lead never pushes the hero outside the safe margin; a client test asserts lead = 0 at speed <= min, lead = max at speed >= max, monotone between, and that the glide reaches the target within the snap distance.

## 1. Mechanism

- Trigger: the function runs once per game turn while the view offset is non-zero (`do_turn.cpp:712-714`) and once per move of a vehicle the player is controlling (`map.cpp:1239-1241`). It is not a per-frame loop.
- Order inside `calc_driving_offset`:
  1. Off: if the option is off or there is no vehicle, set the offset to zero (`1368`). The option is on by default (`options.cpp:2140-2142`).
  2. Margins: `border_range = 2`, and the maximum offset is half the window minus the border and one (`1377-1378`).
  3. Speed thresholds: zero lead at or below 1 tile of speed (`min_offset_vel = 1 x 400`, `1382`, `vehicle.h:88`); full lead at the smaller of the two maximum offsets times 400 (`1384-1385`).
  4. Direction and speed: velocity is the vehicle's velocity and the direction is its move vector (`1386-1387`). If the vehicle is not skidding, the player is in control, and cruise speed is within 7 tiles of the actual speed, use the facing vector and the cruise speed instead (`1388-1395`). The comment says this stops the offset from changing too often.
  5. Relative lead: `rel = inverse_lerp(min, max, velocity)` (`1397`). The inverse lerp is not clamped (`cata_utility.h:254`).
  6. Corner squeeze: the larger axis of the direction becomes plus or minus 1 and the other axis is scaled by it, when that axis is over 0.2 (`1401-1407`). This makes the lead reach the corner of the window.
  7. Scale: multiply by `rel` and then by the maximum offset on each axis (`1408-1411`).
  8. Sight clamp: `maxoff` is half the difference between twice the sight range plus one and the window size; the offset is clamped to it on each axis, and zeroed on an axis where the window is already big enough (`1425-1437`).
  9. Glide: the difference from the current offset is computed (`1444`). If an axis is more than 1 tile away, the offset moves one tile toward the target on that axis; otherwise it snaps to the target (`1448-1453`).
  10. Apply: `set_driving_view_offset` removes the old offset from the player's view offset, stores the new one and adds it back (`1455`, `1458-1466`).
- The view offset is added to the player's position: the targeting code uses `pos_bub() + view_offset` as the view centre (`ranged.cpp:4004`), and the terrain cursor is placed at the window centre minus the view offset (`game.cpp:3402`). So the camera focus is the hero plus the lead, and the lead is a whole-tile integer.

## 2. Key functions

- `game::calc_driving_offset`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/game.cpp` 1363-1456. The whole mechanism.
- `game::set_driving_view_offset`: same file, 1458-1466. Keeps the view offset consistent when the driving offset changes.
- `inverse_lerp`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/cata_utility.h` 249-256. Unclamped, returns 0 when min equals max.
- `vehicle::move_vec` and `vehicle::face_vec`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/vehicle_move.cpp` 1792-1798 (`angle_to_vec` of `move.dir()` and `face.dir()`). The comment at `1186-1187` says `move.dir` is the facing direction and that velocity can be negative.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Zero lead below a dead-zone speed, full lead at a top speed | Dead zone 1 tile of speed = 400 units; top speed = smaller maximum offset x 400 (theirs, `game.cpp:1382-1385`, `vehicle.h:88`). Tile = 400 vehicle speed units. |
| Lead scales with `rel` and is capped by the window | Border 2 tiles and minus 1 (theirs, `game.cpp:1377-1378`). |
| Corner squeeze: largest axis becomes plus or minus 1 when over 0.2 | Threshold 0.2 (theirs, `game.cpp:1401`). |
| Glide one unit per step, snap when within one unit | One tile per call (theirs, `game.cpp:1448-1453`); per turn or per vehicle move (`do_turn.cpp:713`, `map.cpp:1241`). |
| Clamp the lead to what the player can see | Sight-range term `(sight x 2 + 1 - window) / 2` (theirs, `game.cpp:1425`). |
| Cruise speed replaces measured speed when close | Within 7 tiles of speed, that is 7 x 400 units (theirs, `game.cpp:1388-1389`). |

## 4. TypeScript sketch

simplified: the sketch works on the ground plane (x, z) only; the cruise-control branch (facing vector and cruise speed) and the skid and player-in-control gate are omitted; the sight-range clamp is replaced by a supplied `maxLead`; the integer tile steps are replaced by a time-based glide with a snap distance; the donor's unclamped inverse lerp is clamped to 0 to 1 here (the donor can go negative below the dead zone, see section 6); the donor's corner squeeze is kept as written; speed is signed in the sketch, but the lead follows the velocity vector (the donor follows the facing vector with a signed speed, which gives the same travel direction when reversing).

```ts
// Licence: CC-BY-SA-3.0 (donor, LICENSE.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface LookAhead { lx: number; lz: number; }   // current look-ahead offset on the ground plane (units)
interface LeadParams {
  minSpeed: number;  // speed at or below which there is no lead (donor: one tile of vehicle speed)
  maxSpeed: number;  // speed at or above which the lead is full (donor: smallest max offset x tile speed)
  maxLead: number;   // full lead per axis, units (data; donor derives it from the window half-size minus a border)
  rate: number;      // glide speed toward the wanted lead, units per second (donor: one tile per call)
  snap: number;      // snap distance, units (donor: one tile)
}
interface Hero { x: number; z: number; vx: number; vz: number; speed: number; } // speed is signed: negative when reversing

// Returns the camera focus on the ground plane: the hero plus a look-ahead along the travel direction.
function stepLookAhead(st: LookAhead, h: Hero, dt: number, p: LeadParams): { x: number; z: number } {
  // travel direction, then the donor's corner squeeze: the larger component becomes +-1
  let dx = h.vx, dz = h.vz;
  if (Math.abs(dx) > Math.abs(dz) && Math.abs(dx) > 0.2) { dz /= Math.abs(dx); dx = Math.sign(dx); }
  else if (Math.abs(dz) > 0.2) { dx /= Math.abs(dz); dz = Math.sign(dz); }

  // speed factor, clamped to 0..1 here (the donor's inverse lerp is unclamped; see section 6)
  const rel = Math.min(1, Math.max(0, (Math.abs(h.speed) - p.minSpeed) / (p.maxSpeed - p.minSpeed)));
  const wantX = dx * rel * p.maxLead;
  const wantZ = dz * rel * p.maxLead;

  // glide toward the wanted lead; snap when close, as the donor does
  const ex = wantX - st.lx, ez = wantZ - st.lz;
  const dist = Math.hypot(ex, ez);
  if (dist <= p.snap) {
    st.lx = wantX; st.lz = wantZ;
  } else {
    const s = Math.min(1, (p.rate * dt) / dist);
    st.lx += ex * s; st.lz += ez * s;
  }
  return { x: h.x + st.lx, z: h.z + st.lz };
}
```

## 5. Lands in

- TARGET `origins/client/world-camera.ts` (client-only camera module). Parity-checklist row 11 (fight camera). A lead of zero is used in the Pit camera and in a fixed fight.
- Reuse tag: rewrite-from-idea (CC-BY-SA-3.0; clean-room, shape only)
- Brief rule served: camera is client-only and tunable (the engine never reads it); the world camera is the owner's priority (2026-10-10). Pit camera unchanged.

## 6. Gaps and risks

- The donor is a 2D grid roguelike and steps in whole tiles, once per turn or per vehicle move. A third-person camera needs a time-based glide. Do not copy the integer stepping.
- The inverse lerp is unclamped (`cata_utility.h:254`). Below the dead zone the factor is negative (`game.cpp:1397`), so, derived by hand and not run, a nearly stopped car gets a small backward shift of its view (face vector times a negative factor, `1394-1410`). Frankendom must clamp; the sketch does.
- The donor's comment at `game.cpp:1448-1449` says "per draw event" but the call sites are per turn and per move. Do not trust the comment for timing; the sketch uses dt.
- The lead needs a travel vector. A hero on foot in a duel may be stationary while fighting; the lead should drop to zero during a fight (fight camera rule) and act only in open zones.
- The cruise branch (`game.cpp:1388-1395`) uses the commanded speed when it is close to the real speed, so the lead does not jitter. Frankendom's analogue is the hero's input intent; this is worth testing, not assuming.
- The corner squeeze fills a window corner on a grid. In 3D a unit vector is the right choice; the sketch keeps the squeeze only to match the donor.
- The donor's other camera code (`ranged.cpp` target snap and edge scroll, `game.cpp:2480-2530`) is a targeting and mouse feature. It does not frame several enemies and does not transfer to a third-person follow camera.
- Camera values are client-only: `maxLead`, the dead zone, the top speed, the glide rate and the snap distance are data with defaults. The server never reads them.

Reuse tag: rewrite-from-idea (CC-BY-SA-3.0; clean-room, shape only)
Brief rule served: camera is client-only (owner ruling 2026-10-10)
