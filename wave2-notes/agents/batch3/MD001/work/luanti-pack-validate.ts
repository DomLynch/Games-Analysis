// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface PackSpec {
  name: string;
  depends: string[];     // required: the pack waits until each of these is loaded
  optdepends: string[];  // ordering only if the named pack is present
}

export interface LoadPlan {
  order: string[];
  errors: string[];
}

const NAME_RE = /^[a-z0-9_]+$/; // donor: MODNAME_ALLOWED_CHARS

// Returns one cycle (as a list of names) that blocks the pack `start`, or null.
function findCycle(start: string, waiting: Map<string, Set<string>>, done: Set<string>): string[] | null {
  const path: string[] = [];
  const at = new Map<string, number>();
  let cur: string | undefined = start;
  while (cur !== undefined && !at.has(cur)) {
    at.set(cur, path.length);
    path.push(cur);
    cur = [...(waiting.get(cur) ?? [])].find(d => waiting.has(d) && !done.has(d));
  }
  return cur === undefined ? null : path.slice(at.get(cur)!);
}

export function planLoadOrder(input: PackSpec[]): LoadPlan {
  const errors: string[] = [];

  // 1. Names. A bad name or a second pack with the same name is an error. Nothing overrides anything.
  const byName = new Map<string, PackSpec>();
  for (const p of input) {
    if (!NAME_RE.test(p.name)) errors.push(`bad name: ${p.name}`);
    if (byName.has(p.name)) errors.push(`name clash: ${p.name}`);
    else byName.set(p.name, p);
  }
  if (errors.length > 0) return { order: [], errors };

  // 2. Order. A pack is ready when every required dep is loaded; an optional dep counts only if present.
  //    Names are sorted first so the same input always gives the same order.
  const names = [...byName.keys()].sort();
  const waiting = new Map<string, Set<string>>();
  for (const n of names) {
    const p = byName.get(n)!;
    const w = new Set<string>(p.depends);
    for (const o of p.optdepends) if (byName.has(o)) w.add(o);
    waiting.set(n, w);
  }
  const ready = names.filter(n => waiting.get(n)!.size === 0);
  const queued = new Set<string>(ready);
  const done = new Set<string>();
  const order: string[] = [];
  while (ready.length > 0) {
    const n = ready.pop()!; // stack: the last ready pack goes first
    order.push(n);
    done.add(n);
    for (const m of names) {
      const w = waiting.get(m)!;
      if (w.delete(n) && w.size === 0 && !queued.has(m)) {
        ready.push(m);
        queued.add(m);
      }
    }
  }

  // 3. Stuck packs are reported with what they wait for; one cycle is named when there is one.
  for (const n of names) {
    if (done.has(n)) continue;
    errors.push(`${n} waits for: ${[...waiting.get(n)!].join(" ")}`);
  }
  for (const n of names) {
    if (done.has(n)) continue;
    const cycle = findCycle(n, waiting, done);
    if (cycle) { errors.push(`cycle: ${cycle.join(" -> ")}`); break; }
  }
  return { order, errors };
}

// 4. Write rule for user content (donor: checkPathWithGamedef). Only the user's own
//    draft root is writable; live roots are never writable from user content.
export function canWriteUserPath(path: string, draftRoot: string, liveRoots: readonly string[]): boolean {
  if (path.split("/").includes("..")) return false;
  const under = (p: string, root: string): boolean => p === root || p.startsWith(root + "/");
  if (!under(path, draftRoot)) return false;
  return !liveRoots.some(r => under(path, r));
}

export {};
