// Licence: MIT (donor, OTClient LICENSE). Adapted shape, rewritten in TypeScript for Frankendom.
// Client-only input: the engine never reads this module; it only receives a direction per fixed step.

export type Dir8 = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface StickCfg {
  padW: number;       // pad width in px (donor keypad 175 x 150)
  padH: number;       // pad height in px
  knobMax: number;    // knob travel radius in px (donor 75)
  deadZone: number;   // half-pad fraction with no direction (donor 0.1)
  cornerZone: number; // corner square, fraction from each edge, that means a diagonal (donor 0.3)
}

export interface StickReading {
  dir: Dir8 | null;
  knobX: number; // px from pad centre
  knobY: number;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Pure reading of one pointer position (px from the pad's top-left corner).
export function readStick(px: number, py: number, cfg: StickCfg): StickReading {
  // Centred fractions, -0.5..0.5 ("+" is right and down).
  const nx = clamp01(px / cfg.padW) - 0.5;
  const ny = clamp01(py / cfg.padH) - 0.5;

  // Knob: follows the finger in px and is clamped to a circle of radius knobMax.
  const dxPx = nx * cfg.padW;
  const dyPx = ny * cfg.padH;
  const r = Math.hypot(dxPx, dyPx);
  const k = r > cfg.knobMax ? cfg.knobMax / r : 1;

  // Corners first: both axes past the corner line means a diagonal.
  const edge = 0.5 - cfg.cornerZone; // donor 0.3 from the edge is 0.2 from centre
  let dir: Dir8 | null = null;
  if (ny < -edge && nx < -edge) dir = 'NW';
  else if (ny < -edge && nx > edge) dir = 'NE';
  else if (ny > edge && nx < -edge) dir = 'SW';
  else if (ny > edge && nx > edge) dir = 'SE';

  // Dead zone, then the dominant axis (compared in px, so the pad's aspect does not skew it).
  if (dir === null && (Math.abs(ny) > cfg.deadZone || Math.abs(nx) > cfg.deadZone)) {
    if (Math.abs(dyPx) > Math.abs(dxPx)) dir = ny < 0 ? 'N' : 'S';
    else dir = nx < 0 ? 'W' : 'E';
  }

  return { dir, knobX: dxPx * k, knobY: dyPx * k };
}

// Holds one touch. Call step() once per FIXED simulation step, never per frame.
export class TouchStick {
  private down = false;
  private px = 0;
  private py = 0;
  private firstSent = false;

  constructor(private readonly cfg: StickCfg) {}

  press(px: number, py: number): void {
    this.down = true;
    this.px = px;
    this.py = py;
    this.firstSent = false;
  }

  move(px: number, py: number): void {
    if (this.down) {
      this.px = px;
      this.py = py;
    }
  }

  release(): void {
    this.down = false;
  }

  // Returns the intent for this step, or null when nothing is held or the stick is in the dead zone.
  // `first` is true only on the first step after a press (the donor never clears its flag while held).
  step(): { dir: Dir8; first: boolean } | null {
    if (!this.down) return null;
    const reading = readStick(this.px, this.py, this.cfg);
    if (reading.dir === null) return null;
    const first = !this.firstSent;
    this.firstSent = true;
    return { dir: reading.dir, first };
  }
}
