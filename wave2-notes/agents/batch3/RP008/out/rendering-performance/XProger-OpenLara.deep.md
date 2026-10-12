# XProger-OpenLara (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/XProger-OpenLara/src/level.h` | Licence: BSD 2-Clause (repo LICENSE line 1: "BSD 2-Clause License", Copyright (c) 2018 Timur "XProger" Gagiev; code may be adapted, keep the notice if lines are copied) | C++ | symbol `getVisibleRooms`

Checked: Read in full: the room walk (`getVisibleRooms` 2566-2590), `checkPortal` 2495-2560, the `renderView` room-list setup 2619-2660, the `renderRooms` loop 2004-2045, and `getPortalRect` 1972-1990. Read the frame loop `game.h` 271-325 and `Core::update` 1126-1134. Read the draw/range code in `mesh.h` 104-146, 200-210, 368-386, 1022-1050, 1419-1431, 1522-1537, `core.h` 239-252 and 1394-1402, `frustum.h` 13-75, `cache.h` 428 and 575-640 (water surfaces), `controller.h` 1462-1480, `camera.h` 680-681. Not read: the rest of `getPortalRect` (rect-to-x,y,w,h conversion after line 1990), the `renderView` water branch, the sort comparators, the atlas packer in `texture.h`, the GAPI `DIP` bodies, and whether render output is interpolated between ticks. Confidence: high on the room walk, the scissor and the frame split; medium on which build (shader or FFP) the donor ships by default, so both paths are described. The cell hint named `mesh.h`; the culling mechanism is in `level.h` and the batching is in `mesh.h`. Parity hint was row 12, but row 12 in the addendum is combat sound cues, so this note uses row 16 (quality). Flagged for Strategy. camera_scope: not a camera cell.

Best transferable idea: Walk the level's portal graph from the camera's room, carrying the screen rectangle each portal lets through, so rooms behind a closed door are never drawn, and draw each room under a scissor equal to that rectangle.
Decision (proposed): adapt — portal culling only pays off in indoor or dungeon zones that have a portal graph; open terrain needs frustum or distance culling. The per-room scissor and one-draw-per-material rule transfer to any zone draw list.
Acceptance: In a 3-room test zone with a closed portal behind the player, the far room is absent from the draw list; a room reached by two portal paths appears once; and the frame DIP count stays under a fixed budget at 375 px.

## 1. Mechanism

- Per frame, `renderView` marks every room invisible (2630-2632) and then walks from the camera's room with a full-screen rectangle (2657). The cutscene branch (2634-2656) first hides alternate rooms, walks from the camera room (2643), then appends every room the walk did not reach with a full-screen rectangle (2646-2648). The walk produces an ordered list of (room, screen rect) pairs. `renderRooms` then draws that list.
- The walk, in order: (a) bail if 255 rooms are already listed or the depth is over 16 (2567-2568; the bail is silent, no flag is set). (b) Mark the room visible and append `(room, rect)` (2577-2578). Each visit appends, so there is no visited check. (c) For each portal of the room (2581): skip the portal back to the room we came from (2587), then call `checkPortal` with this room's rect as the parent (2587). (d) If `checkPortal` returns true, recurse into the portal's room with the clipped rect (2588).
- `checkPortal` order: facing test first. If the eye is on the back side of the portal's normal, reject (2499). Project the four corners (2507-2519). Corners with w > 0 contribute to the bounds; if all four are behind the eye plane, reject (2521). If some are behind, the code finds the extents from each edge that crosses the near plane (2524-2553). Then reject if the bounds miss the parent rect (2555), and clamp the bounds to the parent (2558-2561).
- Drawing, `renderRooms` (2004-2045): rooms are drawn in list order for opaque, in reverse for transparent and additive. Empty buckets are skipped (2039). For each room, the scissor is set to `getPortalRect(portal rect, parent viewport)` (2044). `getPortalRect` maps the NDC rect to pixels (1976), grows it by 2 px on each side (1979-1982), and clamps it to the parent viewport (1985-1990). The room's geometry for the current pass is then drawn under that scissor. Each pass draws one bucket (opaque, alpha or additive; the passes are `renderOpaque`, `renderTransparent` and `renderAdditive`, level.h 2592-2615), and the bucket draw is `renderRoomGeometry`, called at 2059.
- Batching inside a room, the build side (`mesh.h`). Room faces are sorted by material (204) and sprites by material (206). Each bucket (opaque, double-sided alpha, additive) is a `Geometry` with `ranges[100]` (104). A new range is opened only when `validForTile` says the current range does not match (1034-1035). `validForTile` has two versions. Under `SPLIT_BY_TILE` (defined only in the FFP branch, core.h 239), it compares tile and, with `SPLIT_BY_CLUT`, clut (118-127). Otherwise (the shader branch, core.h 243-252), it returns `count != 0` (129), so a whole bucket is one range. `getNextRange` (133-146) closes the previous range by its index count, and starts a new range only if the previous one has faces; an empty previous range is overwritten.
- Batching, the draw side. `renderRoomGeometry` loops over the bucket's ranges (1422) and draws each one (1429). Under FFP, each range first binds its tile (1426). In the shader branch, the room atlas is bound once before the room loop (2031). Room sprites are one merged range per room (`MERGE_SPRITES`, core.h 250; the range is built at 382 and drawn at 1537). `DIP` records triangles per call (core.h 1394-1401; the DIP counter is at 1400).
- Entity culling, the second layer: the camera's frustum planes are rebuilt from the view-projection matrix each frame (camera.h 681; `calcPlanes` at frustum.h 13-23). Each controller tests its oriented bounding box against the planes before drawing and returns early if it misses (controller.h 1474-1475). Entities get the camera frustum at render time (level.h 2170). The sphere overload (frustum.h 63-67) has no call site in `src/*.h` outside `fixed/` (searched; `fixed/` not checked for this overload).
- Frame pacing. `Core::update` returns false if no time has passed (core.h 1129) and otherwise sets the frame delta from the clock in seconds (1131). The game reads it (game.h 281). Outside cutscene levels, the delta is clamped to 0.2 s (317-318). It is then consumed in fixed sub-steps of at most 1/30 s; the last step is the remainder (320-321), and `updateTick` runs once per sub-step (322). There is no sleep and no render interpolation in the frame loop I read; the render path itself was not read.

## 2. Key functions

- `getVisibleRooms`: `/mnt/frankendom-donors/XProger-OpenLara/src/level.h` 2566-2590. The portal walk: caps, append, back-track skip, recursion.
- `checkPortal`: `/mnt/frankendom-donors/XProger-OpenLara/src/level.h` 2495-2560. Facing test, corner projection, all-behind reject, parent rect clamp.
- `renderView` room-list setup: `/mnt/frankendom-donors/XProger-OpenLara/src/level.h` 2619-2660. Marks rooms invisible, then calls the walk from the camera room.
- `renderRooms`: `/mnt/frankendom-donors/XProger-OpenLara/src/level.h` 2004-2045. Per-room scissor from the list entry, then the bucket draw.
- `getPortalRect`: `/mnt/frankendom-donors/XProger-OpenLara/src/level.h` 1972-1990. NDC rect to pixel scissor, 2 px grow, clamp to parent.
- `Geometry::getNextRange` and `validForTile`: `/mnt/frankendom-donors/XProger-OpenLara/src/mesh.h` 104-146. The range builder.
- `renderRoomGeometry`: `/mnt/frankendom-donors/XProger-OpenLara/src/mesh.h` 1419-1431. Range loop and draw.
- Frame loop: `/mnt/frankendom-donors/XProger-OpenLara/src/game.h` 271-325, with `Core::update` at `/mnt/frankendom-donors/XProger-OpenLara/src/core.h` 1126-1134.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Portal walk carries a screen rect; a portal seen from behind or off-screen stops the walk | Room cap 255 and depth cap 16 (theirs, level.h 2567); the room list buffer is 256 (theirs, level.h 2625) |
| Scissor per room = its portal rect, grown and clamped to the parent | 2 px grow on each side (theirs, level.h 1979-1982) |
| Corners behind the eye plane are treated as a special case | Full-screen fallback is in the sketch only; the donor works out per-edge extents (level.h 2521-2553) |
| Frame delta clamped, then consumed in fixed sub-steps with a short last step | Clamp 0.2 s (theirs, game.h 318); sub-step 1/30 s (theirs, game.h 321) |
| One draw per range; ranges per material bucket | Range cap 100 per bucket (theirs, mesh.h 104; overflow is an ASSERT only, 140) |
| Triangle count per draw call | Counted in `stats` (theirs, core.h 1401); no per-frame limit exists |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (facing test, project, reject, clamp, append, recurse with a back-track skip, then per-room scissor, then sub-steps). It changes four things. (1) A portal with any corner behind the eye gets the full rect, which culls less than the donor's per-edge test. (2) Each room gets one entry (the union of the rects that reach it), where the donor appends one entry per path, with no visited check. (3) The caps return a `truncated` flag, where the donor returns silently. (4) The 0.2 s clamp applies to cutscene levels too, where the donor skips it. The donor's `getPortalRect` conversion after line 1990 (not read) is replaced by a plain NDC-to-pixel mapping, and the y orientation was not checked against the donor's viewport origin.

```ts
// clean-room sketch: portal room visibility with a per-room screen rect, and frame split into fixed steps.
// Written from the mechanism in XProger/OpenLara (BSD-2-Clause). Not a translation of the donor.
type Vec3 = [number, number, number];
type Clip4 = [number, number, number, number]; // clip-space x, y, z, w

interface Rect { x0: number; y0: number; x1: number; y1: number } // NDC, -1..1
interface Portal { to: number; corners: [Vec3, Vec3, Vec3, Vec3]; normal: Vec3 }
interface RoomNode { portals: Portal[] }
interface Viewport { x: number; y: number; w: number; h: number } // pixels
interface VisibleRoom { room: number; clip: Rect }
interface VisibleResult { rooms: VisibleRoom[]; truncated: boolean }
interface VisOptions { maxRooms: number; maxDepth: number; project: (p: Vec3) => Clip4 }

const FULL: Rect = { x0: -1, y0: -1, x1: 1, y1: 1 };
const TICK_S = 1 / 30;
const EPS = 1e-6; // donor uses an EPS constant (value not read)

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function intersect(a: Rect, b: Rect): Rect | null {
  const r = { x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) };
  return r.x0 > r.x1 || r.y0 > r.y1 ? null : r;
}

function union(a: Rect, b: Rect): Rect {
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

function contains(outer: Rect, inner: Rect): boolean {
  return outer.x0 <= inner.x0 && outer.y0 <= inner.y0 && outer.x1 >= inner.x1 && outer.y1 >= inner.y1;
}

// Facing test, then project the four corners and bound them. Reject if off the parent rect.
// simplified: a portal with any corner behind the eye plane gets the full rect (conservative, so it culls less);
// the donor works out per-edge extents from the sign of each crossing edge (level.h 2524-2553).
function portalClip(eye: Vec3, portal: Portal, parent: Rect, project: (p: Vec3) => Clip4): Rect | null {
  const c0 = portal.corners[0];
  if (dot(portal.normal, [eye[0] - c0[0], eye[1] - c0[1], eye[2] - c0[2]]) <= 0) return null;

  let bounds: Rect = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  let behind = 0;
  for (const c of portal.corners) {
    const [x, y, , w] = project(c);
    if (w > 0) {
      const px = x / w;
      const py = y / w;
      bounds = { x0: Math.min(bounds.x0, px), y0: Math.min(bounds.y0, py), x1: Math.max(bounds.x1, px), y1: Math.max(bounds.y1, py) };
    } else {
      behind++;
    }
  }
  if (behind === 4) return null;
  if (behind > 0) bounds = FULL;
  return intersect(bounds, parent);
}

// Walk the portal graph from the start room. Each room gets one entry (union of the rects that reach it).
// Donor appends one entry per path (level.h 2578) and returns silently at the caps.
function visibleRooms(rooms: RoomNode[], start: number, eye: Vec3, vis: VisOptions): VisibleResult {
  const seen = new Map<number, Rect>();
  let truncated = false;

  const visit = (room: number, from: number, clip: Rect, depth: number): void => {
    if (depth > vis.maxDepth) { truncated = true; return; } // donor: count > 16 returns, no flag
    const prev = seen.get(room);
    if (prev) {
      if (contains(prev, clip)) return; // this path adds no new screen area
      seen.set(room, union(prev, clip));
    } else {
      if (seen.size >= vis.maxRooms) { truncated = true; return; } // donor: roomsCount >= 255
      seen.set(room, clip);
    }
    for (const portal of rooms[room].portals) {
      if (portal.to === from) continue; // donor: skip the portal we came through
      const next = portalClip(eye, portal, clip, vis.project);
      if (next) visit(portal.to, room, next, depth + 1);
    }
  };

  visit(start, -1, FULL, 0);
  const out: VisibleRoom[] = [];
  seen.forEach((clip, room) => { out.push({ room, clip }); });
  return { rooms: out, truncated };
}

// Donor getPortalRect: NDC rect to a pixel scissor, grown by pad px, clamped to the parent viewport.
function toScissor(clip: Rect, vp: Viewport, pad: number): Viewport {
  let x0 = Math.floor((clip.x0 * 0.5 + 0.5) * vp.w) + vp.x - pad;
  let y0 = Math.floor((clip.y0 * 0.5 + 0.5) * vp.h) + vp.y - pad;
  let x1 = Math.floor((clip.x1 * 0.5 + 0.5) * vp.w) + vp.x + pad;
  let y1 = Math.floor((clip.y1 * 0.5 + 0.5) * vp.h) + vp.y + pad;
  x0 = Math.max(x0, vp.x);
  y0 = Math.max(y0, vp.y);
  x1 = Math.min(x1, vp.x + vp.w);
  y1 = Math.min(y1, vp.y + vp.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Donor game.h update(): frame delta clamped to 0.2 s, then fixed 1/30 s steps with a shorter last step.
// fix: the donor skips the 0.2 s clamp on cutscene levels, so one long stall runs unbounded steps. Clamp everywhere.
function splitFrame(frameDelta: number): number[] {
  let delta = Math.min(0.2, frameDelta);
  const dts: number[] = [];
  while (delta > EPS) {
    const dt = Math.min(delta, TICK_S);
    dts.push(dt);
    delta -= dt;
  }
  return dts;
}
```

## 5. Lands in

- TARGET `origins/client/render/room-visibility.ts` (proposed path, not checked against the Frankendom tree): a client-only visibility module for indoor zones that have a portal table. The engine never reads it; kills, aggro and hits do not depend on it.
- Parity-checklist row 16 (colour grade / quality: draw budget and frame pacing are quality controls on a phone).
- Reuse tag: adapt-idea (BSD-2-Clause, code may be adapted with the notice kept; this sketch is clean-room).
- Brief rule served: "keep the idea, fix the defect" (the caps, duplicate entries and cutscene clamp are fixed in the sketch); timing rule 6 (fixed step and accumulator loop read and described); rule 8 (target file and row named).

## 6. Gaps and risks

- Visibility is a client view of the world. It must never decide who is hit or who is in the hate list. An entity culled off-screen still has to be simulated and hit-tested on the server (rule: kills are server-verified; MAX_ATTACKERS = 3 many-on-one logic stays in the engine).
- Zones as data: the portal graph is a per-zone table (portals per room). Open terrain has no portal graph in this donor, so it needs a different culling method, and terrain, foliage, water and weather rendering are not covered by this note.
- Donor defects, each with the fix in the sketch: (1) silent caps at 255 rooms and depth 16 (level.h 2567). Fix: return `truncated` and draw the zone's full list for that frame, logged once. (2) No visited check, so a room reached by two portal paths gets two entries (level.h 2578); whether it draws twice is inferred from the code path, not run. Fix: one entry per room, union of rects. (3) The 0.2 s clamp is skipped on cutscene levels (game.h 317-318), so a long stall runs many sub-steps in one frame. Fix: clamp everywhere. (4) The donor counts draw calls and triangles (core.h 1400-1401) but enforces no per-frame limit. Fix: a per-frame draw budget that drops the lowest-priority room first, counted in a test.
- The concave-portal simplification in the sketch culls less than the donor. It is conservative and never hides a visible room, but it is a real loss of culling when the camera is near a portal.
- Build path: under FFP there is one draw per texture change (core.h 239, mesh.h 118-127); under the shader build there is one draw per room bucket (mesh.h 129). Which one Frankendom would use on phones is not decided here.
- No render interpolation was seen in the frame loop (render path not read). If the sim ticks at 30 Hz and the display at 60 Hz, visible stutter is possible; the donor gives no answer to this, and it is not verified.
- The donor's 2 px scissor grow is a fixed margin that hides edge pops; a fixed pixel margin will look different at 375 px than at desktop size. Not tested.
