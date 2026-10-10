# Anuken-Mindustry (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/NetServer.java` (method `clientSnapshot`, 754-903) | Licence: GPL-3.0 (`/mnt/frankendom-donors/Anuken-Mindustry/LICENSE`, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Java | symbol `clientSnapshot`

Best transferable idea: bound each client-claimed position by the speed the unit can reach in the time since the last accepted snapshot (capped), move the server's own copy by that bounded amount, and send a correction only when the claim is far from it.
Decision (proposed): adapt - the bound transfers to zone movement, but not the donor's wall-clock credit, its trust-the-client mode, or its chat and packet kicks that blacklist an IP; those do not fit a phone MMO on carrier NAT.
Acceptance: A server test sends a snapshot claiming a position 100 tiles from the last accepted one, 2 s after it, with a speed cap of 4 units per tick: the server moves at most 49.5 tiles (1.5 s capped credit x 60 x 4 x 1.1 = 396 units), and sends a correction because its position is then more than 14 tiles from the claim.

Checked: Read in full: `clientSnapshot` lines 844-903 (the movement and sync block) and 770-784 (stale-snapshot guard, NaN zeroing, the verify flag). Lines 831-843 (build-plan handling, between the plan checks and the movement block) were NOT read; lines 785-830 were read. Also read: `NetConnection.java` 1-138 (limits, kick, blacklist), `ArcNetProvider.java` 120-200 and 412-425 (packet limit, DOS blacklist), `Net.java` 340-372 (ValidateException path), `NetClient.java` 334-350 (chat spam), `Administration.java` 60-125, 196-202, 540-552 (action filter, config), `InputHandler.java` 252-270 and 706-722 (representative permission checks), `NetServer.java` 40-56, 708-716, 912-937, 1308-1320, `Vars.java` 135. The list hint was INFERRED; the real code is in `NetServer.clientSnapshot`. Not read: `Ratekeeper` (Arc library, not in this tree, so the window semantics below come from the config descriptions); the generated remote-call dispatch (CallGenerator.java only referenced); `readSyncManual` (unit sync body); `Mathf.within`; `unit.speed()`. Confidence high on the movement bound; medium on the claim that the non-verify branch is what a non-headless server runs (read from the condition at 782, not from a running server). Camera: not a camera cell.

## 1. Mechanism

- Entry: a client snapshot arrives as a `@Remote` unreliable high-priority call (NetServer.java 754-755). The dispatch path is ArcNetProvider.java 163-177, which posts the packet to the Core app thread, then `Net.handleServerReceived` (Net.java 340-364). The snapshot runs once per received client snapshot, not once per server tick. The clock is wall time (`Time.millis`), not the simulation tick (NetServer.java 848).
- Order of operations in `clientSnapshot`: (a) if the connection is missing or the snapshot id is older than the last accepted one, return (770). (b) Non-finite x, y, velocity, pointer and rotation are set to 0 (772-780, `invalid` at 712-713). (c) `verifyPosition = isStrict() && headless` (782). (d) If this is the first snapshot, the last time is set to now minus 16 ms (784). (e) The view box is stored (786-789). (f) Shooting is cleared for a flying mech, boosting for a flying unit (792-798). (g) If the unit is alive and the id matches (`ignorePosition` false, 854), the client velocity is set and clamped to `maxSpeed` (858). The claimed displacement from the unit to the claim is clamped to `maxMove` (860-861). (h) The unit moves by that vector (865 for ground, 867 for flying). (i) If `verifyPosition` is false, the unit is reset to its previous position and the claim is used as the new position (873-876). If it is true and the server's new position is more than `correctDist` from the claim, the server sends `setPosition` to correct the client (877-878). (j) The sync buffer is filled with the new rotation and position and read back into the unit (882-895). (k) The last snapshot id and time are stored (901-902).
- The bound itself: `elapsed = min(time since last snapshot, 1500 ms)` (848). `maxMove = elapsed/1000 x 60 x maxSpeed x 1.1` (849-851). So the allowance grows with time since the last accepted snapshot and is capped at 1.5 s, and the slack is 10 percent.
- Correction distance: `correctDist = tilesize x 14` (53), with `tilesize = 8` (Vars.java 135), so 112 world units (14 tiles).
- Strict flag: `strict` defaults to true, described as "corrects positions and prevents duplicate UUIDs" (Administration.java 542).
- Other limits in the same donor, each with a different response: (1) Per-connection packet count: `packetRate.allow(3000, packetSpamLimit)` on every received packet, default 300, close and blacklist the IP (ArcNetProvider.java 166-170; Administration.java 549). (2) Chat: 20 packets in 2 s, kick and blacklist (NetClient.java 339-341; Administration.java 552). (3) An action filter with a limit of 25 per 6 s, applied to action types other than breakBlock, placeBlock and commandUnits (Administration.java 73-77, 544-546); over the limit the action is refused, a message is sent at most every 2 min, and once the occurrence count exceeds 60 the player is kicked for 30 s (80-89). (4) Failed permission checks throw `ValidateException` (InputHandler.java 263-264), which Net.java 356-359 catches and logs at debug level only: the action is dropped and the player is not kicked. (5) A DOS-blacklisted IP is refused at connect (ArcNetProvider.java 130), and kick timers are stored per IP and per UUID (Administration.java 114-120).

## 2. Key functions

- `NetServer.clientSnapshot`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/NetServer.java` 754-903. The whole movement check, read end to end except 831-843.
- The bound block: same file, 848-879. The elapsed cap, the max move, the verify branch, the correction.
- Snapshot id guard: same file, 770.
- Packet-spam path: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/net/ArcNetProvider.java` 163-177.
- ValidateException path: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/net/Net.java` 340-364.
- Chat spam: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/NetClient.java` 334-350.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Claimed move bounded by speed x elapsed time, capped | Elapsed cap 1500 ms (NetServer.java 848); speed unit.speed() per tick (849); factor 60 ticks per second (851); slack 1.1 (851) |
| Correct the client only beyond a distance | 14 tiles = tilesize 8 x 14 (NetServer.java 53; Vars.java 135) |
| Stale-message guard by sequence id | Drop if id < last accepted (NetServer.java 770) |
| Packet count window and blacklist | 300 packets per 3000 ms (Administration.java 549; ArcNetProvider.java 166) |
| Chat count window | 20 per 2000 ms (Administration.java 552; NetClient.java 339) |
| Action window (not for place, break or command) | 25 per 6 s; kick at more than 60 (Administration.java 73-77, 544-546, 80-83) |
| Non-finite input zeroed | Infinity and NaN become 0 (NetServer.java 712-713, 773-780) |

## 4. TypeScript sketch

simplified: keeps the donor's order (stale-snapshot drop, then time credit, then displacement clamp, then the verify or non-verify branch, then the correction test, then saving the last snapshot). It omits: the velocity clamp (858), the physics move with collisions (865-868), the mech and flying branches (792-798), the sync buffer and its read-back (882-895, body not read), the view box, the 16 ms initialisation of the last time (784; the caller must set `lastMs`), the `setPosition` payload (kept as the `correction` flag), and the `invalid` checks for velocity, pointer and rotation (kept only for x and y). The sketch uses the donor's wall-clock credit; Frankendom would use ticks. Non-verify mode assumes `readSyncManual` adopts the claim, which was not read.

```ts
// clean-room sketch of the movement bound in NetServer.java (applySnapshot). Donor is GPL-3.0: shape only, no line-by-line translation.
export interface Motion {
  x: number;
  y: number;
  lastSnapId: number;   // id of the last snapshot accepted
  lastMs: number;       // time the last snapshot was accepted
}

export interface Claim {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Config {
  tileSize: number;     // donor 8 units per tile
  correctTiles: number; // donor 14: correct the client only beyond this distance
  maxElapsedMs: number; // donor 1500: cap on the time credit for one snapshot
  slack: number;        // donor 1.1 multiplier on the allowed move
  verify: boolean;      // donor: strict && headless
}

export interface Result {
  x: number;            // server position after this snapshot
  y: number;
  correction: boolean;  // true if the server must send the client its position
}

function finite(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

// Returns null when the snapshot is stale or the unit is not controllable this tick.
export function applySnapshot(
  m: Motion,
  c: Claim,
  nowMs: number,
  maxSpeed: number,     // units per tick, donor unit.speed()
  ignore: boolean,      // donor: dead or wrong unit
  cfg: Config,
): Result | null {
  if (c.id < m.lastSnapId) return null;

  const cx = finite(c.x);
  const cy = finite(c.y);
  const elapsed = Math.min(nowMs - m.lastMs, cfg.maxElapsedMs);
  const maxMove = (elapsed / 1000) * 60 * maxSpeed * cfg.slack;

  let nx = m.x;
  let ny = m.y;
  if (!ignore) {
    let dx = cx - m.x;
    let dy = cy - m.y;
    const len = Math.hypot(dx, dy);
    if (len > maxMove && len > 0) {
      dx = (dx / len) * maxMove;
      dy = (dy / len) * maxMove;
    }
    if (cfg.verify) {
      nx = m.x + dx;
      ny = m.y + dy;
    } else {
      // non-verify: the donor resets the unit to its previous position and writes the claim into the sync buffer; the sketch assumes readSyncManual adopts the claim (its body was not read)
      nx = cx;
      ny = cy;
    }
  }

  const correctDist = cfg.tileSize * cfg.correctTiles;
  const correction = cfg.verify && Math.hypot(cx - nx, cy - ny) > correctDist;

  m.x = nx;
  m.y = ny;
  m.lastSnapId = c.id;
  m.lastMs = nowMs;
  return { x: nx, y: ny, correction };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/intake.ts` (new): the server-side check on client-claimed positions in zones and the world, run once per client input. Duel steps are not bounded this way: a duel is a state change (rules 1-3). Parity-checklist row 5 (controls/input, intake). The donor's check runs once per received snapshot, on wall-clock time; our version runs in the fixed server tick and reads the input from the tick queue, so the sub-line is "server tick: fixed step, input intake, per-tick NPC budget".
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: server-verified kills (the bound is on movement only; no kill reads it); one ledger (no ledger write from the intake)

## 6. Gaps and risks

- GPL-3.0: the sketch is clean-room. Do not copy the donor's Java into the repo.
- Wall-clock credit: the donor credits time with `Time.millis` (848), capped at 1500 ms. Frankendom's rule is a fixed tick, so the credit must be in ticks with the cap as data. The tick rate is a Frankendom value, not read here.
- Trust mode: when `verifyPosition` is false, the donor takes the client's position (873-876). `verifyPosition` requires `headless` (782), so on a non-headless server the check is off in the donor. Frankendom must not have a config switch that turns the bound off for zone movement.
- Correction distance: 14 tiles is a large allowance. A phone client could be 13 tiles off and never be corrected. Make the correction distance zone data and test it.
- The donor has no hit, damage or kill verification. Nothing in this tree checks a hit against an attacker's position or weapon, so the server-verified-kill rule has no counterpart here. Do not cite this donor for kills.
- Permission checks are the donor's main validation for actions: a failed check throws `ValidateException` (InputHandler.java 263-264; Net.java 356-359), which drops the action with a debug log and no kick. That is a fair pattern for us (reject, do not punish), but the donor's own note at NetServer.java 922 says admin actions are not verified at all.
- Chat and packet limits kick and blacklist an IP (NetClient.java 339-341; ArcNetProvider.java 166-170). A blacklisted IP refuses connects (ArcNetProvider.java 130). On carrier NAT, one IP can serve many phones, so an IP blacklist is a risk for a phone-first game (our judgement; the donor does not discuss it). Use rejects and per-account limits instead.
- The bound uses the unit's speed, which the donor reads from the unit type. Frankendom's speeds live in the duel and zone data; a single cap per character class would need its own data field.
