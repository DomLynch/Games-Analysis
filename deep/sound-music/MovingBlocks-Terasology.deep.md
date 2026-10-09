# MovingBlocks-Terasology (sound-music, cell 15)

Donor: /mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/logic/characters/CharacterSoundSystem.java | Licence: Apache-2.0 per SPDX header | Java | symbol CharacterSoundSystem.onFootstep

## 1. Mechanism
- Event-driven footsteps, jumps and landings for a character. Each is a handler for an event (FootstepEvent, JumpEvent, VerticalCollisionEvent); which system emits them was not read. The same class also has respawn and swim-stroke handlers (139-155, not modelled). Nothing runs per frame. Two death handlers (`onDeath` on `DoDestroyEvent` 122-128, `onPlayerDeath` 130-137) play a random death clip at the death volume with no throttle and no `lastSoundTime` update.
- Footstep: the block under the feet is the block at the character's floored local position with y minus one. If that block defines step sounds, they are used; otherwise (including a block with no sounds object, which logs an error, 62-63) the character's own footstep set is used. If the set is non-empty and `lastSoundTime + MIN_TIME < now` (strict, MIN_TIME = 10 ms, line 38), i.e. more than MIN_TIME has passed since this character's last sound, one clip is picked at random and a PlaySoundEvent is sent with the footstep volume. The last-sound time is saved.
- Jump: the same throttle. It uses the jump set and falls back to the footstep set. Volume is the jump volume.
- Landing: the fall speed is the negative of the vertical velocity. The volume modifier is (fall speed minus 7) times 0.2. At or below zero, nothing plays. The modifier is capped at 2. Then, with the same throttle, a clip from the landing set (or footsteps) is played at landing volume times the modifier.
- Inputs: the event, the character's sound component (sets, volumes, last-sound time), the world block lookup, game time in ms. Output: a PlaySoundEvent sent to the entity.

## 2. Key functions
- CharacterSoundSystem.onFootstep (Terasology) | /mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/logic/characters/CharacterSoundSystem.java | 53-75 | surface-based step set, throttle, random pick.
- CharacterSoundSystem.onJump (Terasology) | /mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/logic/characters/CharacterSoundSystem.java | 78-92 | jump set with footstep fallback, same throttle.
- CharacterSoundSystem.onLanded (Terasology) | /mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/logic/characters/CharacterSoundSystem.java | 95-120 | fall-speed volume ramp with a cap, landing set with footstep fallback.
- CharacterSoundSystem.onDeath / onPlayerDeath (Terasology) | /mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/logic/characters/CharacterSoundSystem.java | 122-137 | death clip, no throttle.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Surface-keyed sound set, with the entity's default as fallback | per-block step sets (theirs, data) |
| Per-entity minimum gap between sounds | MIN_TIME 10 ms (line 38) (theirs) |
| Landing volume ramps with fall speed above a threshold, capped | threshold 7, factor 0.2, cap 2 (lines 41-43) (theirs) |
| Random clip pick from a set | none (algorithm) |

## 4. TypeScript sketch
simplified: the death handlers (no throttle) are omitted; the donor reads the block under the feet through the world provider (the sketch takes the surface set as an argument) and sends a `PlaySoundEvent` to the entity instead of returning a value.

```ts
// Licence: Apache-2.0 (MovingBlocks-Terasology). Sketch written from the mechanism; donor path cited above.
type Sets = { step: string[]; jump: string[]; land: string[] };
type Body = { lastMs: number; stepVol: number; jumpVol: number; landVol: number; sets: Sets };
type Play = { clip: string; volume: number };
const MIN_GAP_MS = 10, LAND_THRESHOLD = 7, LAND_FACTOR = 0.2, LAND_CAP = 2;   // all theirs

const pick = (xs: string[], rnd: () => number) => xs[Math.floor(rnd() * xs.length)];
const ready = (b: Body, now: number) => b.lastMs + MIN_GAP_MS < now;

function footstep(b: Body, now: number, surfaceSteps: string[] | undefined, rnd: () => number): Play | null {
  const set = surfaceSteps && surfaceSteps.length > 0 ? surfaceSteps : b.sets.step;   // surface first, body default
  if (set.length === 0 || !ready(b, now)) return null;
  b.lastMs = now;
  return { clip: pick(set, rnd), volume: b.stepVol };
}

function jump(b: Body, now: number, rnd: () => number): Play | null {
  const set = b.sets.jump.length > 0 ? b.sets.jump : b.sets.step;                     // fall back to steps
  if (set.length === 0 || !ready(b, now)) return null;
  b.lastMs = now;
  return { clip: pick(set, rnd), volume: b.jumpVol };
}

function landed(b: Body, now: number, velocityY: number, rnd: () => number): Play | null {
  let mod = (-velocityY - LAND_THRESHOLD) * LAND_FACTOR;               // fall speed above the threshold
  if (mod <= 0) return null;
  mod = Math.min(mod, LAND_CAP);
  const set = b.sets.land.length > 0 ? b.sets.land : b.sets.step;
  if (set.length === 0 || !ready(b, now)) return null;
  b.lastMs = now;
  return { clip: pick(set, rnd), volume: b.landVol * mod };
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (footstep, landing and death cue selection with the per-entity gap), fed by the fight's movement events.
- Parity row: 12 (combat sound cues).
- Reuse tag: adapt (Apache-2.0)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Voxel block surfaces. Frankendom needs its own surface type per arena tile or per material (zones as data, with a default set), or the surface lookup returns nothing.
- The random pick comes from `new FastRandom()` (line 44; seed not read). Cue choice must not use the fight RNG; replays (row 19) record only the cue events, not the picks.
- The throttle is per entity, not per sound. Two entities can still stack.
- The landing rule uses vertical velocity from a physics event. Frankendom's jump or fall model must emit the same event, or the rule has no input.
- The handlers only send playback events; Frankendom cue triggers must come from the one fight state (server-verified), never feed it.
