// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Box { x: number; y: number; w: number; h: number; }

interface Slot {
  id: number;
  instant: boolean;   // true: fire on click; false: becomes the current verb and waits for a target
  box: Box;
  over: boolean;
  cueLeft: number;    // s left in the hover wobble
  cuePhase: number;
  offX: number;       // px offset drawn for this slot
  offY: number;
}

interface Bar { verb: number; slots: Slot[]; }   // slots[0] is the default (walk) action
// pressed is true only on the frame the button goes down (a press edge), not while it is held (donor: held state).
interface Input { mx: number; my: number; pressed: boolean; targetDefault: number | null; }

const CUE_TIME = 0.25;   // s, hover wobble length
const CUE_AMP = 1.2;     // px, peak wobble radius
const CUE_REARM = 0.1;   // s, re-arm a hover cue only when the last one is nearly done
const CUE_SPEED = 40;    // phase per second of elapsed time

function inside(b: Box, x: number, y: number): boolean {
  return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
}

// One frame of the action bar. Returns the instant verb to fire now (or null) and the verb to highlight.
function updateBar(bar: Bar, inp: Input, elapsed: number): { fire: number | null; highlight: number } {
  // Fix: highlight the hovered target's default action when there is one (the donor stores it and never reads it).
  const highlight = inp.targetDefault ?? bar.slots[0].id;
  let fire: number | null = null;

  for (const s of bar.slots) {
    const over = inside(s.box, inp.mx, inp.my);

    if (s.cueLeft > 0) {
      s.cueLeft = Math.max(0, s.cueLeft - elapsed);
      s.cuePhase += CUE_SPEED * elapsed;
      // Fix: the wobble decays to zero and the offset is cleared when it ends (the donor keeps the last offset).
      const amp = CUE_AMP * (s.cueLeft / CUE_TIME);
      s.offX = amp * Math.cos(s.cuePhase + 0.3);
      s.offY = amp * Math.sin(s.cuePhase);
    } else {
      s.offX = 0;
      s.offY = 0;
    }

    if (over && !s.over && s.cueLeft < CUE_REARM) {
      s.cueLeft = CUE_TIME;
      s.cuePhase = 0;
    }
    s.over = over;

    if (inp.pressed && over) {
      if (s.instant) {
        fire = s.id;
      } else if (bar.verb !== s.id) {
        bar.verb = s.id;
      }
    }
  }
  return { fire, highlight };
}

export {};
