// Licence: GPL-3.0 text only (donor LICENSE file; no per-file headers found). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Turns = 0 | 1 | 2 | 3;                  // quarter turns about Z
type Mode = { kind: "fixed"; turns: Turns } | { kind: "random" } | { kind: "inherit" };
type Dir = 0 | 1 | 2 | 3;                    // horizontal ring: E, N, W, S (up and down slots not modelled)
type Vec = [number, number];

const DIR_VEC: Vec[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const MAX_DEPTH = 8; // fix: the donor's recursion has no depth limit; this cap is a choice, not a donor value

// Blueprint in its unrotated frame. A slot is a named marker in the blueprint (donor: child blocks).
interface Blueprint { id: string; origin: Vec; originDir: Dir; slots: { name: string; at: Vec; dir: Dir }[] }
interface Alt { blueprint: Blueprint | null; chance: number } // null = nothing placed here; chance defaults to 1
interface Sbb { id: string; alts: Alt[]; children: Map<string, Sbb> }
interface Placed { sbb: string; blueprint: string; at: Vec; turns: Turns }

function ringStep(d: Dir, turns: number): Dir {
  return ((d + turns) % 4) as Dir;
}

// Turns that take `from` to `to` on the ring (donor: alignment table built by repeated Z rotation).
function alignTurns(from: Dir, to: Dir): Turns {
  for (let k = 0; k < 4; k++) if (ringStep(from, k) === to) return k as Turns;
  throw new Error("unreachable on a four-direction ring");
}

function rotVec(v: Vec, turns: number): Vec {
  let [x, y] = v;
  for (let k = 0; k < turns; k++) [x, y] = [-y, x];
  return [x, y];
}

// Weighted pick. Weights are not normalised; a null alternative is a real choice of "nothing".
function sampleAlt(alts: Alt[], rand: () => number): Blueprint | null {
  const total = alts.reduce((s, a) => s + a.chance, 0);
  let pick = rand() * total;
  for (const a of alts) {
    if (pick < a.chance) return a.blueprint;
    pick -= a.chance;
  }
  return alts.length > 0 ? alts[alts.length - 1].blueprint : null; // floating-point guard
}

// `attach` is the face the parent exposes (null at a root). `mode` is the rotation handed down by the parent.
// Horizontal child slots always pass fixed 0; the child's own rotation field is not read for them (donor).
function placeSbb(sbb: Sbb, at: Vec, attach: Dir | null, mode: Mode, depth: number, rand: () => number, out: Placed[]): void {
  if (depth > MAX_DEPTH) return; // fix: bounded recursion
  const bp = sampleAlt(sbb.alts, rand);
  if (!bp) return;

  const alignK = alignTurns(bp.originDir, attach ?? bp.originDir);
  const turns = (mode.kind === "fixed" ? (mode.turns + alignK) % 4 : alignK) as Turns;
  out.push({ sbb: sbb.id, blueprint: bp.id, at, turns });

  // Paste so the rotated origin sits one step behind the attach point (donor: pastePosition).
  const origin = rotVec(bp.origin, turns);
  const step = DIR_VEC[attach ?? bp.originDir];
  const paste: Vec = [at[0] - origin[0] - step[0], at[1] - origin[1] - step[1]];

  for (const slot of bp.slots) {
    const child = sbb.children.get(slot.name);
    if (!child) continue; // a slot with no configured child is left empty
    const rel = rotVec(slot.at, turns);
    const slotAt: Vec = [paste[0] + rel[0], paste[1] + rel[1]];
    placeSbb(child, slotAt, ringStep(slot.dir, turns), { kind: "fixed", turns: 0 }, depth + 1, rand, out);
  }
}

// A world root is placed with zero turns (donor: the enumeration pins roots to fixed 0).
export function placeRoot(root: Sbb, at: Vec, rand: () => number): Placed[] {
  const out: Placed[] = [];
  placeSbb(root, at, null, { kind: "fixed", turns: 0 }, 0, rand, out);
  return out;
}

export {};
