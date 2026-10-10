// Licence: GPL-2.0 (donor, version 2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Beat =
  | { kind: 'move'; dx: number; dy: number; dz: number; image: number }
  | { kind: 'end'; code: 0 | 1 | 2 };   // 0 = remove, 1 = float cycle end (maybe burst), 2 = event, then carry on

interface Scripts {
  floats: Beat[][];   // four float directions; each ends with an end-1 beat
  burst: Beat[];      // ends with an end-0 beat
  absorb: Beat[];     // wobble, one end-2 event, a short tail, ends with end-0
}

interface Effect {
  script: Beat[];
  pc: number;          // index of the last beat played (-1 before the first)
  x: number; y: number; z: number;   // z is absolute, as in the donor
  image: number;
  progress: number;    // ticks since spawn
}

const STEP_TICKS = 4;        // a beat is taken every 4 ticks
const BURST_HEIGHT = 180;    // absolute z above which a float bursts

// spawnDir 0 takes the absorb path; any other value floats in a random one of four directions.
function startEffect(sc: Scripts, spawnDir: number, x: number, y: number, z: number, rand: () => number): Effect {
  const script = spawnDir !== 0 ? sc.floats[rand() & 3] : sc.absorb;
  return { script, pc: -1, x, y, z, image: 0, progress: 0 };
}

// One tick. Returns false when the effect is gone.
function tickEffect(e: Effect, sc: Scripts, rand: () => number, onEvent: (code: 2) => void): boolean {
  e.progress += 1;
  if ((e.progress & (STEP_TICKS - 1)) !== 0) return true;

  let idx = e.pc + 1;
  let beat = e.script[idx];
  if (beat.kind === 'end' && beat.code === 0) return false;

  if (beat.kind === 'end' && beat.code === 1) {
    // float cycle end: burst if too high, or on a roll of about 1 in 96; otherwise loop the float
    const roll = rand() & 0xffff;
    if (e.z > BURST_HEIGHT || ((roll * 96 + 48) >>> 16) < 1) e.script = sc.burst;
    idx = 0;
    beat = e.script[idx];
  } else if (beat.kind === 'end' && beat.code === 2) {
    onEvent(2);
    idx += 1;
    beat = e.script[idx];
  }

  if (beat.kind !== 'move') return false;
  e.pc = idx;
  e.x += beat.dx;
  e.y += beat.dy;
  e.z += beat.dz;
  e.image = beat.image;
  return true;
}

export {};
