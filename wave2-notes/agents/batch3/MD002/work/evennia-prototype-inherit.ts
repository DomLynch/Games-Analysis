// Licence: BSD-3-Clause (donor, LICENSE.txt). Sketch written from the described mechanism, not a translation of the donor lines.
type Action = "spawn" | "edit";
interface Caller { id: string }
type LockEval = (lock: string, caller: Caller) => boolean;

interface Proto {
  key: string;                       // lower-case name, the lookup key
  parents: string[];                 // prototype_parent names; later parents override earlier ones
  typeclass?: string;
  readOnly: boolean;                 // defined in code (a module or a dict), not in the store
  locks?: Partial<Record<Action, string>>; // missing lock means "all()"
  [field: string]: unknown;
}

type Store = Map<string, Proto>;
interface Problems { errors: string[]; warnings: string[] }

const MAX_DEPTH = 20; // our cap; the donor has no chain-depth cap (FUNCPARSER_MAX_NESTING is for $func calls)

// Merge the chain depth-first: parents first (later parent wins), the child's own fields last.
// Cycle check uses the lower-case NAME, not object identity (the donor checks id(), see note).
function resolve(store: Store, key: string, problems: Problems, seen: Set<string> = new Set(), depth = 0): Record<string, unknown> {
  const name = key.toLowerCase();
  const p = store.get(name);
  if (!p) { problems.errors.push(`parent '${key}' not found`); return {}; }
  if (seen.has(name)) { problems.errors.push(`${name} has infinite nesting of prototypes`); return {}; }
  if (depth >= MAX_DEPTH) { problems.errors.push(`${name} nests deeper than ${MAX_DEPTH}`); return {}; }

  const nextSeen = new Set(seen).add(name);
  let merged: Record<string, unknown> = {};
  for (const parent of p.parents) {
    merged = { ...merged, ...resolve(store, parent, problems, nextSeen, depth + 1) };
  }
  const { parents, readOnly, locks, ...own } = p;
  return { ...merged, ...own };
}

// Base check used before a row can be spawned or saved: parents resolve, no cycle, a typeclass exists in the chain.
function validateBase(store: Store, key: string): Problems {
  const problems: Problems = { errors: [], warnings: [] };
  const merged = resolve(store, key, problems);
  if (problems.errors.length === 0 && !merged.typeclass) {
    problems.errors.push(`${key} has no typeclass in its parent chain`);
  }
  return problems;
}

// Lock check. Code-defined rows can never be edited. Missing lock = all().
function canDo(p: Proto, action: Action, caller: Caller, evalLock: LockEval): boolean {
  if (action === "edit" && p.readOnly) return false;
  const lock = p.locks?.[action] ?? "all()";
  return evalLock(lock, caller);
}

// Save path: the donor's save_prototype() skips locks (caller must check). Our save checks them here.
function saveRow(store: Store, row: Proto, caller: Caller, evalLock: LockEval): Problems {
  const existing = store.get(row.key.toLowerCase());
  if (existing && !canDo(existing, "edit", caller, evalLock)) {
    return { errors: [`${row.key} cannot be edited by this caller`], warnings: [] };
  }
  const trial = new Map(store);
  trial.set(row.key.toLowerCase(), row);
  const problems = validateBase(trial, row.key);
  if (problems.errors.length === 0) store.set(row.key.toLowerCase(), row);
  return problems;
}

export {};
