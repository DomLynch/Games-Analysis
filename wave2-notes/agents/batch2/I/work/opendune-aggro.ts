// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Pt { x: number; y: number }          // world units; 256 per tile in the donor
interface Seeker { pos: Pt; origin: Pt; fireRange: number /* tiles */ }
interface Candidate {
  id: string;
  pos: Pt;
  basePriority: number;      // data field per creature/object type (build + target priority in the donor)
  hostile: boolean;
  seen: boolean;             // the seeker's side has line of knowledge (fog flag)
  isObjective: boolean;      // donor: a structure; here: a zone objective such as a spawner or totem
}
type Mode = 'any' | 'inRange' | 'leash' | 'objectivesFirst';

// octagonal distance: longer axis plus half the shorter axis
function dist(a: Pt, b: Pt): number {
  const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
  return dx > dy ? dx + (dy >> 1) : dy + (dx >> 1);
}
const tilesRounded = (a: Pt, b: Pt): number => (dist(a, b) + 0x80) >> 8;
const CAP = 0x7d00; // 32000

// Score one candidate: static type weight divided by distance. Unit form adds 1; objective form does not.
function score(s: Seeker, c: Candidate): number {
  if (!c.hostile || !c.seen) return 0;
  const d = tilesRounded(s.pos, c.pos);
  let p = c.basePriority;
  if (d !== 0) p = c.isObjective ? Math.floor(p / d) : Math.floor(p / d) + 1;
  return Math.min(p, CAP);
}

function inReach(s: Seeker, c: Candidate, mode: Mode): boolean {
  const reach = s.fireRange * 256;
  if (mode === 'inRange') return dist(s.pos, c.pos) <= reach;
  if (mode === 'leash') return dist(s.origin, c.pos) <= reach * 2;
  return true; // 'any' and 'objectivesFirst' have no range gate
}

// Best of one kind. Mobile targets: first wins a tie (strict >). Objectives: last wins a tie (>=).
function best(s: Seeker, cs: Candidate[], mode: Mode, objectives: boolean): { c: Candidate; p: number } | null {
  let pick: Candidate | null = null, bp = 0;
  for (const c of cs) {
    if (c.isObjective !== objectives || !inReach(s, c, mode)) continue;
    const p = score(s, c);
    if (objectives ? p >= bp : p > bp) { pick = c; bp = p; }
  }
  return bp === 0 || pick === null ? null : { c: pick, p: bp };
}

function chooseTarget(s: Seeker, cs: Candidate[], mode: Mode): Candidate | null {
  const mobile = best(s, cs, mode, false);
  const obj = best(s, cs, mode, true);
  if (mode === 'objectivesFirst') return obj ? obj.c : mobile ? mobile.c : null;
  if (mobile && obj) return obj.p >= mobile.p ? obj.c : mobile.c; // objective wins ties
  return mobile ? mobile.c : obj ? obj.c : null;
}

// Team level: members are asked in pool order; the first member that finds anything sets the team target.
function teamTarget(members: Seeker[], cs: Candidate[], mode: Mode, current: Candidate | null): Candidate | null {
  for (const m of members) {
    const t = chooseTarget(m, cs, mode);
    if (t === null) continue;
    return t === current ? current : t;
  }
  return null;
}
export { chooseTarget, teamTarget };
