# scummvm-scummvm (camera, cell 14)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/engines/icb/camera.cpp` | Licence: GPL-3.0-or-later (file header: "version 3 of the License, or (at your option) any later version"; repo COPYING is GPLv3; additional copyright Revolution Software Ltd. 1999-2000, used with permission) | C++ (ScummVM engine, In Cold Blood "ICB") | symbol `_game_session::Camera_director`

Checked: `camera.cpp` read in full (598 lines), plus the driver: `mission.cpp` Game_cycle (376-391), `p4.cpp` Process_stub (89-124), `p4_pc.cpp` Mission_and_console and Fix_time (349-396), `p4.h` TARGET_TIME. Not read: `Initialise_set` (the actual set load), `Return_true_y` / `Fetch_floors_volume_height` (the vertical band test), `Return_non_rubber_floor_no`, the callers that set `camera_lock` (barriers.cpp 180, player.cpp 917 / 1940 / 2034 / 2052 / 3136), and the PSX or render paths. Confidence: high on the switching logic, none on rendering.

## 1. Mechanism

- This is a fixed-camera director (pre-rendered rooms), not a following camera: it picks WHICH of a set of authored cameras is live. The input is the followed actor's position and the floor rectangle it stands on; the output is `cur_camera_number` and a new set loaded when it changes.
- Data, built once from floor data (`Build_camera_table` 99-147): each floor rectangle carries a camera name; each distinct name gets one camera index (names deduplicated, 124-136); `floor_to_camera_index[floor]` maps a floor to its camera, or to a sentinel when the floor has no named camera (141). A script call can link two floors so each camera also shows the other's floor (`extra_floors`, 90-91, max 12 per camera, 84 in session.h).
- Followed actor: the player, or another character if `camera_follow_id_overide` is set (`Prepare_camera_floors` 391-414). The director reads its position and floor rect.
- Order of steps in `Camera_director` (224-389): (1) read follow target (235). (2) If a manual script camera or `camera_lock` is on, do nothing (238-239). (3) Walk-area (WA) override cameras, which are polygons that force a specific camera: if currently on one, first check its vertical band (255, details of `Return_true_y` not read); if an ENTRY pin is held and the actor is within the band radius, keep it (257-271; distance squared against 30 squared); otherwise release the pin (274) and, if still inside the WA bounding box and the polygon (even-odd crossing count via `Contains`, 277-292), keep it. If it left, try `Process_wa_list` (a hop straight into another WA, 296); if none, fall back to the floor camera: drop an EXIT pin at the current position (304-307), clear the current camera so a fresh pick happens (309) and clear the WA flag (310). (4) If an exit pin is held, re-entry into any WA is blocked until the actor changes height (319) or walks more than 30 away (328); only when no exit pin is held is `Process_wa_list` scanned for a new WA to enter (333-335). (5) Floor cameras: if the actor is on no floor rect, keep the current view (339-344). If the floor's camera differs from the current one, apply ELASTIC hysteresis: if a camera is set and the actor is at the anchor floor's height and still within that anchor floor's rectangle expanded by 30 on every side, do not switch (359-361). Otherwise switch: an unnamed camera drops the display into a temporary fallback mode (364-367); a named camera sets the index, records the new anchor floor (373-374), reloads the set via `Initialise_set` (382) and runs one logic cycle to fix up animations (385).
- Visibility: `Object_visible_to_camera` (149-183) says an actor is on screen if it is the followed player (always, because of the rubber band, 168-170), or its floor maps to the current camera (172), or its floor is in the current camera's extra-floor list (176-179); held items and hidden actors are never visible.
- Events: `UpdateOnOffCamera` (564-596) shifts each actor's view-state, tests visibility plus a projection check, and posts `EVENT_ON_CAMERA` when it just came on and `EVENT_OFF_CAMERA` when it just went off (588-594).
- Loop (rule c): fixed step, no accumulator. `Process_stub` resets a timer (p4.cpp 104-105), runs `Mission_and_console` (p4.cpp 116-118) which calls `Game_cycle` once (p4_pc.cpp 358). `Game_cycle` runs one logic cycle then the camera director (mission.cpp 376, 391). Then `Fix_time` busy-waits (1 ms sleeps) until `TARGET_TIME * 100 / cycle_speed` ms have passed since the timer reset (p4_pc.cpp 392-395; TARGET_TIME 70, p4.h 120; cycle_speed 100, p4.cpp 69), i.e. 70 ms per step (about 14 steps/s) by default. The code comment in p4_pc.cpp says "1/12 second - pc==80ms"; the constant is 70. A slow step just runs long: there is no catch-up.
- Callers: `Camera_director` is called from `Game_cycle` every step (mission.cpp 391) and once after a save load (1104). I did not trace every caller of the other functions.

## 2. Key functions

- `Camera_director`: `/mnt/frankendom-donors/scummvm-scummvm/engines/icb/camera.cpp` 224-389. The whole selection: lock, WA override with pins, floor camera with hysteresis.
- `Build_camera_table`: same file 99-147. Floors to deduplicated camera indices.
- `Process_wa_list`: same file 416-476. Scans override polygons, sets the entry pin on a hit (451).
- `Contains`: same file 195-222. Edge crossing helper for the even-odd polygon test.
- `Object_visible_to_camera`, `UpdateOnOffCamera`: same file 149-183 and 564-596.
- `Fix_time`: `/mnt/frankendom-donors/scummvm-scummvm/engines/icb/p4_pc.cpp` 389-396. The fixed-step wait that drives it.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Camera chosen per floor/zone rectangle from data, deduplicated by name | 64 camera names, 12 extra floors per camera (theirs, session.h 874 and 84) |
| Elastic hysteresis: do not cut until the actor leaves the old zone's rectangle plus a margin | RUBBER = 30 world units (theirs, camera.cpp 44) |
| Override polygons with an entry pin (held until the actor moves a radius away) and an exit pin (no re-entry until the actor moves a radius away or changes height) | Same 30 radius; pins compare squared distance (theirs, 270 and 328) |
| Even-odd polygon containment | none |
| Interest sets: a camera also shows a linked zone | 12 slots (theirs) |
| ON_CAMERA / OFF_CAMERA events from view-state change | none |
| Fixed-step driver with sleep-to-target, no catch-up | 70 ms step, speed scale 100 (theirs, p4.h 120 and p4.cpp 69) |

## 4. TypeScript sketch

simplified: clean-room, GPL-3.0-or-later donor. Written from the mechanism, not the lines. It omits: the vertical (height) band tests and the donor's requirement that the actor is at the anchor floor's height for the elastic stay, the exit pin also breaking on a height change (sketch breaks on distance only), the WA bounding-box pre-test, the direct hop from one override region into another when leaving (the sketch sets an exit pin first, so it will not hop), the manual-camera script call, the unnamed-camera fallback display mode (the sketch just keeps the current view), the extra-floor visibility list and the ON/OFF camera events, and the set load and animation fix-up on a switch.

```ts
// Licence: GPL-3.0-or-later (donor ScummVM). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vec { x: number; z: number }
interface Floor { x1: number; x2: number; z1: number; z2: number; camera: string | null }
interface Region { camera: string; polygon: Vec[] }     // override camera zone

const BAND = 30;                                        // elastic margin and pin radius (data in practice)

function inPolygon(p: Vec, poly: Vec[]): boolean {      // even-odd crossing test
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

class CameraDirector {
  current: string | null = null;
  private anchor: Floor | null = null;
  private region: Region | null = null;
  private entryPin: Vec | null = null;                 // held while we stay within BAND of where we entered a region
  private exitPin: Vec | null = null;                  // blocks re-entering a region until we walk BAND away
  locked = false;                                      // manual camera or lock: director does nothing

  constructor(private floors: Floor[], private regions: Region[]) {}

  // One call per fixed logic step. floorIdx is the floor under the followed actor (-1 = none).
  step(pos: Vec, floorIdx: number): string | null {
    if (this.locked) return this.current;
    const d2 = (p: Vec) => (pos.x - p.x) ** 2 + (pos.z - p.z) ** 2;

    if (this.region) {
      if (this.entryPin && d2(this.entryPin) < BAND * BAND) return this.current;   // still held by the band
      this.entryPin = null;
      if (inPolygon(pos, this.region.polygon)) return this.current;               // still inside the region
      this.region = null;                                                          // left it
      this.exitPin = { ...pos };
      this.current = null;                                                         // force a fresh pick below
    }
    if (this.exitPin && d2(this.exitPin) > BAND * BAND) this.exitPin = null;
    if (!this.exitPin) {
      const hit = this.regions.find(r => inPolygon(pos, r.polygon));
      if (hit) { this.region = hit; this.entryPin = { ...pos }; this.current = hit.camera; return this.current; }
    }

    if (floorIdx < 0) return this.current;              // not on any floor: keep the current view
    const f = this.floors[floorIdx];
    if (f.camera === this.current) return this.current;
    if (this.current !== null && this.anchor &&         // elastic: stay while near the floor we switched on
        pos.x >= this.anchor.x1 - BAND && pos.x <= this.anchor.x2 + BAND &&
        pos.z >= this.anchor.z1 - BAND && pos.z <= this.anchor.z2 + BAND) return this.current;
    if (f.camera === null) return this.current;         // donor falls back to a temporary mode here; sketch just keeps the view
    this.current = f.camera;
    this.anchor = f;
    return this.current;
  }
}
```

## 5. Lands in

- TARGET `src/fight/camera-director.ts` (new, client-only: pure function of position and zone data, no engine state): choose the fight-camera preset for a zone with hysteresis and override regions. Parity-checklist row 11 (fight camera).
- today: nothing equivalent confirmed (not searched in Frankendom).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (camera preset is a zone field); camera is client-only; rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only, shape only. The sketch is written from the described mechanism.
- Genre mismatch: ICB cuts between authored pre-rendered cameras as the player walks. A fast duel camera frames two or more fighters continuously; hard cuts would feel wrong mid-fight. What transfers is the hysteresis rule (no flicker at zone borders), pinned override regions (for example an arena or boss area forcing its own preset) and zone-to-preset as data, not the cut-based view.
- Client-only ruling: the director must never feed back into the engine. The donor's ON_CAMERA / OFF_CAMERA events do feed game scripts; in Frankendom they would have to stay client cosmetic (no gameplay hook), because the engine owns the fight.
- Camera presets, band size and pin radius must be zone data fields (not constants like RUBBER = 30), per the zones-as-data ruling.
- The donor's step is a busy wait with no catch-up and a 70 ms step; Frankendom's fight step and render loop are not that. Run the director from the render frame or fight tick and keep it free of wall-clock waits.
- With MAX_ATTACKERS = 3 there can be several actors to frame; the donor follows exactly one actor (player or an override target). Multi-target framing is not in this donor.
- Not read: `Initialise_set`, `Return_true_y`, and the `camera_lock` setters, so the vertical-band behaviour and the reasons for locking (ladders, barriers) are described only from comments (barriers.cpp 180 comment: "stop rough room cut through effect").
