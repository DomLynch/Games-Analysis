# afritz1-OpenTESArena (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` | Licence: MIT (LICENSE.txt line 1: "The MIT License (MIT)"; code may be adapted with the notice kept) | C++ | symbol `EntityChunkManager::updateEnemyBehaviors`

Checked: `updateEnemyBehaviors` runs 1509-1702 (read in full). Its constants are at 42-49 and the swing timer helper at 193-197 (read). The only caller is `updatePrePhysicsStep` at 2222 (grep for the name found no other call). The hit resolver `CombatLogic::onPlayerHitByEntity` starts at CombatLogic.cpp 507; I read 507-580 only, so the end of the damage path (armour, player health) is not read. The `isMeleeHitSuccessful` formula was not opened. Confidence: high on the state machine, medium on how hits are finally applied. The mechanism is the whole donor AI: there is no threat table and no flee.

## 1. Mechanism

- Per tick, every cached enemy (list filled when the entity is created, 1039) that is not in its death state (1520) is stepped. The only thing it ever targets is the player: it takes `playerPosition - entityPosition` (1527), splits it into an XZ part and a Y part, and normalises the XZ part into a facing direction (1532-1542; if the player stands exactly on it, it faces north).
- Four range tests are computed first (1574-1577), each as squared distance in XZ and squared distance in Y, with the Y band set at twice the squared radius ("Treat XZ and Y distances separately so the enemy doesn't move closer if the player jumps", 1573). Two pairs form hysteresis: wake at 4.0, give up at 6.0; start attacking at 1.0, stop attacking at 1.15.
- Three states, started in `Idle` (247):
  - `Idle`: do nothing until the player is inside the wake radius (1581-1584), then switch to `MovingToPlayer` and play the walk clip (1586-1587).
  - `MovingToPlayer`: face the player every tick (1591). If the player is beyond the give-up radius, go back to `Idle`, play idle and zero the body velocity (1596-1601). Otherwise, if not yet within the start-attack radius, step: velocity = facing x 1.50 (1606-1607); look at the voxel the next position falls in and only move if its floor voxel type is `Floor` (so enemies do not walk into chasms, 1609-1623); if blocked, zero velocity but stay in the walk clip (1625-1630); otherwise set the physics body velocity (1632-1633). Inside the start-attack radius: switch to `AttackPlayer`, draw a wind-up of random x 0.75 s, play idle, stop the body (1637-1640).
  - `AttackPlayer`: face the player every tick (1644). While not in the attack clip: if the player is beyond the 1.15 radius, reset the wind-up and go back to chase (1648-1654); else count the wind-up down by `dt` (1656) and when it is <= 0, clear `hasAttemptedHit` and start the attack clip (1662-1665). While in the attack clip: once the clip is at or past 50 percent and no hit has been attempted this swing, mark it attempted and, only if the player is still within the 1.15 radius, call the hit resolver (1668-1677). When the clip finishes: out of range goes back to chase; otherwise a new random wind-up is drawn and the enemy returns to idle clip (1679-1695).
- The hit itself is not decided here. `CombatLogic::onPlayerHitByEntity` rolls a hit-or-miss (`isMeleeHitSuccessful`, 537; a miss plays a clank and returns, 538-541) and then rolls damage as the creature's min plus a random range (576-577). Not read past 580.
- Tick: the loop is a variable step. `Game.cpp` measures the frame time and clamps it to at most 1/15 s (`MIN_FPS = 15`, `clampedDeltaTime`, 132; `maximumFrameDuration` set from `MIN_FPS` at 96). That clamped `dt` goes into `tickEntitiesPrePhysicsStep` (Game.cpp 939), which passes it to `updatePrePhysicsStep` (GameState.cpp 1789) and on to `updateEnemyBehaviors`. The physics engine then runs `ceil(dt / (1/240))` fixed sub-steps in the same frame (133, 940). So the AI timers (wind-up) use variable `dt`; only the body movement is sub-stepped. There is no accumulator in the AI.
- All callers: the AI function has one caller (2222). `setEnemyBehaviorState` (2033) looks like an external hook to force a state but it calls `DebugNotImplemented()` and nothing calls it, so there is no "wake on damage" path in what I read.

## 2. Key functions

- `EntityChunkManager::updateEnemyBehaviors`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 1509-1702. The whole brain: range tests, three-state machine, chase step, swing timing, hit gate.
- `GetEnemyNextWeaponSwingSeconds`: same file 193-197. Wind-up between swings is uniform random 0 to 0.75 s ("Arbitrary timing, tbd difficulty settings").
- Range constants: same file 42-49 (squared forms derived at 43, 45, 47, 49).
- `CombatLogic::onPlayerHitByEntity`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Combat/CombatLogic.cpp` 507-580 (read to 580 only): hit roll, then damage roll by creature or human weapon.
- Frame timing: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/Game.cpp` 78-135 (`FrameTimer`), 939-940 (entity pre-physics tick, physics update).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two radii per transition (wake < give up; start attack < stop attack) so units do not flicker at a boundary | 4.0 / 6.0 and 1.0 / 1.15 world units (theirs, 42-48); Y band = 2x squared radius (1574) |
| Idle / chase / attack states with facing updated every tick | State names |
| Random wind-up between swings so a group does not hit in lockstep | uniform 0..0.75 s (theirs, 196) |
| Hit lands once per swing at a fixed point in the swing, and only if still in reach at that moment | 50 percent of the clip (theirs, 1668) |
| Chase step is refused if the next cell is not walkable | Floor voxel test (theirs, 1622); chase speed 1.50 (theirs, 1606) |
| Out of range before a swing resets wind-up and returns to chase | 0 s reset (1650) |

## 4. TypeScript sketch

simplified: the sketch drops the Y-band test (Frankendom duels are planar), the walkability test, the animation system (it uses a swing timer in its place, with hit time as a fraction of swing length, which is how the donor reads the clip progress), physics bodies, the death skip and the hit/damage roll. It takes the target vector as input; the donor only ever targets the player and has no selection logic.

```ts
type Mode = 'idle' | 'chase' | 'attack';
interface Brain {
  mode: Mode;
  windup: number;       // seconds until the next swing starts
  swinging: boolean;
  swingT: number;       // seconds into the swing
  hitDone: boolean;     // this swing already tried its hit
}
interface BrainData {
  detectIn: number; detectOut: number;   // radius to wake / radius to give up (detectOut > detectIn)
  reachIn: number; reachOut: number;     // radius to start / stop attacking (reachOut > reachIn)
  speed: number; windupMax: number; swingLen: number; hitAt: number;
}
interface Out { vx: number; vy: number; dealHit: boolean }

// dx,dy = vector from enemy to target (the engine picks the target; see section 6).
function brainStep(b: Brain, d: BrainData, dx: number, dy: number, dt: number, rand: () => number): Out {
  const dist = Math.hypot(dx, dy);
  const out: Out = { vx: 0, vy: 0, dealHit: false };
  if (b.mode === 'idle') {
    if (dist <= d.detectIn) b.mode = 'chase';
    return out;
  }
  if (b.mode === 'chase') {
    if (dist > d.detectOut) { b.mode = 'idle'; return out; }
    if (dist > d.reachIn) {
      out.vx = (dx / dist) * d.speed; out.vy = (dy / dist) * d.speed;
      return out;
    }
    b.mode = 'attack'; b.windup = rand() * d.windupMax; b.swinging = false;
    return out;
  }
  // attack
  if (!b.swinging) {
    if (dist > d.reachOut) { b.mode = 'chase'; b.windup = 0; return out; }
    b.windup -= dt;
    if (b.windup > 0) return out;
    b.windup = 0; b.swinging = true; b.swingT = 0; b.hitDone = false;
    return out;
  }
  b.swingT += dt;
  if (!b.hitDone && b.swingT >= d.swingLen * d.hitAt) {
    b.hitDone = true;
    out.dealHit = dist <= d.reachOut;
  }
  if (b.swingT < d.swingLen) return out;
  b.swinging = false;
  if (dist > d.reachOut) { b.mode = 'chase'; return out; }
  b.windup = rand() * d.windupMax;
  return out;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, passed (file `work/tes-ai.ts` plus `export {}`).

## 5. Lands in

- TARGET `src/fight/brain.ts` (the AI brain's per-creature mode step; radii, speed, wind-up and hit point as catalogue fields). Parity-checklist row 4 (fight loop: aggro, chase, leash). The brain itself is row 2.
- today: not checked in this pass.
- Reuse tag: adapt (MIT; the shape is small enough to rewrite; keep the notice if any lines are copied)
- Brief rule served: 4 (fight loop); rules 7-9 n/a
- Best transferable idea: use paired inner/outer radii for wake/give-up and start/stop attack, with a random per-enemy wind-up before each swing, so a crowd chases and strikes out of step without any group coordination code.

## 6. Gaps and risks

- No target selection, no threat, no flee: the donor's enemy always chases the one player. Frankendom's many-on-one hate list and target choice must live in the engine and feed `dx,dy` into this step. This note covers only the chase/leash/swing shape.
- No attacker cap: every enemy inside 1.15 attacks independently on its own timer. Frankendom's MAX_ATTACKERS = 3 needs a slot gate in the engine in front of the `chase -> attack` switch (an enemy that cannot get a slot should circle or wait in `chase`); the donor gives no pattern for that.
- Variable `dt` (clamped to 1/15 s) drives the timers. Frankendom's server tick and fight record need a fixed step so replays and server-verified kills are deterministic; port with a fixed `dt` and a seeded `rand`. The donor's `random` is the game's shared RNG (not checked for seeding).
- The donor hit is decided on the client side of the same process (`onPlayerHitByEntity`), with a hit roll and a damage roll. Frankendom kills are server-verified, so the `dealHit` output must be an event into the engine's damage step, not a damage application.
- The leash here is distance only (6.0 from the enemy, not from a home point), so an enemy that is kited keeps following until the player is far enough; it has no return-to-spawn. A zone-as-data leash from a home position is not in the donor.
- Wake is by distance only: no sight line, no noise, no wake-on-damage (`setEnemyBehaviorState` at 2033 is an unimplemented stub, no callers).
- Radii, speeds, wind-up range and hit point must be catalogue fields (zones as data), not constants as in the donor.
