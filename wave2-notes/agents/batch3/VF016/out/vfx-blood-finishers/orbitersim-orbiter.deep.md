# orbitersim-orbiter (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Particle.cpp` (base stream 110-247; exhaust emitter `ExhaustStream::Update` 566-679) with `Particle.h` (17-131) | Licence: GPL v3 / LGPL v3 per the file headers (Particle.h line 3 and Particle.cpp line 3: "Dual licensed under GPL v3 and LGPL v3"); the repo-root LICENSE is MIT (line 1, "MIT License", copyright Martin Schweiger 2000-2026). The two conflict. I treat the particle files as copyleft: clean-room, shape only | C++ | symbol `D3D9ParticleStream::Update` and `ExhaustStream::Update`

Checked: The hint file `VVessel.cpp` is not the particle code. I grep'd it for explosion, particle, blood, flash, shake and debris: the only match is a 0.5 s flashing period (line 1009, "Flashing period (twice per second)"). I read only those lines. The real particle system is in `Particle.cpp` and `Particle.h`, driven by `Scene::Update` (Scene.cpp 749-759) from `D3D9Client::clbkUpdate` (D3D9Client.cpp 1167-1171). My grep also matched explosion, exhaust or debris words in files I did not open (OVP/D3D9Client/Scene.cpp, D3D9Effect.cpp, D3D9Client.cpp, and Src/Vessel/*, Src/Orbiter/Vessel.cpp, Src/Module/LuaScript); A grep for blood or gore in OVP, Src, Orbitersdk and Script matched only a .psd art file and one SDK header (not read); a grep for finisher or shake matched nothing. So no blood or finisher system exists in this donor, but I did not open the files listed above for that. Read: Particle.h 1-131 (full), Particle.cpp 110-247 (full base stream), 566-679 (full exhaust emitter), Scene.cpp 749-759, D3D9Client.cpp 1167-1171. Not read: Particle.cpp 1-109 (globals and constructor), 248-565 and 680-851 (render, ground shadow, reentry stream), Src/Orbiter/Vessel.cpp `AddExhaustStream`, and how often the SDK calls `clbkUpdate`. Confidence: high on the emitter, the lifetime rule and the defects listed; medium that the emitter is the right base for blood (it is a particle system, not a blood system). camera_scope: not a camera cell.

Best transferable idea: A spray emitter keeps a clock with backlog catch-up, places each droplet by its overshoot along its velocity, kills droplets with probability dt over lifetime, and drops the oldest at a fixed cap.
Decision (proposed): adapt — keep the emitter shape (same droplet count at 30 and 60 fps, hard cap for phones); drop the planet physics, which an arena does not have; clean-room only because of the copyleft headers.
Acceptance: Each confirmed hit throws a short spray that thins out over about half a second; at 30 fps and 60 fps the droplet count per second is the same within one; the spray never holds more than the cap; a blocked hit throws none.

## 1. Mechanism

- Spec (`SetSpecs`, 110-132): the stream reads its lifetime (pht, line 112 calls `SetParticleHalflife`), source size (113), exhaust speed `v0` (114), speed randomisation (115), growth rate (116), atmosphere slow-down (117), emission density `srcrate` (118), and the level and atmosphere maps (120-127).
- Lifetime (`SetParticleHalflife`, 134-139): `exp_rate = RAND_MAX/pht` (136). The death test in the base update (225) is `dt * exp_rate > rand()`, so a droplet dies in a step with probability dt/pht. Each droplet therefore has a memoryless (exponential-style) life with mean pht, decided one step at a time.
- Base update (`D3D9ParticleStream::Update`, 219-234): read `dt = oapiGetSimStep()` (222). For each droplet in order: if it dies, unlink and delete (225-228); otherwise `pos += vel * dt` (230). The list is a linked list in creation order, so the oldest is first.
- Cap (`CreateParticle`, 186-208): every new droplet is appended; if the count goes over `MAXPARTICLE` (3000, Particle.h 15), the oldest (`pfirst`) is deleted (203-204).
- Exhaust emitter (`ExhaustStream::Update`, 566-679): it first runs the base update (568), then, if droplets exist and the vessel has a planet, applies a planet pass (578-636): gravity (585-587), buoyancy (594), a drag toward an air velocity that is interpolated along the plume by droplet index (603, 609-611), growth (612), and ground contact (614-633), which I cover in the defects list.
- Emission gate (638): only if `*level > 0`, there is a vessel, and `alpha0 = Level2Alpha(level) * Atm2Alpha(density) > 0.01`. `alpha0` is passed to each droplet as its alpha, so the level sets brightness, not the count. If the gate is shut, `t0 = simt` (677), so no backlog builds while the engine is off.
- Emission loop (639-676): while `simt > t0 + interval`, the donor creates a droplet at the nozzle plus the vessel position plus `(vr + dv) * dt`, where `dt` is the overshoot `simt - t0 - interval` (648, 653). So the droplet is placed where it would be by now, along its own velocity. Its velocity is the vessel velocity plus the exhaust velocity `vr = -speed * nozzle direction` (645) plus a random part (650-652). Then `t0 += interval` (668) and the next interval is set: for `speed > 10`, `max(0.015, size0 / (pdensity * (0.1 * airspeed + size0)))` (669-670); otherwise `1/pdensity` (672). The interval is then multiplied by a random 0.5 to 1.5 (674).
- Level maps (`Level2Alpha`, 164-174): flat, linear, square root (169), a clamped linear band, and a clamped square-root band. Atmosphere maps (`Atm2Alpha`, 176-184): flat, clamped linear and logarithmic (181).
- Driver (`Scene::Update`, Scene.cpp 754-758): skipped while the sim is paused (754); a stream whose `Expired()` is true is deleted (756); otherwise `Update()` (757). `D3D9Client::clbkUpdate` calls `scene->Update()` once per call (1171). The droplet motion uses the simulation step (`oapiGetSimStep`, 222 and 571), not the render frame time.

## 2. Key functions

- `D3D9ParticleStream::Update` (base death and motion): `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Particle.cpp` 219-234.
- `D3D9ParticleStream::CreateParticle` (cap): `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Particle.cpp` 186-208.
- `ExhaustStream::Update` (emitter, catch-up, interval): `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Particle.cpp` 566-679; the emission part is 638-677.
- `D3D9ParticleStream::SetParticleHalflife` (lifetime rate): `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Particle.cpp` 134-139.
- `Scene::Update` (driver): `/mnt/frankendom-donors/orbitersim-orbiter/OVP/D3D9Client/Scene.cpp` 749-759.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Memoryless droplet death: each step kills with probability dt / lifetime | Lifetime from the spec (`pht`, Particle.cpp 136); no default is read |
| Emit on a clock with backlog catch-up and the overshoot placed along the velocity | Interval floor 0.015 s and speed threshold 10 (670, 669); the 1/density branch (672) |
| Interval jitter so the stream does not look like a metronome | Factor 0.5 to 1.5 (674) |
| Hard count cap, oldest first | `MAXPARTICLE` 3000 (Particle.h 15; deletes at 203-204) |
| Emit only above an intensity floor; reset the clock when below it | Floor 0.01 (638); reset at 677 |
| Brightness from a level map and an atmosphere map | Five level maps (164-174), three atmosphere maps (176-184) |
| Drag toward the air, scaled by time | `slow = exp(-beta*pref*dt)` (593), `pref = sqrt(rho)/1.1371` (592) |
| Buoyancy: gravity is reduced in air | `exp(-2 rho)` (594) |
| Ground bounce with a random kick | Scale `length(vv) * 0.2` (619), which is static (see defects) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: age and kill first (memoryless, probability dt / lifetime), then move and grow the survivors, then emit with backlog catch-up (each droplet is placed by its overshoot along its velocity), with the intensity floor and the oldest-first cap. It omits the planet pass (gravity, buoyancy, air drag and wind, ground contact and the ground bounce), the airspeed-based interval for fast emitters (the sketch uses 1 / rate), the vessel velocity and the nozzle transform (the origin and the direction are passed in), the shadow flag, the texture index, the render, and the stream removal. Growth applies to every droplet here; the donor applies it only in the planet pass and once at creation. Intensity sets droplet brightness, not the rate, as in the donor (`alpha0`).

```ts
// Licence: GPL v3 / LGPL v3 (donor Particle.cpp and Particle.h headers; root LICENSE is MIT). copyleft: clean-room, shape only.
export interface Droplet { x: number; y: number; vx: number; vy: number; size: number; alpha: number }

export interface SprayConfig {
  lifetimeS: number;   // mean life; each droplet dies with probability dt / lifetimeS per step
  rateHz: number;      // droplets per second while emitting
  speed: number;       // emission speed along the direction
  spread: number;      // random extra velocity, full width
  growth: number;      // size added per second
  cap: number;         // most droplets kept; the oldest goes first
}

export class Spray {
  readonly drops: Droplet[] = [];
  private now = 0;     // emitter clock, seconds
  private nextAt = 0;  // time the next droplet is due

  constructor(private readonly cfg: SprayConfig, private readonly rnd: () => number = Math.random) {}

  // dt in seconds. intensity 0..1 sets droplet brightness; at or below 0.01 nothing is emitted and no backlog builds.
  step(dt: number, intensity: number, ox: number, oy: number, dirX: number, dirY: number): void {
    // 1. age and move: each droplet may die, survivors move and grow
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (this.rnd() < dt / this.cfg.lifetimeS) { this.drops.splice(i, 1); continue; }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.size += this.cfg.growth * dt;
    }
    this.now += dt;

    // 2. emit: catch up on every droplet due since the last one
    if (intensity <= 0.01) { this.nextAt = this.now; return; }
    while (this.now > this.nextAt) {
      const back = this.now - this.nextAt;   // place the droplet where it would be by now
      this.spawn(ox, oy, dirX, dirY, back, intensity);
      this.nextAt += (1 / this.cfg.rateHz) * (0.5 + this.rnd());   // jitter 0.5x to 1.5x
    }
  }

  private spawn(ox: number, oy: number, dx: number, dy: number, back: number, alpha: number): void {
    const vx = dx * this.cfg.speed + (this.rnd() - 0.5) * this.cfg.spread;
    const vy = dy * this.cfg.speed + (this.rnd() - 0.5) * this.cfg.spread;
    this.drops.push({ x: ox + vx * back, y: oy + vy * back, vx, vy, size: 1, alpha });
    if (this.drops.length > this.cfg.cap) this.drops.shift();   // oldest first
  }
}

// Example: one second at 30 fps, emitting at full intensity with a fixed random source.
const cfg: SprayConfig = { lifetimeS: 0.5, rateHz: 40, speed: 2, spread: 1, growth: 0.5, cap: 300 };
const s = new Spray(cfg, () => 0.5);
for (let i = 0; i < 30; i++) s.step(1 / 30, 1, 0, 0, 1, 0);
export const dropCount = s.drops.length;
export const capHeld = s.drops.length <= cfg.cap;
```

## 5. Lands in

- TARGET `src/fight/blood-spray.ts` (new, client-only particle player; the engine emits the confirmed hit and the client draws the spray). Parity-checklist row 8 (blood, wounds, decals). The donor has no blood; this is the particle-emitter shape a blood spray would use.
- Use for Frankendom: a confirmed hit (never a local swing or a blocked hit) starts a short spray at the contact point, with the emission direction from the hit. Droplets fade out over their lifetime, and the count is capped for phones.
- Decision (proposed): adapt. Keep the emitter shape: a clock with backlog catch-up and the overshoot placement (so a 30 fps and a 60 fps phone show the same droplet count), memoryless death, intensity floor, and the oldest-first cap. Drop the planet physics (no atmosphere, gravity or wind in a fighting arena).
- Acceptance: each confirmed hit throws a short spray that thins out over about half a second; at 30 fps and at 60 fps the droplet count per second is the same within one droplet; the spray never holds more than the cap; a blocked hit throws none. (Rate, lifetime and cap are proposed data, not donor values.)
- Reuse tag: adapt-shape (copyleft: clean-room sketch from the mechanism only; no donor line is copied)
- Brief rule served: 1 (one engine; the spray is client-only, and it never decides a hit); 8 (blood, wounds, decals) per the parity row above

## 6. Gaps and risks

- Licence conflict: the particle files say GPL v3 / LGPL v3, the repo root says MIT. Treated as copyleft, so clean-room, shape only. Someone should confirm the licence of these files before any code reuse.
- The planet pass (gravity, buoyancy, wind, ground contact and ground bounce) assumes a planet with atmosphere. Frankendom's arenas have none; do not port it. The ground-bounce idea would need a floor plane and is out of scope for the first version.
- Clock: the donor moves droplets by the simulation step, from the client update callback (D3D9Client.cpp 1171), and skips them while paused (Scene.cpp 754). Frankendom's spray is a client effect: it advances on the client's frame time, with a clamp on the longest step, and it does not wait on the server tick. A paused game must skip it, as the donor does.
- Defects found in what I read, each with the fix:
  - Static ground-bounce scale: `static double dv_scale = length(vv)*0.2;` (Particle.cpp 619) is initialised once, on the first ground contact, and reused for every later contact. Fix: compute it per contact (the sketch has no ground contact, so this is not in the sketch).
  - Expiry test uses the pointer: `bool Expired () const { return !level && !np; }` (Particle.h 67) tests the level pointer, not its value. A stream with a level pointer never expires by this test, so an idle stream lives until its owner deletes it (the owner's removal path was not read). Fix: expire when the level value is 0 (or below) and the droplet count is 0.
  - Unbounded catch-up: `while (simt > t0+interval)` (646) creates every droplet owed since the last update. The 3000 cap (203-204) bounds stored droplets, not the work done in one update, so a long frame or fast time acceleration makes many create and delete passes at once. Fix: cap the spawns per update (not in the sketch) and carry the rest.
  - Growth applies only in the planet pass (612) and once at creation (655). For a stream with no planet the droplets never grow. Not a crash; a design choice to make on purpose. The sketch grows every droplet.
  - Interval with zero density: `1.0/pdensity` (672) and the `pdensity` term (670) divide by the density. A density of 0 gives an infinite interval, so nothing emits. Harmless here; guard it when the spec is read.
- Render path (412-548, 680-851) not read, including the reentry stream's own `Update` (782 onward).

Reuse tag: adapt-shape (copyleft; clean-room)
Brief rule served: 1 (one engine; client-only particle player); 8 (blood, wounds, decals) per the parity row
