# scummvm-scummvm (vfx-blood-finishers, cell 3)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/engines/wintermute/base/particles/part_emitter.cpp` (with `part_particle.cpp`, `part_force.h`) | Licence: GPL-3.0-or-later (file header: "GNU General Public License ... version 3 ... or any later version"; repo COPYING is GPL version 3, 29 June 2007; file says "This file is based on WME Lite", Copyright (c) 2011 Jan Nedoma, whose own licence was not read) | C++ | symbol `PartEmitter::updateInternal`, `PartEmitter::start`, `PartParticle::update`

Checked: The hint `engines/sword25/gfx/renderobject.h` is the `RenderObject` base class of the Broken Sword 2.5 scene graph (line 72); it has no particle, blood or effect code, and a grep of `engines/sword25` for particle, blood, gore, finisher, shake, flash, splatter and fade finds only vector-image code. The real particle system is in WME (Wintermute) `base/particles/`. Read in full: `part_particle.cpp` 95-212 (update, fades, display), `part_force.h` 40-42 (force enum, grep only), `part_force.cpp` (constructor and persist). Read in pieces: `part_emitter.cpp` 50-75 (defaults), 158-250 (spawn), 258-320 (update and batch generation), 343-365 (start and pre-roll), 428-445 (addForce); `part_emitter.h` (fields). Not read: `PartEmitter::display` (320-342), `sortParticlesByZ` and `compareZ` (367-389), `setBorder`, script property setters (884-1156). Other candidates opened by grep only: `icb/actor_fx_pc.cpp` (breath particle draw, not a burst system), `efh/fight.cpp` (one flavour string, "a spouting mass of blood"). Confidence: high on the emitter loop, the cap, the batch gate and the particle integration; medium on the force scaling (no units documented in the donor).

Best transferable idea: Drive all hit sprays from one emitter with a hard live-particle cap, a batch interval and batch size, slot reuse for dead particles, and per-particle delta-time integration, so a burst can never exceed the frame budget however many hits land.

Decision (proposed): adapt - take the emitter shape (cap, batch interval, batch size, slot reuse, fade in and out, delta-time integration), not the WME code. The emitter is client-only: the engine emits one hit event (position, kind), the client starts a burst preset. Why: Frankendom wants readable impacts at 375 wide with up to MAX_ATTACKERS = 3 attackers, so the particle budget must be a hard client cap, and kills and damage stay in the engine.

Acceptance: On a landed hit, a spray of up to 24 blood sprites bursts from the impact point, each fading in over 60 ms, living 250 to 400 ms and falling under gravity. With three attackers hitting at once, live sprites never exceed the cap (120 is a proposed value; not tested) and no burst is dropped silently; a client test asserts that a point force at distance 0 never produces a non-finite velocity.

## 1. Mechanism

- Entry: `PartEmitter::update` (253) calls `updateInternal(_game->_timer, _game->_timerDelta)`, so every frame passes the global time and the frame delta.
- Step 1, update all: each particle updates itself (258-262). Live count is the number of particles not marked dead (264-265). Fading particles count as live.
- Step 2, budget: generation only runs when the live count is under the cap (271). It is skipped entirely while at the cap, so no batch is timed then.
- Step 3, timer gate: a batch is due when `currentTime - _lastGenTime > _genInterval` (273); the timer is reset at 274. With the default interval of 0 a batch is due whenever at least 1 ms has passed and the emitter is under the cap.
- Step 4, batch size: `toGen = min(_genAmount, _maxParticles - numLive)` (281). The batch never exceeds the free slots.
- Step 5, slot reuse: for each new particle the emitter first looks for a dead slot (293) and only allocates a new particle if none is dead. The scan is linear.
- Step 6, optional batch cap: when `_maxBatches > 0` and the count of batches exceeds it, generation stops; existing particles keep updating (277).
- Step 7, emit event: when particles were made and the emitter is not in pre-roll, a script event fires (309).
- Spawn (`initParticle`, 158-250): random position in the emitter box (166); velocity from a range, or from a random depth `posZ` in 0-100 when Z-based (172); life from a range, or from depth with the range reversed (186); scale, angle, rotation, angular velocity and growth from ranges; the sprite is picked at random (192); border thickness shrinks with depth (199); fade-in starts at spawn (`fadeIn`).
- Particle update (`PartParticle::update`, 95-192): fade-in is linear over the fade time (101) and then normal. Life end (117) starts a fade-out if the emitter has a fade-out time, else the particle is dead. Alpha ramps from alpha1 to alpha2 over life (144). Forces: global adds `dir x dt` to velocity (154); point adds `dir x (100 / dist) x dt` (159-163). Position integrates `pos += vel x dt` (171). Scale grows linearly or exponentially (per second) and dies at zero (184).
- Fast-forward (`start`, 343-365): all particles are marked dead, then a pre-roll of `_overheadTime` is simulated in 500 ms steps (352-357). Emit events are suppressed during pre-roll (309).

## 2. Key functions

- `PartEmitter::updateInternal`: `/mnt/frankendom-donors/scummvm-scummvm/engines/wintermute/base/particles/part_emitter.cpp` 258-318. Read end to end.
- `PartEmitter::initParticle`: same file, 158-247. Read.
- `PartEmitter::start`: same file, 343-365. Read.
- `PartParticle::update`: `/mnt/frankendom-donors/scummvm-scummvm/engines/wintermute/base/particles/part_particle.cpp` 95-192. Read.
- `PartEmitter::addForce`: `part_emitter.cpp` 428-441. Read. Force types: `part_force.h` 41-42 (point and global).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hard cap on live particles; batch sized to the free slots | Default cap 100 (theirs, part_emitter.cpp 64); batch size default 1 (theirs, 71) |
| Batch interval gate, timer reset on each batch | Interval default 0 ms (theirs, 70); timer reset 274 |
| Slot reuse before allocation | Rule only (293) |
| Depth-based spread of velocity, scale and life | Ranges are per emitter (script); depth is random 0-100 (166-186) |
| Life, fade-in and fade-out in ms | Default life 1000 ms (theirs, ctor); fades set by script, default 0 |
| Point force: strength divided by distance | Numerator 100 (theirs, part_particle.cpp 161); no lower bound on distance (defect, section 6) |
| Pre-roll in fixed steps | 500 ms step (theirs, part_emitter.cpp 352); remainder dropped (353) |
| Delta-time integration | Timer delta in ms, divided by 1000 (148) |

Units: time ms; velocity px per second (as the donor uses it); scale percent; alpha 0-255 in the donor, 0-1 in the sketch.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's step order (update all, count live, cap check, batch timer, batch size, slot reuse, optional batch cap, emit event not in pre-roll), the fade states, the global and point forces, and the pre-roll. It changes four things: it uses ages and fade timers in ms instead of absolute timer stamps (no wrap handling); it fixes the point-force distance with a lower bound of 1 unit and it keeps the pre-roll remainder; it makes fading particles move (the donor freezes them, section 6); and it drops the sprite list, the border, the alpha ramp over life, the Z-based spread, the rotation, the sort by depth and the display. Angles are standard degrees, not the donor's rotated convention.

```ts
// Licence: GPL-3.0-or-later (ScummVM file header: GNU GPL version 3 or later; file says based on WME Lite, Copyright 2011 Jan Nedoma). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vec { x: number; y: number; }

type PState = "fadein" | "normal" | "fadeout" | "dead";

interface Particle {
  pos: Vec;
  vel: Vec;
  state: PState;
  age: number;        // ms alive in the normal state
  life: number;       // ms
  fadeT: number;      // ms into the current fade
  fadeFrom: number;   // alpha when fade-out started (0..1)
  alpha: number;      // 0..1
  scale: number;      // percent
  growth: number;     // percent per second
}

interface Force { kind: "global" | "point"; pos: Vec; dir: Vec; }

interface EmitterCfg {
  maxParticles: number;      // live cap (donor default 100)
  genIntervalMs: number;     // batch interval (donor default 0)
  genAmount: number;         // particles per batch (donor default 1)
  maxBatches: number;        // 0 = unlimited
  lifeMs: [number, number];
  speed: [number, number];   // px per second
  angleDeg: [number, number];
  scale: [number, number];   // percent
  fadeInMs: number;
  fadeOutMs: number;
}

const POINT_FORCE_K = 100;     // donor part_particle.cpp 161: dist = 100 / dist
const MIN_FORCE_DIST = 1;      // FIX: lower bound on distance (donor has none)
const PREROLL_STEP_MS = 500;   // donor part_emitter.cpp 352

class Emitter {
  origin: Vec = { x: 0, y: 0 };
  forces: Force[] = [];
  onBatch: (() => void) | null = null;   // donor: emit event, not during pre-roll
  private particles: Particle[] = [];
  private lastGenMs = 0;
  private batches = 0;
  private running = false;

  constructor(private cfg: EmitterCfg, private rnd: () => number = Math.random) {}

  private range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.rnd();
  }

  start(nowMs: number, prerollMs: number): void {
    for (const p of this.particles) p.state = "dead";
    this.running = true;
    this.batches = 0;
    // FIX: pre-roll in 500 ms steps but keep the remainder (donor integer division drops it)
    let t = nowMs - prerollMs;
    let left = prerollMs;
    while (left > 0) {
      const dt = Math.min(PREROLL_STEP_MS, left);
      this.step(t + dt, dt, true);
      t += dt;
      left -= dt;
    }
  }

  update(nowMs: number, dtMs: number): void {
    if (this.running) this.step(nowMs, dtMs, false);
  }

  liveCount(): number {
    return this.particles.filter(p => p.state !== "dead").length;
  }

  private step(nowMs: number, dtMs: number, preroll: boolean): void {
    for (const p of this.particles) this.advance(p, dtMs);
    const live = this.liveCount();              // fading particles count as live (donor)
    if (live >= this.cfg.maxParticles) return;  // no batch is timed while at the cap (donor)
    if (nowMs - this.lastGenMs <= this.cfg.genIntervalMs) return;
    this.lastGenMs = nowMs;
    this.batches++;
    if (this.cfg.maxBatches > 0 && this.batches > this.cfg.maxBatches) return;

    let toGen = Math.min(this.cfg.genAmount, this.cfg.maxParticles - live);
    while (toGen > 0) {
      this.spawn();
      toGen--;
    }
    if (!preroll && this.onBatch) this.onBatch();
  }

  private spawn(): void {
    let p = this.particles.find(q => q.state === "dead");   // reuse a dead slot first
    if (!p) {
      p = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, state: "dead", age: 0, life: 0,
            fadeT: 0, fadeFrom: 0, alpha: 0, scale: 100, growth: 0 };
      this.particles.push(p);
    }
    const ang = this.range(this.cfg.angleDeg[0], this.cfg.angleDeg[1]) * Math.PI / 180;
    const spd = this.range(this.cfg.speed[0], this.cfg.speed[1]);
    p.pos = { x: this.origin.x, y: this.origin.y };
    p.vel = { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd };
    p.life = this.range(this.cfg.lifeMs[0], this.cfg.lifeMs[1]);
    p.scale = this.range(this.cfg.scale[0], this.cfg.scale[1]);
    p.growth = 0;
    p.age = 0;
    p.fadeT = 0;
    p.alpha = 0;
    p.state = "fadein";
  }

  // One particle, one step. Fading particles do not move (donor behaviour; see note).
  private advance(p: Particle, dtMs: number): void {
    const sec = dtMs / 1000;
    if (p.state === "dead") return;
    if (p.state === "fadein") {
      p.fadeT += dtMs;
      p.alpha = Math.min(1, p.fadeT / this.cfg.fadeInMs);
      if (p.fadeT >= this.cfg.fadeInMs) { p.state = "normal"; p.alpha = 1; }
      return;
    }
    if (p.state === "fadeout") {
      p.fadeT += dtMs;
      p.alpha = p.fadeFrom * Math.max(0, 1 - p.fadeT / this.cfg.fadeOutMs);
      if (p.fadeT >= this.cfg.fadeOutMs) p.state = "dead";
      return;
    }
    p.age += dtMs;
    if (p.age >= p.life) {
      if (this.cfg.fadeOutMs > 0) { p.state = "fadeout"; p.fadeT = 0; p.fadeFrom = p.alpha; }
      else p.state = "dead";
      return;
    }
    for (const f of this.forces) {
      if (f.kind === "global") {
        p.vel.x += f.dir.x * sec;
        p.vel.y += f.dir.y * sec;
      } else {
        const dx = f.pos.x - p.pos.x;
        const dy = f.pos.y - p.pos.y;
        const d = Math.max(MIN_FORCE_DIST, Math.hypot(dx, dy));
        const k = POINT_FORCE_K / d;
        p.vel.x += f.dir.x * k * sec;
        p.vel.y += f.dir.y * k * sec;
      }
    }
    p.pos.x += p.vel.x * sec;
    p.pos.y += p.vel.y * sec;
    p.scale += p.growth * sec;
    if (p.scale <= 0) p.state = "dead";
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` run on the VPS at /tmp/scummvm-particle-emitter.ts, exit 0.

## 5. Lands in

- TARGET `src/fight/impact-fx.ts` (new, client-side burst presets; the engine emits the hit event). Parity-checklist row 10 (hit impact and hitstop). The lead's hint was row 10 and the mechanism is a hit burst, so row 10 is the right row here. (Cell 1 used row 8 because it is about floor decals.)
- today: not checked in the Frankendom repo (the brief names the target; no Frankendom file was read).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later: clean-room, shape only)
- Brief rule served: 1 (one engine decides the hit; the client draws the burst); MAX_ATTACKERS = 3 (the cap is sized for three attackers); camera, HUD and sound are client-only (the burst is client-only)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is from the mechanism.
- Defect, point force with no distance floor: the donor computes `dist = 100.0f / dist` (161) with no lower bound. A particle at the attractor's exact position gets an infinite force, and a particle very close gets a huge kick. Keep the idea, fix: lower bound on distance (sketch `MIN_FORCE_DIST`), or a softened inverse.
- Defect, fading particles freeze: the donor returns before the position update for any state other than normal (135), so a fading-out spray hangs in the air for its fade time. This may be intended; it looks wrong for blood, so the sketch moves particles during fades. Check in a still at 375 wide before adopting either way.
- Also in the donor (part_particle.cpp 116-144): a lifeTime of 0 or less means the particle never expires (the age check is guarded by lifeTime > 0), while the sketch would expire a life-0 particle at once, so guard it if immortal particles are wanted; leaving the border rectangle triggers fadeOut (127-132) rather than a kill; and alpha ramps from alpha1 to alpha2 over the life (140-144), which the sketch drops.
- Inconsistency, depth mapping: velocity and scale rise from the first value at depth 0 (172), but life is reversed: depth 0 gets the longer life (186). Intent is not documented in the donor. Frankendom should choose one direction and test it.
- Behaviour to test: the batch timer is not advanced while at the cap (271-274), so when the first slot frees, the next batch fires at once rather than after the interval. Not a bug by itself, but a burst after a full cap can arrive early.
- Fading particles count as live (264-265), so a fading spray uses the cap. Three hits in quick succession may thin the second burst. Frankendom should set the cap per preset and test the count in the Pit.
- Dead-slot search is a linear scan per spawn (293). Fine at 24 to 120 particles; not fine for ambient effects at thousands. Frankendom should keep the cap low.
- Pre-roll: fixed 500 ms steps and integer division drop the remainder (352-353). Frankendom ambient presets should not depend on exact pre-roll.
- Not read: `PartEmitter::display` (320-342), `sortParticlesByZ` and `compareZ` (367-389), the border and sprite code, the script setters. The sprite draw call (`PartParticle::display`, 194-211) was read and only uses scale, rotation and alpha; the blend mode is set on the emitter.
- Frankendom rulings: the burst is presentation only, so no kill or damage depends on it; a burst preset must not block a finisher or a hit.

Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- No false claims in what the note states.
- Missed, confirmed in part_particle.cpp: lifeTime <= 0 means immortal (116); leaving the border rectangle triggers fadeOut (127-132); alpha ramps alpha1 to alpha2 over the life (140-144, already noted as dropped).
Fixed 2026-10-12: Added a short line in Gaps and risks for the three missed items (no sketch code change).
