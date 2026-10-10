# OpenGothic (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/OpenGothic/common/graphics/pfx/pfxbucket.cpp` | Licence: MIT (repo `LICENSE`: "MIT License", Copyright (c) 2019 Try; code may be adapted) | C++ | symbol `PfxBucket::tick` (emission: `ppsDiff` line 13; placement: `PfxBucket::tickEmit` line 518)

Checked: opened `pfxbucket.cpp` 1-60, 194-300 (randf, init shape and direction), 300-372 (init velocity, read in part), 372-402 (per-particle tick), 436-540 (emitter step, decal tick, tickEmit), `particlefx.cpp` all 315 lines (definition loader, scale curve, maxLifetime), `pfxobjects.cpp` 20-56 (tick driver), `pfxobjects.h` 22 (view range, grep only), `worldview.cpp` 45-60 (caller), `pfxemitter.cpp` 100-140 (activate and child delay, read in part), `animationsolver.cpp` 151-152 and `objvisual.cpp` 185 (grep only). The hint file `particlefx.cpp` holds the effect definition and rate curve; the emission and slot logic is in `pfxbucket.cpp`. Not read: trail code (`tickTrail` body), `buildSsbo` and the GPU buffer code, `freeEmitter` callers beyond line 160, and the `Mesh` emitter's pose path beyond line 240. Confidence: high on the emission count, the slot pool, the particle tick and the clock (all read in full); medium on the child-emitter chain (only the spawn and delay lines read). Nothing was run. Time unit: the code divides by 1000 to get particles per second, so time is milliseconds (inferred from that arithmetic, not from a comment). camera_scope: not applicable (this is effect rendering, not the camera).

Best transferable idea: Size each effect's particle pool from rate times life, place new particles only in free slots and count the overflow, and gate emission by distance to the viewer instead of deleting the effect.
Decision (proposed): adopt - the emission rule (absolute-time floors), the pool sizing and the drop-not-overwrite rule are small, MIT, and exactly the budget rules a many-on-one fight needs for hit sparks; keep particles client-only and never let them feed the fight step.
Acceptance: a landed blow shows a spark burst at its impact point that dies out within its life span, and in a three-attacker pile-on the spark pool never exceeds its fixed size (overflow is counted, not drawn).

## 1. Mechanism

- Driver (variable step). `WorldView` calls `pfxGroup.tick(tickCount)` once per frame (worldview.cpp:57). `PfxObjects::tick` takes `dt = ticks - lastUpdate` (pfxobjects.cpp:38), returns if `dt` is 0, ticks every bucket with that `dt` and the viewer position (42-43), rebuilds the GPU buffers, then sets `lastUpdate = ticks` (48). There are no fixed sub-steps and no accumulator outside the emission arithmetic; the step is whatever the frame took.
- One bucket per effect definition. `PfxBucket::implTickCommon` (pfxbucket.cpp:446-496) does, for each emitter instance, in this order: (a) if the effect has a child effect and the child is not spawned, spawn it when `waitforNext` runs out (455-458), counting `waitforNext` down by `dt` (463); (b) tick every slot of the emitter's block (the per-particle tick, 379-396); if the block is empty and the emitter is fading or out of range, free the block (471-476); (c) if the emitter is `S_Active` and within range, compute the emission count for the window `[timeTotal, timeTotal + dt]` and place that many particles (482-485); (d) always advance the emitter clock: `timeTotal += dt` (490).
- Emission count (`ppsDiff`, pfxbucket.cpp:13-25). A non-looping effect clamps both ends of the window to `prefferedTime` (18-21). The rate is `ppsScale(time1) * ppsValue` (22), so the rate is read at the window end. The count is `floor(pps * t1 / 1000) - floor(pps * t0 / 1000)` (23-25). Because both ends are absolute-time floors, a steady rate never loses the fraction between ticks. A non-looping effect with `prefferedTime` 0 and `time0` 0 returns `ppsValue * 1000` at once, a one-shot burst (16-17).
- Pool (block) size. Slots per emitter = `ceil(maxLifetime * ceil(maxRate) / 1000)` (41-42), where `maxLifetime = lspPartAvg + lspPartVar` (particlefx.cpp:156) and the max rate is the peak of the rate curve times `ppsValue`. This is lifetime times rate, sized up front.
- Placement (`tickEmit`, 518-533). The scan starts at slot id 1 on each call and walks `i = id % blockSize`. A free slot is initialised (`init`) and counted; an occupied slot with `lastI == i` (the full-loop test, 532) stops the scan. Overflow is dropped, never overwritten.
- Particle init (`init`, 202-372). Life is `randf(lspPartAvg, lspPartVar)` (210), where `randf(base, var) = (2r - 1) * var + base` (199), so life is uniform in avg plus or minus var. Shape position depends on the emitter type (point, line, box, sphere, circle, mesh). Direction is either a random unit-sphere direction (`dy = 1 - 2r`, line 300) or head and elevation angles with variance. Speed is `randf(velAvg, velVar)` and the direction is normalised to that speed (369-370).
- Particle tick (379-396). If `life <= dt`, the particle is freed (384). Otherwise `life -= dt`, then `pos += dir * dt` (395), then `dir += flyGravity * dt` (396). So the position uses the old velocity and gravity acts after. The gravity vector is loaded from the effect definition (particlefx.cpp:78).
- Rate curve (particlefx.cpp:292-314). `fetchScaleKey` takes `timeScaled = fps * time` (296), index `at = timeScaled / 1000` (297); the blend fraction is the remainder of the same value (not receipted). Loop wraps the index; otherwise it clamps. Smooth curves blend linearly (310-311); step curves switch at half a key (312). `ppsScale` clamps a negative value to 0 (186-189). `ppsFPS` defaults to 1 when the source gives none (45).
- Range gate. An emitter is "nearby" when its squared distance to the viewer is below `viewRage` squared, `viewRage = 4000` (pfxbucket.cpp:453; pfxobjects.h:22). Only nearby emitters emit. Particles of an emitter that is out of range still tick until its block empties (block tick 468-470), and then the block is freed (471).
- Permanent (decal) effects. An effect with `ppsValue < 0` is a decal (particlefx.cpp:148): `implTickDecals` (498-516) places one particle per emitter, which stays until the emitter is faded.
- Activation and child delay. `setActive(true)` sets `waitforNext` to the create-emitter delay (pfxemitter.cpp:127).

## 2. Key functions

- `ppsDiff`: `/mnt/frankendom-donors/OpenGothic/common/graphics/pfx/pfxbucket.cpp` 13-25 (emission count per window).
- `PfxBucket::implTickCommon`: `/mnt/frankendom-donors/OpenGothic/common/graphics/pfx/pfxbucket.cpp` 446-496 (per-emitter step: child spawn, particle tick, emission, clock).
- `PfxBucket::tick` (per particle): `/mnt/frankendom-donors/OpenGothic/common/graphics/pfx/pfxbucket.cpp` 379-396.
- `PfxBucket::tickEmit`: `/mnt/frankendom-donors/OpenGothic/common/graphics/pfx/pfxbucket.cpp` 518-533.
- `PfxBucket::init` (life, shape, direction, velocity): `/mnt/frankendom-donors/OpenGothic/common/graphics/pfx/pfxbucket.cpp` 202-372.
- `PfxBucket` block sizing: `/mnt/frankendom-donors/OpenGothic/common/graphics/pfx/pfxbucket.cpp` 38-42 (constructor).
- `ParticleFx::fetchScaleKey` and `ppsScale`: `/mnt/frankendom-donors/OpenGothic/common/graphics/pfx/particlefx.cpp` 186-189 and 292-314.
- `PfxObjects::tick` (step driver): `/mnt/frankendom-donors/OpenGothic/common/graphics/pfx/pfxobjects.cpp` 28-48.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Emission count as a difference of absolute-time floors (no lost fraction) | None (the arithmetic); time in milliseconds (inferred from the /1000) |
| Pool size = ceil(lifetime max x peak rate / 1000) | Lifetime max = avg + var (particlefx.cpp:156) |
| Particle life = avg plus or minus var | Per effect (pfxbucket.cpp:210); life held in a 16-bit field |
| Speed = avg plus or minus var | Per effect (pfxbucket.cpp:369) |
| Gravity added to velocity each step | Per effect vector (particlefx.cpp:78; pfxbucket.cpp:396) |
| Rate curve, index = fps x t / 1000, linear or step, loop or clamp | fps default 1 (particlefx.cpp:45); step threshold 0.5 (312) |
| Emit only in range; squared-distance gate | viewRage 4000 world units (pfxobjects.h:22) |
| One-shot burst for non-looping, zero-preferred-time effects | ppsValue x 1000 (pfxbucket.cpp:17) |
| Child effect after a delay | Delay per effect (pfxemitter.cpp:127) |

## 4. TypeScript sketch

simplified: keeps the donor order inside one emitter step (emission count from the clock window, rate read at the window end, particles placed into free slots, particles ticked with the old velocity before gravity, emission only in range, the clock always advances). It omits the child-emitter spawn, the emitter fade-out and block freeing, the trails, the GPU buffer build, the shape types other than a random sphere, the target and mesh direction modes, the one-shot burst (the zero-preferred-time case), and the 16-bit life truncation. It rounds the pool size from the unrounded peak rate (the donor rounds the rate up to a whole number first). It replaces the donor's scan from slot 1 with a rolling cursor, which changes which free slot is picked but not the count or the drop rule.

```ts
// Licence: MIT (donor, OpenGothic). Shape adapted from the described mechanism; this sketch is written from that description, not a line-by-line port.
const VIEW_RANGE = 4000;            // units: emitters further than this from the viewer make no new particles
const MS_PER_S = 1000;

interface EffectSpec {
  ppsValue: number;                  // particles per second at scale 1
  ppsScaleKeys: number[];            // rate curve over the emitter's life
  ppsFps: number;                    // curve keys per second
  ppsSmooth: boolean;
  loop: boolean;
  prefferedTimeMs: number;           // non-looping effects stop emitting after this
  lifeAvgMs: number;
  lifeVarMs: number;
  velAvg: number;                    // units per ms
  velVar: number;
  gravity: [number, number, number]; // units per ms per ms
}

interface Particle {
  life: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
}

interface Emitter { x: number; y: number; z: number; timeMs: number; active: boolean; }

// Rate curve at time tMs. Same arithmetic as the donor: index = fps * t / 1000, linear or step, loop or clamp.
function scaleAt(spec: EffectSpec, tMs: number): number {
  const keys = spec.ppsScaleKeys;
  if (keys.length === 0) return 1;
  const scaled = spec.ppsFps * tMs;
  const at = Math.floor(scaled / MS_PER_S);
  const alpha = (scaled % MS_PER_S) / MS_PER_S;
  const a = spec.loop ? at % keys.length : Math.min(at, keys.length - 1);
  const b = spec.loop ? (at + 1) % keys.length : Math.min(at + 1, keys.length - 1);
  const k0 = keys[a], k1 = keys[b];
  return spec.ppsSmooth ? k0 + alpha * (k1 - k0) : (alpha < 0.5 ? k0 : k1);
}

// Emission count between t0 and t1 (ms). Both ends are absolute-time floors, so a steady rate loses no fraction.
function emitCount(spec: EffectSpec, t0: number, t1: number): number {
  if (t1 <= t0) return 0;
  let a = t0, b = t1;
  if (!spec.loop) { a = Math.min(spec.prefferedTimeMs, a); b = Math.min(spec.prefferedTimeMs, b); }
  const rate = spec.ppsValue * Math.max(0, scaleAt(spec, b)); // rate read at the window end
  return Math.floor(rate * b / MS_PER_S) - Math.floor(rate * a / MS_PER_S);
}

// Pool size from Little's law: live particles ~= rate * life.
function poolSize(spec: EffectSpec, maxScale: number): number {
  const maxLife = spec.lifeAvgMs + spec.lifeVarMs;
  const maxRate = spec.ppsValue * maxScale;
  return Math.max(1, Math.ceil((maxLife * maxRate) / MS_PER_S));
}

class ParticlePool {
  private readonly slots: Array<Particle | undefined>;
  private cursor = 0;
  dropped = 0;

  constructor(size: number) { this.slots = new Array(size); }

  // Places up to `count` particles in free slots. The rest are counted as dropped, never overwritten.
  emit(count: number, make: () => Particle): number {
    let left = count;
    const n = this.slots.length;
    for (let step = 0; step < n && left > 0; step++) {
      const i = (this.cursor + step) % n;
      if (this.slots[i] !== undefined) continue;
      this.slots[i] = make();
      this.cursor = (i + 1) % n;
      left--;
    }
    this.dropped += left;
    return count - left;
  }

  // Semi-implicit step: position moves with the old velocity, then velocity takes gravity.
  tick(dtMs: number, g: [number, number, number]): void {
    for (let i = 0; i < this.slots.length; i++) {
      const p = this.slots[i];
      if (p === undefined) continue;
      if (p.life <= dtMs) { this.slots[i] = undefined; continue; }
      p.life -= dtMs;
      p.x += p.vx * dtMs; p.y += p.vy * dtMs; p.z += p.vz * dtMs;
      p.vx += g[0] * dtMs; p.vy += g[1] * dtMs; p.vz += g[2] * dtMs;
    }
  }
}

// Random direction on the unit sphere, speed rolled from avg +/- var.
function newParticle(e: Emitter, spec: EffectSpec, rnd: () => number): Particle {
  const life = (2 * rnd() - 1) * spec.lifeVarMs + spec.lifeAvgMs;
  const dy = 1 - 2 * rnd();
  const sn = Math.sqrt(1 - dy * dy);
  const th = 2 * Math.PI * rnd();
  const dx = sn * Math.cos(th), dz = sn * Math.sin(th);
  const speed = (2 * rnd() - 1) * spec.velVar + spec.velAvg;
  return { life, x: e.x, y: e.y, z: e.z, vx: dx * speed, vy: dy * speed, vz: dz * speed };
}

// One emitter step. The emitter's clock always advances; new particles are made only while it is near the viewer.
function stepEmitter(e: Emitter, spec: EffectSpec, pool: ParticlePool, dtMs: number, viewerDist2: number, rnd: () => number): void {
  const t0 = e.timeMs;
  const t1 = t0 + dtMs;
  if (e.active && viewerDist2 < VIEW_RANGE * VIEW_RANGE) {
    pool.emit(emitCount(spec, t0, t1), () => newParticle(e, spec, rnd));
  }
  e.timeMs = t1;
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS (file with `export {}` appended) exited 0.

## 5. Lands in

- TARGET `src/fight/hit-fx.ts` (new client module: effect spec and fixed-size pool for hit sparks and blood spray, driven by the server-verified hit event; never read by the fight step). Not checked against the Frankendom repo (I did not open it).
- Parity-checklist row 10 (hit impact/hitstop). The blood spray use also touches row 8, but the cited row for this note is 10.
- today: no equivalent (not checked against the repo).
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; the sketch is an adaptation of the shape)
- Brief rule served: client-only presentation (particles hold no game state and do not change the fight); budgets are zone or effect data, not constants in the code.

## 6. Gaps and risks

- The donor has no gameplay blood. Its "decal" is a Gothic world decal from the level visual (objvisual.cpp:185, world decals), not blood on a corpse. The blood and gore side of this cell needs a different donor (OpenEnroth's bloodsplat, a separate note).
- Finishers are animation names here. The finisher is picked as `T_%sSFINISH` (animationsolver.cpp:152), so the finisher is an animation rule, not an effect; Frankendom's finisher row (9) needs a different donor. Grep only; not opened in detail.
- Variable step. Particles follow the frame's elapsed time. This is safe because particles are client-only; the rule to keep is that no particle state reaches the server or the fight step.
- Rate read at the window end (pfxbucket.cpp:22). A rising curve gives the whole window the end rate, so a burst can land a frame early. For sparks this is fine; Frankendom should write the rule down rather than inherit it.
- Non-looping effects clamp to the preferred time (19-20), and the zero-preferred-time case is a one-shot burst (16-17). Frankendom needs both as explicit data (burst count, stop time).
- Life is held in a 16-bit field in milliseconds (pfxbucket.cpp:210), so an effect longer than 65.5 s would wrap. Frankendom's effects are short; keep life as a number, not 16 bits, or cap it.
- Gothic-specific numbers: viewRage 4000 is in Gothic world units (pfxobjects.h:22). Frankendom must set its own range in its units, as data.
- A donor hack treats head variance of 180 or more as zero (pfxbucket.cpp:313-314, marked "STARGATE_PARTICLES"). Do not copy; Frankendom's direction data must not depend on this.
- The donor's placement always scans from slot 1 (520), so the lowest free slots fill first. The sketch uses a rolling cursor; either works for the drop rule.
- Not read: trails (`tickTrail` body), the GPU buffer build, the child-emitter lifecycle beyond the spawn and delay lines, and the mesh emitter pose path.
