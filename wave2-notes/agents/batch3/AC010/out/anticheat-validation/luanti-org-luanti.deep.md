# luanti-org-luanti (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/src/server/player_sao.cpp` | Licence: LGPL-2.1-or-later (SPDX header at player_sao.cpp line 2; repo ships COPYING.LESSER; LICENSE.txt covers textures/media under CC BY-SA and others) | C++ | symbol `PlayerSAO::checkMovementCheat`

Checked: Read in full: `PlayerSAO::checkMovementCheat` (player_sao.cpp 638-745), `LagPool` (player_sao.h 20-53), the per-step timers (player_sao.cpp 246-258), `Server::process_PlayerPos` (serverpackethandler.cpp 440-514), its callers `handleCommand_PlayerPos` (517-539) and `handleCommand_Interact` (884-920, the call at 920), the digging check (serverpackethandler.cpp 1060-1130), the lag estimate update (server.cpp 700-732). Partly read: `checkInteractDistance` (serverpackethandler.cpp 856-873; its callers not read). Not read: `IntervalLimiter`, the PlayerSAO constructor, the send gating after player_sao.cpp 300, the Lua `on_cheat` handlers (only the registration at builtin/game/register.lua 605). The hint file `builtin/settingtypes.txt` (1097-1103) is settings text only. camera_scope: not applicable (not a camera topic). Confidence: high on the pool arithmetic (worked by hand against the code); medium on the client snap-back after a rewind (inferred from `m_position_not_sent`, player_sao.cpp 277-300, without reading the send gating). Checked that `checkMovementCheat` has one caller (serverpackethandler.cpp 510) and `process_PlayerPos` has two (539, 920).

Best transferable idea: Accept a client position claim only while a server-side pool of movement time (cost of the move in seconds at top speed, drained by real time, capped by measured lag) has room, and otherwise rewind to the last accepted point, flagging only outside a teleport grace window.

Decision (proposed): adapt — take the pool-and-rewind shape for zone movement reports only; its burst allowance (5 s by default) is far too loose for a duel, where src/fight owns position and verifies hits.

Acceptance: A server test idles a player for 5 s, then streams claims at 2x walk speed. It expects about 5 s of claims accepted, then each further claim rewound to the last accepted point with a correction sent to the client, and a walker at walk speed with ordinary packet jitter is never rewound.

## 1. Mechanism

- Entry: each client position report goes to `process_PlayerPos`. It stores the claimed position on the player first (serverpackethandler.cpp 498-501), then calls `checkMovementCheat()` (510). If the check fails, it calls the Lua callback `moved_too_fast` and sends a move correction (512-513).
- The check measures the cost of the claimed move from the last accepted point (`m_last_good_position`), in seconds at top speed. Horizontal cost = horizontal distance / fastest allowed walk speed (715). If the move goes up, the cost is raised to vertical distance / fastest allowed upward speed when that is larger (719-723). Downward movement is not costed (717 FIXME). The cost is divided by the tolerance, which is at least 1.0 (727-729).
- Payment: `m_move_pool` (type `LagPool`) pays the cost. `grab(cost)` succeeds only when `pool + cost <= max` (player_sao.h 48). On success the pool grows by the cost and the last accepted point moves to the claim (player_sao.cpp 731-732). On failure the pool does not change and the position is rewound to the last accepted point (743).
- The pool drains by real server time on every step: `m_move_pool.add(dtime)` (255), floored at 0 (player_sao.h 35-39). So the pool counts movement time claimed beyond real time. Movement at or under top speed adds no more than the time that passes. Over-speed fills the pool. Idle time empties it, so after standing still, over-speed is accepted until the pool is full again, about `max` seconds of it.
- Max: `max = 2 x max lag estimate`, floored at 5 s (player_sao.cpp 246-251). The lag estimate is the largest server step time seen, halved about every minute (server.cpp 709-716, reported at 730). So the 5 s floor applies unless a recent step took more than 2.5 s.
- Flag: a refused move is reported (callback and action log) only when `m_time_from_last_teleport > lag_pool_max` (player_sao.cpp 736-741). Otherwise the rewind is silent but still applies. The corrected position reaches the client through the position send in `step()` (`m_position_not_sent` at 277, which `setBasePosition` at player_sao.cpp 343 sets).
- Teleports and server placement: `setPos`, `addPos` and `moveTo` set the last accepted point to the new position, refill the pool and reset the teleport timer (player_sao.cpp 368-370, 392-394, 405-407). The refill function is named `empty()` but sets the pool to max (player_sao.h 42).
- Digging reuses the same class: `m_dig_pool` (serverpackethandler.cpp 1060-1128). A dig longer than 2.0 s is accepted when the measured dig time times 1.2 is greater than the expected time, and it grabs its expected time from the pool whether or not the pool has it (1111-1114). Shorter digs must grab their expected time from the dig pool. A refused dig is ignored and reports `dug_too_fast` (1118-1128).
- Interaction range: `checkInteractDistance` refuses when the distance is more than the tool range plus 2.6 x BS (serverpackethandler.cpp 864), and reports `interacted_too_far` (871). Its callers were not read.
- Tick: the check runs once per client position packet, not per tick. The time side (pool drain, teleport timer) runs in `PlayerSAO::step` (player_sao.cpp 150, timers at 253-258) once per server step.

## 2. Key functions

- `PlayerSAO::checkMovementCheat`: `/mnt/frankendom-donors/luanti-org-luanti/src/server/player_sao.cpp` 638-745. Cost, pool grab, accept or rewind, grace-gated flag.
- `LagPool` (class): `/mnt/frankendom-donors/luanti-org-luanti/src/server/player_sao.h` 20-53. `add` drains, `grab` pays, `empty` refills to max, `setMax` clamps.
- Pool timers in `PlayerSAO::step`: `/mnt/frankendom-donors/luanti-org-luanti/src/server/player_sao.cpp` 246-258. Max from lag estimate; drain and teleport timer per step.
- `Server::process_PlayerPos`: `/mnt/frankendom-donors/luanti-org-luanti/src/network/serverpackethandler.cpp` 440-514. Store the claim (498-501), check (510-513).
- `Server::handleCommand_PlayerPos` (517-539) and the position part of `Server::handleCommand_Interact` (884-920): the two callers of `process_PlayerPos`.
- Dig check block: `/mnt/frankendom-donors/luanti-org-luanti/src/network/serverpackethandler.cpp` 1060-1130.
- `Server::checkInteractDistance`: `/mnt/frankendom-donors/luanti-org-luanti/src/network/serverpackethandler.cpp` 856-873 (callers not read).
- Lag estimate: `/mnt/frankendom-donors/luanti-org-luanti/src/server.cpp` 709-730.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Move cost in seconds = distance / top speed | Walk 4, fast 20, jump 6.5 (defaultsettings.cpp 517, 519, 521); top walk is crouch/walk, or crouch/fast/walk with the fast privilege (player_sao.cpp 683-700 region) |
| Upward cost uses jump cap doubled | Doubled at player_sao.cpp 701, with an admitted unbounded-Y FIXME at 699 |
| Tolerance divides cost, never below 1 | Default 1.0 (defaultsettings.cpp 465), clamp at player_sao.cpp 727 |
| Pool max = 2 x lag estimate, floor 5 s | 2.0 and 5.0 (player_sao.cpp 246-247) |
| Lag estimate = largest step time, decays | Starts 0.1 s (serverenvironment.h 412); decay step with `IntervalLimiter` argument 0.5 (server.cpp 713, IntervalLimiter not read) and factor 0.99425 (716); the donor's comment says it halves about every minute |
| Teleport grace before a flag | Same lag max (player_sao.cpp 735-737) |
| Dig slack for long digs | 2.0 s threshold and 1.2 factor (serverpackethandler.cpp 1111) |
| Interaction range slack | Plus 2.6 x BS over the tool range (serverpackethandler.cpp 864) |
| Enabled checks | Digging 0x01, interaction 0x02, movement 0x04 (server.h 80-82); all three on by default (defaultsettings.cpp 463-464) |

Worked by hand from the code (not measured): with max at the 5 s floor, a player who has been idle for 5 s and then moves at 2x walk speed has each tick's cost (2 x dt) exceed the drain (dt) by dt, so the pool climbs by one tick per tick. About 5 s of 2x movement is accepted, then every tick is refused and rewound. A player at exactly walk speed adds as much cost as time drained, so the pool does not grow and a move is refused only if the pool is already close to max.

## 4. TypeScript sketch

simplified: keeps the donor order: each server step drains the pool and ages the teleport timer; each claim measures cost from the last accepted point, applies the top-speed rule and the doubled jump cap, divides by tolerance, grabs from the pool, then accepts or rewinds and flags only after the grace. It omits the attached and singleplayer bypass (kept only as the `enabled` flag), the physics_override multipliers (caps arrive already scaled), the Lua `on_cheat` callback and the client correction send, the dig pool, and the interaction range check. It starts the pool full at max, where the donor starts at 15 and clamps on the first step. It renames the donor's `empty()` to `refill()`, and `teleport()` is a separate helper written from the donor's setPos, addPos and moveTo blocks.

```ts
// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Vec3 = { x: number; y: number; z: number };

// Seconds of unspent movement credit. Real time drains it; each accepted move adds its cost.
class MovePool {
  private pool: number;
  private max: number;
  constructor(max: number) { this.max = max; this.pool = max; }
  setMax(max: number): void { this.max = max; if (this.pool > max) this.pool = max; }
  drain(dt: number): void { this.pool = Math.max(0, this.pool - dt); }
  grab(cost: number): boolean {
    if (cost <= 0) return true;
    if (this.pool + cost > this.max) return false;
    this.pool += cost;
    return true;
  }
  refill(): void { this.pool = this.max; }
}

interface MoveCaps {
  walk: number; crouch: number; fast: number; // units/s, already scaled by the per-player override
  fastPriv: boolean;
  jump: number; climb: number;                // units/s
  overrideH: number; overrideV: number;       // temporary extra speed, 0 when none
}

interface MoveState {
  pool: MovePool;
  lastGood: Vec3;
  sinceTeleport: number; // s
  lagMax: number;        // s, grace before a rejected move is flagged
  tolerance: number;     // >= 1
  enabled: boolean;
}

interface MoveResult { pos: Vec3; accepted: boolean; flagged: boolean; }

// Once per server step, before any packets are checked.
function tick(s: MoveState, dt: number): void {
  s.pool.drain(dt);
  s.sinceTeleport += dt;
}

// Server-side placement (teleport, respawn): resets the grace and refills the pool.
function teleport(s: MoveState, to: Vec3): void {
  s.lastGood = to;
  s.pool.refill();
  s.sinceTeleport = 0;
}

// One client position claim.
function checkMove(s: MoveState, claimed: Vec3, caps: MoveCaps): MoveResult {
  if (!s.enabled) { s.lastGood = claimed; return { pos: claimed, accepted: true, flagged: false }; }

  const dH = Math.hypot(claimed.x - s.lastGood.x, claimed.z - s.lastGood.z);
  const dV = claimed.y - s.lastGood.y;

  let maxWalk = caps.fastPriv ? Math.max(caps.walk, caps.crouch, caps.fast) : Math.max(caps.walk, caps.crouch);
  maxWalk = Math.max(maxWalk, caps.overrideH, 0.0001);
  const maxJump = Math.max(caps.jump * 2, caps.climb, caps.overrideV, 0.0001);

  let cost = dH / maxWalk;                                            // seconds at top walk speed
  if (dV > 0) cost = Math.max(cost, dV / Math.max(maxJump, maxWalk)); // downward moves are not checked
  cost /= Math.max(s.tolerance, 1);

  if (s.pool.grab(cost)) {
    s.lastGood = claimed;
    return { pos: claimed, accepted: true, flagged: false };
  }
  // Rewind to the last accepted point. Flag only outside the teleport grace window.
  return { pos: s.lastGood, accepted: false, flagged: s.sinceTeleport > s.lagMax };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {}` appended, exit 0 (work/luanti-move-pool.ts).

## 5. Lands in

- TARGET `origins/server/move-check.ts` (new, proposed name; not checked against the Frankendom repo). Zone movement position reports only. The duel's position is owned by the fight step and is not validated by this pool.
- Parity row 5 (controls/input, the intake side). This is the closest fit, not a perfect one. No row describes position validation. The sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3) is where `tick()` would sit.
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later: clean-room shape only)
- Brief rule served: server-verified kills (zone position validated on the server); one ledger (the flag goes to the one ledger, see section 6)

## 6. Gaps and risks

- The allowance is in seconds, not frames. The default floor is 5 s of 2x speed after idling, which is far too loose for a fight. Use this only for zone movement, and use the fight step's own state (engage is a state change) for duels.
- It validates position and digging, not hits. Frankendom's server-verified kills need their own hit validation. The closest shape here is `checkInteractDistance` (serverpackethandler.cpp 864), whose callers were not read.
- A rewind is a visible rubber band on phones. Lag spikes push the cost over the pool. The lag estimate absorbs them, but it rises only after a spike has been seen (server.cpp 730). Measure rewinds on phone networks before turning this on for phone clients.
- Downward movement is not checked (player_sao.cpp 717 FIXME), and the doubled jump cap is admitted to be unbounded (699). Do not copy the x2 without a cap. Falls should be checked server-side against the zone's gravity data.
- The donor's flag goes to a Lua callback and an action log. The ban or flag pipeline was not read. Frankendom sends the flag to the one ledger with the same grace rule.
- Teleport refills the pool to max, so the first moves after a teleport are paid for by elapsed time (player_sao.cpp 369). Respawn should use the same path, or respawn lag becomes a false rewind.
- Minor: server.cpp 730 ends a statement with a comma where a semicolon is expected. The comma operator still runs both calls in order, but do not copy the typo.
- Data: speed caps are per character and gear, not per zone, so they are engine constants here. Tolerance is a server setting. Zone data only applies to zone-specific speed effects, which were not read in this donor.
- Clean-room only (LGPL-2.1-or-later). The sketch is written from the described mechanism.

Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room shape only)
Brief rule served: server-verified kills (zone movement validated on the server); one ledger for the flag
