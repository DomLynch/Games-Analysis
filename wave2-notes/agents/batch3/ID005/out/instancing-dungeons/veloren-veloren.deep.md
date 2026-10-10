# veloren-veloren (instancing-dungeons, cell 19)

Donor: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/teleporter.rs` (with `server/src/events/entity_manipulation.rs` 3358-3398, `common/src/comp/misc.rs` 19-23) | Licence: GPL-3.0 (LICENSE file opens "GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007"; clean-room only) | Rust | symbol `teleporter::Sys::run`

Checked: No instanced zones exist in this donor. Grep for instance, dungeon, portal and teleport found dungeons only as sites in the one shared world (`world/src/site/mod.rs` 146). What STRONG covers is the entry/exit gate: a timed channel into a portal with cancel rules and an escort. Read in full: `teleporter.rs` (143 lines), the `StartTeleportingEvent` handler, the `Object::Portal` variant, the client trigger (`common/systems/src/controller.rs` 183-185), and the grid query (`common/src/util/spatial_grid.rs` 80-100). Not read: the agent code that sets `aggro_on` (`server/agent`), the full `CharacterState` machine, and the client UI. Confidence: high on the mechanism as written; medium on fit to "instancing", since the donor does not instance anything.
Best transferable idea: A zone door is a server-side channel: starts on use only if the player stands in range, is cancelled on range, aggro or state failure, and fires once at end time, moving the owner plus nearby companions together.
Decision (proposed): adapt - keep the channel shape, but target a zone id plus spawn point (not a world position), count the engine's hate list (not agent targets), and fix the square aggro window.
Acceptance: A test holds use at a no-aggro door for its buildup seconds and asserts one zone change at end time; a test that steps 3.1 units away, or enters an attack state, asserts the channel is cleared with no zone change; a test asserts a foe at 250 units with aggro does not block the door.

## 1. Mechanism

- Entry is a channel, not an instance. A portal object (`Object::Portal`) stores a target position, a `requires_no_aggro` flag and `buildup_time` in seconds (`common/src/comp/misc.rs` 19-23).
- Start: the client sends `ActivatePortal`, which becomes `StartTeleportingEvent` (`common/systems/src/controller.rs` 185). The handler (`entity_manipulation.rs` 3371-3391) writes a `Teleporting` record only if the entity has no record already, is within 3 units of the portal (`TELEPORTER_RADIUS`), and the portal is a `Portal` object. The record's `end_time` is now plus the portal's `buildup_time`.
- Tick: `teleporter::Sys` runs in the server `Create` phase (`teleporter.rs` 42) and walks every entity that has a `Teleporting` record (78-86). For each record, in this order:
  1. If the portal entity is missing or is not a `Portal`, cancel (87-96).
  2. Cancel if the entity is out of portal range, or if `requires_no_aggro` is set and an agent in the grid query has this entity as an aggro target (98-99), or if its character state is not Idle, Wielding, Sit or Dance (100-106).
  3. Otherwise, if `end_time <= now` (109), collect the owner and every entity with `Alignment::Owned(owner uid)` within 20 units (111-126). Emit a teleport-to-position event for each to the portal target, plus a `TeleportedByPortal` outcome (128-135). Each of them is added to the cancel list.
  4. Remove the `Teleporting` record of every entity on the cancel list (139-141).
- Result: a channel either fires exactly once when its end time is reached and every rule still holds, or it is cleared. Nothing persists after that.

## 2. Key functions

- `teleporter::Sys::run`: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/teleporter.rs` 44-142. Ordering: cancel rules (98-107), then fire (109-136), then clear (139-141).
- `check_aggro` closure: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/teleporter.rs` 63-74. Scans the grid query for an agent whose target is this entity with `aggro_on` set.
- `in_portal_range`: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/teleporter.rs` 20-22.
- `StartTeleportingEvent` handler: `/mnt/frankendom-donors/veloren-veloren/server/src/events/entity_manipulation.rs` 3358-3398.
- `Object::Portal` variant: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/misc.rs` 19-23.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Channel: timed start, cancel on any failed rule, fire once at end time | Buildup 5 s on cultist-site portals (`world/src/site/plot/cultist.rs` 625-626); 7 s default for the admin portal command (`server/src/cmd.rs` 2869) |
| Range to start and to keep the channel | 3 units (`common/src/consts.rs` 39) |
| No-aggro window around the player | 200 units (`teleporter.rs` 14). The grid query is a square of half-width about 201, so corners reach about 284 units (`common/src/util/spatial_grid.rs` 96-97; the TODO at 82 says so). |
| Escort: owned entities within range come along | 20 units (`teleporter.rs` 15) |
| Allowed states to keep a channel | Idle, Wielding, Sit, Dance (`teleporter.rs` 102-105) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (cancel rules first, then fire, then clear). It differs in four ways. It sets positions directly instead of emitting a teleport event that is applied later in the tick. It drops the outcome event and the donor's `Alignment` lookup, and models companions as a list with an owner id. It models the hate list as foes with a target id and an `aggroOn` flag. It fixes the donor's square aggro window by testing a true xy circle, while keeping the donor's split of 3D distance for the door and xy for aggro. The target is a world position as in the donor; Frankendom would store a zone id and spawn point instead (see section 6).

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Vec3 { x: number; y: number; z: number; }
type PlayerState = "idle" | "wielding" | "sit" | "dance" | "busy";
interface Player { id: number; pos: Vec3; state: PlayerState; }
interface Door { id: number; pos: Vec3; radius: number; buildupS: number; requiresNoAggro: boolean; target: Vec3; }
interface Foe { targetPlayerId: number | null; aggroOn: boolean; pos: Vec3; }
interface Companion { ownerId: number; pos: Vec3; }
interface Channel { doorId: number; endsAt: number; }
interface World {
  players: Map<number, Player>;
  doors: Map<number, Door>;
  foes: Foe[];
  companions: Companion[];
  channels: Map<number, Channel>; // one running channel per player
}

const AGGRO_RANGE = 200;  // data: an aggroed foe this close (xy circle) blocks a no-aggro door
const ESCORT_RANGE = 20;  // data: companions this close to the owner come along

function dist2(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x; const dy = a.y - b.y; const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}
function dist2Xy(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

// Step 1 (on use press): start a channel only if the player stands in range and has none running.
export function startChannel(w: World, playerId: number, doorId: number, now: number): boolean {
  const p = w.players.get(playerId);
  const d = w.doors.get(doorId);
  if (!p || !d || w.channels.has(playerId)) return false;
  if (dist2(p.pos, d.pos) > d.radius * d.radius) return false;
  w.channels.set(playerId, { doorId, endsAt: now + d.buildupS });
  return true;
}

// True if any foe currently has this player as its aggro target, within the xy circle.
function aggroNear(w: World, p: Player): boolean {
  return w.foes.some(f =>
    f.targetPlayerId === p.id && f.aggroOn && dist2Xy(f.pos, p.pos) <= AGGRO_RANGE * AGGRO_RANGE);
}

// Step 2 (once per server tick, game clock `now` in seconds): cancel on any failed rule, else fire when time is up.
export function tickChannels(w: World, now: number): void {
  for (const [playerId, ch] of Array.from(w.channels.entries())) {
    const p = w.players.get(playerId);
    const d = w.doors.get(ch.doorId);
    if (!p || !d) { w.channels.delete(playerId); continue; }

    const out = dist2(p.pos, d.pos) > d.radius * d.radius;
    const blocked = d.requiresNoAggro && aggroNear(w, p);
    const allowed = p.state === "idle" || p.state === "wielding" || p.state === "sit" || p.state === "dance";
    if (out || blocked || !allowed) { w.channels.delete(playerId); continue; }
    if (now < ch.endsAt) continue;

    // Fire: owner and companions within ESCORT_RANGE go to the door target together.
    for (const c of w.companions) {
      if (c.ownerId === p.id && dist2Xy(c.pos, p.pos) <= ESCORT_RANGE * ESCORT_RANGE) c.pos = { ...d.target };
    }
    p.pos = { ...d.target };
    w.channels.delete(playerId);
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/zone-doors.ts` (new): server-side zone door channel; the zone target is data (zone id plus spawn point), the channel record lives in the engine's one state. Parity row 23 (zone population). No parity row covers zone entry directly, so 23 is the nearest fit.
- today: (not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data on one runtime; server-verified state changes (the server checks range, aggro and state on every tick, not the client).

## 6. Gaps and risks

- Instancing is absent. The donor has no separate instance per party or per dungeon run; the portal sends the player to a position in the same world. Frankendom's one-runtime rule means the target must be a zone id and spawn, which the donor does not model.
- Defect, fixed in the sketch: the no-aggro check queries a square (`spatial_grid.rs` 96-97), so an aggroed agent up to about 284 units away can block the portal, although `teleporter.rs` 14 and its comment describe 200. Fix: test the true distance to the player, as the sketch does.
- Engine rule: "many-on-one logic lives in the engine". The donor's no-aggro test reads agent targets directly. Frankendom should read the engine's hate list and count MAX_ATTACKERS = 3 engaged foes, not just any aggroed one.
- Companion rule: the donor escorts any owned entity within 20 units and does not check its state. Frankendom has no pets; the party rule (who comes along, and what a companion mid-fight does) must be decided and tested.
- Allowed states (Idle, Wielding, Sit, Dance) are the donor's list. Frankendom's state set (guard, parry, stagger, finisher) differs, so the list must come from the duel state machine (checklist row 1), not be copied.
- Positions in the donor are set through an event applied later in the tick. The sketch sets them directly; Frankendom should keep one event path so the server ledger sees one write.
- Timing uses game time (`Time`), not wall clock. That is correct for a server tick and should be kept.
- Clean-room only: GPL-3.0. The sketch is written from the mechanism, not translated.
