// clean-room sketch of a sing hold timer with a hold loop and an end pose (donor licence Apache-2.0: shape only, not a translation)
const HOLD = "-hold";
const END = "-end";

export interface SingState { anim: string; holdTimer: number; } // holdTimer in seconds

export interface SingCfg {
  singTimeSteps: number;   // per-character data (donor: _data.singTime)
  stepLengthMs: number;    // from the song tempo, not from the frame clock
  isPlayer: boolean;       // the player releases on let-go; the opponent always releases on time
}

export interface SingFrame {
  elapsedSec: number;
  justPressed: boolean;    // a new note was pressed this frame
  held: boolean;           // a note key is still down
  finished: boolean;       // the current clip reached its last frame
  hasAnim: (name: string) => boolean;
}

// Sustain notes pre-charge the hold timer with minus the note length, so the sing lasts longer.
export function sustainPrecharge(sustainLengthMs: number): number {
  return -sustainLengthMs / 1000;
}

export function singStep(s: SingState, cfg: SingCfg, f: SingFrame): SingState {
  let anim = s.anim;
  let holdTimer = s.holdTimer;

  // A finished clip with a "-hold" twin switches to the twin, which loops.
  if (f.finished && !anim.endsWith(HOLD) && f.hasAnim(anim + HOLD)) anim = anim + HOLD;

  if (cfg.isPlayer && f.justPressed) holdTimer = 0;

  const singing = anim.startsWith("sing") && !anim.endsWith(END);
  if (!singing) return { anim, holdTimer: 0 };

  holdTimer += f.elapsedSec;
  let singSec = cfg.singTimeSteps * (cfg.stepLengthMs / 1000);
  if (anim.endsWith("miss")) singSec *= 2; // a miss holds twice as long
  const mayStop = cfg.isPlayer ? !f.held : true;

  if (holdTimer > singSec && mayStop) {
    holdTimer = 0;
    const base = anim.endsWith(HOLD) ? anim.slice(0, anim.length - HOLD.length) : anim;
    anim = f.hasAnim(base + END) ? base + END : "idle"; // release: end pose if any, else idle
  }
  return { anim, holdTimer };
}
export {};
