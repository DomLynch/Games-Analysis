# gemrb-gemrb (hud-ui, cell 2)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/GUI/GameControl.cpp` | Licence: GPL-2.0-or-later (file header line 3: "SPDX-License-Identifier: GPL-2.0-or-later"; COPYING is the GPL version 2 text) | C++ | symbol `GameControl::OnTouchGesture`

Checked: The list hint `demo/override/guiw.chu` is a binary window layout (not opened; REUSE.toml puts `demo/**` under CC-BY-SA-4.0, so it is not donor code to copy). The real touch path was found by grep on touch, finger, gesture and wheel words. Read in part: `core/GUI/GameControl.cpp` 1525-1664 (drag, touch down, touch up, gesture), 2166-2190 (mouse down), 2456-2478 (wheel zoom); `core/GUI/View.cpp` 780-840 (base touch defaults); `core/GUI/EventMgr.cpp` 270-330 and 437-500 (finger set, gesture build); `core/GUI/EventMgr.h` 103, 120-150, 250; `core/GUI/Window.cpp` 372, 415-470; `plugins/SDLVideo/SDL20Video.cpp` 850-925 (SDL finger and multigesture translation). Confidence: high on the gesture table (every branch read); medium on the rotation unit (SDL reports dTheta; its unit was not checked against SDL docs). Not read (and not written up): `GameControl::MoveViewportTo` 1729-1798, formation placement 131-230, target reticles 317-405 and 627-688, `GameControl::OnMouseUp` 2235-2353, the minimap (`core/GUI/MapControl.cpp`, 378 lines), the world map (`core/GUI/WorldMapControl.cpp`, 329 lines; `core/WorldMap.cpp`, 564 lines). These are candidate follow-ups for the lock-on and minimap topics. Camera scope: not a camera cell.

## 1. Mechanism

A touch gesture layer that maps finger count and per-event motion to one action each.

- Input path. SDL finger motion becomes a gesture with rotation and pinch set to zero (`SDL20Video.cpp` 888-896). SDL multigesture carries the rotation and pinch deltas and is dispatched only when the touch moved (905-913). Touch down and up update a finger map (`EventMgr.cpp` 287-296); a gesture replaces the map with its own fingers (296-302). A gesture's position is the centroid of its fingers (`EventMgr.cpp` 462-463). Its delta takes the largest x delta and the largest y delta, each from whichever finger has it (453-458). Rotation and pinch are stored on the gesture (479-480).
- Base view defaults (`View.cpp` 806-832): one finger down or up acts as a left mouse button; one finger drag acts as a mouse drag; two fingers act as the mouse wheel.
- `GameControl` overrides those defaults.
  - Touch down (`GameControl.cpp` 1571-1585): with two fingers down, container and door highlights are switched on (1571-1572). With one finger, the base mouse-down runs, and if there is a last hovered actor it shows that actor's head HP ratio (1582-1584). Touch up (1592-1599) switches the highlights off unless ALT is held.
  - One-finger gesture (1603-1610): in a target mode it is ignored; otherwise the selection rectangle flag is set (1610).
  - Two-finger gesture (1611-1626): if the rotation magnitude is above 0.2 (1612), the highlights are switched off, the selection rectangle is cleared (1617), and then: with at most one unit selected, formation rotation is cleared (1620); with two or more selected, the group is formed around the second finger (1622-1623). Otherwise the view pans by the negated gesture delta (1626).
  - Three-finger gesture (1628-1636): a vertical delta beyond the drag radius (10) is a swipe up (show the keyboard, or focus the console if it is already up) or a swipe down (close the console and stop text input).
- Zoom. Only the mouse wheel changes the zoom level, in 27 steps (`GameControl.cpp` 2466-2470, clamped from 1 to 27). With the "Zoom Lock" dictionary value set, the wheel pans instead (2458-2462). The pinch delta is stored on every multigesture (`EventMgr.cpp` 480) but nothing in the donor reads it (grep), so pinch does nothing in `GameControl`.
- Tick: event-driven. No per-frame loop in this path; the view moves when a gesture arrives.

## 2. Key functions

- `GameControl::OnTouchGesture` 1601-1640: the finger-count table (one, two, three fingers).
- `GameControl::OnTouchDown` 1569-1586: two-finger highlights and the touch-to-reveal HP.
- `GameControl::OnTouchUp` 1592-1599: clears the highlights.
- `GameControl::OnMouseWheelScroll` 2456-2475: the only zoom path, 27 steps.
- `View::OnTouchGesture` 824-835: the base defaults that `GameControl` replaces.
- `EventMgr::CreateTouchEvent` 437-470 and `CreateTouchGesture` 472-483: centroid, per-axis delta, rotation and pinch.
- `SDL20Video::ProcessEvent` touch cases 888-913: finger motion and multigesture translation.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Finger count selects the action: one selects a box, two pan or rotate, three swipe | None |
| Rotation vs pan decided per event | 0.2 (theirs, `GameControl.cpp` 1612; the donor TODO says "actually figure out a good number") |
| Swipe threshold on vertical motion | 10 px (theirs, `EventMgr.h` 250, `mouseDragRadius`) |
| Zoom steps via the wheel | 27 steps, floor 1 (theirs, `GameControl.cpp` 2466-2469) |
| Touch down on an actor reveals its HP | None in the code read; the duration is set inside `DisplayHeadHPRatio`, not read |
| Pinch delta | Stored, never read (theirs, `EventMgr.cpp` 480) |

## 4. TypeScript sketch

simplified: the sketch keeps the finger-count table, the rotation threshold and the touch-to-reveal HP. It fixes one donor defect: the donor re-decides rotation or pan on every event, so a twist can drop back to a pan. The sketch latches rotation until the finger lifts. It omits the debug highlights, the console swipe actions, the formation placement itself (the sketch returns an intent, not positions), the target-mode guard (kept only as the `targeting` flag), the centroid and per-axis delta build (the sketch takes the gesture delta as given), the mouse-emulation path, and pinch (the type carries the field but nothing reads it, as in the donor).

```ts
// Licence: GPL-2.0 (donor COPYING). Clean-room: written from the described mechanism, not a translation of the donor lines.
export type Gesture = { fingers: number; dTheta: number; dx: number; dy: number; pinch: number };
export type Intent =
  | { kind: "select-box" }
  | { kind: "pan"; dx: number; dy: number }
  | { kind: "rotate-formation" }
  | { kind: "swipe-up" }
  | { kind: "swipe-down" }
  | { kind: "ignore" };

export interface TouchState {
  latched: "rotate" | null; // set once a rotation passes the threshold; cleared on touch-up
}

// Donor value 0.2 with a TODO saying it is not tuned (units as SDL reports dTheta; not verified).
export const ROTATE_THRESHOLD = 0.2;
// Donor EventMgr.h mouseDragRadius = 10, screen pixels.
export const SWIPE_RADIUS = 10;

export function onTouchUp(s: TouchState): void {
  s.latched = null;
}

// One gesture event. The targeting flag swallows one- and two-finger input, as the donor does.
export function classify(s: TouchState, g: Gesture, targeting: boolean, selectedCount: number): Intent {
  if (g.fingers === 1) {
    return targeting ? { kind: "ignore" } : { kind: "select-box" };
  }
  if (g.fingers === 2) {
    // Fix (donor re-decides every event): rotation sticks for the rest of the touch.
    if (s.latched !== "rotate" && Math.abs(g.dTheta) > ROTATE_THRESHOLD) s.latched = "rotate";
    if (s.latched === "rotate") {
      return selectedCount > 1 ? { kind: "rotate-formation" } : { kind: "ignore" };
    }
    return { kind: "pan", dx: -g.dx, dy: -g.dy };
  }
  if (g.fingers === 3) {
    if (g.dy < -SWIPE_RADIUS) return { kind: "swipe-up" };
    if (g.dy > SWIPE_RADIUS) return { kind: "swipe-down" };
    return { kind: "ignore" };
  }
  return { kind: "ignore" };
}

// One finger landing on an actor shows that actor's head HP. Returns the actor id to show, if any.
export function touchDown(fingersDown: number, hoverActorId: number | null): number | null {
  return fingersDown === 1 ? hoverActorId : null;
}
export {};
```

Sketch check: copied to the VPS as `/tmp/HU018-gemrb-touch-intent.ts` and run with `npx -p typescript tsc --noEmit --strict --target es2020`; exit 0.

## 5. Lands in

- TARGET `src/fight/intent.ts` (new): the table from client gesture to fight intent (select, pan, rotate-formation, ignore). The gesture reader and the viewport pan stay in the client; the engine receives only the intents it accepts.
- Parity row 5 (controls/input). The touch-to-reveal HP belongs to row 14 (HUD) and is noted here only.
- today: Frankendom's current touch handling was not read in this pass.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only).
- Brief rule served: client-only input (camera and HUD are client-only; the engine validates every intent it acts on).

## 6. Gaps and risks

Donor defects (idea kept, each fixed where noted):

1. Rotation and pan are re-decided every event (`GameControl.cpp` 1612). A twist that slows below 0.2 for one event becomes a pan, and back. Fix: latch rotation until touch-up (sketch `classify`).
2. The 0.2 value is a magic number with a TODO (1612). Fix: a data field with a device default.
3. The gesture delta takes the largest x delta and the largest y delta from possibly different fingers (`EventMgr.cpp` 453-458). For two fingers that move together the error is small. Fix: average the finger deltas for multi-finger gestures.
4. Pinch is read from SDL and stored (`EventMgr.cpp` 480) but never used, so there is no pinch zoom. This is a gap, not a copy: Frankendom will need pinch if the phone view zooms, and that is the camera owner's decision.
5. Two fingers down switch on container and door highlights (1571-1572) in the normal build. Fix: gate them behind the debug flag only.
6. `Window.cpp` 455 says the touch gesture dispatch "is incomplete" and that drag and drop does not work through it. Do not copy the path until that is fixed.
7. `GameControl.cpp` 1576 and `View.cpp` 807 say pressure should separate the tooltip from the HP reveal, and nothing uses pressure. Phones give no pressure. Fix: a long press with its duration as data.

Rulings:

- The gesture table is client input. A box select or a tap selects a target; the engine decides engage and kills (server-verified). Nothing here decides a kill.
- MAX_ATTACKERS = 3: the donor's formation rotation (1622-1623) re-forms a movement group around a point. It does not choose attackers and is not a fight rule.
- Zones as data: no zone-specific value in the table. The rotation threshold and swipe radius are device or UI settings, not zone data.
- Accessibility and input buffer: the donor has no buffer for gestures that arrive during a busy frame and no accessibility option in this path (not searched beyond this path).
- Touch-to-reveal HP is the only feedback for a touch on an enemy in this path. For a phone the reveal should stay until the finger lifts (a proposal, not donor behaviour).

String table and localisation fold-in: not in this cell's path (the donor's text comes from the game data); not written here.

Best transferable idea: Classify each touch gesture by finger count and per-event motion (one finger selects, two fingers pan unless they twist past a threshold, three fingers swipe), latch the twist until the finger lifts, and show a touched enemy's HP while the finger stays down.

Decision (proposed): adapt — the finger-count table and the latched twist fit a phone-first Pit and zone view; the donor's formation rotation and console swipe do not fit Frankendom, so they are not taken.
Acceptance: On a 375-wide phone: one finger tap selects an enemy as target (no box); two fingers that do not twist pan the zone view; a twist beyond the threshold stays a twist until the finger lifts; a single touch on an enemy shows that enemy's HP until the finger lifts.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only).
Brief rule served: client-only input; the engine validates every intent it acts on.
