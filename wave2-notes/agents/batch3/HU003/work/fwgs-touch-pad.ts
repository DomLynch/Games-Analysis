// Licence of donor: GPL-3.0-or-later (in_touch.c header). Clean-room: sketch written from the described mechanism, not a translation.
// Client input only: the output is a forward/side move vector and look deltas for the game to send as intent.

type Kind = "floatMove" | "joy" | "dpad" | "look" | "command";

interface Rect { x1: number; y1: number; x2: number; y2: number; }

interface Button {
  name: string;
  kind: Kind;
  rect: Rect;          // normalised screen units (0..1), already grid-snapped by the layout tool
  finger: number;      // id of the finger holding this button, -1 when free
}

interface Pad {
  buttons: Button[];   // list order: the last entry is the front-most
  moveFinger: number;
  moveButton: Button | null;
  moveStart: { x: number; y: number };
  lookFinger: number;
  forward: number;     // -1..1
  side: number;        // -1..1
  yaw: number;         // accumulated look deltas, taken once per frame
  pitch: number;
}

// Data: one shared unit for both floating-zone sizes, joy and dpad radii, look sensitivities.
interface PadData {
  zoneForward: number;
  zoneSide: number;
  joyRadius: number;
  dpadRadius: number;
  yawSens: number;
  pitchSens: number;
}

const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));

// C-style round: halves go away from zero.
const roundAway = (v: number): number => (v < 0 ? -Math.round(-v) : Math.round(v));

function hit(b: Button, x: number, y: number): boolean {
  return x >= b.rect.x1 && x <= b.rect.x2 && y >= b.rect.y1 && y <= b.rect.y2;
}

// Joy and dpad: the offset from the button centre, normalised by its half size.
function applyJoyOrDpad(p: Pad, b: Button, x: number, y: number, d: PadData): void {
  const hw = (b.rect.x2 - b.rect.x1) / 2;
  const hh = (b.rect.y2 - b.rect.y1) / 2;
  const cx = (b.rect.x1 + b.rect.x2) / 2;
  const cy = (b.rect.y1 + b.rect.y2) / 2;
  let f = (cy - y) / hh;
  let s = (x - cx) / hw;
  if (b.kind === "joy") {
    f *= d.joyRadius;
    s *= d.joyRadius;
  } else {
    f = roundAway(f * d.dpadRadius);
    s = roundAway(s * d.dpadRadius);
  }
  p.forward = clamp1(f);
  p.side = clamp1(s);
}

// Floating move: offset from where the thumb first touched the zone.
function applyFloat(p: Pad, x: number, y: number, d: PadData): void {
  p.forward = clamp1((p.moveStart.y - y) / d.zoneForward);
  p.side = clamp1((x - p.moveStart.x) / d.zoneSide);
}

// Touch down: the front-most hit wins and the search stops there.
// Returns the button that took the touch, or null.
function touchDown(p: Pad, finger: number, x: number, y: number, d: PadData): Button | null {
  for (let i = p.buttons.length - 1; i >= 0; i--) {
    const b = p.buttons[i];
    if (!hit(b, x, y)) continue;

    if (b.kind === "floatMove" || b.kind === "joy" || b.kind === "dpad") {
      // A second move finger is refused; the first finger keeps the move and no owner changes.
      if (p.moveFinger !== -1) return null;
      b.finger = finger;
      p.moveFinger = finger;
      p.moveButton = b;
      if (b.kind === "floatMove") {
        p.moveStart = { x, y };
        p.forward = 0;
        p.side = 0;
      } else {
        p.moveStart = { x: (b.rect.x1 + b.rect.x2) / 2, y: (b.rect.y1 + b.rect.y2) / 2 };
        applyJoyOrDpad(p, b, x, y, d);   // the move starts at touch down, not on the first motion
      }
      return b;
    }

    if (b.kind === "look") {
      if (p.lookFinger !== -1) return null;
      b.finger = finger;
      p.lookFinger = finger;
      return b;
    }

    // command: the caller runs its command; the pad only records the owner.
    b.finger = finger;
    return b;
  }
  return null;
}

// Motion: move from the owning move finger, look from the owning look finger.
function touchMotion(p: Pad, finger: number, x: number, y: number, dx: number, dy: number, d: PadData): void {
  if (finger === p.moveFinger && p.moveButton) {
    if (p.moveButton.kind === "floatMove") applyFloat(p, x, y, d);
    else applyJoyOrDpad(p, p.moveButton, x, y, d);
  }
  if (finger === p.lookFinger) {
    p.yaw -= dx * d.yawSens;
    p.pitch += dy * d.pitchSens;
  }
}

// Touch up: only the owning finger releases a button.
function touchUp(p: Pad, finger: number): void {
  for (const b of p.buttons) {
    if (b.finger !== finger) continue;
    b.finger = -1;
    if (b.kind === "look") p.lookFinger = -1;
    if (b === p.moveButton) {
      p.moveFinger = -1;
      p.moveButton = null;
      p.forward = 0;
      p.side = 0;
    }
  }
}

// Once per frame: take the look deltas and clear them.
function takeLook(p: Pad): { yaw: number; pitch: number } {
  const out = { yaw: p.yaw, pitch: p.pitch };
  p.yaw = 0;
  p.pitch = 0;
  return out;
}

export {};
