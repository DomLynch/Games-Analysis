interface Entry {
  mob?: string; group?: string;
  weight: number; cost: number;
  packMin: number; packMax: number;
  startsAt: number; endsAt: number;      // seconds on a world clock; endsAt <= 0 means forever
  timeOfDay?: [number, number];          // allowed [from, to) in seconds of day
}
interface Group { entries: Entry[]; fallback: string }
interface Pick { mob: string; pack: number }

const rngInt = (lo: number, hi: number, r: () => number): number => lo + Math.floor(r() * (hi - lo + 1));

function valid(e: Entry, now: number, tod: number): boolean {
  if (now < e.startsAt) return false;
  if (e.endsAt > 0 && now >= e.endsAt) return false;
  if (e.timeOfDay && !(tod >= e.timeOfDay[0] && tod < e.timeOfDay[1])) return false;
  return true;
}

// budget.left is spent as picks are made; the fallback mob costs 1 even if nothing matched.
function pickFromGroup(groups: Map<string, Group>, name: string, now: number, tod: number,
                       budget: { left: number }, r: () => number, nested = false): Pick[] {
  const g = groups.get(name);
  if (!g) return [];
  const live = g.entries.filter(e => valid(e, now, tod));
  // the donor rolls over its stored frequency total (how that total is built was not read) and skips invalid entries while walking; sketch rolls over live weights only
  let roll = rngInt(1, Math.max(1, live.reduce((s, e) => s + e.weight, 0)), r);
  const out: Pick[] = [];
  let found = false;
  for (const e of live) {
    if (e.weight < roll) { roll -= e.weight; continue; }
    const pack = e.packMax > 1 ? rngInt(e.packMin, e.packMax, r) : 1;
    if (e.group !== undefined) {
      for (let i = 0; i < pack; i++) out.push(...pickFromGroup(groups, e.group, now, tod, budget, r, true));
      found = true;
    } else if (e.mob !== undefined) {
      out.push({ mob: e.mob, pack });
      budget.left -= Math.max(1, e.cost * pack);
      found = true;
    }
    break;
  }
  if (!nested && !found) { out.push({ mob: g.fallback, pack: 1 }); budget.left -= 1; }
  return out;
}

interface Cell { x: number; y: number }
// cells: candidate cells already filtered (free, walkable, outdoors, out of view)
function placeGroup(cells: Cell[], picks: Pick[], r: () => number, canStand: (m: string, c: Cell) => boolean) {
  const placed: { mob: string; at: Cell }[] = [];
  if (cells.length === 0) return { placed, groupDropped: true };
  for (const p of picks) {
    for (let n = 0; n < p.pack; n++) {
      for (let tries = 0; tries < 10 && cells.length > 0; tries++) {
        const c = cells.splice(Math.floor(r() * cells.length), 1)[0]!; // drawn without replacement
        if (!canStand(p.mob, c)) continue;
        placed.push({ mob: p.mob, at: c });
        break;
      }
    }
  }
  return { placed, groupDropped: false };
}

// zone population loop: budget shrinks while the counter grows (see note)
function populate(groups: Map<string, Group>, name: string, pop: number, now: number, tod: number, r: () => number): Pick[] {
  const budget = { left: pop };
  const all: Pick[] = [];
  for (let m = 0; m < budget.left; m++) all.push(...pickFromGroup(groups, name, now, tod, budget, r));
  return all;
}
export {}
