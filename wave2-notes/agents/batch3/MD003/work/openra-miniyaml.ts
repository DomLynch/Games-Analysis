// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// One YAML-like row: a key, an optional value, and child rows.
interface Node {
  key: string;
  value?: string;
  children: Node[];
}

type Tree = Map<string, Node[]>;

const isRemoval = (n: Node): boolean => n.key.startsWith("-");

function lastIndexOfKey(nodes: Node[], key: string): number {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].key === key) return i;
  }
  return -1;
}

// Merge two row lists from different files. A row with a new key is appended. A row whose key
// already exists merges into the earlier row, unless a "-key" removal sits after that earlier row;
// then the new row is appended, so the earlier row applies, is removed, and the new row applies.
// Removal rows are kept for resolution (donor: MiniYaml.cs MergePartial 597-651).
function mergeLayer(existing: Node[], override: Node[]): Node[] {
  const ret: Node[] = [];
  for (const n of [...existing, ...override]) {
    if (isRemoval(n)) {
      ret.push(n);
      continue;
    }
    const prev = lastIndexOfKey(ret, n.key);
    const removal = lastIndexOfKey(ret, "-" + n.key);
    if (prev === -1 || removal > prev) {
      ret.push(n);
      continue;
    }
    const old = ret[prev];
    ret[prev] = { key: n.key, value: n.value ?? old.value, children: mergeLayer(old.children, n.children) };
  }
  return ret;
}

// Put one already-resolved row into the resolved list (donor: MergeIntoResolved 437-458).
function mergeInto(resolved: Node[], n: Node, tree: Tree, inherited: Set<string>): void {
  const idx = resolved.findIndex((r) => r.key === n.key);
  if (idx === -1) {
    resolved.push({ ...n, children: resolveNodes(n.children, tree, new Set(inherited)) });
    return;
  }
  const old = resolved[idx];
  const children = resolveNodes(mergeLayer(old.children, n.children), tree, new Set(inherited));
  resolved[idx] = { key: n.key, value: n.value ?? old.value, children };
}

// Resolve parent links and removals for one list of rows (donor: ResolveInherits 459-505).
// A parent may be linked once per tree; a missing parent, a repeated parent, or a removal with
// nothing to remove is an error (the donor throws on each of these).
function resolveNodes(nodes: Node[], tree: Tree, inherited: Set<string>): Node[] {
  const resolved: Node[] = [];
  for (const n of nodes) {
    if (n.key === "Inherits" || n.key.startsWith("Inherits@")) {
      const parentName = n.value ?? "";
      const parent = tree.get(parentName);
      if (parent === undefined) throw new Error(`Parent type ${parentName} not found`);
      if (inherited.has(parentName)) throw new Error(`Parent type ${parentName} was already inherited`);
      inherited.add(parentName);
      for (const r of resolveNodes(parent, tree, new Set(inherited))) mergeInto(resolved, r, tree, inherited);
    } else if (isRemoval(n)) {
      const removed = n.key.slice(1);
      const kept = resolved.filter((r) => r.key !== removed);
      if (kept.length === resolved.length) throw new Error(`There are no elements with key ${removed} to remove`);
      resolved.splice(0, resolved.length, ...kept);
    } else {
      mergeInto(resolved, n, tree, inherited);
    }
  }
  return resolved;
}

// Resolve every top-level entry. Each entry starts with its own name in the inherited set,
// so an entry that inherits itself is an error (donor: MiniYaml.cs 426-428).
function resolveAll(tree: Tree): Map<string, Node[]> {
  const out = new Map<string, Node[]>();
  for (const [name, nodes] of tree) {
    out.set(name, resolveNodes(nodes, tree, new Set([name])));
  }
  return out;
}
