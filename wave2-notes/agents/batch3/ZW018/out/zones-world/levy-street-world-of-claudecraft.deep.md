# levy-street-world-of-claudecraft (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/portals.ts` | Licence: MIT (`LICENSE`: "MIT License", Copyright (c) 2026 Levy Street; first lines read, full text not read) | TypeScript | symbol `updatePortalTriggers`

Checked: `updatePortalTriggers` read in full (portals.ts 1-46); `displacePlayer` read in full (displacement.ts 1-36); callers read: sim.ts 5974-5984 (tick block) and spirit_run_triggers.ts 20-24; `PORTALS` (data.ts 699-711) and `REALM_PORTALS` (content/realm.ts 134-143) read; tick driver server/game.ts 2544-2600 read (the `setInterval` period on line 2548 was not read); `TICK_RATE` and `DT` read (types.ts 32-33). Not read: `settleTeleportArrival`, `cancelProfessionSessionOnDisplacement`, `ctx.groundPos`, `ctx.rebucket` (all called from displacePlayer, not opened); the other ten zone portal arrays; the test files. Confidence: high for the portal trigger and displacement mechanism; medium for the tick driver (interval period unread). Scope: this is zone transitions, not a camera cell, so no `camera_scope` tag.

Best transferable idea: Move zone-to-zone transitions into the server tick as plain data pairs (a trigger radius and a landing per side) that run through one shared teleport recipe, and make a data test prove each landing sits outside its own trigger.

Decision (proposed): adapt - the donor pairs are 2D and rely on a convention (landing outside the trigger radius) that the code read does not enforce, so Frankendom keeps the data shape and the server-side move, and adds the landing check as a data test instead of copying the convention.

Acceptance: A server test loads every zone portal, asserts the landing check for each side, and walks a test player into side A: it arrives at side B's landing in one sim tick, is not moved again on the next tick, and the zone change is logged once.

## 1. Mechanism

- A portal is a two-way positional pair: `PortalDef` holds sides `a` and `b`, each with a trigger point (x, z) and a `landing` (x, z, facing). Standing within the radius of side a sends the player to side b's landing (portals.ts 37-38); standing within the radius of side b sends them to side a's landing (41-42). No entities, no instance slot, no rng (portals.ts 5; displacement.ts 10).
- Where it runs: in the live-player block of `sim.tick()`, after `updatePlayerMovement` (sim.ts 5976), then `updateDoorTriggers` (5982), `updateRiftTriggers` (5983), then `updatePortalTriggers` (5984). Released spirits also get the check through `updateSpiritRunTriggers` (spirit_run_triggers.ts 20-24); the portals.ts header (line 3-4) says the check runs for released spirits, but the call site of `updateSpiritRunTriggers` was not read.
- Order of steps inside `updatePortalTriggers` (portals.ts 32-46): (a) return unless `p.kind` is `'player'` (33); (b) return if `p.pos.x > DUNGEON_X_THRESHOLD` (34), so the instance plane is excluded; (c) loop over `PORTALS` in array order; the radius is `portal.radius` when it is > 0, else `PORTAL_TRIGGER_RADIUS` = 2.0 (17, 36); side a is tested first (37), then side b (41); the first hit teleports and returns (38-39, 42-43), so one player gets at most one transit per tick.
- Distance is 2D only: `dist2dTo` uses x and z and ignores y (portals.ts 19-23).
- The teleport is `displacePlayer(ctx, p, to.landing, text)` (portals.ts 29), where `to` is the OTHER side. `displacePlayer` (displacement.ts 18-36) runs in this order: profession-session teardown (27); `p.pos = ctx.groundPos(landing.x, landing.z)` (28) and `prevPos` copied from it (29); `ctx.rebucket(p)` (30); `p.facing = landing.facing` (31); `p.targetId = null` (32); `p.autoAttack = false` (33); `settleTeleportArrival(p)` (34, not read); one log line with colour `#b9f` (35).
- Anti-bounce: the arrival point is meant to sit outside the trigger it came from, so the player does not re-trigger on the next tick. The types comment says so (types.ts 4294-4295: "outside this side's own trigger radius so arrivals never bounce back"). For the one shipped pair, the arithmetic from realm.ts 137-138 and the radius 2.0 gives 4.95 units (side a landing from side a) and 5.02 units (side b landing from side b). That is my computation from the quoted values, not a donor constant. The code read does not check it.
- Tick driver (server/game.ts): a fixed-step accumulator. Wall-clock dt is clamped to 0.5 s (2560) and added to `acc` (2561); whole steps run while `acc >= DT` (2581), with `sim.tick()` called once per step (2594). `TICK_RATE` = 20 and `DT` = 1 / TICK_RATE (types.ts 32-33). So the portal check runs once per 1/20 s sim step, never per render frame.

## 2. Key functions

- `updatePortalTriggers`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/portals.ts` 32-46 (the whole check: kind, instance guard, radius, both sides, first hit wins).
- `teleport` (wrapper): `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/portals.ts` 25-30 (passes `to.landing` to the shared recipe).
- `displacePlayer`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/displacement.ts` 18-36 (teardown, ground the landing, rebucket, facing, drop target and auto-attack, settle, log line). Draws zero rng (displacement.ts 10).
- Tick call site: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/sim.ts` 5974-5984 (only for live players; released spirits use spirit_run_triggers.ts 20-24).
- Data: `PORTALS` = the concatenation of eleven per-zone arrays (`/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/data.ts` 699-711); one shipped pair, `REALM_PORTALS` (`/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/content/realm.ts` 134-143, id `duskfall_passage`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-way trigger pair: stand in side A, leave at side B's landing | None; the pairing is data (`PortalDef` a and b) |
| Per-portal trigger radius with a default fallback | Default 2.0 units (theirs, portals.ts 17); realm pair radius 2.0 (theirs, realm.ts 139; quote too short to receipt, so not cited as a receipt) |
| Landing sits outside its own trigger (anti-bounce) | Convention only (theirs, types.ts 4295). Realm arithmetic: 4.95 units (side a) and 5.02 units (side b), computed from realm.ts 137-138 |
| Instance guard: no portal check beyond an x limit | `DUNGEON_X_THRESHOLD` = `INSTANCE_X_BASE + 600` = 100000 units (theirs, data.ts 1100-1101; 99400 + 600 is my arithmetic) |
| Arrival facing taken from the landing | Realm landings -0.79 and -1.79 rad (theirs, realm.ts 137-138) |
| One transit per player per tick (first match returns) | None (the `return` on portals.ts 39 and 43) |
| Fixed step for the tick | 20 Hz; DT = 0.05 s (theirs, types.ts 32-33) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's check order (kind, instance x limit, then the first matching portal, side a before side b, per-portal radius with the 2.0 fallback) and returns the destination instead of teleporting. It omits the donor's side effects (profession-session teardown, ground height, rebucket, target and auto-attack reset, arrival settle, the flavour log line), the released-spirit path, the other ten shipped portal arrays, and the tick driver. `landingClearsTriggers` is an addition for a Frankendom data test; no such function appears in the donor files read.

```ts
// Licence: MIT (donor LICENSE, Copyright 2026 Levy Street). Clean-room sketch of the mechanism, not a translation.
interface Point { x: number; z: number }
interface PortalLanding extends Point { facing: number }
interface PortalSide { x: number; z: number; landing: PortalLanding }
interface PortalDef { id: string; a: PortalSide; b: PortalSide; radius: number; enterText: string; leaveText: string }
interface PlayerPos { kind: string; x: number; z: number }
interface Transit { landing: PortalLanding; text: string; portalId: string }

const DEFAULT_RADIUS = 2.0;

function dist2d(p: Point, q: Point): number {
  const dx = p.x - q.x;
  const dz = p.z - q.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// Where a live player is sent this tick, or null. First match wins; no rng, no state.
export function portalTransit(
  player: PlayerPos,
  portals: readonly PortalDef[],
  instanceXLimit: number,
): Transit | null {
  if (player.kind !== 'player') return null;
  if (player.x > instanceXLimit) return null;
  for (const portal of portals) {
    const r = portal.radius > 0 ? portal.radius : DEFAULT_RADIUS;
    if (dist2d(player, portal.a) < r) return { landing: portal.b.landing, text: portal.enterText, portalId: portal.id };
    if (dist2d(player, portal.b) < r) return { landing: portal.a.landing, text: portal.leaveText, portalId: portal.id };
  }
  return null;
}

// Authoring check (zone data test): an arrival must land outside the trigger it came from.
export function landingClearsTriggers(portal: PortalDef): boolean {
  const r = portal.radius > 0 ? portal.radius : DEFAULT_RADIUS;
  return dist2d(portal.a.landing, portal.a) >= r && dist2d(portal.b.landing, portal.b) >= r;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file with `export {};` appended: passed.

## 5. Lands in

- TARGET `origins/server/zone-transitions.ts` (proposed new module; the Frankendom repo was not read, so this name is unverified). Parity row 23 (zone population) is the closest row in the addendum. Row 23 covers spawn caps, respawn and despawn, not transitions, so this is a stretch: no row 1-23 covers zone transitions.
- Server tick placement: the transit check runs inside the server sim tick, once per live player, after that player's movement (as in the donor, sim.ts 5976-5984). Sub-line "server tick: fixed step, input intake, per-tick NPC budget", row 18 / post-K item 3.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; we adapt the shape only, no copy).
- Brief rule served: zones as data on one runtime, and server-verified positions. No numbered rule in the addendum fits this exactly.

## 6. Gaps and risks

- The trigger is 2D (x, z) and ignores y (portals.ts 19-23). A player on a bridge or ledge above a portal trigger would transit. Frankendom needs a height test or a per-portal floor.
- Nothing records that a player has just arrived. The only guard against a bounce is the geometry of the landing, which is a convention (types.ts 4295), so a knockback or a push back into the trigger is not covered by any code read here. Frankendom should enforce it by data test and by a short arrival lock in state.
- The donor's teleport writes a flavour log line and nothing else. There is no ledger entry and no server-verified event for the zone change. Frankendom's one-ledger ruling needs the transit recorded as an event.
- The shared recipe clears the target and auto-attack (displacement.ts 32-33). That is the right idea for a duel. For a Frankendom Pit or a mid-fight zone change it must be decided by the fight state, not copied.
- Only the realm pair was read. The ten other portal arrays (data.ts 700-710) and their landings were not read, so I cannot say whether they all obey the landing convention.
- Zone streaming on the client (`src/render/zone_streaming.ts`) is a separate mechanism; only lines 1-60 were read, and it is not part of this note.
- The Levy Street tick loop is fixed-step. The `setInterval` period (server/game.ts 2548) was not read.
- Camp spawns (sim.ts 2324-2396, `camp_scatter.ts`) and the per-death respawn timer (combat/damage.ts 1651-1666, `respawn_policy.ts` 185-200) are real spawn mechanisms that I saw while checking zones. They are not in this note: they belong to a spawn topic, and I found no density cap or despawn-on-empty rule in the files read (a grep for `despawn` in src/sim lists about ten files, most not read).

Reuse tag: rewrite-from-idea (MIT, adapt the shape)
Brief rule served: zones as data on one runtime; server-verified positions
