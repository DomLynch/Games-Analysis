# teeworlds-teeworlds (vfx-blood-finishers, cell 1)

Donor: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/effects.cpp` | Licence: zlib-style, as read in `license.txt` ("Copyright (C) 2007-2024 Magnus Auvinen"; the three conditions are the zlib ones: no misrepresented origin, altered source must be marked, notice kept; code may be adapted). Content under `data` and `datasrc` is CC-BY-SA 3.0 and is not used here | C++ | symbol `CEffects::PlayerDeath`

Checked: Read in full: `effects.cpp` 188-233 (PlayerDeath), 236-247 (Explosion flow loop), 300-324 (OnRender rate gates); `particles.cpp` 1-169 (whole file); `particles.h` 1-96 (whole file); `flow.cpp` 1-96 and `flow.h` (whole files); `collision.cpp` 95-131 (MovePoint); `gameclient.cpp` 1090-1093 (event dispatch); `gamecontext.cpp` 166-176 (CreateDeath); `character.cpp` 700-712 (death routine end). Greps run over the donor: `shake` (case-insensitive) over all of `src` has zero hits, so this donor has no screen shake; `Get(` on `CFlow` has no caller under `src/game/client`. Not read: `CCollision::CheckPoint` (the solid test), the respawn code (only a comment at character.cpp 706), the sprite data. Confidence high on the death burst and the particle pool; medium on the spawn burst (only its loop head was read). Camera: not applicable (2D, no camera cell). Depth: full for the death burst.

Best transferable idea: one server death event (position + victim id) drives a fixed-size particle pool burst that the client alone draws, coloured from the victim's skin, with friction on a carried fixed-step clock.
Decision (proposed): adapt - the event-to-burst shape fits our server-verified kills (the server says "died here, this id", the client only presents). Adapt means: keep the bounded pool but count drops, and fix three defects the donor has (square-sample direction bias, constant alpha, elasticity redrawn every frame). Reject the flow grid: the donor writes to it and never reads it.
Acceptance: At 375 wide, a confirmed kill in the Pit shows one burst of the victim's colour (64 particles, all gone within 0.6 s, shrinking and fading); a server test asserts exactly one death event per lethal hit and none for a non-lethal hit; the pool drop counter reads 0 in a 3-vs-1 fight.

## 1. Mechanism

- Source of truth: the server. When a character dies, the death routine removes the character (`character.cpp` 709) and then emits one death net event with the position and the client id (`character.cpp` 711; `gamecontext.cpp` 166-176). The position is cast to int, which truncates to whole units (`gamecontext.cpp` 172). The client receives the event in its net-event loop and calls `PlayerDeath` (`gameclient.cpp` 1090-1093). From there the blood is client-only: the server does not simulate it.
- Order of steps inside `PlayerDeath` (`effects.cpp` 188-233):
  (a) Colour. Default white (190). If the client id is valid: in team games the team colour is used; otherwise the custom body colour if the player set one; otherwise the skin part's blood colour (192-212).
  (b) Burst. Loop of 64 (215). Each particle: one of three splat sprites at random (219); direction from `RandomDir()` with speed `(random+0.1) x 900` units/s (221); life 0.3 to 0.6 s (222); start size 24 to 40, end size 0 (223-224); gravity 800 (227); friction 0.8 (228); colour = blood colour x a brightness of 0.75 to 1.0, alpha 0.75 (229-230); added to the general group (231).
- Particle integrator, per render frame (`particles.cpp` 65-126, driven from `OnRender` 128-137):
  (i) gravity added with the real frame time (90); (ii) friction applied once per 0.05 s step, with the remainder carried in a static clock (71-81, 92-93); (iii) move with map collision (96-98); (iv) life advanced (100); (v) particle removed when life exceeds its span, and pushed onto a free list (104-121).
- Map collision (`collision.cpp` 95-131): if the destination point is solid, the velocity is flipped by `-elasticity` on each blocked axis; if neither single axis is blocked (a corner), both are flipped. The position does not move on a blocked step (the position update is only in the free branch, 129).
- Pool: 8192 slots (`particles.h` 74). `Add` returns without queueing when the free list is empty (42-43) or when the world is paused (40-41). A full pool drops the particle with no record.
- Render: size = lerp(start, end, life/span) (150-152). Alpha is the stored colour alpha, and the donor's `pow(a, 0.75)` fade is commented out (156-160). So blood shrinks away but does not fade.
- Flow grid (side path): `Explosion` (236-247) adds velocity to a 17 x 17 grid of cells around the blast, minus the centre, with a falloff (288 adds). Its `Size` argument is ignored (`flow.cpp` 85-95). The only decay is `CFlow::Update`, which multiplies every cell by 0.85 and runs on the 50 Hz gate (`effects.cpp` 322-323; `flow.cpp` 69). The particle line that would read the flow is commented out (`particles.cpp` 89), and `CFlow::Get` has no caller. So the flow grid is written and never read in this donor.
- Rate gates (`effects.cpp` 300-320): the 100 Hz and 50 Hz flags are set true at most once per frame, and only when the interval has elapsed since the last true. There is no catch-up: at a low frame rate the emission rate falls with the frame rate.
- Tick: client render frame time x animation playback speed (`particles.cpp` 135). This is not a fixed-tick simulation. The burst itself is one-shot, per event.

## 2. Key functions

- `CEffects::PlayerDeath`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/effects.cpp` 188-233. Colour pick, 64-particle burst.
- `CParticles::Add`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/particles.cpp` 38-63. Free-list pop; pause and full-pool guards.
- `CParticles::Update`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/particles.cpp` 65-126. Gravity, carried-remainder friction, map move, expiry.
- `CCollision::MovePoint`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/collision.cpp` 95-131. Per-axis bounce, position hold.
- Event path: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/server/gamecontext.cpp` 166-176 (server creates the event), `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/gameclient.cpp` 1090-1093 (client dispatch).
- Rate gates: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/effects.cpp` 300-324.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One event, one burst of N pooled particles | N = 64 (theirs, effects.cpp 215) |
| Speed = (0.1 to 1.0) x base, random direction | base 900 units/s (theirs, effects.cpp 221) |
| Life = min + jitter | 0.3 + up to 0.3 s (theirs, effects.cpp 222) |
| Size shrinks from start to 0 | start 24 + up to 16 units (theirs, effects.cpp 223-224) |
| Gravity added per frame | 800 units/s^2 (theirs, effects.cpp 227) |
| Friction once per fixed step, remainder carried | 0.8 per 0.05 s (theirs, effects.cpp 228; particles.cpp 77) |
| Colour = victim colour x brightness | brightness 0.75 to 1.0 (theirs, effects.cpp 229); alpha 0.75 (theirs, 230) |
| Bounded pool, silent drop when full | 8192 slots (theirs, particles.h 74) |
| Bounce on a solid point with elasticity | elasticity 0.1 + 0.9 x random, redrawn each update (theirs, particles.cpp 97) |

## 4. TypeScript sketch

simplified: uses one array with a linear scan for a free slot (the donor keeps a free list and per-group lists); no sprites or groups (the caller picks the sprite, and this sketch has no sprite field); no team or skin lookup (the caller passes the victim's colour); no flow grid (dropped on purpose, see section 6); no 50 Hz or 100 Hz emission gates; no render pass beyond `renderState`. Fixes against the donor, in the sketch: direction is a uniform angle (the donor's normalised square sample is biased to the diagonals, see section 6); alpha fades with life (the donor keeps it constant); elasticity is drawn once per particle (the donor redraws it every update). Order is kept from the donor: gravity, then friction, then move.

```ts
// Licence: zlib-style (donor license.txt). Clean-room sketch from the described mechanism, not a translation of the donor lines.
export {};

type Vec2 = { x: number; y: number };

interface Particle {
  live: boolean;
  pos: Vec2;
  vel: Vec2;
  life: number;
  lifeSpan: number;
  startSize: number;
  endSize: number;
  gravity: number;
  friction: number;
  elasticity: number;      // drawn once per particle (fix: the donor redraws it on every update)
  rgb: [number, number, number];
  alpha0: number;          // 0.75 in the donor
  rot: number;
  rotSpeed: number;
}

const FRICTION_STEP = 0.05; // seconds: the donor applies friction in these fixed steps

class ParticlePool {
  private slots: Particle[];
  private frictionClock = 0; // carried remainder of the friction clock, as in the donor

  constructor(capacity: number, private isSolid: (x: number, y: number) => boolean) {
    this.slots = Array.from({ length: capacity }, () => ({ live: false } as Particle));
  }

  // Returns false when the pool is full: the donor drops the particle without a record.
  add(p: Omit<Particle, "live" | "life">): boolean {
    const slot = this.slots.find((s) => !s.live);
    if (!slot) return false;
    Object.assign(slot, p, { live: true, life: 0 });
    return true;
  }

  update(dt: number): void {
    this.frictionClock += dt;
    let steps = 0;
    while (this.frictionClock > FRICTION_STEP) {
      steps++;
      this.frictionClock -= FRICTION_STEP;
    }
    for (const p of this.slots) {
      if (!p.live) continue;
      p.vel.y += p.gravity * dt;                         // gravity uses the real frame time (donor)
      for (let k = 0; k < steps; k++) {                  // friction once per fixed step (donor)
        p.vel.x *= p.friction;
        p.vel.y *= p.friction;
      }
      this.move(p, p.vel.x * dt, p.vel.y * dt);
      p.life += dt;
      p.rot += p.rotSpeed * dt;
      if (p.life > p.lifeSpan) p.live = false;
    }
  }

  // Donor MovePoint: if the destination is solid, flip the blocked axis (both axes if neither alone is blocked); position holds.
  private move(p: Particle, dx: number, dy: number): void {
    if (!this.isSolid(p.pos.x + dx, p.pos.y + dy)) {
      p.pos.x += dx;
      p.pos.y += dy;
      return;
    }
    const hitX = this.isSolid(p.pos.x + dx, p.pos.y);
    const hitY = this.isSolid(p.pos.x, p.pos.y + dy);
    if (hitX) p.vel.x *= -p.elasticity;
    if (hitY) p.vel.y *= -p.elasticity;
    if (!hitX && !hitY) {
      p.vel.x *= -p.elasticity;
      p.vel.y *= -p.elasticity;
    }
  }

  // Size lerps start to end by life fraction (donor). Alpha fades with life (fix: the donor keeps alpha constant).
  renderState(p: Particle): { size: number; alpha: number } {
    const a = p.life / p.lifeSpan;
    return { size: p.startSize + (p.endSize - p.startSize) * a, alpha: p.alpha0 * (1 - a) };
  }
}

// One death -> one burst of 64 (donor count). Angle is uniform here (fix of the donor's square sample).
function deathBurst(pool: ParticlePool, at: Vec2, victimRgb: [number, number, number], rand: () => number): void {
  for (let i = 0; i < 64; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = (rand() + 0.1) * 900;
    const shade = 0.75 + rand() * 0.25;
    pool.add({
      pos: { x: at.x, y: at.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      lifeSpan: 0.3 + rand() * 0.3,
      startSize: 24 + rand() * 16,
      endSize: 0,
      gravity: 800,
      friction: 0.8,
      elasticity: 0.1 + 0.9 * rand(),
      rgb: [victimRgb[0] * shade, victimRgb[1] * shade, victimRgb[2] * shade],
      alpha0: 0.75,
      rot: rand() * Math.PI * 2,
      rotSpeed: (rand() - 0.5) * Math.PI,
    });
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/vf018-teeworlds-death-burst.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/blood.ts` (new client presentation module; it consumes the server's confirmed death event and draws nothing on its own). The server-side death event lives in the engine.
- PARITY row 8 (blood/wounds/decals). The list hint said row 10 (hit impact/hitstop); this donor's death path is a blood burst, not impact or hitstop, so row 8 is the one that fits. Row 17 (death/respawn) is the event source; it is not cited as the row here.
- Reuse tag: rewrite-from-idea (zlib-style; clean-room sketch only, no donor lines copied; sprite and sound data not used)
- Brief rule served: kills are server-verified and the client presents only (one burst per confirmed death, fed by one server event); rule 4 of the addendum (`Best transferable idea` on every cell).

## 6. Gaps and risks

- Defect 1, direction bias: `RandomDir()` (`effects.cpp` 19) normalises a point from a uniform square, so directions are not uniform in angle. The number of points landing in a given angle goes with the square of the distance from the centre to the square's edge in that direction: 0.5 on the axes, 0.707 on the diagonals, so diagonal directions get about 2x the density (my arithmetic, not measured). Fix: uniform angle, as in the sketch.
- Defect 2, no fade: alpha is constant (`particles.cpp` 156-160). Fix: alpha falls with life (sketch `renderState`).
- Defect 3, elasticity redrawn each update (`particles.cpp` 97): the bounce strength jitters every frame for one particle. Fix: draw once per particle.
- Defect 4, dead flow grid: `Explosion` writes it (`effects.cpp` 246), nothing reads it (`particles.cpp` 89 commented, no `Get` caller). Reject for Frankendom: a 2D screen-space velocity grid has no counterpart in our rulings, and a dead path should not be ported.
- Defect 5, rate gates with no catch-up (`effects.cpp` 306-320): under a slow frame rate the emission rate falls. Fix: carry a remainder, as the donor already does for friction.
- Defect 6, silent drop when full (`particles.cpp` 42-43): no counter, so a crowded fight loses bursts without a trace. Fix: count drops and report them in the debug HUD. Also cap particles per frame (readability at 375 wide, see the addendum).
- Friction is on a fixed 0.05 s clock but gravity is on the frame clock (`particles.cpp` 77 vs 90): the two are mixed. Frankendom's blood is client-only, so this does not affect the server tick. Fix if we keep it: run the whole integrator on one fixed step.
- The donor is 2D; the sketch is 2D. In Frankendom the burst is in 3D, so the solid test becomes a ground or wall query, and `isSolid(x, y)` is a placeholder.
- Row 19 (fight record and replay): the burst uses `random` on the client, so a replay will not reproduce it unless the presentation RNG is seeded separately. The record must not depend on the burst.
- Colour rule: the donor takes the victim's skin colour. Whether Frankendom blood uses the creature's catalogue colour or a fixed palette is a design call for Lead. Not decided here.
- Team colour path (`effects.cpp` 194-200) only applies to team games; Frankendom has no team model in the duel, so only the custom-colour and skin-colour paths transfer.
- Not checked: how the donor's net events are delivered (reliable or not); the death event is used as given.
- No screen shake in this donor (grep returned no hits), so this note covers no screen effect.

Reuse tag: rewrite-from-idea (zlib-style; clean-room; no donor lines copied)
Brief rule served: kills are server-verified; the client presents blood only; receipts-not-reports (every number above has a receipt in `receipts.tsv`)
