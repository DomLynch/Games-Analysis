# keldaanCommunity-pokemonAutoChess (animation-rigs, cell 2)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/attacking-state.ts` (wind-up, flight, cooldown: 22-25, 96-101, 125-144) with `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/simulation-command.ts` (queued hit: 14-15, 52-53), `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-entity.ts` (321), `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/animation-manager.ts` (clip mapping, locks, time scale: 300-478), `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/pokemon-sprite.ts` (attack visuals and lock release: 285-288, 487-551), `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/battle-manager.ts` (client attack trigger: 481-488) | Licence: GPL-3.0 (`/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/LICENSE`, "Version 3, 29 June 2007", standard GPL v3 text) | TypeScript | symbol `getAttackTimings`

Checked: the hint file `sprite-tracker.tsx` is a sprite-gap list UI, not animation (header read, lines 1-60); it is not the mechanism. Read in full: `getAttackTimings` (core/attacking-state.ts 125-144), `SimulationCommand` and `AttackCommand` (core/simulation-command.ts 1-56), `resetCooldown` (pokemon-entity.ts 320-322). Read in part: attacking-state.ts 1-150 (target choice lines 35-80 only partly read), animation-manager.ts 1-28 and 296-478, pokemon-sprite.ts 262-306, 440-460, 484-562, battle-manager.ts 168-192 and 470-500, board-manager.ts 156-190, rooms/game-room.ts 712-728, core/simulation.ts 1296-1320, core/idle-state.ts 40-60. Callers checked: `getAttackTimings` is called by the server attack state (attacking-state.ts 97) and by the client on attack-count change (battle-manager.ts 488), so one function feeds both sides; `attackAnimation` has the battle-manager caller and a debug-scene caller (debug-scene.ts 469). Camera scope: not a camera cell. Confidence: high on the server timing (read end to end, numbers checked against the lines); medium on the client clip stretch, because it depends on Phaser treating `timeScale` as a divisor of frame time, which I did not read (Phaser is not in the donor tree). Not read: what `state.attack` does when the target has died or moved in flight; the per-creature generator for `types/delays.json`; the EAT-to-SLEEP fallback body (animation-manager.ts 376-386); Colyseus `setTimestep` internals.

Best transferable idea: derive the attack's length from one speed number, put the hit on the animation's hit frame as a share of that length (never less than half), add flight time from distance, and resolve the damage as a delayed command when it expires, so the clip, the projectile and the server hit share one clock.
Decision (proposed): adapt - take the timing chain (length, hit-frame share with a half floor, flight from distance and speed, delayed resolve if the attacker can still attack) as the engine's attack timing; take the hit frame and frame count as per-creature catalogue data (row 21); do not take the overlap behaviour (see section 6). The presentation half (clip stretch, projectile, latency offset) belongs to the client actor step.
Acceptance: a server test with speed 100, hit frame 9 of 21 and a target 4 cells away asserts the hit resolves 1121 ms after the attack starts (455 ms wind-up, 667 ms flight); the client clip for that creature ends at 909 ms (if the clip scale is applied as the donor does).

## 1. Mechanism

One basic attack, in order (server, `core/attacking-state.ts`):
1. Each update, if `pokemon.cooldown <= 0` (line 22), the state resets the cooldown to the attack length: `resetCooldown(1000, speed)` (24), which computes `Math.round(1000 / (0.4 + speed * 0.007))` (pokemon-entity.ts 321). Speed is halved while paralysed (23, 130). Otherwise the cooldown counts down by `dt` (109).
2. Target choice (lines 26-80, partly read). If the creature has full PP and can cast, it casts its ability instead of a basic attack (the cast branch is not described here).
3. A basic attack increments `attackCount` (96), which the client watches. It then calls `getAttackTimings` (97) and queues an `AttackCommand` with delay `delayBeforeShoot + travelTime` (100).

`getAttackTimings` (125-144), the one shared function:
- `attackDuration = 1000 / (0.4 + speed * 0.007)` ms (131). Speed 0 gives 2500 ms; speed 100 gives about 909 ms.
- Per creature, `d` (the hit frame) and `t` (total frames) come from `types/delays.json` with defaults 18 and 36 (132-133). Example: the entry `"1000":{"d":9,"t":21}` (delays.json line 1).
- `delayBeforeShoot = max(attackDuration / 2)((attackDuration * d) / t)` (135): the hit frame's share of the attack, never less than half the attack length.
- `travelTime = distance * 1000 / (BASE_PROJECTILE_SPEED * (1 + speed / 100))` (143), with `BASE_PROJECTILE_SPEED = 3` (config/game/battle.ts 10) and Chebyshev distance (utils/distance.ts 3). Melee attacks use the same flight time, so a one-cell melee hit still waits the flight time.

Resolution (server, `core/simulation-command.ts` and `core/simulation.ts`): the simulation calls `command.update(dt)` on every queued command each update (simulation.ts 1314). Each command subtracts `dt` (14) and runs when the delay is below zero (15). `AttackCommand.execute` calls `state.attack(pokemon, board, target)` only if the attacker still `canAttack` (52-53). The target is the object captured when the attack was queued. The `dt` comes from the room timestep, clamped to 50 ms (game-room.ts 716-719; config/server/network.ts 12).

Presentation (client, `public/src/game/`):
- `battle-manager.ts` 481-488: when `attackCount` changes while the creature's action is ATTACK, the client calls the same `getAttackTimings` on its synced state and then `attackAnimation(targetX, targetY, delayBeforeShoot, travelTime)`.
- `pokemon-sprite.ts` 487-551: the attack effect starts `delayBeforeShoot - 20` ms in (LATENCY_COMPENSATION = 20, lines 497 and 528). A ranged projectile tweens to the target with a random jitter of plus or minus 5 px (547-548), duration `min(250)(travelTime)` ms (550), and the same delay (551).
- `animation-manager.ts` 473-476: the attack clip's `timeScale = t * (0.4 + speed * 0.007) / 36`, with 36 fps (27). If Phaser divides frame time by `timeScale`, the clip lasts `(t / 36) / timeScale = 1 / (0.4 + speed * 0.007)` s, which equals `attackDuration`. That is the design intent visible in the numbers; the Phaser semantics were not read.

Clip state machine (`animation-manager.ts` 300-333, 336-418): the server's action enum maps to a clip per creature (HOP, FISH, BLOSSOM, NEST to hop; HURT to hurt; SLEEP; EAT; WALK and COOK to walk; ATTACK and TRAINING to attack; EMOTE; ABILITY; IDLE and the default to idle; cases at 314 and 323). Two overrides: a DRUMMER creature that walks with no target plays its emote (361-364), and EAT falls back to SLEEP if the eat clip is missing (377 comment, code 376-386 not fully read).

Locks: HOP, HURT and EMOTE lock the sprite (347-350, set at 468). A locked sprite ignores new clips (425) until the animation-complete event clears the lock (pokemon-sprite.ts 285-286) and re-applies the creature's current action (288). Attack, walk and idle are not locked and replace the current clip at once. A looping clip that is already playing is not restarted (449-452).

Hit reaction: none per hit. In the code I read, HURT is set for resurrection (core/idle-state.ts 52), for the client death (battle-manager.ts 182, then the death tween), and for the losing avatar (board-manager.ts 163, 183). A landed hit does not change the clip.

## 2. Key functions

- `getAttackTimings`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/attacking-state.ts` 125-144. Length, wind-up, flight. Read in full.
- `AttackingState.update`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/attacking-state.ts` 16-110. Cooldown, target choice (partly read), basic attack queue at 96-101.
- `AttackCommand`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/simulation-command.ts` 34-56. Delayed hit; the execute guard at 52.
- `SimulationCommand.update`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/simulation-command.ts` 13-19. Countdown by dt.
- `resetCooldown`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-entity.ts` 320-322. Cooldown from the attack length.
- `getAttackAnimTimeScale`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/animation-manager.ts` 473-477. Client clip stretch.
- `animatePokemon` and `play`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/animation-manager.ts` 336-472. State to clip, lock, repeat guard.
- `attackAnimation`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/pokemon-sprite.ts` 487-551. Client visual with latency offset.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (theirs) |
|---|---|
| Attack length from speed | `1000 / (0.4 + speed * 0.007)` ms (attacking-state.ts 131) |
| Cooldown after an attack | same length, rounded (pokemon-entity.ts 321; base 1000 at attacking-state.ts 24) |
| Paralysis | speed halved for timing (attacking-state.ts 130) |
| Hit frame share | `attackDuration * d / t`, floored at `attackDuration / 2` (attacking-state.ts 135) |
| Hit frame defaults | d = 18, t = 36 when no entry (attacking-state.ts 132-133) |
| Flight time | `distance * 1000 / (3 * (1 + speed / 100))` (attacking-state.ts 143; battle.ts 10) |
| Distance | Chebyshev, `max(|dx|, |dy|)` (utils/distance.ts 3) |
| Simulation dt cap | 50 ms (config/server/network.ts 12) |
| Client visual lead | 20 ms (pokemon-sprite.ts 497) |
| Client projectile jitter | plus or minus 5 px (pokemon-sprite.ts 547-548) |
| Client projectile tween cap | 250 ms (pokemon-sprite.ts 550) |
| Client clip frame rate | 36 fps (animation-manager.ts 27) |

Units: server time is ms; `distance` is in cells; speed is the creature's speed stat (the donor's stat scale is not read).

Worked check: speed 100 gives `attackDuration = 909.09` ms. With d = 9, t = 21 the hit share is 389.6 ms, below the floor of 454.5 ms, so the wind-up is 454.5 ms. A target 4 cells away gives flight `4000 / (3 * 2) = 666.67` ms. The hit resolves at 1121.2 ms after the attack starts.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's formulas and order: attack length, hit-frame share with the half floor, flight from distance, the cooldown, the delayed hit that resolves only if the attacker can still attack, and the client clip stretch and visual lead. It omits the cast branch, target choice and retargeting, the damage call inside `state.attack`, the Chebyshev helper (distance is passed in as cells), the client tween and jitter, the lock and clip mapping, and the EAT fallback. The queue resolves hits in array order, which the donor also does, but the donor does not sort by due time.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface HitData {
  hitFrame: number;     // frame index of the hit inside the attack clip (catalogue, per creature)
  totalFrames: number;  // frames in the attack clip (catalogue, per creature)
}

export interface Attacker {
  speed: number;
  paralysed: boolean;   // halves speed for timing
}

export interface AttackTimings {
  attackMs: number;     // full attack length; also the cooldown before the next attack
  windUpMs: number;     // time from attack start to the hit frame, never less than half the attack
  flightMs: number;     // projectile flight time from distance
}

const BASE_PROJECTILE_SPEED = 3;      // cells per second before the speed factor
const LATENCY_COMPENSATION_MS = 20;   // client only: the visual starts this much early

export function attackTimings(a: Attacker, hit: HitData, distanceCells: number): AttackTimings {
  const speed = a.paralysed ? a.speed / 2 : a.speed;
  const attackMs = 1000 / (0.4 + speed * 0.007);
  const windUpMs = Math.max(attackMs / 2, (attackMs * hit.hitFrame) / hit.totalFrames);
  const flightMs = (distanceCells * 1000) / (BASE_PROJECTILE_SPEED * (1 + speed / 100));
  return { attackMs, windUpMs, flightMs };
}

// Cooldown set when an attack starts; the next attack may start when it reaches zero.
export function cooldownAfterAttack(a: Attacker): number {
  const speed = a.paralysed ? a.speed / 2 : a.speed;
  return Math.round(1000 / (0.4 + speed * 0.007));
}

// Delayed hits. Each tick subtracts dt; a hit resolves once its delay is below zero,
// and only if the attacker can still attack at that moment.
export interface PendingHit {
  remainingMs: number;
  attackerCanAttack: () => boolean;
  resolve: () => void;
}

export class HitQueue {
  private items: PendingHit[] = [];

  push(hit: PendingHit): void {
    this.items.push(hit);
  }

  tick(dt: number): void {
    for (const h of this.items) h.remainingMs -= dt;
    const due = this.items.filter((h) => h.remainingMs < 0);
    this.items = this.items.filter((h) => h.remainingMs >= 0);
    for (const h of due) {
      if (h.attackerCanAttack()) h.resolve();
    }
  }

  get pending(): number {
    return this.items.length;
  }
}

// Client presentation: the attack clip is stretched so it lasts attackMs, given its own frame count.
export function attackClipTimeScale(hit: HitData, speed: number, fps = 36): number {
  return (hit.totalFrames * (0.4 + speed * 0.007)) / fps;
}

// Client presentation: the visual starts this long after the attack starts.
export function clientVisualDelayMs(windUpMs: number): number {
  return windUpMs - LATENCY_COMPENSATION_MS;
}
```

## 5. Lands in

- TARGET `src/fight/attack-timing.ts` (new, engine, server side): wind-up, flight, cooldown and the pending-hit queue for basic attacks. Parity-checklist row 1 (duel step / sim). The client half (clip stretch and visual lead) is the actor step of row 7 (creature clips) and is not a second target here.
- Server tick sub-line: the queue advances once per simulation update with the room's dt (simulation.ts 1314; game-room.ts 716-719), which is the "server tick: fixed step, input intake, per-tick NPC budget" line under row 18 / post-K item 3. The donor does not tell us whether the step is fixed; the timestep helper was not read.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, two clients: the hit is resolved by the engine and the client only shows it); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch was written from the mechanism and typechecks with `tsc --strict`.
- Overlapping hits: the attack starts again when the cooldown (the attack length) is spent, but the hit lands at wind-up plus flight. When flight is long, the next attack starts before the previous hit lands, and both `AttackCommand`s are queued (attacking-state.ts 97-101; simulation-command.ts 52-53 checks only `canAttack`). For Frankendom, each hit must be its own ledger entry with its own check, and the MAX_ATTACKERS = 3 rule must count pending hits as well as live attackers. Do not copy the overlap.
- Target that dies or moves in flight: the donor passes the captured target to `state.attack`. What happens to a dead target was not read. Frankendom's kills are server-verified, so the hit must re-check the target at resolution time.
- Client timing reads the synced state when the attack count changes. If the attacker's speed or position changed in between, the client's wind-up and flight can differ from the server's. Not measured.
- The client clip stretch depends on Phaser's `timeScale` semantics, which are not in the donor tree. Verify in Frankendom's own renderer before using the same formula.
- Data: `d` and `t` are per creature and come from a generated table (types/delays.json, 27 KB). In Frankendom they are catalogue fields (row 21), so each creature's hit frame is data, not a constant.
- Hit reaction: the donor has no per-hit reaction. If Frankendom wants one, it needs its own design; this donor does not supply it.
- The `dt` clamp of 50 ms means a long stall shortens the simulated time, so the hit can resolve later in wall time than the wind-up says. Note this for the server tick rule.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine, two clients); rules 7-9 n/a
