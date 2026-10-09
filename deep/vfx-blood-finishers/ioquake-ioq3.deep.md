# ioquake-ioq3 (vfx-blood-finishers, cell 13)

Donor: /mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_particles.c | Licence: GPL-2 (file header: GPL v2 or later) | C | symbol CG_Particle_Bleed / CG_BloodPool / CG_ParticleBloodCloud
Symbol check: CG_Particle_Bleed (1458), ValidBloodPool (1666), CG_BloodPool (1712), CG_ParticleBloodCloud (1775) and CG_AddParticles (854) confirmed on the VPS. The file is 2035 lines.

## 1. Mechanism
- All blood is client-side cosmetic particles drawn from a fixed pool (a free list and an active list; MAX_PARTICLES is 1024, or 8192 under WOLF_PARTICLES, lines 141-145). Nothing here changes game state.
- CG_Particle_Bleed(shader, start, dir, fleshEntityNum, duration): one small smoke-type sprite (4 units, end size 4 + rand % 3, random roll, colour BLOODRED) at the wound, moving at vel z -20 units per second (position = origin + velocity times elapsed seconds, applied in CG_AddParticles). Its fade starts at once when the hit is on a flesh entity (fleshEntityNum non-zero) and 100 ms later for a world hit, then alpha falls linearly to zero at the end time (set from the given duration). Base alpha 0.75. If the free list is empty it returns without spawning.
- CG_ParticleBloodCloud(cent, origin, dir): a burst of 32-unit smoke puffs. Count is the vector length divided by 32, rounded up (loop `i < dist` on a float), and at least one. Every puff is created at the same hit origin (the loop advances a local `point` along the direction but copies `origin` into each puff, so the puffs are not laid out along the direction). Each has vel z -1, lives 350 ms plus or minus 100 ms (`crandom`) and starts fading at once; colour BLOODRED; alpha 0.75; the loop stops silently if the free list runs out.
- ValidBloodPool(start): before a floor splat is placed, four probes (a 2 by 2 grid at minus 8 and plus 8 units along the `right` and `up` axes derived from a straight-up normal, started 0.5 above the landing point) are traced 1 unit straight down against CONTENTS_SOLID. Every probe must hit world geometry (entity number not below ENTITYNUM_WORLD) and not start inside solid, and must actually hit (fraction below 1). If any fails, no pool is made.
- CG_BloodPool(le, shader, trace): if the pool is valid, one flat decal (type P_FLAT_SCALEUP, random roll) at the landing trace's end point, start size 8 units growing to 16 units over 3000 ms, both scaled by one random factor from 0.4 to 1.0. Its end time and fade start are both set 3000 ms out, but for this type the end time only drives the size growth (width and height are clamped at the end size afterwards). The draw code for this type writes alpha 255 and ignores the particle's 0.75 alpha, and BLOODRED means unmodulated white (the shader supplies the colour). If the free list is empty it returns before the validity probes.
- CG_AddParticles runs once per rendered frame: each particle's alpha is its alpha plus elapsed time times its alpha velocity (all blood particles here have zero alpha velocity). A particle whose alpha reaches 0, or whose end time has passed for the smoke, anim, bleed, smoke-impact, weather-flurry and flat-scaleup-fade types, returns to the free list. A plain P_FLAT_SCALEUP particle (the blood pool) has no expiry in this function; the only code read that ends one is CG_OilSlickRemove (1638-1664), which converts scale-up particles whose `snum` equals 1 into the fading type with a 100 ms life. CG_BloodPool never sets `snum`, so a blood pool is not removed by anything I read; it stays until the particle array is cleared (CG_ClearParticles, 162-186). Positions are origin + vel * t + accel * t squared, t in seconds.
- Inputs: hit point, direction, flesh entity number, duration, shader, cg.time (ms). Output: particle records drawn by CG_AddParticleToScene (smoke branch lines 427-, flat scale-up branch 637-700, read in part). Runs on the event (spawn) and per render frame (update). No caller of these three spawn functions was found in the other code/cgame/*.c files (grep), so what triggers them is not read.

## 2. Key functions
- CG_Particle_Bleed (ioq3) | /mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_particles.c | 1458-1506 | one falling blood sprite (pool alloc 1465-1471; sizes 1485-1489; fade 1480-1483; velocity 1496; alpha 1504).
- CG_ParticleBloodCloud (ioq3) | /mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_particles.c | 1775-1850 | burst of 32-unit puffs, all at the hit origin (count from length / 32).
- ValidBloodPool (ioq3) | /mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_particles.c | 1666-1710 | 2 by 2 downward probe grid (offsets -8 and +8, 0.5 extrude); all must hit world.
- CG_BloodPool (ioq3) | /mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_particles.c | 1712-1770 | flat floor decal, random size, 3000 ms size ramp (not a life; no expiry in CG_AddParticles), only if the pool is valid.
- CG_AddParticles (ioq3) | /mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_particles.c | 854-975 | per-frame alpha, expiry by type, position integration; returns particles to the free list.
- CG_OilSlickRemove (ioq3) | /mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_particles.c | 1638-1664 | converts scale-up particles with snum 1 to the fading type (the only scale-up removal read).

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed particle pool with a free list; spawn fails silently when empty | pool size 1024 (theirs, MAX_PARTICLES line 144; reset in CG_ClearParticles) |
| Chain of puffs along a direction, count = length / step, rounded up, minimum 1 | 32-unit puff size and count divisor (theirs, LARGESIZE line 1773) |
| Floor decal kept only when a downward probe grid lands on world | 16-unit grid spacing, plus or minus 8 units (theirs, lines 1678, 1688); 0.5 extrude each way, so a 1-unit probe (theirs, line 1668) |
| Random decal size within a band | 0.4 to 1.0 scale band, 8 and 16 unit base sizes (theirs, lines 1746-1752) |
| Delayed fade for world hits, instant fade for flesh | 100 ms delay (theirs, line 1483) |
| Timed lifetimes | 3000 ms pool size ramp (theirs, line 1737; not a life); 350 ms plus or minus 100 ms puff life (theirs, line 1820); bleed duration passed by caller |
| Falling sprite | -20 units per second z velocity (theirs, line 1496); 0.75 alpha (theirs, lines 1504, 1767, 1845) |

## 4. TypeScript sketch
simplified: no screen-space billboard or roll, no BLOODRED colouring or per-type draw branch; the donor's free-list pool is a plain array with a cap; probe axes are fixed to world x and y (the donor derives `right`/`up` from a straight-up normal); the donor has no expiry for the blood pool, the sketch adds an explicit `pool` lifetime parameter because Frankendom needs one; spawn order and early-outs on a full pool are reduced to the cap check.

```ts
// Licence: GPL-2 (ioquake-ioq3). CLEAN-ROOM: written from the mechanism, no donor lines.
type V3 = { x: number; y: number; z: number };
type Puff = { kind: "sprite" | "pool"; pos: V3; vel: V3; born: number; endAt: number; fadeAt: number; size0: number; size1: number; alpha: number };
const MAX_PARTICLES = 1024;               // theirs: fixed pool; spawn is dropped when full
const parts: Puff[] = [];
const CLOUD_STEP = 32, POOL_GROW_MS = 3000;

function alloc(p: Puff): void { if (parts.length < MAX_PARTICLES) parts.push(p); }

function spawnBleed(pos: V3, onFlesh: boolean, now: number, duration: number, rnd: () => number): void {
  alloc({ kind: "sprite", pos, vel: { x: 0, y: 0, z: -20 }, born: now, endAt: now + duration,
    fadeAt: onFlesh ? now : now + 100, size0: 4, size1: 4 + Math.floor(rnd() * 3), alpha: 0.75 });
}

function spawnCloud(origin: V3, dirLength: number, now: number, rnd: () => number): void {
  const n = Math.max(1, Math.ceil(dirLength / CLOUD_STEP));
  for (let i = 0; i < n; i++) {                              // every puff sits at the hit origin, as the donor does
    alloc({ kind: "sprite", pos: { ...origin }, vel: { x: 0, y: 0, z: -1 }, born: now,
      endAt: now + 350 + (rnd() * 2 - 1) * 100, fadeAt: now, size0: CLOUD_STEP, size1: CLOUD_STEP, alpha: 0.75 });
  }
}

// probe(a, b) returns true only when the trace from a to b hits world geometry.
function validPool(at: V3, probe: (a: V3, b: V3) => boolean): boolean {
  for (const dx of [-8, 8]) for (const dy of [-8, 8]) {
    const top = { x: at.x + dx, y: at.y + dy, z: at.z + 0.5 };
    if (!probe(top, { x: top.x, y: top.y, z: top.z - 1 })) return false;
  }
  return true;
}

function spawnPool(at: V3, now: number, rnd: () => number, probe: (a: V3, b: V3) => boolean, lifeMs: number): void {
  if (parts.length >= MAX_PARTICLES || !validPool(at, probe)) return;
  const s = 0.4 + rnd() * 0.6;
  // donor: size ramps 8 -> 16 over 3000 ms then stays; no expiry. lifeMs is Frankendom's addition.
  alloc({ kind: "pool", pos: at, vel: { x: 0, y: 0, z: 0 }, born: now, endAt: now + lifeMs,
    fadeAt: now + lifeMs, size0: 8 * s, size1: 16 * s, alpha: 0.75 });
  void POOL_GROW_MS;
}
```

## 5. Lands in
- Frankendom target: src/fight/blood-fx.ts (proposed new module; src/fight/ holds characters.ts and index.ts today). Client presentation, triggered by the engine's server-verified kill/hit event.
- today: src/finisher-blood.ts (moving), src/gore.ts (moving)
- Parity-checklist row: 8 (blood, wounds, pools, decals; K5); row 9 (finishers; K6) for the finisher blood path.
- Reuse tag: rewrite-from-idea (GPL-2)
- Brief rule served: (category default, not per-cell) 2 (engage is a state change); rules 7-9 n/a

## 6. Gaps and risks
- Client-only and unseeded: rand() and cg.time (ms) drive it. Replays need a seeded source, and the spawn must be driven by recorded events.
- Floor splats depend on a client-side trace against the level. Frankendom arenas need their own surface query.
- The fixed pool silently drops spawns when full, and in the code read the blood pool never expires, so 1024 slots can fill with floor splats and then every later spawn is dropped. Frankendom needs an explicit lifetime for pools, a soft cap and a rule for which effects win (MAX_ATTACKERS = 3 bounds simultaneous wounders but not accumulated floor blood).
- The flesh flag is an entity number; Frankendom needs an equivalent flag on hit or body parts.
- Puff velocities and alpha are in engine units; the sketch keeps the numbers as the donor's, labelled theirs.
- Rulings check: no conflict with one engine, zones as data or one ledger, as long as blood is a consumer of the server-verified event and never feeds a hit or kill decision.
- Not read: CG_AddParticleToScene outside lines 395-540 and 630-700, the callers of the spawn functions, and any other removal path for pools (for example local-entity code).
