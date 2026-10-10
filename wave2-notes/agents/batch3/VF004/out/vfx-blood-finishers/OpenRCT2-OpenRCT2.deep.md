# OpenRCT2-OpenRCT2 (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Particle.cpp` | Licence: GPL-3.0 (`licence.txt` is GNU GPL version 3, 29 June 2007; the file headers of Particle.cpp and Vehicle.Crash.cpp say "licensed under the GNU General Public License version 3") | C++ | symbol `VehicleCrashParticle::update`

Checked: Cell 13 = category_no in cells-VF004.tsv. Not a camera cell. This is a crash debris burst, not blood. Read in full: Particle.cpp 50-150 (setSpriteData, launch, create, update, serialise) and 256-281 (ExplosionCloud create/update); Particle.h 27-50; Vehicle.Crash.cpp 100-150, 380-585 (CrashOnLand from 380, CrashOnWater, UpdateCrash). Read in part: Vehicle.Crash.cpp 77-99 and 151-168 (not read), 358-379 (not read); Vehicle.cpp 760-815 (the crash state switch at 803-805). Not read: CrashSplashParticle (Particle.cpp 169-200), the entity loop that calls `update()`, the sprite drawing (`src/openrct2/paint/entity/Paint.VehicleCrashParticle.cpp`), the sound calls, the game tick rate. Blood check: grep for blood, gore, wound, decal, hitstop and finisher across `src/` (*.cpp, *.h) found no gore or wound code; the only hit is a comment on a scream sound (`src/openrct2/audio/Audio.h:121`). Confidence: high on the particle physics and the burst counts (read and receipted); medium on the crash order of events, because I read the callers only in part.

## 1. Mechanism

- Trigger: a vehicle hits something. Three paths emit the same kind of debris: a car-on-car collision (`UpdateCollisionSetup`, Vehicle.Crash.cpp 129-133), a land crash (`CrashOnLand`, 404-412) and a water crash (`CrashOnWater`, 474-481). Each path plays a sound, spawns one explosion cloud, and spawns debris chips.
- Counts: car-on-car gives 10 chips per car (131-133). Land gives `min(spriteData.width, 7)` chips (409-412), so the cap is 7. Water gives 5 splash particles (474-478), then 10 chips (480-481).
- Launch (Particle.cpp 59-68), once per chip, from the scenario RNG: sideways acceleration on x and y is a signed 16-bit random times 4 (64-65); upward acceleration is 0x10000 plus a random 0-0xFFFF times 4, so about 1 to 5 units per tick (66); lifetime is 140 plus a random 0-127 (62); sprite frame and one of 5 sprite types are random (61, 63); velocity starts at zero (67-69).
- Update, one step per chip (Particle.cpp 93-148). Order as the code runs:
  (a) `timeToLive--`; at zero the chip is removed and the step returns (96-99).
  (b) gravity: `accelerationZ -= 5041` (104).
  (c) air drag: each of the three accelerations loses `acc / 256` (107-109).
  (d) integrate: `vx = velocityX + accelerationX` (112); the new position is the old position plus `vx >> 16` (116); the low 16 bits of `vx` are kept as the carry for next tick (118).
  (e) water: if the chip was at or above the water surface and the new z is at or below it, play a splash, spawn one `CrashSplashParticle`, remove the chip and return (126-133).
  (f) land: if the chip was at or above the ground and the new z is at or below it, reverse the vertical acceleration (138) and snap z to the ground. The bounce keeps all of the speed. Only drag takes energy away.
  (g) advance the sprite frame by 85 (`kCrashedVehicleParticleFrameIncrement`, Particle.h:30) and wrap at 256 * 12 (Particle.cpp 143-147).
- Settled cars (`UpdateCrash`, 499-585): after a crash each car keeps rising `crash_z` by 1 per update up to 96 (508, 510). While it does, each update has a chance of 0x1555 out of 0xFFFF (about 8.3 percent) to spawn an explosion cloud offset by -1 or +1 on x and on y (511-516). Animation steps on a fixed increment (521) and cycles 8 frames (527).
- Explosion cloud (Particle.cpp 256-281): frame advances 128 per update; removed at 36 * 128, so 36 updates (276-277).
- The chips are game entities. They are created in the entity list (`createEntity`) and have a `serialise` method (Particle.cpp 150), so they are part of saved state. The RNG is `ScenarioRand`, so the burst is deterministic given the game state.

## 2. Key functions

- `VehicleCrashParticle::launch`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Particle.cpp` 59-70. Sets lifetime, sprite frame, the three accelerations, and zero velocity.
- `VehicleCrashParticle::create`: same file, 76-87. Creates the entity, copies the body colours, calls `launch`.
- `VehicleCrashParticle::update`: same file, 93-148. The whole chip step, in the order in section 1.
- `UpdateCollisionSetup`, car-on-car burst: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/ride/Vehicle.Crash.cpp` 77 (function start) and 129-133 (the 10-chip loop inside it).
- `CrashOnLand`, land burst: same file, 358 (start) and 404-412. Count is the sprite width capped at 7.
- `CrashOnWater`, water burst: same file, 426 (start) and 474-481. Five splashes, then 10 chips.
- `UpdateCrash`, settled-car puffs: same file, 499-585. Puff chance and cap at 508-516.
- `ExplosionCloud::create` / `update`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Particle.cpp` 256-281.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Burst of short-lived chips, each with a random launch vector | Sideways: signed 16-bit random times 4 (64-65). Up: 0x10000 plus random times 4 (66) |
| Count from the hit, capped | Cap 7 (409); 10 per car (131); 5 splashes plus 10 chips on water (474-481) |
| Lifetime with a random spread | 140 plus random 0-127 updates (62) |
| Gravity subtracted from vertical speed each update | 5041 per update (104) |
| Air drag as a fraction of current speed | 1/256 per update on each axis (107-109) |
| One bounce off ground, no extra damping | Vertical sign flip (138); no loss factor in the code |
| Water: splash, then remove | Splash on crossing the water height (126-133) |
| Settled debris puff, chance per update, stop at a height | Chance 0x1555 / 0xFFFF (511); stop at crash_z 96 (508) |
| Fixed-point carry of the fraction | Low 16 bits of velocity (118) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (lifetime, gravity, drag, integrate, water, then land bounce). It uses floats where the donor uses 16.16 fixed point, so it drops the velocity carry (118). It leaves out the sprite frame and colour, the scenario RNG (the caller injects `rand`), the explosion clouds, the settled-car puffs, the sound calls, the car-on-car and water call sites (the caller chooses the count), the entity save and the 16-bit wrap. The ground and water heights are supplied through an interface, not the tile lookup. `export {}` is appended only for the typecheck. Typecheck: `tsc --noEmit --strict --target es2020` passed on the VPS.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const FP = 65536;          // accelerations are in 1/65536 units per tick
const GRAVITY = 5041;      // subtracted from the vertical acceleration every tick
const DRAG = 256;          // each acceleration loses 1/256 of itself per tick, per axis
const BURST_CAP = 7;       // at most 7 chips per burst

interface Chip {
  x: number; y: number; z: number;     // world units
  ax: number; ay: number; az: number;  // per-tick displacement, in 1/65536 units
  ttl: number;                         // ticks left before the chip is removed
}

interface Ground {
  landZ(x: number, y: number): number;   // ground height under a point
  waterZ(x: number, y: number): number;  // water surface, 0 when there is none
  onWaterSplash(x: number, y: number, z: number): void;
}

// rand() returns an integer in [0, 65535].
function toInt16(v: number): number {
  return ((v & 0xffff) << 16) >> 16;
}

function launchChip(x: number, y: number, z: number, rand: () => number): Chip {
  return {
    x, y, z,
    ax: toInt16(rand()) * 4,                 // sideways, about -2..+2 units per tick
    ay: toInt16(rand()) * 4,
    az: (rand() & 0xffff) * 4 + 0x10000,     // upward kick, about 1..5 units per tick
    ttl: (rand() & 0x7f) + 140,              // 140..267 ticks
  };
}

// Burst size: the caller passes the hit's count; the cap keeps it bounded.
function emitBurst(count: number, x: number, y: number, z: number, rand: () => number): Chip[] {
  const n = Math.min(count, BURST_CAP);
  const out: Chip[] = [];
  for (let i = 0; i < n; i++) out.push(launchChip(x, y, z, rand));
  return out;
}

// One tick for one chip. Returns false when the chip is gone.
function tickChip(c: Chip, ground: Ground): boolean {
  c.ttl -= 1;
  if (c.ttl === 0) return false;

  c.az -= GRAVITY;
  c.ax -= Math.trunc(c.ax / DRAG);
  c.ay -= Math.trunc(c.ay / DRAG);
  c.az -= Math.trunc(c.az / DRAG);

  const nx = c.x + c.ax / FP;
  const ny = c.y + c.ay / FP;
  let nz = c.z + c.az / FP;

  const water = ground.waterZ(nx, ny);
  if (water !== 0 && c.z >= water && nz <= water) {
    ground.onWaterSplash(c.x, c.y, water);
    return false;
  }

  const land = ground.landZ(nx, ny);
  if (c.z >= land && nz <= land) {
    c.az = -c.az;      // bounce: reverse the vertical speed, no extra loss
    nz = land;
  }

  c.x = nx; c.y = ny; c.z = nz;
  return true;
}
```

## 5. Lands in

- TARGET `src/fight/impact-burst.ts` (new, proposed): a client-side render module. It takes the engine's hit event (a hit or a break, with its count) and spawns chips. Chips are never in fight state. Open point for Lead: the ruling says `src/fight` is the engine, so this module may belong on the Pit or client path instead. Not decided here.
- Parity-checklist row: 10 (hit impact/hitstop). Row 8 (blood/wounds/decals) is the nearest for gore, but this donor has no gore, so row 10 fits the chip burst. No row fits blood or wounds from this donor.
- today: the current Frankendom impact code was not read.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: client-only presentation. The engine emits one hit event and keeps no FX state; the Pit and zones are clients.

## 6. Gaps and risks

- No blood or wounds. The donor has no gore, wound, decal or blood code. Frankendom's row 8 gets nothing from this donor; this note covers impact debris only.
- Keep it out of state. The donor stores chips as game entities and saves them (Particle.cpp 150). Frankendom must keep them out of the fight state and the server snapshot, and feed them only from the hit event.
- Random source. The donor uses the scenario RNG (`ScenarioRand`), so the chips are part of deterministic game state. In Frankendom the chip RNG must be a client RNG that never feeds server decisions.
- Many-on-one stacking. The cap of 7 is per hit. With MAX_ATTACKERS = 3, several bursts can overlap in one exchange, so Frankendom needs a global live-chip cap. The donor code has no such global cap (not searched further).
- Bounce. The donor bounces with no damping, so the sand floor may look too springy. Frankendom should expose a bounce factor as data; the donor has no such value (it is the sign flip at 138).
- Ground test. The donor checks the ground and water height under the new position only; its update has no wall or object test (Particle.cpp 93-148). Frankendom needs a wall check or a short life near geometry.
- Timing. Lifetime and gravity are per update. The donor's update rate was not read, so Frankendom must convert these to its fixed step before use.
- Fixed point. The donor uses 16.16 fixed point with a velocity carry (118). A float port differs slightly and the sketch does not model the carry.
- Licence: GPL-3.0. Clean-room only. The sketch was written from the mechanism.
- Data, not constants. Burst count, lifetime, gravity, drag and bounce should be data fields per hit kind (weapon or armour) in the catalogue, not constants in the module. The donor takes its count from the vehicle sprite width.

Best transferable idea: A hit or break spawns a capped burst of short-lived chips with random launch vectors, gravity, air drag, one bounce off the ground and a splash on water, all as client-side sprites that never enter fight state.
Decision (proposed): adapt — the burst shape is useful for impact debris, but the donor keeps chips as saved game entities with a scenario RNG and has no global cap; Frankendom needs client-only chips fed by the server hit event, a client RNG and a global live-chip cap for many-on-one fights.
Acceptance: On a killing blow that breaks armour, a short spray of chips leaves the strike point, arcs, bounces once off the sand and fades after its lifetime; a server test asserts the burst count comes from the hit event and no chip appears in the fight state snapshot.
