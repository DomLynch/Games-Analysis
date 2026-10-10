# ClassicUO (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Scenes/GameSceneDrawingSorting.cs` | Licence: BSD-2-Clause (LICENSE.md line 1: "BSD 2-Clause License"; SPDX header on the file) | C# | symbol `GameScene.UpdateMaxDrawZ` (with `Map.CalculateNearZ` in `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Map/Map.cs`)

Checked: `UpdateMaxDrawZ` read in full (GameSceneDrawingSorting.cs 57-213); `CalculateNearZ` and its neighbours read in full (Map.cs 159-219); the per-object alpha branch read (339-382); `CalculateAlpha` read (398-432); `Map.cs` read in full (290 lines); the chunk streaming in `Map.cs` (35-99, 247-273) read, not written up here (one note per cell). Tile flag values read by grep (TileDataLoader.cs 271-282, 421, 449, 481, 525). `GameScene.cs` 548-590 read in part (560-568, 580-590). `GetViewPort` (GameSceneDrawingSorting.cs 1186) read only at its declaration and the 1284-1294 tail. Callers: `UpdateMaxDrawZ` is called from `GetViewPort` (1294, per call), and forced from PacketHandlers.cs 4576 and 5348, OptionsGump.cs 3894 and Item.cs 316 (grep only; their purposes not read). `CalculateNearZ` has one outside caller (GameSceneDrawingSorting.cs 179-180) and recurses into itself (Map.cs 212-215). Not read: the order of objects within a cell (the stack sort in Chunk.cs, around 300-340, was not read), the draw loops past the lines that test the cap (580-640, 799-845), the caller chain of `FillGameObjectList` (so "per frame" is an inference). camera_scope: not a camera cell; the cut is a client draw rule, but see section 6 for how it bears on the world camera. Confidence: high on the three-phase order, the numbers and the fade targets (read, receipted); medium on the effect when several objects share a cell, because that depends on the unread stack order. Depth: full.

Best transferable idea: find the overhead roof nearest the player, flood-fill the connected roof tiles within 6 height units to get the lowest connected roof, cap the draw there but never below the player's height plus 16, and fade the roofs above the cap out over a few ticks instead of cutting them.
Decision (proposed): adapt - the height window and the flood-filled ground height fit a town-building occlusion rule for the world client, but it is client-only draw logic: it must not decide anything the server verifies, and the diagonal scan offset (section 6) and the unbounded flood fill must not be copied.
Acceptance: walking under a town roof, the roof tiles above the player fade out within a few frames and the player stays visible; a headless test of the cut asserts a draw cap of player height plus 16 for an eave 15 units up and the lowest connected roof height for a roof 18 units up.

## 1. Mechanism

Everything runs on the client, once the player's position changes (the cut is cached by x, y, z: lines 63-72).

(a) Set-up (74-88). The draw cap starts at 127, which means no ceiling (74-76). Roofs are hidden if the profile's DrawRoofs setting is off (77). The two height windows are player z + 14 (pz14, 87) and player z + 16 (pz16, 88).

(b) Phase 1, the player's own cell (90-137). The stack is walked from its head.
- A land tile at or above pz16 sets the cap to pz16 and stops the walk (101-107). Mobiles are skipped (113-116).
- Any other object above pz14 that is not transparent or foliage (mask 0x20004, 129) and is either not a roof or is a surface (130) lowers the cap to its z, but only if the cap is still higher (121). It also turns roof drawing off (134).

(c) Phase 2, one step to the +x, +y cell (139-202). The local ground value starts equal to the phase-1 cap (139-140). The player coordinates are incremented (141-142) and that cell is fetched (145). For each object in it that is not land and not a mobile (161-170): if it is above pz14, below the cap, not transparent and not surface (mask 0x204, 176), and a roof, then the cap becomes its z, the flood-fill table is cleared (179), the ground value becomes the flood-fill result (180), and roof drawing is turned off (186). If several roofs qualify, the last one that lowers the cap sets the ground value.

(d) Phase 3 (200-209). The cap becomes the ground value (203). If the ground value is below pz16, the cap is raised to pz16 (205-208). The local ground value is then set back to its local initial value (211): 127, or pz16 if the land cap fired in phase 1. That value feeds ground-level checks outside this note (not read).

(e) Flood fill, `Map.CalculateNearZ` (Map.cs 164-219). It uses a 64 x 64 visited table (166); a slot is entered once per fill. It takes the first static or multi on the tile that is a roof and within 6 units of the current z (192). It keeps the lowest such z (207-209) and recurses into the four neighbours with that z (212-215). A tile with no such roof stops the fill there (200-203). It reads only loaded chunks (174: `GetChunk(x, y, false)`), so an unloaded chunk ends the fill.

(f) Use in drawing. Any object with z at or above the cap is faded toward alpha 0 (339-355). A roof is faded to 0 while roof drawing is off (357-367). A translucent object is faded toward 178 (369-374). The rest are faded back to 255, except foliage (376-378). Fading moves 25 per step (416, 427). A step happens only when the 20 ms alpha timer is due (560-564), so the fade is paced by the clock, not by frame count. With the profile's object-fading switch off, the alpha jumps straight to the target (402-407).

(g) Tick and caching. `GetViewPort` (1186) calls `UpdateMaxDrawZ` (1294). `GetViewPort` is called from `FillGameObjectList` (GameScene.cs 548, 587). Nothing here runs on a fixed simulation step.

## 2. Key functions

- `UpdateMaxDrawZ`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Scenes/GameSceneDrawingSorting.cs` 57-213. The whole cut: cache check, three phases, sentinel reset.
- Per-object alpha branch: same file, 339-382. Above the cap, roof-hidden, translucent, default.
- `CalculateAlpha`: same file, 398-432. The step toward a target, with the switch for object fading.
- `CalculateNearZ`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Map/Map.cs` 164-219. The roof flood fill.
- Tile flags: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Assets/TileDataLoader.cs` 421 (Transparent 0x4), 449 (Surface 0x200), 481 (Foliage 0x20000), 525 (Roof 0x10000000), 278 (IsRoof).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ceiling search starts above the player's height | 14 units (theirs, GameSceneDrawingSorting.cs:87) |
| Draw cap never below player z plus 16 | 16 units (theirs, :88 and :205-208) |
| No ceiling sentinel | 127 (theirs, :74-76) |
| Roof connection window | 6 units (theirs, Map.cs:192) |
| Flood-fill visited table | 64 x 64 slots, 4096 entries (theirs, Map.cs:14 and 166); slots repeat every 64 tiles (a consequence of the mask) |
| Fade step | 25 per step (theirs, GameSceneDrawingSorting.cs:416 and 427) |
| Fade tick | 20 ms (theirs, Constants.cs:42; timer at GameScene.cs:560-564) |
| Fade targets | 0 above the cap or for hidden roofs; 178 translucent; 255 otherwise; foliage keeps its value (theirs, :339-378) |
| Roof test masks | 0x204 (transparent or surface excluded) for the roof scan; 0x20004 (foliage or transparent excluded) for the cap (theirs, :176 and :129) |
| Full fade from 255 to 0 | 11 ticks, about 220 ms (derived from 25 per step and 20 ms per tick, not measured) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three phases in donor order (own cell, then the +1,+1 roof scan with the flood fill, then the raise to player height plus 16), the 127 sentinel, the 14 and 16 windows, the 6-unit roof link, the last-write rule for several roofs, and the fade targets and step. It omits: the stretched-land average height; the graphic-range guard; the 64 x 64 aliasing (the sketch uses an exact visited set, so it does not copy the donor's collisions); the reset of the local ground value at the end of the donor (line 211), which only feeds ground-level checks; the object-fading profile switch; the foliage and overhead-mobile logic; and the 20 ms timer (the step is a pure function). It assumes the array order given to it is the donor's stack order, which was not verified.

```ts
// Licence: BSD-2-Clause (donor, permissive). Written from the described mechanism, not a line-by-line translation.
// clean-room
type Kind = 'land' | 'mobile' | 'static';
interface Obj { z: number; kind: Kind; roof: boolean; surface: boolean; transparent: boolean; foliage: boolean; translucent: boolean; }
type Cell = Obj[];                                   // one cell's stack, in the order the scene walks it
interface Column { cell(x: number, y: number): Cell | undefined; }   // undefined = not loaded

const NO_CAP = 127;      // donor sentinel for "no ceiling" (GameSceneDrawingSorting.cs:74-76)
const CEIL_LO = 14;      // donor pz14 = playerZ + 14 (line 87)
const CEIL_HI = 16;      // donor pz16 = playerZ + 16 (line 88)
const ROOF_LINK_Z = 6;   // donor roof link window (Map.cs:192)
const ALPHA_STEP = 25;   // donor fade step (GameSceneDrawingSorting.cs:416, 427)

// Flood fill over connected roof statics, starting from a roof at height z. Returns the lowest height found.
function nearZ(col: Column, def: number, x: number, y: number, z: number, seen: Set<string>): number {
  const key = x + ',' + y;
  if (seen.has(key)) return def;
  seen.add(key);
  const cell = col.cell(x, y);
  if (cell === undefined) return def;                 // unloaded: the fill stops here, as the donor does
  const roof = cell.find(o => o.kind === 'static' && o.roof && Math.abs(z - o.z) <= ROOF_LINK_Z);
  if (roof === undefined) return def;
  if (roof.z < def) def = roof.z;
  def = nearZ(col, def, x - 1, y, roof.z, seen);
  def = nearZ(col, def, x + 1, y, roof.z, seen);
  def = nearZ(col, def, x, y - 1, roof.z, seen);
  def = nearZ(col, def, x, y + 1, roof.z, seen);
  return def;
}

interface CutResult { drawCap: number; roofsHidden: boolean; }

// Ceiling cut for one player position. Three phases, in donor order:
// 1) the player's own cell, 2) the cell one step +x,+y (roof scan + flood fill), 3) raise to player z + 16.
function cutCeiling(col: Column, px: number, py: number, pz: number, drawRoofs: boolean): CutResult {
  const pz14 = pz + CEIL_LO;
  const pz16 = pz + CEIL_HI;
  let cap = NO_CAP;
  let roofsHidden = !drawRoofs;

  // Phase 1: own cell. A land tile at or above pz16 caps the draw and stops the scan.
  for (const o of col.cell(px, py) ?? []) {
    if (o.kind === 'land') {
      if (pz16 <= o.z) { cap = pz16; break; }
      continue;
    }
    if (o.kind === 'mobile') continue;
    if (o.z > pz14 && cap > o.z && !(o.foliage || o.transparent) && (!o.roof || o.surface)) {
      cap = o.z;
      roofsHidden = true;
    }
  }

  let ground = cap;                                   // donor: _maxGroundZ = _maxZ
  // Phase 2: the cell one step +x,+y. Only non-land, non-mobile roof tiles that are not transparent or surface count.
  const dx = px + 1;
  const dy = py + 1;
  for (const o of col.cell(dx, dy) ?? []) {
    if (o.kind !== 'static') continue;
    if (o.z > pz14 && cap > o.z && !(o.transparent || o.surface) && o.roof) {
      cap = o.z;
      ground = nearZ(col, o.z, dx, dy, o.z, new Set<string>());
      roofsHidden = true;
    }
  }

  // Phase 3: the draw cap is the ground value, but never below pz16.
  let drawCap = ground;
  if (ground < pz16) drawCap = pz16;
  return { drawCap, roofsHidden };
}

// Per-object target alpha: above the cap or a hidden roof fades to 0, translucent fades to 178, the rest to 255.
// Returns null when the object keeps its current alpha (foliage).
function targetAlpha(o: Obj, drawCap: number, roofsHidden: boolean): number | null {
  if (o.z >= drawCap) return 0;
  if (roofsHidden && o.roof) return 0;
  if (o.translucent) return 178;
  if (o.foliage) return null;
  return 255;
}

// One fade step toward the target, applied once per ALPHA_TICK_MS.
function stepAlpha(current: number, target: number): number {
  if (current > target) return Math.max(target, current - ALPHA_STEP);
  if (current < target) return Math.min(target, current + ALPHA_STEP);
  return current;
}
```

## 5. Lands in

- TARGET `origins/client/roof-cut.ts` (new, proposed; client-only draw rule). Nearest parity-checklist row: 11 (fight camera). The world camera has no row of its own, so this is a gap, not a fit. The engine never reads roofs or alpha.
- today: not checked in this pass (Frankendom's world-client occlusion was not read).
- Reuse tag: rewrite-from-idea (BSD-2-Clause permits adaptation; the sketch is written from the mechanism, and no donor line is copied).
- Brief rule served: camera/HUD are client-only (the cut is a client draw rule; no server state depends on it).

## 6. Gaps and risks

- Camera relevance, honestly scoped. The cut hides the roofs above the player, which is the occlusion case for a third-person camera inside a building. It does not move or pull in the camera, so a camera that clips walls still needs its own collision and lock-on logic, which this donor does not supply. It does not fix the owner's over-the-shoulder problem by itself.
- Diagonal offset. The roof scan reads the cell one step +x, +y from the player (141-145). The code has no comment on this. The commented-out copy of the same roof block (190-196, with the call at 194) is inside the same loop after the same increment, so it uses the same offset; the offset is in both versions. Whether it was intended is unknown, so do not copy it without a test.
- Order dependence. Phase 1 sets the cap to pz16 on a land tile (103-107) even if a lower object was already seen, so the result depends on stack order within the cell. The stack sort in Chunk.cs was not read, so the outcome for stacked objects is not verified.
- Flood-fill recursion. The recursion can go as deep as the number of visited slots, at most 4096 per fill (Map.cs:14, 166). This is a bound from the table size, not a measured depth. A large roofed area may still recurse deeply, so Frankendom should use an explicit stack or a cap.
- Aliasing. The visited mask repeats every 64 tiles (Map.cs:166), so a roof region longer than 64 tiles can end the fill early. Use a per-fill visited set.
- Client-only. The server never sees roofs or alpha. If Frankendom ever lets roof cover hide a fighter or change a fight state, it becomes a gameplay rule and must go through the server (server-verified kills).
- Read gaps: the order of objects in a cell (Chunk.cs sort), the GetViewPort body, the caller chain of FillGameObjectList, the draw loops past the cap tests (580-640, 799-845), and the use of the local ground value by ground-level checks.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** All checked: UpdateMaxDrawZ 57-213 three phases, 127 sentinel, pz14/pz16 (87-88), masks 0x20004 (129) and 0x204 (176), cap lowers only if higher (121), phase-3 raise (205-208), reset (211); CalculateNearZ 164-219, 64x64 mask (166, array 0x1000 at Map.cs:14), 6-unit link (192), lowest z (207-209), 4-neighbour recursion; ProcessAlpha 339-382, step 25 (416,427), ALPHA_TIME=20 (Constants.cs:42), alpha timer GameScene.cs:560-564; flags 0x4/0x200/0x20000/0x10000000. License BSD-2-Clause. Sketch order matches (Land AverageZ omission disclosed).

**Missed:** Circle-of-transparency (GameScene.cs:567-578, GetGradientCotAlpha 385-396): a screen-space radius cutout around the player with a cubic gradient, a simpler occlusion rule in the same area that the note does not mention.
