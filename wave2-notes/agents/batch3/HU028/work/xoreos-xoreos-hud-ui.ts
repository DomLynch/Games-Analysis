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
