# graememcc-micropolisJS (vfx-blood-finishers, cell 3)

Donor: `/mnt/frankendom-donors/graememcc-micropolisJS/src/explosionSprite.js` | Licence: GPL-3.0 with additional terms (explosionSprite.js header, lines 3-10: "released under the GNU GPL v3, with some additional terms"; repo COPYING is GPL Version 3; repo LICENSE adds that no trademark or publicity rights are granted) | JavaScript (ES modules) | symbol `ExplosionSprite.move` (with `startFire`)

Checked: `explosionSprite.js` read in full (1-88). Crash callers and their explode methods read: `airplaneSprite.js` 78-104, `copterSprite.js` 100-107, `trainSprite.js` 120-126, `boatSprite.js` 160-179. Sprite loop and removal read: `spriteManager.js` 74-109, 128-136, 272-276. Collision read: `spriteUtils.js` 161-169. Triggers read: `monsterSprite.js` 156-165, `tornadoSprite.js` 64-75, `disasterManager.js` 156-169 and 242-255, `tileUtils.js` 101-103, `tile.ts` 111-113. The hint file `worldEffects.js` (78 lines) read in full: it is a deferred tile-write overlay (a map write buffer), not a visual effect, so it is not the mechanism. Other candidates opened: `baseSprite.js`, `monsterSprite.js`, `tornadoSprite.js`. Confidence: high on the blast-to-hazard path and the argument bug (verified by reading the function). Not read: `getDistance` callers beyond the sprite collision, how fire tiles burn out, and what `SOUND_EXPLOSIONHIGH` plays. `camera_scope`: not applicable.

Best transferable idea: A destroyed unit starts a fixed timed blast; when the blast ends it leaves a five-cell hazard (centre plus four diagonal neighbours), and any live unit within a small Manhattan radius is destroyed in the same way, so one death can chain into a group.
Decision (proposed): adapt - keep the timed blast, the five-cell hazard and the chain rule; fix the donor's ignored arguments and its wrong diagonal list (both defects below); the animation stays client-only and the hazard is engine state.
Acceptance: In a fight, an enemy that dies within 30 px (Manhattan) of another enemy sets off that enemy in the same tick; the death shows a six-frame blast over about 12 sim ticks; the engine marks five distinct cells (the centre and four diagonals) as hazard, and a server test asserts that exactly those five cells change and that the chained enemy dies in the tick its neighbour's blast starts.

## 1. Mechanism

- Trigger, four routes into one death path (each sets `frame = 0` and makes an explosion at its position):
  - Crash of a vehicle: `AirplaneSprite.explodeSprite` (airplaneSprite.js 100-104), `CopterSprite.explodeSprite` (copterSprite.js 103-107), `TrainSprite.explodeSprite` (trainSprite.js 122-126), `BoatSprite.explodeSprite` (boatSprite.js 175-179). Each one runs `frame = 0`, then `spriteManager.makeExplosionAt(x, y)` (spriteManager.js 134-136), then emits a crash event.
  - Chain by collision: an airplane that touches a helicopter or another airplane explodes that one, then itself (airplaneSprite.js 80-89). A monster explodes any live airplane, helicopter, ship or train within range (monsterSprite.js 160-164). A tornado does the same (tornadoSprite.js 69-73).
  - Disaster: a user plane crash explodes the plane, or makes one and explodes it (disasterManager.js 157-169). A meltdown adds four explosions at the corners of a 4x4 block (242-246) and ignites all 16 tiles directly (251-255).
- The collision test (spriteUtils.js 166-169): both sprites must be alive (`frame !== 0`) and `getDistance` below 30. `getDistance` is `|dx| + |dy|` in pixels (spriteUtils.js 161-163), so the radius is a diamond.
- The sprite loop (spriteManager.js 84-93): each sim step increments `spriteCycle`, skips dead sprites, calls `move` on the rest, then removes every sprite whose frame is 0 (272-276).
- Blast progression (explosionSprite.js 56-78): the constructor sets the frame to 1 (29) with a 48 by 48 size and a -24 offset (25-28). On every even sim cycle (57) the frame advances (66). On the first frame it emits the high explosion sound and the explosion report (58-64). When the frame passes 6 (69), the frame becomes 0 and `startFire` runs five times (72-76), then the sprite is pruned.
- `startFire` (36-53): it overwrites its arguments with the blast's own tile (37-38), returns on a tile that is neither combustible nor dirt (46-47), returns on zone tiles (49-50), and otherwise sets a random fire tile (52; `tileUtils.js` 101-103 picks one of four fire tiles).
- Numbers from the code: six frames, one frame per two sim cycles, so about twelve sim cycles from start to end; a 30 px collision radius; a 48 px sprite. Fire placement is one call per listed offset.

## 2. Key functions

- `ExplosionSprite.move`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/explosionSprite.js` 56-78 (advance on even cycles, emit at frame 1, end at frame 7 and stamp fire).
- `ExplosionSprite.startFire`: same file, 36-53.
- Crash helpers: `airplaneSprite.js` 100-104; `copterSprite.js` 103-107; `trainSprite.js` 122-126; `boatSprite.js` 175-179.
- `SpriteManager.moveObjects` and `pruneDeadSprites`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/spriteManager.js` 76-94 and 272-276; `makeExplosionAt` 134-136.
- Collision: `/mnt/frankendom-donors/graememcc-micropolisJS/src/spriteUtils.js` 161-169.
- Meltdown: `/mnt/frankendom-donors/graememcc-micropolisJS/src/disasterManager.js` 242-255.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Timed blast: a frame counter that advances on every other sim tick; the blast ends when the frame passes its last frame | Six frames (theirs, explosionSprite.js 85 `frames`; the end test at 69) |
| Blast ends by stamping a small pattern into the world, not by damage | Five cells: centre plus four diagonals at one tile (the intent; calls at 72-76) |
| Chain: a live unit within a radius is set off by a dying one | 30 px, Manhattan (theirs, spriteUtils.js 162 and 168) |
| Dead units are skipped in the loop and removed after the step | Frame 0 means dead (theirs, spriteManager.js 87, 274) |
| Blast sprite size and anchor | 48 px, -24 offset (theirs, explosionSprite.js 25-27) |
| Fire only where the terrain can burn (not zones, not water) | Burnable test (theirs, explosionSprite.js 46-50) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the blast advances on even ticks, ends when the frame passes six, then produces the hazard, and the chain test is a separate step on live units. It fixes two donor defects: the five cells are now the centre plus four distinct diagonals (the donor ignores its arguments, and its list has the south-east offset twice and no north-east offset), and the burnable filter is a callback. It omits the start sound and the explosion report, the sprite draw frame, the crash events, the meltdown's direct ignition of a 4x4 block, the fire tile choice (`randomFire`), and the donor's tile lookup (`getTile` through the sprite's map).

```ts
// Licence: GPL-3.0 with additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const EXPLOSION_FRAMES = 6;   // donor: frames 1..6 are drawn; the blast ends when the frame passes 6
const CHAIN_RADIUS_PX = 30;   // donor checkSpriteCollision: Manhattan distance below 30 px, both sides alive

interface Cell { x: number; y: number; }      // tile coordinates
interface Hazard { kind: "fire"; cells: Cell[]; }

interface Blast {
  x: number;       // tile coordinates of the blast
  y: number;
  frame: number;   // 1..EXPLOSION_FRAMES while running
  done: boolean;
}

function newBlast(x: number, y: number): Blast {
  return { x, y, frame: 1, done: false };
}

// Called once per sim cycle. The frame advances on even cycles only (half the sim rate).
// Returns the hazard when the blast ends, else null.
// Fixed: the five cells are the centre plus the four diagonal neighbours. The donor passes
// pixel offsets (+/-16 px) to a helper that ignores them and stamps the blast's own tile five times.
function tickBlast(b: Blast, cycle: number, canBurn: (c: Cell) => boolean): Hazard | null {
  if (b.done) return null;
  if ((cycle & 1) === 0) b.frame++;
  if (b.frame <= EXPLOSION_FRAMES) return null;

  b.done = true;
  const all: Cell[] = [
    { x: b.x, y: b.y },
    { x: b.x - 1, y: b.y - 1 }, { x: b.x + 1, y: b.y + 1 },
    { x: b.x - 1, y: b.y + 1 }, { x: b.x + 1, y: b.y - 1 },
  ];
  return { kind: "fire", cells: all.filter(canBurn) };
}

interface Vehicle {
  id: number;
  x: number;   // pixels
  y: number;
  alive: boolean;
}

// Chain reaction: a live source destroys every other live vehicle within the radius.
function chainTargets(src: { x: number; y: number }, vehicles: Vehicle[]): number[] {
  const out: number[] = [];
  for (const v of vehicles) {
    if (!v.alive) continue;
    const d = Math.abs(v.x - src.x) + Math.abs(v.y - src.y);
    if (d < CHAIN_RADIUS_PX) out.push(v.id);
  }
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/micropolis-blast-hazard.ts), exit 0. The file is `work/micropolis-blast-hazard.ts`.

## 5. Lands in

- TARGET `src/fight/death.ts`: the death event starts the blast and the chain rule runs in the engine, once, when a unit dies. The five-cell hazard is engine state (zone data for what it does). The blast animation is client-only.
- Parity-checklist row 17 (death/respawn). Hint row 10 (hit impact) does not fit: this is a destruction event, not a hit reaction.
- today: (not read) Frankendom's current death presentation and any ground effects.
- Reuse tag: rewrite-from-idea (GPL-3.0 with additional terms; clean-room, shape only; the sketch copies no lines)
- Brief rule served: 17 (death/respawn), the ruling that kills are server-verified (the chain kill is decided in the engine), and zones as data (the hazard cells are zone data).

## 6. Gaps and risks

- Defect 1, ignored arguments: `startFire(x, y)` overwrites x and y with the blast's own tile (explosionSprite.js 37-38). Every call stamps the same tile, so the five-cell burst is one tile. Fix: convert the passed pixel offsets to tiles and use them (the sketch takes tile coordinates).
- Defect 2, wrong diagonal list: the calls at 74 and 76 are both the south-east offset (+16, +16), and the north-east offset (+16, -16) is never called. Fix: four distinct diagonals (the sketch does).
- Design point: the blast's timing is tied to sim cycles, so a slow sim makes the blast slow. For Frankendom, use fixed engine ticks and say so in the acceptance test.
- Design point: the chain test is a diamond (Manhattan), so diagonal neighbours at the same distance are treated differently from a circle. Keep Manhattan only if we want that shape; it is cheap either way.
- Design point: the stamp skips zone tiles (49-50), so a blast never burns a building. Frankendom zones are data; the rule should be a zone flag, not a hard-coded check.
- Frankendom risk: a chain in a many-on-one fight can take out a whole group in one tick. Keep the chain radius as zone data and cap the number of chain kills per tick (the sketch returns the full list; the cap is not in the donor).
- Not read: how fire tiles burn out (the lifetime of the hazard), `getDistance` callers other than the collision, and the sound asset. The fire lifetime matters before we copy the hazard.
- Not written up here: the crash events (news and report text) and the meltdown's direct 4x4 ignition (disasterManager.js 251-255) are real but are a separate disaster mechanism.
