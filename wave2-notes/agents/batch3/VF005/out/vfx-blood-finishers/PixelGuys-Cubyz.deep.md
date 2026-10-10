# PixelGuys-Cubyz (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/particles.zig` | Licence: GPL-3.0 (LICENSE file, "GNU GENERAL PUBLIC LICENSE", Version 3) | Zig | symbol `ParticleSystem.update`

Checked: Read `src/particles.zig` in full (576 lines). Read `src/physics.zig` 14-19 (constants) and 66-80 (start of `collides`). Read `src/game.zig` 836-852 (the per-frame caller), `src/network/protocols.zig` 675-698 and 767 (client receive, sender), `src/server/command/particles.zig` (whole file), and `assets/cubyz/particles/poof.zig.zon` and `flame.zig.zon`. Grep over `.zig` and `.zon` for blood, gore, wound, decal, finisher, spark found no gameplay code; the only hit is a star-type id `cubyz:phantasmal/star/blood_star` (`assets/cubyz/sbb/phantasmal/star/stars.zig.zon:15`). So this donor is a generic particle engine, not a blood, wound, decal or finisher system. Not read: the rest of `physics.collision.collides` (after line 80), `RandomRange.get`, `getLight`, the particle shaders, and the render path beyond line 60. Confidence: high on the update order and the numbers; medium on the collision details.

## 1. Mechanism

- A particle effect is two data records. A particle type (texture, density, drag, rotation speed, optional loop length) is loaded from `assets/cubyz/particles/*.zig.zon`. An emitter (spawn shape point, sphere or cube; speed range; lifetime range; direction mode spread, scatter or direction; `collides` flag) is parsed from a zon string or defaulted.
- Triggers in this donor: only the `/particles` server command. It sends each connected user an id, a position, a collides flag, a count and an optional spawn zon (`src/server/command/particles.zig:44`, the only call site; the function is defined at `src/network/protocols.zig:767`). The client decodes it (`protocols.zig:675-698`), builds an Emitter, and queues it under a mutex (`particles.zig:366-370`). The particle module is referenced from protocols, the command, assets, game, renderer, main and a debug window; none of these is a gameplay call site that spawns effects, so no hit, death or finisher creates an effect in this donor.
- Drain and spawn: `ParticleSystem.update` (210) takes the lock, spawns every queued emitter (211-218), then ages and moves every live particle.
- Spawn (`spawnParticles`, 536-545): the burst is clipped to free capacity (537), so extra particles are dropped, not evicted. For each particle the shape gives a position and velocity. Point: random direction for scatter and spread (438). Sphere: rejection sample inside the unit ball (458), spread = outward offset direction (465). Cube: random offset in the box (484-485), spread = normalised offset (490). Speed is one random draw in the emitter range.
- Creation (`addParticle`, 308-331): lifetime is drawn and a zero lifetime is skipped (310). Density, drag and rotation velocity are drawn from their ranges (72, 74, 68). The loop count is `lifeTime / sampled loop length`, or 1 loop if no loop length is given (316). The animation counter starts at `loops * frameCount` (321) and drops by `frameRate` per second, where `frameRate = frameCount * loops / lifeTime` (325). So the counter reaches zero after exactly `lifeTime` seconds, and the particle is then removed. Initial rotation is random from the client's own seed (312), so each client draws its own spray.
- Per frame, for each live particle in order (loop from 226 to 304):
  1. Counter `-= frameRate * dt` (229). If below zero: swap-remove, copying the last particle into slot i (232), then `continue` without advancing i (234), so the moved particle is updated in this same frame.
  2. Rotation `+= rotVel * dt` (240).
  3. Gravity: `g_eff = baseGravity * (density - airDensity) / density` (245). Density equal to air gives zero gravity. Density below air gives upward force (flame).
  4. Drag: `friction = baseGravity / playerAirTerminalVelocity * drag` (243); velocity multiplied by `exp(-friction * dt)` (247). The gravity step (246) runs before this.
  5. Move. If `collides` (249): position = world eye position + (stored position + origin difference) (250). Each axis x, y, z is moved, then tested against the world box (257, 265, 273). On a hit the axis is snapped to the box face plus or minus `epsilon` (258-262 for x). If not colliding: plain `pos += vel*dt + origin difference` (284).
  6. Light: sample the voxel light at the particle's cell (293), pack six 5-bit channels into one u32 (294-300).
- Floating origin: stored positions are relative to `previousPlayerPos`, an integer position (305 updates it). Each frame the difference is added to every particle (223, 250, 284), so particles stay put in world space when the origin moves. Render uses the same origin (`render`, from line 333).
- Capacity: `maxCapacity` = 524288 (164). The particle arrays are fixed size (166-167). No per-type or per-emitter cap.
- Animation and drawing: billboard quads from an SSBO, drawn in chunks of at most `maxQuadsInIndexBuffer` (renderer, not read in full).

## 2. Key functions

- `ParticleSystem.update`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/particles.zig` 210-306. Queue drain (211-218), per-particle loop (226-304), origin update (305).
- `ParticleSystem.addParticle`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/particles.zig` 308-331. Lifetime, loop count, frame rate.
- `Emitter.spawnParticles`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/particles.zig` 536-545. Capacity clip at 537, shape spawn, then addParticle.
- Shape spawn: `SpawnPoint` 432-448 (random direction, 438), `SpawnSphere` 450-477 (rejection, 458; spread 465), `SpawnCube` 479-502 (spread 490). Only the lines quoted in the receipts were read.
- Network path: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/network/protocols.zig` 675-698 (client decode and queue), `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/command/particles.zig` 40-57 (the one sender).
- Per-frame caller: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/game.zig` 850, with `deltaTime` from the game loop (variable step; the loop that produces `deltaTime` was not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lifetime from a counter: start at loops x frames, drop at frames/life; removal when below zero | Default lifetime 0.75 to 1 s (`particles.zig:381`); default loop count 1 when no loop length is given |
| Gravity from density ratio: `g * (density - air) / density` | `baseGravity` 30.0 (`physics.zig:14`); `airDensity` 0.001 (`physics.zig:16`). Poof density 0.001 (`poof.zig.zon:3`) gives zero gravity; flame 0.00065 to 0.00085 (`flame.zig.zon:3`) rises. Default density 2 to 3 (`particles.zig:72`) |
| Exponential drag per second: `exp(-(g / terminal) * drag * dt)` | `playerAirTerminalVelocity` 90.0 (`physics.zig:15`). Default drag 0.5 to 0.6 (`particles.zig:74`); poof 0.7 to 0.8 (`poof.zig.zon:5`); flame 0.2 to 0.3 (`flame.zig.zon:5`) |
| Swap-remove with no index advance | None |
| Hard capacity, drop the new burst | 524288 (`particles.zig:164`) |
| Snap to a face minus epsilon | `epsilon` = 1/2^21, computed from f64 mantissa bits (`physics.zig:19`) |
| Random spread of directions, sphere rejection | Sphere default radius 1 (`particles.zig:474`) |
| Rotation velocity range | Default 20 to 60 degrees per second (`particles.zig:68`); poof 60 to 80 (`poof.zig.zon:4`); flame 20 to 35 (`flame.zig.zon:4`) |
| Burst count | `/particles` default 1 (`server/command/particles.zig:54`); no burst count in the client path |

## 4. TypeScript sketch

simplified: keeps the donor order inside one step: counter, then swap-remove with no index advance, then gravity from the density ratio, then exponential drag, then the move. It omits the floating-origin rebase, the rotation and animation frames, the light sample, the snap to the box face minus epsilon (it reverts the blocked axis to its last free value instead), the swept box test, the mutex and network queue, the spread and scatter variants for the point and cube shapes, and the client-seed randomness. The sketch divides by density with no guard, as the donor does (`particles.zig:245`).

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const BASE_GRAVITY = 30;            // engine constant (donor physics.zig:14)
export const AIR_TERMINAL_VELOCITY = 90;   // engine constant (donor physics.zig:15)
export const AIR_DENSITY = 0.001;          // engine constant (donor physics.zig:16)

export interface Vec3 { x: number; y: number; z: number; }

// One effect type. In Frankendom this is data (catalogue or zone), not code.
export interface EffectKind {
  density: number; // equal to AIR_DENSITY = no gravity; below it the mote rises
  drag: number;    // drag coefficient
}

export interface Mote {
  pos: Vec3;
  vel: Vec3;
  kind: EffectKind;
  left: number;      // seconds of life left
  collides: boolean;
}

export class MotePool {
  private readonly motes: Mote[] = [];
  constructor(private readonly capacity: number) {}

  get count(): number { return this.motes.length; }

  // Adds up to the free room. The rest of the burst is dropped; nothing is evicted.
  burst(n: number, make: (index: number) => Mote): number {
    const take = Math.min(n, Math.max(0, this.capacity - this.motes.length));
    for (let i = 0; i < take; i++) this.motes.push(make(i));
    return take;
  }

  // Variable step in seconds. blocked(p) is true when p is inside solid world.
  step(dt: number, blocked: (p: Vec3) => boolean): void {
    let i = 0;
    while (i < this.motes.length) {
      const m = this.motes[i];
      m.left -= dt;
      if (m.left < 0) {
        const last = this.motes.pop()!; // swap-remove
        if (i < this.motes.length) this.motes[i] = last;
        continue; // the mote moved into slot i is updated in this same pass
      }
      // Gravity scales with how far the density sits from air density.
      const g = BASE_GRAVITY * (m.kind.density - AIR_DENSITY) / m.kind.density;
      m.vel.z -= g * dt;
      // Exponential drag: the same result at any frame rate.
      const k = Math.exp(-(BASE_GRAVITY / AIR_TERMINAL_VELOCITY) * m.kind.drag * dt);
      m.vel.x *= k; m.vel.y *= k; m.vel.z *= k;
      this.move(m, dt, blocked);
      i++;
    }
  }

  private move(m: Mote, dt: number, blocked: (p: Vec3) => boolean): void {
    if (!m.collides) {
      m.pos.x += m.vel.x * dt; m.pos.y += m.vel.y * dt; m.pos.z += m.vel.z * dt;
      return;
    }
    // One axis at a time. A blocked axis is reverted to its last free value.
    for (const axis of ["x", "y", "z"] as const) {
      const old = m.pos[axis];
      m.pos[axis] = old + m.vel[axis] * dt;
      if (blocked(m.pos)) m.pos[axis] = old;
    }
  }
}

function unitDirection(rand: () => number): Vec3 {
  for (;;) {
    const x = rand() * 2 - 1, y = rand() * 2 - 1, z = rand() * 2 - 1;
    const l2 = x * x + y * y + z * z;
    if (l2 > 0 && l2 <= 1) {
      const l = Math.sqrt(l2);
      return { x: x / l, y: y / l, z: z / l };
    }
  }
}

// Hit sparks: one outward burst from a point, random speed and life inside the given ranges.
export function hitSparks(
  pool: MotePool, at: Vec3, kind: EffectKind, rand: () => number,
  n: number, speedMin: number, speedMax: number, lifeMin: number, lifeMax: number,
): number {
  return pool.burst(n, () => {
    const d = unitDirection(rand);
    const s = speedMin + (speedMax - speedMin) * rand();
    return {
      pos: { x: at.x, y: at.y, z: at.z },
      vel: { x: d.x * s, y: d.y * s, z: d.z * s },
      kind,
      left: lifeMin + (lifeMax - lifeMin) * rand(),
      collides: true,
    };
  });
}
```

Typecheck: `work/cubyz-particles.ts` plus `export {}`, copied to `/tmp/vf005-cubyz-particles.ts` on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in

- TARGET `src/fight/impact-fx.ts` (new, client only). A small pool of spark and dust motes, fed by the engine's landed-hit event at the contact point. The client never decides damage, and nothing here changes server state.
- Parity-checklist row 10 (hit impact / hitstop).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients: the effect pool is client state and the engine owns the hit); rules 7-9 n/a

Decision (proposed): adapt. The data shape (per-effect count, speed and life ranges, drag, density, collides flag), the hard capacity with drop, and the swap-remove pool are worth taking. The donor's way of triggering effects (a server packet that says "spawn this emitter at this position") is not: in Frankendom the client should derive sparks from the server-verified hit event, not from a separate effects packet.

Acceptance: On each landed hit a player sees a short burst of sparks at the contact point that fades within the effect's life. A client test asserts the pool never exceeds its cap in a three-attacker fight and that every mote is removed once its life is spent.

Best transferable idea: Describe each hit-spark or dust effect as a small data record (count, speed and life ranges, drag, density, collides) and run all of them in one pool with a hard cap that drops a new burst when full and removes dead entries by swapping in the last one.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism, and no donor lines are copied.
- No gore in this donor. There are no blood, wound, decal, finisher or hitstop systems here. This note covers the spark and dust pool only, so blood decals and finishers need a different donor.
- The donor's trigger is a fire-and-forget packet with no acknowledgement, and each client re-rolls its own randomness (`particles.zig:312`). Frankendom's server-verified kills mean sparks must come from the verified event, not from a separate spawn packet. Do not port the packet.
- The capacity rule drops the newest burst when full (`particles.zig:537`). In a three-attacker fight that can hide the most important hit. Frankendom must choose a per-hit budget or drop the oldest of the same kind, and test it. The donor does neither.
- Division by density (`particles.zig:245`) has no guard. A zero density in data gives infinity or NaN. Frankendom's data loader must reject a zero or negative density.
- Collision moves each axis once per frame with one box test (`particles.zig:257-279`), so a fast mote can pass a thin wall. The Pit has no voxel world, so the Pit should set `collides` to false. Only zones would use it.
- Light sampling (`particles.zig:293`) reads the voxel light grid, which the Pit client does not have. Keep the light step optional.
- The `deltaTime` from the game loop is variable (`game.zig:850`). The exponential drag is frame-rate independent, but the collision step is not sub-stepped. The loop that produces `deltaTime` was not read.
- Not read: the rest of `physics.collision.collides` after line 80, `RandomRange.get`, `getLight`, the particle shaders and the render path after line 60. The renderer's billboard math (`particles.zig:43-44`) was not checked against the shader.
