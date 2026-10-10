# OpenGothic (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/OpenGothic/common/world/worldobjects.cpp` | Licence: MIT (`/mnt/frankendom-donors/OpenGothic/LICENSE`: "MIT License", "Copyright (c) 2019 Try") | C++ | symbol `WorldObjects::tick`

Checked: Opened `worldobjects.cpp` (tick 152-265, tickNear 379-388), `objects/npc.cpp` (setProcessPolicy 535-541, performOutput 425-431, updateNearestEnemy 2161-2163, updateNearestBody 2187-2189, state-loop tail 3001-3060, AI output case about 2736-2750, perceptionProcess 4163-4230), `collisionzone.cpp` (all 173 lines), `triggers/abstracttrigger.cpp` (1-200), `triggers/zonetrigger.cpp` (all), `world.cpp` (1-120, 375-383, 558-560), `game/gamesession.cpp` (tick 305-355, setWorld/clearWorld 234-249, changeWorld 251-253, implChangeWorld 361-412), `spaceindex.cpp` and `.h` (all). Not read: the body of `Npc::tick` past about line 2360 (so I do not know what far-tier NPCs still do for movement or animation), `Gothic::startLoad`, `worldview.cpp`, the script setters of `perceptionTime`, the damage path. Grep for respawn/despawn over `common` and `game` found nothing. Grep for stream/cull/chunk/unload in `worldview.cpp`, `worldobjects.cpp` and `spaceindex.cpp` found nothing. Callers: I saw one caller of `WorldObjects::tick` (`World::tick`, world.cpp 379); I did not grep all callers. Confidence: high on the tier split and its gates; medium on the zone-transition chain (the load-screen callback was not read). This is a zones-world cell: no camera scope applies.

## 1. Mechanism

Main mechanism (the one this note sketches): NPCs in a loaded zone are split into three processing tiers by squared distance to the player, and only the near tier gets perception and speech.

Order of steps, per world tick (`World::tick` 375-383 calls `wobj.tick(dt,dt)` at 379; `GameSession::tick` calls `wrld->tick(dt)` at 320):
- (a) Every NPC in `npcArr` is visited each tick (loop 175-180, `auto& npc = *npcArr[i];` at 176). The tier split does not skip this loop. Only the player is handled differently (dtPlayer), and the player is skipped in free-camera mode.
- (b) `npcNear` is cleared (221). For each NPC the squared distance to the player position is taken (229). Under 3000*3000 (223) the NPC goes into `npcNear` and is set to `AiNormal` (231-233, the player is excluded from the set call). Under 6000*6000 (224) it is set to `AiFar` (236). Otherwise `AiFar2` (238). The split runs every tick. There is no margin, hysteresis or timer on the switch.
- (c) Zone volumes are checked only for NPCs in `npcNear` (`tickNear` 379-388, loop at 380).
- (d) Perception runs over `npcNear` only (loop at 249). It skips the player and dead NPCs (251). It calls `perceptionProcess` when the NPC's perception time is due (254-256). Passive perception runs only for `AiNormal` NPCs (259).
- (e) Gates inside `Npc`: `perceptionProcess` returns early when the policy is not `AiNormal`, and re-arms its timer to now plus the interval (4198-4199). The nearest-enemy and nearest-body searches return nothing unless `AiNormal` (2162, 2188). `performOutput` returns true without speaking for `AiFar` and beyond (429-430), so the caller treats the line as performed.
- (f) AI state loop, outer tier: `fastPath` is true when the policy is `AiFar2` and the NPC has no routines (3028). When the loop is due (3030), the loop script is skipped (`LOOP_CONTINUE`, 3034-3035) if a free point is within 300 units (3033). The other branch invokes the loop script as normal.

Also read, not sketched (zone boundaries and transitions, for the Lead's table):
- Boundary volume: `CollisionZone` is an axis-aligned box. Overlap is `|dp| < size + npcHalfSize` on each axis (115-117). Entering fires the callback once, because the NPC is pushed to the intersect list (137-141). Leaving is lazy: `tick` drops NPCs that are no longer inside (147-156), and there is no exit callback. The trigger volume is built from the vob bounding box (`abstracttrigger.cpp` 15-21). Only near NPCs are tested (see c above).
- Trigger gating: fire delay and retrigger delay are read from data in seconds and converted to ms (`abstracttrigger.cpp` 36-37). A retrigger cooldown applies (78), and so does a max activation count (104).
- Zone transition: `ZoneTrigger::onIntersect` fires for the player only (`zonetrigger.cpp` 15-16). The world forwards to `GameSession::changeWorld` (world.cpp 559), which stores a pending name and waypoint (gamesession.cpp 252). `GameSession::tick` sees the pending change (330), checks the file exists (345) and starts a load screen (348). In `implChangeWorld` the hero is saved first (374-375), then the leaving world is kept in the visited list (245), the new world is built (390), saved state is restored only if the world was visited (393-396), and the hero is placed at the waypoint (401).
- Zone load: the world is loaded in one go (world.cpp 78). The BVH and the view are built on worker threads (84, 88). I found no streaming or unloading by distance.
- Spatial index: an implicit median-split tree over interactives and items (`worldobjects.h` 165-166). It is rebuilt when empty (`spaceindex.cpp` 45), and each level is sorted on one axis (95). The query radius is padded by 675 units (105).

## 2. Key functions

- `WorldObjects::tick`: `/mnt/frankendom-donors/OpenGothic/common/world/worldobjects.cpp` 152-265. Tier split 221-244. Perception loop 249-265.
- `WorldObjects::tickNear`: `/mnt/frankendom-donors/OpenGothic/common/world/worldobjects.cpp` 379-388. Zone checks for `npcNear` only.
- `Npc::perceptionProcess`: `/mnt/frankendom-donors/OpenGothic/common/world/objects/npc.cpp` 4188-4230. Tier gate 4198-4199.
- `Npc::performOutput`: `/mnt/frankendom-donors/OpenGothic/common/world/objects/npc.cpp` 425-431. Far tiers drop speech (429-430).
- AI state-loop tail, fast path: `/mnt/frankendom-donors/OpenGothic/common/world/objects/npc.cpp` 3028-3035.
- `CollisionZone::checkPos` / `onIntersect` / `tick`: `/mnt/frankendom-donors/OpenGothic/common/world/collisionzone.cpp` 113-156.
- `GameSession::tick` (pending zone change) and `implChangeWorld`: `/mnt/frankendom-donors/OpenGothic/common/game/gamesession.cpp` 330-352 and 361-412.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Squared-distance tier split (no square root per NPC) | Near radius 3000 and far radius 6000, compared as squares (worldobjects.cpp 223-224, theirs). The donor does not name the unit. |
| Outer tier takes the fast AI path with no routines | 300 units to the free point (npc.cpp 3033, theirs) |
| Perception timer re-armed at least 1 tick | `max(perceptionTime, 1)` (npc.cpp 4168, theirs). The `perceptionTime` value comes from script; the setter callers were not read. |
| Far tiers drop speech | Threshold is the `AiFar` tier itself (npc.cpp 429-430) |
| Zone box overlap | Half-size of zone plus half-size of NPC box (collisionzone.cpp 115-117) |
| Trigger timing | Delays in seconds times 1000 (abstracttrigger.cpp 36-37) |

## 4. TypeScript sketch

simplified: keeps the tier split (squared-distance compare, near/mid/far), the near-only perception pass and the timer re-arm (minimum 1 tick). Omits: the per-NPC `npc.tick` loop that every tier runs, the player's own `dtPlayer`, the AiFar2 fast path (300-unit loop skip), the speech drop for far tiers, the nearest-enemy and nearest-body searches, the zone volume checks, and the passive-perception pass. Reorders: the donor puts the player into `npcNear` inside its normal loop, while the sketch appends the player after the loop.

```ts
// Licence: MIT (donor, OpenGothic). Clean-room sketch of the mechanism as described in the note; not a translation.
type Tier = "near" | "mid" | "far";

interface TierZone {
  nearRadius: number; // zone data, world units
  farRadius: number;  // zone data, world units
}

interface Actor {
  id: number;
  x: number; y: number; z: number;
  tier: Tier;
  nextPercTick: number;
  isPlayer: boolean;
  isDead: boolean;
}

// Squared-distance comparisons, as in the donor (no sqrt per actor).
function tierFor(distSq: number, zone: TierZone): Tier {
  const nearSq = zone.nearRadius * zone.nearRadius;
  const farSq = zone.farRadius * zone.farRadius;
  if (distSq < nearSq) return "near";
  if (distSq < farSq) return "mid";
  return "far";
}

// Runs once per tick before perception. Every actor is still updated elsewhere; this only sets the tier and returns the near list.
function assignTiers(actors: Actor[], player: Actor, zone: TierZone): Actor[] {
  const near: Actor[] = [];
  for (const a of actors) {
    if (a === player) continue; // the donor leaves the player on its own policy
    const dx = a.x - player.x;
    const dy = a.y - player.y;
    const dz = a.z - player.z;
    a.tier = tierFor(dx * dx + dy * dy + dz * dz, zone);
    if (a.tier === "near") near.push(a);
  }
  near.push(player);
  return near;
}

// Perception only for the near list. A due actor scans, then its timer is re-armed (minimum 1 tick).
function perceptionPass(
  near: Actor[],
  nowTick: number,
  intervalTicks: number,
  scan: (a: Actor) => void,
): void {
  for (const a of near) {
    if (a.isPlayer || a.isDead) continue;
    if (a.nextPercTick > nowTick) continue;
    scan(a);
    a.nextPercTick = nowTick + Math.max(intervalTicks, 1);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/zw006_og_tiers.ts), exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`, parity-checklist row 23 (zone population). This is a processing-tier rule, not spawn logic. The donor has no spawn caps, respawn or despawn code (grep found nothing), so the row fits only for activation and per-tick budget, not for population counts.
- today: not checked. This pass had no access to the Frankendom repo, so I do not know what exists at the target path.
- Reuse tag: adaptable (MIT: code may be adapted; this sketch was written fresh from the mechanism)
- Brief rule served: zones as data (radii are zone fields); one engine (the tier rule lives in the engine, the numbers in zone data)

## 6. Gaps and risks

- Tiering must not gate hit resolution, kills or hate. In the donor the far tiers skip perception, speech and the AI loop, and the damage path was not read. Frankendom rules say kills are server-verified and MAX_ATTACKERS = 3. An NPC that holds a hate entry for the player must keep full state at any distance. Keep the tier out of `src/fight`.
- No hysteresis. The donor switches tier on every tick with no margin, so an NPC on the boundary can flip each tick. Frankendom needs a margin or a hold time (I found no donor counter-example and did not look for one).
- The split is O(n) per tick over all NPCs, with no cap. For the server tick, the tier pass should run on the fixed step and read server state only.
- Units: the donor's 3000 and 6000 are not named as cm or any other unit in this code. Frankendom zone data must state its own unit.
- Not a spawn system. No caps, respawn or despawn were found.
- Zone load is whole-file. The donor does not show zone streaming, so this note gives no streaming method.
- Transitions and boundaries (read, not sketched): the zone-change chain saves world state on the client and restores it from a client-side snapshot. Frankendom's one ledger and server-verified state mean any zone change must be server-authoritative. The donor does not show that. Also not read: whether a second pending zone change can start a second load before the first callback clears the pending name (`Gothic::startLoad` not read).

Best transferable idea: Split a zone's NPCs into near, mid and far tiers by squared distance to the player, and spend perception and speech only on the near tier.
Decision (proposed): adapt — take the three-tier split and near-only perception as zone data (near and far radius per zone, perception interval per NPC type), but keep combat state and hate out of the tier so far NPCs still land hits and record server-side kills.
Acceptance: A server test places an NPC holding a hate entry for the player just outside the zone's near radius, ticks 60 times, and asserts that the NPC's hit and the server-side kill are recorded; a second test asserts that the NPC's perception scan does not run until the player is inside the near radius.

Reuse tag: adaptable (MIT: code may be adapted; this sketch was written fresh from the mechanism)
Brief rule served: zones as data (radii are zone fields); one engine (the tier rule lives in the engine, the numbers in zone data)
