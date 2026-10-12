// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface PackFile {
  hash: string;     // content hash; same path + same hash = unchanged
  content: string;
}

// Flat map of path ("dir/sub/file.cfg") to file. The donor uses a nested tree.
export type Pack = Map<string, PackFile>;

export interface UpdatePack {
  removelist: string[];                                        // paths to purge (names only)
  addlist: { path: string; hash: string; content: string }[];  // files to write, with content
}

// Donor: removelist = old files with no identical (name + hash) entry in the new pack;
// addlist = new files with no identical entry in the old pack, carrying content.
export function makeUpdatePack(oldPack: Pack, newPack: Pack): UpdatePack {
  const removelist: string[] = [];
  for (const [path, f] of oldPack) {
    const n = newPack.get(path);
    if (n === undefined || n.hash !== f.hash) removelist.push(path);
  }
  const addlist: UpdatePack["addlist"] = [];
  for (const [path, f] of newPack) {
    const o = oldPack.get(path);
    if (o === undefined || o.hash !== f.hash) addlist.push({ path, hash: f.hash, content: f.content });
  }
  return { removelist, addlist };
}

// Donor order: purge the removelist first, then write the addlist (a changed file is in both).
export function applyUpdatePack(base: Pack, upd: UpdatePack): Pack {
  const out: Pack = new Map(base);
  for (const p of upd.removelist) out.delete(p);
  for (const a of upd.addlist) out.set(a.path, { hash: a.hash, content: a.content });
  return out;
}

// Donor: a name that differs only by case from an earlier name in the same pack is a clash.
// The first name is reported once, then every later clashing name.
export function caseCollisions(paths: string[]): string[] {
  const firstByKey = new Map<string, string>();
  const bad: string[] = [];
  for (const p of paths) {
    const key = p.toLowerCase();
    const first = firstByKey.get(key);
    if (first === undefined) {
      firstByKey.set(key, p);
    } else {
      bad.push(first, p);
    }
  }
  return [...new Set(bad)];
}

export {};
