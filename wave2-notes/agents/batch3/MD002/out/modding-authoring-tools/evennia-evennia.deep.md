# evennia-evennia (modding-authoring-tools, cell 1)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/prototypes/` (`spawner.py`, `prototypes.py`, `menus.py`) | Licence: BSD-3-Clause (`/mnt/frankendom-donors/evennia-evennia/LICENSE.txt` line 1, read) | Python | symbol `_get_prototype`, `validate_prototype`, `spawn`, `check_permission`, `save_prototype`

Checked: Read in full: `_get_prototype` (spawner.py 194-268), `validate_prototype` (prototypes.py 841-995), `check_permission` (1146-1180), `save_prototype` (392-446, docstring and checks; the body after 446 not read). Read in part: `spawn` (spawner.py 885-960, the validate and homogenize steps only), `search_prototype` copy path (prototypes.py 570-611), `protfunc` module docstring (protfuncs.py 1-43), `FUNCPARSER` settings (settings_default.py 751-770), `menus.py` `_validate_prototype` (243-256). Callers: grep of the whole `evennia/` package for `check_permission` finds only its test (prototypes/tests.py 384); no production caller. Donor's own CLAUDE.md/AGENTS.md were not followed (treated as data). Confidence: high on the prototype pipeline and the lock finding (both read and grep-confirmed); medium on the cycle-check defect in section 6 (read, not run). camera_scope: not a camera topic.

Best transferable idea: Author content as named rows that inherit from a parent row by key, validate the whole chain at save time with the same validator the spawner uses, and make code-shipped base rows read-only.

Decision (proposed): adapt - take the parent-chain merge and the validate-only dry run; reject the `$func` string-evaluation layer (we need no inline expressions in legend rows). Reason: legends and zones are rows with a few inheritable fields, and the editor needs one validator for preview and save.

Acceptance: A staff editor saves a legend row with `parents: ["legend-bull-base"]` and sees its flattened stats before publish; saving a row whose parent chain loops returns an error and nothing is written (server test: `saveRow` returns errors and the store is unchanged).

## 1. Mechanism

- Content unit: a prototype is a dict keyed by a lower-cased `prototype_key`. Two stores: rows saved to the database (`save_prototype`, prototypes.py 392) and rows defined in Python modules, which are read-only (`_MODULE_PROTOTYPES`, prototypes.py 428 and 1160-1164).
- Inheritance is resolved by `_get_prototype` (spawner.py 194). For each parent in the child's `prototype_parent` list (loop starts at 237), the parent is looked up by name in a custom dict first (243), then in the global store (245), and merged into a work dict (258). Later parents override earlier ones. The child's own fields are merged last (261 for attrs, and the same pattern for tags). Tags and attrs are merged by key, not replaced whole (`_inherit_tags` at 214, `_inherit_attrs` at 220-221). Fields listed as `uninherited` are restored after the merge (266). `prototype_parent` is removed from the output (267).
- No cycle check happens in the merge itself (docstring 197: "Use validate_prototype before this, we don't check"). The merge trusts the validator.
- Validation: `validate_prototype` (841) runs at spawn (spawner.py 937) and in the in-game editor (menus.py 251, `spawn(..., only_validate=True)`). Its checks, in order as read: a `prototype_key` is required in strict mode; a `typeclass` or a `prototype_parent` is required (884); the typeclass must import (898); a row may not parent itself (921); a named parent must exist (933); a cycle is detected by `id(prototype)` in the visited list (939-941, 948); after the walk, a typeclass must be present somewhere in the chain (depth 0). Errors raise `RuntimeError`, warnings raise `RuntimeWarning`.
- Side effect: validation writes default locks back into the row. The lock string is split on `;` and `:` (983-986), and `spawn:all()` and `edit:all()` are appended if absent (990-994). The write back is at 994.
- Permission: `check_permission(prototype_key, action)` (1146) refuses `edit` for code-defined rows (1160-1164). Otherwise it evaluates the row's lock string for the action (1179). Grep result: no production caller in `evennia/`; it is called only from its test (prototypes/tests.py 384).
- Save: `save_prototype` (392) requires a `prototype_key` (423), refuses module-defined keys (428), homogenizes the row, then stores it (the body after 446 was not read). Its docstring says no edit or spawn lock is checked here (407).
- Spawn: `spawn` (885) resolves names with `search_prototype(require_single=True)`, homogenizes unless `only_validate` (920-923), validates each row (937), merges with `_get_prototype`, then builds create kwargs.
- Value parsing: a value beginning with `$` is parsed by FuncParser; the callable names come only from listed modules (settings_default.py 765-767: `evennia.prototypes.protfuncs` and `server.conf.prototypefuncs`). Nesting is capped at 20 (756). A protfunc that raises aborts the spawn before any object is created (protfuncs.py 34).
- Tick: none. Everything runs synchronously on a command or API call. Camera: not applicable.

## 2. Key functions

- `_get_prototype`: `/mnt/frankendom-donors/evennia-evennia/evennia/prototypes/spawner.py` 194-268. Recursive merge by name; later parents win; child last; `prototype_parent` dropped.
- `validate_prototype`: `/mnt/frankendom-donors/evennia-evennia/evennia/prototypes/prototypes.py` 841-995. Checks for key, typeclass, parent existence, self-parent, cycle, depth-0 typeclass; writes default locks.
- `spawn`: `/mnt/frankendom-donors/evennia-evennia/evennia/prototypes/spawner.py` 885. Name lookup, homogenize (unless validate-only), validate, merge, create kwargs.
- `check_permission`: `/mnt/frankendom-donors/evennia-evennia/evennia/prototypes/prototypes.py` 1146-1180. Read-only check for code rows, then lock evaluation.
- `save_prototype`: `/mnt/frankendom-donors/evennia-evennia/evennia/prototypes/prototypes.py` 392-446. Key required, module rows refused, no lock check.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Merge the parent chain depth-first; later parent wins; child wins over all | Rule (spawner.py 237-261) |
| Validate the whole chain before spawn or save, with a dry-run mode for an editor | Rule; the editor calls `spawn(..., only_validate=True)` (menus.py 251) |
| Refuse a row that has no typeclass anywhere in its chain | Rule (prototypes.py 884, depth-0 check) |
| Default lock on spawn and edit | `all()` (prototypes.py 990, 992) |
| Code-shipped rows cannot be edited | Rule (prototypes.py 1160-1164) |
| Protfunc nesting limit | 20 (settings_default.py 756); this limits `$func` calls, not parent depth |
| Parent depth limit | None in the donor. Our `MAX_DEPTH = 20` in the sketch is ours, not theirs. |

## 4. TypeScript sketch

simplified: The sketch keeps the order of the donor: merge parents first (later wins), child last; a validate step that checks parents and typeclass; read-only code rows; a lock check for edit and spawn. It differs in four places. (1) Cycles are detected by lower-case name, not object identity (the donor's `id()` check, prototypes.py 939, is discussed in section 6). (2) Attributes and tags are not merged by key; the sketch replaces whole fields. (3) The save path checks edit permission itself; the donor's `save_prototype` does not. (4) Validation does not write default locks into the row; the default `all()` is applied when reading the lock. The sketch also drops `locks` and `readOnly` from the merged output, so only fields a fight or zone reads come out. The depth cap of 20 is ours.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/evennia-prototype-inherit.ts` on the VPS, exit 0 (run this turn).

## 5. Lands in

- TARGET `origins/catalogue/inherit.ts` (new): resolves legend and zone rows by parent name at publish time, then stores the flattened row. Runtime reads only the flattened row, so the fight engine never walks a chain.
- Parity-checklist row 20 (catalogue as runtime source). Its neighbour, row 21 (catalogue fields), takes the flattened field list.
- Reuse tag: adapt-idea (BSD-3-Clause, adaptable; sketch is clean-room from the mechanism)
- Brief rule served: zones and legends as data on one runtime; one ledger (saves go through the one writer, never a side table).

## 6. Gaps and risks

- Cycle check defect (suspected, not run): the donor compares `id(prototype)` against the visited list (prototypes.py 939, 948). `search_prototype` returns `.copy()` for module rows (611), and the database-row search path was not read (not read), so a named loop A -> B -> A may get a new id at each hop if the copies are fresh objects and miss the check, ending in a Python recursion error instead of the `RuntimeError` the validator raises. No test in `prototypes/tests.py` covers a cycle (grep for infinite, recursion, parent itself found nothing). Fix: detect cycles by name, as the sketch does. Not run; verify with a test before relying on it.
- No lock check on save: `save_prototype` says the caller must check (407), and nothing in `evennia/` calls `check_permission` in production (only its test, 384). The lock system exists but is not enforced on the path that writes rows. Fix: our save path is the server writer, and it checks edit permission itself. This is the main finding to carry over.
- Validation mutates the row (994). Fix: return defaults in the validation report, not in the stored row.
- The lock string is free text parsed by splitting on `;` and `:`, and a segment without a colon is dropped silently (983-986). Fix: parse strictly and report a bad segment as an error.
- Protfuncs are a general expression layer; they receive the spawning session and prototype (protfuncs.py 27-33), and the spawn docstring says the caller is needed for protfuncs that perform searches (spawner.py 894-895). For Frankendom, legend rows should carry no expressions at all. If a formula is needed, use a named allowlist of pure functions with no database search.
- Module rows are read-only (1160-1164). That split maps well to shipped catalogue rows (read-only, from code) versus staff rows (editable). Keep the split.
- `test_prototype_dos` (prototypes/tests.py 987) is a load test for listing, not a validation test. Our tests must cover chains, cycles and missing parents directly.
- The donor's `at_object_post_spawn` hook and the database-side prototype storage schema were not read in full (not read).
- BSD-3-Clause: adapting code is allowed, but this note stays clean-room (the sketch is written from the mechanism).

Reuse tag: adapt-idea (BSD-3-Clause)
Brief rule served: zones and legends as data (Frankendom ruling: one engine, zones as data); server-side saves through one writer.
