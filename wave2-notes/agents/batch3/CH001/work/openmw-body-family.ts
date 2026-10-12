// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Gender = "male" | "female";
type Part = "head" | "hair";

interface BodyPartRec {
  id: string;
  race: string;
  part: Part;
  female: boolean;          // sex flag on the record
  playable: boolean;
  firstPersonOnly: boolean;
}

// Race record: weight scales width (x, y); height scales z. Both per gender, default 1.
interface RaceRec {
  id: string;
  weight: Record<Gender, number>;
  height: Record<Gender, number>;
}

// Chargen list: the parts a race and gender may pick, in data order.
function partsFor(store: BodyPartRec[], race: string, gender: Gender, part: Part): string[] {
  const wantFemale = gender === "female";
  return store
    .filter(b => b.playable && !b.firstPersonOnly && b.part === part && b.race === race && b.female === wantFemale)
    .map(b => b.id);
}

// Index step over a list. Forward past the end returns 0.
function step(index: number, count: number, delta: number): number {
  if (count === 0) return 0;
  return (((index + delta) % count) + count) % count;
}

interface Scale3 { x: number; y: number; z: number; }

// Render scale for a body. Collision is never scaled by race, so every body has the same hit extents.
function scaleFor(race: RaceRec, gender: Gender, cell: number, phase: "collision" | "render", firstPersonPlayer: boolean): Scale3 {
  if (phase === "collision") return { x: cell, y: cell, z: cell };
  if (firstPersonPlayer) {
    const h = cell * race.height[gender];
    return { x: h, y: h, z: h };
  }
  return { x: cell * race.weight[gender], y: cell * race.weight[gender], z: cell * race.height[gender] };
}

// Horizontal movement factor. Race weight is included unless the normalise setting is on (donor default: off).
function moveFactor(race: RaceRec, gender: Gender, cell: number, normaliseRaceSpeed: boolean): number {
  return normaliseRaceSpeed ? cell : cell * race.weight[gender];
}

export {};
