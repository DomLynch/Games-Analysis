// Licence: GPL-3.0 with additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const EXPLOSION_FRAMES = 6;   // donor: frames 1..6 are drawn; the blast ends when the frame passes 6
const CHAIN_RADIUS_PX = 30;   // donor checkSpriteCollision: Manhattan distance below 30 px, both sides alive

interface Cell { x: number; y: number; }      // tile coordinates
interface Hazard { kind: "fire"; cells: Cell[]; }

interface Blast {
  x: number;       // tile coordinates of the blast
  y: number;
  frame: number;   // 1..EXPLOSION_FRAMES while running
  done: boolean;
}

function newBlast(x: number, y: number): Blast {
  return { x, y, frame: 1, done: false };
}

// Called once per sim cycle. The frame advances on even cycles only (half the sim rate).
// Returns the hazard when the blast ends, else null.
// Fixed: the five cells are the centre plus the four diagonal neighbours. The donor passes
// pixel offsets (+/-16 px) to a helper that ignores them and stamps the blast's own tile five times.
function tickBlast(b: Blast, cycle: number, canBurn: (c: Cell) => boolean): Hazard | null {
  if (b.done) return null;
  if ((cycle & 1) === 0) b.frame++;
  if (b.frame <= EXPLOSION_FRAMES) return null;

  b.done = true;
  const all: Cell[] = [
    { x: b.x, y: b.y },
    { x: b.x - 1, y: b.y - 1 }, { x: b.x + 1, y: b.y + 1 },
    { x: b.x - 1, y: b.y + 1 }, { x: b.x + 1, y: b.y - 1 },
  ];
  return { kind: "fire", cells: all.filter(canBurn) };
}

interface Vehicle {
  id: number;
  x: number;   // pixels
  y: number;
  alive: boolean;
}

// Chain reaction: a live source destroys every other live vehicle within the radius.
function chainTargets(src: { x: number; y: number }, vehicles: Vehicle[]): number[] {
  const out: number[] = [];
  for (const v of vehicles) {
    if (!v.alive) continue;
    const d = Math.abs(v.x - src.x) + Math.abs(v.y - src.y);
    if (d < CHAIN_RADIUS_PX) out.push(v.id);
  }
  return out;
}

export {};
