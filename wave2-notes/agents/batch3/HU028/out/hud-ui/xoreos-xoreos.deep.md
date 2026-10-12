# xoreos-xoreos (hud-ui, cell 2)

Donor: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/gui/hud.cpp` (with `gui/selectioncircle.cpp` and `module.cpp`) | Licence: GPL-3.0 or later (read: `selectioncircle.cpp` header says "any later version"; `/mnt/frankendom-donors/xoreos-xoreos/COPYING` is the GNU GPL v3 text) | C++ | symbol `HUD::updateTargetInformation`

Checked: Read `gui/hud.cpp` 50-63 and 94-432 (the target and hover code end to end; the constructor at 43-52 was not read), `gui/selectioncircle.cpp` 1-130 (whole file), `gui/selectioncircle.h` 34, `module.cpp` 180-200, 528-590 (click handling and the per-frame order). Grep only: `gui/ingame.cpp` wrappers, the callers in `area.cpp` (543, 550, 572, 844). Not read: `GfxMan.project` (the projection), `Object::getTooltipAnchor`, `getCursor`, `isEnemy`, `getPossibleActions`, the widget classes, and the area hit test that picks the object under the cursor. Confidence high on the frame stack, the select-then-act flow and both reticle defects (read in code). The on-screen effect of defect B was reasoned from the code, not run. camera_scope: n/a (HUD cell).

## 1. Mechanism

- Select, then act (module.cpp 528-544). A click on an object that is not the current target sets it as the target (530-531). A click on the current target acts: attack when it is an enemy and not dead (535), otherwise use it. The act is an Action with range 1.0 (539). The leader's queued actions are cleared first (542), so a second tap replaces whatever was queued. Hover is entered and left by `enterObject` and `leaveObject` (module.cpp 546-552, from area.cpp).
- Per-frame order (module.cpp 568-587): frame time is wall clock in milliseconds (568), then events, actions, creature actions, camera, party movement, sound, and last `updateSelection()` (587). So the frame follows the character's position for that frame.
- Target validity and placement (hud.cpp 179-204). A target that is an unusable door is dropped (182-183). With no target, the reticle and the info are hidden (186-189). Otherwise the hover flag is recomputed (192), the reticle moves to the object's projected tooltip anchor (195), and the reticle and info are shown at that anchor if it is on screen, else both are hidden (196-203).
- Hover reticle (hud.cpp 206-225). Hidden if there is no hovered object, or the hovered object is the target (the target reticle covers it, 213-214), or it is off screen (224).
- Stacked frame under the anchor (hud.cpp 351-406). `top = anchor y + 32 + 1` (the reticle is 64 wide, header line 34; half is 32, from 361-362). If the target has actions, the action row takes the top line and the health row is pushed down by the button height plus 1 (364-367). The health bar sits at `x - 100` (371, 378), and the name sits below it by the bar height plus 1 (394). Enemy health fill is red and friendly is blue (375-377). Max and current hit points come straight from the object (380-381). Enemy name colour is (0.745, 0.106, 0.0), friendly (0.322, 0.463, 0.918) (391-393).
- Action slots (hud.cpp 259-329). Three buttons. The middle one carries an action only when `getPossibleActions` includes open-lock (322-323; icon 278). The left and right buttons sit one measured distance either side of the middle (272-274 and 248-257). The slot contents are rebuilt only when the target changed (352-353, cleared at 405). Only the middle button of the three is wired (callback 160-177; action range 1.0 at 168).
- Reticle (selectioncircle.cpp 96-126). Two sprites per role, hostile or friendly, one for hover and one for target. The sprite follows `isEnemy`. The reticle is centred on the anchor by half its size (62). Visibility from `moveTo` is the depth test `0 <= sZ <= 1` (122-125), not a screen-rectangle test.

## 2. Key functions

- `HUD::updateTargetObject` 179-204 and `HUD::updateHoveredObject` 206-225: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/gui/hud.cpp`.
- `HUD::updateTargetInformation` 351-406 (stack and colours) and `HUD::updateTargetButtons` 259-281 (action row).
- `HUD::fillTargetButtonActions` 319-329 and `HUD::callbackActive` 160-177.
- `SelectionCircle::moveTo` 96-126: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/gui/selectioncircle.cpp`.
- `Module::clickObject` 528-544 and the frame order 560-590: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/module.cpp`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Frame stacked under the target's projected anchor, offset by half the reticle plus one pixel | Reticle 64 px (selectioncircle.h 34); pad 1 px (hud.cpp 362, 270) |
| Action row on top; health and name pushed down by the row's height plus one pixel | Row height is measured from the button widget (hud.cpp 367), not a constant |
| Enemy red and friendly blue on the same bar; enemy name colour | Colours given in the code (hud.cpp 375-377, 391-393) |
| Select on the first click, act on the second click of the same target | Act range 1.0 (module.cpp 539; hud.cpp 168) |
| Drop the target when it is no longer valid (unusable door) | Only doors are checked (hud.cpp 182) |
| Recompute action slots only when the target changed | Dirty flag (hud.cpp 352, 405) |
| Hover reticle hidden when it is also the target | Rule, no constant (hud.cpp 214) |

## 4. TypeScript sketch

simplified: the sketch keeps the stack maths (layoutFrame), the depth-only on-screen test (anchorOnScreen), the target set and drop rules, the select-then-act click with the replace-queue step, the dirty-flag action slots, and the reticle flags. It fixes the two donor show bugs by setting each flag from its own state. It omits the sprite names, the bar fill sprites, the per-object cursor (`getCursor`), the widget z-order values (-100, -FLT_MAX), the projection (the anchor and depth are passed in), the hover path (`updateHoveredObject`), and the area hit test. The reticle state is a pure function here, so the donor's stateful show and hide calls are not reproduced.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

const RETICLE = 64;        // donor kSelectionCircleSize (selectioncircle.h 34)
const PAD = 1;             // donor "+ 1.0f" spacing between stacked elements
const NAME_OFFSET_X = -100; // donor "x - 100" for health and name

interface Unit {
  id: number;
  isEnemy: boolean;
  isDead: boolean;
  isDoor: boolean;
  usable: boolean;
  hp: number;
  maxHp: number;
  name: string;
  actions: string[];       // e.g. 'lock'
}

interface Anchor { x: number; y: number; depth: number; } // projected tooltip anchor; depth in [0, 1] means in front

interface Layout {
  reticle: { x: number; y: number };
  actionRowY?: number;
  buttonXs: number[];
  healthY: number;
  nameY: number;
  left: number;
}

// Donor HUD::updateTargetInformation (hud.cpp 361-405): stack below the anchor; the action row is on top
// and the health bar drops below it when the target has actions.
function layoutFrame(a: Anchor, hasActions: boolean, buttonH: number, healthH: number, buttonDist: number, buttonW: number): Layout {
  const half = RETICLE / 2;
  const top = a.y + half + PAD;
  let y = top;
  if (hasActions) y += buttonH + PAD;
  const healthY = y;
  y += healthH + PAD;
  return {
    reticle: { x: a.x - half, y: a.y - half },
    actionRowY: hasActions ? top : undefined,
    buttonXs: hasActions ? [a.x - buttonDist - buttonW / 2, a.x - buttonW / 2, a.x + buttonDist - buttonW / 2] : [],
    healthY,
    nameY: y,
    left: a.x + NAME_OFFSET_X,
  };
}

// Donor onScreen is the depth test only (selectioncircle.cpp 125); the sketch keeps that rule and says so.
function anchorOnScreen(a: Anchor): boolean {
  return a.depth >= 0 && a.depth <= 1;
}

interface HudState { target?: Unit; hovered?: Unit; targetDirty: boolean; }

// Donor HUD::setTargetObject (hud.cpp 105-113): setting the same target does nothing; a new one marks it dirty.
function setTarget(s: HudState, u: Unit | undefined): void {
  if (s.target === u) return;
  s.target = u;
  s.targetDirty = true;
}

// Donor HUD::updateTargetObject (hud.cpp 179-190): a target that is no longer usable (a door) is dropped each frame.
function validateTarget(s: HudState): void {
  if (s.target && s.target.isDoor && !s.target.usable) setTarget(s, undefined);
}

// Donor Module::clickObject (module.cpp 528-544): first click selects; a second click on the same target acts.
// The act replaces the leader's queued actions (clearActions, 542) and uses range 1.0 (539).
interface ActionQueue { clear(): void; add(a: { kind: string; target: number; range: number }): void; }
function onClick(s: HudState, u: Unit, q: ActionQueue): void {
  if (s.target !== u) { setTarget(s, u); return; }
  const attack = u.isEnemy && !u.isDead;
  q.clear();
  q.add({ kind: attack ? 'attack' : 'use', target: u.id, range: 1.0 });
}

// Donor fillTargetButtonActions (hud.cpp 319-329): only the middle slot takes an action, and it is
// recomputed only when the target changed (dirty flag, hud.cpp 352 and 405).
function actionSlots(s: HudState): (string | undefined)[] {
  if (!s.target) return [undefined, undefined, undefined];
  if (s.targetDirty) s.targetDirty = false;
  return [undefined, s.target.actions.includes('lock') ? 'lock' : undefined, undefined];
}

// Fix to donor SelectionCircle::moveTo (selectioncircle.cpp 102-115): each reticle flag comes from its own
// state. The donor shows the hover quad when the faction flips (104) and shows the hover quad where the
// target quad belongs (115).
interface Reticle { hoverOn: boolean; targetOn: boolean; style: 'hostile' | 'friendly'; }
function reticleFor(u: Unit, isHovered: boolean, isTarget: boolean): Reticle {
  return { hoverOn: isHovered, targetOn: isTarget, style: u.isEnemy ? 'hostile' : 'friendly' };
}

export {};
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS (`/tmp/HU028-xoreos-hud-ui.ts`, export {} appended): exit 0.

Best transferable idea: Select on the first tap and engage on a second tap of the same target (the second tap replaces the queued action and uses a fixed range), with the target frame stacked under the target's projected anchor and dropped when the target is no longer valid.
Decision (proposed): adapt — keep the two-tap select-then-engage (it fits "engage is a state change" and the server still verifies the kill) and the anchored stack; drop the hover reticle on phones (no cursor), and fix the reticle flags the donor gets wrong.
Acceptance: A player taps an enemy once and sees its frame (name, red health, one action slot) appear under it; a second tap sends one engage with range from data (donor 1.0); when the enemy dies or leaves the screen the frame clears in the next frame; a faction flip shows the hostile reticle and never a stray hover reticle (client test).

## 5. Lands in

- TARGET `src/fight/target-frame.ts` (new, client-only view; the engine never reads it). Parity-checklist row 14 (HUD). The select-then-engage tap rule is the input side of row 5 and would sit in the same client module, not in the engine.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine; the HUD is a client view); "engage is a state change" for the second tap; the "kills are server-verified" ruling (the act is a request, not a kill).

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; the numbers are the donor's and are marked as theirs.
- Defect A (selectioncircle.cpp 102-104): on a faction change the donor shows the hover quad without checking the hover flag. Fix: show a quad only from its own flag (the sketch's `reticleFor`).
- Defect B (selectioncircle.cpp 113-115): on a target-style change the donor shows the hover quad where the target quad belongs. Reasoned from the code, not run: the target quad is shown again on the same frame (show, line 45), but the stray hover quad is not cleared until a hide or a hover change. Fix: show the target quad. This needs a faction flip to trigger; whether a real NPC can flip in this engine was not checked.
- Depth-only visibility (selectioncircle.cpp 125): a target near the screen edge keeps its frame; only the depth test hides it. Frankendom at 375 wide needs a screen-rectangle check in the client.
- Dead targets: the donor drops only unusable doors (hud.cpp 182). A dead creature stays the target and its frame stays. Frankendom must clear the target on the server-verified kill.
- Replace-queue act (module.cpp 542): repeated taps cancel the current queued action. Frankendom's engage must be idempotent or ignore repeats while a fight is running.
- Many-on-one: the donor has one target and one hover reticle and no pattern for several frames. MAX_ATTACKERS = 3 needs a client cap and an engine hate list; the donor gives neither.
- The donor's hit test that decides which object is under the cursor (area.cpp, callers at 543-572) was not read. The tap-hit rule for phones is therefore not rated.
- Minimap and world map: `HUD::setMinimap`, `setPosition` and `setRotation` are no-op stubs (hud.cpp 54-63). This HUD has no minimap or world map. Touch UX, input buffer, lock-on forgiveness and accessibility: none present in the parts of `hud.cpp` read (43-63, 94-432) and none in `selectioncircle.cpp`. Other files not searched beyond grep.
- Frame time is wall clock (module.cpp 568): the HUD follows variable frames. This is fine for a client view, but the engine tick must not read it.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine; the HUD is a client view); HUD row 14; engage as a state change.
