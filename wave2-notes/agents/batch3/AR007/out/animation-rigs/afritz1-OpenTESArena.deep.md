# afritz1-OpenTESArena (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` | Licence: MIT (`LICENSE.txt` reads "The MIT License (MIT)", copyright 2016-2026 The OpenTESArena Developers) | C++ | symbol `EntityChunkManager::updateEnemyBehaviors` (with `EntityAnimationInstance`, `GetEnemyNextWeaponSwingSeconds`, `FrameTimer`)

Checked: `updateEnemyBehaviors` (EntityChunkManager.cpp 1509-1702) read in full on the VPS. Also read in full: `EntityAnimationInstance.h` and `.cpp`, `ArenaAnimUtils.h` (constants), `ArenaAnimUtils.cpp` attack-state builders (402, 473), `EntityAnimationDefinition.h`, `EntityAnimationUtils.h`, `Game/Game.cpp` `FrameTimer` (76-135) and the frame loop (840-945), `Options.h` (MIN_FPS), `Collision/Physics.h` (DeltaTime). `CombatLogic::onPlayerHitByEntity` read only to line 560: the hit roll and the miss sound (537-541); the damage roll after line 544 is not read. Callers: `updateEnemyBehaviors` has one caller (EntityChunkManager.cpp 2222), so its behaviour is the same for all callers. For enemies, `EntityAnimationInstance::update` is called in the entity loop (2202); the other `animInst.update` calls (`VoxelChunk.cpp` 438 and 503) were not checked for type and are not used here. Not read: the game data behind the attack clip (keyframe counts for real creatures), the sound and effect code, and the rest of the damage path. Confidence: high on the swing state machine and the numbers; high that the hit gate is at progress 0.50 as written (the code says so); the donor's own comment says the wind-up timing is "Arbitrary timing, tbd difficulty settings" (line 195), so the numbers are not designed values. Camera: not a camera cell.

Best transferable idea: gate an enemy's hit on its attack clip's own progress (one hit per swing, at 50% of the clip, and only if the target is still inside the reach band at that moment), with the swing ending when the clip ends, instead of a separate hit timer.
Decision (proposed): adapt — keep the shape (hit at a data fraction of the swing, once per swing, reach checked at the hit moment, swing ends on clip time), but the clock is the engine's fixed server tick and the clip supplies only duration and hit fraction, because Frankendom's kills are server-verified and the donor runs everything on the client's variable frame time.
Acceptance: a server test with a 14-frame swing (1.0 s) asserts one hit at t = 0.50 s for a player inside 1.15 units at that moment, no hit for a player who left the band before 0.50 s, and the swing still ends at 1.0 s.

## 1. Mechanism

- The loop: a variable frame step. Each frame's time is clamped to at most 1/15 s (Game.cpp 132, from MIN_FPS = 15 in Options.h 63); above 15 FPS the clock is the real frame time, and below it the game runs in slow motion (Game.cpp 78 comment). The clamped time `clampedDeltaTime` goes to `tickEntitiesPrePhysicsStep` (Game.cpp 939), then to `updatePrePhysicsStep` (GameState.cpp 1789). Physics gets `ceil(clampedDeltaTime / DeltaTime)` steps, with DeltaTime = 1/240 s (Physics.h 27; Game.cpp 133, 940), so each physics step is at most 1/240 s. The enemy logic is not in the physics steps; it runs once per frame.
- Order inside one frame of `updatePrePhysicsStep`: (a) every entity's animation advances by dt, clamped to the clip length (2199-2203; `EntityAnimationInstance::update`, EntityAnimationInstance.cpp 70 and 73); (b) then `updateEnemyBehaviors` runs (2222). So the hit gate in (b) reads the progress after this frame's advance.
- The enemy state machine, per frame, per enemy (1516-1701; enemies in death state are skipped at 1520):
  - Idle to MovingToPlayer when the player is inside the detect band: horizontal distance squared at most 4.0 squared (1574, constant 42), and vertical distance squared at most twice that (1574).
  - MovingToPlayer to Idle when the player is beyond 6.0 horizontally (1575, constant 44) or the vertical distance squared is above twice that (1575).
  - MovingToPlayer walks at 1.50 units per second toward the player (1606), stopping if the next position is not floor (1619-1630).
  - MovingToPlayer to AttackPlayer when inside the reach band start: horizontal distance squared at most 1.0 squared (1576, constant 46), vertical distance squared at most twice that (1576). The enemy stops, sets the Idle clip, and sets the wind-up timer to `random.nextReal() * 0.75` seconds (1637-1640; 193-196).
  - AttackPlayer, not attacking: if the player is beyond the reach stop (1.15 horizontally, constant 48, or vertically beyond twice that, 1577), go back to MovingToPlayer with the walk clip (1648-1653). Otherwise count the wind-up down by dt (1656). At zero: reset the once-per-swing flag and set the Attack clip (1662-1664). The swing starts at progress 0; the first advance comes next frame.
  - AttackPlayer, swinging: the hit is allowed when no hit has been made this swing and `animInst.progressPercent >= 0.50` (1668). When allowed it sets the flag (1671) and, if the player is still inside the reach band (1673), calls `CombatLogic::onPlayerHitByEntity` (1675). Then if `animInst.isFinished()` is false, wait (1679-1682). When finished: if the player is beyond the reach stop, go to MovingToPlayer and walk (1685-1690); otherwise draw the next wind-up, reset the flag and go to Idle (1693-1695).
- Clip timing: the attack clip is not looping (ArenaAnimUtils.h 51). Its length is keyframe count times 1/14 s (ArenaAnimUtils.h 45; ArenaAnimUtils.cpp 402 for creatures; 473 for humans, which reuses the same rate, ArenaAnimUtils.h 61). A clip with 14 keyframes is 1.0 s, so its hit gate opens at 0.5 s. This is arithmetic from the constants; no real clip was measured.
- Finished: `isFinished()` is true when the clip is not looping and progress equals 1.0 (EntityAnimationInstance.cpp 15). Progress is `currentSeconds / targetSeconds` clamped to 0..1 (73).
- The rendered frame uses the same progress: `floor(keyframeCount x progress)`, clamped to the last keyframe (1790-1791). The picture and the hit gate read one value.
- Tick: one variable step per frame for the enemy logic and animation. No accumulator. The hit timing is therefore frame-rate independent only as far as the 1/15 s clamp allows.

## 2. Key functions

- `EntityChunkManager::updateEnemyBehaviors`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 1509-1702. The whole state machine. The swing part is 1642-1696.
- Swing hit gate (inside it): `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 1668-1677 (progress at least 0.50, once per swing, reach checked at the hit).
- Wind-up helper: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 193-196 (random times 0.75 seconds).
- Frame update order: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 2199-2222 (animations advance, then the enemy step).
- `EntityAnimationInstance::update` and `isFinished`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityAnimationInstance.cpp` 58-74 and 13-16.
- Frame timer: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/Game.cpp` 76-135 (clamp at 132, physics steps at 133).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| The hit lands at a fixed fraction of the attack's own timeline, once per swing | Gate at 0.50 (theirs, EntityChunkManager.cpp 1668) |
| Reach checked at the moment of the hit, and again at the start of a swing and at its end | Reach stop 1.15 (theirs, 48) |
| Start band smaller than stop band (hysteresis): an enemy starts an attack inside 1.0 and gives up beyond 1.15 | Start 1.0 (theirs, 46); stop 1.15 (theirs, 48) |
| Detect band with its own hysteresis: start inside 4.0, stop beyond 6.0 | Start 4.0 (theirs, 42); stop 6.0 (theirs, 44) |
| Wind-up is a random fraction of a maximum | Maximum 0.75 s (theirs, 196; the donor comment says "tbd difficulty settings", line 195) |
| Clip seconds = frame count times a fixed seconds-per-frame | 1/14 s per frame, not looping (theirs, ArenaAnimUtils.h 45 and 51) |
| Frame time clamped so a long frame cannot skip the state machine far ahead | Max 1/15 s (theirs, from MIN_FPS 15, Options.h 63) |
| Physics advanced in fixed sub-steps inside a variable frame | 1/240 s (theirs, Physics.h 27) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order inside one swing: advance the swing clock, then the once-per-swing hit gate at 50% with the reach checked at that moment, then the finish test. It omits the detect and walk states, the floor check, the vertical band (the donor's reach tests are squared horizontal OR squared vertical beyond the band; the sketch uses horizontal only), the animation and sound calls, the death-state skip, and the damage path. It takes the swing duration in seconds as an argument (keyframes / 14 in the donor) and takes the RNG value as a number in [0, 1). The wind-up cancel in the donor happens before the countdown; the sketch does the same for horizontal distance only. Double precision as in the donor.
```ts
// Licence: MIT (OpenTESArena LICENSE.txt). Shape re-typed from the donor's enemy swing logic; numbers as in the donor.
export interface SwingState {
  phase: "windup" | "swing";
  windupLeft: number; // seconds until the next swing starts
  elapsed: number;    // seconds into the current swing (the clip's own timeline)
  hitDone: boolean;   // at most one hit per swing
}

export const HIT_AT = 0.5;        // hit gate: swing progress >= 50%
export const WINDUP_MAX_S = 0.75; // wind-up is a random fraction of 0.75 s
export const MELEE_START = 1.0;   // horizontal distance to start a swing
export const MELEE_STOP = 1.15;   // horizontal distance that cancels a swing (hysteresis band)
export const CLIP_FPS = 14;       // attack clip: keyframe count / 14 seconds

// unitRandom is a value in [0, 1) supplied by the caller's RNG.
export function startWindup(unitRandom: number): SwingState {
  return { phase: "windup", windupLeft: unitRandom * WINDUP_MAX_S, elapsed: 0, hitDone: false };
}

export function swingSecondsFromFrames(frameCount: number): number {
  return frameCount / CLIP_FPS;
}

// One frame of the enemy swing. Returns what happened this frame.
export function stepSwing(
  s: SwingState,
  distXZ: number,
  dt: number,
  swingSeconds: number,
  onHit: () => void,
): "windup" | "swinging" | "finished" | "cancelled" {
  if (s.phase === "windup") {
    if (distXZ > MELEE_STOP) return "cancelled";
    s.windupLeft -= dt;
    if (s.windupLeft > 0) return "windup";
    // The swing starts at progress 0; it advances from the next frame on.
    s.phase = "swing";
    s.elapsed = 0;
    s.hitDone = false;
    return "swinging";
  }

  // Advance the swing clock first; the donor advances animations before the enemy step.
  s.elapsed = Math.min(s.elapsed + dt, swingSeconds);
  const progress = s.elapsed / swingSeconds;

  // Hit gate: once per swing, at 50% progress, and only if still in range at that moment.
  if (!s.hitDone && progress >= HIT_AT) {
    s.hitDone = true;
    if (distXZ <= MELEE_STOP) onHit();
  }

  if (progress < 1) return "swinging";
  // Finished: the caller decides between walking away and the next wind-up.
  return "finished";
}

export {};
```

Typecheck: the block (with `export {};`) was run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` and exited 0.

## 5. Lands in

- TARGET `src/fight/swing.ts` (new, engine module, run on the server tick; the client only draws the clip). Parity-checklist row 7 (creature actor/clips). The hit itself goes through the one damage path, not from this module.
- Reuse tag: adapt-allowed (MIT: keep the copyright notice when code is copied); shape only in the sketch.
- Brief rule served: one engine (the swing and its hit gate are engine logic, not the clip); server-verified kills (the hit is decided on the server clock); zones as data (the reach, detect and wind-up numbers are data per creature or encounter).

## 6. Gaps and risks

- Client clock: in the donor the swing clock is the client's animation progress, advanced by the variable frame time. Frankendom must not take the hit timing from the client. The server runs the swing on its fixed tick and the clip supplies duration and hit fraction as data.
- Variable step: the donor's clamp at 1/15 s makes the game run in slow motion below 15 FPS (Game.cpp 78). A slow frame changes the enemy's timing as well as the picture. A fixed server tick removes this, but the server must still agree on the swing length.
- No cap on attackers: each enemy runs its own state machine in one loop (1516), and the donor has no shared cap. Frankendom's MAX_ATTACKERS = 3 must be enforced in the engine, not by this code.
- Wind-up: one uniform random in 0 to 0.75 s with no difficulty (195-196). Frankendom needs a per-creature or per-encounter range as data.
- The reach test is horizontal-or-vertical squared with a vertical band (1574-1577). The sketch drops the vertical band. Frankendom would need one rule for climbing and jumping players.
- The hit is applied by `CombatLogic::onPlayerHitByEntity` (1675) with a hit roll (CombatLogic.cpp 537-541). The damage path after line 544 was not read, so the one-ledger rule is not checked here.
- Order of steps: the donor advances animations before the enemy step, so the hit gate sees this frame's progress. The server must pick one order and test it.
- Between the hit and the finish the donor makes no reach check. A player who is inside the band at 50% is hit even if they leave before the swing ends. That is the donor's rule; Frankendom must decide whether it wants it.
- Not read: real clip keyframe counts (the 14-keyframe example is arithmetic), the sound and effect code, and the damage after line 544.
