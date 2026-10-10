# electronicarts-CnC_Remastered_Collection (camera, cell 14)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/DISPLAY.CPP` (symbol `DisplayClass::Center_Map`; related `DisplayClass::Set_Tactical_Position` 4243, `DisplayClass::Scroll_Map` 1192, keyboard caller `CONQUER.CPP` 863-877) | Licence: GPL-3.0 ("Version 3, 29 June 2007", LICENSE.md 8) with EA "ADDITIONAL TERMS per GNU GPL Section 7" (LICENSE.md 601-617): no trademark or publicity rights granted, no misrepresentation of origin, and an indemnity for any contractual liability the conveyor assumes; clean-room | C++ | symbol `DisplayClass::Center_Map`

Checked: Read in full: `DisplayClass::Center_Map` (DISPLAY.CPP 4523-4583), `DisplayClass::Set_Tactical_Position` (4229-4262), `DisplayClass::Scroll_Map` (1192-1262; the rest of the redraw after 1262 not read), the redraw path that applies the desired position (1946-1985 read in part, 2012-2026), `ScrollClass` (SCROLL.H; SCROLL.CPP 1-267, whole file read including the `#if 0` body), `MouseClass::AI` call site (MOUSE.CPP 255-270), the keyboard scroll and frame loop (CONQUER.CPP 530-560 in part, 750-762, 835-884, 2104-2122). Candidates opened and set aside: REDALERT/SCROLL.CPP (edge scroll compiled out), TIBERIANDAWN/SCROLL.CPP (same `#if 0`, lines 90-214, grep only), REDALERT/HELP.CPP and RADAR.CPP (overrides of `Set_Tactical_Position`, grep only), DLLInterface.cpp (grep only). Not read: `Confine_Rect` body (inline x86 assembly in WIN32LIB/DrawMisc.cpp; contract taken from its header comment at 4750), `Center_Coord` (not read), the `Options.KeyScroll*` binding table, the value of `CELL_LEPTON_W` (not read), the key source inside `Map.Input` (not read), and the Tiberian Dawn centre code (grep only). Confidence: medium. The group-framing rule is small and was read end to end, but the donor is a top-down 2D tactical map, so only the shape transfers. Camera scope: world camera (open map scroll; not a fixed arena).

## 1. Mechanism

- What is live. The view is a rectangle (`TacticalCoord`, sized `TacLeptonWidth` x `TacLeptonHeight`) over a fixed map. Two things move it: a keyboard step, and a centre-on-selection call.
- Centre on selection (`Center_Map`, 4540-4582). For each selected object, add its `Center_Coord()` (4551) to x and y. Divide by the count (4557; integer division, since x and y are ints). If an override centre is given it replaces that mean (4562-4566). Then the origin is the centre minus half the view size (4571 for x, and the same for y), clamped at the low map edge (4572). It calls `Set_Tactical_Position` (4577) and returns the centre. If nothing is selected and there is no override, the function returns 0 and the view does not move (4582).
- Set. `Set_Tactical_Position` (4243) clamps the origin with `Confine_Rect` (4251), against the map width plus the GlyphX client sidebar width (the comment at 4251 says this is needed for the sidebar). It records the result as `DesiredTacticalCoord` (4258). It writes `TacticalCoord` at once only while `ScenarioInit` is set (4256).
- Apply. The redraw path compares desired and actual positions in pixels (1956). When they differ, it redraws the uncovered edges and calls `Set_Tactical_Position(DesiredTacticalCoord)` (2023) with `ScenarioInit` raised around it. So the view jumps to the new position at redraw. There is no easing.
- Keyboard scroll (live). `Keyboard_Process` (CONQUER.CPP 530) calls `Map.Scroll_Map(DIR_W|E|N|S, distance, true)` on the scroll keys (864-877), where `distance = CELL_LEPTON_W` (863), one cell. `Scroll_Map` (1192): snaps the facing at the map edges (the four edge blocks at the top of the function), moves the origin by `Coord_Move` (1221), confines it to the map (1228; note this uses the map width, not the sidebar), and if it was shifted recomputes `distance` (1243-1244). If the distance is zero or the target equals the current position it returns false (1250). With `really` true it calls `Set_Tactical_Position` (1257).
- Frame loop. The input is taken inside `while (FrameTimer)` (CONQUER.CPP 2108): `Map.Input` (2118), then `Keyboard_Process` (2120), then the render. The comment above it (2104-2107) says the loop is regulated by the game speed option. So keyboard steps are once per loop pass of a fixed-step game frame, not per wall-clock millisecond.
- Edge scroll is NOT live. `ScrollClass::AI` (SCROLL.CPP 92-227) is inside `#if 0`. The live body is only `HelpClass::AI` (228). `MouseClass::AI` calls `ScrollClass::AI` (MOUSE.CPP 267), so the mouse-edge scroll, its rate table and its inertia counter do not run in this source. The disabled code had an edge-band test, a rate table of eight steps scaled by `RESFACTOR`, an inertia counter and `SCROLL_DELAY` of 1 (WIN32) or 2 (SCROLL.CPP 40-44). Treat those as dead code.

## 2. Key functions

- `DisplayClass::Center_Map`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/DISPLAY.CPP` 4540-4583.
- `DisplayClass::Set_Tactical_Position`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/DISPLAY.CPP` 4243-4262.
- `DisplayClass::Scroll_Map`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/DISPLAY.CPP` 1192-1262.
- Redraw apply: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/DISPLAY.CPP` 1956-2023.
- Keyboard scroll and frame loop: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/CONQUER.CPP` 863-877 and 2108-2120.
- Dead edge scroll: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/SCROLL.CPP` 92-227 (`#if 0`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| View centred on the mean of the selected objects' centres | integer mean of `Center_Coord()` (theirs, DISPLAY.CPP 4551-4557) |
| Half a view offset, then clamp at the low edge | `TacLeptonWidth/2`, `TacLeptonHeight/2` (theirs, 4571-4572) |
| High edge clamp against map plus sidebar | map width + GlyphX sidebar width in leptons (theirs, 4251) |
| Clamp reports whether it moved (scroll distance is then recomputed) | `Confine_Rect` nonzero return (theirs, DISPLAY.CPP 1228, 1243-1244; contract at DrawMisc.cpp 4750) |
| Keyboard step: one cell per input pass | `CELL_LEPTON_W` (theirs, CONQUER.CPP 863; value not read) |
| Apply at redraw, no easing | none: instant (theirs, DISPLAY.CPP 2023) |
| Edge scroll rate table and inertia (dead code) | rates 0xE0 down to 0x08, times `RESFACTOR`; `SCROLL_DELAY` 1 or 2 (theirs, SCROLL.CPP 40-44, 92-227; not live) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's order for the live path: mean of the group's centres, offset by half the view, clamped into the map, with a flag that reports the clamp. It merges the donor's two clamps (the low edge in `Center_Map` and both edges in `Set_Tactical_Position`/`Confine_Rect`) into one. It omits the integer division (the sketch keeps floats), the sidebar width, the desired-versus-actual pixel check and the redraw snap (the donor applies the position instantly at redraw), the override centre and the empty-selection return, the keyboard binding table, the diagonal facing snap at the map edges, and the distance recomputation after a shift. `easeToward` is not in the donor: it is our proposal, because the donor snaps.

```ts
// Licence: GPL-3.0 with EA additional terms (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec2 = { x: number; y: number };
interface Rect2 { w: number; h: number; }
interface MapBounds { minX: number; minY: number; maxX: number; maxY: number; }

// Keep a view origin inside the map. shifted reports whether it had to move (donor Confine_Rect returns nonzero).
function clampOrigin(o: Vec2, view: Rect2, map: MapBounds): { origin: Vec2; shifted: boolean } {
  const cx = Math.min(Math.max(o.x, map.minX), Math.max(map.minX, map.maxX - view.w));
  const cy = Math.min(Math.max(o.y, map.minY), Math.max(map.minY, map.maxY - view.h));
  return { origin: { x: cx, y: cy }, shifted: cx !== o.x || cy !== o.y };
}

// Frame the mean of the group's centres: the view centre goes on the mean, then the origin is clamped.
function frameGroup(points: Vec2[], view: Rect2, map: MapBounds): { origin: Vec2; shifted: boolean } {
  if (points.length === 0) return { origin: { x: map.minX, y: map.minY }, shifted: false };
  let sx = 0;
  let sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const mean = { x: sx / points.length, y: sy / points.length };
  return clampOrigin({ x: mean.x - view.w / 2, y: mean.y - view.h / 2 }, view, map);
}

// One keyboard step: a fixed distance in a direction, stopped at the map edge.
function keyScroll(origin: Vec2, dir: Vec2, step: number, view: Rect2, map: MapBounds): { origin: Vec2; shifted: boolean } {
  return clampOrigin({ x: origin.x + dir.x * step, y: origin.y + dir.y * step }, view, map);
}

// Easing toward the target. Not in the donor, which snaps to the desired position at redraw.
function easeToward(cur: Vec2, target: Vec2, dtMs: number, halfLifeMs: number): Vec2 {
  const k = 1 - Math.pow(0.5, dtMs / halfLifeMs);
  return { x: cur.x + (target.x - cur.x) * k, y: cur.y + (target.y - cur.y) * k };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/QC009-ra-camera.ts, exit 0.

Best transferable idea: Frame a group by the mean of their positions, offset by half the view, then clamp the view into the level bounds and report whether the clamp moved it.
Decision (proposed): adapt - take the mean-then-clamp group framing and the clamp-reports-shift flag for the fight camera; reject the keyboard and edge scroll (the edge scroll is not even live) and the donor's instant snap, and add easing, because a fast duel needs a damped camera, not a jump.
Acceptance: In a 1-on-3 fight (hero plus MAX_ATTACKERS = 3) the view centres on the mean of the four positions, clamped to the zone edge, and eases to it with a configured half-life; a client test asserts that the framed centre equals the four-point mean when unclamped, and that the origin stays inside the zone when clamped.

Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms; clean-room only; shape and numbers as design data, no line translation)
Brief rule served: client-only camera (ruling); MAX_ATTACKERS = 3 used as the group size; rules 7-9 n/a. Camera scope: world camera.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only framing: group mean, clamp to zone bounds, easing; the engine never reads it).
- Parity-checklist row 11 (fight camera). The addendum has no row for the world camera; flag for Lead (same gap as hedgewars-hw and OpenEnroth-OpenEnroth). Group framing of several attackers is the fight camera, so row 11 fits this mechanism.
- Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms; clean-room only).
- Brief rule served: client-only camera (ruling); MAX_ATTACKERS = 3 as group size; rules 7-9 n/a.

## 6. Gaps and risks

- GPL-3.0 with EA additional terms. Clean-room only. The sketch is written from the mechanism. The additional terms bar using "Command & Conquer" or EA trademarks, so do not name the donor in any Frankendom output. The indemnity clause applies only to a conveyor who assumes contractual liability; it does not change the clean-room rule for us.
- The live donor is top-down 2D with a snap. What transfers: the group mean, the half-view offset, the clamp with a shift flag. What does not: the lepton grid, the sidebar width, the keyboard scroll and the snap. A 3D third-person camera needs yaw and pitch, a follow offset and collision, none of which is here.
- The dead edge scroll must not be mistaken for the camera. Its numbers (the rate table and inertia) are disabled in this source (SCROLL.CPP 92-227) and I did not check whether another build turns them on.
- Frame loop. Input is handled once per pass of a frame-timer loop (CONQUER.CPP 2108-2120), so the donor's keyboard step is fixed-step. Frankendom's time-based easing (the sketch's `easeToward`) is our addition, not the donor's.
- Group mean is sensitive to outliers. A far-away attacker pulls the mean and the view. Frankendom should cap the group at the hero plus MAX_ATTACKERS = 3, and decide whether a dead or distant attacker drops out of the mean.
- Not read: `Confine_Rect` asm body (contract only), `Center_Coord`, `CELL_LEPTON_W` value, the key source inside `Map.Input`, and the binding table. The Tiberian Dawn `Center_Map` (CONQUER.CPP 522-576, 3184; DISPLAY.CPP) was grep only.
