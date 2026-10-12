// Licence: Sustainable Use License 1.0 (donor; non-commercial or personal use only; restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

interface Pt { x: number; y: number; }
type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // eight compass values in circle order
interface Mon { id: number; tile: Pt; alive: boolean; visible: boolean; talking: boolean; }
interface Pick { id: number; talking: boolean; steps: number; facingGap: number; }
type Action = "none" | "walk" | "spell" | "spellMonsterTarget" | "attack" | "attackMonsterTarget" | "operate";

const MAX_STEPS = 25;  // data: walk search cap (donor maxSteps = 25)
const STEP: Pt[] = [
  { x: -1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 1, y: 1 },
  { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 },
];
// donor: retention applies unless the last action is None, Attack or Spell
const NOT_RETAINED: ReadonlySet<Action> = new Set<Action>(["none", "spell", "attack"]);

const key = (p: Pt): string => `${p.x},${p.y}`;

// Facing gap around the eight directions, 0..4. Donor 4 - (d % 4) equals 8 - d for d > 4.
function facingGap(facing: Dir, toward: Dir): number {
  const d = Math.abs(facing - toward);
  return d > 4 ? 8 - d : d;
}

// Melee pick: hostile before talkable; then fewer steps; then smaller facing gap.
// fix: a full tie goes to the lower monster id (donor: the later candidate replaces the earlier one).
function pickMelee(me: Pt, facing: Dir, walkable: (p: Pt) => boolean, mons: Mon[], dirOf: (from: Pt, to: Pt) => Dir): Pick | null {
  const atTile = new Map<string, Mon>();
  for (const m of mons) if (m.alive && m.visible) atTile.set(key(m.tile), m);

  const seen = new Set<string>([key(me)]);
  const queue: { p: Pt; steps: number }[] = [{ p: me, steps: 0 }];
  let best: Pick | null = null;
  let cap = MAX_STEPS;

  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    for (const d of STEP) {
      const np: Pt = { x: node.p.x + d.x, y: node.p.y + d.y };
      const k = key(np);
      if (seen.has(k)) continue;
      seen.add(k);
      if (node.steps > cap) continue;
      if (!walkable(np)) {
        const m = atTile.get(k);
        if (m === undefined) continue;
        const gap = facingGap(facing, dirOf(me, np));
        if (best !== null && !best.talking && m.talking) continue;               // hostile is never displaced by talkable
        if (best !== null && best.talking === m.talking && best.facingGap < gap) continue;
        if (best !== null && best.talking === m.talking && best.facingGap === gap && best.id < m.id) continue;
        best = { id: m.id, talking: m.talking, steps: node.steps, facingGap: gap };
        if (!m.talking) cap = node.steps; // first hostile caps the search at its step count
        continue;
      }
      queue.push({ p: np, steps: node.steps + 1 });
    }
  }
  return best;
}

// Per frame. While a non-attack button is held, keep the lock and drop it only if the monster is dead, hidden or unlit.
// Otherwise re-pick every frame (donor clears the target before each search).
function refreshLock(prevId: number | null, buttonHeld: boolean, last: Action, mons: Mon[], search: () => Pick | null): number | null {
  if (buttonHeld && !NOT_RETAINED.has(last)) {
    if (prevId === null) return null;
    const m = mons.find(x => x.id === prevId);
    return m !== undefined && m.alive && m.visible ? prevId : null; // no distance check, as in the donor
  }
  const pick = search();
  return pick === null ? null : pick.id;
}
