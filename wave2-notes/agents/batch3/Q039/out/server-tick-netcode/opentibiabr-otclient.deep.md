# opentibiabr-otclient (server-tick-netcode, cell 1)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/creature.cpp` (with `localplayer.cpp`, `game.cpp`, `protocolgameparse.cpp`, `modules/game_walk/walk.lua`) | Licence: MIT (`LICENSE` line 1: "OTClient is made available under the MIT License") | C++ with Lua UI | symbol `Creature::getStepDuration`, `LocalPlayer::canWalk`, `LocalPlayer::walk`

Checked: Read in full: `Creature::getStepDuration` (creature.cpp 1114-1162; 1116-1117 speed guard body not read), `Creature::walk` (512-540), `Creature::onAppear` (618-640), `Creature::nextWalkUpdate` (788-806), `Creature::updateWalk` (808-830), `LocalPlayer::canWalk` (38-63), `LocalPlayer::walk` (65-79), `LocalPlayer::preWalk` (81-88), `LocalPlayer::registerAdjustInvalidPosEvent` (106-113), `LocalPlayer::cancelWalk` (146-166), `Game::ping`, `Game::processPingBack`, `Game::isConnectionOk`, `parseLogin` beat line, `parseWalkWait`, `walk.lua` 70-130. Confidence high on the client mechanism. Not in this repo: the server tick loop (the donor is the client only; the grep for tick/beat in `src/` found only client timing). The only server-tick fact the donor has is the beat number the server sends at login. Callers: `LocalPlayer::walk` is reached through `Creature::onAppear` (creature.cpp 638), which is called from `map.cpp:203`; the server packet path that reaches `map.cpp:203` was not read. Not a camera cell (the camera padding term at creature.cpp 1156-1158 is noted only).

Best transferable idea: Round every movement step up to a whole server beat so steps end on one tick grid, and let the client predict only movement, dropping its queue whenever the server's next step disagrees.
Decision (proposed): adapt — The beat-rounded step time gives movement one tick grid, but Frankendom's kills, damage and guard stay server-verified, so only the movement queue is adopted and never a predicted hit.
Acceptance: Server test: with beat 50 ms every movement step duration is a multiple of 50 ms. Client test: a refused move (server cancel) snaps the avatar back to the confirmed tile at once and blocks new steps for 250 ms.

## 1. Mechanism

This is client-side movement prediction tied to a server beat. Five parts:

- (a) Beat. The server sends a beat in ms at login (`parseLogin`, protocolgameparse.cpp 731, stored at 772). Default 50 ms before login (game.h 523).
- (b) Step time. For a tile, `1000 * groundSpeed / speed` ms (creature.cpp 1135, 1138), where ground speed is the tile's value or 150 when the tile has none (1129). When the client is 860 or newer (or the forced-formula flag is set), that time is rounded UP to a whole number of beats (1140-1141). A tile step therefore always ends on a beat boundary.
- (c) Input gate and prediction (`LocalPlayer::canWalk`, localplayer.cpp 38-63). In order: dead returns false (41-42); walk lock on returns false (45-46); predicted-step queue longer than `walkMaxSteps` returns false (50-51); with `walkMaxSteps` at 0 the client must match the server position (52-53); while walking, auto-walking allows (57) and pre-walking blocks (58); otherwise the step timer must have elapsed (62). The Lua side (walk.lua 81, 100, 115) checks the lock, then `canWalk()`, then calls `player:preWalk(dir)` and sends the walk to the server.
- (d) Reconciliation (`LocalPlayer::walk`, localplayer.cpp 65-79). When the server moves the player, if the new position equals the front of the predicted queue it pops that prediction (70). Otherwise it cancels the adjust timer, clears the queue (75) and runs the server step (78). The predicted position is the back of the queue, the confirmed position is the creature position.
- (e) Timeouts. If the server never confirms, the adjust timer clears the queue after `min(max(stepDuration, ping) + 100, 1000)` ms (112; the callback at 109 clears the queue). A server cancel (`processWalkCancel`, protocolgameparse.cpp 3099) runs `cancelWalk` (146-166): drops the prediction, runs the adjust callback at once (155), locks walking 250 ms (default arg, header line 32; call at 158), retries an auto-walk while the retry counter is 3 or less (129), turns to the cancel direction and calls Lua. A server WalkWait (3105) sets the lock to the millis the server sends.

The client's walk progress is clock-driven, not frame-counted. `Creature::walk` restarts `m_walkTimer` (527) and calls `nextWalkUpdate` (539). `nextWalkUpdate` runs `updateWalk` then reschedules itself after `walkDuration` ms (805; on every dispatcher cycle instead when the camera follows the creature), where `walkDuration = min(stepDuration / spriteSize, FPS60)` (1146). `updateWalk` computes the walked pixels from elapsed clock time (812) and calls `terminateWalk` at a full sprite (827-828). The dispatcher loop that fires these events was not read.

Ping: `Game::ping` sends a ping only if the previous one was answered (1673-1678). The next ping is scheduled `m_pingDelay` (1000 ms, game.h 524) after each answer (275). Round trip is the timer elapsed at the answer (268). `isConnectionOk` is true while the last read is under 5000 ms (1691).

Tick: step timing is per beat (b). No fixed server tick loop was found in this repo, and no simulation tick was found in `src/client`; the client draws and predicts.

## 2. Key functions

- `Creature::getStepDuration`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/creature.cpp` 1114-1162. Speed-to-time, beat rounding, walk-draw duration and the camera padding.
- `LocalPlayer::canWalk`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/localplayer.cpp` 38-63. The gate order in section 1(c).
- `LocalPlayer::walk`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/localplayer.cpp` 65-79. Confirm-or-clear on server step.
- `LocalPlayer::registerAdjustInvalidPosEvent`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/localplayer.cpp` 106-113. The timeout that clears the queue.
- `LocalPlayer::cancelWalk`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/localplayer.cpp` 146-166. Server refusal path.
- `Creature::nextWalkUpdate` and `Creature::updateWalk`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/creature.cpp` 788-830. The clock-driven walk progress.
- `Game::ping` and `Game::processPingBack`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/game.cpp` 1668-1679 and 261-276.
- Lua gate: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_walk/walk.lua` 75-122 (the walk function).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Step time = base cost x 1000 / speed, then rounded UP to whole server beats, so every step ends on a tick boundary | Beat 50 ms default (theirs, game.h 523; the real value is sent at login, protocolgameparse.cpp 731). Rounding applies from client version 860 (theirs, creature.cpp 1140). |
| Tile base cost with a fallback | Fallback 150 when the tile has no ground speed (theirs, creature.cpp 1129). |
| Predict up to a cap of queued moves, confirm on match, clear on mismatch | `walkMaxSteps` default 1 (theirs, game.h 521). The gate is `size > walkMaxSteps` (localplayer.cpp 50), so with the default the queue can hold 2 (derived from the code, not run). |
| Lock input after a refusal; lock is only extended | Lock 250 ms default (theirs, localplayer.h 32). Lua lock after auto-walk stop = step + 50 ms (theirs, walk.lua 96). |
| Give up on the prediction after max(step, ping) + 100 ms, capped | +100 ms and cap 1000 ms (theirs, localplayer.cpp 112). |
| Walk visual time per sprite pixel | Cap `FPS60` on walk-draw duration (theirs, creature.cpp 1146; the constant value was not read). |
| Ping one at a time, schedule next after answer | Ping delay 1000 ms (theirs, game.h 524). Connection OK under 5000 ms (theirs, game.cpp 1691). |
| Camera-following player waits longer for each queued step | +10 ms per queued pre-walk (theirs, creature.cpp 1158). Client-only. |

## 4. TypeScript sketch

simplified: the sketch keeps the step-time rounding, the queue gate order (lock, then queue cap, then step timer), confirm-or-clear on server step, the server refusal lock and the adjust timeout. It omits: the diagonal step cost, the speed guard (1116-1117), the auto-walk path and its retry counter, the Lua input buffering (`nextWalkDir`), the turn lock, the camera padding, the ping loop, the map-tile walking-creature checks (`onWalking`) and the Lua callbacks. It also reorders nothing except that `shown()` is a method here where the donor uses the queue back as the displayed position.

```ts
// Licence: MIT (donor LICENSE line 1). Clean-room shape of the donor mechanism, not a line translation.
type Pos = { x: number; y: number };
const samePos = (a: Pos, b: Pos): boolean => a.x === b.x && a.y === b.y;

// Step time for one tile: 1000 * ground speed / creature speed (integer ms), rounded UP to whole server beats.
export function stepDurationMs(groundSpeed: number, speed: number, beatMs: number): number {
  const ground = groundSpeed === 0 ? 150 : groundSpeed; // fallback when a tile carries no ground speed
  const raw = Math.floor((1000 * ground) / speed);
  return Math.floor((raw + beatMs - 1) / beatMs) * beatMs;
}

// Client-side prediction of the local player's steps, reconciled by the server.
export class PredictedWalk {
  private queue: Pos[] = [];   // predicted steps not yet confirmed by the server
  private lockUntil = 0;       // no prediction and no new step while locked
  private stepEndsAt = 0;      // when the current predicted step is due to finish
  private confirmed: Pos;      // last server-confirmed position

  constructor(start: Pos) {
    this.confirmed = start;
  }

  // Where the player is drawn: the end of the queue, or the confirmed position when nothing is predicted.
  shown(): Pos {
    return this.queue.length > 0 ? this.queue[this.queue.length - 1] : this.confirmed;
  }

  lock(now: number, ms: number): void {
    this.lockUntil = Math.max(this.lockUntil, now + ms); // a lock can only be extended
  }

  // Order of checks: lock, then queue cap, then step timer.
  canPredict(now: number, walkMaxSteps: number): boolean {
    if (now < this.lockUntil) return false;
    if (this.queue.length > walkMaxSteps) return false;
    return now >= this.stepEndsAt;
  }

  predict(now: number, next: Pos, stepMs: number): void {
    this.queue.push(next);
    this.stepEndsAt = now + stepMs;
  }

  // A server step arrives. If it matches the front of the queue it confirms that prediction;
  // any other server step drops the whole queue.
  onServerStep(to: Pos): void {
    if (this.queue.length > 0 && samePos(this.queue[0], to)) {
      this.queue.shift();
    } else {
      this.queue = [];
    }
    this.confirmed = to;
  }

  // Server refused the move: drop predictions and lock for a short time (donor default 250 ms).
  onServerCancel(now: number, lockMs = 250): void {
    this.queue = [];
    this.lock(now, lockMs);
  }

  // If the server never confirms, the queue is dropped after max(step, ping) + 100 ms, capped at 1000 ms.
  adjustTimeoutMs(stepMs: number, pingMs: number): number {
    return Math.min(Math.max(stepMs, pingMs) + 100, 1000);
  }

  onAdjustTimeout(): void {
    this.queue = [];
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module, engine tick): the beat grid for movement steps, and the movement-only prediction queue. Parity row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget" (addendum; the server tick has no row of its own, so it sits under row 18). Input intake overlaps row 5 (controls/input) for the lock and the queue gate.
- Reuse tag: adapt-allowed (MIT, code may be adapted; the sketch is written from the mechanism)
- Brief rule served: 1 (one engine: the step grid is an engine rule, not a client rule); server-verified kills (a predicted move is never a kill)

## 6. Gaps and risks

- The donor is the client. The server tick loop is not in this repo, so this note covers only the client half and the beat number the server sends. Frankendom would still need its own fixed-step server loop; nothing here sets one.
- Prediction is for movement only. Frankendom's rulings say kills are server-verified. Do not predict damage, guard, parry or a kill on the client; the donor predicts only steps.
- Rounding step time up to the beat means a step can take up to one beat longer than its raw time. Frankendom must choose the beat and test the feel at the donor's 50 ms default and at larger beats.
- The queue cap is data-like (`walkMaxSteps` default 1) but the donor's gate is `size > walkMaxSteps`, so the effective queue is one more than the number. Frankendom should state the number it means, and test it.
- Ordering: the donor checks the lock before the queue cap and the queue cap before the step timer. Frankendom must pick one order and test it; a different order changes what a player feels after a refusal.
- The adjust timeout and the server cancel are two separate recovery paths. Frankendom should keep one (server cancel) and drop the timeout unless a real case needs it.
- Not read: the dispatcher loop (`g_dispatcher`), `Creature::terminateWalk` body, `retryAutoWalk` start (before line 130; only the counter check at 129 was grep'd), the speed guard (1116-1117), `Game::walk` callers beyond the Lua gate, and the server packet path into `map.cpp:203`.
