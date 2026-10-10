# diasurgical-DevilutionX (camera, cell 14)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/engine/render/scrollrt.cpp` | Licence: Sustainable Use License 1.0 (LICENSE.md line 1: "# Sustainable Use License"; a restricted, non-open-source licence, so clean-room, shape only) | C++ | symbol `GetOffsetForWalking` (with `CalcFirstTilePosition`, `GetScreenPosition`, `DoWalk`, `FixPlayerLocation`)

Checked: camera_scope world camera. The list hint `Translations/ro.po` is a translation file and was not the camera. The camera is the view anchor `ViewPosition` plus the walk offset in `scrollrt.cpp`. Read in full: `GetOffsetForWalking` (1575-1592), `CalcFirstTilePosition` (1178-1221), `GetScreenPosition` (1722-1734), `DrawView` (1313-1320, called from the frame draw at 1871), `CalcViewportGeometry` (1675-1720), `DoWalk` commit (403-431, read in part: the sub-tile light update and the tile commit), `StartStand` (2592-2605) and `FixPlayerLocation` (2581-2590). Grep checks: every write to `ViewPosition` in the walk path (player.cpp 2522, 2548, 2586, 3275; diablo.cpp 3213; missiles.cpp 3681; monster.cpp 1502-1511; loadsave.cpp 2541; the debug ScrollView, `#ifdef _DEBUG` at 1747). `StartWalk` and `HandleWalkMode` do not write `ViewPosition` (grep). Confidence: high on the offset arithmetic and the commit order; medium on the cause of the camera snap, which I took from `FixPlayerLocation` being called by `StartStand`, not from a run. Not read: `getProgressToNextGameTick` (animationinfo.h), the game tick rate, and the caller of `MonsterDeath` (monster.cpp 3180, seen by grep only).

Best transferable idea: Anchor the camera on the last committed position and glide it with the step's animation progress, so the view moves between two confirmed positions and snaps onto the new one at commit.

Decision (proposed): adapt - take the anchor-on-commit plus glide-by-progress shape for the world camera's step between positions; drop the tile grid, the isometric step table and the panel offsets, which are 2D.

Acceptance: While the hero steps, the world camera glides from the previous confirmed position to the new one over one step's duration and snaps to the confirmed position on the frame the commit lands; a client test asserts that the camera anchor equals the last committed position at every commit and that the glide offset is zero at commit.

## 1. Mechanism

- The view anchor is `ViewPosition`, a tile. The frame draw calls `DrawView(out, ViewPosition)` (scrollrt.cpp 1871). `DrawView` calls `CalcFirstTilePosition` (1319), which starts from the anchor, adds the grid offset from `CalcTileOffset`, adds the tile shift from `CalcViewportGeometry`, and adds the walk offset while the local player walks (1182-1184, camera mode). The player is drawn at the centre of the area above the main panel (`playerPosition` at 1682, and the viewport geometry in 1675-1720).
- The walk offset (`GetOffsetForWalking`, 1575-1591), in order: take the direction's full-step screen vector from `MovingOffset[8]` (1579: for example West `{ -64, 0 }`, South `{ 0, 32 }`); multiply by the animation progress (1584); divide by `baseValueFraction` (128, animationinfo.h 114) (1585); if camera mode, negate (1587-1588). So the camera's world shift at full progress is the negated step vector: 64 px sideways for a west step, 32 px down for a south step. Tile width 64 and tile height 32 (`dun_tile.hpp` 7-8).
- The progress is game-tick based: `getAnimationProgress` (animationinfo.cpp 62-82) adds `getProgressToNextGameTick()` (the fraction of time to the next game tick) to the ticks already used by the sequence (78). So the glide is driven by the game tick and interpolated by the time to the next tick, not by the render frame. (The helper itself is not read.)
- Commit (`DoWalk`, player.cpp 403-431): while the last animation frame has not been reached, the function only updates the sub-tile light offset and returns false (413-416). When the last frame is reached, the tile changes: `player.position.tile = player.position.temp` (421). Then `StartStand` (431).
- The anchor moves at the stand: `StartStand` (player.cpp 2592) calls `FixPlayerLocation` (2601), which sets `ViewPosition = player.position.tile` for the local player (2586). `HandleWalkMode` sets `position.future` to the next tile at the start of the step (135) and does not touch `ViewPosition`. So during a step the anchor is the old tile, and the walk offset carries the view from the old tile to the new one. At commit the anchor jumps to the new tile and the offset returns to zero in the same frame.
- Secondary (not in the sketch): when the Diablo monster dies, `MonsterDeath` moves `ViewPosition` one tile per call toward Diablo's tile on each axis (1501-1511), and calls `PrepDoEnding` when the death counter reaches 140 (1514). This is a slow tile-by-tile pan to the boss. The caller was not read beyond the grep at monster.cpp 3180.

## 2. Key functions

- `GetOffsetForWalking`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/engine/render/scrollrt.cpp` 1575-1592. Per-direction step vector times progress, negated for the camera.
- `CalcFirstTilePosition`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/engine/render/scrollrt.cpp` 1178-1221. Anchor plus grid and walk offsets; the panel and edge shifts.
- `GetScreenPosition`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/engine/render/scrollrt.cpp` 1722-1734. Tile to screen through the same offset (screen position = delta from the view, plus offset).
- `DoWalk` (commit): `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` 403-431.
- `FixPlayerLocation` and `StartStand`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` 2581-2590 and 2592-2605.
- `getAnimationProgress`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/engine/animationinfo.cpp` 62-82.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Camera anchored on the last committed position; the world shifted by the step vector times progress, negated | Step vectors West (-64, 0), South (0, 32) and the other six (scrollrt.cpp 1579) |
| Progress is the fraction of the step animation, from game ticks plus the time to the next tick | Fraction base 128 (animationinfo.h 114) |
| Anchor snaps to the new tile at the stand | Commit at the last animation frame (player.cpp 413, 421) |
| Player drawn at the centre of the play area | Panel height subtracted (1682 and the geometry function) |
| Tile size | 64 x 32 px (dun_tile.hpp 7-8) |
| Boss death pan: one tile per call toward the boss, ends at a counter | Counter 140 (monster.cpp 1514) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the anchor is the last committed tile; while a step is pending, the world shift is the negated step vector times progress; commit moves the anchor onto the new tile and clears the shift in the same call. It takes the step's screen vector as input (the donor reads it from a per-direction table) and takes the progress as an input computed from ticks (the donor's helper `getProgressToNextGameTick` is not read). It omits the tile grid alignment (`CalcTileOffset`), the tile shift and panel-cover offsets (`CalcViewportGeometry`, and the panel branch of `CalcFirstTilePosition`), the sub-tile light offset, the attack, spell and block snaps, the isometric conversion, the monster-death pan, and the debug scroll. The donor's step (`DoWalk`) takes the next tile from `position.temp` at commit (421); the sketch takes the target as input.

```ts
// Licence: Sustainable Use License 1.0 (donor; restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface V2 { x: number; y: number; }
export interface Tile { x: number; y: number; }

// anchor: the last committed tile (the camera's tile). pending: the step in progress, if any.
// stepPx: the screen-space vector of the full step (a data table in the engine, one per direction).
export interface StepState {
  anchor: Tile;
  pending: { to: Tile; stepPx: V2 } | null;
  progress: number; // 0..1 through the step animation
}

// Progress from game ticks: whole ticks into the step plus the fraction to the next tick (render-side interpolation).
export function stepProgress(ticksIntoStep: number, fractionToNextTick: number, ticksPerStep: number): number {
  const p = (ticksIntoStep + fractionToNextTick) / ticksPerStep;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

// The camera is anchored to the last committed tile. While a step is in progress the world is shifted
// by the step's screen vector scaled by progress, negated, so the view glides from the old tile to the new one.
export function cameraFor(s: StepState): { anchor: Tile; worldShiftPx: V2 } {
  if (!s.pending) return { anchor: s.anchor, worldShiftPx: { x: 0, y: 0 } };
  return {
    anchor: s.anchor,
    worldShiftPx: { x: -s.pending.stepPx.x * s.progress, y: -s.pending.stepPx.y * s.progress },
  };
}

// Called when the step's animation finishes: commit the tile and snap the anchor onto it.
// The glide offset returns to zero in the same call, so there is no visible jump.
export function commitStep(s: StepState): void {
  if (!s.pending) return;
  s.anchor = s.pending.to;
  s.pending = null;
  s.progress = 0;
}

// The player is drawn at the centre of the play area. The donor subtracts the main panel height first; the sketch takes the area as input.
export function playerScreenCentre(viewW: number, viewH: number): V2 {
  return { x: viewW / 2, y: viewH / 2 };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, on a copy with `export {}` at the end, passed with no errors.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client only; the engine never reads it): the anchor-on-commit camera and the glide between confirmed positions. Parity-checklist row 11 (fight camera). Row 11 is the fight camera; the world camera has no row of its own in the addendum, so the owner should confirm.
- today: the Frankendom camera code is not read in this pass (not read).
- Reuse tag: clean-room (Sustainable Use License; shape only, no code)
- Brief rule served: camera is client-only (the engine does not read it); row 11; world camera (owner's priority); the anchor is a committed state, so the server's confirmed tile is the anchor and the local glide is display only.

## 6. Gaps and risks

- Sustainable Use License 1.0: a restricted licence, not open source. Clean-room only; nothing is adapted line by line.
- The donor is a 2D isometric tile game. The tile grid, the step table and the panel offsets do not transfer. What transfers is the anchor and glide, and it needs a continuous-position version (a lerp from the last confirmed position to the next over the step duration) rather than per-direction tables.
- The donor's anchor is the local player's last committed tile, which is the same as a server-confirmed position only if the local game commits on the server's word. Frankendom's rule is that the server verifies kills; the camera must not show a glide to a position the server has not confirmed, or it will show a jump when the server corrects it. The sketch does not model correction.
- The donor's snap is at the stand (`StartStand`), not at a separate network event. A Frankendom version needs an explicit commit event from the server.
- Progress comes from game ticks plus the time to the next tick (animationinfo.cpp 78). The donor's tick rate and the helper were not read, so the frame-rate independence of the glide is inferred from this line, not measured.
- The Diablo death pan is a boss-death cinematic (one tile per call, 140 counter). Frankendom can use the same shape for a boss intro camera, but it is a sequence, not a fight camera, and its timing is zone data.
- No lock-on, no framing of several enemies, no shake, no FOV change, no wall collision. The donor has none of these. The many-on-one framing must be written from scratch.
- Pit camera: not applicable. This is a world camera note (camera_scope world).

Reuse tag: clean-room (Sustainable Use License; shape only, no code)
Brief rule served: camera is client-only; row 11; world camera (owner's priority)
