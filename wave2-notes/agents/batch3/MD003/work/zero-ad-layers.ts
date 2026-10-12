// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// One operation written in a layer file (a template that names a parent).
type Op =
  | { kind: "disable"; key: string }
  | { kind: "set"; key: string; value: number }
  | { kind: "add"; key: string; value: number }
  | { kind: "mul"; key: string; value: number }
  | { kind: "mul_round"; key: string; value: number }
  | { kind: "tokens"; key: string; text: string };

interface Layer {
  parent?: string;
  ops: Op[];
}

// Numbers and token lists side by side, as one node of inherited values.
type State = Record<string, number | string[]>;

// "a b -c": add b if inherited list lacks it; remove c if present (donor: ParamNode.cpp 150-170).
function applyTokens(list: string[], text: string, warn: (m: string) => void): string[] {
  const out = [...list];
  const inherited = [...list];
  for (const t of text.split(/\s+/).filter((x) => x.length > 0)) {
    if (t.startsWith("-")) {
      const i = out.indexOf(t.slice(1));
      if (i >= 0) out.splice(i, 1);
      else warn(`could not remove "${t.slice(1)}": not present`);
    } else if (!inherited.includes(t)) {
      out.push(t);
    }
  }
  return out;
}

function applyOp(state: State, op: Op, warn: (m: string) => void): void {
  switch (op.kind) {
    case "disable":
      delete state[op.key];
      return;
    case "set":
      state[op.key] = op.value;
      return;
    case "tokens": {
      const raw = state[op.key];
      const old = Array.isArray(raw) ? raw : [];
      state[op.key] = applyTokens(old, op.text, warn);
      return;
    }
    default: {
      const raw = state[op.key];
      const old = typeof raw === "number" ? raw : 0; // donor reads ToFixed() of the node; empty case not read
      if (op.kind === "add") state[op.key] = old + op.value;
      else if (op.kind === "mul") state[op.key] = old * op.value;
      else state[op.key] = Math.round(old * op.value); // mul_round; tie rule of ToInt_RoundToNearest not read
    }
  }
}

// Parent first, then this layer's ops in file order (donor: TemplateLoader.cpp 75-81).
// Depth above 100 stops the walk (donor: TemplateLoader.cpp 41-43).
function resolve(name: string, layers: Map<string, Layer>, warn: (m: string) => void, depth = 0): State {
  if (depth > 100) throw new Error(`inheritance loop at ${name}`);
  const layer = layers.get(name);
  if (layer === undefined) throw new Error(`missing template ${name}`);
  const state: State = layer.parent !== undefined ? resolve(layer.parent, layers, warn, depth + 1) : {};
  for (const op of layer.ops) applyOp(state, op, warn);
  return state;
}

// Frankendom side: a bad number in a server row is a load error, not 0.
function parseNumberStrict(token: string, where: string): number {
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(token)) {
    throw new Error(`${where}: not a number "${token}"`);
  }
  return Number(token);
}

// Mod dependency check. Each dependency is "name", or "name<op>version" with op in <=, >=, =, <, >.
interface ModInfo {
  version: string;
  deps: string[];
}

function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function depHolds(dep: string, versions: Map<string, string>): boolean {
  const m = /^(.*?)(<=|>=|=|<|>)(.+)$/.exec(dep);
  // Fix: a bare name is checked for presence. The donor's loop skips it (Mod.cpp 328-329).
  if (m === null) return versions.has(dep);
  const name = m[1];
  const op = m[2];
  const req = m[3];
  const have = versions.get(name);
  if (have === undefined) return false;
  const c = cmpVersion(have, req);
  switch (op) {
    case "<=":
      return c <= 0;
    case ">=":
      return c >= 0;
    case "=":
      return c === 0;
    case "<":
      return c < 0;
    default:
      return c > 0;
  }
}

// Fix: repeat until stable, so a mod whose dependency was removed is removed too.
// The donor checks once against the table built before any removal (Mod.cpp 167-170, 303).
function enableMods(requested: string[], available: Map<string, ModInfo>): { enabled: string[]; dropped: string[] } {
  const dropped: string[] = [];
  let enabled = requested.filter((m) => {
    if (available.has(m)) return true;
    dropped.push(m);
    return false;
  });
  for (;;) {
    const versions = new Map(enabled.map((m) => [m, available.get(m)!.version] as [string, string]));
    const bad = enabled.filter((m) => !available.get(m)!.deps.every((d) => depHolds(d, versions)));
    if (bad.length === 0) return { enabled, dropped };
    dropped.push(...bad);
    enabled = enabled.filter((m) => !bad.includes(m));
  }
}
