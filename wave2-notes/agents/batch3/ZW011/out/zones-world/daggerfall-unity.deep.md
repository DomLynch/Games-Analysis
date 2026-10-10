# daggerfall-unity (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Utility/PopulationManager.cs` | Licence: MIT (`/mnt/frankendom-donors/daggerfall-unity/LICENSE`: "MIT License", "Copyright (c) 2009-2023 Daggerfall Workshop"; file header line 4 "MIT License (http://www.opensource.org/licenses/mit-license.php)") | C# | symbol `PopulationManager`

Checked: Class `PopulationManager` read in full (359 lines): fields 31-38, Update 102-125, SpawnAvailableMobile 134-167, UpdateMobiles 172 onward, GetNextFreePoolItem and CreateNewPoolItem (around 254-298), AllowMobileActivationChange 301-320. Callers and attach sites: `StreamingWorld.cs` 762-786 (attach site read, the zone type gate); `PlayerEntity.cs` 642-656 and 766-778 read (second reader of the pool; `SpawnCityGuards` at 621 not read in full); `CityNavigation.GetRandomSpawnPosition` 512-535 read, its only caller here is `PopulationManager` 151 (checked by grep). `MobilePersonMotor.cs`: SeekingTile 303-364, SetTargetPosition 424-444, MovingForward 366-383 and the Update dispatch 182-258 read. Not read: the streaming and terrain loading in `StreamingWorld.cs` beyond the attach site, `MobilePersonNPC.RandomiseNPC`, the billboard and NPC prefab code. camera_scope: not a camera cell (the view gate uses the player's forward vector as a visibility rule only). Confidence: high on the order of steps and all numbers in `PopulationManager`; medium on the night churn in section 3 (read from the order of the code, not run).

Best transferable idea: a zone-sized population pool that adds at most one creature per tick, shows each one only when it is out of the player's front view, and removes it by distance or a stuck count, with the cap set per zone.
Decision (proposed): adapt - the cap-from-size rule, the one-spawn-per-tick limit and the pending-until-unseen gate fit row 23, but the donor is client-only and has no grace timer or empty-zone despawn, so Frankendom keeps the shape and makes the server own spawn and despawn.
Acceptance: server test: with a zone cap of 24, live count never exceeds 24 over 1000 ticks, at most one spawn per tick, and a creature is removed only after its grace timer runs with no player within the despawn range; client check: no creature pops in or out inside the front 180-degree view within 120 units.

## 1. Mechanism

- One manager per town-type location keeps a pool of wandering NPCs around the player. It is a client-side Unity object, not a server entity.
- Cap (zone size, read once in Start, 97-99): `total = BlockWidth x BlockHeight`; `groups = clamp(total / 16, 1, 4)` (integer division); `maxPopulation = groups x 24`. So a location gets 24, 48, 72 or 96 pool slots.
- Tick: Update adds frame time to `updateTimer` (105); when it reaches 0.1 s the logic runs once and the timer is set to 0 (107-110), so the frame overshoot is dropped and the real rate is at most 10 per second. It runs spawn first, then the mobile update (123-124).
- Spawn (134-167), at most ONE mobile per tick: (a) nothing if the player is outside the location rect plus 2500 world units (137); (b) take the first inactive pool slot, or add a new slot if the pool is below the cap (GetNextFreePoolItem, around 254-268; line 262 is the cap check); (c) pick a random nav-grid cell within 96 cells of the player's nearest nav cell, up to 11 candidates (CityNavigation 512-535; radius 96 is passed at 151); (d) on success set the slot active and scheduled-to-enable (163). The NPC object stays inactive, so nothing is shown yet.
- Enable (UpdateMobiles, 187-197): a scheduled mobile is shown only when ALL of: the view gate allows it (189), it is day (178, 190), and no racial override suppresses spawns (191). Showing re-randomises the NPC's look for the climate's race, starts its motor, and fires an event.
- Recycle (216-224): a mobile is marked for recycling when its motor failed to pick a tile 5 times in a row (SeekCount > 4), or it is more than 150 world units from the player (217), or it is night (218). It is actually hidden only when the view gate also allows it (224).
- View gate (AllowMobileActivationChange, 301-320): allowed when the mobile is beyond 120 world units (306), or when the angle between the player's forward vector and the mobile is more than half of 180 degrees, i.e. outside the front half (303, 312). Otherwise the change waits. So pop-in and pop-out happen out of the player's front view, or far away.
- Motor (MobilePersonMotor): in SeekingTile, `seekCount` goes up on each call (306); it is cleared when a target tile is accepted (SetTargetPosition, 443). A blocked search returns without a target (330-331), so seekCount keeps rising. The motor arrives at a tile when within 0.1 (376) and then searches again. Next-tile choice is weighted (road-like surfaces preferred, 340), with a random direction change chance (322-323).
- Time order to remember: spawn is NOT gated by day. Enable and recycle are. So at night a spawned mobile is marked for recycle in the same tick and is removed as soon as the view gate allows (read from the code order; not run).

## 2. Key functions

- `PopulationManager.Update`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Utility/PopulationManager.cs` 102-125. Ten-per-second timer, range check, then spawn and update.
- `PopulationManager.SpawnAvailableMobile`: same file, 134-167. One spawn per call; nav-grid random placement at radius 96 (151).
- `PopulationManager.UpdateMobiles`: same file, 172 onward. Enable gate (187-197), recycle marking (216-218), recycle (224 onward), billboard shown only after one tile move (`MoveCount`).
- `PopulationManager.AllowMobileActivationChange`: same file, 301-320. The view gate.
- `CityNavigation.GetRandomSpawnPosition`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Utility/CityNavigation.cs` 512-535. Random candidates in a square of radius `radius`; accepts the first with nav weight above 0 (524); gives up after 11 tries (default maxAttempts 10).
- `MobilePersonMotor.SeekingTile`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/MobilePersonMotor.cs` 303-364 (the seek counter and the return without target at 330-331).
- Attach site (zone data gate): `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Terrain/StreamingWorld.cs` 771-780. Only town, village, hamlet, farm, wealthy home, temple and tavern location types get a PopulationManager.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cap from zone size: `clamp(size/16, 1, 4) x per-group count` | Per group 24 (theirs, PopulationManager.cs 35); group clamp 1 to 4 (theirs, 98) |
| Tick at 10 per second from accumulated frame time, timer reset to 0 (overshoot dropped) | 10 per second (theirs, 31) |
| At most one spawn per tick; reuse a free slot before growing the pool | One per tick (theirs, 123-124 and the single call in 134-167) |
| Random placement in a square around the player's nearest grid cell, bounded retries | Radius 96 grid cells (theirs, 36; passed at 151); 11 candidates (CityNavigation 512, maxAttempts 10 default) |
| Spawn is shown only when out of view or far | Far 120 world units (theirs, 38; used at 306); front half from a 180-degree view (theirs, 303; test at 312) |
| Despawn when far from player | 150 world units (theirs, 37; used at 217) |
| Despawn when the mover is stuck | Recycle when seek count is above 4, i.e. five SeekingTile calls in a row with no accepted tile (theirs, 216; count reset at 443) |
| Coverage window outside the zone | 2500 world units beyond the location rect (theirs, 34; range check at 114-117) |
| Night is not a spawn gate but is a show and recycle gate | Day from WorldTime (theirs, 178) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's tick order (spawn at most one, then per mobile: show, mark, recycle) and its gates (cap, view, day, suppress, distance, stuck count). It omits: the nav-grid placement (the caller's `findSpawn` returns a placement or null), the location-rect range check (the caller passes `inZoneRange`), the NPC appearance and motor start, the billboard, the events, and the MoveCount render gate. Distance and angle are plain fields that the caller refreshes each tick (the donor reads the motor position). The timer keeps the donor's reset-to-zero, so the overshoot is dropped; Frankendom should use a remainder carry instead. The sketch does not refresh `seekCount` (the donor resets it when a target is accepted).

```ts
// Licence: MIT (donor, Daggerfall Unity). Clean sketch of the mechanism (shape only), not a line-by-line translation.
interface ZoneSpawn {
  blockCount: number;        // zone width x height, in 16-block units (zone data)
  perSixteenBlocks: number;  // donor: 24 (zone data)
  minGroups: number;         // donor: 1
  maxGroups: number;         // donor: 4
}

const TICK_S = 0.1;          // donor: 10 logic ticks per second (engine constant)
const RECYCLE_DIST = 150;    // donor: world units (engine constant)
const VISIBLE_POP_RANGE = 120; // donor: world units (engine constant)
const HALF_VIEW_DEG = 90;    // donor: 180 field of view, half of it (engine constant)
const MAX_SEEK = 4;          // donor: recycle when seekCount > 4 (engine constant)

interface Mobile {
  active: boolean;
  scheduleEnable: boolean;
  scheduleRecycle: boolean;
  dist: number;              // refreshed by the caller each tick (donor reads the motor position)
  angleDeg: number;          // angle from the player's forward to the mobile
  seekCount: number;
}

interface WorldInput {
  isDay: boolean;
  suppressed: boolean;       // racial override, donor's SuppressPopulationSpawns
  inZoneRange: boolean;      // player within the zone's rect plus margin
  findSpawn: () => { dist: number; angleDeg: number } | null;
}

function blankMobile(): Mobile {
  return { active: false, scheduleEnable: false, scheduleRecycle: false, dist: 0, angleDeg: 0, seekCount: 0 };
}

function maxPopulation(z: ZoneSpawn): number {
  const groups = Math.min(z.maxGroups, Math.max(z.minGroups, Math.floor(z.blockCount / 16)));
  return groups * z.perSixteenBlocks;
}

// A mobile may change visibility only when it is beyond the pop range or outside the player's front half.
function allowChange(m: Mobile): boolean {
  return m.dist > VISIBLE_POP_RANGE || m.angleDeg > HALF_VIEW_DEG;
}

export class ZonePopulation {
  readonly cap: number;
  private pool: Mobile[] = [];
  private timer = 0;

  constructor(zone: ZoneSpawn) {
    this.cap = maxPopulation(zone);
  }

  // Runs once per TICK_S of accumulated frame time. The timer is reset to 0, so overshoot is dropped (as in the donor).
  update(dt: number, world: WorldInput): void {
    this.timer += dt;
    if (this.timer < TICK_S) return;
    this.timer = 0;

    // 1. Spawn at most one mobile per tick: reuse a free slot, or grow the pool below the cap.
    if (world.inZoneRange) {
      let slot = this.pool.findIndex(m => !m.active);
      if (slot === -1 && this.pool.length < this.cap) {
        this.pool.push(blankMobile());
        slot = this.pool.length - 1;
      }
      const at = slot === -1 ? null : world.findSpawn();
      if (slot !== -1 && at) {
        this.pool[slot] = { active: true, scheduleEnable: true, scheduleRecycle: false,
                            dist: at.dist, angleDeg: at.angleDeg, seekCount: 0 };
      }
    }

    // 2. Per mobile: show pending ones (day only, unseen), mark for recycle, recycle when unseen.
    for (const m of this.pool) {
      if (m.active && m.scheduleEnable && allowChange(m) && world.isDay && !world.suppressed) {
        m.scheduleEnable = false;
      }
      if (m.seekCount > MAX_SEEK || m.dist > RECYCLE_DIST || !world.isDay) {
        m.scheduleRecycle = true;
      }
      if (m.active && m.scheduleRecycle && allowChange(m)) {
        m.active = false;
        m.scheduleEnable = false;
        m.scheduleRecycle = false;
      }
    }
  }

  liveCount(): number {
    return this.pool.filter(m => m.active).length;
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: cap, spawn, despawn, server-owned). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The view gate is not a server rule; it belongs to the client's pop-in presentation only.
- today: not read (no Frankendom repo was read in this pass).
- Reuse tag: adapt-allowed (MIT, Daggerfall Workshop; keep the MIT notice if any code is copied; the sketch is written from the mechanism)
- Brief rule served: zones as data (cap, coverage and respawn numbers per zone); one engine (population logic on the server, not in the client); the client shows, the server decides.

## 6. Gaps and risks

- The donor's pool is a client-side Unity object. Frankendom must make population server entities; the client only shows them. Nothing here is server-verified, and the donor has no kills, loot or ledger link.
- Despawn in the donor is immediate (distance 150 or night) with no grace timer and no rule about an empty zone. Row 23 needs despawn on empty with a grace timer, so the donor's rule is only the shape; add the grace timer as a zone field.
- The view gate uses the player's forward vector and is a client visibility rule. If the server used it for spawn or despawn, two clients would disagree. Keep it out of the server.
- Night churn (spawn not day-gated; enable and recycle are) is read from the code order, not run. If adopted, spawn should also be gated by the zone's own schedule, not the clock.
- Randomness: the spawn and motor paths use Unity's random and System.Random without a seed (not seeded in the code read). Frankendom needs a seeded server RNG so the fight record and replay (row 19) stay reproducible.
- The overshoot-dropping timer is not exact. Use a fixed step on the server with a carried remainder, as the server tick requires (row 18 / post-K item 3 sub-line: "server tick: fixed step, input intake, per-tick NPC budget").
- The cap bounds pool slots, which bounds live mobiles. In Frankendom the cap is per zone (zone data), not per 16 blocks of this Unity layout; the size formula is only a default.
- MAX_ATTACKERS = 3 is about the fight engine's attackers on one target and does not apply to this population cap. Do not merge the two numbers.
- `PlayerEntity.SpawnCityGuards` (621) also reads this pool. Its rules were not read, so the guard response is not described here.
