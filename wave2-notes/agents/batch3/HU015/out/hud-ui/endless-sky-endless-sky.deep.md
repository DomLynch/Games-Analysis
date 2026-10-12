# endless-sky-endless-sky (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/MiniMap.cpp` | Licence: GPL-3.0-or-later (header lines 4-6 of MiniMap.cpp: "either version 3 of the License, or (at your option) any later version"; repo `license.txt` is the GPL v3 text). Class: copyleft. Clean-room, shape only. | C++ | symbol `MiniMap::Step`

Checked: MiniMap.cpp read in full (292 lines); MiniMap.h read in full (57 lines). Callers opened: `Engine.cpp` 454 (`Engine::Step` signature), 480-500 (where `minimap.Step(flagship)` runs, line 497), 966 (60-per-second conversions), 1349 (`minimap.Draw`); `PlayerInfo.cpp` 3231-3262 (`TravelPlan`, `PopTravel`, lines 3255-3260); `Preferences.h` 119-123 (display enum). The hint file (`source/MiniMap.cpp`) is the right file. Data half: `data/_ui/interfaces.txt` 1473-1475 (the `mini-map` point: anchor top, centre 0 100); the `_ui` folder has 8 text files, and this was the only one read. Not read: `Point::Lerp` (assumed linear), `MapPanel` constants (`OUTER`, `INNER`, `LINK_OFFSET`, `MAX_MISSION_POINTERS_DRAWN` value), the `Engine::Go` loop (so "once per frame" is assumed from the call site), the callers of `PopTravel`, and `IsEnteringHyperspace` (whether it can be true with a null target, see section 6). Confidence: high on `Step` and the alpha in `Draw`; medium on wall-clock timing, which the donor does not state. Camera scope: not a camera cell.

## 1. Mechanism

- A small map of nearby systems drawn on the main panel. It shows the current system (a bright ring), the target (the jump target, or the next hop of the travel plan), the links between systems, and a dashed arrow for a jump that has no direct hyperspace link. It is a view only: it never moves the ship.
- Two things happen. (a) The map's centre glides from where it is to a point between the current system and the target. (b) The map is shown only around a jump: it appears when a jump is commanded, lingers, then fades out.
- Order per frame in `Step` (`MiniMap.cpp` 55-144):
  1. Current system. If the flagship's system changed, retarget (65-67).
  2. Next target. If the flagship is entering hyperspace or the JUMP command is held, the target is the flagship's target system and `displayMinimap` is set to 300 (71-77). Otherwise, if not hyperspacing, the target is `travelPlan.back()` (81-84).
  3. Target update. If the next target differs and either it exists or the linger has run out, adopt it and retarget (92-96). Else, if the target is the current system, clear it (101-102). So a cancelled jump keeps its target on the map until the linger ends.
  4. Linger and fade (105-114). While the linger is non-zero: decrement it; if it is under 30 and the fade is above 0, decrement the fade; otherwise count the fade up to 30. With no linger, the fade is 0.
  5. Retarget centre (116-127). Centre goal = midpoint of current and target (the current system if there is no target). `oldCenter` = the current centre; `lerpCount` = 0.
  6. Jump recentre (131-136). If the flagship is entering hyperspace, the goal is not the target's position, and the glide has finished, start a new glide to the target's position.
  7. Glide (138-143). `center = oldCenter.Lerp(targetCenter, lerpCount / 150)`; `lerpCount` counts up to 150.
- Draw (`MiniMap.cpp` 148-292). Alpha starts at 0.5 (158). In WHEN_JUMPING mode, return if the linger is 0, and multiply alpha by min(1, fade / 30) (159-163). OFF returns at once (155). The position is read from HUD data: `GetPoint("mini-map")` (172), which the data file declares as an anchor-top point at centre 0 100 (`data/_ui/interfaces.txt` 1473-1475; `point "mini-map"` on 1474). Each system gets a ring in its government colour when the player can view it and it is inhabited (187-190, 213-216); a name, or "Unexplored System" if the player does not know it (179-182); links to neighbours (196-206). Mission pointers are drawn for up to `MAX_MISSION_POINTERS_DRAWN` (222). The arrow is dashed if there is no direct link (288-289), with two head lines (290-291).
- Tick: `Step` is called from `Engine::Step` at line 497; `Engine::Step` is at line 454. The `Engine::Go` loop that calls `Engine::Step` was not read. The donor counts everything in frames (150, 300, 30). Its own comment says the linger is "5 seconds" (76), which is true only at 60 frames per second. The engine converts per-second values with 60 (Engine.cpp 966).

## 2. Key functions

- `MiniMap::Step`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/MiniMap.cpp` 55-144. Retarget, linger and fade, centre, glide.
- `MiniMap::Draw`: `MiniMap.cpp` 148-292. Preference gate, alpha, system rings, links, mission pointers, arrow.
- `MiniMap::MiniMap` (constructor): `MiniMap.cpp` 48-51. The glide count starts settled (`lerpCount(LERP_DURATION)`, line 49), so the first frame does not glide.
- Fields and their meaning: `MiniMap.h` 37-56 (`center`, `oldCenter`, `targetCenter`, `lerpCount`, `displayMinimap`, `fadeMinimap`).
- `PlayerInfo::PopTravel`: `PlayerInfo.cpp` 3255-3262. On arrival, `Visit(*travelPlan.back())` then `pop_back()`, so `back()` is the next hop.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Glide the map centre linearly to a goal | 150 frames (`MiniMap.cpp` 43) |
| Retarget goal is the midpoint of current and target | factor 0.5 (124) |
| Linger after a jump command | 300 frames (77); the comment says 5 seconds (76) |
| Fade in and out | 30 frames (108-111, 163); the header says 0.5 seconds (`MiniMap.h` 55) |
| Map alpha | 0.5 (158) |
| Jump recentre waits for the glide | starts only when `lerpCount >= LERP_DURATION` (131) |

The constants are the donor's (theirs). Receipts are in `receipts.tsv`.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: retarget on system change, then the jump or next-hop target, then linger and fade, then the midpoint retarget, then the jump recentre, then one glide step. It omits: the mission pointers, government colours, system names and the "Unexplored System" rule, the link drawing, the dashed arrow, and the caller's choice of `next` (donor lines 69-85; the sketch takes `next` as an input). It differs in one place: the jump recentre checks `tgt !== null`, because the donor reads `target->Position()` on line 131 with no check. Frame counts are kept as in the donor. Section 6 gives the fix to seconds, which is not applied here.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const LERP_FRAMES = 150;     // donor LERP_DURATION (MiniMap.cpp line 43)
const LINGER_FRAMES = 300;   // donor displayMinimap = 300 on a jump command (MiniMap.cpp line 77)
const FADE_FRAMES = 30;      // donor fade length (MiniMap.cpp lines 108-111, 163)
const MAX_ALPHA = 0.5;       // donor alpha = .5f (MiniMap.cpp line 158)

interface V2 { x: number; y: number; }
interface Zone { id: string; pos: V2; }

const lerpV = (a: V2, b: V2, t: number): V2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const midpoint = (a: V2, b: V2): V2 => ({ x: 0.5 * (a.x + b.x), y: 0.5 * (a.y + b.y) });

interface WorldMap {
  currentId: string | null;
  targetId: string | null;
  centre: V2;
  from: V2;
  goal: V2;
  lerpFrame: number;   // LERP_FRAMES means settled
  linger: number;      // frames left to show the map after a jump command
  fade: number;        // 0..FADE_FRAMES
}

// Initial state (donor constructor, MiniMap.cpp lines 48-51): current is unset, so the first step retargets.
function newWorldMap(here: Zone): WorldMap {
  return {
    currentId: null,
    targetId: null,
    centre: { ...here.pos },
    from: { ...here.pos },
    goal: { ...here.pos },
    lerpFrame: LERP_FRAMES,
    linger: 0,
    fade: 0,
  };
}

// One frame. The caller resolves `next`: the jump target, or the travel-plan next hop (donor lines 69-85).
function stepWorldMap(
  m: WorldMap,
  here: Zone,
  next: Zone | null,
  jumpCommanded: boolean,   // donor: Command::JUMP or entering hyperspace
  jumpingIn: boolean,       // donor: enteringHyperspace
  zones: Map<string, Zone>,
): void {
  // 1. Retarget (donor lines 65-102). A jump command sets the linger before the target is chosen.
  let retarget = false;
  if (m.currentId !== here.id) { m.currentId = here.id; retarget = true; }
  if (jumpCommanded) m.linger = LINGER_FRAMES;
  const nextId = next ? next.id : null;
  if (nextId !== m.targetId && (next !== null || m.linger === 0)) {
    m.targetId = nextId;
    retarget = true;
  } else if (m.targetId === m.currentId) {
    m.targetId = null;
  }

  // 2. Linger and fade (donor lines 105-114).
  if (m.linger > 0) {
    m.linger -= 1;
    if (m.linger < FADE_FRAMES && m.fade > 0) m.fade -= 1;
    else if (m.fade < FADE_FRAMES) m.fade += 1;
  } else {
    m.fade = 0;
  }

  // 3. Centre (donor lines 116-136). The donor reads target->Position() on line 131 with no null check;
  //    this sketch adds the `tgt !== null` guard.
  const tgt = m.targetId !== null ? (zones.get(m.targetId) ?? null) : null;
  if (retarget) {
    m.lerpFrame = 0;
    m.from = m.centre;
    m.goal = tgt ? midpoint(here.pos, tgt.pos) : { x: here.pos.x, y: here.pos.y };
  } else if (jumpingIn && tgt !== null && (m.goal.x !== tgt.pos.x || m.goal.y !== tgt.pos.y) && m.lerpFrame >= LERP_FRAMES) {
    m.lerpFrame = 0;
    m.from = m.centre;
    m.goal = { x: tgt.pos.x, y: tgt.pos.y };
  }

  // 4. Glide (donor lines 138-143): linear over LERP_FRAMES frames.
  if (m.lerpFrame < LERP_FRAMES) {
    m.centre = lerpV(m.from, m.goal, m.lerpFrame / LERP_FRAMES);
    m.lerpFrame += 1;
  }
}

// Draw alpha (donor lines 155-164). OFF draws nothing; WHEN_JUMPING needs linger and fades; ALWAYS_ON is flat.
type Pref = "OFF" | "WHEN_JUMPING" | "ALWAYS_ON";
function alphaFor(pref: Pref, m: WorldMap): number {
  if (pref === "OFF") return 0;
  if (pref === "ALWAYS_ON") return MAX_ALPHA;
  if (m.linger === 0) return 0;
  return MAX_ALPHA * Math.min(1, m.fade / FADE_FRAMES);
}

export {};
```

## 5. Lands in

- TARGET `origins/client/hud/worldmap.ts` (proposed path, not checked against the repo). Client only: the world map is a HUD view; the engine never reads it. Parity-checklist row 14 (HUD).
- today: no Frankendom world map was checked.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: client-only HUD; zones as data (zone positions and links come from zone data)

Best transferable idea: When the player commits a zone change, fade a world map in over 0.5 s, keep it up for 5 s, and glide its centre from the current zone toward the midpoint of the current and destination zones over 2.5 s.
Decision (proposed): adapt — take the glide to the midpoint and the linger-and-fade for a zone-travel preview; count in seconds with delta time (the donor counts frames); drop the galaxy-specific parts (government colours, mission pointers) unless Frankendom needs them.
Acceptance: Tapping "travel" on a zone link fades the world map in within 0.5 s; its centre slides over about 2.5 s from the current zone to the midpoint; it fades out during the last 0.5 s of its 5 s; cancelling the travel keeps the destination marked until the 5 s is up.

## 6. Gaps and risks

- Defect 1, frame counts. 150, 300 and 30 are frames, and the donor's "5 seconds" (line 76) holds only at 60 fps. Fix: store the glide (2.5 s), the linger (5 s) and the fade (0.5 s) in seconds, and advance them by delta time. The sketch keeps frames to match the donor.
- Defect 2, jump recentre with no null check (line 131: `target->Position()`). Not read: whether `IsEnteringHyperspace()` can be true while the target is null. If it can, this dereferences null. Fix: the `tgt !== null` guard (sketch).
- Check, not a confirmed defect: line 110 (`else if(fadeMinimap < 30)`) raises the fade again during the last 30 frames of linger if the fade has reached 0. I traced the usual case (a jump that ends normally) and it does not happen; a new jump command during a fade-out was not traced.
- Gap, knowledge: the donor hides names the player has not learned ("Unexplored System", 179-182). Frankendom's zones need the same rule: a zone's name and links stay hidden until the player has visited it or a rule reveals it. This is a client rule, not an engine rule.
- Gap, rulings: `travelPlan.back()` is the client's route, and a jump is a state change in the donor. Frankendom's zone travel must be a server-verified change; the map may only show what the server says. The map must not decide the route.
- Gap, camera: the glide is a client-side ease of a map, not of the world camera. Keep the two separate so the map glide does not change the world camera's smoothing. Not a camera cell.
- Readability at 375 wide: the donor draws the map at half alpha and in small rings; the widths and sizes come from the HUD point (172) and were not read. Not checked for Frankendom.
- Not read: `Point::Lerp`, the `MapPanel` constants, the `Engine::Go` loop, the callers of `PopTravel`, `IsEnteringHyperspace`.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: client-only HUD; zones as data
